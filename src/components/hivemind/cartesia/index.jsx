import React, { useEffect } from 'react';

// Import Cartesia Replica Sections
import Navbar from './Navbar';
import Hero from './Hero';
import Features from './Features';
import Languages from './Languages';
import Developers from './Developers';
import HivemindGraphPreview from './HivemindGraphPreview';

/**
 * Cartesia Replica Container
 * Matches 100% of the Cartesia frontend style as requested.
 */
const CartesiaReplica = () => {
  // Ensure background is strictly black for this route
  useEffect(() => {
    document.body.style.backgroundColor = '#000000';
    return () => {
      document.body.style.backgroundColor = ''; // Reset on unmount
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#bdf213]/30">
      <Navbar />
      <Hero />
      <Features />
      
      {/* Interactive Graph Preview using MMAR pattern */}
      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-8 text-center mt-10">
          The "Brain" Live.<br />
          <span className="text-white/40">Interactive Graph Preview</span>
        </h2>
        <div className="bg-[#09090b] rounded-[32px] border border-white/10 overflow-hidden">
          <HivemindGraphPreview />
        </div>
      </div>

      <Languages />
      <Developers />
    </div>
  );
};

export default CartesiaReplica;
