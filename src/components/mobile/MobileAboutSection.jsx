import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Linkedin, ArrowRight } from 'lucide-react';
import { useTheme, t } from './ThemeContext';

const LINKEDIN_URL = 'https://www.linkedin.com/company/singulance-ai/?viewAsMember=true';
const SUPPORT_EMAIL = 'support@singulancelabs.com';

const MobileAboutSection = () => {
    const { isDark } = useTheme();
    const c = t(isDark);

    return (
        <section id="cta-section" className={`${c.bg} border-t ${c.border} py-24 px-6 pb-36`}>
            <div className="max-w-[1200px] mx-auto">
                {/* Section label */}
                <motion.div
                    className="mb-10"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className={`text-xs font-mono ${c.textMuted} uppercase tracking-[0.3em] mb-4`}>
                        Contact
                    </div>
                    <h2 className={`text-3xl font-bold ${c.text} font-['Space_Grotesk'] mb-3`}>
                        Talk to us
                    </h2>
                    <p className={`text-sm ${c.textSecondary} leading-relaxed`}>
                        Questions, partnership inquiries, or just want to say hello — we'd love to hear from you.
                    </p>
                </motion.div>

                {/* Contact card */}
                <motion.div
                    className={`${c.bgCard} border ${c.border} p-6 mb-6 ${c.shadow}`}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    {/* Email */}
                    <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className={`flex items-center gap-4 ${c.bg} border ${c.border} p-4 mb-4 ${c.hoverBg} transition-colors group no-underline`}
                    >
                        <div className={`w-10 h-10 ${isDark ? 'bg-[#1a1a1a]' : 'bg-black/[0.04]'} flex items-center justify-center shrink-0`}>
                            <Mail size={16} className={c.textSecondary} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-[10px] font-mono ${c.textMuted} uppercase tracking-widest mb-0.5`}>Email</div>
                            <div className={`text-sm ${c.text} font-medium truncate`}>{SUPPORT_EMAIL}</div>
                        </div>
                        <ArrowRight size={14} className={`${c.textMuted} group-hover:translate-x-0.5 transition-all shrink-0`} />
                    </a>

                    {/* LinkedIn */}
                    <a
                        href={LINKEDIN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-4 ${c.bg} border ${c.border} p-4 ${c.hoverBg} transition-colors group no-underline`}
                    >
                        <div className={`w-10 h-10 ${isDark ? 'bg-[#1a1a1a]' : 'bg-black/[0.04]'} flex items-center justify-center shrink-0`}>
                            <Linkedin size={16} className={c.textSecondary} />
                        </div>
                        <div className="flex-1">
                            <div className={`text-[10px] font-mono ${c.textMuted} uppercase tracking-widest mb-0.5`}>LinkedIn</div>
                            <div className={`text-sm ${c.text} font-medium`}>SINGULANCE AI</div>
                        </div>
                        <ArrowRight size={14} className={`${c.textMuted} group-hover:translate-x-0.5 transition-all shrink-0`} />
                    </a>
                </motion.div>

                {/* CTA button */}
                <motion.a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className={`w-full py-3.5 rounded-full ${c.accentBg} ${c.accentText} font-semibold text-xs uppercase tracking-[0.15em] ${c.accentHover} no-underline flex items-center justify-center gap-2 transition-colors`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                >
                    Write to us
                    <ArrowRight size={14} />
                </motion.a>

                {/* Footer */}
                <motion.div
                    className={`text-[10px] font-mono ${c.textMuted} tracking-[0.3em] uppercase text-center mt-12 pt-6 border-t ${c.border}`}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    SINGULANCE / 2026
                </motion.div>
            </div>
        </section>
    );
};

export default MobileAboutSection;
