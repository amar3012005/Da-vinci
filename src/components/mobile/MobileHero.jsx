import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowRight, Users, X, Construction, Bell, AlertCircle } from 'lucide-react';
import JoinTeamForm from './JoinTeamForm';

/**
 * MobileHero - Premium hero section with existing DA'VINCI logo
 * Includes project info header and action buttons
 */

// Project Info Card Component
const ProjectInfoCard = ({ title, value, className = '' }) => (
    <motion.div
        className={`${className}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
    >
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-lg">
            <div className="text-white/50 font-mono text-[10px] uppercase tracking-wider mb-1">
                {title}
            </div>
            <div className="text-white font-mono text-[10px]">
                {value}
            </div>
        </div>
    </motion.div>
);

const MobileHero = () => {
    const logoRef = useRef(null);
    const { scrollY } = useScroll();
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);
    const scale = useTransform(scrollY, [0, 400], [1, 0.9]);
    const navigate = useNavigate();
    const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const [isJoinTeamOpen, setIsJoinTeamOpen] = useState(false);

    useEffect(() => {
        // Logo entrance animation
        gsap.fromTo(logoRef.current,
            { opacity: 0, scale: 0.8, y: 30 },
            { opacity: 1, scale: 1, y: 0, duration: 1.5, ease: "power3.out" }
        );
    }, []);

    // Scroll Lock Effect
    useEffect(() => {
        if (isDemoModalOpen || isJoinTeamOpen || showAnnouncements) {
            document.body.style.overflow = 'hidden';
            window.lenis?.stop();
        } else {
            document.body.style.overflow = 'unset';
            window.lenis?.start();
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.lenis?.start();
        };
    }, [isDemoModalOpen, isJoinTeamOpen, showAnnouncements]);

    return (
        <section className="relative min-h-screen flex flex-col overflow-hidden">
            <motion.div
                className="flex-1 flex flex-col px-4 pt-4 pb-8"
                style={{ opacity, scale }}
            >
                {/* Project Info Cards - Header */}
                <div className="w-full mb-2 z-30"> {/* Reduced mb-4 to mb-2 */}
                    <div className="flex flex-col gap-2">
                        <ProjectInfoCard
                            title="PROJECT"
                            value={
                                <div className="space-y-0.5">
                                    <div>Location / Germany / Hannover</div>
                                    <div>Project / Mooun</div>
                                    <div>Category / Agentic</div>
                                    <div>Date / 2025</div>
                                </div>
                            }
                        />
                        <ProjectInfoCard
                            title="THE MAIN IDEA"
                        />

                        {/* Announcements Button - Aligned Right */}
                        <motion.button
                            onClick={() => setShowAnnouncements(true)}
                            className="self-end mt-1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-lg flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#A63E1B] animate-pulse" />
                                <div className="text-white font-mono text-[10px]">
                                    ./Announcements
                                </div>
                            </div>
                        </motion.button>
                    </div>
                </div>

                {/* Canyon Background Image - Low Opacity */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        backgroundImage: 'url(/canyon-bg.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center 40%',
                        opacity: 0.15
                    }}
                />

                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-black/60 z-[1] pointer-events-none" />

                {/* Subtle gradient background */}
                <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 via-transparent to-purple-500/5 pointer-events-none z-[2]" />

                {/* Radial glow behind logo */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none z-[2]" />

                {/* Main Content Container */}
                <div className="flex-1 flex flex-col items-center justify-center -mt-8"> {/* Added negative margin top to pull up */}
                    {/* DA'VINCI Logo */}
                    <motion.div
                        ref={logoRef}
                        className="relative z-10 mb-2" // Reduced mb-4
                    >
                        <img
                            src="/logo.svg"
                            alt="DA'VINCI Solutions"
                            className="w-64 h-64 object-contain" // Reduced from w-80 h-80
                        />
                    </motion.div>

                    {/* Brand Text */}
                    <motion.div
                        className="text-center mb-4 z-10 -mt-6" // Reduced mb-6, adjusted mt
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        <h2 className="text-lg font-bold text-white tracking-wider mb-1">
                            AGENTIC
                        </h2>
                        <p className="text-xs text-white/50 tracking-[0.4em] font-light">
                            PIPELINE
                        </p>
                    </motion.div>

                    {/* Main Headline - DA'VINCI AI Focus */}
                    <motion.div
                        className="text-center max-w-sm z-10 mb-6"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.9 }}
                    >
                        <h1 className="text-xl font-light text-white leading-relaxed mb-3">
                            <span className="inline-block px-3 py-0.5 bg-pink-500 text-white font-medium transform -skew-x-12">
                                <span className="inline-block transform skew-x-12">AI-Powered</span>
                            </span>
                            {' '}Enterprise Automation
                        </h1>
                        <p className="text-xs text-white/60 leading-relaxed mb-4">
                            A full suite of intelligent tools to streamline operations, unify insights, and unlock new efficiencies across every workflow.
                        </p>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        className="flex gap-4 z-10 w-full max-w-sm px-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.4 }}
                    >
                        {/* Primary Button */}
                        <motion.button
                            onClick={() => window.location.href = 'https://prometheus.davinciai.eu/'}
                            className="flex-1 py-3 px-3 bg-[#e5e5e5] text-black text-[10px] font-black uppercase tracking-widest 
                       flex items-center justify-center gap-2 hover:bg-white transition-all relative overflow-hidden group shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Prometheus <ArrowRight className="w-3 h-3 stroke-[3px]" />
                            </span>
                            {/* Corner Accents */}
                            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-black opacity-20" />
                            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-black opacity-20" />
                        </motion.button>

                        {/* Secondary Button */}
                        <motion.button
                            onClick={() => window.location.href = 'https://enterprise.davinciai.eu'}
                            className="flex-1 py-3 px-3 bg-[#111] border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest 
                       flex items-center justify-center gap-2 hover:bg-white/10 hover:border-white/40 transition-colors relative"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Enterprise
                            </span>
                            {/* Tech corners */}
                            <div className="absolute top-0 left-0 w-1 h-1 bg-white/50" />
                            <div className="absolute top-0 right-0 w-1 h-1 bg-white/50" />
                            <div className="absolute bottom-0 left-0 w-1 h-1 bg-white/50" />
                            <div className="absolute bottom-0 right-0 w-1 h-1 bg-white/50" />
                        </motion.button>
                    </motion.div>
                    {/* Scroll Indicator */}
                    <motion.div
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, y: [0, 8, 0] }}
                        transition={{
                            opacity: { delay: 1.5, duration: 0.5 },
                            y: { delay: 1.5, duration: 2, repeat: Infinity, ease: "easeInOut" }
                        }}
                    >
                        <ChevronDown className="w-5 h-5 text-white/30" />
                    </motion.div>
                </div>
            </motion.div>

            {/* Join Team Form Overlay - Outside transform context */}
            <JoinTeamForm
                isOpen={isJoinTeamOpen}
                onClose={() => setIsJoinTeamOpen(false)}
            />

            {/* Demo Request Modal - Full Screen Overlay - Outside transform context */}
            <AnimatePresence>
                {isDemoModalOpen && (
                    <motion.div
                        className="fixed inset-0 z-[10000] bg-[#0a0a0a] flex flex-col items-center justify-center p-6"
                        initial={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}
                        animate={{ opacity: 1, clipPath: 'circle(150% at 50% 50%)' }}
                        exit={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                        {/* Background Subtle Grid */}
                        <div className="absolute inset-0 pointer-events-none opacity-20"
                            style={{
                                backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                                backgroundSize: '40px 40px',
                            }}
                        />

                        {/* Close Button - Moved to TOP LEFT to avoid Hamburger */}
                        <motion.button
                            onClick={() => setIsDemoModalOpen(false)}
                            className="absolute top-6 left-6 w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            whileHover={{ scale: 1.1, rotate: -90 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <X size={24} />
                        </motion.button>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-center relative z-10"
                        >
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#A63E1B]/10 rounded-2xl mb-8 border border-[#A63E1B]/20">
                                <Construction size={40} className="text-[#A63E1B]" />
                            </div>

                            <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">
                                Under Progress
                            </h2>
                            <div className="w-16 h-1 bg-[#A63E1B] mx-auto mb-6 rounded-full" />

                            <p className="text-white/60 font-mono text-sm max-w-xs mx-auto leading-relaxed">
                                Da'VINCI-Code Sandbox is under progress.
                            </p>

                            <motion.button
                                onClick={() => setIsDemoModalOpen(false)}
                                className="mt-12 px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-[10px] rounded-full hover:bg-gray-200 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Return to Homepage
                            </motion.button>
                        </motion.div>

                        {/* Footer Tech Text */}
                        <div className="absolute bottom-8 text-[10px] text-white/20 font-mono tracking-[0.5em] uppercase">
                            Status: Building_V1
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Announcements Slide-in Panel - Outside transform context */}
            <AnimatePresence>
                {showAnnouncements && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10010]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAnnouncements(false)}
                        />
                        <motion.div
                            className="fixed top-0 right-0 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/10 z-[10020] shadow-2xl p-6 flex flex-col"
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <Bell size={18} className="text-[#A63E1B]" />
                                    <span className="text-sm font-mono text-white/70 uppercase tracking-widest">Announcements</span>
                                </div>
                                <button
                                    onClick={() => setShowAnnouncements(false)}
                                    className="text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <AlertCircle size={24} className="text-white/30" />
                                </div>
                                <h3 className="text-white font-light text-lg mb-2">No New Updates</h3>
                                <p className="text-white/40 text-xs font-mono max-w-[200px]">
                                    Check back later for the latest news and releases from Da'Vinci.
                                </p>
                            </div>
                            <div className="mt-auto pt-6 border-t border-white/5">
                                <div className="text-[10px] font-mono text-white/20 text-center">
                                    SYSTEM: ALL SYSTEMS OPERATIONAL
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </section>
    );
};

export default MobileHero;
