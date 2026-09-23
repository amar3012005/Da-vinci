import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';
import './hm-rooms-dsh/tokens.css';
import {
  applyAgentEvent,
  applyWorkRunEvent,
  emptyWorkRunView,
  eventType,
  hasRunningTools,
  startUserTurn,
} from './hm-rooms-dsh/workrun-view';
import { WorkRunShell } from './workrun';
import * as WorkRunModules from './workrun';

function toUiText(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try { return JSON.stringify(value); } catch { return String(value); }
}

function flattenMsg(msg) {
  if (!msg) return { role: 'assistant', text: '', tools: [], thinking: '' };
  const role = msg.role || 'assistant';
  const blocks = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: String(msg.content || '') }];
  let text = '';
  let thinking = '';
  const tools = [];
  blocks.forEach((b) => {
    const t = String(b.type || '').toLowerCase();
    if (t === 'text') text += toUiText(b.text ?? b.delta);
    else if (t === 'thinking') thinking += toUiText(b.thinking ?? b.text);
    else if (t === 'tool_call' || t === 'tool-call') {
      tools.push({ name: b.name || b.tool_name || 'Tool', state: b.state || 'done', id: b.id, input: b.input || b.arguments, result: b.result || b.output });
    }
  });
  return { role, text, tools, thinking, raw: msg, streaming: false };
}





function HmRoomList() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [runs, setRuns] = useState([]);
  const [goal, setGoal] = useState('');
  const [error, setError] = useState(null);
  const [navOpen, setNavOpen] = useState(true);

  useEffect(() => {
    apiClient.listWorkRuns({ limit: 24 }).then((d) => setRuns(d?.workruns || [])).catch(() => {});
  }, []);

  const start = async (e) => {
    e?.preventDefault?.();
    const text = String(goal).trim();
    if (!text) return;
    try {
      const data = await apiClient.createWorkRun({ goal: text });
      const id = data?.workrun?.id || data?.id;
      if (!id) throw new Error('No workrun id returned');
      navigate(`/hivemind/app/hm-rooms/${id}`);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Dispatch failed');
    }
  };

  return (
    <WorkRunShell
      landing
      runs={(runs || [])}
      draft={goal}
      error={error}
      navOpen={navOpen}
      onNavOpen={setNavOpen}
      onNavigate={navigate}
      onNewWork={() => navigate('/hivemind/app/hm-rooms')}
      onDraft={setGoal}
      onSend={start}
      userLabel={(user?.display_name || user?.email || '').split(' ')[0] || 'Account'}
      onSignOut={async () => { try { await logout(); } catch { /* noop */ } navigate('/hivemind/login'); }}
    />
  );
}

function HmRoomDesk({ runId }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [view, setView] = useState(() => emptyWorkRunView(runId));
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [navOpen, setNavOpen] = useState(true);
  const [preview, setPreview] = useState(null);
  const esRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let row = null;
      try {
        setView(emptyWorkRunView(runId));
        const data = await apiClient.getWorkRun(runId);
        row = data?.workrun || data;
        if (cancelled) return;
        setRun(row);
        (row?.events || []).forEach((ev) => {
          setView((prev) => applyWorkRunEvent(prev, ev));
        });
        const history = await apiClient.getWorkRunSessionMessages(runId).catch(() => null);
        const list = history?.messages || history?.items || [];
        if (Array.isArray(list) && list.length) {
          setMsgs(list.map(flattenMsg).map((m) => (
            row?.status === 'failed' || row?.status === 'completed'
              ? { ...m, streaming: false }
              : m
          )));
        } else if (row?.goal) {
        setMsgs([{ role: 'user', text: row.goal, tools: [], thinking: '' }]);
        }
        if (row?.status === 'failed' || row?.status === 'completed') {
          setPhase('idle');
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err.message);
      }

      const terminal = ['failed', 'completed', 'cancelled'].includes(String(row?.status || ''));
      if (terminal) return;

      const es = new EventSource(apiClient.workRunSessionStreamUrl(runId), { withCredentials: true });
      const seen = new Set();
      const onEvt = (msg) => {
        if (!msg?.data) return;
        let ev;
        try { ev = JSON.parse(msg.data); } catch { return; }
        const parsedType = eventType(ev);
        const type = parsedType && parsedType !== 'CUSTOM'
          ? parsedType
          : String(ev.name || ev.event || msg.type || '').toUpperCase();
        ev.type = type;
        ev.t = ev.t || (String(ev.name || msg.type || '').includes('.') ? String(ev.name || msg.type).toLowerCase() : undefined);
        const eventIdentity = ev.event_id || ev.sequence || ev.seq || msg.lastEventId;
        if (eventIdentity) {
          const fingerprint = `${eventIdentity}:${type}`;
          if (seen.has(fingerprint)) return;
          seen.add(fingerprint);
        }
        if (type === 'REPLY_START' || type === 'TURN.STARTED' || type === 'TEXT_BLOCK_DELTA' || type === 'TEXT.DELTA' || type === 'THINKING_BLOCK_DELTA' || type === 'THINKING.DELTA' || type === 'TOOL_CALL_START' || type === 'TOOL.STARTED') {
          setPhase('streaming');
        }
        setMsgs((prev) => applyAgentEvent(prev, ev));
        setView((prev) => {
          const next = applyWorkRunEvent(prev, ev);
          if (type === 'REPLY_END' || type === 'TURN.COMPLETED' || type === 'TURN.FAILED' || type === 'TURN.CANCELLED' || type === 'WORKRUN.COMPLETED' || type === 'WORKRUN.FAILED') {
            setPhase(hasRunningTools(next) ? 'streaming' : 'idle');
          }
          return next;
        });
      };
      [
        'reply_start', 'reply_end', 'text_block_delta', 'text_block_end',
        'thinking_block_delta', 'thinking_block_end', 'tool_call_start', 'tool_call_end', 'tool_result_end',
        'custom', 'require_user_confirm',
        'REPLY_START', 'REPLY_END', 'TEXT_BLOCK_DELTA', 'TEXT_BLOCK_END',
        'THINKING_BLOCK_DELTA', 'THINKING_BLOCK_END', 'TOOL_CALL_START', 'TOOL_CALL_END', 'TOOL_RESULT_END',
        'tool.started', 'tool.completed', 'artifact.created', 'agent.status',
        'turn.started', 'thinking.delta', 'text.delta', 'tool.output.delta', 'turn.completed', 'turn.failed', 'turn.cancelled',
        'computer.started', 'computer.updated', 'computer.screenshot', 'computer.human_required', 'computer.completed', 'computer.failed',
        'approval.requested', 'team.member.started', 'workrun.failed', 'workrun.completed',
      ].forEach((n) => es.addEventListener(n, onEvt));
      es.onmessage = onEvt;
      const progress = new EventSource(apiClient.workRunStreamUrl(runId), { withCredentials: true });
      [
        'tool.started', 'tool.completed', 'artifact.created', 'agent.status',
        'turn.started', 'thinking.delta', 'text.delta', 'tool.output.delta', 'turn.completed', 'turn.failed', 'turn.cancelled',
        'computer.started', 'computer.updated', 'computer.screenshot', 'computer.human_required', 'computer.completed', 'computer.failed',
        'approval.requested', 'team.member.started', 'workrun.failed', 'workrun.completed',
      ].forEach((n) => progress.addEventListener(n, onEvt));
      progress.onmessage = onEvt;
      esRef.current = { session: es, progress };
    })();
    return () => {
      cancelled = true;
      if (esRef.current?.session) esRef.current.session.close();
      else if (esRef.current?.close) esRef.current.close();
      if (esRef.current?.progress) esRef.current.progress.close();
    };
  }, [runId]);

  useEffect(() => {
    apiClient.listWorkRuns({ limit: 16 }).then((data) => setRuns(data?.workruns || [])).catch(() => {});
  }, [runId]);

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMsgs((prev) => startUserTurn(prev, text));
    setPhase('acknowledging');
    try {
      await apiClient.sendWorkRunChat(runId, text);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      setPhase('idle');
    }
  };

  const stop = async () => {
    try {
      await apiClient.cancelWorkRun(runId);
      setMsgs((prev) => prev.map((m, i) => i === prev.length - 1 && m.role === 'assistant' ? { ...m, streaming: false } : m));
      setPhase('idle');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not stop the current run');
    }
  };

  const sources = view.sources || [];
  const activity = view.activity || [];
  const artifacts = view.artifacts || [];
  const team = view.team || [];
  const inspectOpen = true;
  const working = phase === 'acknowledging' || phase === 'streaming' || hasRunningTools(view);
  void inspectOpen;

  return (
    <WorkRunShell
      goal={run?.goal}
      status={run?.status}
      working={working}
      runs={(runs || [])}
      runId={runId}
      msgs={msgs}
      activity={activity}
      tasks={activity.filter((item) => item.kind === 'plan')}
      approvals={view.approvals}
      artifacts={artifacts}
      sources={sources}
      team={team}
      files={[]}
      computer={view.computer || null}
      preview={preview}
      draft={draft}
      error={error}
      navOpen={navOpen}
      onNavOpen={setNavOpen}
      onNavigate={navigate}
      onNewWork={() => navigate('/hivemind/app/hm-rooms')}
      onPreview={setPreview}
      onDraft={setDraft}
      onSend={send}
      onStop={stop}
      userLabel={(user?.display_name || user?.email || '').split(' ')[0] || 'Account'}
      onSignOut={async () => { try { await logout(); } catch { /* noop */ } navigate('/hivemind/login'); }}
      phase={phase}
      startedAt={run?.created_at || run?.createdAt}
    />
  );
}

export default function HmRooms() {
  const { runId } = useParams();
  if (runId) return <HmRoomDesk runId={runId} />;
  return <HmRoomList />;
}

export { HmRoomList, HmRoomDesk, WorkRunModules };
