// CliVerified — final step of the `hivemind` CLI browser-auth flow.
//
// Lands here from control-plane /auth/cli/start after the user has signed in
// and the server has minted (or reused) an API key under a one-shot exchange
// code. URL shape:
//
//   /hivemind/cli-verified?code=<one-shot>&email=<verified-email>
//
// Two clicks:
//   1. Page loads → shows "Verified as <email>"
//   2. User clicks "Continue → wire HIVEMIND into your CLI" → we POST the
//      code to /auth/cli/exchange, redeem the token, then window.location to
//      the localhost callback the CLI is listening on. Token never appears
//      in the FE URL bar; the FE only holds the exchange code which is
//      single-use + 60s TTL.
//
// If the code is missing/expired the page surfaces an error and offers a
// link back to /hivemind/login to retry.
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Terminal, ArrowRight, Loader2, AlertCircle, Hexagon } from 'lucide-react';
import apiClient from '../shared/api-client';

export default function CliVerified() {
  const navigate = useNavigate();
  const location = useLocation();

  const { code, email } = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return { code: p.get('code'), email: p.get('email') || '' };
  }, [location.search]);

  const [error, setError] = useState(null);
  const [continuing, setContinuing] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(5);

  // Sanity check on mount: must have an exchange code.
  useEffect(() => {
    if (!code) {
      setError('Missing exchange code — start over from your terminal.');
    }
  }, [code]);

  // Auto-continue after 5s so the user doesn't have to click if they
  // glance away from the browser. They can still hit Continue manually.
  useEffect(() => {
    if (error || !code) return;
    if (autoCountdown <= 0) {
      handleContinue();
      return;
    }
    const t = setTimeout(() => setAutoCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCountdown, error, code]);

  async function handleContinue() {
    if (continuing) return;
    setContinuing(true);
    setError(null);
    try {
      // Redeem the one-shot code for the real callback + token.
      // Posts to control plane via apiClient so the right host gets used.
      const resp = await apiClient.controlPlane.post('/auth/cli/exchange', { code });
      const { callback, state, token, user_email, user_id, org_id } = resp.data || resp;
      if (!callback || !token) {
        throw new Error('exchange returned no callback/token');
      }
      // Build the localhost callback URL the CLI's listener is waiting on.
      const cb = new URL(callback);
      cb.searchParams.set('state', state);
      cb.searchParams.set('token', token);
      if (user_email) cb.searchParams.set('user_email', user_email);
      if (user_id) cb.searchParams.set('user_id', user_id);
      if (org_id) cb.searchParams.set('org_id', org_id);
      window.location.href = cb.toString();
    } catch (e) {
      // Most failures are: expired code (>60s) or single-use already redeemed.
      setError(e?.response?.data?.error || e?.message || 'Could not hand off to the CLI.');
      setContinuing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-white border border-[#e3e0db] rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <Hexagon size={22} className="text-[#117dff]" />
            </div>
            <div>
              <h1 className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk'] tracking-tight">HIVEMIND</h1>
              <p className="text-[#a3a3a3] text-xs font-mono">CLI authorization</p>
            </div>
          </div>

          {error ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                <div className="text-[12.5px] text-red-800 leading-relaxed">{error}</div>
              </div>
              <button
                onClick={() => navigate('/hivemind/login')}
                className="w-full px-4 py-2.5 rounded-lg bg-[#117dff] text-white text-sm font-semibold hover:bg-[#0a5fcc] transition"
              >
                Back to sign-in
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <h2 className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk']">Verified</h2>
              </div>

              {email && (
                <p className="text-[#525252] text-sm mb-4 leading-relaxed">
                  Signed in as <span className="font-semibold text-[#0a0a0a]">{email}</span>.
                </p>
              )}

              <div className="mb-6 p-3 rounded-lg bg-[#117dff]/8 border border-[#117dff]/20">
                <div className="flex items-start gap-2">
                  <Terminal size={14} className="text-[#117dff] mt-0.5 shrink-0" />
                  <div className="text-[12px] leading-relaxed text-[#0a5fcc]">
                    <span className="font-semibold">Ready to hand off to your terminal.</span>
                    <br />
                    <span className="text-[#3b6da3]">
                      The next step writes the MCP config to your client (Claude / Cursor / VS Code …)
                      and verifies the endpoint. You can close this tab once you see the CLI confirm.
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleContinue}
                disabled={continuing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#117dff] text-white text-sm font-semibold hover:bg-[#0a5fcc] disabled:opacity-50 transition"
              >
                {continuing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Handing off…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              {!continuing && autoCountdown > 0 && (
                <p className="text-center text-[11px] text-[#a3a3a3] mt-3">
                  Auto-continuing in {autoCountdown}s…
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
