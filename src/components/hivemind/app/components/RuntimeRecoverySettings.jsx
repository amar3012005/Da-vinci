import React, { useEffect, useState } from 'react';
import apiClient from '../shared/api-client';

export default function RuntimeRecoverySettings({ organizationId }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setStatus(null); setError('');
    apiClient.getRuntimeRecovery(controller.signal).then(result => {
      if (!controller.signal.aborted) setStatus(result.status);
    }).catch(() => { if (!controller.signal.aborted) setError('Recovery status is unavailable. Reopen Settings to retry.'); });
    return () => controller.abort();
  }, [organizationId]);
  async function enable() {
    setBusy(true); setError('');
    try {
      await apiClient.enableRuntimeRecovery();
      const result = await apiClient.getRuntimeRecovery();
      setStatus(result.status);
    } catch (failure) {
      setError(failure.response?.data?.error || 'Recovery setup could not be confirmed. Reopen Settings before retrying.');
    } finally { setBusy(false); }
  }
  return <section aria-label="Agent recovery">
    <h3 className="text-base font-semibold text-[#0a0a0a]">Continue after restarts</h3>
    <p className="mt-2 text-sm text-[#525252]">Allow queued specialist work to resume after a service restart. Workspace access is checked again. Actions with an unknown result are held for review.</p>
    <p role="status" className="mt-3 text-sm">{status === 'configured' ? 'Recovery is enabled for your workspace account.' : status === 'not_configured' ? 'Recovery is not enabled.' : status === 'needs_review' ? 'An administrator needs to review the recovery credential.' : status === 'unavailable' ? 'The recovery service is temporarily unavailable.' : 'Checking recovery…'}</p>
    {status === 'not_configured' && <button type="button" disabled={busy} onClick={enable} className="mt-4 rounded-lg bg-[#117dff] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Enabling recovery…' : 'Enable recovery'}</button>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <p className="mt-3 text-xs text-[#737373]">A workspace administrator must enable recovery. This creates a credential limited to recovery access checks.</p>
  </section>;
}
