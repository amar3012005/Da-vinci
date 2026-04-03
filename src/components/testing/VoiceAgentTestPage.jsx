import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ThemeProvider } from '../mobile/ThemeContext';
import MobileNavigation from '../mobile/MobileNavigation';

function splitmix32(a) {
  return function () {
    a |= 0;
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

function clamp01(n) {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime, uAnimation, uInverted, uInputVolume, uOutputVolume, uOpacity;
uniform float uOffsets[7];
uniform vec3 uColor1, uColor2;
varying vec2 vUv;
const float PI = 3.14159265358979323846;

bool drawOval(vec2 pUv, vec2 pC, float a, float b, bool rev, float soft, out vec4 c) {
  vec2 p = pUv - pC;
  float o = (p.x * p.x) / (a * a) + (p.y * p.y) / (b * b);
  float e = smoothstep(1.0, 1.0 - soft, o);
  if (e > 0.0) {
    float g = rev ? (1.0 - (p.x / a + 1.0) / 2.0) : ((p.x / a + 1.0) / 2.0);
    g = mix(0.5, g, 0.1);
    c = vec4(vec3(g), 0.85 * e);
    return true;
  }
  return false;
}

vec3 colorRamp(float g, vec3 c1, vec3 c2, vec3 c3, vec3 c4) {
  if (g < 0.33) return mix(c1, c2, g * 3.0);
  else if (g < 0.66) return mix(c2, c3, (g - 0.33) * 3.0);
  return mix(c3, c4, (g - 0.66) * 3.0);
}

vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
  return 0.5 + 0.5 * n;
}

float sharpRing(vec3 d, float t) {
  float ns = 5.0;
  float n = mix(noise2D(vec2(d.x, t) * ns), noise2D(vec2(d.y, t) * ns), d.z);
  return 1.0 + (n - 0.5) * 2.5 * 0.3 * 1.5;
}

float smoothRing(vec3 d, float t) {
  float ns = 6.0;
  float n = mix(noise2D(vec2(d.x, t) * ns), noise2D(vec2(d.y, t) * ns), d.z);
  return 0.9 + (n - 0.5) * 5.0 * 0.2;
}

float flow(vec3 d, float t) {
  return mix(noise2D(vec2(t, d.x / 2.0)), noise2D(vec2(t, d.y / 2.0)), d.z);
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float r = length(uv);
  float th = atan(uv.y, uv.x);
  if (th < 0.0) th += 2.0 * PI;
  vec3 dec = vec3(th / (2.0 * PI), mod(th / (2.0 * PI) + 0.5, 1.0) + 1.0, abs(th / PI - 1.0));
  float n = flow(dec, r * 0.03 - uAnimation * 0.2) - 0.5;
  th += n * mix(0.08, 0.25, uOutputVolume);
  vec4 color = vec4(1.0);
  float oc[7] = float[7](0.0, 0.5 * PI, PI, 1.5 * PI, 2.0 * PI, 2.5 * PI, 3.0 * PI);
  float ct[7];
  for (int i = 0; i < 7; i++) ct[i] = oc[i] + 0.5 * sin(uTime / 20.0 + uOffsets[i]);
  float a, b;
  vec4 ov;
  for (int i = 0; i < 7; i++) {
    float nn = noise2D(vec2(mod(ct[i] + uTime * 0.05, 1.0), 0.5));
    a = 0.5 + nn * 0.3;
    b = nn * mix(3.5, 2.5, uInputVolume);
    bool rv = (i % 2 == 1);
    float dt = min(abs(th - ct[i]), min(abs(th + 2.0 * PI - ct[i]), abs(th - 2.0 * PI - ct[i])));
    if (drawOval(vec2(dt, r), vec2(0.0, 0.0), a, b, rv, 0.6, ov)) {
      color.rgb = mix(color.rgb, ov.rgb, ov.a);
      color.a = max(color.a, ov.a);
    }
  }
  float rr1 = sharpRing(dec, uTime * 0.1);
  float rr2 = smoothRing(dec, uTime * 0.1);
  float ir1 = r + uInputVolume * 0.2;
  float ir2 = r + uInputVolume * 0.15;
  float o1 = mix(0.2, 0.6, uInputVolume);
  float o2 = mix(0.15, 0.45, uInputVolume);
  float ra1 = (ir2 >= rr1) ? o1 : 0.0;
  float ra2 = smoothstep(rr2 - 0.05, rr2 + 0.05, ir1) * o2;
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - vec3(1.0) * max(ra1, ra2));
  vec3 c1 = vec3(0.0);
  vec3 c4 = vec3(1.0);
  float l = mix(color.r, 1.0 - color.r, uInverted);
  color.rgb = colorRamp(l, c1, uColor1, uColor2, c4);
  color.a *= uOpacity;
  gl_FragColor = color;
}
`;

const CALL_LIMIT_SECONDS = 300;
const MAX_TRANSCRIPT_ITEMS = 24;

const STATUS_LABELS = {
  idle: 'Ready',
  listening: 'Listening',
  talking: 'Speaking',
  thinking: 'Thinking',
};

function getWsBaseUrl() {
  if (typeof window === 'undefined') {
    return 'wss://demo.davinciai.eu:8030/ws';
  }

  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//demo.davinciai.eu:8030/ws`;
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function withAlpha(hex, alpha) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value;
  const int = Number.parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function appendTranscript(previous, nextItem) {
  const trimmedText = (nextItem.text || '').trim();
  if (!trimmedText) {
    return previous;
  }

  const existingIndex = previous.findIndex((item) => item.id === nextItem.id);
  if (existingIndex >= 0) {
    const updated = [...previous];
    updated[existingIndex] = { ...updated[existingIndex], ...nextItem, text: trimmedText };
    return updated.slice(-MAX_TRANSCRIPT_ITEMS);
  }

  return [...previous, { ...nextItem, text: trimmedText }].slice(-MAX_TRANSCRIPT_ITEMS);
}

function OrbScene({ agentState, userVolume, brand }) {
  useThree();
  const ref = useRef(null);
  const colors = useRef([brand.orbPrimary, brand.orbSecondary]);
  const targetColorA = useRef(new THREE.Color(brand.orbPrimary));
  const targetColorB = useRef(new THREE.Color(brand.orbSecondary));
  const speed = useRef(0.1);
  const stateRef = useRef(agentState);
  const currentInput = useRef(0);
  const currentOutput = useRef(0);
  const rng = useMemo(() => splitmix32(Math.floor(Math.random() * 2 ** 32)), []);
  const offsets = useMemo(
    () => new Float32Array(Array.from({ length: 7 }, () => rng() * Math.PI * 2)),
    [rng]
  );

  useEffect(() => {
    stateRef.current = agentState;
  }, [agentState]);

  useEffect(() => {
    targetColorA.current = new THREE.Color(brand.orbPrimary);
    targetColorB.current = new THREE.Color(brand.orbSecondary);
  }, [brand.orbPrimary, brand.orbSecondary]);

  useFrame((_, delta) => {
    const material = ref.current?.material;
    if (!material) {
      return;
    }

    const uniforms = material.uniforms;
    uniforms.uTime.value += delta * 0.5;
    if (uniforms.uOpacity.value < 1) {
      uniforms.uOpacity.value = Math.min(1, uniforms.uOpacity.value + delta * 2);
    }

    const pulseTime = uniforms.uTime.value * 2;
    let inputTarget = 0.08;
    let outputTarget = 0.16;

    if (stateRef.current === 'listening') {
      inputTarget = clamp01(userVolume > 0.08 ? userVolume : 0.45 + Math.sin(pulseTime * 3.2) * 0.3);
      outputTarget = 0.4;
    } else if (stateRef.current === 'talking') {
      inputTarget = clamp01(0.55 + Math.sin(pulseTime * 4.8) * 0.22);
      outputTarget = clamp01(0.78 + Math.sin(pulseTime * 3.4) * 0.18);
    } else if (stateRef.current === 'thinking') {
      inputTarget = clamp01(0.32 + 0.08 * Math.sin(pulseTime * 0.9));
      outputTarget = clamp01(0.42 + 0.12 * Math.sin(pulseTime * 1.2 + 0.6));
    }

    currentInput.current += (inputTarget - currentInput.current) * 0.18;
    currentOutput.current += (outputTarget - currentOutput.current) * 0.18;
    speed.current += (
      0.1 + (1 - Math.pow(currentOutput.current - 1, 2)) * 0.85 - speed.current
    ) * 0.12;

    uniforms.uAnimation.value += delta * speed.current;
    uniforms.uInputVolume.value = currentInput.current;
    uniforms.uOutputVolume.value = currentOutput.current;
    uniforms.uColor1.value.lerp(targetColorA.current, 0.08);
    uniforms.uColor2.value.lerp(targetColorB.current, 0.08);
  });

  const uniforms = useMemo(() => ({
    uColor1: new THREE.Uniform(new THREE.Color(colors.current[0])),
    uColor2: new THREE.Uniform(new THREE.Color(colors.current[1])),
    uOffsets: { value: offsets },
    uTime: new THREE.Uniform(0),
    uAnimation: new THREE.Uniform(0.1),
    uInverted: new THREE.Uniform(1),
    uInputVolume: new THREE.Uniform(0),
    uOutputVolume: new THREE.Uniform(0),
    uOpacity: new THREE.Uniform(0),
  }), [offsets]);

  return (
    <mesh ref={ref}>
      <circleGeometry args={[3.5, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        transparent
      />
    </mesh>
  );
}

function OrbRenderer({ agentState, userVolume, brand }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas resize={{ debounce: 100 }} gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}>
        <Suspense fallback={null}>
          <OrbScene agentState={agentState} userVolume={userVolume} brand={brand} />
        </Suspense>
      </Canvas>
    </div>
  );
}

function VoiceAgentTestPageContent({ config, brand }) {
  const mergedConfig = useMemo(() => ({
    tenantId: config?.tenantId || 'davinci',
    tenantName: config?.tenantName || 'DAVINCI AI',
    agentId: config?.agentId || config?.tenantId || 'davinci',
    agentName: config?.agentName || config?.tenantName || 'DAVINCI AI',
    language: config?.language || 'de',
    wsBaseUrl: config?.wsBaseUrl || getWsBaseUrl(),
  }), [config]);

  const mergedBrand = useMemo(() => ({
    name: brand?.name || mergedConfig.tenantName,
    label: brand?.label || 'Voice Agent Test',
    eyebrow: brand?.eyebrow || 'Testing Workspace',
    accent: brand?.accent || '#CADCFC',
    accentSoft: brand?.accentSoft || '#A0B9D1',
    surface: brand?.surface || '#09101c',
    surfaceSoft: brand?.surfaceSoft || '#0d1628',
    backgroundA: brand?.backgroundA || '#05070b',
    backgroundB: brand?.backgroundB || '#0d1933',
    text: brand?.text || '#F5F7FB',
    textMuted: brand?.textMuted || 'rgba(245, 247, 251, 0.68)',
    orbPrimary: brand?.orbPrimary || brand?.accent || '#CADCFC',
    orbSecondary: brand?.orbSecondary || brand?.accentSoft || '#A0B9D1',
  }), [brand, mergedConfig.tenantName]);

  const wsRef = useRef(null);
  const micAudioContextRef = useRef(null);
  const playbackAudioContextRef = useRef(null);
  const processorRef = useRef(null);
  const micSourceRef = useRef(null);
  const wsConnectedRef = useRef(false);
  const binaryQueueRef = useRef([]);
  const activeSourcesRef = useRef(new Set());
  const callTimerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sessionIdRef = useRef(null);
  const micStreamRef = useRef(null);
  const playbackStartTimeRef = useRef(null);
  const lastPlaybackTimeRef = useRef(0);
  const audioConfigRef = useRef({ format: 'pcm_s16le', sampleRate: 16000 });
  const currentPlaybackTurnIdRef = useRef(null);
  const minAcceptedPlaybackTurnIdRef = useRef(0);
  const audioStreamCompleteRef = useRef(false);
  const outputGainRef = useRef(null);
  const telephonyHighpassRef = useRef(null);
  const telephonyLowpassRef = useRef(null);
  const transcriptCounterRef = useRef(0);
  const meterCleanupRef = useRef(null);
  const partialAgentTranscriptRef = useRef('');

  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [agentState, setAgentState] = useState('idle');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [userVolume, setUserVolume] = useState(0);
  const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
  const [transcriptItems, setTranscriptItems] = useState([]);
  const [partialUserTranscript, setPartialUserTranscript] = useState('');
  const [partialAgentTranscript, setPartialAgentTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  useEffect(() => {
    partialAgentTranscriptRef.current = partialAgentTranscript;
  }, [partialAgentTranscript]);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      setAgentState(agentIsSpeaking ? 'talking' : 'listening');
      return;
    }
    if (connectionStatus === 'connecting') {
      setAgentState('thinking');
      return;
    }
    if (!isCallActive) {
      setAgentState('idle');
    }
  }, [agentIsSpeaking, connectionStatus, isCallActive]);

  const stopMicLevelMeter = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setUserVolume(0);
  }, []);

  const ensureOutputChain = useCallback(() => {
    const context = playbackAudioContextRef.current;
    if (!context) {
      return null;
    }

    if (!outputGainRef.current) {
      outputGainRef.current = context.createGain();
    }
    if (!telephonyHighpassRef.current) {
      telephonyHighpassRef.current = context.createBiquadFilter();
      telephonyHighpassRef.current.type = 'highpass';
      telephonyHighpassRef.current.frequency.value = 250;
    }
    if (!telephonyLowpassRef.current) {
      telephonyLowpassRef.current = context.createBiquadFilter();
      telephonyLowpassRef.current.type = 'lowpass';
      telephonyLowpassRef.current.frequency.value = 3400;
    }

    return {
      gain: outputGainRef.current,
      highpass: telephonyHighpassRef.current,
      lowpass: telephonyLowpassRef.current,
    };
  }, []);

  const checkPlaybackComplete = useCallback(() => {
    const context = playbackAudioContextRef.current;
    if (!context) {
      return;
    }

    if (context.currentTime >= lastPlaybackTimeRef.current - 0.1) {
      setAgentIsSpeaking(false);
      if (audioStreamCompleteRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const duration = playbackStartTimeRef.current ? Date.now() - playbackStartTimeRef.current : 0;
        wsRef.current.send(JSON.stringify({
          type: 'playback_done',
          duration_ms: duration,
          playback_turn_id: currentPlaybackTurnIdRef.current,
          timestamp: Date.now() / 1000,
        }));
        playbackStartTimeRef.current = null;
        audioStreamCompleteRef.current = false;
        currentPlaybackTurnIdRef.current = null;
      }
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (Number.isFinite(currentPlaybackTurnIdRef.current)) {
      minAcceptedPlaybackTurnIdRef.current = Math.max(
        minAcceptedPlaybackTurnIdRef.current,
        currentPlaybackTurnIdRef.current + 1
      );
    }

    activeSourcesRef.current.forEach((source) => {
      try {
        source.onended = null;
        source.stop();
      } catch (_) {
        // no-op
      }
    });

    activeSourcesRef.current.clear();
    binaryQueueRef.current = [];
    currentPlaybackTurnIdRef.current = null;
    audioStreamCompleteRef.current = false;
    playbackStartTimeRef.current = null;

    if (playbackAudioContextRef.current) {
      lastPlaybackTimeRef.current = playbackAudioContextRef.current.currentTime;
    }

    setAgentIsSpeaking(false);
  }, []);

  const playAudioChunk = useCallback((data, forceInt16 = false) => {
    let float32;
    const { format, sampleRate } = audioConfigRef.current;

    if (data instanceof ArrayBuffer) {
      if (format === 'pcm_s16le' || forceInt16) {
        const int16 = new Int16Array(data);
        float32 = new Float32Array(int16.length);
        for (let index = 0; index < int16.length; index += 1) {
          float32[index] = int16[index] / 32768.0;
        }
      } else {
        float32 = new Float32Array(data);
      }
    } else {
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let index = 0; index < binaryString.length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
      }
      if (format === 'pcm_s16le' || forceInt16) {
        const int16 = new Int16Array(bytes.buffer);
        float32 = new Float32Array(int16.length);
        for (let index = 0; index < int16.length; index += 1) {
          float32[index] = int16[index] / 32768.0;
        }
      } else {
        float32 = new Float32Array(bytes.buffer);
      }
    }

    const context = playbackAudioContextRef.current;
    if (!context) {
      return;
    }

    const buffer = context.createBuffer(1, float32.length, sampleRate);
    buffer.copyToChannel(float32, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;

    const chain = ensureOutputChain();
    if (!chain) {
      return;
    }

    chain.gain.gain.value = 1.0;

    try {
      chain.gain.disconnect();
      chain.highpass.disconnect();
      chain.lowpass.disconnect();
      source.disconnect();
    } catch (_) {
      // no-op
    }

    source.connect(chain.highpass);
    chain.highpass.connect(chain.lowpass);
    chain.lowpass.connect(chain.gain);
    chain.gain.connect(context.destination);

    const now = context.currentTime;
    let startAt = lastPlaybackTimeRef.current;
    if (!playbackStartTimeRef.current) {
      playbackStartTimeRef.current = Date.now();
      startAt = now + 0.05;
    }
    if (startAt < now) {
      startAt = now;
    }

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      checkPlaybackComplete();
    };
    source.start(startAt);
    lastPlaybackTimeRef.current = startAt + buffer.duration;
  }, [checkPlaybackComplete, ensureOutputChain]);

  const clearCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  const closeAudioContexts = useCallback(async () => {
    const micContext = micAudioContextRef.current;
    const playbackContext = playbackAudioContextRef.current;

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (_) {
        // no-op
      }
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch (_) {
        // no-op
      }
      micSourceRef.current = null;
    }

    if (micContext) {
      await micContext.close().catch(() => {});
      micAudioContextRef.current = null;
    }

    if (playbackContext) {
      await playbackContext.close().catch(() => {});
      playbackAudioContextRef.current = null;
    }

    outputGainRef.current = null;
    telephonyHighpassRef.current = null;
    telephonyLowpassRef.current = null;
  }, []);

  const stopMicrophone = useCallback(() => {
    if (meterCleanupRef.current) {
      meterCleanupRef.current();
      meterCleanupRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    stopMicLevelMeter();
  }, [stopMicLevelMeter]);

  const endCall = useCallback(async () => {
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'interrupt', timestamp: Date.now() / 1000 }));
        }
        wsRef.current.close();
      } catch (_) {
        // no-op
      }
      wsRef.current = null;
    }

    wsConnectedRef.current = false;
    stopPlayback();
    clearCallTimer();
    stopMicrophone();
    await closeAudioContexts();

    setIsCallActive(false);
    setConnectionStatus('idle');
    setAgentState('idle');
    setAgentIsSpeaking(false);
    setCallDuration(0);
    setPartialUserTranscript('');
    setPartialAgentTranscript('');
  }, [clearCallTimer, closeAudioContexts, stopMicrophone, stopPlayback]);

  useEffect(() => {
    if (isCallActive && callDuration >= CALL_LIMIT_SECONDS) {
      endCall();
    }
  }, [callDuration, endCall, isCallActive]);

  useEffect(() => () => {
    endCall();
  }, [endCall]);

  const startMicLevelMeter = useCallback((stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const updateMeter = () => {
      analyser.getByteFrequencyData(data);
      let total = 0;
      for (let index = 0; index < data.length; index += 1) {
        total += data[index];
      }
      setUserVolume(Math.min(1, total / data.length / 30));
      animationFrameRef.current = requestAnimationFrame(updateMeter);
    };

    updateMeter();

    return () => {
      stopMicLevelMeter();
      source.disconnect();
      audioContext.close().catch(() => {});
    };
  }, [stopMicLevelMeter]);

  const handleTranscript = useCallback((message) => {
    const text = (message.text || '').trim();
    if (!text) {
      return;
    }

    if (message.is_final) {
      const id = `user-${Date.now()}-${transcriptCounterRef.current += 1}`;
      setTranscriptItems((previous) => appendTranscript(previous, {
        id,
        role: 'user',
        text,
        final: true,
      }));
      setPartialUserTranscript('');
    } else {
      setPartialUserTranscript(text);
    }
  }, []);

  const handleAgentResponse = useCallback((message) => {
    const text = (message.text || '').trim();
    if (!text) {
      return;
    }

    if (message.is_streaming) {
      setPartialAgentTranscript((previous) => `${previous}${text}`);
      return;
    }

    // Use ref for latest partial (avoids stale closure)
    const accumulated = partialAgentTranscriptRef.current;
    const nextText = accumulated ? `${accumulated}${text}` : text;
    const id = `agent-${Date.now()}-${transcriptCounterRef.current += 1}`;
    setTranscriptItems((previous) => appendTranscript(
      previous.filter((item) => item.id !== 'agent-streaming'),
      { id, role: 'agent', text: nextText, final: true }
    ));
    setPartialAgentTranscript('');
  }, []);

  useEffect(() => {
    if (!partialAgentTranscript) {
      return;
    }

    const trimmed = partialAgentTranscript.trim();
    if (!trimmed) {
      return;
    }

    const id = 'agent-streaming';
    setTranscriptItems((previous) => appendTranscript(previous, {
      id,
      role: 'agent',
      text: trimmed,
      final: false,
      streaming: true,
    }));
  }, [partialAgentTranscript]);

  useEffect(() => {
    if (!partialUserTranscript) {
      // Only remove streaming indicator if there's no text — don't flash
      setTranscriptItems((previous) => {
        const streaming = previous.find((item) => item.id === 'user-streaming');
        if (streaming && streaming.text) return previous; // Keep if has text (will be replaced by final)
        return previous.filter((item) => item.id !== 'user-streaming');
      });
      return;
    }

    setTranscriptItems((previous) => {
      const withoutStreaming = previous.filter((item) => item.id !== 'user-streaming');
      return [...withoutStreaming, {
        id: 'user-streaming',
        role: 'user',
        text: partialUserTranscript,
        final: false,
        streaming: true,
      }].slice(-MAX_TRANSCRIPT_ITEMS);
    });
  }, [partialUserTranscript]);

  const startVoiceCall = useCallback(async (stream) => {
    setConnectionStatus('connecting');
    setCallDuration(0);
    setErrorMessage('');
    setTranscriptItems([]);
    setPartialAgentTranscript('');
    setPartialUserTranscript('');

    const base = String(mergedConfig.wsBaseUrl)
      .replace(/^http:\/\//i, 'ws://')
      .replace(/^https:\/\//i, 'wss://');
    const userId = `user_${Date.now()}`;
    const wsUrl = `${base}?tenant_id=${encodeURIComponent(mergedConfig.tenantId)}&agent_id=${encodeURIComponent(mergedConfig.agentId)}&session_type=webcall&user_id=${encodeURIComponent(userId)}&agent_name=${encodeURIComponent(mergedConfig.agentName)}`;
    const websocket = new WebSocket(wsUrl);
    websocket.binaryType = 'arraybuffer';
    wsRef.current = websocket;

    websocket.onopen = async () => {
      wsConnectedRef.current = true;
      sessionIdRef.current = `session_${Date.now()}`;

      websocket.send(JSON.stringify({
        type: 'session_config',
        config: {
          mode: 'voice',
          tenant_id: mergedConfig.tenantId,
          agent_id: mergedConfig.agentId,
          agent_name: mergedConfig.agentName,
          user_id: userId,
          stt_mode: 'audio',
          tts_mode: 'audio',
          language: mergedConfig.language,
        },
      }));

      websocket.send(JSON.stringify({
        type: 'start_session',
        flow_config: {
          policy_mode: 'sales',
          conversation_policy: 'sales',
          policy_flags: {
            enable_strategic_policy: true,
            enable_stage_aware_retrieval: true,
            enable_micro_reasoning: true,
          },
        },
        timestamp: Date.now() / 1000,
      }));

      playbackAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      lastPlaybackTimeRef.current = playbackAudioContextRef.current.currentTime;

      micAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      micSourceRef.current = micAudioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = micAudioContextRef.current.createScriptProcessor(2048, 1, 1);
      processorRef.current.onaudioprocess = (event) => {
        if (
          websocket.readyState === WebSocket.OPEN &&
          wsConnectedRef.current
        ) {
          const input = event.inputBuffer.getChannelData(0);
          const pcm = new Int16Array(input.length);
          for (let index = 0; index < input.length; index += 1) {
            pcm[index] = Math.max(-1, Math.min(1, input[index])) * 0x7fff;
          }
          websocket.send(pcm.buffer);
        }
      };

      micSourceRef.current.connect(processorRef.current);
      processorRef.current.connect(micAudioContextRef.current.destination);
    };

    websocket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        binaryQueueRef.current.push(event.data);
        return;
      }

      const message = JSON.parse(event.data);

      if (message.type === 'session_ready' || (message.type === 'state_update' && message.state === 'listening')) {
        wsConnectedRef.current = true;
        if (message.audio_format || message.format) {
          audioConfigRef.current.format = message.audio_format || message.format;
        }
        if (message.sample_rate) {
          audioConfigRef.current.sampleRate = message.sample_rate;
        }
        setConnectionStatus('connected');
        setIsCallActive(true);
        if (!callTimerRef.current) {
          callTimerRef.current = setInterval(() => {
            setCallDuration((current) => current + 1);
          }, 1000);
        }
      }

      if (message.type === 'state_update') {
        if (message.state === 'thinking' || message.state === 'interrupt' || message.state === 'listening') {
          stopPlayback();
        }
        if (message.state === 'thinking') {
          setAgentState('thinking');
        }
        if (message.state === 'listening') {
          setAgentState('listening');
        }
      } else if (message.type === 'transcript') {
        handleTranscript(message);
      } else if (message.type === 'agent_response') {
        if (message.is_complete || message.is_final) {
          const finalText = `${partialAgentTranscriptRef.current}${message.text || ''}`.trim();
          if (finalText) {
            const id = `agent-${Date.now()}-${transcriptCounterRef.current += 1}`;
            setTranscriptItems((previous) => appendTranscript(previous.filter((item) => item.id !== 'agent-streaming'), {
              id,
              role: 'agent',
              text: finalText,
              final: true,
            }));
          }
          setPartialAgentTranscript('');
        } else {
          handleAgentResponse(message);
        }
      } else if (message.type === 'audio_chunk') {
        const turnId = Number(message.playback_turn_id);
        if (Number.isFinite(turnId)) {
          if (turnId < minAcceptedPlaybackTurnIdRef.current) {
            if (message.binary_sent && binaryQueueRef.current.length > 0) {
              binaryQueueRef.current.shift();
            }
            if (message.is_final) {
              audioStreamCompleteRef.current = true;
              checkPlaybackComplete();
            }
            return;
          }
          currentPlaybackTurnIdRef.current = turnId;
        }

        if (message.sample_rate) {
          audioConfigRef.current.sampleRate = message.sample_rate;
        }

        const hasAudio = message.binary_sent || message.data || message.audio;
        if (hasAudio) {
          setAgentIsSpeaking(true);
          audioStreamCompleteRef.current = false;
        }

        if (message.binary_sent && binaryQueueRef.current.length > 0) {
          const chunk = binaryQueueRef.current.shift();
          if (chunk) {
            playAudioChunk(chunk, audioConfigRef.current.format === 'pcm_s16le');
          }
        } else {
          const payload = message.data || message.audio;
          if (payload) {
            playAudioChunk(payload);
          }
        }

        if (message.is_final) {
          audioStreamCompleteRef.current = true;
          checkPlaybackComplete();
        }
      } else if (message.type === 'audio_complete' || message.is_final) {
        audioStreamCompleteRef.current = true;
        checkPlaybackComplete();
      } else if (message.type === 'interrupt' || message.type === 'clear' || message.type === 'playback_stop') {
        stopPlayback();
      } else if (message.type === 'ping' && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() / 1000 }));
      }
    };

    websocket.onerror = () => {
      setErrorMessage('Connection failed. Check the websocket service and tenant configuration.');
    };

    websocket.onclose = () => {
      endCall();
    };
  }, [
    checkPlaybackComplete,
    endCall,
    handleAgentResponse,
    handleTranscript,
    mergedConfig.agentId,
    mergedConfig.agentName,
    mergedConfig.language,
    mergedConfig.tenantId,
    mergedConfig.wsBaseUrl,
    playAudioChunk,
    stopPlayback,
  ]);

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;
      meterCleanupRef.current = startMicLevelMeter(stream);
      await startVoiceCall(stream);
    } catch (error) {
      setErrorMessage('Microphone access was blocked. Enable the mic and reload the page.');
    }
  }, [startMicLevelMeter, startVoiceCall]);

  const requiredPassword = useMemo(() => {
    if (mergedConfig.tenantId === 'bundb') {
      return 'Bundb@2026';
    }
    if (mergedConfig.tenantId === 'davinci') {
      return 'Davinci@2026';
    }
    return '';
  }, [mergedConfig.tenantId]);

  const handleStartCall = useCallback(() => {
    if (!requiredPassword || isPasswordVerified) {
      startCall();
      return;
    }
    setPasswordInput('');
    setPasswordError('');
    setShowPasswordPrompt(true);
  }, [isPasswordVerified, requiredPassword, startCall]);

  const handleEndCall = useCallback(() => {
    endCall();
  }, [endCall]);

  const handleToggleCall = useCallback(() => {
    if (isCallActive) {
      handleEndCall();
      return;
    }
    handleStartCall();
  }, [handleEndCall, handleStartCall, isCallActive]);

  const handlePasswordSubmit = useCallback(() => {
    if (passwordInput.trim() !== requiredPassword) {
      setPasswordError('Incorrect password');
      return;
    }
    setPasswordError('');
    setIsPasswordVerified(true);
    setShowPasswordPrompt(false);
    setPasswordInput('');
    startCall();
  }, [passwordInput, requiredPassword, startCall]);

  const remainingSeconds = CALL_LIMIT_SECONDS - callDuration;
  const isWarning = remainingSeconds <= 30 && isCallActive;
  const visualAgentState = isCallActive ? agentState : 'idle';
  const posterTitle = `${mergedConfig.tenantName} x TARA`;
  const pageBackground = '#080808';
  const frameBorder = 'rgba(255,255,255,0.10)';
  const hairline = 'rgba(255,255,255,0.06)';
  const phoneSurface = 'linear-gradient(180deg, #0f0f0f 0%, #171717 100%)';
  const orbBorderColor = visualAgentState === 'talking'
    ? withAlpha(mergedBrand.accentSoft, 0.92)
    : visualAgentState === 'listening'
      ? withAlpha(mergedBrand.accent, 0.86)
      : visualAgentState === 'thinking'
        ? withAlpha(mergedBrand.accentSoft, 0.72)
        : withAlpha(mergedBrand.accentSoft, 0.48);
  const orbOuterGlow = visualAgentState === 'talking'
    ? `0 0 36px ${withAlpha(mergedBrand.accent, 0.28)}`
    : visualAgentState === 'listening'
      ? `0 0 28px ${withAlpha(mergedBrand.accent, 0.22)}`
      : `0 0 18px ${withAlpha(mergedBrand.accentSoft, 0.14)}`;
  const orbBorderWidth = visualAgentState === 'talking' ? '8px' : visualAgentState === 'listening' ? '6px' : '5px';

  return (
    <div
      style={{
        height: '100vh',
        background: pageBackground,
        color: mergedBrand.text,
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '64px 20px 0',
          height: '100%',
        }}
      >
        <MobileNavigation />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderLeft: `1px solid ${frameBorder}`,
            borderRight: `1px solid ${frameBorder}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <style>{`
            @keyframes taraOrbBreathe {
              0%, 100% { transform: scale(0.98); opacity: 0.62; }
              50% { transform: scale(1.03); opacity: 1; }
            }
            @keyframes taraOrbListen {
              0%, 100% { transform: scale(1); opacity: 0.7; }
              50% { transform: scale(1.06); opacity: 1; }
            }
            @keyframes taraOrbSpeak {
              0%, 100% { transform: scale(0.985); opacity: 0.82; }
              50% { transform: scale(1.085); opacity: 1; }
            }
            @keyframes taraOrbThink {
              0% { transform: scale(0.99) rotate(0deg); opacity: 0.55; }
              50% { transform: scale(1.04) rotate(180deg); opacity: 0.9; }
              100% { transform: scale(0.99) rotate(360deg); opacity: 0.55; }
            }
          `}</style>

          <div className="absolute inset-0 pointer-events-none">
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
                `,
                backgroundSize: '44px 44px',
                opacity: 0.22,
              }}
            />
            <div style={{ position: 'absolute', top: 0, left: '50%', width: '1px', height: '100%', background: hairline }} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              height: '100%',
            }}
          >
            <div
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '360px',
                    aspectRatio: '0.78 / 1',
                    background: '#ededed',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      minHeight: '460px',
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: phoneSurface,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 22px',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        fontSize: '11px',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: mergedBrand.textMuted,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>{connectionStatus || 'idle'}</span>
                      <span>{formatSeconds(callDuration)}</span>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        maxWidth: '145px',
                        aspectRatio: '1 / 1',
                        borderRadius: '50%',
                        position: 'relative',
                        background: `radial-gradient(circle, ${withAlpha(mergedBrand.accent, 0.1)} 0%, rgba(0,0,0,0) 68%)`,
                        opacity: 0.9,
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: '-10%',
                          borderRadius: '50%',
                          border: `2px solid ${withAlpha(mergedBrand.accentSoft, 0.16)}`,
                          opacity: isCallActive ? 1 : 0.55,
                          animation: visualAgentState === 'talking'
                            ? 'taraOrbSpeak 1s ease-in-out infinite'
                            : visualAgentState === 'listening'
                              ? 'taraOrbListen 1.4s ease-in-out infinite'
                              : visualAgentState === 'thinking'
                                ? 'taraOrbThink 2.6s linear infinite'
                                : 'taraOrbBreathe 2.8s ease-in-out infinite',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: '2%',
                          borderRadius: '50%',
                          border: `${orbBorderWidth} solid ${orbBorderColor}`,
                          boxShadow: orbOuterGlow,
                          opacity: 1,
                          animation: visualAgentState === 'talking'
                            ? 'taraOrbSpeak 1s ease-in-out infinite'
                            : visualAgentState === 'listening'
                              ? 'taraOrbListen 1.4s ease-in-out infinite'
                              : visualAgentState === 'thinking'
                                ? 'taraOrbThink 2.6s linear infinite'
                                : 'taraOrbBreathe 2.8s ease-in-out infinite',
                        }}
                      />
                      <OrbRenderer
                        agentState={visualAgentState}
                        userVolume={userVolume}
                        brand={mergedBrand}
                      />
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: isWarning ? mergedBrand.accentSoft : isCallActive ? mergedBrand.accent : mergedBrand.textMuted,
                        textAlign: 'center',
                      }}
                    >
                      {isCallActive ? `${STATUS_LABELS[agentState]} · ${remainingSeconds}s` : 'Ready to start'}
                    </div>
                  </div>

                  <div style={{ paddingTop: '10px', color: '#111111' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.02em' }}>
                      {mergedBrand.name}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, marginTop: '2px' }}>
                      {posterTitle}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(17,17,17,0.72)' }}>{mergedConfig.language.toUpperCase()}</span>
                      <button
                        type="button"
                        onClick={handleToggleCall}
                        style={{
                          border: 'none',
                          borderRadius: '4px',
                          padding: '10px 16px',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: isCallActive ? '#f5f5f5' : '#111111',
                          background: isCallActive ? '#111111' : mergedBrand.accent,
                          cursor: 'pointer',
                        }}
                      >
                        {isCallActive ? 'End Call' : 'Start Call'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '24px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  paddingTop: '26px',
                  paddingBottom: '14px',
                  borderBottom: `1px solid ${hairline}`,
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: mergedBrand.textMuted,
                }}
              >
                Transcriptions
              </div>

              <div
                style={{
                  flex: 1,
                  paddingTop: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  overflowY: 'auto',
                  minHeight: 0,
                }}
              >
                <AnimatePresence initial={false}>
                  {transcriptItems.length === 0 && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        color: mergedBrand.textMuted,
                        fontSize: '15px',
                        lineHeight: 1.8,
                        maxWidth: '540px',
                        paddingTop: '18px',
                      }}
                    >
                      Start the call on the left to begin streaming transcription.
                    </motion.div>
                  )}
                  {transcriptItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      style={{
                        display: 'flex',
                        justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
                        paddingTop: '8px',
                        maxWidth: '760px',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '80%',
                          padding: '12px 16px',
                          borderRadius: item.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: item.role === 'user'
                            ? withAlpha(mergedBrand.accent || '#117dff', 0.12)
                            : withAlpha(mergedBrand.textMuted || '#888', 0.08),
                          border: `1px solid ${item.role === 'user'
                            ? withAlpha(mergedBrand.accent || '#117dff', 0.15)
                            : withAlpha(mergedBrand.textMuted || '#888', 0.1)}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: item.role === 'user'
                              ? (mergedBrand.accent || '#117dff')
                              : mergedBrand.textMuted,
                            marginBottom: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <span>{item.role === 'user' ? 'You' : mergedConfig.agentName}</span>
                          {item.streaming && (
                            <span style={{ opacity: 0.6, animation: 'pulse 1.5s ease-in-out infinite' }}>
                              streaming...
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '15px',
                            lineHeight: 1.65,
                            color: item.streaming
                              ? withAlpha(mergedBrand.text, 0.75)
                              : mergedBrand.text,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {item.text}
                          {item.streaming && (
                            <span style={{
                              display: 'inline-block',
                              width: '2px',
                              height: '16px',
                              background: mergedBrand.accent || '#117dff',
                              marginLeft: '2px',
                              verticalAlign: 'text-bottom',
                              animation: 'pulse 1s ease-in-out infinite',
                            }} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {errorMessage && (
                <div
                  style={{
                    paddingTop: '14px',
                    borderTop: `1px solid ${hairline}`,
                    color: '#fca5a5',
                    fontSize: '13px',
                    lineHeight: 1.7,
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <AnimatePresence>
                {showPasswordPrompt && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0,0,0,0.48)',
                      backdropFilter: 'blur(8px)',
                      zIndex: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px',
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      style={{
                        width: '100%',
                        maxWidth: '360px',
                        background: '#121212',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '22px',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
                      }}
                    >
                      <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: mergedBrand.textMuted }}>
                        Access Required
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.04em', color: mergedBrand.text }}>
                        Enter password
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: 1.7, color: mergedBrand.textMuted }}>
                        Confirm access before starting the {mergedConfig.tenantName} voice test.
                      </div>

                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(event) => {
                          setPasswordInput(event.target.value);
                          if (passwordError) {
                            setPasswordError('');
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            handlePasswordSubmit();
                          }
                        }}
                        autoFocus
                        style={{
                          marginTop: '18px',
                          width: '100%',
                          background: '#0b0b0b',
                          border: `1px solid ${passwordError ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.12)'}`,
                          color: '#f5f5f5',
                          padding: '12px 14px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />

                      {passwordError && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#fca5a5' }}>
                          {passwordError}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '18px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordPrompt(false);
                            setPasswordInput('');
                            setPasswordError('');
                          }}
                          style={{
                            flex: 1,
                            padding: '12px 14px',
                            border: '1px solid rgba(255,255,255,0.14)',
                            background: 'transparent',
                            color: mergedBrand.text,
                            fontSize: '12px',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handlePasswordSubmit}
                          style={{
                            flex: 1,
                            padding: '12px 14px',
                            border: 'none',
                            background: mergedBrand.accent,
                            color: '#111111',
                            fontSize: '12px',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          Continue
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function VoiceAgentTestPage(props) {
  return (
    <ThemeProvider>
      <VoiceAgentTestPageContent {...props} />
    </ThemeProvider>
  );
}
