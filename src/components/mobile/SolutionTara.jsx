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
   Pixel / Dither elements
   ═══════════════════════════════════════════════════════════ */

const DitherEdge = ({ isDark, rows = 10 }) => {
  const fg = isDark ? 'bg-white' : 'bg-[#0a0a0a]';
  const fgSoft = isDark ? 'bg-white/10' : 'bg-black/5';
  return (
    <div className="flex flex-col gap-0">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-0">
          {Array.from({ length: 6 }).map((_, col) => {
            const threshold = (row / rows) * 6;
            const show = col >= threshold;
            const edge = Math.abs(col - threshold) < 1.5;
            return <div key={col} className={`w-[5px] h-[5px] ${show ? fg : edge ? fgSoft : 'bg-transparent'}`} />;
          })}
        </div>
      ))}
    </div>
  );
};

const DotBar = ({ value = 70, isDark }) => {
  const total = 20;
  const filled = Math.round((value / 100) * total);
  return (
    <div className="flex gap-[1px]">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-[4px] h-[6px] ${i < filled ? (isDark ? 'bg-white' : 'bg-[#0a0a0a]') : (isDark ? 'bg-white/10' : 'bg-black/5')}`} />
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   FULL PAGE — Meet TARA
   ═══════════════════════════════════════════════════════════ */

const SolutionTara = () => {
  const { isDark } = useTheme();
  const c = t(isDark);

  const variants = [
    { num: '01', title: 'Visual Co-Pilot', desc: 'Sees the user\'s screen. Guides them through any form, dashboard, or process — in real time.' },
    { num: '02', title: 'Telephony', desc: 'Replaces IVR completely. Speaks German natively. Books appointments, resolves tickets, qualifies leads.' },
    { num: '03', title: 'Web Call', desc: 'Your website speaks. Visitors talk to TARA directly from the browser. Zero telco costs.' },
    { num: '04', title: 'HR Assistant', desc: 'Onboards. Answers. Escalates. Always available. Never forgets.' },
  ];

  const handleTalkToTara = () => {
    // Find and click the existing floating TaraVoiceWidget orb button
    const orbBtn = document.querySelector('[style*="fixed"][style*="bottom"] button');
    if (orbBtn) orbBtn.click();
  };

  return (
    <section id="solutions" className={`${c.bg} border-t ${c.border}`}>
      <div className={`max-w-[1200px] mx-auto border-x ${c.border}`}>

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

        {/* ─── Orb + Conversation demo ─── */}
        <div className="px-6 md:px-10 lg:px-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — Live Orb + Talk to TARA */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              {/* Dither decoration */}
              <div className="absolute -top-3 -right-2 z-10">
                <DitherEdge isDark={isDark} rows={8} />
              </div>

              <div
                className={`${c.bgCard} border ${c.border} relative overflow-hidden cursor-pointer group`}
                onClick={handleTalkToTara}
              >
                {/* Terminal header */}
                <div className={`px-5 py-2.5 border-b ${c.border} flex items-center justify-between`}>
                  <span className={`text-[8px] font-mono uppercase tracking-[0.2em] ${c.textMuted}`}>
                    TARA_X1 // READY
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} animate-pulse`} />
                    <span className={`text-[7px] font-mono ${c.textMuted}`}>LIVE</span>
                  </div>
                </div>

                {/* Orb canvas */}
                <div className="w-full h-[280px] relative">
                  <Canvas resize={{ debounce: 100 }} gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}>
                    <Suspense fallback={null}><OrbScene /></Suspense>
                  </Canvas>
                </div>

                {/* CTA overlay */}
                <div className={`px-5 py-4 border-t ${c.border} flex items-center justify-between`}>
                  <div>
                    <span className={`text-sm font-semibold ${c.text} font-['Space_Grotesk']`}>Talk to TARA</span>
                    <span className={`text-[9px] font-mono ${c.textMuted} ml-3`}>Click to start voice call</span>
                  </div>
                  <div className={`w-8 h-8 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#080808' : '#fff'} strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right — Appointment demo card (from reference image) */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="space-y-4"
            >
              {/* Glass calendar card */}
              <div className={`${c.bgCard} border ${c.border} p-5`}>
                <div className={`flex items-center justify-between mb-4 pb-3 border-b ${c.border}`}>
                  <span className={`text-[10px] font-mono ${c.textMuted} uppercase tracking-widest`}>Thu July 24</span>
                  <span className={`text-[8px] font-mono ${c.textMuted}`}>10:30 - 11:00</span>
                </div>
                <div className={`${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]'} border ${c.border} p-4`}>
                  <span className={`text-[9px] font-mono ${c.textMuted} uppercase tracking-widest block mb-1`}>Event</span>
                  <span className={`text-sm font-semibold ${c.text} font-['Space_Grotesk']`}>Doctor Appointment</span>
                  <span className={`text-xs ${c.textMuted} block mt-1`}>Booked by TARA via voice call</span>
                </div>
              </div>

              {/* Chat conversation */}
              <div className={`${c.bgCard} border ${c.border} p-5 space-y-4`}>
                <div className={`text-[8px] font-mono ${c.textMuted} uppercase tracking-widest mb-3`}>Conversation</div>

                {/* User message */}
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 ${isDark ? 'bg-white/10' : 'bg-black/5'} flex items-center justify-center text-[8px] font-mono ${c.textMuted} shrink-0`}>J</div>
                  <p className={`text-sm ${c.text} leading-relaxed`}>
                    Hi, I need to book an appointment with Dr. Smith sometime next week please.
                  </p>
                </div>

                {/* TARA response */}
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 ${isDark ? 'bg-white' : 'bg-[#0a0a0a]'} flex items-center justify-center shrink-0`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#080808' : '#fff'} strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" /></svg>
                  </div>
                  <p className={`text-sm ${c.text} leading-relaxed`}>
                    Sure. And, just to confirm, are you Jane Reynolds? I have Thursday the 24th open at 10:30 AM.
                  </p>
                </div>

                {/* Status bar */}
                <div className={`pt-3 border-t ${c.border} flex items-center justify-between`}>
                  <span className={`text-[8px] font-mono ${c.textMuted}`}>RESPONSE: 480ms</span>
                  <DotBar value={96} isDark={isDark} />
                </div>
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
