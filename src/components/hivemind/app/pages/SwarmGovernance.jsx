import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../shared/api-client';

const STATUS_COLORS = {
  proposed: '#7a8',
  approved: '#5a9',
  applied:  '#3c7',
  reverted: '#c80',
  rejected: '#a55',
  failed:   '#c33',
};

function fmt(n) { return (n ?? 0).toLocaleString(); }

export default function SwarmGovernance() {
  const [metrics, setMetrics] = useState(null);
  const [actions, setActions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('proposed');
  const [windowDays, setWindowDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingActionId, setPendingActionId] = useState(null);
  const [toast, setToast] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [m, log] = await Promise.all([
        apiClient.getGovernanceMetrics(windowDays),
        apiClient.getGovernanceActionLog({ status: statusFilter, limit: 50 }),
      ]);
      setMetrics(m); setActions(log.actions || []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'load failed');
    } finally { setLoading(false); }
  }, [windowDays, statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const triggerCycle = async () => {
    setLoading(true); setError(null);
    try {
      const r = await apiClient.runGovernanceCycle({});
      setToast(`cycle ${r.batch_id?.slice(0,8) || ''} ${r.status}`);
      setTimeout(() => setToast(null), 4000);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'cycle failed');
    } finally { setLoading(false); }
  };

  const approve = async (id) => {
    setPendingActionId(id);
    try {
      const r = await apiClient.approveGovernanceAction(id);
      setToast(`action ${r.status}`);
      setTimeout(() => setToast(null), 4000);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'approve failed');
    } finally { setPendingActionId(null); }
  };

  const reject = async (id) => {
    setPendingActionId(id);
    try {
      await apiClient.rejectGovernanceAction(id);
      setToast('rejected');
      setTimeout(() => setToast(null), 4000);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'reject failed');
    } finally { setPendingActionId(null); }
  };

  const rollback = async (batchId) => {
    if (!window.confirm(`Rollback every applied action in batch ${batchId.slice(0,8)}?`)) return;
    setLoading(true);
    try {
      const r = await apiClient.rollbackGovernanceBatch(batchId);
      setToast(`reverted ${r.reverted}/${r.attempted}`);
      setTimeout(() => setToast(null), 4000);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'rollback failed');
    } finally { setLoading(false); }
  };

  const t = metrics?.totals || {};
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#222', maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Governance</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))}>
            <option value={1}>1 day</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>
          <button onClick={refresh} disabled={loading}>Refresh</button>
          <button onClick={triggerCycle} disabled={loading} style={{ background: '#3c7', color: '#fff', padding: '4px 12px', border: 'none', borderRadius: 4 }}>
            Run cycle
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee', border: '1px solid #c66', padding: 8, marginBottom: 12, borderRadius: 4 }}>
          {error}
        </div>
      )}
      {toast && (
        <div style={{ background: '#efe', border: '1px solid #3c7', padding: 8, marginBottom: 12, borderRadius: 4 }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['Proposed', t.actions_proposed, STATUS_COLORS.proposed],
          ['Approved', t.actions_approved, STATUS_COLORS.approved],
          ['Applied',  t.actions_applied,  STATUS_COLORS.applied],
          ['Reverted', t.actions_reverted, STATUS_COLORS.reverted],
          ['Rejected', t.actions_rejected, STATUS_COLORS.rejected],
          ['Failed',   t.actions_failed,   STATUS_COLORS.failed],
        ].map(([label, n, color]) => (
          <div key={label} style={{ background: '#fafafa', border: `1px solid ${color}`, padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color }}>{fmt(n)}</div>
          </div>
        ))}
      </div>

      {metrics?.agent_state?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, color: '#666' }}>Agent state</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ textAlign: 'left', padding: 6 }}>Agent</th>
                <th style={{ textAlign: 'left', padding: 6 }}>Last run</th>
                <th style={{ textAlign: 'right', padding: 6 }}>Tokens today</th>
                <th style={{ textAlign: 'right', padding: 6 }}>Daily budget</th>
                <th style={{ textAlign: 'left', padding: 6 }}>Circuit-breaker</th>
              </tr>
            </thead>
            <tbody>
              {metrics.agent_state.map((a) => (
                <tr key={a.agent} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 6, fontWeight: 600 }}>{a.agent}</td>
                  <td style={{ padding: 6 }}>{a.last_run_at ? new Date(a.last_run_at).toLocaleString() : '—'}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{fmt(a.tokens_spent_today)}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{fmt(a.daily_token_budget)}</td>
                  <td style={{ padding: 6 }}>{a.circuit_breaker_until || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Action log</h3>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="proposed">proposed</option>
          <option value="approved">approved</option>
          <option value="applied">applied</option>
          <option value="reverted">reverted</option>
          <option value="rejected">rejected</option>
          <option value="failed">failed</option>
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ textAlign: 'left', padding: 6 }}>Agent</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Action</th>
            <th style={{ textAlign: 'right', padding: 6 }}>Confidence</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Batch</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Created</th>
            <th style={{ textAlign: 'right', padding: 6 }}>Controls</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 6 }}>{a.agent}</td>
              <td style={{ padding: 6, fontFamily: 'monospace' }}>{a.action_type}</td>
              <td style={{ padding: 6, textAlign: 'right' }}>{a.confidence?.toFixed?.(2) ?? '—'}</td>
              <td style={{ padding: 6, fontFamily: 'monospace', fontSize: 11 }}>{a.batch_id?.slice(0, 8)}</td>
              <td style={{ padding: 6 }}>{new Date(a.created_at).toLocaleString()}</td>
              <td style={{ padding: 6, textAlign: 'right' }}>
                {a.status === 'proposed' && (
                  <>
                    <button disabled={pendingActionId === a.id} onClick={() => approve(a.id)} style={{ marginRight: 4, background: '#3c7', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 3, cursor: 'pointer' }}>Approve</button>
                    <button disabled={pendingActionId === a.id} onClick={() => reject(a.id)} style={{ background: '#a55', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 3, cursor: 'pointer' }}>Reject</button>
                  </>
                )}
                {a.status === 'applied' && (
                  <button onClick={() => rollback(a.batch_id)} style={{ background: '#c80', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 3, cursor: 'pointer' }}>Rollback batch</button>
                )}
                <span style={{ marginLeft: 8, color: STATUS_COLORS[a.status], fontWeight: 600, textTransform: 'uppercase', fontSize: 10 }}>{a.status}</span>
              </td>
            </tr>
          ))}
          {actions.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 12, color: '#888', textAlign: 'center' }}>no actions in this state</td></tr>
          )}
        </tbody>
      </table>

      {metrics?.by_day?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, color: '#666' }}>Daily breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ textAlign: 'left', padding: 4 }}>Day</th>
                <th style={{ textAlign: 'left', padding: 4 }}>Agent</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Proposed</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Applied</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Reverted</th>
                <th style={{ textAlign: 'right', padding: 4 }}>Latency p95</th>
              </tr>
            </thead>
            <tbody>
              {metrics.by_day.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 4 }}>{r.day}</td>
                  <td style={{ padding: 4 }}>{r.agent}</td>
                  <td style={{ padding: 4, textAlign: 'right' }}>{r.proposed}</td>
                  <td style={{ padding: 4, textAlign: 'right' }}>{r.applied}</td>
                  <td style={{ padding: 4, textAlign: 'right' }}>{r.reverted}</td>
                  <td style={{ padding: 4, textAlign: 'right' }}>{r.latency_ms_p95 ?? '—'} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
