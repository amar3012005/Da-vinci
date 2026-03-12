import React from 'react';
import { motion } from 'framer-motion';

/**
 * FeatureIcon - Icon wrapper with gradient background and glow effect
 */
export const FeatureIcon = ({
    icon: Icon,
    gradient = 'from-pink-500 to-purple-500',
    size = 'md', // 'sm', 'md', 'lg'
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12'
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    return (
        <motion.div
            className={`
        ${sizeClasses[size]} 
        bg-gradient-to-br ${gradient}
        rounded-xl flex items-center justify-center
        shadow-lg shadow-pink-500/20
        ${className}
      `}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.2 }}
        >
            <Icon className={`${iconSizes[size]} text-white`} />
        </motion.div>
    );
};

export default FeatureIcon;
