import React from 'react';
import { motion } from 'framer-motion';

/**
 * GlassCard - Reusable glassmorphism card component
 * Premium dark glass effect with subtle border and backdrop blur
 */
export const GlassCard = ({
    children,
    className = '',
    hover = true,
    delay = 0,
    ...props
}) => {
    return (
        <motion.div
            className={`
        bg-white/[0.03] backdrop-blur-xl 
        border border-white/[0.08] 
        rounded-2xl
        ${hover ? 'hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300' : ''}
        ${className}
      `}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export default GlassCard;
