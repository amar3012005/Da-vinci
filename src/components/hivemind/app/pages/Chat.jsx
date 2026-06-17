import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Send,
  ChevronDown,
  Loader2,
  FileText,
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  Trash2,
  Paperclip,
  X,
  CheckCircle2,
  Sparkles,
  Zap,
  Mic,
  Square,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import useDictation from '../shared/useDictation';
import { useTeamContext } from '../shared/team-context';
import { QRCodeSVG } from 'qrcode.react';

// ─── Persistence ──────────────────────────────────────────────────────────────
// Chat history survives browser close/reopen via localStorage. Keyed by the
// authenticated user id when available so multi-account browsers don't bleed.
// Cap at MAX_PERSIST messages to stay within the ~5MB localStorage quota.

const MAX_PERSIST = 200;

function getStorageUserId() {
  try {
    // Common auth-shape used elsewhere in da-vinci; fall back to 'anon'.
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

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', tag: 'Default', group: 'groq' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tag: 'Free', group: 'groq' },
  { id: 'gpt-oss-20b', label: 'GPT-OSS 20B', tag: 'Fast', group: 'groq' },
  { id: 'openai-custom', label: 'Custom (OpenAI)', disabled: true, group: 'custom' },
  { id: 'anthropic-custom', label: 'Custom (Anthropic)', disabled: true, group: 'custom' },
];

const MAX_CHARS = 2000;

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const messageVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: 'easeOut' } },
};

const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 28 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } },
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-5 py-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-[#117dff]/40"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Sources Collapsible ──────────────────────────────────────────────────────

function Sources({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-[#e3e0db]/70 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-[#a3a3a3] hover:text-[#525252] transition-colors group"
      >
        <FileText size={12} className="group-hover:text-[#117dff] transition-colors" />
        <span className="font-mono uppercase tracking-[0.06em]">
          {sources.length} {sources.length === 1 ? 'source' : 'sources'} used
        </span>
        <ChevronRight
          size={12}
          className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2 } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {sources.map((src, i) => {
                const trace = src.rank_trace || {};
                const chips = [];
                if (trace.is_synthesis) {
                  const label = trace.synthesis_type === 'synthesis-bridge' ? 'BRIDGE' : 'CANONICAL';
                  const conf = trace.synthesis_confidence != null ? ` ${(trace.synthesis_confidence).toFixed(2)}` : '';
                  const rev = trace.synthesis_revision && trace.synthesis_revision > 1 ? ` rev${trace.synthesis_revision}` : '';
                  chips.push({ label: `SYNTH/${label}${conf}${rev}`, color: 'bg-purple-100 text-purple-700 border-purple-200' });
                }
                if (trace.cross_cluster_boost && trace.cross_cluster_boost > 1.0) {
                  chips.push({ label: `×${trace.cross_cluster_boost.toFixed(2)} cluster`, color: 'bg-amber-100 text-amber-700 border-amber-200' });
                }
                if (src.memory_type && !trace.is_synthesis) {
                  chips.push({ label: src.memory_type, color: 'bg-blue-100 text-blue-700 border-blue-200' });
                }
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-[#faf9f4] border border-[#e3e0db]"
                  >
                    <Brain size={11} className={`mt-0.5 flex-shrink-0 ${trace.is_synthesis ? 'text-purple-600' : 'text-[#117dff]'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-[#0a0a0a] font-medium truncate leading-tight">
                        {src.title || src.content?.slice(0, 60) || `Memory ${i + 1}`}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {chips.map((c, ci) => (
                          <span
                            key={ci}
                            className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${c.color}`}
                          >
                            {c.label}
                          </span>
                        ))}
                        {src.score != null && (
                          <span className="text-[10px] text-[#a3a3a3] font-mono">
                            score {src.score.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Token Usage Display ──────────────────────────────────────────────────────

function TokenUsage({ usage }) {
  if (!usage) return null;
  const { prompt_tokens, completion_tokens } = usage;
  const total = (prompt_tokens || 0) + (completion_tokens || 0);
  if (total === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-[#a3a3a3]">
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#117dff]/40" />
        {prompt_tokens || 0} prompt
      </span>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]/40" />
        {completion_tokens || 0} completion
      </span>
      <span className="text-[#c4c1bb]">· {total} total</span>
    </div>
  );
}

// ─── Markdown-lite renderer ──────────────────────────────────────────────
// Dependency-free. Handles: code fences, pipe tables, headings, lists,
// blockquotes, inline bold / italic / code / links. Same pattern as
// TalkToHiveMobile.renderMarkdownMobile + extension renderMarkdownLite.
function inlineMd(s, keyPrefix = 'i') {
  if (!s) return null;
  const out = [];
  let rest = String(s);
  let k = 0;
  while (rest.length) {
    const patterns = [
      { re: /\*\*([^*]+)\*\*/, tag: 'b' },
      { re: /(?<!\*)\*([^*\n]+)\*(?!\*)/, tag: 'i' },
      { re: /`([^`]+)`/, tag: 'code' },
      { re: /\[([^\]]+)\]\(([^)\s]+)\)/, tag: 'a' },
    ];
    let first = null;
    for (const p of patterns) {
      const m = rest.match(p.re);
      if (m && (first === null || m.index < first.match.index)) first = { ...p, match: m };
    }
    if (!first) { out.push(rest); break; }
    if (first.match.index > 0) out.push(rest.slice(0, first.match.index));
    const v = first.match;
    if (first.tag === 'b') out.push(<strong key={`${keyPrefix}-b-${k++}`}>{v[1]}</strong>);
    else if (first.tag === 'i') out.push(<em key={`${keyPrefix}-i-${k++}`}>{v[1]}</em>);
    else if (first.tag === 'code') out.push(<code key={`${keyPrefix}-c-${k++}`} className="px-1 py-0.5 rounded bg-black/5 text-[12px] font-mono">{v[1]}</code>);
    else if (first.tag === 'a') out.push(
      <a key={`${keyPrefix}-a-${k++}`} href={v[2]} target="_blank" rel="noreferrer noopener"
         className="text-[#117dff] underline underline-offset-2 break-all">{v[1]}</a>
    );
    rest = rest.slice(v.index + v[0].length);
  }
  return out;
}
function isTableRow(line) { return /^\s*\|.*\|\s*$/.test(line); }
function isTableSep(line) { return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line); }
function parseTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}
function renderMarkdown(raw) {
  if (!raw) return null;
  const lines = String(raw).replace(/^\s+|\s+$/g, '').split(/\r?\n/);
  const blocks = [];
  let i = 0; let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      if (i < lines.length) i++;
      blocks.push(<pre key={key++} className="my-2 p-2.5 rounded-lg bg-[#0a0a0a] text-[#e5e5e5] text-[12px] font-mono leading-relaxed overflow-x-auto">{buf.join('\n')}</pre>);
      continue;
    }
    if (!trimmed) { i++; continue; }
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = parseTableRow(line); i += 2; const rows = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(parseTableRow(lines[i])); i++; }
      blocks.push(
        <div key={key++} className="my-2 -mx-1 overflow-x-auto">
          <table className="min-w-full text-[12px] border-collapse">
            <thead><tr className="bg-[#f3f1ec]">
              {header.map((h, hx) => <th key={hx} className="text-left font-semibold px-2.5 py-1.5 border border-[#e3e0db]">{inlineMd(h, `th-${hx}`)}</th>)}
            </tr></thead>
            <tbody>{rows.map((r, rx) => (
              <tr key={rx} className={rx % 2 ? 'bg-white' : 'bg-[#fafaf6]'}>
                {r.map((c, cx) => <td key={cx} className="px-2.5 py-1.5 border border-[#e3e0db] align-top">{inlineMd(c, `td-${rx}-${cx}`)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
      continue;
    }
    const h = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      const lvl = h[1].length;
      const cls = lvl === 1 ? 'text-[15px] font-bold mt-2 mb-1'
                : lvl === 2 ? 'text-[14px] font-bold mt-2 mb-1'
                : lvl === 3 ? 'text-[13px] font-semibold mt-1.5 mb-0.5'
                : 'text-[11px] font-semibold uppercase tracking-wider text-[#525252] mt-1 mb-0.5';
      blocks.push(<div key={key++} className={cls}>{inlineMd(h[2], `h-${key}`)}</div>);
      i++; continue;
    }
    if (/^\s*[*-]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[*-]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[*-]\s+/, '')); i++; }
      { const myKey = key++; blocks.push(<ul key={myKey} className="list-disc pl-5 space-y-0.5 my-1">{items.map((it, ix) => <li key={ix}>{inlineMd(it, `li-${myKey}-${ix}`)}</li>)}</ul>); }
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      { const myKey = key++; blocks.push(<ol key={myKey} className="list-decimal pl-5 space-y-0.5 my-1">{items.map((it, ix) => <li key={ix}>{inlineMd(it, `ol-${myKey}-${ix}`)}</li>)}</ol>); }
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      blocks.push(<blockquote key={key++} className="my-1.5 border-l-2 border-[#117dff]/40 pl-3 text-[#525252] italic">{inlineMd(buf.join(' '), `bq-${key}`)}</blockquote>);
      continue;
    }
    const para = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,4}\s|\s*[*-]\s+|\s*\d+\.\s+|```|>\s?)/.test(lines[i]) &&
      !(isTableRow(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) { para.push(lines[i].trim()); i++; }
    if (para.length) blocks.push(<p key={key++} className="my-1 leading-relaxed">{inlineMd(para.join(' '), `p-${key}`)}</p>);
  }
  return blocks;
}

// ─── Slack pending-action sentinel ─────────────────────────────────────────
// Server appends `<<HIVEMIND:SLACK_PENDING>>{json}` to the assistant turn so
// the next user message can be matched as confirm/cancel against the staged
// action. UI strips this before rendering but keeps it in msg.content so the
// raw value gets sent back as history on the next /api/chat call.
const SLACK_PENDING_SENTINEL = '<<HIVEMIND:SLACK_PENDING>>';

function stripSlackPending(text) {
  if (!text) return text;
  const idx = text.indexOf(SLACK_PENDING_SENTINEL);
  return idx === -1 ? text : text.slice(0, idx).trimEnd();
}

function hasSlackPending(text) {
  return typeof text === 'string' && text.includes(SLACK_PENDING_SENTINEL);
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const displayContent = isUser ? msg.content : stripSlackPending(msg.content);
  const pendingSlack = !isUser && hasSlackPending(msg.content);

  if (isUser) {
    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        className="flex justify-end"
      >
        <div className="max-w-[76%]">
          <div
            className="rounded-2xl rounded-br-sm px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words text-white shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #1e8bff 0%, #117dff 60%, #0066e0 100%)',
              boxShadow: '0 2px 8px rgba(17,125,255,0.25)',
            }}
          >
            {msg.content}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="flex justify-start"
    >
      <div className="max-w-[84%]">
        {/* HIVE label row */}
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #1e8bff 0%, #0066e0 100%)',
              boxShadow: '0 1px 4px rgba(17,125,255,0.35)',
            }}
          >
            <Brain size={12} className="text-white" />
          </div>
          <span className="text-[10px] font-semibold text-[#117dff] uppercase tracking-[0.08em] font-['Space_Grotesk']">HIVE</span>
          {msg.model && (
            <span className="text-[10px] text-[#c4c1bb] font-mono truncate">· {msg.model}</span>
          )}
        </div>
        {/* Bubble */}
        <div className="bg-white border border-[#e3e0db] rounded-2xl rounded-bl-sm px-4 py-3.5 text-[13px] leading-relaxed text-[#0a0a0a] break-words shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
          {/* Tool timeline rendered ABOVE the answer — matches chrome
              extension treatment where the agent's tool calls are visible
              before the synthesized reply. */}
          <AgentSteps steps={msg.steps} />
          {msg.error ? (
            <div className="flex items-start gap-2 text-[#dc2626]">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap">{displayContent}</span>
            </div>
          ) : (
            <div className="space-y-0.5">{renderMarkdown(displayContent)}</div>
          )}
          {pendingSlack && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-700">
              Slack action pending · reply confirm
            </div>
          )}
          {msg.project_choice && <ProjectChoiceButtons choice={msg.project_choice} />}
          <DraftCards draftIds={msg.draft_ids} />
          <Sources sources={msg.sources} />
          <TokenUsage usage={msg.usage} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Agent toolcall timeline ──────────────────────────────────────────────────
// ReAct agent emits steps[] = [{ tool, args, result_summary }] per /api/chat
// response. Render as a compact "Used N tools" pill that expands to show
// the per-step tool name + args summary + result. Mirrors the side-panel
// chrome extension treatment.
// ─── DraftCards ──────────────────────────────────────────────────────────────
// Renders pending_writes drafts created by the agent's write-intent branch.
// Polls /api/pending-writes once on mount to get current state, surfaces
// Approve / Cancel buttons. On approve → POST /:id/approve → MCP tool fires.

function DraftCards({ draftIds }) {
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(null); // draft_id while approving/cancelling

  useEffect(() => {
    if (!Array.isArray(draftIds) || draftIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const all = [];
        for (const id of draftIds) {
          const { data } = await apiClient.controlPlane.get('/v1/proxy/pending-writes?limit=10').catch(() => ({ data: null }));
          const row = (data?.drafts || []).find(d => d.id === id);
          if (row) all.push(row);
        }
        if (!cancelled) setDrafts(all);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [draftIds]);

  const act = async (id, action) => {
    setBusy(id);
    try {
      const { data } = await apiClient.controlPlane.post(`/v1/proxy/pending-writes/${id}/${action}`, {});
      setDrafts(prev => prev.map(d => d.id === id ? (data?.draft || { ...d, status: data?.status || d.status }) : d));
    } catch (err) {
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'failed', errorMsg: err?.response?.data?.error || err?.message } : d));
    } finally {
      setBusy(null);
    }
  };

  if (drafts.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {drafts.map(d => {
        const sent = d.status === 'sent';
        const cancelled = d.status === 'cancelled';
        const failed = d.status === 'failed';
        const pending = d.status === 'draft' || d.status === 'approved';
        const tone = sent
          ? 'border-emerald-200 bg-emerald-50'
          : cancelled
            ? 'border-[#e3e0db] bg-[#fafaf6] opacity-70'
            : failed
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50';
        return (
          <div key={d.id} className={`rounded-lg border ${tone} px-3 py-2 text-[12px]`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#525252]">
                {d.provider}/{d.toolName}
              </span>
              <span className={`text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                sent ? 'bg-emerald-500/15 text-emerald-700' :
                cancelled ? 'bg-[#a3a3a3]/15 text-[#525252]' :
                failed ? 'bg-red-500/15 text-red-700' :
                'bg-amber-500/15 text-amber-700'
              }`}>
                {d.status}
              </span>
            </div>
            <div className="text-[#525252] leading-snug break-words">{d.preview || JSON.stringify(d.toolArgs)}</div>
            {failed && d.errorMsg && (
              <div className="mt-1.5 text-[11px] text-red-700">Error: {d.errorMsg}</div>
            )}
            {pending && (
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  onClick={() => act(d.id, 'approve')}
                  disabled={busy === d.id}
                  className="px-3 py-1 rounded-md text-[11px] font-semibold bg-[#0a0a0a] text-white hover:bg-[#262626] disabled:opacity-50"
                >
                  {busy === d.id ? 'Sending…' : 'Approve & Send'}
                </button>
                <button
                  onClick={() => act(d.id, 'cancel')}
                  disabled={busy === d.id}
                  className="px-3 py-1 rounded-md text-[11px] font-medium border border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
            {sent && (
              <div className="mt-1 text-[11px] text-emerald-700">✓ Sent successfully.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Project picker rendered when the agent deferred a save for project choice.
// Buttons: Org-wide + each accessible project. Click → silent scoped save.
function ProjectChoiceButtons({ choice }) {
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const projects = choice?.projects || [];
  const draft = choice?.draft || null;
  if (!draft) return null;

  const save = async (label, extra) => {
    if (busy || saved) return;
    setBusy(true); setErr(null);
    try {
      await apiClient.createMemory({
        title: draft.title,
        content: draft.content,
        tags: draft.tags || [],
        memory_type: draft.memory_type || 'fact',
        ...extra,
      });
      setSaved(label);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setBusy(false); }
  };

  if (saved) {
    return <div className="mt-2 text-[11px] font-medium text-emerald-700">✓ Saved to {saved}</div>;
  }
  const btn = 'px-2.5 py-1 text-[11px] rounded-full border border-[#e3e0db] hover:border-[#117dff] hover:text-[#117dff] disabled:opacity-50 transition-colors';
  return (
    <div className="mt-2">
      <div className="text-[11px] text-[#737373] mb-1.5">Save this to:</div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => save('Org-wide', { scope: 'organization' })} disabled={busy} className={btn}>🌐 Org-wide</button>
        {projects.map((p) => (
          <button key={p.id} type="button" onClick={() => save(p.name, { project_id: p.id })} disabled={busy} className={btn}>{p.name}</button>
        ))}
      </div>
      {err && <div className="text-[10px] text-red-600 mt-1">{err}</div>}
    </div>
  );
}

function AgentSteps({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const primaryArg = (args) => {
    if (!args || typeof args !== 'object') return '';
    const keys = ['query', 'content', 'title', 'q', 'text', 'message'];
    for (const k of keys) {
      if (typeof args[k] === 'string' && args[k].trim()) return args[k];
    }
    const firstStr = Object.values(args).find(v => typeof v === 'string' && v.trim());
    return firstStr || '';
  };
  return (
    <div className="mb-2 space-y-1.5">
      {steps.map((s, i) => {
        const arg = primaryArg(s.args);
        return (
          <div
            key={i}
            className="rounded-lg border border-[#e3e0db] bg-[#fafaf6] px-2.5 py-1.5 text-[11.5px] leading-snug"
          >
            <div className="flex items-center gap-1.5">
              <span>🔧</span>
              <span className="font-mono font-semibold text-[#0a0a0a]">{s.tool || 'tool'}</span>
            </div>
            {arg && (
              <div className="mt-0.5 text-[#525252] italic truncate" title={arg}>
                "{arg.slice(0, 120)}{arg.length > 120 ? '…' : ''}"
              </div>
            )}
            {s.result_summary && (
              <div className="mt-0.5 text-[#737373] truncate" title={String(s.result_summary)}>
                → {String(s.result_summary).slice(0, 140)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

// Suggestion chips wire directly to the existing setInput setter and optionally
// focus the composer textarea via textareaRef. No new send/fetch logic.
const SUGGESTION_CHIPS = [
  { icon: Zap, label: 'What have I been working on lately?' },
  { icon: Brain, label: 'Summarize my recent decisions' },
  { icon: Sparkles, label: 'What are my key preferences?' },
  { icon: MessageSquare, label: 'Show my latest saved memories' },
];

function EmptyState({ setInput, textareaRef }) {
  const handleChip = (label) => {
    setInput(label);
    // Focus the textarea so the user can edit or immediately send
    setTimeout(() => textareaRef?.current?.focus(), 0);
  };

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center"
    >
      {/* Hero glyph with radial glow */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute w-24 h-24 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(17,125,255,0.45) 0%, transparent 70%)',
            filter: 'blur(12px)',
          }}
        />
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1e8bff 0%, #0066e0 100%)',
            boxShadow: '0 4px 20px rgba(17,125,255,0.35)',
          }}
        >
          <Brain size={28} className="text-white" />
        </div>
      </div>

      {/* Copy */}
      <div className="space-y-2">
        <p className="text-[#0a0a0a] text-[17px] font-bold font-['Space_Grotesk'] leading-tight tracking-tight">
          Talk to HIVE
        </p>
        <p className="text-[#a3a3a3] text-[13px] leading-relaxed max-w-[260px]">
          Your second brain — ask anything, get answers from your own memories.
        </p>
      </div>

      {/* Suggestion chips — each onClick wires to setInput (existing setter) */}
      <div className="w-full space-y-2">
        {SUGGESTION_CHIPS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => handleChip(label)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12.5px] text-[#525252] bg-white border border-[#e3e0db] font-['Space_Grotesk'] hover:border-[#117dff]/50 hover:text-[#117dff] hover:bg-[#117dff]/[0.03] transition-all text-left group"
          >
            <Icon size={14} className="text-[#117dff]/60 group-hover:text-[#117dff] flex-shrink-0 transition-colors" />
            <span className="truncate">{label}</span>
            <ChevronRight size={12} className="ml-auto text-[#e3e0db] group-hover:text-[#117dff]/50 flex-shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      {/* QR pairing — scan to use HIVEMIND on mobile (same memory) */}
      <div className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-[#117dff]/20 bg-gradient-to-br from-[#117dff]/[0.04] to-transparent">
        <div className="flex-1 text-left min-w-0">
          <div className="text-[12.5px] font-semibold text-[#0a0a0a] leading-tight">
            Use on your phone
          </div>
          <div className="text-[11px] text-[#a3a3a3] leading-snug mt-1">
            Scan to open Talk to HIVE on mobile — same memory, save from anywhere.
          </div>
          <div className="text-[9.5px] text-[#117dff]/70 font-mono mt-1.5 break-all">
            hivemind.davinciai.eu/hivemind/m/chat
          </div>
        </div>
        <div className="w-[88px] h-[88px] bg-white border border-[#e3e0db] rounded-lg p-1 flex items-center justify-center flex-shrink-0">
          <QRCodeSVG
            value="https://hivemind.davinciai.eu/hivemind/m/chat?from=dashboard"
            size={80}
            level="M"
            marginSize={0}
            bgColor="#ffffff"
            fgColor="#0a0a0a"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Model Selector ───────────────────────────────────────────────────────────

function ModelSelector({ selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = MODELS.find((m) => m.id === selectedId) || MODELS[0];

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const groqModels = MODELS.filter((m) => m.group === 'groq');
  const customModels = MODELS.filter((m) => m.group === 'custom');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e3e0db] bg-[#faf9f4] hover:bg-white hover:border-[#117dff]/30 transition-all text-[11.5px] text-[#525252] font-['Space_Grotesk']"
      >
        <span className="truncate max-w-[100px]">{selected.label}</span>
        {selected.tag && (
          <span className="text-[9px] font-mono uppercase tracking-wider bg-[#117dff]/10 text-[#117dff] px-1.5 py-0.5 rounded-full">
            {selected.tag}
          </span>
        )}
        <ChevronDown size={12} className={`text-[#a3a3a3] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.1 } }}
            className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[#e3e0db] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.1)] z-[60] overflow-hidden py-1"
          >
            <div className="px-3 py-1.5">
              <span className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-[0.08em]">Groq (Free)</span>
            </div>
            {groqModels.map((m) => (
              <button
                key={m.id}
                onClick={() => { onSelect(m.id); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-[12px] hover:bg-[#faf9f4] transition-colors ${
                  m.id === selectedId ? 'text-[#117dff] font-medium' : 'text-[#0a0a0a]'
                }`}
              >
                <span>{m.label}</span>
                {m.tag && (
                  <span className="text-[9px] font-mono uppercase tracking-wider bg-[#117dff]/10 text-[#117dff] px-1.5 py-0.5 rounded-full">
                    {m.tag}
                  </span>
                )}
              </button>
            ))}
            <div className="h-px bg-[#e3e0db] mx-3 my-1" />
            {customModels.map((m) => (
              <div
                key={m.id}
                className="relative group flex items-center justify-between px-3 py-2 text-[12px] text-[#c4c1bb] cursor-not-allowed"
              >
                <span>{m.label}</span>
                <span className="text-[9px] font-mono uppercase tracking-wider bg-[#f3f1ec] text-[#a3a3a3] px-1.5 py-0.5 rounded">
                  Soon
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Chat Panel (slide-out) ───────────────────────────────────────────────────

export function ChatPanel({ isOpen, onClose }) {
  // Hydrate from localStorage on mount so chat survives browser close/reopen.
  const [messages, setMessages] = useState(() => loadPersistedMessages());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-oss-120b');
  const [composerFocused, setComposerFocused] = useState(false);

  // Persist on every messages change (debounced via rAF to coalesce rapid bursts).
  useEffect(() => {
    const handle = requestAnimationFrame(() => savePersistedMessages(messages));
    return () => cancelAnimationFrame(handle);
  }, [messages]);

  const handleClear = useCallback(() => {
    setMessages([]);
    clearPersistedMessages();
  }, []);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  // Push-to-talk dictation — same Groq Whisper path as AI Meeting Notes.
  // Appends transcript to the composer; user can edit before sending.
  const dictation = useDictation((text) => {
    setInput((prev) => (prev ? prev.replace(/\s*$/, '') + ' ' : '') + text);
    requestAnimationFrame(() => textareaRef.current?.focus());
  });
  // Active upload rows — { id, name, status, progress, title, memoryId, error }
  const [uploads, setUploads] = useState([]);
  const updateUpload = useCallback((id, patch) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u))), []);
  const removeUpload = useCallback((id) =>
    setUploads((prev) => prev.filter((u) => u.id !== id)), []);
  // UI language from the navbar selector — passed to /api/chat so the
  // ReAct agent replies in the user's chosen language end-to-end.
  const { i18n } = useTranslation();
  // Active project scope from the team selector — passed to /api/chat so
  // saves/recalls auto-bind to the current project ("Ashley", "SOLVIS"...).
  const { activeProjectId, activeProject } = useTeamContext();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyUp(e) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    document.addEventListener('keyup', handleKeyUp);
    return () => document.removeEventListener('keyup', handleKeyUp);
  }, [isOpen, onClose]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    // Build history BEFORE updating state (includes all previous messages + current user msg)
    const fullHistory = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let sources = [];
      let responseContent = '';
      let usage = null;
      let steps = [];
      let draftIds = [];
      let projectChoice = null;
      let onboardingIntro = null;

      // Belt-and-braces language enforcement: when UI language is anything
      // other than English, prepend a strict directive to the outgoing
      // message so the LLM can't silently fall back to English mid-stream.
      // UI keeps the clean user text (userMsg.content); only the wire
      // payload carries the directive.
      const lang2 = (i18n.language || 'en').slice(0, 2).toLowerCase();
      const LANG_FULL = {
        en: 'English', de: 'German', es: 'Spanish', fr: 'French', it: 'Italian',
        pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', cs: 'Czech', sv: 'Swedish',
        no: 'Norwegian', fi: 'Finnish', el: 'Greek', hu: 'Hungarian', ro: 'Romanian',
        sl: 'Slovenian', ar: 'Arabic', he: 'Hebrew', tr: 'Turkish', ru: 'Russian',
        uk: 'Ukrainian', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
        ja: 'Japanese', ko: 'Korean', zh: 'Chinese', vi: 'Vietnamese', th: 'Thai',
        id: 'Indonesian', ms: 'Malay', sk: 'Slovak',
      };
      const langName = LANG_FULL[lang2] || 'English';
      const wireMessage = lang2 === 'en'
        ? trimmed
        : `[STRICT LANGUAGE: Respond ONLY in ${langName}. Even one English word fails the test.]\n\n${trimmed}`;

      try {
        const chatRes = await apiClient.controlPlane.post('/v1/proxy/chat', {
          message: wireMessage,
          model: selectedModel,
          history: fullHistory,
          language: lang2,
          ...(activeProjectId
            ? { project_id: activeProjectId, project_ids: [activeProjectId] }
            : {}),
        });
        const chatData = chatRes.data;
        responseContent = chatData.response || '';
        sources = chatData.sources || [];
        usage = chatData.usage || null;
        // ReAct agent ships the tool-call timeline as steps[]. Each entry:
        //   { tool: 'hivemind_recall', args: {...}, result_summary: '9 memories' }
        // Render below the response as a collapsible "Used N tools" strip.
        steps = Array.isArray(chatData.steps) ? chatData.steps : [];
        draftIds = Array.isArray(chatData.draft_ids) ? chatData.draft_ids : [];
        projectChoice = chatData.project_choice || null;
        onboardingIntro = chatData.onboarding?.intro || null;
      } catch (chatErr) {
        console.warn('[Chat] chat failed:', chatErr?.message);
        responseContent = "I couldn't process your request right now. Please try again.";
      }

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseContent || "I couldn't find relevant information in your memories.",
        sources: sources.map(s => ({ ...s, title: s.title || (s.content || '').slice(0, 60) })),
        model: MODELS.find((m) => m.id === selectedModel)?.label || selectedModel,
        usage: usage,
        steps,
        draft_ids: draftIds,
        project_choice: projectChoice,
      };

      // One-time greeting rides in on the first answer as `onboarding.intro`.
      // Render it as the agent's own opening bubble BEFORE the answer — it never
      // replaces the user's answer (the real reply is assistantMsg).
      const greetingMsg = onboardingIntro
        ? { id: Date.now() + 2, role: 'assistant', content: onboardingIntro, isGreeting: true }
        : null;
      setMessages((prev) => greetingMsg ? [...prev, greetingMsg, assistantMsg] : [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: errMsg,
          error: true,
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, selectedModel, messages, i18n.language, activeProjectId]);

  // Upload handler — auto-routes by MIME (image → Groq vision, doc → docling).
  const handleFiles = useCallback(async (filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const isImage = /^image\/(png|jpe?g|webp|gif)$/.test((file.type || '').toLowerCase());
      setUploads((prev) => [...prev, { id, name: file.name, isImage, status: 'uploading', progress: 0 }]);
      try {
        const opts = {
          ...(activeProjectId ? (isImage ? { projectId: activeProjectId } : { targetScope: 'project', containerTag: `project:${activeProjectId}` }) : {}),
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            updateUpload(id, { progress: Math.round((evt.loaded / evt.total) * 100) });
          },
        };
        const result = isImage
          ? await apiClient.uploadImage(file, opts)
          : await apiClient.uploadDocument(file, opts);
        const memId = result?.memory_id || result?.id || result?.memory?.id || null;
        const title = result?.title || result?.classification?.suggested_title || file.name;
        updateUpload(id, { status: 'done', progress: 100, memoryId: memId, title, kind: result?.classification?.kind || null });
        setTimeout(() => removeUpload(id), 6000);
      } catch (err) {
        updateUpload(id, { status: 'error', error: err?.response?.data?.error || err?.message || 'upload failed' });
      }
    }
  }, [activeProjectId, updateUpload, removeUpload]);

  const onPickFiles = useCallback(() => fileInputRef.current?.click(), []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const charCount = input.length;
  const overLimit = charCount > MAX_CHARS;

  // Composer ring color driven by focus + over-limit state
  const composerRing = overLimit
    ? 'border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
    : composerFocused
      ? 'border-[#117dff] shadow-[0_0_0_3px_rgba(17,125,255,0.12)]'
      : 'border-[#e3e0db] shadow-none';

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
              {/* Left: HIVE badge + title + scope */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Gradient HIVE badge */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #1e8bff 0%, #0066e0 100%)',
                    boxShadow: '0 2px 10px rgba(17,125,255,0.30)',
                  }}
                >
                  <Brain size={17} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[#0a0a0a] text-[14px] font-bold leading-tight tracking-tight">Talk to HIVE</h2>
                  {/* Scope pill */}
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

              {/* Right: model selector + actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <ModelSelector selectedId={selectedModel} onSelect={setSelectedModel} />
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

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {messages.length === 0 ? (
                <EmptyState setInput={setInput} textareaRef={textareaRef} />
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                  {loading && (
                    <motion.div
                      variants={messageVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex justify-start"
                    >
                      <div className="max-w-[84%]">
                        {/* Typing label row */}
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, #1e8bff 0%, #0066e0 100%)',
                              boxShadow: '0 1px 4px rgba(17,125,255,0.35)',
                            }}
                          >
                            <Brain size={12} className="text-white" />
                          </div>
                          <span className="text-[10px] font-semibold text-[#117dff] uppercase tracking-[0.08em]">HIVE</span>
                        </div>
                        <div className="bg-white border border-[#e3e0db] rounded-2xl rounded-bl-sm shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                          <TypingDots />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Composer ── */}
            <div className="flex-shrink-0 px-4 py-4 bg-white border-t border-[#e3e0db]">
              {/* Active upload rows — image → Groq vision pipeline; doc → docling */}
              {uploads.length > 0 && (
                <div className="mb-2.5 space-y-1.5">
                  {uploads.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11.5px] ${
                        u.status === 'done'
                          ? 'bg-[#16a34a]/[0.06] border-[#16a34a]/30 text-[#15803d]'
                          : u.status === 'error'
                          ? 'bg-[#dc2626]/[0.06] border-[#dc2626]/30 text-[#b91c1c]'
                          : 'bg-[#faf9f4] border-[#e3e0db] text-[#525252]'
                      }`}
                    >
                      {u.status === 'done' ? <CheckCircle2 size={12} className="flex-shrink-0" />
                        : u.status === 'error' ? <AlertTriangle size={12} className="flex-shrink-0" />
                        : <Loader2 size={12} className="animate-spin flex-shrink-0" />}
                      <span className="flex-1 truncate font-medium">{u.title || u.name}</span>
                      <span className="font-mono text-[10px]">
                        {u.status === 'done' ? `saved${u.kind ? ` · ${u.kind}` : ''}`
                          : u.status === 'error' ? (u.error || 'failed').slice(0, 32)
                          : `${u.progress || 0}%`}
                      </span>
                      <button
                        onClick={() => removeUpload(u.id)}
                        className="text-[#a3a3a3] hover:text-[#525252]"
                        aria-label="Dismiss"
                      ><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Floating composer card with focus glow */}
              <div
                className={`flex items-end gap-2.5 rounded-2xl border bg-[#faf9f4] px-3.5 py-3 transition-all duration-150 ${composerRing}`}
              >
                <button
                  onClick={onPickFiles}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#a3a3a3] hover:text-[#117dff] hover:bg-white border border-transparent hover:border-[#e3e0db] transition-all flex-shrink-0 mb-0.5"
                  title="Upload image or document"
                  aria-label="Upload"
                >
                  <Paperclip size={13} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.txt,.md,.csv,.docx,.xlsx,.pptx"
                  className="hidden"
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                />
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setComposerFocused(true)}
                  onBlur={() => setComposerFocused(false)}
                  placeholder="Ask HIVE anything..."
                  rows={1}
                  className="flex-1 bg-transparent resize-none outline-none text-[13px] text-[#0a0a0a] placeholder-[#c4c1bb] leading-relaxed min-h-[22px] max-h-[160px] font-['Space_Grotesk']"
                />
                <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
                  {charCount > 0 && (
                    <span
                      className={`text-[10px] font-mono tabular-nums transition-colors ${
                        overLimit ? 'text-[#ef4444]' : 'text-[#c4c1bb]'
                      }`}
                    >
                      {charCount}/{MAX_CHARS}
                    </span>
                  )}
                  {/* Push-to-talk mic — tap to record, tap to stop & transcribe */}
                  <button
                    onClick={dictation.toggle}
                    disabled={dictation.state === 'transcribing' || loading}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 ${
                      dictation.state === 'recording'
                        ? 'bg-[#ef4444] text-white animate-pulse'
                        : 'text-[#a3a3a3] hover:text-[#117dff] hover:bg-white border border-transparent hover:border-[#e3e0db]'
                    }`}
                    title={dictation.error || (dictation.state === 'recording' ? 'Stop & transcribe' : 'Speak')}
                    aria-label={dictation.state === 'recording' ? 'Stop recording' : 'Dictate'}
                  >
                    {dictation.state === 'transcribing'
                      ? <Loader2 size={13} className="animate-spin" />
                      : dictation.state === 'recording'
                        ? <Square size={12} />
                        : <Mic size={14} />}
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading || overLimit}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: (!input.trim() || loading || overLimit)
                        ? undefined
                        : 'linear-gradient(135deg, #1e8bff 0%, #0066e0 100%)',
                      backgroundColor: (!input.trim() || loading || overLimit) ? '#117dff' : undefined,
                      boxShadow: (!input.trim() || loading || overLimit) ? 'none' : '0 2px 8px rgba(17,125,255,0.35)',
                    }}
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <Send size={13} className="text-white" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#c4c1bb]/80 mt-2 text-center font-mono tracking-wide">
                Enter · send &nbsp;·&nbsp; Shift+Enter · newline &nbsp;·&nbsp; Esc · close
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Legacy default export (kept for any residual import) ─────────────────────

export default ChatPanel;
