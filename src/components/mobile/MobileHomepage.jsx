import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Lenis from 'lenis';

// Import all mobile components
import MobileNavigation from './MobileNavigation';
import MobileHero from './MobileHero';
import MeetTaraSection from './MeetTaraSection';
import ContextProblemSection from './ContextProblemSection';
import ComparisonSection from './ComparisonSection';
import CapabilitiesSection from './CapabilitiesSection';
import MobilePricingSection from './MobilePricingSection';
import MobileAboutSection from './MobileAboutSection';
import MobileCTA from './MobileCTA';

/**
 * MobileHomepage - Main container orchestrating all mobile sections
 * Premium redesigned mobile experience for TARA
 */
const MobileHomepage = () => {
    // Smooth scroll setup
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            smoothTouch: false,
            touchMultiplier: 2,
        });

        // Make lenis accessible globally for modal scroll locking
        window.lenis = lenis;

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
            window.lenis = null;
        };
    }, []);

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

            {/* Meet TARA - Introduction */}
            <MeetTaraSection />

            {/* Context Problem + MMAR Solution */}
            <ContextProblemSection />

            {/* Comparison: Traditional vs TARA */}
            <ComparisonSection />

            {/* Pricing Plans */}
            <MobilePricingSection />

            {/* About Us Section */}
            <MobileAboutSection />

            {/* Contact the Founder (Modified CTA) */}
            <MobileCTA />
        </motion.div>
    );
};

export default MobileHomepage;
