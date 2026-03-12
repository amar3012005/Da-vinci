"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from "framer-motion";

interface NeuralMindProps {
    width?: number;
    height?: number;
}

interface Neuron {
    x: number;
    y: number;
    id: number;
    connections: number[];
    importance: number;
    activationLevel: number;
    lastFired: number;
    type: 'core' | 'intermediate' | 'peripheral';
    depth: number;
}

interface Dendrite {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    thickness: number;
    opacity: number;
    active: boolean;
    signalProgress: number;
    parent: number;
    child: number;
}

export default function NeuralMind({
    width = 1200,
    height = 650
}: NeuralMindProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const neuronsRef = useRef<Neuron[]>([]);
    const dendritesRef = useRef<Dendrite[]>([]);
    const mouseRef = useRef({ x: 0, y: 0, active: false });
    const animationRef = useRef<number | undefined>(undefined);
    const frameCountRef = useRef(0);
    const [isConscious, setIsConscious] = useState(false);
    const [neuralActivity, setNeuralActivity] = useState(0);

    // Always dark mode - white on black
    const colors = {
        background: '#000000',
        neuronCore: 'rgba(255, 255, 255, 0.95)',
        neuronIntermediate: 'rgba(255, 255, 255, 0.75)',
        neuronPeripheral: 'rgba(255, 255, 255, 0.45)',
        dendritePrimary: 'rgba(255, 255, 255, 0.5)',
        dendriteSecondary: 'rgba(255, 255, 255, 0.25)',
        dendriteTertiary: 'rgba(255, 255, 255, 0.1)',
        signal: 'rgba(255, 255, 255, 1)',
        glow: 'rgba(255, 255, 255, 0.1)'
    };

    const generateNeuralNetwork = useCallback(() => {
        const neurons: Neuron[] = [];
        const dendrites: Dendrite[] = [];
        const centerX = width / 2;
        const centerY = height / 2;

        const generateBrainPoint = (): { x: number; y: number; depth: number } => {
            const angle = Math.random() * Math.PI * 2;
            const radiusX = Math.min(width, height) * 0.42;
            const radiusY = Math.min(width, height) * 0.38;
            
            const noise = Math.random() * 0.3 + 0.7;
            const r = Math.sqrt(Math.random()) * noise;
            
            const x = centerX + r * radiusX * Math.cos(angle);
            const y = centerY + r * radiusY * Math.sin(angle);
            
            const distanceFromCenter = Math.sqrt(
                Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
            ) / Math.min(radiusX, radiusY);
            
            return { x, y, depth: 1 - distanceFromCenter };
        };

        // Core neurons (highly connected centers)
        const coreCount = 15;
        for (let i = 0; i < coreCount; i++) {
            const { x, y, depth } = generateBrainPoint();
            neurons.push({
                x, y,
                id: i,
                connections: [],
                importance: 0.8 + Math.random() * 0.2,
                activationLevel: 0,
                lastFired: 0,
                type: 'core',
                depth
            });
        }

        // Intermediate neurons
        const intermediateCount = 100;
        for (let i = coreCount; i < coreCount + intermediateCount; i++) {
            const { x, y, depth } = generateBrainPoint();
            neurons.push({
                x, y,
                id: i,
                connections: [],
                importance: 0.4 + Math.random() * 0.4,
                activationLevel: 0,
                lastFired: 0,
                type: 'intermediate',
                depth
            });
        }

        // Peripheral neurons
        const peripheralCount = 350;
        for (let i = coreCount + intermediateCount; i < coreCount + intermediateCount + peripheralCount; i++) {
            const { x, y, depth } = generateBrainPoint();
            neurons.push({
                x, y,
                id: i,
                connections: [],
                importance: 0.1 + Math.random() * 0.3,
                activationLevel: 0,
                lastFired: 0,
                type: 'peripheral',
                depth
            });
        }

        // Create dense dendrite connections
        const maxConnectionDistance = 130;

        neurons.forEach((neuron, i) => {
            const distances = neurons
                .map((other, idx) => ({
                    idx,
                    dist: Math.sqrt(
                        Math.pow(other.x - neuron.x, 2) + 
                        Math.pow(other.y - neuron.y, 2)
                    )
                }))
                .filter(d => d.idx !== i && d.dist < maxConnectionDistance)
                .sort((a, b) => a.dist - b.dist);

            const connectionCount = Math.min(
                12,
                Math.floor(neuron.importance * 15) + 3
            );

            distances.slice(0, connectionCount).forEach(target => {
                if (!neuron.connections.includes(target.idx)) {
                    neuron.connections.push(target.idx);
                    neurons[target.idx].connections.push(i);

                    const targetNeuron = neurons[target.idx];
                    const combinedImportance = (neuron.importance + targetNeuron.importance) / 2;
                    const distance = target.dist;
                    
                    dendrites.push({
                        startX: neuron.x,
                        startY: neuron.y,
                        endX: targetNeuron.x,
                        endY: targetNeuron.y,
                        thickness: combinedImportance * 2.2,
                        opacity: Math.max(0.08, 1 - distance / maxConnectionDistance) * combinedImportance,
                        active: false,
                        signalProgress: 0,
                        parent: i,
                        child: target.idx
                    });
                }
            });
        });

        neuronsRef.current = neurons;
        dendritesRef.current = dendrites;
    }, [width, height]);

    useEffect(() => {
        generateNeuralNetwork();
        const timer = setTimeout(() => setIsConscious(true), 1000);
        return () => clearTimeout(timer);
    }, [generateNeuralNetwork]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const neurons = neuronsRef.current;
        const dendrites = dendritesRef.current;

        const animate = () => {
            if (!ctx) return;
            frameCountRef.current++;
            const time = Date.now() * 0.001;
            
            ctx.fillStyle = colors.background;
            ctx.fillRect(0, 0, width, height);

            let activeSignals = 0;

            // Draw all dendrites first (background layer)
            dendrites.forEach((dendrite, idx) => {
                if (!dendrite.active && Math.random() < 0.0015) {
                    dendrite.active = true;
                    dendrite.signalProgress = 0;
                }

                if (dendrite.active) {
                    dendrite.signalProgress += 0.025;
                    activeSignals++;
                    
                    if (dendrite.signalProgress >= 1) {
                        dendrite.active = false;
                        const childNeuron = neurons[dendrite.child];
                        childNeuron.activationLevel = 1;
                        childNeuron.lastFired = time;
                    }
                }

                ctx.beginPath();
                ctx.moveTo(dendrite.startX, dendrite.startY);
                ctx.lineTo(dendrite.endX, dendrite.endY);
                
                const baseOpacity = dendrite.opacity * (0.8 + Math.sin(time * 2 + idx) * 0.2);
                
                if (dendrite.thickness > 1.2) {
                    ctx.strokeStyle = colors.dendritePrimary;
                    ctx.lineWidth = dendrite.thickness;
                    ctx.globalAlpha = baseOpacity;
                } else if (dendrite.thickness > 0.6) {
                    ctx.strokeStyle = colors.dendriteSecondary;
                    ctx.lineWidth = dendrite.thickness;
                    ctx.globalAlpha = baseOpacity * 0.7;
                } else {
                    ctx.strokeStyle = colors.dendriteTertiary;
                    ctx.lineWidth = Math.max(0.3, dendrite.thickness);
                    ctx.globalAlpha = baseOpacity * 0.5;
                }
                
                ctx.stroke();

                // Signal pulse
                if (dendrite.active) {
                    const signalX = dendrite.startX + (dendrite.endX - dendrite.startX) * dendrite.signalProgress;
                    const signalY = dendrite.startY + (dendrite.endY - dendrite.startY) * dendrite.signalProgress;
                    
                    ctx.beginPath();
                    ctx.fillStyle = colors.signal;
                    ctx.globalAlpha = 0.8;
                    ctx.arc(signalX, signalY, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Glow around signal
                    const gradient = ctx.createRadialGradient(signalX, signalY, 0, signalX, signalY, 8);
                    gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    ctx.arc(signalX, signalY, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Draw neurons on top
            let totalActivation = 0;
            neurons.forEach((neuron) => {
                neuron.activationLevel *= 0.96;
                totalActivation += neuron.activationLevel;

                if (neuron.type === 'peripheral' && Math.random() < 0.0003) {
                    neuron.activationLevel = 0.4 + Math.random() * 0.4;
                    neuron.lastFired = time;
                }

                const pulse = Math.sin(time * 4 + neuron.lastFired * 8) * 0.25 + 0.75;
                const size = neuron.importance * 3.5 * (1 + neuron.activationLevel * 0.4);
                
                if (neuron.activationLevel > 0.2) {
                    const gradient = ctx.createRadialGradient(
                        neuron.x, neuron.y, 0,
                        neuron.x, neuron.y, size * 5
                    );
                    gradient.addColorStop(0, colors.glow);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    ctx.globalAlpha = neuron.activationLevel * pulse * 0.5;
                    ctx.beginPath();
                    ctx.arc(neuron.x, neuron.y, size * 5, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.beginPath();
                if (neuron.type === 'core') {
                    ctx.fillStyle = colors.neuronCore;
                    ctx.globalAlpha = 0.85 + neuron.activationLevel * 0.15;
                } else if (neuron.type === 'intermediate') {
                    ctx.fillStyle = colors.neuronIntermediate;
                    ctx.globalAlpha = 0.65 + neuron.activationLevel * 0.25;
                } else {
                    ctx.fillStyle = colors.neuronPeripheral;
                    ctx.globalAlpha = 0.35 + neuron.activationLevel * 0.35;
                }
                
                ctx.arc(neuron.x, neuron.y, size, 0, Math.PI * 2);
                ctx.fill();

                if (neuron.importance > 0.6) {
                    ctx.beginPath();
                    ctx.fillStyle = colors.signal;
                    ctx.globalAlpha = 0.7;
                    ctx.arc(neuron.x, neuron.y, size * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Mouse interaction
            if (mouseRef.current.active) {
                const mx = mouseRef.current.x;
                const my = mouseRef.current.y;
                
                ctx.beginPath();
                ctx.strokeStyle = colors.dendritePrimary;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.25;
                ctx.arc(mx, my, 25 + Math.sin(time * 5) * 3, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.globalAlpha = 0.12;
                ctx.arc(mx, my, 50 + Math.sin(time * 4) * 8, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.globalAlpha = 1.0;

            if (frameCountRef.current % 30 === 0) {
                const activity = Math.min(100, (activeSignals / dendrites.length) * 2500 + (totalActivation / neurons.length) * 60);
                setNeuralActivity(Math.round(activity));
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [width, height, colors]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            active: true
        };
    };

    const handleMouseLeave = () => {
        mouseRef.current = { x: 0, y: 0, active: false };
    };

    return (
        <div style={{ 
            position: 'relative', 
            width, 
            height,
            backgroundColor: colors.background,
            borderRadius: '20px',
            overflow: 'hidden'
        }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ width, height }}
            />
            
            {/* Status overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isConscious ? 1 : 0 }}
                transition={{ duration: 2 }}
                style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <motion.div
                        animate={{
                            boxShadow: [
                                '0 0 0px rgba(255,255,255,0)',
                                '0 0 15px rgba(255,255,255,0.6)',
                                '0 0 0px rgba(255,255,255,0)'
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#fff'
                        }}
                    />
                    <div>
                        <div style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '1px',
                            color: 'rgba(255,255,255,0.9)',
                            textTransform: 'uppercase'
                        }}>
                            Conscious
                        </div>
                        <div style={{
                            fontSize: '9px',
                            color: 'rgba(255,255,255,0.5)',
                            marginTop: '1px'
                        }}>
                            Activity: {neuralActivity}%
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Legend */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                display: 'flex',
                gap: '16px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '10px 18px',
                borderRadius: '10px',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <LegendItem label="Core" size="large" />
                <LegendItem label="Relay" size="medium" />
                <LegendItem label="Sensory" size="small" />
            </div>

            {/* Stats */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                display: 'flex',
                gap: '12px'
            }}>
                <StatBadge label="Neurons" value={neuronsRef.current.length.toString()} />
                <StatBadge label="Synapses" value={dendritesRef.current.length.toString()} />
            </div>
        </div>
    );
}

function LegendItem({ label, size }: { label: string; size: 'large' | 'medium' | 'small' }) {
    const sizes = { large: 7, medium: 4.5, small: 2.5 };
    
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
                width: sizes[size],
                height: sizes[size],
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.8)'
            }} />
            <span style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {label}
            </span>
        </div>
    );
}

function StatBadge({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '10px 14px',
            borderRadius: '8px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
            minWidth: '70px'
        }}>
            <div style={{
                fontSize: '8px',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '2px'
            }}>
                {label}
            </div>
            <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#fff'
            }}>
                {value}
            </div>
        </div>
    );
}
