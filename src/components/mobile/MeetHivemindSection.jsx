import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
// import { Cpu, Globe } from 'lucide-react'; // Removing unused icons

/**
 * ContextProblemSection - Redesigned to mirror MeetTaraSection
 * Featuring a generative HiveMind visualization on the left and 
 * high-impact capabilities branding on the right.
 */
const MeetHivemindSection = () => {
    const rightPanelRef = useRef(null);
    const sectionRef = useRef(null);
    const [isRightHovered, setIsRightHovered] = useState(false);


    return (
        <section
            id="context-problem-section"
            ref={sectionRef}
            className="min-h-screen relative overflow-hidden bg-black flex items-stretch"
        >
            {/* Background Grain/Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3BaseFilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/baseFilter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />

            <div className="relative z-10 w-full flex flex-col lg:flex-row-reverse overflow-hidden">

                {/* Right Panel: High-Impact Visual (Mirrored from MeetTara's Left) */}
                <div
                    ref={rightPanelRef}
                    onMouseEnter={() => setIsRightHovered(true)}
                    onMouseLeave={() => setIsRightHovered(false)}
                    className="relative w-full lg:w-1/2 min-h-[50vh] lg:min-h-screen overflow-hidden bg-black border-l border-white/10"
                >
                    <div className="absolute inset-0">
                        <img
                            src="/hivemind_bg.jpeg"
                            alt="HiveMind Architecture"
                            className={`w-full h-full object-cover transition-all duration-1000 grayscale opacity-60 ${isRightHovered ? "scale-110" : "scale-105"}`}
                        />
                    </div>

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />

                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-12 text-center">
                        <motion.div
                            className={`mb-8 transition-all duration-1000 ${isRightHovered ? "opacity-100" : "opacity-40"}`}
                        >
                            <img
                                src="/images/davinci-logo.svg"
                                alt="DA'VINCI"
                                width={80}
                                height={80}
                                className="filter brightness-0 invert"
                            />
                        </motion.div>

                        <div className="space-y-6 flex flex-col items-center max-w-md mx-auto px-4 mt-8">
                            <motion.h2
                                className="text-3xl md:text-5xl font-light text-white leading-tight"
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                            >
                                Your Enterprise <br className="hidden md:block"/>
                                Memory, Sovereignly <br className="hidden md:block"/>
                                Reimagined.
                            </motion.h2>
                            
                            <motion.p
                                className="text-white/60 text-sm md:text-base leading-relaxed font-light"
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                            >
                                HIVEMIND is the universal memory layer for your AI stack. Preserve context, automate intelligence, and sever the "siloed memory" problem.
                            </motion.p>
                            
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4 }}
                                className="pt-4"
                            >
                                <button className="px-6 py-3 rounded-full border border-white/20 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium tracking-wide w-auto cursor-pointer shadow-lg shadow-white/5" onClick={() => window.location.href = 'https://hivemind.davincisolutions.de'}>
                                    Connect to HIVEMIND
                                </button>
                            </motion.div>
                        </div>

                    </div>

                    {/* Top Right Label */}
                    <div className="absolute top-8 right-8 z-20">
                        <div className="flex items-center gap-3">
                            <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest italic">Node: MMAR_CENTRAL</span>
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Left Panel: Generative HiveMind Visualization */}
                <div className="relative w-full lg:w-1/2 min-h-[50vh] lg:min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden">
                    {/* Generative HiveMind Canvas */}
                    <div className="absolute inset-0 pointer-events-none">
                        <HiveMindCanvas />
                    </div>

                    {/* Subtle Branding Centered Below Cluster */}
                    <div className="relative z-20 mt-[35vh] md:mt-[45vh]">
                        <span className="text-white/20 font-mono text-[9px] uppercase tracking-[0.5em] tracking-widest">
                            ./HIVEMIND
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
};

/**
 * HiveMindCanvas - A simplified regenerative neural visualization
 * Inspired by HiveMind.tsx and NeuralMind.tsx
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
        const particleCount = isMobile ? 90 : 240; // Reduced density for mobile
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
                twinkle: Math.random() * Math.PI * 2
            });
        }

        const animate = () => {
            const time = Date.now() * 0.001;
            ctx.clearRect(0, 0, width, height);

            // Update particle positions with structured rotational drift
            particles.forEach((p) => {
                p.baseAngle += p.rotationSpeed;
                const dynamicR = p.baseR + Math.sin(time * 0.5 + p.angleOffset) * 5;

                p.x = centerX + Math.cos(p.baseAngle) * dynamicR;
                p.y = centerY + Math.sin(p.baseAngle) * dynamicR;
                p.twinkle += 0.03;
            });

            // Draw bright connections first (underneath particles)
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                // Check local neighbors to create a dense web
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distSq = dx * dx + dy * dy;
                    const maxDist = isMobile ? 55 : 80;

                    if (distSq < maxDist * maxDist) {
                        const dist = Math.sqrt(distSq);
                        // Significantly brighter lines as requested
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
                const mouseDist = Math.sqrt(Math.pow(mouseRef.current.x - p.x, 2) + Math.pow(mouseRef.current.y - p.y, 2));
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
                y: e.clientY - rect.top
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

export default MeetHivemindSection;
