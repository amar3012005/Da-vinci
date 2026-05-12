import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Users,
  Send,
  Play,
  RefreshCw,
  AlertCircle,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Hourglass,
  ArrowLeft,
} from 'lucide-react';
import apiClient from '../shared/api-client';

/**
 * EmployeePlayground — Slack-style group channel for digital employees plus
 * 1-on-1 DM panels.
 *
 * Routes: /hivemind/app/employees/playground
 *
 * Two modes (toggle in left rail):
 *   1. "Group session" — Select 2+ employees, type a task brief, hit Run.
 *      The TeamRoom phase machine (AgentScope) runs server-side and we
 *      poll /v1/team-tasks/:id/transcript every 1.5s for new messages.
 *      Each phase output renders as a Slack-style bubble under the
 *      sender's name + role badge. Contradictions get a red ring.
 *
 *   2. "DM <employee>" — One employee at a time. Each turn posts
 *      to /v1/employees/:slug/chat with a stable conversation_id so
 *      agent memory carries across turns. ReAct tool calls happen
 *      server-side; user just sees the consolidated reply.
 */

const KIND_LABELS = {
  system:     { label: 'system',     color: 'text-[#a3a3a3]', emoji: '🔔' },
  chat:       { label: 'finding',    color: 'text-[#117dff]', emoji: '🔍' },
  claim:      { label: 'claim',      color: 'text-[#0a0a0a]', emoji: '📝' },
  review:     { label: 'review',     color: 'text-[#9333ea]', emoji: '⚖️' },
  revision:   { label: 'revision',   color: 'text-[#ca8a04]', emoji: '🔄' },
  synthesis:  { label: 'consensus',  color: 'text-[#16a34a]', emoji: '🎯' },
};

const ROLE_EMOJI = {
  explorer:     '🧭',
  advocate:     '📣',
  fact_checker: '🔬',
  legal:        '⚖️',
  challenger:   '🥊',
  synthesizer:  '🧠',
  generalist:   '🤖',
  system:       '🔔',
};

function MessageBubble({ msg }) {
  const k = KIND_LABELS[msg.kind] || KIND_LABELS.chat;
  const isContradiction = msg.kind === 'review' && msg.metadata?.verdict === 'contradicts';
  const isSystem = msg.kind === 'system';
  return (
    <div className={`flex gap-3 px-4 py-2.5 ${isSystem ? 'opacity-70' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-[#faf9f4] border border-[#eae7e1] flex items-center justify-center text-[14px] flex-shrink-0">
        {ROLE_EMOJI[msg.sender_role] || ROLE_EMOJI.generalist}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-[#0a0a0a]">{msg.sender_name}</span>
          {msg.sender_role && msg.sender_role !== 'system' && (
            <span className="text-[10px] uppercase tracking-wide text-[#a3a3a3]">{msg.sender_role}</span>
          )}
          <span className={`text-[10px] ${k.color}`}>{k.emoji} {k.label}</span>
          {msg.round_num > 0 && (
            <span className="text-[10px] text-[#a3a3a3]">r{msg.round_num}</span>
          )}
        </div>
        <div
          className={`mt-0.5 text-[13px] text-[#525252] whitespace-pre-wrap break-words rounded-[6px] px-3 py-2 ${
            isContradiction
              ? 'bg-red-50 border border-red-200'
              : msg.kind === 'synthesis'
              ? 'bg-[#f0fdf4] border border-[#bbf7d0]'
              : 'bg-[#faf9f4] border border-[#eae7e1]'
          }`}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, gateReason }) {
  if (!status) return null;
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#dcfce7] text-[#15803d] rounded">
        <CheckCircle2 size={10} /> completed · {gateReason || ''}
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#fef2f2] text-[#b91c1c] rounded">
        <AlertCircle size={10} /> failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-[#fef3c7] text-[#a16207] rounded">
      <Hourglass size={10} className="animate-pulse" /> running
    </span>
  );
}


// ── Group session panel ────────────────────────────────────────
function GroupSessionPanel({ employees }) {
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const [brief, setBrief] = useState('');
  const [maxRounds, setMaxRounds] = useState(2);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const transcriptRef = useRef(null);
  const lastTsRef = useRef(null);
  const pollIdRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript.length]);

  const toggleSlug = (slug) => {
    setSelectedSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug],
    );
  };

  const runTask = useCallback(async () => {
    if (!brief.trim() || selectedSlugs.length < 2) {
      setError('Pick at least 2 employees and type a brief.');
      return;
    }
    setError(null);
    setCreating(true);
    setTranscript([]);
    setStatus({ status: 'running' });
    lastTsRef.current = null;
    try {
      const res = await apiClient.createTeamTask({
        brief: brief.trim(),
        roster_slugs: selectedSlugs,
        max_rounds: Number(maxRounds) || 2,
      });
      setTaskId(res.task_id);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setStatus(null);
    } finally {
      setCreating(false);
    }
  }, [brief, selectedSlugs, maxRounds]);

  // Poll transcript + status while task is running
  useEffect(() => {
    if (!taskId) return undefined;
    let cancelled = false;
    async function tick() {
      if (cancelled) return;
      try {
        const [statusRes, txnRes] = await Promise.all([
          apiClient.getTeamTask(taskId),
          apiClient.getTeamTaskTranscript(taskId, { afterTs: lastTsRef.current || undefined }),
        ]);
        if (cancelled) return;
        setStatus(statusRes);
        if (txnRes.messages?.length) {
          setTranscript(prev => [...prev, ...txnRes.messages]);
          lastTsRef.current = txnRes.messages[txnRes.messages.length - 1].ts;
        }
        if (statusRes.status === 'running') {
          pollIdRef.current = setTimeout(tick, 1500);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.error || e.message);
          pollIdRef.current = setTimeout(tick, 4000); // backoff on error
        }
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (pollIdRef.current) clearTimeout(pollIdRef.current);
    };
  }, [taskId]);

  const rosterPicker = (
    <div className="border border-[#eae7e1] rounded-[8px] p-3 bg-[#faf9f4]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-[#525252] uppercase tracking-wide">Roster</span>
        <span className="text-[10px] text-[#a3a3a3]">{selectedSlugs.length} selected</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto">
        {employees.map(emp => {
          const role = emp.role_archetype || emp.policy_rules?.role_archetype || 'generalist';
          const checked = selectedSlugs.includes(emp.slug);
          return (
            <label
              key={emp.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[12px] border ${
                checked ? 'bg-[#117dff]/5 border-[#117dff]/40' : 'bg-white border-[#eae7e1]'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSlug(emp.slug)}
              />
              <span className="text-[14px]">{ROLE_EMOJI[role] || ROLE_EMOJI.generalist}</span>
              <span className="flex-1 truncate text-[#0a0a0a]">{emp.name}</span>
              <span className="text-[10px] text-[#a3a3a3]">{role}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top: channel header */}
      <div className="px-5 py-3 border-b border-[#eae7e1] bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#525252]" />
          <span className="text-[14px] font-semibold text-[#0a0a0a]">#team-playground</span>
          {status && <StatusBadge status={status.status} gateReason={status.gate_reason} />}
        </div>
        {status?.status === 'completed' && (
          <div className="flex gap-2 text-[10px] text-[#525252]">
            <span>claims: {status.claim_count}</span>
            <span>reviews: {status.review_count}</span>
            <span>revisions: {status.revision_count}</span>
            <span>contradictions: {status.contradictions}</span>
          </div>
        )}
      </div>

      {/* Body: transcript + side controls */}
      <div className="flex-1 flex overflow-hidden">
        <div ref={transcriptRef} className="flex-1 overflow-y-auto bg-white">
          {transcript.length === 0 && !creating && (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center text-[#a3a3a3]">
              <Sparkles size={28} className="mb-2" />
              <p className="text-[13px]">Pick 2+ employees → type a brief → hit Run.</p>
              <p className="text-[11px] mt-1">Watch them investigate, propose, debate, and converge.</p>
            </div>
          )}
          {transcript.map(m => <MessageBubble key={m.msg_id} msg={m} />)}
          {status?.status === 'completed' && status.final_answer && (
            <div className="px-4 py-2.5 border-t border-[#eae7e1] bg-[#f0fdf4]">
              <div className="text-[11px] uppercase tracking-wide text-[#15803d] font-semibold mb-1">
                Final answer
              </div>
              <div className="text-[13px] text-[#0a0a0a] whitespace-pre-wrap">{status.final_answer}</div>
            </div>
          )}
        </div>

        {/* Right rail: roster + run controls */}
        <div className="w-[300px] border-l border-[#eae7e1] p-4 bg-[#faf9f4] space-y-3 overflow-y-auto">
          {rosterPicker}
          <label className="block">
            <span className="text-[11px] text-[#525252] font-medium">Max rounds</span>
            <input
              type="number"
              min={1}
              max={6}
              value={maxRounds}
              onChange={e => setMaxRounds(e.target.value)}
              className="w-full h-8 px-2 mt-1 text-[12px] border border-[#e3e0db] rounded-[6px]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-[#525252] font-medium">Brief</span>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              rows={5}
              placeholder="Plan Q3 EU launch timeline including DPIA review and GTM milestones..."
              className="w-full px-2 py-1.5 mt-1 text-[12px] border border-[#e3e0db] rounded-[6px] resize-y"
            />
          </label>
          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-[11px] text-[#dc2626]">
              <AlertCircle size={12} /> {error}
            </div>
          )}
          <button
            onClick={runTask}
            disabled={creating || status?.status === 'running' || !brief.trim() || selectedSlugs.length < 2}
            className="w-full flex items-center justify-center gap-1.5 h-9 text-[12px] bg-[#117dff] text-white rounded hover:bg-[#0066e0] disabled:opacity-50"
          >
            {status?.status === 'running' ? (
              <><RefreshCw size={12} className="animate-spin" /> Running…</>
            ) : (
              <><Play size={12} /> Run team task</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── DM chat panel (1-on-1) ─────────────────────────────────────
function DmPanel({ employee, onBack }) {
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const conversationIdRef = useRef(`pg-${employee.id}-${Date.now()}`);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history.length, sending]);

  const send = useCallback(async () => {
    if (!draft.trim()) return;
    const userMsg = draft.trim();
    setHistory(h => [...h, { role: 'user', content: userMsg }]);
    setDraft('');
    setSending(true);
    setError(null);
    try {
      const res = await apiClient.chatWithEmployee(employee.slug, userMsg, conversationIdRef.current);
      setHistory(h => [...h, { role: 'assistant', content: res.reply || '(no reply)' }]);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  }, [draft, employee.slug]);

  const role = employee.role_archetype || employee.policy_rules?.role_archetype || 'generalist';

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-[#eae7e1] bg-white flex items-center gap-3">
        <button onClick={onBack} className="text-[#525252] hover:bg-[#f3f1ec] p-1 rounded">
          <ArrowLeft size={14} />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#faf9f4] border border-[#eae7e1] flex items-center justify-center text-[14px]">
          {ROLE_EMOJI[role] || ROLE_EMOJI.generalist}
        </div>
        <div>
          <div className="text-[14px] font-semibold text-[#0a0a0a]">{employee.name}</div>
          <div className="text-[10px] text-[#a3a3a3]">DM · {role} · {employee.model}</div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white p-4 space-y-2">
        {history.length === 0 && (
          <div className="text-center text-[12px] text-[#a3a3a3] py-8">
            Start the conversation. Memory persists across messages in this session.
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-3 py-2 rounded-[10px] text-[13px] whitespace-pre-wrap break-words ${
              m.role === 'user'
                ? 'bg-[#117dff] text-white'
                : 'bg-[#faf9f4] border border-[#eae7e1] text-[#0a0a0a]'
            }`}>{m.content}</div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-[10px] text-[12px] text-[#a3a3a3] bg-[#faf9f4] border border-[#eae7e1]">
              <RefreshCw size={12} className="inline animate-spin mr-1" /> thinking…
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-[11px] text-[#dc2626] flex items-center gap-2">
          <AlertCircle size={12} /> {error}
        </div>
      )}
      <div className="px-3 py-2 border-t border-[#eae7e1] bg-[#faf9f4] flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder={`Message ${employee.name}…`}
          className="flex-1 h-9 px-3 text-[13px] border border-[#e3e0db] rounded-[6px] focus:outline-none focus:border-[#117dff]"
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="flex items-center gap-1.5 h-9 px-3 text-[12px] bg-[#117dff] text-white rounded hover:bg-[#0066e0] disabled:opacity-50"
        >
          <Send size={12} /> Send
        </button>
      </div>
    </div>
  );
}


// ── Top-level page ─────────────────────────────────────────────
export default function EmployeePlayground() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState({ kind: 'group' }); // {kind:'group'} | {kind:'dm', employee}

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { employees: list } = await apiClient.listEmployees();
      setEmployees((list || []).filter(e => e.status === 'running'));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const sidebar = useMemo(() => (
    <aside className="w-[260px] border-r border-[#eae7e1] bg-[#faf9f4] flex flex-col">
      <div className="px-4 py-3 border-b border-[#eae7e1] flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#0a0a0a]">Playground</span>
        <button onClick={fetch}
          className="text-[#525252] hover:bg-[#f3f1ec] p-1 rounded"
          title="Refresh">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <button
        onClick={() => setMode({ kind: 'group' })}
        className={`flex items-center gap-2 px-4 py-2.5 text-[13px] text-left ${
          mode.kind === 'group'
            ? 'bg-white border-l-2 border-[#117dff] text-[#0a0a0a] font-medium'
            : 'text-[#525252] hover:bg-[#f3f1ec]'
        }`}
      >
        <Users size={14} /> Group session
      </button>
      <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wide text-[#a3a3a3] font-semibold">
        Direct messages
      </div>
      <div className="flex-1 overflow-y-auto">
        {employees.length === 0 && !loading && (
          <div className="px-4 py-3 text-[11px] text-[#a3a3a3]">
            No running employees. Create + deploy one first.
          </div>
        )}
        {employees.map(emp => {
          const role = emp.role_archetype || emp.policy_rules?.role_archetype || 'generalist';
          const active = mode.kind === 'dm' && mode.employee?.id === emp.id;
          return (
            <button key={emp.id}
              onClick={() => setMode({ kind: 'dm', employee: emp })}
              className={`w-full flex items-center gap-2 px-4 py-2 text-[12px] text-left ${
                active
                  ? 'bg-white border-l-2 border-[#117dff] text-[#0a0a0a] font-medium'
                  : 'text-[#525252] hover:bg-[#f3f1ec]'
              }`}
            >
              <span className="text-[14px]">{ROLE_EMOJI[role] || ROLE_EMOJI.generalist}</span>
              <span className="flex-1 truncate">{emp.name}</span>
              <MessageCircle size={11} className="text-[#a3a3a3]" />
            </button>
          );
        })}
      </div>
    </aside>
  ), [employees, loading, mode, fetch]);

  return (
    <div className="flex h-[calc(100vh-56px)] bg-white">
      {sidebar}
      <main className="flex-1 flex flex-col">
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-[11px] text-[#dc2626] flex items-center gap-2">
            <AlertCircle size={12} /> {error}
          </div>
        )}
        {mode.kind === 'group' && <GroupSessionPanel employees={employees} />}
        {mode.kind === 'dm' && (
          <DmPanel
            employee={mode.employee}
            onBack={() => setMode({ kind: 'group' })}
          />
        )}
      </main>
    </div>
  );
}
