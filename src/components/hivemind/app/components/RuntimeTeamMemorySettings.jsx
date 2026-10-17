import React, { useEffect, useState } from 'react';
import apiClient from '../shared/api-client';

export default function RuntimeTeamMemorySettings({ organizationId }) {
  const [enabled, setEnabled] = useState(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setEnabled(null); setConsent(false); setError('');
    apiClient.getRuntimeTeamMemory(controller.signal).then(value => {
      if (!controller.signal.aborted) setEnabled(value.privateWrites === true);
    }).catch(() => { if (!controller.signal.aborted) setError('Memory access could not be checked. Reopen Settings to retry.'); });
    return () => controller.abort();
  }, [organizationId]);
  async function enable() {
    setBusy(true); setError('');
    try {
      await apiClient.enableRuntimeTeamMemory();
      const value = await apiClient.getRuntimeTeamMemory();
      setEnabled(value.privateWrites === true);
    } catch (failure) { setError(failure.response?.data?.error || 'Memory access could not be confirmed. Reopen Settings before retrying.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Team operating memory">
    <h3 className="text-base font-semibold text-[#0a0a0a]">Team operating memory</h3>
    <p className="mt-2 text-sm text-[#525252]">Linked specialists share operating notes inside your company. They can recall and save useful decisions, preferences and handoffs without approval cards. Company Brain writes still require approval.</p>
    <p role="status" className="mt-3 text-sm">{enabled === true ? 'Read and write access is enabled for all linked agents in your account.' : enabled === false ? 'Recall is available; saving operating notes is not enabled.' : 'Checking memory access…'}</p>
    {enabled === false && <>
      <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I authorize an encrypted, company-scoped HIVE credential with MCP and memory read/write access for my linked agents.</label>
      <button type="button" disabled={busy || !consent} onClick={enable} className="mt-4 rounded-lg bg-[#117dff] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Enabling…' : 'Enable operating-memory writes'}</button>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
