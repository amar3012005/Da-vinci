import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { 
  ChevronDown,
  Plus,
  Play,
  Users,
  Zap,
  Star,
  Globe,
  MessageCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
  Target
} from 'lucide-react';
import { ShaderAnimation } from './ui/shader-lines';
import { AIVoiceInput } from './ui/ai-voice-input';
import MarketInsightsCarousel from './ui/market-insights-carousel';
import EnhancedAboutSection from './ui/enhanced-about-section';
import TaraVariants from './ui/tara-variants';
import DemoRequestModal from './ui/demo-request-modal';

gsap.registerPlugin(ScrollTrigger);

// Navigation Component
const NavigationMenu = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const navItems = [
    { label: 'Meet TARA_x1', sectionId: 'tara-variants-section' },
    { label: 'About Us', sectionId: 'about-section' },
    { label: 'Contact Us', sectionId: 'cta-section' }
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 p-8"
    >
      <div className="container mx-auto">
        <div className="flex justify-center items-center">
          <div className="flex items-center gap-12 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-4">
            {navItems.map((item, index) => (
              <motion.button
                key={item.sectionId}
                onClick={() => scrollToSection(item.sectionId)}
                className="text-white/80 hover:text-white font-mono text-lg tracking-wide transition-all duration-300 relative group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
              >
                <span className="relative z-10">./{item.label}</span>
                <motion.div
                  className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  whileHover={{ scale: 1.1 }}
                />
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

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

// AnimatedCounter component removed - not used in current implementation

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
      {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/50 z-10"></div>

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
                Welcom to a new AI-powered future.
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
              India's Flagship 
              <span className="px-2 py-1 bg-pink-500 text-white rounded">
                Conversational AI Agentic
              </span>
              
               Pipeline
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
              <span className="pointer-events-none z-10 text-center text-7xl leading-none font-semibold tracking-tighter whitespace-pre-wrap text-white drop-shadow-lg">
            
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

// Centered Button Section
const CenteredButtonSection = ({ onRequestDemo }) => {
  return (
    <motion.section 
      className="py-16 px-8 relative overflow-hidden"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className="max-w-4xl mx-auto text-center relative z-10">

        
        
        {/* Main Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          
          {/* Join Waitlist Button */}
          <motion.button
            onClick={() => onRequestDemo(true)}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-lg rounded-xl
                       hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 
                       flex items-center justify-center gap-3 group shadow-lg hover:shadow-xl active:scale-95"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Join Waitlist & Request a Demo
          </motion.button>
          
          {/* Request Demo Button */}
          <motion.button
            onClick={() => onRequestDemo(true)}
            className="px-8 py-4 border-2 border-white/40 text-white font-semibold text-lg rounded-xl
                       hover:border-white hover:bg-white/10 transition-all duration-300 
                       flex items-center justify-center gap-3 group active:scale-95"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Try Demo Version
          </motion.button>
        </div>

        {/* Subtitle */}
        <motion.p 
          className="mt-6 text-white/60 text-sm max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          Be among the first to experience the future of AI-powered business automation
        </motion.p>
      </div>
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
      languages: "Multi-native",
      cost: "€100",
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
      cost: "€260",
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
      cost: "€185+",
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
      cost: "€205+",
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
              — S I N D H , Himachal Pradesh
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
          
          
          
        </motion.div>
      </div>
    </motion.section>
  );
};

// Stats Section
const StatsSection = () => {
  const aiMarketData = [
    {
      id: 1,
      title: "Global AI Market",
      date: "2025",
      content: "$391 Billion global AI market value in 2025—projected to reach $1.81 Trillion by 2030. CAGR of 35.9%—faster growth than cloud or mobile apps.",
      category: "Market Size",
      icon: Globe,
      relatedIds: [2, 3],
      status: "completed",
      energy: 100,
    },
    {
      id: 2,
      title: "Indian AI Market",
      date: "2025",
      content: "$13 Billion Indian AI market (2025), with rapid government and enterprise investment.",
      category: "Regional Growth",
      icon: TrendingUp,
      relatedIds: [1, 4],
      status: "completed",
      energy: 90,
    },
    {
      id: 3,
      title: "Enterprise Adoption",
      date: "2025",
      content: "72% of companies are using AI; half have rolled it out across multiple departments. 75% of C-level executives rank AI in their top 3 priorities for 2025.",
      category: "Adoption",
      icon: Users,
      relatedIds: [1, 5],
      status: "in-progress",
      energy: 85,
    },
    {
      id: 4,
      title: "Customer Experience",
      date: "2025",
      content: "95% of all customer interactions will be AI-facilitated by end of 2025. 68% average reduction in operational costs reported by companies using AI in customer service.",
      category: "Impact",
      icon: Target,
      relatedIds: [2, 6],
      status: "in-progress",
      energy: 80,
    },
    {
      id: 5,
      title: "Budget Growth",
      date: "2025-2027",
      content: "Budget for GenAI systems to rise 60%+ over the next 2 years.",
      category: "Investment",
      icon: DollarSign,
      relatedIds: [3, 6],
      status: "pending",
      energy: 75,
    },
    {
      id: 6,
      title: "ROI & Performance",
      date: "2025",
      content: "Mature AI deployments see $3.50 value for every $1 invested. Up to 52% lower resolution times for complex cases—AI resolves routine requests instantly.",
      category: "Returns",
      icon: Zap,
      relatedIds: [4, 5],
      status: "pending",
      energy: 70,
    },
  ];

  return (
    <motion.section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-16 relative z-10">
        
        <TextReveal>
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-light text-white mb-8">
        
              <br />
              <span className="font-semibold">" It's Now or Never "</span>
            </h2>
            <p className="text-xl text-white/60 max-w-4xl mx-auto leading-relaxed">
              
            </p>
          </div>
        </TextReveal>

        <div className="relative w-full">
    
        </div>

        {/* Elegant Market Insights */}
        <motion.div
          className="mt-32 max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-16">
            <h3 className="text-4xl font-light text-white mb-6">
              Market Dynamics
            </h3>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto"></div>
          </div>

          <div className="space-y-16">
            {/* Enterprise Adoption - Slide from Left */}
            <motion.div
              className="flex flex-col md:flex-row items-center gap-12"
              initial={{ opacity: 0, x: -120, y: 50 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              transition={{ 
                duration: 1.2, 
                ease: [0.22, 1, 0.36, 1],
                delay: 0.2
              }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.div 
                className="flex-1"
                initial={{ opacity: 0, x: -100 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 1, 
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.4
                }}
                viewport={{ once: true }}
              >
                <motion.h4 
                  className="text-2xl font-light text-white mb-4"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  Enterprise AI Adoption
                </motion.h4>
                <motion.p 
                  className="text-white/70 text-lg leading-relaxed"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  viewport={{ once: true }}
                >
                  72% of companies are using AI; half have rolled it out across multiple departments. 
                  75% of C-level executives rank AI in their top 3 priorities for 2025.
                </motion.p>
              </motion.div>
              <motion.div 
                className="flex-1 text-right"
                initial={{ opacity: 0, x: 120, scale: 0.8 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.5
                }}
                viewport={{ once: true }}
              >
                <motion.div 
                  className="text-6xl font-light text-white/20"
                  initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ 
                    duration: 1.2, 
                    ease: "backOut",
                    delay: 0.7
                  }}
                  viewport={{ once: true }}
                >
                  72%
                </motion.div>
                <motion.div 
                  className="text-sm text-white/50 uppercase tracking-wider"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  viewport={{ once: true }}
                >
                  Adoption Rate
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Customer Experience Impact - Slide from Right */}
            <motion.div
              className="flex flex-col md:flex-row-reverse items-center gap-12"
              initial={{ opacity: 0, x: 120, y: 50 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              transition={{ 
                duration: 1.2, 
                ease: [0.22, 1, 0.36, 1],
                delay: 0.2
              }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.div 
                className="flex-1"
                initial={{ opacity: 0, x: 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 1, 
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.4
                }}
                viewport={{ once: true }}
              >
                <motion.h4 
                  className="text-2xl font-light text-white mb-4"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  Customer Experience Transformation
                </motion.h4>
                <motion.p 
                  className="text-white/70 text-lg leading-relaxed"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  viewport={{ once: true }}
                >
                  95% of all customer interactions will be AI-facilitated by end of 2025. 
                  68% average reduction in operational costs reported by companies using AI in customer service.
                </motion.p>
              </motion.div>
              <motion.div 
                className="flex-1 text-left"
                initial={{ opacity: 0, x: -120, scale: 0.8 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.5
                }}
                viewport={{ once: true }}
              >
                <motion.div 
                  className="text-6xl font-light text-white/20"
                  initial={{ opacity: 0, scale: 0.5, rotate: 10 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ 
                    duration: 1.2, 
                    ease: "backOut",
                    delay: 0.7
                  }}
                  viewport={{ once: true }}
                >
                  95%
                </motion.div>
                <motion.div 
                  className="text-sm text-white/50 uppercase tracking-wider"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  viewport={{ once: true }}
                >
                  AI-Facilitated
                </motion.div>
              </motion.div>
            </motion.div>

            {/* ROI Performance - Slide from Left */}
            <motion.div
              className="flex flex-col md:flex-row items-center gap-12"
              initial={{ opacity: 0, x: -120, y: 50 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              transition={{ 
                duration: 1.2, 
                ease: [0.22, 1, 0.36, 1],
                delay: 0.2
              }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.div 
                className="flex-1"
                initial={{ opacity: 0, x: -100 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 1, 
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.4
                }}
                viewport={{ once: true }}
              >
                <motion.h4 
                  className="text-2xl font-light text-white mb-4"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  Return on Investment
                </motion.h4>
                <motion.p 
                  className="text-white/70 text-lg leading-relaxed"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  viewport={{ once: true }}
                >
                  Mature AI deployments see $3.50 value for every $1 invested. 
                  74% of mature AI users report solid ROI (but new adopters lag).
                </motion.p>
              </motion.div>
              <motion.div 
                className="flex-1 text-right"
                initial={{ opacity: 0, x: 120, scale: 0.8 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.5
                }}
                viewport={{ once: true }}
              >
                <motion.div 
                  className="text-6xl font-light text-white/20"
                  initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ 
                    duration: 1.2, 
                    ease: "backOut",
                    delay: 0.7
                  }}
                  viewport={{ once: true }}
                >
                  3.5x
                </motion.div>
                <motion.div 
                  className="text-sm text-white/50 uppercase tracking-wider"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  viewport={{ once: true }}
                >
                  Value Return
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
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
                  <span>admin@davinciai.in</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                  <span>+91 6301805656</span>
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
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  useEffect(() => {
    // Enhanced smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
      infinite: false,
      wheelMultiplier: 1,
      touchInertiaMultiplier: 35,
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
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative w-full" style={{ zoom: '0.85' }}>
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
          className="hero-video absolute inset-0 w-full h-full object-cover"
          style={{ 
            filter: 'brightness(0.85) contrast(1.2) saturate(1.1) blur(0.2px)',
            opacity: 0.90
          }}
        >
          <source src="/intro.mp4" type="video/mp4" />
        </video>
        
        {/* Sophisticated gradient overlay - reduced opacity for better video visibility */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />
        
        {/* Subtle texture overlay - reduced for better video visibility */}
        <div className="absolute inset-0 bg-black/10" 
             style={{
               backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 1px, transparent 1px)`,
               backgroundSize: '50px 50px'
             }} 
        />
      </motion.div>
      
      {/* Navigation Menu */}
      <NavigationMenu />
      
      {/* Content */}
      <div className="relative z-10">
        <HeroSection />
        <CenteredButtonSection onRequestDemo={setIsDemoModalOpen} />
        <ProcessSection />
        <div id="tara-variants-section">
          <TaraVariants />
        </div>
        <CallToActionSection />
        <div id="about-section">
          <EnhancedAboutSection />
        </div>
        <SolutionsSection />
        <StatsSection />
        <div id="cta-section">
          <CTASection />
        </div>
      </div>

      {/* Demo Request Modal */}
      <DemoRequestModal 
        isOpen={isDemoModalOpen} 
        onClose={() => setIsDemoModalOpen(false)} 
      />
    </div>
  );
};

export default MainHomepage;