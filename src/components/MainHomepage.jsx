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
            DA'VINCI
          </div>
          <div className="text-white/70 text-lg md:text-xl font-light tracking-[0.3em]">
            SOLUTIONS
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

// Elegant 3D Pin Card Component
const PinCard = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    setMousePosition({ x: x * 20, y: y * 20 });
  };

  return (
    <div className="relative flex flex-col items-center space-y-8">
      {/* Title above card */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h3 className="text-3xl md:text-4xl font-light text-white/90 mb-2">
          Meet <span className="font-medium text-white">TARA_x1</span>
        </h3>
        <div className="w-16 h-px bg-white/30 mx-auto"></div>
      </motion.div>

      {/* 3D Pin Container */}
      <motion.div
        className="relative w-80 h-[28rem] perspective-1000"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ perspective: '1000px' }}
      >
        {/* Pin at top */}
        <motion.div
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 z-30"
          animate={{
            rotateY: mousePosition.x * 0.3,
            rotateX: -mousePosition.y * 0.3,
          }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
        >
          <div className="relative">
            {/* Pin line */}
            <div className="w-0.5 h-8 bg-white/60 mx-auto"></div>
            {/* Pin head */}
            <div className="w-4 h-4 bg-white/80 rounded-full absolute -top-2 left-1/2 transform -translate-x-1/2 
                           shadow-lg border border-white/20"></div>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          className="relative w-full h-full"
          animate={{
            rotateY: mousePosition.x,
            rotateX: -mousePosition.y,
            scale: isHovered ? 1.02 : 1,
          }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Card Shadow */}
          <motion.div
            className="absolute inset-0 bg-black/40 rounded-3xl blur-2xl transform translate-y-6 scale-95"
            animate={{
              opacity: isHovered ? 0.6 : 0.4,
              scale: isHovered ? 0.98 : 0.95,
            }}
          />

          {/* Main Card Content */}
          <motion.div
            className="relative w-full h-full bg-black/90 backdrop-blur-xl border border-white/10 
                       rounded-3xl overflow-hidden"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Top section with TARA image */}
            <div className="relative h-48 overflow-hidden">
              <img 
                src="/Tara.jpg" 
                alt="TARA AI Agent"
                className="w-full h-full object-cover grayscale filter brightness-110 contrast-110"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
              
              {/* Floating indicator */}
              <motion.div
                className="absolute top-4 right-4 w-3 h-3 bg-white/60 rounded-full"
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>

            {/* Content section */}
            <div className="relative p-6 space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-xl font-medium text-white mb-1">
                  TARA_x1
                </h3>
                <p className="text-white/60 text-sm">
                  AI Conversational Agent
                </p>
              </div>

              {/* Description */}
              <p className="text-white/70 text-sm leading-relaxed">
                Advanced conversational AI that delivers human-like interactions 
                with enterprise-grade security and reliability.
              </p>

              {/* Features - only visible on hover */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ 
                  opacity: isHovered ? 1 : 0, 
                  height: isHovered ? 'auto' : 0 
                }}
                transition={{ duration: 0.3 }}
              >
                {['24/7 Availability', 'Multi-Language', 'Enterprise Security'].map((feature, index) => (
                  <motion.div
                    key={feature}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ 
                      opacity: isHovered ? 1 : 0, 
                      x: isHovered ? 0 : -10 
                    }}
                    transition={{ delay: index * 0.1, duration: 0.2 }}
                  >
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                    <span className="text-white/50 text-xs">{feature}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/5 to-transparent"></div>
            </div>

            {/* URL indicator (like shadcn example) */}
            <motion.div
              className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-sm 
                         border border-white/10 rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1 : 0.8 
              }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-white/70 text-xs font-mono">/ai.davinci.io</span>
            </motion.div>

            {/* Hover overlay with call to action */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-3xl 
                         flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="text-center p-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ 
                  scale: isHovered ? 1 : 0.9, 
                  opacity: isHovered ? 1 : 0 
                }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 
                               rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-white/80" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">
                  Flagship AI Agent
                </h4>
                <p className="text-white/60 text-sm max-w-xs">
                  Experience next-generation conversational AI designed for enterprise excellence.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Process/Roadmap Section
const ProcessSection = () => {
  const { scrollY } = useScroll();
  const yTransform = useTransform(scrollY, [800, 1400], [100, -100]);

  const phases = [
    { id: "01", title: "Humanized Bi-Directional Flow", status: "completed", width: "w-full" },
    { id: "02", title: "Past Semantic Memory", status: "completed", width: "w-full" },
    { id: "03", title: "Multi-Indic Language Model", status: "active", width: "w-4/5" },
    { id: "04", title: "Agentic Architecture", status: "pending", width: "w-1/2" },
    { id: "05", title: "Development of additional styles", status: "pending", width: "w-1/3" },
    { id: "06", title: "Components", status: "pending", width: "w-1/4" },
    { id: "07", title: "First UX / UI", status: "pending", width: "w-1/5" },
    { id: "08", title: "Presentation", status: "pending", width: "w-1/6" }
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
              Roadmap
            </h2>
            <div className="text-white/40 font-mono text-sm">
              Process
            </div>
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

          {/* Right - 3D Pin Card */}
          <motion.div 
            className="flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <PinCard />
          </motion.div>
          
        </div>
      </div>
    </motion.section>
  );
};

// Typography Section
const TypographySection = () => {
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
            {/* Left - Plus icon and Typography label */}
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
                  Typography
                </div>
                
                {/* Team avatars */}
                <div className="flex -space-x-3">
                  {[1,2,3,4,5].map((i) => (
                    <motion.div 
                      key={i} 
                      className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-full border-2 border-black"
                      whileHover={{ scale: 1.2, zIndex: 10 }}
                      transition={{ duration: 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right - Font display */}
            <div className="text-right">
              <div className="text-white/40 font-mono text-sm mb-4">
                What font was used
              </div>
              <h2 className="text-8xl font-light text-white mb-8">
                Suisse Intl
              </h2>
              
              {/* Font samples */}
              <div className="space-y-6 text-left max-w-2xl">
                <div>
                  <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                    Regular
                  </div>
                  <div className="text-white text-2xl font-light">
                    Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
                  </div>
                </div>
                
                <div>
                  <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                    Bold
                  </div>
                  <div className="text-white text-2xl font-bold">
                    Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
                  </div>
                </div>
                
                <div>
                  <div className="text-white/40 font-mono text-xs uppercase tracking-wider mb-2">
                    Numbers
                  </div>
                  <div className="text-white text-3xl font-mono">
                    0123456789
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TextReveal>
      </div>
    </motion.section>
  );
};

// AI Solutions Showcase Section
const SolutionsSection = () => {
  const solutions = [
    { 
      icon: Brain, 
      title: "TARA_x1 AI Agent", 
      description: "Revolutionary customer service AI that handles conversations with human-like intelligence",
      features: ["24/7 Availability", "Multi-language Support", "Context Awareness"],
      color: "from-blue-500 to-cyan-500"
    },
    { 
      icon: Zap, 
      title: "Process Automation", 
      description: "Streamline complex workflows with intelligent automation systems",
      features: ["Workflow Optimization", "Smart Routing", "Real-time Analytics"],
      color: "from-purple-500 to-pink-500"
    },
    { 
      icon: Shield, 
      title: "Enterprise Security", 
      description: "Advanced AI-powered security solutions for enterprise environments",
      features: ["Threat Detection", "Compliance Management", "Risk Assessment"],
      color: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <motion.section className="py-32 relative overflow-hidden bg-white/2">
      <div className="container mx-auto px-16 relative z-10">
        
        <TextReveal>
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-light text-white mb-8">
              AI Solutions
              <br />
              <span className="font-semibold">Portfolio</span>
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Transforming enterprises with cutting-edge artificial intelligence
            </p>
          </div>
        </TextReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              className="group"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
            >
              <div className="p-8 bg-gradient-to-br from-black/50 to-gray-900/50 backdrop-blur-sm 
                            border border-white/10 h-full hover:border-white/30 transition-all duration-500">
                
                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${solution.color} rounded-lg 
                               flex items-center justify-center mb-6 group-hover:scale-110 
                               transition-transform duration-300`}>
                  <solution.icon className="w-8 h-8 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-2xl font-semibold text-white mb-4">
                  {solution.title}
                </h3>
                
                <p className="text-white/70 mb-6 leading-relaxed">
                  {solution.description}
                </p>
                
                {/* Features */}
                <div className="space-y-2 mb-8">
                  {solution.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white/60 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                {/* CTA */}
                <motion.button
                  className="flex items-center gap-2 text-white/80 hover:text-white 
                           font-medium group-hover:translate-x-2 transition-all duration-300"
                  whileHover={{ x: 5 }}
                >
                  Learn More
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
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
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative">
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
        <TypographySection />
        <SolutionsSection />
        <StatsSection />
        <CTASection />
      </div>
    </div>
  );
};

export default MainHomepage;