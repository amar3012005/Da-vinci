import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ComparisonSection = () => {
    const [isIndia, setIsIndia] = useState(false);

    useEffect(() => {
        setIsIndia(window.location.hostname.includes('davinciai.in'));
    }, []);

    const marketDynamics = [
        {
            title: "Enterprise AI Adoption",
            content: "72% of companies are using AI; half have rolled it out across multiple departments. 75% of C-level executives rank AI in their top 3 priorities for 2025.",
            stat: "72%",
            label: "ADOPTION RATE"
        },
        {
            title: "Customer Experience Transformation",
            content: "95% of all customer interactions will be AI-facilitated by end of 2025. 68% average reduction in operational costs reported by companies using AI in customer service.",
            stat: "95%",
            label: "AI-FACILITATED"
        },
        {
            title: "Return on Investment",
            content: isIndia
                ? "Mature AI deployments see ₹350 value for every ₹100 invested. 74% of mature AI users report solid ROI (but new adopters lag)."
                : "Mature AI deployments see €3.50 value for every €1 invested. 74% of mature AI users report solid ROI (but new adopters lag).",
            stat: "3.5x",
            label: "VALUE RETURN"
        }
    ];

    return (
        <section id="comparison-section" className="py-20 px-6 bg-[#0a0a0a] relative overflow-hidden">

            {/* Minimal Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#A63E1B]/5 blur-[100px] rounded-full pointer-events-none" />

            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Clean Section Header */}
            <motion.div
                className="w-full max-w-sm mb-16 relative z-10 mx-auto"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
            >
                <div className="flex flex-col items-center text-center">
                    <div className="text-[9px] font-mono text-white/30 tracking-[0.5em] uppercase mb-2">Market Benchmark</div>
                    <h2 className="text-3xl font-light text-white tracking-tight uppercase">
                        Market <span className="font-bold underline decoration-[#A63E1B] underline-offset-8">Dynamics</span>
                    </h2>
                </div>
            </motion.div>

            {/* Dynamics List */}
            <div className="max-w-md mx-auto space-y-12 relative z-10">
                {marketDynamics.map((item, idx) => (
                    <motion.div
                        key={idx}
                        className="relative grid grid-cols-12 gap-4"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        {/* Info Column */}
                        <div className="col-span-8 flex flex-col items-start gap-3">
                            <h4 className="text-white font-bold text-base uppercase tracking-tight flex items-center gap-3">
                                <span className="w-1.5 h-1.5 bg-[#A63E1B] rounded-full" />
                                {item.title}
                            </h4>
                            <p className="text-white/50 text-[11px] leading-relaxed font-mono">
                                {item.content}
                            </p>
                        </div>

                        {/* Stat Column */}
                        <div className="col-span-4 flex flex-col items-end justify-start pt-1">
                            <div className="text-3xl font-black text-white/10 tracking-tighter leading-none mb-1">
                                {item.stat}
                            </div>
                            <div className="text-[6px] font-mono text-[#A63E1B] tracking-widest uppercase text-right">
                                {item.label}
                            </div>
                        </div>

                        {/* Visual Connector */}
                        {idx !== marketDynamics.length - 1 && (
                            <div className="absolute -bottom-6 left-0 w-8 h-px bg-white/5" />
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Branding Details */}
            <div className="mt-20 flex flex-col items-center gap-2 opacity-20">
                <div className="w-12 h-px bg-[#A63E1B]" />
                <span className="text-[6px] font-mono text-white tracking-[0.5em] uppercase italic">Auth:Verified // Ref:V2.DYNAMICS</span>
            </div>

            {/* Mission Card */}
            <motion.div
                className="relative bg-white/[0.03] border border-white/10 p-6 mx-auto mt-12 max-w-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
            >
                {/* Corner Brackets */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/30" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/30" />

                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-4">THE MISSION</div>
                <p className="text-white/60 text-[11px] leading-relaxed font-mono">
                    Our Vision Is To Meet The Demand & Supply By Increasing THE Market-Size Through Making The Agentic-Automation Affordable , Even For SMSEs
                </p>
            </motion.div>

            {/* Subtle Indicators */}
            <div className="absolute top-6 left-6 text-[8px] font-mono text-white/5">DB_RETRIVAL: SUCCESSFUL</div>
            <div className="absolute bottom-6 right-6 text-[8px] font-mono text-[#A63E1B]/20">UNIT: MARKET_INSIGHTS_V1</div>
        </section>
    );
};

export default ComparisonSection;
