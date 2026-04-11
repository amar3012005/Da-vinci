import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Shield, Cpu } from 'lucide-react';

/**
 * TaraBentoStats - Clean Premium Bento Grid
 * Uses the palette from the provided image:
 * #1A2730 (Dark Navy), #424048 (Slate), #45586C (Steel), #B0CEE2 (Light Blue), #A63E1B (Rust)
 */
export const TaraBentoStats = () => {
    const stats = [
        {
            label: '1ST_CHUNK',
            value: '<500ms',
            desc: 'Latency',
            icon: Zap,
            bg: 'bg-[#1A2730]/40 backdrop-blur-md',
            accent: 'text-[#B0CEE2]'
        },
        {
            label: 'AUDIO_STREAM',
            value: '<1.2s',
            desc: 'First Byte',
            icon: Activity,
            bg: 'bg-[#424048]/40 backdrop-blur-md',
            accent: 'text-[#E95D2C]'
        },
        {
            label: 'SECURITY',
            value: 'GDPR',
            desc: 'Compliant',
            icon: Shield,
            bg: 'bg-[#A63E1B]/40 backdrop-blur-md',
            accent: 'text-white'
        },
        {
            label: 'CORE_AGENTS',
            value: '15+',
            desc: 'Modular units',
            icon: Cpu,
            bg: 'bg-[#45586C]/40 backdrop-blur-md',
            accent: 'text-[#B0CEE2]'
        }
    ];

    return (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto px-2">
            {stats.map((stat, idx) => (
                <motion.div
                    key={idx}
                    className={`relative ${stat.bg} rounded-2xl p-4 flex flex-col justify-between h-32 overflow-hidden border border-white/5 shadow-xl`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                >
                    {/* Subtle Overlay Glow */}
                    <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <stat.icon size={12} className={stat.accent} />
                            <span className="text-[9px] font-medium text-white/50 uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <div className="text-xl font-bold text-white tracking-tight">
                            {stat.value}
                        </div>
                    </div>

                    <div className="relative z-10">
                        <p className="text-[10px] text-white/40 leading-tight">
                            {stat.desc}
                        </p>
                    </div>
                </motion.div>
            ))}

            {/* Premium Status Bar */}
            <div className="col-span-2 relative bg-[#1A2730] rounded-2xl border border-white/5 p-4 flex justify-between items-center overflow-hidden shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#E95D2C] rounded-full animate-pulse" />
                        <div className="absolute w-4 h-4 border border-[#E95D2C]/40 rounded-full animate-ping" />
                    </div>
                    <div className="text-[10px] font-medium text-white/70 uppercase tracking-widest">
                        MMAR CORE: OPERATIONAL
                    </div>
                </div>
                <div className="flex gap-1.5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-3 h-1 bg-[#B0CEE2] rounded-full" />
                    ))}
                    <div className="w-3 h-1 bg-white/10 rounded-full" />
                </div>
            </div>
        </div>
    );
};

export default TaraBentoStats;
