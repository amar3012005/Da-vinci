import React from 'react';
import { motion } from 'framer-motion';

/**
 * PhaseOneBrandSection
 * Redesigned with solid bold background text overlay
 * Exact matching of Card.jpeg aesthetic with crisp scalable TΛRΛ SVG
 */
const PhaseOneBrandSection = () => {
    return (
        <section id="phase-one-brand-section" className="relative py-28 sm:py-40 px-4 sm:px-6 overflow-hidden bg-[#050505]">
            {/* Background Base */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]" />

            {/* Subtle diagonal streaks */}
            <div className="absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        60deg,
                        rgba(255,255,255,0.03) 0px,
                        rgba(255,255,255,0.03) 1px,
                        transparent 1px,
                        transparent 8px
                    )`
                }}
            />

            {/* Dynamic Orbs */}
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#a8c7fa]/[0.02] rounded-full blur-[100px]" />

            {/* Background solid text -> BRAND VOICE */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
                <h1 className="text-[20vw] sm:text-[14vw] font-bold text-[#EBE5DF] tracking-tighter leading-none whitespace-nowrap select-none text-center">
                    BRAND VOICE
                </h1>
            </div>

            {/* Centered TARA Card */}
            <div className="relative z-10 flex items-center justify-center min-h-[500px] sm:min-h-[600px] mt-10">
                <motion.div
                    className="w-full max-w-[380px] sm:max-w-[420px]"
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* Card Container */}
                    <div className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] group hover:border-white/15 transition-colors duration-500">

                        {/* 1. Image / Logo Area */}
                        <div className="relative h-64 sm:h-72 overflow-hidden bg-gradient-to-b from-[#161618] to-[#0a0a0a]">
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

                            {/* Center Glow */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-48 h-48 bg-white/[0.03] rounded-full blur-2xl" />
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute top-5 left-5 w-4 h-4 border-l-[1.5px] border-t-[1.5px] border-white/20" />
                            <div className="absolute top-5 right-5 w-4 h-4 border-r-[1.5px] border-t-[1.5px] border-white/20" />
                            <div className="absolute bottom-5 left-5 w-4 h-4 border-l-[1.5px] border-b-[1.5px] border-white/20" />
                            <div className="absolute bottom-5 right-5 w-4 h-4 border-r-[1.5px] border-b-[1.5px] border-white/20" />

                            {/* Tagline */}
                            <div className="absolute top-6 left-6">
                                <p className="text-[11px] sm:text-[12px] text-white/50 font-light tracking-wide">
                                    Your digital presence, amplified.
                                </p>
                            </div>

                            {/* Perfect Scalable TΛRΛ SVG Logo */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg viewBox="0 0 160 80" className="w-[180px] sm:w-[200px] h-auto drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="miter">
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
                                    </g>
                                </svg>
                            </div>
                        </div>

                        {/* 2. Content Area */}
                        <div className="relative p-6 sm:p-8 pt-8">
                            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-3">
                                Meet TARA.
                            </h2>

                            <p className="text-[13px] sm:text-[14px] text-white/50 leading-relaxed mb-8 font-light max-w-sm">
                                Your brand's first employee. She engages, qualifies, and converts—
                                in your voice, across web, calls, and video.
                            </p>

                            {/* Oval CTA Button */}
                            <button className="group relative flex items-center justify-between w-full sm:w-auto px-6 py-3.5 rounded-full border border-white/20 bg-[#121212] hover:bg-white/[0.04] hover:border-white/30 transition-all duration-300">
                                <span className="text-[11px] text-white/80 uppercase tracking-[0.2em] font-medium pl-1">
                                    Start Conversation
                                </span>
                                <svg width="14" height="14" className="w-4 h-4 text-white/50 group-hover:text-white/90 group-hover:translate-x-1 transition-all ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {/* Bottom Divider / Footer Specs */}
                            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-[10px] text-white/50 font-mono tracking-widest font-semibold uppercase">DaVinci</span>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-[9px] sm:text-[10px] text-white/40 font-mono tracking-widest">WEB</span>
                                    <span className="text-[9px] sm:text-[10px] text-white/20">+</span>
                                    <span className="text-[9px] sm:text-[10px] text-white/40 font-mono tracking-widest">VOICE</span>
                                    <span className="text-[9px] sm:text-[10px] text-white/20">+</span>
                                    <span className="text-[9px] sm:text-[10px] text-white/40 font-mono tracking-widest">VIDEO</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default PhaseOneBrandSection;
