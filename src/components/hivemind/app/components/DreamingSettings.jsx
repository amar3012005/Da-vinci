import React, { useEffect, useState } from 'react';
import { Moon } from 'lucide-react';
import apiClient from '../shared/api-client';

// Reuse Harness admission only; Settings never mounts a chat or agent runtime.
async function authenticate(signal) {
  const { data } = await apiClient.controlPlane.post('/v1/harness-chat/bootstrap', {}, { signal });
  if (data?.mode !== 'harness' || !data.ticket) throw new Error('Dreaming is unavailable for this workspace.');
  const response = await fetch('/api/hivemind/session/establish', {
    method: 'POST', credentials: 'include', signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticket: data.ticket, request_id: crypto.randomUUID() }),
  });
  if (!response.ok) throw new Error('Could not connect to Dreaming settings.');
}

export default function DreamingSettings({ organizationId }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setState(null); setError(null);
    (async () => {
      await authenticate(controller.signal);
      const response = await fetch('/hivemind/dreamer/settings', { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error('Dreaming settings are unavailable right now.');
      const value = await response.json();
      if (!controller.signal.aborted) setState(value);
    })().catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [organizationId]);

  async function change() {
    if (!state || saving) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch('/hivemind/dreamer/settings', {
        method: 'PUT', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: !state.enabled }),
      });
      if (!response.ok) throw new Error('The Dreaming setting could not be saved.');
      setState(await response.json());
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  return <section aria-label="Company dreaming">
    <div className="flex items-start justify-between gap-5">
      <div className="flex gap-3">
        <Moon size={20} className="text-[#117dff] mt-1 shrink-0" />
        <div>
          <h3 className="text-[#0a0a0a] text-base font-semibold">Dreaming</h3>
          <p className="text-[#525252] text-sm mt-1">Explore company memories automatically and save derived insights to Flashbacks.</p>
          <p className="text-[#737373] text-xs mt-2">Turning this on authorizes scheduled exploration and direct saves without per-dream approval. Everyone in the company can read Flashbacks. Turning it off keeps saved dreams.</p>
          {state && !state.canChange && <p className="text-sm mt-2">Only company administrators can change this setting.</p>}
          {state && !state.available && <p className="text-sm mt-2">Dreaming is unavailable for this workspace.</p>}
          {error && <p role="alert" className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
      </div>
      <button type="button" role="switch" aria-label="Enable company dreaming" aria-checked={Boolean(state?.enabled)}
        disabled={!state || saving || !state.canChange || (!state.available && !state.enabled)} onClick={change}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 ${state?.enabled ? 'bg-[#117dff] text-white' : 'bg-[#f0eeea] text-[#525252]'}`}>
        {saving ? 'Saving…' : state?.enabled ? 'On' : 'Off'}
      </button>
    </div>
  </section>;
}
