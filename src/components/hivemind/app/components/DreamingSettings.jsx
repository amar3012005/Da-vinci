import React, { useEffect, useState } from 'react';
import { Moon } from 'lucide-react';
import apiClient from '../shared/api-client';

const appNames = { gmail: 'Gmail', slack: 'Slack', googledocs: 'Google Docs', googledrive: 'Google Drive', github: 'GitHub', notion: 'Notion', outlook: 'Outlook' };
function AccessSwitch({ checked, disabled, label, onChange }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
    className={`relative w-9 h-5 rounded-full shrink-0 transition-colors disabled:opacity-50 ${checked ? 'bg-[#117dff]' : 'bg-neutral-300'}`}>
    <span className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} />
  </button>;
}

// Reuse Harness admission only; Settings never mounts a chat or agent runtime.
export async function authenticateDreaming(signal) {
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
      await authenticateDreaming(controller.signal);
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
      <div className="flex items-center justify-between gap-4 text-sm font-medium text-[#262626]">
        <span>Use connected apps while dreaming</span>
        <AccessSwitch label="Use connected apps while dreaming" checked={Boolean(connectors?.enabled)}
          disabled={!connectors?.available || connectorBusy} onChange={enabled => saveConnectors(enabled,
            connectors?.accounts.filter(account => account.enabled).map(account => account.id) || [])} />
      </div>
      <p className="text-xs text-[#737373] mt-2">Read-only. Choose which of your connections Dreaming may explore when useful. Discoveries may be shared with your company in Flashbacks. Turning access off prevents future reads; saved Flashbacks remain.</p>
      {connectors?.enabled && <div className="mt-3 space-y-3">
        {!connectors.accounts.length && <p className="text-sm text-[#737373]">No connected apps yet. Add them in Connectors.</p>}
        {connectors.accounts.map(account => <div key={account.id} className="flex items-center gap-3 text-sm text-[#525252]">
          <img src={`https://logos.composio.dev/api/${encodeURIComponent(account.toolkit)}`} alt="" className="w-6 h-6 object-contain rounded" loading="lazy" />
          <span className="flex-1">{appNames[account.toolkit.toLowerCase()] || account.toolkit}<small className="block text-xs text-[#a3a3a3]">Read-only · {account.id.slice(-6)}</small></span>
          <AccessSwitch checked={account.enabled} disabled={connectorBusy} label={`Allow Dreaming to read ${account.label}`}
            onChange={enabled => saveConnectors(true, connectors.accounts.filter(item => item.id === account.id ? enabled : item.enabled).map(item => item.id))} />
        </div>)}
      </div>}
      <a href="/hivemind/app/connectors" className="flex items-center justify-between text-sm text-[#117dff] mt-4">More apps <span aria-hidden="true">›</span></a>
      {connectorBusy && <p role="status" className="text-xs text-[#737373] mt-2">Saving access and preparing read tools…</p>}
      {connectorMessage && <p role="status" className="text-xs text-[#737373] mt-2">{connectorMessage}</p>}
    </section>
  </section>;
}
