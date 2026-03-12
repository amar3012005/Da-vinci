import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Users, MessageCircle, RefreshCw } from 'lucide-react';
import GlassCard from './ui/GlassCard';
import FeatureIcon from './ui/FeatureIcon';

/**
 * FeatureContext - Showcase of context-aware intelligence
 * Highlights Hive Mind collective learning and session memory
 */
const FeatureContext = () => {
    const contextFeatures = [
        {
            icon: Brain,
            title: 'Hive Mind',
            description: 'Collective memory from all successful interactions'
        },
        {
            icon: MessageCircle,
            title: 'Session Memory',
            description: 'Maintains context across entire conversations'
        },
        {
            icon: RefreshCw,
            title: 'Self-Learning',
            description: 'Continuously improves from every interaction'
        }
    ];

    return (
        <section className="py-16 px-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

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
                        icon={Brain}
                        gradient="from-purple-500 to-indigo-500"
                        size="lg"
                        className="mx-auto mb-4"
                    />
                    <h2 className="text-2xl font-light text-white mb-2">
                        Context Intelligence
                    </h2>
                    <p className="text-sm text-white/50">
                        The problem we solve
                    </p>
                </motion.div>

                {/* Problem Statement Card */}
                <GlassCard className="p-6 mb-6" delay={0.1}>
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-red-400 text-lg">✗</span>
                        </div>
                        <div>
                            <p className="text-sm text-white/70 font-medium mb-1">Traditional Voice Agents</p>
                            <p className="text-xs text-white/40 leading-relaxed">
                                Forget context between turns. Repeat questions. Miss user intent. Frustrating experiences.
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-green-400 text-lg">✓</span>
                        </div>
                        <div>
                            <p className="text-sm text-white/70 font-medium mb-1">TARA with M M A R</p>
                            <p className="text-xs text-white/40 leading-relaxed">
                                Deep context retention. Semantic understanding. Cross-session learning. Natural conversations.
                            </p>
                        </div>
                    </div>
                </GlassCard>

                {/* Feature Cards */}
                <div className="space-y-3">
                    {contextFeatures.map((feature, index) => (
                        <GlassCard
                            key={feature.title}
                            className="p-4 flex items-center gap-4"
                            delay={0.2 + index * 0.1}
                        >
                            <FeatureIcon
                                icon={feature.icon}
                                gradient={index === 0 ? 'from-purple-500 to-pink-500' :
                                    index === 1 ? 'from-blue-500 to-cyan-500' :
                                        'from-green-500 to-emerald-500'}
                                size="md"
                            />
                            <div>
                                <p className="text-sm text-white font-medium">{feature.title}</p>
                                <p className="text-xs text-white/40">{feature.description}</p>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {/* Visual Element: Connected Nodes */}
                <motion.div
                    className="mt-8 flex justify-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="flex items-center gap-2">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.5, 1, 0.5]
                                }}
                                transition={{
                                    duration: 2,
                                    delay: i * 0.2,
                                    repeat: Infinity
                                }}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default FeatureContext;
