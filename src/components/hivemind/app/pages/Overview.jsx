import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OverviewTour, { useOverviewTour } from '../shared/OverviewTour';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  ArrowUp,
  BookOpen,
  Boxes,
  Building2,
  Cable,
  CheckCircle2,
  FileText,
  Globe,
  Hexagon,
  Loader2,
  Lock,
  Network,
  Paperclip,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useHealthStatus } from '../shared/hooks';
import { useTeamContext } from '../shared/team-context';
import { useUploads, setUploads, updateUpload, removeUpload } from '../shared/upload-store';

// ─── Animation variants ──────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Control-console live clock ──────────────────────────────────
// Self-contained so its per-tick re-render is isolated from the page.
function ConsoleClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const date = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className="flex items-center gap-3">
      <div className="leading-tight">
        <p className="text-[#0a0a0a] text-[11px] font-semibold">{day}</p>
        <p className="text-[#a3a3a3] text-[10px] -mt-0.5">{date}</p>
      </div>
      <span className="text-[#0a0a0a] text-2xl font-bold tracking-tight tabular-nums font-mono">{time}</span>
    </div>
  );
}

// ─── Inline HIVE chat ────────────────────────────────────────────
// The Overview centerpiece. Same pipeline as the Talk-to-HIVE panel
// (/v1/proxy/chat → react agent: recall + tools + draft-approval), rendered
// as a fixed-height conversation so the page itself never grows — past
// turns scroll INSIDE the thread box, the page stays put.

const CHAT_STORE_KEY = 'hm.overviewChat';
const CHAT_MODEL = 'gpt-oss-120b';
const HISTORY_CAP = 40;

// Same accepted families as the Knowledge Base dropzone (docling + image
// pipelines). Kept in sync with KnowledgeBase.jsx ACCEPTED_EXTS.
const ACCEPTED_EXTS = ['pdf', 'docx', 'txt', 'md', 'csv', 'tsv', 'xlsx', 'xls',
  'pptx', 'ppt', 'html', 'htm', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const FILE_ACCEPT = ACCEPTED_EXTS.map((e) => `.${e}`).join(',');

function loadStoredChat() {
  try {
    const raw = window.sessionStorage.getItem(CHAT_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-[#e3e0db] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#a3a3a3]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-[#0a0a0a] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className={`max-w-[85%] bg-white border rounded-2xl rounded-bl-md px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
        msg.error ? 'border-[#f59e0b]/50 text-[#92400e]' : 'border-[#e3e0db] text-[#262626]'
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

// ─── Upload: scope popup (compact replica of the KB modal) ──────
function UploadScopeModal({ open, files, projects, onConfirm, onClose, t }) {
  const [scope, setScope] = useState('personal');
  const [project, setProject] = useState('');
  useEffect(() => { if (open) { setScope('personal'); setProject(''); } }, [open]);
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        key="scope-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          className="bg-white border border-[#e3e0db] rounded-2xl shadow-xl w-full max-w-md p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-[#0a0a0a] text-[16px] font-semibold font-['Space_Grotesk']">
            {t('knowledgebase.scopeModalTitle', 'Save uploaded memories to')}
          </h3>
          <p className="text-[12px] text-[#737373] mt-0.5 mb-4">
            {t('knowledgebase.scopeModalSubtitle', 'Choose where these files should live before upload starts.')}
            {files?.length ? ` · ${files.length} file${files.length === 1 ? '' : 's'}` : ''}
          </p>

          <div className="space-y-2">
            <button
              onClick={() => setScope('personal')}
              className={`w-full flex items-center gap-3 p-3 rounded-[10px] border text-left transition-colors ${
                scope === 'personal' ? 'border-[#117dff] bg-[#117dff]/5' : 'border-[#e3e0db] hover:border-[#d4d0ca]'
              }`}
            >
              <Lock size={16} className={scope === 'personal' ? 'text-[#117dff]' : 'text-[#a3a3a3]'} />
              <span>
                <span className="block text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.scopePersonalLabel', 'My Space')}</span>
                <span className="block text-[11px] text-[#737373]">{t('knowledgebase.scopePersonalDesc', 'Private memories only visible in your personal workspace.')}</span>
              </span>
            </button>
            <button
              onClick={() => setScope('organization')}
              className={`w-full flex items-center gap-3 p-3 rounded-[10px] border text-left transition-colors ${
                scope === 'organization' ? 'border-[#117dff] bg-[#117dff]/5' : 'border-[#e3e0db] hover:border-[#d4d0ca]'
              }`}
            >
              <Building2 size={16} className={scope === 'organization' ? 'text-[#117dff]' : 'text-[#a3a3a3]'} />
              <span>
                <span className="block text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.scopeTeamLabel', 'Team Workspace')}</span>
                <span className="block text-[11px] text-[#737373]">{t('knowledgebase.scopeTeamDesc', 'Shared with your org.')}</span>
              </span>
            </button>
          </div>

          {scope === 'organization' && projects?.length > 0 && (
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">{t('knowledgebase.scopeProject', 'Project')}</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="mt-1 w-full bg-white border border-[#e3e0db] rounded-[6px] px-2.5 py-2 text-[12px] text-[#0a0a0a] focus:outline-none focus:border-[#117dff]"
              >
                <option value="">{t('knowledgebase.scopeOrgWide', 'Org-wide (no project)')}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-5">
            <button onClick={onClose} className="px-3 py-2 rounded-[6px] text-[12px] text-[#525252] hover:bg-[#f3f1ec]">
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={() => onConfirm({ scope, project: scope === 'organization' ? (project || null) : null })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]"
            >
              <Paperclip size={13} /> {t('knowledgebase.uploadFiles', 'Upload files')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Upload: drop-up strip (tqdm-style, slides above the composer) ──
function rowState(u) {
  if (u.status === 'success') return { icon: CheckCircle2, color: '#10b981' };
  if (u.status === 'error' || u.status === 'cancelled') return { icon: AlertCircle, color: '#f59e0b' };
  return { icon: Loader2, color: '#117dff' };
}

function UploadDropUp({ t }) {
  const uploads = useUploads();
  // Tick once a second while completed rows are on screen so they self-expire.
  const [, setTick] = useState(0);
  const hasDone = uploads.some((u) => u.status === 'success' && u._completedAt);
  useEffect(() => {
    if (!hasDone) return undefined;
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasDone]);

  const now = Date.now();
  const visible = uploads.filter((u) => {
    if (u.status === 'success') return u._completedAt ? now - u._completedAt < 8000 : true;
    if (u.status === 'cancelled') return false;
    return true; // queued | uploading | error
  });
  if (!visible.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 8, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="bg-white border border-[#e3e0db] rounded-xl px-3 py-2 mb-2 space-y-2 shadow-sm">
        {visible.slice(0, 4).map((u) => {
          const { icon: Icon, color } = rowState(u);
          const processing = u.status === 'uploading' && u.stage === 'processing';
          return (
            <div key={u.id}>
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-[#a3a3a3] flex-shrink-0" />
                <span className="text-[11px] text-[#0a0a0a] truncate flex-1">{u.filename}</span>
                <span className="text-[10px] font-mono tabular-nums" style={{ color }}>
                  {u.status === 'success'
                    ? (u.deduped ? t('overview.upload.deduped', 'already saved') : `${u.promotedCount ?? u.chunks ?? ''} ${t('overview.upload.done', 'done')}`.trim())
                    : u.status === 'error' ? (u.error || 'error').slice(0, 36)
                    : processing ? `${t('overview.upload.processing', 'processing')}${u.processingSec ? ` · ${u.processingSec}s` : '…'}`
                    : `${u.progress || 0}%`}
                </span>
                <Icon size={12} style={{ color }} className={u.status === 'uploading' && !processing ? '' : u.status === 'uploading' ? 'animate-spin' : ''} />
                {(u.status === 'uploading' || u.status === 'queued') && u.controller && (
                  <button onClick={() => { try { u.controller.abort(); } catch { /* noop */ } }} className="text-[#a3a3a3] hover:text-[#0a0a0a]" aria-label="Cancel">
                    <X size={11} />
                  </button>
                )}
                {(u.status === 'error') && (
                  <button onClick={() => removeUpload(u.id)} className="text-[#a3a3a3] hover:text-[#0a0a0a]" aria-label="Dismiss">
                    <X size={11} />
                  </button>
                )}
              </div>
              {/* tqdm-style bar: determinate blue fill while bytes move, indeterminate sweep while the server parses/embeds */}
              <div className="h-1 rounded-full bg-[#f3f1ec] mt-1.5 overflow-hidden relative">
                {processing ? (
                  <motion.div
                    className="absolute inset-y-0 w-1/3 rounded-full bg-[#117dff]"
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : (
                  <div
                    className="h-full rounded-full bg-[#117dff] transition-all duration-300"
                    style={{ width: `${u.status === 'success' ? 100 : (u.progress || 0)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
        {visible.length > 4 && (
          <p className="text-[10px] text-[#a3a3a3] text-center">+{visible.length - 4} {t('overview.upload.more', 'more')}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Upload engine — same pipeline as the KB page, writing to the global
// upload-store so progress survives navigation (GlobalUploadStrip elsewhere).
async function runUploads(files, { targetScope, project }) {
  const valid = [];
  const nowBase = Date.now();
  files.forEach((file, idx) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      setUploads((prev) => [...prev, { id: nowBase + idx + Math.random(), filename: file.name, status: 'error', error: `Unsupported type: .${ext}` }]);
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setUploads((prev) => [...prev, { id: nowBase + idx + Math.random(), filename: file.name, status: 'error', error: 'File too large (max 100MB)' }]);
      return;
    }
    const controller = new AbortController();
    const entry = { id: nowBase + idx + Math.random(), filename: file.name, size: file.size, status: 'queued', progress: 0, controller };
    valid.push({ entry, file });
    setUploads((prev) => [...prev, entry]);
  });

  const uploadOne = async ({ entry, file }) => {
    updateUpload(entry.id, { status: 'uploading' });
    let processingTimer = null;
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const isImage = IMAGE_EXTS.has(ext) || /^image\//.test(file.type || '');
      const uploadFn = isImage ? apiClient.uploadImage.bind(apiClient) : apiClient.uploadDocument.bind(apiClient);
      const opts = isImage
        ? { projectId: targetScope === 'organization' ? null : (project || null), signal: entry.controller.signal }
        : { targetScope, containerTag: targetScope === 'organization' ? (project || undefined) : undefined, signal: entry.controller.signal };
      const result = await uploadFn(file, {
        ...opts,
        onUploadProgress: (e) => {
          if (!e.total) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          updateUpload(entry.id, { progress: pct, stage: pct < 100 ? 'uploading' : 'processing' });
          if (pct >= 100 && !processingTimer) {
            const tProc = Date.now();
            processingTimer = setInterval(() => {
              updateUpload(entry.id, { stage: 'processing', processingSec: Math.round((Date.now() - tProc) / 1000) });
            }, 500);
          }
        },
      });
      if (processingTimer) { clearInterval(processingTimer); processingTimer = null; }
      updateUpload(entry.id, {
        status: 'success', _completedAt: Date.now(), progress: 100,
        deduped: !!result?.deduped,
        chunks: result?.chunks ?? result?.segmentCount ?? null,
        promotedCount: result?.promotedCount ?? null,
      });
    } catch (err) {
      if (processingTimer) { clearInterval(processingTimer); processingTimer = null; }
      const cancelled = err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED';
      updateUpload(entry.id, {
        status: cancelled ? 'cancelled' : 'error',
        error: cancelled ? 'Cancelled' : (err?.response?.data?.error || err?.message),
      });
    }
  };

  let cursor = 0;
  const workers = Array.from({ length: Math.min(3, valid.length) }, async () => {
    while (cursor < valid.length) {
      const i = cursor++;
      if (i >= valid.length) break;
      await uploadOne(valid[i]);
    }
  });
  await Promise.all(workers);
}

function OverviewChat({ inputRef }) {
  const { t, i18n } = useTranslation('dashboard');
  const { activeProjectId, projects } = useTeamContext() || {};
  const [messages, setMessages] = useState(() => (typeof window === 'undefined' ? [] : loadStoredChat()));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const threadRef = useRef(null);

  // Knowledge upload from the composer — same scope-popup + pipeline as the
  // KB page; progress renders in the drop-up strip above the composer.
  const fileInputRef = useRef(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [scopeOpen, setScopeOpen] = useState(false);
  const onFilesPicked = (list) => {
    const files = Array.from(list || []);
    if (!files.length) return;
    setPendingFiles(files);
    setScopeOpen(true);
  };
  const confirmScope = ({ scope, project }) => {
    const files = pendingFiles;
    setScopeOpen(false);
    setPendingFiles([]);
    runUploads(files, { targetScope: scope, project });
  };

  // Persist the conversation for the session so navigating away and back
  // keeps the thread (capped so storage stays small).
  useEffect(() => {
    try {
      window.sessionStorage.setItem(CHAT_STORE_KEY, JSON.stringify(messages.slice(-HISTORY_CAP)));
    } catch { /* storage blocked — chat still works in-memory */ }
  }, [messages]);

  // Keep the thread pinned to the latest turn (internal scroll only).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    const fullHistory = [...messages, userMsg].slice(-10).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Same strict-language directive the Talk-to-HIVE panel sends — UI keeps
    // the clean text, only the wire payload carries it.
    const lang2 = (i18n.language || 'en').slice(0, 2).toLowerCase();
    const wireMessage = lang2 === 'en'
      ? trimmed
      : `[STRICT LANGUAGE: Respond ONLY in the UI language (${lang2}).]\n\n${trimmed}`;

    try {
      const chatRes = await apiClient.controlPlane.post('/v1/proxy/chat', {
        message: wireMessage,
        model: CHAT_MODEL,
        history: fullHistory,
        language: lang2,
        ...(activeProjectId ? { project_id: activeProjectId, project_ids: [activeProjectId] } : {}),
      });
      const chatData = chatRes.data || {};
      let content = chatData.response
        || t('overview.chat.empty', "I couldn't find relevant information in your memories.");
      // Deferred save → list the projects so the user can reply with one.
      const pcProjects = chatData.project_choice?.projects;
      if (Array.isArray(pcProjects) && pcProjects.length) {
        const names = pcProjects.map((p) => p.name || p.slug || p.id).filter(Boolean);
        if (names.length) content += `\n\n${t('overview.chat.projects', 'Projects')}: ${names.join(' · ')}`;
      }
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        error: true,
        content: err?.response?.data?.error || err?.message
          || t('overview.chat.error', "I couldn't process that right now. Please try again."),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, activeProjectId, i18n.language, t]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasThread = messages.length > 0 || loading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className={`max-w-3xl mx-auto w-full ${hasThread ? 'mt-6' : 'mt-[16vh]'}`}
    >
      {/* Hero — only while the thread is empty */}
      {!hasThread && (
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0a0a0a] flex items-center justify-center shadow-sm">
            <Hexagon size={26} className="text-white" />
          </div>
          <h1 className="text-[26px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mt-4">
            {t('overview.chat.title', 'How can I help you today?')}
          </h1>
          <p className="text-[12px] text-[#737373] mt-1">
            {t('overview.chat.subtitle', 'Ask your second brain — it recalls, saves and acts across your connected apps.')}
          </p>
        </div>
      )}

      {/* Thread — FIXED height, internal scroll. The page never grows. */}
      {hasThread && (
        <div
          ref={threadRef}
          className="h-[380px] overflow-y-auto bg-[#fdfcf9] border border-[#e3e0db] rounded-2xl p-4 space-y-3 mt-2 mb-3"
        >
          {messages.map((m) => <ChatBubble key={m.id} msg={m} />)}
          {loading && <TypingBubble />}
        </div>
      )}

      {/* Upload progress — slides up from the composer (tqdm-style) */}
      <AnimatePresence>
        <UploadDropUp key="overview-upload-dropup" t={t} />
      </AnimatePresence>

      {/* Composer */}
      <div className={`bg-white border border-[#e3e0db] rounded-2xl shadow-sm focus-within:border-[#117dff] transition-colors ${hasThread ? '' : 'mt-2'}`}>
        <textarea
          ref={inputRef}
          rows={hasThread ? 1 : 2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('overview.chat.placeholder', 'Do anything with HIVE…')}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[13px] text-[#0a0a0a] placeholder-[#a3a3a3] focus:outline-none"
        />
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={(e) => { onFilesPicked(e.target.files); e.target.value = ''; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#a3a3a3] hover:text-[#117dff] hover:bg-[#117dff]/10 transition-colors"
              title={t('overview.upload.hint', 'Upload to Knowledge Base')}
              aria-label={t('overview.upload.hint', 'Upload to Knowledge Base')}
            >
              <Paperclip size={14} />
            </button>
            <span className="text-[10px] text-[#a3a3a3] font-mono uppercase tracking-wider">
              {t('overview.chat.engine', 'HIVE · full recall + tools')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); try { window.sessionStorage.removeItem(CHAT_STORE_KEY); } catch { /* noop */ } }}
                className="text-[11px] text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors"
              >
                {t('overview.chat.clear', 'Clear')}
              </button>
            )}
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                input.trim() && !loading
                  ? 'bg-[#117dff] text-white hover:bg-[#0066e0] shadow-[0_2px_8px_rgba(17,125,255,0.3)]'
                  : 'bg-[#f3f1ec] text-[#a3a3a3]'
              }`}
              aria-label={t('overview.chat.send', 'Send')}
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload scope popup — same choice flow as the KB page */}
      <UploadScopeModal
        open={scopeOpen}
        files={pendingFiles}
        projects={projects || []}
        onConfirm={confirmScope}
        onClose={() => { setScopeOpen(false); setPendingFiles([]); }}
        t={t}
      />
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────────

export default function Overview() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const healthy = useHealthStatus(30000);
  // First-visit guided tour — glass overlay + arrows to each sidebar page.
  const tour = useOverviewTour();
  const chatInputRef = useRef(null);

  // Auto-redirect to the dedicated mobile chat page on phones. The full
  // Overview surface is hard to navigate one-handed; mobile users land on
  // /hivemind/m/chat which is a full-screen Talk-to-HIVE.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Detect phones either by narrow viewport OR by UA — catches the
    // "Request Desktop Site" case where the viewport widens beyond 768px
    // but the device is still a phone.
    const narrowViewport = window.matchMedia('(max-width: 768px)').matches;
    const uaDataMobile = !!(navigator.userAgentData && navigator.userAgentData.mobile);
    const uaSniff = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i.test(navigator.userAgent || '');
    const isMobile = narrowViewport || uaDataMobile || uaSniff;
    const fromQR = new URLSearchParams(window.location.search).get('from');
    const optOut = new URLSearchParams(window.location.search).get('desktop') === '1';
    if ((isMobile || fromQR) && !optOut) navigate('/hivemind/m/chat', { replace: true });
  }, [navigate]);

  // NOTE: the old auto-greet (sliding the Talk-to-HIVE panel out after 1.5s)
  // is intentionally gone — the chat IS the page now, and the floating
  // Talk-to-HIVE button is hidden on Overview only (AppShell).

  // Post-login welcome email. Fires once per browser session; the server
  // also dedupes. Fire-and-forget — never blocks the UI.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const FLAG = 'hm.welcomeEmailSent';
    try {
      if (window.sessionStorage.getItem(FLAG)) return;
      window.sessionStorage.setItem(FLAG, '1');
    } catch {
      // sessionStorage blocked — server dedup still protects us.
    }
    apiClient.sendWelcomeEmail().catch(() => { /* silent: non-critical */ });
  }, []);

  // Profile — feeds the operator pill in the status bar.
  const { data: profileData } = useApiQuery(() => apiClient.getProfile(), []);
  const profile = useMemo(() => profileData?.profile || profileData || null, [profileData]);

  // Feature launcher — Overview is the entrance to every surface. The chat
  // entry focuses the inline composer (the chat lives on this page now).
  const FEATURES = [
    { key: 'chat',      icon: Sparkles,  label: t('overview.feat.chat', 'Talk to HIVE'),        hint: t('overview.feat.chatHint', 'Ask your second brain anything'), onClick: () => chatInputRef.current?.focus(), primary: true },
    { key: 'rooms',     icon: Users,     label: t('overview.feat.rooms', 'HyperAgents Rooms'),  hint: t('overview.feat.roomsHint', 'Multi-agent collaboration rooms'), onClick: () => navigate('../employees') },
    { key: 'workspace', icon: Building2, label: t('overview.feat.workspace', 'Workspace'),       hint: t('overview.feat.workspaceHint', 'Team, members & projects'),     onClick: () => navigate('../workspace') },
    { key: 'knowledge', icon: BookOpen,  label: t('overview.feat.knowledge', 'Knowledge Base'),  hint: t('overview.feat.knowledgeHint', 'Upload & manage documents'),    onClick: () => navigate('../knowledge') },
    { key: 'graph',     icon: Network,   label: t('overview.feat.graph', 'Memory Graph'),        hint: t('overview.feat.graphHint', '3D map of your memories'),         onClick: () => navigate('../graph') },
    { key: 'swarm',     icon: Boxes,     label: t('overview.feat.swarm', 'Swarm'),               hint: t('overview.feat.swarmHint', 'Digital employees & agents'),      onClick: () => navigate('../swarm') },
    { key: 'connectors',icon: Cable,     label: t('overview.feat.connectors', 'Connectors'),     hint: t('overview.feat.connectorsHint', 'Link Slack, Gmail, Notion…'), onClick: () => navigate('../connectors') },
    { key: 'web',       icon: Globe,     label: t('overview.feat.web', 'Web Intelligence'),      hint: t('overview.feat.webHint', 'Research & live web recall'),        onClick: () => navigate('../web') },
  ];

  return (
    <div className="max-w-6xl mx-auto font-['Space_Grotesk']">
      {/* First-visit guided tour */}
      <AnimatePresence>
        {tour.open && <OverviewTour onClose={tour.close} />}
      </AnimatePresence>

      {/* Control console — device-style status bar (bezel → screen) */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6 rounded-[26px] bg-gradient-to-b from-[#f3f1ec] to-[#e9e6df] border border-[#dcd8d0] p-2 shadow-[0_2px_10px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]"
      >
        <div className="relative flex items-center gap-3 rounded-[18px] bg-white border border-[#e8e5df] px-3 py-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Left edge status LED strip */}
          <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${healthy ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'} shadow-[0_0_8px_currentColor]`} />

          {/* Device badge */}
          <div className="ml-1.5 w-9 h-9 rounded-xl bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
            <Hexagon size={18} className="text-white" />
          </div>

          {/* Live clock */}
          <ConsoleClock />

          <span className="h-7 w-px bg-[#e8e5df] mx-1" />

          {/* Operator / scope pill */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#f7f6f2] border border-[#e8e5df]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]" />
            <span className="text-[#0a0a0a] text-xs font-medium truncate max-w-[160px]">
              {profile?.name || profile?.org_name || t('overview.title', 'Memory Engine')}
            </span>
          </div>

          {/* System status pill (right) */}
          <div className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            healthy ? 'bg-[#117dff] text-white shadow-[0_2px_8px_rgba(17,125,255,0.3)]' : 'bg-[#f59e0b] text-white'
          }`}>
            <Activity size={12} />
            <span>{healthy ? t('overview.online', 'Online') : t('overview.degraded', 'Degraded')}</span>
          </div>
        </div>
      </motion.div>

      {/* Feature launcher — compact console tabs */}
      <div className="mb-6">
        <p className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-[0.18em] mb-2 ml-1">{t('overview.launch', 'Launch')}</p>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-wrap gap-2"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.button
                key={f.key}
                variants={fadeUp}
                onClick={f.onClick}
                title={f.hint}
                className={`group flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  f.primary
                    ? 'bg-[#117dff] border-[#117dff] text-white shadow-[0_2px_8px_rgba(17,125,255,0.28)] hover:shadow-[0_3px_12px_rgba(17,125,255,0.4)]'
                    : 'bg-white border-[#e3e0db] text-[#0a0a0a] hover:border-[#117dff]/40 hover:bg-[#f7f6f2]'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  f.primary ? 'bg-white/20' : 'bg-[#117dff]/10'
                }`}>
                  <Icon size={13} className={f.primary ? 'text-white' : 'text-[#117dff]'} />
                </span>
                {f.label}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* The HIVE chat — the Overview centerpiece */}
      <OverviewChat inputRef={chatInputRef} />
    </div>
  );
}
