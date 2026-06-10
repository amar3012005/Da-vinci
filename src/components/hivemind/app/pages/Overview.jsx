import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OverviewTour, { useOverviewTour } from '../shared/OverviewTour';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowUp,
  BookOpen,
  Boxes,
  Building2,
  Cable,
  Globe,
  Hexagon,
  Network,
  Sparkles,
  Users,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useHealthStatus } from '../shared/hooks';
import { useTeamContext } from '../shared/team-context';

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

function OverviewChat({ inputRef }) {
  const { t, i18n } = useTranslation('dashboard');
  const { activeProjectId } = useTeamContext() || {};
  const [messages, setMessages] = useState(() => (typeof window === 'undefined' ? [] : loadStoredChat()));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const threadRef = useRef(null);

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
      className="max-w-3xl mx-auto w-full"
    >
      {/* Hero — only while the thread is empty */}
      {!hasThread && (
        <div className="flex flex-col items-center text-center mt-10 mb-8">
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
          <span className="text-[10px] text-[#a3a3a3] font-mono uppercase tracking-wider pl-1">
            {t('overview.chat.engine', 'HIVE · full recall + tools')}
          </span>
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
