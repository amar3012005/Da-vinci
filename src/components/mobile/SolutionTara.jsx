import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme, t } from './ThemeContext';

/* ═══════════════════════════════════════════════════════════
   ORB — Extracted from TaraVoiceWidget (idle preview only)
   ═══════════════════════════════════════════════════════════ */

function splitmix32(a) {
  return function () {
    a |= 0; a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15); t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
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

function OrbScene() {
  useThree();
  const ref = useRef(null);
  const rng = useMemo(() => splitmix32(42), []);
  const off = useMemo(() => new Float32Array(Array.from({ length: 7 }, () => rng() * Math.PI * 2)), [rng]);

  useEffect(() => { if (ref.current) ref.current.material.uniforms.uInverted.value = 1; }, []);

  useFrame((_, dt) => {
    const m = ref.current?.material; if (!m) return;
    const u = m.uniforms;
    u.uTime.value += dt * 0.5;
    if (u.uOpacity.value < 1) u.uOpacity.value = Math.min(1, u.uOpacity.value + dt * 2);
    const t = u.uTime.value * 2;
    u.uAnimation.value += dt * 0.15;
    u.uInputVolume.value = 0.35 + Math.sin(t * 0.7) * 0.1;
    u.uOutputVolume.value = 0.42 + Math.sin(t * 1.1) * 0.08;
  });

  const uniforms = useMemo(() => ({
    uColor1: new THREE.Uniform(new THREE.Color('#CADCFC')),
    uColor2: new THREE.Uniform(new THREE.Color('#A0B9D1')),
    uOffsets: { value: off }, uTime: new THREE.Uniform(0), uAnimation: new THREE.Uniform(0.1),
    uInverted: new THREE.Uniform(1), uInputVolume: new THREE.Uniform(0),
    uOutputVolume: new THREE.Uniform(0), uOpacity: new THREE.Uniform(0),
  }), [off]);

  return (<mesh ref={ref}><circleGeometry args={[3.5, 64]} /><shaderMaterial uniforms={uniforms} fragmentShader={fragmentShader} vertexShader={vertexShader} transparent /></mesh>);
}

/* ═══════════════════════════════════════════════════════════
   FULL PAGE — Meet TARA
   ═══════════════════════════════════════════════════════════ */

const SolutionTara = () => {
  const { isDark } = useTheme();
  const c = t(isDark);
  const orbBorderColor = isDark ? 'rgba(202, 220, 252, 0.82)' : 'rgba(10, 10, 10, 0.5)';
  const orbOuterGlow = isDark
    ? '0 0 32px rgba(202, 220, 252, 0.24)'
    : '0 0 20px rgba(10, 10, 10, 0.10)';
  const orbHaloBorder = isDark ? 'rgba(160, 185, 209, 0.14)' : 'rgba(10, 10, 10, 0.08)';

  const variants = [
    { num: '01', title: 'Visual Co-Pilot', desc: 'Sees the user\'s screen. Guides them through any form, dashboard, or process — in real time.' },
    { num: '02', title: 'Telephony', desc: 'Replaces IVR completely. Speaks German natively. Books appointments, resolves tickets, qualifies leads.' },
    { num: '03', title: 'Web Call', desc: 'Your website speaks. Visitors talk to TARA directly from the browser. Zero telco costs.' },
    { num: '04', title: 'Chat Assistant', desc: 'Onboards. Answers. Escalates. Always available. Never forgets.' },
  ];

  const handleTalkToTara = () => {
    // Find and click the existing floating TaraVoiceWidget orb button
    const orbBtn = document.querySelector('[style*="fixed"][style*="bottom"] button');
    if (orbBtn) orbBtn.click();
  };

  const conversation = [
    { from: 'user', label: 'YOU', text: 'What does Da Vinci AI do?' },
    { from: 'tara', label: 'TARA', text: 'We build enterprise AI infrastructure across voice, memory, and sovereign deployment.' },
    { from: 'user', label: 'YOU', text: 'And TARA handles the voice side?' },
    { from: 'tara', label: 'TARA', text: 'Yes. Calls, lead qualification, appointment booking, and support in real time.' },
    { from: 'user', label: 'YOU', text: 'Is it GDPR compliant?' },
    { from: 'tara', label: 'TARA', text: 'Fully EU-hosted. No transatlantic data transfer.' },
  ];

  return (
    <section id="solutions" className={`${c.bg} border-t ${c.border}`}>
      <div className={`max-w-[1200px] mx-auto border-x ${c.border}`}>
        <style>{`
          @keyframes taraOrbBreathe {
            0%, 100% { transform: scale(0.98); opacity: 0.62; }
            50% { transform: scale(1.03); opacity: 1; }
          }
          @keyframes taraOrbListen {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.06); opacity: 1; }
          }
        `}</style>

        {/* ─── Hero area ─── */}
        <div className="px-6 md:px-10 lg:px-20 pt-20 lg:pt-32 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <p className={`text-xs font-mono uppercase tracking-widest ${c.textMuted} mb-4`}>
              Solutions / 01
            </p>
            <h2 className={`text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] ${c.text} font-['Space_Grotesk'] mb-6`}>
              Meet <span className={c.accent}>TARA</span>
            </h2>
            <p className={`text-xl md:text-2xl ${c.textSecondary} leading-relaxed max-w-2xl`}>
              The soul of your brand. Available 24/7.
            </p>
          </motion.div>
        </div>

        {/* ─── Orb (small) + Chat conversation ─── */}
        <div className="px-6 md:px-10 lg:px-20 pb-16">
          <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-8 lg:gap-10 items-stretch">

            {/* Left col (2/5) — Poster call card */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative h-full lg:w-[360px]"
            >
              <div
                className="relative overflow-hidden cursor-pointer group border h-full"
                style={{
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(10,10,10,0.12)',
                  background: isDark ? '#f3f1ec' : '#ffffff',
                }}
                onClick={handleTalkToTara}
              >
                <div
                  className="relative m-4"
                  style={{
                    background: '#141414',
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    minHeight: '330px',
                  }}
                >
                  <div className="relative z-10 flex items-center justify-between px-5 pt-5">
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/58">Idle</span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/45">0:00</span>
                  </div>

                  <div className="relative z-10 flex items-center justify-center px-5 pt-7 pb-10">
                  <div
                      className="relative w-[122px] md:w-[132px] aspect-square rounded-full"
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: '-10%',
                          borderRadius: '50%',
                          border: `2px solid ${orbHaloBorder}`,
                          opacity: 0.82,
                          animation: 'taraOrbBreathe 2.8s ease-in-out infinite',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: '3%',
                          borderRadius: '50%',
                          border: `3px solid ${orbBorderColor}`,
                          boxShadow: orbOuterGlow,
                          opacity: 1,
                          animation: 'taraOrbListen 1.6s ease-in-out infinite',
                        }}
                      />
                      <div className="absolute inset-0">
                        <Canvas resize={{ debounce: 100 }} gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}>
                          <Suspense fallback={null}><OrbScene /></Suspense>
                        </Canvas>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-7 z-10 flex items-center justify-center px-5">
                    <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/62">Ready to start</span>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-end gap-3 px-4 pt-4 pb-2 min-h-[168px]">
                  <div className="flex h-full flex-col">
                    <div className="text-[10px] font-bold tracking-[-0.02em] text-[#171717]/88">
                      DAVINCI AI
                    </div>
                    <div className="mt-1 text-[20px] md:text-[22px] font-bold tracking-[-0.055em] leading-none text-[#171717]">
                      DAVINCI AI x TARA
                    </div>
                    <div className="mt-auto pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#171717]/70">
                      DE
                    </div>
                  </div>
                  <button
                    type="button"
                    className="self-end mb-1 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-transform duration-200 group-hover:scale-[1.03]"
                    style={{
                      background: '#cadcfc',
                      color: '#171717',
                      borderRadius: '6px',
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleTalkToTara();
                    }}
                  >
                    Start call
                  </button>
                </div>
              </div>

              <p className={`text-[9px] font-mono ${c.textMuted} mt-3 text-center`}>Click the poster to start the voice call</p>
            </motion.div>

            {/* Right col (3/5) — Chat conversation, alternating L/R */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="flex flex-col lg:min-h-[468px]"
            >
              <div className="flex-1 flex flex-col justify-between lg:min-h-[430px] py-2">
                {conversation.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                    className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} ${i === 0 ? '' : 'mt-3'}`}
                  >
                    <div
                      className={`max-w-[72%] rounded-[20px] px-4 py-3 ${
                        msg.from === 'user'
                          ? `${isDark ? 'bg-white/[0.05] border-white/[0.08]' : 'bg-black/[0.03] border-black/[0.06]'}`
                          : `${isDark ? 'bg-white/[0.08] border-white/[0.10]' : 'bg-black/[0.05] border-black/[0.08]'}`
                      } border shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]`}
                    >
                      <span
                        className="block mb-2 text-[10px] font-mono uppercase tracking-[0.18em]"
                        style={{
                          color: msg.from === 'user'
                            ? (isDark ? 'rgba(202,220,252,0.92)' : 'rgba(10,10,10,0.7)')
                            : (isDark ? 'rgba(160,185,209,0.82)' : 'rgba(10,10,10,0.55)'),
                        }}
                      >
                        {msg.label}
                      </span>
                      <p className={`text-[12px] md:text-[13px] ${c.text} leading-[1.55] tracking-[-0.01em]`}>
                        {msg.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-start pt-3">
                <span className={`text-[8px] font-mono ${c.textMuted} tracking-widest`}>AVG RESPONSE: 480ms</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ─── Reasoning explanation ─── */}
        <div className={`px-6 md:px-10 lg:px-20 py-16 border-t ${c.border}`}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <h3 className={`text-2xl md:text-3xl font-bold ${c.text} font-['Space_Grotesk'] mb-4`}>
              Not a chatbot. Not a script.
            </h3>
            <p className={`text-base ${c.textSecondary} leading-relaxed mb-8`}>
              TARA is the first enterprise voice agent that <span className={`${c.text} font-medium`}>reasons — not retrieves</span>. While your customer is still speaking, TARA runs a clinical reasoning loop in parallel — processing four layers simultaneously:
            </p>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-8">
              {[
                { arrow: '→', text: 'What the user said' },
                { arrow: '→', text: 'What they actually mean' },
                { arrow: '→', text: 'The root problem underneath' },
                { arrow: '→', text: 'The optimal path forward' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`font-mono text-sm ${c.accent} shrink-0`}>{item.arrow}</span>
                  <span className={`text-sm ${c.textSecondary}`}>{item.text}</span>
                </div>
              ))}
            </div>

            <p className={`text-sm font-mono ${c.textMuted}`}>
              Response delivered in under 500ms. Indistinguishable from human.
            </p>
          </motion.div>
        </div>

        {/* ─── Four variants ─── */}
        <div className={`px-6 md:px-10 lg:px-20 py-16 border-t ${c.border}`}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <span className={`text-[10px] font-mono uppercase tracking-[0.25em] ${c.textMuted}`}>
              Four variants. One intelligence.
            </span>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {variants.map((v, i) => (
              <motion.div
                key={v.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`${c.bgCard} border ${c.border} p-6 ${c.shadow} group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#080808]' : 'text-white'}`}>{v.num}</span>
                  </div>
                  <div>
                    <h4 className={`text-base font-semibold ${c.text} font-['Space_Grotesk'] mb-2`}>{v.title}</h4>
                    <p className={`text-sm ${c.textSecondary} leading-relaxed`}>{v.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </section>
  );
};

export default SolutionTara;
