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
  const [connectors, setConnectors] = useState(null);
  const [connectorBusy, setConnectorBusy] = useState(false);
  const [connectorMessage, setConnectorMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setState(null); setError(null); setConnectors(null); setConnectorMessage('');
    (async () => {
      await authenticate(controller.signal);
      const response = await fetch('/hivemind/dreamer/settings', { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error('Dreaming settings are unavailable right now.');
      const value = await response.json();
      if (!controller.signal.aborted) setState(value);
      const appsResponse = await fetch('/hivemind/dreamer/connectors', { credentials: 'include', signal: controller.signal });
      if (!appsResponse.ok) throw new Error('Connected apps could not be loaded.');
      const apps = await appsResponse.json();
      if (!controller.signal.aborted) setConnectors(apps);
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
  async function saveConnectors(enabled, accountIds) {
    if (connectorBusy || !connectors) return;
    setConnectorBusy(true); setConnectorMessage('');
    try {
      const response = await fetch('/hivemind/dreamer/connectors', { method: 'PUT', credentials: 'include',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled, accountIds }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error === 'read_tools_unavailable'
        ? 'This app has no compatible read tools yet. Your previous choices are unchanged.' : 'Access could not be saved. Please try again.');
      setConnectors(value); setConnectorMessage('Saved for future dreams.');
    } catch (failure) { setConnectorMessage(failure.message); }
    finally { setConnectorBusy(false); }
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
    <section aria-label="Dreaming connected apps" className="mt-5 pt-5 border-t border-[#ebe8e2]">
      <label className="flex items-center justify-between gap-4 text-sm font-medium text-[#262626]">
        <span>Use connected apps while dreaming</span>
        <input type="checkbox" role="switch" aria-label="Use connected apps while dreaming" checked={Boolean(connectors?.enabled)}
          disabled={!connectors?.available || connectorBusy} className="accent-[#117dff]" onChange={event => saveConnectors(event.target.checked,
            connectors?.accounts.filter(account => account.enabled).map(account => account.id) || [])} />
      </label>
      <p className="text-xs text-[#737373] mt-2">Read-only. Choose which of your connections Dreaming may explore when useful. Discoveries may be shared with your company in Flashbacks. Turning access off prevents future reads; saved Flashbacks remain.</p>
      {connectors?.enabled && <div className="mt-3 space-y-3">
        {!connectors.accounts.length && <p className="text-sm text-[#737373]">No connected apps yet. Add them in Connectors.</p>}
        {connectors.accounts.map(account => <label key={account.id} className="flex items-center justify-between gap-4 text-sm text-[#525252]">
          <span>{account.label}<small className="block text-xs text-[#a3a3a3]">Read-only</small></span>
          <input type="checkbox" checked={account.enabled} disabled={connectorBusy} className="accent-[#117dff]"
            aria-label={`Allow Dreaming to read ${account.label}`} onChange={event => saveConnectors(true,
              connectors.accounts.filter(item => item.id === account.id ? event.target.checked : item.enabled).map(item => item.id))} />
        </label>)}
      </div>}
      {connectorBusy && <p role="status" className="text-xs text-[#737373] mt-2">Saving access and preparing read tools…</p>}
      {connectorMessage && <p role="status" className="text-xs text-[#737373] mt-2">{connectorMessage}</p>}
    </section>
  </section>;
}
