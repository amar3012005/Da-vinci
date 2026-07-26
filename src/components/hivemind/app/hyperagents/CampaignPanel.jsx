// Outreach campaign panel — the post-report execution step. Renders under the
// prospect stack on a sealed turn: "Send outreach emails (N)" / "Start outreach
// calls (M)". Creating a campaign snapshots the eligible prospects server-side;
// this panel then drives the run ONE BY ONE (generate → execute per target) with
// a live progress bar, stop/resume, per-target deselect and inline payload edit.
// The backend drain worker finishes a run if this tab dies — the panel is the
// pace-setter, not the owner. Room-agnostic: keyed on the prospects artifact.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2, Mail, PhoneCall, Play, Square, CheckCheck, X, ChevronDown, Pencil,
  Headphones,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import AaasVoiceWidget from '../../AaasVoiceWidget';

const EMAIL_PACE_MS = 8500; // FE pacing (BE enforces 8s — stay just above)
// tara-deepgram base (same residency-correct derivation as TaraConfig).
const _CORE_HTTP = (process.env.REACT_APP_CORE_API_URL || 'https://core.hivemind.davinciai.eu:8050').replace(/\/$/, '');
const DG_HTTP = (process.env.REACT_APP_TARA_DG_HTTP || `${_CORE_HTTP}/voice2`).replace(/\/$/, '');
const DG_WS = DG_HTTP.replace(/^http/, 'ws');

// Live-listen — hear an in-flight TARA call from the browser (listen-only).
// Connects to tara-deepgram's /calls/listen WS: binary = PCM16 mono 8kHz
// (both call directions), JSON = transcript/ended control events.
function LiveListen({ sessionId }) {
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
      `${DG_WS}/calls/listen?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`,
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
  }, [on, sessionId, stop]);

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

function TargetRow({ c, target, onPatch, disabled }) {
  const [open, setOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const st = target.state;
  const sel = st !== 'deselected';
  const chip = {
    sent: ['✓ sent', 'bg-emerald-100 text-emerald-700'],
    failed: ['✗ failed', 'bg-red-100 text-red-700'],
    sending: [c.channel === 'call' ? '📞 dialing…' : 'sending…', 'bg-blue-100 text-blue-700'],
    browser: ['browser call', 'bg-violet-100 text-violet-700'],
    generating: ['writing…', 'bg-violet-100 text-violet-700'],
    ready: ['ready', 'bg-[#f4f2ec] text-[#525252]'],
    skipped: ['skipped', 'bg-[#f4f2ec] text-[#a3a3a3]'],
    deselected: ['off', 'bg-[#f4f2ec] text-[#a3a3a3]'],
    selected: ['queued', 'bg-[#f4f2ec] text-[#a3a3a3]'],
  }[st] || [st, 'bg-[#f4f2ec] text-[#a3a3a3]'];
  const immutable = ['sending', 'sent', 'browser'].includes(st);
  const p = target.payload || {};
  return (
    <div className={`rounded-lg border px-3 py-2 ${st === 'sent' ? 'border-emerald-200 bg-emerald-50/40'
      : st === 'failed' ? 'border-red-200 bg-red-50/40' : 'border-[#e3e0db] bg-white'} ${!sel ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={sel} disabled={immutable || disabled}
          onChange={() => onPatch(target.id, { selected: !sel })}
          className="accent-[#117dff] shrink-0" />
        <span className="text-[12px] font-semibold text-[#0a0a0a] truncate">{target.company}</span>
        <span className="text-[10px] font-mono text-[#a3a3a3] truncate">
          {c.channel === 'email' ? target.email : target.phone}
        </span>
        <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider shrink-0 ${chip[1]}`}>
          {st === 'sending' && <Loader2 size={9} className="inline animate-spin mr-1" />}{chip[0]}
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
      {c.channel === 'call' && ['sending', 'sent'].includes(st) && target.resultRef?.sessionId && (
        <div className="mt-1.5">
          <LiveListen sessionId={target.resultRef.sessionId} />
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

  // Create the campaign (snapshot) on mount.
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const { campaign: c, error } = await apiClient.createOutreachCampaign(roomId, channel, turnId);
        if (!dead) (error ? setErr(error) : setCampaign(c));
      } catch (e) {
        if (!dead) setErr(e?.response?.data?.error || e.message);
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
    } catch (e) { setErr(e?.response?.data?.error || e.message); }
  }, [refresh]);

  // The one-by-one runner. Generates then executes each selected target in
  // position order; a per-target failure never stops the batch. Stop flips
  // runningRef — the current item finishes, no new one starts.
  const run = useCallback(async () => {
    const c0 = campaignRef.current;
    if (!c0 || runningRef.current) return;
    setBusy(true); setErr(null);
    try { await apiClient.controlOutreachCampaign(c0.id, 'start'); } catch (e) {
      setErr(e?.response?.data?.error || e.message); setBusy(false); return;
    }
    runningRef.current = true;
    let c = await refresh(c0.id);
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
        const msg = e?.response?.data?.error || e.message;
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

  if (err && !campaign) {
    return (
      <div className="mt-2 pl-2 flex items-center gap-2 text-[11px] text-red-600">
        <X size={12} /> {err}
        <button onClick={onClose} className="ml-auto text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={12} /></button>
      </div>
    );
  }
  if (!campaign) {
    return (
      <div className="mt-2 pl-2 flex items-center gap-2 text-[11px] text-[#525252]">
        <Loader2 size={12} className="animate-spin" /> Preparing campaign ({eligibleCount} prospects)…
      </div>
    );
  }

  const targets = campaign.targets || [];
  const inRun = targets.filter(t => t.state !== 'deselected');
  const done = targets.filter(t => t.state === 'sent' || t.state === 'browser').length;
  const failed = targets.filter(t => t.state === 'failed').length;
  const running = runningRef.current || busy;
  const finished = campaign.status === 'done' || (!running && done + failed >= inRun.length && inRun.length > 0);

  return (
    <div className="mt-2 pl-2">
      <div className="rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3">
        <div className="flex items-center gap-2">
          {campaign.channel === 'email'
            ? <Mail size={13} className="text-[#117dff]" />
            : <PhoneCall size={13} className="text-[#117dff]" />}
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#0a0a0a] font-semibold">
            {campaign.channel === 'email' ? 'Email campaign' : 'Call campaign'}
          </span>
          {campaign.senderEmail && (
            <span className="text-[10px] font-mono text-[#a3a3a3] truncate">from {campaign.senderEmail}</span>
          )}
          <span className="ml-auto text-[11px] font-mono text-[#525252]">
            {done}/{inRun.length}{failed ? ` · ${failed} failed` : ''}
          </span>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]" title="Close"><X size={13} /></button>
        </div>
        <div className="mt-2"><Bar done={done} failed={failed} total={inRun.length || 1} /></div>
        <div className="mt-2 flex items-center gap-2">
          {!running && !finished && (
            <button onClick={run}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider bg-[#117dff] text-white hover:bg-[#0e6be0]">
              <Play size={11} /> {campaign.status === 'paused' || done > 0 ? 'Resume' : 'Start'}
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
              <CheckCheck size={12} /> {campaign.channel === 'email' ? `${done} emails sent` : `${done} calls ready`}
            </span>
          )}
          {err && <span className="text-[10px] text-red-600 truncate">{err}</span>}
        </div>
        <div className="mt-2 flex flex-col gap-1.5 max-h-80 overflow-y-auto">
          {targets.map(t => (
            <TargetRow key={t.id} c={campaign} target={t} onPatch={patchTarget} disabled={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
