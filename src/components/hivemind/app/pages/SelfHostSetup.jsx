import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronUp, Cloud, Copy, KeyRound, Loader2, RefreshCw, Server, ShieldCheck, WifiOff, Wrench } from 'lucide-react';
import apiClient from '../shared/api-client';
import { useCopyToClipboard } from '../shared/hooks';

const REPO = 'https://github.com/amar3012005/HIVEMIND.git';
const CONTROL_PLANE_URL = (process.env.REACT_APP_CONTROL_PLANE_URL || 'https://api.singulancelabs.com').replace(/\/$/, '');
const INSTALLER_URL = 'https://get.singulancelabs.com/memory-box';
const shellQuote = (value) => `'${String(value).replace(/'/g, "'\\''")}'`;

export const buildInstallCommand = (token) => `curl -fsSL ${INSTALLER_URL} | sudo env HIVEMIND_ENROLLMENT_TOKEN=${shellQuote(token || '<enrollment-token>')} HIVEMIND_CENTRAL_URL=${shellQuote(CONTROL_PLANE_URL)} bash`;
export const buildAdvancedInstallCommand = (key) => `git clone --branch byod --single-branch ${REPO} hivemind-byod && cd hivemind-byod && HIVEMIND_API_KEY=${shellQuote(key || '<your-key>')} HIVEMIND_CENTRAL_URL=${shellQuote(CONTROL_PLANE_URL)} ./setup.sh`;

export function normalizeConnectionState(payload) {
  const raw = String(payload?.state || payload?.status || '').toUpperCase().replace(/-/g, '_');
  if (['READY', 'CONNECTED'].includes(raw) || payload?.reachable === true) return 'READY';
  if (['UPDATE_REQUIRED', 'DEGRADED', 'OFFLINE', 'REVOKED'].includes(raw)) return raw;
  if (['INSTALLING', 'ENROLLING', 'PROVISIONING'].includes(raw)) return 'INSTALLING';
  if (['CONNECTING', 'REGISTERED'].includes(raw) || payload?.registered === true) return 'CONNECTING';
  return 'WAITING';
}

const STATUS_COPY = {
  WAITING: ['Waiting for installation', 'Copy the command and run it once on your Linux server.'],
  INSTALLING: ['Installing Memory Box', 'The signed services are being verified and started.'],
  CONNECTING: ['Memory Box registered', 'Confirming an authenticated connection from HIVEMIND…'],
  READY: ['Memory Box connected', 'Your organization is ready. Opening HIVEMIND…'],
  DEGRADED: ['Connected with reduced capability', 'One or more Memory Box health checks need attention.'],
  OFFLINE: ['Memory Box is offline', 'Rerun the command to repair the registered installation.'],
  UPDATE_REQUIRED: ['Update required', 'Rerun the command to install a compatible signed release.'],
  REVOKED: ['Connection revoked', 'An organization administrator must create a new enrollment command.'],
};

function StatusPanel({ state, status, onRetry, retrying }) {
  const [title, description] = STATUS_COPY[state] || STATUS_COPY.WAITING;
  const ready = state === 'READY';
  const warning = ['DEGRADED', 'OFFLINE', 'UPDATE_REQUIRED', 'REVOKED'].includes(state);
  const Icon = ready ? CheckCircle2 : warning ? (state === 'OFFLINE' ? WifiOff : AlertTriangle) : Loader2;
  return (
    <div className={`rounded-[10px] border p-4 flex items-start gap-3 ${ready ? 'border-emerald-200 bg-emerald-50' : warning ? 'border-amber-200 bg-amber-50' : 'border-[#e3e0db] bg-[#faf9f4]'}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${ready ? 'text-emerald-600' : warning ? 'text-amber-600' : 'text-[#117dff] animate-spin'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{title}</p>
          <span className="rounded-full border border-current/20 px-1.5 py-0.5 text-[9px] font-mono tracking-wider">{state}</span>
        </div>
        <p className="text-[11px] text-[#737373] mt-1">{status?.message || description}</p>
        {status?.transport && <p className="text-[10px] text-[#a3a3a3] font-mono mt-1">transport={status.transport}</p>}
      </div>
      {warning && state !== 'REVOKED' && <button onClick={onRetry} disabled={retrying} className="shrink-0 p-1.5 text-[#737373] hover:text-[#0a0a0a] disabled:opacity-50" title="Check again"><RefreshCw size={15} className={retrying ? 'animate-spin' : ''} /></button>}
    </div>
  );
}

export default function SelfHostSetup({ onDone }) {
  const [bootstrap, setBootstrap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({ registered: false, reachable: false });
  const [checking, setChecking] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [mintingKey, setMintingKey] = useState(false);
  const bootstrapRef = useRef(false);
  const commandCopy = useCopyToClipboard();
  const advancedCopy = useCopyToClipboard();

  const createBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.createSelfHostBootstrap();
      const token = result?.enrollment_token || result?.enrollmentToken;
      if (!token && !result?.install_command) throw new Error('The enrollment command was not returned.');
      setBootstrap({ ...result, enrollmentToken: token, installCommand: result?.install_command || buildInstallCommand(token) });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not create an enrollment command.');
      // The governed stable channel may intentionally be unavailable until a
      // signed release is promoted. Keep the proven operator-managed path in
      // view instead of presenting the automatic path as usable.
      setAdvanced(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (bootstrapRef.current) return;
    bootstrapRef.current = true;
    createBootstrap();
  }, [createBootstrap]);

  const poll = useCallback(async () => {
    setChecking(true);
    try { setStatus((await apiClient.selfHostStatus()) || { registered: false, reachable: false }); }
    catch (e) { setStatus((current) => ({ ...current, message: e?.response?.data?.error || 'Connection status is temporarily unavailable.' })); }
    finally { setChecking(false); }
  }, []);

  const connectionState = normalizeConnectionState(status);
  useEffect(() => {
    if (connectionState === 'READY') {
      const doneId = setTimeout(() => onDone?.(), 1400);
      return () => clearTimeout(doneId);
    }
    const id = setInterval(poll, 3000);
    poll();
    return () => clearInterval(id);
  }, [connectionState, onDone, poll]);

  const mintAdvancedKey = async () => {
    setMintingKey(true); setError(null);
    try {
      const result = await apiClient.createApiKey('self-host-advanced', { scopes: ['memory:read', 'memory:write'] });
      if (!result?.api_key) throw new Error('The API key was not returned.');
      setApiKey(result.api_key);
    } catch (e) { setError(e?.response?.data?.error || e?.message || 'Could not create the advanced API key.'); }
    finally { setMintingKey(false); }
  };

  return (
    <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
      <main className="w-full max-w-3xl bg-white border border-[#e3e0db] rounded-[10px] p-5 sm:p-8">
        <header className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0"><Server size={20} className="text-[#117dff]" /></div>
          <div className="min-w-0"><div className="text-[11px] text-[#a3a3a3] font-mono uppercase tracking-wider">HIVEMIND · Enterprise</div><h1 className="text-[24px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Set up your Memory Box</h1><p className="text-[12px] text-[#737373] mt-1">One signed command connects your organization without opening inbound firewall ports.</p></div>
        </header>

        <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[[ShieldCheck, 'Signed release', 'Artifacts and image digests are verified'], [Cloud, 'Automatic connection', 'Outbound tunnel, DNS, and TLS are managed'], [Wrench, 'Self-healing', 'Safe reruns repair services without deleting data']].map(([Icon, title, copy]) => <div key={title} className="border border-[#e3e0db] rounded-[10px] p-3"><Icon size={16} className="text-[#117dff]" /><p className="text-[12px] font-semibold text-[#0a0a0a] mt-2">{title}</p><p className="text-[10px] text-[#737373] mt-0.5 leading-4">{copy}</p></div>)}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-2"><div><h2 className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">Run on your Linux server</h2><p className="text-[11px] text-[#a3a3a3] mt-1">The enrollment token is organization-bound, single-use, and short-lived.</p></div>{bootstrap?.expires_at && <span className="text-[9px] text-[#a3a3a3] font-mono whitespace-nowrap">expires {new Date(bootstrap.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}</div>
          {loading ? <div className="rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] p-4 flex items-center gap-2 text-[12px] text-[#737373]"><Loader2 size={15} className="animate-spin" /> Creating secure enrollment command…</div> : bootstrap?.installCommand ? <div className="relative"><pre className="bg-[#0a0a0a] text-[#f5f5f5] text-[11px] sm:text-[12px] leading-relaxed rounded-[10px] p-4 pr-12 overflow-x-auto font-mono whitespace-pre-wrap break-all">{bootstrap.installCommand}</pre><button onClick={() => commandCopy.copy(bootstrap.installCommand)} className="absolute right-2.5 top-2.5 p-2 rounded-[6px] bg-white/10 hover:bg-white/20 text-white" title="Copy command" aria-label="Copy installation command">{commandCopy.copied ? <Check size={15} /> : <Copy size={15} />}</button></div> : <button onClick={createBootstrap} className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]"><RefreshCw size={14} /> Create new command</button>}
          {error && <div role="alert" className="mt-3 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</div>}
        </section>

        <section className="mt-4"><StatusPanel state={connectionState} status={status} onRetry={poll} retrying={checking} /></section>

        <section className="mt-5 border-t border-[#eae7e1] pt-4">
          <button onClick={() => setAdvanced((value) => !value)} className="w-full flex items-center justify-between gap-3 text-left text-[12px] font-medium text-[#525252] hover:text-[#0a0a0a]" aria-expanded={advanced}><span className="flex items-center gap-2"><KeyRound size={14} /> Advanced networking and compatibility setup</span>{advanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
          {advanced && <div className="mt-3 rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] p-4"><p className="text-[11px] text-[#525252] leading-5">Use the proven API-key flow when your organization manages its own HTTPS endpoint or Tailscale network. Existing installations continue unchanged.</p>{!apiKey ? <button onClick={mintAdvancedKey} disabled={mintingKey} className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#0a0a0a] text-white text-[12px] hover:bg-[#262626] disabled:opacity-50">{mintingKey ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Create compatibility key</button> : <div className="relative mt-3"><pre className="bg-white border border-[#e3e0db] rounded-[6px] p-3 pr-10 overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-[#525252] font-mono">{buildAdvancedInstallCommand(apiKey)}</pre><button onClick={() => advancedCopy.copy(buildAdvancedInstallCommand(apiKey))} className="absolute right-2 top-2 p-1.5 text-[#737373] hover:text-[#0a0a0a]" aria-label="Copy advanced installation command">{advancedCopy.copied ? <Check size={14} /> : <Copy size={14} />}</button></div>}</div>}
        </section>

        <footer className="mt-6 pt-4 border-t border-[#eae7e1] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3"><p className="text-[10px] text-[#a3a3a3]">This organization requires a connected Memory Box before entering the workspace.</p><button onClick={() => onDone?.()} disabled={connectionState !== 'READY'} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0] disabled:bg-[#e3e0db] disabled:text-[#a3a3a3] disabled:cursor-not-allowed">Enter HIVEMIND <ArrowRight size={14} /></button></footer>
      </main>
    </div>
  );
}
