import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const BoxesBackground = ({ className = "" }) => {
  const containerRef = useRef();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create animated boxes
    const createBox = (index) => {
      const box = document.createElement('div');
      box.className = 'absolute border border-slate-600/20 bg-slate-800/10 backdrop-blur-sm';
      
      // Random size between 40-120px
      const size = Math.random() * 80 + 40;
      box.style.width = `${size}px`;
      box.style.height = `${size}px`;
      
      // Random position
      box.style.left = `${Math.random() * 100}%`;
      box.style.top = `${Math.random() * 100}%`;
      
      // Random rotation and animation delay
      box.style.transform = `rotate(${Math.random() * 45}deg) rotateX(${Math.random() * 20}deg) rotateY(${Math.random() * 20}deg)`;
      box.style.animationDelay = `${Math.random() * 20}s`;
      
      // Add glow effect randomly
      if (Math.random() > 0.7) {
        box.style.boxShadow = `0 0 20px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1)`;
        box.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      }
      
      // Add animation class
      box.classList.add('animate-float-box');
      
      return box;
    };

    // Generate boxes
    const boxes = [];
    for (let i = 0; i < 50; i++) {
      const box = createBox(i);
      boxes.push(box);
      container.appendChild(box);
    }

    return () => {
      boxes.forEach(box => {
        if (container.contains(box)) {
          container.removeChild(box);
        }
      });
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Additional CSS-only animated boxes for better performance */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-blue-500/10 bg-blue-500/5"
            style={{
              width: Math.random() * 60 + 30,
              height: Math.random() * 60 + 30,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              rotate: Math.random() * 45,
              rotateX: Math.random() * 20,
              rotateY: Math.random() * 20,
            }}
            animate={{
              y: [0, -20, 0],
              rotateZ: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>
      
      {/* Floating cubes with 3D effect */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`cube-${i}`}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              rotateX: [0, 360],
              rotateY: [0, 360],
              rotateZ: [0, 180],
            }}
            transition={{
              duration: Math.random() * 15 + 15,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10,
            }}
          >
            <div className="relative" style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg)`
            }}>
              {/* 3D Cube faces */}
              <div className="absolute w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30" 
                   style={{ transform: 'translateZ(16px)' }} />
              <div className="absolute w-8 h-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-400/20" 
                   style={{ transform: 'rotateY(90deg) translateZ(16px)' }} />
              <div className="absolute w-8 h-8 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-400/10" 
                   style={{ transform: 'rotateX(90deg) translateZ(16px)' }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BoxesBackground;

