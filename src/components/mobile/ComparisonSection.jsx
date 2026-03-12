'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, animate, useMotionValue } from 'framer-motion';

// ============================================
// ANIMATED COUNTER - DIGITAL READOUT STYLE
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

    const formattedValue = decimals > 0 ? displayValue.toFixed(decimals) : displayValue.toString().padStart(2, '0');

    return (
        <span ref={ref} className="font-medium tracking-tight">
            {prefix}{formattedValue}{suffix}
        </span>
    );
};

// ============================================
// ARC GAUGE (Bento Styled)
// ============================================
const ArcGauge = ({ value, maxValue = 100, label, sublabel, size = 160, delay = 0 }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const radius = (size - 20) / 2;
    const startAngle = -225;
    const endAngle = 45;
    const angleRange = endAngle - startAngle;
    const percentage = Math.min(value / maxValue, 1);
    const currentAngle = startAngle + (angleRange * percentage);

    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    const describeArc = (x, y, radius, startAngle, endAngle) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
    };

    const center = size / 2;

    return (
        <motion.div
            ref={ref}
            className="relative flex flex-col items-center justify-center w-full h-full"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
                    {/* Background Arc */}
                    <path
                        d={describeArc(center, center, radius, startAngle, endAngle)}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    
                    {/* Value Arc */}
                    <motion.path
                        d={describeArc(center, center, radius, startAngle, currentAngle)}
                        fill="none"
                        stroke="currentColor"
                        className="text-white"
                        strokeWidth="12"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={isInView ? { pathLength: 1 } : {}}
                        transition={{ duration: 1.5, delay: delay + 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-light text-white tracking-tight">
                        <DigitalCounter value={value} suffix="%" duration={2} />
                    </div>
                </div>
            </div>
            
            <motion.div
                className="mt-6 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: delay + 0.6, duration: 0.5 }}
            >
                <div className="text-sm font-medium text-white/90">
                    {label}
                </div>
                <div className="text-xs text-white/40 mt-1">
                    {sublabel}
                </div>
            </motion.div>
        </motion.div>
    );
};

// ============================================
// Bento Card
// ============================================
const BentoCard = ({ children, title, className = '', delay = 0 }) => {
    return (
        <motion.div
            className={`bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 flex flex-col aspect-square relative overflow-hidden group hover:border-white/20 transition-colors ${className}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Subtle top glare */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="text-xs uppercase tracking-widest text-white/40 mb-6 relative z-10">{title}</div>
            <div className="flex-1 flex flex-col relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

// ============================================
// LINEAR BAR GAUGE 
// ============================================
const LinearBar = ({ value, maxValue = 100, label, unit = '%', delay = 0 }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const percentage = Math.min((value / maxValue) * 100, 100);

    return (
        <motion.div
            ref={ref}
            className="flex flex-col gap-2 w-full"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="flex justify-between items-center px-1">
                <span className="text-sm text-white/60">{label}</span>
                <span className="text-sm text-white font-medium">
                    <DigitalCounter value={value} suffix={unit} duration={2} decimals={unit === 'x' ? 1 : 0} />
                </span>
            </div>
            
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={isInView ? { width: `${percentage}%` } : {}}
                    transition={{ duration: 1.5, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
            </div>
        </motion.div>
    );
}

// ============================================
// MAIN COMPARISON SECTION 
// ============================================
const ComparisonSection = () => {
    return (
        <section className="bg-black text-white relative">
            {/* Container with side borders to match Cartesia theme */}
            <div className="max-w-[1200px] mx-auto border-x border-[#222]">
                
                {/* Vertical striped separator */}
                <div 
                    className="h-20 w-full border-b border-[#222]" 
                    style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
                />

                <div className="px-10 lg:px-20 py-20 lg:py-32">
                    
                    {/* Header */}
                    <div className="grid lg:grid-cols-2 gap-16 items-start mb-20">
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-tight">
                                Quantifiable Impact,<br />
                                <span className="text-white/40">Sovereign Scale</span>
                            </h2>
                        </div>
                        <div className="space-y-6">
                            <p className="text-lg font-light text-white/50 leading-relaxed max-w-md">
                                Bridging Demand & Supply through affordable, agentic-automation for small and medium service enterprises. We deliver unprecedented ROI by fundamentally eliminating bottlenecks.
                            </p>
                        </div>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        {/* Adoption Card */}
                        <BentoCard title="Adoption Metrics" delay={0.1}>
                            <ArcGauge 
                                value={72} 
                                label="Enterprise AI" 
                                sublabel="Global Integration Rate"
                                delay={0.2}
                            />
                        </BentoCard>

                        {/* CX Card */}
                        <BentoCard title="CX Transform" delay={0.2}>
                            <ArcGauge 
                                value={95} 
                                label="Experience" 
                                sublabel="Satisfaction Index"
                                delay={0.3}
                            />
                        </BentoCard>

                        {/* Efficiency Card */}
                        <BentoCard title="Efficiency Gains" delay={0.3}>
                            <ArcGauge 
                                value={68} 
                                label="Cost Reduction" 
                                sublabel="Operational Savings"
                                delay={0.4}
                            />
                        </BentoCard>

                        {/* Multiplier / ROI Card (spans 2 columns on large) */}
                        <BentoCard title="ROI Analysis" className="md:col-span-2 lg:col-span-2 aspect-auto md:aspect-[2/1] justify-center" delay={0.4}>
                            <div className="flex flex-col md:flex-row gap-12 items-center h-full">
                                <div className="flex-1 flex flex-col justify-center items-center h-full w-full">
                                    <div className="text-6xl md:text-8xl font-light tracking-tighter mb-4">
                                        <DigitalCounter value={3.5} suffix="x" decimals={1} duration={2.5} />
                                    </div>
                                    <div className="text-white/50 text-sm">Return on Investment Multiplier</div>
                                </div>
                                <div className="flex-1 w-full space-y-8 border-t md:border-t-0 md:border-l border-white/10 pt-8 md:pt-0 md:pl-12">
                                    <LinearBar value={1.0} maxValue={5.0} label="Baseline Performance" unit="x" delay={0.5} />
                                    <LinearBar value={3.5} maxValue={5.0} label="Current Optimized State" unit="x" delay={0.6} />
                                    <LinearBar value={5.0} maxValue={5.0} label="Targeted Automation" unit="x" delay={0.7} />
                                </div>
                            </div>
                        </BentoCard>

                        {/* Summary Stats / Key Highlights Card */}
                        <BentoCard title="Data Integrity" delay={0.5} className="justify-center">
                            <div className="flex flex-col gap-6 h-full justify-center">
                                <div className="bg-[#111] rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                                     {/* Node pulse effect */}
                                    <div className="absolute w-24 h-24 bg-white/5 rounded-full blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    <h4 className="text-4xl font-light mb-2">100%</h4>
                                    <span className="text-white/50 text-xs">Sovereign Compliance</span>
                                </div>
                                <div className="bg-[#111] rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center">
                                    <h4 className="text-4xl font-light mb-2">0<span className="text-sm ml-1 text-white/50">ms</span></h4>
                                    <span className="text-white/50 text-xs">Latency Overhead</span>
                                </div>
                            </div>
                        </BentoCard>

                    </div>
                </div>
            </div>
        </section>
    );
};

export default ComparisonSection;
