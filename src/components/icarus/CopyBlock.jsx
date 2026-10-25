import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

const CopyBlock = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-[#101522] p-4 pr-12 text-[12px] leading-6 text-[#e3e8f1]"><code>{text}</code></pre>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${copied ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-white/15 bg-white/5 text-white/70 hover:text-white'}`}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? `${label} copied.` : ''}</span>
    </div>
  );
};

export default CopyBlock;
