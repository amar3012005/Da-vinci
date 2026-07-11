import React, { useEffect, useState } from 'react';
import apiClient from '../shared/api-client';

const when = (value) => value ? new Date(value).toLocaleString() : 'Never';
const emptyLogs = { mixed: [], core: [], control: [] };
const stateColor = (state) => state === 'critical' ? 'text-red-700 bg-red-50 border-red-200' : state === 'warning' ? 'text-amber-700 bg-amber-50 border-amber-200' : state === 'healthy' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#525252] bg-[#f5f4f0] border-[#e3e0db]';
const mib = (value) => Number.isFinite(value) ? `${value.toLocaleString()} MiB` : 'Unavailable';
const seconds = (value) => value ? `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m` : 'Unavailable';

const SECURITY_CONTROLS = [
  ['verified', 'Identity and access', 'Session-bound organization selection; privileged HyperAgents and TARA access checks.'],
  ['verified', 'Tenant boundaries', 'Engine and BYOD queries are organization-scoped.'],
  ['verified', 'Central integrity', 'PQC memory and audit signing keys are configured in the central engine.'],
  ['verified', 'BYOD request containment', 'Agent/broker body limits, rate limits, registry permissions, and container limits are committed.'],
  ['in_progress', 'BYOD transport PQC', 'External Box transport and local PQC envelope signing still require rollout.'],
  ['in_progress', 'Cost controls', 'Validate each feature’s quota check and post-success meter as one pair.'],
  ['in_progress', 'Backup and restore', 'Local encrypted PostgreSQL/Qdrant jobs and a PostgreSQL restore drill are verified; off-host replication remains open.'],
  ['open', 'Host capacity', 'Disk is at 85%; retire canaries only after route, rollback, and volume verification.'],
  ['in_progress', 'Secrets rotation', 'Master key rotation is verified; Stripe webhook, BYOD agent token, and PQC key rotation drills remain.'],
  ['open', 'Audit coverage', 'Prove enrollment, rotation, deletion, auth, and admin operations are append-only and redacted.'],
];

function SecurityChecklist() {
  const labels = { verified: 'Verified', in_progress: 'In progress', open: 'Open' };
  const colors = { verified: 'bg-emerald-50 text-emerald-700 border-emerald-200', in_progress: 'bg-amber-50 text-amber-700 border-amber-200', open: 'bg-red-50 text-red-700 border-red-200' };
  return <section className="mb-6 rounded-2xl border border-[#dfddd5] bg-white p-5">
    <div className="mb-4"><h2 className="font-semibold text-[#161616]">Security hardening checklist</h2><p className="text-xs text-[#737373]">Execution ledger. Status reflects verified evidence, not a compliance certification.</p></div>
    <div className="grid gap-3 md:grid-cols-2">
      {SECURITY_CONTROLS.map(([state, title, detail]) => <div key={title} className="flex gap-3 rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3">
        <span className={`mt-0.5 h-5 min-w-5 rounded-full border text-center text-[11px] leading-[18px] font-bold ${colors[state]}`}>{state === 'verified' ? '✓' : '!'}</span>
        <div className="min-w-0"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-[#161616]">{title}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors[state]}`}>{labels[state]}</span></div><p className="mt-1 text-xs leading-5 text-[#525252]">{detail}</p></div>
      </div>)}
    </div>
  </section>;
}

function CapacityPanel({ metrics }) {
  if (!metrics) return null;
  const disk = metrics.filesystem || {};
  const database = metrics.postgres || {};
  const core = metrics.core || {};
  return <section className="mb-6 rounded-2xl border border-[#dfddd5] bg-[#f8f7f3] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4"><div><h2 className="font-semibold text-[#161616]">Capacity and scale signals</h2><p className="text-xs text-[#737373]">Observed {when(metrics.observed_at)}. Storage alerts at 70%; critical at 85%.</p></div><span className={`border rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${stateColor(disk.state)}`}>{disk.state || 'unknown'} storage</span></div>
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-xl border border-[#e3e0db] bg-white p-4"><p className="text-xs text-[#737373]">Runtime disk</p><p className="mt-1 text-2xl font-semibold text-[#161616]">{Number.isFinite(disk.used_percent) ? `${disk.used_percent}%` : 'Unavailable'}</p><p className="mt-1 text-xs text-[#525252]">{mib(disk.used_mib)} used of {mib(disk.total_mib)}</p><p className="mt-2 text-[11px] text-[#737373]">{disk.source || disk.error || 'No capacity source'}</p></div>
      <div className="rounded-xl border border-[#e3e0db] bg-white p-4"><p className="text-xs text-[#737373]">PostgreSQL footprint</p><p className="mt-1 text-2xl font-semibold text-[#161616]">{mib(database.database_mib)}</p><p className="mt-1 text-xs text-[#525252]">Current database size</p><p className="mt-2 text-[11px] text-[#737373]">Track this against your backup and volume plan.</p></div>
      <div className="rounded-xl border border-[#e3e0db] bg-white p-4"><p className="text-xs text-[#737373]">Core runtime</p><p className="mt-1 text-2xl font-semibold text-[#161616]">{mib(core.rss_mib)} RSS</p><p className="mt-1 text-xs text-[#525252]">Heap {mib(core.heap_used_mib)} · up {seconds(core.uptime_seconds)}</p><p className="mt-2 text-[11px] text-[#737373]">Load avg 1m: {metrics.load_average?.one_minute ?? 'Unavailable'}</p></div>
    </div>
    <div className="mt-4 border-t border-[#e3e0db] pt-3 text-sm text-[#313131]">{(metrics.recommendations || []).map((item) => <p key={item}>{item}</p>)}</div>
  </section>;
}

export default function PlatformAdmin() {
  const [passkey, setPasskey] = useState('');
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState(emptyLogs);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logView, setLogView] = useState('mixed');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [users, logData, nextMetrics] = await Promise.all([apiClient.listPlatformUsers(), apiClient.listPlatformLogs(), apiClient.getPlatformMetrics()]);
      setData(users); setLogs(logData.logs || emptyLogs); setMetrics(nextMetrics);
    } catch (err) { setError(err.response?.data?.error || err.message); } finally { setLoading(false); }
  };

  const unlock = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try { await apiClient.unlockPlatformAdmin(passkey); setPasskey(''); await load(); } catch (err) { setError(err.response?.data?.error || err.message); setLoading(false); }
  };

  useEffect(() => {
    if (!data || !logsOpen) return undefined;
    const timer = setInterval(() => apiClient.listPlatformLogs().then((next) => setLogs(next.logs || emptyLogs)).catch(() => {}), 2000);
    return () => clearInterval(timer);
  }, [data, logsOpen]);

  if (!data) return <main className="max-w-md mx-auto py-20 px-5"><h1 className="text-2xl font-bold mb-2">Platform Admin</h1><p className="text-sm text-[#737373] mb-6">Break-glass diagnostics. Access expires after 15 minutes.</p><form onSubmit={unlock} className="space-y-3"><input autoFocus type="password" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder="Admin passkey" className="w-full border rounded-lg px-3 py-2"/><button disabled={loading} className="w-full rounded-lg bg-[#117dff] text-white py-2">{loading ? 'Unlocking...' : 'Unlock'}</button>{error && <p className="text-sm text-red-600">{error}</p>}</form></main>;

  const s = data.summary || {};
  const activeLogs = logs[logView] || [];
  return <main className="max-w-7xl mx-auto py-10 px-5"><div className="flex justify-between items-center mb-6"><div><h1 className="text-2xl font-bold">Platform Admin</h1><p className="text-sm text-[#737373]">{data.total} users · active within 30 days</p></div><div className="flex gap-2"><button onClick={() => setLogsOpen(true)} className="rounded-lg bg-[#111827] text-white px-3 py-2 text-sm">Live logs</button><button onClick={load} className="border rounded-lg px-3 py-2 text-sm">Refresh</button></div></div><SecurityChecklist/><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">{[['B2B',s.b2b],['B2C',s.b2c],['Active',s.active],['Sleeping',s.sleeping]].map(([label,value]) => <div key={label} className="border rounded-xl p-4 bg-white"><p className="text-xs text-[#737373]">{label}</p><p className="text-2xl font-bold">{value || 0}</p></div>)}</div><CapacityPanel metrics={metrics}/><div className="border rounded-xl overflow-auto bg-white"><table className="w-full text-sm"><thead><tr className="text-left bg-[#faf9f4]"><th className="p-3">User</th><th>Type</th><th>Memory plane</th><th>Memories</th><th>Organizations</th><th>Last seen</th><th>Status</th></tr></thead><tbody>{data.users.map((user) => <tr key={user.id} className="border-t align-top"><td className="p-3"><div>{user.displayName || 'Unnamed'}</div><div className="text-xs text-[#737373]">{user.email}</div></td><td className="capitalize">{user.user_type || user.tier}</td><td><div>{user.filesystem || 'hybrid'}</div><div className="text-xs text-[#737373]">{(user.memory_storage_modes || []).join(', ')}</div></td><td>{user.memory_count == null ? 'Unavailable' : user.memory_count}</td><td>{user.organization_count}</td><td>{when(user.lastActiveAt)}</td><td>{user.active ? 'Active' : 'Sleeping'}</td></tr>)}</tbody></table></div>{logsOpen && <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center"><section className="w-full max-w-6xl h-[80vh] rounded-xl overflow-hidden bg-[#111827] shadow-2xl flex flex-col"><header className="p-4 flex items-center justify-between text-white border-b border-white/15"><div><h2 className="font-semibold">Live system logs</h2><p className="text-xs text-[#a7f3d0]">Updates every 2 seconds</p></div><button onClick={() => setLogsOpen(false)} className="text-sm px-3 py-1 border border-white/30 rounded">Close</button></header><nav className="p-3 flex gap-2 border-b border-white/15">{[['mixed','Mixed'],['core','Core'],['control','Control plane']].map(([id,label]) => <button key={id} onClick={() => setLogView(id)} className={`px-3 py-1 rounded text-sm ${logView === id ? 'bg-[#117dff] text-white' : 'bg-white/10 text-white'}`}>{label} ({(logs[id] || []).length})</button>)}</nav><pre className="flex-1 overflow-auto p-4 text-xs leading-5 text-[#d1fae5] whitespace-pre-wrap">{activeLogs.length ? activeLogs.join('\n') : 'Waiting for logs...'}</pre></section></div>}</main>;
}
