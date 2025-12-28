import React from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowUpRight } from 'lucide-react';

/**
 * MobileCTA - Refined "Clean" Aesthetic
 * Inspired by the provided reference image with bracketed buttons and monospaced labels.
 */
const MobileCTA = () => {

    const handleAction = (type) => {
        if (type === 'demo') {
            window.location.href = 'mailto:amarsai2005@gmail.com?subject=Demo Request';
        } else {
            window.location.href = 'mailto:amarsai2005@gmail.com?subject=Join Team';
        }
    };

    return (
        <section id="cta-section" className="py-24 px-6 relative overflow-hidden bg-[#0a0a0a]">

            <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">

            

                

                
            
            </div>

            {/* Industrial Bottom Scroll Detail */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20">
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-px h-8 bg-gradient-to-b from-white to-transparent"
                />
            </div>
        </section>
    );
};

export default MobileCTA;
