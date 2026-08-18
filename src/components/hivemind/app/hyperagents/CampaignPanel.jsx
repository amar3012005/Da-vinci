// Outreach campaign panel — the post-report execution step. Renders under the
// prospect stack on a sealed turn: "Send outreach emails (N)" / "Start outreach
// calls (M)". Creating a campaign snapshots the eligible prospects server-side;
// Email batches retain the paced browser runner. TARA call sequences are owned
// by Core: it prepares one target, waits for the real post-call analysis, saves
// the learning, and only then advances. The panel observes that durable state.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2, Mail, PhoneCall, Play, Square, CheckCheck, X, ChevronDown, Pencil,
  Headphones, Send,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import AaasVoiceWidget from '../../AaasVoiceWidget';
import { useTypewriter } from './elements/LiveActionCards';

// Same class of drift found and fixed in HqRuntimeConsole.jsx and
// CompanyDashboard.jsx: this exact error-extraction expression was
// hand-copied across 4 catch blocks in this file. One helper, one behavior.
export const extractErr = (e) => e?.response?.data?.error || e.message;

// The same Loader2+animate-spin markup was copy-pasted at 3 call sites,
// differing only in size/className. One component, used by all three.
export const Spinner = ({ size = 10, className = 'animate-spin' }) => (
  <Loader2 size={size} className={className} />
);

const EMAIL_PACE_MS = 8500; // FE pacing (BE enforces 8s — stay just above)
// tara-deepgram base (same residency-correct derivation as TaraConfig).
const _CORE_HTTP = (process.env.REACT_APP_CORE_API_URL || 'https://core.hivemind.davinciai.eu:8050').replace(/\/$/, '');
const DG_HTTP = (process.env.REACT_APP_TARA_DG_HTTP || `${_CORE_HTTP}/voice2`).replace(/\/$/, '');
const DG_WS = DG_HTTP.replace(/^http/, 'ws');
// The live-listen tap lives on whichever ADAPTER ran the call — /voice2 for
// deepgram, /voice-grok for grok. Assuming deepgram means a Grok call connects
// to a service that has never heard of that session, so you get silence.
const GROK_WS = `${_CORE_HTTP}/voice-grok`.replace(/^http/, 'ws');
const listenBaseFor = (provider) => (provider === 'grok' ? GROK_WS : DG_WS);

// Live-listen — hear an in-flight TARA call from the browser (listen-only).
// Connects to tara-deepgram's /calls/listen WS: binary = PCM16 mono 8kHz
// (both call directions), JSON = transcript/ended control events.
function LiveListen({ sessionId, provider }) {
  const [on, setOn] = useState(false);
  const [line, setLine] = useState('');
  const wsRef = useRef(null);
  const ctxRef = useRef(null);
  const tRef = useRef(0);

  const stop = useCallback(() => {
    try { wsRef.current?.close(); } catch { /* closing */ }
    try { ctxRef.current?.close(); } catch { /* closing */ }
    wsRef.current = null; ctxRef.current = null; setOn(false);
  }, []);

  const start = useCallback(async () => {
    if (on || !sessionId) return;
    // Mint a short-lived, session-scoped listen capability. The adapter's shared
    // key authorizes DIALING, so it must never reach the browser — Core checks
    // that this org owns the call, then signs a token good only for this session.
    let token;
    try {
      ({ token } = await apiClient.createTaraListenToken(sessionId));
    } catch (e) {
      setLine(e?.response?.status === 404
        ? 'This call is no longer live.'
        : 'Could not start listening.');
      return;
    }
    if (!token) { setLine('Could not start listening.'); return; }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx; tRef.current = ctx.currentTime + 0.1;
    const ws = new WebSocket(
      `${listenBaseFor(provider)}/calls/listen?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`,
    );
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        try {
          const j = JSON.parse(ev.data);
          if (j.type === 'transcript' && j.content) setLine(`${j.role === 'assistant' ? 'TARA' : 'Caller'}: ${j.content}`);
          if (j.type === 'ended') stop();
        } catch { /* control frame */ }
        return;
      }
      // PCM16 mono 8kHz → schedule seamless playback.
      const i16 = new Int16Array(ev.data);
      if (!i16.length) return;
      const buf = ctx.createBuffer(1, i16.length, 8000);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < i16.length; i++) ch[i] = i16[i] / 32768;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination);
      const at = Math.max(tRef.current, ctx.currentTime + 0.02);
      src.start(at); tRef.current = at + buf.duration;
    };
    ws.onclose = () => stop();
    ws.onerror = () => stop();
    setOn(true);
  }, [on, sessionId, provider, stop]);

  useEffect(() => () => stop(), [stop]);
  if (!sessionId) return null;
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <button onClick={on ? stop : start}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider shrink-0 ${on ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}
        title={on ? 'Stop listening' : 'Listen to this call live (listen-only)'}>
        <Headphones size={10} /> {on ? 'Stop' : 'Listen'}
      </button>
      {on && line && <span className="text-[9.5px] text-[#525252] truncate">{line}</span>}
    </span>
  );
}

function Bar({ done, failed, total }) {
  const pDone = total ? (done / total) * 100 : 0;
  const pFail = total ? (failed / total) * 100 : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-[#eceae4] overflow-hidden flex">
      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pDone}%` }} />
      <div className="h-full bg-red-400 transition-all" style={{ width: `${pFail}%` }} />
    </div>
  );
}

// The one-at-a-time "hero" card — only the target currently being written/sent
// or dialed is shown full-size (subject/body typed out live for email; a
// ringing/in-call view for a call), matching the room's own live-typing
// compose card. The rest of the queue stays a compact strip so the popup
// never shows more than one in-flight draft or call at once.
function ActiveTargetCard({ channel, target }) {
  const p = target?.payload || {};
  const body = channel === 'email' ? (p.body || '') : '';
  const st = target?.state;
  const isWriting = channel === 'email' && !!body && st !== 'sent';
  const { shown, done } = useTypewriter(body, { start: isWriting });
  if (!target) return null;

  if (channel === 'email') {
    const label = {
      selected: 'Queued', generating: 'Generating draft…', ready: 'Ready',
      sending: done ? 'Sending…' : 'Writing…', sent: 'Sent', failed: 'Failed',
    }[st] || st;
    return (
      <div className="rounded-xl overflow-hidden border border-[#d4d4d4] shadow-lg bg-white">
        <div className="flex items-center justify-between bg-[#404040] px-3 py-2">
          <span className="text-[12px] text-white font-medium flex items-center gap-2 truncate">
            <Mail size={13} className="shrink-0" /> {target.company}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#d4d4d4] shrink-0">{label}</span>
        </div>
        <div className="px-3 text-[12px]">
          <div className="flex gap-2 border-b border-[#eee] py-1.5">
            <span className="text-[#a3a3a3] w-12 shrink-0">To</span>
            <span className="text-[#0a0a0a] truncate">{target.email || '—'}</span>
          </div>
          <div className="flex gap-2 border-b border-[#eee] py-1.5">
            <span className="text-[#a3a3a3] w-12 shrink-0">Subject</span>
            <span className="text-[#0a0a0a] font-medium truncate">{p.subject || '…'}</span>
          </div>
          <div className="py-3 min-h-[100px] max-h-[300px] overflow-y-auto leading-relaxed text-[13px] text-[#1f1f1f]">
            {!body ? (
              <span className="inline-flex items-center gap-1.5 text-[#a3a3a3] text-[11px]">
                <Loader2 size={11} className="animate-spin" /> waiting for the draft…
              </span>
            ) : done || st === 'sent' ? (
              <div className="whitespace-pre-wrap">{body}</div>
            ) : (
              <div className="whitespace-pre-wrap">{shown}
                <span className="inline-block w-[7px] h-[14px] bg-[#1a73e8] align-text-bottom animate-pulse ml-0.5" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-t border-[#eee] bg-[#fafafa]">
          {st === 'sent' ? (
            <span className="text-[11px] font-medium flex items-center gap-1 text-emerald-700"><CheckCheck size={12} /> Sent</span>
          ) : st === 'failed' ? (
            <span className="text-[11px] font-medium text-red-600 truncate">{target.resultRef?.error || 'Failed'}</span>
          ) : (
            <span className="text-[11px] text-[#525252] flex items-center gap-1.5">
              <Send size={11} /> Sends automatically once written
            </span>
          )}
        </div>
      </div>
    );
  }

  // Call channel — a ringing/in-call hero card, one dial at a time.
  const chip = {
    selected: 'Dialing next…', ready: 'Dialing next…', dialing: 'Ringing…',
    in_call: 'Call in progress', analyzing: 'Analysing…', analyzed: 'Analysed',
    failed: 'Call failed',
  }[st] || st;
  const live = ['dialing', 'in_call'].includes(st);
  return (
    <div className="rounded-2xl bg-[#111] text-white shadow-2xl px-5 pt-6 pb-5 text-center">
      <div className="relative mx-auto w-16 h-16 mb-3">
        {live && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
            <span className="absolute -inset-2 rounded-full bg-emerald-500/15 animate-ping [animation-delay:300ms]" />
          </>
        )}
        <span className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600">
          <PhoneCall size={24} className={live ? 'animate-pulse' : ''} />
        </span>
      </div>
      <div className="text-[14px] font-medium truncate">{target.company}</div>
      <div className="text-[12px] font-mono text-[#a3a3a3] mt-0.5">{target.phone}</div>
      <div className={`text-[11px] mt-2 ${st === 'failed' ? 'text-red-400' : 'text-emerald-400'}`}>
        {live ? <span className="animate-pulse">{chip}</span> : chip}
      </div>
      {target.resultRef?.sessionId && ['dialing', 'in_call', 'analyzing'].includes(st) && (
        <div className="mt-3 flex justify-center">
          <LiveListen sessionId={target.resultRef.sessionId} provider={target.resultRef.provider} />
        </div>
      )}
    </div>
  );
}

function TargetRow({ c, target, onPatch, disabled, post }) {
  const [open, setOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const st = target.state;
  const sel = st !== 'deselected';
  const chip = {
    sent: ['✓ sent', 'bg-emerald-100 text-emerald-700'],
    dialing: ['dialing...', 'bg-blue-100 text-blue-700'],
    in_call: ['in call', 'bg-blue-100 text-blue-700'],
    analyzing: ['analyzing...', 'bg-violet-100 text-violet-700'],
    analyzed: ['✓ analyzed', 'bg-emerald-100 text-emerald-700'],
    failed: ['✗ failed', 'bg-red-100 text-red-700'],
    sending: [c.channel === 'call' ? '📞 dialing…' : 'sending…', 'bg-blue-100 text-blue-700'],
    browser: ['browser call', 'bg-violet-100 text-violet-700'],
    generating: ['writing…', 'bg-violet-100 text-violet-700'],
    ready: ['ready', 'bg-[#f4f2ec] text-[#525252]'],
    skipped: ['skipped', 'bg-[#f4f2ec] text-[#a3a3a3]'],
    deselected: ['off', 'bg-[#f4f2ec] text-[#a3a3a3]'],
    selected: ['queued', 'bg-[#f4f2ec] text-[#a3a3a3]'],
  }[st] || [st, 'bg-[#f4f2ec] text-[#a3a3a3]'];
  const immutable = disabled || ['sending', 'sent', 'dialing', 'in_call', 'analyzing', 'analyzed', 'browser'].includes(st);
  const p = target.payload || {};
  return (
    <div className={`rounded-lg border px-3 py-2 ${['sent', 'analyzed'].includes(st) ? 'border-emerald-200 bg-emerald-50/40'
      : st === 'failed' ? 'border-red-200 bg-red-50/40' : 'border-[#e3e0db] bg-white'} ${!sel ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={sel} disabled={immutable}
          onChange={() => onPatch(target.id, { selected: !sel })}
          className="accent-[#117dff] shrink-0" />
        <span className="text-[12px] font-semibold text-[#0a0a0a] truncate">{target.company}</span>
        <span className="text-[10px] font-mono text-[#a3a3a3] truncate">
          {c.channel === 'email' ? target.email : target.phone}
        </span>
        <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider shrink-0 ${chip[1]}`}>
          {['sending', 'dialing', 'analyzing'].includes(st) && <Spinner size={9} className="inline animate-spin mr-1" />}{chip[0]}
        </span>
        {(p.subject || p.goal) && (
          <button onClick={() => { setOpen(o => !o); setDraft(null); }}
            className="p-0.5 text-[#a3a3a3] hover:text-[#117dff] shrink-0" title="View / edit">
            <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {target.resultRef?.error && (
        <div className="mt-1 text-[10px] text-red-600 font-mono truncate">{target.resultRef.error}</div>
      )}
      {c.channel === 'call' && st === 'browser' && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setBrowserOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-100 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-violet-700 hover:bg-violet-200"
          >
            <Headphones size={11} /> {browserOpen ? 'Hide browser call' : 'Run in browser'}
          </button>
          <span className="ml-2 text-[10px] text-[#737373]">
            {target.resultRef?.reason || 'Telephony is not connected for this provider.'}
          </span>
        </div>
      )}
      {c.channel === 'call' && st === 'browser' && browserOpen && (
        <div className="mt-2">
          <AaasVoiceWidget
            userId={c.userId}
            orgId={c.orgId}
            provider={c.voiceProvider || target.resultRef?.provider || 'grok'}
            language={p.language || 'en'}
            initialGoal={(p.contract?.objective?.directive || p.goal || '').slice(0, 600)}
            initialMode="external"
          />
        </div>
      )}
      {/* Live-listen while a TARA call is in flight (dial placed → sessionId known). */}
      {c.channel === 'call' && ['dialing', 'in_call', 'analyzing'].includes(st) && target.resultRef?.sessionId && (
        <div className="mt-1.5">
          <LiveListen sessionId={target.resultRef.sessionId} provider={target.resultRef.provider || c.voiceProvider} />
        </div>
      )}
      {/* Post-call results — everything the analysis produced, in one block.
          'processing' is server-derived (call ended, insight not written yet),
          so this spinner reflects real work rather than a timer. */}
      {c.channel === 'call' && target.resultRef?.sessionId && post && post.post_call !== 'live' && (
        <div className="mt-1.5 rounded-md bg-[#faf9f6] border border-[#eceae4] px-2 py-1.5">
          {post.post_call === 'processing' ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">
              <Spinner size={10} /> Analysing call…
            </span>
          ) : (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {post.insight?.goal_outcome && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-blue-100 text-blue-700">
                    {post.insight.goal_outcome}
                  </span>
                )}
                {post.insight?.sentiment && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-[#f4f2ec] text-[#525252]">
                    {post.insight.sentiment}
                  </span>
                )}
                {post.insight?.lead_found && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-amber-100 text-amber-700">
                    ★ lead
                  </span>
                )}
                {typeof post.turnCount === 'number' && post.turnCount > 0 && (
                  <span className="text-[9px] font-mono text-[#a3a3a3]">{post.turnCount} turns</span>
                )}
              </div>
              {post.insight?.summary && (
                <p className="text-[10.5px] text-[#525252] leading-snug">{post.insight.summary}</p>
              )}
              {(post.insight?.leads || []).slice(0, 2).map((ld, i) => (
                <p key={i} className="text-[10px] text-[#0a0a0a]">
                  ★ {[ld.name, ld.company, ld.contact].filter(Boolean).join(' · ')}
                  {ld.next_step ? <span className="text-[#525252]"> — next: {ld.next_step}</span> : null}
                </p>
              ))}
              {(post.insight?.tara_learnings || []).slice(0, 2).map((ln, i) => (
                <p key={i} className="text-[10px] text-[#a37c00]">↳ learning: {typeof ln === 'string' ? ln : JSON.stringify(ln)}</p>
              ))}
              {!post.insight && (
                <p className="text-[10px] text-[#a3a3a3]">No insight produced — the call ended before anything was said.</p>
              )}
            </div>
          )}
        </div>
      )}
      {open && (p.subject || p.goal) && (
        <div className="mt-2 space-y-1.5">
          {c.channel === 'email' ? (
            <>
              <input value={(draft ?? p).subject || ''} disabled={immutable}
                onChange={e => setDraft({ ...(draft ?? p), subject: e.target.value })}
                className="w-full text-[11px] font-semibold px-2 py-1 rounded border border-[#e3e0db] bg-[#faf9f4]" />
              <textarea value={(draft ?? p).body || ''} disabled={immutable} rows={6}
                onChange={e => setDraft({ ...(draft ?? p), body: e.target.value })}
                className="w-full text-[11px] px-2 py-1 rounded border border-[#e3e0db] bg-[#faf9f4] font-mono" />
            </>
          ) : (
            <>
              <label className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">Call goal</label>
              <input value={(draft ?? p).goal || ''} disabled={immutable}
                onChange={e => setDraft({ ...(draft ?? p), goal: e.target.value })}
                className="w-full text-[11px] px-2 py-1 rounded border border-[#e3e0db] bg-[#faf9f4]" />
              <label className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">Opener</label>
              <input value={(draft ?? p).opener || ''} disabled={immutable}
                onChange={e => setDraft({ ...(draft ?? p), opener: e.target.value })}
                className="w-full text-[11px] px-2 py-1 rounded border border-[#e3e0db] bg-[#faf9f4]" />
            </>
          )}
          {draft && !immutable && (
            <button onClick={() => { onPatch(target.id, { payload: draft }); setDraft(null); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider bg-[#117dff] text-white hover:bg-[#0e6be0]">
              <Pencil size={10} /> Save edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CampaignPanel({ roomId, turnId, channel, eligibleCount, onClose }) {
  const [campaign, setCampaign] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const runningRef = useRef(false);
  const campaignRef = useRef(null);
  campaignRef.current = campaign;

  const refresh = useCallback(async (id) => {
    try {
      const { campaign: c } = await apiClient.getOutreachCampaign(id);
      setCampaign(c);
      return c;
    } catch { return null; }
  }, []);

  // ── Post-call results: insight + outcome + leads + learnings, in one shot ──
  // Keyed by sessionId. post_call is 'live' | 'processing' | 'ready', derived
  // SERVER-side from real rows (has the call ended? does an insight row exist?),
  // so the "analysing" state below is truthful rather than a timer dressed up as
  // progress. Polls only while something is unresolved and stops by itself, so a
  // finished campaign costs nothing.
  const [postCall, setPostCall] = useState({});
  const postKey = (campaign?.targets || [])
    .map((t) => t.resultRef?.sessionId).filter(Boolean).join(',');
  const isCallCampaign = campaign?.channel === 'call';
  useEffect(() => {
    if (!postKey || !isCallCampaign) return undefined;
    let dead = false;
    let timer = null;
    const tick = async () => {
      try {
        const { calls } = await apiClient.listTaraCallsBySessions(postKey.split(','));
        if (dead) return;
        const next = {};
        for (const call of calls || []) if (call?.sessionId) next[call.sessionId] = call;
        setPostCall(next);
        const terminalCalls = (calls || []).filter((call) => ['ready', 'none'].includes(call?.post_call));
        for (const call of terminalCalls) {
          const target = (campaignRef.current?.targets || []).find((item) => item.resultRef?.sessionId === call.sessionId);
          if (target && !['analyzed', 'failed'].includes(target.state)) {
            await apiClient.reconcileOutreachTarget(campaignRef.current.id, target.id).catch(() => null);
          }
        }
        if (terminalCalls.length && campaignRef.current?.id) await refresh(campaignRef.current.id);
        const unresolved = postKey.split(',').some((s) => {
          const st = next[s]?.post_call || 'processing';
          return st !== 'ready' && st !== 'none';  // 'none' is terminal too
        });
        if (unresolved) timer = setTimeout(tick, 4000);
      } catch {
        if (!dead) timer = setTimeout(tick, 8000);
      }
    };
    tick();
    return () => { dead = true; if (timer) clearTimeout(timer); };
  }, [postKey, isCallCampaign, refresh]);

  useEffect(() => {
    if (!isCallCampaign || campaign?.status !== 'running' || !campaign?.id) return undefined;
    let dead = false;
    const timer = window.setInterval(() => {
      if (!dead) refresh(campaign.id);
    }, 2500);
    return () => { dead = true; window.clearInterval(timer); };
  }, [campaign?.id, campaign?.status, isCallCampaign, refresh]);

  // Create the campaign (snapshot) on mount.
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const { campaign: c, error } = await apiClient.createOutreachCampaign(roomId, channel, turnId);
        if (!dead) (error ? setErr(error) : setCampaign(c));
      } catch (e) {
        if (!dead) setErr(extractErr(e));
      }
    })();
    return () => { dead = true; runningRef.current = false; };
  }, [roomId, channel, turnId]);

  const patchTarget = useCallback(async (targetId, patch) => {
    const c = campaignRef.current;
    if (!c) return;
    try {
      await apiClient.patchOutreachTarget(c.id, targetId, patch);
      await refresh(c.id);
    } catch (e) { setErr(extractErr(e)); }
  }, [refresh]);

  // The one-by-one runner. Generates then executes each selected target in
  // position order; a per-target failure never stops the batch. Stop flips
  // runningRef — the current item finishes, no new one starts.
  const run = useCallback(async () => {
    const c0 = campaignRef.current;
    if (!c0 || runningRef.current) return;
    setBusy(true); setErr(null);
    try { await apiClient.controlOutreachCampaign(c0.id, 'start'); } catch (e) {
      setErr(extractErr(e)); setBusy(false); return;
    }
    runningRef.current = true;
    let c = await refresh(c0.id);
    if (c0.channel === 'call') {
      runningRef.current = false;
      setBusy(false);
      return;
    }
    while (runningRef.current && c) {
      const next = (c.targets || []).find(t => ['selected', 'ready'].includes(t.state));
      if (!next) break;
      try {
        if (next.state === 'selected') await apiClient.generateOutreachTarget(c.id, next.id);
        await refresh(c.id);
        if (!runningRef.current) break;
        const fresh = (campaignRef.current?.targets || []).find(t => t.id === next.id);
        if (fresh && fresh.state === 'ready') {
          await apiClient.executeOutreachTarget(c.id, next.id);
          if (c.channel === 'email') await new Promise(ok => { setTimeout(ok, EMAIL_PACE_MS); });
        }
      } catch (e) {
        const msg = extractErr(e);
        if (e?.response?.status === 429) { // pacing — wait and retry same target
          await new Promise(ok => { setTimeout(ok, 4000); });
        } else if (msg === 'gmail-reauth') {
          setErr('Gmail token expired — reconnect Gmail, then Resume.');
          runningRef.current = false;
        }
        // other per-target failures: state is already 'failed'; loop continues
      }
      c = await refresh(c0.id);
      if (c && ['paused', 'done', 'cancelled'].includes(c.status)) break;
    }
    runningRef.current = false;
    setBusy(false);
    await refresh(c0.id);
  }, [refresh]);

  const stop = useCallback(async () => {
    runningRef.current = false;
    const c = campaignRef.current;
    if (c) {
      try { await apiClient.controlOutreachCampaign(c.id, 'stop'); } catch { /* already stopped */ }
      await refresh(c.id);
    }
  }, [refresh]);

  // Closing mid-run stops the batch first — never leaves an orphaned runner
  // behind a closed popup.
  const handleClose = useCallback(() => {
    if (runningRef.current) stop();
    onClose && onClose();
  }, [stop, onClose]);

  const targets = campaign?.targets || [];
  const inRun = targets.filter(t => t.state !== 'deselected');
  const done = targets.filter(t => t.state === 'sent' || t.state === 'analyzed' || t.state === 'browser').length;
  const failed = targets.filter(t => t.state === 'failed').length;
  const running = runningRef.current || busy || campaign?.status === 'running';
  const finished = !!campaign && (campaign.status === 'done' || (!running && done + failed >= inRun.length && inRun.length > 0));
  // The single target on stage right now: whatever is actively being written/
  // sent/dialed, else the next one up next. Everything else stays behind the
  // "Show full queue" toggle — only one draft/call is ever on screen at once.
  const activeTarget = targets.find(t => ['generating', 'sending', 'dialing', 'in_call', 'analyzing'].includes(t.state))
    || targets.find(t => ['selected', 'ready'].includes(t.state));

  return (
    <div className="fixed inset-0 z-[60] bg-[#1a1814]/45 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}>
      <div className="w-full max-w-[420px] rounded-2xl border border-[#e3e0db] bg-[#faf9f4] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e3e0db] bg-white">
          {campaign?.channel === 'call'
            ? <PhoneCall size={13} className="text-[#117dff]" />
            : <Mail size={13} className="text-[#117dff]" />}
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#0a0a0a] font-semibold">
            {campaign?.channel === 'call' ? 'TARA call outreach' : 'Email outreach'}
          </span>
          {campaign?.senderEmail && (
            <span className="text-[10px] font-mono text-[#a3a3a3] truncate">from {campaign.senderEmail}</span>
          )}
          {campaign && (
            <span className="ml-auto text-[11px] font-mono text-[#525252]">
              {done}/{inRun.length}{failed ? ` · ${failed} failed` : ''}
            </span>
          )}
          <button onClick={handleClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]" title="Close"><X size={15} /></button>
        </div>
        <div className="p-4">
          {err && !campaign && (
            <div className="flex items-center gap-2 text-[11px] text-red-600">{err}</div>
          )}
          {!campaign && !err && (
            <div className="flex items-center gap-2 text-[11px] text-[#525252]">
              <Spinner size={12} /> Preparing outreach ({eligibleCount} prospects)…
            </div>
          )}
          {campaign && (
            <>
              <Bar done={done} failed={failed} total={inRun.length || 1} />
              <div className="mt-3 flex items-center gap-2">
                {!running && !finished && (
                  <button onClick={run}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider bg-[#117dff] text-white hover:bg-[#0e6be0]">
                    <Play size={11} /> {campaign.status === 'paused' || done > 0
                      ? 'Resume'
                      : (campaign.channel === 'call' ? `Start TARA outreach (${inRun.length})` : `Start email outreach (${inRun.length})`)}
                  </button>
                )}
                {running && (
                  <button onClick={stop}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider border border-red-300 text-red-600 hover:bg-red-50">
                    <Square size={11} /> Stop
                  </button>
                )}
                {finished && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-mono uppercase tracking-wider">
                    <CheckCheck size={12} /> {campaign.channel === 'email' ? `${done} emails sent` : `${done} calls analyzed`}
                  </span>
                )}
                {err && <span className="text-[10px] text-red-600 truncate">{err}</span>}
              </div>

              {/* One draft / one call on stage at a time. */}
              {(running || activeTarget) && !finished && (
                <div className="mt-3">
                  <ActiveTargetCard channel={campaign.channel} target={activeTarget} />
                </div>
              )}

              <button type="button" onClick={() => setShowQueue(v => !v)}
                className="mt-3 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] hover:text-[#525252]">
                <ChevronDown size={11} className={`transition-transform ${showQueue ? 'rotate-180' : ''}`} />
                {showQueue ? 'Hide full queue' : `Show full queue (${inRun.length})`}
              </button>
              {showQueue && (
                <div className="mt-2 flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                  {targets.map(t => (
                    <TargetRow key={t.id} c={campaign} target={t} onPatch={patchTarget} disabled={false}
                      post={postCall[t.resultRef?.sessionId]} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
