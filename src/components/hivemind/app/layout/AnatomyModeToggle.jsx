import React, { useEffect, useState } from 'react';
import { Shapes } from 'lucide-react';
import { fetchWithRuntimeAdmission } from '../shared/runtime-admission';

export const ANATOMY_ENDPOINT = '/api/hivemindHq/anatomyMode';

/**
 * Company Anatomy mode switch for the phone sidebar. Runtime owns the saved value; the row stays hidden
 * until Runtime serves the setting, and a stale tab's save is refused and replaced by the current value.
 */
export default function AnatomyModeToggle({ fetcher = fetchWithRuntimeAdmission }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetcher(ANATOMY_ENDPOINT, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async response => { if (response.ok) { const body = await response.json(); if (body?.value) setState(body.value); } })
      .catch(() => { /* Runtime without Anatomy mode: the row stays hidden. */ });
    return () => controller.abort();
  }, [fetcher]);
  if (!state) return null;
  const toggle = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetcher(ANATOMY_ENDPOINT, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled: !state.enabled, expectedRevision: state.revision }) });
      const body = await response.json().catch(() => ({}));
      if (body?.value) setState(body.value);
      if (!response.ok) setError(response.status === 409 ? 'Changed on another device. Showing the current setting.' : 'Anatomy mode could not be saved.');
    } catch { setError('Anatomy mode could not be saved.'); }
    finally { setBusy(false); }
  };
  return <div className="mobile-roster-anatomy">
    <button type="button" role="switch" aria-checked={state.enabled} disabled={busy} onClick={toggle}>
      <Shapes size={20} aria-hidden="true" />
      <span><strong>Anatomy mode</strong><small>{state.enabled ? 'Visual answers on' : 'Answers with interactive illustrations'}</small></span>
      <i aria-hidden="true" data-on={state.enabled || undefined} />
    </button>
    {error && <p role="status">{error}</p>}
  </div>;
}
