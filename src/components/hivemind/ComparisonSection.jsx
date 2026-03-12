'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring, useInView, animate } from 'framer-motion';

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
        <span ref={ref} className="font-mono font-bold tracking-wider">
            {prefix}{formattedValue}{suffix}
        </span>
    );
};

// ============================================
// TECHNICAL SCALE COMPONENT
// ============================================
const TechnicalScale = ({ orientation = 'horizontal', markers = 5, delay = 0 }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    
    const markerValues = orientation === 'horizontal' 
        ? ['-20', '-15', '-10', '-05', '00', '+05', '+10', '+15', '+20']
        : ['+20', '+15', '+10', '+05', '00', '-05', '-10', '-15', '-20'];
    
    const selectedMarkers = markerValues.slice(0, markers);

    return (
        <div ref={ref} className={`flex ${orientation === 'vertical' ? 'flex-col h-full' : 'flex-row w-full'} items-center justify-between`}>
            {selectedMarkers.map((mark, idx) => (
                <motion.div
                    key={idx}
                    className={`flex ${orientation === 'vertical' ? 'flex-row items-center' : 'flex-col items-center'} gap-1`}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: delay + (idx * 0.05), duration: 0.3 }}
                >
                    <span className="text-[8px] font-mono text-white/60 tracking-widest">{mark}</span>
                    <div className={`${orientation === 'vertical' ? 'w-2 h-px' : 'w-px h-2'} bg-white/40`} />
                </motion.div>
            ))}
        </div>
    );
};

// ============================================
// HUD GRID OVERLAY
// ============================================
const HUDGrid = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Main Grid */}
            <div 
                className="absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                }}
            />
            
            {/* Fine Grid */}
            <div 
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '8px 8px'
                }}
            />

            {/* Crosshair Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/5 rounded-full" />
            
            {/* Corner Brackets */}
            <svg className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                <motion.path
                    d="M0,10 L0,0 L10,0 M90,0 L100,0 L100,10 M100,90 L100,100 L90,100 M10,100 L0,100 L0,90"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="0.5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />
            </svg>
        </div>
    );
};

// ============================================
// ARC GAUGE - AVIATION STYLE
// ============================================
const ArcGauge = ({ value, maxValue = 100, label, sublabel, size = 140, delay = 0 }) => {
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
    const tickCount = 11;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
        const tickAngle = startAngle + (angleRange * (i / (tickCount - 1)));
        const inner = polarToCartesian(center, center, radius - 8, tickAngle);
        const outer = polarToCartesian(center, center, radius - 2, tickAngle);
        return { inner, outer, angle: tickAngle };
    });

    return (
        <motion.div
            ref={ref}
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="relative" style={{ width: size, height: size * 0.75 }}>
                <svg className="w-full h-full" viewBox={`0 0 ${size} ${size * 0.75}`}>
                    {/* Background Arc */}
                    <path
                        d={describeArc(center, center, radius, startAngle, endAngle)}
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="2"
                    />
                    
                    {/* Tick Marks */}
                    {ticks.map((tick, idx) => (
                        <motion.line
                            key={idx}
                            x1={tick.inner.x}
                            y1={tick.inner.y}
                            x2={tick.outer.x}
                            y2={tick.outer.y}
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="1"
                            initial={{ opacity: 0 }}
                            animate={isInView ? { opacity: 1 } : {}}
                            transition={{ delay: delay + (idx * 0.03) }}
                        />
                    ))}
                    
                    {/* Value Arc */}
                    <motion.path
                        d={describeArc(center, center, radius - 4, startAngle, currentAngle)}
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="butt"
                        initial={{ pathLength: 0 }}
                        animate={isInView ? { pathLength: 1 } : {}}
                        transition={{ duration: 1.5, delay: delay + 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                    
                    {/* Pointer */}
                    <motion.g
                        initial={{ rotate: startAngle }}
                        animate={isInView ? { rotate: currentAngle } : {}}
                        transition={{ duration: 1.5, delay: delay + 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={{ transformOrigin: `${center}px ${center}px` }}
                    >
                        <polygon
                            points={`${center},${center - 3} ${center + radius - 6},${center} ${center},${center + 3}`}
                            fill="white"
                        />
                    </motion.g>
                    
                    {/* Center Dot */}
                    <circle cx={center} cy={center} r="3" fill="white" />
                </svg>
                
                {/* Digital Readout */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                    <div className="text-2xl font-mono font-bold text-white tracking-wider">
                        <DigitalCounter value={value} suffix="%" duration={2} />
                    </div>
                </div>
            </div>
            
            {/* Labels */}
            <motion.div
                className="mt-4 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: delay + 0.6, duration: 0.5 }}
            >
                <div className="text-[9px] font-mono text-white/80 tracking-[0.3em] uppercase">
                    {label}
                </div>
                <div className="text-[8px] font-mono text-white/40 tracking-widest mt-1">
                    {sublabel}
                </div>
            </motion.div>
        </motion.div>
    );
};

// ============================================
// LINEAR BAR GAUGE - TECHNICAL STYLE
// ============================================
const LinearGauge = ({ value, maxValue = 100, label, unit = '%', delay = 0, showScale = true }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const percentage = Math.min((value / maxValue) * 100, 100);

    return (
        <motion.div
            ref={ref}
            className="relative"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Label Row */}
            <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-mono text-white/60 tracking-[0.2em] uppercase">{label}</span>
                <span className="text-[10px] font-mono text-white font-bold tracking-wider">
                    <DigitalCounter value={value} suffix={unit} duration={2} decimals={unit === 'x' ? 1 : 0} />
                </span>
            </div>
            
            {/* Bar Container */}
            <div className="relative h-6 bg-white/5 border border-white/20">
                {/* Scale Markers */}
                {showScale && (
                    <div className="absolute inset-0 flex justify-between px-2">
                        {[0, 25, 50, 75, 100].map((mark) => (
                            <div key={mark} className="h-full w-px bg-white/10" />
                        ))}
                    </div>
                )}
                
                {/* Fill Bar */}
                <motion.div
                    className="absolute top-0 left-0 h-full bg-white/90"
                    initial={{ width: 0 }}
                    animate={isInView ? { width: `${percentage}%` } : {}}
                    transition={{ duration: 1.5, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
                
                {/* Triangle Pointer */}
                <motion.div
                    className="absolute top-full mt-1"
                    initial={{ left: 0 }}
                    animate={isInView ? { left: `${percentage}%` } : {}}
                    transition={{ duration: 1.5, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transform: 'translateX(-50%)' }}
                >
                    <svg width="8" height="6" viewBox="0 0 8 6">
                        <polygon points="4,0 8,6 0,6" fill="white" />
                    </svg>
                </motion.div>
            </div>
            
            {/* Scale Labels */}
            {showScale && (
                <div className="flex justify-between mt-3 text-[7px] font-mono text-white/30">
                    <span>00</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>MAX</span>
                </div>
            )}
        </motion.div>
    );
};

// ============================================
// INSTRUMENT PANEL - GLASS HUD STYLE
// ============================================
const InstrumentPanel = ({ children, title, id, status = 'ACT', delay = 0, className = '' }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    return (
        <motion.div
            ref={ref}
            className={`relative border border-white/20 bg-black/40 backdrop-blur-sm ${className}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-white/40 tracking-widest">ID</span>
                    <span className="text-[9px] font-mono text-white/60">{id}</span>
                </div>
                <span className="text-[8px] font-mono text-white tracking-[0.2em] uppercase">{title}</span>
                <div className="flex items-center gap-1">
                    <motion.div
                        className="w-1.5 h-1.5 bg-white"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-[8px] font-mono text-white/60 tracking-widest">{status}</span>
                </div>
            </div>
            
            {/* Panel Content */}
            <div className="p-4 relative">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-3 h-px bg-white/30" />
                <div className="absolute top-0 left-0 w-px h-3 bg-white/30" />
                <div className="absolute top-0 right-0 w-3 h-px bg-white/30" />
                <div className="absolute top-0 right-0 w-px h-3 bg-white/30" />
                <div className="absolute bottom-0 left-0 w-3 h-px bg-white/30" />
                <div className="absolute bottom-0 left-0 w-px h-3 bg-white/30" />
                <div className="absolute bottom-0 right-0 w-3 h-px bg-white/30" />
                <div className="absolute bottom-0 right-0 w-px h-3 bg-white/30" />
                
                {children}
            </div>
            
            {/* Scan Line Effect */}
            <motion.div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: delay + 0.5 }}
            >
                <motion.div
                    className="absolute left-0 right-0 h-px bg-white/10"
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
            </motion.div>
        </motion.div>
    );
};

// ============================================
// DIGITAL DISPLAY BLOCK
// ============================================
const DigitalDisplay = ({ value, label, unit = '', prefix = '', delay = 0, size = 'normal' }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });
    const decimals = unit === 'x' ? 1 : 0;

    return (
        <motion.div
            ref={ref}
            className="text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className={`font-mono font-bold text-white tracking-wider ${size === 'large' ? 'text-5xl' : 'text-3xl'}`}>
                {prefix}<DigitalCounter value={value} suffix={unit} duration={2.5} decimals={decimals} />
            </div>
            <div className="text-[9px] font-mono text-white/50 tracking-[0.25em] uppercase mt-2">
                {label}
            </div>
        </motion.div>
    );
};

// ============================================
// MISSION DISPLAY - CENTRAL READOUT
// ============================================
const MissionDisplay = ({ delay = 0 }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    return (
        <motion.div
            ref={ref}
            className="relative border border-white/30 bg-black/60 backdrop-blur-md p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Decorative Frame */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                <motion.rect
                    x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                    initial={{ pathLength: 0 }}
                    animate={isInView ? { pathLength: 1 } : {}}
                    transition={{ duration: 1.5, delay: delay + 0.2 }}
                />
            </svg>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rotate-45" />
                    <span className="text-[10px] font-mono text-white tracking-[0.3em] uppercase">Mission Parameters</span>
                </div>
                <span className="text-[8px] font-mono text-white/40">TAXI // ACT</span>
            </div>
            
            {/* Mission Text */}
            <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: delay + 0.5, duration: 0.8 }}
            >
                <p className="text-sm font-mono text-white/90 leading-relaxed tracking-wide uppercase">
                    Bridging Demand & Supply through
                </p>
                <p className="text-lg font-mono text-white font-bold tracking-wider uppercase">
                    AFFORDABLE AGENTIC-AUTOMATION
                </p>
                <p className="text-sm font-mono text-white/70 tracking-wide uppercase">
                    for Small & Medium Service Enterprises
                </p>
            </motion.div>
            
            {/* Bottom Status */}
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <div className="flex gap-6">
                    <div>
                        <span className="text-[7px] font-mono text-white/40 tracking-widest uppercase block">Target</span>
                        <span className="text-xs font-mono text-white tracking-wider">SMSE</span>
                    </div>
                    <div>
                        <span className="text-[7px] font-mono text-white/40 tracking-widest uppercase block">Protocol</span>
                        <span className="text-xs font-mono text-white tracking-wider">AGENT</span>
                    </div>
                    <div>
                        <span className="text-[7px] font-mono text-white/40 tracking-widest uppercase block">Status</span>
                        <span className="text-xs font-mono text-white tracking-wider">ACTIVE</span>
                    </div>
                </div>
                <motion.div
                    className="w-16 h-4 border border-white/30 flex items-center justify-center"
                    animate={{ borderColor: ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.3)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <span className="text-[7px] font-mono text-white/60 tracking-widest">LIVE</span>
                </motion.div>
            </div>
        </motion.div>
    );
};

// ============================================
// SIDE SCALE INDICATOR
// ============================================
const SideScale = ({ side = 'left', delay = 0 }) => {
    const markers = ['+20', '+15', '+10', '+05', '00', '-05', '-10', '-15', '-20'];
    
    return (
        <div className={`flex flex-col items-${side === 'left' ? 'start' : 'end'} gap-3 h-full py-4`}>
            {markers.map((mark, idx) => (
                <motion.div
                    key={idx}
                    className={`flex items-center gap-2 ${side === 'right' ? 'flex-row-reverse' : ''}`}
                    initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: delay + (idx * 0.05), duration: 0.4 }}
                >
                    <span className="text-[8px] font-mono text-white/50 tracking-wider">{mark}</span>
                    <div className={`h-px bg-white/30 ${idx % 2 === 0 ? 'w-4' : 'w-2'}`} />
                </motion.div>
            ))}
        </div>
    );
};

// ============================================
// MAIN HUD SECTION
// ============================================
const ComparisonSection = () => {
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -100]);

    return (
        <section
            ref={sectionRef}
            id="comparison-section"
            className="relative min-h-screen bg-black py-16 px-4 sm:px-6 overflow-hidden"
        >
            {/* Background Grid */}
            <HUDGrid />
            
            {/* Parallax Background Elements */}
            <motion.div 
                className="absolute inset-0 pointer-events-none"
                style={{ y: backgroundY }}
            >
                {/* Horizontal Scale Lines */}
                <div className="absolute top-1/4 left-0 right-0 h-px bg-white/5" />
                <div className="absolute top-3/4 left-0 right-0 h-px bg-white/5" />
            </motion.div>

            <div className="max-w-6xl mx-auto relative z-10">
                
                {/* HEADER SECTION */}
                <motion.div
                    className="mb-12 border-b border-white/20 pb-6"
                    initial={{ opacity: 0, y: -30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 border border-white/30 flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rotate-45" />
                            </div>
                            <div>
                                <h2 className="text-xl font-mono text-white tracking-[0.2em] uppercase font-bold">
                                    Performance Metrics
                                </h2>
                                <span className="text-[9px] font-mono text-white/40 tracking-widest">
                                    SYS.VER.2.5 // BUILD 2025
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-mono text-white/40 tracking-widest">ID 001</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono text-white/60 tracking-widest">TAXI</span>
                                <motion.div
                                    className="w-2 h-2 bg-white"
                                    animate={{ opacity: [1, 0.2, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <span className="text-[9px] font-mono text-white tracking-widest">ACT</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* MAIN GRID LAYOUT */}
                <div className="grid grid-cols-12 gap-4">
                    
                    {/* LEFT SCALE */}
                    <div className="col-span-1 hidden lg:flex">
                        <SideScale side="left" delay={0.2} />
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="col-span-12 lg:col-span-10 space-y-6">
                        
                        {/* TOP ROW - Primary Gauges */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Enterprise AI Adoption */}
                            <InstrumentPanel title="ADOPTION" id="001-A" delay={0.1}>
                                <ArcGauge 
                                    value={72} 
                                    label="Enterprise AI" 
                                    sublabel="Global Integration"
                                    size={140}
                                    delay={0.2}
                                />
                            </InstrumentPanel>
                            
                            {/* Customer Experience */}
                            <InstrumentPanel title="CX TRANSFORM" id="001-B" delay={0.2}>
                                <ArcGauge 
                                    value={95} 
                                    label="Experience" 
                                    sublabel="Satisfaction Index"
                                    size={140}
                                    delay={0.3}
                                />
                            </InstrumentPanel>
                            
                            {/* Cost Reduction */}
                            <InstrumentPanel title="EFFICIENCY" id="001-C" delay={0.3}>
                                <ArcGauge 
                                    value={68} 
                                    label="Cost Reduction" 
                                    sublabel="Operational Savings"
                                    size={140}
                                    delay={0.4}
                                />
                            </InstrumentPanel>
                        </div>

                        {/* MIDDLE ROW - Linear Gauges & Digital Readouts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* ROI Linear Gauge */}
                            <InstrumentPanel title="ROI ANALYSIS" id="002-A" delay={0.4} className="h-full">
                                <div className="space-y-6 py-2">
                                    <LinearGauge 
                                        value={3.5} 
                                        maxValue={5}
                                        label="Return on Investment"
                                        unit="x"
                                        delay={0.5}
                                    />
                                    <div className="flex justify-between text-[8px] font-mono text-white/40 pt-2">
                                        <span>BASELINE: 1.0x</span>
                                        <span>TARGET: 5.0x</span>
                                        <span>CURRENT: 3.5x</span>
                                    </div>
                                </div>
                            </InstrumentPanel>
                            
                            {/* Digital Stats Grid */}
                            <InstrumentPanel title="METRICS" id="002-B" delay={0.5} className="h-full">
                                <div className="grid grid-cols-2 gap-4 py-2">
                                    <DigitalDisplay 
                                        value={72} 
                                        label="Adoption %" 
                                        unit="%" 
                                        delay={0.6}
                                    />
                                    <DigitalDisplay 
                                        value={95} 
                                        label="CX Score" 
                                        unit="%" 
                                        delay={0.7}
                                    />
                                    <DigitalDisplay 
                                        value={3.5} 
                                        label="ROI Mult" 
                                        unit="x" 
                                        delay={0.8}
                                    />
                                    <DigitalDisplay 
                                        value={68} 
                                        label="Cost Cut" 
                                        unit="%" 
                                        delay={0.9}
                                    />
                                </div>
                            </InstrumentPanel>
                        </div>

                        {/* BOTTOM ROW - Mission Display */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <MissionDisplay delay={0.7} />
                        </motion.div>

                    </div>

                    {/* RIGHT SCALE */}
                    <div className="col-span-1 hidden lg:flex justify-end">
                        <SideScale side="right" delay={0.3} />
                    </div>
                </div>

                {/* BOTTOM STATUS BAR */}
                <motion.div
                    className="mt-12 border-t border-white/20 pt-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1, duration: 0.8 }}
                >
                    <div className="flex items-center justify-between text-[8px] font-mono text-white/40">
                        <div className="flex items-center gap-6">
                            <span>SYS.STATUS: NOMINAL</span>
                            <span>DATA.INTEGRITY: 100%</span>
                            <span>LAST.UPDATE: REALTIME</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>REF: HUD.2025.v1</span>
                            <span>AUTH: VERIFIED</span>
                            <motion.div
                                className="w-16 h-4 border border-white/20 flex items-center justify-center"
                                animate={{ borderColor: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <span className="text-[7px] tracking-widest">ACTIVE</span>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

            </div>

            {/* Progress Line */}
            <motion.div
                className="absolute bottom-0 left-0 h-px bg-white origin-left"
                style={{ 
                    width: '100%',
                    scaleX: scrollYProgress 
                }}
            />
        </section>
    );
};

export default ComparisonSection;
