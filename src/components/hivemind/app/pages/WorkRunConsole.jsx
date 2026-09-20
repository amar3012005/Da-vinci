/**
 * WorkRun Console
 *
 * The existing WorkRun centre (stream + composer) is deliberately retained.
 * This page supplies the legacy HyperAgents room framing around it and only
 * projects facts received from the durable WorkRun/AgentScope event streams.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Brain, ChevronDown, Code2, FileText, Globe, Hash, Monitor, Plus, Send, Sparkles, Wrench } from 'lucide-react';
import apiClient from '../shared/api-client';

const stripWorkOrder = (value) => String(value || '').split('Work autonomously to completion')[0].trim();
const eventType = (event) => String(event?.type || event?.t || '').toUpperCase();
const eventText = (event) => String(event?.delta || event?.text || event?.content || event?.output || event?.thinking || '');
const merge = (previous, next) => !next ? previous : !previous || next.startsWith(previous) ? next : previous.endsWith(next) || previous.includes(next) ? previous : `${previous}${next}`;
const toolName = (event) => String(event?.tool_call_name || event?.tool_name || event?.tool || event?.name || 'Tool').replace(/^hivemind_/, '').replace(/_/g, ' ');
const legacyRoomPath = (run) => {
  const roomId = typeof run?.room_id === 'string' ? run.room_id : run?.roomId;
  if (!roomId) return `/hivemind/app/employees/workruns/${run?.id || ''}`;
  return `/hivemind/app/employees/rooms/${roomId}?workrun=${encodeURIComponent(run.id)}`;
};

function normalizeMessage(message) {
  if (!message) return null;
  const parts = Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content }];
  const out = { role: message.role || 'assistant', text: '', thinking: '', tools: [], streaming: false };
  parts.forEach((part) => {
    const kind = String(part?.type || '').toLowerCase();
    if (kind === 'thinking') out.thinking += part.thinking || part.text || '';
    else if (kind.includes('tool')) out.tools.push({ id: part.id, name: part.name || part.tool_name || 'Tool', status: part.state || 'complete' });
    else out.text += part?.text || part?.delta || '';
  });
  return out;
}

function applySessionEvent(messages, event) {
  const type = eventType(event);
  const next = messages.map((message) => ({ ...message, tools: [...(message.tools || [])] }));
  const ensureAssistant = () => {
    const tail = next[next.length - 1];
    if (tail?.role === 'assistant') return tail;
    const created = { role: 'assistant', text: '', thinking: '', tools: [], streaming: true };
    next.push(created); return created;
  };
  if (type === 'REPLY_START') { ensureAssistant().streaming = true; return next; }
  if (type === 'TEXT_BLOCK_DELTA' || type === 'TEXT_BLOCK_END') { const message = ensureAssistant(); message.text = merge(message.text, eventText(event)); message.streaming = type !== 'TEXT_BLOCK_END'; return next; }
  if (type === 'THINKING_BLOCK_DELTA' || type === 'THINKING_BLOCK_END') { const message = ensureAssistant(); message.thinking = merge(message.thinking, eventText(event)); message.streaming = true; return next; }
  if (type === 'TOOL_CALL_START' || type === 'TOOL_CALL_END' || type === 'TOOL_RESULT_END') {
    const message = ensureAssistant(); const id = event.tool_call_id || event.id || toolName(event);
    const tool = message.tools.find((item) => item.id === id) || { id, name: toolName(event) };
    tool.status = type === 'TOOL_CALL_START' ? 'running' : 'complete';
    if (!message.tools.includes(tool)) message.tools.push(tool);
    message.streaming = type === 'TOOL_CALL_START'; return next;
  }
  if (type === 'REPLY_END') { const tail = next[next.length - 1]; if (tail?.role === 'assistant') tail.streaming = false; }
  return next;
}

function eventLabel(event) {
  const type = String(event?.t || eventType(event)).toLowerCase();
  if (type.includes('tool')) return toolName(event);
  if (type.includes('agent')) return event?.agent || event?.member || event?.status || 'Agent status updated';
  if (type.includes('artifact')) return event?.path || event?.name || 'Artifact ready';
  if (type.includes('plan')) return 'Plan updated';
  return type.replace(/[._]/g, ' ') || 'Run update';
}

function LegacyRoomRail({ runs, runId, onNew, onOpen }) {
  return <aside className="w-[240px] shrink-0 overflow-hidden border-r border-[#e3e0db] bg-[#faf9f4]">
    <div className="flex h-full flex-col"><div className="px-2 pt-2"><button type="button" onClick={onNew} className="flex w-full items-center gap-2 rounded-lg bg-[#0a0a0a] px-2.5 py-2 text-[12px] font-semibold text-white"><Plus size={13} /> New work</button></div>
      <div className="mt-3 border-y border-[#e3e0db] bg-white/45"><div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-[#525252]"><span className="inline-flex items-center gap-1.5"><Brain size={12} /> WorkRuns</span><ChevronDown size={13} /></div>
        <div className="border-t border-[#e3e0db] pb-1">{runs.map((run) => <button key={run.id} type="button" onClick={() => onOpen(run)} className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors ${run.id === runId ? 'border-violet-500 bg-white' : 'border-transparent hover:bg-white/60'}`}><Hash size={11} className="shrink-0 text-[#a3a3a3]" /><span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#171717]">{stripWorkOrder(run.goal) || run.id.slice(0, 8)}</span>{String(run.status).toLowerCase() === 'running' ? <span className="h-1.5 w-1.5 rounded-full bg-[#117dff] animate-pulse" /> : null}</button>)}</div>
      </div><div className="mt-auto border-t border-[#e3e0db] px-3 py-3 text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">AgentScope WorkRun</div></div>
  </aside>;
}

function AgentBubble({ message }) {
  if (message.role === 'user') return <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-sm bg-[#0a0a0a] px-4 py-3 text-[13px] leading-6 text-white">{message.text}</div>;
  return <section className="max-w-[820px] rounded-xl border border-[#e3e0db] bg-white px-4 py-3 shadow-[0_8px_26px_-22px_rgba(0,0,0,.45)]">
    <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#737373]"><Sparkles size={12} className="text-violet-600" /> AgentScope</div>
    {message.thinking ? <details open={message.streaming} className="mb-3 rounded-lg border border-[#e7e4de] bg-[#faf9f6] px-3 py-2"><summary className="cursor-pointer text-[11px] font-semibold text-[#525252]">Thinking</summary><p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-[#737373]">{message.thinking}</p></details> : null}
    {(message.tools || []).map((tool) => <div key={tool.id || tool.name} className="mb-2 flex items-center gap-2 rounded-md border border-[#e7e4de] px-2.5 py-2 text-[11px] text-[#404040]"><Wrench size={12} className={tool.status === 'running' ? 'animate-pulse text-[#117dff]' : 'text-[#10b981]'} /><span className="capitalize">{tool.name}</span><span className="ml-auto font-mono text-[9px] uppercase text-[#a3a3a3]">{tool.status}</span></div>)}
    {message.text ? <p className="whitespace-pre-wrap text-[14px] leading-7 text-[#292824]">{message.text}{message.streaming ? <span className="ml-1 inline-block h-[1em] w-px animate-pulse bg-current align-[-.15em]" /> : null}</p> : message.streaming ? <p className="text-[12px] text-[#737373]">Working…</p> : null}
  </section>;
}

function WorkRunCentre({ messages, draft, setDraft, sending, onSend, activities, failure }) {
  return <main className="flex min-w-0 flex-1 flex-col bg-[#f7f6f3]"><div className="flex-1 overflow-y-auto px-8 py-7"><div className="mx-auto flex max-w-[860px] flex-col gap-5">{messages.map((message, index) => <AgentBubble key={`${message.role}-${index}`} message={message} />)}{activities.slice(-4).map((event, index) => <div key={`${eventLabel(event)}-${index}`} className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#737373]"><span className="h-1.5 w-1.5 rounded-full bg-[#117dff]" />{eventLabel(event)}</div>)}{failure ? <p className="text-[12px] text-[#b45309]">{failure}</p> : null}</div></div>
    <form onSubmit={onSend} className="shrink-0 px-6 pb-4"><div className="mx-auto max-w-[760px] rounded-2xl border border-[#d9d5cd] bg-white p-2 shadow-[0_12px_34px_-24px_rgba(0,0,0,.42)]"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend(event); } }} rows={2} placeholder="Give this WorkRun its next instruction…" className="w-full resize-none bg-transparent px-2 py-1 text-[13px] outline-none placeholder:text-[#a3a3a3]" /><div className="flex items-center justify-between px-1"><span className="text-[10px] text-[#a3a3a3]">Enter to send · Shift+Enter for line break</span><button type="submit" disabled={!draft.trim() || sending} className="grid h-8 w-8 place-items-center rounded-lg bg-[#0a0a0a] text-white disabled:opacity-40"><Send size={13} /></button></div></div></form>
  </main>;
}

function Inspector({ events, status }) {
  const artifacts = events.filter((event) => String(event?.t || '').includes('artifact'));
  const computer = events.filter((event) => /computer|browser|playwright/i.test(JSON.stringify(event)));
  return <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-[#eceae6] bg-[#fafafa]"><div className="flex h-10 shrink-0 items-center justify-between border-b border-[#eceae6] px-3 text-[#a3a3a3]"><Globe size={14} /><Code2 size={14} /></div><div className="border-b border-[#eceae6] px-4 py-3"><p className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">Live preview</p><p className="mt-1 text-[13px] font-semibold text-[#171717]">{status || 'Waiting for run'}</p></div><div className="flex-1 overflow-y-auto p-4"><section className="rounded-xl border border-[#e7e4de] bg-white p-3"><div className="flex items-center gap-2 text-[12px] font-semibold text-[#292824]"><Monitor size={14} className="text-[#117dff]" /> Computer use</div><p className="mt-2 text-[11px] leading-5 text-[#737373]">{computer.length ? 'A computer-use event is attached to this run.' : 'Computer use appears here only when the runtime emits a browser or computer event.'}</p></section><section className="mt-4"><p className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">Artifacts</p>{artifacts.length ? artifacts.map((event, index) => <div key={index} className="mt-2 flex items-center gap-2 rounded-lg border border-[#e7e4de] bg-white px-3 py-2 text-[11px] text-[#404040]"><FileText size={13} />{event?.path || event?.name || 'Artifact ready'}</div>) : <p className="mt-2 text-[11px] text-[#737373]">Persisted artifacts will appear here.</p>}</section></div></aside>;
}

export default function WorkRunConsole() {
  const { runId } = useParams(); const navigate = useNavigate();
  const [runs, setRuns] = useState([]); const [run, setRun] = useState(null); const [messages, setMessages] = useState([]); const [events, setEvents] = useState([]); const [draft, setDraft] = useState(''); const [failure, setFailure] = useState(''); const [sending, setSending] = useState(false);
  const sources = useRef([]);
  // Match the legacy Room canvas: this console owns its left rail, so the
  // application navigation collapses while the user is inside a WorkRun.
  useEffect(() => {
    window.dispatchEvent(new Event('hivemind:close-sidebar'));
    return () => window.dispatchEvent(new Event('hivemind:open-sidebar'));
  }, []);
  const load = useCallback(async () => { const data = await apiClient.listWorkRuns({ limit: 24 }); setRuns(data?.workruns || []); }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  useEffect(() => { let cancelled = false; let session; let progress;
    // The collection route is the new-WorkRun composer.  It intentionally has
    // no id yet, so querying `/v1/workruns/undefined` here used to surface a
    // misleading "Not found" error before an operator had even supplied work.
    if (!runId) {
      setRun(null); setMessages([]); setEvents([]); setFailure('');
      return () => {};
    }
    const receive = (message) => { try { const event = JSON.parse(message.data); if (cancelled) return; setEvents((previous) => [...previous.slice(-99), event]); setMessages((previous) => applySessionEvent(previous, event)); if (String(event?.t || '') === 'workrun.failed') setFailure(event?.reason || 'This WorkRun could not continue.'); } catch { /* malformed SSE is ignored */ } };
    (async () => { try { const data = await apiClient.getWorkRun(runId); const row = data?.workrun || data; if (cancelled) return; setRun(row); const history = await apiClient.getWorkRunSessionMessages(runId).catch(() => null); const loaded = (history?.messages || history?.items || []).map(normalizeMessage).filter(Boolean); setMessages(loaded.length ? loaded : row?.goal ? [{ role: 'user', text: stripWorkOrder(row.goal) }] : []); (row?.events || []).forEach((event) => setEvents((previous) => [...previous, event])); if (['completed', 'failed', 'cancelled'].includes(String(row?.status || ''))) return; session = new EventSource(apiClient.workRunSessionStreamUrl(runId), { withCredentials: true }); progress = new EventSource(apiClient.workRunStreamUrl(runId), { withCredentials: true }); ['reply_start','reply_end','text_block_delta','text_block_end','thinking_block_delta','thinking_block_end','tool_call_start','tool_call_end','tool_result_end','custom','require_user_confirm'].forEach((name) => session.addEventListener(name, receive)); session.onmessage = receive; ['tool.started','tool.completed','artifact.created','agent.status','approval.requested','team.member.started','workrun.failed','workrun.completed'].forEach((name) => progress.addEventListener(name, receive)); progress.onmessage = receive; sources.current = [session, progress]; } catch (error) { if (!cancelled) setFailure(error?.response?.data?.error || error.message); } })(); return () => { cancelled = true; (sources.current || []).forEach((source) => source?.close()); }; }, [runId]);
  const onSend = async (event) => { event.preventDefault(); const content = draft.trim(); if (!content || sending) return; setFailure(''); setSending(true);
    try {
      if (!runId) {
        const data = await apiClient.createWorkRun({ goal: content });
        const created = data?.workrun || data;
        if (!created?.id) throw new Error('The control plane did not return a WorkRun id.');
        setDraft(''); await load(); navigate(legacyRoomPath(created)); return;
      }
      setDraft(''); setMessages((previous) => [...previous, { role: 'user', text: content }, { role: 'assistant', text: '', thinking: '', tools: [], streaming: true }]);
      await apiClient.sendWorkRunChat(runId, content);
    } catch (error) { setFailure(error?.response?.data?.error || error.message); } finally { setSending(false); }
  };
  const status = useMemo(() => String(run?.status || (runId ? 'loading' : 'ready')), [run, runId]);
  return <div className="flex h-full min-h-0 bg-[#f7f6f3]"><LegacyRoomRail runs={runs} runId={runId} onNew={() => navigate('/hivemind/app/employees/workruns')} onOpen={(selected) => navigate(legacyRoomPath(selected))} /><div className="flex min-w-0 flex-1 flex-col"><header className="flex h-12 shrink-0 items-center justify-between border-b border-[#e3e0db] bg-[#faf9f4] px-5"><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#171717]">{stripWorkOrder(run?.goal) || (runId ? 'WorkRun' : 'New WorkRun')}</p></div><span className="rounded-full border border-[#bfd3ff] bg-white px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[#185bcc]">{status}</span></header><div className="flex min-h-0 flex-1"><WorkRunCentre messages={messages} draft={draft} setDraft={setDraft} sending={sending} onSend={onSend} activities={events} failure={failure} /><Inspector events={events} status={status} /></div></div></div>;
}

export { legacyRoomPath };
