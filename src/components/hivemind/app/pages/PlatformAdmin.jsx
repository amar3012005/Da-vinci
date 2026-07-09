import React, { useEffect, useState } from 'react';
import apiClient from '../shared/api-client';

const when = (value) => value ? new Date(value).toLocaleString() : 'Never';
const emptyLogs = { mixed: [], core: [], control: [] };

export default function PlatformAdmin() {
  const [passkey, setPasskey] = useState('');
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState(emptyLogs);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logView, setLogView] = useState('mixed');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [users, logData] = await Promise.all([apiClient.listPlatformUsers(), apiClient.listPlatformLogs()]);
      setData(users); setLogs(logData.logs || emptyLogs);
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
  return <main className="max-w-6xl mx-auto py-10 px-5"><div className="flex justify-between items-center mb-6"><div><h1 className="text-2xl font-bold">Platform Admin</h1><p className="text-sm text-[#737373]">{data.total} users · active within 30 days</p></div><div className="flex gap-2"><button onClick={() => setLogsOpen(true)} className="rounded-lg bg-[#111827] text-white px-3 py-2 text-sm">Live logs</button><button onClick={load} className="border rounded-lg px-3 py-2 text-sm">Refresh</button></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">{[['B2B',s.b2b],['B2C',s.b2c],['Active',s.active],['Sleeping',s.sleeping]].map(([label,value]) => <div key={label} className="border rounded-xl p-4 bg-white"><p className="text-xs text-[#737373]">{label}</p><p className="text-2xl font-bold">{value || 0}</p></div>)}</div><div className="border rounded-xl overflow-auto bg-white"><table className="w-full text-sm"><thead><tr className="text-left bg-[#faf9f4]"><th className="p-3">User</th><th>Tier</th><th>Organizations</th><th>Last seen</th><th>Status</th></tr></thead><tbody>{data.users.map((user) => <tr key={user.id} className="border-t"><td className="p-3"><div>{user.displayName || 'Unnamed'}</div><div className="text-xs text-[#737373]">{user.email}</div></td><td>{user.tier.toUpperCase()}</td><td>{user.organization_count}</td><td>{when(user.lastActiveAt)}</td><td>{user.active ? 'Active' : 'Sleeping'}</td></tr>)}</tbody></table></div>{logsOpen && <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center"><section className="w-full max-w-6xl h-[80vh] rounded-xl overflow-hidden bg-[#111827] shadow-2xl flex flex-col"><header className="p-4 flex items-center justify-between text-white border-b border-white/15"><div><h2 className="font-semibold">Live system logs</h2><p className="text-xs text-[#a7f3d0]">Updates every 2 seconds</p></div><button onClick={() => setLogsOpen(false)} className="text-sm px-3 py-1 border border-white/30 rounded">Close</button></header><nav className="p-3 flex gap-2 border-b border-white/15">{[['mixed','Mixed'],['core','Core'],['control','Control plane']].map(([id,label]) => <button key={id} onClick={() => setLogView(id)} className={`px-3 py-1 rounded text-sm ${logView === id ? 'bg-[#117dff] text-white' : 'bg-white/10 text-white'}`}>{label} ({(logs[id] || []).length})</button>)}</nav><pre className="flex-1 overflow-auto p-4 text-xs leading-5 text-[#d1fae5] whitespace-pre-wrap">{activeLogs.length ? activeLogs.join('\n') : 'Waiting for logs...'}</pre></section></div>}</main>;
}
