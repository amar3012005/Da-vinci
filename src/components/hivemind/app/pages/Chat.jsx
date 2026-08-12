import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Send,
  ChevronDown,
  Loader2,
  Trash2,
  Paperclip,
  X,
  CheckCircle2,
  Mic,
  Square,
  Plus,
  FileWarning,
  Globe,
  Building2,
  Lock,
  Boxes,
  Hexagon,
  AudioLines,
  FolderKanban,
  Users,
  Upload,
  Clock,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { UserBubble, AiBubble, Thinking } from '../shared/claude-chat';
import useDictation from '../shared/useDictation';
import { useTeamContext } from '../shared/team-context';
import { useQuickRecorder } from '../shared/QuickRecorderProvider';
import { useAuth } from '../auth/AuthProvider';
import { QRCodeSVG } from 'qrcode.react';

// This panel is deliberately built to be pixel-for-pixel the same chat surface
// as mobile/pages/TalkToHiveMobile.jsx — same composer card, same greeting
// hero, same scope/model/language chips, same streaming + optimistic upload
// behavior — just reflowed into a 440px right-side slide-over instead of a
// full-screen route. Anything that isn't a straight visual/behavioral port is
// called out inline (the desktop-only quick-recorder button, the QR-to-mobile
// promo below the mobile-identical hero).

// ─── Persistence ──────────────────────────────────────────────────────────────
// Chat history survives browser close/reopen via localStorage. Keyed by the
// authenticated user id when available so multi-account browsers don't bleed.
// Cap at MAX_PERSIST messages to stay within the ~5MB localStorage quota.

const MAX_PERSIST = 200;
const MAX_CHARS = 2000;

function getStorageUserId() {
  try {
    const raw =
      localStorage.getItem('hivemind:user') ||
      localStorage.getItem('user') ||
      '';
    if (!raw) return 'anon';
    if (raw.startsWith('{')) {
      const u = JSON.parse(raw);
      return u?.id || u?.user_id || u?.email || 'anon';
    }
    return raw;
  } catch {
    return 'anon';
  }
}

function storageKey() {
  return `hivemind:talk-to-hive:messages:${getStorageUserId()}`;
}

function loadPersistedMessages() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePersistedMessages(msgs) {
  try {
    const trimmed = Array.isArray(msgs) ? msgs.slice(-MAX_PERSIST) : [];
    localStorage.setItem(storageKey(), JSON.stringify(trimmed));
  } catch {
    /* quota exceeded or storage disabled — skip silently */
  }
}

function clearPersistedMessages() {
  try {
    localStorage.removeItem(storageKey());
  } catch {
    /* ignore */
  }
}

// ─── Constants (mirrors TalkToHiveMobile exactly) ────────────────────────────

const MODELS = [
  { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', tag: 'Default' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tag: 'Free' },
  { id: 'gpt-oss-20b', label: 'GPT-OSS 20B', tag: 'Fast' },
];

const LANG_OPTIONS = [
  { c: 'en', n: 'English' }, { c: 'de', n: 'Deutsch' },
  { c: 'es', n: 'Español' }, { c: 'fr', n: 'Français' },
  { c: 'it', n: 'Italiano' }, { c: 'pt', n: 'Português' },
  { c: 'nl', n: 'Nederlands' }, { c: 'pl', n: 'Polski' },
  { c: 'sv', n: 'Svenska' }, { c: 'ru', n: 'Русский' },
  { c: 'uk', n: 'Українська' }, { c: 'tr', n: 'Türkçe' },
  { c: 'ar', n: 'العربية' }, { c: 'he', n: 'עברית' },
  { c: 'hi', n: 'हिन्दी' }, { c: 'ja', n: '日本語' },
  { c: 'ko', n: '한국어' }, { c: 'zh', n: '中文' },
  { c: 'vi', n: 'Tiếng Việt' }, { c: 'th', n: 'ไทย' },
  { c: 'id', n: 'Indonesia' },
];

const STAGE_LABEL = {
  received: 'Sent to HIVE',
  processing: 'Processing in background',
  done: 'Saved to memory',
  error: 'Failed',
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 28 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } },
};

// ─── SSE reader — mirrors TalkToHiveMobile.readChatStream frame-for-frame ────

async function readChatStream(response, onEvent) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;
  const consume = (frame) => {
    const data = frame.split('\n').filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim()).join('\n');
    if (!data) return;
    try {
      const event = JSON.parse(data);
      if (event.type === 'done') result = event;
      else onEvent(event);
    } catch { /* malformed intermediary frame */ }
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';
    frames.forEach(consume);
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);
  return result;
}

// ─── Upload scope modal — identical to TalkToHiveMobile's ────────────────────

function UploadScopeModal({
  open, files, org, userRole, projects, loadingProjects, projectsError, onRetryProjects,
  selectedScope, onScopeChange, selectedProject, onProjectChange, onConfirm, onClose,
}) {
  if (!open) return null;
  const canUseTeamWorkspace = org?.plan === 'enterprise' || org?.plan === 'team';
  const isOrgAdmin = userRole === 'owner' || userRole === 'admin';
  const requiresProject = selectedScope === 'project';

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/35 px-3 pb-3 pt-16" onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="w-full max-w-lg rounded-[24px] border border-[#e3e0db] bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-[#0a0a0a] text-[16px] font-semibold font-['Space_Grotesk']">Save uploaded memories to</h3>
              <p className="text-[#525252] text-[12px] mt-1">Choose where these files should live before upload starts.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#a3a3a3] hover:text-[#525252]">
              <X size={16} />
            </button>
          </div>
          <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-3 py-2.5 mb-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3] mb-2">Upload batch</p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="truncate text-[#0a0a0a]">{file.name}</span>
                  <span className="text-[#a3a3a3] text-[10px] font-mono shrink-0">{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            <button type="button" onClick={() => onScopeChange('personal')} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${selectedScope === 'personal' ? 'border-[#117dff]/30 bg-[#117dff]/8' : 'border-[#e3e0db] bg-white hover:border-[#c4c1bb]'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center"><Lock size={14} className="text-[#117dff]" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">My Space</p>
                  <p className="text-[11px] text-[#525252]">Private memories only visible in your personal workspace.</p>
                </div>
              </div>
            </button>
            <div role="button" tabIndex={canUseTeamWorkspace ? 0 : -1} aria-disabled={!canUseTeamWorkspace} onClick={() => canUseTeamWorkspace && onScopeChange('project')} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${selectedScope === 'project' ? 'border-[#117dff]/30 bg-[#117dff]/8' : 'border-[#e3e0db] bg-white hover:border-[#c4c1bb]'} ${!canUseTeamWorkspace ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center"><FolderKanban size={14} className="text-[#117dff]" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Project</p>
                  <p className="text-[11px] text-[#525252]">Shared with the members invited to that project.</p>
                </div>
              </div>
              {selectedScope === 'project' && (
                <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                  {loadingProjects ? <p className="text-[11px] text-[#a3a3a3]">Loading projects...</p>
                    : projectsError ? <div className="flex items-center justify-between gap-2"><p className="text-[11px] text-[#dc2626]">{projectsError}</p><button type="button" onClick={onRetryProjects} className="rounded-md border border-[#e3e0db] px-2 py-1 text-[10px] font-semibold text-[#525252]">Retry</button></div>
                      : projects.length > 0 ? <select value={selectedProject} onChange={(e) => onProjectChange(e.target.value)} className="w-full rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a]"><option value="">Select a project…</option>{projects.map((p) => <option key={p.id} value={p.slug || p.id}>{p.name}{p.slug ? ` (${p.slug})` : ''}</option>)}</select>
                        : <p className="text-[11px] text-[#a3a3a3]">You're not a member of any project yet. Ask an org admin to invite you, or choose another scope.</p>}
                </div>
              )}
            </div>
            <button type="button" disabled={!canUseTeamWorkspace || !isOrgAdmin} onClick={() => canUseTeamWorkspace && isOrgAdmin && onScopeChange('organization')} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${selectedScope === 'organization' ? 'border-[#117dff]/30 bg-[#117dff]/8' : 'border-[#e3e0db] bg-white hover:border-[#c4c1bb]'} ${(!canUseTeamWorkspace || !isOrgAdmin) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center"><Users size={14} className="text-[#117dff]" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{org?.name ? `Entire organization: ${org.name}` : 'Entire organization'}</p>
                  <p className="text-[11px] text-[#525252]">{isOrgAdmin ? 'Visible to every member of the org.' : 'Org-wide uploads are reserved for organization admins.'}</p>
                </div>
              </div>
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-[#e3e0db] px-3 py-2 text-[13px] font-semibold text-[#525252] hover:bg-[#faf9f4]">Cancel</button>
            <button type="button" onClick={onConfirm} disabled={requiresProject && !selectedProject} className="inline-flex items-center gap-2 rounded-[10px] bg-[#117dff] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50 hover:bg-[#0066e0]"><Upload size={14} />Upload files</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Empty State — the mobile hero, plus a QR-to-mobile promo underneath ────
// (desktop has vertical room mobile doesn't; the QR block is the only
// intentional addition beyond a straight port of TalkToHiveMobile's hero.)

const SUGGESTION_CHIPS = [
  'What have I been working on lately?',
  'Summarize my recent decisions',
  'What are my key preferences?',
];

function EmptyState({ setInput, textareaRef, userName }) {
  const handleChip = (label) => {
    setInput(label);
    setTimeout(() => textareaRef?.current?.focus(), 0);
  };
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const name = (userName || '').split(/[\s@]/)[0];
  const heroLine = name ? `${greeting}, ${name.charAt(0).toUpperCase()}${name.slice(1)}` : greeting;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col items-center justify-center min-h-[46vh] gap-4 px-2 text-center">
      <Hexagon size={34} className="text-[#117dff]" strokeWidth={1.6} />
      <div className="text-[32px] leading-tight text-[#1a1a17]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        {heroLine}
      </div>
      <div className="flex flex-col gap-2 mt-4 w-full">
        {SUGGESTION_CHIPS.map((label) => (
          <button
            key={label}
            onClick={() => handleChip(label)}
            className="text-left px-4 py-2.5 rounded-full border border-[#ece9e2] text-[13px] text-[#525252] hover:bg-[#f1eee7] bg-transparent transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* QR pairing — scan to use HIVEMIND on mobile (same memory). Desktop-only
          addition: this content has no mobile equivalent (you're already on
          the phone), placed below the mobile-identical hero above. */}
      <div className="w-full flex items-center gap-3 p-3.5 mt-2 rounded-xl border border-[#117dff]/20 bg-gradient-to-br from-[#117dff]/[0.04] to-transparent">
        <div className="flex-1 text-left min-w-0">
          <div className="text-[12.5px] font-semibold text-[#0a0a0a] leading-tight">Use on your phone</div>
          <div className="text-[11px] text-[#a3a3a3] leading-snug mt-1">Scan to open Talk to HIVE on mobile — same memory, save from anywhere.</div>
        </div>
        <div className="w-[72px] h-[72px] bg-white border border-[#e3e0db] rounded-lg p-1 flex items-center justify-center flex-shrink-0">
          <QRCodeSVG
            value={`${typeof window !== 'undefined' ? window.location.origin : 'https://hivemind.davinciai.eu'}/hivemind/m/chat?from=dashboard`}
            size={64} level="M" marginSize={0} bgColor="#ffffff" fgColor="#0a0a0a"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Chat Panel (slide-out) ───────────────────────────────────────────────────

export function ChatPanel({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const { activeProjectId, activeTeamId, activeProject, projects: ctxProjects } = useTeamContext() || {};
  const { org, user } = useAuth() || {};
  const userRole = user?.role || user?.org_role || user?.membership_role || 'member';
  const qrec = useQuickRecorder(); // one-click background meeting recording — desktop-only capability

  // Hydrate from localStorage on mount so chat survives browser close/reopen.
  const [messages, setMessages] = useState(() => loadPersistedMessages());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentEvents, setAgentEvents] = useState([]); // live tool_call/tool_result stream
  const [selectedModel, setSelectedModel] = useState('gpt-oss-120b');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  // Chat recall scope — 'all' (default: everything accessible), 'organization',
  // 'personal', or 'project'. Mirrors TalkToHiveMobile / Overview.jsx exactly.
  const [chatScope, setChatScope] = useState(activeProjectId || null);
  const [chatScopeMode, setChatScopeMode] = useState('all');
  useEffect(() => { setChatScope(activeProjectId || null); }, [activeProjectId]);

  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedScope, setSelectedScope] = useState('personal');
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  // Upload pipeline rows: { id, name, size, status, progress, memoryId, error }
  const [uploads, setUploads] = useState([]);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const fetchProjects = useCallback(async () => {
    if (!org?.id) { setProjects([]); setProjectsError(null); return; }
    setLoadingProjects(true); setProjectsError(null);
    try {
      const data = activeTeamId
        ? await apiClient.listTeamProjects(activeTeamId)
        : await apiClient.listAccessibleProjects();
      setProjects(data.projects || []);
    } catch (err) {
      setProjects([]);
      setProjectsError(err?.response?.status === 401
        ? 'Session expired — refresh the page to sign back in.'
        : (err?.response?.data?.error || err?.message || 'Failed to load projects'));
    } finally {
      setLoadingProjects(false);
    }
  }, [activeTeamId, org?.id]);

  useEffect(() => { if (scopeModalOpen) fetchProjects(); }, [scopeModalOpen, fetchProjects]);

  // Persist on every messages change (debounced via rAF to coalesce rapid bursts).
  useEffect(() => {
    const handle = requestAnimationFrame(() => savePersistedMessages(messages));
    return () => cancelAnimationFrame(handle);
  }, [messages]);

  const handleClear = useCallback(() => {
    setMessages([]);
    clearPersistedMessages();
  }, []);

  // Push-to-talk dictation — same Groq Whisper path as AI Meeting Notes.
  const dictation = useDictation((text) => {
    setInput((prev) => ((prev ? prev.replace(/\s*$/, '') + ' ' : '') + text).slice(0, MAX_CHARS));
    requestAnimationFrame(() => textareaRef.current?.focus());
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea (capped, matches mobile's 120px cap)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyUp(e) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    document.addEventListener('keyup', handleKeyUp);
    return () => document.removeEventListener('keyup', handleKeyUp);
  }, [isOpen, onClose]);

  // sendText mirrors TalkToHiveMobile.sendText exactly: SSE streaming chat call
  // with live tool-call events, scope-aware recall, optional message override
  // (used by retry/regenerate).
  const sendText = useCallback(async (overrideText) => {
    const fromInput = overrideText == null;
    const trimmed = (fromInput ? input : overrideText).trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    const streamingId = `answer-${userMsg.id}`;
    const fullHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    if (fromInput) setInput('');
    setLoading(true);

    const lang2 = (i18n.language || 'en').slice(0, 2).toLowerCase();
    const wireMessage = trimmed;

    try {
      setAgentEvents([{ id: `${Date.now()}-plan`, type: 'plan' }]);
      const chatUrl = new URL('/v1/proxy/chat', apiClient.controlPlane.defaults.baseURL).toString();
      const chatRes = await fetch(chatUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: wireMessage,
          model: selectedModel,
          history: fullHistory,
          language: lang2,
          stream: true,
          router: 'tool',
          scope: chatScopeMode,
          ...((chatScopeMode === 'project' && (chatScope || activeProjectId))
            ? { project_id: chatScope || activeProjectId, project_ids: [chatScope || activeProjectId] }
            : {}),
        }),
      });
      if (!chatRes.ok) {
        const errorData = await chatRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Chat request failed (${chatRes.status})`);
      }
      const data = (chatRes.headers.get('content-type') || '').includes('text/event-stream')
        ? (await readChatStream(chatRes, (event) => {
            if (event.type === 'answer_started') return;
            if (event.type === 'answer_delta' && event.validated === true) {
              setMessages((prev) => {
                const found = prev.some((item) => item.id === streamingId);
                return found
                  ? prev.map((item) => item.id === streamingId
                    ? { ...item, content: `${item.content || ''}${event.delta || ''}` }
                    : item)
                  : [...prev, { id: streamingId, role: 'assistant', content: event.delta || '', streaming: true }];
              });
              return;
            }
            if (event.type === 'answer_reset') {
              setMessages((prev) => prev.filter((item) => item.id !== streamingId));
              return;
            }
            setAgentEvents((prev) => [...prev, { ...event, id: `${Date.now()}-${prev.length}` }].slice(-5));
          })) || {}
        : await chatRes.json();

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || "I couldn't find relevant information in your memories.",
        sources: (data.sources || []).map(s => ({ ...s, title: s.title || (s.content || '').slice(0, 60) })),
        model: MODELS.find((m) => m.id === selectedModel)?.label || selectedModel,
        usage: data.usage || null,
        steps: Array.isArray(data.steps) ? data.steps : [],
        draft_ids: Array.isArray(data.draft_ids) ? data.draft_ids : [],
        pending_actions: Array.isArray(data.pending_actions) ? data.pending_actions : [],
        trace: data.trace || null,
        project_choice: data.project_choice || null,
        scopes_found: Array.isArray(data.scopes_found) ? data.scopes_found : [],
      };
      setMessages((prev) => prev.some((item) => item.id === streamingId)
        ? prev.map((item) => item.id === streamingId ? assistantMsg : item)
        : [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: errMsg, error: true, sources: [] },
      ]);
    } finally {
      setLoading(false);
      setAgentEvents([]);
    }
  }, [input, loading, messages, selectedModel, i18n.language, chatScope, chatScopeMode, activeProjectId]);

  const sendMessage = useCallback(() => sendText(), [sendText]);

  const continueOrchestration = useCallback(async (continuation, request, option) => {
    if (loading) return;
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: option.label }]);
    setLoading(true);
    setAgentEvents([]);
    try {
      const chatUrl = new URL('/v1/proxy/chat', apiClient.controlPlane.defaults.baseURL).toString();
      const response = await fetch(chatUrl, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: option.label, stream: true, use_tools: true,
          continuation_token: continuation.token,
          continuation_response: {
            step_index: request.step_index, option_id: option.id,
            value: option.value, values: option.values,
          },
        }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `Resume failed (${response.status})`);
      const data = (response.headers.get('content-type') || '').includes('text/event-stream')
        ? (await readChatStream(response, (event) => setAgentEvents((prev) => [...prev, { ...event, id: `${Date.now()}-${prev.length}` }].slice(-8)))) || {}
        : await response.json();
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, role: 'assistant', content: data.response || 'The orchestration resumed.',
        steps: data.steps || [], draft_ids: data.draft_ids || [], pending_actions: data.pending_actions || [],
        sources: data.sources || [], continuation: data.continuation || null,
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', error: true, content: error.message, sources: [] }]);
    } finally {
      setAgentEvents([]);
      setLoading(false);
    }
  }, [loading]);

  // Regenerate: re-run the user prompt that preceded this assistant answer.
  const retry = useCallback((assistantMsg) => {
    if (loading) return;
    const idx = messages.findIndex((m) => m.id === assistantMsg.id);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { sendText(messages[i].content); return; }
    }
  }, [loading, messages, sendText]);

  const updateUpload = useCallback((id, patch) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u))), []);
  const removeUpload = useCallback((id) =>
    setUploads((prev) => prev.filter((u) => u.id !== id)), []);

  // Optimistic upload flow — identical staging to TalkToHiveMobile: instant
  // "received" ack, soft "processing" after a beat, then "done"/"error".
  const uploadOne = useCallback(async (row) => {
    setTimeout(() => updateUpload(row.id, { status: 'processing' }), 700);
    try {
      const mime = (row.file.type || '').toLowerCase();
      const isImage = /^image\/(png|jpe?g|webp|gif)$/.test(mime);
      let result;
      if (isImage) {
        result = await apiClient.uploadImage(row.file, {
          ...(selectedScope === 'project' && selectedProject ? { projectId: selectedProject } : {}),
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            updateUpload(row.id, { progress: Math.round((evt.loaded / evt.total) * 100) });
          },
        });
      } else {
        const uploadOpts = selectedScope === 'project' && selectedProject
          ? { targetScope: 'organization', containerTag: `project:${selectedProject}` }
          : selectedScope === 'organization'
            ? { targetScope: 'organization' }
            : { targetScope: 'personal' };
        result = await apiClient.uploadDocument(row.file, {
          ...uploadOpts,
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            updateUpload(row.id, { progress: Math.round((evt.loaded / evt.total) * 100) });
          },
        });
      }
      const memId = result?.memory_id || result?.id || result?.memory?.id || null;
      const previewTitle = result?.title || (isImage ? (result?.classification?.suggested_title || 'Image saved') : 'Document saved');
      updateUpload(row.id, { status: 'done', progress: 100, memoryId: memId, previewTitle, kind: result?.classification?.kind || null });
      setTimeout(() => removeUpload(row.id), 4000);
    } catch (err) {
      updateUpload(row.id, { status: 'error', error: err?.response?.data?.detail || err?.message || 'Upload failed — tap to retry' });
    }
  }, [selectedScope, selectedProject, updateUpload, removeUpload]);

  const queueFilesForUpload = useCallback((fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    setPendingFiles(files);
    setSelectedScope(org?.plan === 'enterprise' || org?.plan === 'team' ? 'project' : 'personal');
    setSelectedProject('');
    setScopeModalOpen(true);
  }, [org?.plan]);

  const handleConfirmScope = useCallback(() => {
    const files = pendingFiles;
    setScopeModalOpen(false);
    setPendingFiles([]);
    if (!files.length) return;
    const rows = files.map((f, idx) => ({
      id: `up-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file: f, name: f.name, size: f.size, status: 'received', progress: 0, error: null, memoryId: null,
    }));
    setUploads((prev) => [...prev, ...rows]);
    rows.forEach((row) => uploadOne(row));
  }, [pendingFiles, uploadOne]);

  const handleCloseScope = useCallback(() => {
    setScopeModalOpen(false);
    setPendingFiles([]);
    setSelectedProject('');
    setSelectedScope('personal');
  }, []);

  const onPickFiles = useCallback(() => fileInputRef.current?.click(), []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const projectList = (ctxProjects?.length ? ctxProjects : projects) || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Soft blurred scrim */}
          <motion.div
            key="chat-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 bg-[#1a1814]/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-out panel */}
          <motion.div
            key="chat-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 h-screen w-[440px] max-w-full z-50 flex flex-col bg-[#faf9f4] font-['Space_Grotesk']"
            style={{
              boxShadow: '-4px 0 40px rgba(0,0,0,0.14), -1px 0 0 rgba(17,125,255,0.06)',
              borderLeft: '1px solid rgba(227,224,219,0.8)',
            }}
          >
            {/* ── Left-edge blue accent line ── */}
            <div
              className="absolute top-0 left-0 w-[3px] h-full rounded-l-none pointer-events-none z-10"
              style={{
                background: 'linear-gradient(180deg, #117dff 0%, rgba(17,125,255,0.3) 60%, transparent 100%)',
                opacity: 0.6,
              }}
            />

            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#e3e0db] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1e8bff 0%, #0066e0 100%)', boxShadow: '0 2px 10px rgba(17,125,255,0.30)' }}
                >
                  <Brain size={17} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[#0a0a0a] text-[14px] font-bold leading-tight tracking-tight">Talk to HIVE</h2>
                  <div className="mt-0.5">
                    {activeProject ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#117dff]/10 border border-[#117dff]/15 text-[10px] font-semibold text-[#117dff] leading-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#117dff] opacity-70" />
                        {activeProject.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f3f1ec] border border-[#e3e0db] text-[10px] text-[#a3a3a3] font-medium leading-none">
                        org default
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {qrec.supported && (
                  <button
                    onClick={() => qrec.openConfig()}
                    disabled={qrec.active}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#c4c1bb] hover:text-[#117dff] hover:bg-[#117dff]/10 transition-colors disabled:opacity-40"
                    aria-label="Record a meeting"
                    title={qrec.active ? 'Recording — see the notch at the bottom' : 'Record a meeting → results appear in desktop → Past meetings'}
                  >
                    <Mic size={16} />
                  </button>
                )}

                {/* Language pill — identical style/behavior to mobile's floating chip */}
                <div className="relative">
                  {langMenuOpen && <div className="fixed inset-0 z-[55]" onClick={() => setLangMenuOpen(false)} />}
                  <button
                    onClick={() => { setLangMenuOpen((v) => !v); setModelMenuOpen(false); }}
                    className="relative z-[56] inline-flex items-center gap-1 h-8 px-2.5 rounded-full bg-[#faf9f4] border border-[#e3e0db] text-[11px] font-semibold text-[#3d3d3a] hover:bg-white transition-colors"
                    aria-label="Reply language"
                  >
                    <Globe size={12} className="text-[#117dff]" />
                    <span>{((i18n.language || 'en').slice(0, 2)).toUpperCase()}</span>
                    <ChevronDown size={10} className={`text-[#a3a3a3] transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {langMenuOpen && (
                    <div className="absolute top-full mt-1.5 right-0 z-[56] w-[180px] max-h-[300px] overflow-y-auto bg-white border border-[#e8e5de] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] py-1" onClick={() => setLangMenuOpen(false)}>
                      {LANG_OPTIONS.map((l) => {
                        const active = ((i18n.language || 'en').slice(0, 2)) === l.c;
                        return (
                          <button key={l.c} onClick={() => { i18n.changeLanguage(l.c); setLangMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between text-[12.5px] ${active ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'} hover:bg-[#faf9f4]`}>
                            <span>{l.n}</span>
                            <span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{l.c}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Model pill — identical style/behavior to mobile's floating chip */}
                <div className="relative">
                  {modelMenuOpen && <div className="fixed inset-0 z-[55]" onClick={() => setModelMenuOpen(false)} />}
                  <button
                    onClick={() => { setModelMenuOpen((v) => !v); setLangMenuOpen(false); }}
                    className="relative z-[56] inline-flex items-center gap-1 h-8 px-2.5 rounded-full bg-[#faf9f4] border border-[#e3e0db] text-[11px] font-semibold text-[#3d3d3a] hover:bg-white transition-colors"
                    aria-label="Model"
                  >
                    <span className="truncate max-w-[70px]">{currentModel.label.replace('GPT-OSS ', '').replace('Llama ', 'L')}</span>
                    <ChevronDown size={10} className={`text-[#a3a3a3] transition-transform ${modelMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {modelMenuOpen && (
                    <div className="absolute top-full mt-1.5 right-0 z-[56] w-[200px] bg-white border border-[#e8e5de] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] py-1" onClick={() => setModelMenuOpen(false)}>
                      {MODELS.map((m) => (
                        <button key={m.id} onClick={() => { setSelectedModel(m.id); setModelMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between text-[12.5px] ${m.id === selectedModel ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'} hover:bg-[#faf9f4]`}>
                          <span>{m.label}</span>
                          <span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{m.tag}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#c4c1bb] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
                    aria-label="Clear chat history"
                    title="Clear chat history"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#c4c1bb] hover:text-[#0a0a0a] hover:bg-[#f3f1ec] transition-colors"
                  aria-label="Close chat"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Messages ── (same structure as TalkToHiveMobile's thread) */}
            <div className="flex-1 overflow-y-auto px-4 py-5 bg-[#faf9f4]">
              <div className="flex flex-col gap-4">
                {messages.length === 0 && !loading ? (
                  <EmptyState setInput={setInput} textareaRef={textareaRef} userName={user?.name || user?.email} />
                ) : (
                  <>
                    {messages.map((m) =>
                      m.role === 'user'
                        ? <UserBubble key={m.id} content={m.content} />
                        : <AiBubble key={m.id} msg={m} onRetry={retry} onContinue={continueOrchestration} />
                    )}
                    {loading && !messages.some((item) => item.streaming) && <Thinking events={agentEvents} />}
                  </>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* ── Upload status strip — identical staging/animation to mobile ── */}
            <AnimatePresence>
              {uploads.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex-shrink-0 px-4 pt-2 overflow-hidden bg-[#faf9f4]"
                >
                  <div className="flex flex-col gap-1.5 pb-1">
                    {uploads.map((u) => {
                      const isReceived = u.status === 'received';
                      const isProcessing = u.status === 'processing';
                      const isDone = u.status === 'done';
                      const isErr = u.status === 'error';
                      return (
                        <motion.div
                          key={u.id}
                          layout
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                          className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[12px] overflow-hidden ${
                            isDone || isReceived
                              ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                              : isErr
                                ? 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
                                : 'bg-[#fafff4] border-[#d4e8c4] text-[#365314]'
                          }`}
                        >
                          {isProcessing && (
                            <motion.div
                              className="absolute inset-y-0 left-0 right-0 pointer-events-none"
                              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(17,125,255,0.06) 50%, transparent 100%)', backgroundSize: '200% 100%' }}
                              animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                            />
                          )}
                          <div className="relative flex-shrink-0">
                            {isDone || isReceived ? <CheckCircle2 size={16} className="text-[#16a34a]" />
                              : isErr ? <FileWarning size={16} className="text-[#dc2626]" />
                              : <Loader2 size={16} className="text-[#117dff] animate-spin" />}
                          </div>
                          <div className="relative min-w-0 flex-1">
                            <div className="font-semibold truncate text-[12.5px] leading-tight">{u.name}</div>
                            <div className="text-[10.5px] mt-0.5 font-mono opacity-80">{isErr ? u.error : (STAGE_LABEL[u.status] || u.status)}</div>
                          </div>
                          {isErr && (
                            <button onClick={() => uploadOne(u)} className="relative px-2 py-1 rounded-md text-[10.5px] font-semibold border border-[#fecaca] bg-white text-[#b91c1c] hover:bg-[#fef2f2] flex-shrink-0">
                              Retry
                            </button>
                          )}
                          <button onClick={() => removeUpload(u.id)} className="relative w-6 h-6 flex items-center justify-center rounded-md text-current opacity-60 hover:opacity-100 hover:bg-black/5 flex-shrink-0" aria-label="Dismiss">
                            <X size={13} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Composer — mirrors TalkToHiveMobile's floating card exactly ── */}
            <div className="flex-shrink-0 px-3 pt-2 pb-3 bg-[#faf9f4]">
              <div className="bg-white border border-[#e8e5de] rounded-[28px] shadow-[0_2px_14px_rgba(0,0,0,0.06)] px-4 pt-3 pb-2.5 focus-within:border-[#117dff]/40 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.txt,.md,.csv,.docx,.xlsx,.pptx"
                  className="hidden"
                  onChange={(e) => { queueFilesForUpload(e.target.files); e.target.value = ''; }}
                />
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={handleKeyDown}
                  placeholder="Chat with HIVE…"
                  rows={1}
                  className="w-full resize-none border-none outline-none bg-transparent text-[14px] py-0.5 placeholder:text-[#c4c1bb] max-h-[120px] leading-snug font-['Space_Grotesk']"
                />
                {/* Action row: + · scope chip · spacer · mic · black voice/send */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={onPickFiles}
                    className="w-8 h-8 rounded-full border border-[#e8e5de] text-[#3d3d3a] flex items-center justify-center flex-shrink-0 hover:bg-[#f1eee7] transition-colors"
                    title="Upload image or document"
                    aria-label="Attach files"
                  >
                    <Plus size={16} strokeWidth={2} />
                  </button>

                  {/* Scope drop-up — org-wide vs my space vs one project */}
                  <div className="relative">
                    {scopeMenuOpen && <div className="fixed inset-0 z-[55]" onClick={() => setScopeMenuOpen(false)} />}
                    <button
                      onClick={() => { setScopeMenuOpen((v) => !v); setModelMenuOpen(false); setLangMenuOpen(false); }}
                      className={`relative z-[56] inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11.5px] font-medium max-w-[130px] transition-colors ${chatScopeMode !== 'all' ? 'bg-[#117dff]/[0.08] text-[#117dff]' : 'bg-[#f1eee7] text-[#3d3d3a]'}`}
                      aria-label="Answer scope: all, org-wide, my space, or one project"
                    >
                      {chatScopeMode === 'personal' ? <Lock size={11} /> : chatScopeMode === 'project' ? <Boxes size={11} /> : chatScopeMode === 'organization' ? <Building2 size={11} /> : <Globe size={11} />}
                      <span className="truncate">{
                        chatScopeMode === 'personal' ? 'My Space'
                          : chatScopeMode === 'project' ? (projectList.find((pr) => pr.id === chatScope)?.name || 'Project')
                            : chatScopeMode === 'organization' ? 'Org-wide'
                              : 'All memory'
                      }</span>
                    </button>
                    {scopeMenuOpen && (
                      <div className="absolute bottom-full mb-2 left-0 z-[56] w-56 bg-white border border-[#e8e5de] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] p-1.5">
                        <p className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">Answer scope</p>
                        <button onClick={() => { setChatScopeMode('all'); setChatScope(null); setScopeMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${chatScopeMode === 'all' ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] hover:bg-[#faf9f4]'}`}>
                          <Globe size={12} /> <span className="flex-1">All memory</span>
                          <span className="text-[9px] text-[#a3a3a3]">everything</span>
                        </button>
                        <button onClick={() => { setChatScopeMode('organization'); setChatScope(null); setScopeMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${chatScopeMode === 'organization' ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] hover:bg-[#faf9f4]'}`}>
                          <Building2 size={12} /> Org-wide
                        </button>
                        <button onClick={() => { setChatScopeMode('personal'); setChatScope(null); setScopeMenuOpen(false); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${chatScopeMode === 'personal' ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] hover:bg-[#faf9f4]'}`}>
                          <Lock size={12} /> My Space
                        </button>
                        {projectList.map((pr) => (
                          <button key={pr.id} onClick={() => { setChatScopeMode('project'); setChatScope(pr.id); setScopeMenuOpen(false); }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${chatScopeMode === 'project' && chatScope === pr.id ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] hover:bg-[#faf9f4]'}`}>
                            <Boxes size={12} /> <span className="truncate">{pr.name}</span>
                          </button>
                        ))}
                        {projectList.length === 0 && (
                          <p className="px-2 py-1.5 text-[11px] text-[#a3a3a3]">No projects yet</p>
                        )}
                      </div>
                    )}
                  </div>

                  <span className="flex-1" />

                  {charCountBadge(input.length)}

                  {/* Push-to-talk mic */}
                  <button
                    onClick={dictation.toggle}
                    disabled={dictation.state === 'transcribing' || loading}
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-40 ${
                      dictation.state === 'recording' ? 'bg-[#ef4444] text-white animate-pulse' : 'text-[#525252] hover:bg-[#ece9e2]/60'
                    }`}
                    aria-label={dictation.state === 'recording' ? 'Stop recording' : 'Dictate'}
                    title={dictation.error || (dictation.state === 'recording' ? 'Stop & transcribe' : 'Speak')}
                  >
                    {dictation.state === 'transcribing' ? <Loader2 size={16} className="animate-spin" />
                      : dictation.state === 'recording' ? <Square size={14} />
                      : <Mic size={16} />}
                  </button>

                  <button
                    onClick={sendMessage}
                    disabled={(!input.trim() && !loading) || loading}
                    className="w-9 h-9 rounded-full bg-[#1a1a17] text-white flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform disabled:opacity-100"
                    aria-label={input.trim() ? 'Send' : 'Voice'}
                  >
                    {loading ? <Clock size={15} /> : input.trim() ? <Send size={15} /> : <AudioLines size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#c4c1bb]/80 mt-2 text-center font-mono tracking-wide">
                Enter · send &nbsp;·&nbsp; Shift+Enter · newline &nbsp;·&nbsp; Esc · close
              </p>
            </div>
          </motion.div>

          <UploadScopeModal
            open={scopeModalOpen}
            files={pendingFiles}
            org={org}
            userRole={userRole}
            projects={projects}
            loadingProjects={loadingProjects}
            projectsError={projectsError}
            onRetryProjects={fetchProjects}
            selectedScope={selectedScope}
            onScopeChange={setSelectedScope}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
            onConfirm={handleConfirmScope}
            onClose={handleCloseScope}
          />
        </>
      )}
    </AnimatePresence>
  );
}

function charCountBadge(count) {
  if (!count) return null;
  const over = count > MAX_CHARS;
  return (
    <span className={`text-[10px] font-mono tabular-nums transition-colors ${over ? 'text-[#ef4444]' : 'text-[#c4c1bb]'}`}>
      {count}/{MAX_CHARS}
    </span>
  );
}

// ─── Legacy default export (kept for any residual import) ─────────────────────

export default ChatPanel;
