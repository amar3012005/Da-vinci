/**
 * TalkToHiveMobile — full-screen mobile chat surface.
 *
 * Mirrors the desktop Chat.jsx logic (same /v1/proxy/chat call, same model
 * dropdown, same step timeline + sources rendering, same localStorage
 * persistence) but laid out for one-handed phone use:
 *   • Sticky compact header w/ back arrow, title, model chip, kebab menu
 *   • Full-height scrollable thread (safe-area insets respected)
 *   • Sticky pill composer pinned to the keyboard, virtual-viewport aware
 *   • iOS-style tap targets (min 44px), no hover-only affordances
 *   • Reuses the same HIVEMIND visual palette so the brand carries over.
 *
 * Route: /hivemind/m/chat   (auto-redirected from /hivemind/app/overview on
 * viewports <= 768px — see HiveMindApp.jsx).
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Loader2,
  Trash2,
  ChevronDown,
  Sparkles,
  Plus,
  CheckCircle2,
  FileWarning,
  X,
  Download,
  Mic,
  Square,
  Cable,
  Upload,
  FolderKanban,
  Users,
  Lock,
  AudioLines,
  Clock,
  Boxes,
  Building2,
  Globe,
} from 'lucide-react';
// Chat turn presentation lives in shared/claude-chat (one source of truth for
// mobile + desktop Overview + sidebar).
import { UserBubble, AiBubble, Thinking } from '../../shared/claude-chat';
import apiClient from '../../shared/api-client';
import MobileShell from '../MobileShell';
import SingulanceMark from '../../shared/SingulanceMark';
import useDictation from '../../shared/useDictation';
import { useTeamContext } from '../../shared/team-context';
import { MeetingNotesPromo } from '../../shared/QuickRecorderProvider';
import PwaInstall from '../../shared/PwaInstall';
import { useAuth } from '../../auth/AuthProvider';
import {
  buildToolkitSuggestions,
  composeToolkitPrompt,
  findMentionedToolkits,
  removeToolkitMentions,
  resolvePromptToolkits,
  savePendingConnectorPrompt,
  takePendingConnectorPrompt,
} from '../../shared/connector-aware-chat';

const MAX_CHARS = 2000;
const MAX_PERSIST = 200;
// Keep the recorder implementation mounted and routable, but disable its
// slide-in chat promotion until the product is ready to expose it again.
const SHOW_MEETING_NOTES_PROMO = false;

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

const MODELS = [
  { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', tag: 'Default' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tag: 'Free' },
  { id: 'gpt-oss-20b', label: 'GPT-OSS 20B', tag: 'Fast' },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  onConfirm,
  onClose,
}) {
  const { t } = useTranslation('dashboard');
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
              <h3 className="text-[#0a0a0a] text-[16px] font-semibold font-['Space_Grotesk']">{t('knowledgebase.scopeModalTitle', 'Save uploaded memories to')}</h3>
              <p className="text-[#525252] text-[12px] mt-1">{t('knowledgebase.scopeModalSubtitle', 'Choose where these files should live before upload starts.')}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#a3a3a3]">
              <X size={16} />
            </button>
          </div>
          <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-3 py-2.5 mb-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3] mb-2">{t('knowledgebase.uploadBatch', 'Upload batch')}</p>
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
            <button type="button" onClick={() => onScopeChange('personal')} className={`w-full rounded-xl border px-3 py-2.5 text-left ${selectedScope === 'personal' ? 'border-[#117dff]/30 bg-[#117dff]/8' : 'border-[#e3e0db] bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center"><Lock size={14} className="text-[#117dff]" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.scopePersonalLabel', 'My Space')}</p>
                  <p className="text-[11px] text-[#525252]">{t('knowledgebase.scopePersonalDesc', 'Private memories only visible in your personal workspace.')}</p>
                </div>
              </div>
            </button>
            <div role="button" tabIndex={canUseTeamWorkspace ? 0 : -1} aria-disabled={!canUseTeamWorkspace} onClick={() => canUseTeamWorkspace && onScopeChange('project')} className={`w-full rounded-xl border px-3 py-2.5 text-left ${selectedScope === 'project' ? 'border-[#117dff]/30 bg-[#117dff]/8' : 'border-[#e3e0db] bg-white'} ${!canUseTeamWorkspace ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center"><FolderKanban size={14} className="text-[#117dff]" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.scopeProjectLabel', 'Project')}</p>
                  <p className="text-[11px] text-[#525252]">{t('knowledgebase.scopeProjectDesc', 'Shared with the members invited to that project.')}</p>
                </div>
              </div>
              {selectedScope === 'project' && (
                <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                  {loadingProjects ? <p className="text-[11px] text-[#a3a3a3]">{t('knowledgebase.loadingProjects', 'Loading projects...')}</p>
                    : projectsError ? <div className="flex items-center justify-between gap-2"><p className="text-[11px] text-[#dc2626]">{projectsError}</p><button type="button" onClick={onRetryProjects} className="rounded-md border border-[#e3e0db] px-2 py-1 text-[10px] font-semibold text-[#525252]">{t('knowledgebase.retry', 'Retry')}</button></div>
                      : projects.length > 0 ? <select value={selectedProject} onChange={(e) => onProjectChange(e.target.value)} className="w-full rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a]"><option value="">{t('knowledgebase.pickProject', 'Select a project…')}</option>{projects.map((p) => <option key={p.id} value={p.slug}>{p.name} ({p.slug})</option>)}</select>
                        : <p className="text-[11px] text-[#a3a3a3]">{t('knowledgebase.noAccessibleProjects', "You're not a member of any project yet. Ask an org admin to invite you, or choose another scope.")}</p>}
                </div>
              )}
            </div>
            <button type="button" disabled={!canUseTeamWorkspace || !isOrgAdmin} onClick={() => canUseTeamWorkspace && isOrgAdmin && onScopeChange('organization')} className={`w-full rounded-xl border px-3 py-2.5 text-left ${selectedScope === 'organization' ? 'border-[#117dff]/30 bg-[#117dff]/8' : 'border-[#e3e0db] bg-white'} ${(!canUseTeamWorkspace || !isOrgAdmin) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center"><Users size={14} className="text-[#117dff]" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{org?.name ? t('knowledgebase.scopeOrgLabelNamed', 'Entire organization: {{name}}', { name: org.name }) : t('knowledgebase.scopeOrgLabel', 'Entire organization')}</p>
                  <p className="text-[11px] text-[#525252]">{isOrgAdmin ? t('knowledgebase.scopeOrgDesc', 'Visible to every member of the org.') : t('knowledgebase.scopeOrgDescLocked', 'Org-wide uploads are reserved for organization admins.')}</p>
                </div>
              </div>
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-[#e3e0db] px-3 py-2 text-[13px] font-semibold text-[#525252]">{t('knowledgebase.cancel', 'Cancel')}</button>
            <button type="button" onClick={onConfirm} disabled={requiresProject && !selectedProject} className="inline-flex items-center gap-2 rounded-[10px] bg-[#117dff] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"><Upload size={14} />{t('knowledgebase.uploadFiles', 'Upload files')}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Persistence (matches desktop Chat.jsx key shape) ───────────────────────

function getStorageUserId() {
  try {
    const raw = localStorage.getItem('hivemind:user') || localStorage.getItem('user') || '';
    if (!raw) return 'anon';
    if (raw.startsWith('{')) {
      const u = JSON.parse(raw);
      return u?.id || u?.user_id || u?.email || 'anon';
    }
    return raw;
  } catch { return 'anon'; }
}
const storageKey = () => `hivemind:talk-to-hive:messages:${getStorageUserId()}`;
function loadMsgs() {
  try {
    const raw = localStorage.getItem(storageKey());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveMsgs(msgs) {
  try { localStorage.setItem(storageKey(), JSON.stringify((msgs || []).slice(-MAX_PERSIST))); } catch {}
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

// SSE reader — mirrors desktop Overview.readChatStream frame-for-frame.
async function readChatStream(response, onEvent) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;
  const consume = (frame) => {
    // Control-plane proxies may use CRLF while the Core emits LF SSE frames.
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim()).join('\n');
    if (!data) return;
    try {
      const event = JSON.parse(data);
      if (event.type === 'done' || event.type === 'error') result = event;
      else onEvent(event);
    } catch { /* malformed intermediary frame */ }
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || '';
    frames.forEach(consume);
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);
  return result;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TalkToHiveMobile() {
  const { t, i18n } = useTranslation('dashboard');
  const { activeProjectId, activeTeamId, projects: ctxProjects } = useTeamContext() || {};
  const { org, user } = useAuth() || {};
  const userRole = user?.role || user?.org_role || user?.membership_role || 'member';
  const [messages, setMessages] = useState(() => loadMsgs());
  const [input, setInput] = useState('');
  // Keep the native text input lane synchronous and tiny. Connector mention
  // recognition scans a dynamic catalog and must never run in the keyboard's
  // onChange event; defer it until React has painted the typed character.
  const deferredInput = useDeferredValue(input);
  const [loading, setLoading] = useState(false);
  const [agentEvents, setAgentEvents] = useState([]); // live tool_call/tool_result stream
  const [selectedModel, setSelectedModel] = useState('gpt-oss-120b');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  // Chat scope — org-wide (null) or one project; mirrors Overview.jsx. Follows
  // the global switcher, overridable per-conversation from the composer chip.
  const [chatScope, setChatScope] = useState(activeProjectId || null);
  // Chat recall scope selector — mirrors the Memories page tiers (org+user
  // multitenant scoping): 'all' (DEFAULT — searches EVERYTHING accessible:
  // my-space + org-wide + every project the user can see), 'organization'
  // (org-tier only), 'personal' (only my private memories), or 'project' (one
  // project). Maps to the backend recall scope_filter; 'all' sends no filter.
  const [chatScopeMode, setChatScopeMode] = useState('all');
  const [useTools, setUseTools] = useState(false);
  const [toolkits, setToolkits] = useState([]);
  const [selectedToolkits, setSelectedToolkits] = useState([]);
  const [connectToolkit, setConnectToolkit] = useState(null);
  const [connectingToolkit, setConnectingToolkit] = useState(false);
  const [connectorError, setConnectorError] = useState('');
  const [toolsNotice, setToolsNotice] = useState(false);
  const toggleUseTools = () => {
    setUseTools((enabled) => !enabled);
    setToolsNotice(true);
    window.setTimeout(() => setToolsNotice(false), 3500);
  };
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  useEffect(() => { setChatScope(activeProjectId || null); }, [activeProjectId]);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedScope, setSelectedScope] = useState('personal');
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  // Upload pipeline state — one row per file.
  // status: 'queued' | 'uploading' | 'extracting' | 'making' | 'saving' | 'done' | 'error'
  const [uploads, setUploads] = useState([]);
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const toolkitCatalogPromiseRef = useRef(null);

  const loadToolkitCatalog = useCallback(async () => {
    if (toolkitCatalogPromiseRef.current) return toolkitCatalogPromiseRef.current;
    toolkitCatalogPromiseRef.current = apiClient.listComposioToolkits({ catalog: true, limit: 100 })
      .then((data) => {
        const catalog = data.toolkits || [];
        setToolkits(catalog);
        return catalog;
      })
      .catch(() => [])
      .finally(() => { toolkitCatalogPromiseRef.current = null; });
    return toolkitCatalogPromiseRef.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadToolkitCatalog().then((catalog) => {
      if (cancelled) return;
      const pending = takePendingConnectorPrompt();
      if (pending?.prompt) {
        const mentioned = findMentionedToolkits(pending.prompt, catalog);
        setInput(removeToolkitMentions(pending.prompt.replace(/^Use\s+/i, ''), mentioned).replace(/^\.\s*/, '').slice(0, MAX_CHARS));
        setSelectedToolkits(mentioned);
        setUseTools(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      try {
        const url = new URL(window.location.href);
        ['composio_toolkit', 'connected_account_id', 'connector_return', 'status'].forEach((key) => url.searchParams.delete(key));
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      } catch { /* malformed URL is non-fatal */ }
    });
    return () => { cancelled = true; };
  }, [loadToolkitCatalog]);

  // A user can begin typing before the cold catalog request completes. Re-run
  // mention resolution when it arrives so the chip and connection gate do not
  // depend on network timing.
  useEffect(() => {
    if (!deferredInput || !toolkits.length || deferredInput !== input) return;
    const resolved = resolvePromptToolkits(deferredInput, selectedToolkits, toolkits);
    if (resolved.length === selectedToolkits.length) return;
    const newlyMentioned = resolved.filter((toolkit) => !selectedToolkits.some((selected) => selected.slug === toolkit.slug));
    setSelectedToolkits(resolved);
    setInput((current) => removeToolkitMentions(current, newlyMentioned).slice(0, MAX_CHARS));
    setUseTools(true);
  }, [deferredInput, input, selectedToolkits, toolkits]);

  const suggestions = useMemo(() => buildToolkitSuggestions(toolkits, 4), [toolkits]);

  const absorbToolkitMentions = useCallback((nextText) => {
    setInput(nextText.slice(0, MAX_CHARS));
  }, []);

  const removeSelectedToolkit = useCallback((slug) => {
    setSelectedToolkits((current) => current.filter((toolkit) => toolkit.slug !== slug));
  }, []);

  const beginToolkitConnect = useCallback(async () => {
    if (!connectToolkit || connectingToolkit) return;
    setConnectingToolkit(true);
    setConnectorError('');
    const prompt = composeToolkitPrompt(input, selectedToolkits.length ? selectedToolkits : [connectToolkit]);
    savePendingConnectorPrompt({ prompt, toolkit: connectToolkit.slug, savedAt: Date.now() });
    try {
      if (connectToolkit.slug === 'slack') {
        const { auth_url: authUrl } = await apiClient.startConnectorOAuth('slack', '/hivemind/m/chat?connector_return=slack', { target_scope: 'personal' });
        if (!authUrl) throw new Error('No authorization URL returned');
        window.location.href = authUrl;
        return;
      }
      const callbackUrl = `${window.location.origin}/hivemind/m/chat?composio_toolkit=${encodeURIComponent(connectToolkit.slug)}`;
      const { redirect_url: redirectUrl } = await apiClient.createComposioConnectLink(connectToolkit.slug, {
        toolkitMeta: {
          composioManagedAuthSchemes: connectToolkit.composioManagedAuthSchemes,
          noAuth: connectToolkit.noAuth,
        },
        callbackUrl,
      });
      if (!redirectUrl) throw new Error('This app needs a different connection method');
      window.location.href = redirectUrl;
    } catch (err) {
      setConnectorError(err?.response?.data?.error || err?.message || `Could not connect ${connectToolkit.name}`);
      setConnectingToolkit(false);
    }
  }, [connectToolkit, connectingToolkit, input, selectedToolkits]);

  const fetchProjects = useCallback(async () => {
    if (!org?.id) {
      setProjects([]);
      setProjectsError(null);
      return;
    }
    setLoadingProjects(true);
    setProjectsError(null);
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

  // Push-to-talk dictation — same Groq Whisper path as AI Meeting Notes.
  // Appends transcript to the composer; user can edit before sending.
  const dictation = useDictation((text) => {
    setInput((prev) => {
      const next = (prev ? prev.replace(/\s*$/, '') + ' ' : '') + text;
      return next.slice(0, MAX_CHARS);
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  });

  // Persist messages.
  useEffect(() => { saveMsgs(messages); }, [messages]);

  // Scroll to bottom on new messages / thinking.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages, loading]);

  // Auto-resize textarea (capped at 5 lines so it never eats the screen).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    });
    return () => cancelAnimationFrame(frame);
  }, [input]);

  const sendText = useCallback(async (overrideText) => {
    const fromInput = overrideText == null;
    const displayText = (fromInput ? input : overrideText).trim();
    if (!displayText || loading) return;
    const catalog = toolkits.length ? toolkits : await loadToolkitCatalog();
    const activeToolkits = resolvePromptToolkits(displayText, fromInput ? selectedToolkits : [], catalog);
    const disconnected = activeToolkits.find((toolkit) => !toolkit.connected);
    if (disconnected) {
      setConnectToolkit(disconnected);
      setConnectorError('');
      return;
    }
    const trimmed = composeToolkitPrompt(displayText, activeToolkits);
    if (!trimmed) return;

    const userMsg = { id: Date.now(), role: 'user', content: composeToolkitPrompt(displayText, activeToolkits) };
    const streamingId = `answer-${userMsg.id}`;
    // `message` carries the current turn; keep history to completed prior
    // turns so follow-up tool actions see the preceding grounded answer once.
    const fullHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    if (fromInput) { setInput(''); setSelectedToolkits([]); }
    setLoading(true);

    // Belt-and-braces language enforcement (mirror Chat.jsx + extension).
    // Wraps the wire message with a strict directive when UI lang != EN so
    // the LLM can't silently drift back to English. UI history keeps the
    // clean user text; only the LLM sees the wrapped variant.
    const lang2 = (i18n.language || 'en').slice(0, 2).toLowerCase();
    // Language is a first-class /chat param (backend enforces it in the answer
    // prompt). The old [STRICT LANGUAGE] prefix poisoned recall embeddings.
    const wireMessage = trimmed;

    try {
      const streamedEvents = [];
      // Streamed like desktop Overview: SSE frames carry live tool_call /
      // tool_result events → animated activity while the answer is produced.
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
          // Keep mobile on the same grounded tool-routing path as desktop chat.
          router: 'tool',
          use_tools: useTools,
          // Recall scope from the chat selector: personal | organization (all) | project.
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
            const next = { ...event, id: `${Date.now()}-${streamedEvents.length}` };
            streamedEvents.push(next);
            setAgentEvents([...streamedEvents]);
          }))
        : await chatRes.json();
      if (!data) {
        throw new Error('The chat stream ended before a final response. Please try again.');
      }
      if (data.type === 'error' || data.error) {
        throw new Error(data.error || 'The chat request could not be completed. Please try again.');
      }
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || "I couldn't find relevant information.",
        sources: (data.sources || []).map(s => ({ ...s, title: s.title || (s.content || '').slice(0, 60) })),
        model: MODELS.find((m) => m.id === selectedModel)?.label || selectedModel,
        usage: data.usage || null,
        steps: Array.isArray(data.steps) ? data.steps : [],
        draft_ids: Array.isArray(data.draft_ids) ? data.draft_ids : [],
        pending_actions: Array.isArray(data.pending_actions) ? data.pending_actions : [],
        trace: data.trace || null,
        orchestration_events: streamedEvents.filter((event) => event.type === 'orchestration_step'),
        continuation: data.continuation || null,
        project_choice: data.project_choice || null,
        // Scope provenance — which tier(s) the answer's memories came from
        // (my-space / project:<name> / org-wide). Rendered under the answer.
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
  }, [input, loading, messages, selectedModel, i18n.language, chatScope, chatScopeMode, activeProjectId, useTools, selectedToolkits, toolkits, loadToolkitCatalog]);

  const continueOrchestration = useCallback(async (continuation, request, option) => {
    if (loading) return;
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: option.label }]);
    setLoading(true);
    const streamedEvents = [];
    setAgentEvents([]);
    try {
      const chatUrl = new URL('/v1/proxy/chat', apiClient.controlPlane.defaults.baseURL).toString();
      const response = await fetch(chatUrl, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: option.label, stream: true, use_tools: true,
          continuation_token: continuation.token,
          continuation_response: { step_index: request.step_index, option_id: option.id, value: option.value, values: option.values },
        }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `Resume failed (${response.status})`);
      const data = (await readChatStream(response, (event) => {
        const next = { ...event, id: `${Date.now()}-${streamedEvents.length}` };
        streamedEvents.push(next); setAgentEvents([...streamedEvents]);
      })) || {};
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, role: 'assistant', content: data.response || 'The orchestration resumed.',
        steps: data.steps || [], draft_ids: data.draft_ids || [], sources: data.sources || [],
        pending_actions: data.pending_actions || [],
        orchestration_events: streamedEvents.filter((event) => event.type === 'orchestration_step'),
        continuation: data.continuation || null,
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', error: true, content: error.message, sources: [] }]);
    } finally { setAgentEvents([]); setLoading(false); }
  }, [loading]);

  const send = useCallback(() => sendText(), [sendText]);

  // Regenerate: re-run the user prompt that preceded this assistant answer.
  const retry = useCallback((assistantMsg) => {
    if (loading) return;
    const idx = messages.findIndex((m) => m.id === assistantMsg.id);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { sendText(messages[i].content); return; }
    }
  }, [loading, messages, sendText]);

  // ─── Upload pipeline ──────────────────────────────────────────────────
  // Mobile chat fires-and-forgets: pick file(s) → POST each via
  // apiClient.uploadDocument (same /v1/proxy/knowledge/upload endpoint
  // KnowledgeBase.jsx uses → same canonical ingest pipeline → memories,
  // facts, edges, etc.). The status strip above the composer animates
  // through queued → uploading → extracting → making memories → saving →
  // done. The chat surface itself doesn't care — server handles
  // everything once the file lands.

  // Two-tier UX:
  //   • `received` — instant optimistic ack the moment the file is picked.
  //                  Shown as light-green ✓ "Sent to HIVE" so the user
  //                  feels the action landed without waiting for HTTP.
  //   • `processing` — background pipeline (extract → memories → save),
  //                    animates softly under the row.
  //   • `done` — confirmed by the server. Full green ✓ "Saved to memory".
  //   • `error` — flips red w/ retry hint.
  const STAGE_LABEL = {
    received: 'Sent to HIVE',
    processing: 'Processing in background',
    done: 'Saved to memory',
    error: 'Failed',
  };

  const handlePickFiles = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const queueFilesForUpload = useCallback((fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    setPendingFiles(files);
    setSelectedScope(org?.plan === 'enterprise' || org?.plan === 'team' ? 'project' : 'personal');
    setSelectedProject('');
    setScopeModalOpen(true);
  }, [org?.plan]);

  const updateUpload = (id, patch) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const removeUpload = (id) =>
    setUploads((prev) => prev.filter((u) => u.id !== id));

  const uploadOne = useCallback(async (row) => {
    // Row is already shown as "received" (optimistic ✓). After a quick
    // beat the row shifts to a soft "processing" state — server is doing
    // the real work but we don't gate the UI on it.
    setTimeout(() => updateUpload(row.id, { status: 'processing' }), 700);

    try {
      // Auto-route by MIME: image/* → Groq vision pipeline (uploadImage),
      // everything else → docling-backed /v1/proxy/knowledge/upload.
      const mime = (row.file.type || '').toLowerCase();
      const isImage = /^image\/(png|jpe?g|webp|gif)$/.test(mime);

      let result;
      if (isImage) {
        result = await apiClient.uploadImage(row.file, {
          ...(selectedScope === 'project' && selectedProject ? { projectId: selectedProject } : {}),
          ...(row.hint ? { hint: row.hint } : {}),
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            const pct = Math.round((evt.loaded / evt.total) * 100);
            updateUpload(row.id, { progress: pct });
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
            const pct = Math.round((evt.loaded / evt.total) * 100);
            updateUpload(row.id, { progress: pct });
          },
        });
      }

      const memId = result?.memory_id || result?.id || result?.memory?.id || null;
      const previewTitle = result?.title || (isImage ? (result?.classification?.suggested_title || 'Image saved') : 'Document saved');
      updateUpload(row.id, {
        status: 'done',
        progress: 100,
        memoryId: memId,
        previewTitle,
        kind: result?.classification?.kind || null,
      });
      // Auto-dismiss confirmed rows after 4s — quick, doesn't clutter chat.
      setTimeout(() => removeUpload(row.id), 4000);
    } catch (err) {
      updateUpload(row.id, {
        status: 'error',
        error: err?.response?.data?.detail || err?.message || 'Upload failed — tap to retry',
      });
    }
  }, [selectedProject, selectedScope]);

  const handleConfirmScope = useCallback(() => {
    const files = pendingFiles;
    setScopeModalOpen(false);
    setPendingFiles([]);
    if (!files.length) return;

    const rows = files.map((f, idx) => ({
      id: `up-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
      status: 'received',
      progress: 0,
      error: null,
      memoryId: null,
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

  const clearChat = () => {
    setMessages([]);
    setInput('');
    setSelectedToolkits([]);
    setAgentEvents([]);
    try { localStorage.removeItem(storageKey()); } catch {}
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  const chatDrawerActions = (
    <>
      <button onClick={clearChat} className="w-full h-11 px-3 rounded-[14px] flex items-center gap-3 text-[13.5px] font-semibold bg-[#0a0a0a] text-white mb-2">
        <Plus size={16} /> New chat
      </button>
      <button onClick={() => window.dispatchEvent(new Event('hive:install'))} className="w-full h-11 px-3 rounded-[14px] flex items-center gap-3 text-[13.5px] text-[#3d3d3a] active:bg-[#f1eee7]">
        <Download size={16} className="text-[#6b6b66]" /> Install app
      </button>
      <button onClick={clearChat} className="w-full h-11 px-3 rounded-[14px] flex items-center gap-3 text-[13.5px] text-[#dc2626] active:bg-red-50">
        <Trash2 size={16} /> Clear chat history
      </button>
    </>
  );
  return (
    <MobileShell noScroll bareHeader showBareLogo={messages.length > 0} extraDrawerActions={chatDrawerActions}>
      {/* Floating top-right cluster — language + model (drop-downs). The chosen
          model drives the /chat synthesis; language sets the reply language. */}
      <div className="absolute right-2.5 z-40 flex items-center gap-1.5"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 9px)' }}>
        <div className="relative">
          {langMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setLangMenuOpen(false)} />}
          <button
            onClick={() => { setLangMenuOpen((v) => !v); setModelMenuOpen(false); setScopeMenuOpen(false); }}
            className="relative z-40 inline-flex items-center gap-1 h-9 px-2.5 rounded-full bg-[#faf9f4]/85 backdrop-blur-sm text-[11.5px] font-semibold text-[#3d3d3a] active:bg-[#ece9e2]"
            aria-label="Reply language"
          >
            <Globe size={13} className="text-[#117dff]" />
            <span>{((i18n.language || 'en').slice(0, 2)).toUpperCase()}</span>
            <ChevronDown size={11} className="text-[#a3a3a3]" />
          </button>
          {langMenuOpen && (
            <div className="absolute top-full mt-1.5 right-0 z-40 w-[180px] max-h-[300px] overflow-y-auto bg-white border border-[#e8e5de] rounded-xl shadow-lg py-1" onClick={() => setLangMenuOpen(false)}>
              {LANG_OPTIONS.map((l) => {
                const active = ((i18n.language || 'en').slice(0, 2)) === l.c;
                return (
                  <button key={l.c} onClick={() => { i18n.changeLanguage(l.c); setLangMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] ${active ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'} active:bg-[#f3f1ec]`}>
                    <span>{l.n}</span>
                    <span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{l.c}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="relative">
          {modelMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setModelMenuOpen(false)} />}
          <button
            onClick={() => { setModelMenuOpen((v) => !v); setLangMenuOpen(false); setScopeMenuOpen(false); }}
            className="relative z-40 inline-flex items-center gap-1 h-9 px-2.5 rounded-full bg-[#faf9f4]/85 backdrop-blur-sm text-[11.5px] font-semibold text-[#3d3d3a] active:bg-[#ece9e2]"
            aria-label="Model"
          >
            <Sparkles size={12} className="text-[#117dff]" />
            <span>{currentModel.label.replace('GPT-OSS ', '').replace('Llama ', 'L')}</span>
            <ChevronDown size={11} className="text-[#a3a3a3]" />
          </button>
          {modelMenuOpen && (
            <div className="absolute top-full mt-1.5 right-0 z-40 w-[200px] bg-white border border-[#e8e5de] rounded-xl shadow-lg py-1" onClick={() => setModelMenuOpen(false)}>
              {MODELS.map((m) => (
                <button key={m.id} onClick={() => { setSelectedModel(m.id); setModelMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] ${m.id === selectedModel ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'} active:bg-[#f3f1ec]`}>
                  <span>{m.label}</span>
                  <span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{m.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* New-feature promo — top-right below the header; hides while recording */}
      {SHOW_MEETING_NOTES_PROMO && <MeetingNotesPromo mobile />}

      {/* ── Messages ───────────────────────────────── */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-col gap-4 px-4 pb-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center text-center gap-4 min-h-[46vh]">
              {/* Claude-style centered greeting: accent mark + large serif name line */}
              <SingulanceMark size={40} />
              <div className="text-[32px] leading-tight text-[#1a1a17]" style={{ fontFamily: 'Georgia, \'Times New Roman\', serif' }}>
                {(() => { const h = new Date().getHours(); const g = h < 12 ? t('overview.morning', 'Good morning') : h < 18 ? t('overview.afternoon', 'Good afternoon') : t('overview.evening', 'Good evening'); const n = (user?.name || user?.email || '').split(/[\s@]/)[0]; return n ? `${g}, ${n.charAt(0).toUpperCase()}${n.slice(1)}` : g; })()}
              </div>
              <div className="flex flex-col gap-2 mt-4 w-full">
                {(suggestions.length ? suggestions : [
                  { prompt: t('overview.examples.recent', 'What have I been working on lately?') },
                  { prompt: t('overview.examples.decisions', 'Summarize my recent decisions') },
                  { prompt: t('overview.examples.prefs', 'What are my key preferences?') },
                ]).map(({ prompt: p, toolkit }) => (
                  <button
                    key={p}
                    onClick={() => {
                      if (toolkit && !toolkit.connected) { setConnectToolkit(toolkit); setInput(p); setSelectedToolkits([toolkit]); return; }
                      setInput(toolkit ? removeToolkitMentions(p, [toolkit]) : p);
                      setSelectedToolkits(toolkit ? [toolkit] : []);
                      if (toolkit) setUseTools(true);
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    className="flex items-center gap-2 text-left px-4 py-2.5 rounded-full border border-[#ece9e2] text-[13px] text-[#525252] active:bg-[#f1eee7] bg-transparent"
                  >
                    {toolkit?.logo && <img src={toolkit.logo} alt="" className="h-4 w-4 object-contain" />}
                    <span>{p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user'
              ? <UserBubble key={m.id} content={m.content} />
              : <AiBubble key={m.id} msg={m} onRetry={retry} onContinue={continueOrchestration} />
          )}
          {loading && !messages.some((item) => item.streaming) && <Thinking events={agentEvents} />}
        </div>
      </div>

      {/* ── Upload status strip (above composer, animated) ── */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 px-3 pt-2 overflow-hidden"
          >
            <div className="flex flex-col gap-1.5">
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
                      isDone
                        ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                        : isErr
                          ? 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
                          : isProcessing
                            ? 'bg-[#fafff4] border-[#d4e8c4] text-[#365314]'
                            : 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                    }`}
                  >
                    {/* Soft shimmer while processing */}
                    {isProcessing && (
                      <motion.div
                        className="absolute inset-y-0 left-0 right-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(17,125,255,0.06) 50%, transparent 100%)',
                          backgroundSize: '200% 100%',
                        }}
                        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                    <div className="relative flex-shrink-0">
                      {isDone || isReceived ? (
                        <CheckCircle2 size={16} className={isDone ? 'text-[#16a34a]' : 'text-[#16a34a]'} />
                      ) : isErr ? (
                        <FileWarning size={16} className="text-[#dc2626]" />
                      ) : (
                        <Loader2 size={16} className="text-[#117dff] animate-spin" />
                      )}
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <div className="font-semibold truncate text-[12.5px] leading-tight">{u.name}</div>
                      <div className="text-[10.5px] mt-0.5 font-mono opacity-80">
                        {isErr ? u.error : (STAGE_LABEL[u.status] || u.status)}
                      </div>
                    </div>
                    {isErr ? (
                      <button
                        onClick={() => uploadOne(u)}
                        className="relative px-2 py-1 rounded-md text-[10.5px] font-semibold border border-[#fecaca] bg-white text-[#b91c1c] active:bg-[#fef2f2] flex-shrink-0"
                      >
                        Retry
                      </button>
                    ) : null}
                    <button
                      onClick={() => removeUpload(u.id)}
                      className="relative w-6 h-6 flex items-center justify-center rounded-md text-current opacity-60 active:opacity-100 active:bg-black/5 flex-shrink-0"
                      aria-label="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PWA install (Android one-tap / iOS Add-to-Home-Screen) ── */}
      <PwaInstall />

      {/* ── Composer ───────────────────────────────── */}
      <div className="flex-shrink-0 px-1.5 pt-2 bg-[#faf9f4]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}>
        <div className="flex justify-end px-3 pb-1.5">
          <button type="button" onClick={clearChat} className="text-[11px] font-medium text-[#737373] active:text-[#0a0a0a]">
            Clear session
          </button>
        </div>
        {/* Claude-style floating input card: text row on top, action row below */}
        <div className="bg-white border border-[#e8e5de] rounded-[28px] shadow-[0_2px_14px_rgba(0,0,0,0.06)] px-4 pt-3 pb-2.5 focus-within:border-[#d5d1c8]">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              queueFilesForUpload(e.target.files);
              // Reset so picking the same file twice still fires onChange.
              if (e.target) e.target.value = '';
            }}
            accept="*/*"
          />

          {selectedToolkits.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selectedToolkits.map((toolkit) => (
                <button key={toolkit.slug} type="button" onClick={() => removeSelectedToolkit(toolkit.slug)} className="inline-flex items-center gap-1.5 rounded-full border border-[#e3e0db] bg-[#faf9f4] px-2 py-1 text-[11px] font-semibold text-[#525252]">
                  {toolkit.logo ? <img src={toolkit.logo} alt="" className="h-3.5 w-3.5 object-contain" /> : <Cable size={12} className="text-[#117dff]" />}
                  {toolkit.name}<X size={10} className="text-[#a3a3a3]" />
                </button>
              ))}
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => absorbToolkitMentions(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={t('overview.chatWith', 'Chat with HIVE…')}
            className="w-full resize-none border-none outline-none bg-transparent text-[16px] py-0.5 placeholder:text-[#a8a49c] max-h-[120px] leading-snug"
            style={{ fontFamily: 'inherit' }}
          />
          {/* Action row: + · scope chip · spacer · mic · black voice/send */}
          <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handlePickFiles}
            className="w-9 h-9 rounded-full border border-[#e8e5de] text-[#3d3d3a] flex items-center justify-center flex-shrink-0 active:bg-[#f1eee7]"
            aria-label="Attach files"
          >
            <Plus size={18} strokeWidth={2} />
          </button>
          {/* Scope drop-UP — org-wide vs one project (Overview.jsx behavior) */}
          <div className="relative">
            {scopeMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setScopeMenuOpen(false)} />}
            <button
              onClick={() => { setScopeMenuOpen((v) => !v); setModelMenuOpen(false); setLangMenuOpen(false); }}
              className={`relative z-40 inline-flex items-center gap-1 h-9 px-3 rounded-full text-[12px] font-medium max-w-[140px] ${chatScopeMode !== 'all' ? 'bg-[#117dff]/[0.08] text-[#117dff]' : 'bg-[#f1eee7] text-[#3d3d3a]'}`}
              aria-label={t('overview.scope.hint', 'Answer scope: all, org-wide, my space, or one project')}
            >
              {chatScopeMode === 'personal' ? <Lock size={12} /> : chatScopeMode === 'project' ? <Boxes size={12} /> : chatScopeMode === 'organization' ? <Building2 size={12} /> : <Globe size={12} />}
              <span className="truncate">{
                chatScopeMode === 'personal' ? t('overview.scope.personal', 'My Space')
                  : chatScopeMode === 'project' ? (((ctxProjects?.length ? ctxProjects : projects) || []).find((pr) => pr.id === chatScope)?.name || t('overview.scope.project', 'Project'))
                    : chatScopeMode === 'organization' ? t('overview.scope.org', 'Org-wide')
                      : t('overview.scope.all', 'All memory')
              }</span>
            </button>
            {scopeMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-40 w-56 bg-white border border-[#e8e5de] rounded-xl shadow-lg p-1.5">
                <p className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('overview.scope.title', 'Answer scope')}</p>
                <button
                  onClick={() => { setChatScopeMode('all'); setChatScope(null); setScopeMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${chatScopeMode === 'all' ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] active:bg-[#faf9f4]'}`}
                >
                  <Globe size={12} /> <span className="flex-1">{t('overview.scope.all', 'All memory')}</span>
                  <span className="text-[9px] text-[#a3a3a3]">{t('overview.scope.allHint', 'everything')}</span>
                </button>
                <button
                  onClick={() => { setChatScopeMode('organization'); setChatScope(null); setScopeMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${chatScopeMode === 'organization' ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] active:bg-[#faf9f4]'}`}
                >
                  <Building2 size={12} /> {t('overview.scope.org', 'Org-wide')}
                </button>
                <button
                  onClick={() => { setChatScopeMode('personal'); setChatScope(null); setScopeMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${chatScopeMode === 'personal' ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] active:bg-[#faf9f4]'}`}
                >
                  <Lock size={12} /> {t('overview.scope.personal', 'My Space')}
                </button>
                {((ctxProjects?.length ? ctxProjects : projects) || []).map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => { setChatScopeMode('project'); setChatScope(pr.id); setScopeMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${chatScopeMode === 'project' && chatScope === pr.id ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] active:bg-[#faf9f4]'}`}
                  >
                    <Boxes size={12} /> <span className="truncate">{pr.name}</span>
                  </button>
                ))}
                {((ctxProjects?.length ? ctxProjects : projects) || []).length === 0 && (
                  <p className="px-2 py-1.5 text-[11px] text-[#a3a3a3]">{t('overview.scope.noProjects', 'No projects yet')}</p>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              role="switch"
              aria-checked={useTools}
              onClick={toggleUseTools}
              className={`group inline-flex h-9 items-center gap-2 rounded-full border px-2.5 transition-all active:scale-[0.98] ${useTools ? 'border-[#117dff]/30 bg-[#117dff]/[0.08] text-[#075fca]' : 'border-[#e3e0db] bg-white text-[#525252] active:bg-[#f3f1ec]'}`}
              title={t('overview.chat.toolsHint', 'Allow connected apps for this message')}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${useTools ? 'bg-[#117dff] text-white' : 'bg-[#f3f1ec] text-[#737373]'}`}>
                <Sparkles size={11} className={useTools ? 'animate-pulse' : ''} />
              </span>
              <span className="text-[11px] font-semibold tracking-tight">{t('overview.chat.tools', 'Use tools')}</span>
              <span className={`h-1.5 w-1.5 rounded-full transition-colors ${useTools ? 'bg-[#10b981]' : 'bg-[#d4d0ca]'}`} />
            </button>
            <AnimatePresence>
              {toolsNotice && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute bottom-full left-0 mb-2 z-40 w-64 rounded-[6px] border border-[#e3e0db] bg-white px-2.5 py-2 text-[10px] text-[#525252] shadow-sm">
                  <span className="mr-1.5 inline-flex rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-700">{t('overview.chat.toolsBeta', 'Beta version')}</span>
                  {t('overview.chat.toolsNotice', 'Allows connected apps for this message; native HIVE-MIND remains available.')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="flex-1" />
          {/* Push-to-talk mic — tap to record, tap to stop & transcribe */}
          <button
            onClick={dictation.toggle}
            disabled={dictation.state === 'transcribing' || loading}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-40 ${
              dictation.state === 'recording'
                ? 'bg-[#ef4444] text-white animate-pulse'
                : 'text-[#525252] active:bg-[#ece9e2]/60'
            }`}
            aria-label={dictation.state === 'recording' ? 'Stop recording' : 'Dictate'}
            title={dictation.error || (dictation.state === 'recording' ? 'Stop & transcribe' : 'Speak')}
          >
            {dictation.state === 'transcribing'
              ? <Loader2 size={18} className="animate-spin" />
              : dictation.state === 'recording'
                ? <Square size={16} />
                : <Mic size={18} />}
          </button>
          <button
            onClick={send}
            disabled={(!input.trim() && !loading) || loading}
            className="w-10 h-10 rounded-full bg-[#1a1a17] text-white flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform disabled:opacity-100"
            aria-label={input.trim() ? 'Send' : 'Voice'}
          >
            {loading ? <Clock size={16} /> : input.trim() ? <Send size={16} /> : <AudioLines size={17} />}
          </button>
          </div>
        </div>
      </div>

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
      <AnimatePresence>
        {connectToolkit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end bg-black/30 px-3 pb-3" onClick={() => setConnectToolkit(null)}>
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-full rounded-[22px] border border-[#e3e0db] bg-white p-4" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[10px] border border-[#e3e0db] bg-[#faf9f4]">
                  {connectToolkit.logo ? <img src={connectToolkit.logo} alt="" className="h-6 w-6 object-contain" /> : <Cable size={17} className="text-[#117dff]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Connect to {connectToolkit.name}</h3>
                  <p className="mt-0.5 text-[12px] text-[#737373]">Connect {connectToolkit.name} to use it. You’ll return here with this prompt ready to run.</p>
                </div>
              </div>
              {connectorError && <p className="mt-3 text-[12px] text-red-600">{connectorError}</p>}
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setConnectToolkit(null)} className="h-10 flex-1 rounded-[8px] border border-[#e3e0db] text-[12px] font-semibold text-[#525252]">Not now</button>
                <button type="button" onClick={beginToolkitConnect} disabled={connectingToolkit} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#117dff] text-[12px] font-semibold text-white disabled:opacity-60">
                  {connectingToolkit ? <Loader2 size={14} className="animate-spin" /> : <Cable size={14} />} Connect
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileShell>
  );
}
