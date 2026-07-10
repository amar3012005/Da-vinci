import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { HIVEMIND_URL } from './hivemindLinks';

const HIVEMIND_SITE_URL = HIVEMIND_URL;

// -----------------------------------------------
// Corner Crosshair Component
// -----------------------------------------------
const Crosshair = ({ className = '' }) => (
    <div className={`absolute w-4 h-4 ${className}`}>
        <div className="absolute top-1/2 left-0 w-4 h-px bg-[#525252]/85 -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 h-4 w-px bg-[#525252]/85 -translate-x-1/2" />
    </div>
);

// -----------------------------------------------
// HiveMindCanvas — generative particle cluster
// -----------------------------------------------
const HiveMindCanvas = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let width = canvas.offsetWidth;
        let height = canvas.offsetHeight;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const particles = [];
        const isMobile = width < 768;
        const particleCount = isMobile ? 90 : 240;
        const centerX = width / 2;
        const centerY = height / 2;
        const clusterRadius = Math.min(width, height) * (isMobile ? 0.38 : 0.32);

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.pow(Math.random(), 0.7) * clusterRadius;

            particles.push({
                x: centerX + Math.cos(angle) * r,
                y: centerY + Math.sin(angle) * r,
                baseR: r,
                baseAngle: angle,
                angleOffset: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.002,
                driftSpeed: 0.001 + Math.random() * 0.002,
                size: Math.random() * 1.5 + 0.5,
                twinkle: Math.random() * Math.PI * 2,
            });
        }

        const animate = () => {
            const time = Date.now() * 0.001;
            ctx.clearRect(0, 0, width, height);

            particles.forEach((p) => {
                p.baseAngle += p.rotationSpeed;
                const dynamicR = p.baseR + Math.sin(time * 0.5 + p.angleOffset) * 5;
                p.x = centerX + Math.cos(p.baseAngle) * dynamicR;
                p.y = centerY + Math.sin(p.baseAngle) * dynamicR;
                p.twinkle += 0.03;
            });

            // Connection lines
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distSq = dx * dx + dy * dy;
                    const maxDist = isMobile ? 55 : 80;

                    if (distSq < maxDist * maxDist) {
                        const dist = Math.sqrt(distSq);
                        const alpha = (1 - dist / maxDist) * (isMobile ? 0.25 : 0.35);
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            // Particles
            particles.forEach((p) => {
                const mouseDist = Math.sqrt(
                    Math.pow(mouseRef.current.x - p.x, 2) + Math.pow(mouseRef.current.y - p.y, 2)
                );
                const brightness = mouseDist < 120 ? 1 : 0.6 + Math.sin(p.twinkle) * 0.4;

                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                ctx.arc(p.x, p.y, p.size * (mouseDist < 80 ? 1.5 : 1), 0, Math.PI * 2);
                ctx.fill();

                if (mouseDist < 80) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const handleResize = () => {
            width = canvas.offsetWidth;
            height = canvas.offsetHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full" />;
};

// -----------------------------------------------
// Feature cards data
// -----------------------------------------------
const features = [
    {
        label: 'Persistent Memory',
        desc: 'Every conversation, decision, and artifact stored with full temporal context. Your AI never forgets.',
    },
    {
        label: 'Graph Intelligence',
        desc: 'Knowledge graph weaves relationships across entities, surfacing connections no flat search can find.',
    },
    {
        label: 'Cross-Platform Sync',
        desc: 'One memory layer powering every tool -- Slack, Linear, Notion, GitHub -- with sovereign EU hosting.',
    },
];

// -----------------------------------------------
// MeetHivemindSection
// -----------------------------------------------
const MeetHivemindSection = () => {
    return (
        <section
            id="context-problem-section"
            className="min-h-screen bg-[#080808] relative overflow-hidden"
        >
            {/* Grid overlay lines at edges */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Left edge */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-[#525252]/20" />
                {/* Right edge */}
                <div className="absolute right-6 top-0 bottom-0 w-px bg-[#525252]/20" />
                {/* Top edge */}
                <div className="absolute top-0 left-0 right-0 h-px bg-[#525252]/20" />
                {/* Bottom edge */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-[#525252]/20" />
            </div>

            {/* Main container */}
            <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
                {/* 2-column layout: Visual (left) + Text (right) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[70vh]">

                    {/* LEFT — Canvas Visual */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="relative order-2 lg:order-1"
                    >
                        <div className="relative border border-[#525252]/80 bg-[#080808] aspect-square lg:aspect-[4/3] overflow-hidden">
                            {/* Corner crosshairs */}
                            <Crosshair className="top-2 left-2" />
                            <Crosshair className="top-2 right-2" />
                            <Crosshair className="bottom-2 left-2" />
                            <Crosshair className="bottom-2 right-2" />

                            {/* Canvas */}
                            <div className="absolute inset-0">
                                <HiveMindCanvas />
                            </div>

                            {/* Bottom-left label */}
                            <div className="absolute bottom-4 left-4 z-10">
                                <span className="text-[9px] font-mono text-[#E7E7ED]/25 uppercase tracking-[0.4em]">
                                    ./HIVEMIND
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT — Text content */}
                    <div className="order-1 lg:order-2 flex flex-col justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            {/* Section number */}
                            <p className="text-[11px] font-mono text-[#E7E7ED]/45 uppercase tracking-widest mb-4">
                                [02] HIVEMIND
                            </p>

                            {/* Heading */}
                            <h2 className="text-4xl md:text-5xl font-light text-white leading-[0.9] font-['Montserrat'] mb-6">
                                Your Enterprise{' '}
                                <em className="font-serif italic font-light">Memory</em>
                                <br />
                                <span className="mt-2 block">Sovereignly Reimagined</span>
                            </h2>

                            {/* Description */}
                            <p className="text-base text-[#9E9E9E] leading-relaxed mb-6 max-w-md">
                                HIVEMIND is the universal memory layer for your AI stack. Preserve context,
                                automate intelligence, and eliminate siloed knowledge across every tool
                                your team touches.
                            </p>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-8">
                                {['Knowledge Graph', 'Vector Search', 'EU Sovereign'].map((badge) => (
                                    <span
                                        key={badge}
                                        className="bg-[#262626] text-[#E7E7ED]/65 py-1 px-4 text-sm rounded-none"
                                    >
                                        {badge}
                                    </span>
                                ))}
                            </div>

                            {/* CTA */}
                            <a
                                href={HIVEMIND_SITE_URL}
                                className="inline-flex items-center gap-2 text-[#E7E7ED] text-base hover:text-[#0064FD] transition-colors group"
                            >
                                Connect to HIVEMIND
                                <ArrowRight
                                    size={16}
                                    className="transition-transform group-hover:translate-x-1"
                                />
                            </a>
                        </motion.div>
                    </div>
                </div>

                {/* -----------------------------------------------
                    Bottom: 3-column feature cards
                    ----------------------------------------------- */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-24"
                >
                    {/* Top divider */}
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[#525252]/60 to-transparent mb-12" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                        {features.map((feature, idx) => (
                            <div key={feature.label} className="relative px-6 py-6">
                                {/* Vertical gradient divider between cards */}
                                {idx > 0 && (
                                    <div className="hidden md:block absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#525252]/50 to-transparent" />
                                )}

                                {/* Feature number */}
                                <span className="text-[10px] font-mono text-[#E7E7ED]/30 uppercase tracking-widest mb-3 block">
                                    0{idx + 1}
                                </span>

                                {/* Feature title */}
                                <h3 className="text-lg font-light text-white mb-2 font-['Montserrat']">
                                    {feature.label}
                                </h3>

                                {/* Feature description */}
                                <p className="text-sm text-[#9E9E9E] leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default MeetHivemindSection;
