import React from 'react';
import { motion } from 'framer-motion';

export default function GenericTool({ name, label, state, result, onOpen }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      onClick={() => onOpen && onOpen({ name, result })}
      className="flex items-center gap-2 text-left"
    >
      <span className={`inline-block w-2 h-2 rounded-full ${state === 'running' ? 'bg-[#117dff] animate-pulse' : 'bg-[#10b981]'}`} />
      <span className="text-[13px] text-[#171717]">{label || name}</span>
      {state === 'running' ? <span className="h-3 w-3 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" /> : null}
    </motion.button>
  );
}
