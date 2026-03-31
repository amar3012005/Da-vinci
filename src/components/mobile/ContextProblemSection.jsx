import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const Crosshair = ({ className = '' }) => (
    <div className={`absolute w-4 h-4 ${className}`}>
        <div className="absolute top-1/2 left-0 w-4 h-px bg-[#525252]/85 -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 h-4 w-px bg-[#525252]/85 -translate-x-1/2" />
    </div>
);

const ContextProblemSection = () => {
    const features = [
        {
            title: 'Structured Memory',
            description: 'Graph-based knowledge persistence with temporal indexing and cross-session retrieval.',
            node: 'MEM_GRAPH',
        },
        {
            title: 'Adaptive Routing',
            description: 'Force-directed agent selection with reputation scoring and blueprint matching.',
            node: 'FORCE_ROUTER',
        },
        {
            title: 'Blueprint Learning',
            description: 'Pattern extraction from repeated workflows, promoted into reusable execution templates.',
            node: 'BLUEPRINT_ENG',
        },
    ];

    return (
        <section
            id="context-problem-section"
            className="bg-[#080808] relative overflow-hidden py-20"
        >
            <div className="max-w-7xl mx-auto px-6">
                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
                    {/* Left — Particle Visualization */}
                    <motion.div
                        className="relative border border-[#525252]/80 bg-[#080808] aspect-square max-h-[560px] w-full overflow-hidden"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                    >
                        <Crosshair className="top-2 left-2" />
                        <Crosshair className="top-2 right-2" />
                        <Crosshair className="bottom-2 left-2" />
                        <Crosshair className="bottom-2 right-2" />

                        <div className="absolute inset-0">
                            <HiveMindCanvas />
                        </div>

                        {/* Bottom label */}
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                            <span className="text-[9px] font-mono text-[#525252] uppercase tracking-[0.5em]">
                                ./HIVEMIND
                            </span>
                        </div>
                    </motion.div>

                    {/* Right — Text content */}
                    <motion.div
                        className="flex flex-col justify-center"
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.15 }}
                    >
                        <p className="text-[11px] font-mono text-[#E7E7ED]/45 uppercase tracking-widest mb-4">
                            HIVEMIND POWERING
                        </p>

                        <h2 className="text-4xl md:text-5xl font-light text-white leading-[0.9] font-['Montserrat'] mb-6">
                            M.M.A.R{' '}
                            <span className="italic font-serif">Architecture</span>
                        </h2>

                        <p className="text-base text-[#9E9E9E] leading-relaxed mb-6 max-w-md">
                            Memory, Modular, Adaptive, Routing — four pillars that give HIVEMIND
                            persistent context, composable agents, dynamic force-routing, and
                            self-improving blueprint execution across every session.
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {['Memory', 'Modular', 'Adaptive', 'Routing'].map((badge) => (
                                <span
                                    key={badge}
                                    className="bg-[#262626] text-[#E7E7ED]/65 py-1 px-4 text-sm"
                                >
                                    {badge}
                                </span>
                            ))}
                        </div>

                        {/* Node indicator */}
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#525252] animate-pulse" />
                            <span className="text-[10px] font-mono text-[#676767]">
                                Node: MMAR_CENTRAL
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom feature cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#525252]/20">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            className="relative bg-[#080808] border border-[#525252]/40 p-8"
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                            <Crosshair className="top-2 right-2" />

                            <p className="text-[10px] font-mono text-[#676767] uppercase tracking-widest mb-3">
                                {feature.node}
                            </p>
                            <h3 className="text-lg font-light text-white font-['Montserrat'] mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-[#9E9E9E] leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

/**
 * HiveMindCanvas - Regenerative neural particle visualization
 */
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

            // Draw connections
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

            // Draw particles
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
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
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

export default ContextProblemSection;
