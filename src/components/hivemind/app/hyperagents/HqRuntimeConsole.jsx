import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, Check, Clock3, Cable, Send,
  Moon, Pause, Play, Power, RefreshCw, ShieldCheck, Sparkles,
  TerminalSquare, Wrench, X, SlidersHorizontal, ListTodo, RotateCcw,
} from 'lucide-react';
import apiClient from '../shared/api-client';

const EXECUTION_TYPES = new Set(['skill_loaded', 'tool_started', 'tool_result', 'schedule_created', 'verification']);
const EXECUTION_META = {
  skill_loaded: [Sparkles, 'Method', 'text-[#171717]', 'bg-[#eeebe5]'],
  tool_started: [Wrench, 'Using', 'text-[#171717]', 'bg-[#eeebe5]'],
  tool_result: [Check, 'Returned', 'text-[#171717]', 'bg-[#e2ded6]'],
  schedule_created: [Clock3, 'Scheduled', 'text-[#6c6257]', 'bg-[#f2f0eb]'],
  verification: [ShieldCheck, 'Verified', 'text-[#171717]', 'bg-[#e2ded6]'],
};

/* Monochrome runtime motion system. Kept inline so the console owns its own
   keyframes without widening the shared Tailwind config. */
const RUNTIME_MOTION = `
@keyframes hm-rt-rise { 0%,100% { opacity:.10; transform:translateY(1.5px); } 45% { opacity:1; transform:translateY(0); } }
@keyframes hm-rt-edge { 0%,100% { opacity:.14; } 50% { opacity:.9; } }
@keyframes hm-rt-spin { to { transform:rotate(360deg); } }
@keyframes hm-rt-sweep { 0% { transform:translateX(-130%); } 100% { transform:translateX(360%); } }
@keyframes hm-rt-breathe { 0%,100% { opacity:.35; transform:scale(.82); } 50% { opacity:1; transform:scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .hm-rt-cell, .hm-rt-edge, .hm-rt-ring, .hm-rt-sweep, .hm-rt-dot { animation: none !important; opacity:.7 !important; }
}
`;

function RuntimeMotion() {
  return <style>{RUNTIME_MOTION}</style>;
}

/* Dot-matrix: denser and brighter toward the base, so the field reads as
   accumulating work rather than random noise. */
function DotMatrix({ size = 22, columns = 7, rows = 5, active = true, ink = '#171717' }) {
  const cells = columns * rows;
  const gap = Math.max(1, Math.round(size / 18));
  const cell = Math.max(1.5, (size - gap * (columns - 1)) / columns);
  return <span className="inline-grid shrink-0 align-middle" style={{ gridTemplateColumns: `repeat(${columns}, ${cell}px)`, gap: `${gap}px`, width: size }}>
    {Array.from({ length: cells }, (unused, index) => {
      const row = Math.floor(index / columns);
      const weight = (row + 1) / rows;
      return <span key={index} className={active ? 'hm-rt-cell' : ''} style={{
        width: cell, height: cell, background: ink,
        opacity: active ? undefined : 0.1 + weight * 0.18,
        animation: active ? `hm-rt-rise ${1.4 + ((index * 5) % 7) / 10}s ease-in-out ${((index * 11) % 13) / 13}s infinite` : undefined,
      }} />;
    })}
  </span>;
}

function GraphPulse({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
    {[['12', '4', '4.5', '18'], ['12', '4', '19.5', '18'], ['4.5', '18', '19.5', '18']].map(([x1, y1, x2, y2], index) => <line
      key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#171717" strokeWidth="1"
      className="hm-rt-edge" style={{ animation: `hm-rt-edge 1.5s ease-in-out ${index * 0.22}s infinite` }} />)}
    {[['12', '4'], ['4.5', '18'], ['19.5', '18']].map(([cx, cy], index) => <circle
      key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.1" fill="#171717"
      className="hm-rt-dot" style={{ animation: `hm-rt-breathe 1.5s ease-in-out ${index * 0.22}s infinite` }} />)}
  </svg>;
}

function ArcSpin({ size = 22 }) {
  return <span className="relative inline-block shrink-0 align-middle" style={{ width: size, height: size }}>
    <span className="hm-rt-ring absolute inset-0 rounded-full border border-[#171717] border-r-transparent border-b-transparent" style={{ animation: 'hm-rt-spin 1.05s linear infinite' }} />
    <span className="hm-rt-ring absolute rounded-full border border-[#8a8577] border-l-transparent border-t-transparent" style={{ inset: size * 0.26, animation: 'hm-rt-spin 1.5s linear infinite reverse' }} />
  </span>;
}

const RUNTIME_GLYPH = { matrix: DotMatrix, graph: GraphPulse, arc: ArcSpin };

/* One loader vocabulary for every "runtime is busy" surface: header, transcript
   tail, and first paint. Variant carries the meaning, never colour. */
function RuntimeLoader({ variant = 'matrix', label, hint, size = 22, className = '' }) {
  const Glyph = RUNTIME_GLYPH[variant] || DotMatrix;
  return <span className={`inline-flex items-center gap-3 ${className}`}>
    <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#dedbd6] bg-white"><Glyph size={size} /></span>
    {label ? <span className="min-w-0">
      <span className="block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-[#171717]">{label}</span>
      {hint ? <span className="mt-0.5 block truncate text-[11px] text-[#8a8577]">{hint}</span> : null}
    </span> : null}
  </span>;
}

const STATE_GLYPH = { OBSERVING: 'graph', DIAGNOSING: 'matrix', REVIEWING: 'arc', DELEGATING: 'matrix' };
const STATE_LABEL = {
  OBSERVING: ['Reading company state', 'Loading retained evidence before choosing work.'],
  DIAGNOSING: ['Thinking', 'Choosing the highest-leverage evidenced constraint.'],
  DELEGATING: ['Delegating', 'Handing a bounded Work Order to a specialist room.'],
  REVIEWING: ['Analysing result', 'Comparing returned evidence with the decision rule.'],
};
const fmtTime = (value) => value ? new Date(value).toLocaleTimeString([], {
  hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2,
}) : '';
const mergeEvents = (current, incoming) => {
  const rows = new Map(current.map((item) => [String(item.sequence), item]));
  incoming.forEach((item) => rows.set(String(item.sequence), item));
  return [...rows.values()].sort((a, b) => Number(a.sequence) - Number(b.sequence));
};
const INTERNAL_CAPABILITIES = new Set(['zernio', 'document_review']);
const publicRuntimeText = (value) => String(value || '')
  .replace(/\bzernio\b/gi, 'campaign distribution')
  .replace(/\bdocument_review\b/gi, 'document review');
const visibleEventSummary = (item) => {
  if (!item?.workOrderId || !['blocked', 'work_order_completed'].includes(item.eventType)) return publicRuntimeText(item?.summary);
  const gaps = [
    ...(item.details?.blockers || item.details?.packet?.blockers || []),
    ...(item.details?.failures || item.details?.packet?.failures || []),
  ].filter(Boolean);
  if (item.eventType === 'work_order_completed') {
    return 'The specialist completed the bounded assignment. HQ retained the full result in its Room and is verifying completion before advancing.';
  }
  return publicRuntimeText(`The specialist stopped without claiming completion.${gaps.length ? ` Unmet: ${gaps.slice(0, 3).join('; ')}.` : ''} The full report remains in the specialist Room; HQ will preserve the gap and advance independent work.`);
};
const STREAM_CACHE_PREFIX = 'hm_hq_runtime_stream:';
const streamCacheKey = (runtime) => runtime?.id
  ? `${STREAM_CACHE_PREFIX}${runtime.id}:${runtime.epoch || runtime.activatedAt || runtime.createdAt || 'current'}`
  : null;
const readStreamCache = (runtime) => {
  const key = streamCacheKey(runtime);
  if (!key) return { key: null, events: [], cursor: '0' };
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(key) || '{}');
    const events = Array.isArray(cached.events) ? cached.events.slice(-120) : [];
    return { key, events, cursor: String(events.at(-1)?.sequence || cached.cursor || '0') };
  } catch { return { key, events: [], cursor: '0' }; }
};
const isWorking = (state) => Boolean(state && !['WAITING', 'SLEEPING', 'PAUSED', 'BLOCKED'].includes(state));
const fmtTokens = (value) => Number(value || 0).toLocaleString();
const providerLabel = (value) => publicRuntimeText(value).split(/[-_]/).map((part) => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ');
const resetRuntimeInvitation = () => {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('hm_runtime_invite:'))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch { /* local storage can be unavailable */ }
};
const returnToRuntimeInvitation = () => {
  resetRuntimeInvitation();
  window.location.assign('/hivemind/app/employees/mycompany');
};

const stateLabel = (state) => isWorking(state) ? 'Conscious · working'
  : state === 'BLOCKED' ? 'Attention required' : state === 'PAUSED' ? 'Paused' : 'Listening';

function IdentityPulse({ state }) {
  const awake = isWorking(state);
  return <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#737373]">
    <span className={`relative grid h-7 w-7 place-items-center rounded-full border ${awake ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#dedbd6] bg-white text-[#737373]'}`}>
      <span className={`h-2 w-2 rounded-full ${awake ? 'bg-white' : 'bg-[#aaa49c]'}`} style={awake ? { animation: 'hm-rt-breathe 1.4s ease-in-out infinite' } : undefined} />
      {awake ? <span className="absolute inset-[-4px] rounded-full border border-[#8a8577] animate-ping opacity-25" /> : null}
    </span>
    {stateLabel(state)}
  </div>;
}

/* The header wordmark replaces the objective line: identity first, live state
   underneath. The objective now lives in Instructions, where it is editable. */
function RuntimeMark({ state }) {
  const awake = isWorking(state);
  const blocked = state === 'BLOCKED';
  return <div className="flex min-w-0 items-center gap-3">
    <span className={`relative grid h-9 w-9 shrink-0 place-items-center border ${awake ? 'border-[#171717] bg-[#171717]' : 'border-[#d8d3cc] bg-white'}`}>
      {awake ? <DotMatrix size={15} columns={5} rows={4} ink="#ffffff" /> : <span className={`h-2 w-2 rounded-full ${blocked ? 'bg-[#171717]' : 'bg-[#aaa49c]'}`} />}
      {awake ? <span className="pointer-events-none absolute inset-0 overflow-hidden"><span className="hm-rt-sweep absolute inset-y-0 w-1/3 bg-white/25" style={{ animation: 'hm-rt-sweep 2.4s ease-in-out infinite' }} /></span> : null}
    </span>
    <span className="min-w-0">
      <span className="block font-mono text-[13px] font-semibold uppercase leading-none tracking-[0.34em] text-[#171717]">Runtime</span>
      <span className="mt-1.5 flex items-center gap-1.5 font-mono text-[8px] uppercase leading-none tracking-[0.16em] text-[#8a8577]">
        <span className={`h-1.5 w-1.5 rounded-full ${blocked ? 'bg-[#171717]' : awake ? 'bg-[#171717]' : 'bg-[#c2bcb2]'}`} style={awake ? { animation: 'hm-rt-breathe 1.4s ease-in-out infinite' } : undefined} />
        <span className="truncate">{stateLabel(state)}</span>
      </span>
    </span>
  </div>;
}

/* Channel-button geometry (h-9, 1px border, 10px semibold, icon + trailing
   affordance) reused so Runtime controls read as the same family. */
function RuntimeButton({ icon: Icon, label, trailing: Trailing, tone = 'ghost', title, onClick, disabled, badge, spinning }) {
  const skin = tone === 'solid'
    ? 'bg-[#171717] text-white border-[#171717] hover:bg-[#292929]'
    : 'bg-white text-[#525252] border-[#d8d3cc] hover:border-[#171717] hover:text-[#171717]';
  return <button type="button" onClick={onClick} disabled={disabled} title={title || label}
    className={`inline-flex h-9 shrink-0 items-center gap-2 border px-3 text-[10px] font-semibold transition-colors disabled:opacity-40 ${skin}`}>
    {spinning ? <ArcSpin size={13} /> : Icon ? <Icon size={13} /> : null}
    {label ? <span className="hidden sm:inline">{label}</span> : null}
    {badge ? <span className={`grid h-4 min-w-4 place-items-center px-1 font-mono text-[8px] ${tone === 'solid' ? 'bg-white/20 text-white' : 'bg-[#f0eee9] text-[#525252]'}`}>{badge}</span> : null}
    {Trailing ? <Trailing size={11} className="opacity-60" /> : null}
  </button>;
}

function RuntimeIconButton({ icon: Icon, title, onClick, disabled, spinning }) {
  return <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title}
    className="grid h-9 w-9 shrink-0 place-items-center border border-[#d8d3cc] bg-white text-[#525252] transition-colors hover:border-[#171717] hover:text-[#171717] disabled:opacity-40">
    {spinning ? <ArcSpin size={13} /> : <Icon size={13} />}
  </button>;
}

/* Token counter: absolute totals plus the in/out split as a single bar, so cost
   shape is legible without reading two numbers against each other. */
function TokenMeter({ usage }) {
  const input = Number(usage?.input_tokens || 0);
  const output = Number(usage?.output_tokens || 0);
  const total = input + output;
  const share = total ? Math.round((input / total) * 100) : 50;
  return <div className="hidden shrink-0 border border-[#d8d3cc] bg-white sm:block" title={`${fmtTokens(input)} input + ${fmtTokens(output)} output tokens`}>
    <div className="flex items-stretch divide-x divide-[#e7e4df]">
      {[['In', input], ['Out', output], ['Total', total]].map(([label, value]) => <div key={label} className="px-2.5 py-1">
        <div className="font-mono text-[7px] uppercase leading-none tracking-[0.14em] text-[#a3a3a3]">{label}</div>
        <div className="mt-1 font-mono text-[10px] font-semibold leading-none text-[#262626]">{fmtTokens(value)}</div>
      </div>)}
    </div>
    <div className="flex h-[3px] w-full bg-[#eeebe5]">
      <span className="h-full bg-[#171717]" style={{ width: `${share}%` }} />
      <span className="h-full bg-[#a8a29a]" style={{ width: `${100 - share}%` }} />
    </div>
  </div>;
}

const QUEUE_STATUS = {
  RUNNING: ['Running', 'border-[#171717] bg-[#171717] text-white'],
  READY: ['Ready', 'border-[#171717] bg-white text-[#171717]'],
  WAITING_FOR_AUTHORITY: ['Waiting for approval', 'border-[#171717] bg-white text-[#171717]'],
  WAITING_FOR_EVIDENCE: ['Waiting for evidence', 'border-[#c2bcb2] bg-[#f2f0eb] text-[#6c6257]'],
  MONITORING: ['Monitoring replies', 'border-[#c2bcb2] bg-[#f2f0eb] text-[#4f4942]'],
  WAITING_FOR_CONNECTOR: ['Waiting for access', 'border-[#c2bcb2] bg-[#f2f0eb] text-[#6c6257]'],
  BLOCKED: ['Blocked', 'border-[#171717] border-dashed bg-white text-[#171717]'],
  COMPLETED: ['Completed', 'border-[#dedbd6] bg-[#eeebe5] text-[#8a8577]'],
};
function queueBlockerSummary(reason) {
  if (!reason) return '';
  if (typeof reason !== 'string') return 'The latest Room result needs review before this work can continue.';
  const trimmed = reason.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'The latest Room result needs review before this work can continue.';
  }
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}...` : trimmed;
}
function RuntimeQueuePanel({ queue, onClose, embedded = false }) {
  const active = queue.filter((item) => ['RUNNING', 'READY'].includes(item.status));
  const shell = embedded
    ? 'w-full border border-[#d8d3cc] bg-[#fbfaf7] shadow-[0_14px_36px_-30px_rgba(0,0,0,0.7)]'
    : 'absolute right-0 top-[calc(100%+8px)] z-30 w-[min(360px,calc(100vw-2rem))] border border-[#d8d3cc] bg-[#fbfaf7] shadow-[0_18px_50px_-24px_rgba(0,0,0,0.5)]';
  return <section id={embedded ? 'runtime-operating-queue' : undefined} className={shell} aria-label="Runtime operating queue">
    <header className="flex items-center gap-2 border-b border-[#e3e0db] bg-white px-4 py-3"><ListTodo size={14} className="text-[#171717]" /><span className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#171717]">Operating queue</span><span className="font-mono text-[9px] text-[#737373]">{active.length} active</span>{!embedded && onClose ? <button type="button" onClick={onClose} aria-label="Close runtime queue" title="Close" className="grid h-7 w-7 place-items-center text-[#777168] hover:bg-[#f0eee9]"><X size={14} /></button> : null}</header>
    <div className={embedded ? 'max-h-[calc(100vh-190px)] overflow-y-auto p-2' : 'max-h-[min(62vh,520px)] overflow-y-auto p-2'}>
      {queue.map((item) => {
        const [label, tone] = QUEUE_STATUS[item.status] || QUEUE_STATUS.READY;
        const blocker = queueBlockerSummary(item.blocked_reason);
        return <article key={item.id} className="border-b border-[#ebe8e3] px-2 py-3 last:border-b-0"><div className="flex items-start gap-2"><span className={`mt-0.5 shrink-0 border px-1.5 py-0.5 font-mono text-[7px] uppercase ${tone}`}>{label}</span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold leading-4 text-[#262626]">{item.title}</div><p className="mt-1 text-[10px] leading-4 text-[#777168]">{item.objective}</p>{blocker ? <p className="mt-1 text-[9px] leading-4 text-[#8c6514]">{blocker}</p> : null}</div></div></article>;
      })}
      {!queue.length ? <p className="px-2 py-5 text-[11px] text-[#737373]">HQ has no pending operating work.</p> : null}
    </div>
  </section>;
}

const SPRINT_STATUS = {
  READY_FOR_REVIEW: ['Ready for review', 'bg-[#171717] text-white'],
  RUNNING: ['Building', 'bg-[#e8e4dd] text-[#34312d]'],
  PREPARING: ['Preparing', 'bg-[#e8e4dd] text-[#34312d]'],
  MONITORING: ['Monitoring', 'bg-[#e8e4dd] text-[#34312d]'],
  COMPLETED: ['Live', 'bg-[#dcebdd] text-[#285b31]'],
  NEEDS_ATTENTION: ['Needs attention', 'bg-[#f2dfd8] text-[#823f2e]'],
};

function FirstGrowthSprintPanel({ sprint, onReview }) {
  if (!sprint) return null;
  return <section className="mb-3 border border-[#171717] bg-white shadow-[0_16px_42px_-34px_rgba(0,0,0,0.8)]" aria-label="First Growth Sprint">
    <header className="border-b border-[#d8d3cc] bg-[#171717] px-4 py-3 text-white">
      <div className="flex items-center gap-2"><Sparkles size={13} /><span className="flex-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em]">First Growth Sprint</span><span className="font-mono text-[8px] text-white/70">{sprint.completed_count || 0}/{sprint.item_count || 0}</span></div>
      <p className="mt-2 text-[11px] leading-4 text-white/72">Your first evidence-grounded growth actions, prepared together.</p>
    </header>
    <div>
      {(sprint.items || []).map((item, index) => {
        const [label, tone] = SPRINT_STATUS[item.status] || SPRINT_STATUS.PREPARING;
        const channelText = item.campaign?.requestedChannels?.length ? item.campaign.requestedChannels.join(' + ') : item.room_tag;
        return <article key={item.todo_id} className="border-b border-[#ebe8e3] px-4 py-3 last:border-b-0">
          <div className="flex items-start gap-3"><span className="font-mono text-[9px] text-[#a19b92]">0{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-[11px] font-semibold leading-4 text-[#262626]">{item.title}</h3><span className={`px-1.5 py-0.5 font-mono text-[7px] uppercase ${tone}`}>{label}</span></div><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#777168]">{item.objective}</p><div className="mt-2 font-mono text-[8px] uppercase tracking-[0.08em] text-[#8a8577]">{channelText}</div></div></div>
        </article>;
      })}
    </div>
    {sprint.status === 'READY_FOR_REVIEW' ? <div className="border-t border-[#d8d3cc] bg-[#f5f3ef] p-3"><button type="button" onClick={onReview} className="inline-flex h-9 w-full items-center justify-center gap-2 bg-[#171717] px-4 text-[10px] font-semibold text-white"><ShieldCheck size={13} />Review and launch <ArrowRight size={12} /></button></div> : null}
  </section>;
}

export function HqRuntimeRail({ baselineReady }) {
  const [runtime, setRuntime] = useState(null);
  const [work, setWork] = useState({ work_orders: [], schedules: [] });
  const [restarting, setRestarting] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState('');
  const [permissionError, setPermissionError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => Promise.all([apiClient.getHqRuntime(), apiClient.getHqWork()])
      .then(([state, queued]) => { if (active) { setRuntime(state?.runtime || null); setWork(queued || {}); } }).catch(() => {});
    load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const schedules = work.schedules || [];
  const outboundPermission = ['manual', 'auto'].includes(runtime?.authorityPolicy?.outbound_messages)
    ? runtime.authorityPolicy.outbound_messages : 'unconfigured';
  const outboundCallPermission = ['manual', 'auto'].includes(runtime?.authorityPolicy?.outbound_calls)
    ? runtime.authorityPolicy.outbound_calls : 'unconfigured';
  const outboundCampaignPermission = ['manual', 'auto'].includes(runtime?.authorityPolicy?.outbound_campaigns)
    ? runtime.authorityPolicy.outbound_campaigns : 'unconfigured';
  const updateOutboundPermission = async (policyKey, currentPreference, preference) => {
    if (permissionBusy || preference === currentPreference) return;
    setPermissionBusy(`${policyKey}:${preference}`); setPermissionError('');
    try {
      const response = await apiClient.updateHqAuthorityPolicy({ [policyKey]: preference });
      setRuntime(response?.runtime || runtime);
    } catch (requestError) {
      setPermissionError(requestError?.response?.data?.error || requestError?.message || 'Permission could not be updated.');
    } finally { setPermissionBusy(''); }
  };
  const restart = async () => {
    if (restarting) return;
    setRestartOpen(false);
    setRestarting(true);
    try { await apiClient.restartHqRuntime(); returnToRuntimeInvitation(); } catch { setRestarting(false); }
  };
  return <section className="flex h-full flex-col" aria-label="HQ runtime status">
    <header className="border-b border-[#e3e0db] px-4 py-4">
      <IdentityPulse state={runtime?.state} />
      <h2 className="mt-3 text-[15px] font-semibold text-[#171717]">Runtime</h2>
    </header>
    <div className="px-4 py-4">
      <div className="border-y border-[#e3e0db] py-3"><div className="font-mono text-[8px] uppercase text-[#a3a3a3]">State</div><div className="mt-1 text-[10px] font-semibold text-[#171717]">{runtime?.state?.replaceAll('_', ' ') || (baselineReady ? 'READY' : 'BASELINE REQUIRED')}</div></div>
      <div className="mt-5 border-y border-[#e3e0db] py-3" aria-label="Runtime permissions">
        <div className="flex items-center gap-2"><ShieldCheck size={12} className="text-[#171717]" /><div className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#737373]">Permissions granted</div></div>
        {[
          ['outbound_messages', 'Outbound email', outboundPermission],
          ['outbound_calls', 'TARA calls', outboundCallPermission],
          ['outbound_campaigns', 'Campaign launches', outboundCampaignPermission],
        ].map(([policyKey, label, currentPreference]) => <div key={policyKey} className="mt-3 flex items-center justify-between gap-3"><div><div className="text-[10px] font-semibold text-[#262626]">{label}</div><div className="mt-0.5 text-[9px] text-[#8a8577]">{currentPreference === 'unconfigured' ? 'Choose a policy' : 'Organization policy'}</div></div><div className="inline-flex border border-[#d8d3cc] bg-white p-0.5">{['manual', 'auto'].map((preference) => { const busyKey = `${policyKey}:${preference}`; return <button key={preference} type="button" onClick={() => updateOutboundPermission(policyKey, currentPreference, preference)} disabled={Boolean(permissionBusy)} aria-pressed={currentPreference === preference} className={`h-7 px-2.5 font-mono text-[8px] uppercase tracking-[0.08em] transition-colors disabled:opacity-40 ${currentPreference === preference ? 'bg-[#171717] text-white' : 'text-[#777168] hover:text-[#171717]'}`}>{permissionBusy === busyKey ? 'Saving' : preference}</button>; })}</div></div>)}
        <div className="mt-3 space-y-2 border-t border-[#ebe8e3] pt-3">{[
          ['Internal work', runtime?.authorityPolicy?.internal_autonomy === false ? 'Restricted' : 'Allowed'],
          ['External writes', runtime?.authorityPolicy?.external_writes === 'auto' ? 'Automatic' : 'Approval required'],
          ['Spending', runtime?.authorityPolicy?.spending === 'auto' ? 'Automatic' : 'Approval required'],
          ['Deletion', runtime?.authorityPolicy?.deletion === 'auto' ? 'Automatic' : 'Approval required'],
        ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 text-[9px]"><span className="text-[#777168]">{label}</span><span className="font-medium text-[#3f3f3f]">{value}</span></div>)}</div>
        {permissionError ? <p className="mt-2 text-[9px] leading-4 text-red-700">{permissionError}</p> : null}
      </div>
      <div className="mt-5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#a3a3a3]">Crucial checkpoints</div>
      <div className="mt-3">
        {schedules.slice(0, 5).map((item) => <div key={item.id} className="relative border-l border-[#d8d3cc] pb-5 pl-4 last:pb-0"><span className="absolute -left-[5px] top-0 h-[9px] w-[9px] rounded-full border border-[#171717] bg-white" /><div className="text-[10px] font-medium capitalize text-[#262626]">{String(item.triggerType || 'checkpoint').replaceAll('_', ' ')}</div><time className="mt-1 block font-mono text-[8px] text-[#a3a3a3]">{new Date(item.dueAt).toLocaleString()}</time></div>)}
        {!schedules.length ? <p className="text-[10px] leading-4 text-[#a3a3a3]">HQ wakes when a material event or scheduled checkpoint arrives.</p> : null}
      </div>
    </div>
    <div className="mt-auto border-t border-[#e3e0db] p-4"><button type="button" onClick={() => setRestartOpen(true)} disabled={restarting} title="Restart Runtime from onboarding boundary" className="inline-flex h-9 w-full items-center justify-center gap-2 border border-[#d8d3cc] bg-white text-[10px] font-semibold text-[#525252] hover:border-[#171717] hover:text-[#171717] disabled:opacity-50"><RotateCcw size={12} />{restarting ? 'Restarting...' : 'Restart Runtime'}</button></div>
    {restartOpen ? <div className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Restart Runtime"><div className="w-full max-w-md rounded-[8px] border border-[#d8d3cc] bg-[#fbfaf7] shadow-2xl"><div className="relative border-b border-[#e3e0db] px-5 py-4"><button type="button" onClick={() => setRestartOpen(false)} aria-label="Close restart dialog" title="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[#777168] hover:bg-[#f0eee9] hover:text-[#171717]"><X size={16} /></button><div className="flex items-center gap-2 pr-9 font-mono text-[9px] uppercase tracking-[0.12em] text-[#525252]"><RotateCcw size={13} />Runtime boundary</div><h3 className="mt-3 pr-9 text-[20px] font-semibold text-[#171717]">Restart Runtime?</h3><p className="mt-2 text-[12px] leading-5 text-[#777168]">Company memory stays intact. Runtime events, baseline and Growth Plan artifacts, active work, checkpoints, and todos are cleared so the invitation can begin a new first-life run.</p></div><div className="flex justify-end gap-2 px-5 py-4"><button type="button" onClick={() => setRestartOpen(false)} className="h-9 px-3 text-[11px] font-semibold text-[#525252]">Cancel</button><button type="button" onClick={restart} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white"><RotateCcw size={13} />Restart Runtime</button></div></div></div> : null}
  </section>;
}

function StreamedText({ children, active = false, className = '' }) {
  const text = String(children || '');
  const [visible, setVisible] = useState(active ? '' : text);
  useEffect(() => {
    if (!active) { setVisible(text); return undefined; }
    setVisible('');
    let index = 0;
    const step = Math.max(1, Math.ceil(text.length / 120));
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + step);
      setVisible(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 28);
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
            <span className={`rounded-[4px] px-2 py-0.5 font-mono text-[11px] ${bubble} ${tone}`}>{label}: {reference || publicRuntimeText(item.title)}</span>
            <ArrowRight size={12} className={result ? 'text-[#328347]' : 'text-[#8a8577]'} />
            <span className={result ? 'text-[#328347]' : 'text-[#777168]'}>{publicRuntimeText(item.summary || item.title)}</span>
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
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8577]"><Icon size={13} className={wake ? 'text-[#171717]' : ''} />{wake ? '[ Waking up ]' : '[ Sleeping ]'}<time className="ml-auto text-[8px] tracking-normal text-[#aaa49c]">{fmtTime(item.createdAt)}</time></div>
    <StreamedText active={active} className="mt-3 max-w-4xl font-serif text-[19px] leading-8 text-[#292824]">{visibleEventSummary(item)}</StreamedText>
  </div>;
  return <div className={`my-5 max-w-4xl ${blocked ? 'border-l-2 border-[#d94841] pl-4' : ''}`}>
    <div className="mb-1.5 flex items-center gap-2 text-[12px] text-[#8a8577]"><Icon size={13} /><span>{publicRuntimeText(item.title)}</span><time className="ml-auto font-mono text-[8px] text-[#aaa49c]">{fmtTime(item.createdAt)}</time></div>
    <StreamedText active={active} className={verdict ? 'font-serif text-[19px] leading-8 text-[#24231f]' : 'text-[15px] leading-7 text-[#45423d]'}>{visibleEventSummary(item)}</StreamedText>
  </div>;
}

function RuntimeTranscript({ events, state, queue = [], sprint = null, onReviewSprint, liveSequence = null }) {
  const working = isWorking(state);
  const chunks = [];
  for (const item of events) {
    if (EXECUTION_TYPES.has(item.eventType)) {
      const last = chunks.at(-1);
      if (last?.type === 'execution') last.items.push(item);
      else chunks.push({ type: 'execution', items: [item] });
    } else chunks.push({ type: 'narrative', item });
  }
  const [glyphLabel] = STATE_LABEL[state] || [];
  return <div className="relative w-full px-5 py-8 sm:px-8 sm:py-10">
    <div className="mb-7 border-b border-[#e7e4df] pb-5">
      <div className="flex items-center gap-2.5 pt-2 text-[14px] font-medium text-[#777168]">
        {working ? <DotMatrix size={16} columns={5} rows={4} /> : <Clock3 size={15} />}
        {working ? glyphLabel || 'HQ is thinking aloud' : 'HQ is thinking aloud'}
      </div>
    </div>
    <div className="ml-auto grid w-full max-w-[1420px] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <main className="min-w-0">{chunks.map((chunk) => chunk.type === 'execution'
        ? <ExecutionTrace key={`execution-${chunk.items[0]?.sequence}`} items={chunk.items} />
        : <NarrativeEvent key={chunk.item.id || chunk.item.sequence} item={chunk.item} active={working && String(chunk.item.sequence) === String(liveSequence || '')} />)}
        {working ? <div className="mt-7 border border-[#e7e4df] bg-white/70 px-4 py-3">
          <RuntimeLoader variant={STATE_GLYPH[state] || 'matrix'} label={(STATE_LABEL[state] || ['Thinking'])[0]} hint={(STATE_LABEL[state] || [null, 'Working through the next bounded action.'])[1]} />
        </div> : null}
      </main>
      <aside className="sticky top-[78px] z-10 w-full" aria-label="Runtime todo list"><FirstGrowthSprintPanel sprint={sprint} onReview={onReviewSprint} /><RuntimeQueuePanel queue={queue} embedded /></aside>
    </div>
  </div>;
}

/* First paint: the runtime is durable but the transcript has not arrived yet.
   Show the same motion vocabulary rather than a generic spinner. */
function RuntimePageLoader({ label = 'Waking the runtime', hint = 'Loading persisted events, operating queue, and checkpoints.' }) {
  return <div className="grid min-h-[300px] place-items-center px-6">
    <div className="w-full max-w-sm border border-[#e3e0db] bg-white px-6 py-7 text-center shadow-[0_18px_50px_-42px_rgba(0,0,0,0.7)]">
      <span className="mx-auto grid h-14 w-14 place-items-center border border-[#dedbd6] bg-[#fbfaf7]"><DotMatrix size={30} columns={7} rows={5} /></span>
      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#171717]">{label}</div>
      <p className="mt-2 text-[11px] leading-5 text-[#8a8577]">{hint}</p>
      <div className="relative mt-5 h-[3px] w-full overflow-hidden bg-[#eeebe5]">
        <span className="hm-rt-sweep absolute inset-y-0 w-1/3 bg-[#171717]" style={{ animation: 'hm-rt-sweep 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  </div>;
}

export default function HqRuntimeConsole({ objective, baselineReady }) {
  const [runtime, setRuntime] = useState(null);
  const [usage, setUsage] = useState({ input_tokens: 0, output_tokens: 0 });
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [work, setWork] = useState({ todos: [], capability_requests: [] });
  const [instruction, setInstruction] = useState('');
  const [instructionBusy, setInstructionBusy] = useState(false);
  const [instructionNotice, setInstructionNotice] = useState('');
  const [approvalBusy, setApprovalBusy] = useState('');
  const [sprintReviewOpen, setSprintReviewOpen] = useState(false);
  const [dismissedWorkflowApprovalId, setDismissedWorkflowApprovalId] = useState(null);
  const [dismissedCapabilityRequestId, setDismissedCapabilityRequestId] = useState(null);
  const [liveSequence, setLiveSequence] = useState(null);
  const cursorRef = useRef('0');
  const streamCacheKeyRef = useRef(null);
  const capabilityWakeRef = useRef('');
  const eventQueueRef = useRef([]);
  const queuedEventSequencesRef = useRef(new Set());
  const knownEventSequencesRef = useRef(new Set());
  const eventDrainTimerRef = useRef(null);
  const eventDrainingRef = useRef(false);
  const drainEvents = useCallback(() => {
    const item = eventQueueRef.current.shift();
    if (!item) { eventDrainingRef.current = false; return; }
    eventDrainingRef.current = true;
    queuedEventSequencesRef.current.delete(String(item.sequence));
    knownEventSequencesRef.current.add(String(item.sequence));
    setLiveSequence(String(item.sequence));
    setEvents((current) => mergeEvents(current, [item]));
    eventDrainTimerRef.current = window.setTimeout(drainEvents, 700);
  }, []);
  const enqueueEvents = useCallback((rows = []) => {
    rows.forEach((item) => {
      const sequence = String(item?.sequence || '');
      if (!sequence || knownEventSequencesRef.current.has(sequence) || queuedEventSequencesRef.current.has(sequence)) return;
      queuedEventSequencesRef.current.add(sequence);
      eventQueueRef.current.push(item);
    });
    if (!eventDrainingRef.current && eventQueueRef.current.length) drainEvents();
  }, [drainEvents]);
  const load = useCallback(async ({ resetTranscript = false } = {}) => {
    // Runtime identity and cached transcript are the first paint. Queue hydration
    // is independent and must never hold the whole console behind its request.
    const state = await apiClient.getHqRuntime();
    const activeRuntime = state?.runtime || null;
    setRuntime(activeRuntime);
    setUsage(state?.usage || { input_tokens: 0, output_tokens: 0 });
    let after = cursorRef.current;
    let cachedRows = [];
    if (resetTranscript) {
      const cached = readStreamCache(activeRuntime);
      streamCacheKeyRef.current = cached.key;
      cachedRows = cached.events;
      after = cached.cursor;
      cursorRef.current = after;
      eventQueueRef.current = [];
      queuedEventSequencesRef.current.clear();
      knownEventSequencesRef.current = new Set(cachedRows.map((item) => String(item.sequence)));
      eventDrainingRef.current = false;
      setLiveSequence(null);
      setEvents(cachedRows);
      window.clearTimeout(eventDrainTimerRef.current);
    }
    const workPromise = apiClient.getHqWork().catch(() => ({ todos: [], capability_requests: [] }));
    const eventData = activeRuntime
      ? await apiClient.getHqEvents(after || '0', 200)
      : { events: [], next: '0' };
    const rows = eventData?.events || [];
    if (resetTranscript) {
      const activatedAt = activeRuntime?.activatedAt ? new Date(activeRuntime.activatedAt).getTime() : 0;
      const freshLife = !cachedRows.length && activatedAt > 0 && Date.now() - activatedAt < 120000;
      if (freshLife) {
        setEvents([]);
        enqueueEvents(rows);
      } else {
        const hydrated = mergeEvents(cachedRows, rows).slice(-120);
        hydrated.forEach((item) => knownEventSequencesRef.current.add(String(item.sequence)));
        setEvents(hydrated);
      }
    } else {
      enqueueEvents(rows);
    }
    cursorRef.current = eventData?.next || rows.at(-1)?.sequence || '0';
    const workData = await workPromise;
    setWork(workData || { todos: [], capability_requests: [] });
  }, [enqueueEvents]);
  useEffect(() => {
    const key = streamCacheKeyRef.current;
    if (!key || !events.length) return;
    const bounded = events.slice(-120);
    try { window.sessionStorage.setItem(key, JSON.stringify({ cursor: String(bounded.at(-1)?.sequence || '0'), events: bounded })); } catch { /* cache is an optimization */ }
  }, [events]);
  useEffect(() => {
    load({ resetTranscript: true }).catch(() => {});
    return () => window.clearTimeout(eventDrainTimerRef.current);
  }, [load]);
  useEffect(() => {
    if (!runtime?.id) return undefined;
    let source;
    try { source = new EventSource(apiClient.hqEventStreamUrl(cursorRef.current), { withCredentials: true }); } catch { return undefined; }
    const onEvent = (message) => { try {
      const item = JSON.parse(message.data);
      cursorRef.current = String(item.sequence);
      enqueueEvents([item]);
      Promise.all([apiClient.getHqRuntime(), apiClient.getHqWork()]).then(([data, workData]) => {
        setRuntime(data?.runtime || null);
        setUsage(data?.usage || { input_tokens: 0, output_tokens: 0 });
        setWork(workData || { todos: [], capability_requests: [] });
      }).catch(() => {});
    } catch { /* malformed edge event */ } };
    source.addEventListener('hq_event', onEvent);
    return () => { source.close(); };
  }, [runtime?.id, enqueueEvents]);
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
    const timer = window.setInterval(() => apiClient.getHqEvents(cursorRef.current, 100).then((data) => { const rows = data?.events || []; if (rows.length) enqueueEvents(rows); cursorRef.current = data?.next || cursorRef.current; }).catch(() => {}), 4000);
    return () => window.clearInterval(timer);
  }, [runtime?.id, enqueueEvents]);
  const run = async (action) => {
    setBusy(action); setError('');
    try {
      const response = action === 'activate' ? await apiClient.activateHqRuntime({ objective, authority_policy: { internal_autonomy: true } }) : action === 'pause' ? await apiClient.pauseHqRuntime('Paused from Company HQ') : action === 'resume' ? await apiClient.resumeHqRuntime() : action === 'restart' ? await apiClient.restartHqRuntime() : await apiClient.wakeHqRuntime();
      if (action === 'restart' && response?.reset) {
        returnToRuntimeInvitation();
        return;
      }
      setRuntime(response?.runtime || runtime); await load();
    } catch (requestError) { setError(requestError?.response?.data?.message || requestError?.response?.data?.error || requestError.message); } finally { setBusy(''); }
  };
  const latest = useMemo(() => events.slice(-120), [events]);
  // Internal adapters are never customer-connectable products. The backend
  // reconciles stale requests; this filter prevents a legacy row from leaking
  // an implementation vendor while that reconciliation is in flight.
  const capabilityRequest = (work.capability_requests || []).find((request) => (
    !INTERNAL_CAPABILITIES.has(String(request?.provider || '').toLowerCase())
  ));
  const lifecycleQueue = (work.playbook_snapshots || []).filter((snapshot) => !['COMPLETED', 'TERMINATED'].includes(snapshot.status)).map((snapshot) => ({
    id: `playbook:${snapshot.execution_id}`,
    title: String(snapshot.current_stage || 'Runtime lifecycle').replaceAll('_', ' '),
    objective: `${snapshot.playbook?.id || 'playbook'} v${snapshot.playbook?.version || '?'} · checkpoint ${snapshot.checkpoint_sequence} · ${snapshot.next_action || snapshot.status}`,
    status: snapshot.status === 'WAITING_AUTHORITY' ? 'WAITING_FOR_AUTHORITY' : snapshot.status === 'WAITING_EVENT' ? 'WAITING_FOR_EVIDENCE' : snapshot.status === 'NEEDS_INTERVENTION' ? 'BLOCKED' : 'RUNNING',
    priority: 0,
  }));
  const runtimeQueue = (work.runtime_queue || []).length ? work.runtime_queue : lifecycleQueue;
  const activationSprint = work.activation_sprint || null;
  const queueActiveCount = runtimeQueue.filter((item) => ['RUNNING', 'READY'].includes(item.status)).length;
  useEffect(() => {
    if (activationSprint?.status !== 'READY_FOR_REVIEW' || !activationSprint.id) return;
    const key = `hq-activation-sprint-review:${activationSprint.id}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, 'shown');
    } catch { /* showing the review does not depend on storage */ }
    setSprintReviewOpen(true);
  }, [activationSprint?.id, activationSprint?.status]);
  const waitForInstructionAcceptance = async (instructionId) => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const data = await apiClient.getHqEvents('0', 200).catch(() => null);
      const accepted = (data?.events || []).some((item) => item.eventType === 'instruction_received' && String(item.details?.instruction_id || '') === String(instructionId));
      if (accepted) return true;
      await new Promise((resolve) => window.setTimeout(resolve, 600));
    }
    return false;
  };
  const submitInstruction = async (submitEvent) => {
    submitEvent.preventDefault();
    const value = instruction.trim();
    if (!value || instructionBusy) return;
    setInstructionBusy(true); setError(''); setInstructionNotice('HQ is waking and applying this instruction...');
    try {
      const response = await apiClient.addHqInstruction(value);
      const accepted = await waitForInstructionAcceptance(response?.instruction?.id);
      await load();
      if (!accepted) { setInstructionNotice('Instruction is durable and queued. HQ will apply it as soon as the active cycle releases.'); return false; }
      setInstruction(''); setInstructionNotice('HQ accepted the instruction and updated its queue.');
      return true;
    }
    catch (requestError) { setError(requestError?.response?.data?.message || requestError.message); }
    finally { setInstructionBusy(false); }
    return false;
  };
  const openCapability = () => {
    if (!capabilityRequest?.connectPath) return;
    window.open(capabilityRequest.connectPath, '_blank', 'noopener,noreferrer');
  };
  const playbookApproval = (work.playbook_approvals || [])[0] || null;
  const decidePlaybookAuthority = async ({ preference, approve }) => {
    if (!playbookApproval || approvalBusy) return;
    const action = approve ? `${preference}-send` : preference;
    setApprovalBusy(action); setError('');
    try {
      await apiClient.decideHqPlaybookAuthority(playbookApproval.run_id, {
        gate: playbookApproval.gate, preference, approve,
      });
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.error || requestError.message);
    } finally { setApprovalBusy(''); }
  };
  const reviewActivationSprint = async (preference) => {
    if (!activationSprint?.id || approvalBusy) return;
    setApprovalBusy(`sprint-${preference}`); setError('');
    try {
      await apiClient.reviewHqActivationSprint(activationSprint.id, preference);
      setSprintReviewOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.error || requestError.message);
    } finally { setApprovalBusy(''); }
  };
  return <section className="relative -mx-4 -my-4 min-h-full bg-[#fbfaf7]" aria-label="Company HQ runtime">
    <RuntimeMotion />
    <header className="sticky top-0 z-20 border-y border-[#e3e0db] bg-white/95 px-5 py-3 shadow-[0_8px_24px_-22px_rgba(0,0,0,0.45)] backdrop-blur sm:px-8">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-3">
        <RuntimeMark state={runtime?.state} />
        <div className="relative flex min-w-0 shrink-0 items-center gap-1.5">
          <TokenMeter usage={usage} />
          <RuntimeButton icon={ListTodo} label="Queue" badge={queueActiveCount || undefined} onClick={() => document.getElementById('runtime-operating-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} title="Operating queue and todos" />
          <RuntimeButton icon={SlidersHorizontal} label="Instructions" trailing={ArrowUpRight} tone="solid" onClick={() => { setInstructionNotice(''); setInstructionsOpen(true); }} title="Standing operating instructions" />
          {!runtime
            ? <RuntimeButton icon={Power} label="Activate" tone="solid" onClick={() => run('activate')} disabled={!baselineReady || Boolean(busy)} spinning={busy === 'activate'} />
            : runtime.state === 'PAUSED'
              ? <RuntimeButton icon={Play} label="Resume" onClick={() => run('resume')} disabled={Boolean(busy)} spinning={busy === 'resume'} />
              : <><RuntimeIconButton icon={RefreshCw} title="Wake now" onClick={() => run('wake')} disabled={Boolean(busy)} spinning={busy === 'wake'} />
                <RuntimeIconButton icon={Pause} title="Pause HQ" onClick={() => run('pause')} disabled={Boolean(busy)} spinning={busy === 'pause'} /></>}
        </div>
      </div>
    </header>
    {error ? <div className="border-b border-red-200 bg-red-50 px-8 py-2 text-[10px] text-red-700">{error}</div> : null}
    {!runtime ? <div className="mx-auto grid min-h-[260px] max-w-5xl place-items-center px-6 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center border border-[#d8d3cc] bg-white"><DotMatrix size={28} columns={7} rows={5} active={false} /></span><div className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#171717]">Waiting to become operational</div><div className="mt-2 text-[11px] text-[#8a8577]">Activate after the company baseline is ready.</div></div></div> : latest.length ? <RuntimeTranscript events={latest} state={runtime.state} queue={runtimeQueue} sprint={activationSprint} onReviewSprint={() => setSprintReviewOpen(true)} liveSequence={liveSequence} /> : <RuntimePageLoader />}
    {instructionsOpen ? <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Runtime instructions"><form onSubmit={async (event) => { if (await submitInstruction(event)) setInstructionsOpen(false); }} className="w-full max-w-lg rounded-[8px] border border-[#d8d3cc] bg-[#fbfaf7] shadow-2xl"><div className="relative border-b border-[#e3e0db] px-5 py-4"><button type="button" onClick={() => setInstructionsOpen(false)} aria-label="Close runtime instructions" title="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[#777168] transition-colors hover:bg-[#f0eee9] hover:text-[#171717]"><X size={16} /></button><div className="flex items-center gap-2 pr-9 font-mono text-[9px] uppercase tracking-[0.12em] text-[#171717]"><SlidersHorizontal size={13} />Runtime instructions</div><h3 className="mt-3 pr-9 text-[20px] font-semibold text-[#171717]">Set a standing priority</h3></div><div className="p-5"><textarea autoFocus value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={5} placeholder="Focus on getting qualified clients in Hannover..." className="w-full resize-none border border-[#d8d3cc] bg-white p-3 text-[13px] leading-6 outline-none placeholder:text-[#aaa49c] focus:border-[#171717]" />{instructionNotice ? <p className="mt-3 text-[11px] leading-5 text-[#525252]">{instructionNotice}</p> : null}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setInstructionsOpen(false)} className="h-9 px-3 text-[11px] font-semibold text-[#525252]">Cancel</button><button type="submit" disabled={!instruction.trim() || instructionBusy} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white disabled:opacity-35">{instructionBusy ? <ArcSpin size={13} /> : <Send size={13} />}Save instruction</button></div></div></form></div> : null}
    {capabilityRequest && capabilityRequest.id !== dismissedCapabilityRequestId ? <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label={`Connect ${providerLabel(capabilityRequest.provider)}`}><div className="w-full max-w-md rounded-[8px] border border-[#d8d3cc] bg-[#fbfaf7] shadow-2xl"><div className="relative border-b border-[#e3e0db] px-5 py-4"><button type="button" onClick={() => setDismissedCapabilityRequestId(capabilityRequest.id)} aria-label="Close connection request" title="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[#777168] transition-colors hover:bg-[#f0eee9] hover:text-[#171717]"><X size={16} /></button><div className="flex items-center gap-2 pr-9 font-mono text-[9px] uppercase tracking-[0.12em] text-[#525252]"><Cable size={13} />Capability required</div><h3 className="mt-3 pr-9 text-[20px] font-semibold text-[#171717]">Connect {providerLabel(capabilityRequest.provider)}</h3><p className="mt-2 text-[13px] leading-6 text-[#625f58]">{publicRuntimeText(capabilityRequest.reason)}</p></div><div className="px-5 py-4"><p className="text-[11px] leading-5 text-[#777168]">I paused this todo without discarding it. I am watching the organization connection state and will continue automatically when access is ready.</p><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={async () => { await apiClient.recheckHqCapabilities(); await load(); }} className="h-9 rounded-md border border-[#d8d3cc] px-3 text-[11px] font-semibold text-[#525252]">Check connection</button><button type="button" onClick={openCapability} className="h-9 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white">Connect {providerLabel(capabilityRequest.provider)}</button></div></div></div></div> : null}
    {sprintReviewOpen && activationSprint?.status === 'READY_FOR_REVIEW' ? <div className="fixed inset-0 z-[73] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Review First Growth Sprint"><div className="flex max-h-[min(760px,88vh)] w-full max-w-2xl flex-col overflow-hidden border border-[#171717] bg-[#fbfaf7] shadow-2xl"><div className="relative border-b border-[#d8d3cc] bg-[#171717] px-6 py-5 text-white"><button type="button" onClick={() => setSprintReviewOpen(false)} aria-label="Close sprint review" title="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center text-white/70 hover:bg-white/10 hover:text-white"><X size={16} /></button><div className="flex items-center gap-2 pr-9 font-mono text-[9px] uppercase tracking-[0.16em] text-white/70"><Sparkles size={13} />First Growth Sprint</div><h3 className="mt-3 pr-9 text-[23px] font-semibold">Your first growth actions are ready.</h3><p className="mt-2 max-w-xl text-[12px] leading-5 text-white/70">Review the coordinated launch once. Runtime will preserve each exact artifact, authority decision, schedule, and measurement checkpoint.</p></div><div className="min-h-0 flex-1 overflow-y-auto p-4">{(activationSprint.items || []).map((item, index) => <article key={item.todo_id} className="mb-2 border border-[#dedbd6] bg-white p-4 last:mb-0"><div className="flex items-start gap-3"><span className="font-mono text-[9px] text-[#a19b92]">0{index + 1}</span><div><h4 className="text-[12px] font-semibold text-[#262626]">{item.title}</h4><p className="mt-1 text-[11px] leading-5 text-[#777168]">{item.objective}</p><div className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[#8a8577]">{item.status.replaceAll('_', ' ')}</div></div></div></article>)}</div><div className="border-t border-[#d8d3cc] bg-white px-5 py-4"><p className="mb-3 text-[10px] leading-4 text-[#777168]">Manual reviews future external batches. Auto lets Runtime continue future verified launch gates under organization policy. This review grants only the immutable batches shown here.</p><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => reviewActivationSprint('manual')} disabled={Boolean(approvalBusy)} className="h-10 border border-[#171717] bg-white px-4 text-[11px] font-semibold text-[#171717] disabled:opacity-40">{approvalBusy === 'sprint-manual' ? 'Launching...' : 'Launch, review future work'}</button><button type="button" onClick={() => reviewActivationSprint('auto')} disabled={Boolean(approvalBusy)} className="inline-flex h-10 items-center gap-2 bg-[#171717] px-4 text-[11px] font-semibold text-white disabled:opacity-40">{approvalBusy === 'sprint-auto' ? <ArcSpin size={13} /> : <Play size={13} />}Launch and continue automatically</button></div></div></div></div> : null}
    {activationSprint?.status !== 'READY_FOR_REVIEW' && playbookApproval && playbookApproval.run_id !== dismissedWorkflowApprovalId ? <div className="fixed inset-0 z-[72] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Choose email send policy"><div className="flex max-h-[min(760px,88vh)] w-full max-w-2xl flex-col overflow-hidden rounded-[8px] border border-[#d8d3cc] bg-[#fbfaf7] shadow-2xl"><div className="relative border-b border-[#e3e0db] px-5 py-4"><button type="button" onClick={() => setDismissedWorkflowApprovalId(playbookApproval.run_id)} aria-label="Close email approval" title="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[#777168] transition-colors hover:bg-[#f0eee9] hover:text-[#171717]"><X size={16} /></button><div className="flex items-center gap-2 pr-9 font-mono text-[9px] uppercase tracking-[0.12em] text-[#525252]"><ShieldCheck size={13} />Outbound message authority</div><h3 className="mt-3 pr-9 text-[20px] font-semibold text-[#171717]">{playbookApproval.preference === 'unconfigured' ? 'Emails are ready. How should Runtime send?' : 'Emails are ready for review'}</h3><p className="mt-2 pr-9 text-[12px] leading-5 text-[#777168]">{playbookApproval.preference === 'unconfigured' ? 'Choose once for this organization. Auto sends future verified email batches; Manual pauses every batch until you approve it.' : 'Manual review is active. Nothing will be sent until you approve this exact batch.'}</p></div><div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="space-y-3">{(playbookApproval.messages || []).map((message, index) => <article key={`${message.id || message.to || 'message'}-${index}`} className="border border-[#dedbd6] bg-white"><div className="grid gap-2 border-b border-[#ebe8e3] px-4 py-3 sm:grid-cols-[100px_1fr]"><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a8577]">To</span><span className="truncate text-[11px] font-medium text-[#262626]">{message.to}</span><span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8a8577]">Subject</span><span className="text-[11px] font-medium text-[#262626]">{message.subject}</span></div><p className="whitespace-pre-wrap px-4 py-3 text-[12px] leading-5 text-[#525252]">{message.body}</p></article>)}</div></div><div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e3e0db] bg-white px-5 py-4">{playbookApproval.preference === 'unconfigured' ? <><button type="button" onClick={() => decidePlaybookAuthority({ preference: 'manual', approve: false })} disabled={Boolean(approvalBusy)} className="h-9 rounded-md border border-[#d8d3cc] px-4 text-[11px] font-semibold text-[#525252] disabled:opacity-40">{approvalBusy === 'manual' ? 'Saving...' : 'Review every time'}</button><button type="button" onClick={() => decidePlaybookAuthority({ preference: 'auto', approve: true })} disabled={Boolean(approvalBusy)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white disabled:opacity-40">{approvalBusy === 'auto-send' ? <ArcSpin size={13} /> : <Send size={13} />}Auto send</button></> : <button type="button" onClick={() => decidePlaybookAuthority({ preference: 'manual', approve: true })} disabled={Boolean(approvalBusy)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#171717] px-4 text-[11px] font-semibold text-white disabled:opacity-40">{approvalBusy === 'manual-send' ? <ArcSpin size={13} /> : <Send size={13} />}Approve and send</button>}</div></div></div> : null}
  </section>;
}
