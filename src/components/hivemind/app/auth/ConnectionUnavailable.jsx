import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { connectionFailureCopy } from './connection-failure';

export default function ConnectionUnavailable({ failure, onRetry, className = '' }) {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const copy = connectionFailureCopy(failure, online);
  return <section role="alert" className={`w-full max-w-md rounded-xl border border-[#e3e0db] bg-white p-6 text-[#202020] ${className}`}>
    <WifiOff size={24} className="mb-4 text-[#737373]" aria-hidden="true" />
    <h2 className="text-lg font-semibold">{copy.title}</h2>
    <p className="mt-2 text-sm leading-relaxed text-[#666]">{copy.description}</p>
    <button type="button" onClick={onRetry} className="mt-5 rounded-lg bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0066e0]">Try again</button>
  </section>;
}
