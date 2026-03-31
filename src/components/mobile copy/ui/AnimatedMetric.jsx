import React, { useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * AnimatedMetric - Animated number/percentage display
 * Counts up from 0 to target value with smooth animation
 */
export const AnimatedMetric = ({
    value,
    suffix = '',
    prefix = '',
    duration = 1500,
    delay = 0,
    className = '',
    size = 'lg' // 'sm', 'md', 'lg', 'xl'
}) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    const sizeClasses = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-4xl',
        xl: 'text-5xl'
    };

    useEffect(() => {
        if (!isInView) return;

        const timer = setTimeout(() => {
            let startTime;
            const numericValue = parseFloat(value);

            const animate = (currentTime) => {
                if (!startTime) startTime = currentTime;
                const progress = Math.min((currentTime - startTime) / duration, 1);

                // Easing function for smooth deceleration
                const eased = 1 - Math.pow(1 - progress, 3);
                setCount(eased * numericValue);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        }, delay);

        return () => clearTimeout(timer);
    }, [isInView, value, duration, delay]);

    const displayValue = Number.isInteger(parseFloat(value))
        ? Math.floor(count)
        : count.toFixed(1);

    return (
        <motion.div
            ref={ref}
            className={`font-bold tracking-tight ${sizeClasses[size]} ${className}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: delay / 1000 }}
        >
            <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                {prefix}{displayValue}{suffix}
            </span>
        </motion.div>
    );
};

export default AnimatedMetric;
