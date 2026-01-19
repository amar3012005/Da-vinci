import { motion } from 'framer-motion';

/**
 * MobileAboutSection - Clean Theme
 * Minimal, monospaced typography with bracketed cards.
 */
const MobileAboutSection = () => {
    return (
        <section id="about-section" className="py-20 px-6 relative overflow-hidden bg-[#0a0a0a]">
            <div className="relative z-10 max-w-lg mx-auto">

                {/* About Us Header Bar */}
                <motion.div
                    className="relative bg-white/[0.03] border border-white/10 p-4 mb-8"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/30" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/30" />
                    <div className="text-[10px] font-mono text-white/90 uppercase tracking-widest">./Contact Us - At admin@da-vinci.ai</div>
                </motion.div>








            </div>
        </section>
    );
};

export default MobileAboutSection;
