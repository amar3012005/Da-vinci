import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import TaraCardStack from './ui/TaraCardStack';
import { TaraBentoStats } from './ui/TaraBentoStats';

/**
 * MeetTaraSection - "Meet TARA" section with header, animation, and CTAs
 */
const MeetTaraSection = () => {
    return (
        <section id="meet-tara-section" className="py-16 px-4 relative overflow-hidden">
            {/* Dotted Background Pattern */}
            <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                }}
            />

            {/* Gradient Overlay - flows left to right */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0, x: -100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                    background: 'linear-gradient(90deg, rgba(236,72,153,0.05) 0%, rgba(139,92,246,0.08) 50%, transparent 100%)',
                }}
            />

            <div className="relative z-10">
                {/* Section Header - moved down with more padding */}
                <motion.div
                    className="mb-8 pt-4"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <div className="text-white/40 font-mono text-[10px] mb-1">02</div>
                            <div className="w-px h-6 bg-white/20" />
                        </div>
                        <h2 className="text-2xl font-light text-white text-center flex-1">
                            ~/ Meet TARA
                        </h2>
                        <div className="text-white/40 font-mono text-[10px]">
                            AI Agent
                        </div>
                    </div>
                </motion.div>

                {/* Context Problem Statement */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.08 }}
                >
                    <h3 className="text-lg font-light text-white leading-relaxed mb-3">
                        We solve the{' '}
                        <span className="inline-block px-3 py-0.5 bg-pink-500 text-white font-medium transform -skew-x-12">
                            <span className="inline-block transform skew-x-12">context problem</span>
                        </span>
                        {' '}faced by most voice agents.
                    </h3>
                    <p className="text-xs text-white/50 leading-relaxed mb-4">
                        Powered by our revolutionary{' '}
                        <span className="inline-block px-2 py-0.5 bg-pink-500/80 text-white text-[10px] font-medium transform -skew-x-12">
                            <span className="inline-block transform skew-x-12">M M A R</span>
                        </span>
                        {' '}architecture — delivering intelligent, contextual conversations in real-time.
                    </p>

                    {/* Tag Pills */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {['< 500ms Latency', 'Context-Aware', 'Self-Learning'].map((tag) => (
                            <span
                                key={tag}
                                className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-white/70"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </motion.div>

                {/* Animated Card Stack - TARA Agents Showcase */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <TaraCardStack />
                </motion.div>

                {/* Animated Gradient Bento Stats */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <TaraBentoStats />
                </motion.div>

                {/* Founder Card */}
                <motion.div
                    className="relative bg-white/[0.03] border border-white/10 p-6 mt-8 mx-2"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                >
                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/30" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/30" />

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 border border-white/20 flex items-center justify-center shrink-0">
                            <Plus size={16} className="text-white/40" />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">FOUNDER</div>
                                <div className="text-white font-mono text-sm">AMAR SAI</div>
                                <div className="text-white/50 font-mono text-[10px]">B.Tech, LUH // Hannover, Germany</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-mono text-white/60">
                                    <span className="text-white/30">EMAIL /</span> amarsai2005@gmail.com
                                </div>
                                <div className="text-[10px] font-mono text-white/60">
                                    <span className="text-white/30">PHONE /</span> +49 157 811 62785  /  +91 630 180 5656
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default MeetTaraSection;
