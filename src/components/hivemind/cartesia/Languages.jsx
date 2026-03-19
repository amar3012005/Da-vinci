import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const Languages = () => {
  const navigate = useNavigate();
  const [activeRegion, setActiveRegion] = useState('Western Europe');

  const regions = ['Americas', 'Western Europe', 'Eastern Europe', 'Asia Pacific', 'India', 'Middle East'];

  const languages = {
    'Western Europe': [
      { name: 'Dutch', flag: '🇳🇱' },
      { name: 'English (British)', flag: '🇬🇧' },
      { name: 'French', flag: '🇫🇷' },
      { name: 'German', flag: '🇩🇪' },
      { name: 'Italian', flag: '🇮🇹' },
      { name: 'Portuguese (European)', flag: '🇵🇹' },
      { name: 'Spanish (European)', flag: '🇪🇸' },
      { name: 'Swedish', flag: '🇸🇪' },
      { name: 'Greek', flag: '🇬🇷' },
    ],
    'Americas': [
      { name: 'English (American)', flag: '🇺🇸' },
      { name: 'Spanish (Latin American)', flag: '🇲🇽' },
      { name: 'Portuguese (Brazilian)', flag: '🇧🇷' },
      { name: 'French (Canadian)', flag: '🇨🇦' },
    ],
    'Eastern Europe': [
      { name: 'Polish', flag: '🇵🇱' },
      { name: 'Russian', flag: '🇷🇺' },
      { name: 'Ukrainian', flag: '🇺🇦' },
      { name: 'Czech', flag: '🇨🇿' },
    ],
    'Asia Pacific': [
      { name: 'Japanese', flag: '🇯🇵' },
      { name: 'Korean', flag: '🇰🇷' },
      { name: 'Mandarin', flag: '🇨🇳' },
      { name: 'Cantonese', flag: '🇭🇰' },
    ],
    'India': [
      { name: 'Hindi', flag: '🇮🇳' },
      { name: 'Tamil', flag: '🇮🇳' },
      { name: 'Telugu', flag: '🇮🇳' },
      { name: 'Marathi', flag: '🇮🇳' },
    ],
    'Middle East': [
      { name: 'Arabic', flag: '🇸🇦' },
      { name: 'Hebrew', flag: '🇮🇱' },
      { name: 'Turkish', flag: '🇹🇷' },
      { name: 'Persian', flag: '🇮🇷' },
    ],
  };

  const datacenters = [
    { name: 'Frankfurt', provider: 'Hetzner', region: 'Western Europe' },
    { name: 'Paris', provider: 'Scaleway', region: 'Western Europe' },
    { name: 'Roubaix', provider: 'OVH', region: 'Western Europe' },
    { name: 'Falkenstein', provider: 'Hetzner', region: 'Western Europe' },
    { name: 'Amsterdam', provider: 'Scaleway', region: 'Western Europe' },
    { name: 'Gravelines', provider: 'OVH', region: 'Western Europe' },
    { name: 'Nuremberg', provider: 'Hetzner', region: 'Western Europe' },
    { name: 'Warsaw', provider: 'Scaleway', region: 'Eastern Europe' },
  ];

  return (
    <section className="bg-[#111] text-white py-32 border-t border-[#222] relative overflow-hidden">
      {/* Vertical striped separator at top */}
      <div 
        className="h-20 w-full border-b border-[#222] absolute top-0" 
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
      />

      <div className="max-w-[1200px] mx-auto border-x border-[#222] px-6 pt-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">
            Fluent and native,<br />
            worldwide
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-8">
            Reach international markets with HIVEMIND. It understands 40+ languages covering 95% of the world, all with native context awareness.
          </p>
          <button
            onClick={() => navigate('/hivemind/login')}
            className="px-6 py-3 rounded-full bg-[#bdf213] text-[#0a0a0a] font-semibold hover:bg-[#d4ff3a] transition-colors cursor-pointer border-none"
          >
            Explore 40+ Languages
          </button>
        </div>

        {/* Globe visualization */}
        <div className="relative h-[400px] mb-12 flex items-center justify-center">
          {/* Abstract globe with grid lines */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[600px] h-[300px] relative" style={{ perspective: '1000px' }}>
              {/* Globe arcs */}
              <div className="absolute inset-0 border border-white/10 rounded-full" style={{ transform: 'rotateX(60deg)' }}></div>
              <div className="absolute inset-0 border border-white/10 rounded-full" style={{ transform: 'rotateX(60deg) rotateY(30deg)' }}></div>
              <div className="absolute inset-0 border border-white/10 rounded-full" style={{ transform: 'rotateX(60deg) rotateY(-30deg)' }}></div>
              <div className="absolute inset-0 border border-white/10 rounded-full" style={{ transform: 'rotateX(60deg) rotateY(60deg)' }}></div>
              <div className="absolute inset-0 border border-white/10 rounded-full" style={{ transform: 'rotateX(60deg) rotateY(-60deg)' }}></div>
              
              {/* Speech bubbles on globe */}
              <motion.div 
                className="absolute top-1/4 left-1/4 bg-[#1a1a1a] border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 h-4 bg-[#bdf213] rounded-full" style={{ height: `${8 + Math.random() * 8}px` }}></div>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                className="absolute top-1/3 right-1/3 bg-[#1a1a1a] border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 h-4 bg-[#4f00ff] rounded-full" style={{ height: `${8 + Math.random() * 8}px` }}></div>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                className="absolute bottom-1/3 left-1/3 bg-[#1a1a1a] border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 h-4 bg-white/60 rounded-full" style={{ height: `${8 + Math.random() * 8}px` }}></div>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                className="absolute top-1/2 right-1/4 bg-[#1a1a1a] border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 h-4 bg-[#bdf213]/70 rounded-full" style={{ height: `${8 + Math.random() * 8}px` }}></div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Region tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 border-b border-white/10 pb-6">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setActiveRegion(region)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeRegion === region 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Language grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {languages[activeRegion]?.map((lang, idx) => (
            <motion.div
              key={lang.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="flex items-center justify-between px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
            </motion.div>
          ))}
        </div>

        {/* Datacenters section */}
        <div className="mt-20 pt-12 border-t border-white/10">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-medium mb-2">The Sovereign Trust.</h3>
            <p className="text-white/50">The European Edge.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {datacenters.map((dc, idx) => (
              <motion.div
                key={dc.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                className="px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer backdrop-blur-sm"
              >
                {dc.name} ({dc.provider})
              </motion.div>
            ))}
            <div className="px-5 py-2.5 rounded-full border border-[#4f00ff]/30 bg-[#4f00ff]/10 text-sm font-medium text-[#4f00ff] cursor-default flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4f00ff] animate-pulse"></span> HYOK Enabled
            </div>
          </div>
        </div>
      </div>

      {/* Vertical striped separator at bottom */}
      <div 
        className="h-20 w-full border-t border-[#222] absolute bottom-0" 
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.02) 50%)', backgroundSize: '4px 100%' }} 
      />
    </section>
  );
};

export default Languages;
