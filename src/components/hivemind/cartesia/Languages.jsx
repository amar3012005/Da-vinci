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
    <section className="bg-[#faf9f4] text-[#0a0a0a] py-32 border-t border-[#e3e0db] relative overflow-hidden">
      {/* Striped separator at top */}
      <div
        className="h-16 w-full border-b border-[#e3e0db] absolute top-0"
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
      />

      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db] px-6 pt-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 font-['Space_Grotesk']">
            Fluent and native,<br />
            worldwide
          </h2>
          <p className="text-lg text-[#525252] max-w-2xl mx-auto mb-8">
            Reach international markets with HIVEMIND. It understands 40+ languages covering 95% of the world, all with native context awareness.
          </p>
          <button
            onClick={() => navigate('/hivemind/login')}
            className="px-6 py-3 rounded-[4px] bg-[#117dff] text-white font-semibold hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-sm uppercase tracking-[0.075em]"
          >
            Explore 40+ Languages
          </button>
        </div>

        {/* Globe visualization */}
        <div className="relative h-[400px] mb-12 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[600px] h-[300px] relative" style={{ perspective: '1000px' }}>
              {/* Globe arcs */}
              <div className="absolute inset-0 border border-[#e3e0db] rounded-full" style={{ transform: 'rotateX(60deg)' }}></div>
              <div className="absolute inset-0 border border-[#e3e0db] rounded-full" style={{ transform: 'rotateX(60deg) rotateY(30deg)' }}></div>
              <div className="absolute inset-0 border border-[#e3e0db] rounded-full" style={{ transform: 'rotateX(60deg) rotateY(-30deg)' }}></div>
              <div className="absolute inset-0 border border-[#e3e0db] rounded-full" style={{ transform: 'rotateX(60deg) rotateY(60deg)' }}></div>
              <div className="absolute inset-0 border border-[#e3e0db] rounded-full" style={{ transform: 'rotateX(60deg) rotateY(-60deg)' }}></div>

              {/* Speech bubbles on globe */}
              <motion.div
                className="absolute top-1/4 left-1/4 bg-white border border-[#e3e0db] rounded-xl px-4 py-2 flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 rounded-full bg-[#117dff]" style={{ height: `${8 + Math.random() * 8}px` }}></div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="absolute top-1/3 right-1/3 bg-white border border-[#e3e0db] rounded-xl px-4 py-2 flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 rounded-full bg-[#0066e0]" style={{ height: `${8 + Math.random() * 8}px` }}></div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-1/3 left-1/3 bg-white border border-[#e3e0db] rounded-xl px-4 py-2 flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 rounded-full bg-[#d4d0ca]" style={{ height: `${8 + Math.random() * 8}px` }}></div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="absolute top-1/2 right-1/4 bg-white border border-[#e3e0db] rounded-xl px-4 py-2 flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 rounded-full bg-[#117dff]/60" style={{ height: `${8 + Math.random() * 8}px` }}></div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Region tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 border-b border-[#e3e0db] pb-6">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setActiveRegion(region)}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                activeRegion === region
                  ? 'text-[#117dff] bg-[#117dff]/[0.06] border border-[#117dff]/20'
                  : 'text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f3f1ec] border border-transparent'
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
              className="flex items-center justify-between px-4 py-3 border-b border-[#e3e0db] hover:bg-[#f3f1ec] transition-colors cursor-pointer group rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-medium text-[#0a0a0a]">{lang.name}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#d4d0ca] group-hover:text-[#117dff] transition-colors" />
            </motion.div>
          ))}
        </div>

        {/* Datacenters section */}
        <div className="mt-20 pt-12 border-t border-[#e3e0db]">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2 font-['Space_Grotesk']">The Sovereign Trust.</h3>
            <p className="text-[#525252]">The European Edge.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {datacenters.map((dc, idx) => (
              <motion.div
                key={dc.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                className="px-5 py-2.5 rounded-xl border border-[#e3e0db] bg-white text-sm font-medium hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-colors cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-[#0a0a0a]"
              >
                {dc.name} ({dc.provider})
              </motion.div>
            ))}
            <div className="px-5 py-2.5 rounded-xl border border-[#117dff]/20 bg-[#117dff]/[0.06] text-sm font-medium text-[#117dff] cursor-default flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#117dff] animate-pulse"></span> HYOK Enabled
            </div>
          </div>
        </div>
      </div>

      {/* Striped separator at bottom */}
      <div
        className="h-16 w-full border-t border-[#e3e0db] absolute bottom-0"
        style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
      />
    </section>
  );
};

export default Languages;
