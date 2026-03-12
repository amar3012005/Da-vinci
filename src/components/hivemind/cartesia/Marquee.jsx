import React from 'react';
import { motion } from 'framer-motion';

const Marquee = () => {
  const logos = [
    'CRESTA', 'Quora', 'LiveKit', 'The Weather Company', 'Fixie', 'Callsite', 'read.ai', 'copy.ai'
  ];

  return (
    <div className="bg-[#111] border-y border-[#222] overflow-hidden relative">
      {/* Vertical striped separator at top */}
      <div 
        className="h-16 w-full border-b border-[#222]" 
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
      />

      <div className="max-w-[1200px] mx-auto border-x border-[#222]">
        {/* Left/Right fading edges */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#111] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#111] to-transparent z-10 pointer-events-none" />

        <div className="py-12">
          <div className="text-center text-xs font-mono text-white/30 tracking-[0.2em] uppercase mb-8">
            Trusted by
          </div>

          <div className="flex">
            <motion.div
              className="flex whitespace-nowrap gap-16 px-8 items-center"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 40, ease: "linear", repeat: Infinity }}
            >
              {/* Duplicate list for seamless looping */}
              {[...logos, ...logos, ...logos].map((logo, index) => (
                <div
                  key={index}
                  className="text-white/30 text-xl font-semibold tracking-tight hover:text-white/50 transition-colors cursor-default select-none"
                >
                  {logo}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Vertical striped separator at bottom */}
      <div 
        className="h-16 w-full border-t border-[#222]" 
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
      />
    </div>
  );
};

export default Marquee;
