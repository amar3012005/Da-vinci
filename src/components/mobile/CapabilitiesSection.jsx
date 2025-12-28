import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Mic, Shield, Sparkles } from 'lucide-react';
import GlassCard from './ui/GlassCard';
import FeatureIcon from './ui/FeatureIcon';

/**
 * CapabilitiesSection - Compact grid of key capabilities
 * Updated with palette: Dark Navy (#1A2730), Steel (#45586C), Slate (#424048), Rust (#A63E1B), Light Blue (#B0CEE2)
 */
const CapabilitiesSection = () => {
    const capabilities = [
        {
            icon: Globe,
            title: 'Multilingual',
            description: '15+ languages with live detection',
            color: '#B0CEE2', // Light Blue
            bg: 'bg-[#45586C]/20'
        },
        {
            icon: Mic,
            title: 'Natural Voice',
            description: 'Emotive human-like speech',
            color: '#A63E1B', // Rust Orange
            bg: 'bg-[#424048]/20'
        },
        {
            icon: Shield,
            title: 'Enterprise Ready',
            description: 'ISO & GDPR compliant security',
            color: '#45586C', // Steel Blue
            bg: 'bg-[#1A2730]/40'
        },
        {
            icon: Sparkles,
            title: 'Real-Time',
            description: 'Streaming text & audio layer',
            color: '#B0CEE2', // Light Blue
            bg: 'bg-[#45586C]/20'
        }
    ];

    return (
        <section className="py-20 px-6 relative overflow-hidden bg-[#1A2730]">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#B0CEE2]/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#A63E1B]/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Section Header */}
            <motion.div
                className="mb-10 pl-2 border-l-2 border-[#A63E1B]"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <div className="text-[#B0CEE2] font-mono text-[10px] uppercase tracking-[0.3em] mb-1">Capabilities</div>
                <h2 className="text-3xl font-bold text-white tracking-tighter uppercase italic">
                    Agent Powers
                </h2>
            </motion.div>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-2 gap-4">
                {capabilities.map((cap, index) => (
                    <GlassCard
                        key={cap.title}
                        className={`p-5 flex flex-col items-start ${cap.bg} border-white/5`}
                        delay={index * 0.1}
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-black/20"
                            style={{ backgroundColor: cap.color }}
                        >
                            <cap.icon className="w-5 h-5 text-[#1A2730]" />
                        </div>

                        <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">{cap.title}</h4>
                        <p className="text-[10px] text-white/40 leading-relaxed font-medium uppercase tracking-tighter">
                            {cap.description}
                        </p>

                        {/* Decorative tag */}
                        <div className="mt-4 pt-3 border-t border-white/5 w-full flex justify-between items-center opacity-30">
                            <span className="text-[6px] font-mono text-white tracking-widest">UNIT_{index + 1}</span>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cap.color }} />
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Technical Detail Footer */}
            <div className="mt-10 flex justify-center">
                <div className="px-4 py-1.5 rounded-full border border-white/5 bg-white/[0.02] flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-[#A63E1B] rounded-full" />
                    <span className="text-[8px] font-mono text-[#B0CEE2]/40 uppercase tracking-[0.4em]">All units fully operational</span>
                </div>
            </div>
        </section>
    );
};

export default CapabilitiesSection;
