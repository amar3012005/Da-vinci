import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle, FileText, Brain } from 'lucide-react';
import { RaycastAnimatedBackground } from '../mobile/ui/raycast-animated-background';

/**
 * MobilePricingSection - Carousel with side arrows and constant glowing gradient
 */

const getTaraModels = (isIndia) => [
    {
        id: '01',
        name: 'TARA_BASE',
        tagline: 'Essential AI Foundation',
        price: isIndia ? '₹xxx' : '€xxx',
        original: isIndia ? '₹xxx' : '€xxx',
        period: '/month',
        icon: MessageCircle,
        features: [
            isIndia ? 'Conversational AI (HI/TE/EN)' : 'Conversational AI (DE/EN)',
            isIndia ? 'DPDP Compliant Hosting' : 'GDPR Compliant Hosting',
            'Standard Voice Recognition'
        ],
        description: isIndia
            ? 'Perfect foundation for local businesses ensuring strict data privacy and seamless Hindi/Telugu/English interactions.'
            : 'Perfect foundation for local businesses ensuring strict data privacy and seamless German/English interactions.',
        glowColor: 'rgba(239, 68, 68, 0.5)' // Red glow
    },
    {
        id: '02',
        name: 'TARA PRO',
        tagline: 'Advanced Intelligence + Form Automation',
        price: isIndia ? '₹xxx' : '€xxx',
        original: isIndia ? '₹xxx' : '€xxx',
        period: '/month',
        icon: FileText,
        features: [
            'All Base Features',
            isIndia ? 'Multi-Indic Languages (HI/TE/TA)' : 'Multi-EU Languages (FR/ES/IT)',
            'Advanced NLP & Automation'
        ],
        description: isIndia
            ? 'Sophisticated AI capabilities with intelligent form automation - handling registrations and complex data collection compliant with Indian standards.'
            : 'Sophisticated AI capabilities with intelligent form automation - handling registrations and complex data collection compliant with EU standards.',
        glowColor: 'rgba(59, 130, 246, 0.5)' // Blue glow
    },
    {
        id: '03',
        name: 'TARA ENTERPRISE',
        tagline: 'Unlimited Potential + Persistent Memory',
        price: isIndia ? '₹xxx' : '€xxx',
        original: isIndia ? '₹XXXX' : '€XXXX',
        period: '/month',
        icon: Brain,
        features: [
            'All Pro Features',
            'HIVE-MEMORY Capabilities',
            'Persistent Semantic Memory'
        ],
        description: 'Enterprise-grade solution with persistent memory and optional On-Premise deployment for maximum security and control.',
        glowColor: 'rgba(168, 85, 247, 0.5)' // Purple glow
    }
];

const PricingCard = ({ model }) => {
    return (
        <div className="relative h-full flex flex-col items-center">
            {/* Main Card Container - Reduced width for side arrows */}
            <div className="relative w-[300px] h-[420px] rounded-2xl overflow-hidden shadow-2xl">

                {/* 1. Animated Gradient Background (Moving but constant) */}
                <RaycastAnimatedBackground
                    width={300}
                    height={420}
                    className="w-full h-full absolute inset-0 z-0"
                />

                {/* 2. Constant Glow Overlay (Never fades out completely) */}
                <motion.div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${model.glowColor}, transparent 70%)`
                    }}
                    animate={{
                        opacity: [0.6, 0.9, 0.6], // Stronger pulse, never 0
                        scale: [1, 1.05, 1],       // Subtle breathing
                    }}
                    transition={{
                        duration: 0.5,             // Faster pulse (was 3s)
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* 3. Dark Overlay for readability */}
                <div className="absolute inset-0 bg-black/30 z-0" />

                {/* Card Content - Overlaying the background */}
                <div className="absolute inset-0 flex flex-col justify-between p-6 text-white z-10">
                    {/* Header Section */}
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-sm font-medium text-white/90 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                {model.id}.
                            </div>
                            <motion.div
                                whileHover={{ rotate: 45 }}
                                className="w-8 h-8 border border-white/30 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm"
                            >
                                <ArrowRight size={14} />
                            </motion.div>
                        </div>

                        {/* Pricing */}
                        <div className="mb-6">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-4xl font-light text-white drop-shadow-lg">
                                    {model.price}
                                </span>
                                <span className="text-sm opacity-90 font-medium">{model.period}</span>
                            </div>
                            {model.original && (
                                <div className="text-sm opacity-70 line-through">
                                    {model.original}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle Section */}
                    <div className="flex-1 flex flex-col justify-center">
                        <h2 className="text-xl font-light mb-2 tracking-wide text-white drop-shadow-md">
                            {model.name}
                        </h2>
                        <p className="text-xs opacity-90 mb-4 font-light">
                            {model.tagline}
                        </p>

                        {/* Key Features */}
                        <div className="space-y-2">
                            {model.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-xs opacity-90">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]"></div>
                                    <span className="font-light tracking-wide">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer space to balance layout */}
                    <div className="h-4"></div>
                </div>
            </div>

            {/* Description - Below card */}
            <div className="mt-4 px-4 max-w-[300px] text-center">
                <p className="text-white/50 text-[10px] leading-relaxed font-light">
                    {model.description}
                </p>
            </div>
        </div>
    );
};

const MobilePricingSection = () => {
    const [isIndia, setIsIndia] = useState(false);

    useEffect(() => {
        setIsIndia(window.location.hostname.includes('davinciai.in'));
    }, []);

    const [currentIndex, setCurrentIndex] = useState(0);
    const models = getTaraModels(isIndia);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : models.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < models.length - 1 ? prev + 1 : 0));
    };

    return (
        <section id="pricing-section" className="py-16 px-0 relative overflow-hidden bg-[#0a0a0a]">

            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

                {/* Sparkles */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-0.5 h-0.5 bg-white/60 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 2 + Math.random() * 3, repeat: Infinity }}
                    />
                ))}
            </div>

            <div className="relative z-10">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-8 px-4"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="flex justify-center items-center gap-3 mb-3">
                        <div className="text-white/40 font-mono text-[10px]">03</div>
                        <div className="w-6 h-px bg-white/20" />
                    </div>
                    <h2 className="text-2xl font-light text-white mb-2">
                        Pricing Plans
                    </h2>
                    <p className="text-[10px] text-white/50">
                        Choose the perfect plan for your business
                    </p>
                </motion.div>

                {/* Carousel Container */}
                <div className="relative mb-6 flex items-center justify-center">

                    {/* Left Arrow - Absolute Positioned */}
                    <motion.button
                        onClick={handlePrev}
                        className="absolute left-2 z-20 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md text-white/70 hover:bg-white/10 hover:text-white"
                        whileTap={{ scale: 0.9 }}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>

                    {/* Card Content */}
                    <div className="w-full relative h-[500px] flex justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: -20 }}
                                transition={{ duration: 0.4, ease: "circOut" }}
                                className="absolute"
                            >
                                <PricingCard model={models[currentIndex]} />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Right Arrow - Absolute Positioned */}
                    <motion.button
                        onClick={handleNext}
                        className="absolute right-2 z-20 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md text-white/70 hover:bg-white/10 hover:text-white"
                        whileTap={{ scale: 0.9 }}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </motion.button>
                </div>

                {/* Dots Indicator */}
                <div className="flex items-center justify-center gap-2 mt-2">
                    {models.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex
                                ? 'bg-orange-400 w-6'
                                : 'bg-white/20 w-1.5 hover:bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MobilePricingSection;
