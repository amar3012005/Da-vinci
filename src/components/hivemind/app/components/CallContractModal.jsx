import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Target, Mic2, Globe, X, ShieldCheck } from 'lucide-react';
import apiClient from '../shared/api-client';

/**
 * CallContractModal — first-contact HITL popup for an autonomous TARA outbound call.
 *
 * When HyperAgents decides to call a prospect it proposes a QUEUED campaign + pushes a
 * 'call_contract' turn-event; the room stream (HyperAgents.jsx) redispatches it as the global
 * window event 'hm:call-contract' with { campaign_id, contract }. This modal surfaces the
 * auto-selected contract — goal, conversation strategy, language, voice — and gates the dial:
 *   • Approve → Start the campaign (fires the call; TARA plans + speaks with the contract).
 *   • Reject  → Stop/cancel (no call).
 * Nothing dials without this approval — the hard first-contact-HITL invariant, made visible.
 *
 * Themed to the HIVEMIND warm-light console (see PlanLimitModal.jsx). Mounted once in AppShell.
 */
export const CALL_CONTRACT_EVENT = 'hm:call-contract';

export default function CallContractModal() {
  const [state, setState] = useState(null); // null | { campaignId, contract, preference }
  const [busy, setBusy] = useState(null);    // null | 'approve' | 'reject'
  const [err, setErr] = useState('');

  useEffect(() => {
    const onEvent = (e) => {
      const d = e.detail || {};
      if (d.contract) {
        setState({
          campaignId: d.campaign_id || d.campaignId,
          contract: d.contract,
          preference: ['manual', 'auto'].includes(d.authority_preference) ? d.authority_preference : 'unconfigured',
        });
        setErr('');
      }
    };
    window.addEventListener(CALL_CONTRACT_EVENT, onEvent);
    return () => window.removeEventListener(CALL_CONTRACT_EVENT, onEvent);
  }, []);

  const close = () => { setState(null); setBusy(null); setErr(''); };

  const approve = async (preference = state?.preference === 'auto' ? 'auto' : 'manual') => {
    if (!state?.campaignId) return close();
    setBusy('approve'); setErr('');
    try { await apiClient.startOutreachCampaign(state.campaignId, preference); close(); }
    catch (e) { setErr(e?.response?.data?.error || e.message || 'Could not start the call'); setBusy(null); }
  };
  const reject = async () => {
    setBusy('reject');
    try { if (state?.campaignId) await apiClient.stopOutreachCampaign(state.campaignId); } catch { /* ignore */ }
    close();
  };

  const c = state?.contract || {};
  const row = (Icon, label, value) => (value ? (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-[#117dff] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[#a3a3a3] text-[11px] font-['Space_Grotesk'] uppercase tracking-wide">{label}</p>
        <p className="text-[#0a0a0a] text-[13px] font-['Space_Grotesk'] leading-snug break-words">{value}</p>
      </div>
    </div>
  ) : null);

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="TARA outbound call permission"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative bg-[#fbfaf7] rounded-lg border border-[#d8d3cc] shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={close} aria-label="Close call permission" title="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[#777168] hover:bg-[#eeece7] hover:text-[#171717]">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-[#117dff]/10 flex items-center justify-center">
                <Phone size={20} className="text-[#117dff]" />
              </div>
              <div>
                <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">TARA wants to place a call</h3>
                <p className="text-[#525252] text-[12px] font-['Space_Grotesk']">
                  Approve to let TARA dial {c.prospect ? <b>{c.prospect}</b> : 'this prospect'} now.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5 rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-4">
              {row(Target, 'Goal', c.goal)}
              {row(Mic2, 'Strategy', c.strategy)}
              {row(Globe, 'Language', c.language ? String(c.language).toUpperCase() : null)}
              {row(Mic2, 'Voice', c.voice_style || (c.voice_id ? 'auto-selected' : null))}
              {c.targets > 1 ? (
                <p className="text-[#a3a3a3] text-[11px] font-['Space_Grotesk']">+{c.targets - 1} more prospect(s) in this campaign</p>
              ) : null}
            </div>

            {err ? <p className="text-[#b45309] text-[12px] font-['Space_Grotesk'] mb-3">{err}</p> : null}

            {state.preference === 'unconfigured' ? (
              <div className="mb-4 border-y border-[#e3e0db] py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#262626]"><ShieldCheck size={14} /> Choose how TARA may place outbound calls</div>
                <p className="mt-1 text-[11px] leading-4 text-[#777168]">This organization setting remains visible in Runtime and can be changed at any time.</p>
              </div>
            ) : null}

            <div className="flex gap-3">
              {state.preference !== 'unconfigured' ? <button
                type="button" onClick={reject} disabled={busy === 'approve'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#e3e0db] text-[#525252] text-[13px] font-semibold font-['Space_Grotesk'] hover:bg-[#f5f4ef] transition-colors disabled:opacity-50"
              >
                <PhoneOff size={15} /> {busy === 'reject' ? 'Cancelling…' : 'Not now'}
              </button> : null}
              {state.preference === 'unconfigured' ? <button
                type="button" onClick={() => approve('manual')} disabled={Boolean(busy)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-[#171717] bg-white text-[#171717] text-[12px] font-semibold font-['Space_Grotesk'] disabled:opacity-50"
              >
                <ShieldCheck size={14} /> {busy === 'approve' ? 'Saving...' : 'Manual & call'}
              </button> : null}
              <button
                type="button" onClick={() => approve(state.preference === 'unconfigured' ? 'auto' : state.preference)} disabled={Boolean(busy)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#117dff] hover:bg-[#0066e0] text-white text-[13px] font-semibold font-['Space_Grotesk'] transition-colors disabled:opacity-50"
              >
                <Phone size={15} /> {busy === 'approve' ? 'Connecting…' : state.preference === 'unconfigured' ? 'Auto & call' : 'Approve & call'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
