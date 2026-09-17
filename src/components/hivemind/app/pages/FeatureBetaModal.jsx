import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const COPY = {
  runtime: {
    title: 'HIVEMIND RUNTIME',
    body: 'RUNTIME is a Meta-Governing, self-evolving HyperAgent that governs other HyperAgents to run your company in full autonomous mode. Our beta users are testing it now. We will let you know once it is live for all.',
  },
  operatingRooms: {
    title: 'Operating Rooms',
    body: 'Operating Rooms are a way to have a multi-person discussion with your HyperAgents and HIVEMIND together with your employees — like Google Meet — so you can collaboratively shape the future of your company. Our beta users are testing it now. We will let you know once it is live for all.',
  },
};

export default function FeatureBetaModal({ feature, onClose }) {
  const copy = COPY[feature] || COPY.runtime;
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101828]/35 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-beta-title"
        className="relative w-full max-w-[480px] rounded-[14px] border border-[#e3e0db] bg-white p-7 shadow-[0_28px_90px_rgba(12,38,84,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[#a3a3a3] hover:bg-[#faf9f4] hover:text-[#0a0a0a]">
          <X size={16} />
        </button>
        <div className="mb-3 flex items-center gap-2.5">
          <h2 id="feature-beta-title" className="font-['Space_Grotesk'] text-[18px] font-semibold text-[#0a0a0a]">{copy.title}</h2>
          <span className="rounded-full border border-[#117dff]/25 bg-[#117dff]/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#117dff]">Beta</span>
        </div>
        <p className="text-[14px] leading-relaxed text-[#525252]">{copy.body}</p>
      </motion.section>
    </motion.div>
  );
}
