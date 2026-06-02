/**
 * AaasVoiceWidget — realtime voice via the self-hosted TARA AaaS.
 *
 * Protocol (vs the Cartesia-hosted widget): RAW PCM bytes both ways.
 *   • mic  → AudioWorklet/ScriptProcessor → Int16 PCM @16k → ws.send(ArrayBuffer)
 *   • recv → binary frame = raw PCM s16le @16k → Web Audio playback (scheduled)
 *   • recv → text frame   = JSON control {type: ready|transcript|speech_start|turn_done|error}
 *
 * WSS endpoint: wss://core.hivemind.davinciai.eu:8050/aaas/voice
 *   ?user_id=&org_id=&session_id=&language=   (tenant = user_id; auth hardening = Phase 2)
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2, AlertTriangle, Volume2 } from 'lucide-react';

const SAMPLE_RATE = 16000;
const DEFAULT_WS =
  process.env.REACT_APP_AAAS_WS ||
  'wss://core.hivemind.davinciai.eu:8050/aaas/voice';

const AAAS_HTTP =
  (DEFAULT_WS.replace(/^wss?:\/\//, 'https://').replace(/\/voice$/, '')) || 'https://core.hivemind.davinciai.eu:8050/aaas';

export default function AaasVoiceWidget({ userId, orgId, language = 'en', wsBase = DEFAULT_WS }) {
  const [active, setActive] = useState(false);
  const [state, setState] = useState('idle'); // idle|connecting|listening|thinking|talking
  const [transcript, setTranscript] = useState('');   // current-turn user STT
  const [agentTurn, setAgentTurn] = useState('');     // current-turn TARA reply
  const [error, setError] = useState(null);

  // Voice picker
  const [voices, setVoices] = useState([]);
  const [langs, setLangs] = useState([]);
  const [langFilter, setLangFilter] = useState('en');
  const [genderFilter, setGenderFilter] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    fetch(`${AAAS_HTTP}/voices`)
      .then((r) => r.json())
      .then((d) => {
        setVoices(d.voices || []);
        setLangs(d.languages || []);
        const en = (d.voices || []).find((v) => v.language === 'en');
        if (en) setVoiceId(en.id);
      })
      .catch(() => {});
  }, []);

  const filteredVoices = voices.filter(
    (v) => (!langFilter || v.language === langFilter) && (!genderFilter || v.gender === genderFilter)
  );

  const preview = useCallback(() => {
    if (!voiceId) return;
    setPreviewing(true);
    const url = `${AAAS_HTTP}/voice-preview?voice_id=${encodeURIComponent(voiceId)}&language=${langFilter || 'en'}`;
    if (previewAudioRef.current) { try { previewAudioRef.current.pause(); } catch { /* noop */ } }
    const a = new Audio(url);
    previewAudioRef.current = a;
    a.onended = () => setPreviewing(false);
    a.onerror = () => setPreviewing(false);
    a.play().catch(() => setPreviewing(false));
  }, [voiceId, langFilter]);

  const wsRef = useRef(null);
  const micCtxRef = useRef(null);
  const playCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const procRef = useRef(null);
  const lastPlayRef = useRef(0);
  const sourcesRef = useRef([]);

  const stopAll = useCallback((reason) => {
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
    sourcesRef.current = [];
    if (procRef.current) { try { procRef.current.disconnect(); } catch { /* noop */ } procRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (micCtxRef.current) { micCtxRef.current.close().catch(() => {}); micCtxRef.current = null; }
    if (playCtxRef.current) { playCtxRef.current.close().catch(() => {}); playCtxRef.current = null; }
    if (wsRef.current) {
      try { if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close(1000, reason || 'stop'); } catch { /* noop */ }
      wsRef.current = null;
    }
    setActive(false);
    setState('idle');
  }, []);

  // Schedule a raw-PCM (s16le @16k) chunk for gapless playback.
  const playPcm = useCallback((arrayBuf) => {
    const ctx = playCtxRef.current;
    if (!ctx || !arrayBuf.byteLength) return;
    const i16 = new Int16Array(arrayBuf);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x8000;
    const buf = ctx.createBuffer(1, f32.length, SAMPLE_RATE);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    let at = lastPlayRef.current;
    if (at < now) at = now;
    src.start(at);
    lastPlayRef.current = at + buf.duration;
    sourcesRef.current.push(src);
    setState('talking');
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!userId) { setError('Not signed in — no user id.'); return; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError('Microphone permission denied.'); return;
    }
    micStreamRef.current = stream;
    setActive(true);
    setState('connecting');

    const playCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    playCtxRef.current = playCtx;
    lastPlayRef.current = playCtx.currentTime;

    const url = new URL(wsBase);
    url.searchParams.set('user_id', userId);
    if (orgId) url.searchParams.set('org_id', orgId);
    url.searchParams.set('session_id', `tara_${Date.now()}`);
    url.searchParams.set('language', langFilter || language);
    if (voiceId) url.searchParams.set('voice_id', voiceId);

    const ws = new WebSocket(url.toString());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      // mic pump: Float32 → Int16 PCM → raw bytes
      const micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      micCtxRef.current = micCtx;
      const srcNode = micCtx.createMediaStreamSource(stream);
      const proc = micCtx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;
      proc.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
        ws.send(pcm.buffer);
      };
      srcNode.connect(proc);
      proc.connect(micCtx.destination);
    };

    ws.onmessage = (msg) => {
      if (msg.data instanceof ArrayBuffer) { playPcm(msg.data); return; }
      let evt;
      try { evt = JSON.parse(msg.data); } catch { return; }
      switch (evt.type) {
        case 'ready': setState('listening'); break;
        case 'speech_start':
          // barge-in: stop current playback
          sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
          sourcesRef.current = [];
          if (playCtxRef.current) lastPlayRef.current = playCtxRef.current.currentTime;
          setState('thinking');
          break;
        case 'transcript': setTranscript(evt.text || ''); setAgentTurn(''); setState('thinking'); break;
        case 'agent_text': setAgentTurn((p) => p + (evt.text || '')); break;
        case 'turn_done': setState('listening'); break;
        case 'error': setError(evt.error || 'stream error'); break;
        default: break;
      }
    };
    ws.onerror = () => setError('Connection error.');
    ws.onclose = () => { if (active) stopAll('closed'); };
  }, [userId, orgId, language, langFilter, voiceId, wsBase, playPcm, active, stopAll]);

  useEffect(() => () => stopAll('unmount'), [stopAll]);

  const busy = state === 'connecting';
  return (
    <div className="rounded-2xl border border-[#e3e0db] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            state === 'talking' ? 'bg-[#117dff] animate-pulse'
            : state === 'listening' ? 'bg-[#16a34a]'
            : state === 'thinking' || busy ? 'bg-amber-500 animate-pulse'
            : 'bg-[#d4d0ca]'}`} />
          <span className="text-[13px] font-['Space_Grotesk'] font-semibold text-[#0a0a0a]">
            Talk to TARA <span className="text-[#a3a3a3] font-normal">· self-hosted AaaS</span>
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#a3a3a3] uppercase">{state}</span>
      </div>

      {/* Orb — spins when active, pulses while talking/listening */}
      <div className="flex justify-center my-5">
        <div className="relative w-28 h-28">
          <div
            className={`absolute inset-0 rounded-full ${
              state === 'talking' ? 'animate-[spin_2.5s_linear_infinite]'
              : state === 'listening' || state === 'thinking' || state === 'connecting' ? 'animate-[spin_7s_linear_infinite]'
              : ''}`}
            style={{ background: 'conic-gradient(from 0deg, #117dff, #7db4ff, #0a0a0a 55%, #117dff)' }}
          />
          <div className="absolute inset-[7px] rounded-full bg-[#0a0a0a]" />
          {(state === 'talking' || state === 'listening') && (
            <div className="absolute inset-0 rounded-full animate-pulse" style={{ boxShadow: '0 0 32px rgba(17,125,255,0.55)' }} />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] font-mono text-white/60 uppercase tracking-[0.12em]">{state === 'idle' ? 'tara' : state}</span>
          </div>
        </div>
      </div>

      {/* Current turn only — user STT + TARA reply */}
      {(transcript || agentTurn) && (
        <div className="mb-3 space-y-2">
          {transcript && (
            <div className="flex gap-2">
              <span className="text-[10px] font-mono text-[#a3a3a3] uppercase pt-0.5 w-10 shrink-0">You</span>
              <p className="text-[12.5px] text-[#0a0a0a] flex-1">{transcript}</p>
            </div>
          )}
          {agentTurn && (
            <div className="flex gap-2">
              <span className="text-[10px] font-mono text-[#117dff] uppercase pt-0.5 w-10 shrink-0">TARA</span>
              <p className="text-[12.5px] text-[#525252] flex-1">{agentTurn}</p>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-3">
          <AlertTriangle size={11} className="inline mr-1" /> {error}
        </div>
      )}

      {/* Voice picker — choose before starting */}
      {!active && voices.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)}
              className="h-9 px-2 text-[12px] bg-[#faf9f4] border border-[#e3e0db] rounded-lg focus:outline-none focus:border-[#117dff]/40">
              <option value="">All languages</option>
              {langs.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
              className="h-9 px-2 text-[12px] bg-[#faf9f4] border border-[#e3e0db] rounded-lg focus:outline-none focus:border-[#117dff]/40">
              <option value="">Any gender</option>
              <option value="feminine">Feminine</option>
              <option value="masculine">Masculine</option>
            </select>
          </div>
          <div className="flex gap-2">
            <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}
              className="flex-1 h-9 px-2 text-[12px] bg-[#faf9f4] border border-[#e3e0db] rounded-lg focus:outline-none focus:border-[#117dff]/40">
              {filteredVoices.length === 0 && <option value="">No voices</option>}
              {filteredVoices.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.gender?.[0]?.toUpperCase()}{v.country ? `·${v.country}` : ''})</option>
              ))}
            </select>
            <button type="button" onClick={preview} disabled={!voiceId || previewing}
              className="px-3 h-9 rounded-lg border border-[#e3e0db] text-[12px] text-[#117dff] hover:bg-[#faf9f4] disabled:opacity-50 flex items-center gap-1">
              {previewing ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />} Hear
            </button>
          </div>
          {voiceId && (() => { const v = voices.find((x) => x.id === voiceId); return v?.description ? (
            <p className="text-[10px] text-[#a3a3a3] leading-snug">{v.description}</p>
          ) : null; })()}
        </div>
      )}

      <button
        onClick={active ? () => stopAll('user') : start}
        disabled={busy}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
          active
            ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
            : 'bg-[#117dff] text-white hover:bg-[#0066e0] disabled:opacity-50'
        }`}
      >
        {busy ? <Loader2 size={15} className="animate-spin" />
          : active ? <Square size={15} /> : <Mic size={15} />}
        {busy ? 'Connecting…' : active ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}
