import React from 'react';
import { motion } from 'framer-motion';

/**
 * PhaseOneBrandSection
 * Transformed into technical grid system design - night mode greyscale theme
 * Inspired by logo design grid construction aesthetics
 */
const PhaseOneBrandSection = () => {
    const moments = [
        {
            title: 'On your website',
            label: 'Visual Co-Pilot',
            copy: 'TARA engages visitors before they bounce and guides them to the exact next step.',
            angle: '68.2°',
            ratio: '4x'
        },
        {
            title: 'On the phone',
            label: 'Telephony',
            copy: 'TARA qualifies inbound calls in your brand voice and routes high-intent leads fast.',
            angle: '25.7°',
            ratio: '3x'
        },
        {
            title: 'Face to face',
            label: 'Webcalls',
            copy: 'TARA joins live conversations, answers in real time, and keeps every detail in context.',
            angle: '111.8°',
            ratio: '2x'
        }
    ];

    return (
        <section id="phase-one-brand-section" className="relative py-24 px-6 bg-[#050505] overflow-hidden">
            {/* Technical grid background */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Fine grid lines */}
                <div className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)
                        `,
                        backgroundSize: '24px 24px'
                    }}
                />
                
                {/* Diagonal construction lines */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 400 800" preserveAspectRatio="none">
                    <defs>
                        <pattern id="diagonalLines" patternUnits="userSpaceOnUse" width="400" height="800">
                            <line x1="0" y1="0" x2="400" y2="800" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                            <line x1="400" y1="0" x2="0" y2="800" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                            <line x1="200" y1="0" x2="400" y2="400" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                            <line x1="0" y1="0" x2="200" y2="800" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#diagonalLines)" />
                </svg>

                {/* Horizontal measurement lines */}
                <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </div>

            {/* Hatched measurement blocks - corners */}
            <div className="absolute top-8 left-8 w-12 h-3 opacity-40 pointer-events-none"
                style={{
                    backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 2px, transparent 2px, transparent 4px)',
                    backgroundSize: '8px 8px'
                }}
            />
            <div className="absolute top-8 right-8 w-8 h-8 opacity-40 pointer-events-none"
                style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 2px, transparent 2px, transparent 4px)',
                    backgroundSize: '8px 8px'
                }}
            />
            <div className="absolute bottom-8 left-8 w-10 h-4 opacity-40 pointer-events-none"
                style={{
                    backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 2px, transparent 2px, transparent 4px)',
                    backgroundSize: '8px 8px'
                }}
            />
            <div className="absolute bottom-8 right-8 w-6 h-6 opacity-40 pointer-events-none"
                style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 2px, transparent 2px, transparent 4px)',
                    backgroundSize: '8px 8px'
                }}
            />

            {/* Measurement annotations */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-white/30 tracking-widest">4x</div>
            <div className="absolute top-20 left-4 text-[8px] font-mono text-white/30 tracking-widest">3x</div>
            <div className="absolute top-32 left-2 text-[7px] font-mono text-white/25 tracking-widest">x</div>
            <div className="absolute bottom-32 right-4 text-[8px] font-mono text-white/30 tracking-widest">x</div>

            {/* Arc indicators */}
            <svg className="absolute top-40 right-12 w-16 h-16 opacity-30 pointer-events-none" viewBox="0 0 64 64">
                <path d="M 32 32 L 48 16 A 22 22 0 0 1 56 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <text x="42" y="28" fontSize="6" fill="rgba(255,255,255,0.4)" fontFamily="monospace">68.2°</text>
            </svg>
            <svg className="absolute bottom-48 right-8 w-20 h-20 opacity-30 pointer-events-none" viewBox="0 0 80 80">
                <path d="M 40 40 L 60 60 A 28 28 0 0 1 68 52" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                <text x="52" y="58" fontSize="6" fill="rgba(255,255,255,0.4)" fontFamily="monospace">25.7°</text>
            </svg>

            {/* Center content */}
            <div className="relative z-10 max-w-md mx-auto">
                {/* Header with technical framing */}
                <motion.div
                    className="mb-12"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    {/* Top frame line */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
                        <p className="text-[8px] text-white/30 uppercase tracking-[0.5em] font-mono">Phase 1 / Brand Reframe</p>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
                    </div>

                    {/* Main heading with grid overlay effect */}
                    <div className="relative">
                        <h2 className="text-3xl font-extralight text-white/90 leading-tight text-center">
                            Most websites wait.
                            <br />
                            <span className="font-medium text-white">TARA doesn&apos;t.</span>
                        </h2>
                        {/* Subtle grid overlay on heading */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                            style={{
                                backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                                backgroundSize: '16px 16px'
                            }}
                        />
                    </div>

                    <p className="mt-5 text-[11px] text-white/50 leading-relaxed text-center font-light tracking-wide">
                        TARA is your brand&apos;s first employee across web, calls, and video.
                        <br />
                        <span className="text-white/60">She starts the first conversation before your best lead leaves.</span>
                    </p>
                </motion.div>

                {/* The Enemy - Technical box */}
                <motion.div
                    className="relative mb-10 p-6 border border-white/15 bg-white/[0.01]"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.05 }}
                >
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-white/30" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-white/30" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-white/30" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-white/30" />

                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-px bg-white/30" />
                        <p className="text-[9px] uppercase tracking-[0.4em] text-white/35 font-mono">The enemy</p>
                        <div className="w-8 h-px bg-white/30" />
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed font-light">
                        The passive website. The bot that waits to be asked. The lead that leaves unseen.
                    </p>
                </motion.div>

                {/* Three moments with technical card design */}
                <div className="space-y-5">
                    {moments.map((item, idx) => (
                        <motion.div
                            key={item.label}
                            className="relative group"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            {/* Card container with technical styling */}
                            <div className="relative p-5 border border-white/12 bg-gradient-to-r from-white/[0.02] to-transparent overflow-hidden">
                                {/* Left accent bar with hatched pattern */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 opacity-50"
                                    style={{
                                        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 3px)',
                                        backgroundSize: '4px 8px'
                                    }}
                                />

                                {/* Measurement markers */}
                                <div className="absolute top-2 right-3 text-[7px] font-mono text-white/25">{item.ratio}</div>
                                
                                {/* Content */}
                                <div className="pl-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-px w-6 bg-white/20" />
                                        <p className="text-[8px] uppercase tracking-[0.4em] text-white/40 font-mono">{item.title}</p>
                                    </div>
                                    <h3 className="text-white text-base font-medium mb-2 tracking-wide">{item.label}</h3>
                                    <p className="text-white/55 text-[11px] leading-relaxed font-light">{item.copy}</p>
                                </div>

                                {/* Subtle diagonal line accent */}
                                <svg className="absolute bottom-0 right-0 w-24 h-12 opacity-[0.08] pointer-events-none" viewBox="0 0 96 48">
                                    <line x1="0" y1="48" x2="96" y2="0" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                                </svg>
                            </div>

                            {/* Angle annotation */}
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-[7px] font-mono text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.angle}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom technical divider */}
                <motion.div
                    className="mt-12 flex items-center justify-center gap-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/15" />
                    <div className="w-1.5 h-1.5 rotate-45 border border-white/30" />
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/15" />
                </motion.div>
            </div>
        </section>
    );
};

export default PhaseOneBrandSection;

