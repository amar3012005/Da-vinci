import React, { useState } from 'react';
import { Hexagon, Terminal, KeyRound, Copy, Check, ArrowRight, Server } from 'lucide-react';
import apiClient from '../shared/api-client';
import { useCopyToClipboard } from '../shared/hooks';

const REPO = 'https://github.com/your-org/hivemind.git'; // TODO: set to the public infra repo URL
const CLONE_CMD = `git clone --branch infra --single-branch ${REPO} hivemind && cd hivemind && ./setup.sh`;
const DEFAULT_SCOPES = ['read', 'write'];

// Two-step self-host onboarding: (1) clone + run the infra repo on your server, (2) mint the API key
// and paste it into the setup-script terminal. The same key is available later in Settings → API Keys.
export default function SelfHostSetup({ onDone }) {
  const [minting, setMinting] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [error, setError] = useState(null);
  const cmd = useCopyToClipboard();
  const key = useCopyToClipboard();

  const mint = async () => {
    setMinting(true); setError(null);
    try {
      const res = await apiClient.createApiKey('self-host', { scopes: DEFAULT_SCOPES });
      setApiKey(res?.api_key || null);
    } catch (e) {
      setError(e?.message || 'Failed to mint key');
    } finally {
      setMinting(false);
    }
  };

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
            Two steps. Your engine + data live on your hardware; you keep using this dashboard.
          </p>

          {/* Step 1 — clone + run */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#117dff] text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] flex items-center gap-1.5">
                <Terminal size={15} className="text-[#525252]" /> Clone &amp; run the infra repo on your server
              </span>
            </div>
            <div className="relative group">
              <pre className="bg-[#0a0a0a] text-[#e8e8e8] text-[12.5px] leading-relaxed rounded-xl px-4 py-3.5 overflow-x-auto font-mono border border-[#1f1f1f]">{CLONE_CMD}</pre>
              <button
                onClick={() => cmd.copy(CLONE_CMD)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Copy command">
                {cmd.copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <p className="text-[#737373] text-xs mt-2">Requires Docker. The script picks your storage (hybrid or single-file .amr) and asks for the key from step 2.</p>
          </div>

          {/* Step 2 — mint key */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#117dff] text-white text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] flex items-center gap-1.5">
                <KeyRound size={15} className="text-[#525252]" /> Mint your API key &amp; paste it into the setup terminal
              </span>
            </div>

            {!apiKey ? (
              <button
                onClick={mint}
                disabled={minting}
                className="inline-flex items-center gap-2 bg-[#117dff] hover:bg-[#0e6ae0] disabled:opacity-60 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition">
                <KeyRound size={16} /> {minting ? 'Minting…' : 'Mint API key'}
              </button>
            ) : (
              <div className="relative">
                <div className="flex items-stretch gap-2">
                  <code className="flex-1 bg-[#faf9f4] border border-[#e3e0db] rounded-xl px-4 py-3 text-[12.5px] font-mono text-[#0a0a0a] break-all">{apiKey}</code>
                  <button
                    onClick={() => key.copy(apiKey)}
                    className="shrink-0 inline-flex items-center gap-1.5 bg-[#117dff] hover:bg-[#0e6ae0] text-white text-sm font-semibold rounded-xl px-4 transition"
                    title="Copy key">
                    {key.copied ? <Check size={16} /> : <Copy size={16} />}
                    <span className="hidden sm:inline">{key.copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[#737373] text-xs mt-2">
                  Paste this into the <span className="font-mono text-[#525252]">./setup.sh</span> prompt on your server. Shown once — find it later in <span className="font-medium text-[#525252]">Settings → API Keys</span>.
                </p>
              </div>
            )}
            {error && <p className="text-[#dc2626] text-xs mt-2">{error}</p>}
          </div>

          <div className="mt-8 pt-6 border-t border-[#eeece7] flex items-center justify-between">
            <span className="text-[#737373] text-xs">You can manage keys + connection status anytime in the dashboard.</span>
            <button
              onClick={onDone}
              className="inline-flex items-center gap-1.5 text-[#117dff] hover:text-[#0e6ae0] text-sm font-semibold transition">
              Go to dashboard <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
