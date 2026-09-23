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
  hydrateRegisteredArtifacts,
  normalizeTurnUsage,
  toolLabel,
  transcriptText,
  startUserTurn,
} from './hm-rooms-dsh/workrun-view';
import { WorkRunShell } from './workrun';
import * as WorkRunModules from './workrun';

function flattenMsg(msg) {
  if (!msg) return { role: 'assistant', text: '', tools: [], thinking: '', timeline: [] };
  const role = msg.role || 'assistant';
  const raw = msg.content ?? msg.text ?? msg.message ?? '';
  const blocks = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && raw.type ? [raw] : [{ type: 'text', text: transcriptText(raw) }]);
  let text = '';
  let thinking = '';
  const tools = [];
  const timeline = [];
  const lastToolIndex = blocks.reduce((last, block, index) => (
    /^(tool_call|tool-call|tool_result|tool-result)$/.test(String(block?.type || '').toLowerCase()) ? index : last
  ), -1);
  blocks.forEach((b, index) => {
    const t = String(b.type || '').toLowerCase();
    const value = transcriptText(b.thinking ?? b.text ?? b.delta ?? b.content ?? '');
    if (t === 'text') {
      if (index > lastToolIndex) text += value;
      else if (value) timeline.push({ id: b.id || `thinking-text-${index}`, kind: 'thinking', text: value, status: 'complete' });
    } else if (t === 'thinking') {
      thinking += value;
      if (value) timeline.push({ id: b.id || `thinking-${index}`, kind: 'thinking', text: value, status: 'complete' });
    }
    else if (t === 'tool_call' || t === 'tool-call') {
      const name = b.name || b.tool_name || 'Tool';
      const tool = { name, label: toolLabel(name), state: b.state || 'done', id: b.id, input: b.input || b.arguments, result: b.result || b.output };
      tools.push(tool);
      timeline.push({ ...tool, kind: 'tool', id: b.id || `tool-${index}`, status: tool.state });
    } else if (t === 'tool_result' || t === 'tool-result') {
      const id = b.tool_call_id || b.id;
      const previous = [...timeline].reverse().find((item) => item.kind === 'tool' && ((id && item.id === id) || !id));
      if (previous) {
        previous.state = 'done';
        previous.status = 'done';
        previous.result = transcriptText(value || b.output || b.result || '');
      }
    }
  });
  const usage = normalizeTurnUsage(msg.usage || msg.metrics || msg.telemetry || msg.metadata?.usage);
  return { role, text, tools, thinking, timeline, usage, raw: msg, streaming: false, stage: 'complete' };
}

function isTurnCompleteEvent(ev, type, nextView) {
  const name = String(ev?.t || '').toLowerCase();
  const status = String(ev?.status || '').toLowerCase();
  const terminalFailure = ['WORKRUN.FAILED', 'WORKRUN.CANCELLED', 'TURN.FAILED', 'TURN.CANCELLED'].includes(type)
    || ['workrun.failed', 'workrun.cancelled', 'turn.failed', 'turn.cancelled'].includes(name)
    || (name === 'workrun.state' && ['failed', 'cancelled'].includes(status));
  const terminalSuccess = ['WORKRUN.COMPLETED', 'TURN.COMPLETED', 'REPLY_END'].includes(type)
    || ['workrun.completed', 'turn.completed'].includes(name)
    || (name === 'workrun.state' && status === 'completed');
  return terminalFailure || ((terminalSuccess
    || (name === 'agent.status' && ['idle', 'completed', 'failed', 'cancelled'].includes(status)))
    && !hasRunningTools(nextView));
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
  const liveReplyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let liveEventCount = 0;
    const seen = new Set();
    liveReplyRef.current = false;
    setRun(null);
    setMsgs([]);
    setPhase('idle');
    setError(null);
    setView(emptyWorkRunView(runId));

    const sessionEventNames = [
      'reply_start', 'reply_end', 'text_block_delta', 'text_block_end',
      'thinking_block_delta', 'thinking_block_end', 'tool_call_start', 'tool_call_end', 'tool_result_end',
      'custom', 'require_user_confirm', 'REPLY_START', 'REPLY_END', 'TEXT_BLOCK_DELTA', 'TEXT_BLOCK_END',
      'THINKING_BLOCK_DELTA', 'THINKING_BLOCK_END', 'TOOL_CALL_START', 'TOOL_CALL_END', 'TOOL_RESULT_END',
      'tool.started', 'tool.completed', 'artifact.created', 'agent.status', 'plan.updated', 'task_plan',
      'turn.started', 'thinking.delta', 'text.delta', 'tool.output.delta', 'tool.input.delta', 'turn.completed', 'turn.failed', 'turn.cancelled',
      'turn.usage', 'usage', 'model.usage', 'computer.started', 'computer.updated', 'computer.screenshot', 'computer.human_required', 'computer.completed', 'computer.failed',
      'approval.requested', 'external_action.pending', 'external_action.resolved', 'team.member.started', 'team.updated',
      'workrun.failed', 'workrun.completed', 'workrun.cancelled', 'workrun.state',
    ];
    const progressEventNames = [
      'tool.started', 'tool.completed', 'artifact.created', 'agent.status', 'plan.updated', 'task_plan',
      'turn.started', 'thinking.delta', 'text.delta', 'tool.output.delta', 'tool.input.delta', 'turn.completed', 'turn.failed', 'turn.cancelled',
      'turn.usage', 'usage', 'model.usage', 'computer.started', 'computer.updated', 'computer.screenshot', 'computer.human_required', 'computer.completed', 'computer.failed',
      'approval.requested', 'external_action.pending', 'external_action.resolved', 'team.member.started', 'team.updated',
      'workrun.failed', 'workrun.completed', 'workrun.cancelled', 'workrun.state',
    ];
    const onEvt = (msg) => {
      if (!msg?.data) return;
      let ev;
      try { ev = JSON.parse(msg.data); } catch { return; }
      const parsedType = eventType(ev);
      const type = parsedType && parsedType !== 'CUSTOM'
        ? parsedType
        : String(ev.name || ev.event || msg.type || '').toUpperCase();
      ev.type = ev.type || type;
      ev.t = ev.t || (String(ev.name || msg.type || '').includes('.') ? String(ev.name || msg.type).toLowerCase() : undefined);
      const eventIdentity = ev.event_id || ev.sequence || ev.seq || msg.lastEventId;
      if (eventIdentity) {
        const fingerprint = `${eventIdentity}:${type}`;
        if (seen.has(fingerprint)) return;
        seen.add(fingerprint);
      }
      liveEventCount += 1;
      const lowerName = String(ev.t || '').toLowerCase();
      const isTurnEvent = ['REPLY_START', 'TURN.STARTED', 'TEXT_BLOCK_DELTA', 'TEXT.DELTA', 'THINKING_BLOCK_DELTA', 'THINKING.DELTA', 'TOOL_CALL_START', 'TOOL.STARTED', 'TOOL_CALL_END', 'TOOL_COMPLETED', 'TOOL.COMPLETED', 'TOOL.OUTPUT.DELTA'].includes(type)
        || ['turn.started', 'thinking.delta', 'text.delta', 'tool.started', 'tool.completed', 'tool.output.delta'].includes(lowerName);
      if (isTurnEvent) liveReplyRef.current = true;
      if (liveReplyRef.current && ['REPLY_START', 'TURN.STARTED', 'TEXT_BLOCK_DELTA', 'TEXT.DELTA', 'THINKING_BLOCK_DELTA', 'THINKING.DELTA', 'TOOL_CALL_START', 'TOOL.STARTED'].includes(type)) {
        setPhase('streaming');
      }
      setError(null);
      setView((previous) => {
        const next = applyWorkRunEvent(previous, ev);
        if (liveReplyRef.current && isTurnCompleteEvent(ev, type, next)) {
          liveReplyRef.current = false;
          setPhase('idle');
          setMsgs((messages) => messages.map((message) => (
            message.role === 'assistant' ? { ...message, streaming: false, stage: 'complete' } : message
          )));
        }
        if (['WORKRUN.COMPLETED', 'WORKRUN.FAILED', 'WORKRUN.CANCELLED'].includes(type)
          || ['workrun.completed', 'workrun.failed', 'workrun.cancelled'].includes(String(ev.t || '').toLowerCase())) {
          const status = type.includes('FAILED') || String(ev.t || '').endsWith('failed') ? 'failed'
            : type.includes('CANCELLED') || String(ev.t || '').endsWith('cancelled') ? 'cancelled' : 'completed';
          setRun((current) => ({ ...(current || {}), status }));
          liveReplyRef.current = false;
          setPhase('idle');
        }
        return next;
      });
      if (liveReplyRef.current || ['REPLY_START', 'TURN.STARTED'].includes(type)) {
        setMsgs((previous) => applyAgentEvent(previous, ev));
      }
    };

    // Subscribe before fetching history. New AgentScope deltas must render
    // immediately; history is a fallback/hydration source, not a stream gate.
    const session = new EventSource(apiClient.workRunSessionStreamUrl(runId), { withCredentials: true });
    const progress = new EventSource(apiClient.workRunStreamUrl(runId), { withCredentials: true });
    sessionEventNames.forEach((name) => session.addEventListener(name, onEvt));
    progressEventNames.forEach((name) => progress.addEventListener(name, onEvt));
    session.onmessage = onEvt;
    progress.onmessage = onEvt;
    esRef.current = { session, progress };

    (async () => {
      let row = null;
      try {
        const data = await apiClient.getWorkRun(runId);
        row = data?.workrun || data;
        if (cancelled) return;
        setRun(row);
        (row?.events || []).forEach((ev) => {
          setView((prev) => applyWorkRunEvent(prev, ev));
        });
        setView((prev) => hydrateRegisteredArtifacts(prev, row?.result_artifacts || row?.artifacts || row?.result_artifact_ids || row?.artifact_ids));
        const history = await apiClient.getWorkRunSessionMessages(runId).catch(() => null);
        const list = history?.messages || history?.items || [];
        if (Array.isArray(list) && list.length && liveEventCount === 0) {
          const normalized = list.map(flattenMsg).map((message) => (
            ['failed', 'completed', 'cancelled'].includes(String(row?.status || '').toLowerCase())
              ? { ...message, streaming: false, stage: 'complete' }
              : message
          ));
          const hasPrompt = normalized.some((message) => message.role === 'user');
          setMsgs(row?.goal && !hasPrompt ? [{ role: 'user', text: transcriptText(row.goal), timeline: [], tools: [] }, ...normalized] : normalized);
        } else if (row?.goal && liveEventCount === 0) {
          const hasStoredActivity = (row?.events || []).some((ev) => /tool|thinking|text|reply/i.test(`${ev?.type || ''} ${ev?.t || ''}`));
          setMsgs([
            { role: 'user', text: transcriptText(row.goal), timeline: [], tools: [] },
            ...(hasStoredActivity ? [{ role: 'assistant', text: '', thinking: '', tools: [], timeline: [], streaming: false, stage: 'complete' }] : []),
          ]);
        } else if (row?.goal && liveEventCount > 0) {
          setMsgs((previous) => {
            const withPrompt = previous.some((message) => message.role === 'user')
              ? previous
              : [{ role: 'user', text: transcriptText(row.goal), timeline: [], tools: [] }, ...previous];
            return withPrompt.some((message) => message.role === 'assistant')
              ? withPrompt
              : [...withPrompt, { role: 'assistant', text: '', thinking: '', tools: [], timeline: [], streaming: liveReplyRef.current }];
          });
        }
        if (['failed', 'completed', 'cancelled'].includes(String(row?.status || '').toLowerCase())) {
          setPhase('idle');
          liveReplyRef.current = false;
          session.close();
          progress.close();
          setMsgs((previous) => previous.map((message) => ({ ...message, streaming: false, stage: 'complete' })));
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err.message);
      }
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
    liveReplyRef.current = true;
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
      tasks={view.tasks || []}
      approvals={view.approvals}
      artifacts={artifacts}
      sources={sources}
      team={team}
      files={[]}
      computer={view.computer || null}
      preview={preview}
      draft={draft}
      error={error || view.failure?.message}
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
