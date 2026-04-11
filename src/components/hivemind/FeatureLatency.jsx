import React from 'react';
import { motion } from 'framer-motion';
import { Zap, MessageCircle, Clock } from 'lucide-react';
import GlassCard from './ui/GlassCard';
import AnimatedMetric from './ui/AnimatedMetric';
import FeatureIcon from './ui/FeatureIcon';

/**
 * FeatureLatency - Showcase of ultra-low latency capabilities
 * Highlights <500ms first chunk and <1.2s total response (human-like)
 * NO pipeline disclosure - keeping architecture confidential
 */
const FeatureLatency = () => {
    return (
        <section id="features-section" className="py-16 px-6 relative overflow-hidden">
            {/* Section background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />

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
                        icon={Zap}
                        gradient="from-yellow-400 to-orange-500"
                        size="lg"
                        className="mx-auto mb-4"
                    />
                    <h2 className="text-2xl font-light text-white mb-2">
                        Lightning Fast
                    </h2>
                    <p className="text-sm text-white/50">
                        Human-like response speed
                    </p>
                </motion.div>

                {/* First Response Metric Card */}
                <GlassCard className="p-6 mb-4 text-center" delay={0.1}>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
                        First Response Chunk
                    </p>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-white/60 text-lg">&lt;</span>
                        <AnimatedMetric value={500} suffix="ms" size="xl" />
                    </div>
                    <p className="text-xs text-white/40 mt-2">
                        Powered by M M A R
                    </p>
                </GlassCard>

                {/* Total Response Time Card */}
                <GlassCard className="p-6 mb-6 text-center" delay={0.2}>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
                        Total Response Time
                    </p>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-white/60 text-lg">&lt;</span>
                        <AnimatedMetric value={1.2} suffix="s" size="xl" />
                    </div>
                    <p className="text-xs text-white/40 mt-2">
                        Feels like talking to a human
                    </p>
                </GlassCard>

                {/* Comparison Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <GlassCard className="p-4 text-center" delay={0.3}>
                        <FeatureIcon
                            icon={Clock}
                            gradient="from-red-500 to-orange-500"
                            size="sm"
                            className="mx-auto mb-2"
                        />
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Traditional Bots</p>
                        <p className="text-lg font-bold text-red-400/70">2-5s</p>
                        <p className="text-[10px] text-white/30">Slow & frustrating</p>
                    </GlassCard>

                    <GlassCard className="p-4 text-center" delay={0.4}>
                        <FeatureIcon
                            icon={MessageCircle}
                            gradient="from-green-500 to-emerald-500"
                            size="sm"
                            className="mx-auto mb-2"
                        />
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">TARA</p>
                        <p className="text-lg font-bold text-green-400">&lt;1.2s</p>
                        <p className="text-[10px] text-white/30">Natural & seamless</p>
                    </GlassCard>
                </div>
            </div>
        </section>
    );
};

export default FeatureLatency;
