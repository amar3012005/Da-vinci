import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, AlertCircle, ExternalLink } from 'lucide-react';

const HIVEMIND_SITE_URL = process.env.REACT_APP_HIVEMIND_SITE_URL || 'https://hivemind.davinciai.eu';

/**
 * MobileNavigation - Floating hamburger menu with full-screen overlay
 */
const MobileNavigation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);

    // Scroll Lock Effect
    React.useEffect(() => {
        if (isOpen || showAnnouncements) {
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
    }, [isOpen, showAnnouncements]);

    const handleNavClick = (sectionId) => {
        if (sectionId === 'announcements-toggle') {
            setShowAnnouncements(true);
            setIsOpen(false);
            return;
        }

        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            setIsOpen(false);
        }
    };

    const navItems = [
        { label: './Meet Tara', sectionId: 'meet-tara-section' },
        { label: './Pricings', sectionId: 'pricing-section' },
        { label: './Contact Us', sectionId: 'cta-section' },
        { label: './Announcements', sectionId: 'announcements-toggle' },
    ];

    return (
        <>
            {/* Floating Menu Button */}
            <motion.button
                className="fixed top-4 right-4 z-50 w-12 h-12 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X className="w-5 h-5 text-white" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="menu"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Menu className="w-5 h-5 text-white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>



            {/* Full-Screen Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/98 backdrop-blur-2xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Background gradient */}
                        {/* Black Background with Dots */}
                        <div className="absolute inset-0 bg-black" />
                        <div
                            className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{
                                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                                backgroundSize: '20px 20px',
                            }}
                        />

                        {/* Navigation Items */}
                        <div className="flex flex-col items-center justify-center h-full space-y-8 relative z-10">
                            {navItems.map((item, index) => (
                                <motion.button
                                    key={item.sectionId}
                                    onClick={() => handleNavClick(item.sectionId)}
                                    className="text-white/70 hover:text-white text-3xl font-light tracking-wide transition-colors duration-300"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
                                    whileHover={{ scale: 1.05, x: 10 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {item.label}
                                </motion.button>
                            ))}

                            {/* Hivemind Button */}
                            <motion.a
                                href={HIVEMIND_SITE_URL}
                                className="group flex items-center gap-3 text-[#A63E1B] hover:text-[#ff6b35] text-3xl font-light tracking-wide transition-colors duration-300"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4, delay: 0.1 + navItems.length * 0.08 }}
                                whileHover={{ scale: 1.05, x: 10 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <span>HIVEMIND</span>
                                <ExternalLink className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </motion.a>

                            {/* Brand at bottom */}
                            <motion.div
                                className="absolute bottom-12 left-0 right-0 text-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <p className="text-white/30 text-xs font-mono tracking-widest">
                                    DA'VINCI SOLUTIONS
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Announcements Slide-in Panel */}
            <AnimatePresence>
                {showAnnouncements && (
                    <>
                        {/* Backdrop to close */}
                        <motion.div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAnnouncements(false)}
                        />

                        {/* Slide-in Panel */}
                        <motion.div
                            className="fixed top-0 right-0 bottom-0 w-80 bg-[#0a0a0a] border-l border-white/10 z-[60] shadow-2xl p-6 flex flex-col"
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            {/* Header */}
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

                            {/* Content */}
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <AlertCircle size={24} className="text-white/30" />
                                </div>
                                <h3 className="text-white font-light text-lg mb-2">No New Updates</h3>
                                <p className="text-white/40 text-xs font-mono max-w-[200px]">
                                    Check back later for the latest news and releases from Da'Vinci.
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="mt-auto pt-6 border-t border-white/5">
                                <div className="text-[10px] font-mono text-white/20 text-center">
                                    SYSTEM: ALL SYSTEMS OPERATIONAL
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default MobileNavigation;
