import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { 
  ArrowRight,
  ChevronDown,
  Plus,
  Play,
  Users,
  Clock,
  Shield,
  Zap,
  Brain,
  CheckCircle,
  Star,
  Globe,
  Settings,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { ShaderAnimation } from './ui/shader-lines';
import { AIVoiceInput } from './ui/ai-voice-input';

gsap.registerPlugin(ScrollTrigger);

// Project Info Card Component (matching reference design)
const ProjectInfoCard = ({ title, value, className = "" }) => (
  <motion.div 
    className={`absolute ${className} z-30`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay: 0.5 }}
  >
    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 min-w-[140px] rounded-sm">
      <div className="text-white/50 font-mono text-xs uppercase tracking-wider mb-1">
        {title}
      </div>
      <div className="text-white font-mono text-sm">
        {value}
      </div>
    </div>
  </motion.div>
);

// Enhanced Text Reveal Component
const TextReveal = ({ children, className = "", delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { threshold: 0.3, once: true });

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={isInView ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
        transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// Animated Counter Component
const AnimatedCounter = ({ target, suffix = "", duration = 2000, delay = 0 }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const isInView = useInView(countRef, { once: true });

  useEffect(() => {
    if (!isInView) return;

    const timer = setTimeout(() => {
      let startTime;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        setCount(Math.floor(progress * target));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [isInView, target, duration, delay]);

  return (
    <span ref={countRef}>
      {count.toLocaleString()}{suffix}
    </span>
  );
};

// Hero Section - Main Landing
const HeroSection = () => {
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 1000], [0, -200]);
  const logoRef = useRef();
  const contentRef = useRef();

  useEffect(() => {
    // Logo and content entrance animations
    const tl = gsap.timeline();
    
    tl.fromTo(logoRef.current, 
      { scale: 0.7, opacity: 0, y: 50 },
      { scale: 1, opacity: 1, y: 0, duration: 2, ease: "power3.out" }
    )
    .fromTo(contentRef.current,
      { opacity: 0, y: 80 },
      { opacity: 1, y: 0, duration: 1.5, ease: "power3.out" },
      "-=1.2"
    );
  }, []);

  return (
    <motion.section 
      className="relative h-screen flex items-center overflow-hidden"
      style={{ y: yParallax }}
    >
      {/* Project Info Cards */}
      <ProjectInfoCard 
        title="project" 
        value={
          <div>
            <div>Location / Georgia / Tbilisi</div>
            <div>Project / Mooun</div>
            <div>Category / Music</div>
            <div>Date / 2024</div>
          </div>
        }
        className="top-8 left-8" 
      />
      
      <ProjectInfoCard 
        title="The main idea" 
        value=""
        className="top-8 right-8" 
      />

      {/* Left side - Large Logo */}
      <div className="absolute left-8 top-1/2 transform -translate-y-1/2 z-20">
        <motion.div 
          ref={logoRef}
          className="w-96 h-96 md:w-[500px] md:h-[500px]"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        >
          <img 
            src="/logo.svg" 
            alt="DA'VINCI Solutions"
            className="w-full h-full object-contain filter brightness-110"
          />
        </motion.div>
        
        {/* DA'VINCI SOLUTIONS Text Under Logo */}
        <motion.div 
          className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
        >
          <div className="text-white text-2xl md:text-3xl font-bold tracking-wider">
            AGENTIC
          </div>
          <div className="text-white/70 text-lg md:text-xl font-light tracking-[0.3em]">
            PIPELINE
          </div>
        </motion.div>
      </div>

      {/* Right side - Main Content */}
      <div className="absolute right-8 top-1/2 transform -translate-y-1/2 z-20 max-w-2xl ml-[600px]">
        <motion.div ref={contentRef} className="space-y-8">
          {/* Brand Tags */}
          <div className="flex gap-3 mb-8">
            <span className="px-3 py-1 bg-pink-500 text-white text-xs font-medium rounded-full">
              artificial
            </span>
            <span className="px-3 py-1 bg-pink-500 text-white text-xs font-medium rounded-full">
              intelligence
            </span>
          </div>

          <TextReveal delay={0.5}>
            <h1 className="text-6xl md:text-7xl font-light text-white leading-tight">
              Say goodbye
              <br />
              to boring and awkward{' '}
              <span className="px-2 py-1 bg-pink-500 text-white rounded">
                processes
              </span>
              <br />
              interfaces and start a new
              <br />
              life with{' '}
              <span className="font-semibold">DA'VINCI</span> ®
            </h1>
          </TextReveal>

          {/* Plus Icon */}
          <TextReveal delay={0.8}>
            <motion.div 
              className="flex items-center gap-4 my-12"
              whileHover={{ x: 10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-12 h-12 border border-white/30 flex items-center justify-center cursor-pointer
                             hover:border-white/60 transition-all duration-300">
                <Plus className="w-6 h-6 text-white/70" />
              </div>
              <div>
                <div className="text-white/50 font-mono text-sm uppercase tracking-wider mb-1">
                  Introduction
                </div>
              </div>
            </motion.div>
          </TextReveal>

          {/* About Text */}
          <TextReveal delay={1.0}>
            <div className="space-y-4">
              <h3 className="text-white/50 font-mono text-sm uppercase tracking-wider">
                about
              </h3>
              <p className="text-white/80 text-lg leading-relaxed max-w-lg">
                Welcome to a new AI-powered future.
                DA'VINCI is a project that looks at
                old business processes in a new way.
                <br /><br />
                Operating with AI is more
                convenient and interactive. Our
                AI-powered recommendations enable
                decision-making that is more accurate
              </p>
            </div>
          </TextReveal>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="w-6 h-6 text-white/40" />
      </motion.div>
    </motion.section>
  );
};


// Process/Roadmap Section
const ProcessSection = () => {
  const { scrollY } = useScroll();
  const yTransform = useTransform(scrollY, [800, 1400], [100, -100]);
  const [showVoicePopup, setShowVoicePopup] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Audio control functions
  const togglePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsSpeaking(false);
        stopAudioAnalysis();
      } else {
        // Setup audio analysis if not already done
        if (!audioContextRef.current) {
          await setupAudioAnalysis();
        }
        
        try {
          await audioRef.current.play();
          setIsSpeaking(true);
          startAudioAnalysis();
        } catch (error) {
          console.error('Failed to play audio:', error);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsSpeaking(false);
    stopAudioAnalysis();
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Web Audio API setup
  const setupAudioAnalysis = async () => {
    if (!audioRef.current) return;

    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Create analyser
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      // Create data array
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      // Connect audio element to analyser
      const source = audioContextRef.current.createMediaElementSource(audioRef.current);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      console.log('Audio analysis setup successful');
      
    } catch (error) {
      console.error('Web Audio API setup failed:', error);
    }
  };

  // Analyze audio data for visualizer
  const analyzeAudio = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Check if we're getting data
    const hasData = dataArrayRef.current.some(value => value > 0);
    if (hasData) {
      console.log('Audio data received:', dataArrayRef.current.slice(0, 10));
    }
    
    // Trigger visualizer update
    const event = new CustomEvent('audioData', { 
      detail: { data: Array.from(dataArrayRef.current) } 
    });
    window.dispatchEvent(event);
    
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  };

  // Start audio analysis
  const startAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    analyzeAudio();
  };

  // Stop audio analysis
  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const phases = [
    { id: "01", title: "Real-Time Humanized Conversations", status: "completed", width: "w-full" },
    { id: "02", title: "Context-Aware Memory Recall", status: "completed", width: "w-full" },
    { id: "03", title: "Multilingual Indic Language Engine", status: "active", width: "w-4/5" },
    { id: "04", title: "Autonomous Agentic Decision-Making", status: "pending", width: "w-1/2" },
    { id: "05", title: "Enterprise Security & Compliance", status: "pending", width: "w-1/3" },
    { id: "06", title: "Effortless Business Integrations", status: "pending", width: "w-1/4" },
    { id: "07", title: "Adaptive User Experience", status: "pending", width: "w-1/5" },
    { id: "08", title: "Instant Analytics & Insights", status: "pending", width: "w-1/6" }
];


  return (
    <motion.section 
      className="py-32 relative overflow-hidden"
      style={{ y: yTransform }}
    >
      <div className="container mx-auto px-16 relative z-10">
        
        {/* Header */}
        <TextReveal>
          <div className="flex justify-between items-center mb-20">
            <div>
              <div className="text-white/40 font-mono text-sm mb-2">02</div>
              <div className="w-px h-8 bg-white/20"></div>
            </div>
            <h2 className="text-6xl md:text-7xl font-light text-white text-center">
              Meet TARA_x1
            </h2>
            <div className="text-white/40 font-mono text-sm">
              AI Agent
            </div>
          </div>
        </TextReveal>

        {/* Subtitle */}
        <TextReveal>
          <div className="text-center mb-16">
            <h3 className="text-2xl md:text-3xl font-light text-white/90 mb-4">
              India's Flagship Conversational AI Agentic Pipeline
            </h3>
            <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Delivering 24/7 multilingual, real-time, and human-like customer service—at a fraction of traditional costs.
            </p>
          </div>
        </TextReveal>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left - Timeline */}
          <div className="space-y-6">
            {phases.map((phase, index) => (
              <motion.div
                key={phase.id}
                className="group"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-6">
                  {/* Phase number */}
                  <div className="text-white/40 font-mono text-sm w-12">
                    Phase {phase.id}
                  </div>
                  
                  {/* Phase title */}
                  <div className="text-white text-lg font-light min-w-[200px]">
                    {phase.title}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="flex-1 h-8 bg-gradient-to-r from-red-600 to-purple-600 relative overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${
                        phase.status === 'completed' ? 'from-red-500 to-red-600' :
                        phase.status === 'active' ? 'from-red-500 to-orange-500' :
                        'from-gray-600 to-gray-700'
                      } ${phase.width}`}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      transition={{ duration: 1.5, delay: index * 0.2 }}
                      viewport={{ once: true }}
                      style={{ transformOrigin: "left" }}
                    />
                    
                    {/* Status indicator */}
                    <div className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full ${
                      phase.status === 'completed' ? 'bg-white' :
                      phase.status === 'active' ? 'bg-white animate-pulse' :
                      'bg-white/40'
                    }`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right - Shader Animation */}
          <motion.div 
            className="flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <div className="relative flex h-[650px] w-full flex-col items-center justify-center overflow-hidden rounded-xl">
              <ShaderAnimation />
              <span className="pointer-events-none  text-center text-7xl leading-none font-semibold tracking-tighter whitespace-pre-wrap text-white">
                Shader Lines
              </span>
              
              {/* Listen to TARA Button */}
              <motion.button
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 
                           bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium rounded-lg
                           hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                onClick={() => setShowVoicePopup(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Listen to TARA
              </motion.button>
            </div>
          </motion.div>
          
        </div>
      </div>

      {/* Aesthetic Voice Demo Popup */}
      {showVoicePopup && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowVoicePopup(false)}
        >
          <motion.div
            className="relative w-full max-w-lg mx-4 bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-12"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              className="absolute top-6 right-6 w-8 h-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full 
                         flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 
                         transition-all duration-200"
              onClick={() => setShowVoicePopup(false)}
            >
              ×
            </button>

            {/* Centered Voice Demo */}
            <div className="text-center">
              {/* Title */}
              <h3 className="text-2xl font-light text-white mb-2">
                TARA Voice Demo
              </h3>
              <p className="text-white/50 text-sm mb-12">
                Experience TARA_x1's conversational AI
              </p>

              {/* Voice Animation */}
              <div className="mb-8">
                <AIVoiceInput 
                  onStart={() => console.log('TARA voice demo started')}
                  onStop={(duration) => console.log(`Demo duration: ${duration}s`)}
                  demoMode={isSpeaking}
                  demoInterval={100}
                />
              </div>

              {/* Audio Player */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                {/* Hidden Audio Element */}
                <audio
                  ref={audioRef}
                  src="/tara.mp3"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleAudioEnded}
                />
                
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white/80" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-medium text-sm">TARA_x1 Sample</h4>
                    <p className="text-white/50 text-xs">Multilingual AI Assistant</p>
                  </div>
                </div>
                
                {/* Audio Controls */}
                <div className="flex items-center gap-3">
                  <motion.button 
                    className="w-8 h-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full 
                               flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200"
                    onClick={togglePlayPause}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isPlaying ? (
                      <div className="w-3 h-3 bg-white rounded-sm"></div>
                    ) : (
                      <Play className="w-3 h-3 ml-0.5" />
                    )}
                  </motion.button>
                  <div className="flex-1 h-1 bg-white/10 rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-white/60 to-white/40 rounded-full transition-all duration-300"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-white/40 text-xs font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.section>
  );
};

// Call to Action Section
const CallToActionSection = () => {
  const { scrollY } = useScroll();
  const yTransform = useTransform(scrollY, [2000, 2800], [50, -50]);

  return (
    <motion.section 
      className="py-32 relative overflow-hidden"
      style={{ y: yTransform }}
    >
      <div className="container mx-auto px-16 relative z-10">
        
        <TextReveal>
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-light text-white mb-8">
              Ready to upgrade your customer care?
            </h2>
            <p className="text-white/70 text-xl max-w-4xl mx-auto leading-relaxed mb-12">
              Book a demo or chat with TARA_x1 today—your customers will thank you.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <motion.button
                className="px-8 py-4 bg-white text-black font-medium text-lg rounded-lg
                           hover:bg-white/90 transition-all duration-300 shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Book a Demo
              </motion.button>
              
              <motion.button
                className="px-8 py-4 border border-white/40 text-white font-medium text-lg rounded-lg
                           hover:border-white/60 hover:bg-white/10 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Chat with TARA_x1
              </motion.button>
            </div>
          </div>
        </TextReveal>
      </div>
    </motion.section>
  );
};

// About/Founder Section
const AboutSection = () => {
  const { scrollY } = useScroll();
  const scaleTransform = useTransform(scrollY, [1400, 2000], [0.9, 1.1]);

  return (
    <motion.section 
      className="py-32 relative overflow-hidden"
      style={{ scale: scaleTransform }}
    >
      <div className="container mx-auto px-16 relative z-10">
        
        {/* Header */}
        <TextReveal>
          <div className="flex justify-between items-start mb-20">
            {/* Left - Plus icon and About label */}
            <div className="space-y-8">
              <motion.div 
                className="w-12 h-12 border border-white/30 flex items-center justify-center cursor-pointer"
                whileHover={{ rotate: 90, borderColor: "rgba(255,255,255,0.6)" }}
                transition={{ duration: 0.3 }}
              >
                <Plus className="w-6 h-6 text-white/70" />
              </motion.div>
              
              <div>
                <div className="text-white/50 font-mono text-sm uppercase tracking-wider mb-4">
                  About
                </div>
                
                {/* Founder avatar */}
                <div className="flex -space-x-3">
                  <motion.div 
                    className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-full border-2 border-white/20"
                    whileHover={{ scale: 1.2, zIndex: 10 }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            </div>

            {/* Right - About title */}
            <div className="text-right">
              <div className="text-white/40 font-mono text-sm mb-4">
                Da'vinci Solutions
              </div>
              <h2 className="text-8xl font-light text-white mb-8">
                About Us
              </h2>
            </div>
          </div>
        </TextReveal>

        {/* About Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Left - About Da'vinci Solutions */}
          <TextReveal>
            <div className="space-y-8">
              <div>
                <h3 className="text-4xl font-light text-white mb-4">
                  About Da'vinci Solutions
                </h3>
                <p className="text-white/60 text-lg leading-relaxed">
                  Founded by Amar Sai, Da'vinci Solutions aims to revolutionize enterprise automation for India and global markets.
                </p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                    Vision
                  </div>
                  <div className="text-white text-lg font-light">Build AI agents that understand, support, and empower every user in their own language.</div>
                </div>
                
                <div>
                  <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                    Expertise
                  </div>
                  <div className="text-white text-lg font-light">Conversational AI, multilingual voice assistants, streamlined enterprise automation.</div>
                </div>
                
                <div>
                  <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                    Impact
                  </div>
                  <div className="text-white text-lg font-light">Enabling businesses—large and small—to deliver truly human, scalable, and cost-effective support.</div>
                </div>
              </div>
            </div>
          </TextReveal>

          {/* Right - Founder Contact */}
          <TextReveal>
            <div className="space-y-8">
              <div>
                <h3 className="text-4xl font-light text-white mb-4">
                  Contact the Founder
                </h3>
                <p className="text-white/60 text-lg">
                  Get in touch with Amar Sai
                </p>
              </div>
              
              <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="space-y-6">
                  <div>
                    <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                      Name
                    </div>
                    <div className="text-white text-xl font-medium">Amar Sai</div>
                  </div>
                  
                  <div>
                    <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                      Email
                    </div>
                    <div className="text-white text-lg font-light">amarsai2005@gmail.com</div>
                  </div>
                  
                  <div>
                    <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                      Current Education
                    </div>
                    <div className="text-white text-lg font-light">B.Tech , IIT Mandi</div>
                  </div>
                  <div>
                    <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                      Location
                    </div>
                    <div className="text-white text-lg font-light">Himachal Pradesh, India</div>
                  </div>
                  
                  {/* Contact Button */}
                  <motion.button
                    className="w-full mt-8 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium rounded-lg
                               hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Send Message
                  </motion.button>
                </div>
              </div>
            </div>
          </TextReveal>
        </div>
      </div>
    </motion.section>
  );
};

// AI Solutions Showcase Section
const SolutionsSection = () => {
  const competitors = [
    {
      name: "TARA_x1",
      isWinner: true,
      availability: "24/7",
      languages: "20+ Indic + Eng",
      cost: "₹9,800",
      scalability: "Instant",
      personalization: "High (memory)",
      errorRate: "Very Low",
      attrition: "0%",
      deployment: "Weeks",
      color: "from-blue-500 to-cyan-500",
      badge: "Winner"
    },
    {
      name: "Human Call Centers",
      isWinner: false,
      availability: "Limited hours",
      languages: "2-3",
      cost: "₹25,547",
      scalability: "Manual hiring",
      personalization: "Low",
      errorRate: "High",
      attrition: "45%",
      deployment: "Months",
      color: "from-gray-500 to-gray-600",
      badge: ""
    },
    {
      name: "Airtel/Freshworks Bots",
      isWinner: false,
      availability: "24/7",
      languages: "Mainly English",
      cost: "₹18,000+",
      scalability: "Complex config",
      personalization: "Medium",
      errorRate: "Medium",
      attrition: "N/A",
      deployment: "Weeks",
      color: "from-orange-500 to-red-500",
      badge: ""
    },
    {
      name: "Others",
      isWinner: false,
      availability: "Varies",
      languages: "Few",
      cost: "₹20,000+",
      scalability: "Manual setup",
      personalization: "Medium",
      errorRate: "Medium",
      attrition: "N/A",
      deployment: "Months",
      color: "from-purple-500 to-pink-500",
      badge: ""
    }
  ];

  const features = [
    { label: "Availability", key: "availability" },
    { label: "Languages", key: "languages" },
    { label: "Cost per agent/month", key: "cost" },
    { label: "Scalability", key: "scalability" },
    { label: "Personalization", key: "personalization" },
    { label: "Error Rate", key: "errorRate" },
    { label: "Attrition", key: "attrition" },
    { label: "Deployment Speed", key: "deployment" }
  ];

  return (
    <motion.section className="py-32 relative overflow-hidden bg-white/2">
      <div className="container mx-auto px-16 relative z-10">
        
        <TextReveal>
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-light text-white mb-8">
              Why TARA_x1 Outperforms
              <br />
              <span className="font-semibold">Traditional & AI Competition</span>
            </h2>
            <div className="w-24 h-px bg-white/30 mx-auto mb-6"></div>
            <p className="text-white/60 text-lg max-w-3xl mx-auto leading-relaxed">
              See how TARA_x1 delivers superior performance across every key metric 
              compared to traditional call centers and existing AI solutions.
            </p>
          </div>
        </TextReveal>

        {/* Comparison Table */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          
          {/* Header Row */}
          <div className="grid grid-cols-5 gap-4 p-6 border-b border-white/10">
            <div className="text-white/40 font-mono text-sm uppercase tracking-wider">
              Feature
            </div>
            {competitors.map((competitor, index) => (
              <div key={competitor.name} className="text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  competitor.isWinner 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                    : 'bg-white/10 text-white/80'
                }`}>
                  {competitor.name}
                  {competitor.isWinner && (
                    <Star className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Feature Rows */}
          {features.map((feature, featureIndex) => (
            <motion.div
              key={feature.key}
              className="grid grid-cols-5 gap-4 p-6 border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: featureIndex * 0.05 }}
              viewport={{ once: true }}
            >
              <div className="text-white/70 font-medium">
                {feature.label}
              </div>
              {competitors.map((competitor, competitorIndex) => (
                <div key={competitor.name} className="text-center">
                  <span className={`text-sm ${
                    competitor.isWinner 
                      ? 'text-white font-medium' 
                      : 'text-white/60'
                  }`}>
                    {competitor[feature.key]}
                  </span>
                  {competitor.isWinner && (
                    <div className="w-2 h-2 bg-green-400 rounded-full mx-auto mt-1"></div>
                  )}
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        {/* Testimonial Quote */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="text-white/80 text-lg italic mb-4">
              "TARA_x1 reduced our customer service costs by 80% while improving response times. 
              The multilingual support is exceptional."
            </div>
            <div className="text-white/60 text-sm">
              — Enterprise Client, Mumbai
            </div>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="mt-16 flex flex-col sm:flex-row gap-6 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <motion.button
            className="px-8 py-4 bg-white text-black font-medium text-lg rounded-lg
                       hover:bg-white/90 transition-all duration-300 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Book a Demo
          </motion.button>
          
          <motion.button
            className="px-8 py-4 border border-white/40 text-white font-medium text-lg rounded-lg
                       hover:border-white/60 hover:bg-white/10 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Migrate to TARA_x1 Today
          </motion.button>
          
          <motion.button
            className="px-6 py-3 text-white/60 text-sm font-medium
                       hover:text-white transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            See Full Comparison →
          </motion.button>
        </motion.div>
      </div>
    </motion.section>
  );
};

// Stats Section
const StatsSection = () => {
  const stats = [
    { number: 500, suffix: "+", label: "Enterprise Clients", sublabel: "Global companies trust us" },
    { number: 99.9, suffix: "%", label: "System Uptime", sublabel: "Reliable performance" },
    { number: 50, suffix: "M+", label: "AI Interactions", sublabel: "Monthly conversations" },
    { number: 85, suffix: "%", label: "Cost Reduction", sublabel: "Average savings" }
  ];

  return (
    <motion.section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-16 relative z-10">
        
        <TextReveal>
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-light text-white mb-8">
              Proven
              <br />
              <span className="font-semibold">Impact</span>
            </h2>
          </div>
        </TextReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center group"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
            >
              <div className="p-8 bg-gradient-to-br from-black/30 to-gray-900/30 backdrop-blur-sm 
                            border border-white/10 hover:border-white/30 transition-all duration-300">
                
                <div className="text-5xl font-light text-white mb-4">
                  <AnimatedCounter target={stat.number} suffix={stat.suffix} delay={index * 200} />
                </div>
                
                <h3 className="text-white font-medium mb-2">
                  {stat.label}
                </h3>
                
                <p className="text-white/50 text-sm">
                  {stat.sublabel}
                </p>
                
                {/* Progress indicator */}
                <motion.div
                  className="w-full h-px bg-white/20 mt-6 overflow-hidden"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 1.5, delay: index * 0.3 }}
                  viewport={{ once: true }}
                >
                  <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 w-full" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

// Final CTA Section
const CTASection = () => {
  const { scrollY } = useScroll();
  const yTransform = useTransform(scrollY, [2800, 3400], [0, -100]);

  return (
    <motion.section 
      className="py-32 relative overflow-hidden"
      style={{ y: yTransform }}
    >
      <div className="container mx-auto px-16 text-center relative z-10">
        
        <TextReveal>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-6xl md:text-8xl font-light text-white mb-8 leading-tight">
              Ready to start your
              <br />
              <span className="font-semibold">AI journey?</span>
            </h2>
            
            <p className="text-xl text-white/60 max-w-3xl mx-auto mb-16">
              Transform your enterprise with DA'VINCI's cutting-edge AI solutions.
              Join hundreds of companies already revolutionizing their operations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto">
              <motion.button
                className="px-12 py-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-lg
                           hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 
                           flex items-center gap-3 group w-full sm:w-auto"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                Start Free Trial
              </motion.button>
              
              <motion.button
                className="px-12 py-5 border border-white/40 text-white font-semibold text-lg
                           hover:border-white hover:bg-white/5 transition-all duration-300 
                           flex items-center gap-3 group w-full sm:w-auto"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Watch Demo
              </motion.button>
            </div>

            {/* Contact Information */}
            <motion.div 
              className="mt-16 pt-8 border-t border-white/10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <p className="text-white/40 font-mono text-sm mb-4">
                Questions? Reach out to our team
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-white/60 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>hello@davinci-solutions.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                  <span>+1 (555) 123-4567</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </TextReveal>
      </div>

      {/* Floating AI Assistant Indicator */}
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 3, duration: 0.8, ease: "backOut" }}
      >
        <motion.div
          className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full 
                     flex items-center justify-center cursor-pointer shadow-2xl group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <MessageCircle className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
        </motion.div>
        <motion.div 
          className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Tooltip */}
        <motion.div
          className="absolute bottom-20 right-0 bg-black/80 backdrop-blur-sm text-white text-sm 
                     px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 
                     transition-opacity duration-300"
          initial={{ opacity: 0, y: 10 }}
          whileHover={{ opacity: 1, y: 0 }}
        >
          Try TARA_x1 AI Assistant
        </motion.div>
      </motion.div>
    </motion.section>
  );
};

// Main Homepage Component
const MainHomepage = () => {
  const { scrollY } = useScroll();
  const backgroundY = useSpring(useTransform(scrollY, [0, 2000], [0, 200]));
  const backgroundScale = useSpring(useTransform(scrollY, [0, 3000], [1, 1.15]));

  useEffect(() => {
    // Enhanced smooth scrolling
    const lenis = new Lenis({
      duration: 1.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
      infinite: false,
    });
    
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative" style={{ zoom: '0.85' }}>
      {/* Enhanced Video Background */}
      <motion.div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ y: backgroundY, scale: backgroundScale }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            filter: 'brightness(0.65) contrast(1.1) saturate(0.9) blur(0.5px)',
            opacity: 0.8
          }}
        >
          <source src="/intro.mp4" type="video/mp4" />
        </video>
        
        {/* Sophisticated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/70 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60" />
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-black/20" 
             style={{
               backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)`,
               backgroundSize: '50px 50px'
             }} 
        />
      </motion.div>
      
      {/* Content */}
      <div className="relative z-10">
        <HeroSection />
        <ProcessSection />
        <CallToActionSection />
        <AboutSection />
        <SolutionsSection />
        <StatsSection />
        <CTASection />
      </div>
    </div>
  );
};

export default MainHomepage;