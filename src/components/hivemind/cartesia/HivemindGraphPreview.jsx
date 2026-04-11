import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Globe, Search, Database, Cpu, MessageSquare } from 'lucide-react';

/**
 * HivemindGraphPreview - Interactive Graph Preview
 * Visual representation of the Triple-Operator Framework
 */
const HivemindGraphPreview = () => {
    const agents = [
        { icon: Globe, name: 'Web Context', color: 'from-[#117dff] to-[#0066e0]', description: 'Real-time browser data' },
        { icon: Search, name: 'PAGEINDEX', color: 'from-[#117dff]/80 to-[#117dff]/40', description: 'Semantic reasoning tree' },
        { icon: Database, name: 'Memory Graph', color: 'from-[#16a34a]/70 to-[#16a34a]/30', description: 'Organizational knowledge' },
        { icon: Cpu, name: 'AST Parser', color: 'from-[#2563eb] to-[#117dff]', description: 'Code logic chunks' }
    ];

    return (
        <section id="hivemind-graph-section" className="py-16 px-6 relative overflow-hidden bg-[#faf9f4] text-[#0a0a0a]">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#117dff]/[0.04] rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-4xl mx-auto">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-10"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center">
                        <Layers className="w-6 h-6 text-[#117dff]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#0a0a0a] mb-2 font-['Space_Grotesk']">
                        Powered by HIVEMIND
                    </h2>
                    <p className="text-sm text-[#525252]">
                        Modular intelligence evolving continuously
                    </p>
                </motion.div>

                {/* Architecture Visualization */}
                <motion.div
                    className="p-6 mb-6 border border-[#e3e0db] bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    {/* Input */}
                    <motion.div
                        className="text-center mb-4"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#117dff]/[0.06] rounded-lg border border-[#117dff]/20 shadow-[0_0_15px_rgba(17,125,255,0.08)]">
                            <MessageSquare className="w-4 h-4 text-[#117dff]" />
                            <span className="text-xs text-[#117dff] font-mono font-medium">Agent Directive</span>
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
                        <div className="w-px h-6 bg-gradient-to-b from-[#117dff]/30 to-transparent" />
                    </motion.div>

                    {/* Agent Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
                        {agents.map((agent, index) => (
                            <motion.div
                                key={agent.name}
                                className="p-2 sm:p-3 bg-[#faf9f4] rounded-xl border border-[#e3e0db] text-center hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-all cursor-pointer"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 + index * 0.08 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center relative shadow-lg`}>
                                    <agent.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <p className="text-[11px] sm:text-xs text-[#0a0a0a] font-semibold">{agent.name}</p>
                                <p className="text-[9px] sm:text-[10px] text-[#a3a3a3] leading-tight mt-1">{agent.description}</p>
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
                        <div className="w-px h-6 bg-gradient-to-b from-transparent to-[#117dff]/30" />
                    </motion.div>

                    {/* Output */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.7 }}
                    >
                        <div className="inline-flex items-center gap-2 px-6 py-2 bg-[#117dff]/[0.08] rounded-lg border border-[#117dff]/25 shadow-[0_0_20px_rgba(17,125,255,0.08)]">
                            <span className="text-xs text-[#0a0a0a] uppercase tracking-wider font-semibold">Synthesized Action</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Key Benefits */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-8">
                    {[
                        { label: 'Ebbinghaus', value: 'Decay Engine' },
                        { label: 'AST-Level', value: 'Code Parsing' },
                        { label: 'Sovereign', value: 'HYOK Data' }
                    ].map((item, index) => (
                        <motion.div
                            key={item.label}
                            className="p-3 sm:p-4 flex flex-col items-center justify-center text-center bg-white border border-[#e3e0db] rounded-xl hover:border-[#117dff]/20 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                        >
                            <p className="text-[8px] sm:text-[10px] text-[#117dff] uppercase tracking-wider font-mono font-medium">{item.label}</p>
                            <p className="text-[10px] sm:text-xs text-[#0a0a0a] font-semibold mt-1">{item.value}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HivemindGraphPreview;
