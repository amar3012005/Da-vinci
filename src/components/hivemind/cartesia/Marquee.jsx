import React from 'react';
import { motion } from 'framer-motion';

const Marquee = () => {
  const logos = [
    'Trusted by innovative teams across Europe',
    'Memory Engine for AI Agents',
    'EU Sovereign Cloud',
    'Sub-50ms Recall',
    'MCP Protocol Native',
    'GDPR Compliant',
    'Built in Europe',
    'Context-Aware Intelligence'
  ];

  return (
    <div className="bg-[#faf9f4] border-y border-[#e3e0db] overflow-hidden relative">
      {/* Striped separator at top */}
      <div
        className="h-16 w-full border-b border-[#e3e0db]"
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
      />

      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">
        {/* Left/Right fading edges */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#faf9f4] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#faf9f4] to-transparent z-10 pointer-events-none" />

        <div className="py-12">
          <div className="text-center text-[11px] font-mono text-[#a3a3a3] tracking-[0.2em] uppercase mb-8">
            The Memory Layer for AI
          </div>

          <div className="flex">
            <motion.div
              className="flex whitespace-nowrap gap-16 px-8 items-center"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 40, ease: "linear", repeat: Infinity }}
            >
              {[...logos, ...logos, ...logos].map((logo, index) => (
                <div
                  key={index}
                  className="text-[#d4d0ca] text-xl font-semibold tracking-tight hover:text-[#a3a3a3] transition-colors cursor-default select-none"
                >
                  {logo}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Striped separator at bottom */}
      <div
        className="h-16 w-full border-t border-[#e3e0db]"
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
      />
    </div>
  );
};

export default Marquee;
