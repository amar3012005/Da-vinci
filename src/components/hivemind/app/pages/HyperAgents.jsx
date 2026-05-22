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
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Sparkles, Send, Users, Hash, X, Archive,
  AlertTriangle, Loader2, ArrowLeft,
  Network, Shield, Crown, Lightbulb, MessageCircle,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import DigitalEmployees from './DigitalEmployees';

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

/* ─── Top-level page ─────────────────────────────────────────────────── */

export default function HyperAgents() {
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

  const liveRooms = useMemo(() => rooms.filter(r => !r.archived_at), [rooms]);
  const archivedRooms = useMemo(() => rooms.filter(r => r.archived_at), [rooms]);

  // ── Empty state: render existing DigitalEmployees roster + CTA ─────
  if (!loading && liveRooms.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-5 bg-gradient-to-br from-[#faf9f4] to-white border border-[#e3e0db] rounded-xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
              Hyper Agents — Cognitive Swarm Intelligence on HIVEMIND
            </h2>
            <p className="text-[12px] text-[#525252] mt-1">
              Build a room. Your agents talk to each other under WhatsApp-style threads, debate when their roles
              clash, and self-evolve from your conversations over time.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="shrink-0 flex items-center gap-1.5 bg-[#0a0a0a] hover:bg-[#262626] text-white text-[12px] font-semibold px-3.5 py-2 rounded-lg"
          >
            <Plus size={13} /> New room
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
    <div className="font-['Space_Grotesk'] flex h-[calc(100vh-3.5rem-3rem)] -my-2 max-w-[1400px] mx-auto bg-white border border-[#e3e0db] rounded-xl overflow-hidden">
      {/* Left rail: rooms */}
      <aside className="w-[240px] border-r border-[#e3e0db] bg-[#faf9f4] flex flex-col shrink-0">
        <header className="px-3 py-3 border-b border-[#e3e0db] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-violet-500" />
            <span className="text-[12px] font-semibold text-[#0a0a0a]">Rooms</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="text-[#525252] hover:text-[#0a0a0a]"
            title="New room"
          >
            <Plus size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto py-1">
          {liveRooms.map(r => (
            <RoomRow
              key={r.id}
              room={r}
              active={r.id === activeRoomId}
              onClick={() => setActiveRoomId(r.id)}
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
                    onClick={() => setActiveRoomId(r.id)}
                    archived
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      </aside>

      {/* Middle: thread or roster */}
      <main className="flex-1 min-w-0 flex flex-col">
        {viewMode === 'roster' ? (
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 border-b border-[#e3e0db] bg-white flex items-center gap-2 sticky top-0 z-10">
              <button
                onClick={() => setViewMode('thread')}
                className="p-1.5 text-[#525252] hover:text-[#0a0a0a] hover:bg-[#faf9f4] rounded"
                title="Back to room"
              >
                <ArrowLeft size={14} />
              </button>
              <span className="text-[13px] font-semibold text-[#0a0a0a]">Agent roster</span>
              <span className="text-[10px] text-[#a3a3a3] ml-auto">Browse + edit your hires</span>
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
            <span>Pick a room from the left.</span>
            <button
              onClick={() => setViewMode('roster')}
              className="text-[11px] text-[#117dff] hover:underline"
            >
              Or browse the agent roster →
            </button>
          </div>
        )}
      </main>

      {/* Right rail: participants — rendered inside RoomThread */}

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

function RoomRow({ room, active, onClick, archived }) {
  const participants = room.participants || [];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
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
    </button>
  );
}

/* ─── Room thread (middle + right) ───────────────────────────────────── */

function RoomThread({ roomId, onArchived, onBack }) {
  const [room, setRoom] = useState(null);
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTurnId, setActiveTurnId] = useState(null);
  const [liveLines, setLiveLines] = useState([]);
  const [draft, setDraft] = useState('');
  const [showPicker, setShowPicker] = useState(false);
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
    ['router', 'typing', 'line', 'react', 'revise', 'validate', 'seal', 'error', 'heartbeat']
      .forEach(name => es.addEventListener(name, onAny));
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
    if (!window.confirm(`Archive #${room?.name}? Transcript distills into a memory.`)) return;
    try {
      await apiClient.archiveHyperRoom(roomId);
      onArchived?.();
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
    return <div className="flex-1 flex items-center justify-center text-[12px] text-[#a3a3a3]">Room not found.</div>;
  }

  const participants = room.participants || [];
  const archived = !!room.archivedAt;
  const participantBySlug = Object.fromEntries(participants.map(p => [p.slug, p]));

  return (
    <div className="flex flex-1 min-w-0">
      <section className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="px-4 py-3 border-b border-[#e3e0db] bg-white flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 text-[#525252] hover:text-[#0a0a0a] hover:bg-[#faf9f4] rounded shrink-0"
                title="Back to agent roster"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[#0a0a0a]">
              <Hash size={13} className="text-[#a3a3a3]" />
              <h2 className="text-[14px] font-semibold truncate">{room.name}</h2>
              {archived && (
                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-[#f3f1ec] text-[#525252] rounded">
                  archived
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#a3a3a3] font-mono mt-0.5">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} · {turns.length} turn{turns.length !== 1 ? 's' : ''}
            </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!archived && (
              <button
                onClick={handleArchive}
                className="p-1.5 text-[#a3a3a3] hover:text-red-600 rounded hover:bg-[#faf9f4]"
                title="Archive room (distills into 1 memory)"
              >
                <Archive size={13} />
              </button>
            )}
          </div>
        </header>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {turns.length === 0 && (
            <div className="text-center text-[12px] text-[#a3a3a3] py-8">
              Start the conversation — ask your team anything.
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
                  placeholder="Message the team…  use @slug to address one agent"
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
                Send
              </button>
            </div>
            <div className="text-[9px] text-[#a3a3a3] mt-1 font-mono">Enter to send · Shift+Enter newline · @slug to force lead</div>
          </form>
        )}
      </section>

      {/* Right rail: participants */}
      <aside className="w-[260px] border-l border-[#e3e0db] bg-[#faf9f4] flex flex-col shrink-0">
        <header className="px-3 py-3 border-b border-[#e3e0db] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-[#525252]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">Participants</span>
          </div>
          {!archived && (
            <button
              onClick={() => setShowPicker(true)}
              className="text-[#525252] hover:text-[#0a0a0a]"
              title="Add agent"
            >
              <Plus size={13} />
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {participants.map(p => (
            <ParticipantChip key={p.id} agent={p} canRemove={!archived}
              onRemove={() => handleParticipantsChange(
                (room.participantIds || room.participant_ids || []).filter(id => id !== p.id)
              )}
            />
          ))}
          {participants.length === 0 && (
            <p className="text-[11px] text-[#a3a3a3]">No agents yet. Add one to start.</p>
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
      </AnimatePresence>
    </div>
  );
}

/* ─── Per-turn render ────────────────────────────────────────────────── */

function TurnView({ turn, participants, liveLines }) {
  // Merge sealed lines with any in-flight overlay
  const lines = useMemo(() => {
    const base = Array.isArray(turn.lines) ? turn.lines : [];
    if (!liveLines) return base;
    // Use whichever array has more entries (live SSE tends to keep up).
    return liveLines.length > base.length ? liveLines : base;
  }, [turn.lines, liveLines]);

  const router = lines.find(l => l.t === 'router');
  const leadLine = lines.find(l => l.t === 'line' && l.kind === 'lead');
  const reactions = lines.filter(l => l.t === 'react' && l.agreement !== 'abstain');
  const revise = lines.find(l => l.t === 'revise');
  const validate = lines.find(l => l.t === 'validate');
  const seal = lines.find(l => l.t === 'seal');
  const typing = lines.filter(l => l.t === 'typing').slice(-2);

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
        </div>
      )}

      {leadLine && (
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

      {revise && (
        <div className="border-l-2 border-dashed border-[#a3a3a3] ml-3 pl-3">
          <div className="text-[9px] uppercase tracking-wider text-[#737373] font-mono mb-0.5">Revision · round 2</div>
          <AgentBubble
            agent={participants[revise.agent] || { slug: revise.agent, lane: 'Communicator' }}
            content={revise.content}
            kind="revise"
          />
        </div>
      )}

      {validate && (
        <div className="border-l-2 border-dashed border-[#a3a3a3] ml-3 pl-3">
          <div className="text-[9px] uppercase tracking-wider text-[#737373] font-mono mb-0.5">
            Verdict · {validate.verdict || 'resolved'}
          </div>
          <AgentBubble
            agent={participants[validate.agent] || { slug: validate.agent, lane: 'Communicator' }}
            content={validate.content}
            kind="validate"
          />
        </div>
      )}

      {!seal && typing.length > 0 && (
        <div className="text-[11px] text-[#a3a3a3] italic flex items-center gap-2 pl-2">
          {typing.map((t, i) => (
            <span key={i} className="flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> {t.agent} typing…
            </span>
          ))}
        </div>
      )}

      {seal && (
        <div className="text-[9px] uppercase tracking-wider text-[#a3a3a3] font-mono text-center py-1">
          ─── sealed · {seal.cost_tokens || 0} tok ───
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
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
          className="bg-white border border-[#e3e0db] rounded-2xl rounded-tl-md px-3 py-2 text-[13px] text-[#0a0a0a] leading-relaxed whitespace-pre-wrap"
          style={kind === 'lead' ? {} : { background: '#faf9f4' }}
        >
          {content || '…'}
        </div>
      </div>
    </div>
  );
}

/* ─── Participant chip in right rail ─────────────────────────────────── */

function ParticipantChip({ agent, canRemove, onRemove }) {
  const lane = agent?.lane || 'Communicator';
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const Icon = meta.icon;
  const [showRemove, setShowRemove] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowRemove(true)}
      onMouseLeave={() => setShowRemove(false)}
      className="bg-white border border-[#e3e0db] rounded-lg px-2.5 py-2 flex items-center gap-2 hover:border-[#d4d0ca] transition-colors"
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
        </div>
      </div>
      {canRemove && showRemove && (
        <button onClick={onRemove} className="text-[#a3a3a3] hover:text-red-600">
          <X size={11} />
        </button>
      )}
    </div>
  );
}

/* ─── Create-room modal ──────────────────────────────────────────────── */

function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [employees, setEmployees] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

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
    if (!name.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      const resp = await apiClient.createHyperRoom({
        name: name.trim(),
        participant_ids: Array.from(picked),
      });
      onCreated?.(resp.room);
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.form
        onSubmit={submit}
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white rounded-xl w-full max-w-[520px] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-[#e3e0db] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#0a0a0a]">New room</h2>
          <button type="button" onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={14} /></button>
        </header>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#525252] mb-1 block">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Q2 planning"
              className="w-full h-9 px-3 text-[13px] border border-[#e3e0db] rounded-lg focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#525252] mb-1 block">
              Add agents ({picked.size} selected)
            </label>
            <div className="max-h-[260px] overflow-y-auto border border-[#e3e0db] rounded-lg divide-y divide-[#f3f1ec]">
              {employees.length === 0 && (
                <div className="px-3 py-6 text-center text-[11px] text-[#a3a3a3]">No employees yet.</div>
              )}
              {employees.map(emp => {
                const lane = emp.hyper?.lane || emp.roleArchetype || 'Communicator';
                const meta = LANE_META[lane] || LANE_META.Communicator;
                const checked = picked.has(emp.id);
                return (
                  <label key={emp.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#faf9f4]">
                    <input type="checkbox" checked={checked} onChange={() => toggle(emp.id)} className="accent-violet-500" />
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {emp.avatar_url
                        ? <img src={emp.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : (emp.name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#0a0a0a] truncate">{emp.name}</div>
                      <div className="text-[10px] font-mono" style={{ color: meta.color }}>{meta.label}</div>
                    </div>
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
        <footer className="px-5 py-3 border-t border-[#e3e0db] bg-[#faf9f4] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="text-[12px] text-[#525252] hover:text-[#0a0a0a] px-3 py-1.5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-50 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Create room
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}

/* ─── Agent picker modal (add to room) ───────────────────────────────── */

function AgentPickerModal({ currentIds, onClose, onPick }) {
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
          <h2 className="text-[15px] font-semibold text-[#0a0a0a]">Add agents to room</h2>
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
            Cancel
          </button>
          <button
            onClick={() => onPick(Array.from(picked))}
            className="bg-[#0a0a0a] hover:bg-[#262626] text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg"
          >
            Save
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
