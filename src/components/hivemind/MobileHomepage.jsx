import React from 'react';
import { motion } from 'framer-motion';

// Import all mobile components
import MobileNavigation from './MobileNavigation';
import MobileHero from './MobileHero';
import PhaseOneBrandSection from './PhaseOneBrandSection';
import MeetTaraSection from './MeetTaraSection';
import ContextProblemSection from './ContextProblemSection';
import ComparisonSection from './ComparisonSection';
import MobilePricingSection from './MobilePricingSection';
import MobileAboutSection from './MobileAboutSection';
import TaraVoiceWidget from './TaraVoiceWidget';

/**
 * MobileHomepage - Main container orchestrating all mobile sections
 * Premium redesigned mobile experience for TARA
 */
const MobileHomepage = () => {
    // Removed Lenis smooth scroll for better native mobile feel

    return (
        <motion.div
            className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Navigation */}
            <MobileNavigation />

            {/* Hero Section */}
            <MobileHero />

            {/* Phase 1 Brand Transformation Section */}
            <PhaseOneBrandSection />

            {/* Meet TARA - Introduction */}
            <MeetTaraSection />

            {/* Context Problem + MMAR Solution */}
            <ContextProblemSection />

            {/* Comparison: Traditional vs TARA */}
            <ComparisonSection />

            {/* Pricing Plans */}
            <MobilePricingSection />

            {/* Contact Us Section */}
            <MobileAboutSection />

            {/* TARA Voice Widget - Persistent Overlay */}
            <TaraVoiceWidget />
        </motion.div>
    );
};

export default MobileHomepage;
