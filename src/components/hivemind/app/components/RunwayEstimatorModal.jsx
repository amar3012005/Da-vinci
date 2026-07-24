import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Boxes, ArrowRight, Loader2 } from 'lucide-react';
import apiClient from '../shared/api-client';

/**
 * RunwayEstimatorModal — the in-app Sovereign Scope Estimator shown to an ENTERPRISE
 * org once its 2-week onboarding ends (the "runway" phase). The org configures its
 * own scope (deployment mode + data/seats/tokens); we price it server-side
 * (runwayQuote, authoritative), and Subscribe starts a self-serve Stripe checkout
 * that — on payment — activates a custom recurring entitlement matching the scope.
 *
 * Replaces the generic "upgrade to Pro" PlanLimitModal for enterprise-runway orgs.
 * Pricing mirrors the marketing ScopeEstimator (cartesia/Pricing.jsx) but the numbers
 * come from the backend so the client can never dictate the amount.
 */
const BOUNDS = { dataGb: { min: 50, max: 5000, step: 50 }, seats: { min: 1, max: 500, step: 1 }, tokens: { min: 1, max: 500, step: 1 } };
const eur = (n) => `€${Number(n || 0).toLocaleString()}`;

export default function RunwayEstimatorModal({ open, onClose, reason }) {
  const [mode, setMode] = useState('managed');
  const [dataGb, setDataGb] = useState(500);
  const [seats, setSeats] = useState(10);
  const [tokens, setTokens] = useState(20);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState(null);
  const debRef = useRef(null);

  const config = useMemo(() => ({ mode, dataGb, seats, tokens }), [mode, dataGb, seats, tokens]);

  // Debounced authoritative quote from the backend whenever the config changes.
  useEffect(() => {
    if (!open) return undefined;
    setLoading(true); setError(null);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      try { setQuote(await apiClient.runwayQuote(config)); }
      catch (e) { setError(e?.response?.data?.error || e?.message || 'Could not price this configuration.'); }
      finally { setLoading(false); }
    }, 300);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [open, config]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const subscribe = async () => {
    setSubscribing(true); setError(null);
    try {
      const res = await apiClient.runwayCheckout(config);
      if (res?.checkout_url) { window.location.assign(res.checkout_url); return; }
      setError('Checkout could not be started.');
    } catch (e) { setError(e?.response?.data?.error || e?.message || 'Checkout failed.'); }
    finally { setSubscribing(false); }
  };

  const rows = quote?.rows || [];
  const monthly = quote?.monthly_total;
  const setup = quote?.setup_one_time || 0;

  const Slider = ({ label, value, set, unit, b }) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a39e92]">{label}</span>
        <span className="font-mono text-[12px] font-semibold text-[#0a0a0a]">{value.toLocaleString()}{unit}</span>
      </div>
      <input type="range" min={b.min} max={b.max} step={b.step} value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-[#117dff] cursor-pointer" />
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
          role="dialog" aria-modal="true" aria-label="Configure your runway">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            className="bg-white rounded-2xl border border-[#e3e0db] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 20px 40px -12px rgba(0,0,0,0.18)' }}>
            <div className="p-6 md:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#a39e92]">Sovereign scope estimator</p>
              <h3 className="mt-1.5 text-2xl font-bold font-['Space_Grotesk'] tracking-tight text-[#0a0a0a]">Upgrade to Runway</h3>
              <p className="mt-1.5 text-[13px] text-[#525252] font-['Space_Grotesk'] leading-relaxed">
                Your 2-week onboarding has ended. Configure your organization's usage and continue on a plan that
                fits — you pay the calculated amount monthly, and can change it anytime.
              </p>
              {reason && <p className="mt-1 text-[11px] text-[#a3a3a3] font-['Space_Grotesk']">{reason}</p>}

              <div className="mt-5 inline-flex rounded-full border border-[#e3e0db] p-1 bg-[#faf9f4]">
                {[['managed', 'Managed'], ['self-hosted', 'Self-Hosted']].map(([id, lbl]) => (
                  <button key={id} onClick={() => setMode(id)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-semibold font-['Space_Grotesk'] transition-colors ${mode === id ? 'bg-[#117dff] text-white' : 'text-[#525252]'}`}>
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  {mode === 'managed' && <Slider label="Data pack (GB)" value={dataGb} set={setDataGb} unit="GB" b={BOUNDS.dataGb} />}
                  <Slider label="User seats" value={seats} set={setSeats} unit=" seats" b={BOUNDS.seats} />
                  <Slider label="Token budget (M/mo)" value={tokens} set={setTokens} unit="M" b={BOUNDS.tokens} />
                </div>

                <div className="rounded-xl border border-[#e7e4dd] bg-[#faf9f4] p-4">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-start justify-between py-1.5 text-[13px]">
                      <div className="pr-3">
                        <p className="text-[#0a0a0a] font-['Space_Grotesk']">{r.label}</p>
                        {r.detail && r.detail !== '—' && <p className="text-[11px] text-[#a3a3a3] font-mono">{r.detail}</p>}
                      </div>
                      <span className="font-mono text-[#0a0a0a] whitespace-nowrap">{eur(r.amount)}</span>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t border-[#e3e0db] flex items-center justify-between">
                    <span className="text-[13px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">Monthly total (ex. VAT)</span>
                    <span className="text-xl font-bold font-['Space_Grotesk'] text-[#0a0a0a]">
                      {loading ? <Loader2 size={16} className="animate-spin text-[#a3a3a3]" /> : `${eur(monthly)}/mo`}
                    </span>
                  </div>
                  {setup > 0 && (
                    <p className="mt-1 text-right font-mono text-[10px] uppercase tracking-wider text-[#a39e92]">
                      + one-time deployment &amp; security setup {eur(setup)}
                    </p>
                  )}
                </div>
              </div>

              {error && <p className="mt-4 text-[12px] text-[#b91c1c] font-['Space_Grotesk']">{error}</p>}

              <div className="mt-6 flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-semibold border border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec] transition-colors">
                  Maybe later
                </button>
                <button onClick={subscribe} disabled={subscribing || loading || !(monthly > 0)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-['Space_Grotesk'] font-semibold bg-[#117dff] text-white hover:bg-[#0066e0] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {subscribing ? <Loader2 size={15} className="animate-spin" /> : <Boxes size={15} />}
                  {subscribing ? 'Starting checkout…' : `Subscribe · ${eur(monthly)}/mo`}
                  {!subscribing && <ArrowRight size={15} />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
