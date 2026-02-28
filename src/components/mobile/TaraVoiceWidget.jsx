import React, { useRef, useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════
// ORB COMPONENT (Inline - matching enterprise ElevenLabs orb)
// ═══════════════════════════════════════════════════════════

function splitmix32(a) {
    return function () {
        a |= 0;
        a = (a + 0x9e3779b9) | 0;
        let t = a ^ (a >>> 16);
        t = Math.imul(t, 0x21f0aaad);
        t = t ^ (t >>> 15);
        t = Math.imul(t, 0x735a2d97);
        return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
    };
}

function clamp01(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
}

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uAnimation;
uniform float uInverted;
uniform float uOffsets[7];
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uInputVolume;
uniform float uOutputVolume;
uniform float uOpacity;
varying vec2 vUv;

const float PI = 3.14159265358979323846;

bool drawOval(vec2 polarUv, vec2 polarCenter, float a, float b, bool reverseGradient, float softness, out vec4 color) {
    vec2 p = polarUv - polarCenter;
    float oval = (p.x * p.x) / (a * a) + (p.y * p.y) / (b * b);
    float edge = smoothstep(1.0, 1.0 - softness, oval);
    if (edge > 0.0) {
        float gradient = reverseGradient ? (1.0 - (p.x / a + 1.0) / 2.0) : ((p.x / a + 1.0) / 2.0);
        gradient = mix(0.5, gradient, 0.1);
        color = vec4(vec3(gradient), 0.85 * edge);
        return true;
    }
    return false;
}

vec3 colorRamp(float grayscale, vec3 color1, vec3 color2, vec3 color3, vec3 color4) {
    if (grayscale < 0.33) {
        return mix(color1, color2, grayscale * 3.0);
    } else if (grayscale < 0.66) {
        return mix(color2, color3, (grayscale - 0.33) * 3.0);
    } else {
        return mix(color3, color4, (grayscale - 0.66) * 3.0);
    }
}

vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float n = mix(mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x), mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
    return 0.5 + 0.5 * n;
}

float sharpRing(vec3 decomposed, float time) {
    float ringStart = 1.0;
    float ringWidth = 0.3;
    float noiseScale = 5.0;
    float noise = mix(noise2D(vec2(decomposed.x, time) * noiseScale), noise2D(vec2(decomposed.y, time) * noiseScale), decomposed.z);
    noise = (noise - 0.5) * 2.5;
    return ringStart + noise * ringWidth * 1.5;
}

float smoothRing(vec3 decomposed, float time) {
    float ringStart = 0.9;
    float ringWidth = 0.2;
    float noiseScale = 6.0;
    float noise = mix(noise2D(vec2(decomposed.x, time) * noiseScale), noise2D(vec2(decomposed.y, time) * noiseScale), decomposed.z);
    noise = (noise - 0.5) * 5.0;
    return ringStart + noise * ringWidth;
}

float flow(vec3 decomposed, float time) {
    float n1 = noise2D(vec2(time, decomposed.x / 2.0));
    float n2 = noise2D(vec2(time, decomposed.y / 2.0));
    return mix(n1, n2, decomposed.z);
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float radius = length(uv);
    float theta = atan(uv.y, uv.x);
    if (theta < 0.0) theta += 2.0 * PI;

    vec3 decomposed = vec3(theta / (2.0 * PI), mod(theta / (2.0 * PI) + 0.5, 1.0) + 1.0, abs(theta / PI - 1.0));
    float noise = flow(decomposed, radius * 0.03 - uAnimation * 0.2) - 0.5;
    theta += noise * mix(0.08, 0.25, uOutputVolume);

    vec4 color = vec4(1.0, 1.0, 1.0, 1.0);
    float originalCenters[7] = float[7](0.0, 0.5 * PI, 1.0 * PI, 1.5 * PI, 2.0 * PI, 2.5 * PI, 3.0 * PI);
    float centers[7];
    for (int i = 0; i < 7; i++) {
        centers[i] = originalCenters[i] + 0.5 * sin(uTime / 20.0 + uOffsets[i]);
    }

    float a, b;
    vec4 ovalColor;
    for (int i = 0; i < 7; i++) {
        float noise = noise2D(vec2(mod(centers[i] + uTime * 0.05, 1.0), 0.5));
        a = 0.5 + noise * 0.3;
        b = noise * mix(3.5, 2.5, uInputVolume);
        bool reverseGradient = (i % 2 == 1);
        float distTheta = min(abs(theta - centers[i]), min(abs(theta + 2.0 * PI - centers[i]), abs(theta - 2.0 * PI - centers[i])));
        float distRadius = radius;
        if (drawOval(vec2(distTheta, distRadius), vec2(0.0, 0.0), a, b, reverseGradient, 0.6, ovalColor)) {
            color.rgb = mix(color.rgb, ovalColor.rgb, ovalColor.a);
            color.a = max(color.a, ovalColor.a);
        }
    }
    
    float ringRadius1 = sharpRing(decomposed, uTime * 0.1);
    float ringRadius2 = smoothRing(decomposed, uTime * 0.1);
    float inputRadius1 = radius + uInputVolume * 0.2;
    float inputRadius2 = radius + uInputVolume * 0.15;
    float opacity1 = mix(0.2, 0.6, uInputVolume);
    float opacity2 = mix(0.15, 0.45, uInputVolume);
    float ringAlpha1 = (inputRadius2 >= ringRadius1) ? opacity1 : 0.0;
    float ringAlpha2 = smoothstep(ringRadius2 - 0.05, ringRadius2 + 0.05, inputRadius1) * opacity2;
    float totalRingAlpha = max(ringAlpha1, ringAlpha2);
    vec3 ringColor = vec3(1.0);
    color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - ringColor * totalRingAlpha);

    vec3 color1 = vec3(0.0, 0.0, 0.0);
    vec3 color2 = uColor1;
    vec3 color3 = uColor2;
    vec3 color4 = vec3(1.0, 1.0, 1.0);

    float luminance = mix(color.r, 1.0 - color.r, uInverted);
    color.rgb = colorRamp(luminance, color1, color2, color3, color4);
    color.a *= uOpacity;
    gl_FragColor = color;
}
`;

function OrbScene({ agentState, userVolume, agentIsSpeaking }) {
    useThree();
    const circleRef = useRef(null);
    const colors = ["#CADCFC", "#A0B9D1"];
    const initialColorsRef = useRef(colors);
    const targetColor1Ref = useRef(new THREE.Color(colors[0]));
    const targetColor2Ref = useRef(new THREE.Color(colors[1]));
    const animSpeedRef = useRef(0.1);
    const agentRef = useRef(agentState);
    const curInRef = useRef(0);
    const curOutRef = useRef(0);

    useEffect(() => { agentRef.current = agentState; }, [agentState]);

    const random = useMemo(() => splitmix32(Math.floor(Math.random() * 2 ** 32)), []);
    const offsets = useMemo(() => new Float32Array(Array.from({ length: 7 }, () => random() * Math.PI * 2)), [random]);

    useEffect(() => {
        if (!circleRef.current) return;
        circleRef.current.material.uniforms.uInverted.value = 1;
    }, []);

    useFrame((_, delta) => {
        const mat = circleRef.current?.material;
        if (!mat) return;
        const u = mat.uniforms;
        u.uTime.value += delta * 0.5;
        if (u.uOpacity.value < 1) u.uOpacity.value = Math.min(1, u.uOpacity.value + delta * 2);

        let targetIn = clamp01(userVolume || 0);
        let targetOut = agentIsSpeaking ? clamp01(0.6 + Math.random() * 0.4) : 0;

        const t = u.uTime.value * 2;
        if (agentRef.current === null) {
            targetIn = 0; targetOut = 0.3;
        } else if (agentRef.current === 'listening') {
            targetIn = clamp01(userVolume > 0.1 ? userVolume : 0.55 + Math.sin(t * 3.2) * 0.35);
            targetOut = 0.45;
        } else if (agentRef.current === 'talking') {
            targetIn = clamp01(0.65 + Math.sin(t * 4.8) * 0.22);
            targetOut = clamp01(0.75 + Math.sin(t * 3.6) * 0.22);
        } else if (agentRef.current === 'thinking') {
            const base = 0.38 + 0.07 * Math.sin(t * 0.7);
            const wander = 0.05 * Math.sin(t * 2.1) * Math.sin(t * 0.37 + 1.2);
            targetIn = clamp01(base + wander);
            targetOut = clamp01(0.48 + 0.12 * Math.sin(t * 1.05 + 0.6));
        }

        curInRef.current += (targetIn - curInRef.current) * 0.2;
        curOutRef.current += (targetOut - curOutRef.current) * 0.2;
        const targetSpeed = 0.1 + (1 - Math.pow(curOutRef.current - 1, 2)) * 0.9;
        animSpeedRef.current += (targetSpeed - animSpeedRef.current) * 0.12;

        u.uAnimation.value += delta * animSpeedRef.current;
        u.uInputVolume.value = curInRef.current;
        u.uOutputVolume.value = curOutRef.current;
        u.uColor1.value.lerp(targetColor1Ref.current, 0.08);
        u.uColor2.value.lerp(targetColor2Ref.current, 0.08);
    });

    const uniforms = useMemo(() => ({
        uColor1: new THREE.Uniform(new THREE.Color(initialColorsRef.current[0])),
        uColor2: new THREE.Uniform(new THREE.Color(initialColorsRef.current[1])),
        uOffsets: { value: offsets },
        uTime: new THREE.Uniform(0),
        uAnimation: new THREE.Uniform(0.1),
        uInverted: new THREE.Uniform(1),
        uInputVolume: new THREE.Uniform(0),
        uOutputVolume: new THREE.Uniform(0),
        uOpacity: new THREE.Uniform(0),
    }), [offsets]);

    return (
        <mesh ref={circleRef}>
            <circleGeometry args={[3.5, 64]} />
            <shaderMaterial
                uniforms={uniforms}
                fragmentShader={fragmentShader}
                vertexShader={vertexShader}
                transparent={true}
            />
        </mesh>
    );
}

function OrbRenderer({ agentState, userVolume, agentIsSpeaking }) {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas
                resize={{ debounce: 100 }}
                gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}
            >
                <Suspense fallback={null}>
                    <OrbScene
                        agentState={agentState}
                        userVolume={userVolume}
                        agentIsSpeaking={agentIsSpeaking}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// TARA VOICE WIDGET
// ═══════════════════════════════════════════════════════════

const getWsBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8004/';
    }
    return 'https://demo.davinciai.eu:8440/';
};

const STATE_LABELS = {
    null: 'TAP TO TALK',
    listening: 'LISTENING',
    talking: 'TARA SPEAKING',
    thinking: 'THINKING...',
};

const TaraVoiceWidget = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [agentState, setAgentState] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    const [userVolume, setUserVolume] = useState(0);
    const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [micStream, setMicStream] = useState(null);

    const wsRef = useRef(null);
    const audioCtxRef = useRef(null);
    const wsConnectedRef = useRef(false);
    const audioWorkletRef = useRef(null);
    const binaryQueueRef = useRef([]);
    const lastPlaybackTimeRef = useRef(0);
    const playbackStartTimeRef = useRef(null);
    const audioStreamCompleteRef = useRef(false);
    const audioConfigRef = useRef({ format: 'pcm_f32le', sampleRate: 44100 });
    const callTimerRef = useRef(null);
    const animationFrameRef = useRef(null);
    const sessionIdRef = useRef(null);

    // Sync agent state from connection/speaking
    useEffect(() => {
        if (connectionStatus === 'connected') {
            setAgentState(agentIsSpeaking ? 'talking' : 'listening');
        } else if (connectionStatus === 'connecting') {
            setAgentState('thinking');
        } else {
            setAgentState(null);
        }
    }, [agentIsSpeaking, connectionStatus]);

    // Volume analyzer
    useEffect(() => {
        if (!micStream) return;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(micStream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const average = sum / dataArray.length;
            setUserVolume(Math.min(1, average / 30));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            audioContext.close();
        };
    }, [micStream]);

    const checkPlaybackComplete = useCallback(() => {
        if (!audioCtxRef.current) return;
        if (audioCtxRef.current.currentTime >= lastPlaybackTimeRef.current - 0.1) {
            setAgentIsSpeaking(false);
            if (audioStreamCompleteRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                const duration = playbackStartTimeRef.current ? Date.now() - playbackStartTimeRef.current : 0;
                wsRef.current.send(JSON.stringify({
                    type: 'playback_done',
                    duration_ms: duration,
                    timestamp: Date.now() / 1000
                }));
                playbackStartTimeRef.current = null;
                audioStreamCompleteRef.current = false;
            }
        }
    }, []);

    const playAudioChunk = useCallback((data, forceInt16 = false) => {
        let float32;
        const format = audioConfigRef.current.format;
        const sampleRate = audioConfigRef.current.sampleRate;

        if (data instanceof ArrayBuffer) {
            if (format === 'pcm_s16le' || forceInt16) {
                const int16 = new Int16Array(data);
                float32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
            } else {
                float32 = new Float32Array(data);
            }
        } else {
            const binaryString = atob(data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            if (format === 'pcm_s16le' || forceInt16) {
                const int16 = new Int16Array(bytes.buffer);
                float32 = new Float32Array(int16.length);
                for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
            } else {
                float32 = new Float32Array(bytes.buffer);
            }
        }

        if (audioCtxRef.current) {
            const buffer = audioCtxRef.current.createBuffer(1, float32.length, sampleRate);
            buffer.copyToChannel(float32, 0);
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);
            const now = audioCtxRef.current.currentTime;
            let startAt = lastPlaybackTimeRef.current;
            if (startAt < now) startAt = now;
            source.start(startAt);
            lastPlaybackTimeRef.current = startAt + buffer.duration;
            source.onended = () => checkPlaybackComplete();
        }
    }, [checkPlaybackComplete]);

    const startCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            setMicStream(stream);
            startVoiceCall(stream);
        } catch (err) {
            console.error("Mic access failed:", err);
            alert("Please enable microphone access");
        }
    };

    const startVoiceCall = (stream) => {
        setConnectionStatus('connecting');
        setAgentState('thinking');
        setCallDuration(0);

        const baseUrl = getWsBaseUrl();
        const normalizedWs = String(baseUrl).replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
        const wsUrlBase = normalizedWs.endsWith('/') ? `${normalizedWs}ws` : `${normalizedWs}/ws`;
        const userId = 'widget-user-' + Date.now();
        const wsUrl = `${wsUrlBase}?user_id=${encodeURIComponent(userId)}`;

        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
            wsConnectedRef.current = true;
            const sessionId = crypto.randomUUID();
            sessionIdRef.current = sessionId;

            ws.send(JSON.stringify({
                type: 'session_config',
                config: {
                    mode: 'voice',
                    tenant_id: 'davinci-widget',
                    user_id: userId,
                    stt_mode: 'audio',
                    tts_mode: 'audio',
                    language: 'en',
                    voice: 'anushka',
                    voice_name: 'anushka',
                    tts_voice: 'anushka'
                }
            }));
            ws.send(JSON.stringify({ type: 'start_session', timestamp: Date.now() / 1000 }));

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
            audioCtxRef.current = audioCtx;
            lastPlaybackTimeRef.current = audioCtx.currentTime;

            const micAudioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = micAudioCtx.createMediaStreamSource(stream);
            const processor = micAudioCtx.createScriptProcessor(2048, 1, 1);
            processor.onaudioprocess = (e) => {
                if (ws.readyState === WebSocket.OPEN && wsConnectedRef.current) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }
                    ws.send(pcmData.buffer);
                }
            };
            source.connect(processor);
            processor.connect(micAudioCtx.destination);
            audioWorkletRef.current = processor;
        };

        ws.onmessage = async (e) => {
            if (e.data instanceof ArrayBuffer) {
                binaryQueueRef.current.push(e.data);
                return;
            }

            const data = JSON.parse(e.data);

            if (data.type === 'session_ready' || (data.type === 'state_update' && data.state === 'listening')) {
                wsConnectedRef.current = true;
                if (data.audio_format || data.format) audioConfigRef.current.format = data.audio_format || data.format;
                if (data.sample_rate) audioConfigRef.current.sampleRate = data.sample_rate;

                if (connectionStatus !== 'connected') {
                    setConnectionStatus('connected');
                    setIsCallActive(true);
                    setAgentState('listening');
                    if (!callTimerRef.current) {
                        callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
                    }
                }
            } else if (data.type === 'audio_chunk') {
                if (data.sample_rate) audioConfigRef.current.sampleRate = data.sample_rate;
                if (data.format || data.audio_format) audioConfigRef.current.format = data.format || data.audio_format;

                if (!playbackStartTimeRef.current) playbackStartTimeRef.current = Date.now();
                setAgentIsSpeaking(true);
                audioStreamCompleteRef.current = false;

                if (data.binary_sent && binaryQueueRef.current.length > 0) {
                    const binChunk = binaryQueueRef.current.shift();
                    if (binChunk) playAudioChunk(binChunk, audioConfigRef.current.format === 'pcm_s16le');
                } else {
                    const audioB64 = data.data || data.audio;
                    if (audioB64) playAudioChunk(audioB64);
                }

                if (data.is_final) {
                    audioStreamCompleteRef.current = true;
                    checkPlaybackComplete();
                }
            } else if (data.type === 'audio_complete' || data.is_final) {
                audioStreamCompleteRef.current = true;
                checkPlaybackComplete();
            } else if (data.type === 'interrupt' || data.type === 'clear') {
                setAgentIsSpeaking(false);
                lastPlaybackTimeRef.current = audioCtxRef.current?.currentTime || 0;
                playbackStartTimeRef.current = null;
            } else if (data.type === 'ping') {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() / 1000 }));
                }
            }
        };

        ws.onclose = () => { endCall(); };
        ws.onerror = () => { endCall(); };
    };

    const endCall = useCallback(() => {
        if (wsRef.current) {
            if (wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'interrupt', timestamp: Date.now() / 1000 }));
            }
            wsRef.current.close();
            wsRef.current = null;
        }
        binaryQueueRef.current = [];
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = null;
        if (micStream) micStream.getTracks().forEach(track => track.stop());

        setIsCallActive(false);
        setConnectionStatus(null);
        setAgentIsSpeaking(false);
        wsConnectedRef.current = false;
        setAgentState(null);
        setMicStream(null);
        setCallDuration(0);
    }, [micStream]);

    const toggleWidget = () => {
        if (isExpanded && isCallActive) {
            endCall();
        }
        setIsExpanded(!isExpanded);
    };

    const handleCallToggle = () => {
        if (isCallActive) {
            endCall();
        } else {
            startCall();
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <>
            {/* Collapsed Orb Button */}
            <AnimatePresence>
                {!isExpanded && (
                    <motion.button
                        onClick={toggleWidget}
                        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full overflow-hidden"
                        style={{
                            background: 'rgba(10, 10, 10, 0.85)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            padding: 0,
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <OrbRenderer agentState={null} userVolume={0} agentIsSpeaking={false} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Expanded Widget Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="fixed bottom-6 right-6 z-[9999]"
                        style={{
                            width: '280px',
                            borderRadius: '24px',
                            background: 'rgba(8, 8, 12, 0.75)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                        }}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 18px 10px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: isCallActive ? '#22c55e' : 'rgba(255,255,255,0.25)',
                                    boxShadow: isCallActive ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                                    transition: 'all 0.3s ease',
                                }} />
                                <span style={{
                                    fontFamily: 'monospace', fontSize: '9px', fontWeight: 700,
                                    color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
                                    letterSpacing: '0.15em',
                                }}>DAVINCI</span>
                            </div>
                            <button
                                onClick={toggleWidget}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    width: '26px', height: '26px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                                    fontSize: '12px', fontWeight: 'bold',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
                                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
                            >×</button>
                        </div>

                        {/* Orb Container */}
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', padding: '20px 24px 12px',
                        }}>
                            <div style={{
                                width: '140px', height: '140px',
                                borderRadius: '50%',
                                position: 'relative',
                                background: 'rgba(255,255,255,0.02)',
                            }}>
                                <OrbRenderer
                                    agentState={agentState}
                                    userVolume={userVolume}
                                    agentIsSpeaking={agentIsSpeaking}
                                />
                                {/* Subtle ring glow */}
                                {isCallActive && (
                                    <div style={{
                                        position: 'absolute', inset: '-4px',
                                        borderRadius: '50%',
                                        border: agentState === 'talking'
                                            ? '1px solid rgba(202,220,252,0.3)'
                                            : '1px solid rgba(255,255,255,0.08)',
                                        transition: 'all 0.5s ease',
                                        pointerEvents: 'none',
                                    }} />
                                )}
                            </div>

                            {/* Agent Name */}
                            <h3 style={{
                                marginTop: '16px', marginBottom: '4px',
                                fontSize: '16px', fontWeight: 700,
                                color: '#fff', letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                            }}>TARA</h3>

                            {/* State Label */}
                            <motion.p
                                key={agentState}
                                style={{
                                    fontSize: '9px', fontFamily: 'monospace',
                                    color: agentState === 'talking'
                                        ? 'rgba(202,220,252,0.8)'
                                        : agentState === 'listening'
                                            ? 'rgba(34,197,94,0.7)'
                                            : 'rgba(255,255,255,0.35)',
                                    letterSpacing: '0.2em', textTransform: 'uppercase',
                                    margin: 0, fontWeight: 600,
                                    transition: 'color 0.3s ease',
                                }}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {STATE_LABELS[agentState] || STATE_LABELS[null]}
                            </motion.p>

                            {/* Timer */}
                            <p style={{
                                marginTop: '8px', marginBottom: 0,
                                fontSize: '11px', fontFamily: 'monospace',
                                color: 'rgba(255,255,255,0.3)',
                                letterSpacing: '0.08em',
                            }}>
                                {formatTime(callDuration)}
                            </p>
                        </div>

                        {/* Call Button */}
                        <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'center' }}>
                            <motion.button
                                onClick={handleCallToggle}
                                style={{
                                    width: '100%', padding: '12px',
                                    borderRadius: '12px',
                                    fontSize: '10px', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.15em',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'all 0.2s ease',
                                    background: isCallActive
                                        ? 'rgba(239, 68, 68, 0.15)'
                                        : 'rgba(255,255,255,0.08)',
                                    color: isCallActive ? '#ef4444' : 'rgba(255,255,255,0.85)',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: isCallActive
                                        ? 'rgba(239,68,68,0.3)'
                                        : 'rgba(255,255,255,0.12)',
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isCallActive ? (
                                    <>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                                            <line x1="23" y1="1" x2="1" y2="23" />
                                        </svg>
                                        End Call
                                    </>
                                ) : (
                                    <>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                            <polygon points="5 3 19 12 5 21 5 3" />
                                        </svg>
                                        Start Call
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default TaraVoiceWidget;
