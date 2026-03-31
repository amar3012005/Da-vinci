'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, animate, useMotionValue } from 'framer-motion';

// ============================================
// ANIMATED COUNTER
// ============================================
const DigitalCounter = ({ value, suffix = '', prefix = '', duration = 2, decimals = 0 }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const motionValue = useMotionValue(0);
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (isInView) {
            const controls = animate(motionValue, value, {
                duration,
                ease: [0.16, 1, 0.3, 1],
                onUpdate: (latest) => setDisplayValue(Number(latest.toFixed(decimals)))
            });
            return controls.stop;
        }
    }, [isInView, value, motionValue, duration, decimals]);

    const formattedValue = decimals > 0 ? displayValue.toFixed(decimals) : displayValue.toString();

    return (
        <span ref={ref}>
            {prefix}{formattedValue}{suffix}
        </span>
    );
};

// ============================================
// CROSSHAIR CORNER DECORATION
// ============================================
const Crosshair = ({ className = '' }) => (
    <div className={`absolute w-4 h-4 ${className}`}>
        <div className="absolute top-1/2 left-0 w-4 h-px bg-[#525252]/85 -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 h-4 w-px bg-[#525252]/85 -translate-x-1/2" />
    </div>
);

// ============================================
// METRIC CARD
// ============================================
const MetricCard = ({ number, suffix = '%', label, description, delay = 0, decimals = 0 }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    return (
        <motion.div
            ref={ref}
            className="pt-12 pb-8 px-6 hover:bg-white/[0.02] transition-colors"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="text-5xl font-light text-white mb-2">
                <DigitalCounter value={number} suffix={suffix} duration={2} decimals={decimals} />
            </div>
            <div className="text-[#E7E7ED] text-xl font-light mb-4">{label}</div>
            <p className="text-[#9E9E9E] text-sm leading-relaxed">{description}</p>
        </motion.div>
    );
};

// ============================================
// MAIN COMPARISON SECTION
// ============================================
const ComparisonSection = () => {
    return (
        <section className="bg-[#080808] relative overflow-hidden py-20">
            {/* Grid overlay lines at edges */}
            <div className="absolute inset-y-0 left-6 w-px bg-[#525252]/15" />
            <div className="absolute inset-y-0 right-6 w-px bg-[#525252]/15" />

            <div className="max-w-7xl mx-auto px-6">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="text-[11px] font-mono text-[#E7E7ED]/45 uppercase tracking-widest mb-4">
                        [03] Impact
                    </div>
                    <h2 className="text-4xl md:text-5xl font-light text-white leading-[0.9] font-['Montserrat'] mb-4">
                        Quantifiable <em className="italic font-serif">Impact</em>
                    </h2>
                    <p className="text-base text-[#9E9E9E] leading-relaxed mb-12 max-w-lg">
                        Bridging Demand & Supply through affordable, agentic-automation for small and medium service enterprises. Unprecedented ROI by fundamentally eliminating bottlenecks.
                    </p>
                </motion.div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 border-t border-[#525252]/80">
                    {/* Metric 1 */}
                    <MetricCard
                        number={72}
                        label="Enterprise AI Adoption"
                        description="Global integration rate across enterprise deployments, with autonomous agent orchestration driving adoption at scale."
                        delay={0.1}
                    />

                    {/* Divider 1 */}
                    <div className="hidden md:block absolute left-1/3 top-0 bottom-0 pointer-events-none" style={{ position: 'relative' }}>
                        {/* Handled via wrapper below */}
                    </div>

                    {/* Metric 2 */}
                    <div className="relative">
                        <div className="hidden md:block absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#525252]/30 to-[#525252]" />
                        <MetricCard
                            number={95}
                            label="Satisfaction Index"
                            description="Customer experience transformation through intelligent memory retrieval and contextual understanding across every interaction."
                            delay={0.2}
                        />
                    </div>

                    {/* Metric 3 */}
                    <div className="relative">
                        <div className="hidden md:block absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#525252]/30 to-[#525252]" />
                        <MetricCard
                            number={68}
                            label="Cost Reduction"
                            description="Operational savings through automated workflows, eliminating manual overhead and reducing time-to-resolution across service operations."
                            delay={0.3}
                        />
                    </div>
                </div>

                {/* Bottom ROI Card */}
                <motion.div
                    className="mt-8 border border-[#525252]/80 bg-[#181818] p-8 relative"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Corner crosshairs */}
                    <Crosshair className="top-2 left-2" />
                    <Crosshair className="top-2 right-2" />
                    <Crosshair className="bottom-2 left-2" />
                    <Crosshair className="bottom-2 right-2" />

                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        {/* Left: ROI */}
                        <div className="flex flex-col items-center md:items-start">
                            <div className="text-6xl font-light text-white">
                                <DigitalCounter value={3.5} suffix="x" decimals={1} duration={2.5} />
                            </div>
                            <div className="text-[#9E9E9E] text-sm mt-2">Average ROI Multiplier</div>
                        </div>

                        {/* Right: Compliance badges */}
                        <div className="flex flex-wrap gap-3">
                            <span className="bg-[#262626] text-[#E7E7ED]/65 py-1 px-4 text-sm">
                                100% Sovereign
                            </span>
                            <span className="bg-[#262626] text-[#E7E7ED]/65 py-1 px-4 text-sm">
                                0ms Latency
                            </span>
                        </div>
                    </div>
                </motion.div>

            </div>
        </section>
    );
};

export default ComparisonSection;
