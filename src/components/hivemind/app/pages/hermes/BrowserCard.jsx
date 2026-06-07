import React, { useState, useEffect, useCallback } from 'react';
import { Globe, RefreshCw, Check, Copy, Power } from 'lucide-react';

// Web-bridge automation (Home). Connect the agent to the user's real browser via
// Kimi WebBridge: pair → install Kimi daemon → run the connector. Once paired, the
// agent can navigate/click/fill/extract in the user's browser (browser tools land
// in the agent's toolset). Backend: GET/POST(pair)/DELETE /hermes/agent/browser.

function errMessage(e) {
  return e?.response?.data?.error || e?.message || 'Something went wrong';
}

const KIMI_INSTALL_MAC = 'curl -fsSL https://cdn.kimi.com/webbridge/install.sh | bash';

function Mono({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2 mt-1">
      <code className="flex-1 min-w-0 rounded-[6px] border border-[#e3e0db] bg-[#0a0a0a] text-[#e6edf3] px-3 py-2 text-[11px] font-mono overflow-x-auto whitespace-nowrap">
        {text}
      </code>
      <button
        type="button"
        onClick={() => { try { navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}
        className="shrink-0 inline-flex items-center gap-1 rounded-[6px] border border-[#e3e0db] px-2 text-[11px] text-[#525252] hover:bg-[#f3f1ec]"
        aria-label="Copy"
      >
        {copied ? <Check size={13} className="text-[#16a34a]" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export default function BrowserCard({ agent, apiClient }) {
  const [status, setStatus] = useState(null); // { paired, online }
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [connect, setConnect] = useState(null); // { connect_command }
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setStatus(await apiClient.getHermesBrowser()); } catch (e) { setError(errMessage(e)); } finally { setLoading(false); }
  }, [apiClient]);

  useEffect(() => { refresh(); }, [refresh]);
  // Poll connector liveness while the connect command is shown (waiting to pair).
  useEffect(() => {
    if (!connect) return undefined;
    const id = window.setInterval(refresh, 4000);
    return () => window.clearInterval(id);
  }, [connect, refresh]);

  async function pair() {
    setPairing(true); setError(null);
    try { setConnect(await apiClient.pairHermesBrowser()); await refresh(); }
    catch (e) { setError(errMessage(e)); } finally { setPairing(false); }
  }
  async function unpair() {
    setError(null);
    try { await apiClient.unpairHermesBrowser(); setConnect(null); await refresh(); }
    catch (e) { setError(errMessage(e)); }
  }

  const paired = status?.paired;
  const online = status?.online;

  return (
    <section className="rounded-[10px] border border-[#e3e0db] bg-white p-5" aria-label="Web automation">
      <div className="flex items-center gap-2 mb-1">
        <Globe size={15} className="text-[#117dff]" />
        <h3 className="text-[13px] font-semibold text-[#0a0a0a]">Web Automation</h3>
        {!loading && paired && (
          <span className={`ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${online ? 'bg-emerald-500/10 text-[#16a34a]' : 'bg-amber-500/10 text-amber-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#16a34a]' : 'bg-amber-500'}`} />
            {online ? 'Connected' : 'Paired · connector offline'}
          </span>
        )}
      </div>
      <p className="text-[11px] text-[#737373] mb-3">
        Let the agent use <strong>your browser</strong> — research, fill forms, navigate, extract — with your logged-in sessions.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3] py-2"><RefreshCw size={12} className="animate-spin" /> Checking…</div>
      ) : paired ? (
        <div>
          <p className="text-[11px] text-[#525252]">
            {online
              ? 'Your browser is connected. The agent can run browser tasks.'
              : 'Paired, but the connector isn’t running. Start it on your machine (the command from when you connected), then this turns green.'}
          </p>
          <button onClick={unpair} className="mt-3 inline-flex items-center gap-1.5 rounded-[6px] border border-[#e3e0db] px-3 py-1.5 text-[11px] text-[#dc2626] hover:bg-red-50">
            <Power size={12} /> Disconnect
          </button>
        </div>
      ) : connect ? (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-[#0a0a0a]">1. Install Kimi WebBridge (once)</p>
            <Mono text={KIMI_INSTALL_MAC} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#0a0a0a]">2. Connect it to your agent</p>
            <Mono text={connect.connect_command} />
          </div>
          <p className="text-[10px] text-[#a3a3a3]">Leave that command running. This card turns green when your browser connects.</p>
        </div>
      ) : (
        <div>
          <button onClick={pair} disabled={pairing}
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#117dff] px-3.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#0066e0] disabled:opacity-50">
            {pairing ? <><RefreshCw size={12} className="animate-spin" /> Preparing…</> : <><Globe size={12} /> Connect your browser</>}
          </button>
        </div>
      )}

      {error && <div className="mt-2 text-[11px] text-[#dc2626]">{error}</div>}
    </section>
  );
}
