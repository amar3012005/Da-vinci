import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

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

function clamp01(value) {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

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

const CALL_LIMIT_SECONDS = 300;
const AUDIO_INPUT_CONSTRAINTS = {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleSize: 16
};

const STATE_LABELS = {
    idle: 'Ready to start',
    connecting: 'Connecting to voice backend',
    listening: 'Listening',
    thinking: 'Thinking',
    talking: 'Speaking',
    ended: 'Session ended',
    error: 'Connection issue'
};

const TEST_AGENT_CONFIGS = {
    bundb: {
        slug: 'bundb',
        title: 'BUNDB Voice Agent Test',
        tenantId: 'bundb',
        tenantName: 'BUNDB',
        agentId: 'bundb',
        agentName: 'BUNDB Agent',
        language: 'de',
        brandLabel: 'BUNDB',
        accent: '#A63E1B',
        accentSoft: 'rgba(166, 62, 27, 0.22)',
        accentStrong: 'rgba(166, 62, 27, 0.48)',
        surface: 'rgba(24, 15, 11, 0.9)',
        panel: 'rgba(15, 11, 9, 0.86)',
        text: '#F6EFEA',
        muted: 'rgba(246, 239, 234, 0.64)',
        orbColors: ['#A63E1B', '#F1E5D8'],
        background: 'radial-gradient(circle at top, rgba(166, 62, 27, 0.32), transparent 40%), linear-gradient(180deg, #130d0a 0%, #080808 100%)'
    },
    davinci: {
        slug: 'davinci',
        title: 'DAVINCI AI Voice Agent Test',
        tenantId: 'davinci',
        tenantName: 'DAVINCI AI',
        agentId: 'davinci',
        agentName: 'DAVINCIAI',
        language: 'de',
        brandLabel: 'DAVINCI AI',
        accent: '#CADCFC',
        accentSoft: 'rgba(202, 220, 252, 0.2)',
        accentStrong: 'rgba(202, 220, 252, 0.42)',
        surface: 'rgba(14, 18, 24, 0.9)',
        panel: 'rgba(9, 12, 18, 0.86)',
        text: '#F7FAFF',
        muted: 'rgba(247, 250, 255, 0.66)',
        orbColors: ['#CADCFC', '#A0B9D1'],
        background: 'radial-gradient(circle at top, rgba(202, 220, 252, 0.24), transparent 40%), linear-gradient(180deg, #090c12 0%, #040506 100%)'
    }
};

function getWsBaseUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//demo.davinciai.eu:8030/ws`;
}

function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function createMessage(id, role, text, isLive = false) {
    return {
        id,
        role,
        text,
        isLive,
        timestamp: new Date().toLocaleTimeString()
    };
}

function OrbScene({ agentState, userVolume, agentIsSpeaking, orbColors }) {
    useThree();
    const meshRef = useRef(null);
    const inputLevelRef = useRef(0);
    const outputLevelRef = useRef(0);
    const speedRef = useRef(0.1);
    const stateRef = useRef(agentState);
    const colorOneRef = useRef(new THREE.Color(orbColors[0]));
    const colorTwoRef = useRef(new THREE.Color(orbColors[1]));
    const rng = useMemo(() => splitmix32(Math.floor(Math.random() * 2 ** 32)), []);
    const offsets = useMemo(
        () => new Float32Array(Array.from({ length: 7 }, () => rng() * Math.PI * 2)),
        [rng]
    );

    useEffect(() => {
        stateRef.current = agentState;
    }, [agentState]);

    const uniforms = useMemo(
        () => ({
            uColor1: new THREE.Uniform(new THREE.Color(orbColors[0])),
            uColor2: new THREE.Uniform(new THREE.Color(orbColors[1])),
            uOffsets: { value: offsets },
            uTime: new THREE.Uniform(0),
            uAnimation: new THREE.Uniform(0.1),
            uInverted: new THREE.Uniform(1),
            uInputVolume: new THREE.Uniform(0),
            uOutputVolume: new THREE.Uniform(0),
            uOpacity: new THREE.Uniform(0)
        }),
        [offsets, orbColors]
    );

    useFrame((_, delta) => {
        const material = meshRef.current?.material;
        if (!material) {
            return;
        }
        const uniformsRef = material.uniforms;
        uniformsRef.uTime.value += delta * 0.5;
        uniformsRef.uOpacity.value = Math.min(1, uniformsRef.uOpacity.value + delta * 2);

        const time = uniformsRef.uTime.value * 2;
        let targetInput = 0.05;
        let targetOutput = 0.18;

        if (stateRef.current === 'listening') {
            targetInput = clamp01(userVolume > 0.08 ? userVolume : 0.42 + Math.sin(time * 3.1) * 0.18);
            targetOutput = 0.24;
        } else if (stateRef.current === 'talking' || agentIsSpeaking) {
            targetInput = clamp01(0.48 + Math.sin(time * 4.2) * 0.16);
            targetOutput = clamp01(0.8 + Math.sin(time * 3.4) * 0.18);
        } else if (stateRef.current === 'thinking' || stateRef.current === 'connecting') {
            targetInput = clamp01(0.26 + Math.sin(time * 1.3) * 0.08);
            targetOutput = clamp01(0.42 + Math.sin(time * 0.9 + 0.6) * 0.1);
        }

        inputLevelRef.current += (targetInput - inputLevelRef.current) * 0.2;
        outputLevelRef.current += (targetOutput - outputLevelRef.current) * 0.2;
        speedRef.current += (0.1 + (1 - Math.pow(outputLevelRef.current - 1, 2)) * 0.9 - speedRef.current) * 0.12;

        uniformsRef.uAnimation.value += delta * speedRef.current;
        uniformsRef.uInputVolume.value = inputLevelRef.current;
        uniformsRef.uOutputVolume.value = outputLevelRef.current;
        uniformsRef.uColor1.value.lerp(colorOneRef.current, 0.08);
        uniformsRef.uColor2.value.lerp(colorTwoRef.current, 0.08);
    });

    return (
        <mesh ref={meshRef}>
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

function OrbRenderer({ agentState, userVolume, agentIsSpeaking, orbColors }) {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Canvas gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}>
                <Suspense fallback={null}>
                    <OrbScene
                        agentState={agentState}
                        userVolume={userVolume}
                        agentIsSpeaking={agentIsSpeaking}
                        orbColors={orbColors}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}

function TranscriptPanel({ title, messages, partialText, partialRole, theme }) {
    return (
        <section
            style={{
                borderRadius: '24px',
                padding: '20px',
                background: theme.panel,
                border: `1px solid ${theme.accentSoft}`,
                minHeight: '320px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '15px', color: theme.text, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {title}
                </h2>
                <span style={{ fontSize: '12px', color: theme.muted }}>
                    {messages.length} entries
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {messages.length === 0 && !partialText ? (
                    <div style={{ padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', color: theme.muted, fontSize: '14px' }}>
                        Start a call to see realtime speech-to-text and agent output.
                    </div>
                ) : null}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        style={{
                            alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '88%',
                            padding: '14px 16px',
                            borderRadius: '18px',
                            background: message.role === 'user' ? theme.accentSoft : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${message.role === 'user' ? theme.accentStrong : 'rgba(255,255,255,0.06)'}`,
                            color: theme.text
                        }}
                    >
                        <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.muted, marginBottom: '6px' }}>
                            {message.role === 'user' ? 'Caller' : 'Agent'} · {message.timestamp}
                        </div>
                        <div style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {message.text}
                        </div>
                    </div>
                ))}

                {partialText ? (
                    <div
                        style={{
                            alignSelf: partialRole === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '88%',
                            padding: '14px 16px',
                            borderRadius: '18px',
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px dashed ${theme.accentStrong}`,
                            color: theme.text
                        }}
                    >
                        <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.muted, marginBottom: '6px' }}>
                            {partialRole === 'user' ? 'Caller' : 'Agent'} · Live
                        </div>
                        <div style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {partialText}
                        </div>
                    </div>
                ) : null}
            </div>
        </section>
    );
}

export function VoiceAgentTestHarness({ profile }) {
    const theme = profile;
    const audioSettings = useMemo(
        () => ({
            inputSampleRate: 16000,
            outputSampleRate: 16000,
            format: 'pcm_s16le',
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }),
        []
    );
    const flowConfig = useMemo(
        () => ({
            policy_mode: 'sales',
            conversation_policy: 'sales',
            policy_flags: {
                enable_strategic_policy: true,
                enable_stage_aware_retrieval: true,
                enable_micro_reasoning: true
            }
        }),
        []
    );

    const [callState, setCallState] = useState('idle');
    const [isCallActive, setIsCallActive] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState('idle');
    const [userVolume, setUserVolume] = useState(0);
    const [agentIsSpeaking, setAgentIsSpeaking] = useState(false);
    const [messages, setMessages] = useState([]);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [liveAgentText, setLiveAgentText] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [sessionInfo, setSessionInfo] = useState({ sessionId: '', userId: '', wsUrl: '' });
    const [audioRuntimeConfig, setAudioRuntimeConfig] = useState(audioSettings);

    const wsRef = useRef(null);
    const micStreamRef = useRef(null);
    const micProcessorContextRef = useRef(null);
    const audioProcessorRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const analyserFrameRef = useRef(null);
    const audioCtxRef = useRef(null);
    const outputGainRef = useRef(null);
    const telephonyHighpassRef = useRef(null);
    const telephonyLowpassRef = useRef(null);
    const binaryQueueRef = useRef([]);
    const lastPlaybackTimeRef = useRef(0);
    const playbackStartTimeRef = useRef(null);
    const audioStreamCompleteRef = useRef(false);
    const currentPlaybackTurnIdRef = useRef(null);
    const minAcceptedPlaybackTurnIdRef = useRef(0);
    const activeSourcesRef = useRef(new Set());
    const timerRef = useRef(null);
    const liveAgentMessageIdRef = useRef(null);
    const liveUserMessageIdRef = useRef(null);

    useEffect(() => {
        return () => {
            teardownSession(false);
        };
    });

    useEffect(() => {
        if (!isCallActive || callDuration < CALL_LIMIT_SECONDS) {
            return undefined;
        }
        teardownSession(true);
        return undefined;
    }, [callDuration, isCallActive]);

    function appendMessage(role, text) {
        if (!text || !text.trim()) {
            return;
        }
        setMessages((current) => [
            ...current,
            createMessage(`${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`, role, text.trim())
        ]);
    }

    function upsertLiveAgentMessage(text) {
        const trimmed = text.trim();
        if (!trimmed) {
            return;
        }
        setMessages((current) => {
            if (!liveAgentMessageIdRef.current) {
                const id = `agent-live-${Date.now()}`;
                liveAgentMessageIdRef.current = id;
                return [...current, createMessage(id, 'agent', trimmed, true)];
            }
            return current.map((message) => (
                message.id === liveAgentMessageIdRef.current
                    ? { ...message, text: trimmed, isLive: true }
                    : message
            ));
        });
    }

    function finalizeLiveAgentMessage(finalText) {
        const trimmed = finalText.trim();
        if (!trimmed) {
            liveAgentMessageIdRef.current = null;
            setLiveAgentText('');
            return;
        }
        setMessages((current) => {
            if (!liveAgentMessageIdRef.current) {
                return [...current, createMessage(`agent-${Date.now()}`, 'agent', trimmed)];
            }
            return current.map((message) => (
                message.id === liveAgentMessageIdRef.current
                    ? { ...message, text: trimmed, isLive: false, timestamp: new Date().toLocaleTimeString() }
                    : message
            ));
        });
        liveAgentMessageIdRef.current = null;
        setLiveAgentText('');
    }

    function finalizeLiveTranscript(finalText) {
        const trimmed = finalText.trim();
        setLiveTranscript('');
        liveUserMessageIdRef.current = null;
        if (!trimmed) {
            return;
        }
        appendMessage('user', trimmed);
    }

    function ensureOutputChain() {
        if (!audioCtxRef.current) {
            return null;
        }
        const context = audioCtxRef.current;
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
            lowpass: telephonyLowpassRef.current
        };
    }

    function stopPlayback() {
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
                return null;
            }
            return null;
        });
        activeSourcesRef.current.clear();
        binaryQueueRef.current = [];
        currentPlaybackTurnIdRef.current = null;
        audioStreamCompleteRef.current = false;
        playbackStartTimeRef.current = null;
        if (audioCtxRef.current) {
            lastPlaybackTimeRef.current = audioCtxRef.current.currentTime;
        }
        setAgentIsSpeaking(false);
    }

    function checkPlaybackComplete() {
        if (!audioCtxRef.current) {
            return;
        }
        if (audioCtxRef.current.currentTime < lastPlaybackTimeRef.current - 0.1) {
            return;
        }
        setAgentIsSpeaking(false);
        if (audioStreamCompleteRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
            const duration = playbackStartTimeRef.current ? Date.now() - playbackStartTimeRef.current : 0;
            wsRef.current.send(JSON.stringify({
                type: 'playback_done',
                duration_ms: duration,
                playback_turn_id: currentPlaybackTurnIdRef.current,
                timestamp: Date.now() / 1000
            }));
            playbackStartTimeRef.current = null;
            audioStreamCompleteRef.current = false;
            currentPlaybackTurnIdRef.current = null;
        }
    }

    function playAudioChunk(payload, forceInt16 = false, sampleRate = audioRuntimeConfig.outputSampleRate) {
        if (!audioCtxRef.current) {
            return;
        }
        let float32;
        if (payload instanceof ArrayBuffer) {
            if (audioRuntimeConfig.format === 'pcm_s16le' || forceInt16) {
                const int16 = new Int16Array(payload);
                float32 = new Float32Array(int16.length);
                for (let index = 0; index < int16.length; index += 1) {
                    float32[index] = int16[index] / 32768;
                }
            } else {
                float32 = new Float32Array(payload);
            }
        } else {
            const binaryString = atob(payload);
            const bytes = new Uint8Array(binaryString.length);
            for (let index = 0; index < binaryString.length; index += 1) {
                bytes[index] = binaryString.charCodeAt(index);
            }
            if (audioRuntimeConfig.format === 'pcm_s16le' || forceInt16) {
                const int16 = new Int16Array(bytes.buffer);
                float32 = new Float32Array(int16.length);
                for (let index = 0; index < int16.length; index += 1) {
                    float32[index] = int16[index] / 32768;
                }
            } else {
                float32 = new Float32Array(bytes.buffer);
            }
        }

        const audioBuffer = audioCtxRef.current.createBuffer(1, float32.length, sampleRate);
        audioBuffer.copyToChannel(float32, 0);

        const source = audioCtxRef.current.createBufferSource();
        source.buffer = audioBuffer;

        const chain = ensureOutputChain();
        if (!chain) {
            return;
        }

        try {
            chain.gain.disconnect();
            chain.highpass.disconnect();
            chain.lowpass.disconnect();
            source.disconnect();
        } catch (_) {
            return null;
        }

        source.connect(chain.highpass);
        chain.highpass.connect(chain.lowpass);
        chain.lowpass.connect(chain.gain);
        chain.gain.connect(audioCtxRef.current.destination);
        chain.gain.gain.value = 1;

        const now = audioCtxRef.current.currentTime;
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
        lastPlaybackTimeRef.current = startAt + audioBuffer.duration;
    }

    function clearMicPipeline() {
        if (analyserFrameRef.current) {
            cancelAnimationFrame(analyserFrameRef.current);
            analyserFrameRef.current = null;
        }
        if (audioProcessorRef.current) {
            try {
                audioProcessorRef.current.disconnect();
            } catch (_) {
                return null;
            }
        }
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.disconnect();
            } catch (_) {
                return null;
            }
        }
        if (micProcessorContextRef.current) {
            micProcessorContextRef.current.close();
            micProcessorContextRef.current = null;
        }
        audioProcessorRef.current = null;
        sourceNodeRef.current = null;
    }

    function teardownSession(showEndedState) {
        const socket = wsRef.current;
        if (socket) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'interrupt', timestamp: Date.now() / 1000 }));
                socket.send(JSON.stringify({ type: 'end_session', timestamp: Date.now() / 1000 }));
            }
            socket.onclose = null;
            socket.onerror = null;
            socket.onmessage = null;
            socket.close();
            wsRef.current = null;
        }

        stopPlayback();
        clearMicPipeline();

        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }

        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((track) => track.stop());
            micStreamRef.current = null;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        outputGainRef.current = null;
        telephonyHighpassRef.current = null;
        telephonyLowpassRef.current = null;
        setCallDuration(0);
        setIsCallActive(false);
        setConnectionStatus(showEndedState ? 'ended' : 'idle');
        setCallState(showEndedState ? 'ended' : 'idle');
        setAgentIsSpeaking(false);
        setUserVolume(0);
        setLiveTranscript('');
        setLiveAgentText('');
    }

    async function startMicPipeline(stream, socket) {
        const context = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        micProcessorContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(2048, 1, 1);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;

        source.connect(analyser);
        source.connect(processor);
        processor.connect(context.destination);

        sourceNodeRef.current = source;
        audioProcessorRef.current = processor;

        processor.onaudioprocess = (event) => {
            if (socket.readyState !== WebSocket.OPEN) {
                return;
            }
            const input = event.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(input.length);
            for (let index = 0; index < input.length; index += 1) {
                pcm[index] = Math.max(-1, Math.min(1, input[index])) * 0x7fff;
            }
            socket.send(pcm.buffer);
        };

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
            analyser.getByteFrequencyData(freqData);
            let sum = 0;
            for (let index = 0; index < freqData.length; index += 1) {
                sum += freqData[index];
            }
            setUserVolume(Math.min(1, sum / freqData.length / 30));
            analyserFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
    }

    async function startCall() {
        setErrorMessage('');
        setMessages([]);
        setLiveTranscript('');
        setLiveAgentText('');
        liveAgentMessageIdRef.current = null;
        liveUserMessageIdRef.current = null;
        setCallState('connecting');
        setConnectionStatus('connecting');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_INPUT_CONSTRAINTS });
            micStreamRef.current = stream;

            const userId = `user_${Date.now()}`;
            const sessionId = `session_${Date.now()}`;
            const wsBase = getWsBaseUrl();
            const wsUrl = `${wsBase}?tenant_id=${encodeURIComponent(profile.tenantId)}&agent_id=${encodeURIComponent(profile.agentId)}&session_type=webcall&user_id=${encodeURIComponent(userId)}&agent_name=${encodeURIComponent(profile.agentName)}`;

            setSessionInfo({ sessionId, userId, wsUrl });

            const socket = new WebSocket(wsUrl);
            socket.binaryType = 'arraybuffer';
            wsRef.current = socket;

            socket.onopen = async () => {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                lastPlaybackTimeRef.current = audioCtxRef.current.currentTime;

                await startMicPipeline(stream, socket);

                socket.send(JSON.stringify({
                    type: 'session_config',
                    config: {
                        mode: 'voice',
                        tenant_id: profile.tenantId,
                        agent_id: profile.agentId,
                        agent_name: profile.agentName,
                        tenant_name: profile.tenantName,
                        user_id: userId,
                        session_id: sessionId,
                        session_type: 'webcall',
                        stt_mode: 'audio',
                        tts_mode: 'audio',
                        language: profile.language
                    }
                }));

                socket.send(JSON.stringify({
                    type: 'start_session',
                    flow_config: flowConfig,
                    timestamp: Date.now() / 1000
                }));
            };

            socket.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    binaryQueueRef.current.push(event.data);
                    return;
                }

                const data = JSON.parse(event.data);

                if (data.type === 'session_ready' || (data.type === 'state_update' && data.state === 'listening')) {
                    setIsCallActive(true);
                    setConnectionStatus('connected');
                    setCallState(agentIsSpeaking ? 'talking' : 'listening');
                    setAudioRuntimeConfig((current) => ({
                        ...current,
                        outputSampleRate: data.sample_rate || current.outputSampleRate,
                        format: data.audio_format || data.format || current.format
                    }));
                    if (!timerRef.current) {
                        timerRef.current = setInterval(() => {
                            setCallDuration((current) => current + 1);
                        }, 1000);
                    }
                }

                if (data.type === 'state_update') {
                    if (data.state === 'thinking' || data.state === 'interrupt' || data.state === 'listening') {
                        stopPlayback();
                    }
                    if (data.state === 'thinking') {
                        setCallState('thinking');
                    } else if (data.state === 'listening') {
                        setCallState(agentIsSpeaking ? 'talking' : 'listening');
                    } else if (data.state === 'interrupt') {
                        setCallState('listening');
                    }
                } else if (data.type === 'transcript') {
                    if (data.text && data.text.trim()) {
                        if (data.is_final) {
                            finalizeLiveTranscript(data.text);
                        } else {
                            liveUserMessageIdRef.current = `user-live-${Date.now()}`;
                            setLiveTranscript(data.text);
                        }
                    }
                } else if (data.type === 'agent_response') {
                    const nextText = data.is_streaming ? `${liveAgentText}${data.text || ''}` : (data.text || liveAgentText);
                    if (data.text && data.text.trim()) {
                        if (data.is_streaming) {
                            setLiveAgentText(nextText);
                            upsertLiveAgentMessage(nextText);
                        } else {
                            finalizeLiveAgentMessage(nextText);
                        }
                    }
                    if (data.is_complete || data.is_final) {
                        finalizeLiveAgentMessage(nextText);
                    }
                } else if (data.type === 'audio_chunk') {
                    const turnId = Number(data.playback_turn_id);
                    if (Number.isFinite(turnId)) {
                        if (turnId < minAcceptedPlaybackTurnIdRef.current) {
                            if (data.binary_sent && binaryQueueRef.current.length > 0) {
                                binaryQueueRef.current.shift();
                            }
                            if (data.is_final) {
                                audioStreamCompleteRef.current = true;
                                checkPlaybackComplete();
                            }
                            return;
                        }
                        currentPlaybackTurnIdRef.current = turnId;
                    }

                    const nextSampleRate = data.sample_rate || audioRuntimeConfig.outputSampleRate;
                    const nextFormat = data.audio_format || data.format || audioRuntimeConfig.format;
                    setAudioRuntimeConfig((current) => ({
                        ...current,
                        outputSampleRate: nextSampleRate,
                        format: nextFormat
                    }));

                    if (data.binary_sent || data.data || data.audio) {
                        setAgentIsSpeaking(true);
                        setCallState('talking');
                        audioStreamCompleteRef.current = false;
                    }

                    if (data.binary_sent && binaryQueueRef.current.length > 0) {
                        const chunk = binaryQueueRef.current.shift();
                        if (chunk) {
                            playAudioChunk(chunk, nextFormat === 'pcm_s16le', nextSampleRate);
                        }
                    } else {
                        const encodedAudio = data.data || data.audio;
                        if (encodedAudio) {
                            playAudioChunk(encodedAudio, false, nextSampleRate);
                        }
                    }

                    if (data.is_final) {
                        audioStreamCompleteRef.current = true;
                        checkPlaybackComplete();
                    }
                } else if (data.type === 'audio_complete' || data.is_final) {
                    audioStreamCompleteRef.current = true;
                    checkPlaybackComplete();
                    setCallState('listening');
                } else if (data.type === 'interrupt' || data.type === 'clear' || data.type === 'playback_stop') {
                    stopPlayback();
                    setCallState('listening');
                } else if (data.type === 'ping' && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() / 1000 }));
                }
            };

            socket.onerror = () => {
                setErrorMessage('WebSocket connection failed. Check the voice backend and browser microphone permissions.');
                setConnectionStatus('error');
                setCallState('error');
            };

            socket.onclose = () => {
                teardownSession(true);
            };
        } catch (error) {
            setErrorMessage(error?.message || 'Unable to start the voice session.');
            setConnectionStatus('error');
            setCallState('error');
            teardownSession(false);
        }
    }

    const remainingSeconds = CALL_LIMIT_SECONDS - callDuration;
    const partialText = liveAgentText || liveTranscript;
    const partialRole = liveAgentText ? 'agent' : 'user';

    return (
        <div
            style={{
                minHeight: '100vh',
                background: theme.background,
                color: theme.text,
                padding: '32px 20px 48px',
                fontFamily: "'Inter', 'Segoe UI', sans-serif"
            }}
        >
            <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <header
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        gap: '18px',
                        alignItems: 'flex-start'
                    }}
                >
                    <div style={{ maxWidth: '720px' }}>
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.18em', color: theme.accent }}>
                            www.davinciai.eu/test/{profile.slug}
                        </div>
                        <h1 style={{ margin: '12px 0 10px', fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.04em' }}>
                            {profile.title}
                        </h1>
                        <p style={{ margin: 0, color: theme.muted, fontSize: '15px', lineHeight: 1.7 }}>
                            Dedicated testing surface for tenant-specific voice calls, realtime transcription, streamed agent replies,
                            and live session diagnostics.
                        </p>
                    </div>

                    <div
                        style={{
                            minWidth: '260px',
                            padding: '18px',
                            borderRadius: '22px',
                            background: theme.surface,
                            border: `1px solid ${theme.accentSoft}`
                        }}
                    >
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: theme.muted }}>
                            Tenant Snapshot
                        </div>
                        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                            <div><strong>tenant_name:</strong> {profile.tenantName}</div>
                            <div><strong>tenant_id:</strong> {profile.tenantId}</div>
                            <div><strong>agent_id:</strong> {profile.agentId}</div>
                            <div><strong>agent_name:</strong> {profile.agentName}</div>
                            <div><strong>language:</strong> {profile.language}</div>
                        </div>
                    </div>
                </header>

                <section
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.9fr)',
                        gap: '24px',
                        alignItems: 'stretch'
                    }}
                >
                    <div
                        style={{
                            background: theme.surface,
                            border: `1px solid ${theme.accentSoft}`,
                            borderRadius: '32px',
                            padding: '28px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '22px',
                            minHeight: '540px'
                        }}
                    >
                        <div style={{ textAlign: 'center', display: 'grid', gap: '10px' }}>
                            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.16em', color: theme.accent }}>
                                Voice Session State
                            </div>
                            <div style={{ fontSize: '30px', fontWeight: 700 }}>
                                {STATE_LABELS[callState] || STATE_LABELS.idle}
                            </div>
                            <div style={{ color: theme.muted, fontSize: '14px' }}>
                                {connectionStatus === 'connected' ? 'Connected to realtime voice backend' : `Status: ${connectionStatus}`}
                            </div>
                        </div>

                        <div
                            style={{
                                width: 'min(360px, 70vw)',
                                height: 'min(360px, 70vw)',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 60%, transparent 75%)',
                                boxShadow: `0 0 0 1px ${theme.accentSoft}, 0 0 80px ${theme.accentSoft}`,
                                overflow: 'hidden'
                            }}
                        >
                            <OrbRenderer
                                agentState={callState}
                                userVolume={userVolume}
                                agentIsSpeaking={agentIsSpeaking}
                                orbColors={theme.orbColors}
                            />
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={startCall}
                                disabled={isCallActive || connectionStatus === 'connecting'}
                                style={{
                                    border: 'none',
                                    borderRadius: '999px',
                                    padding: '14px 24px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor: isCallActive ? 'not-allowed' : 'pointer',
                                    background: theme.accent,
                                    color: '#050505',
                                    opacity: isCallActive ? 0.5 : 1
                                }}
                            >
                                Start Call
                            </button>

                            <button
                                type="button"
                                onClick={() => teardownSession(true)}
                                disabled={!isCallActive && connectionStatus !== 'connecting'}
                                style={{
                                    borderRadius: '999px',
                                    padding: '14px 24px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor: !isCallActive && connectionStatus !== 'connecting' ? 'not-allowed' : 'pointer',
                                    background: 'transparent',
                                    color: theme.text,
                                    border: `1px solid ${theme.accentStrong}`,
                                    opacity: !isCallActive && connectionStatus !== 'connecting' ? 0.5 : 1
                                }}
                            >
                                End Call
                            </button>
                        </div>

                        <div
                            style={{
                                width: '100%',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '12px'
                            }}
                        >
                            <div style={{ padding: '16px', borderRadius: '18px', background: theme.panel, border: `1px solid ${theme.accentSoft}` }}>
                                <div style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Timer</div>
                                <div style={{ marginTop: '8px', fontSize: '28px', fontWeight: 700 }}>{formatDuration(callDuration)}</div>
                            </div>
                            <div style={{ padding: '16px', borderRadius: '18px', background: theme.panel, border: `1px solid ${theme.accentSoft}` }}>
                                <div style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Time Remaining</div>
                                <div style={{ marginTop: '8px', fontSize: '28px', fontWeight: 700 }}>{Math.max(0, remainingSeconds)}s</div>
                            </div>
                            <div style={{ padding: '16px', borderRadius: '18px', background: theme.panel, border: `1px solid ${theme.accentSoft}` }}>
                                <div style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Mic Level</div>
                                <div style={{ marginTop: '8px', fontSize: '28px', fontWeight: 700 }}>{Math.round(userVolume * 100)}%</div>
                            </div>
                        </div>

                        {errorMessage ? (
                            <div
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '16px',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.32)',
                                    color: '#FECACA',
                                    fontSize: '13px'
                                }}
                            >
                                {errorMessage}
                            </div>
                        ) : null}
                    </div>

                    <div style={{ display: 'grid', gap: '18px' }}>
                        <section
                            style={{
                                borderRadius: '24px',
                                padding: '20px',
                                background: theme.panel,
                                border: `1px solid ${theme.accentSoft}`
                            }}
                        >
                            <div style={{ fontSize: '12px', color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                                Live Session Config
                            </div>
                            <div style={{ marginTop: '16px', display: 'grid', gap: '10px', fontSize: '14px' }}>
                                <div><strong>ws_url:</strong> <span style={{ color: theme.muted, wordBreak: 'break-all' }}>{sessionInfo.wsUrl || getWsBaseUrl()}</span></div>
                                <div><strong>session_id:</strong> {sessionInfo.sessionId || 'pending'}</div>
                                <div><strong>user_id:</strong> {sessionInfo.userId || 'pending'}</div>
                                <div><strong>stt_mode:</strong> audio</div>
                                <div><strong>tts_mode:</strong> audio</div>
                                <div><strong>flow_policy:</strong> sales</div>
                            </div>
                        </section>

                        <section
                            style={{
                                borderRadius: '24px',
                                padding: '20px',
                                background: theme.panel,
                                border: `1px solid ${theme.accentSoft}`
                            }}
                        >
                            <div style={{ fontSize: '12px', color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                                Audio Configuration
                            </div>
                            <div style={{ marginTop: '16px', display: 'grid', gap: '10px', fontSize: '14px' }}>
                                <div><strong>input sample rate:</strong> {audioSettings.inputSampleRate} Hz</div>
                                <div><strong>output sample rate:</strong> {audioRuntimeConfig.outputSampleRate} Hz</div>
                                <div><strong>format:</strong> {audioRuntimeConfig.format}</div>
                                <div><strong>channels:</strong> {audioSettings.channelCount}</div>
                                <div><strong>echo cancellation:</strong> {String(audioSettings.echoCancellation)}</div>
                                <div><strong>noise suppression:</strong> {String(audioSettings.noiseSuppression)}</div>
                                <div><strong>auto gain control:</strong> {String(audioSettings.autoGainControl)}</div>
                            </div>
                        </section>
                    </div>
                </section>

                <TranscriptPanel
                    title="Realtime Transcription"
                    messages={messages}
                    partialText={partialText}
                    partialRole={partialRole}
                    theme={theme}
                />
            </div>
        </div>
    );
}

export function VoiceAgentTestPage({ slug }) {
    const profile = TEST_AGENT_CONFIGS[slug] || TEST_AGENT_CONFIGS.davinci;
    return <VoiceAgentTestHarness profile={profile} />;
}

export function VoiceAgentTestIndex() {
    return (
        <div style={{ minHeight: '100vh', background: '#060708', color: '#F7FAFF', padding: '40px 20px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            <div style={{ maxWidth: '920px', margin: '0 auto', display: 'grid', gap: '20px' }}>
                <div>
                    <div style={{ fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(247,250,255,0.58)' }}>
                        Voice Agent Testing
                    </div>
                    <h1 style={{ margin: '12px 0 10px', fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.04em' }}>
                        Select a tenant test surface
                    </h1>
                    <p style={{ margin: 0, color: 'rgba(247,250,255,0.68)', lineHeight: 1.7 }}>
                        Dedicated browser pages for validating the DAVINCI AI and BUNDB voice agents with realtime audio streaming and transcript visibility.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
                    {Object.values(TEST_AGENT_CONFIGS).map((profile) => (
                        <a
                            key={profile.slug}
                            href={`/test/${profile.slug}`}
                            style={{
                                display: 'block',
                                textDecoration: 'none',
                                color: profile.text,
                                padding: '24px',
                                borderRadius: '24px',
                                background: profile.surface,
                                border: `1px solid ${profile.accentSoft}`
                            }}
                        >
                            <div style={{ fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: profile.accent }}>
                                /test/{profile.slug}
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '28px', fontWeight: 700 }}>
                                {profile.tenantName}
                            </div>
                            <div style={{ marginTop: '10px', color: profile.muted, lineHeight: 1.6 }}>
                                Open the dedicated voice-agent testing page for the {profile.agentName} tenant.
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
