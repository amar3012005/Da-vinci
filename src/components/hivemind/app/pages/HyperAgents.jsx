/**
 * HyperAgents page — Slack/WhatsApp-style Cognitive Swarm Intelligence
 * workspace on HIVEMIND.
 *
 * Two display modes, decided by whether the user has any rooms:
 *   1. First-visit / no rooms  → render the existing <DigitalEmployees>
 *      roster (no duplicate code), plus a "Create your first room"
 *      banner along the top.
 *   2. ≥1 room                  → pure WhatsApp layout:
 *         left rail (rooms list) | thread | participants rail
 *      No way back to the roster grid — cards live one click deep
 *      inside the "+ Add agent" picker.
 *
 * Streaming during live turns uses SSE; after seal, the transcript is
 * a pure DB read (no LLM, no streaming). Idempotent send button.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Sparkles, Send, Users, Hash, X, Archive,
  AlertTriangle, Loader2, Trash2, Eraser,
  Network, Shield, Crown, Lightbulb, MessageCircle, Check,
  Clock, LayoutGrid, ArrowLeft, Zap, CheckCheck,
  Swords, Gavel, Scale, Coffee, History, ClipboardCheck, ListChecks, Search,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import DigitalEmployees from './DigitalEmployees';
import { PageWalkthrough, HYPER_AGENTS_STEPS } from '../shared/Walkthrough';

// Compact relative-time for room last-used. Pure, no deps.
function relTime(ts) {
  if (!ts) return '';
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return '';
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 45) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}

/* ─── Lane → glyph + color ──────────────────────────────────────────── */

const LANE_META = {
  Strategist:   { icon: Crown,      color: '#a855f7', bg: 'rgba(168,85,247,0.10)', label: 'Strategist' },
  Builder:      { icon: Network,    color: '#117dff', bg: 'rgba(17,125,255,0.10)', label: 'Builder' },
  Skeptic:      { icon: Shield,     color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Skeptic' },
  Researcher:   { icon: Lightbulb,  color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Researcher' },
  Communicator: { icon: MessageCircle, color: '#ec4899', bg: 'rgba(236,72,153,0.10)', label: 'Communicator' },
};

const AGREEMENT_META = {
  agree:     { emoji: '👍', label: 'agree',     color: '#117dff', bg: 'rgba(17,125,255,0.08)' },
  extend:    { emoji: '➕', label: 'extend',    color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  challenge: { emoji: '⚠️', label: 'challenge', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
};

/* ─── Room formats (collaboration templates) ─────────────────────────────
 * Single source of truth for the create-room format picker. `auto` is the
 * hero/default — the orchestrator picks the best format from the first
 * question, so no-code users never need to learn the others. Each entry
 * carries an icon, a tier tag, and a one-line plain-English description.
 */
const ROOM_FORMATS = [
  { key: 'auto',          icon: Sparkles,      tier: 'Recommended', color: '#7c3aed',
    labelKey: 'hyperAgents.tmplAutoLabel',      label: 'Smart',
    descKey: 'hyperAgents.tmplAutoDesc',        desc: 'Picks the best format from your question automatically.' },
  { key: 'debate',        icon: Swords,        tier: 'Deep',        color: '#f59e0b',
    labelKey: 'hyperAgents.tmplDebateLabel',    label: 'Debate',
    descKey: 'hyperAgents.tmplDebateDesc',      desc: 'Lead → reactors → synthesis → revise loop.' },
  { key: 'decision',      icon: Gavel,         color: '#117dff',
    labelKey: 'hyperAgents.tmplDecisionLabel',  label: 'Decision',
    descKey: 'hyperAgents.tmplDecisionDesc',    desc: 'Lead commits, saves the call as memory. No debate.' },
  { key: 'swarm',         icon: Network,       tier: 'Deep',        color: '#a855f7',
    labelKey: 'hyperAgents.tmplSwarmLabel',     label: 'Swarm',
    descKey: 'hyperAgents.tmplSwarmDesc',       desc: 'R1–R5: hypotheses → cross-exam → Skeptic → vote.' },
  { key: 'brainstorm',    icon: Lightbulb,     color: '#10b981',
    labelKey: 'hyperAgents.tmplBrainstormLabel',label: 'Brainstorm',
    descKey: 'hyperAgents.tmplBrainstormDesc',  desc: 'Generative-only. Top 5–8 ideas, no early pick.' },
  { key: 'council',       icon: Scale,         color: '#a855f7',
    labelKey: 'hyperAgents.tmplCouncilLabel',   label: 'Council',
    descKey: 'hyperAgents.tmplCouncilDesc',     desc: 'Majority vote: APPROVED / CONDITIONAL / REJECTED.' },
  { key: 'lean_coffee',   icon: Coffee,        tier: 'Fast',        color: '#ec4899',
    labelKey: 'hyperAgents.tmplLeanCoffeeLabel',label: 'Lean Coffee',
    descKey: 'hyperAgents.tmplLeanCoffeeDesc',  desc: 'Rotate 2–3 sub-topics, time-boxed exploration.' },
  { key: 'retrospective', icon: History,       color: '#117dff',
    labelKey: 'hyperAgents.tmplRetroLabel',     label: 'Retrospective',
    descKey: 'hyperAgents.tmplRetroDesc',       desc: "What worked / didn't / what to change." },
  { key: 'review',        icon: ClipboardCheck,color: '#10b981',
    labelKey: 'hyperAgents.tmplReviewLabel',    label: 'Review',
    descKey: 'hyperAgents.tmplReviewDesc',      desc: 'Score per dimension: PASS / NEEDS_WORK / FAIL.' },
  { key: 'standup',       icon: ListChecks,    tier: 'Fast',        color: '#ec4899',
    labelKey: 'hyperAgents.tmplStandupLabel',   label: 'Standup',
    descKey: 'hyperAgents.tmplStandupDesc',     desc: 'Yesterday / Today / Blockers status report.' },
];

/* ─── Top-level page ─────────────────────────────────────────────────── */

export default function HyperAgents() {
  const { t } = useTranslation('dashboard');

  // Collapse the sidebar to a rail in the Hyper Agents room (more canvas for
  // the live swarm). Sidebar's ChevronRight re-opens it. Restore on leave.
  useEffect(() => {
    window.dispatchEvent(new Event('hivemind:close-sidebar'));
    return () => window.dispatchEvent(new Event('hivemind:open-sidebar'));
  }, []);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  // viewMode: 'thread' (room open) | 'roster' (back to agent grid)
  const [viewMode, setViewMode] = useState('thread');

  const fetchRooms = useCallback(async () => {
    setError(null);
    try {
      const resp = await apiClient.listHyperRooms();
      const list = resp?.rooms || [];
      setRooms(list);
      if (!activeRoomId && list.length && !list[0].archived_at) {
        setActiveRoomId(list[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [activeRoomId]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleDeleteRoom = useCallback(async (room) => {
    if (!window.confirm(t('hyperAgents.confirmDeleteRoom', 'Permanently delete #{{name}}? This removes the room and all its discussion. Cannot be undone.', { name: room.name }))) return;
    try {
      await apiClient.deleteHyperRoom(room.id);
      setRooms(prev => prev.filter(r => r.id !== room.id));
      setActiveRoomId(prev => (prev === room.id ? null : prev));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, [t]);

  const liveRooms = useMemo(() => rooms.filter(r => !r.archived_at), [rooms]);
  const archivedRooms = useMemo(() => rooms.filter(r => r.archived_at), [rooms]);

  // ── Empty state: render existing DigitalEmployees roster + CTA ─────
  if (!loading && liveRooms.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <PageWalkthrough pageKey="hyper-agents" steps={HYPER_AGENTS_STEPS} />
        <div className="mb-5 bg-gradient-to-br from-[#faf9f4] to-white border border-[#e3e0db] rounded-xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
              {t('hyperAgents.title', 'Hyper Agents — Cognitive Swarm Intelligence on HIVEMIND')}
            </h2>
            <p className="text-[12px] text-[#525252] mt-1">
              {t('hyperAgents.emptyStateDesc', 'Build a room. Your agents talk to each other under WhatsApp-style threads, debate when their roles clash, and self-evolve from your conversations over time.')}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="shrink-0 flex items-center gap-1.5 bg-[#0a0a0a] hover:bg-[#262626] text-white text-[12px] font-semibold px-3.5 py-2 rounded-lg"
          >
            <Plus size={13} /> {t('hyperAgents.newRoom', 'New room')}
          </button>
        </div>

        {/* Existing roster (no duplication) */}
        <DigitalEmployees />

        <AnimatePresence>
          {showCreate && (
            <CreateRoomModal
              onClose={() => setShowCreate(false)}
              onCreated={(room) => {
                setShowCreate(false);
                setRooms(prev => [room, ...prev]);
                setActiveRoomId(room.id);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── WhatsApp layout (post-first-room) ──────────────────────────────
  return (
    <div className="font-['Space_Grotesk'] flex h-[calc(100vh-3.5rem)] min-h-[600px] -m-6 max-w-none bg-white border-t border-[#e3e0db] overflow-hidden">
      <PageWalkthrough pageKey="hyper-agents" steps={HYPER_AGENTS_STEPS} />
      {/* Left rail: rooms */}
      <aside className="w-[240px] min-w-[240px] border-r border-[#e3e0db] bg-[#faf9f4] flex flex-col shrink-0">
        <header className="px-3 py-3 border-b border-[#e3e0db] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-violet-500" />
            <span className="text-[12px] font-semibold text-[#0a0a0a]">{t('hyperAgents.rooms', 'Rooms')}</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="text-[#525252] hover:text-[#0a0a0a]"
            title={t('hyperAgents.newRoom', 'New room')}
          >
            <Plus size={14} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto py-1">
          {liveRooms.map(r => (
            <RoomRow
              key={r.id}
              room={r}
              active={r.id === activeRoomId}
              onClick={() => { setActiveRoomId(r.id); setViewMode('thread'); }}
              onDelete={handleDeleteRoom}
            />
          ))}
          {archivedRooms.length > 0 && (
            <details className="px-2 pt-3 text-[10px] text-[#a3a3a3]">
              <summary className="cursor-pointer hover:text-[#525252] flex items-center gap-1">
                <Archive size={10} /> Archived ({archivedRooms.length})
              </summary>
              <div className="mt-1">
                {archivedRooms.map(r => (
                  <RoomRow
                    key={r.id}
                    room={r}
                    active={r.id === activeRoomId}
                    onClick={() => { setActiveRoomId(r.id); setViewMode('thread'); }}
                    onDelete={handleDeleteRoom}
                    archived
                  />
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Footer: one-tap toggle between active room and the agent roster.
            Always visible at the bottom of the rooms stack. */}
        <div className="border-t border-[#e3e0db] p-2 shrink-0">
          {viewMode === 'roster' ? (
            <button
              onClick={() => setViewMode('thread')}
              disabled={!activeRoomId}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-colors"
              title={t('hyperAgents.backToActiveRoom', 'Back to active room')}
            >
              <ArrowLeft size={13} /> {t('hyperAgents.backToRoom', 'Back to Room')}
            </button>
          ) : (
            <button
              onClick={() => setViewMode('roster')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[#525252] border border-[#e3e0db] bg-white hover:bg-[#faf9f4] hover:text-[#0a0a0a] transition-colors"
              title={t('hyperAgents.browseEditHires', 'Browse + edit your hires')}
            >
              <LayoutGrid size={13} /> {t('hyperAgents.agentRoster', 'Agent roster')}
            </button>
          )}
        </div>
      </aside>

      {/* Middle: thread or roster */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col">
        {viewMode === 'roster' ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-4 py-3 border-b border-[#e3e0db] bg-white flex items-center gap-2 sticky top-0 z-10">
              <LayoutGrid size={14} className="text-violet-500" />
              <span className="text-[13px] font-semibold text-[#0a0a0a]">{t('hyperAgents.agentRoster', 'Agent roster')}</span>
              <span className="text-[10px] text-[#a3a3a3] ml-auto">{t('hyperAgents.browseEditHires', 'Browse + edit your hires')}</span>
            </div>
            <div className="p-4">
              <DigitalEmployees />
            </div>
          </div>
        ) : activeRoomId ? (
          <RoomThread
            key={activeRoomId}
            roomId={activeRoomId}
            onBack={() => setViewMode('roster')}
            onArchived={() => { fetchRooms(); setActiveRoomId(null); }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-[12px] text-[#a3a3a3]">
            <span>{t('hyperAgents.pickRoom', 'Pick a room from the left.')}</span>
            <button
              onClick={() => setViewMode('roster')}
              className="text-[11px] text-[#117dff] hover:underline"
            >
              {t('hyperAgents.browseRoster', 'Or browse the agent roster →')}
            </button>
          </div>
        )}
      </main>

      {/* Right rail: participants is rendered inside <RoomThread/> so the
          rail is co-located with thread-only data (live participants
          from /v1/hyper-rooms/:id). When viewMode='roster' the right
          rail is hidden — DigitalEmployees fills the full width. */}

      <AnimatePresence>
        {showCreate && (
          <CreateRoomModal
            onClose={() => setShowCreate(false)}
            onCreated={(room) => {
              setShowCreate(false);
              setRooms(prev => [room, ...prev]);
              setActiveRoomId(room.id);
            }}
          />
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute top-3 right-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

/* ─── Room row in the left rail ──────────────────────────────────────── */

function RoomRow({ room, active, onClick, archived, onDelete }) {
  const { t } = useTranslation('dashboard');
  const participants = room.participants || [];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(); }}
      className={`group w-full text-left px-3 py-2 flex items-center gap-2 transition-colors cursor-pointer ${
        active ? 'bg-white border-l-2 border-violet-500' : 'hover:bg-white/60 border-l-2 border-transparent'
      } ${archived ? 'opacity-60' : ''}`}
    >
      <Hash size={11} className="text-[#a3a3a3] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-[#0a0a0a] truncate">{room.name}</div>
        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-[#a3a3a3] font-mono">
          {participants.slice(0, 4).map(p => {
            const lane = p.lane || 'Communicator';
            return (
              <span
                key={p.id}
                title={`${p.name} · ${lane}`}
                className="px-1 rounded"
                style={{ background: LANE_META[lane]?.bg, color: LANE_META[lane]?.color }}
              >
                {p.name?.[0] || '?'}
              </span>
            );
          })}
          {participants.length > 4 && (
            <span className="text-[9px] text-[#a3a3a3]">+{participants.length - 4}</span>
          )}
        </div>
      </div>
      <div className="relative shrink-0 w-9 flex items-center justify-end">
        {(() => {
          const rt = relTime(room.updated_at || room.updatedAt);
          return rt ? (
            <span
              className="absolute right-0 text-[9px] font-mono text-[#b3aea4] group-hover:opacity-0 transition-opacity flex items-center gap-0.5"
              title={t('hyperAgents.lastUsed', 'Last used {{t}} ago', { t: rt })}
            >
              <Clock size={8} /> {rt}
            </span>
          ) : null;
        })()}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(room); }}
            className="opacity-0 group-hover:opacity-100 text-[#a3a3a3] hover:text-red-500 transition-opacity p-1"
            title={t('hyperAgents.deleteRoomPermanently', 'Delete room permanently')}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Room thread (middle + right) ───────────────────────────────────── */

function RoomThread({ roomId, onArchived, onBack }) {
  const { t } = useTranslation('dashboard');
  const [room, setRoom] = useState(null);
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTurnId, setActiveTurnId] = useState(null);
  const [liveLines, setLiveLines] = useState([]);
  const [draft, setDraft] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [dmAgent, setDmAgent] = useState(null);
  const threadEndRef = useRef(null);

  // Load room + history
  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await apiClient.getHyperRoom(roomId);
      setRoom(resp.room);
      setTurns(resp.turns || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll on new content
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, liveLines]);

  // SSE subscription while a turn is live
  useEffect(() => {
    if (!activeTurnId) return;
    const url = apiClient.hyperTurnStreamUrl(roomId, activeTurnId);
    let es;
    try {
      es = new EventSource(url, { withCredentials: true });
    } catch {
      return;
    }
    const onAny = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLiveLines(prev => [...prev, { ...data, t: e.type === 'message' ? (data.t || 'line') : e.type }]);
        if (e.type === 'seal' || data.t === 'seal') {
          es.close();
          setActiveTurnId(null);
          setSubmitting(false);
          // Refetch the sealed turn for cached DB read
          load();
        }
      } catch {
        // ignore
      }
    };
    [
      'router', 'typing', 'line', 'react', 'revise', 'validate',
      'seal', 'error', 'heartbeat',
      // Phase 4 cognitive upgrades:
      'decision_required', 'decision_saved',
      // Phase 4 swarm (R1-R5):
      'round_start', 'round_end',
      'hypothesis', 'peer_review', 'chain_of_thought',
      'skeptic_challenge', 'vote', 'swarm_verdict',
      // Recursive CSI convergence (multi-cycle):
      'cycle_start', 'cycle_end', 'convergence',
      // Prod hardening events (cost cap / wall-clock deadline / role warnings):
      'cost_cap_hit', 'deadline_hit', 'warning',
    ].forEach(name => es.addEventListener(name, onAny));
    es.addEventListener('error', () => {
      // network blip — let auto-reconnect handle it
    });
    return () => {
      try { es.close(); } catch { /* ignore */ }
    };
  }, [activeTurnId, roomId, load]);

  // Reset live overlay when turn changes
  useEffect(() => {
    if (!activeTurnId) setLiveLines([]);
  }, [activeTurnId]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    const msg = draft.trim();
    if (!msg || submitting) return;
    setSubmitting(true);
    setLiveLines([]);
    try {
      const idempo = `${roomId}:${Date.now()}:${msg.length}`;
      const resp = await apiClient.postHyperTurn(roomId, {
        user_message: msg,
        idempotency_key: idempo,
      });
      setDraft('');
      // Optimistically add user turn shell
      setTurns(prev => [
        ...prev,
        { id: resp.turn_id, seq: (prev[prev.length - 1]?.seq || 0) + 1, userMessage: msg, status: 'live', lines: [] },
      ]);
      setActiveTurnId(resp.turn_id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm(t('hyperAgents.confirmArchive', 'Archive #{{name}}? Transcript distills into a memory.', { name: room?.name }))) return;
    try {
      await apiClient.archiveHyperRoom(roomId);
      onArchived?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handleClearDiscussion() {
    if (!window.confirm(t('hyperAgents.confirmClearDiscussion', 'Clear the entire discussion in #{{name}}? Every turn and all agent activity will be deleted. The room itself stays. Cannot be undone.', { name: room?.name }))) return;
    try {
      await apiClient.clearHyperRoomTurns(roomId);
      setActiveTurnId(null);
      setLiveLines([]);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handleParticipantsChange(participantIds) {
    try {
      const resp = await apiClient.updateHyperRoom(roomId, { participant_ids: participantIds });
      setRoom(prev => ({ ...prev, ...resp.room, participants: prev.participants })); // keep hydrated list
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={16} className="animate-spin text-[#a3a3a3]" />
      </div>
    );
  }
  if (!room) {
    return <div className="flex-1 flex items-center justify-center text-[12px] text-[#a3a3a3]">{t('hyperAgents.roomNotFound', 'Room not found.')}</div>;
  }

  const participants = room.participants || [];
  const archived = !!room.archivedAt;
  const participantBySlug = Object.fromEntries(participants.map(p => [p.slug, p]));

  // Total LLM usage across the room = sum of every sealed turn's cost_tokens
  // (+ the live turn's seal if present). Surfaced top-right of the navbar.
  const sealedTokens = turns.reduce((sum, trn) => {
    const seal = (trn.lines || []).find(l => l && l.t === 'seal');
    return sum + (Number(seal?.cost_tokens) || 0);
  }, 0);
  const liveSeal = liveLines.find(l => l && l.t === 'seal');
  const totalTokens = sealedTokens + (Number(liveSeal?.cost_tokens) || 0);
  const fmtTokens = totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : `${totalTokens}`;

  return (
    <div className="flex flex-1 min-w-0 min-h-0 h-full">
      <section className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Header */}
        <header className="px-4 py-3 border-b border-[#e3e0db] bg-white flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-[#525252] hover:text-[#0a0a0a] hover:bg-[#faf9f4] rounded border border-[#e3e0db] shrink-0"
                title={t('hyperAgents.exitRoom', 'Exit room — go to agent roster')}
              >
                {t('hyperAgents.outOfRoom', 'Out of Room')}
              </button>
            )}
            <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[#0a0a0a]">
              <Hash size={13} className="text-[#a3a3a3]" />
              <h2 className="text-[14px] font-semibold truncate">{room.name}</h2>
              {archived && (
                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-[#f3f1ec] text-[#525252] rounded">
                  {t('hyperAgents.archived', 'archived')}
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#a3a3a3] font-mono mt-0.5">
              {t('hyperAgents.participantsTurns', '{{pCount}} participant{{pPlural}} · {{tCount}} turn{{tPlural}}', { pCount: participants.length, pPlural: participants.length !== 1 ? 's' : '', tCount: turns.length, tPlural: turns.length !== 1 ? 's' : '' })}
            </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-mono font-semibold"
              title={t('hyperAgents.totalLlmTokens', 'Total LLM tokens used in this room')}
            >
              <Zap size={11} /> {fmtTokens} {t('hyperAgents.tok', 'tok')}
            </span>
            {turns.length > 0 && (
              <button
                onClick={handleClearDiscussion}
                className="p-1.5 text-[#a3a3a3] hover:text-red-600 rounded hover:bg-[#faf9f4]"
                title={t('hyperAgents.clearDiscussionTitle', 'Clear discussion — delete all turns + agent activity (keeps the room)')}
              >
                <Eraser size={13} />
              </button>
            )}
            {!archived && (
              <button
                onClick={handleArchive}
                className="p-1.5 text-[#a3a3a3] hover:text-red-600 rounded hover:bg-[#faf9f4]"
                title={t('hyperAgents.archiveRoomTitle', 'Archive room (distills into 1 memory)')}
              >
                <Archive size={13} />
              </button>
            )}
          </div>
        </header>

        {/* Thread */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          {turns.length === 0 && (
            <div className="text-center text-[12px] text-[#a3a3a3] py-8">
              {t('hyperAgents.startConversation', 'Start the conversation — ask your team anything.')}
            </div>
          )}
          {turns.map(turn => (
            <TurnView
              key={turn.id}
              turn={turn}
              participants={participantBySlug}
              liveLines={turn.id === activeTurnId ? liveLines : null}
            />
          ))}
          {error && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={11} className="inline mr-1" /> {error}
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Composer */}
        {!archived && (
          <form onSubmit={handleSubmit} className="border-t border-[#e3e0db] bg-[#faf9f4] px-4 py-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-white border border-[#e3e0db] rounded-xl px-3 py-2 focus-within:border-violet-500">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
                  }}
                  rows={1}
                  placeholder={t('hyperAgents.composerPlaceholder', 'Message the team…  use @slug to address one agent')}
                  disabled={submitting}
                  className="w-full bg-transparent resize-none outline-none text-[13px] text-[#0a0a0a] placeholder:text-[#a3a3a3]"
                />
              </div>
              <button
                type="submit"
                disabled={!draft.trim() || submitting}
                className="h-9 px-3 bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {t('hyperAgents.send', 'Send')}
              </button>
            </div>
            <div className="text-[9px] text-[#a3a3a3] mt-1 font-mono">{t('hyperAgents.composerHint', 'Enter to send · Shift+Enter newline · @slug to force lead')}</div>
          </form>
        )}
      </section>

      {/* Right rail: participants */}
      <aside className="w-[260px] min-w-[260px] border-l border-[#e3e0db] bg-[#faf9f4] flex flex-col shrink-0">
        <header className="px-3 py-3 border-b border-[#e3e0db] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-[#525252]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">{t('hyperAgents.participants', 'Participants')}</span>
          </div>
          {!archived && (
            <button
              onClick={() => setShowPicker(true)}
              className="text-[#525252] hover:text-[#0a0a0a]"
              title={t('hyperAgents.addAgent', 'Add agent')}
            >
              <Plus size={13} />
            </button>
          )}
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {participants.map(p => (
            <ParticipantChip
              key={p.id}
              agent={p}
              canRemove={!archived}
              onOpenDm={(emp) => setDmAgent(emp)}
              onRemove={() => handleParticipantsChange(
                (room.participantIds || room.participant_ids || []).filter(id => id !== p.id)
              )}
            />
          ))}
          {participants.length === 0 && (
            <p className="text-[11px] text-[#a3a3a3]">{t('hyperAgents.noAgentsYet', 'No agents yet. Add one to start.')}</p>
          )}
        </div>
      </aside>

      <AnimatePresence>
        {showPicker && (
          <AgentPickerModal
            currentIds={room.participantIds || room.participant_ids || []}
            onClose={() => setShowPicker(false)}
            onPick={(ids) => { setShowPicker(false); handleParticipantsChange(ids); }}
          />
        )}
        {dmAgent && (
          <AgentDmModal
            agent={dmAgent}
            onClose={() => setDmAgent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Per-turn render ────────────────────────────────────────────────── */

function TurnView({ turn, participants, liveLines }) {
  const { t } = useTranslation('dashboard');
  // Merge sealed lines with any in-flight overlay
  const lines = useMemo(() => {
    const base = Array.isArray(turn.lines) ? turn.lines : [];
    if (!liveLines) return base;
    // Use whichever array has more entries (live SSE tends to keep up).
    return liveLines.length > base.length ? liveLines : base;
  }, [turn.lines, liveLines]);

  const router = lines.find(l => l.t === 'router');
  const leadLine = lines.find(l => l.t === 'line' && l.kind === 'lead');
  const synthLine = lines.find(l => l.t === 'line' && l.kind === 'synthesis');
  const rescueLine = lines.find(l => l.t === 'line' && l.kind === 'rescue');
  const reactions = lines.filter(l => l.t === 'react' && l.agreement !== 'abstain');
  // Multi-round debate: collect all revises + validates (was single).
  const revises = lines.filter(l => l.t === 'revise');
  const validates = lines.filter(l => l.t === 'validate');
  const seal = lines.find(l => l.t === 'seal');
  const errorLine = lines.find(l => l.t === 'error');
  const typing = lines.filter(l => l.t === 'typing').slice(-2);
  // Phase 4 events:
  const decisionRequired = lines.find(l => l.t === 'decision_required');
  const decisionSaved = lines.find(l => l.t === 'decision_saved');
  const trustDeltas = seal?.trust || {};
  const template = router?.template || 'debate';
  const sealStatus = seal?.status || 'complete';
  const qualityLow = seal?.quality_low;
  const toolCallCounts = seal?.tool_call_counts || {};
  const toolCallTotal = seal?.tool_call_total || 0;

  // Recursive CSI convergence — a turn now runs N cycles until consensus.
  // `cycle` is on every swarm event (legacy single-pass turns have none → 1).
  const cycleOf = (l) => l.cycle || 1;
  const cycleEnds = lines.filter(l => l.t === 'cycle_end');
  const convergence = lines.find(l => l.t === 'convergence');
  const allHypotheses = lines.filter(l => l.t === 'hypothesis');
  const maxCycle = Math.max(
    1,
    ...lines.filter(l => ['hypothesis', 'vote', 'cycle_end', 'chain_of_thought'].includes(l.t)).map(cycleOf),
  );
  // Convergence trail: one entry per completed cycle (verdict + score).
  const convergenceTrail = (convergence?.trail && convergence.trail.length)
    ? convergence.trail
    : cycleEnds.map(c => ({ cycle: c.cycle, verdict: c.verdict, weighted_score: c.weighted_score, converged: c.converged }));

  // Phase 4 swarm events (R1-R5) — detail view shows the LATEST cycle so the
  // converged result is front-and-centre; earlier cycles live in the trail.
  const hypotheses = allHypotheses.filter(l => cycleOf(l) === maxCycle);
  const peerReviews = lines.filter(l => l.t === 'peer_review' && cycleOf(l) === maxCycle);
  const chains = lines.filter(l => l.t === 'chain_of_thought' && cycleOf(l) === maxCycle);
  const skepticChallenge = [...lines].reverse().find(l => l.t === 'skeptic_challenge' && cycleOf(l) === maxCycle)
    || lines.find(l => l.t === 'skeptic_challenge');
  const votes = lines.filter(l => l.t === 'vote' && cycleOf(l) === maxCycle);
  const swarmVerdict = lines.find(l => l.t === 'swarm_verdict');
  const isSwarm = template === 'swarm' || allHypotheses.length > 0;
  const roundStarts = lines.filter(l => l.t === 'round_start' && cycleOf(l) === maxCycle);
  // Prod hardening signals — surfaced so a truncated/degraded turn isn't silent.
  const costCapHit = lines.find(l => l.t === 'cost_cap_hit') || lines.find(l => l.t === 'seal' && l.cost_cap_hit);
  const deadlineHit = lines.find(l => l.t === 'deadline_hit');
  const roomWarnings = lines.filter(l => l.t === 'warning');

  // Phase 4 polish — clickable evidence chips open this memory modal.
  const [evidenceMemoryId, setEvidenceMemoryId] = useState(null);

  return (
    <div className="space-y-2">
      {/* User bubble */}
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-violet-500 text-white text-[13px] rounded-2xl rounded-tr-md px-3 py-2 shadow-sm">
          {turn.userMessage || turn.user_message}
        </div>
      </div>

      {router && (
        <div className="text-[10px] text-[#a3a3a3] font-mono pl-2">
          → lead: <span className="text-[#525252]">{router.lead}</span>
          {(router.reactors || []).length > 0 && (
            <> · reactors: <span className="text-[#525252]">{router.reactors.join(', ')}</span></>
          )}
          {template && template !== 'debate' && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] uppercase tracking-wider">
              {template}
            </span>
          )}
        </div>
      )}

      {/* Recursive CSI convergence trail — one chip per cycle, verdict + score. */}
      {isSwarm && convergenceTrail.length > 0 && (
        <div className="flex items-center flex-wrap gap-1.5 pl-2 py-1">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3] mr-0.5">
            {t('hyperAgents.convergence', 'Convergence')} · {convergenceTrail.length} {convergenceTrail.length === 1 ? 'cycle' : 'cycles'}
          </span>
          {convergenceTrail.map((c, i) => {
            const v = c.verdict;
            const tone = v === 'AGREED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : v === 'CONDITIONAL' ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';
            return (
              <React.Fragment key={c.cycle ?? i}>
                {i > 0 && <span className="text-[#cbcbcb] text-[10px]">→</span>}
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono ${tone}`} title={`weighted ${c.weighted_score ?? '–'}`}>
                  C{c.cycle ?? i + 1} {v}{typeof c.weighted_score === 'number' ? ` ${c.weighted_score}` : ''}
                  {c.converged ? ' ✓' : ''}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Phase 4 — swarm R1-R5 rendering. Only shown for swarm template. */}
      {isSwarm && (
        <SwarmRounds
          participants={participants}
          hypotheses={hypotheses}
          peerReviews={peerReviews}
          chains={chains}
          skepticChallenge={skepticChallenge}
          votes={votes}
          swarmVerdict={swarmVerdict}
          roundStarts={roundStarts}
          costCapHit={costCapHit}
          deadlineHit={deadlineHit}
          roomWarnings={roomWarnings}
          onOpenEvidence={setEvidenceMemoryId}
        />
      )}

      {evidenceMemoryId && (
        <EvidenceModal
          memoryId={evidenceMemoryId}
          onClose={() => setEvidenceMemoryId(null)}
        />
      )}

      {leadLine && !isSwarm && (
        <AgentBubble
          agent={participants[leadLine.agent] || { slug: leadLine.agent, lane: 'Communicator' }}
          content={leadLine.content}
          kind="lead"
        />
      )}

      {reactions.map((r, i) => (
        <AgentBubble
          key={`react-${i}`}
          agent={participants[r.agent] || { slug: r.agent, lane: 'Communicator' }}
          content={r.content}
          kind="react"
          agreement={r.agreement}
          confidence={r.confidence}
        />
      ))}

      {synthLine && (
        <AgentBubble
          agent={participants[synthLine.agent] || { slug: synthLine.agent, lane: 'Communicator' }}
          content={synthLine.content}
          kind="synthesis"
        />
      )}

      {revises.map((rev, i) => (
        <div key={`revise-${i}`} className="border-l-2 border-dashed border-[#a3a3a3] ml-3 pl-3">
          <div className="text-[9px] uppercase tracking-wider text-[#737373] font-mono mb-0.5">
            {t('hyperAgents.revision', 'Revision · round {{n}}', { n: rev.round || (i + 2) })}
          </div>
          <AgentBubble
            agent={participants[rev.agent] || { slug: rev.agent, lane: 'Communicator' }}
            content={rev.content}
            kind="revise"
          />
          {validates[i] && (
            <div className="mt-1.5">
              <div className="text-[9px] uppercase tracking-wider text-[#737373] font-mono mb-0.5">
                {t('hyperAgents.verdict', 'Verdict · {{v}}', { v: validates[i].verdict || t('hyperAgents.resolved', 'resolved') })}
              </div>
              <AgentBubble
                agent={participants[validates[i].agent] || { slug: validates[i].agent, lane: 'Communicator' }}
                content={validates[i].content}
                kind="validate"
              />
            </div>
          )}
        </div>
      ))}

      {rescueLine && (
        <div className="border-l-2 border-amber-400 ml-3 pl-3 bg-amber-50/50 rounded-r-md">
          <div className="text-[9px] uppercase tracking-wider text-amber-700 font-mono mb-0.5">
            {t('hyperAgents.rescue', 'Rescue · concrete answer')}
          </div>
          <AgentBubble
            agent={participants[rescueLine.agent] || { slug: rescueLine.agent, lane: 'Communicator' }}
            content={rescueLine.content}
            kind="rescue"
          />
        </div>
      )}

      {decisionRequired && (
        <div className="mx-2 my-2 p-3 rounded-md border border-amber-300 bg-amber-50 text-[12px]">
          <div className="text-[9px] uppercase tracking-wider text-amber-700 font-mono mb-1">
            {t('hyperAgents.decisionRequired', '⚠ Decision required · escalated after {{n}} rounds', { n: decisionRequired.rounds_run || '?' })}
          </div>
          <div className="text-[#525252]">{decisionRequired.open_question}</div>
          {decisionRequired.raised_by && (
            <div className="text-[10px] text-[#737373] mt-1">{t('hyperAgents.raisedBy', 'raised by: {{who}}', { who: decisionRequired.raised_by })}</div>
          )}
        </div>
      )}

      {decisionSaved && (
        <div className="mx-2 text-[10px] text-emerald-700 font-mono pl-2">
          {t('hyperAgents.savedToMemory', '✓ saved to memory · trigger: {{trigger}} · id: {{id}}', { trigger: decisionSaved.trigger, id: (decisionSaved.memory_id || '').slice(0, 8) })}
        </div>
      )}

      {!seal && typing.length > 0 && (
        <div className="text-[11px] text-[#a3a3a3] italic flex items-center gap-2 pl-2">
          {typing.map((typingLine, i) => (
            <span key={i} className="flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> {t('hyperAgents.agentTyping', '{{agent}} typing…', { agent: typingLine.agent })}
            </span>
          ))}
        </div>
      )}

      {seal && (
        <div className="space-y-1 py-1">
          <div className={`text-[9px] uppercase tracking-wider font-mono text-center ${
            sealStatus === 'escalated' ? 'text-amber-700' :
            sealStatus === 'failed' ? 'text-red-600' :
            qualityLow ? 'text-amber-600' :
            'text-[#a3a3a3]'
          }`}>
            {errorLine
              ? t('hyperAgents.sealFailed', '─── failed: {{msg}} ───', { msg: errorLine.message || t('hyperAgents.unknownError', 'unknown error') })
              : sealStatus === 'escalated'
                ? t('hyperAgents.sealEscalated', '─── escalated · {{tok}} tok ───', { tok: seal.cost_tokens || 0 })
                : qualityLow
                  ? t('hyperAgents.sealLowQuality', '─── sealed (low quality) · {{tok}} tok ───', { tok: seal.cost_tokens || 0 })
                  : t('hyperAgents.sealComplete', '─── sealed · {{tok}} tok ───', { tok: seal.cost_tokens || 0 })}
          </div>
          {Object.keys(trustDeltas).length > 0 && (
            <div className="text-[9px] text-[#737373] font-mono text-center flex flex-wrap justify-center gap-2">
              {Object.entries(trustDeltas).map(([slug, score]) => (
                <span key={slug} className="px-1.5 py-0.5 rounded bg-[#f3f1ec]">
                  {slug}: trust {(Number(score) * 100).toFixed(0)}
                </span>
              ))}
            </div>
          )}
          {toolCallTotal > 0 && (
            <div className="text-[9px] text-[#737373] font-mono text-center flex flex-wrap justify-center gap-2 mt-1">
              <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">
                {toolCallTotal} tool calls
              </span>
              {Object.entries(toolCallCounts).map(([slug, count]) => (
                count > 0 && (
                  <span key={slug} className="px-1.5 py-0.5 rounded bg-[#f3f1ec]">
                    {slug}: {count}
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Markdown-lite renderer ───────────────────────────────────────────
 * Just enough to make lead reports look like a clean Slack message.
 * Headers, lists, bold, inline code. No full markdown engine.
 */
function renderMarkdownLite(raw) {
  if (!raw) return null;
  const text = String(raw).replace(/^\s+|\s+$/g, '');
  const blocks = [];
  const lines = text.split(/\r?\n/);
  let i = 0;
  let key = 0;

  const inline = (s) => {
    // bold
    const parts = [];
    let rest = s;
    let mIdx = 0;
    while (rest.length) {
      const b = rest.match(/\*\*([^*]+)\*\*/);
      const it = rest.match(/`([^`]+)`/);
      const first = [b, it].filter(Boolean).sort((a, c) => a.index - c.index)[0];
      if (!first) { parts.push(rest); break; }
      if (first.index > 0) parts.push(rest.slice(0, first.index));
      if (first === b) parts.push(<strong key={`b-${mIdx++}`}>{b[1]}</strong>);
      else parts.push(<code key={`c-${mIdx++}`} className="px-1 py-0.5 rounded bg-black/5 text-[12px] font-mono">{it[1]}</code>);
      rest = rest.slice(first.index + first[0].length);
    }
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }
    // Heading
    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? 'text-[14px] font-bold mt-2 mb-1'
                : level === 2 ? 'text-[13px] font-bold mt-2 mb-1'
                : 'text-[12px] font-semibold uppercase tracking-wider text-[#525252] mt-1.5 mb-0.5';
      blocks.push(<div key={key++} className={cls}>{inline(h[2])}</div>);
      i++;
      continue;
    }
    // Bullet list
    if (/^\s*[*-]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[*-]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[*-]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-0.5 my-1">
          {items.map((it, ix) => <li key={ix}>{inline(it)}</li>)}
        </ul>,
      );
      continue;
    }
    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-5 space-y-0.5 my-1">
          {items.map((it, ix) => <li key={ix}>{inline(it)}</li>)}
        </ol>,
      );
      continue;
    }
    // Paragraph
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*[*-]\s+|\s*\d+\.\s+)/.test(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(<p key={key++} className="my-1 leading-relaxed">{inline(para.join(' '))}</p>);
  }
  return blocks;
}

/* ─── Swarm R1-R5 renderer (Phase 4) ──────────────────────────────────── */

function EvidenceChip({ id, onClick }) {
  const { t } = useTranslation('dashboard');
  if (!id) return null;
  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f3f1ec] text-[#525252] hover:bg-violet-100 hover:text-violet-700 transition-colors cursor-pointer"
      title={t('hyperAgents.openMemory', 'Open memory {{id}}', { id })}
    >
      m·{String(id).slice(0, 8)}
    </button>
  );
}

function EvidenceModal({ memoryId, onClose }) {
  const { t } = useTranslation('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null); setData(null);
    apiClient.getMemory(memoryId)
      .then((res) => { if (!cancelled) setData(res?.memory || res); })
      .catch((e) => { if (!cancelled) setErr(e?.response?.data?.error || e?.message || 'load failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memoryId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-[640px] max-h-[80vh] overflow-y-auto shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-[#e3e0db] flex items-center justify-between sticky top-0 bg-white">
          <div className="text-[10px] font-mono text-[#737373]">memory · {memoryId}</div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={14} /></button>
        </header>
        <div className="px-5 py-4 space-y-3">
          {loading && <div className="text-[12px] text-[#a3a3a3]">{t('hyperAgents.loading', 'Loading…')}</div>}
          {err && <div className="text-[12px] text-red-600">{err}</div>}
          {data && (
            <>
              <h3 className="text-[14px] font-semibold text-[#0a0a0a]">{data.title || '(untitled)'}</h3>
              <div className="text-[10px] font-mono text-[#737373] flex flex-wrap gap-1">
                {(data.tags || []).slice(0, 20).map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-[#f3f1ec]">{t}</span>
                ))}
              </div>
              <div className="text-[12px] whitespace-pre-wrap text-[#0a0a0a] leading-relaxed">
                {data.content || '(empty)'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SwarmRounds({ participants, hypotheses, peerReviews, chains, skepticChallenge, votes, swarmVerdict, roundStarts, costCapHit, deadlineHit, roomWarnings = [], onOpenEvidence }) {
  const { t } = useTranslation('dashboard');
  const reviewsByTarget = useMemo(() => {
    const out = {};
    for (const r of peerReviews || []) {
      const k = r.target_hypothesis_id;
      if (!k) continue;
      (out[k] = out[k] || []).push(r);
    }
    return out;
  }, [peerReviews]);
  const chainByAgent = useMemo(() => {
    const out = {};
    for (const c of chains || []) out[c.id || c.agent] = c;
    return out;
  }, [chains]);

  const roundHeader = (round, label) => (
    <div className="flex items-center gap-2 pt-3 pb-1 pl-2">
      <span className="text-[9px] uppercase tracking-wider font-mono text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
        R{round}
      </span>
      <span className="text-[11px] text-[#525252] font-mono">{label}</span>
    </div>
  );

  return (
    <div className="space-y-1">
      {/* R1 — Independent Hypotheses */}
      {hypotheses.length > 0 && (
        <>
          {roundHeader(1, t('hyperAgents.independentHypotheses', 'Independent Hypotheses'))}
          {hypotheses.map((h) => {
            const agent = participants[h.agent] || { slug: h.agent, lane: h.lane || 'Communicator' };
            const childReviews = reviewsByTarget[h.id] || [];
            const refined = chainByAgent[h.id];
            return (
              <div key={h.id} className="ml-2 border-l-2 border-violet-200 pl-3">
                <AgentBubble agent={agent} content={h.content} kind="hypothesis" confidence={h.confidence} />
                {(h.evidence_memory_ids || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-1">
                    {h.evidence_memory_ids.map((mid) => (
                      <EvidenceChip key={mid} id={mid} onClick={onOpenEvidence} />
                    ))}
                  </div>
                )}
                {/* R2 — peer reviews for this hypothesis */}
                {childReviews.length > 0 && (
                  <div className="ml-3 mt-2 space-y-1 border-l border-dashed border-[#d4d0ca] pl-2">
                    <div className="text-[9px] uppercase tracking-wider font-mono text-[#737373]">{t('hyperAgents.r2PeerReview', 'R2 · Peer review')}</div>
                    {childReviews.map((r, i) => {
                      const reviewerAgent = participants[r.reviewer] || { slug: r.reviewer, lane: 'Communicator' };
                      const agreeColor =
                        (r.agreement === 'agree' || r.agreement === 'support') ? 'text-emerald-700' :
                        r.agreement === 'challenge' ? 'text-amber-700' : 'text-blue-700';
                      return (
                        <div key={i} className="text-[12px]">
                          <span className={`text-[10px] font-mono ${agreeColor}`}>[{r.agreement}]</span>{' '}
                          <span className="font-semibold text-[#0a0a0a]">{reviewerAgent.name || r.reviewer}:</span>{' '}
                          <span className="text-[#525252]">{r.content}</span>
                          {(r.evidence_memory_ids || []).length > 0 && (
                            <span className="ml-1 inline-flex flex-wrap gap-1">
                              {r.evidence_memory_ids.map((m) => (
                                <EvidenceChip key={m} id={m} onClick={onOpenEvidence} />
                              ))}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* R3 — refined hypothesis + chain of thought */}
                {refined && (
                  <details className="ml-3 mt-2 text-[12px]">
                    <summary className="cursor-pointer text-[9px] uppercase tracking-wider font-mono text-emerald-700">
                      {t('hyperAgents.r3Refined', 'R3 · Refined hypothesis + {{n}} chain-of-thought steps', { n: (refined.steps || []).length })}
                    </summary>
                    <div className="mt-1 pl-2 border-l border-emerald-200 space-y-1">
                      <div className="text-[12px] text-[#0a0a0a]">{refined.refined_hypothesis}</div>
                      {(refined.steps || []).map((s, i) => (
                        <div key={i} className="text-[10px] font-mono text-[#737373]">→ {s}</div>
                      ))}
                      {refined.lane_specific_finding && (
                        <div className="text-[11px] italic text-violet-700 mt-1">
                          {refined.lane_specific_finding}
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* R4 — Skeptic challenge */}
      {skepticChallenge && (
        <>
          {roundHeader(4, t('hyperAgents.r4Skeptic', 'Skeptic — unorthodox + hidden assumptions'))}
          <div className="ml-2 border-l-2 border-red-400 pl-3 bg-red-50/30 rounded-r-md py-2">
            <div className="text-[10px] font-mono text-red-700 mb-1">
              {skepticChallenge.agent} (permanent Skeptic)
            </div>
            {(skepticChallenge.challenges || []).map((c, i) => (
              <div key={`c-${i}`} className="text-[12px] mb-1">
                <span className="text-[9px] font-mono text-amber-700 mr-1">[challenges {c.target_hypothesis_id}]</span>
                {c.challenge}
                {(c.evidence_memory_ids || []).length > 0 && (
                  <span className="ml-1 inline-flex flex-wrap gap-1">
                    {c.evidence_memory_ids.map((m) => (
                      <EvidenceChip key={m} id={m} onClick={onOpenEvidence} />
                    ))}
                  </span>
                )}
              </div>
            ))}
            {(skepticChallenge.unorthodox_alternatives || []).map((u, i) => (
              <div key={`u-${i}`} className="text-[12px] mb-1">
                <span className="text-[9px] font-mono text-violet-700 mr-1">[unorthodox-{i + 1}]</span>
                {u.angle}
              </div>
            ))}
            {(skepticChallenge.hidden_assumptions || []).length > 0 && (
              <div className="text-[11px] italic text-[#525252] mt-1">
                {t('hyperAgents.hiddenAssumptions', 'Hidden assumptions: {{list}}', { list: skepticChallenge.hidden_assumptions.join(' · ') })}
              </div>
            )}
          </div>
        </>
      )}

      {/* R5 — Vote grid */}
      {votes.length > 0 && (
        <>
          {roundHeader(5, t('hyperAgents.r5ConvergenceVote', 'Convergence vote'))}
          <div className="ml-2 overflow-x-auto">
            <table className="text-[11px] min-w-full">
              <thead>
                <tr className="text-[#737373] border-b border-[#e3e0db]">
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.voter', 'Voter')}</th>
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.for', 'For')}</th>
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.score', 'Score')}</th>
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.conditions', 'Conditions')}</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((v, i) => (
                  <tr key={i} className="border-b border-[#f3f1ec]">
                    <td className="pr-3 py-1 font-semibold">{v.voter}</td>
                    <td className="pr-3 py-1 font-mono text-[10px]">{v.vote_for_hypothesis_id}</td>
                    <td className="pr-3 py-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        v.score >= 4 ? 'bg-emerald-100 text-emerald-700' :
                        v.score >= 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{v.score}</span>
                    </td>
                    <td className="pr-3 py-1 text-[10px] text-[#525252]">
                      {(v.conditions || []).join('; ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Prod hardening notices — truncation + role warnings (never silent) */}
      {(costCapHit || deadlineHit || roomWarnings.length > 0) && (
        <div className="mx-2 mt-3 space-y-1">
          {costCapHit && (
            <div className="p-2 rounded-md border border-amber-300 bg-amber-50 text-[11px] text-amber-800">
              {t('hyperAgents.costCapHit', '⚠ Turn truncated at the tool-call budget — synthesis ran on the rounds completed so far.')}
            </div>
          )}
          {deadlineHit && (
            <div className="p-2 rounded-md border border-amber-300 bg-amber-50 text-[11px] text-amber-800">
              {t('hyperAgents.deadlineHit', '⏱ Turn hit the time limit ({{cap}}s) — sealed early from round {{round}}.', { cap: deadlineHit.cap_s || '—', round: deadlineHit.skipped_from_round || '?' })}
            </div>
          )}
          {roomWarnings.map((w, i) => (
            <div key={i} className="p-2 rounded-md border border-blue-200 bg-blue-50 text-[11px] text-blue-800">
              {w.code === 'configured_skeptic_absent'
                ? t('hyperAgents.skepticAbsent', 'ℹ Configured Skeptic absent this turn — a stand-in{{standin}} challenged instead.', { standin: w.stand_in_skeptic ? ` (${w.stand_in_skeptic})` : '' })
                : w.code === 'lead_skeptic_collision'
                ? t('hyperAgents.leadSkepticCollision', 'ℹ Lead and Skeptic resolved to the same agent{{slug}} — Skeptic dropped for this turn.', { slug: w.slug ? ` (${w.slug})` : '' })
                : `ℹ ${w.code || t('hyperAgents.notice', 'notice')}`}
            </div>
          ))}
        </div>
      )}

      {/* Swarm verdict banner */}
      {swarmVerdict && (
        <div className={`mx-2 mt-3 p-3 rounded-md border ${
          swarmVerdict.verdict === 'AGREED' ? 'border-emerald-300 bg-emerald-50' :
          swarmVerdict.verdict === 'CONDITIONAL' ? 'border-amber-300 bg-amber-50' :
          'border-red-300 bg-red-50'
        }`}>
          <div className="text-[10px] uppercase font-mono mb-1 tracking-wider">
            ⛬ Verdict · <span className="font-bold">{swarmVerdict.verdict}</span>
            <span className="ml-2 text-[#737373]">
              weighted {swarmVerdict.weighted_score} · {swarmVerdict.vote_count} votes
            </span>
          </div>
          <div className="text-[12px] text-[#0a0a0a]">
            {t('hyperAgents.winner', 'Winner:')} <span className="font-mono">{swarmVerdict.winning_hypothesis_id || t('hyperAgents.none', 'none')}</span>
          </div>
          {(swarmVerdict.action_items || []).length > 0 && (
            <div className="mt-1.5 text-[11px]">
              <div className="text-[9px] uppercase font-mono text-[#737373]">{t('hyperAgents.actionItems', 'Action items')}</div>
              <ul className="list-disc list-inside text-[#525252]">
                {swarmVerdict.action_items.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Bubble ─────────────────────────────────────────────────────────── */

function AgentBubble({ agent, content, kind, agreement, confidence }) {
  const lane = agent?.lane || 'Communicator';
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const Icon = meta.icon;
  const indent = kind === 'react' || kind === 'validate';
  const agMeta = agreement ? AGREEMENT_META[agreement] : null;
  const isShort = (content || '').length < 280 && !/\n.*\n/.test(content || '');

  return (
    <div className={`flex gap-2 ${indent ? 'ml-6' : ''}`}>
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
        style={{ background: meta.bg, color: meta.color }}
        title={`${agent?.name || agent?.slug} · ${lane}`}
      >
        {agent?.avatarUrl
          ? <img src={agent.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          : (agent?.name?.[0] || agent?.slug?.[0] || '?').toUpperCase()}
      </div>
      <div className="min-w-0 max-w-[78%]">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[11px] font-semibold text-[#0a0a0a]">{agent?.name || agent?.slug}</span>
          <span
            className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
            style={{ background: meta.bg, color: meta.color }}
          >
            <Icon size={9} /> {meta.label}
          </span>
          {agMeta && (
            <span
              className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: agMeta.bg, color: agMeta.color }}
            >
              {agMeta.emoji} {agMeta.label}
              {Number.isFinite(confidence) && ` ${Math.round(confidence * 100)}%`}
            </span>
          )}
        </div>
        <div
          className="border border-[#e3e0db] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-[#0a0a0a] leading-relaxed break-words overflow-hidden"
          style={{ background: kind === 'lead' ? '#ffffff' : '#faf9f4' }}
        >
          {isShort
            ? <span className="whitespace-pre-wrap">{content || '…'}</span>
            : <div className="space-y-0.5">{renderMarkdownLite(content)}</div>}
        </div>
      </div>
    </div>
  );
}

/* ─── Participant chip in right rail ─────────────────────────────────── */

function ParticipantChip({ agent, canRemove, onRemove, onOpenDm }) {
  const { t } = useTranslation('dashboard');
  const lane = agent?.lane || 'Communicator';
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const Icon = meta.icon;
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="bg-white border border-[#e3e0db] rounded-lg px-2.5 py-2 flex items-center gap-2 hover:border-[#d4d0ca] cursor-pointer transition-colors"
      onClick={() => onOpenDm?.(agent)}
      title={t('hyperAgents.dmAgent', 'DM {{name}}', { name: agent?.name || agent?.slug })}
    >
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
        style={{ background: meta.bg, color: meta.color }}
      >
        {agent?.avatarUrl
          ? <img src={agent.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          : (agent?.name?.[0] || agent?.slug?.[0] || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-[#0a0a0a] truncate">{agent?.name || agent?.slug}</div>
        <div className="flex items-center gap-1 text-[9px] font-mono" style={{ color: meta.color }}>
          <Icon size={9} /> {meta.label}
          {typeof agent?.trustScore === 'number' && (
            <span
              className="ml-1 px-1 rounded bg-[#f3f1ec] text-[#525252]"
              title={t('hyperAgents.trustScore', 'Trust score (display-only, {{w}}W / {{l}}L)', { w: agent.trustWins || 0, l: agent.trustLosses || 0 })}
            >
              t{Math.round(agent.trustScore * 100)}
            </span>
          )}
        </div>
      </div>
      {canRemove && hover && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="text-[#a3a3a3] hover:text-red-600 shrink-0"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}

/* ─── 1-on-1 DM modal (history persisted in localStorage) ───────────── */

function AgentDmModal({ agent, onClose }) {
  const { t } = useTranslation('dashboard');
  // Stable per-user-agent conversation id. Backend uses this to keep
  // ReAct agent memory across turns within the same conversation; we
  // also use it as the localStorage key so refresh / re-open re-hydrates
  // the prior thread.
  const convId = useMemo(() => `dm:${agent?.slug || agent?.id}`, [agent]);
  const storageKey = useMemo(() => `hyper-agents:dm:${agent?.slug || agent?.id}`, [agent]);

  const [messages, setMessages] = useState(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(messages)); }
    catch { /* storage may be disabled */ }
  }, [messages, storageKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function handleSend(e) {
    e?.preventDefault?.();
    const text = draft.trim();
    if (!text || sending) return;
    setErr(null);
    setSending(true);
    const userMsg = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setDraft('');
    try {
      const resp = await apiClient.controlPlane.post(
        `/v1/employees/${agent.slug}/chat`,
        { text, conversation_id: convId },
      );
      const reply = resp?.data?.reply || '(no reply)';
      setMessages(prev => [...prev, { role: 'agent', content: reply, ts: Date.now() }]);
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
      // Roll back user msg so they can retry without dupes? keep it for context
    } finally {
      setSending(false);
    }
  }

  function clearHistory() {
    if (!window.confirm(t('hyperAgents.confirmClearDm', 'Clear this DM history?'))) return;
    setMessages([]);
    try { window.localStorage.removeItem(storageKey); } catch { /* noop */ }
  }

  if (!agent) return null;
  const lane = agent.lane || 'Communicator';
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white rounded-xl w-full max-w-[640px] h-[70vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b border-[#e3e0db] bg-white flex items-center gap-3 shrink-0">
          <div
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-semibold"
            style={{ background: meta.bg, color: meta.color }}
          >
            {agent.avatarUrl
              ? <img src={agent.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : (agent.name?.[0] || agent.slug?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#0a0a0a] truncate">{agent.name || agent.slug}</div>
            <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: meta.color }}>
              <Icon size={10} /> {meta.label}
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="text-[10px] uppercase tracking-wider text-[#a3a3a3] hover:text-red-600 px-2 py-1 rounded"
            title={t('hyperAgents.clearDmHistory', 'Clear DM history')}
          >
            {t('hyperAgents.clear', 'Clear')}
          </button>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a] p-1" title={t('hyperAgents.close', 'Close')}>
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-[#faf9f4]">
          {messages.length === 0 && (
            <div className="text-center text-[11px] text-[#a3a3a3] py-6">
              {t('hyperAgents.dmEmptyState', 'Start a 1-on-1 with {{name}}. History stays here across visits.', { name: agent.name || agent.slug })}
            </div>
          )}
          {messages.map((m, i) => (
            m.role === 'user'
              ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[78%] bg-violet-500 text-white text-[13px] rounded-2xl rounded-tr-md px-3 py-2 whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              )
              : (
                <div key={i} className="flex gap-2">
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {(agent.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="max-w-[78%] bg-white border border-[#e3e0db] rounded-2xl rounded-tl-md px-3 py-2 text-[13px] text-[#0a0a0a] whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              )
          ))}
          {sending && (
            <div className="text-[11px] text-[#a3a3a3] flex items-center gap-2 pl-2">
              <Loader2 size={11} className="animate-spin" /> {t('hyperAgents.agentTyping', '{{agent}} typing…', { agent: agent.name || agent.slug })}
            </div>
          )}
          {err && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              <AlertTriangle size={11} className="inline mr-1" /> {err}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-[#e3e0db] bg-white px-3 py-3 flex items-end gap-2 shrink-0">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
            rows={1}
            placeholder={t('hyperAgents.dmPlaceholder', 'Message {{name}}…', { name: agent.name || agent.slug })}
            disabled={sending}
            className="flex-1 bg-[#faf9f4] border border-[#e3e0db] rounded-xl px-3 py-2 text-[13px] text-[#0a0a0a] outline-none focus:border-violet-500 resize-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="h-9 px-3 bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {t('hyperAgents.send', 'Send')}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Create-room modal ──────────────────────────────────────────────── */

function CreateRoomModal({ onClose, onCreated }) {
  const { t } = useTranslation('dashboard');
  const [name, setName] = useState('');
  // Default to Smart (auto) — the orchestrator picks the best format from the
  // first question. No-code users never have to understand the 10 templates.
  const [template, setTemplate] = useState('auto');
  const [employees, setEmployees] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [skepticId, setSkepticId] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const activeFormat = ROOM_FORMATS.find(f => f.key === template) || ROOM_FORMATS[0];
  const filteredEmployees = agentQuery.trim()
    ? employees.filter(e => (e.name || '').toLowerCase().includes(agentQuery.trim().toLowerCase()))
    : employees;

  useEffect(() => {
    apiClient.listEmployees()
      .then(d => setEmployees(d?.employees || d || []))
      .catch(() => setEmployees([]));
  }, []);

  function toggle(id) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit(e) {
    e?.preventDefault?.();
    if (!name.trim() || picked.size === 0 || busy) return;
    setBusy(true); setErr(null);
    try {
      const payload = {
        name: name.trim(),
        participant_ids: Array.from(picked),
        template,
      };
      if (template === 'swarm' && skepticId) {
        payload.permanent_skeptic_id = skepticId;
      }
      const resp = await apiClient.createHyperRoom(payload);
      onCreated?.(resp.room);
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#1a1814]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.form
        onSubmit={submit}
        initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="bg-white rounded-2xl w-full max-w-[560px] max-h-[88vh] flex flex-col border border-[#e3e0db] shadow-[0_24px_70px_-20px_rgba(124,58,237,0.3),0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-[#eceae6] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-[0_4px_12px_rgba(124,58,237,0.35)]"
              style={{ background: 'linear-gradient(135deg,#a855f7 0%,#7c3aed 100%)' }}>
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#0a0a0a] leading-tight font-['Space_Grotesk']">{t('hyperAgents.newRoomTitle', 'New room')}</h2>
              <p className="text-[10px] text-[#a3a3a3] leading-tight">{t('hyperAgents.newRoomSub', 'Spin up a multi-agent collaboration room')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f3f1ec] transition-colors"><X size={15} /></button>
        </header>
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#737373] mb-1.5 block">{t('hyperAgents.nameLbl', 'Name')}</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('hyperAgents.namePlaceholder', 'Q2 planning')}
              className="w-full h-10 px-3.5 text-[13px] bg-[#faf9f4] border border-[#e3e0db] rounded-xl focus:outline-none focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 transition-all"
            />
          </div>
          {/* ── Format picker — always visible, user-friendly. Smart is the
                hero/default; the 9 specific formats sit in an icon grid. ── */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#737373] mb-1.5 block">
              {t('hyperAgents.formatLbl', 'How should they collaborate?')}
            </label>

            {/* Hero: Smart (auto) */}
            {(() => {
              const fmt = ROOM_FORMATS[0];
              const Icon = fmt.icon;
              const on = template === fmt.key;
              return (
                <button
                  type="button"
                  onClick={() => setTemplate(fmt.key)}
                  className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all ${
                    on
                      ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/15 shadow-[0_4px_14px_rgba(124,58,237,0.12)]'
                      : 'border-[#e3e0db] hover:border-violet-300 hover:bg-[#faf9f4]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
                    style={{ background: 'linear-gradient(135deg,#a855f7 0%,#7c3aed 100%)' }}>
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">{t(fmt.labelKey, fmt.label)}</span>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-violet-700 bg-violet-100 rounded-full px-1.5 py-0.5">{t('hyperAgents.recommended', 'Recommended')}</span>
                    </div>
                    <div className="text-[10.5px] text-[#737373] mt-0.5 leading-snug">{t(fmt.descKey, fmt.desc)}</div>
                  </div>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${on ? 'border-violet-500 bg-violet-500' : 'border-[#d4d0ca]'}`}>
                    {on && <Check size={11} className="text-white" />}
                  </span>
                </button>
              );
            })()}

            {/* Divider */}
            <div className="flex items-center gap-2 my-2.5">
              <div className="h-px flex-1 bg-[#eceae6]" />
              <span className="text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('hyperAgents.orPickFormat', 'Or pick a specific format')}</span>
              <div className="h-px flex-1 bg-[#eceae6]" />
            </div>

            {/* Grid of the 9 specific formats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROOM_FORMATS.slice(1).map((fmt) => {
                const Icon = fmt.icon;
                const on = template === fmt.key;
                return (
                  <button
                    type="button"
                    key={fmt.key}
                    onClick={() => setTemplate(fmt.key)}
                    title={t(fmt.descKey, fmt.desc)}
                    className={`relative text-left p-2.5 rounded-xl border transition-all group ${
                      on
                        ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/15 shadow-[0_4px_14px_rgba(124,58,237,0.12)]'
                        : 'border-[#e3e0db] hover:border-violet-300 hover:bg-[#faf9f4]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: on ? fmt.color : `${fmt.color}1a`, color: on ? '#fff' : fmt.color }}>
                        <Icon size={13} />
                      </span>
                      {fmt.tier && (
                        <span className="text-[8px] font-mono uppercase tracking-wider rounded-full px-1.5 py-0.5"
                          style={{ background: `${fmt.color}14`, color: fmt.color }}>{t(`hyperAgents.tier${fmt.tier}`, fmt.tier)}</span>
                      )}
                    </div>
                    <div className="text-[11.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t(fmt.labelKey, fmt.label)}</div>
                    <div className="text-[9.5px] text-[#737373] mt-0.5 leading-snug line-clamp-2">{t(fmt.descKey, fmt.desc)}</div>
                  </button>
                );
              })}
            </div>

            {/* Selected-format recap line */}
            <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[#737373]">
              <activeFormat.icon size={12} style={{ color: activeFormat.color }} />
              <span className="font-medium text-[#525252]">{t(activeFormat.labelKey, activeFormat.label)}</span>
              <span className="text-[#a3a3a3]">— {t(activeFormat.descKey, activeFormat.desc)}</span>
            </div>
          </div>

          {/* Swarm-only Skeptic picker. Defaults to first Skeptic-lane participant. */}
          {template === 'swarm' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1">
                <Shield size={12} /> {t('hyperAgents.permanentSkepticLbl', 'Permanent Skeptic (silent R1-R3, mandatory R4)')}
              </label>
              <select
                value={skepticId}
                onChange={(e) => setSkepticId(e.target.value)}
                className="w-full h-9 px-3 text-[13px] bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 transition-all"
              >
                <option value="">{t('hyperAgents.skepticAutoPick', '— auto-pick (first Skeptic-lane participant) —')}</option>
                {employees
                  .filter((emp) => picked.has(emp.id))
                  .map((emp) => {
                    const lane = emp.hyper?.lane || emp.roleArchetype || 'Communicator';
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({lane}{lane.toLowerCase() === 'skeptic' ? ' ★' : ''})
                      </option>
                    );
                  })}
              </select>
              <div className="text-[10px] text-amber-700/70 mt-1">
                {t('hyperAgents.skepticHint', 'Skeptic challenges consensus + proposes unorthodox angles. Pick a Skeptic-lane agent for best results.')}
              </div>
            </div>
          )}

          {/* ── Agents ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-[11px] font-mono uppercase tracking-wider ${picked.size === 0 ? 'text-red-500' : 'text-[#737373]'}`}>
                {t('hyperAgents.addAgentsLbl', 'Add agents ({{n}} selected)', { n: picked.size })}
                {picked.size === 0 && <span className="ml-1 normal-case font-sans tracking-normal text-[10px]">· {t('hyperAgents.pickAtLeastOne', 'pick at least 1')}</span>}
              </label>
              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPicked(picked.size === employees.length ? new Set() : new Set(employees.map(e => e.id)))}
                  className="flex items-center gap-1 text-[10px] font-medium text-violet-600 hover:text-violet-700"
                >
                  <CheckCheck size={11} /> {picked.size === employees.length ? t('hyperAgents.clearAll', 'Clear') : t('hyperAgents.selectAll', 'Select all')}
                </button>
              )}
            </div>
            {employees.length > 6 && (
              <div className="relative mb-1.5">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
                <input
                  value={agentQuery}
                  onChange={e => setAgentQuery(e.target.value)}
                  placeholder={t('hyperAgents.searchAgents', 'Search agents…')}
                  className="w-full h-8 pl-8 pr-3 text-[12px] bg-[#faf9f4] border border-[#e3e0db] rounded-lg focus:outline-none focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
              </div>
            )}
            <div className="max-h-[240px] overflow-y-auto border border-[#e3e0db] rounded-xl divide-y divide-[#f3f1ec]">
              {employees.length === 0 && (
                <div className="px-3 py-6 text-center text-[11px] text-[#a3a3a3]">
                  {t('hyperAgents.noEmployeesYet', 'No employees yet.')}
                  <div className="mt-1 text-[10px]">{t('hyperAgents.seedFirst', 'Seed or create employees from the roster first.')}</div>
                </div>
              )}
              {employees.length > 0 && filteredEmployees.length === 0 && (
                <div className="px-3 py-6 text-center text-[11px] text-[#a3a3a3]">
                  {t('hyperAgents.noAgentMatch', 'No agents match your search.')}
                </div>
              )}
              {filteredEmployees.map(emp => {
                const lane = emp.hyper?.lane || emp.roleArchetype || 'Communicator';
                const meta = LANE_META[lane] || LANE_META.Communicator;
                const checked = picked.has(emp.id);
                return (
                  <label key={emp.id} className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-violet-50' : 'hover:bg-[#faf9f4]'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(emp.id)} className="w-4 h-4 accent-violet-500" />
                    <div
                      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold ring-2 ring-white"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {emp.avatar_url
                        ? <img src={emp.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : (emp.name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-[#0a0a0a] truncate font-['Space_Grotesk']">{emp.name}</div>
                      <div className="text-[10px] font-mono mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded-full"
                        style={{ background: meta.bg, color: meta.color }}>{meta.label}</div>
                    </div>
                    {checked && <Check size={15} className="text-violet-500 shrink-0" />}
                  </label>
                );
              })}
            </div>
          </div>
          {err && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              <AlertTriangle size={11} className="inline mr-1" /> {err}
            </div>
          )}
        </div>
        <footer className="px-5 py-3.5 border-t border-[#eceae6] bg-[#faf9f4] flex items-center justify-end gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} className="text-[12px] font-medium text-[#525252] hover:text-[#0a0a0a] px-3 py-2 rounded-lg hover:bg-[#eceae6] transition-colors">
            {t('hyperAgents.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || picked.size === 0 || busy}
            title={picked.size === 0 ? t('hyperAgents.pickAtLeastOne', 'pick at least 1') : undefined}
            className="text-white text-[12px] font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_18px_rgba(124,58,237,0.45)] active:scale-95 disabled:opacity-40 disabled:shadow-none transition-all font-['Space_Grotesk']"
            style={{ background: 'linear-gradient(135deg,#a855f7 0%,#7c3aed 100%)' }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {t('hyperAgents.createRoom', 'Create room')}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}

/* ─── Agent picker modal (add to room) ───────────────────────────────── */

function AgentPickerModal({ currentIds, onClose, onPick }) {
  const { t } = useTranslation('dashboard');
  const [employees, setEmployees] = useState([]);
  const [picked, setPicked] = useState(new Set(currentIds || []));

  useEffect(() => {
    apiClient.listEmployees()
      .then(d => setEmployees(d?.employees || d || []))
      .catch(() => setEmployees([]));
  }, []);

  function toggle(id) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white rounded-xl w-full max-w-[480px] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-[#e3e0db] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#0a0a0a]">{t('hyperAgents.addAgentsToRoom', 'Add agents to room')}</h2>
          <button type="button" onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={14} /></button>
        </header>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-[#f3f1ec]">
          {employees.map(emp => {
            const lane = emp.hyper?.lane || emp.roleArchetype || 'Communicator';
            const meta = LANE_META[lane] || LANE_META.Communicator;
            return (
              <label key={emp.id} className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-[#faf9f4]">
                <input type="checkbox" checked={picked.has(emp.id)} onChange={() => toggle(emp.id)} className="accent-violet-500" />
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {(emp.name?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[#0a0a0a] truncate">{emp.name}</div>
                  <div className="text-[10px] font-mono" style={{ color: meta.color }}>{meta.label}</div>
                </div>
              </label>
            );
          })}
        </div>
        <footer className="px-5 py-3 border-t border-[#e3e0db] bg-[#faf9f4] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="text-[12px] text-[#525252] hover:text-[#0a0a0a] px-3 py-1.5">
            {t('hyperAgents.cancel', 'Cancel')}
          </button>
          <button
            onClick={() => onPick(Array.from(picked))}
            className="bg-[#0a0a0a] hover:bg-[#262626] text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg"
          >
            {t('hyperAgents.save', 'Save')}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
