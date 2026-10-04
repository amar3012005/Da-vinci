import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, BellRing } from 'lucide-react';
import apiClient from '../shared/api-client';

const EVENT_NAMES = {
  GMAIL_NEW_GMAIL_MESSAGE: 'Incoming email',
  GMAIL_EMAIL_SENT_TRIGGER: 'Sent email',
  SLACK_RECEIVE_MESSAGE: 'New message',
};
const eventLabel = (row) => EVENT_NAMES[row.trigger_slug]
  || row.trigger_slug.toLowerCase().replace(/_/g, ' ');

/** Only existing owned subscriptions are exposed; toggling never enrolls another account/event. */
export default function RuntimeEventSubscriptions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const alive = useRef(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await apiClient.connectedEventSubscriptions({ operation: 'list' });
      if (alive.current) {
        setRows((result.subscriptions || []).filter(row => row.status === 'active'));
        setNeedsRefresh(false);
      }
    } catch {
      if (alive.current) setError('Could not load connected updates. Please try again.');
    } finally { if (alive.current) setLoading(false); }
  }, []);
  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);
  const toggle = async (row) => {
    setSaving(row.id); setError(''); setNotice('');
    try {
      const result = await apiClient.connectedEventSubscriptions({ operation: 'create',
        connected_account_id: row.connected_account_id, trigger_slug: row.trigger_slug,
        config: row.config, runtime_attention: row.runtime_attention !== true });
      if (!result.successful || result.subscription?.id !== row.id
        || result.subscription.runtime_attention !== (row.runtime_attention !== true)) throw Error('unconfirmed');
      if (alive.current) {
        setRows(current => current.map(item => item.id === row.id ? result.subscription : item));
        setNotice(result.subscription.runtime_attention
          ? 'Saved. Future important updates can wake Runtime while autonomy is on.'
          : 'Saved. These updates will no longer wake Runtime.');
      }
    } catch {
      if (alive.current) {
        setError('Could not confirm this change. Refresh to check its saved state before retrying.');
        setNeedsRefresh(true);
      }
    } finally { if (alive.current) setSaving(null); }
  };
  return (
    <section aria-labelledby="runtime-updates-title" className="border border-[#e3e0db] rounded-xl bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="runtime-updates-title" className="flex items-center gap-2 text-sm font-medium text-[#171717]">
          <BellRing size={16} /> Runtime updates
        </h2>
        <button type="button" onClick={load} disabled={loading || saving !== null}
          aria-label="Refresh Runtime updates" className="text-[#737373] hover:text-[#117dff] disabled:opacity-50">
          <RefreshCw size={14} />
        </button>
      </div>
      <p className="text-xs leading-relaxed text-[#737373] mt-2 mb-4">
        Let important updates from an existing connection reach our Chief of Staff.
        Routine activity stays quiet. Runtime decides what needs attention; approvals still apply.
      </p>
      {loading && <p role="status" className="text-xs text-[#737373]">Loading connected updates…</p>}
      {!loading && !error && rows.length === 0 && <p className="text-xs text-[#737373]">
        No active event subscriptions yet. Existing subscriptions will appear here.
      </p>}
      {!loading && rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-4 py-3 border-t border-[#eeeae5]">
          <div><p className="text-sm text-[#171717] capitalize">{row.toolkit} · {eventLabel(row)}</p>
            <p className="text-xs text-[#737373] mt-1">Future important updates only</p></div>
          <button type="button" role="switch" aria-checked={row.runtime_attention === true}
            aria-label={`Wake Runtime for ${row.toolkit} ${eventLabel(row)}`}
            disabled={saving !== null || needsRefresh} onClick={() => toggle(row)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              row.runtime_attention ? 'bg-[#117dff] text-white' : 'bg-[#f5f3ef] text-[#525252]'}`}>
            {saving === row.id ? 'Saving…' : row.runtime_attention ? 'On' : 'Off'}
          </button>
        </div>
      ))}
      {error && <p role="alert" className="text-xs text-[#b45309] mt-3">{error}</p>}
      {notice && <p role="status" className="text-xs text-[#15803d] mt-3">{notice}</p>}
    </section>
  );
}
