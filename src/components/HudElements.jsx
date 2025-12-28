import React from 'react';
import { motion } from 'framer-motion';

// HUD Panel Component
export const HudPanel = ({ children, className = "", delay = 0, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      transition={{ 
        delay: delay + index * 0.1, 
        duration: 0.8, 
        ease: "easeOut",
        type: "spring",
        stiffness: 100
      }}
      className={`relative backdrop-blur-sm border border-cyan-400/30 rounded-lg bg-black/20 
                 hover:border-cyan-400/60 hover:bg-black/30 transition-all duration-500 
                 shadow-lg shadow-cyan-500/10 ${className}`}
      style={{
        transform: `perspective(1000px) translateZ(${index * -20}px)`,
      }}
      whileHover={{ 
        scale: 1.02, 
        y: -5,
        boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)'
      }}
    >
      {/* Holographic overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-lg" />
      
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400 rounded-br-lg" />
      
      {/* Scan line animation */}
      <motion.div 
        className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        animate={{ 
          y: [0, 160, 0],
          opacity: [0, 1, 0]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

// Floating Data Stream
export const DataStream = ({ className = "" }) => {
  const dataPoints = Array.from({ length: 8 });
  
  return (
    <div className={`absolute ${className} pointer-events-none`}>
      {dataPoints.map((_, i) => (
        <motion.div
          key={i}
          className="w-1 h-1 bg-cyan-400 rounded-full absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -200, 0],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: i * 0.3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

// Technical Readout
export const TechnicalReadout = ({ title, value, unit, className = "" }) => (
  <motion.div 
    className={`font-mono text-xs ${className}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 1, delay: 0.5 }}
  >
    <div className="text-cyan-400/80 mb-1">{title}</div>
    <div className="text-white text-lg font-bold">
      {value} <span className="text-cyan-400/60 text-sm">{unit}</span>
    </div>
  </motion.div>
);

// Holographic Grid
export const HolographicGrid = () => (
  <div className="absolute inset-0 pointer-events-none opacity-10">
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px'
      }}
    />
  </div>
);

// Glowing Particle
export const GlowingParticle = ({ size = "sm", color = "cyan", className = "" }) => {
  const sizeClasses = {
    xs: "w-1 h-1",
    sm: "w-2 h-2", 
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };
  
  const colorClasses = {
    cyan: "bg-cyan-400",
    orange: "bg-orange-400",
    purple: "bg-purple-400"
  };

  return (
    <motion.div
      className={`absolute ${sizeClasses[size]} ${colorClasses[color]} rounded-full ${className}`}
      animate={{
        opacity: [0.3, 1, 0.3],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration: 2 + Math.random() * 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      style={{
        filter: `drop-shadow(0 0 8px currentColor)`,
      }}
    />
  );
};

// Status Indicator
export const StatusIndicator = ({ status = "online", label }) => {
  const statusColors = {
    online: "bg-green-400",
    warning: "bg-orange-400", 
    error: "bg-red-400",
    processing: "bg-cyan-400"
  };

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <motion.div 
        className={`w-2 h-2 rounded-full ${statusColors[status]}`}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className="text-cyan-400/80">{label}</span>
    </div>
  );
};

