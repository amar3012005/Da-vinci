"use client";

import { useEffect, useRef } from 'react';

interface HiveMindProps {
    width?: number;
    height?: number;
    nodeCount?: number;
    connectionDistance?: number;
    nodeColor?: string;
    lineColor?: string;
    backgroundColor?: string;
}

export default function HiveMind({
    width = 400,
    height = 240,
    nodeCount = 60,
    connectionDistance = 45,
    nodeColor = "rgba(100, 100, 100, 0.8)",
    lineColor = "rgba(150, 150, 150, 0.15)",
    backgroundColor = "transparent"
}: HiveMindProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<any[]>([]);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Brain shape boundary (simplified polygon normalized 0-1)
    // Points approx tracing a side-view brain shape
    const brainShapePoints = [
        [0.2, 0.7], [0.15, 0.6], [0.15, 0.4], [0.25, 0.25],
        [0.4, 0.15], [0.6, 0.15], [0.8, 0.25], [0.9, 0.4],
        [0.9, 0.6], [0.8, 0.8], [0.6, 0.9], [0.4, 0.85],
        [0.35, 0.8], [0.3, 0.85], [0.25, 0.8]
    ];

    // Check if point is inside brain polygon (Ray casting algorithm)
    const isInsideBrain = (x: number, y: number, w: number, h: number) => {
        // Center the shape in the canvas
        // The polygon is 0-1, so we scale it by width/height but add padding/centering offset
        // Effective width/height of brain
        const bw = w * 0.8;
        const bh = h * 0.8;
        const offsetX = w * 0.1;
        const offsetY = h * 0.1;

        // Transform point back to 0-1 space relative to the brain box
        const nx = (x - offsetX) / bw;
        const ny = (y - offsetY) / bh;

        // Bounding box check in normalized space
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return false;

        let inside = false;
        for (let i = 0, j = brainShapePoints.length - 1; i < brainShapePoints.length; j = i++) {
            const xi = brainShapePoints[i][0], yi = brainShapePoints[i][1];
            const xj = brainShapePoints[j][0], yj = brainShapePoints[j][1];

            const intersect = ((yi > ny) !== (yj > ny))
                && (nx < (xj - xi) * (ny - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // High DPI Support
        const dpr = window.devicePixelRatio || 1;
        // Set internal resolution to match device pixels
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        // Scale drawing operations so logic remains in CSS pixels
        ctx.scale(dpr, dpr);

        // Ensure CSS size matches logical size
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Initialize particles
        particlesRef.current = [];
        let attempts = 0;

        // Ensure enough particles for a dense look
        while (particlesRef.current.length < nodeCount && attempts < 5000) {
            const x = Math.random() * width;
            const y = Math.random() * height;

            if (isInsideBrain(x, y, width, height)) {
                particlesRef.current.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 0.2, // Slower base speed
                    vy: (Math.random() - 0.5) * 0.2,
                    homeX: x,
                    homeY: y,
                    size: Math.random() * 1.5 + 0.5, // Smaller stars
                    twinkleSpeed: Math.random() * 0.03 + 0.005, // Random blink speed
                    twinklePhase: Math.random() * Math.PI * 2, // Random starting phase
                    baseAlpha: Math.random() * 0.5 + 0.3 // Random base brightness
                });
            }
            attempts++;
        }

        const animate = () => {
            if (!canvas || !ctx) return;
            // Clear rect must use logical dimensions because of ctx.scale
            ctx.clearRect(0, 0, width, height);

            // Subtle Heartbeat scaling for the whole system
            const time = Date.now() * 0.001;
            const heartbeat = 1 + Math.sin(time * 2) * 0.005; // Very subtle breath/pulse

            // Save context state before global transformations
            ctx.save();
            // Center scaling
            ctx.translate(width / 2, height / 2);
            ctx.scale(heartbeat, heartbeat);
            ctx.translate(-width / 2, -height / 2);

            // Draw Background (if any)
            if (backgroundColor !== "transparent") {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, width, height);
            }

            // Update and draw particles
            particlesRef.current.forEach((p, i) => {
                // Base movement
                p.x += p.vx;
                p.y += p.vy;

                // Update Twinkle
                p.twinklePhase += p.twinkleSpeed;
                const currentAlpha = p.baseAlpha + Math.sin(p.twinklePhase) * 0.2; // Pulse alpha around base
                // Clamp alpha between 0.1 and 1
                const finalAlpha = Math.max(0.1, Math.min(1, currentAlpha));

                // Mouse interaction - Connect to mouse instead of moving nodes
                const dx = mouseRef.current.x - p.x;
                const dy = mouseRef.current.y - p.y;
                const distToMouse = Math.sqrt(dx * dx + dy * dy);
                const mouseInteractionRadius = 120; // Radius where mouse connects

                if (distToMouse < mouseInteractionRadius) {
                    // Draw connection to mouse
                    ctx.beginPath();
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 0.6;
                    ctx.globalAlpha = (1 - (distToMouse / mouseInteractionRadius)) * 0.8;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;

                    // Slightly increase node size when connected to mouse
                    const highlightSize = p.size * 1.5;
                    ctx.fillStyle = "#fff"; // Bright white highlight
                    ctx.globalAlpha = 0.8;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, highlightSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }

                // Damping
                p.vx *= 0.98;
                p.vy *= 0.98;

                // Soft constraints - bounds check
                if (!isInsideBrain(p.x, p.y, width, height)) {
                    // Stronger pull back to home if outside
                    p.vx += (p.homeX - p.x) * 0.02;
                    p.vy += (p.homeY - p.y) * 0.02;
                }

                // Draw Node (Star)
                ctx.fillStyle = nodeColor;
                ctx.globalAlpha = finalAlpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0; // Reset for lines

                // Draw Connecting Lines
                for (let j = i + 1; j < particlesRef.current.length; j++) {
                    const p2 = particlesRef.current[j];
                    const distX = p.x - p2.x;
                    const distY = p.y - p2.y;
                    const dist = Math.sqrt(distX * distX + distY * distY);

                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.strokeStyle = lineColor;
                        ctx.lineWidth = 0.4;
                        // Opacity based on distance AND node usage
                        // Lines also twinkle slightly based on parent nodes
                        ctx.globalAlpha = (1 - (dist / connectionDistance)) * finalAlpha * 0.8;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                        ctx.globalAlpha = 1.0;
                    }
                }
            });

            // Restore context state
            ctx.restore();

            animationFrameRef.current = requestAnimationFrame(animate);

        };


        animate();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [width, height, nodeCount, connectionDistance, nodeColor, lineColor]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseLeave = () => {
        mouseRef.current = { x: -1000, y: -1000 };
    };

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                width: width,
                height: height,
                cursor: 'crosshair',
                borderRadius: '8px',
            }}
        />
    );
}
