import React from 'react';
import { motion } from 'framer-motion';
import { Check, LoaderCircle, Wrench } from 'lucide-react';

export default function GenericTool({ name, label, state, result, onOpen, onToggle }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      onClick={() => {
        if (onToggle) onToggle();
        else if (onOpen) onOpen({ name, result });
      }}
      className="relative flex w-full items-center gap-3 py-2 text-left text-[#737373] before:absolute before:bottom-[-8px] before:left-[8px] before:top-[24px] before:w-px before:bg-[#e3e0db] last:before:hidden"
    >
      {state === 'running'
        ? <LoaderCircle size={17} className="shrink-0 animate-spin text-[#737373]" />
        : <Wrench size={17} className="shrink-0" strokeWidth={1.7} />}
      <span className="min-w-0 flex-1 truncate text-[14px]">{label || name}</span>
      {state !== 'running' ? <Check size={14} className="shrink-0 text-[#737373]" /> : null}
    </motion.button>
  );
}
