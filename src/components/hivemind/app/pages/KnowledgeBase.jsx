import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const ACCEPTED_EXTS = ['pdf', 'docx', 'txt', 'md', 'csv', 'xlsx', 'xls'];

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
              <h3 className="text-[#0a0a0a] text-lg font-semibold font-['Space_Grotesk']">Save uploaded memories to</h3>
              <p className="text-[#525252] text-sm mt-1">
                Choose where these files should live before upload starts.
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
              Upload batch
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
                  <p className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">My Space</p>
                  <p className="text-xs text-[#525252]">Private memories only visible in your personal workspace.</p>
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
                  <p className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Team Workspace</p>
                  <p className="text-xs text-[#525252]">
                    Shared with your org{org?.name ? `: ${org.name}` : ''}.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {selectedScope === 'organization' && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban size={14} className="text-[#525252]" />
                <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#525252]">Project</p>
              </div>
              {loadingProjects ? (
                <p className="text-xs text-[#a3a3a3]">Loading projects...</p>
              ) : projects.length > 0 ? (
                <>
                  <select
                    value={selectedProject}
                    onChange={(e) => onProjectChange(e.target.value)}
                    className="w-full rounded-[8px] border border-[#e3e0db] px-3 py-2.5 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40"
                  >
                    <option value="">Select a team project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.slug}>
                        {project.name} ({project.slug})
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-[#a3a3a3]">
                    Team uploads should be attached to a project when projects exist.
                  </p>
                </>
              ) : (
                <p className="text-xs text-[#a3a3a3]">
                  No team projects yet. This upload will be shared to the team workspace without a project bucket.
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
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={requiresProject && !selectedProject}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e6fe0] disabled:opacity-50"
            >
              <Upload size={14} />
              Upload files
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
              <h3 className="text-[#0a0a0a] text-lg font-semibold font-['Space_Grotesk']">Document Analysis</h3>
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
              Detected Type
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
                Sheets
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
              Tags
            </label>
            <div className="flex items-center gap-2">
              <Tag size={12} className="text-[#a3a3a3]" />
              <input
                type="text"
                value={modalTags}
                onChange={(e) => setModalTags(e.target.value)}
                placeholder="Optional tags (comma-separated)"
                className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[#0a0a0a] placeholder:text-[#d4d0ca] focus:outline-none focus:border-[#117dff]"
              />
            </div>
          </div>

          {/* Scope toggle */}
          <div className="mb-6">
            <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3] mb-2 block">
              Scope
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
                Personal
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
                Team
              </button>
            </div>
          </div>

          {/* Reasoning */}
          {detectionResult.reasoning && (
            <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-4 py-3 mb-5">
              <p className="text-[10px] font-mono text-[#a3a3a3] mb-1">Analysis reasoning</p>
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
              Cancel
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
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Extract &amp; Ingest
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
  const { org } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [customTags, setCustomTags] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState('personal');
  const [selectedProject, setSelectedProject] = useState('');
  const [teamProjects, setTeamProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [justUploadedDocs, setJustUploadedDocs] = useState([]);
  const [pageIndexModalOpen, setPageIndexModalOpen] = useState(false);
  const [smartExtract, setSmartExtract] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);
  const [enterpriseIngesting, setEnterpriseIngesting] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fileInputRef = useRef(null);

  const { data: kbMemories, loading: kbLoading, refetch: refetchKb } = useApiQuery(async () => {
    // Fetch from THREE tag families in parallel — covers regular uploads, enterprise
    // schema records, and the broader 'knowledge-base' bucket. Trust the backend tag:
    // never filter out a document just because its metadata fields are missing
    // (Smart Ingest UPDATE relationships sometimes strip metadata into a new version).
    const tagQueries = ['document-summary', 'schema-record', 'knowledge-base'];
    const settled = await Promise.allSettled(
      tagQueries.map(tag => apiClient.listMemories({ tags: tag, limit: 100, scope: 'all' }))
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
    return combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
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

  // Clear just-uploaded docs once they appear in fetched results
  useEffect(() => {
    if (kbMemories && justUploadedDocs.length > 0) {
      const fetchedIds = new Set(kbMemories.map((d) => d.id));
      const stillPending = justUploadedDocs.filter((d) => !fetchedIds.has(d.id));
      if (stillPending.length < justUploadedDocs.length) {
        setJustUploadedDocs(stillPending);
      }
    }
  }, [kbMemories, justUploadedDocs]);

  const handleDeleteDocument = useCallback(async (docOrId) => {
    // Accept either a raw id (legacy) or the full doc object so we can
    // forward BOTH memory_id and upload_id. Just-uploaded docs carry an
    // upload_id in their id slot; persisted docs have a real memory
    // UUID. The api-client + core handler resolve whichever fits.
    const doc = (docOrId && typeof docOrId === 'object') ? docOrId : null;
    const docId = doc ? doc.id : docOrId;
    const uploadId = doc?.metadata?.upload_id
      || doc?.metadata?.source_upload_id
      || doc?.source_metadata?.metadata?.source_upload_id
      || null;
    setDeletingDocId(docId);
    try {
      const result = await apiClient.deleteDocument({
        memoryId: docId,
        // Fall back to docId — if it's an upload_id rather than a UUID
        // the server uses this as the upload_id key.
        uploadId: uploadId || docId,
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
          status: 'success',
        }]);
      }
      refetchKb();
    } catch (err) {
      console.error('Delete failed:', err);
      const serverMsg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Unknown error';
      setUploads(prev => [...prev, {
        id: `del-err-${Date.now()}`,
        filename: 'Delete failed',
        status: 'error',
        error: serverMsg,
      }]);
    } finally {
      setDeletingDocId(null);
    }
  }, [refetchKb]);

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
      try {
        const result = await apiClient.uploadDocument(file, {
          tags: customTags || undefined,
          targetScope,
          containerTag: targetScope === 'organization' ? (project || undefined) : undefined,
          signal: uploadEntry.controller.signal,
          onUploadProgress: (e) => {
            if (!e.total) return;
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploads((prev) => prev.map((u) =>
              u.id === uploadEntry.id ? { ...u, progress: pct } : u
            ));
          },
        });
        setUploads((prev) => prev.map((u) =>
          u.id === uploadEntry.id
            ? { ...u, status: 'success', chunks: result.chunks, uploadId: result.upload_id, progress: 100 }
            : u
        ));
        setJustUploadedDocs((prev) => [{
          id: result.upload_id || `pending-${uploadEntry.id}`,
          title: result.filename || file.name,
          metadata: {
            document_title: result.filename || file.name,
            total_chunks: result.chunks || 1,
            filename: result.filename || file.name,
          },
          tags: customTags ? customTags.split(',').map((t) => t.trim()) : [],
          created_at: new Date().toISOString(),
        }, ...prev]);
        queueRefetch();
      } catch (err) {
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
  }, [customTags, refetchKb, pickConcurrency]);

  // Cancel a queued/uploading entry
  const handleCancelUpload = useCallback((entryId) => {
    setUploads((prev) => {
      const entry = prev.find((u) => u.id === entryId);
      if (entry?.controller) {
        try { entry.controller.abort(); } catch (_e) { /* noop */ }
      }
      return prev;
    });
  }, []);

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
  }, []);

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
      // Enterprise detect flow: process first file through detection
      for (const file of files) {
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
  }, [handleFiles, pendingFiles, selectedProject, selectedScope, smartExtract]);

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
        status: 'success',
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
  }, [detectionResult, customTags, selectedScope, selectedProject, refetchKb]);

  return (
    <div className="min-h-full">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk'] mb-1">Knowledge Base</h1>
          <p className="text-[#525252] text-sm font-['Space_Grotesk']">
            Upload documents to create structured, searchable memories
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
            title="View memory hierarchy map"
          >
            <MapIcon size={14} />
            Memory Map
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
            accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) queueFilesForUpload(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
          <Upload size={32} className={`mx-auto mb-3 ${dragActive ? 'text-[#117dff]' : 'text-[#d4d0ca]'}`} />
          <p className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] mb-1">
            Drop files here or click to upload
          </p>
          <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">
            PDF, DOCX, TXT, MD, CSV, XLSX — max 100MB per file
          </p>
          <p className="text-[#a3a3a3] text-[10px] font-mono mt-2">
            Files are chunked into semantic sections and stored as searchable memories
          </p>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Tag size={12} className="text-[#a3a3a3]" />
          <input
            type="text"
            value={customTags}
            onChange={(e) => setCustomTags(e.target.value)}
            placeholder="Optional tags (comma-separated): project-docs, research, notes..."
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
            title="Smart Extract: auto-detect document type, extract structured data from invoices, contracts, spreadsheets"
          >
            <Sparkles size={12} />
            Smart Extract
            <div className={`relative w-7 h-4 rounded-full transition-colors ${smartExtract ? 'bg-[#117dff]' : 'bg-[#e3e0db]'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${smartExtract ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>
        {detecting && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-[#117dff]/5 border border-[#117dff]/20">
            <Loader2 size={12} className="text-[#117dff] animate-spin" />
            <span className="text-xs font-['Space_Grotesk'] text-[#117dff]">Analyzing document type...</span>
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
                      Cancel all
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
                {/* Per-file progress bar (background fill) */}
                {u.status === 'uploading' && (u.progress || 0) > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-[#117dff]/8 transition-all duration-200 pointer-events-none"
                    style={{ width: `${u.progress}%` }}
                  />
                )}
                <div className="relative flex items-center gap-3 flex-1 min-w-0">
                  {u.status === 'queued' && <Clock size={14} className="text-[#a3a3a3]" />}
                  {u.status === 'uploading' && <Loader2 size={14} className="text-[#117dff] animate-spin" />}
                  {u.status === 'success' && <CheckCircle size={14} className="text-[#16a34a]" />}
                  {u.status === 'error' && <XCircle size={14} className="text-[#dc2626]" />}
                  {u.status === 'cancelled' && <XCircle size={14} className="text-[#a3a3a3]" />}
                  <span className="flex-1 text-[#0a0a0a] truncate">{u.filename}</span>
                  {u.size && <span className="text-[#a3a3a3]">{formatBytes(u.size)}</span>}
                  {u.status === 'uploading' && (u.progress || 0) > 0 && (
                    <span className="text-[#117dff] font-semibold">{u.progress}%</span>
                  )}
                  {u.chunks && <span className="text-[#16a34a]">{u.chunks} chunks</span>}
                  {u.error && <span className="text-[#dc2626] truncate max-w-[200px]">{u.error}</span>}
                  {u.status === 'queued' && <span className="text-[#a3a3a3]">Waiting...</span>}
                  {(u.status === 'queued' || u.status === 'uploading') && u.controller && (
                    <button
                      onClick={() => handleCancelUpload(u.id)}
                      className="text-[#a3a3a3] hover:text-[#dc2626] transition-colors"
                      title="Cancel this upload"
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
                Clear completed
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#525252]" />
            <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">Documents</h3>
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none rounded-lg border border-[#e3e0db] bg-white pl-3 pr-7 py-1.5 text-xs font-['Space_Grotesk'] text-[#525252] focus:outline-none focus:border-[#117dff]/40 cursor-pointer"
            >
              <option value="all">All Types</option>
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
                <div key={doc.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl border border-[#eae7e1] hover:bg-[#faf9f4] transition-colors">
                  {getFileIcon(srcMeta.filename || meta.filename || meta.document_title)}
                  {typeStyle && (
                    <span className={`text-[10px] font-semibold font-['Space_Grotesk'] px-2 py-0.5 rounded-md border shrink-0 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                      {TYPE_LABELS[docType] ? docType.charAt(0).toUpperCase() + docType.slice(1) : docType}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] truncate">
                      {meta.document_title || doc.title || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {meta.total_chunks && (
                        <span className="text-[#a3a3a3] text-[10px] font-mono">{meta.total_chunks} chunks</span>
                      )}
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
                        title="Delete document + every chunk + every fact + Qdrant vectors"
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
                  No {TYPE_LABELS[typeFilter] || typeFilter} documents found
                </p>
                <button
                  onClick={() => setTypeFilter('all')}
                  className="text-[#117dff] text-xs font-['Space_Grotesk'] hover:underline mt-1"
                >
                  Show all documents
                </button>
              </>
            ) : (
              <>
                <p className="text-[#525252] text-sm font-['Space_Grotesk'] mb-1">No documents uploaded yet</p>
                <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">
                  Upload PDFs, documents, or text files to build your knowledge base
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
                    <h3 className="text-sm font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Memory Map</h3>
                    <p className="text-xs text-[#666]">Visual hierarchy of your organized memories</p>
                  </div>
                </div>
                <button
                  onClick={() => setPageIndexModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#e3e0db] transition-colors"
                  title="Close"
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
    </div>
  );
}
