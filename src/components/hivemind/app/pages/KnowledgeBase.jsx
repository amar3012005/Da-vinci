import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Upload,
  FileText,
  File,
  CheckCircle,
  XCircle,
  Loader2,
  Tag,
  Clock,
  HardDrive,
  X,
  FolderKanban,
  Users,
  User,
  Map as MapIcon,
  Sparkles,
  ChevronDown,
  Sheet,
  Trash2,
  Code2,
  FileType,
  Image as ImageIcon,
  Presentation,
  FileAudio,
  Copy,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';
import { useAuth } from '../auth/AuthProvider';
import { useTeamContext } from '../shared/team-context';
import { PageIndexViewer } from '../PageIndexViewer';
import { useUploads, setUploads as setGlobalUploads } from '../shared/upload-store';
import { isPlanLimitError } from '../shared/planLimit';
import UsageTracker from '../components/UsageTracker';
import { emitUsageChanged, useUsage } from '../shared/useUsage';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// Mirrors the server's FORMAT_PROFILES + tier cascade. The SERVER is the
// authority on what it can parse — this list exists only to fail fast in the
// browser instead of spending an upload on a rejection. When they disagree the
// server wins, so err on the side of ALLOWING here: a false reject is invisible
// to the user ("unsupported file type" for a workbook SheetJS reads natively),
// while a false accept just surfaces the server's own clear 415.
const ACCEPTED_EXTS = ['pdf', 'docx', 'txt', 'md', 'csv', 'tsv', 'xlsx', 'xls',
  // Macro-enabled + OpenDocument siblings: same parsers as their twins
  // (sheet-direct reads xlsm/ods natively), previously rejected client-side.
  'xlsm', 'ods', 'docm', 'odt', 'rtf', 'epub', 'pptm', 'odp',
  // pptx/ppt are parsed by Docling server-side + listed in the picker accept=
  // attr; they were missing here, so the client rejected them before upload.
  'pptx', 'ppt', 'html', 'htm',
  // Images routed to /api/ingest/image (Groq vision pipeline) instead of docling.
  'png', 'jpg', 'jpeg', 'tiff', 'tif', 'webp', 'gif',
  // Audio transcribed server-side via Groq Whisper (server.js docling-adapter).
  // These were in the dropzone accept= attr but missing here, so audio files
  // were rejected client-side before they ever reached the upload pipeline.
  'mp3', 'wav', 'm4a', 'ogg', 'flac'];
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac']);

// File-based imports — typed entry cards below the upload dropzone. Each card
// opens a file picker scoped to one document family, then feeds the SAME
// queueFilesForUpload pipeline as the dropzone (scope modal → smart-extract →
// handleFiles). The `accept` strings are subsets of the dropzone's accept attr.
const IMPORT_TYPES = [
  {
    key: 'pdf',
    icon: FileText,
    iconColor: 'text-[#ef4444]',
    accept: '.pdf',
    titleKey: 'knowledgebase.importPdfTitle',
    titleDefault: 'PDF',
    descKey: 'knowledgebase.importPdfDesc',
    descDefault: 'Extract content from PDF documents',
  },
  {
    key: 'word',
    icon: FileText,
    iconColor: 'text-[#2563eb]',
    accept: '.docx,.doc',
    titleKey: 'knowledgebase.importWordTitle',
    titleDefault: 'Word',
    descKey: 'knowledgebase.importWordDesc',
    descDefault: 'DOCX & DOC documents',
  },
  {
    key: 'csv',
    icon: Sheet,
    iconColor: 'text-[#16a34a]',
    accept: '.csv,.tsv,.xlsx,.xls',
    titleKey: 'knowledgebase.importCsvTitle',
    titleDefault: 'Spreadsheet',
    descKey: 'knowledgebase.importCsvDesc',
    descDefault: 'CSV, TSV & Excel data',
  },
  {
    key: 'slides',
    icon: Presentation,
    iconColor: 'text-[#ea580c]',
    accept: '.pptx,.ppt',
    titleKey: 'knowledgebase.importSlidesTitle',
    titleDefault: 'Slides',
    descKey: 'knowledgebase.importSlidesDesc',
    descDefault: 'PowerPoint presentations',
  },
  {
    key: 'text',
    icon: FileType,
    iconColor: 'text-[#525252]',
    accept: '.txt,.md,.markdown',
    titleKey: 'knowledgebase.importTextTitle',
    titleDefault: 'Text & Markdown',
    descKey: 'knowledgebase.importTextDesc',
    descDefault: 'Plain text & formatted notes',
  },
  {
    key: 'html',
    icon: Code2,
    iconColor: 'text-[#117dff]',
    accept: '.html,.htm',
    titleKey: 'knowledgebase.importHtmlTitle',
    titleDefault: 'HTML',
    descKey: 'knowledgebase.importHtmlDesc',
    descDefault: 'Web pages & structured content',
  },
  {
    key: 'image',
    icon: ImageIcon,
    iconColor: 'text-[#9333ea]',
    accept: '.png,.jpg,.jpeg,.tiff,.tif,.webp,.gif',
    titleKey: 'knowledgebase.importImageTitle',
    titleDefault: 'Images',
    descKey: 'knowledgebase.importImageDesc',
    descDefault: 'PNG, JPG, TIFF — vision OCR',
  },
  {
    key: 'audio',
    icon: FileAudio,
    iconColor: 'text-[#0891b2]',
    accept: '.mp3,.wav,.m4a,.ogg,.flac',
    titleKey: 'knowledgebase.importAudioTitle',
    titleDefault: 'Audio',
    descKey: 'knowledgebase.importAudioDesc',
    descDefault: 'MP3, WAV, M4A — transcribed',
  },
];

// ─── Robust upload helpers ─────────────────────────────────────────────
// We do NOT use localStorage for upload buffers — it caps at ~5MB, is
// synchronous (blocks main thread), and is lost on cache clear. Instead
// we use sessionStorage for SMALL just-uploaded-doc rows (metadata only,
// no blobs) so a page refresh during indexing doesn't make a doc
// 'disappear'. Real bytes are streamed straight to the server.

const SESSION_KEY = 'hm-kb-pending';

function loadPendingFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingToSession(docs) {
  try {
    // Only keep metadata fields — never serialize the original File blob.
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(docs.slice(0, 40)));
  } catch {
    /* quota or private mode — non-fatal */
  }
}

// SHA-256 of file bytes via WebCrypto. Used to detect re-uploads before
// even hitting the server. Returns lowercase hex.
async function sha256File(file) {
  if (!file || !window.crypto?.subtle) return null;
  try {
    const buf = await file.arrayBuffer();
    const digest = await window.crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

// Look at an existing doc's tags for the backend's doc-hash:<16hex> tag.
function getDocHashTag(doc) {
  const tags = doc?.tags || [];
  const hit = tags.find((t) => typeof t === 'string' && t.startsWith('doc-hash:'));
  return hit ? hit.split(':')[1] : null;
}

// Dependency-free PDF page count — no pdfjs, no worker, no bundle cost.
// Reads the page tree straight from the bytes: prefers the /Pages root
// /Count, falls back to counting /Type /Page leaf objects. Returns null when
// it genuinely cannot tell (object-stream / compressed PDFs) so the caller
// treats it as "unknown" (→ 1), never as zero. Scan is byte-capped so a huge
// PDF never janks the main thread.
async function countPdfPages(file) {
  try {
    const SCAN_CAP = 12 * 1024 * 1024; // page tree/catalog is near the head+tail
    const buf = await file.arrayBuffer();
    const all = new Uint8Array(buf);
    let bytes = all;
    if (all.length > SCAN_CAP) {
      const head = all.subarray(0, 8 * 1024 * 1024);
      const tail = all.subarray(all.length - 4 * 1024 * 1024);
      bytes = new Uint8Array(head.length + tail.length);
      bytes.set(head, 0); bytes.set(tail, head.length);
    }
    // latin1 keeps byte values 1:1 so the raw PDF tokens match.
    let s = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    // Prefer the page-tree root: /Type /Pages ... /Count N. The document total
    // is the largest /Count (the root node aggregates all kids).
    let max = 0; let m;
    const countRe = /\/Count\s+(\d+)/g;
    while ((m = countRe.exec(s))) { const n = Number(m[1]); if (n > max) max = n; }
    if (max > 0) return max;
    // Fallback: count leaf page objects (/Type /Page NOT followed by 's').
    const leaves = (s.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
    return leaves > 0 ? leaves : null;
  } catch { return null; }
}

// Plan "pages" an upload will consume, mirroring the backend estimate
// (upload-service._estimatePages): image → 1, pdf → real page count,
// every other document → 1 pre-parse (real count settles server-side).
async function estimateFilePages(file) {
  const ext = (file?.name?.split('.').pop() || '').toLowerCase();
  if (IMAGE_EXTS.has(ext) || /^image\//.test(file?.type || '')) return 1;
  if (ext === 'pdf') { const n = await countPdfPages(file); return n && n > 0 ? n : 1; }
  return 1;
}

function pendingFileKey(file) { return `${file.name}::${file.size}`; }

// The evidence API is keyed by a UUID. Filenames are not identities: users can
// upload the same name again with new content or into a different scope.
function documentIdFrom(doc) {
  const tags = doc?.tags || [];
  const hit = tags.find((t) => typeof t === 'string' && t.startsWith('doc-id:'));
  return hit ? hit.slice('doc-id:'.length) : (doc?.metadata?.document_id || null);
}

// Filename for a doc — from a `filename:` tag, else the title. Used to dedup
// the past-docs list (segments/re-uploads of the same file collapse to one).
function docFilename(doc) {
  const tags = doc?.tags || [];
  const hit = tags.find((t) => typeof t === 'string' && t.startsWith('filename:'));
  if (hit) return hit.slice('filename:'.length).toLowerCase();
  return (doc?.title || '').trim().toLowerCase() || null;
}

// Project label for a doc (project string or projectId), for the past-docs chip.
function docProject(doc) {
  if (doc?.project) return doc.project;
  if (doc?.project_id || doc?.projectId) return doc.project_id || doc.projectId;
  const tags = doc?.tags || [];
  const hit = tags.find((t) => typeof t === 'string' && t.startsWith('project:'));
  return hit ? hit.slice('project:'.length) : null;
}

const TYPE_LABELS = {
  invoice: 'Invoice / Purchase Order',
  contract: 'Contract / Legal',
  sop: 'Knowledge Base / SOP',
  spreadsheet: 'Spreadsheet / Data Export',
  meeting: 'Meeting Notes / Reports',
  general: 'General / Other',
};

const TYPE_COLORS = {
  invoice: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  contract: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  sop: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  spreadsheet: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  meeting: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  general: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

function UploadScopeModal({
  open,
  files,
  org,
  userRole,
  projects,
  loadingProjects,
  projectsError,
  onRetryProjects,
  selectedScope,
  onScopeChange,
  selectedProject,
  onProjectChange,
  pageCounts = {},
  onRemoveFile,
  pagesRemaining = Infinity,
  pagesUsed = 0,
  pagesLimit = -1,
  pagesUnlimited = true,
  onUpgrade,
  onConfirm,
  onClose,
}) {
  const { t } = useTranslation('dashboard');

  if (!open) return null;

  // Three-tier upload hierarchy:
  //   1. personal      — private to the uploader, everyone has it
  //   2. project       — shared with that project's invited members (+ org
  //                      admins, who see every project); requires picking one
  //   3. organization  — org-wide, visible to ALL members; ADMIN/OWNER ONLY
  //                      (one admin uploads once, whole org gets it)
  // Project + org tiers are gated by ROLE, not plan tier — the backend
  // (authorizeKnowledgeScope) authorizes org-wide on admin/owner and project on
  // membership, with no plan check. The old `plan === team|enterprise` gate
  // greyed scopes the server would actually accept, so it's dropped.
  const isOrgAdmin = userRole === 'owner' || userRole === 'admin';
  const requiresProject = selectedScope === 'project';

  // Client-side page estimate for the batch (matches backend _estimatePages).
  // A file still counting shows "…" and is treated as ≥1 so the gate never
  // under-counts. This gates PAGE quota only — LLM token usage never blocks uploads.
  const perFilePages = (file) => {
    const v = pageCounts[`${file.name}::${file.size}`];
    return typeof v === 'number' ? Math.max(1, v) : 1;
  };
  const anyCounting = files.some((f) => pageCounts[`${f.name}::${f.size}`] === 'counting');
  const totalPages = files.reduce((s, f) => s + perFilePages(f), 0);
  const overLimit = !pagesUnlimited && totalPages > pagesRemaining;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-lg rounded-2xl border border-[#e3e0db] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col max-h-[88vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 p-6 pb-4 shrink-0">
            <div>
              <h3 className="text-[#0a0a0a] text-lg font-semibold font-['Space_Grotesk']">{t('knowledgebase.scopeModalTitle', 'Save uploaded memories to')}</h3>
              <p className="text-[#525252] text-sm mt-1">
                {t('knowledgebase.scopeModalSubtitle', 'Choose where these files should live before upload starts.')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scroll region — the modal is a fixed size, so the batch list + scope
              tiers scroll INSIDE it. A 25-file batch can no longer push the
              Upload button off-screen. */}
          <div className="px-6 overflow-y-auto flex-1 min-h-0">
          <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-4 py-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3]">
                {t('knowledgebase.uploadBatch', 'Upload batch')} · {files.length}
              </p>
              <p className="text-[11px] font-mono text-[#a3a3a3]">
                {anyCounting ? '… pages' : `${totalPages} page${totalPages === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
              {files.map((file) => {
                const pv = pageCounts[`${file.name}::${file.size}`];
                const pageLabel = pv === 'counting' || pv === undefined
                  ? '…'
                  : `${pv} pg`;
                return (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2 text-sm group">
                    <span className="truncate text-[#0a0a0a] flex-1 min-w-0">{file.name}</span>
                    <span className="text-[#a3a3a3] text-[11px] font-mono shrink-0">{pageLabel}</span>
                    <span className="text-[#a3a3a3] text-[11px] font-mono shrink-0 w-16 text-right">{formatBytes(file.size)}</span>
                    {onRemoveFile && (
                      <button
                        type="button"
                        onClick={() => onRemoveFile(file)}
                        title={t('knowledgebase.removeFile', 'Remove from batch')}
                        className="shrink-0 rounded p-0.5 text-[#c4c0b6] hover:text-[#dc2626] hover:bg-white"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Page quota line — the ONLY gate on an upload. Never LLM tokens. */}
            {!pagesUnlimited && (
              <div className={`mt-2 pt-2 border-t border-[#ece8de] flex items-center justify-between text-[11px] font-mono ${overLimit ? 'text-[#dc2626]' : 'text-[#a3a3a3]'}`}>
                <span>{t('knowledgebase.pagesQuota', 'Pages')}: {totalPages} of {Math.max(0, pagesRemaining)} left{pagesLimit >= 0 ? ` (${pagesUsed}/${pagesLimit} used)` : ''}</span>
                {overLimit && (
                  <button type="button" onClick={onUpgrade} className="font-semibold text-[#117dff] hover:text-[#0e6fe0]">
                    {t('knowledgebase.upgradeForPages', 'Upgrade for more →')}
                  </button>
                )}
              </div>
            )}
            {overLimit && (
              <p className="mt-1.5 text-[11px] text-[#dc2626]">
                {t('knowledgebase.overLimitHint', 'This batch is over your page limit. Remove a file (✕) or upgrade to continue.')}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {/* Tier 1 — Personal: everyone, private */}
            <button
              type="button"
              onClick={() => onScopeChange('personal')}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedScope === 'personal'
                  ? 'border-[#117dff]/30 bg-[#117dff]/8'
                  : 'border-[#e3e0db] bg-white hover:bg-[#faf9f4]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center">
                  <User size={16} className="text-[#117dff]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.scopePersonalLabel', 'My Space')}</p>
                  <p className="text-xs text-[#525252]">{t('knowledgebase.scopePersonalDesc', 'Private memories only visible in your personal workspace.')}</p>
                </div>
              </div>
            </button>

            {/* Tier 2 — Project: shared with that project's invited members
                (org admins see every project; members see only theirs) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onScopeChange('project')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onScopeChange('project'); }}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors cursor-pointer ${
                selectedScope === 'project'
                  ? 'border-[#117dff]/30 bg-[#117dff]/8'
                  : 'border-[#e3e0db] bg-white hover:bg-[#faf9f4]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center">
                  <FolderKanban size={16} className="text-[#117dff]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.scopeProjectLabel', 'Project')}</p>
                  <p className="text-xs text-[#525252]">{t('knowledgebase.scopeProjectDesc', 'Shared with the members invited to that project.')}</p>
                </div>
              </div>
              {selectedScope === 'project' && (
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  {loadingProjects ? (
                    <p className="text-xs text-[#a3a3a3]">{t('knowledgebase.loadingProjects', 'Loading projects...')}</p>
                  ) : projectsError ? (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[#dc2626]">{projectsError}</p>
                      <button
                        type="button"
                        onClick={onRetryProjects}
                        className="shrink-0 rounded-md border border-[#e3e0db] px-2 py-1 text-[11px] font-semibold text-[#525252] hover:bg-[#faf9f4]"
                      >
                        {t('knowledgebase.retry', 'Retry')}
                      </button>
                    </div>
                  ) : projects.length > 0 ? (
                    <>
                      <select
                        value={selectedProject}
                        onChange={(e) => onProjectChange(e.target.value)}
                        className="w-full rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2.5 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40"
                      >
                        <option value="">{t('knowledgebase.pickProject', 'Select a project…')}</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.slug}>
                            {project.name} ({project.slug})
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-[11px] text-[#a3a3a3]">
                        {t('knowledgebase.projectUploadsHint', 'You only see projects you belong to. Org admins see all projects.')}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-[#a3a3a3]">
                      {t('knowledgebase.noAccessibleProjects', "You're not a member of any project yet. Ask an org admin to invite you, or choose another scope.")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tier 3 — Organization-wide: ADMIN/OWNER only. Uploaded once,
                visible to every member of the org. */}
            <button
              type="button"
              disabled={!isOrgAdmin}
              onClick={() => isOrgAdmin && onScopeChange('organization')}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedScope === 'organization'
                  ? 'border-[#117dff]/30 bg-[#117dff]/8'
                  : 'border-[#e3e0db] bg-white hover:bg-[#faf9f4]'
              } ${!isOrgAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center">
                  <Users size={16} className="text-[#117dff]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
                    {org?.name
                      ? t('knowledgebase.scopeOrgLabelNamed', 'Entire organization: {{name}}', { name: org.name })
                      : t('knowledgebase.scopeOrgLabel', 'Entire organization')}
                  </p>
                  <p className="text-xs text-[#525252]">
                    {isOrgAdmin
                      ? t('knowledgebase.scopeOrgDesc', 'Visible to every member of the org.')
                      : t('knowledgebase.scopeOrgDescLocked', 'Org-wide uploads are reserved for organization admins.')}
                  </p>
                </div>
              </div>
            </button>
          </div>

          </div>{/* end scroll region */}

          <div className="flex items-center justify-end gap-3 p-6 pt-4 shrink-0 border-t border-[#f0ede6]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-[#e3e0db] px-4 py-2.5 text-sm font-semibold text-[#525252]"
            >
              {t('knowledgebase.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={(requiresProject && !selectedProject) || overLimit}
              title={overLimit
                ? t('knowledgebase.overLimitTitle', 'This batch exceeds your page limit — remove files or upgrade.')
                : (requiresProject && !selectedProject ? t('knowledgebase.pickProjectTitle', 'Pick a project first.') : '')}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e6fe0] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={14} />
              {overLimit
                ? t('knowledgebase.overLimit', 'Over page limit')
                : t('knowledgebase.uploadFilesN', 'Upload {{count}} file{{plural}}', { count: files.length, plural: files.length === 1 ? '' : 's' })}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText size={16} className="text-[#ef4444]" />;
  if (ext === 'docx') return <FileText size={16} className="text-[#3b82f6]" />;
  if (ext === 'csv') return <HardDrive size={16} className="text-[#22c55e]" />;
  if (ext === 'xlsx' || ext === 'xls') return <Sheet size={16} className="text-[#16a34a]" />;
  return <File size={16} className="text-[#a3a3a3]" />;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return ts; }
}

function EnterpriseDetectModal({ open, onClose, detectionResult, onIngest, ingesting }) {
  const [confirmedType, setConfirmedType] = useState(detectionResult?.detected_type || 'general');
  const [sheetConfigs, setSheetConfigs] = useState([]);
  const [modalTags, setModalTags] = useState('');
  const [modalScope, setModalScope] = useState('organization');

  useEffect(() => {
    if (detectionResult?.sheets) {
      setSheetConfigs(detectionResult.sheets.map((s) => ({
        sheet_name: s.sheet_name,
        confirmed_type: s.detected_type,
        include: !s.empty && s.row_count > 0,
        row_count: s.row_count,
        confidence: s.confidence,
      })));
    }
    if (detectionResult?.detected_type) {
      setConfirmedType(detectionResult.detected_type);
    }
  }, [detectionResult]);

  const { t } = useTranslation('dashboard');

  if (!open || !detectionResult) return null;

  const handleSubmit = () => {
    onIngest({
      confirmedType,
      sheetConfigs: sheetConfigs.length > 0 ? sheetConfigs.filter((s) => s.include) : undefined,
      tags: modalTags,
      scope: modalScope,
      model: detectionResult.model,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-lg rounded-2xl border border-[#e3e0db] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-[#0a0a0a] text-lg font-semibold font-['Space_Grotesk']">{t('knowledgebase.documentAnalysis', 'Document Analysis')}</h3>
              <p className="text-[#525252] text-sm mt-1 truncate max-w-[340px]">
                {detectionResult.filename}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]"
            >
              <X size={16} />
            </button>
          </div>

          {/* File info */}
          <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-4 py-3 mb-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#0a0a0a] font-mono text-xs truncate">{detectionResult.filename}</span>
              <span className="text-[#a3a3a3] text-[11px] font-mono shrink-0 ml-2">
                {formatBytes(detectionResult.size_bytes || 0)}
              </span>
            </div>
          </div>

          {/* Detected type */}
          <div className="mb-5">
            <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3] mb-2 block">
              {t('knowledgebase.detectedType', 'Detected Type')}
            </label>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-[#525252] font-['Space_Grotesk']">
                {TYPE_LABELS[detectionResult.detected_type] || detectionResult.detected_type}
                {detectionResult.confidence != null && (
                  <span className="text-[#a3a3a3] ml-1">({detectionResult.confidence}%)</span>
                )}
              </span>
            </div>
            <div className="relative">
              <select
                value={confirmedType}
                onChange={(e) => setConfirmedType(e.target.value)}
                className="w-full appearance-none rounded-[8px] border border-[#e3e0db] px-3 py-2.5 pr-8 text-sm text-[#0a0a0a] font-['Space_Grotesk'] focus:outline-none focus:border-[#117dff]/40 bg-white"
              >
                {(detectionResult.available_types || Object.keys(TYPE_LABELS)).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] pointer-events-none" />
            </div>
          </div>

          {/* Sheets (Excel) */}
          {sheetConfigs.length > 0 && (
            <div className="mb-5">
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3] mb-2 block">
                {t('knowledgebase.sheets', 'Sheets')}
              </label>
              <div className="space-y-2">
                {sheetConfigs.map((sheet, idx) => (
                  <div key={sheet.sheet_name} className="flex items-center gap-3 rounded-lg border border-[#ece8de] bg-[#faf9f4] px-3 py-2">
                    <input
                      type="checkbox"
                      checked={sheet.include}
                      onChange={(e) => {
                        const next = [...sheetConfigs];
                        next[idx] = { ...next[idx], include: e.target.checked };
                        setSheetConfigs(next);
                      }}
                      className="rounded border-[#e3e0db] text-[#117dff] focus:ring-[#117dff]/30"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Sheet size={12} className="text-[#525252]" />
                        <span className="text-xs font-['Space_Grotesk'] text-[#0a0a0a] truncate">{sheet.sheet_name}</span>
                        <span className="text-[10px] font-mono text-[#a3a3a3]">{sheet.row_count} rows</span>
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <select
                        value={sheet.confirmed_type}
                        onChange={(e) => {
                          const next = [...sheetConfigs];
                          next[idx] = { ...next[idx], confirmed_type: e.target.value };
                          setSheetConfigs(next);
                        }}
                        className="appearance-none rounded border border-[#e3e0db] bg-white pl-2 pr-6 py-1 text-[10px] font-mono text-[#525252] focus:outline-none focus:border-[#117dff]/40"
                      >
                        {(detectionResult.available_types || Object.keys(TYPE_LABELS)).map((t) => (
                          <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#a3a3a3] pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model display */}
          {detectionResult.model && (
            <p className="text-[10px] font-mono text-[#a3a3a3] mb-4">
              Model: {detectionResult.model}
            </p>
          )}

          {/* Tags input */}
          <div className="mb-5">
            <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3] mb-2 block">
              {t('knowledgebase.tags', 'Tags')}
            </label>
            <div className="flex items-center gap-2">
              <Tag size={12} className="text-[#a3a3a3]" />
              <input
                type="text"
                value={modalTags}
                onChange={(e) => setModalTags(e.target.value)}
                placeholder={t('knowledgebase.tagsPlaceholder', 'Optional tags (comma-separated)')}
                className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[#0a0a0a] placeholder:text-[#d4d0ca] focus:outline-none focus:border-[#117dff]"
              />
            </div>
          </div>

          {/* Scope toggle */}
          <div className="mb-6">
            <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3] mb-2 block">
              {t('knowledgebase.scope', 'Scope')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalScope('personal')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-['Space_Grotesk'] font-semibold transition-colors ${
                  modalScope === 'personal'
                    ? 'bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/30'
                    : 'bg-white text-[#525252] border border-[#e3e0db] hover:bg-[#faf9f4]'
                }`}
              >
                <User size={12} />
                {t('knowledgebase.scopePersonal', 'Personal')}
              </button>
              <button
                type="button"
                onClick={() => setModalScope('organization')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-['Space_Grotesk'] font-semibold transition-colors ${
                  modalScope === 'organization'
                    ? 'bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/30'
                    : 'bg-white text-[#525252] border border-[#e3e0db] hover:bg-[#faf9f4]'
                }`}
              >
                <Users size={12} />
                {t('knowledgebase.scopeTeam', 'Team')}
              </button>
            </div>
          </div>

          {/* Reasoning */}
          {detectionResult.reasoning && (
            <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-4 py-3 mb-5">
              <p className="text-[10px] font-mono text-[#a3a3a3] mb-1">{t('knowledgebase.analysisReasoning', 'Analysis reasoning')}</p>
              <p className="text-xs text-[#525252] font-['Space_Grotesk']">{detectionResult.reasoning}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-[#e3e0db] px-4 py-2.5 text-sm font-semibold text-[#525252]"
            >
              {t('knowledgebase.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={ingesting}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e6fe0] disabled:opacity-50"
            >
              {ingesting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('knowledgebase.extracting', 'Extracting...')}
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  {t('knowledgebase.extractAndIngest', 'Extract & Ingest')}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


// Server-side upload limits, verified live against core:
//   60 MB  -> 413 {"error":"payload_too_large","max_bytes":52428800}
//   0 B    -> 400 "The uploaded file is empty — nothing to ingest."
//   1 B    -> 400 "...below the 32-byte minimum"
// Those raw codes reached the user verbatim ("payload_too_large"), which is a
// machine string, not something a person can act on. Map them to what the user
// should DO. Everything else falls through to the server's own message, which is
// already written for humans on the validation paths.
export const KB_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const KB_MIN_UPLOAD_BYTES = 32;

function friendlyUploadError(err) {
  const st = err?.response?.status;
  const data = err?.response?.data || {};
  const raw = String(data.error || data.message || err?.message || '');
  if (st === 413 || raw.includes('payload_too_large')) {
    const cap = Number(data.max_bytes) || KB_MAX_UPLOAD_BYTES;
    return `Too large — the limit is ${Math.round(cap / (1024 * 1024))} MB. Split the file and upload the parts.`;
  }
  if (st === 400 && /empty/i.test(raw)) return 'This file is empty — there is nothing to ingest.';
  if (st === 400 && /minimum|too small/i.test(raw)) return 'This file is too small to contain readable content.';
  if (st === 415 || /unsupported|mime/i.test(raw)) {
    return 'Unsupported file type. Use PDF, Word, Excel, PowerPoint, CSV, Markdown, text or an image.';
  }
  if (st === 401 || st === 403) return 'You are not signed in, or lack access to this workspace.';
  return raw || 'Upload failed.';
}

// Pre-flight so an oversized file is refused instantly instead of after a full
// upload that ends in 413 — on a 60 MB file that is minutes of the user's time
// spent to be told no.
function preflightRejectReason(file) {
  const size = Number(file?.size ?? 0);
  if (size === 0) return 'This file is empty — there is nothing to ingest.';
  if (size < KB_MIN_UPLOAD_BYTES) return 'This file is too small to contain readable content.';
  if (size > KB_MAX_UPLOAD_BYTES) {
    return `Too large — the limit is ${Math.round(KB_MAX_UPLOAD_BYTES / (1024 * 1024))} MB. Split the file and upload the parts.`;
  }
  return null;
}

export default function KnowledgeBase() {
  const { t } = useTranslation('dashboard');
  const { org, user } = useAuth();
  // Uploads live in a module-level store so they survive navigation away
  // from this page. `setUploads` here is a pass-through writer; the
  // GlobalUploadStrip (mounted in AppShell) subscribes to the same store
  // and keeps rendering the rows from any page.
  const uploads = useUploads();
  const setUploads = setGlobalUploads;
  const [dragActive, setDragActive] = useState(false);
  const [customTags, setCustomTags] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  // Client-side page estimate per pending file (key `name::size`). Value:
  // number = counted, 'counting' = in progress, undefined = not yet started.
  const [pendingPageCounts, setPendingPageCounts] = useState({});
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState('organization'); // org-visible by default; project optional
  const [selectedProject, setSelectedProject] = useState('');

  // Live kbPages quota (used/limit) so the scope modal can gate an upload that
  // would blow the plan BEFORE any byte leaves the browser. limit === -1 =
  // unlimited. Usage is the PAGE meter only — LLM token spend never gates uploads.
  const { usage: planUsage } = useUsage();
  const kbPagesLimit = typeof planUsage?.kbPages?.limit === 'number' ? planUsage.kbPages.limit : -1;
  const kbPagesUsed = Number(planUsage?.kbPages?.used) || 0;
  const kbPagesUnlimited = kbPagesLimit === -1;
  const kbPagesRemaining = kbPagesUnlimited ? Infinity : Math.max(0, kbPagesLimit - kbPagesUsed);
  const [teamProjects, setTeamProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  // Hydrate pending docs from sessionStorage so a refresh mid-indexing
  // doesn't visually "lose" docs the user just uploaded.
  const [justUploadedDocs, setJustUploadedDocs] = useState(() => loadPendingFromSession());
  const [pageIndexModalOpen, setPageIndexModalOpen] = useState(false);
  const [smartExtract, setSmartExtract] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);
  const [enterpriseIngesting, setEnterpriseIngesting] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  // Creator-only delete: set when a non-owner tries to delete (shows a popup).
  const [notOwnerInfo, setNotOwnerInfo] = useState(null);
  // Bulk-select state — Map<docId, doc> so we can pass full objects to delete handler
  const [bulkSelected, setBulkSelected] = useState(new Map());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const typedImportRef = useRef(null);
  // Per-document relationship summaries: { <docId>: { total, byType, cluster_size } }
  const [relSummaries, setRelSummaries] = useState({});

  const { data: kbMemories, loading: kbLoading, refetch: refetchKb } = useApiQuery(async () => {
    // Fetch from THREE tag families in parallel — covers regular uploads, enterprise
    // schema records, and the broader 'knowledge-base' bucket. Trust the backend tag:
    // never filter out a document just because its metadata fields are missing
    // (Smart Ingest UPDATE relationships sometimes strip metadata into a new version).
    const tagQueries = ['document-summary', 'schema-record', 'knowledge-base'];
    // Bumped limit 100 → 500 per tag family. Earlier 100 silently truncated
    // accounts past 100 docs, which read as 'losing past documents'.
    // owner_only:true scopes server-side to THIS user's own uploads so other
    // members' org/project-shared docs never cross the wire (the client-side
    // owner filter below stays as defense-in-depth).
    const settled = await Promise.allSettled(
      tagQueries.map(tag => apiClient.listMemories({ tags: tag, limit: 500, scope: 'all', owner_only: true }))
    );

    const seenIds = new Set();
    const byDoc = new Map();   // documentId -> newest qualifying memory
    const docs = [];
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      const memories = result.value?.memories || [];
      for (const m of memories) {
        if (seenIds.has(m.id)) continue;
        const tags = m.tags || [];
        const title = m.title || '';
        const meta = m.metadata || {};
        const srcMeta = m.source_metadata || {};
        const isDoc =
          tags.includes('document-summary') ||
          tags.includes('schema-record') ||
          title.startsWith('Document:') ||
          srcMeta.source_type === 'document-upload' ||
          !!meta.document_title ||
          !!meta.total_chunks;
        const isChunk = tags.some(t => t.startsWith('section:') || t.startsWith('page:') || t.startsWith('chunk:'));
        if (isDoc && !isChunk) {
          // DEDUPE BY DOCUMENT, NOT BY MEMORY. `seenIds` keys on m.id, but this is a list of
          // DOCUMENTS — and one document legitimately produces several qualifying memories (a
          // `document-summary` AND a `schema-record`, plus a fresh summary on every re-ingest).
          // Verified on live data: memories e659366b, fb2dffc1 and d7115c88 all carry the SAME
          // metadata.document_id (ed13dc1d…), so that one PDF rendered as three rows. This is the
          // reported "duplicates even after I deleted them": the list is derived from memories, so a
          // document lingers while any of its memories survive, and re-uploading multiplies it.
          // Keep the NEWEST memory per document — it carries the current counts and title.
          const docKey = meta.document_id
            || srcMeta.document_id
            || (tags.find((t) => t.startsWith('source-id:')) || '')
            || m.id;                       // last resort: behave exactly as before
          const prev = byDoc.get(docKey);
          const ts = Date.parse(m.updated_at || m.created_at || 0) || 0;
          if (prev && prev.__ts >= ts) continue;
          seenIds.add(m.id);
          m.__ts = ts;
          byDoc.set(docKey, m);
        }
      }
    }

    // One row per DOCUMENT, newest first.
    docs.push(...[...byDoc.values()].sort((a, b) => (b.__ts || 0) - (a.__ts || 0)));

    // Last-ditch fallback: if all three queries returned nothing, try semantic search.
    if (docs.length === 0) {
      try {
        const result = await apiClient.searchMemories('knowledge-base document-summary', { scope: 'all', n_results: 100 });
        const fallback = (result?.results || result?.memories || []).filter((m) => {
          const tags = m.tags || [];
          return tags.includes('document-summary') || tags.includes('schema-record');
        });
        for (const m of fallback) {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            docs.push(m);
          }
        }
      } catch { /* swallow — empty list is acceptable here */ }
    }

    // OWN-DOCS-ONLY: KB doc-summaries are scope='organization' by default, so a
    // scope:'all' fetch surfaces OTHER users' org/project-shared docs too. The
    // Documents list must show only what THIS user uploaded → filter by owner.
    // (Gate on a known user id; the query re-runs once auth resolves.)
    const ownDocs = user?.id
      ? docs.filter((d) => (d.user_id || d.owner?.id) === user.id)
      : [];
    return ownDocs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [user?.id]);

  // Fetch per-doc relationship summaries in batch whenever the doc list changes.
  // Backend resolves doc+chunk cluster then groups by relationship type so we
  // can show "(N relations: X Updates, Y Extends, Z Derives)" per card.
  useEffect(() => {
    if (!kbMemories || kbMemories.length === 0) return;
    const docIds = kbMemories.map(d => d.id).filter(Boolean).slice(0, 100);
    if (docIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.knowledgeRelationsSummary(docIds);
        if (!cancelled) setRelSummaries(data?.summaries || {});
      } catch (err) {
        console.warn('relations-summary fetch failed:', err?.response?.data?.message || err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [kbMemories]);

  // Phase 1 stats must join on the immutable document id. Joining by filename
  // made a re-upload inherit another document's segment/fact totals.
  const [phase1Stats, setPhase1Stats] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiClient.listDocuments({ limit: 200 });
        if (cancelled) return;
        const map = {};
        for (const d of (resp?.documents || [])) {
          if (!d?.id) continue;
          map[d.id] = { segments: d.segmentCount || 0, memories: d.promotedCount || 0 };
        }
        setPhase1Stats(map);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [kbMemories]);

  // Combine fetched documents with just-uploaded ones for immediate display
  const documents = useMemo(() => {
    if (!kbMemories) return justUploadedDocs;
    if (!justUploadedDocs.length) return kbMemories;

    // Create a Set of fetched doc IDs to avoid duplicates
    const fetchedIds = new Set(kbMemories.map((d) => d.id));

    // Filter out just-uploaded docs that are now in fetched list
    const pendingUploads = justUploadedDocs.filter((d) => !fetchedIds.has(d.id));

    // Combine and sort by date
    const combined = [...kbMemories, ...pendingUploads];
    // Dedup: collapse multiple rows of the same document (segment-promoted
    // memories, re-uploads) into one — key by doc-hash, else filename, else id.
    const seen = new Map();
    for (const d of combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))) {
      // filename FIRST so the document-summary parent (no doc-hash tag) and its
      // promoted children (doc-hash tag) collapse into ONE row. doc-hash/id are
      // fallbacks for rows lacking a filename.
      const key = docFilename(d) || getDocHashTag(d) || d.id;
      if (!seen.has(key)) seen.set(key, d);
    }
    return [...seen.values()];
  }, [kbMemories, justUploadedDocs]);

  // Filter documents by type
  const filteredDocuments = useMemo(() => {
    if (typeFilter === 'all') return documents;
    return documents.filter((doc) => {
      const docType = doc.metadata?.document_type;
      const typeTag = (doc.tags || []).find((t) => t.startsWith('document_type:'));
      const tagType = typeTag ? typeTag.split(':')[1] : null;
      return docType === typeFilter || tagType === typeFilter;
    });
  }, [documents, typeFilter]);

  // Clear just-uploaded docs once they appear in fetched results.
  // Match either by id OR by doc-hash so deduped uploads also resolve.
  useEffect(() => {
    if (kbMemories && justUploadedDocs.length > 0) {
      const fetchedIds = new Set(kbMemories.map((d) => d.id));
      const fetchedHashes = new Set(kbMemories.map(getDocHashTag).filter(Boolean));
      const stillPending = justUploadedDocs.filter((d) => {
        if (fetchedIds.has(d.id)) return false;
        const h = d.docHash || getDocHashTag(d);
        if (h && fetchedHashes.has(h)) return false;
        return true;
      });
      if (stillPending.length < justUploadedDocs.length) {
        setJustUploadedDocs(stillPending);
      }
    }
  }, [kbMemories, justUploadedDocs]);

  // Persist pending list to sessionStorage so a refresh mid-indexing
  // doesn't visually drop documents that are still being processed
  // server-side. sessionStorage is per-tab, ~5MB cap — we only store
  // metadata rows (no blobs).
  useEffect(() => {
    savePendingToSession(justUploadedDocs);
  }, [justUploadedDocs]);

  // Bulk delete — iterates the selected map and runs deleteDocument per doc.
  // Concurrency 3 so backend isn't slammed.
  const handleBulkDelete = useCallback(async () => {
    if (bulkSelected.size === 0) return;
    if (!window.confirm(`Delete ${bulkSelected.size} document${bulkSelected.size === 1 ? '' : 's'}? This removes memories, segments, and evidence links.`)) return;
    setBulkDeleting(true);
    const docs = Array.from(bulkSelected.values());
    const CONC = 3;
    let i = 0;
    const workers = Array.from({ length: Math.min(CONC, docs.length) }, async () => {
      while (i < docs.length) {
        const idx = i++;
        const d = docs[idx];
        try { await handleDeleteDocument(d); } catch { /* per-doc errors swallowed */ }
      }
    });
    await Promise.all(workers);
    setBulkSelected(new Map());
    setBulkDeleting(false);
    // handleDeleteDocument already triggers fetched-doc updates per call.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkSelected]);

  const handleDeleteDocument = useCallback(async (docOrId) => {
    // Accept either a raw id (legacy) or the full doc object so we can
    // forward BOTH memory_id and upload_id. Just-uploaded docs carry an
    // upload_id in their id slot; persisted docs have a real memory
    // UUID. The api-client + core handler resolve whichever fits.
    const doc = (docOrId && typeof docOrId === 'object') ? docOrId : null;
    const docId = doc ? doc.id : docOrId;
    const uploadId = doc?.metadata?.upload_id
      || doc?.metadata?.source_upload_id
      || doc?.metadata?.sourceUploadId
      || doc?.source_metadata?.upload_id
      || doc?.source_metadata?.source_upload_id
      || doc?.source_metadata?.sourceUploadId
      || doc?.source_metadata?.metadata?.source_upload_id
      || doc?.source_metadata?.metadata?.upload_id
      || doc?.source_metadata?.metadata?.sourceUploadId
      || null;
    setDeletingDocId(docId);
    try {
      const result = await apiClient.deleteDocument({
        memoryId: docId,
        uploadId,
      });
      const deletedCount = result?.deleted || result?.deleted_count || result?.memory_ids?.length || null;
      // Optimistic local removal — refetch confirms.
      setJustUploadedDocs(prev => prev.filter(d => d.id !== docId));
      setDeleteConfirmId(null);
      // Surface count via temporary upload-status row so the user sees what happened.
      if (deletedCount) {
        setUploads(prev => [...prev, {
          id: `del-${Date.now()}-${Math.random()}`,
          filename: `Deleted ${deletedCount} memor${deletedCount === 1 ? 'y' : 'ies'} (document + chunks + facts)`,
          status: 'success', _completedAt: Date.now(),
        }]);
      }
      refetchKb();
    } catch (err) {
      // 404 = already gone (stale list). Treat as success: drop it + refetch,
      // don't show a scary error.
      if (err?.response?.status === 404) {
        setJustUploadedDocs(prev => prev.filter(d => d.id !== docId));
        setDeleteConfirmId(null);
        refetchKb();
      } else if (err?.response?.status === 403 && err?.response?.data?.code === 'not_owner') {
        // Creator-only delete: someone else uploaded this. Prompt to ask the owner.
        setNotOwnerInfo({ owner: err?.response?.data?.owner || null, docTitle: doc?.title || doc?.metadata?.document_title || 'this document' });
        setDeleteConfirmId(null);
      } else {
        console.error('Delete failed:', err);
        const serverMsg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Unknown error';
        setUploads(prev => [...prev, {
          id: `del-err-${Date.now()}`,
          filename: 'Delete failed',
          status: 'error',
          error: serverMsg,
        }]);
      }
    } finally {
      setDeletingDocId(null);
    }
  }, [refetchKb, setUploads]);

  // Role-scoped project list for the upload modal: the control-plane
  // (listProjectsForUser) filters by the caller's hierarchy — admins/owners
  // see all org projects, members only the projects they're invited to (or
  // org_visible ones), guests only explicit memberships. One retry on a
  // transient failure, and a visible error (instead of silently rendering
  // "no projects") so an auth/network problem is debuggable from the UI.
  // SAME data path as the working Workspace Admin → Projects tab
  // (TeamProjects.jsx): GET /v1/teams/:activeTeamId/projects, falling back to
  // GET /v1/projects (org-wide, role-scoped listProjectsForUser) when no team
  // is active. The previous /v1/orgs/:id/projects route stacked extra gates
  // (plan check + getOrgMembership) that intermittently left the picker stuck
  // on "Loading projects...".
  const { activeTeamId } = useTeamContext() || {};
  const fetchProjects = useCallback(async () => {
    if (!org?.id) {
      setTeamProjects([]);
      setProjectsError(null);
      return;
    }
    setLoadingProjects(true);
    setProjectsError(null);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = activeTeamId
          ? await apiClient.listTeamProjects(activeTeamId)
          : await apiClient.listAccessibleProjects();
        setTeamProjects(data.projects || []);
        setLoadingProjects(false);
        return;
      } catch (err) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        setTeamProjects([]);
        setProjectsError(err.response?.status === 401
          ? 'Session expired — refresh the page to sign back in.'
          : (err.response?.data?.error || err.message || 'Failed to load projects'));
      }
    }
    setLoadingProjects(false);
  }, [org?.id, activeTeamId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  // Refetch each time the scope modal opens — projects may have been created
  // or membership changed since page load, and a transient earlier failure
  // shouldn't leave the picker permanently empty.
  useEffect(() => { if (scopeModalOpen) fetchProjects(); }, [scopeModalOpen, fetchProjects]);

  // Adaptive upload concurrency. The bottleneck is SERVER-SIDE PROCESSING
  // (each upload runs synchronous Docling parse → vision/OCR → distill → embed,
  // holding a DB connection), NOT client bandwidth. A large burst (e.g. 10
  // concurrent) exhausts the core's Prisma pool (connection_limit=20 →
  // `$executeRawUnsafe` N/A failures) and times out the proxy upstream (502/503).
  // So keep concurrency LOW; the server's BullMQ kb-queue (cap 6) drains the
  // rest. Tunable but conservative by default.
  const pickConcurrency = useCallback((files) => {
    if (!files?.length) return 1;
    const sizes = files.map((f) => f.size || 0).sort((a, b) => a - b);
    const median = sizes[Math.floor(sizes.length / 2)];
    if (median < 5 * 1024 * 1024) return Math.min(4, files.length); // <5MB → up to 4
    if (median < 30 * 1024 * 1024) return Math.min(2, files.length); // 5-30MB → 2
    return 1; // >30MB → 1 (heavy parse + bandwidth)
  }, []);

  const handleFiles = useCallback(async (files, { targetScope = 'organization', project = null } = {}) => {
    // ── Step 1: validate + queue all entries up-front (optimistic UI) ──
    const validQueue = []; // { uploadEntry, file, controller }
    const nowBase = Date.now();
    files.forEach((file, idx) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_EXTS.includes(ext)) {
        setUploads((prev) => [...prev, {
          id: nowBase + idx + Math.random(),
          filename: file.name,
          status: 'error',
          error: `Unsupported file type: .${ext}`,
        }]);
        return;
      }
      // This gate said 100 MB while the server rejects at 50 MB — verified live:
      // a 60 MB upload returns 413 {"error":"payload_too_large","max_bytes":52428800}.
      // So anything between 50 and 100 MB uploaded in FULL, over the wire, before
      // being refused — minutes of the user's time spent to be told no, and the
      // raw string "payload_too_large" was what they saw. Now the client gate
      // matches the server contract and also catches empty/undersized files.
      const rejectReason = preflightRejectReason(file);
      if (rejectReason) {
        setUploads((prev) => [...prev, {
          id: nowBase + idx + Math.random(),
          filename: file.name,
          status: 'error',
          error: rejectReason,
        }]);
        return;
      }
      const controller = new AbortController();
      const uploadEntry = {
        id: nowBase + idx + Math.random(),
        filename: file.name,
        size: file.size,
        status: 'queued', // queued | uploading | success | error
        chunks: null,
        progress: 0,
        controller,
      };
      validQueue.push({ uploadEntry, file });
    });

    if (validQueue.length === 0) return;

    // Push all entries at once so user sees the full queue immediately
    setUploads((prev) => [...prev, ...validQueue.map(({ uploadEntry }) => uploadEntry)]);

    // ── Step 2: parallel pool — N workers drain the queue ──
    const concurrency = pickConcurrency(validQueue.map(({ file }) => file));
    let cursor = 0;
    const queueRefetch = (() => {
      // Debounce refetch — coalesces N parallel success callbacks into 1 fetch
      let pending = false;
      return () => {
        if (pending) return;
        pending = true;
        setTimeout(() => { pending = false; refetchKb(); }, 800);
      };
    })();

    // Takes the whole queue entry (not a destructured copy) so it can reach `_slotReleased`, the
    // signal that frees this file's transfer slot the moment its bytes are in.
    const uploadOne = async (queueEntry, { force = false, attempt = 1 } = {}) => {
      const { uploadEntry, file } = queueEntry;
      // Move queued → uploading
      setUploads((prev) => prev.map((u) =>
        u.id === uploadEntry.id ? { ...u, status: 'uploading', error: undefined } : u
      ));

      // ── Dedup is DB-authoritative, never browser-cache ──
      // Duplicate detection lives in the BACKEND: it sha256's the bytes and
      // checks knowledge_ingest_jobs for this org+scope (upload-job-store
      // .findDuplicate) → 409 { duplicate:true } handled in the catch below.
      // We deliberately do NOT short-circuit against the in-browser doc list
      // (kbMemories): that cache can be stale (a doc deleted server-side still
      // lingers there), so it produced false "Already in knowledge base"
      // skips with no re-check. We still compute a client hash ONLY to stamp
      // the local doc-hash tag for optimistic list convergence — it never
      // decides dedup.
      let clientHash = null;
      if (file.size <= 25 * 1024 * 1024) {
        clientHash = (await sha256File(file))?.slice(0, 16) || null;
      }

      const tStart = Date.now();
      let processingTimer = null;
      try {
        const fileExt = (file.name.split('.').pop() || '').toLowerCase();
        const isImage = IMAGE_EXTS.has(fileExt) || /^image\//.test(file.type || '');

        // ── PRE-CHECK: never spend an upload to learn it is a duplicate ────────
        // Previously the whole file went over the wire and the server answered 409
        // — a full 8.3 MB transfer to be told "already have it", and across a
        // 27-file batch, most of the elapsed time. Hash locally, ask first.
        // Skipped when force=true (the user explicitly chose "upload anyway") and
        // silently skipped on http:// where crypto.subtle is unavailable.
        if (!force) {
          setUploads((prev) => prev.map((u) => (u.id === uploadEntry.id
            ? { ...u, stage: 'checking', message: 'Checking if already uploaded…' } : u)));
          const checksum = await apiClient.fileChecksum(file);
          if (checksum) {
            const pre = await apiClient.precheckUpload(checksum);
            if (pre?.duplicate) {
              setUploads((prev) => prev.map((u) => (u.id === uploadEntry.id ? {
                ...u,
                status: 'duplicate',
                _completedAt: Date.now(),
                progress: 100,
                stage: 'existing',
                error: pre.message || 'Already in your knowledge base.',
                existingTitle: pre.existing_title || null,
                // Same affordance as a server-side 409: let them force a re-ingest.
                _retryForce: () => uploadOne({ uploadEntry, file }, { force: true }),
              } : u)));
              return; // bytes never sent
            }
            if (pre?.in_progress) {
              setUploads((prev) => prev.map((u) => (u.id === uploadEntry.id ? {
                ...u, status: 'duplicate', _completedAt: Date.now(), progress: 100,
                stage: pre.stage || 'processing',
                error: pre.message || 'This file is already being processed.',
              } : u)));
              return;
            }
          }
        }

        const uploadFn = isImage ? apiClient.uploadImage.bind(apiClient) : apiClient.uploadDocument.bind(apiClient);
        const uploadOpts = isImage
          ? {
              projectId: targetScope === 'organization' ? null : (project || null),
              signal: uploadEntry.controller.signal,
            }
          : {
              tags: customTags || undefined,
              targetScope,
              containerTag: targetScope === 'organization' ? (project || undefined) : undefined,
              force, // re-ingest past the same-scope duplicate gate when approved
              signal: uploadEntry.controller.signal,
            };
        const result = await uploadFn(file, {
          ...uploadOpts,
          // ── REAL SERVER STAGES ─────────────────────────────────────────────
          // uploadDocument already polls /api/knowledge/status to completion and
          // exposes onStatus — this page simply never passed it, so the UI showed
          // an elapsed-seconds counter and called everything "processing" while
          // the server knew exactly which phase it was in (parsing → embedded →
          // promoting → ready, tracked per job in knowledge_ingest_jobs).
          //
          // Showing the true phase is what makes a 2-minute ingest trustworthy
          // instead of looking hung: "indexing (12 segments)" reads as progress,
          // "processing 131s" reads as broken.
          // Bytes are in and the server owns the job — free the transfer slot so the next file
          // starts NOW rather than after this document's 30-134s ingest.
          onQueued: () => queueEntry._slotReleased?.(),
          onStatus: ({ status, progress, stage, segments, promoted } = {}) => {
            const LABEL = {
              queued: 'Queued — waiting for a worker',
              parsing: 'Reading the document (layout + tables)',
              parsed: 'Document read',
              segmenting: 'Splitting into sections',
              segmented: 'Sections created',
              embedding: 'Building the search index',
              embedded: 'Search index built',
              promoting: 'Extracting memories',
              promoted: 'Memories extracted',
              ready: 'Done',
              indexed: 'Done',
              failed: 'Failed',
            };
            setUploads((prev) => prev.map((u) => (u.id === uploadEntry.id ? {
              ...u,
              stage: stage || status || u.stage,
              stageLabel: LABEL[stage] || LABEL[status] || 'Processing',
              serverProgress: typeof progress === 'number' ? progress : u.serverProgress,
              segments: segments ?? u.segments,
              promoted: promoted ?? u.promoted,
            } : u)));
          },
          onUploadProgress: (e) => {
            if (!e.total) return;
            const pct = Math.round((e.loaded / e.total) * 100);
            const elapsed = (Date.now() - tStart) / 1000;
            const speedBps = elapsed > 0 ? e.loaded / elapsed : 0;
            const etaSec = speedBps > 0 ? Math.max(0, (e.total - e.loaded) / speedBps) : null;
            setUploads((prev) => prev.map((u) =>
              u.id === uploadEntry.id ? {
                ...u, progress: pct,
                speedBps,
                etaSec,
                bytesLoaded: e.loaded,
                bytesTotal: e.total,
                // ONE OWNER PER FIELD. This used to write `stage` too, which fought onStatus above:
                // the server would report a real phase ('embedding'), then this timer overwrote
                // stage:'processing' 2x/second. Because the row's bar and its percentage/speed/eta
                // are chosen by `stage === 'processing'`, the row FLIPPED between a determinate
                // 100% bar showing a stale upload speed and an indeterminate pulse — twice a second,
                // for the whole ingest. That flicker is the "confusing to watch" part, and it was
                // self-inflicted: the accurate server phase was already arriving.
                // Byte progress owns `progress`/`bytesDone`; the server owns `stage`/`stageLabel`.
                bytesDone: pct >= 100,
              } : u
            ));
            // After byte-upload hits 100% the server is still working (parse → segment → embed →
            // promote). The counter below is ONLY a fallback for the window before the server has
            // reported its first phase; it must never overwrite the phase once one arrives.
            if (pct >= 100 && !processingTimer) {
              const tProcessStart = Date.now();
              processingTimer = setInterval(() => {
                setUploads((prev) => prev.map((u) =>
                  u.id === uploadEntry.id ? {
                    ...u,
                    processingSec: Math.round((Date.now() - tProcessStart) / 1000),
                  } : u
                ));
              }, 500);
            }
          },
        });
        if (processingTimer) { clearInterval(processingTimer); processingTimer = null; }

        // ── Server-side dedup response ──
        // If backend matched an existing doc-hash, it returns
        // { deduped: true, existing_memory_id }. Do NOT add a fresh
        // justUploadedDocs row — the existing doc is already in the
        // fetched list. That was the duplicate-card root cause.
        if (result?.deduped) {
          setUploads((prev) => prev.map((u) =>
            u.id === uploadEntry.id
              ? { ...u, status: 'success', _completedAt: Date.now(), progress: 100, deduped: true,
                  message: result.message || 'Already in knowledge base — skipped re-upload',
                  existingMemoryId: result.existing_memory_id }
              : u
          ));
          // Refetch to ensure the existing doc surfaces in the list.
          queueRefetch();
          return;
        }

        // Phase 1b document_first response shape:
        //   { mode: 'document_first', documentId, segmentCount,
        //     candidateCount, promotedCount, promotedMemoryIds }
        // Legacy shape:  { upload_id, chunks, status: 'processing' }
        const isPhase1 = result?.mode === 'document_first';
        setUploads((prev) => prev.map((u) =>
          u.id === uploadEntry.id
            ? {
                ...u,
                status: 'success', _completedAt: Date.now(),
                progress: 100,
                mode: isPhase1 ? 'document_first' : 'legacy',
                chunks: result.chunks ?? result.segmentCount ?? null,
                segmentCount: result.segmentCount ?? null,
                candidateCount: result.candidateCount ?? null,
                promotedCount: result.promotedCount ?? null,
                promotedMemoryIds: result.promotedMemoryIds ?? null,
                documentId: result.documentId ?? null,
                uploadId: result.upload_id ?? null,
                // Enterprise schema extraction (when enterprise=auto|true and
                // detected_type confidence ≥0.7). Surface inline so user sees
                // the structured fields the system pulled.
                enterprise: result.enterprise ?? null,
              }
            : u
        ));
        setJustUploadedDocs((prev) => [{
          // Prefer the durable document id. Queue ids are transient and would
          // otherwise leave a second optimistic card beside the real document.
          id: result.documentId || result.upload_id || `pending-${uploadEntry.id}`,
          title: result.filename || file.name,
          docHash: clientHash || null, // for converge-detection in useEffect
          metadata: {
            document_title: result.filename || file.name,
            total_chunks: result.segmentCount ?? result.chunks ?? 0,
            filename: result.filename || file.name,
            upload_id: result.upload_id,
          },
          tags: [
            ...(customTags ? customTags.split(',').map((t) => t.trim()) : []),
            ...(clientHash ? [`doc-hash:${clientHash}`] : []),
          ],
          created_at: new Date().toISOString(),
        }, ...prev]);
        queueRefetch();
        // Refresh per-page usage meters (KB pages + memories) after a real upload.
        emitUsageChanged();
      } catch (err) {
        if (processingTimer) { clearInterval(processingTimer); processingTimer = null; }
        const isCancelled = err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED';
        // Upfront server-side dedup: 409 = identical content already ingested.
        // Not a failure — mark distinctly and let the rest of the batch run.
        const isDuplicate = err?.response?.status === 409 && err?.response?.data?.duplicate;
        // Transient saturation: during a bulk upload the core is briefly overloaded
        // (heavy docling parses hold the Prisma pool) → the proxy returns 502/503/504
        // or 429, or the request times out with no response. NOT a real failure —
        // auto-retry with exponential backoff so a file that merely landed mid-burst
        // doesn't show red. Real 4xx, cancel, and 409 (dedup) do NOT retry.
        const _st = err?.response?.status;
        // Plan/quota limit (e.g. monthly KB pages). The global axios interceptor
        // already dispatches 'hm:plan-limit' → <PlanLimitModal> handles the CTA
        // app-wide, so here we only need a clean, non-red inline note and MUST
        // NOT auto-retry (a 402/403/429 plan-limit is terminal for this upload).
        const isPlanLimit = isPlanLimitError(err);
        const isTransient = !isCancelled && !isDuplicate && !isPlanLimit
          && (_st === 502 || _st === 503 || _st === 504 || _st === 429 || _st === undefined);
        const MAX_UPLOAD_ATTEMPTS = 4;
        if (isTransient && attempt < MAX_UPLOAD_ATTEMPTS) {
          const backoff = Math.min(8000, 1000 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 400);
          setUploads((prev) => prev.map((u) =>
            u.id === uploadEntry.id
              // Reset the transfer-phase facts: a retry re-sends the bytes from zero. Leaving
              // bytesDone/progress from the failed attempt showed the indeterminate "server is
              // working" pulse while the file was in fact uploading again from the start.
              ? { ...u, status: 'uploading', stage: 'retrying', error: undefined,
                  bytesDone: false, progress: 0, processingSec: undefined, stageLabel: undefined,
                  message: `Server busy — retrying (${attempt}/${MAX_UPLOAD_ATTEMPTS - 1})…` }
              : u
          ));
          await new Promise((r) => setTimeout(r, backoff));
          // Pass the SAME entry, not a fresh literal — a copy would lose `_slotReleased` and the
          // retry could never free its transfer slot.
          return uploadOne(queueEntry, { force, attempt: attempt + 1 });
        }
        setUploads((prev) => prev.map((u) =>
          u.id === uploadEntry.id
            ? {
                ...u,
                status: isCancelled ? 'cancelled' : isDuplicate ? 'duplicate' : isPlanLimit ? 'limited' : 'error',
                error: isCancelled
                  ? 'Cancelled by user'
                  : isDuplicate
                    ? (err.response?.data?.message || 'This file is already in this scope.')
                    : isPlanLimit
                      ? 'Upgrade for more pages'
                      : friendlyUploadError(err),
                // Duplicate → user gets an "Upload anyway" action. Stash the
                // existing-doc info + a force re-ingest closure (same file/scope).
                existingTitle: isDuplicate ? (err.response?.data?.existing_title || null) : undefined,
                _retryForce: isDuplicate ? (() => uploadOne({ uploadEntry, file }, { force: true })) : undefined,
              }
            : u
        ));
      }
    };

    // Worker loop: each worker pulls the next index until cursor exhausts queue.
    //
    // THE SLOT BOUNDS THE TRANSFER, NOT THE INGEST. `uploadOne` resolves only when the server has
    // finished parsing/embedding/promoting, which is long and highly variable (measured
    // promote=134118ms on a single document). Awaiting it here pinned one of `concurrency` (4) slots
    // for that entire time, so files 5+ sat at "Waiting to upload" for minutes with nothing
    // happening — the reported "only the top 4 upload and then it stops". The server's own kb-queue
    // (cap 6) is the real throughput limit, so a second client-side gate on PROCESSING added no
    // protection and destroyed the appearance of progress.
    // Each upload now signals `_slotReleased` once its bytes are in, and the worker waits on THAT.
    // The ingest keeps running and reporting; we still await every one before returning.
    const inFlight = [];
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < validQueue.length) {
        const myIdx = cursor++;
        if (myIdx >= validQueue.length) break;
        const entry = validQueue[myIdx];
        let release;
        const transferred = new Promise((r) => { release = r; });
        entry._slotReleased = release;
        // Never let a rejection escape: uploadOne already records failures onto the row, and an
        // unhandled rejection here would abort the worker and strand the rest of the queue.
        const done = uploadOne(entry).catch(() => {}).finally(() => release());
        inFlight.push(done);
        await transferred;
      }
    });
    await Promise.all(workers);
    // Byte transfers are done; wait for the server-side ingests we started before reporting done.
    await Promise.all(inFlight);
  }, [customTags, refetchKb, pickConcurrency, kbMemories, setUploads]);

  // Cancel a queued/uploading entry
  const handleCancelUpload = useCallback((entryId) => {
    setUploads((prev) => {
      const entry = prev.find((u) => u.id === entryId);
      if (entry?.controller) {
        try { entry.controller.abort(); } catch (_e) { /* noop */ }
      }
      return prev;
    });
  }, [setUploads]);

  // Cancel everything still in-flight
  const handleCancelAll = useCallback(() => {
    setUploads((prev) => {
      for (const u of prev) {
        if ((u.status === 'uploading' || u.status === 'queued') && u.controller) {
          try { u.controller.abort(); } catch (_e) { /* noop */ }
        }
      }
      return prev;
    });
  }, [setUploads]);

  const queueFilesForUpload = useCallback((files) => {
    if (!files?.length) return;
    setPendingFiles(files);
    setSelectedProject('');
    // Default to org-wide for admins (upload once, whole org sees it); everyone
    // else starts on their private space. Both project + org tiers remain
    // selectable in the modal, gated by role exactly as the backend authorizes.
    const isAdmin = user?.role === 'owner' || user?.role === 'admin';
    setSelectedScope(isAdmin ? 'organization' : 'personal');
    setScopeModalOpen(true);
    // Estimate plan pages per file in the browser (PDF → real count, image /
    // other → 1) so the modal can show the cost and block an over-limit batch
    // before uploading. Runs async — the modal renders "…" until each lands.
    const seed = {};
    for (const f of files) seed[pendingFileKey(f)] = 'counting';
    setPendingPageCounts(seed);
    files.forEach((f) => {
      estimateFilePages(f)
        .then((n) => setPendingPageCounts((prev) => ({ ...prev, [pendingFileKey(f)]: n })))
        .catch(() => setPendingPageCounts((prev) => ({ ...prev, [pendingFileKey(f)]: 1 })));
    });
  }, [user?.role]);

  // Drop one file from the pending batch (the modal's per-row ✕). Lets a user
  // trim an over-limit batch back under quota without cancelling everything.
  const removePendingFile = useCallback((file) => {
    const key = pendingFileKey(file);
    setPendingFiles((prev) => {
      const next = prev.filter((f) => pendingFileKey(f) !== key);
      if (next.length === 0) { setScopeModalOpen(false); }
      return next;
    });
    setPendingPageCounts((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  // Typed file-based import: set the shared hidden input's accept to the chosen
  // family, then open it. Setting the attr imperatively (not via React state)
  // avoids the async-render race where .click() fires before accept updates.
  const openTypedImport = useCallback((accept) => {
    const el = typedImportRef.current;
    if (!el) return;
    el.setAttribute('accept', accept || '');
    el.value = '';
    el.click();
  }, []);

  const handleConfirmUploadScope = useCallback(async () => {
    // 3-tier mapping → upload params. 'project' and 'organization' both ship
    // as targetScope='organization' (server derives scope='project' when a
    // project/containerTag is present, scope='organization' when not).
    const project = selectedScope === 'project' ? (selectedProject || null) : null;
    const effectiveScope = selectedScope === 'personal' ? 'personal' : 'organization';
    const files = pendingFiles;
    setScopeModalOpen(false);
    setPendingFiles([]);

    if (smartExtract) {
      // Enterprise detect flow: process first file through detection.
      // Images bypass detection — they route straight to /api/ingest/image
      // (Groq vision), since the schema-detect path is for tabular docs.
      // Images (vision OCR) and audio (Whisper) bypass the tabular schema-detect
      // flow — they route straight through handleFiles to their own pipelines.
      const imageFiles = [];
      const audioFiles = [];
      const nonMediaFiles = [];
      for (const file of files) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (IMAGE_EXTS.has(ext) || /^image\//.test(file.type || '')) {
          imageFiles.push(file);
        } else if (AUDIO_EXTS.has(ext) || /^audio\//.test(file.type || '')) {
          audioFiles.push(file);
        } else {
          nonMediaFiles.push(file);
        }
      }
      if (imageFiles.length) {
        handleFiles(imageFiles, { targetScope: effectiveScope, project });
      }
      if (audioFiles.length) {
        handleFiles(audioFiles, { targetScope: effectiveScope, project });
      }
      for (const file of nonMediaFiles) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ACCEPTED_EXTS.includes(ext)) {
          setUploads((prev) => [...prev, {
            id: Date.now() + Math.random(),
            filename: file.name,
            status: 'error',
            error: `Unsupported file type: .${ext}`,
          }]);
          continue;
        }
        setDetecting(true);
        try {
          const result = await apiClient.enterpriseDetect(file);
          setDetectionResult(result);
          setEnterpriseModalOpen(true);
        } catch (err) {
          setUploads((prev) => [...prev, {
            id: Date.now() + Math.random(),
            filename: file.name,
            status: 'error',
            error: `Detection failed: ${err.response?.data?.error || err.message}`,
          }]);
        } finally {
          setDetecting(false);
        }
      }
    } else {
      handleFiles(files, { targetScope: effectiveScope, project });
    }
  }, [handleFiles, pendingFiles, selectedProject, selectedScope, smartExtract, setUploads]);

  const handleCloseScopeModal = useCallback(() => {
    setScopeModalOpen(false);
    setPendingFiles([]);
    setSelectedProject('');
    setSelectedScope('personal');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      queueFilesForUpload(Array.from(e.dataTransfer.files));
    }
  }, [queueFilesForUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragActive(false), []);

  const handleEnterpriseIngest = useCallback(async (options) => {
    setEnterpriseIngesting(true);
    try {
      const result = await apiClient.enterpriseIngest({
        upload_id: detectionResult.upload_id,
        confirmed_type: options.confirmedType,
        sheet_configs: options.sheetConfigs,
        tags: options.tags || customTags || undefined,
        targetScope: options.scope || (selectedScope === 'personal' ? 'personal' : 'organization'),
        containerTag: selectedScope === 'project' ? (selectedProject || undefined) : undefined,
        model: options.model,
      });
      setUploads((prev) => [...prev, {
        id: Date.now(),
        filename: detectionResult.filename,
        status: 'success', _completedAt: Date.now(),
        chunks: result.memories_queued,
        documentType: options.confirmedType,
      }]);
      setJustUploadedDocs((prev) => [{
        id: result.job_id,
        title: result.schema_fields?.[0]?.summary || detectionResult.filename,
        metadata: {
          document_type: options.confirmedType,
          total_chunks: result.memories_queued,
          filename: detectionResult.filename,
        },
        tags: ['enterprise', `document_type:${options.confirmedType}`],
        created_at: new Date().toISOString(),
      }, ...prev]);
      setEnterpriseModalOpen(false);
      setDetectionResult(null);
      refetchKb();
    } catch (err) {
      setUploads((prev) => [...prev, {
        id: Date.now(),
        filename: detectionResult.filename,
        status: 'error',
        error: err.response?.data?.error || err.message,
      }]);
    } finally {
      setEnterpriseIngesting(false);
    }
  }, [detectionResult, customTags, selectedScope, selectedProject, refetchKb, setUploads]);

  return (
    <div className="min-h-full">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk'] mb-1">{t('knowledgebase.title', 'Knowledge Base')}</h1>
          <p className="text-[#525252] text-sm font-['Space_Grotesk']">
            {t('knowledgebase.subtitle', 'Upload documents to create structured, searchable memories')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UsageTracker resource="kbPages" />
          <div className="flex items-center gap-2 text-[#a3a3a3] text-xs font-mono">
            <BookOpen size={14} />
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => setPageIndexModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#117dff] text-white text-xs font-semibold font-['Space_Grotesk'] hover:bg-[#0d5fcc] transition-colors"
            title={t('knowledgebase.memoryMapTitle', 'View memory hierarchy map')}
          >
            <MapIcon size={14} />
            {t('knowledgebase.memoryMap', 'Memory Map')}
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.txt,.md,.csv,.tsv,.xlsx,.xls,.ppt,.html,.htm,.png,.jpg,.jpeg,.tiff,.tif,.webp,.mp3,.wav,.m4a,.ogg,.flac"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) queueFilesForUpload(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore — non-standard HTML5 attrs for folder picker
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) queueFilesForUpload(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[#117dff] bg-[#117dff]/5'
              : 'border-[#e3e0db] bg-white hover:border-[#117dff]/40 hover:bg-[#faf9f4]'
          }`}
        >
          <Upload size={32} className={`mx-auto mb-3 ${dragActive ? 'text-[#117dff]' : 'text-[#d4d0ca]'}`} />
          <p className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] mb-1">
            {t('knowledgebase.dropZoneLabel', 'Drop files or folder here, or click to upload')}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
            className="mt-2 text-[11px] text-[#117dff] hover:text-[#0a5fcc] underline underline-offset-2"
          >
            {t('knowledgebase.pickFolder', 'Pick a folder instead')}
          </button>
          <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk'] mt-2">
            {t('knowledgebase.acceptedFormats', 'PDF · DOCX · PPTX · XLSX · CSV · TXT · MD · HTML · PNG · JPG · TIFF · MP3 · WAV — max 100MB per file')}
          </p>
          {/* Two-tier ingestion: sections index synchronously (searchable in
              seconds, no LLM in the request); facts + relations distill in a
              background combined-LLM pass. The ✦-facts / enriching… badges on
              each document reflect Tier-2 progress. */}
          <p className="text-[#a3a3a3] text-[10px] font-mono mt-1.5">
            {t('knowledgebase.tierHint', 'Searchable in seconds — facts & relations enrich in the background ✦')}
          </p>
          <p className="text-[#a3a3a3] text-[10px] font-mono mt-2">
            {t('knowledgebase.chunkedHint', 'Files are chunked into semantic sections and stored as searchable memories')}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Tag size={12} className="text-[#a3a3a3]" />
          <input
            type="text"
            value={customTags}
            onChange={(e) => setCustomTags(e.target.value)}
            placeholder={t('knowledgebase.tagsFullPlaceholder', 'Optional tags (comma-separated): project-docs, research, notes...')}
            className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[#0a0a0a] placeholder:text-[#d4d0ca] focus:outline-none focus:border-[#117dff]"
          />
          <button
            type="button"
            onClick={() => setSmartExtract((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold font-['Space_Grotesk'] transition-all shrink-0 ${
              smartExtract
                ? 'bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/30'
                : 'bg-white text-[#a3a3a3] border border-[#e3e0db] hover:text-[#525252] hover:border-[#d4d0ca]'
            }`}
            title={t('knowledgebase.smartExtractTitle', 'Smart Extract: auto-detect document type, extract structured data from invoices, contracts, spreadsheets')}
          >
            <Sparkles size={12} />
            {t('knowledgebase.smartExtract', 'Smart Extract')}
            <div className={`relative w-7 h-4 rounded-full transition-colors ${smartExtract ? 'bg-[#117dff]' : 'bg-[#e3e0db]'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${smartExtract ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>
        {detecting && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-[#117dff]/5 border border-[#117dff]/20">
            <Loader2 size={12} className="text-[#117dff] animate-spin" />
            <span className="text-xs font-['Space_Grotesk'] text-[#117dff]">{t('knowledgebase.analyzing', 'Analyzing document type...')}</span>
          </div>
        )}
      </motion.div>

      {/* ─── File-based imports: typed entry cards (feed the same upload pipeline) ─── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        {/* Shared hidden input — accept set per-card by openTypedImport */}
        <input
          ref={typedImportRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) queueFilesForUpload(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        <h3 className="text-[#0a0a0a] text-[13px] font-bold font-['Space_Grotesk'] mb-0.5">
          {t('knowledgebase.fileBasedImports', 'File-based imports')}
        </h3>
        <p className="text-[#a3a3a3] text-[11px] font-['Space_Grotesk'] mb-3">
          {t('knowledgebase.fileBasedImportsSubtitle', 'PDF · Word · Excel · Slides · Text · HTML · Images · Audio — converted to memories')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {IMPORT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.key}
                type="button"
                onClick={() => openTypedImport(type.accept)}
                className="group text-left rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2.5 transition-all hover:border-[#117dff]/40 hover:bg-[#faf9f4] focus:outline-none focus:border-[#117dff]/60"
              >
                <div className="flex items-center gap-2">
                  <Icon size={15} className={`${type.iconColor} shrink-0`} />
                  <span className="text-[#0a0a0a] text-[12px] font-semibold font-['Space_Grotesk'] truncate">
                    {t(type.titleKey, type.titleDefault)}
                  </span>
                </div>
                <span className="block text-[#a3a3a3] text-[10px] font-['Space_Grotesk'] leading-snug mt-0.5 truncate">
                  {t(type.descKey, type.descDefault)}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <UploadScopeModal
        open={scopeModalOpen}
        files={pendingFiles}
        org={org}
        userRole={user?.role}
        projects={teamProjects}
        loadingProjects={loadingProjects}
        projectsError={projectsError}
        onRetryProjects={fetchProjects}
        selectedScope={selectedScope}
        onScopeChange={setSelectedScope}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        pageCounts={pendingPageCounts}
        onRemoveFile={removePendingFile}
        pagesRemaining={kbPagesRemaining}
        pagesUsed={kbPagesUsed}
        pagesLimit={kbPagesLimit}
        pagesUnlimited={kbPagesUnlimited}
        onUpgrade={() => { try { window.dispatchEvent(new CustomEvent('hm:plan-limit', { detail: { resource: 'kbPages' } })); } catch { /* noop */ } }}
        onConfirm={handleConfirmUploadScope}
        onClose={handleCloseScopeModal}
      />

      <EnterpriseDetectModal
        open={enterpriseModalOpen}
        onClose={() => { setEnterpriseModalOpen(false); setDetectionResult(null); }}
        detectionResult={detectionResult}
        onIngest={handleEnterpriseIngest}
        ingesting={enterpriseIngesting}
      />

      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 space-y-2"
          >
            {/* Upload-state banner — tells the user when it's safe to leave */}
            {(() => {
              const inFlight = uploads.filter((u) => u.status === 'uploading' || u.status === 'queued').length;
              const allLanded = inFlight === 0 && uploads.length > 0;
              if (inFlight > 0) {
                return (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[#f59e0b]/30 bg-[#fff8eb] text-[12.5px]">
                    <div className="w-5 h-5 rounded-full bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#92400e]">
                        {t('knowledgebase.uploadingWarning', "Don't close this page yet — {{count}} file{{plural}} still uploading.", { count: inFlight, plural: inFlight === 1 ? '' : 's' })}
                      </div>
                      <div className="text-[#a16207] text-[11.5px] mt-0.5">
                        {t('knowledgebase.uploadingHint', 'Once every row shows Uploaded, you\'re safe to leave — the server takes over and your new memories surface in 2–5 minutes.')}
                      </div>
                    </div>
                  </div>
                );
              }
              if (allLanded) {
                return (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[#16a34a]/30 bg-[#f0fdf4] text-[12.5px]">
                    <div className="w-5 h-5 rounded-full bg-[#16a34a]/15 border border-[#16a34a]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#166534]">
                        {t('knowledgebase.allUploadsComplete', 'All uploads complete — safe to close this page.')}
                      </div>
                      <div className="text-[#15803d] text-[11.5px] mt-0.5">
                        {t('knowledgebase.allUploadsHint', 'The server is now extracting + indexing. New memories will appear in 2–5 minutes on the Memories page.')}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Queue stats header */}
            {uploads.length > 1 && (() => {
              const queued = uploads.filter((u) => u.status === 'queued').length;
              const uploading = uploads.filter((u) => u.status === 'uploading').length;
              const done = uploads.filter((u) => u.status === 'success').length;
              const failed = uploads.filter((u) => u.status === 'error' || u.status === 'cancelled').length;
              const duplicates = uploads.filter((u) => u.status === 'duplicate').length;
              const inFlight = queued + uploading;
              // A row is "settled" once it reaches ANY terminal state — not just
              // success. Counting duplicate/limited/error/cancelled as 0 left the
              // bar stuck below 100% while the "all complete" banner showed, which
              // read as a stalled/misleading upload. Terminal = 100% contribution
              // so the bar hits 100% exactly when nothing is in flight.
              const isSettled = (u) => ['success', 'duplicate', 'limited', 'error', 'cancelled'].includes(u.status);
              const totalProgress = uploads.length > 0
                ? Math.round(uploads.reduce((s, u) => s + (isSettled(u) ? 100 : (u.progress || 0)), 0) / uploads.length)
                : 0;
              return (
                <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-[#faf9f4] border border-[#ece8de] text-[11px] font-mono">
                  <span className="text-[#525252]">
                    <span className="font-semibold text-[#0a0a0a]">{totalProgress}%</span> overall
                  </span>
                  {queued > 0 && <span className="text-[#a3a3a3]">{queued} queued</span>}
                  {uploading > 0 && <span className="text-[#117dff]">{uploading} uploading</span>}
                  {done > 0 && <span className="text-[#16a34a]">{done} done</span>}
                  {failed > 0 && <span className="text-[#dc2626]">{failed} failed</span>}
                  {duplicates > 0 && <span className="text-[#d97706]">{duplicates} duplicate{duplicates > 1 ? 's' : ''}</span>}
                  <div className="flex-1 h-1 rounded-full bg-[#e3e0db] overflow-hidden">
                    <div
                      className="h-full bg-[#117dff] transition-all duration-300"
                      style={{ width: `${totalProgress}%` }}
                    />
                  </div>
                  {inFlight > 0 && (
                    <button
                      onClick={handleCancelAll}
                      className="text-[#dc2626] hover:text-[#b91c1c] transition-colors"
                    >
                      {t('knowledgebase.cancelAll', 'Cancel all')}
                    </button>
                  )}
                </div>
              );
            })()}

            {uploads.map((u) => (
              <div
                key={u.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono relative overflow-hidden ${
                  u.status === 'success' ? 'bg-[#f0fdf4] border border-[#bbf7d0]' :
                  u.status === 'error' ? 'bg-[#fef2f2] border border-[#fecaca]' :
                  u.status === 'duplicate' ? 'bg-[#fffbeb] border border-[#fde68a]' :
                  u.status === 'limited' ? 'bg-[#117dff]/[0.04] border border-[#117dff]/25' :
                  u.status === 'cancelled' ? 'bg-[#faf9f4] border border-[#e3e0db]' :
                  u.status === 'queued' ? 'bg-[#fafafa] border border-[#e3e0db]' :
                  'bg-white border border-[#117dff]/20'
                }`}
              >
                {/* Per-file progress bar (background fill).
                    During byte-upload: actual %.
                    During server-side processing: shimmer/indeterminate. */}
                {/* Exactly two mutually-exclusive bars, both keyed off ONE fact — whether the bytes
                    have finished uploading. Previously both were keyed off `stage`, which two
                    writers updated, so a row could satisfy neither or alternate between them. */}
                {u.status === 'uploading' && !u.bytesDone && (u.progress || 0) > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-[#117dff]/10 transition-all duration-200 pointer-events-none"
                    style={{ width: `${u.progress}%` }}
                  />
                )}
                {u.status === 'uploading' && u.bytesDone && (
                  <div className="absolute inset-y-0 left-0 right-0 pointer-events-none bg-[#117dff]/8 animate-pulse" />
                )}
                <div className="relative flex items-center gap-3 flex-1 min-w-0">
                  {u.status === 'queued' && <Clock size={14} className="text-[#a3a3a3]" />}
                  {u.status === 'uploading' && <Loader2 size={14} className="text-[#117dff] animate-spin" />}
                  {u.status === 'success' && <CheckCircle size={14} className="text-[#16a34a]" />}
                  {u.status === 'error' && <XCircle size={14} className="text-[#dc2626]" />}
                  {u.status === 'duplicate' && <Copy size={14} className="text-[#d97706]" />}
                  {u.status === 'limited' && <Sparkles size={14} className="text-[#117dff]" />}
                  {u.status === 'cancelled' && <XCircle size={14} className="text-[#a3a3a3]" />}
                  <span className="flex-1 text-[#0a0a0a] truncate">{u.filename}</span>
                  {u.size && <span className="text-[#a3a3a3]">{formatBytes(u.size)}</span>}
                  {/* Transfer stats belong to the TRANSFER only. Showing "100% · 4.2MB/s · eta 0s"
                      next to "Extracting memories" told the user the upload was still running
                      minutes after it had finished. */}
                  {u.status === 'uploading' && !u.bytesDone && (u.progress || 0) > 0 && (
                    <>
                      <span className="text-[#117dff] font-semibold">{u.progress}%</span>
                      {u.speedBps > 0 && (
                        <span className="text-[#a3a3a3]">{formatBytes(u.speedBps)}/s</span>
                      )}
                      {u.etaSec != null && u.etaSec > 0 && u.etaSec < 999 && (
                        <span className="text-[#a3a3a3]">eta {Math.ceil(u.etaSec)}s</span>
                      )}
                    </>
                  )}
                  {u.status === 'uploading' && u.bytesDone && (
                    /* Real server phase, not an elapsed-seconds guess. The stage
                       comes from knowledge_ingest_jobs via onStatus, so a 2-minute
                       ingest reads as progress ("Extracting memories") instead of
                       looking hung ("Processing · 131s"). Falls back to the old
                       counter only when the server has not reported a phase yet. */
                    <span className="text-[#117dff] font-semibold">
                      {u.stageLabel
                        ? u.stageLabel
                        : `Processing${u.processingSec ? ` · ${u.processingSec}s` : '…'}`}
                      {u.segments != null && u.segments > 0 && (
                        <span className="text-[#a3a3a3] font-normal"> · {u.segments} sections</span>
                      )}
                      {u.promoted != null && u.promoted > 0 && (
                        <span className="text-[#16a34a] font-normal"> · {u.promoted} memories</span>
                      )}
                    </span>
                  )}
                  {/* TWO DIFFERENT QUEUES, said differently. `status:'queued'` means this file has
                      not been sent yet (waiting for a client upload slot); the server's own
                      'queued' stage means it IS uploaded and waiting for a worker. Both used to be
                      indistinguishable — one showed a bare clock icon and the other said
                      "Queued — waiting for a worker" — so a row that had not started looked
                      identical to one that was already server-side. */}
                  {u.status === 'queued' && (
                    <span className="text-[#a3a3a3]">Waiting to upload…</span>
                  )}
                  {u.stage === 'checking' && (
                    <span className="text-[#a3a3a3]">Checking if already uploaded…</span>
                  )}
                  {u.mode === 'document_first' && u.segmentCount != null && (
                    u.segmentCount > 0 || (u.promotedCount ?? 0) > 0 ? (
                      <span className="text-[#16a34a]" title="Phase 1 evidence-first ingest">
                        {u.segmentCount} seg · {u.promotedCount ?? 0}/{u.candidateCount ?? 0} promoted
                      </span>
                    ) : (
                      <span className="text-[#117dff]" title="Server is extracting + indexing this document. Memories will surface in 2-5 min.">
                        Processing… new memories in 2–5 min
                      </span>
                    )
                  )}
                  {u.enterprise?.detected_type && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/30"
                      title={`Enterprise type detected: ${u.enterprise.detected_type} (confidence ${(u.enterprise.confidence * 100).toFixed(0)}%). ${u.enterprise.reasoning || ''}`}
                    >
                      {u.enterprise.detected_type}{u.enterprise.schema_fields ? ' · schema extracted' : ''}
                    </span>
                  )}
                  {u.mode !== 'document_first' && u.chunks && (
                    <span className="text-[#16a34a]">{u.chunks} chunks</span>
                  )}
                  {u.error && (
                    <span className={`truncate max-w-[220px] ${u.status === 'duplicate' ? 'text-[#d97706]' : u.status === 'limited' ? 'text-[#117dff]' : 'text-[#dc2626]'}`}>
                      {u.error}{u.status === 'duplicate' && u.existingTitle ? ` (as "${u.existingTitle}")` : ''}
                    </span>
                  )}
                  {u.status === 'duplicate' && u._retryForce && (
                    <button
                      onClick={() => u._retryForce()}
                      className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#d97706]/10 text-[#b45309] border border-[#fcd34d] hover:bg-[#d97706]/20 transition-colors whitespace-nowrap"
                      title={t('knowledgebase.uploadAnyway', 'This file already exists in this scope. Upload another copy anyway?')}
                    >
                      {t('knowledgebase.uploadAnyway', 'Upload anyway')}
                    </button>
                  )}
                  {u.status === 'queued' && <span className="text-[#a3a3a3]">{t('knowledgebase.waiting', 'Waiting...')}</span>}
                  {(u.status === 'queued' || u.status === 'uploading') && u.controller && (
                    <button
                      onClick={() => handleCancelUpload(u.id)}
                      className="text-[#a3a3a3] hover:text-[#dc2626] transition-colors"
                      title={t('knowledgebase.cancelUpload', 'Cancel this upload')}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {uploads.some((u) => u.status !== 'uploading' && u.status !== 'queued') && (
              <button
                onClick={() => setUploads((prev) => prev.filter((u) => u.status === 'uploading' || u.status === 'queued'))}
                className="text-[#a3a3a3] text-[10px] font-mono hover:text-[#525252] transition-colors"
              >
                {t('knowledgebase.clearCompleted', 'Clear completed')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#525252]" />
            <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">{t('knowledgebase.documents', 'Documents')}</h3>
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none rounded-lg border border-[#e3e0db] bg-white pl-3 pr-7 py-1.5 text-xs font-['Space_Grotesk'] text-[#525252] focus:outline-none focus:border-[#117dff]/40 cursor-pointer"
            >
              <option value="all">{t('knowledgebase.allTypes', 'All Types')}</option>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#a3a3a3] pointer-events-none" />
          </div>
        </div>

        {kbLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => {
              const meta = doc.metadata || {};
              const srcMeta = doc.source_metadata || {};
              const docType = meta.document_type || (doc.tags || []).find((t) => t.startsWith('document_type:'))?.split(':')[1];
              const typeStyle = docType ? TYPE_COLORS[docType] || TYPE_COLORS.general : null;
              return (
                <div key={doc.id} className={`group flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${bulkSelected.has(doc.id) ? 'border-[#117dff]/40 bg-[#117dff]/5' : 'border-[#eae7e1] hover:bg-[#faf9f4]'}`}>
                  {/* Bulk-select checkbox — visible on hover OR when any selection active */}
                  <input
                    type="checkbox"
                    aria-label={`Select ${doc.title || doc.name || doc.filename || 'document'}`}
                    checked={bulkSelected.has(doc.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      setBulkSelected((prev) => {
                        const next = new Map(prev);
                        if (next.has(doc.id)) next.delete(doc.id);
                        else next.set(doc.id, doc);
                        return next;
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-4 h-4 accent-[#117dff] cursor-pointer transition-opacity shrink-0 ${bulkSelected.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  />
                  {getFileIcon(srcMeta.filename || meta.filename || meta.document_title)}
                  {typeStyle && (
                    <span className={`text-[10px] font-semibold font-['Space_Grotesk'] px-2 py-0.5 rounded-md border shrink-0 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                      {TYPE_LABELS[docType] ? docType.charAt(0).toUpperCase() + docType.slice(1) : docType}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] truncate">
                      {meta.document_title
                        || meta.filename
                        || srcMeta.filename
                        || meta.original_filename
                        || srcMeta.original_filename
                        || doc.title
                        || (doc.tags || []).find((t) => t.startsWith('filename:'))?.split(':').slice(1).join(':')
                        || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {/* Phase 1 evidence-backed stats for this exact document. */}
                      {(() => {
                        const p1 = phase1Stats[documentIdFrom(doc)];
                        if (!p1) return null;
                        return (
                          <span
                            className="text-[#16a34a] text-[10px] font-mono bg-[#16a34a]/8 border border-[#16a34a]/20 rounded px-1.5 py-0.5"
                            title={`Evidence-backed: ${p1.segments} segments and ${p1.memories} live memories for this document`}
                          >
                            {p1.segments} seg · {p1.memories} mem
                          </span>
                        );
                      })()}
                      {!phase1Stats[documentIdFrom(doc)] && meta.total_chunks > 0 && (
                        <span className="text-[#a3a3a3] text-[10px] font-mono">{meta.total_chunks} chunks</span>
                      )}
                      {docProject(doc) && (
                        <span
                          className="text-[#117dff] text-[10px] font-mono bg-[#117dff]/8 border border-[#117dff]/20 rounded px-1.5 py-0.5"
                          title="Project scope"
                        >
                          {docProject(doc)}
                        </span>
                      )}
                      {/* Relationship counts from canonical buildRoutedIngestPayloads pipeline */}
                      {(() => {
                        const rs = relSummaries[doc.id];
                        if (!rs || !rs.total) return null;
                        const types = Object.entries(rs.byType || {})
                          .sort((a, b) => b[1] - a[1])
                          .map(([t, c]) => `${c} ${t}`)
                          .join(', ');
                        return (
                          <span
                            className="text-[#117dff] text-[10px] font-mono bg-[#117dff]/8 border border-[#117dff]/20 rounded px-1.5 py-0.5"
                            title={`Edges touching this document cluster (${rs.cluster_size} memories)`}
                          >
                            {rs.total} relations{types ? `: ${types}` : ''}
                          </span>
                        );
                      })()}
                      {/* Tier-2 enrichment status: sections index instantly (searchable);
                          the combined LLM pass distills facts in the background. */}
                      {(() => {
                        const rs = relSummaries[doc.id];
                        if (!rs) return null;
                        if (rs.facts > 0) {
                          return (
                            <span
                              className="text-[#d97706] text-[10px] font-mono bg-[#d97706]/8 border border-[#d97706]/20 rounded px-1.5 py-0.5"
                              title="Background enrichment complete — atomic facts distilled from this document (searchable + cited in recall)"
                            >
                              ✦ {rs.facts} facts
                            </span>
                          );
                        }
                        return (
                          <span
                            className="text-[#a3a3a3] text-[10px] font-mono bg-[#f3f1ec] border border-[#e3e0db] rounded px-1.5 py-0.5 animate-pulse"
                            title="Document is already searchable (sections indexed). Fact distillation runs in the background and lands within minutes."
                          >
                            enriching…
                          </span>
                        );
                      })()}
                      {meta.pages && (
                        <span className="text-[#a3a3a3] text-[10px] font-mono">{meta.pages} pages</span>
                      )}
                      {meta.total_chars && (
                        <span className="text-[#a3a3a3] text-[10px] font-mono">{formatBytes(meta.total_chars)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(doc.tags || []).filter((t) => !['knowledge-base', 'document', 'document-summary', 'schema-record', 'enterprise'].includes(t) && !t.startsWith('document_type:')).slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f3f1ec] text-[#525252] border border-[#e3e0db]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[#a3a3a3] text-[10px] font-mono shrink-0 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(doc.created_at)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {deleteConfirmId === doc.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc); }}
                          disabled={deletingDocId === doc.id}
                          className="text-[10px] font-mono px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                          title="This cascades — removes the document, every chunk, every extracted fact, and Qdrant vectors"
                        >
                          {deletingDocId === doc.id
                            ? 'Deleting...'
                            : `Delete all${meta.total_chunks ? ` (~${meta.total_chunks + 1} memories)` : ''}`}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                          className="text-[10px] font-mono px-2 py-1 rounded-lg text-[#a3a3a3] hover:text-[#525252]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(doc.id); }}
                        className="p-1.5 rounded-lg text-[#d4d0ca] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label={`Delete ${doc.title || doc.name || doc.filename || 'document'}`}
                        title={t('knowledgebase.deleteDocTitle', 'Delete document + every chunk + every fact + Qdrant vectors')}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <BookOpen size={28} className="text-[#d4d0ca] mx-auto mb-3" />
            {typeFilter !== 'all' && documents.length > 0 ? (
              <>
                <p className="text-[#525252] text-sm font-['Space_Grotesk'] mb-1">
                  {t('knowledgebase.noTypeDocuments', 'No {{type}} documents found', { type: TYPE_LABELS[typeFilter] || typeFilter })}
                </p>
                <button
                  onClick={() => setTypeFilter('all')}
                  className="text-[#117dff] text-xs font-['Space_Grotesk'] hover:underline mt-1"
                >
                  {t('knowledgebase.showAllDocuments', 'Show all documents')}
                </button>
              </>
            ) : (
              <>
                <p className="text-[#525252] text-sm font-['Space_Grotesk'] mb-1">{t('knowledgebase.noDocuments', 'No documents uploaded yet')}</p>
                <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">
                  {t('knowledgebase.noDocumentsHint', 'Upload PDFs, documents, or text files to build your knowledge base')}
                </p>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* PageIndex Mind Map Modal */}
      <AnimatePresence>
        {pageIndexModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setPageIndexModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-5xl h-[80vh] bg-white rounded-2xl border border-[#e3e0db] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e0db] bg-[#faf9f4]">
                <div className="flex items-center gap-3">
                  <MapIcon size={18} className="text-[#117dff]" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.memoryMap', 'Memory Map')}</h3>
                    <p className="text-xs text-[#666]">{t('knowledgebase.memoryMapDesc', 'Visual hierarchy of your organized memories')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPageIndexModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#e3e0db] transition-colors"
                  title={t('knowledgebase.close', 'Close')}
                >
                  <X size={18} className="text-[#525252]" />
                </button>
              </div>

              {/* Content */}
              <div className="h-[calc(100%-60px)] p-4">
                <PageIndexViewer
                  userId={org?.userId || 'current'}
                  onSelectNode={() => { /* node-select side panel not yet wired */ }}
                  selectedNodeId={null}
                  initialPath="/hivemind"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Creator-only delete: non-owner tried to delete someone else's doc */}
      <AnimatePresence>
        {notOwnerInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setNotOwnerInfo(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-2xl border border-[#e3e0db] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e3e0db] bg-[#faf9f4]">
                <h3 className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
                  {t('knowledgebase.notOwnerTitle', "You can't delete this document")}
                </h3>
                <button
                  onClick={() => setNotOwnerInfo(null)}
                  className="p-1.5 rounded-lg hover:bg-[#e3e0db] transition-colors"
                  title={t('knowledgebase.close', 'Close')}
                >
                  <X size={16} className="text-[#525252]" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-[#404040] leading-relaxed">
                  {(() => {
                    const o = notOwnerInfo.owner;
                    const who = o?.name || o?.email;
                    return who
                      ? t('knowledgebase.notOwnerBodyNamed', { defaultValue: 'Only {{who}}, who uploaded this document, can delete it. Please request them to remove it.', who })
                      : t('knowledgebase.notOwnerBody', 'Only the person who uploaded this document can delete it. Please request the owner to remove it.');
                  })()}
                </p>
                {notOwnerInfo.owner?.email && (
                  <a
                    href={`mailto:${notOwnerInfo.owner.email}?subject=${encodeURIComponent('Request to delete a document')}&body=${encodeURIComponent(`Hi,\n\nCould you please delete "${notOwnerInfo.docTitle}" from our HIVEMIND knowledge base?\n\nThanks.`)}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#117dff] text-white text-xs font-medium hover:bg-[#0f6fe0] transition-colors"
                    onClick={() => setNotOwnerInfo(null)}
                  >
                    {t('knowledgebase.requestOwner', 'Request {{who}} to delete', { who: notOwnerInfo.owner.name || notOwnerInfo.owner.email })}
                  </a>
                )}
              </div>
              <div className="px-5 py-3 border-t border-[#e3e0db] bg-[#faf9f4] flex justify-end">
                <button
                  onClick={() => setNotOwnerInfo(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#525252] hover:bg-[#e3e0db] transition-colors"
                >
                  {t('knowledgebase.gotIt', 'Got it')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk-select floating action bar — appears when ≥1 doc checked ── */}
      <AnimatePresence>
        {bulkSelected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white border border-[#e3e0db] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] px-4 py-2.5"
          >
            <span className="text-[12px] font-mono text-[#0a0a0a]">
              <span className="font-bold text-[#117dff]">{bulkSelected.size}</span> selected
            </span>
            <button
              onClick={() => setBulkSelected(new Map())}
              disabled={bulkDeleting}
              className="text-[11px] font-mono text-[#525252] hover:text-[#0a0a0a] disabled:opacity-40"
            >
              {t('knowledgebase.clear', 'Clear')}
            </button>
            <div className="h-4 w-px bg-[#e3e0db]" />
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="text-[11px] font-mono font-semibold text-white bg-[#dc2626] hover:bg-[#b91c1c] px-3 py-1.5 rounded-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  {t('knowledgebase.deleting', 'Deleting…')}
                </>
              ) : (
                <>{t('knowledgebase.deleteCount', 'Delete {{count}}', { count: bulkSelected.size })}</>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
