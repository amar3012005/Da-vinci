import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';

/**
 * ContextProblemSection - Cyberpunk Brutalist Transformation
 * Inspired by Image 0, 1, and 2 with solid colors, grid systems, and industrial layout.
 */
const ContextProblemSection = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <section className="relative py-24 px-6 bg-[#0a0a0a] overflow-hidden min-h-screen flex flex-col justify-center">
            {/* Background Grid - Industrial Schematic Style */}
            <div
                className="absolute inset-0 opacity-[0.1] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Left Vertical Band - Industrial Marking */}
            <div className="absolute top-0 left-0 w-2 h-full bg-[#A63E1B] opacity-50 z-20" />

            {/* Top Metadata - Technical Readout */}
            <div className="absolute top-8 left-10 right-10 flex justify-between font-mono text-[9px] tracking-widest text-[#A63E1B] z-30 font-bold">
                <div className="flex gap-4">
                    <span>SYS_LOAD: 88.4%</span>
                    <span className="text-white/40">CORE_VER: 2.0.5</span>
                </div>
                <div className="flex gap-4">
                    <span>SECTOR_02</span>
                    <span className="animate-pulse">● LIVE_FEED</span>
                </div>
            </div>

            {/* Large Decorative "01" - Outlined Industrial style */}
            <div className="absolute top-1/4 -right-10 text-[200px] font-black leading-none text-white opacity-[0.03] select-none pointer-events-none tracking-tighter">
                01
            </div>

            {/* Diagonal Hatching Pattern (Image 0 Influence) */}
            <div
                className="absolute top-20 right-20 w-32 h-32 opacity-20 pointer-events-none z-0"
                style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #fff, #fff 1px, transparent 1px, transparent 10px)',
                }}
            />

            {/* Main Content Container */}
            <div className="relative z-10 max-w-lg mx-auto w-full">

                {/* Section Header with red block (Image 0/2 style) */}
                <motion.div
                    className="flex items-center gap-0 mb-16"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    <div className="bg-[#A63E1B] text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                        PHASE_01
                    </div>
                    <div className="border border-[#A63E1B] px-3 py-1 text-[10px] font-mono text-white/50">
                        THE_PROBLEM
                    </div>
                </motion.div>

                {/* Brutalist Hero Typography */}
                <motion.div
                    className="mb-16 relative"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Corner Brackets */}
                    <div className="absolute -top-4 -left-4 w-4 h-4 border-t-2 border-l-2 border-[#A63E1B]" />
                    <div className="absolute -bottom-4 -right-4 w-4 h-4 border-b-2 border-r-2 border-[#A63E1B]" />

                    <h2 className="text-[52px] md:text-[80px] font-black uppercase leading-[0.8] tracking-tight text-white flex flex-col">
                        <span className="flex items-center gap-4">
                            GUESS <span className="h-1 flex-1 bg-[#A63E1B]" />
                        </span>
                        <span className="text-[#A63E1B]">HOW WE</span>
                        <span>SOLVE</span>
                        <span className="text-stroke-sm text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.3)' }}>THE CONTEXT</span>
                        <span>PROBLEM</span>
                    </h2>
                </motion.div>

                {/* Sub-Technical Description Block */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-1 pt-1">
                        <div className="w-full h-24 bg-gradient-to-b from-[#A63E1B] via-[#A63E1B] to-transparent" />
                    </div>

                    <motion.div
                        className="col-span-11 space-y-8"
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="space-y-4">
                            <p className="text-xl text-white font-mono leading-none lowercase tracking-tighter">
                                Traditional bots forget everything instantly. <br />
                                <span className="bg-[#A63E1B] text-black px-1 mt-1 inline-block uppercase font-black not-italic">TARA remembers</span>
                            </p>

                            <motion.button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/20 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:border-[#A63E1B] transition-colors group"
                                whileTap={{ scale: 0.95 }}
                            >
                                <Info size={10} className="group-hover:text-[#A63E1B]" />
                                Learn More
                            </motion.button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
                                    [ MMAR ARCHITECTURE ENABLED ]
                                </div>
                                <div className="flex-1 h-[1px] bg-white/10" />
                            </div>

                            {/* Technical Graphic - Image 2 inspiration (Boarding Pass) */}
                            <div className="flex gap-1 h-3">
                                {[...Array(30)].map((_, i) => (
                                    <div key={i} className={`h-full w-[2px] ${i % 3 === 0 ? 'bg-[#A63E1B]' : 'bg-white/10'}`} />
                                ))}
                            </div>

                            {/* Hive Mind Narrative Block */}
                            <div className="mt-8 p-4 border border-white/10 bg-white/[0.02] relative group hover:border-[#A63E1B]/50 transition-colors">
                                <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-[#A63E1B] opacity-40" />
                                <div className="absolute top-2 right-4 flex items-center gap-2">
                                    <span className="text-[7px] font-mono text-[#A63E1B] animate-pulse">HIVE_MIND_ACTIVE</span>
                                    <div className="w-1 h-1 bg-[#A63E1B] rounded-full shadow-[0_0_5px_#A63E1B]" />
                                </div>

                                <p className="text-[11px] font-mono text-white/70 leading-relaxed uppercase tracking-tight">
                                    With our hive mind, every TARA deployment gets smarter. <br />
                                    <span className="text-white font-bold">One company doesn't train; it inherits all global knowledge.</span> <br />
                                    One resolved case becomes a case study for all.
                                </p>
                                <div className="mt-2 text-[6px] font-mono text-white/20 tracking-[0.4em]">SYNC_READY // GLOBAL_UPDATE_AVAILABLE</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Background Metadata (Image 2 style) */}
            <div className="absolute bottom-12 left-12 font-mono text-[9px] text-white/20 uppercase tracking-[0.4em] z-30">
                <div className="flex flex-col gap-1">
                    <div>OBJECT_REF: DATA_LOSS_PREVENTION</div>
                    <div>FREQ_RANGE: 2.4 - 5.8GHZ</div>
                    <div className="flex items-center gap-2">
                        AUTH: <span className="bg-white/10 px-1 text-white/40 font-bold">GRANTED</span>
                    </div>
                </div>
            </div>

            {/* Industrial Scroll Marker */}
            <div className="absolute bottom-10 right-10 flex flex-col items-end gap-2 text-[#A63E1B]">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] rotate-90 origin-right translate-x-12 mt-12 mb-12">SCROLL_DOWN</span>
                <div className="w-[1px] h-20 bg-gradient-to-t from-[#A63E1B] to-transparent" />
            </div>

            {/* Block Corner Numbers */}
            <div className="absolute top-4 left-4 text-[10px] font-black text-white/10">884.02</div>
            <div className="absolute bottom-4 right-4 text-[10px] font-black text-white/10">END_TRANS</div>

            {/* Goldfish Memory Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />

                        <motion.div
                            className="relative w-full max-w-sm bg-[#111] border-2 border-[#A63E1B] p-8 shadow-[10px_10px_0px_rgba(204,41,0,0.2)]"
                            initial={{ y: 50, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 50, opacity: 0, scale: 0.9 }}
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-6">
                                <div className="inline-block bg-[#A63E1B] text-black px-2 py-0.5 text-[10px] font-black uppercase mb-2">
                                    CORE_ANALYSIS
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase leading-none italic">
                                    The Goldfish <br /> Paradox
                                </h3>
                            </div>

                            <div className="space-y-4 font-mono text-xs text-white/60 leading-relaxed capitalize">
                                <div className="flex gap-3">
                                    <div className="w-1 h-3 bg-[#A63E1B] mt-1 shrink-0" />
                                    <p>Traditional AI agents possess a 3-second operational memory. Each session is a blank slate.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-1 h-3 bg-white/20 mt-1 shrink-0" />
                                    <p>This results in infinite repetition, loss of user intent, and robotic frustration.</p>
                                </div>
                                <div className="p-4 bg-white/5 border-l-2 border-[#A63E1B] text-[#A63E1B] font-black italic">
                                    "TARA's MMAR layer creates a persistent semantic shadow, remembering every preference forever."
                                </div>
                            </div>

                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="mt-8 w-full py-3 bg-[#A63E1B] text-black font-black uppercase text-[10px] tracking-[0.2em]"
                            >
                                Close Analyst_Report
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default ContextProblemSection;
