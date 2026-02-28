import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { ArrowRight, Mail, User, Building, Cpu, Globe } from 'lucide-react'; // Unused labels

/**
 * MeetTaraSection - Redesigned in "Next.js core graphic style" (Black & White)
 * Inspired by the Enterprise Login template.
 * 
 * This section provides a high-contrast, professional introduction to TARA,
 * replacing the previous neon/gradient aesthetic with a monochromatic, 
 * utilitarian layout.
 */
const MeetTaraSection = () => {
    const [isLeftHovered, setIsLeftHovered] = useState(false);
    const leftPanelRef = useRef(null);
    const sectionRef = useRef(null);

    const variants = ["./Visual Co-Pilot", "./Telephony", "./Webcalls", "./Chat-Assistant"];
    const [variantIndex, setVariantIndex] = useState(0);

    // Variants variant slideshow interval
    useEffect(() => {
        const interval = setInterval(() => {
            setVariantIndex((prev) => (prev + 1) % variants.length);
        }, 3000);

        return () => {
            clearInterval(interval);
        };
    }, [variants.length]);

    const handleMouseMove = (e) => {
        if (leftPanelRef.current) {
            // Mouse move interaction can be added here
        }
    };

    return (
        <section
            id="meet-tara-section"
            ref={sectionRef}
            className="min-h-screen relative overflow-hidden bg-black flex items-stretch"
        >
            {/* Background Grain/Texture (Subtle Next.js Graphic Style) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3BaseFilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/baseFilter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            <div className="relative z-10 w-full flex flex-col lg:flex-row overflow-hidden">

                {/* Left Panel: High-Impact Visual */}
                <div
                    ref={leftPanelRef}
                    onMouseEnter={() => setIsLeftHovered(true)}
                    onMouseLeave={() => setIsLeftHovered(false)}
                    onMouseMove={handleMouseMove}
                    className="relative w-full lg:w-1/2 min-h-[60vh] lg:min-h-screen overflow-hidden bg-black border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-center"
                >
                    <div className="absolute inset-0">
                        <img
                            src="/images/login_page.jpeg"
                            alt="Architected Intelligence"
                            className={`w-full h-full object-cover transition-all duration-1000 grayscale opacity-60 ${isLeftHovered ? "scale-110" : "scale-105"}`}
                        />
                    </div>

                    {/* Overlay Gradient Matching Login Template */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />

                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-12 text-center">
                        <motion.div
                            className={`mb-8 transition-all duration-1000 ${isLeftHovered ? "opacity-100" : "opacity-40"}`}
                        >
                            <img
                                src="/images/davinci-logo.svg"
                                alt="DA'VINCI"
                                width={80}
                                height={80}
                                className="filter brightness-0 invert"
                            />
                        </motion.div>

                        <div className="space-y-4 relative z-0">
                            <motion.p
                                className="text-white/30 font-mono text-[10px] uppercase tracking-[1em]"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                PRESENTS
                            </motion.p>
                            <motion.div
                                className="flex justify-center mt-2"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                <img
                                    src="/TARA_X1.svg"
                                    alt="TARA_X1"
                                    className="w-[280px] md:w-[500px] h-auto filter brightness-0 invert opacity-90 drop-shadow-2xl"
                                />
                            </motion.div>
                        </div>

                        <div className="mt-20 space-y-4">
                            <h3 className="text-white font-mono text-[10px] uppercase tracking-[0.5em] opacity-40">
                                {"// ARCHITECTED FOR SCALE"}
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

                    {/* Top Left Label */}
                    <div className="absolute top-8 left-8 z-20">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest italic">Live / Enterprise</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Centered Variant Slideshow */}
                <div className="relative w-full lg:w-1/2 p-8 lg:p-16 flex flex-col items-center justify-center bg-transparent lg:bg-[#0d0d0d] min-h-[40vh] lg:min-h-screen">
                    <div className="w-full text-center">
                        <div className="mb-4">
                            <span className="text-white/20 font-mono text-[10px] uppercase tracking-[0.5em]">
                                CORE CAPABILITIES
                            </span>
                        </div>

                        <div className="h-24 md:h-32 flex items-center justify-center overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={variants[variantIndex]}
                                    initial={{ y: 20, opacity: 0, scale: 0.95 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    exit={{ y: -20, opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                    className="text-4xl md:text-5xl lg:text-7xl font-bold lg:font-thin text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40 tracking-tighter drop-shadow-lg"
                                >
                                    {variants[variantIndex]}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="mt-8 md:mt-12 flex justify-center gap-3">
                            {variants.map((_, i) => (
                                <motion.div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-500 ${i === variantIndex ? "bg-white w-8 shadow-[0_0_10px_rgba(255,255,255,0.8)]" : "bg-white/20 w-1.5"}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MeetTaraSection;
