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
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';
import { useAuth } from '../auth/AuthProvider';
import { PageIndexViewer } from '../PageIndexViewer';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const ACCEPTED_EXTS = ['pdf', 'docx', 'txt', 'md', 'csv'];

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
  const fileInputRef = useRef(null);

  const { data: kbMemories, loading: kbLoading, refetch: refetchKb } = useApiQuery(async () => {
    try {
      // Fetch uploaded documents by listing memories with document-summary tag
      const result = await apiClient.listMemories({ tags: 'document-summary', limit: 100 });
      const mems = result?.memories || [];
      // Filter to actual document summaries (have metadata.total_chunks or title starts with "Document:")
      const docs = mems.filter((m) => {
        const meta = m.metadata || {};
        const title = m.title || '';
        return meta.total_chunks || meta.document_title || title.startsWith('Document:');
      });
      // Sort by date descending (newest first)
      return docs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } catch {
      // Fallback to search
      try {
        const result = await apiClient.quickSearch('knowledge-base document-summary');
        return (result?.results || result?.memories || []).filter((m) =>
          (m.tags || []).includes('document-summary')
        );
      } catch {
        return [];
      }
    }
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

  const handleFiles = useCallback(async (files, { targetScope = 'personal', project = null } = {}) => {
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

      if (file.size > 100 * 1024 * 1024) {
        setUploads((prev) => [...prev, {
          id: Date.now() + Math.random(),
          filename: file.name,
          status: 'error',
          error: 'File too large (max 100MB)',
        }]);
        continue;
      }

      const uploadEntry = {
        id: Date.now() + Math.random(),
        filename: file.name,
        size: file.size,
        status: 'uploading',
        chunks: null,
      };

      setUploads((prev) => [...prev, uploadEntry]);

      try {
        const result = await apiClient.uploadDocument(file, {
          tags: customTags || undefined,
          targetScope,
          containerTag: targetScope === 'organization' ? (project || undefined) : undefined,
        });
        setUploads((prev) => prev.map((u) =>
          u.id === uploadEntry.id
            ? { ...u, status: 'success', chunks: result.chunks, uploadId: result.upload_id }
            : u
        ));
        // Add to just-uploaded docs for immediate display
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
        // Refetch to sync with server state
        refetchKb();
      } catch (err) {
        setUploads((prev) => prev.map((u) =>
          u.id === uploadEntry.id
            ? { ...u, status: 'error', error: err.response?.data?.error || err.message }
            : u
        ));
      }
    }
  }, [customTags, refetchKb]);

  const queueFilesForUpload = useCallback((files) => {
    if (!files?.length) return;
    setPendingFiles(files);
    setSelectedScope('personal');
    setSelectedProject('');
    setScopeModalOpen(true);
  }, []);

  const handleConfirmUploadScope = useCallback(() => {
    const project = selectedScope === 'organization' ? (selectedProject || null) : null;
    const files = pendingFiles;
    setScopeModalOpen(false);
    setPendingFiles([]);
    handleFiles(files, { targetScope: selectedScope, project });
  }, [handleFiles, pendingFiles, selectedProject, selectedScope]);

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
            accept=".pdf,.docx,.txt,.md,.csv"
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
            PDF, DOCX, TXT, MD, CSV — max 100MB per file
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
        </div>
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

      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 space-y-2"
          >
            {uploads.map((u) => (
              <div
                key={u.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono ${
                  u.status === 'success' ? 'bg-[#f0fdf4] border border-[#bbf7d0]' :
                  u.status === 'error' ? 'bg-[#fef2f2] border border-[#fecaca]' :
                  'bg-white border border-[#e3e0db]'
                }`}
              >
                {u.status === 'uploading' && <Loader2 size={14} className="text-[#117dff] animate-spin" />}
                {u.status === 'success' && <CheckCircle size={14} className="text-[#16a34a]" />}
                {u.status === 'error' && <XCircle size={14} className="text-[#dc2626]" />}
                <span className="flex-1 text-[#0a0a0a] truncate">{u.filename}</span>
                {u.size && <span className="text-[#a3a3a3]">{formatBytes(u.size)}</span>}
                {u.chunks && <span className="text-[#16a34a]">{u.chunks} chunks</span>}
                {u.error && <span className="text-[#dc2626]">{u.error}</span>}
                {u.status === 'uploading' && <span className="text-[#117dff]">Processing...</span>}
              </div>
            ))}
            {uploads.some((u) => u.status !== 'uploading') && (
              <button
                onClick={() => setUploads([])}
                className="text-[#a3a3a3] text-[10px] font-mono hover:text-[#525252] transition-colors"
              >
                Clear upload history
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-5">
          <FileText size={16} className="text-[#525252]" />
          <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">Documents</h3>
        </div>

        {kbLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => {
              const meta = doc.metadata || {};
              const srcMeta = doc.source_metadata || {};
              return (
                <div key={doc.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[#eae7e1] hover:bg-[#faf9f4] transition-colors">
                  {getFileIcon(srcMeta.filename || meta.document_title)}
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
                    {(doc.tags || []).filter((t) => !['knowledge-base', 'document', 'document-summary'].includes(t)).slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f3f1ec] text-[#525252] border border-[#e3e0db]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[#a3a3a3] text-[10px] font-mono shrink-0 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(doc.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <BookOpen size={28} className="text-[#d4d0ca] mx-auto mb-3" />
            <p className="text-[#525252] text-sm font-['Space_Grotesk'] mb-1">No documents uploaded yet</p>
            <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">
              Upload PDFs, documents, or text files to build your knowledge base
            </p>
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
