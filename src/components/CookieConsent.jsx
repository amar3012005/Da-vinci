import React from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CONSENT_EVENT, OPEN_CONSENT_EVENT, readConsent, writeConsent } from '../privacy/consent';

const categories = [
  {
    id: 'necessary',
    title: 'Strictly necessary',
    description: 'Required for security, authentication, consent storage, and core site operation. These cannot be switched off.',
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Remembers optional choices such as your website experience and language preferences.',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Allows EU-hosted PostHog aggregate analytics and interaction measurement so we can improve the product. Session replay is disabled.',
  },
  {
    id: 'marketing',
    title: 'Marketing',
    description: 'Reserved for advertising or campaign measurement. No marketing tracker is currently installed.',
  },
];

const defaults = { necessary: true, preferences: false, analytics: false, marketing: false };

export default function CookieConsent() {
  const initial = React.useMemo(() => readConsent(), []);
  const [bannerOpen, setBannerOpen] = React.useState(!initial);
  const [preferencesOpen, setPreferencesOpen] = React.useState(false);
  const [choices, setChoices] = React.useState({ ...defaults, ...(initial || {}) });

  React.useEffect(() => {
    const open = () => {
      setChoices({ ...defaults, ...(readConsent() || {}) });
      setPreferencesOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  const save = (next) => {
    writeConsent(next);
    setChoices(next);
    setBannerOpen(false);
    setPreferencesOpen(false);
  };

  const reject = () => save(defaults);
  const accept = () => save({ necessary: true, preferences: true, analytics: true, marketing: true });

  return (
    <>
      <AnimatePresence>
        {bannerOpen && (
          <motion.section
            initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-[1000] overflow-hidden border-t border-white/20 bg-[#080b10]/68 px-5 py-5 text-white shadow-[0_-18px_60px_rgba(0,0,0,0.24)] backdrop-blur-3xl md:px-8"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)', backgroundSize: '40px 40px', WebkitBackdropFilter: 'blur(24px) saturate(135%)' }}
            role="dialog" aria-modal="true" aria-labelledby="cookie-title"
          >
            <div className="mx-auto flex max-w-[1380px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2"><Cookie size={17} className="text-[#62e6ff]" /><h2 id="cookie-title" className="font-['Space_Grotesk'] text-[18px] font-semibold">Your privacy. Your choice.</h2></div>
                <p className="mt-2 text-[13px] leading-5 text-white/68">We use strictly necessary storage to run and secure this site. With your permission, we also use preferences and EU-hosted aggregate product analytics. Session replay and marketing trackers are not enabled. You can change your choice at any time.</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]"><a className="text-[#7ddff2] underline underline-offset-2" href="/cookies">Cookie Policy</a><a className="text-[#7ddff2] underline underline-offset-2" href="/privacy">Privacy Policy</a></div>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[530px]">
                <button type="button" onClick={() => setPreferencesOpen(true)} className="h-11 rounded-[6px] border border-white/20 bg-white/[0.06] px-5 text-[12px] font-semibold text-white transition-colors hover:bg-white/10">Manage preferences</button>
                <button type="button" onClick={reject} className="h-11 rounded-[6px] border border-white/25 bg-black/25 px-5 text-[12px] font-semibold text-white transition-colors hover:bg-black/40">Reject optional</button>
                <button type="button" onClick={accept} className="h-11 rounded-[6px] border border-[#117dff] bg-[#117dff] px-5 text-[12px] font-semibold text-white transition-colors hover:bg-[#0066e0]">Accept all</button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {preferencesOpen && (
        <div className="fixed inset-0 z-[1010] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="preferences-title">
          <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-[#d9d6cf] bg-[#fbfbf8] shadow-2xl">
            <header className="flex items-start justify-between border-b border-[#e3e0db] px-5 py-5 md:px-7">
              <div><div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[#117dff]"><ShieldCheck size={14} /> SINGULANCE privacy control</div><h2 id="preferences-title" className="mt-2 font-['Space_Grotesk'] text-[25px] font-semibold text-[#0a0a0a]">Cookie preferences</h2><p className="mt-2 max-w-xl text-[13px] leading-5 text-[#525252]">Optional technology stays off unless you enable it. Withdrawal is as easy as acceptance.</p></div>
              {readConsent() && <button type="button" onClick={() => setPreferencesOpen(false)} aria-label="Close cookie preferences" className="p-2 text-[#737373] hover:text-[#0a0a0a]"><X size={18} /></button>}
            </header>
            <div className="divide-y divide-[#e3e0db] px-5 md:px-7">
              {categories.map((category) => {
                const checked = category.id === 'necessary' || choices[category.id];
                return <div key={category.id} className="flex gap-5 py-5"><div className="min-w-0 flex-1"><h3 className="text-[14px] font-semibold text-[#0a0a0a]">{category.title}</h3><p className="mt-1 text-[12px] leading-5 text-[#525252]">{category.description}</p></div><button type="button" role="switch" aria-checked={checked} disabled={category.id === 'necessary'} onClick={() => setChoices((current) => ({ ...current, [category.id]: !current[category.id] }))} className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#117dff]' : 'bg-[#d9d6cf]'} disabled:cursor-not-allowed`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} /></button></div>;
              })}
            </div>
            <footer className="grid gap-2 border-t border-[#e3e0db] bg-white p-5 sm:grid-cols-3 md:px-7"><button type="button" onClick={reject} className="h-11 border border-[#0a0a0a] text-[12px] font-semibold">Reject optional</button><button type="button" onClick={() => save(choices)} className="h-11 border border-[#117dff] text-[12px] font-semibold text-[#117dff]">Save choices</button><button type="button" onClick={accept} className="h-11 bg-[#117dff] text-[12px] font-semibold text-white">Accept all</button></footer>
          </section>
        </div>
      )}
    </>
  );
}

export { CONSENT_EVENT };
