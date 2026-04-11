import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  Menu, X, ArrowLeft, Brain, Network, Route, Fingerprint,
  RefreshCw, Target, Layers, GitBranch, Shield, BarChart3, Zap,
  BookOpen, ChevronDown, ExternalLink, Sparkles, FileText
} from 'lucide-react';

/* ─── View Mode Toggle ─── */
const ViewModeToggle = ({ viewMode, setViewMode }) => {
  return (
    <div className="fixed top-20 right-6 z-50 hidden xl:block">
      <div className="bg-white border border-[#e3e0db] rounded-xl p-1 shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex gap-1">
        <button
          onClick={() => setViewMode('page')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'page'
              ? 'bg-[#117dff] text-white shadow-sm'
              : 'text-[#525252] hover:bg-[#faf9f4]'
          }`}
        >
          <FileText size={14} />
          <span>Page Layout</span>
        </button>
        <button
          onClick={() => setViewMode('interactive')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'interactive'
              ? 'bg-[#117dff] text-white shadow-sm'
              : 'text-[#525252] hover:bg-[#faf9f4]'
          }`}
        >
          <Sparkles size={14} />
          <span>Interactive</span>
        </button>
      </div>
    </div>
  );
};

/* ─── Cartesia Navbar (reused pattern) ─── */
const ResearchNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const sections = [
    { label: 'Thesis', id: 'thesis' },
    { label: 'Architecture', id: 'architecture' },
    { label: 'Key Concepts', id: 'concepts' },
    { label: 'Why It Matters', id: 'why' },
    { label: 'Future', id: 'future' },
  ];

  return (
    <>
      <nav className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${
        scrolled ? 'bg-[#faf9f4]/90 backdrop-blur-xl border-b border-[#e3e0db]' : 'bg-transparent'
      }`}>
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">
          <div className="px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer">
              <img src="/images/davinci-logo.svg" alt="Da Vinci" className="h-5" />
              <span className="text-[#0a0a0a]/30 text-lg font-light">|</span>
              <span className="text-lg font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk']">Research</span>
            </button>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-sm font-medium text-[#525252] hover:text-[#0a0a0a] transition-colors px-4 py-2 rounded-lg border border-[#e3e0db] hover:border-[#d4d0ca] bg-white cursor-pointer">
                <ArrowLeft size={14} /> Home
              </button>
            </div>

            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[#525252] hover:text-[#0a0a0a] bg-transparent border-none cursor-pointer">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[99] bg-[#faf9f4]/95 backdrop-blur-xl md:hidden">
          <div className="pt-24 px-8 flex flex-col gap-2">
            {sections.map((s, i) => (
              <motion.button key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => scrollTo(s.id)}
                className="text-left text-2xl font-medium text-[#0a0a0a] hover:text-[#117dff] py-3 border-b border-[#e3e0db] bg-transparent border-x-0 border-t-0 cursor-pointer">
                {s.label}
              </motion.button>
            ))}
            <button onClick={() => { setMobileOpen(false); navigate('/'); }}
              className="mt-8 w-full py-3.5 rounded-lg border border-[#e3e0db] text-[#0a0a0a] font-medium text-base bg-white cursor-pointer flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back to Home
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
};

/* ─── Sleek Right Side Navigation ─── */
const RightSideNav = ({ activeSection, scrollTo, viewMode }) => {
  const sections = [
    { label: 'Thesis', id: 'thesis', icon: Brain },
    { label: 'Architecture', id: 'architecture', icon: Layers },
    { label: 'Key Concepts', id: 'concepts', icon: Network },
    { label: 'Why It Matters', id: 'why', icon: Zap },
    { label: 'Future', id: 'future', icon: Sparkles },
  ];

  return (
    <div className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 sm:gap-4">
      {sections.map((section, index) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <motion.button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            className="group flex items-center justify-end gap-2 sm:gap-3 transition-all"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: isActive ? -4 : 0 }}
            transition={{ delay: index * 0.08 }}
          >
            {/* Label - visible on active or hover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.9 }}
              className={`text-right min-w-0 ${isActive ? 'max-w-[120px]' : 'max-w-0'} overflow-hidden transition-all duration-300`}
            >
              <span className={`text-xs font-medium whitespace-nowrap ${
                viewMode === 'interactive' ? 'text-[#117dff]' : 'text-[#0a0a0a]'
              }`}>
                {section.label}
              </span>
            </motion.div>

            {/* Icon button */}
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
              isActive
                ? viewMode === 'interactive'
                  ? 'bg-[#117dff] text-white shadow-[0_0_16px_rgba(17,125,255,0.5)]'
                  : 'bg-[#0a0a0a] text-white shadow-[0_0_16px_rgba(0,0,0,0.3)]'
                : 'bg-white/90 backdrop-blur-sm border border-[#e3e0db] text-[#525252] group-hover:border-[#117dff]/40 group-hover:text-[#117dff] group-hover:shadow-[0_2px_8px_rgba(17,125,255,0.1)]'
            }`}>
              <Icon size={13} className="sm:w-4 sm:h-4" />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

/* ─── Reading Progress Bar ─── */
const ReadingProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#117dff] via-[#117dff] to-[#8b5cf6] origin-left z-[100]"
      style={{ scaleX }}
    />
  );
};

/* ─── Interactive Background ─── */
const InteractiveBackground = ({ viewMode }) => {
  if (viewMode !== 'interactive') return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-[#117dff]/15 to-[#8b5cf6]/10 rounded-full blur-[120px]"
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-[#117dff]/12 to-[#0ea5e9]/8 rounded-full blur-[100px]"
        animate={{
          x: [0, -40, 20, 0],
          y: [0, 30, -20, 0],
          scale: [1, 1.05, 0.98, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-[#8b5cf6]/8 to-[#117dff]/10 rounded-full blur-[80px]"
        animate={{
          x: ['calc(-50% + 30px)', 'calc(-50% - 20px)', 'calc(-50% + 10px)', 'calc(-50%)'],
          y: ['calc(-50% - 20px)', 'calc(-50% + 25px)', 'calc(-50% - 10px)', 'calc(-50%)'],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#117dff]/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 8 + Math.random() * 7,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

/* ─── Interactive Architecture Layers ─── */
const ArchitectureLayers = ({ viewMode }) => {
  if (viewMode !== 'interactive') return null;

  const layers = [
    { name: 'Canonical', prefix: 'kg/*', desc: 'Durable knowledge', color: '#117dff', x: '50%', y: '15%' },
    { name: 'Operational', prefix: 'op/*', desc: 'Active cognition', color: '#8b5cf6', x: '20%', y: '70%' },
    { name: 'Control', prefix: 'meta/*', desc: 'Learning & adaptation', color: '#0ea5e9', x: '80%', y: '70%' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {/* Connection flows */}
        <motion.path
          d="M 50 25 Q 35 45 20 65"
          fill="none"
          stroke="url(#flowGradient1)"
          strokeWidth="0.8"
          strokeDasharray="2 1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, delay: 1 }}
        />
        <motion.path
          d="M 50 25 Q 65 45 80 65"
          fill="none"
          stroke="url(#flowGradient2)"
          strokeWidth="0.8"
          strokeDasharray="2 1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, delay: 1.5 }}
        />
        <motion.path
          d="M 20 70 Q 50 80 80 70"
          fill="none"
          stroke="url(#flowGradient3)"
          strokeWidth="0.8"
          strokeDasharray="2 1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, delay: 2 }}
        />

        <defs>
          <linearGradient id="flowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#117dff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#117dff" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="flowGradient2" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="flowGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Layer nodes */}
        {layers.map((layer, i) => (
          <motion.g key={layer.name}>
            <motion.circle
              cx={layer.x}
              cy={layer.y}
              r="12"
              fill={`${layer.color}15`}
              stroke={layer.color}
              strokeWidth="1"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.2, type: 'spring' }}
            />
            <motion.circle
              cx={layer.x}
              cy={layer.y}
              r="12"
              fill="none"
              stroke={layer.color}
              strokeWidth="0.5"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
            />
          </motion.g>
        ))}
      </svg>

      {/* Labels */}
      {layers.map((layer, i) => (
        <motion.div
          key={layer.name}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
          style={{ left: layer.x, top: layer.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 + i * 0.2 }}
        >
          <span className="px-2 py-0.5 text-xs font-mono bg-white/90 border border-[#e3e0db] rounded text-[#117dff]">
            {layer.prefix}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════ */
/*              CINEMATIC INTERACTIVE COMPONENTS                 */
/* ═════════════════════════════════════════════════════════════ */

/* ─── Cinematic Hero: Particle Explosion ─── */
const CinematicHero = ({ viewMode }) => {
  const [exploded, setExploded] = useState(false);

  useEffect(() => {
    if (viewMode !== 'interactive') return;
    const timer = setTimeout(() => setExploded(true), 500);
    return () => clearTimeout(timer);
  }, [viewMode]);

  if (viewMode !== 'interactive') return null;

  const particles = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    angle: (i / 80) * 360,
    distance: 150 + Math.random() * 200,
    size: 2 + Math.random() * 4,
    duration: 0.8 + Math.random() * 0.4,
    delay: Math.random() * 0.3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Central glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#117dff] rounded-full blur-[80px]"
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: exploded ? 3 : 0.2, opacity: exploded ? 0 : 0.8 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      {/* Exploding particles */}
      {particles.map((p) => {
        const radians = (p.angle * Math.PI) / 180;
        const endX = Math.cos(radians) * p.distance;
        const endY = Math.sin(radians) * p.distance;

        return (
          <motion.div
            key={p.id}
            className="absolute top-1/2 left-1/2 rounded-full bg-gradient-to-br from-[#117dff] to-[#8b5cf6]"
            style={{
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{
              x: exploded ? endX : 0,
              y: exploded ? endY : 0,
              opacity: exploded ? [1, 0.6, 0] : 1,
              scale: exploded ? [0, 1.2, 0.8] : 0,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: 'easeOut',
            }}
          />
        );
      })}

      {/* Connection lines forming network */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        {exploded && (
          <>
            {[0, 72, 144, 216, 288].map((angle, i) => (
              <motion.line
                key={i}
                x1="400"
                y1="300"
                x2={400 + Math.cos((angle * Math.PI) / 180) * 250}
                y2={300 + Math.sin((angle * Math.PI) / 180) * 250}
                stroke="url(#heroGradient)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
              />
            ))}
            <defs>
              <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#117dff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </>
        )}
      </svg>
    </div>
  );
};

/* ─── Scroll Pulse: Continuous Visual Thread ─── */
const ScrollPulse = ({ viewMode }) => {
  const { scrollYProgress } = useScroll();
  const pulseY = useTransform(scrollYProgress, [0, 1], ['10%', '90%']);
  const pulseScaleX = useTransform(scrollYProgress, [0, 1], [0.5, 1.2]);
  const pulseGlowY = useTransform(pulseY, (y) => `calc(${y} - 64px)`);

  if (viewMode !== 'interactive') return null;

  return (
    <>
      {/* Vertical pulse line */}
      <motion.div
        className="fixed left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#117dff]/30 to-transparent pointer-events-none z-0"
        style={{ y: pulseY }}
      />

      {/* Horizontal pulse wave */}
      <motion.div
        className="fixed left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#117dff]/50 to-transparent pointer-events-none z-0"
        style={{
          top: pulseY,
          scaleX: pulseScaleX,
        }}
      />

      {/* Pulse glow at current position */}
      <motion.div
        className="fixed left-1/2 top-0 w-32 h-32 -translate-x-1/2 bg-[#117dff]/20 rounded-full blur-[60px] pointer-events-none z-0"
        style={{ y: pulseGlowY }}
      />
    </>
  );
};

/* ─── Interactive Thesis: Radiating Nodes ─── */
const ThesisNodes = ({ viewMode }) => {
  if (viewMode !== 'interactive') return null;

  const claims = [
    { num: 1, title: 'Externalized', desc: 'Intelligence in the environment' },
    { num: 2, title: 'Emergent', desc: 'Coordination without messaging' },
    { num: 3, title: 'Structural', desc: 'Learning without retraining' },
    { num: 4, title: 'Shared', desc: 'Local identity, global intelligence' },
    { num: 5, title: 'Controlled', desc: 'Safe self-improvement' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Central node */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-[#117dff]/20 to-[#8b5cf6]/10 border-2 border-[#117dff]/40 flex items-center justify-center"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <Brain className="text-[#117dff]" size={32} />
      </motion.div>

      {/* Orbiting claim nodes */}
      {claims.map((claim, i) => {
        const angle = (i / claims.length) * 360 - 90;
        const radius = 180;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <motion.div
            key={claim.num}
            className="absolute top-1/2 left-1/2 pointer-events-auto"
            style={{ marginLeft: x, marginTop: y }}
            initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
            whileInView={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
            whileHover={{ scale: 1.1 }}
          >
            <div className="w-16 h-16 rounded-full bg-white border-2 border-[#117dff]/30 shadow-[0_4px_20px_rgba(17,125,255,0.15)] flex items-center justify-center">
              <span className="text-2xl font-bold text-[#117dff]">{claim.num}</span>
            </div>
            {/* Connection line */}
            <svg
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10"
              style={{ width: radius, height: radius }}
            >
              <motion.line
                x1={angle < 90 || angle > 270 ? radius : 0}
                y1={angle > 0 && angle < 180 ? radius : 0}
                x2={radius / 2}
                y2={radius / 2}
                stroke="#117dff"
                strokeWidth="1"
                strokeOpacity="0.2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.1 }}
              />
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
};

/* ─── Animated Concept Cards ─── */
const AnimatedConceptCard = ({ icon: Icon, title, description, number, delay = 0, viewMode = 'page', animated = false }) => {
  if (viewMode !== 'interactive' || !animated) {
    return (
      <FadeUp delay={delay}>
        <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#d4d0ca] transition-colors h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center">
              <Icon size={18} className="text-[#117dff]" />
            </div>
            <span className="text-xs font-mono text-[#a3a3a3]">[{number}]</span>
          </div>
          <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">{title}</h3>
          <p className="text-sm text-[#525252] leading-relaxed">{description}</p>
        </div>
      </FadeUp>
    );
  }

  return (
    <FadeUp delay={delay}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -8, scale: 1.02 }}
        className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(17,125,255,0.15)] hover:border-[#117dff]/40 transition-all duration-300 h-full group relative overflow-hidden"
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[#117dff]/5 to-[#8b5cf6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />

        {/* Animated icon with trail effect */}
        <div className="relative mb-4">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#117dff]/10 to-[#117dff]/5 border border-[#117dff]/20 flex items-center justify-center group-hover:border-[#117dff]/40"
          >
            <Icon size={20} className="text-[#117dff]" />
          </motion.div>

          {/* Orbiting particles on hover */}
          <motion.div
            className="absolute inset-0"
            initial={{ rotate: 0 }}
            whileHover={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-[#117dff] rounded-full -translate-x-1/2 -translate-y-1/2" />
          </motion.div>
        </div>

        <div className="relative">
          <span className="text-xs font-mono text-[#a3a3a3] group-hover:text-[#117dff] transition-colors">[{number}]</span>
          <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2 group-hover:text-[#117dff] transition-colors">{title}</h3>
          <p className="text-sm text-[#525252] leading-relaxed">{description}</p>
        </div>
      </motion.div>
    </FadeUp>
  );
};

/* ─── Orbiting Benefits (Why It Matters) ─── */
const OrbitingBenefits = ({ viewMode }) => {
  if (viewMode !== 'interactive') return null;

  const benefits = [
    { icon: Zap, title: 'Competence survives', desc: 'Replacing agent keeps intelligence' },
    { icon: BarChart3, title: 'Intelligence accumulates', desc: 'Compound knowledge over time' },
    { icon: RefreshCw, title: 'Improvement', desc: 'Policy evolution, not retraining' },
    { icon: BookOpen, title: 'Auditable', desc: 'Persistent traceable reasoning' },
    { icon: Network, title: 'Structural', desc: 'Coordination via environment' },
    { icon: Layers, title: 'Policy evolution', desc: 'Evolve policies and procedures' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Central core */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-[#117dff]/15 to-[#8b5cf6]/10 border border-[#117dff]/30 flex items-center justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="text-center">
          <Brain className="text-[#117dff] mx-auto mb-1" size={28} />
          <span className="text-xs font-mono text-[#117dff]">CSI Core</span>
        </div>
      </motion.div>

      {/* Orbiting benefits */}
      {benefits.map((benefit, i) => {
        const angle = (i / benefits.length) * 360;
        const radiusX = 280;
        const radiusY = 140;
        const x = Math.cos((angle * Math.PI) / 180) * radiusX;
        const y = Math.sin((angle * Math.PI) / 180) * radiusY;

        return (
          <motion.div
            key={benefit.title}
            className="absolute top-1/2 left-1/2 pointer-events-auto"
            style={{ marginLeft: x, marginTop: y }}
            initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
            whileInView={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
            whileHover={{ scale: 1.15, zIndex: 10 }}
          >
            <div className="bg-white border border-[#e3e0db] rounded-xl p-3 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-[#117dff]/40 hover:shadow-[0_8px_24px_rgba(17,125,255,0.15)] transition-all min-w-[140px] max-w-[180px]">
              <benefit.icon size={16} className="text-[#117dff] mb-1.5" />
              <h4 className="text-xs font-semibold text-[#0a0a0a] mb-0.5">{benefit.title}</h4>
              <p className="text-[10px] text-[#525252] leading-tight">{benefit.desc}</p>
            </div>
          </motion.div>
        );
      })}

      {/* Orbit rings */}
      <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none" viewBox="0 0 600 300">
        <motion.ellipse
          cx="300"
          cy="150"
          rx="280"
          ry="140"
          fill="none"
          stroke="#117dff"
          strokeWidth="0.5"
          strokeOpacity="0.15"
          strokeDasharray="4 4"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </svg>
    </div>
  );
};

/* ─── Future Timeline Road ─── */
const FutureTimeline = ({ viewMode }) => {
  if (viewMode !== 'interactive') return null;

  const items = [
    { num: '14.1', title: 'Memory benchmarks', desc: 'Long-horizon recall evaluation' },
    { num: '14.2', title: 'Agent transfer', desc: 'Competence survives replacement' },
    { num: '14.3', title: 'Procedural learning', desc: 'Blueprint formation studies' },
    { num: '14.4', title: 'Research intelligence', desc: 'Hypothesis tracking & evidence graphs' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Timeline path */}
      <motion.div
        className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-[#117dff]/20 via-[#117dff]/40 to-[#8b5cf6]/20"
        initial={{ scaleX: 0, originX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 0.2 }}
      />

      {/* Timeline markers */}
      {items.map((item, i) => {
        const left = 15 + i * 23;

        return (
          <motion.div
            key={item.num}
            className="absolute top-1/2 pointer-events-auto"
            style={{ left: `${left}%` }}
            initial={{ y: '-50%', opacity: 0, scale: 0 }}
            whileInView={{ y: '-50%', opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
          >
            {/* Marker dot */}
            <motion.div
              className="w-4 h-4 rounded-full bg-[#117dff] border-2 border-white shadow-[0_0_20px_rgba(17,125,255,0.6)] -translate-x-1/2"
              whileHover={{ scale: 1.3 }}
            />

            {/* Content card */}
            <motion.div
              className="absolute top-6 left-1/2 -translate-x-1/2 w-48 bg-white border border-[#e3e0db] rounded-lg p-3 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              whileHover={{ y: -4, shadow: '0_8px_24px_rgba(17,125,255,0.15)' }}
            >
              <span className="text-[10px] font-mono text-[#117dff] mb-1 block">{item.num}</span>
              <h4 className="text-xs font-semibold text-[#0a0a0a] mb-1">{item.title}</h4>
              <p className="text-[10px] text-[#525252] leading-tight">{item.desc}</p>
            </motion.div>

            {/* Connection line to path */}
            <motion.div
              className="absolute top-4 left-1/2 w-px h-4 bg-[#117dff]/30 -translate-x-1/2"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
            />
          </motion.div>
        );
      })}

      {/* Flowing particles along timeline */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`flow-${i}`}
          className="absolute top-1/2 w-2 h-2 rounded-full bg-[#117dff]"
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 3 + i,
            delay: i * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

/* ─── Reusable Section Wrapper ─── */
const Section = ({ id, children, className = '', border = true }) => (
  <section id={id} className={`${border ? 'border-b border-[#e3e0db]' : ''} ${className}`}>
    <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 md:px-10 lg:px-20">
      {children}
    </div>
  </section>
);

/* ─── Fade-up animation wrapper ─── */
const FadeUp = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.35, ease: 'easeOut', delay }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ─── Claim Row ─── */
const ClaimRow = ({ number, title, description, delay = 0 }) => (
  <FadeUp delay={delay}>
    <div className="flex gap-6 py-6 border-b border-[#e3e0db] last:border-b-0">
      <span className="text-sm font-mono text-[#117dff] mt-0.5 shrink-0">3.{number}</span>
      <div>
        <h4 className="text-base font-semibold text-[#0a0a0a] mb-1">{title}</h4>
        <p className="text-sm text-[#525252] leading-relaxed">{description}</p>
      </div>
    </div>
  </FadeUp>
);

/* ─── Force Item ─── */
const ForceItem = ({ label, description, type }) => (
  <div className="flex items-start gap-3 py-2">
    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${type === 'attract' ? 'bg-[#117dff]' : 'bg-[#e3513a]'}`} />
    <div>
      <span className="text-sm font-semibold text-[#0a0a0a]">{label}</span>
      <span className="text-sm text-[#525252]"> — {description}</span>
    </div>
  </div>
);

/* ════════════════════════════════════════ */
/*              RESEARCH PAGE               */
/* ════════════════════════════════════════ */

const ResearchPage = () => {
  const [viewMode, setViewMode] = useState('page');
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    // Load saved view mode from localStorage
    const saved = localStorage.getItem('research-view-mode');
    if (saved) setViewMode(saved);
  }, []);

  useEffect(() => {
    // Save view mode preference
    try { localStorage.setItem('research-view-mode', viewMode); } catch (e) {}
  }, [viewMode]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    // Track active section for TOC highlighting
    const sections = ['thesis', 'architecture', 'concepts', 'why', 'future'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-100px 0px -40% 0px' }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f4] relative">
      <ResearchNavbar />

      {/* Interactive mode components */}
      <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      <ReadingProgress />
      <ScrollPulse viewMode={viewMode} />
      <InteractiveBackground viewMode={viewMode} />

      {/* Right side navigation - visible on all screen sizes */}
      <RightSideNav activeSection={activeSection} scrollTo={scrollTo} viewMode={viewMode} />

      {/* ── HERO ── */}
      <Section id="hero" className="pt-28 pb-20 lg:pt-36 lg:pb-28 relative overflow-hidden">
        <CinematicHero viewMode={viewMode} />

        {/* Subtle glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#117dff]/[0.04] rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <FadeUp>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 text-xs font-mono uppercase tracking-widest text-[#117dff] bg-[#117dff]/[0.06] border border-[#117dff]/20 rounded-full">
                  Research Paper
                </span>
                <span className="text-xs font-mono text-[#a3a3a3]">DavinciAI Labs / 2026</span>
              </div>
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#117dff]/[0.06] border border-[#117dff]/20 text-[#117dff] text-xs font-medium hover:bg-[#117dff]/[0.1] transition-colors no-underline">
                <BookOpen size={11} />
                CC BY 4.0
              </a>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-[#0a0a0a] font-['Space_Grotesk'] mb-6">
              Cognitive Swarm{' '}
              <span className="text-[#117dff]">Intelligence</span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.15}>
            <p className="text-xl md:text-2xl font-medium text-[#525252] leading-relaxed mb-4">
              An Environment-Centric Architecture for Persistent, Collective, Self-Improving AI
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-base text-[#525252] leading-relaxed mb-8 max-w-2xl">
              Intelligence doesn't have to live inside agents. CSI proposes a shared cognitive environment where memory is active, behavior is traceable, repeated success becomes procedure, and the system improves through controlled feedback.
            </p>
          </FadeUp>

          <FadeUp delay={0.25}>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => document.getElementById('thesis')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1.5 px-7 py-3 bg-[#117dff] text-white text-sm font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors cursor-pointer border-none uppercase tracking-[0.075em]">
                Read the Paper <ChevronDown size={14} />
              </button>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── ABSTRACT ── */}
      <Section>
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-6 block">Abstract</span>
          </FadeUp>
          <FadeUp delay={0.05}>
            <div className="max-w-3xl">
              <p className="text-lg md:text-xl text-[#525252] leading-relaxed mb-6">
                Artificial intelligence systems today are overwhelmingly model-centric. Intelligence is assumed to live inside a model or an agent, while memory, tools, and workflows remain auxiliary attachments.
              </p>
              <p className="text-lg md:text-xl text-[#525252] leading-relaxed mb-6">
                At DavinciAI Labs, we propose <strong className="text-[#0a0a0a]">Cognitive Swarm Intelligence (CSI)</strong>: an environment-centric architecture in which intelligence is not treated as a property of any single agent, but as an emergent property of a shared, persistent, structured cognitive environment.
              </p>
              <p className="text-base text-[#525252] leading-relaxed">
                CSI combines structured memory, stigmergic coordination, adaptive routing, procedural consolidation, agent identity, and a controlled meta-loop into a single architecture. The result is a system designed not merely to answer questions, but to remember, coordinate, execute, improve, and accumulate operational intelligence over time.
              </p>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── THE PROBLEM ── */}
      <Section>
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[01] The Problem</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10">
              Why agent-centric AI has <span className="text-[#117dff]">structural limits</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Brain, title: 'Transient Knowledge', desc: 'Even when external memory exists, it is treated as static retrieval context rather than an active medium for cognition.' },
              { icon: Network, title: 'Brittle Coordination', desc: 'Multi-agent systems coordinate through explicit communication, which is costly, brittle, and difficult to scale.' },
              { icon: RefreshCw, title: 'No Procedural Learning', desc: 'Repeated successes do not automatically harden into reusable behavior. Every session starts from scratch.' },
              { icon: Layers, title: 'Lost Reasoning', desc: 'Organizations lose decision rationale and execution intelligence because systems store outputs but not the pathways that produced them.' },
            ].map((item, i) => (
              <AnimatedConceptCard key={item.title} icon={item.icon} title={item.title} description={item.desc} number={`0${i + 1}`} delay={i * 0.08} viewMode={viewMode} animated={viewMode === 'interactive'} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── CORE THESIS ── */}
      <Section id="thesis">
        <div className="py-20 lg:py-28 relative">
          {viewMode === 'interactive' && <ThesisNodes viewMode={viewMode} />}

          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block relative z-10">[02] Core Thesis</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-4 relative z-10">
              The central claim
            </h2>
          </FadeUp>

          <FadeUp delay={0.05}>
            <div className="bg-white border-2 border-[#117dff] rounded-xl p-8 md:p-10 mb-10 shadow-[0_0_20px_rgba(17,125,255,0.08)]">
              <p className="text-lg md:text-xl font-semibold text-[#0a0a0a] leading-relaxed">
                "Persistent shared cognition can outperform isolated agent reasoning when memory, behavior, and policy are all externalized into a structured environment."
              </p>
            </div>
          </FadeUp>

          <div className="max-w-2xl">
            <ClaimRow number="1" title="Intelligence can be externalized" delay={0.08}
              description="Instead of storing competence only in model weights or prompt history, CSI stores operationally useful structures in the environment: decisions, facts, execution trails, blueprints, confidence signals, and reputation-linked outcomes." />
            <ClaimRow number="2" title="Coordination can emerge without heavy messaging" delay={0.12}
              description="Agents can cooperate through shared state rather than explicit communication. Trails, observations, graph relationships, and operational updates become the coordination medium." />
            <ClaimRow number="3" title="Learning can occur without retraining" delay={0.16}
              description="CSI improves by changing structure rather than model weights. Successful paths gain strength. Repeated action sequences become blueprints. Weak paths decay. Routing parameters adapt." />
            <ClaimRow number="4" title="Identity can remain local while intelligence stays global" delay={0.2}
              description="Agents may differ by role, skill, or reputation, but the competence of the system remains shared. Agents are specialized access points into a common intelligence substrate." />
            <ClaimRow number="5" title="Self-improvement requires control, not chaos" delay={0.24}
              description="CSI uses a bounded meta-loop: observe the system, evaluate performance, recommend changes, and apply them through a controlled parameter registry with rollback." />
          </div>
        </div>
      </Section>

      {/* ── ARCHITECTURE ── */}
      <Section id="architecture">
        <div className="py-20 lg:py-28 relative">
          {viewMode === 'interactive' && <ArchitectureLayers viewMode={viewMode} />}

          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block relative z-10">[03] Architecture</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10 relative z-10">
              Three-layer <span className="text-[#117dff]">cognitive runtime</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            <FadeUp delay={0}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 text-xs font-mono bg-[#117dff]/[0.06] text-[#117dff] rounded border border-[#117dff]/20">kg/*</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">Canonical Knowledge</h3>
                <p className="text-sm text-[#525252] leading-relaxed">
                  Stores durable, validated knowledge — entities, relationships, procedures, decisions, and structured memories treated as stable organizational intelligence. The long-lived source of truth.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={0.08}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 text-xs font-mono bg-[#117dff]/[0.06] text-[#117dff] rounded border border-[#117dff]/20">op/*</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">Operational Cognition</h3>
                <p className="text-sm text-[#525252] leading-relaxed">
                  The active life of the system — agent goals, trails, execution events, observations, attempts, and decision candidates. Where intelligence is exercised in motion.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={0.16}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 text-xs font-mono bg-[#117dff]/[0.06] text-[#117dff] rounded border border-[#117dff]/20">meta/*</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0a0a0a] mb-2">Control & Learning</h3>
                <p className="text-sm text-[#525252] leading-relaxed">
                  Evaluative and adaptive signals — reputation, trail weights, decay schedules, blueprint mining thresholds, routing parameters. The control plane shaping future behavior.
                </p>
              </div>
            </FadeUp>
          </div>
        </div>
      </Section>

      {/* ── KEY CONCEPTS ── */}
      <Section id="concepts">
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[04] Key Concepts</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-4">
              How CSI works
            </h2>
            <p className="text-base text-[#525252] leading-relaxed mb-10 max-w-2xl">
              Five interconnected mechanisms enable intelligence to emerge from the environment rather than reside in any single agent.
            </p>
          </FadeUp>

          {/* Trails */}
          <FadeUp delay={0.05}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 md:p-10 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                  <Route size={18} className="text-[#117dff]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">Trails</h3>
                  <span className="text-xs font-mono text-[#a3a3a3]">Behavior as first-class structure</span>
                </div>
              </div>
              <p className="text-base text-[#525252] leading-relaxed mb-4">
                A trail is a compact, structured representation of how progress toward a goal can be made. Unlike raw message logs, trails are directly actionable — they connect goal context to possible next steps. They are shaped by success, failure, cost, latency, conflict, congestion, and agent reputation.
              </p>
              <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg px-6 py-4">
                <p className="text-sm font-mono text-[#525252] italic">
                  "Given this context and this goal, what path has proven useful?"
                </p>
              </div>
            </div>
          </FadeUp>

          {/* Blueprints */}
          <FadeUp delay={0.1}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 md:p-10 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                  <GitBranch size={18} className="text-[#117dff]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">Blueprints</h3>
                  <span className="text-xs font-mono text-[#a3a3a3]">From repetition to procedure</span>
                </div>
              </div>
              <p className="text-base text-[#525252] leading-relaxed">
                When the system detects repeated successful patterns across execution traces, it promotes them into reusable composite trails. These blueprints represent the system's emerging habits — repeated, validated operational sequences that can be reused instead of rediscovered. This is how the system learns <strong className="text-[#0a0a0a]">how to act</strong>, not merely remember what happened.
              </p>
            </div>
          </FadeUp>

          {/* Force-Based Routing */}
          <FadeUp delay={0.15}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 md:p-10 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                  <Target size={18} className="text-[#117dff]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">Force-Based Routing</h3>
                  <span className="text-xs font-mono text-[#a3a3a3]">Cognitive physics for action selection</span>
                </div>
              </div>
              <p className="text-base text-[#525252] leading-relaxed mb-4">
                Instead of hard-coding path selection, the system computes a force profile over candidate trails — combined via softmax to preserve exploration while exploiting strong pathways.
              </p>
              <div className="grid sm:grid-cols-2 gap-x-6">
                <div>
                  <ForceItem label="Goal attraction" description="how strongly the trail advances the current goal" type="attract" />
                  <ForceItem label="Affordance attraction" description="how executable the trail is right now" type="attract" />
                  <ForceItem label="Blueprint prior" description="whether a proven procedure is available" type="attract" />
                  <ForceItem label="Social attraction" description="trusted agents have succeeded with this trail" type="attract" />
                  <ForceItem label="Momentum" description="the trail continues a productive current path" type="attract" />
                </div>
                <div>
                  <ForceItem label="Conflict repulsion" description="the path conflicts with known outcomes" type="repel" />
                  <ForceItem label="Congestion repulsion" description="too many agents already pursuing it" type="repel" />
                  <ForceItem label="Cost repulsion" description="the path is too expensive or inefficient" type="repel" />
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Agent Identity */}
          <div className="grid md:grid-cols-2 gap-6">
            <FadeUp delay={0.2}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                    <Fingerprint size={18} className="text-[#117dff]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">Agent Identity</h3>
                    <span className="text-xs font-mono text-[#a3a3a3]">Without agent-centric intelligence</span>
                  </div>
                </div>
                <p className="text-sm text-[#525252] leading-relaxed mb-4">
                  Each agent has an identity, role, declared skills, observed competence, reputation, and specialization confidence. But intelligence remains shared.
                </p>
                <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg px-5 py-3">
                  <p className="text-sm font-medium text-[#0a0a0a] italic">
                    "Agents have roles. The environment has memory. Intelligence emerges from their interaction."
                  </p>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.25}>
              <div className="bg-white border border-[#e3e0db] rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                    <Shield size={18} className="text-[#117dff]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#0a0a0a] mb-1">The Meta-Loop</h3>
                    <span className="text-xs font-mono text-[#a3a3a3]">Safe self-improvement</span>
                  </div>
                </div>
                <p className="text-sm text-[#525252] leading-relaxed mb-3">
                  A bounded three-part loop transforms self-improvement from uncontrolled self-editing into policy evolution through configuration:
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Dashboard', desc: 'Read-only analytics — success rates, blueprint usage, force contributions' },
                    { label: 'MetaEvaluator', desc: 'Batch evaluator that detects patterns and produces recommendations' },
                    { label: 'Parameter Registry', desc: 'Auditable config store with rollback for routing weights and thresholds' },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-3">
                      <span className="text-xs font-mono text-[#117dff] mt-0.5 shrink-0">{item.label}</span>
                      <span className="text-xs text-[#525252]">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </Section>

      {/* ── NOT JUST ANOTHER... ── */}
      <Section>
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[05] Differentiation</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10">
              What CSI is <span className="text-[#117dff]">not</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#e3e0db]">
            {[
              { title: 'Not just RAG', desc: 'RAG retrieves text. CSI stores structured outcomes, execution traces, and reusable behavior. Retrieval is only one component.' },
              { title: 'Not just a memory system', desc: 'Memory systems preserve data. CSI preserves data and behavior. It turns repeated success into procedures and uses outcomes to shape future policy.' },
              { title: 'Not just orchestration', desc: 'Workflow orchestrators move tasks between components. CSI evolves how those paths are chosen and reused over time.' },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.08}>
                <div className="p-6 md:px-8">
                  <h3 className="text-base font-semibold text-[#0a0a0a] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#525252] leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── WHY IT MATTERS ── */}
      <Section id="why">
        <div className="py-20 lg:py-28 relative">
          {viewMode === 'interactive' && <OrbitingBenefits viewMode={viewMode} />}

          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block relative z-10">[06] Why This Matters</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10 relative z-10">
              From isolated agents to <span className="text-[#117dff]">persistent cognitive ecosystems</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {[
              { icon: Zap, title: 'Competence survives replacement', desc: 'Replacing the agent does not destroy intelligence — it has been externalized into the environment.' },
              { icon: BarChart3, title: 'Operational intelligence accumulates', desc: 'Organizations build compound knowledge rather than losing it when sessions end or teams change.' },
              { icon: RefreshCw, title: 'Improvement without retraining', desc: 'AI systems improve through usage by evolving policies, procedures, and routing — not model weights.' },
              { icon: BookOpen, title: 'Auditable reasoning', desc: 'Reasoning becomes persistent and traceable through structured trails and decision provenance.' },
              { icon: Network, title: 'Structural coordination', desc: 'Coordination emerges through shared environment modifications rather than expensive message overhead.' },
              { icon: Layers, title: 'Policy evolution', desc: 'Learning is achieved by evolving policies and procedures instead of constantly re-running costly reasoning loops.' },
            ].map((item, i) => (
              <AnimatedConceptCard key={item.title} icon={item.icon} title={item.title} description={item.desc} number={`0${i + 1}`} delay={i * 0.06} viewMode={viewMode} animated={viewMode === 'interactive'} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── DECISION INTELLIGENCE WEDGE ── */}
      <Section>
        <div className="py-20 lg:py-28">
          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block">[07] Commercial Wedge</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-4">
              Decision Intelligence
            </h2>
            <p className="text-base text-[#525252] leading-relaxed mb-8 max-w-2xl">
              Organizations lose decisions constantly. The rationale lives in Slack. The approval appears in Gmail. The implementation is encoded in GitHub. Weeks later, nobody knows why something was done.
            </p>
          </FadeUp>

          <FadeUp delay={0.08}>
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { label: 'Statement & Type', desc: 'What was decided and its classification' },
                  { label: 'Rationale & Alternatives', desc: 'Why it was chosen and what was rejected' },
                  { label: 'Provenance & Scope', desc: 'Evidence, participants, and applicability' },
                ].map((item, i) => (
                  <div key={item.label}>
                    <h4 className="text-sm font-semibold text-[#0a0a0a] mb-1">{item.label}</h4>
                    <p className="text-xs text-[#525252]">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-[#e3e0db]">
                <p className="text-sm text-[#525252] leading-relaxed">
                  CSI treats decisions as structured objects — not just memory retrieval, but <strong className="text-[#0a0a0a]">structured reconstruction of organizational reasoning</strong>.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── FUTURE DIRECTIONS ── */}
      <Section id="future">
        <div className="py-20 lg:py-28 relative">
          {viewMode === 'interactive' && <FutureTimeline viewMode={viewMode} />}

          <FadeUp>
            <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3] mb-4 block relative z-10">[08] Future Directions</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-10 relative z-10">
              What comes next
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            {[
              { title: 'Long-term memory benchmarks', desc: 'Evaluating environment-centric memory against long-horizon recall tasks to test whether externalized memory structures outperform context-bound systems.' },
              { title: 'Agent transfer benchmarks', desc: 'A benchmark measuring whether competence survives agent replacement — directly testing CSI\'s central thesis.' },
              { title: 'Procedural learning studies', desc: 'Blueprint formation and policy adaptation offer a new path toward learning without retraining.' },
              { title: 'Research intelligence', desc: 'Extending CSI to support hypothesis tracking, evidence graphs, experimental workflows, and scientific reasoning over time.' },
            ].map((item, i) => (
              <FadeUp key={item.title} delay={i * 0.08}>
                <div className="flex gap-4 p-6 bg-white border border-[#e3e0db] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <span className="text-sm font-mono text-[#117dff] mt-0.5 shrink-0">14.{i + 1}</span>
                  <div>
                    <h3 className="text-base font-semibold text-[#0a0a0a] mb-1">{item.title}</h3>
                    <p className="text-sm text-[#525252] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CONCLUSION / CTA ── */}
      <Section border={false}>
        <div className="py-24 lg:py-32 text-center">
          <FadeUp>
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#117dff]/[0.06] border border-[#117dff]/20 rounded-xl px-8 py-10 mb-8">
                <p className="text-2xl md:text-3xl font-bold text-[#0a0a0a] font-['Space_Grotesk'] leading-snug">
                  "The system remembers.<br />The agents just act."
                </p>
              </div>
              <p className="text-base text-[#525252] leading-relaxed mb-8">
                DavinciAI Labs is developing Cognitive Swarm Intelligence as a new architecture for persistent, structured, self-improving AI systems. Our work focuses on memory-native cognition, stigmergic coordination, procedural learning, and operational intelligence that compounds over time.
              </p>
              <a href="https://hivemind.davinciai.eu"
                className="inline-flex items-center gap-2 px-7 py-3 bg-[#117dff] text-white text-sm font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors no-underline uppercase tracking-[0.075em]">
                Explore HIVEMIND <ExternalLink size={14} />
              </a>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── LICENSE ── */}
      <Section>
        <div className="py-16 lg:py-20">
          <FadeUp>
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} className="text-[#117dff]" />
                <span className="text-xs font-mono uppercase tracking-widest text-[#a3a3a3]">License</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0a0a0a] font-['Space_Grotesk'] mb-6">
                Open Access — CC BY 4.0
              </h2>

              <div className="bg-white border border-[#e3e0db] rounded-xl p-6 md:p-8 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-4 mb-6 pb-6 border-b border-[#e3e0db]">
                  <div className="w-12 h-12 rounded-lg bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center shrink-0">
                    <BookOpen size={20} className="text-[#117dff]" />
                  </div>
                  <div>
                    <p className="text-sm font-mono text-[#a3a3a3] mb-2">
                      © 2026 DavinciAI Labs
                    </p>
                    <p className="text-base text-[#525252] leading-relaxed">
                      This work is licensed under the <strong className="text-[#0a0a0a]">Creative Commons Attribution 4.0 International License (CC BY 4.0)</strong>.
                    </p>
                    <p className="text-sm text-[#525252] leading-relaxed mt-2">
                      You are free to share, adapt, and build upon this work for any purpose, even commercially, provided you give appropriate credit to DavinciAI Labs.
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#0a0a0a] mb-3">What this means:</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-[#0a0a0a] mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        You are free to
                      </h4>
                      <ul className="text-xs text-[#525252] space-y-1">
                        <li>• Share — copy and redistribute in any medium</li>
                        <li>• Adapt — remix, transform, and build upon</li>
                        <li>• Use for any purpose, including commercial</li>
                      </ul>
                    </div>
                    <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-[#0a0a0a] mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#117dff]" />
                        Under these terms
                      </h4>
                      <ul className="text-xs text-[#525252] space-y-1">
                        <li>• Attribution — give appropriate credit</li>
                        <li>• Indicate if changes were made</li>
                        <li>• No additional restrictions</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-[#117dff]/[0.06] border border-[#117dff]/20 rounded-lg p-4 md:p-5">
                  <h4 className="text-sm font-semibold text-[#0a0a0a] mb-3">How to attribute this work:</h4>
                  <div className="bg-white border border-[#e3e0db] rounded-md px-4 py-3 mb-3">
                    <p className="text-xs font-mono text-[#525252]">
                      DavinciAI Labs. "Cognitive Swarm Intelligence: An Environment-Centric Architecture for Persistent, Collective, Self-Improving AI." (2026)<br />
                      <a href="https://hivemind.davinciai.eu/research" className="text-[#117dff] hover:underline" target="_blank" rel="noopener noreferrer">https://hivemind.davinciai.eu/research</a>
                    </p>
                  </div>
                  <p className="text-xs text-[#525252]">
                    Full license:{' '}
                    <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-[#117dff] hover:underline">
                      https://creativecommons.org/licenses/by/4.0/
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#e3e0db] bg-white">
        <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#e3e0db]">
            <div className="flex items-center gap-2">
              <img src="/images/davinci-logo.svg" alt="Da Vinci" className="h-4" />
              <span className="text-xs font-mono text-[#a3a3a3]">DavinciAI Labs / 2026</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#117dff]/[0.06] border border-[#117dff]/20 text-[#117dff] text-xs font-medium hover:bg-[#117dff]/[0.1] transition-colors no-underline">
                <BookOpen size={12} />
                CC BY 4.0
              </a>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-xs">
            <div>
              <p className="text-[#525252] leading-relaxed mb-2">
                This work is licensed under the Creative Commons Attribution 4.0 International License.
              </p>
              <p className="text-[#a3a3a3]">
                You are free to share, adapt, and build upon this work for any purpose, even commercially, provided you give appropriate credit.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#0a0a0a] mb-2">Citation</h4>
              <p className="text-[#525252] font-mono text-[10px] leading-relaxed">
                DavinciAI Labs.<br />
                "Cognitive Swarm Intelligence: An Environment-Centric Architecture for Persistent, Collective, Self-Improving AI." (2026)<br />
                https://hivemind.davinciai.eu/research
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#0a0a0a] mb-2">Key Terms</h4>
              <ul className="text-[#525252] space-y-1">
                <li>✓ Share — copy and redistribute</li>
                <li>✓ Adapt — remix, transform, build upon</li>
                <li>✓ Commercial use permitted</li>
                <li>• Attribution required</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ResearchPage;
