import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion';

/**
 * PhaseOneBrandSection
 * Enhanced with sophisticated scroll-triggered animations and parallax effects
 * Monochromatic theme: #EBE5DF, #0a0a0a, #050505
 */
const PhaseOneBrandSection = () => {
    const sectionRef = useRef(null);
    const prefersReducedMotion = useReducedMotion();

    // Scroll progress tracking for the entire section
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    // Smooth spring-based scroll progress for fluid animations
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Parallax transforms for background text elements
    // BRAND moves slower (subtle depth)
    const brandY = useTransform(smoothProgress, [0, 1], ["0%", "-15%"]);
    const brandX = useTransform(smoothProgress, [0, 1], ["0%", "5%"]);
    const brandOpacity = useTransform(smoothProgress, [0, 0.3, 0.7, 1], [0.3, 0.95, 0.95, 0.3]);

    // VOICE moves faster (more depth, opposite direction)
    const voiceY = useTransform(smoothProgress, [0, 1], ["0%", "20%"]);
    const voiceX = useTransform(smoothProgress, [0, 1], ["0%", "-8%"]);
    const voiceOpacity = useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0.2, 0.95, 0.95, 0.2]);

    // Card entrance parallax - subtle float effect
    const cardY = useTransform(smoothProgress, [0, 0.5, 1], [60, 0, -30]);
    const cardRotateX = useTransform(smoothProgress, [0, 0.5, 1], [8, 0, -4]);

    // Staggered animation variants for card content
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.12,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { 
            opacity: 0, 
            y: prefersReducedMotion ? 0 : 30,
            filter: prefersReducedMotion ? "none" : "blur(10px)"
        },
        visible: { 
            opacity: 1, 
            y: 0,
            filter: "blur(0px)",
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 20,
                mass: 1
            }
        }
    };

    // Background text animation variants
    const bgTextVariants = {
        hidden: { 
            opacity: 0, 
            scale: prefersReducedMotion ? 1 : 0.9,
            letterSpacing: prefersReducedMotion ? "-0.02em" : "0.1em"
        },
        visible: { 
            opacity: 1, 
            scale: 1,
            letterSpacing: "-0.02em",
            transition: {
                duration: 1.2,
                ease: [0.16, 1, 0.3, 1]
            }
        }
    };

    // Magnetic button effect
    const handleMouseMove = (e, setTransform) => {
        if (prefersReducedMotion) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        setTransform({ x: x * 0.2, y: y * 0.2 });
    };

    const [buttonTransform, setButtonTransform] = React.useState({ x: 0, y: 0 });

    return (
        <section 
            ref={sectionRef}
            id="phase-one-brand-section" 
            className="relative py-28 sm:py-40 px-4 sm:px-6 overflow-hidden bg-[#050505]"
        >
            {/* Scroll Progress Indicator - Top edge */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5 z-50">
                <motion.div 
                    className="h-full bg-gradient-to-r from-[#EBE5DF]/60 via-[#EBE5DF] to-[#EBE5DF]/60"
                    style={{ 
                        scaleX: smoothProgress, 
                        transformOrigin: "left"
                    }}
                />
            </div>

            {/* Background Base */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]" />

            {/* Animated gradient mesh background */}
            <motion.div 
                className="absolute inset-0 opacity-30"
                style={{
                    background: "radial-gradient(ellipse at 30% 20%, rgba(235,229,223,0.03) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(235,229,223,0.02) 0%, transparent 50%)"
                }}
                animate={{
                    opacity: [0.2, 0.4, 0.2]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Subtle diagonal streaks with parallax */}
            <motion.div 
                className="absolute inset-0 opacity-[0.08]"
                style={{
                    y: useTransform(smoothProgress, [0, 1], ["0%", "-10%"]),
                    backgroundImage: `repeating-linear-gradient(
                        60deg,
                        rgba(255,255,255,0.03) 0px,
                        rgba(255,255,255,0.03) 1px,
                        transparent 1px,
                        transparent 8px
                    )`
                }}
            />

            {/* Dynamic Orbs with scroll-linked movement */}
            <motion.div 
                className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px]"
                style={{
                    y: useTransform(smoothProgress, [0, 1], ["0%", "-20%"]),
                    x: useTransform(smoothProgress, [0, 1], ["0%", "10%"])
                }}
            />
            <motion.div 
                className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#a8c7fa]/[0.02] rounded-full blur-[100px]"
                style={{
                    y: useTransform(smoothProgress, [0, 1], ["0%", "15%"]),
                    x: useTransform(smoothProgress, [0, 1], ["0%", "-10%"])
                }}
            />

            {/* Background solid text -> BRAND & VOICE with parallax */}
            <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
                <div className="relative w-full h-full">
                    {/* BRAND - Top Left with parallax */}
                    <motion.h1 
                        className="absolute text-[26vw] sm:text-[15vw] font-bold text-[#EBE5DF] tracking-tighter leading-none select-none top-[6%] sm:top-[4%] left-[-4%] sm:left-[-2%] mix-blend-normal"
                        style={{
                            y: brandY,
                            x: brandX,
                            opacity: brandOpacity
                        }}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-20%" }}
                        variants={bgTextVariants}
                    >
                        BRAND
                    </motion.h1>

                    {/* VOICE - Bottom Right with parallax (opposite direction) */}
                    <motion.h1 
                        className="absolute text-[26vw] sm:text-[15vw] font-bold text-[#EBE5DF] tracking-tighter leading-none select-none bottom-[6%] sm:bottom-[4%] right-[-4%] sm:right-[-2%] mix-blend-normal text-right"
                        style={{
                            y: voiceY,
                            x: voiceX,
                            opacity: voiceOpacity
                        }}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-20%" }}
                        variants={bgTextVariants}
                    >
                        VOICE
                    </motion.h1>
                </div>
            </div>

            {/* Centered TARA Card with scroll-linked transforms */}
            <div className="relative z-10 flex items-center justify-center min-h-[500px] sm:min-h-[600px] mt-10">
                <motion.div
                    className="w-full max-w-[380px] sm:max-w-[420px]"
                    style={{
                        y: prefersReducedMotion ? 0 : cardY,
                        rotateX: prefersReducedMotion ? 0 : cardRotateX,
                        transformPerspective: 1000
                    }}
                    initial={{ opacity: 0, y: 60, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ 
                        duration: 1,
                        ease: [0.22, 1, 0.36, 1]
                    }}
                >
                    {/* Card Container */}
                    <motion.div 
                        className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] group transition-colors duration-500"
                        whileHover={{ 
                            borderColor: "rgba(255,255,255,0.15)",
                            boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(235,229,223,0.1)"
                        }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* 1. Image / Logo Area */}
                        <motion.div 
                            className="relative h-64 sm:h-72 overflow-hidden bg-gradient-to-b from-[#161618] to-[#0a0a0a]"
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            {/* Inner Carbon Pattern */}
                            <div className="absolute inset-0 opacity-40 mix-blend-overlay"
                                style={{
                                    backgroundImage: `repeating-linear-gradient(
                                        45deg,
                                        rgba(255,255,255,0.04) 0px,
                                        rgba(255,255,255,0.04) 1px,
                                        transparent 1px,
                                        transparent 5px
                                    )`
                                }}
                            />

                            {/* Center Glow with pulse */}
                            <motion.div 
                                className="absolute inset-0 flex items-center justify-center"
                                animate={{
                                    opacity: [0.5, 0.8, 0.5],
                                    scale: [1, 1.05, 1]
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                <div className="w-48 h-48 bg-white/[0.03] rounded-full blur-2xl" />
                            </motion.div>

                            {/* Corner Accents with staggered reveal */}
                            <motion.div 
                                className="absolute top-5 left-5 w-4 h-4 border-l-[1.5px] border-t-[1.5px] border-white/20"
                                variants={itemVariants}
                            />
                            <motion.div 
                                className="absolute top-5 right-5 w-4 h-4 border-r-[1.5px] border-t-[1.5px] border-white/20"
                                variants={itemVariants}
                            />
                            <motion.div 
                                className="absolute bottom-5 left-5 w-4 h-4 border-l-[1.5px] border-b-[1.5px] border-white/20"
                                variants={itemVariants}
                            />
                            <motion.div 
                                className="absolute bottom-5 right-5 w-4 h-4 border-r-[1.5px] border-b-[1.5px] border-white/20"
                                variants={itemVariants}
                            />

                            {/* Tagline with fade-up */}
                            <motion.div 
                                className="absolute top-6 left-6"
                                variants={itemVariants}
                            >
                                <p className="text-[11px] sm:text-[12px] text-white/50 font-light tracking-wide">
                                    Your digital presence, amplified.
                                </p>
                            </motion.div>

                            {/* Perfect Scalable TΛRΛ SVG Logo with entrance animation */}
                            <motion.div 
                                className="absolute inset-0 flex items-center justify-center"
                                variants={itemVariants}
                            >
                                <motion.svg 
                                    viewBox="0 0 160 80" 
                                    className="w-[180px] sm:w-[200px] h-auto drop-shadow-2xl" 
                                    fill="none" 
                                    xmlns="http://www.w3.org/2000/svg"
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    <motion.g 
                                        stroke="rgba(255,255,255,0.85)" 
                                        strokeWidth="2.5" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="miter"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        whileInView={{ pathLength: 1, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                                    >
                                        {/* T (Thick detached floating bar & thin stem) */}
                                        <line x1="12" y1="16" x2="42" y2="16" stroke="white" strokeWidth="3" />
                                        <line x1="27" y1="28" x2="27" y2="70" />

                                        {/* A (Lambda style Λ) */}
                                        <line x1="68" y1="16" x2="48" y2="70" />
                                        <line x1="68" y1="16" x2="88" y2="70" />

                                        {/* R */}
                                        <line x1="105" y1="16" x2="105" y2="70" />
                                        <path d="M 105 16 H 122 C 128 16 128 36 122 36 H 105" />
                                        <line x1="112" y1="36" x2="128" y2="70" />

                                        {/* A (Lambda style Λ) */}
                                        <line x1="148" y1="16" x2="128" y2="70" />
                                        <line x1="148" y1="16" x2="168" y2="70" />
                                    </motion.g>
                                </motion.svg>
                            </motion.div>
                        </motion.div>

                        {/* 2. Content Area with staggered animations */}
                        <motion.div 
                            className="relative p-6 sm:p-8 pt-8"
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            {/* Title with kinetic reveal */}
                            <motion.h2 
                                className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-3"
                                variants={itemVariants}
                            >
                                <motion.span
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    Meet TARA.
                                </motion.span>
                            </motion.h2>

                            {/* Description with blur reveal */}
                            <motion.p 
                                className="text-[13px] sm:text-[14px] text-white/50 leading-relaxed mb-8 font-light max-w-sm"
                                variants={itemVariants}
                            >
                                Your brand's first employee. She engages, qualifies, and converts—
                                in your voice, across web, calls, and video.
                            </motion.p>

                            {/* Oval CTA Button with magnetic effect */}
                            <motion.button 
                                className="group relative flex items-center justify-between w-full sm:w-auto px-6 py-3.5 rounded-full border border-white/20 bg-[#121212] overflow-hidden"
                                variants={itemVariants}
                                onMouseMove={(e) => handleMouseMove(e, setButtonTransform)}
                                onMouseLeave={() => setButtonTransform({ x: 0, y: 0 })}
                                whileHover={{ 
                                    scale: 1.02,
                                    borderColor: "rgba(255,255,255,0.4)"
                                }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                                {/* Hover glow effect */}
                                <motion.div 
                                    className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{
                                        x: buttonTransform.x,
                                        y: buttonTransform.y
                                    }}
                                />
                                <span className="relative text-[11px] text-white/80 uppercase tracking-[0.2em] font-medium pl-1 group-hover:text-white transition-colors duration-300">
                                    Start Conversation
                                </span>
                                <motion.svg 
                                    width="14" 
                                    height="14" 
                                    className="relative w-4 h-4 text-white/50 group-hover:text-white/90 ml-4" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                    animate={{ x: [0, 3, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                                </motion.svg>
                            </motion.button>

                            {/* Bottom Divider / Footer Specs with stagger */}
                            <motion.div 
                                className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between"
                                variants={itemVariants}
                            >
                                <motion.div 
                                    className="flex items-center"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                >
                                    <span className="text-[10px] text-white/50 font-mono tracking-widest font-semibold uppercase hover:text-white/70 transition-colors cursor-default">
                                        DaVinci
                                    </span>
                                </motion.div>

                                <div className="flex items-center gap-2 sm:gap-3">
                                    {["WEB", "VOICE", "VIDEO"].map((item, index) => (
                                        <React.Fragment key={item}>
                                            <motion.span 
                                                className="text-[9px] sm:text-[10px] text-white/40 font-mono tracking-widest hover:text-white/60 transition-colors cursor-default"
                                                initial={{ opacity: 0, y: 10 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                                                whileHover={{ y: -2 }}
                                            >
                                                {item}
                                            </motion.span>
                                            {index < 2 && (
                                                <span className="text-[9px] sm:text-[10px] text-white/20">+</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>

                    </motion.div>
                </motion.div>
            </div>

            {/* Bottom scroll indicator */}
            <motion.div 
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1, duration: 0.6 }}
            >
                <motion.div
                    className="w-[1px] h-8 bg-gradient-to-b from-transparent via-white/30 to-transparent"
                    animate={{ scaleY: [1, 0.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
            </motion.div>
        </section>
    );
};

export default PhaseOneBrandSection;
