import React, { useRef, useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * CartesiaVoiceWidget — talk to TARA, streamed in real time through the
 * Cartesia Agents WebSocket (wss://api.cartesia.ai/agents/stream/{agentId}).
 *
 * Self-contained add-on. Does NOT touch the existing davinci TaraVoiceWidget
 * or any TARA backend. Connects the browser straight to the Cartesia agent:
 *   - browser auth is via ?access_token=<token> (browsers can't set WS headers)
 *   - protocol: send {event:"start"} -> recv {event:"ack", stream_id}
 *               send {event:"media_input", media:{payload:base64(pcm)}}
 *               recv {event:"media_output", media:{payload:base64(pcm)}}
 *               recv {event:"clear"} -> interrupt/flush playback
 *   - audio format: pcm_44100 (16-bit signed PCM @ 44.1kHz), base64-encoded
 *
 * Config (supply the token later):
 *   props.agentId      || REACT_APP_CARTESIA_AGENT_ID || window.CartesiaConfig.agentId
 *   props.accessToken  || REACT_APP_CARTESIA_ACCESS_TOKEN || window.CartesiaConfig.accessToken
 *   props.getAccessToken — optional async () => token (preferred: mints a fresh
 *                          short-lived token per call from your own endpoint)
 */

// ─── Orb shader (Davinci blue) — copied so this widget stays self-contained ──
function splitmix32(a) {
  return function () {
    a |= 0; a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15); t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}
function clamp01(n) { return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0; }

const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const fragmentShader = `
uniform float uTime, uAnimation, uInverted, uInputVolume, uOutputVolume, uOpacity;
uniform float uOffsets[7]; uniform vec3 uColor1, uColor2; varying vec2 vUv;
const float PI = 3.14159265358979323846;
bool drawOval(vec2 pUv, vec2 pC, float a, float b, bool rev, float soft, out vec4 c){vec2 p=pUv-pC;float o=(p.x*p.x)/(a*a)+(p.y*p.y)/(b*b);float e=smoothstep(1.0,1.0-soft,o);if(e>0.0){float g=rev?(1.0-(p.x/a+1.0)/2.0):((p.x/a+1.0)/2.0);g=mix(0.5,g,0.1);c=vec4(vec3(g),0.85*e);return true;}return false;}
vec3 colorRamp(float g,vec3 c1,vec3 c2,vec3 c3,vec3 c4){if(g<0.33)return mix(c1,c2,g*3.0);else if(g<0.66)return mix(c2,c3,(g-0.33)*3.0);else return mix(c3,c4,(g-0.66)*3.0);}
vec2 hash2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float noise2D(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);float n=mix(mix(dot(hash2(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(hash2(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(hash2(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(hash2(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
float sharpRing(vec3 d,float t){float ns=5.0;float n=mix(noise2D(vec2(d.x,t)*ns),noise2D(vec2(d.y,t)*ns),d.z);return 1.0+(n-0.5)*2.5*0.3*1.5;}
float smoothRing(vec3 d,float t){float ns=6.0;float n=mix(noise2D(vec2(d.x,t)*ns),noise2D(vec2(d.y,t)*ns),d.z);return 0.9+(n-0.5)*5.0*0.2;}
float flow(vec3 d,float t){return mix(noise2D(vec2(t,d.x/2.0)),noise2D(vec2(t,d.y/2.0)),d.z);}
void main(){vec2 uv=vUv*2.0-1.0;float r=length(uv);float th=atan(uv.y,uv.x);if(th<0.0)th+=2.0*PI;vec3 dec=vec3(th/(2.0*PI),mod(th/(2.0*PI)+0.5,1.0)+1.0,abs(th/PI-1.0));float n=flow(dec,r*0.03-uAnimation*0.2)-0.5;th+=n*mix(0.08,0.25,uOutputVolume);vec4 color=vec4(1.0);float oc[7]=float[7](0.0,0.5*PI,PI,1.5*PI,2.0*PI,2.5*PI,3.0*PI);float ct[7];for(int i=0;i<7;i++)ct[i]=oc[i]+0.5*sin(uTime/20.0+uOffsets[i]);float a,b;vec4 ov;for(int i=0;i<7;i++){float nn=noise2D(vec2(mod(ct[i]+uTime*0.05,1.0),0.5));a=0.5+nn*0.3;b=nn*mix(3.5,2.5,uInputVolume);bool rv=(i%2==1);float dt=min(abs(th-ct[i]),min(abs(th+2.0*PI-ct[i]),abs(th-2.0*PI-ct[i])));if(drawOval(vec2(dt,r),vec2(0.0,0.0),a,b,rv,0.6,ov)){color.rgb=mix(color.rgb,ov.rgb,ov.a);color.a=max(color.a,ov.a);}}float rr1=sharpRing(dec,uTime*0.1);float rr2=smoothRing(dec,uTime*0.1);float ir1=r+uInputVolume*0.2;float ir2=r+uInputVolume*0.15;float o1=mix(0.2,0.6,uInputVolume);float o2=mix(0.15,0.45,uInputVolume);float ra1=(ir2>=rr1)?o1:0.0;float ra2=smoothstep(rr2-0.05,rr2+0.05,ir1)*o2;color.rgb=1.0-(1.0-color.rgb)*(1.0-vec3(1.0)*max(ra1,ra2));vec3 c1=vec3(0.0);vec3 c4=vec3(1.0);float l=mix(color.r,1.0-color.r,uInverted);color.rgb=colorRamp(l,c1,uColor1,uColor2,c4);color.a*=uOpacity;gl_FragColor=color;}
`;

function OrbScene({ agentState, userVolume }) {
  useThree();
  const ref = useRef(null);
  const colors = ['#CADCFC', '#A0B9D1'];
  const initRef = useRef(colors);
  const tc1 = useRef(new THREE.Color(colors[0]));
  const tc2 = useRef(new THREE.Color(colors[1]));
  const spd = useRef(0.1);
  const agRef = useRef(agentState);
  const cIn = useRef(0), cOut = useRef(0);

  useEffect(() => { agRef.current = agentState; }, [agentState]);

  const rng = useMemo(() => splitmix32(Math.floor(Math.random() * 2 ** 32)), []);
  const off = useMemo(() => new Float32Array(Array.from({ length: 7 }, () => rng() * Math.PI * 2)), [rng]);

  useEffect(() => { if (ref.current) ref.current.material.uniforms.uInverted.value = 1; }, []);

  useFrame((_, dt) => {
    const m = ref.current?.material; if (!m) return;
    const u = m.uniforms;
    u.uTime.value += dt * 0.5;
    if (u.uOpacity.value < 1) u.uOpacity.value = Math.min(1, u.uOpacity.value + dt * 2);
    const t = u.uTime.value * 2;
    let tI = 0, tO = 0.3;
    if (agRef.current === 'listening') { tI = clamp01(userVolume > 0.1 ? userVolume : 0.55 + Math.sin(t * 3.2) * 0.35); tO = 0.45; }
    else if (agRef.current === 'talking') { tI = clamp01(0.65 + Math.sin(t * 4.8) * 0.22); tO = clamp01(0.75 + Math.sin(t * 3.6) * 0.22); }
    else if (agRef.current === 'thinking') { tI = clamp01(0.38 + 0.07 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 2.1) * Math.sin(t * 0.37 + 1.2)); tO = clamp01(0.48 + 0.12 * Math.sin(t * 1.05 + 0.6)); }
    cIn.current += (tI - cIn.current) * 0.2; cOut.current += (tO - cOut.current) * 0.2;
    spd.current += (0.1 + (1 - Math.pow(cOut.current - 1, 2)) * 0.9 - spd.current) * 0.12;
    u.uAnimation.value += dt * spd.current;
    u.uInputVolume.value = cIn.current; u.uOutputVolume.value = cOut.current;
    u.uColor1.value.lerp(tc1.current, 0.08); u.uColor2.value.lerp(tc2.current, 0.08);
  });

  const uniforms = useMemo(() => ({
    uColor1: new THREE.Uniform(new THREE.Color(initRef.current[0])),
    uColor2: new THREE.Uniform(new THREE.Color(initRef.current[1])),
    uOffsets: { value: off }, uTime: new THREE.Uniform(0), uAnimation: new THREE.Uniform(0.1),
    uInverted: new THREE.Uniform(1), uInputVolume: new THREE.Uniform(0),
    uOutputVolume: new THREE.Uniform(0), uOpacity: new THREE.Uniform(0),
  }), [off]);

  return (<mesh ref={ref}><circleGeometry args={[3.5, 64]} /><shaderMaterial uniforms={uniforms} fragmentShader={fragmentShader} vertexShader={vertexShader} transparent /></mesh>);
}

function OrbRenderer({ agentState, userVolume }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas resize={{ debounce: 100 }} gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}>
        <Suspense fallback={null}><OrbScene agentState={agentState} userVolume={userVolume} /></Suspense>
      </Canvas>
    </div>
  );
}

// ─── Audio + base64 helpers ──────────────────────────────────────────────
const CARTESIA_WS_BASE = 'wss://api.cartesia.ai/agents/stream';
const CARTESIA_VERSION = '2025-04-16';
const SAMPLE_RATE = 44100; // pcm_44100
const HISTORY_KEY = 'cartesia_tara_history';

function int16BufferToBase64(int16) {
  const bytes = new Uint8Array(int16.buffer);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToFloat32(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(bytes.buffer);
  const f32 = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768.0;
  return f32;
}

const STATE_LABELS = { idle: 'Click to talk', listening: 'Listening…', talking: 'TARA speaking', thinking: 'Connecting…' };

export default function CartesiaVoiceWidget({ agentId: propAgentId, accessToken: propToken, getAccessToken }) {
  const resolved = useMemo(() => {
    const g = (typeof window !== 'undefined' && window.CartesiaConfig) || {};
    return {
      agentId: propAgentId || process.env.REACT_APP_CARTESIA_AGENT_ID || g.agentId || '',
      accessToken: propToken || process.env.REACT_APP_CARTESIA_ACCESS_TOKEN || g.accessToken || '',
    };
  }, [propAgentId, propToken]);

  const [isCallActive, setIsCallActive] = useState(false);
  const [agentState, setAgentState] = useState('idle');
  const [userVolume, setUserVolume] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  });

  const wsRef = useRef(null);
  const streamIdRef = useRef(null);
  const playCtxRef = useRef(null);
  const micCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const procRef = useRef(null);
  const lastPlayRef = useRef(0);
  const sourcesRef = useRef([]);
  const analyserRafRef = useRef(null);
  const timerRef = useRef(null);
  const callStartRef = useRef(null);
  const speakingTimeoutRef = useRef(null);

  const persistHistory = useCallback((next) => {
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, 50))); } catch { /* ignore quota */ }
  }, []);

  const stopPlayback = useCallback(() => {
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    sourcesRef.current = [];
    if (playCtxRef.current) lastPlayRef.current = playCtxRef.current.currentTime;
  }, []);

  const playChunk = useCallback((b64) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    const f32 = base64ToFloat32(b64);
    if (!f32.length) return;
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
    setAgentState('talking');
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    const msUntilDone = Math.max(0, (lastPlayRef.current - now) * 1000) + 250;
    speakingTimeoutRef.current = setTimeout(() => {
      if (isCallActive) setAgentState('listening');
    }, msUntilDone);
  }, [isCallActive]);

  const endCall = useCallback((reason) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (analyserRafRef.current) { cancelAnimationFrame(analyserRafRef.current); analyserRafRef.current = null; }
    if (speakingTimeoutRef.current) { clearTimeout(speakingTimeoutRef.current); speakingTimeoutRef.current = null; }
    stopPlayback();
    if (procRef.current) { try { procRef.current.disconnect(); } catch { /* noop */ } procRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (micCtxRef.current) { micCtxRef.current.close().catch(() => {}); micCtxRef.current = null; }
    if (playCtxRef.current) { playCtxRef.current.close().catch(() => {}); playCtxRef.current = null; }
    if (wsRef.current) {
      try { if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close(1000, 'session completed'); } catch { /* noop */ }
      wsRef.current = null;
    }
    streamIdRef.current = null;
    // Log to history if a call actually ran.
    if (callStartRef.current) {
      const durationSec = Math.round((Date.now() - callStartRef.current) / 1000);
      callStartRef.current = null;
      if (durationSec > 0) {
        const entry = { id: `${Date.now()}`, endedAt: new Date().toISOString(), durationSec, reason: reason || 'ended' };
        persistHistory([entry, ...history]);
      }
    }
    setIsCallActive(false);
    setAgentState('idle');
    setUserVolume(0);
    setCallDuration(0);
  }, [history, persistHistory, stopPlayback]);

  const startMicPump = useCallback((stream) => {
    const micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    micCtxRef.current = micCtx;
    const src = micCtx.createMediaStreamSource(stream);
    const proc = micCtx.createScriptProcessor(4096, 1, 1);
    procRef.current = proc;
    proc.onaudioprocess = (e) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !streamIdRef.current) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
      ws.send(JSON.stringify({
        event: 'media_input',
        stream_id: streamIdRef.current,
        media: { payload: int16BufferToBase64(pcm) },
      }));
    };
    src.connect(proc);
    proc.connect(micCtx.destination);

    // Mic level for the orb.
    const an = micCtx.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    const arr = new Uint8Array(an.frequencyBinCount);
    const tick = () => {
      an.getByteFrequencyData(arr);
      let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i];
      setUserVolume(Math.min(1, s / arr.length / 30));
      analyserRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startCall = useCallback(async () => {
    setError(null);
    if (!resolved.agentId) { setError('No Cartesia agent id configured.'); return; }
    let token = resolved.accessToken;
    try {
      if (typeof getAccessToken === 'function') token = await getAccessToken();
    } catch (e) {
      setError('Could not fetch access token.'); return;
    }
    if (!token) { setError('No Cartesia access token yet — add it to start talking.'); return; }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError('Microphone permission denied.'); return;
    }
    micStreamRef.current = stream;

    setIsCallActive(true);
    setAgentState('thinking');
    callStartRef.current = Date.now();

    const playCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    playCtxRef.current = playCtx;
    lastPlayRef.current = playCtx.currentTime;

    const url = new URL(`${CARTESIA_WS_BASE}/${encodeURIComponent(resolved.agentId)}`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('cartesia_version', CARTESIA_VERSION);
    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ event: 'start', config: { input_format: 'pcm_44100' } }));
    };
    ws.onmessage = (msg) => {
      let data;
      try { data = JSON.parse(msg.data); } catch { return; }
      switch (data.event) {
        case 'ack':
          streamIdRef.current = data.stream_id || streamIdRef.current || `s_${Date.now()}`;
          setAgentState('listening');
          startMicPump(stream);
          if (!timerRef.current) timerRef.current = setInterval(() => setCallDuration((x) => x + 1), 1000);
          break;
        case 'media_output':
          if (data.media?.payload) playChunk(data.media.payload);
          break;
        case 'clear':
          stopPlayback();
          setAgentState('listening');
          break;
        case 'transfer_call':
          // Telephony transfer not handled in-browser; surface + continue.
          setError('Agent requested a call transfer (not supported here).');
          break;
        default:
          break;
      }
    };
    ws.onerror = () => { setError('Connection error.'); };
    ws.onclose = (ev) => {
      endCall(ev?.reason || 'closed');
    };
  }, [resolved, getAccessToken, startMicPump, playChunk, stopPlayback, endCall]);

  const toggle = useCallback(() => {
    if (isCallActive) endCall('user-stopped'); else startCall();
  }, [isCallActive, startCall, endCall]);

  useEffect(() => () => endCall('unmount'), []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="rounded-2xl border border-[#e3e0db] bg-white p-5">
      <div className="flex items-start gap-5">
        {/* Orb / talk button */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <motion.button
            type="button"
            onClick={toggle}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            title={isCallActive ? 'Stop' : 'Talk to TARA'}
            style={{
              width: 96, height: 96, borderRadius: '50%', background: '#050505',
              border: isCallActive ? '2px solid #CADCFC' : '1px solid rgba(202,220,252,0.25)',
              boxShadow: isCallActive ? '0 0 30px rgba(202,220,252,0.4)' : '0 10px 30px rgba(0,0,0,0.35)',
              padding: 0, overflow: 'hidden', position: 'relative', cursor: 'pointer',
            }}
          >
            <OrbRenderer agentState={isCallActive ? agentState : null} userVolume={userVolume} />
            {isCallActive && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#CADCFC"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </div>
            )}
          </motion.button>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
            {isCallActive ? STATE_LABELS[agentState] : 'Talk to TARA'}
          </div>
          {isCallActive && (
            <div className="text-[10px] font-mono text-[#a3a3a3]">{fmt(callDuration)}</div>
          )}
        </div>

        {/* Right: title + controls + history */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-semibold text-[#0a0a0a]">Talk to TARA</h3>
              <p className="text-[11px] text-[#a3a3a3]">Real-time voice · Cartesia agent</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg ${
                isCallActive
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  : 'bg-[#0a0a0a] text-white hover:bg-[#262626]'
              }`}
            >
              {isCallActive ? 'Stop' : 'Start'}
            </button>
          </div>

          {error && (
            <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              {error}
            </div>
          )}
          {!resolved.agentId && (
            <div className="mt-2 text-[10px] font-mono text-[#a3a3a3]">
              Set REACT_APP_CARTESIA_AGENT_ID (and an access token) to enable.
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-1">Recent calls</div>
              <div className="max-h-[120px] overflow-y-auto divide-y divide-[#f3f1ec] border border-[#f3f1ec] rounded-lg">
                {history.slice(0, 8).map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-2.5 py-1.5 text-[11px]">
                    <span className="text-[#525252]">{new Date(h.endedAt).toLocaleString()}</span>
                    <span className="font-mono text-[#a3a3a3]">{fmt(h.durationSec)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
