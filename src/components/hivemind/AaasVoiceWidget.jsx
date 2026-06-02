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
import { Mic, Square, Loader2, AlertTriangle } from 'lucide-react';

const SAMPLE_RATE = 16000;
const DEFAULT_WS =
  process.env.REACT_APP_AAAS_WS ||
  'wss://core.hivemind.davinciai.eu:8050/aaas/voice';

export default function AaasVoiceWidget({ userId, orgId, language = 'en', wsBase = DEFAULT_WS }) {
  const [active, setActive] = useState(false);
  const [state, setState] = useState('idle'); // idle|connecting|listening|thinking|talking
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

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
    url.searchParams.set('language', language);

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
        case 'transcript': setTranscript(evt.text || ''); setState('thinking'); break;
        case 'turn_done': setState('listening'); break;
        case 'error': setError(evt.error || 'stream error'); break;
        default: break;
      }
    };
    ws.onerror = () => setError('Connection error.');
    ws.onclose = () => { if (active) stopAll('closed'); };
  }, [userId, orgId, language, wsBase, playPcm, active, stopAll]);

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

      {transcript && (
        <p className="text-[12px] text-[#525252] mb-3 italic">“{transcript}”</p>
      )}
      {error && (
        <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-3">
          <AlertTriangle size={11} className="inline mr-1" /> {error}
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
