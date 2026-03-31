import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { GlobeCdn } from '../../ui/cobe-globe-cdn';

const Languages = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Hosting');

  const categories = ['Hosting', 'Compliance', 'Security'];

  const items = {
    'Hosting': [
      { name: 'Hetzner Cloud (Frankfurt, Falkenstein, Nuremberg)', icon: '🇩🇪' },
      { name: 'Scaleway (Paris, Amsterdam, Warsaw)', icon: '🇫🇷' },
      { name: 'OVHcloud (Roubaix, Gravelines)', icon: '🇫🇷' },
      { name: 'Zero US-owned infrastructure', icon: '🛡' },
      { name: 'All data encrypted at rest (AES-256)', icon: '🔒' },
      { name: 'No transatlantic data transfer', icon: '🇪🇺' },
    ],
    'Compliance': [
      { name: 'GDPR Article 28 compliant', icon: '🇪🇺' },
      { name: 'EU Data Residency guaranteed', icon: '🏛' },
      { name: 'Data Processing Agreement (DPA) available', icon: '📋' },
      { name: 'Right to erasure (Article 17)', icon: '🗑' },
      { name: 'Data portability (Article 20)', icon: '📦' },
      { name: 'ISO 27001 Ready', icon: '🛡' },
    ],
    'Security': [
      { name: 'Hold Your Own Key (HYOK) encryption', icon: '🔑' },
      { name: 'Dedicated Hardware Security Modules', icon: '🔒' },
      { name: 'TLS 1.3 in transit', icon: '🛡' },
      { name: 'Tenant-isolated memory stores', icon: '🏗' },
      { name: 'Audit logging & access controls', icon: '📝' },
      { name: 'SOC 2 Type II (in progress)', icon: '🔍' },
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
            EU Sovereign<br />
            Infrastructure
          </h2>
          <p className="text-lg text-[#525252] max-w-2xl mx-auto mb-8">
            Your data never leaves the European Union. HIVEMIND runs exclusively on EU-owned infrastructure — Hetzner, OVHcloud, and Scaleway — with full GDPR compliance and zero US data transfer.
          </p>
          <button
            onClick={() => navigate('/hivemind/login')}
            className="px-6 py-3 rounded-[4px] bg-[#117dff] text-white font-semibold hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-sm uppercase tracking-[0.075em]"
          >
            Explore Our Infrastructure
          </button>
        </div>

        {/* Globe visualization */}
        <motion.div
          className="relative mb-12 flex items-center justify-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="relative w-full max-w-[720px] min-h-[380px] sm:min-h-[460px] flex items-center justify-center">
            <GlobeCdn className="w-full max-w-[620px] mx-auto" />
          </div>
        </motion.div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 border-b border-[#e3e0db] pb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                activeCategory === category
                  ? 'text-[#117dff] bg-[#117dff]/[0.06] border border-[#117dff]/20'
                  : 'text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f3f1ec] border border-transparent'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Infrastructure grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items[activeCategory]?.map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="flex items-center justify-between px-4 py-3 border-b border-[#e3e0db] hover:bg-[#f3f1ec] transition-colors cursor-pointer group rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium text-[#0a0a0a]">{item.name}</span>
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
