import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Hexagon, Terminal, KeyRound, Copy, Check, ArrowRight, Server, Loader2, CheckCircle2 } from 'lucide-react';
import apiClient from '../shared/api-client';
import { useCopyToClipboard } from '../shared/hooks';

const REPO = 'https://github.com/amar3012005/HIVEMIND.git';
const DEFAULT_SCOPES = ['read', 'write'];
// One command: clone the byod bundle, run setup.sh with the key prefilled (setup.sh reads HIVEMIND_API_KEY).
const installCmd = (key) =>
  `git clone --branch byod --single-branch ${REPO} hivemind-byod && cd hivemind-byod && HIVEMIND_API_KEY=${key || '<your-key>'} ./setup.sh`;

// Self-host onboarding. Key is auto-minted on mount (no hunting in Settings). One command stands up
// Postgres + the .amr agent on the customer box; a live poll confirms the agent connected.
export default function SelfHostSetup({ onDone }) {
  const [apiKey, setApiKey] = useState(null);
  const [minting, setMinting] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({ registered: false, reachable: false });
  const cmd = useCopyToClipboard();
  const keyCopy = useCopyToClipboard();
  const mintedRef = useRef(false);

  // Auto-mint exactly once.
  useEffect(() => {
    if (mintedRef.current) return;
    mintedRef.current = true;
    (async () => {
      try {
        const res = await apiClient.createApiKey('self-host', { scopes: DEFAULT_SCOPES });
        setApiKey(res?.api_key || null);
        if (!res?.api_key) setError('Key minted but not returned — check Settings → API Keys.');
      } catch (e) {
        setError(e?.message || 'Failed to mint key');
      } finally {
        setMinting(false);
      }
    })();
  }, []);

  // Poll connection status once the key exists; stop when the agent is reachable.
  const poll = useCallback(async () => {
    if (!apiKey) return;
    try {
      const s = await apiClient.selfHostStatus(apiKey);
      setStatus(s || { registered: false, reachable: false });
    } catch { /* keep waiting */ }
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || status.reachable) return undefined;
    const id = setInterval(() => { poll(); }, 4000);
    poll();
    return () => clearInterval(id);
  }, [apiKey, status.reachable, poll]);

  const connected = status.reachable;
  const waiting = !!apiKey && status.registered && !status.reachable;

  return (
    <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center px-4 py-10">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full bg-[#117dff]/[0.03] blur-[110px]" />
      <div className="relative z-10 w-full max-w-3xl">
        <div className="bg-white border border-[#e3e0db] rounded-3xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <Hexagon size={22} className="text-[#117dff]" />
            </div>
            <span className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">HIVEMIND</span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#117dff] bg-[#117dff]/8 border border-[#117dff]/20 rounded-full px-2.5 py-1">
              <Server size={13} /> Self-host
            </span>
          </div>

          <h2 className="text-[#0a0a0a] text-3xl font-bold font-['Space_Grotesk'] mb-2">Run HIVEMIND on your server</h2>
          <p className="text-[#525252] text-sm mb-8 max-w-2xl">
            One command. Your engine + all memory data (vectors, content, relationship graph) live on your
            hardware — you keep using this dashboard. Only query results cross the link.
          </p>

          {/* Step 1 — your key (auto-minted) */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#117dff] text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] flex items-center gap-1.5">
                <KeyRound size={15} className="text-[#525252]" /> Your self-host key
              </span>
            </div>
            {minting ? (
              <div className="flex items-center gap-2 text-[#737373] text-sm bg-[#faf9f4] border border-[#e3e0db] rounded-xl px-4 py-3">
                <Loader2 size={15} className="animate-spin" /> Minting your key…
              </div>
            ) : apiKey ? (
              <div className="flex items-stretch gap-2">
                <code className="flex-1 bg-[#faf9f4] border border-[#e3e0db] rounded-xl px-4 py-3 text-[12.5px] font-mono text-[#0a0a0a] break-all">{apiKey}</code>
                <button
                  onClick={() => keyCopy.copy(apiKey)}
                  className="shrink-0 inline-flex items-center gap-1.5 bg-[#117dff] hover:bg-[#0e6ae0] text-white text-sm font-semibold rounded-xl px-4 transition"
                  title="Copy key">
                  {keyCopy.copied ? <Check size={16} /> : <Copy size={16} />}
                  <span className="hidden sm:inline">{keyCopy.copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ) : null}
            <p className="text-[#737373] text-xs mt-2">Shown once. Find it later in <span className="font-medium text-[#525252]">Settings → API Keys</span>.</p>
          </div>

          {/* Step 2 — run it */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#117dff] text-white text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] flex items-center gap-1.5">
                <Terminal size={15} className="text-[#525252]" /> Run this on your server (key prefilled)
              </span>
            </div>
            <div className="relative group">
              <pre className="bg-[#0a0a0a] text-[#e8e8e8] text-[12.5px] leading-relaxed rounded-xl px-4 py-3.5 overflow-x-auto font-mono border border-[#1f1f1f] whitespace-pre-wrap break-all">{installCmd(apiKey)}</pre>
              <button
                onClick={() => cmd.copy(installCmd(apiKey))}
                disabled={!apiKey}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white transition"
                title="Copy command">
                {cmd.copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <p className="text-[#737373] text-xs mt-2">
              Requires Docker. Stands up Postgres + the <span className="font-mono text-[#525252]">.amr</span> agent and asks for your agent&apos;s public URL (or Tailscale).
            </p>
          </div>

          {/* Live connection status */}
          <div className={`mt-6 rounded-2xl border px-4 py-3.5 flex items-center gap-3 transition ${
            connected ? 'border-[#16a34a]/30 bg-[#16a34a]/[0.05]'
            : 'border-[#e3e0db] bg-[#faf9f4]'}`}>
            {connected ? (
              <CheckCircle2 size={18} className="text-[#16a34a] shrink-0" />
            ) : (
              <Loader2 size={18} className="text-[#117dff] animate-spin shrink-0" />
            )}
            <div className="min-w-0">
              <p className={`text-sm font-semibold font-['Space_Grotesk'] ${connected ? 'text-[#15803d]' : 'text-[#0a0a0a]'}`}>
                {connected ? 'Agent connected — your data lives on your server'
                  : waiting ? 'Agent registered — confirming reachability…'
                  : 'Waiting for your agent to connect…'}
              </p>
              <p className="text-[#737373] text-xs">
                {connected ? `Transport: ${status.transport || 'agent'}. Memory writes now flow to your box.`
                  : 'Run the command above. This updates automatically.'}
              </p>
            </div>
          </div>

          {error && <p className="text-[#dc2626] text-xs mt-3">{error}</p>}

          <div className="mt-8 pt-6 border-t border-[#eeece7] flex items-center justify-between">
            <span className="text-[#737373] text-xs">Manage keys + connection status anytime in the dashboard.</span>
            <button
              onClick={onDone}
              className={`inline-flex items-center gap-1.5 text-sm font-semibold transition ${
                connected ? 'text-[#16a34a] hover:text-[#15803d]' : 'text-[#117dff] hover:text-[#0e6ae0]'}`}>
              {connected ? 'Enter dashboard' : 'Skip for now'} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
