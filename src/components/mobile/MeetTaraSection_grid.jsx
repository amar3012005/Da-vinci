import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Aperture, Phone, Globe, MessageSquare, ArrowRight } from 'lucide-react';

/**
 * MeetTaraSection - Cyber-Brutalist Static Split Screen
 * Left: Static TARA_X1 Visual
 * Right: Digital Grid Slideshow for Variants
 */
const MeetTaraSection = () => {
    const [isLeftHovered, setIsLeftHovered] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const leftPanelRef = useRef(null);

    const variants = [
        { id: 1, label: "Visual Co-pilot", icon: Aperture, desc: "Multimodal Vision Analysis", tag: "V_01" },
        { id: 2, label: "Telephony", icon: Phone, desc: "Real-time Voice Synthesis", tag: "T_02" },
        { id: 3, label: "Webcalls", icon: Globe, desc: "Browser-Native Agents", tag: "W_03" },
        { id: 4, label: "Text", icon: MessageSquare, desc: "LLM Orchestration Layer", tag: "TX_04" }
    ];

    // Auto-advance slideshow
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % variants.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [variants.length]);

    const handleMouseMove = (e) => {
        // Optional mouse tracking logic if needed later
    };

    return (
        <section className="relative h-screen bg-black flex flex-col lg:flex-row overflow-hidden">

            {/* ---------------------------------------------------------
                LEFT PANEL: STATIC CYBER-BRUTALIST TARA_X1 (Presulsed)
                --------------------------------------------------------- */}
            <div
                ref={leftPanelRef}
                onMouseEnter={() => setIsLeftHovered(true)}
                onMouseLeave={() => setIsLeftHovered(false)}
                onMouseMove={handleMouseMove}
                className="lg:w-1/2 h-full relative overflow-hidden bg-black border-r border-white/10 flex flex-col items-center justify-center z-20"
            >
                {/* Corner Minimalist Elements */}
                <div className="absolute top-8 left-8 text-white/40 font-light text-xl select-none">+</div>
                <div className="absolute top-8 right-8 text-white/40 font-light text-xl select-none">+</div>
                <div className="absolute bottom-8 left-8 text-white/40 font-light text-xl select-none">+</div>
                <div className="absolute bottom-8 right-8 text-white/40 font-light text-xl select-none">+</div>

                {/* Vertical Labels */}
                <div className="absolute left-8 top-1/2 -translate-y-1/2 -rotate-90 origin-center whitespace-nowrap">
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em]">
                        ▲ TARA.X1 / CORE_ENGINE
                    </span>
                </div>
                <div className="absolute right-8 top-1/2 -translate-y-1/2 rotate-90 origin-center whitespace-nowrap">
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em]">
                        ▲ SRC.DAVINCI / BUILD.2025
                    </span>
                </div>

                {/* Image & Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/Images/login_page.jpeg"
                        alt="Architected Intelligence"
                        className={`w-full h-full object-cover transition-all duration-1000 grayscale opacity-40 ${isLeftHovered ? "scale-110" : "scale-105"}`}
                    />
                    <div className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: '20px 20px' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-black/90 pointer-events-none" />
                </div>

                {/* Left Content */}
                <div className="relative z-10 p-12 text-center flex flex-col items-center">
                    <div className="mb-12 flex items-center gap-4">
                        <span className="px-2 py-0.5 border border-white/20 text-[9px] font-mono text-white/40 uppercase tracking-widest">
                            ▶ INITIALIZING ◀
                        </span>
                        <div className="w-12 h-px bg-white/20" />
                        <span className="text-white font-mono text-sm tracking-tighter">01</span>
                    </div>

                    <motion.div className={`mb-8 transition-all duration-1000 ${isLeftHovered ? "opacity-100" : "opacity-40"}`}>
                        <img src="/Images/davinci-logo.svg" alt="DA'VINCI" width={120} height={120} className="filter brightness-0 invert" />
                    </motion.div>

                    <div className="space-y-4">
                        <motion.p className="text-white/20 font-mono text-[10px] uppercase tracking-[1.2em] mb-2">
                            PRESENTS
                        </motion.p>
                        <motion.div
                            className="relative inline-block"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex items-start">
                                <h1 className="text-9xl md:text-[14rem] font-black text-white tracking-[-0.05em] leading-[0.75]">
                                    TARA
                                </h1>
                                <div className="ml-4 mt-4 flex flex-col items-start">
                                    <div className="w-8 h-px bg-white mb-2" />
                                    <span className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
                                        _X1
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="mt-20 space-y-4">
                        <h3 className="text-white font-mono text-[10px] uppercase tracking-[0.5em] opacity-40">
                            // ARCHITECTED FOR SCALE
                        </h3>
                        <div className="flex gap-8 justify-center items-center">
                            <div className="text-center">
                                <div className="text-white text-xl font-light">99.9%</div>
                                <div className="text-white/20 font-mono text-[8px] uppercase tracking-widest mt-1">Uptime</div>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <div className="text-white text-xl font-light">&lt;50ms</div>
                                <div className="text-white/20 font-mono text-[8px] uppercase tracking-widest mt-1">Latency</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------------------------------------------------------
                RIGHT PANEL: DIGITAL GRID SLIDESHOW
                --------------------------------------------------------- */}
            <div className="lg:w-1/2 h-full bg-[#050505] relative flex items-center justify-center overflow-hidden">

                {/* 1. Digital Grid Background */}
                <DigitalGridOverlay />

                {/* 2. Content Container */}
                <div className="relative z-10 w-full max-w-xl px-12">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            transition={{ duration: 0.5, ease: "circOut" }}
                            className="flex flex-col gap-8"
                        >
                            {/* Variant Tag Badge */}
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-white animate-pulse" />
                                <span className="font-mono text-xs text-white/50 border border-white/20 px-2 py-1 rounded-sm tracking-widest bg-black/50 backdrop-blur-sm">
                                    ./ VARIANT_{variants[currentIndex].tag}
                                </span>
                            </div>

                            {/* Main Title */}
                            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none mix-blend-difference">
                                {variants[currentIndex].label.split(" ").map((word, i) => (
                                    <span key={i} className="block">{word}</span>
                                ))}
                            </h2>

                            {/* Description & Icon */}
                            <div className="flex items-center gap-6 border-t border-white/20 pt-8 mt-4">
                                <div className="p-4 border border-white/30 rounded-full bg-white/5 backdrop-blur-md">
                                    {React.createElement(variants[currentIndex].icon, { size: 32, className: "text-white" })}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest mb-1">
                                        // SYSTEM CAPABILITY
                                    </span>
                                    <span className="text-white text-lg font-light tracking-tight">
                                        {variants[currentIndex].desc}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Progress Indicators */}
                    <div className="absolute -bottom-32 left-12 flex gap-2">
                        {variants.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1 transition-all duration-300 ${idx === currentIndex ? "w-12 bg-white" : "w-4 bg-white/20"}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// Component for the flickering grid effect
const DigitalGridOverlay = () => {
    // Generate a fixed number of grid cells (e.g., 10x10 or so to cover screen)
    // We'll use a flex container with wrap to fill the space
    const rows = 12;
    const cols = 12;
    const totalCells = rows * cols;

    return (
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-1 p-1 pointer-events-none opacity-30">
            {Array.from({ length: totalCells }).map((_, i) => (
                <GridCell key={i} />
            ))}
        </div>
    );
};

const GridCell = () => {
    const [opacity, setOpacity] = useState(0.1);

    useEffect(() => {
        // Randomly change opacity at random intervals
        const randomize = () => {
            const chance = Math.random();
            // 10% chance to be "active" (white/grey), 90% chance to be dim/off
            const newOpacity = chance > 0.8 ? Math.random() * 0.5 + 0.1 : 0.05;
            setOpacity(newOpacity);
        };

        const interval = setInterval(randomize, Math.random() * 2000 + 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="w-full h-full border border-white/20 rounded-[2px] bg-white transition-opacity duration-1000"
            style={{ opacity }}
        />
    );
};

export default MeetTaraSection;
