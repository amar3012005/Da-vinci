import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { authenticateDreaming } from '../components/DreamingSettings';
import AgentAvatar from '../hyperagents/AgentAvatar';
import HarnessSurface from './HarnessSurface';

const portraits = [
  { id: 'dream-researcher', role_archetype: 'researcher' },
  { id: 'dream-strategist', role_archetype: 'strategist' },
  { id: 'dream-communicator', role_archetype: 'communicator' },
];
/** First-time admission uses the existing setting; it never opens an empty ordinary chat. */
export default function DreamingPage() {
  const { org } = useAuth() || {};
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [agents, setAgents] = useState(portraits);
  useEffect(() => {
    const controller = new AbortController();
    setState(null); setError(''); setStarting(false);
    (async () => {
      await authenticateDreaming(controller.signal);
      const response = await fetch('/hivemind/dreamer/settings?view=activity', { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error('Dreaming could not be loaded. Please try again.');
      const value = await response.json();
      if (!controller.signal.aborted) setState(value);
      const employees = await fetch('/api/hivemind/employees', { credentials: 'include', signal: controller.signal });
      if (employees.ok) {
        const data = await employees.json();
        if (Array.isArray(data.profiles) && data.profiles.length >= 3 && !controller.signal.aborted) setAgents(data.profiles.slice(0, 3));
      }
    })().catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [org?.id]);
  useEffect(() => {
    if (!starting) return undefined;
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch('/hivemind/dreamer/settings?view=activity', { credentials: 'include', signal: controller.signal });
        if (!response.ok) throw new Error('Your welcome is saved. Reopen Dreaming to see it.');
        const value = await response.json();
        if (!controller.signal.aborted) {
          setState(value);
          if (!value.enabled) { setStarting(false); setError('Dreaming is off.'); }
          if (value.activity?.runs?.[0]?.status === 'failed') setError('The welcome could not finish. Your nightly setting is saved; you can still open Dreaming.');
        }
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
      finally { pending = false; }
    };
    void refresh();
    const timer = window.setInterval(refresh, 2000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [starting]);
  async function enable() {
    if (busy || !state?.canChange) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/hivemind/dreamer/settings', { method: 'PUT', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled: true }) });
      if (!response.ok) throw new Error('Dreaming could not be enabled. Please try again.');
      setState(await response.json()); setStarting(true);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  if (state?.sessionReady || (state?.hasRuns && !starting)) return <section className="h-full min-h-0 w-full overflow-hidden"><HarnessSurface key={`dreaming-${org?.id || 'company'}`} /></section>;
  if (!state) return <div className="h-full flex items-center justify-center text-sm text-neutral-500" role="status">{error || 'Opening Dreaming…'}</div>;
  return <div className="h-full overflow-y-auto flex items-center justify-center p-6 sm:p-10">
    <section className="w-full max-w-2xl rounded-3xl border border-blue-100 bg-gradient-to-br from-[#f5f8ff] via-white to-[#f8f5ff] p-7 sm:p-10" aria-label="Try Dreaming">
      <div className="flex items-center justify-between gap-4"><span className="text-sm font-medium text-blue-600">🌙 A little curiosity, every night</span>
        <button type="button" role="switch" aria-label="Enable Dreaming and start your welcome" aria-checked={starting || Boolean(state.enabled)} disabled={busy || starting || !state.canChange || !state.available} onClick={enable}
          className={`relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-50 ${starting || state.enabled ? 'bg-blue-500' : 'bg-neutral-300'}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${starting || state.enabled ? 'translate-x-5' : ''}`} /></button>
      </div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mt-5">Try our new feature<br />Dreaming</h1>
      <p className="text-base leading-relaxed text-neutral-600 mt-5">While you sleep, your agents explore HIVEMIND, follow connections between people, projects and ideas, and look for insights you might have missed.</p>
      <p className="text-base leading-relaxed text-neutral-600 mt-3">Come back the next day to discover what they found in <strong className="font-medium text-neutral-900">Flashbacks</strong> — with clear explanations and the sources behind each idea.</p>
      <div className="flex gap-4 my-7" aria-label="Your HyperAgents">{agents.map(agent => <AgentAvatar key={agent.id} agent={agent} size={64} />)}</div>
      <p className="text-sm leading-relaxed text-neutral-500">You choose the direction. Add a goal, turn Dreaming off anytime, or separately allow read-only access to selected connected apps. Flashbacks are shared with your company.</p>
      <p className="text-sm mt-5 text-blue-600" role="status">{starting ? 'Dreaming is on. Preparing your personal welcome…' : state.canChange ? 'Enable Dreaming above to meet your Dreamer.' : 'Ask a company administrator to enable Dreaming.'}</p>
      {!state.available && <p className="text-sm mt-2 text-neutral-500">Dreaming is not available for this workspace yet.</p>}
      {error && <p role="alert" className="text-sm mt-3 text-red-600">{error}</p>}
    </section>
  </div>;
}
