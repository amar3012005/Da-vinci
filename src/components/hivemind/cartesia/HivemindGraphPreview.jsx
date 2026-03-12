import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Globe, Search, Database, Cpu, MessageSquare, Box } from 'lucide-react';
import GlassCard from '../../mobile/ui/GlassCard';
import FeatureIcon from '../../mobile/ui/FeatureIcon';

/**
 * HivemindGraphPreview - Interactive Graph Preview
 * Visual representation of the Triple-Operator Framework
 */
const HivemindGraphPreview = () => {
    const agents = [
        { icon: Globe, name: 'Web Context', color: 'from-[#bdf213]/80 to-[#bdf213]/40', description: 'Real-time browser data' },
        { icon: Search, name: 'PAGEINDEX', color: 'from-[#4f00ff]/80 to-[#4f00ff]/40', description: 'Semantic reasoning tree' },
        { icon: Database, name: 'Memory Graph', color: 'from-[#1a384a] to-[#1a4a38]', description: 'Organizational knowledge' },
        { icon: Cpu, name: 'AST Parser', color: 'from-[#4285f4]/80 to-[#4f00ff]/80', description: 'Code logic chunks' }
    ];

    return (
        <section id="hivemind-graph-section" className="py-16 px-6 relative overflow-hidden bg-black text-white">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-[#bdf213]/5 to-[#4f00ff]/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-4xl mx-auto">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-10"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <FeatureIcon
                        icon={Layers}
                        gradient="from-[#bdf213] to-[#4f00ff]"
                        size="lg"
                        className="mx-auto mb-4 text-[#bdf213]"
                    />
                    <h2 className="text-2xl font-light text-white mb-2">
                        Powered by HIVEMIND
                    </h2>
                    <p className="text-sm text-white/50">
                        Modular intelligence evolving continuously
                    </p>
                </motion.div>

                {/* Architecture Visualization */}
                <GlassCard className="p-6 mb-6 border border-white/5 bg-[#09090b]/50" delay={0.1} hover={false}>
                    {/* Input */}
                    <motion.div
                        className="text-center mb-4"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 shadow-[0_0_15px_rgba(189,242,19,0.1)]">
                            <MessageSquare className="w-4 h-4 text-[#bdf213]/80" />
                            <span className="text-xs text-[#bdf213]/80 font-mono">Agent Directive</span>
                        </div>
                    </motion.div>

                    {/* Arrow Down */}
                    <motion.div
                        className="flex justify-center mb-4"
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="w-px h-6 bg-gradient-to-b from-[#bdf213]/30 to-transparent" />
                    </motion.div>

                    {/* Agent Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
                        {agents.map((agent, index) => (
                            <motion.div
                                key={agent.name}
                                className="p-2 sm:p-3 bg-white/[0.02] rounded-xl border border-white/[0.05] text-center hover:bg-white/[0.05] hover:border-[#4f00ff]/30 transition-all cursor-pointer"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 + index * 0.08 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 rounded-[12px] bg-gradient-to-br ${agent.color} flex items-center justify-center relative shadow-lg`}>
                                    <agent.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <p className="text-[11px] sm:text-xs text-white font-medium">{agent.name}</p>
                                <p className="text-[9px] sm:text-[10px] text-white/40 leading-tight mt-1">{agent.description}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Arrow Down */}
                    <motion.div
                        className="flex justify-center mb-4"
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                    >
                        <div className="w-px h-6 bg-gradient-to-b from-transparent to-[#4f00ff]/50" />
                    </motion.div>

                    {/* Output */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.7 }}
                    >
                        <div className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#4f00ff]/20 to-[#4f00ff]/10 rounded-full border border-[#4f00ff]/40 shadow-[0_0_20px_rgba(79,0,255,0.2)]">
                            <span className="text-xs text-white uppercase tracking-wider font-medium">Synthesized Action</span>
                        </div>
                    </motion.div>
                </GlassCard>

                {/* Key Benefits */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-8">
                    {[
                        { label: 'Ebbinghaus', value: 'Decay Engine' },
                        { label: 'AST-Level', value: 'Code Parsing' },
                        { label: 'Sovereign', value: 'HYOK Data' }
                    ].map((item, index) => (
                        <GlassCard
                            key={item.label}
                            className="p-3 sm:p-4 flex flex-col items-center justify-center text-center border-[#4f00ff]/10 hover:border-[#bdf213]/30 transition-colors"
                            delay={0.3 + index * 0.1}
                            hover={true}
                        >
                            <p className="text-[8px] sm:text-[10px] text-[#bdf213] uppercase tracking-wider">{item.label}</p>
                            <p className="text-[10px] sm:text-xs text-white/80 font-medium mt-1">{item.value}</p>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HivemindGraphPreview;
