import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Globe, Search, Database, Cpu, MessageSquare } from 'lucide-react';
import GlassCard from './ui/GlassCard';
import FeatureIcon from './ui/FeatureIcon';

/**
 * FeatureMMAR - Showcase of M M A R architecture
 * Visual representation of modular multi-agentic system
 */
const FeatureMMAR = () => {
    const agents = [
        { icon: Globe, name: 'Translation', color: 'from-blue-400 to-cyan-400', description: 'Auto-detect 15+ languages' },
        { icon: Search, name: 'Retriever', color: 'from-green-400 to-emerald-400', description: 'Semantic knowledge search' },
        { icon: Database, name: 'Hive Mind', color: 'from-purple-400 to-pink-400', description: 'Collective intelligence' },
        { icon: Cpu, name: 'LLM Core', color: 'from-orange-400 to-red-400', description: 'Natural language generation' }
    ];

    return (
        <section id="mmar-section" className="py-16 px-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10">
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
                        gradient="from-pink-500 to-purple-500"
                        size="lg"
                        className="mx-auto mb-4"
                    />
                    <h2 className="text-2xl font-light text-white mb-2">
                        Powered by M M A R
                    </h2>
                    <p className="text-sm text-white/50">
                        Modular intelligence working together
                    </p>
                </motion.div>

                {/* Architecture Visualization */}
                <GlassCard className="p-6 mb-6" delay={0.1} hover={false}>
                    {/* Input */}
                    <motion.div
                        className="text-center mb-4"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                            <MessageSquare className="w-4 h-4 text-white/60" />
                            <span className="text-xs text-white/60">User Query</span>
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
                        <div className="w-px h-6 bg-gradient-to-b from-white/30 to-white/5" />
                    </motion.div>

                    {/* Agent Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {agents.map((agent, index) => (
                            <motion.div
                                key={agent.name}
                                className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05] text-center"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 + index * 0.08 }}
                            >
                                <div className={`w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
                                    <agent.icon className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-xs text-white font-medium">{agent.name}</p>
                                <p className="text-[10px] text-white/40 leading-tight mt-1">{agent.description}</p>
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
                        <div className="w-px h-6 bg-gradient-to-b from-white/5 to-white/30" />
                    </motion.div>

                    {/* Output */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.7 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full border border-pink-500/30">
                            <span className="text-xs text-white">Intelligent Response</span>
                        </div>
                    </motion.div>
                </GlassCard>

                {/* Key Benefits */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Parallel', value: 'Processing' },
                        { label: 'Dynamic', value: 'Routing' },
                        { label: 'Smart', value: 'Caching' }
                    ].map((item, index) => (
                        <GlassCard
                            key={item.label}
                            className="p-3 text-center"
                            delay={0.3 + index * 0.1}
                        >
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</p>
                            <p className="text-xs text-white font-medium">{item.value}</p>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeatureMMAR;
