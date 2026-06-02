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
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';
import { useAuth } from '../auth/AuthProvider';
import { PageIndexViewer } from '../PageIndexViewer';
import { useUploads, setUploads as setGlobalUploads } from '../shared/upload-store';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const ACCEPTED_EXTS = ['pdf', 'docx', 'txt', 'md', 'csv', 'tsv', 'xlsx', 'xls',
  // pptx/ppt are parsed by Docling server-side + listed in the picker accept=
  // attr; they were missing here, so the client rejected them before upload.
  'pptx', 'ppt', 'html', 'htm',
  // Images routed to /api/ingest/image (Groq vision pipeline) instead of docling.
  'png', 'jpg', 'jpeg', 'tiff', 'tif', 'webp', 'gif'];
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

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
  contract: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  sop: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  spreadsheet: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  meeting: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  general: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

function UploadScopeModal({
  open,
  files,
  org,
  projects,
  loadingProjects,
  selectedScope,
  onScopeChange,
  selectedProject,
  onProjectChange,
  onConfirm,
  onClose,
}) {
  const { t } = useTranslation('dashboard');

  if (!open) return null;

  const requiresProject = selectedScope === 'organization' && projects.length > 0;
  const canUseTeamWorkspace = org?.plan === 'enterprise' || org?.plan === 'team';

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
          className="w-full max-w-lg rounded-2xl border border-[#e3e0db] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
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

          <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-4 py-3 mb-5">
            <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3] mb-2">
              {t('knowledgebase.uploadBatch', 'Upload batch')}
            </p>
            <div className="space-y-1">
              {files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-[#0a0a0a]">{file.name}</span>
                  <span className="text-[#a3a3a3] text-[11px] font-mono shrink-0">{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
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

            <button
              type="button"
              disabled={!canUseTeamWorkspace}
              onClick={() => canUseTeamWorkspace && onScopeChange('organization')}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedScope === 'organization'
                  ? 'border-[#117dff]/30 bg-[#117dff]/8'
                  : 'border-[#e3e0db] bg-white hover:bg-[#faf9f4]'
              } ${!canUseTeamWorkspace ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center">
                  <Users size={16} className="text-[#117dff]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.scopeTeamLabel', 'Team Workspace')}</p>
                  <p className="text-xs text-[#525252]">
                    {org?.name
                      ? t('knowledgebase.scopeTeamDescNamed', 'Shared with your org: {{name}}', { name: org.name })
                      : t('knowledgebase.scopeTeamDesc', 'Shared with your org.')}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {selectedScope === 'organization' && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban size={14} className="text-[#525252]" />
                <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#525252]">{t('knowledgebase.project', 'Project')}</p>
              </div>
              {loadingProjects ? (
                <p className="text-xs text-[#a3a3a3]">{t('knowledgebase.loadingProjects', 'Loading projects...')}</p>
              ) : projects.length > 0 ? (
                <>
                  <select
                    value={selectedProject}
                    onChange={(e) => onProjectChange(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e3e0db] px-3 py-2.5 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40"
                  >
                    <option value="">{t('knowledgebase.selectTeamProject', 'Select a team project')}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.slug}>
                        {project.name} ({project.slug})
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-[#a3a3a3]">
                    {t('knowledgebase.teamUploadsHint', 'Team uploads should be attached to a project when projects exist.')}
                  </p>
                </>
              ) : (
                <p className="text-xs text-[#a3a3a3]">
                  {t('knowledgebase.noTeamProjects', 'No team projects yet. This upload will be shared to the team workspace without a project bucket.')}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6">
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
              disabled={requiresProject && !selectedProject}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e6fe0] disabled:opacity-50"
            >
              <Upload size={14} />
              {t('knowledgebase.uploadFiles', 'Upload files')}
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
  const [modalScope, setModalScope] = useState('personal');

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

export default function KnowledgeBase() {
  const { t } = useTranslation('dashboard');
  const { org } = useAuth();
  // Uploads live in a module-level store so they survive navigation away
  // from this page. `setUploads` here is a pass-through writer; the
  // GlobalUploadStrip (mounted in AppShell) subscribes to the same store
  // and keeps rendering the rows from any page.
  const uploads = useUploads();
  const setUploads = setGlobalUploads;
  const [dragActive, setDragActive] = useState(false);
  const [customTags, setCustomTags] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState('personal');
  const [selectedProject, setSelectedProject] = useState('');
  const [teamProjects, setTeamProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
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
  // Bulk-select state — Map<docId, doc> so we can pass full objects to delete handler
  const [bulkSelected, setBulkSelected] = useState(new Map());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
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
    const settled = await Promise.allSettled(
      tagQueries.map(tag => apiClient.listMemories({ tags: tag, limit: 500, scope: 'all' }))
    );

    const seenIds = new Set();
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
          seenIds.add(m.id);
          docs.push(m);
        }
      }
    }

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

    return docs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, []);

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

  // Phase 1 evidence-backed stats per filename (segments + memory_evidence_links)
  const [phase1Stats, setPhase1Stats] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiClient.listDocuments({ limit: 200 });
        if (cancelled) return;
        const map = {};
        for (const d of (resp?.documents || [])) {
          const baseName = (d.title || '').split('#')[0];
          map[baseName] = { segments: d.segmentCount || 0, evidence: d.promotedCount || 0, documentId: d.id };
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

  useEffect(() => {
    let cancelled = false;
    if ((org?.plan !== 'enterprise' && org?.plan !== 'team') || !org?.id) {
      setTeamProjects([]);
      return;
    }
    setLoadingProjects(true);
    apiClient.listProjects(org.id)
      .then((data) => {
        if (!cancelled) {
          setTeamProjects(data.projects || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeamProjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [org?.id, org?.plan]);

  // Adaptive concurrency: many small files = 10 parallel, few big files = 2.
  // Computed per-batch from median file size.
  const pickConcurrency = useCallback((files) => {
    if (!files?.length) return 1;
    const sizes = files.map((f) => f.size || 0).sort((a, b) => a - b);
    const median = sizes[Math.floor(sizes.length / 2)];
    if (median < 5 * 1024 * 1024) return Math.min(10, files.length); // <5MB → up to 10
    if (median < 30 * 1024 * 1024) return Math.min(5, files.length); // 5-30MB → 5
    return Math.min(2, files.length); // >30MB → 2 (bandwidth bound)
  }, []);

  const handleFiles = useCallback(async (files, { targetScope = 'personal', project = null } = {}) => {
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
      if (file.size > 100 * 1024 * 1024) {
        setUploads((prev) => [...prev, {
          id: nowBase + idx + Math.random(),
          filename: file.name,
          status: 'error',
          error: 'File too large (max 100MB)',
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

    const uploadOne = async ({ uploadEntry, file }) => {
      // Move queued → uploading
      setUploads((prev) => prev.map((u) =>
        u.id === uploadEntry.id ? { ...u, status: 'uploading' } : u
      ));

      // ── Client-side SHA-256 dedup ──
      // Backend already hashes (16-hex prefix) but doing it client-side
      // lets us SKIP the upload entirely if we already have a doc with
      // matching hash in the current list. Saves bandwidth + avoids the
      // race where backend dedup returns a fresh upload_id that doesn't
      // match the existing doc-hash row (root cause of duplicate cards).
      let clientHash = null;
      if (file.size <= 25 * 1024 * 1024) {
        // Cap hashing at 25MB to keep main thread responsive on huge files.
        // For >25MB we fall back to backend-only dedup.
        clientHash = (await sha256File(file))?.slice(0, 16) || null;
      }
      if (clientHash) {
        const existing = (kbMemories || []).find((d) => getDocHashTag(d) === clientHash);
        if (existing) {
          setUploads((prev) => prev.map((u) =>
            u.id === uploadEntry.id
              ? { ...u, status: 'success', _completedAt: Date.now(), progress: 100, deduped: true,
                  message: 'Already in knowledge base — skipped re-upload' }
              : u
          ));
          return;
        }
      }

      const tStart = Date.now();
      let processingTimer = null;
      try {
        const fileExt = (file.name.split('.').pop() || '').toLowerCase();
        const isImage = IMAGE_EXTS.has(fileExt) || /^image\//.test(file.type || '');
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
              signal: uploadEntry.controller.signal,
            };
        const result = await uploadFn(file, {
          ...uploadOpts,
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
                stage: pct < 100 ? 'uploading' : 'processing',
              } : u
            ));
            // After byte-upload hits 100% server still processes (parse → segment
            // → embed → promote). Switch into indeterminate "processing" mode
            // so the bar doesn't lie about being done.
            if (pct >= 100 && !processingTimer) {
              const tProcessStart = Date.now();
              processingTimer = setInterval(() => {
                setUploads((prev) => prev.map((u) =>
                  u.id === uploadEntry.id ? {
                    ...u, stage: 'processing',
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
          id: result.upload_id || `pending-${uploadEntry.id}`,
          title: result.filename || file.name,
          docHash: clientHash || null, // for converge-detection in useEffect
          metadata: {
            document_title: result.filename || file.name,
            total_chunks: result.chunks || 1,
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
      } catch (err) {
        if (processingTimer) { clearInterval(processingTimer); processingTimer = null; }
        const isCancelled = err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED';
        setUploads((prev) => prev.map((u) =>
          u.id === uploadEntry.id
            ? {
                ...u,
                status: isCancelled ? 'cancelled' : 'error',
                error: isCancelled ? 'Cancelled by user' : (err.response?.data?.error || err.message),
              }
            : u
        ));
      }
    };

    // Worker loop: each worker pulls the next index until cursor exhausts queue.
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < validQueue.length) {
        const myIdx = cursor++;
        if (myIdx >= validQueue.length) break;
        await uploadOne(validQueue[myIdx]);
      }
    });
    await Promise.all(workers);
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
    setSelectedScope('personal');
    setSelectedProject('');
    setScopeModalOpen(true);
  }, []);

  const handleConfirmUploadScope = useCallback(async () => {
    const project = selectedScope === 'organization' ? (selectedProject || null) : null;
    const files = pendingFiles;
    setScopeModalOpen(false);
    setPendingFiles([]);

    if (smartExtract) {
      // Enterprise detect flow: process first file through detection.
      // Images bypass detection — they route straight to /api/ingest/image
      // (Groq vision), since the schema-detect path is for tabular docs.
      const imageFiles = [];
      const nonImageFiles = [];
      for (const file of files) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (IMAGE_EXTS.has(ext) || /^image\//.test(file.type || '')) {
          imageFiles.push(file);
        } else {
          nonImageFiles.push(file);
        }
      }
      if (imageFiles.length) {
        handleFiles(imageFiles, { targetScope: selectedScope, project });
      }
      for (const file of nonImageFiles) {
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
      handleFiles(files, { targetScope: selectedScope, project });
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
        targetScope: options.scope || selectedScope,
        containerTag: (options.scope || selectedScope) === 'organization' ? selectedProject : undefined,
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

      <UploadScopeModal
        open={scopeModalOpen}
        files={pendingFiles}
        org={org}
        projects={teamProjects}
        loadingProjects={loadingProjects}
        selectedScope={selectedScope}
        onScopeChange={setSelectedScope}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
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
              const inFlight = queued + uploading;
              const totalProgress = uploads.length > 0
                ? Math.round(uploads.reduce((s, u) => s + (u.status === 'success' ? 100 : (u.progress || 0)), 0) / uploads.length)
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
                  u.status === 'cancelled' ? 'bg-[#faf9f4] border border-[#e3e0db]' :
                  u.status === 'queued' ? 'bg-[#fafafa] border border-[#e3e0db]' :
                  'bg-white border border-[#117dff]/20'
                }`}
              >
                {/* Per-file progress bar (background fill).
                    During byte-upload: actual %.
                    During server-side processing: shimmer/indeterminate. */}
                {u.status === 'uploading' && u.stage !== 'processing' && (u.progress || 0) > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-[#117dff]/10 transition-all duration-200 pointer-events-none"
                    style={{ width: `${u.progress}%` }}
                  />
                )}
                {u.status === 'uploading' && u.stage === 'processing' && (
                  <div className="absolute inset-y-0 left-0 right-0 pointer-events-none bg-[#117dff]/8 animate-pulse" />
                )}
                <div className="relative flex items-center gap-3 flex-1 min-w-0">
                  {u.status === 'queued' && <Clock size={14} className="text-[#a3a3a3]" />}
                  {u.status === 'uploading' && <Loader2 size={14} className="text-[#117dff] animate-spin" />}
                  {u.status === 'success' && <CheckCircle size={14} className="text-[#16a34a]" />}
                  {u.status === 'error' && <XCircle size={14} className="text-[#dc2626]" />}
                  {u.status === 'cancelled' && <XCircle size={14} className="text-[#a3a3a3]" />}
                  <span className="flex-1 text-[#0a0a0a] truncate">{u.filename}</span>
                  {u.size && <span className="text-[#a3a3a3]">{formatBytes(u.size)}</span>}
                  {u.status === 'uploading' && u.stage !== 'processing' && (u.progress || 0) > 0 && (
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
                  {u.status === 'uploading' && u.stage === 'processing' && (
                    <span className="text-[#117dff] font-semibold">
                      Processing{u.processingSec ? ` · ${u.processingSec}s` : '…'}
                    </span>
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
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#8b5cf6]/10 text-[#7c3aed] border border-[#8b5cf6]/30"
                      title={`Enterprise type detected: ${u.enterprise.detected_type} (confidence ${(u.enterprise.confidence * 100).toFixed(0)}%). ${u.enterprise.reasoning || ''}`}
                    >
                      {u.enterprise.detected_type}{u.enterprise.schema_fields ? ' · schema extracted' : ''}
                    </span>
                  )}
                  {u.mode !== 'document_first' && u.chunks && (
                    <span className="text-[#16a34a]">{u.chunks} chunks</span>
                  )}
                  {u.error && <span className="text-[#dc2626] truncate max-w-[200px]">{u.error}</span>}
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
                      {/* Phase 1 evidence-backed stats (segments + memory_evidence_links) */}
                      {(() => {
                        const fname = meta.filename || srcMeta.filename || meta.document_title || doc.title;
                        const p1 = fname ? phase1Stats[fname] : null;
                        if (!p1) return null;
                        return (
                          <span
                            className="text-[#16a34a] text-[10px] font-mono bg-[#16a34a]/8 border border-[#16a34a]/20 rounded px-1.5 py-0.5"
                            title={`Evidence-backed: ${p1.segments} segments → ${p1.evidence} memory_evidence_links`}
                          >
                            {p1.segments} seg · {p1.evidence} mem
                          </span>
                        );
                      })()}
                      {meta.total_chunks && (
                        <span className="text-[#a3a3a3] text-[10px] font-mono">{meta.total_chunks} chunks</span>
                      )}
                      {docProject(doc) && (
                        <span
                          className="text-[#7c3aed] text-[10px] font-mono bg-[#7c3aed]/8 border border-[#7c3aed]/20 rounded px-1.5 py-0.5"
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
                  onSelectNode={(node) => {
                    console.log('Selected node:', node);
                    // Could load memories from this node in a side panel
                  }}
                  selectedNodeId={null}
                  initialPath="/hivemind"
                />
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
