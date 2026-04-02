import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTheme, t } from './ThemeContext';
import { getMobileCopy } from './mobileCopy';

const ResearchTeaser = () => {
    const { isDark, locale } = useTheme();
    const c = t(isDark);
    const copy = getMobileCopy(locale).research;

    return (
        <section className={`${c.bg} border-t ${c.border}`}>
            <div className={`max-w-[1200px] mx-auto border-x ${c.border} px-6 md:px-10 lg:px-20 py-20 lg:py-32`}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className={`text-xs font-mono uppercase tracking-widest ${c.textMuted} mb-4`}>
                        {copy.label}
                    </div>

                    <h2 className={`text-4xl md:text-5xl font-bold tracking-tight ${c.text} font-['Space_Grotesk'] mb-6`}>
                        {copy.title[0]}
                        <br />
                        <span className={c.accent}>{copy.title[1]}</span>
                    </h2>
                </motion.div>

                <motion.div
                    className={`${c.bgCard} border-2 ${isDark ? 'border-white/30' : 'border-[#0a0a0a]'} p-8 md:p-10 mb-8`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    <p className={`text-lg md:text-xl font-semibold ${c.text} leading-relaxed`}>
                        {copy.quote}
                    </p>
                    <p className={`text-sm ${c.textMuted} mt-3 font-mono`}>
                        {copy.citation}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <p className={`text-base ${c.textSecondary} leading-relaxed mb-8 max-w-2xl`}>
                        {copy.body}
                    </p>

                    <a
                        href="/research"
                        className={`${c.accentBg} ${c.accentText} font-semibold rounded-full ${c.accentHover} uppercase tracking-[0.1em] px-7 py-3 text-xs inline-flex items-center gap-2 no-underline transition-colors`}
                    >
                        {copy.cta}
                        <ArrowRight size={14} />
                    </a>
                </motion.div>
            </div>
        </section>
    );
};

export default ResearchTeaser;
