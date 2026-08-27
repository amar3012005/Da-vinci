import React from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
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
    description: 'Allows EU-hosted PostHog analytics, interaction measurement, and session replay so we can improve the product.',
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
      {bannerOpen && (
        <section className="fixed inset-x-0 bottom-0 z-[1000] border-t border-[#d9d6cf] bg-white px-5 py-5 shadow-[0_-10px_40px_rgba(10,10,10,0.08)] md:px-8" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
          <div className="mx-auto flex max-w-[1380px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2"><Cookie size={17} className="text-[#117dff]" /><h2 id="cookie-title" className="font-['Space_Grotesk'] text-[18px] font-semibold text-[#0a0a0a]">Your privacy. Your choice.</h2></div>
              <p className="mt-2 text-[13px] leading-5 text-[#525252]">We use strictly necessary storage to run and secure this site. With your permission, we also use preferences and EU-hosted product analytics, including session replay. Marketing trackers are currently not installed. You can change your choice at any time.</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]"><a className="text-[#117dff] underline underline-offset-2" href="/cookies">Cookie Policy</a><a className="text-[#117dff] underline underline-offset-2" href="/privacy">Privacy Policy</a></div>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[530px]">
              <button type="button" onClick={() => setPreferencesOpen(true)} className="h-11 border border-[#d9d6cf] bg-white px-5 text-[13px] font-semibold text-[#0a0a0a] hover:bg-[#faf9f4]">Manage preferences</button>
              <button type="button" onClick={reject} className="h-11 border border-[#0a0a0a] bg-[#0a0a0a] px-5 text-[13px] font-semibold text-white hover:bg-[#262626]">Reject optional</button>
              <button type="button" onClick={accept} className="h-11 border border-[#117dff] bg-[#117dff] px-5 text-[13px] font-semibold text-white hover:bg-[#0066e0]">Accept all</button>
            </div>
          </div>
        </section>
      )}

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
