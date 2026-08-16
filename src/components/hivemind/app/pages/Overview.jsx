import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OverviewTour, { useOverviewTour } from '../shared/OverviewTour';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowUp,
  BookOpen,
  Boxes,
  Brain,
  Building2,
  Cable,
  CheckCircle2,
  FileText,
  GitFork,
  Globe,
  HelpCircle,
  Hexagon,
  Lightbulb,
  Loader2,
  Lock,
  Moon,
  Network,
  Paperclip,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { userScopedKey } from '../shared/user-storage';
import { UserBubble, AiBubble, Thinking } from '../shared/claude-chat';
import { useApiQuery } from '../shared/hooks';
import { useTeamContext } from '../shared/team-context';
import { useAuth } from '../auth/AuthProvider';
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
      <span className="text-[#0a0a0a] text-xl font-semibold tracking-tight tabular-nums font-mono">{time}</span>
    </div>
  );
}

// ─── Inline HIVE chat ────────────────────────────────────────────
// The Overview centerpiece. Same pipeline as the Talk-to-HIVE panel
// (/v1/proxy/chat → react agent: recall + tools + draft-approval), rendered
// as a fixed-height conversation so the page itself never grows — past
// turns scroll INSIDE the thread box, the page stays put.

// Chat store is PER USER — an unkeyed slot leaked one account's conversation
// into the next account on the same device (sessionStorage survives login).
const chatStoreKey = () => userScopedKey('hm.overviewChat'); // lazy — user id resolves after auth
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
    const raw = window.sessionStorage.getItem(chatStoreKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readChatStream(response, onEvent) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  const consume = (frame) => {
    // A proxy may normalize SSE frames to CRLF. Handle either line ending so
    // terminal events are never lost before the response is rendered.
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim()).join('\n');
    if (!data) return;
    try {
      const event = JSON.parse(data);
      if (event.type === 'done' || event.type === 'error') result = event;
      else onEvent(event);
    } catch { /* ignore malformed intermediary SSE frames */ }
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

function ChatBubble({ msg, onContinue }) {
  // Claude-exact turns (shared/claude-chat): user pill right, assistant is a
  // bubbleless serif answer with reasoning pill + sources + action row.
  if (msg.role === 'user') return <div className="flex justify-end"><UserBubble content={msg.content} /></div>;
  return <div className="flex flex-col">{<AiBubble msg={msg} onContinue={onContinue} />}</div>;
}

// ─── Cognitive band — drifting stream of swarm intelligence ─────
// Three staggered marquee rows above the composer: synthesized insights
// (canonical / principle / bridge from the cognition swarm), raw memories,
// and questions derived from what the swarm extracted. Zig-zag layout:
// alternating drift directions, offset row starts, per-chip vertical nudge.
// Click an insight/memory → full cognitive memory modal. Click a question →
// it lands in the composer ready to send.

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function cleanInsightTitle(m) {
  let t = String(m.title || '');
  t = t.replace(/^(Canonical fact|Principle|Bridge|Canonical):\s*/i, '')
       .replace(/\s*\[conf=[\d.]+\]\s*$/i, '')
       .replace(/\s*\(\d+\s*(sources|memories)[^)]*\)\s*$/i, '')
       .trim();
  // Machine-y topics (doc-id:<uuid>, filename:X) read terribly — use the
  // synthesis content itself instead.
  if (!t || /^(doc-id:|filename:|[0-9a-f-]{30,})/i.test(t)) {
    t = String(m.content || '').replace(/\s+/g, ' ').trim();
  }
  return t.length > 92 ? `${t.slice(0, 89)}…` : t;
}

function entityLabel(tag) {
  return tag.replace(/^(entity:|person:|topic:)/, '').replace(/[_-]+/g, ' ').trim();
}

const CHIP_KINDS = {
  insight:   { icon: Sparkles,   chipClass: 'border-[#117dff]/30 bg-[#117dff]/[0.06] text-[#0a0a0a]', iconColor: '#117dff', label: 'Insight' },
  principle: { icon: Lightbulb,  chipClass: 'border-[#0a0a0a]/20 bg-white text-[#0a0a0a]',            iconColor: '#0a0a0a', label: 'Principle' },
  bridge:    { icon: GitFork,    chipClass: 'border-[#f59e0b]/40 bg-[#f59e0b]/[0.06] text-[#0a0a0a]', iconColor: '#b45309', label: 'Bridge' },
  memory:    { icon: Brain,      chipClass: 'border-[#e3e0db] bg-white text-[#525252]',               iconColor: '#a3a3a3', label: 'Memory' },
  question:  { icon: HelpCircle, chipClass: 'border-dashed border-[#117dff]/40 bg-white text-[#117dff]', iconColor: '#117dff', label: 'Ask' },
};

function BandChip({ item, onOpen, onAsk }) {
  const kind = CHIP_KINDS[item.kind] || CHIP_KINDS.memory;
  // Dreams (the cognitive loop's own synthesis) get the 🌙 purple brand so the
  // user can tell consolidated insight apart from raw memories at a glance.
  const Icon = item.dream ? Moon : kind.icon;
  const iconColor = item.dream ? '#8b5cf6' : kind.iconColor;
  const chipClass = item.dream
    ? 'border-[#8b5cf6]/45 bg-[#8b5cf6]/[0.07] text-[#0a0a0a]'
    : kind.chipClass;
  const hoverBorder = item.dream ? 'hover:border-[#8b5cf6]' : 'hover:border-[#117dff]';
  // Zig-zag: deterministic per-chip vertical nudge so columns never line up.
  const nudge = [-3, 2, -1, 3, 0, -2][hashStr(item.key) % 6];
  return (
    <button
      onClick={() => (item.kind === 'question' ? onAsk(item.text) : onOpen(item.memory))}
      style={{ transform: `translateY(${nudge}px)` }}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] whitespace-nowrap transition-all hover:shadow-sm ${hoverBorder} ${chipClass}`}
      title={item.kind === 'question' ? item.text : `${item.dream ? 'Dream' : kind.label} — open`}
    >
      <Icon size={11} style={{ color: iconColor }} className="flex-shrink-0" />
      <span className="max-w-[340px] truncate">{item.text}</span>
    </button>
  );
}

function CognitiveBand({ onOpen, onAsk }) {
  const { t } = useTranslation('dashboard');

  // Swarm output (everything cognition-loop wrote) + recent raw memories.
  const { data: synthData } = useApiQuery(
    () => apiClient.listMemories({ tags: 'cognition-loop', limit: 18 }).catch(() => null),
    []
  );
  const { data: recentData } = useApiQuery(
    () => apiClient.listMemories({ limit: 18 }).catch(() => null),
    []
  );

  const items = useMemo(() => {
    const synth = (Array.isArray(synthData) ? synthData : (synthData?.memories || synthData?.data || []));
    const recent = (Array.isArray(recentData) ? recentData : (recentData?.memories || recentData?.data || []));
    const out = [];
    const seen = new Set();

    // Insights: STRICTLY verified swarm output only. The tag-filtered fetch
    // can return loosely-matching rows depending on server defaults — a chip
    // must carry a real cognitive_layer_role or a synthesis:* tag to be shown
    // as swarm intelligence. No cognition artifacts → no insight chips, ever.
    for (const m of synth) {
      if (!m?.id || seen.has(m.id)) continue;
      const tags = m.tags || [];
      const role = m.cognitive_layer_role || m.cognitiveLayerRole
        || (tags.includes('synthesis:principle') ? 'principle'
          : tags.includes('synthesis:bridge') ? 'bridge'
          : tags.includes('synthesis:canonical') ? 'canonical' : null);
      if (!role || !['canonical', 'principle', 'bridge'].includes(role)) continue;
      seen.add(m.id);
      out.push({
        key: `s-${m.id}`,
        kind: role === 'principle' ? 'principle' : role === 'bridge' ? 'bridge' : 'insight',
        text: cleanInsightTitle(m),
        memory: m,
        dream: true, // cognitive-loop synthesis = a dream → 🌙 branded + prioritized
      });
    }

    const seenTitles = new Set(out.map((x) => x.text.toLowerCase()));
    for (const m of recent) {
      if (!m?.id || seen.has(m.id)) continue;
      // Skip swarm exhaust + untitled noise in the raw row.
      const tags = m.tags || [];
      if (tags.includes('internal-audit') || tags.includes('cognition-loop')) continue;
      if (m.cognitive_layer_role || m.cognitiveLayerRole) continue;
      seen.add(m.id);
      const title = String(m.title || m.content || '').replace(/\s+/g, ' ').trim();
      if (!title) continue;
      // One chip per distinct title — a 20-chunk upload must not flood the
      // band with twenty identical "pricing-calculator.html" pills.
      const tKey = title.toLowerCase();
      if (seenTitles.has(tKey)) continue;
      seenTitles.add(tKey);
      out.push({
        key: `m-${m.id}`,
        kind: 'memory',
        text: title.length > 80 ? `${title.slice(0, 77)}…` : title,
        memory: m,
      });
    }

    // Questions: derived from the entities the swarm actually extracted —
    // each one is a one-click curiosity hook for the composer.
    const entities = [];
    const seenEnt = new Set();
    for (const m of [...synth, ...recent]) {
      for (const tag of (m.tags || [])) {
        if (!/^(entity:|person:)/.test(tag)) continue;
        const label = entityLabel(tag);
        const k = label.toLowerCase();
        if (!label || label.length < 3 || label.length > 32 || seenEnt.has(k)) continue;
        seenEnt.add(k);
        entities.push(label);
      }
    }
    const Q_TEMPLATES = [
      (e) => t('overview.band.q1', 'What do we know about {{e}}?', { e }),
      (e) => t('overview.band.q2', "What's the latest on {{e}}?", { e }),
      (e) => t('overview.band.q3', 'Summarize everything about {{e}}', { e }),
    ];
    entities.slice(0, 9).forEach((e, i) => {
      out.push({ key: `q-${e}`, kind: 'question', text: Q_TEMPLATES[i % Q_TEMPLATES.length](e) });
    });

    // Synthesis questions: turn the freshest dreams into one-click "so what?"
    // hooks grounded in what the swarm just consolidated from recent activity.
    // Templated (no LLM) — cheap, and only when dreams actually exist.
    out.filter((x) => x.dream).slice(0, 4).forEach((d) => {
      const topic = d.text.length > 52 ? `${d.text.slice(0, 49)}…` : d.text;
      out.push({
        key: `qd-${d.key}`,
        kind: 'question',
        text: t('overview.band.qDream', 'Why does this matter — {{e}}?', { e: topic }),
      });
    });

    return out;
  }, [synthData, recentData, t]);

  // Zig-zag rows: deterministic shuffle per row (different salt), alternating
  // directions and speeds, offset starts — nothing lines up in columns.
  const rows = useMemo(() => {
    const hasDream = items.some((it) => it.dream);
    // When there ARE dreams, always surface them — don't gate on the 6-item
    // minimum (a couple of fresh dreams should still show). No dreams + thin
    // activity → stay hidden rather than show a near-empty belt.
    if (items.length < 6 && !hasDream) return [];
    // Dreams lead: order dreams → synthesis questions → entity questions → raw
    // memories, so the belt foregrounds consolidated insight over raw rows.
    const rank = (it) => (it.dream ? 0 : it.kind === 'question' ? 1 : 2);
    const ordered = [...items].sort((a, b) => rank(a) - rank(b));
    const r = [[], [], []];
    ordered.forEach((it, i) => r[i % 3].push(it));
    return r.map((row, i) =>
      [...row].sort((a, b) => hashStr(a.key + i) - hashStr(b.key + i))
    ).filter((row) => row.length > 0);
  }, [items]);

  if (!rows.length) return null;

  const ROW_CFG = [
    { dir: 'hmDriftL', dur: 48, offset: 0 },
    { dir: 'hmDriftR', dur: 64, offset: 28 },
    { dir: 'hmDriftL', dur: 56, offset: 12 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="hm-band relative mb-5 overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
      }}
    >
      <style>{`
        @keyframes hmDriftL { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        @keyframes hmDriftR { from { transform: translate3d(-50%,0,0); } to { transform: translate3d(0,0,0); } }
        .hm-band-track { will-change: transform; backface-visibility: hidden; }
        .hm-band-track > button { transition: box-shadow .18s ease, border-color .18s ease; }
        .hm-band-track > button:hover { box-shadow: 0 2px 10px rgba(17,125,255,0.16); }
      `}</style>
      <div className="space-y-3 py-1">
        {rows.map((row, i) => {
          const cfg = ROW_CFG[i % ROW_CFG.length];
          return (
            <div key={i} className="overflow-hidden" style={{ paddingLeft: cfg.offset }}>
              <div
                className="hm-band-track flex items-center gap-2.5 w-max"
                style={{ animation: `${cfg.dir} ${cfg.dur}s linear infinite` }}
              >
                {[...row, ...row].map((item, j) => (
                  <BandChip key={`${item.key}-${j}`} item={item} onOpen={onOpen} onAsk={onAsk} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Full cognitive memory — opened from a band chip.
function MemoryModal({ memory, onClose, t }) {
  if (!memory) return null;
  const role = memory.cognitive_layer_role || memory.cognitiveLayerRole || null;
  const roleCfg = role === 'principle' ? CHIP_KINDS.principle
    : role === 'bridge' ? CHIP_KINDS.bridge
    : role ? CHIP_KINDS.insight
    : CHIP_KINDS.memory;
  const RoleIcon = roleCfg.icon;
  const niceTags = (memory.tags || []).filter((x) => /^(entity:|person:|topic:)/.test(x)).slice(0, 10);
  const date = memory.created_at ? new Date(memory.created_at).toLocaleString() : null;
  return (
    <AnimatePresence>
      <motion.div
        key="mem-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          className="bg-white border border-[#e3e0db] rounded-2xl shadow-xl w-full max-w-lg p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${roleCfg.chipClass}`}>
                <RoleIcon size={10} style={{ color: roleCfg.iconColor }} />
                {role ? (role === 'canonical' ? t('overview.band.insight', 'Insight') : role) : t('overview.band.memory', 'Memory')}
              </span>
              {date && <span className="text-[10px] text-[#a3a3a3] font-mono">{date}</span>}
            </div>
            <button onClick={onClose} className="p-1 text-[#a3a3a3] hover:text-[#0a0a0a]" aria-label="Close"><X size={14} /></button>
          </div>
          <h3 className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mt-3 leading-snug">
            {cleanInsightTitle(memory) || memory.title || t('overview.band.memory', 'Memory')}
          </h3>
          <div className="mt-2 max-h-[45vh] overflow-y-auto text-[13px] text-[#262626] leading-relaxed whitespace-pre-wrap">
            {memory.content || ''}
          </div>
          {niceTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {niceTags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-[#f3f1ec] text-[10px] text-[#525252]">{entityLabel(tag)}</span>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
  const { user } = useAuth() || {};
  // First name for the greeting: prefer a real name, else derive from the email
  // local-part (amarsai@… → "Amar"). Title-cased, first token only.
  const firstName = useMemo(() => {
    const raw = user?.name || user?.displayName || (user?.email || '').split('@')[0] || '';
    const tok = String(raw).replace(/[._-]+/g, ' ').trim().split(' ')[0];
    return tok ? tok.charAt(0).toUpperCase() + tok.slice(1) : '';
  }, [user]);
  const [messages, setMessages] = useState(() => (typeof window === 'undefined' ? [] : loadStoredChat()));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentEvents, setAgentEvents] = useState([]);
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

  // Cognitive band interactions: question chip → composer; insight chip → modal.
  const [openMemory, setOpenMemory] = useState(null);
  const handleBandAsk = (q) => {
    setInput(q);
    inputRef?.current?.focus();
  };

  // Chat scope — org-wide or one project. Initialized from the global team
  // switcher, overridable per-conversation from the composer drop-up.
  const [chatScope, setChatScope] = useState(activeProjectId || null);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const [useTools, setUseTools] = useState(false);
  const [toolsNotice, setToolsNotice] = useState(false);
  const toggleUseTools = () => {
    setUseTools((enabled) => !enabled);
    setToolsNotice(true);
    window.setTimeout(() => setToolsNotice(false), 3500);
  };
  // Follow the global project/team switcher: when the user sets the workspace
  // scope, the chat uses it for every tool (recall + save) without the user
  // having to name the project. The composer drop-up still overrides per
  // conversation, but a fresh global selection re-syncs the chat scope.
  useEffect(() => { setChatScope(activeProjectId || null); }, [activeProjectId]);
  const scopeLabel = chatScope
    ? (projects?.find((p) => p.id === chatScope)?.name || t('overview.scope.project', 'Project'))
    : t('overview.scope.org', 'Org-wide');


  // Persist the conversation for the session so navigating away and back
  // keeps the thread (capped so storage stays small).
  useEffect(() => {
    try {
      window.sessionStorage.setItem(chatStoreKey(), JSON.stringify(messages.slice(-HISTORY_CAP)));
    } catch { /* storage blocked — chat still works in-memory */ }
  }, [messages]);

  // Keep the thread pinned to the latest turn (internal scroll only).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const sendMessage = useCallback(async (opts = {}) => {
    // opts.text / opts.projectId let a save-memory scope pick re-send the same
    // message bound to a chosen project (see the project_choice chooser below).
    const isResend = opts.text != null;
    const trimmed = (isResend ? opts.text : input).trim();
    if (!trimmed || loading) return;
    const effProjectId = opts.projectId !== undefined ? opts.projectId : chatScope;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    const streamingId = `answer-${userMsg.id}`;
    // The current turn is sent separately as `message`; history contains only
    // completed prior turns so the planner sees the grounded assistant answer
    // once instead of seeing the current request twice.
    const fullHistory = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    // On a scope re-send, don't echo a duplicate user bubble — the original is already shown.
    if (!isResend) setMessages((prev) => [...prev, userMsg]);
    if (!isResend) setInput('');
    setLoading(true);
    setAgentEvents([{ id: `${Date.now()}-plan`, type: 'plan' }]);

    // Response language follows the NAVBAR language toggle — identical
    // behavior + directive map to the Talk-to-HIVE slide panel (Chat.jsx).
    const lang2 = (i18n.language || 'en').slice(0, 2).toLowerCase();
    // Language is a first-class /chat param (backend enforces it in the answer
    // prompt). The old [STRICT LANGUAGE] prefix poisoned recall embeddings.
    const wireMessage = trimmed;

    try {
      const streamedEvents = [];
      const chatUrl = new URL('/v1/proxy/chat', apiClient.controlPlane.defaults.baseURL).toString();
      const chatRes = await fetch(chatUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        message: wireMessage,
        model: CHAT_MODEL,
        history: fullHistory,
        language: lang2,
        stream: true,
        // The V2 router selects bounded recall and authorized tools per turn.
        // The endpoint and its response contract remain unchanged.
        router: 'tool',
        use_tools: useTools,
        ...(effProjectId ? { project_id: effProjectId, project_ids: [effProjectId] } : {}),
        }),
      });
      if (!chatRes.ok) {
        const errorData = await chatRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Chat request failed (${chatRes.status})`);
      }
      const chatData = (chatRes.headers.get('content-type') || '').includes('text/event-stream')
        ? await readChatStream(chatRes, (event) => {
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
          })
        : await chatRes.json();
      if (!chatData) {
        throw new Error('The chat stream ended before a final response. Please try again.');
      }
      if (chatData.type === 'error' || chatData.error) {
        throw new Error(chatData.error || 'The chat request could not be completed. Please try again.');
      }
      const content = chatData.response
        || t('overview.chat.empty', "I couldn't find relevant information in your memories.");
      // Deferred save → render a clickable SCOPE CHOOSER (mirrors the mobile
      // Talk-to-HIVE flow) instead of asking the user to type a project name.
      // Clicking an option re-sends the same save bound to that scope.
      const pcProjects = chatData.project_choice?.projects;
      const projectChoice = (Array.isArray(pcProjects) && pcProjects.length)
        ? { projects: pcProjects, originalMessage: trimmed }
        : null;
      const completedMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content,
        sources: Array.isArray(chatData.sources) ? chatData.sources : [],
        steps: Array.isArray(chatData.steps) ? chatData.steps : [],
        gaps: Array.isArray(chatData.gaps) ? chatData.gaps : [],
        orchestration_events: streamedEvents.filter((event) => event.type === 'orchestration_step'),
        continuation: chatData.continuation || null,
        draft_ids: Array.isArray(chatData.draft_ids) ? chatData.draft_ids : [],
        pending_actions: Array.isArray(chatData.pending_actions) ? chatData.pending_actions : [],
        projectChoice,
      };
      setMessages((prev) => prev.some((item) => item.id === streamingId)
        ? prev.map((item) => item.id === streamingId ? completedMessage : item)
        : [...prev, completedMessage]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        error: true,
        content: err?.message
          || t('overview.chat.error', "I couldn't process that right now. Please try again."),
      }]);
    } finally {
      setAgentEvents([]);
      setLoading(false);
    }
  }, [input, loading, messages, chatScope, i18n.language, t, useTools]);

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
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', error: true, content: error.message }]);
    } finally { setAgentEvents([]); setLoading(false); }
  }, [loading]);

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
      className={`max-w-3xl mx-auto w-full pb-1 ${hasThread ? 'flex-1 min-h-0 flex flex-col mt-1' : 'mt-auto'}`}
    >
      {/* Hero — only while the thread is empty. Left-aligned welcome: brand
          mark, then "Welcome back, <name>". The cognitive belt + composer
          follow directly below (belt sits between welcome and chat). */}
      {!hasThread && (
        <div className="flex flex-col items-start text-left mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] flex items-center justify-center shadow-sm">
            <Hexagon size={24} className="text-white" />
          </div>
          <h1 className="text-[34px] leading-tight font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mt-5">
            {firstName
              ? t('overview.chat.welcomeBack', 'Welcome back, {{name}}', { name: firstName })
              : t('overview.chat.welcome', 'Welcome back')}
          </h1>
        </div>
      )}

      {/* Thread — stretches from just under the launch bar down to the band.
          No box, no border, no top line: it merges with the page; messages
          fade out at the top edge and scroll internally. */}
      {hasThread && (
        <div
          ref={threadRef}
          className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-3 space-y-4 mb-2 bg-[#faf9f4] rounded-xl"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent, black 28px)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 28px)',
          }}
        >
          {messages.map((m) => (
            <React.Fragment key={m.id}>
              <ChatBubble msg={m} onContinue={continueOrchestration} />
              {m.projectChoice && !loading && (
                <div className="mt-5 mb-1 flex flex-col gap-2" data-testid="save-scope-chooser">
                  <p className="text-[14px] font-semibold text-[#1a1a17]">
                    {t('overview.chat.chooseScope', 'Where should I save this?')}
                  </p>
                  <p className="text-[12.5px] leading-relaxed text-[#737373]">The memory is prepared but has not been saved. Choose its scope to finish.</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => sendMessage({ text: m.projectChoice.originalMessage, projectId: null })}
                      className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#bdb8b0] bg-transparent px-3.5 py-2 text-[12px] text-[#0a0a0a] hover:border-[#117dff] transition-colors"
                    >
                      <Lock size={13} className="text-[#a3a3a3]" />
                      {t('knowledgebase.scopePersonalLabel', 'My Space')}
                    </button>
                    {m.projectChoice.projects.map((p) => (
                      <button
                        key={p.id || p.slug}
                        type="button"
                        onClick={() => sendMessage({ text: m.projectChoice.originalMessage, projectId: p.id || p.slug })}
                        className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#bdb8b0] bg-transparent px-3.5 py-2 text-[12px] text-[#0a0a0a] hover:border-[#117dff] transition-colors"
                      >
                        <Building2 size={13} className="text-[#a3a3a3]" />
                        {p.name || p.slug || p.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
          {loading && !messages.some((item) => item.streaming) && <Thinking events={agentEvents} />}
        </div>
      )}

      {/* Cognitive swarm band — always drifting, right above the composer */}
      <CognitiveBand onOpen={setOpenMemory} onAsk={handleBandAsk} />

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

            {/* Scope drop-UP: org-wide vs one project */}
            <div className="relative">
              {scopeMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setScopeMenuOpen(false)} />}
              <button
                onClick={() => setScopeMenuOpen((v) => !v)}
                className={`relative z-40 flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium transition-colors ${
                  chatScope ? 'border-[#117dff]/40 bg-[#117dff]/[0.06] text-[#117dff]' : 'border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec]'
                }`}
                title={t('overview.scope.hint', 'Answer scope: org-wide or one project')}
              >
                {chatScope ? <Boxes size={10} /> : <Building2 size={10} />}
                <span className="max-w-[110px] truncate">{scopeLabel}</span>
              </button>
              <AnimatePresence>
                {scopeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-0 z-40 w-56 bg-white border border-[#e3e0db] rounded-xl shadow-lg p-1.5"
                  >
                    <p className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('overview.scope.title', 'Answer scope')}</p>
                    <button
                      onClick={() => { setChatScope(null); setScopeMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-left transition-colors ${!chatScope ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] hover:bg-[#faf9f4]'}`}
                    >
                      <Building2 size={12} /> {t('overview.scope.org', 'Org-wide')}
                    </button>
                    {(projects || []).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setChatScope(p.id); setScopeMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-left transition-colors ${chatScope === p.id ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] hover:bg-[#faf9f4]'}`}
                      >
                        <Boxes size={12} /> <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                    {(projects || []).length === 0 && (
                      <p className="px-2 py-1.5 text-[11px] text-[#a3a3a3]">{t('overview.scope.noProjects', 'No projects yet')}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                type="button"
                role="switch"
                aria-checked={useTools}
                onClick={toggleUseTools}
                className={`group inline-flex h-8 items-center gap-2 rounded-full border px-2.5 transition-all ${useTools ? 'border-[#117dff]/30 bg-[#117dff]/[0.08] text-[#075fca]' : 'border-[#e3e0db] bg-white text-[#525252] hover:border-[#d4d0ca] hover:bg-[#faf9f4]'}`}
                title={t('overview.chat.toolsHint', 'Allow connected apps for this message')}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${useTools ? 'bg-[#117dff] text-white' : 'bg-[#f3f1ec] text-[#737373] group-hover:text-[#0a0a0a]'}`}>
                  <Sparkles size={11} className={useTools ? 'animate-pulse' : ''} />
                </span>
                <span className="text-[10px] font-semibold tracking-tight">{t('overview.chat.tools', 'Use tools')}</span>
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

          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); try { window.sessionStorage.removeItem(chatStoreKey()); } catch { /* noop */ } }}
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

      {/* Full cognitive memory — opened from a band chip */}
      {openMemory && <MemoryModal memory={openMemory} onClose={() => setOpenMemory(null)} t={t} />}
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────────

export default function Overview() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
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

  // Status-bar stats: memories + relationships from the profile, projects
  // from the team context, members from the org roster.
  const { data: profileData } = useApiQuery(() => apiClient.getProfile(), []);
  const profile = useMemo(() => profileData?.profile || profileData || null, [profileData]);
  // Memories stat reads the SAME endpoint the Memories page paginates, so the
  // two numbers can never diverge (the profile count uses a stricter
  // user-scoped where-clause and drifts from the list view).
  const { data: memTotalData } = useApiQuery(
    () => apiClient.listMemories({ limit: 1 }).catch(() => null),
    []
  );
  // ALL-tier totals (personal + org-wide + accessible projects + teams):
  // one endpoint returns BOTH memories and relations from the same scoped
  // where-clause, so the two headline numbers can't diverge.
  const { data: allStats } = useApiQuery(
    () => apiClient.getMemoryStats().catch(() => null),
    []
  );
  const memoriesTotal = allStats?.memories ?? memTotalData?.pagination?.total ?? null;
  const relationsTotal = allStats?.relations ?? null;
  const { projects } = useTeamContext() || {};
  const { org, user } = useAuth() || {};

  // Welcome-tour personalisation. HIVEMIND's own memory-based profile (a
  // 'static'/'name' fact — the exact one Profile.jsx reads/writes) is the
  // primary source, since that is what the rest of the product addresses the
  // user by; the account they signed up with is the fallback for a genuinely
  // brand-new org where nothing has been written yet.
  const { data: nameFactData, loading: nameFactLoading } = useApiQuery(
    () => apiClient.controlPlane.get('/v1/proxy/profiles', { params: { category: 'static', key: 'name' } })
      .then((r) => r.data).catch(() => null),
    []
  );
  const nameFromProfile = nameFactData?.facts?.[0]?.value || null;
  const accountName = user?.display_name || user?.name || (user?.email ? user.email.split('@')[0] : null);
  const welcomeName = nameFromProfile || accountName || null;

  // Seed the HIVEMIND profile with the account's name the FIRST time we can
  // see it has none yet — so "the user's name" is answerable the same way
  // whether it came from onboarding or from a chat "call me X" update. Gated
  // on nameFactLoading (useApiQuery's `data` starts at null, same as an
  // errored/empty response, so loading is the only reliable "fetch settled"
  // signal). Fires once per browser (session flag mirrors the welcome-email
  // pattern above); upsertFact on the server is idempotent on
  // (user, org, category, key), so a duplicate call here is harmless, this
  // just avoids the retry noise.
  useEffect(() => {
    if (nameFactLoading || nameFromProfile || !accountName) return;
    if (typeof window === 'undefined') return;
    const FLAG = 'hm.profileNameSeeded';
    try {
      if (window.sessionStorage.getItem(FLAG)) return;
      window.sessionStorage.setItem(FLAG, '1');
    } catch {
      // sessionStorage blocked — the request below still only fires once per mount
    }
    apiClient.controlPlane
      .post('/v1/proxy/profiles', { category: 'static', key: 'name', value: accountName, confidence: 1.0 })
      .catch(() => { /* best-effort — the tour still greets from the account name this session */ });
  }, [nameFactLoading, nameFromProfile, accountName]);
  const { data: membersData } = useApiQuery(
    () => (org?.id ? apiClient.listMembers(org.id).catch(() => null) : Promise.resolve(null)),
    [org?.id]
  );
  const memberCount = useMemo(() => {
    if (!membersData) return null;
    const list = Array.isArray(membersData) ? membersData : (membersData.members || membersData.data || []);
    return Array.isArray(list) ? list.length : null;
  }, [membersData]);
  const STATS = [
    { key: 'memories',  icon: Brain,   value: memoriesTotal ?? profile?.memory_count, label: t('overview.stats.memories', 'Memories') },
    { key: 'relations', icon: GitFork, value: relationsTotal ?? profile?.relationship_count,  label: t('overview.stats.relationships', 'Relationships') },
    { key: 'projects',  icon: Boxes,   value: projects?.length,             label: t('overview.stats.projects', 'Projects') },
    { key: 'members',   icon: Users,   value: memberCount,                  label: t('overview.stats.members', 'Members') },
  ];

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
    <div className="max-w-6xl mx-auto font-['Space_Grotesk'] flex flex-col h-[calc(100vh-104px)] overflow-hidden">
      {/* First-visit guided tour */}
      <AnimatePresence>
        {tour.open && <OverviewTour onClose={tour.close} userName={welcomeName} />}
      </AnimatePresence>

      {/* Status bar — flat white card matching every other page's theme:
          badge + live clock on the left, the numbers that matter on the right. */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6 bg-white border border-[#e3e0db] rounded-[10px] px-4 py-3 flex items-center gap-4 flex-wrap"
      >
        {/* Badge */}
        <div className="w-9 h-9 rounded-xl bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
          <Hexagon size={18} className="text-white" />
        </div>

        {/* Live clock */}
        <ConsoleClock />

        {/* Re-entry into the first-run tour. Dismissing it is permanent
            (localStorage), so without this a user who skipped once could never
            see it again. Quiet by default, beside the clock. */}
        <button
          type="button"
          onClick={tour.reopen}
          title="Replay the guided tour"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#e3e0db]
            px-2.5 py-1.5 text-[11px] font-medium text-[#6b6b70] hover:text-[#0a0a0a]
            hover:border-[#c9c6c0] transition-colors"
        >
          <HelpCircle size={13} />
          Guide
        </button>

        {/* The numbers that matter */}
        <div className="ml-auto flex items-center gap-5 flex-wrap">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && <span className="h-7 w-px bg-[#eae7e1] hidden sm:block" />}
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-[#117dff]" />
                  <span className="text-[18px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] tabular-nums leading-none">
                    {s.value ?? '—'}
                  </span>
                  <span className="text-[10px] text-[#a3a3a3] uppercase tracking-wider">{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
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
