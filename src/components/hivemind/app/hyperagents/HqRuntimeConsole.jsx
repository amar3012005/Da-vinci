import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BookOpen, Check, Clock3, Cable, Send,
  Loader2, Moon, Pause, Play, Power, RefreshCw, ShieldCheck, Sparkles,
  TerminalSquare, Wrench, X,
} from 'lucide-react';
import apiClient from '../shared/api-client';

const EXECUTION_TYPES = new Set(['skill_loaded', 'tool_started', 'tool_result', 'schedule_created', 'verification']);
const EXECUTION_META = {
  skill_loaded: [Sparkles, 'Method', 'text-[#275fd1]', 'bg-[#eaf1ff]'],
  tool_started: [Wrench, 'Using', 'text-[#275fd1]', 'bg-[#eaf1ff]'],
  tool_result: [Check, 'Returned', 'text-[#328347]', 'bg-[#eaf8ee]'],
  schedule_created: [Clock3, 'Scheduled', 'text-[#6c6257]', 'bg-[#f2f0eb]'],
  verification: [ShieldCheck, 'Verified', 'text-[#328347]', 'bg-[#eaf8ee]'],
};
const fmtTime = (value) => value ? new Date(value).toLocaleTimeString([], {
  hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2,
}) : '';
const mergeEvents = (current, incoming) => {
  const rows = new Map(current.map((item) => [String(item.sequence), item]));
  incoming.forEach((item) => rows.set(String(item.sequence), item));
  return [...rows.values()].sort((a, b) => Number(a.sequence) - Number(b.sequence));
};
const isWorking = (state) => Boolean(state && !['WAITING', 'SLEEPING', 'PAUSED', 'BLOCKED'].includes(state));
const fmtTokens = (value) => Number(value || 0).toLocaleString();
const providerLabel = (value) => String(value || '').split(/[-_]/).map((part) => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ');

function IdentityPulse({ state }) {
  const awake = isWorking(state);
  return <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#737373]">
    <span className={`relative grid h-7 w-7 place-items-center rounded-full border ${awake ? 'border-[#9ebcf2] bg-[#edf4ff] text-[#185bcc]' : 'border-[#dedbd6] bg-white text-[#737373]'}`}>
      <span className="font-serif text-[15px] italic">I</span>
      {awake ? <span className="absolute inset-[-4px] rounded-full border border-[#7ea5eb] animate-ping opacity-30" /> : null}
    </span>
    {awake ? 'Conscious · working' : state === 'BLOCKED' ? 'Attention required' : state === 'PAUSED' ? 'Paused' : 'Listening'}
  </div>;
}

export function HqRuntimeRail({ baselineReady }) {
  const [runtime, setRuntime] = useState(null);
  const [work, setWork] = useState({ work_orders: [], schedules: [] });
  useEffect(() => {
    let active = true;
    const load = () => Promise.all([apiClient.getHqRuntime(), apiClient.getHqWork()])
      .then(([state, queued]) => { if (active) { setRuntime(state?.runtime || null); setWork(queued || {}); } }).catch(() => {});
    load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const pending = work.work_orders || [];
  const schedules = work.schedules || [];
  return <section className="flex h-full flex-col" aria-label="HQ runtime status">
    <header className="border-b border-[#e3e0db] px-4 py-4">
      <IdentityPulse state={runtime?.state} />
      <h2 className="mt-4 text-[15px] font-semibold text-[#171717]">HQ Runtime</h2>
      <p className="mt-1 text-[10.5px] leading-4 text-[#737373]">Durable company state, delegated work, and scheduled wake-ups.</p>
    </header>
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="grid grid-cols-2 border-y border-[#e3e0db] py-3">
        <div className="border-r border-[#e3e0db] pr-3"><div className="font-mono text-[8px] uppercase text-[#a3a3a3]">State</div><div className="mt-1 text-[10px] font-semibold text-[#171717]">{runtime?.state?.replaceAll('_', ' ') || (baselineReady ? 'READY' : 'BASELINE REQUIRED')}</div></div>
        <div className="pl-3"><div className="font-mono text-[8px] uppercase text-[#a3a3a3]">Active work</div><div className="mt-1 text-[11px] font-semibold text-[#171717]">{pending.length}</div></div>
      </div>
      <div className="mt-5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#a3a3a3]">Checkpoints</div>
      <div className="mt-3">
        {schedules.slice(0, 6).map((item) => <div key={item.id} className="relative border-l border-[#d8d3cc] pb-5 pl-4 last:pb-0"><span className="absolute -left-[5px] top-0 h-[9px] w-[9px] rounded-full border border-[#9ebcf2] bg-white" /><div className="text-[10px] font-medium capitalize text-[#262626]">{String(item.triggerType || 'checkpoint').replaceAll('_', ' ')}</div><div className="mt-1 font-mono text-[8px] text-[#a3a3a3]">{new Date(item.dueAt).toLocaleString()}</div></div>)}
        {!schedules.length ? <p className="text-[10px] leading-4 text-[#a3a3a3]">HQ wakes when a material event or scheduled checkpoint arrives.</p> : null}
      </div>
      {pending.length ? <><div className="mt-6 font-mono text-[8px] uppercase tracking-[0.14em] text-[#a3a3a3]">In progress</div>{pending.slice(0, 4).map((item) => <div key={item.id} className="mt-3 border-l-2 border-[#185bcc] pl-3"><div className="text-[10px] font-medium text-[#262626]">{item.title || item.objective || 'Bounded work order'}</div><div className="mt-1 text-[9px] capitalize text-[#737373]">{String(item.status || 'queued').replaceAll('_', ' ')}</div></div>)}</> : null}
    </div>
  </section>;
}

function StreamedText({ children, active = false, className = '' }) {
  const text = String(children || '');
  const [visible, setVisible] = useState(active ? '' : text);
  useEffect(() => {
    if (!active) { setVisible(text); return undefined; }
    setVisible('');
    let index = 0;
    const step = Math.max(1, Math.ceil(text.length / 90));
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + step);
      setVisible(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [active, text]);
  return <p className={className}>{visible}{active && visible.length < text.length ? <span className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-current align-[-0.12em]" /> : null}</p>;
}

function ExecutionTrace({ items }) {
  return <div className="my-5 ml-1 border-l border-[#ddd9d1] pl-5">
    {items.map((item, index) => {
      const [Icon, label, tone, bubble] = EXECUTION_META[item.eventType] || [Activity, 'Runtime', 'text-[#525252]', 'bg-[#f2f0eb]'];
      const reference = item.skillRef ? item.skillRef : item.toolRef;
      const result = item.eventType === 'tool_result' || item.eventType === 'verification';
      return <div key={item.id || item.sequence} className={`relative flex gap-3 ${index < items.length - 1 ? 'pb-3' : ''}`}>
        <span className={`absolute -left-[27px] top-0 grid h-3 w-3 place-items-center bg-[#fbfaf7] ${tone}`}><Icon size={12} /></span>
        <div className="min-w-0 text-[12.5px] leading-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-[4px] px-2 py-0.5 font-mono text-[11px] ${bubble} ${tone}`}>{label}: {reference || item.title}</span>
            <ArrowRight size={12} className={result ? 'text-[#328347]' : 'text-[#8a8577]'} />
            <span className={result ? 'text-[#328347]' : 'text-[#777168]'}>{item.summary || item.title}</span>
          </div>
        </div>
      </div>;
    })}
  </div>;
}

function NarrativeEvent({ item, active }) {
  const wake = item.eventType === 'wake';
  const sleep = item.eventType === 'sleep';
  const blocked = item.eventType === 'blocked';
  const verdict = ['decision', 'work_order_created', 'blocked'].includes(item.eventType);
  const Icon = wake ? Power : sleep ? Moon : blocked ? AlertTriangle : item.eventType === 'work_order_created' ? TerminalSquare : Activity;
  if (wake || sleep) return <div className="my-7 first:mt-0">
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8577]"><Icon size={13} className={wake ? 'text-[#185bcc]' : ''} />{wake ? '[ Waking up ]' : '[ Sleeping ]'}<time className="ml-auto text-[8px] tracking-normal text-[#aaa49c]">{fmtTime(item.createdAt)}</time></div>
    <StreamedText active={active} className="mt-3 max-w-4xl font-serif text-[19px] leading-8 text-[#292824]">{item.summary}</StreamedText>
  </div>;
  return <div className={`my-5 max-w-4xl ${blocked ? 'border-l-2 border-[#d94841] pl-4' : ''}`}>
    <div className="mb-1.5 flex items-center gap-2 text-[12px] text-[#8a8577]"><Icon size={13} /><span>{item.title}</span><time className="ml-auto font-mono text-[8px] text-[#aaa49c]">{fmtTime(item.createdAt)}</time></div>
    <StreamedText active={active} className={verdict ? 'font-serif text-[19px] leading-8 text-[#24231f]' : 'text-[15px] leading-7 text-[#45423d]'}>{item.summary}</StreamedText>
  </div>;
}

function RuntimeTranscript({ events, state }) {
  const working = isWorking(state);
  const chunks = [];
  for (const item of events) {
    if (EXECUTION_TYPES.has(item.eventType)) {
      const last = chunks.at(-1);
      if (last?.type === 'execution') last.items.push(item);
      else chunks.push({ type: 'execution', items: [item] });
    } else chunks.push({ type: 'narrative', item });
  }
  const latestSequence = String(events.at(-1)?.sequence || '');
  return <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
    <div className="mb-8 flex items-center gap-2 text-[14px] font-medium text-[#777168]"><Clock3 size={15} />HQ is thinking aloud</div>
    {chunks.map((chunk, index) => chunk.type === 'execution'
      ? <ExecutionTrace key={`execution-${chunk.items[0]?.sequence}`} items={chunk.items} />
      : <NarrativeEvent key={chunk.item.id || chunk.item.sequence} item={chunk.item} active={working && String(chunk.item.sequence) === latestSequence} />)}
    {working ? <div className="mt-7 flex items-center gap-3 text-[#777168]"><span className="relative grid h-7 w-7 place-items-center font-serif text-[18px] italic text-[#185bcc]">I<span className="absolute inset-0 rounded-full border border-[#9ebcf2] animate-ping opacity-30" /></span><span className="text-[14px] animate-pulse">I am still working.</span></div> : null}
  </div>;
}

export default function HqRuntimeConsole({ objective, baselineReady, resources }) {
  const [runtime, setRuntime] = useState(null);
  const [usage, setUsage] = useState({ input_tokens: 0, output_tokens: 0 });
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [work, setWork] = useState({ todos: [], capability_requests: [] });
  const [instruction, setInstruction] = useState('');
  const [instructionBusy, setInstructionBusy] = useState(false);
  const [dismissedCapabilityRequestId, setDismissedCapabilityRequestId] = useState(null);
  const cursorRef = useRef('0');
  const capabilityWakeRef = useRef('');
  const load = useCallback(async () => {
    const [state, eventData, workData] = await Promise.all([apiClient.getHqRuntime(), apiClient.getHqEvents('0', 200), apiClient.getHqWork()]);
    setRuntime(state?.runtime || null);
    setUsage(state?.usage || { input_tokens: 0, output_tokens: 0 });
    const rows = eventData?.events || [];
    setEvents(rows);
    setWork(workData || { todos: [], capability_requests: [] });
    cursorRef.current = eventData?.next || rows.at(-1)?.sequence || '0';
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  useEffect(() => {
    if (!runtime?.id) return undefined;
    let source;
    let displayTimer;
    let draining = false;
    const displayQueue = [];
    const drainDisplayQueue = () => {
      const item = displayQueue.shift();
      if (!item) { draining = false; return; }
      draining = true;
      setEvents((current) => mergeEvents(current, [item]));
      displayTimer = window.setTimeout(drainDisplayQueue, 260);
    };
    try { source = new EventSource(apiClient.hqEventStreamUrl(cursorRef.current), { withCredentials: true }); } catch { return undefined; }
    const onEvent = (message) => { try { const item = JSON.parse(message.data); cursorRef.current = String(item.sequence); displayQueue.push(item); if (!draining) drainDisplayQueue(); apiClient.getHqRuntime().then((data) => { setRuntime(data?.runtime || null); setUsage(data?.usage || { input_tokens: 0, output_tokens: 0 }); }).catch(() => {}); } catch { /* malformed edge event */ } };
    source.addEventListener('hq_event', onEvent);
    return () => { source.close(); window.clearTimeout(displayTimer); };
  }, [runtime?.id]);
  useEffect(() => {
    const request = work.capability_requests?.[0];
    if (!request) { capabilityWakeRef.current = ''; return undefined; }
    let active = true;
    const check = async () => {
      try {
        const data = await apiClient.getConnectorConnectionStatus();
        const rows = data?.connectors || data || [];
        const wanted = String(request.provider || '').toLowerCase();
        const connected = Array.isArray(rows) && rows.some((row) => {
          const keys = [row.id, row.provider, row.provider_key, row.name].filter(Boolean).map((value) => String(value).toLowerCase());
          return keys.includes(wanted) && Boolean(row.connection || row.connected || row.status === 'connected' || row.is_active);
        });
        if (active && connected && capabilityWakeRef.current !== request.id) {
          capabilityWakeRef.current = request.id;
          await apiClient.recheckHqCapabilities();
          window.setTimeout(() => load().catch(() => {}), 1200);
        }
      } catch { /* connector catalog may be temporarily unavailable */ }
    };
    check();
    const timer = window.setInterval(check, 3500);
    return () => { active = false; window.clearInterval(timer); };
  }, [work.capability_requests, load]);
  useEffect(() => {
    if (!runtime?.id) return undefined;
    const timer = window.setInterval(() => apiClient.getHqEvents(cursorRef.current, 100).then((data) => { const rows = data?.events || []; if (rows.length) setEvents((current) => mergeEvents(current, rows)); cursorRef.current = data?.next || cursorRef.current; }).catch(() => {}), 4000);
    return () => window.clearInterval(timer);
  }, [runtime?.id]);
  const run = async (action) => {
    setBusy(action); setError('');
    try {
      const response = action === 'activate' ? await apiClient.activateHqRuntime({ objective, authority_policy: { internal_autonomy: true } }) : action === 'pause' ? await apiClient.pauseHqRuntime('Paused from Company HQ') : action === 'resume' ? await apiClient.resumeHqRuntime() : await apiClient.wakeHqRuntime();
      setRuntime(response?.runtime || runtime); await load();
    } catch (requestError) { setError(requestError?.response?.data?.message || requestError?.response?.data?.error || requestError.message); } finally { setBusy(''); }
  };
  const latest = useMemo(() => events.slice(-120), [events]);
  const capabilityRequest = work.capability_requests?.[0];
  const submitInstruction = async (submitEvent) => {
    submitEvent.preventDefault();
    const value = instruction.trim();
    if (!value || instructionBusy) return;
    setInstructionBusy(true); setError('');
    try { await apiClient.addHqInstruction(value); setInstruction(''); await load(); }
    catch (requestError) { setError(requestError?.response?.data?.message || requestError.message); }
    finally { setInstructionBusy(false); }
  };
  const openCapability = () => {
    if (!capabilityRequest?.connectPath) return;
    window.open(capabilityRequest.connectPath, '_blank', 'noopener,noreferrer');
  };
  return <section className="-mx-4 bg-[#fbfaf7]" aria-label="Company HQ runtime">
    <header className="border-y border-[#e3e0db] bg-white px-5 py-3 sm:px-8"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#185bcc]"><ShieldCheck size={11} />Autonomous company runtime</div><p className="mt-1 truncate text-[11px] text-[#737373]">{runtime?.objective || objective || 'Waiting for a source-backed company objective.'}</p></div><div className="flex shrink-0 items-center gap-2"><div className="hidden items-center divide-x divide-[#dedbd6] rounded-md border border-[#dedbd6] bg-[#faf9f7] sm:flex"><div className="px-2.5 py-1.5"><div className="font-mono text-[7px] uppercase text-[#a3a3a3]">Input</div><div className="font-mono text-[10px] font-semibold text-[#525252]">{fmtTokens(usage.input_tokens)}</div></div><div className="px-2.5 py-1.5"><div className="font-mono text-[7px] uppercase text-[#a3a3a3]">Output</div><div className="font-mono text-[10px] font-semibold text-[#525252]">{fmtTokens(usage.output_tokens)}</div></div></div>{!runtime ? <button type="button" onClick={() => run('activate')} disabled={!baselineReady || busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#171717] px-3 text-[10px] font-semibold text-white disabled:opacity-40">{busy === 'activate' ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}Activate</button> : runtime.state === 'PAUSED' ? <button type="button" onClick={() => run('resume')} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#171717] px-3 text-[10px] font-semibold text-white"><Play size={12} />Resume</button> : <><button type="button" onClick={() => run('wake')} disabled={busy} title="Wake now" className="grid h-8 w-8 place-items-center rounded-md border border-[#dedbd6] bg-white text-[#525252]"><RefreshCw size={13} className={busy === 'wake' ? 'animate-spin' : ''} /></button><button type="button" onClick={() => run('pause')} disabled={busy} title="Pause HQ" className="grid h-8 w-8 place-items-center rounded-md border border-[#dedbd6] bg-white text-[#525252]"><Pause size={13} /></button></>}</div></div></header>
    {error ? <div className="border-b border-red-200 bg-red-50 px-8 py-2 text-[10px] text-red-700">{error}</div> : null}
    {!runtime ? <div className="mx-auto grid min-h-[260px] max-w-5xl place-items-center px-6 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#d8d3cc] bg-white font-serif text-[24px] italic text-[#185bcc]">I</span><div className="mt-4 text-[15px] font-medium text-[#262626]">Waiting to become operational</div><div className="mt-1 text-[11px] text-[#737373]">Activate after the company baseline is ready.</div></div></div> : latest.length ? <RuntimeTranscript events={latest} state={runtime.state} /> : <div className="grid min-h-[220px] place-items-center"><Loader2 size={18} className="animate-spin text-[#185bcc]" /></div>}
    {runtime ? <form onSubmit={submitInstruction} className="sticky bottom-0 z-10 border-t border-[#e3e0db] bg-[#fbfaf7]/95 px-5 py-4 backdrop-blur sm:px-8"><div className="mx-auto flex max-w-4xl items-end gap-2 rounded-[8px] border border-[#d8d3cc] bg-white p-2 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.45)]"><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitInstruction(event); } }} rows={2} placeholder="Give HQ a standing instruction..." className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-1 text-[13px] leading-5 outline-none placeholder:text-[#aaa49c]" /><button type="submit" disabled={!instruction.trim() || instructionBusy} title="Send instruction" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#171717] text-white disabled:opacity-35">{instructionBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button></div></form> : null}
    <footer className="border-t border-[#e3e0db] bg-white px-5 py-3 sm:px-8"><div className="mx-auto max-w-5xl"><button type="button" onClick={() => setResourcesOpen((open) => !open)} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#185bcc]"><BookOpen size={12} />{resourcesOpen ? 'Hide company resources' : 'Open company resources'}</button></div></footer>
    {resourcesOpen ? <div className="border-t border-[#e3e0db] bg-white p-4">{resources}</div> : null}
    {capabilityRequest && capabilityRequest.id !== dismissedCapabilityRequestId ? <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label={`Connect ${capabilityRequest.provider}`}><div className="w-full max-w-md rounded-[8px] border border-[#d8d3cc] bg-[#fbfaf7] shadow-2xl"><div className="relative border-b border-[#e3e0db] px-5 py-4"><button type="button" onClick={() => setDismissedCapabilityRequestId(capabilityRequest.id)} aria-label="Close connection request" title="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[#777168] transition-colors hover:bg-[#f0eee9] hover:text-[#171717]"><X size={16} /></button><div className="flex items-center gap-2 pr-9 font-mono text-[9px] uppercase tracking-[0.12em] text-[#185bcc]"><Cable size={13} />Capability required</div><h3 className="mt-3 pr-9 text-[20px] font-semibold text-[#171717]">Connect {providerLabel(capabilityRequest.provider)}</h3><p className="mt-2 text-[13px] leading-6 text-[#625f58]">{capabilityRequest.reason}</p></div><div className="px-5 py-4"><p className="text-[11px] leading-5 text-[#777168]">I paused this todo without discarding it. I am watching the organization connection state and will continue automatically when access is ready.</p><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={async () => { await apiClient.recheckHqCapabilities(); await load(); }} className="h-9 rounded-md border border-[#d8d3cc] px-3 text-[11px] font-semibold text-[#525252]">Check connection</button><button type="button" onClick={openCapability} className="h-9 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white">Connect {providerLabel(capabilityRequest.provider)}</button></div></div></div></div> : null}
  </section>;
}
