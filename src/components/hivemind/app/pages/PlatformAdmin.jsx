import React, { useEffect, useState } from 'react';
import apiClient from '../shared/api-client';

const when = (value) => value ? new Date(value).toLocaleString() : 'Never';

export default function PlatformAdmin() {
  const [passkey, setPasskey] = useState('');
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [users, logData] = await Promise.all([apiClient.listPlatformUsers(), apiClient.listPlatformLogs()]);
      setData(users); setLogs(logData.logs || []);
    } catch (err) { setError(err.response?.data?.error || err.message); } finally { setLoading(false); }
  };
  useEffect(() => {
    if (!data) return undefined;
    const timer = setInterval(() => apiClient.listPlatformLogs().then((next) => setLogs(next.logs || [])).catch(() => {}), 2000);
    return () => clearInterval(timer);
  }, [data]);
  const unlock = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    try { await apiClient.unlockPlatformAdmin(passkey); setPasskey(''); await load(); } catch (err) { setError(err.response?.data?.error || err.message); setLoading(false); }
  };
  if (!data) return <main className="max-w-md mx-auto py-20 px-5"><h1 className="text-2xl font-bold mb-2">Platform Admin</h1><p className="text-sm text-[#737373] mb-6">Break-glass diagnostics. Access expires after 15 minutes.</p><form onSubmit={unlock} className="space-y-3"><input autoFocus type="password" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder="Admin passkey" className="w-full border rounded-lg px-3 py-2"/><button disabled={loading} className="w-full rounded-lg bg-[#117dff] text-white py-2">{loading ? 'Unlocking...' : 'Unlock'}</button>{error && <p className="text-sm text-red-600">{error}</p>}</form></main>;
  const s = data.summary || {};
  return <main className="max-w-6xl mx-auto py-10 px-5"><div className="flex justify-between items-center mb-6"><div><h1 className="text-2xl font-bold">Platform Admin</h1><p className="text-sm text-[#737373]">{data.total} users · active within 30 days</p></div><button onClick={load} className="border rounded-lg px-3 py-2 text-sm">Refresh</button></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">{[['B2B',s.b2b],['B2C',s.b2c],['Active',s.active],['Sleeping',s.sleeping]].map(([label,value]) => <div key={label} className="border rounded-xl p-4 bg-white"><p className="text-xs text-[#737373]">{label}</p><p className="text-2xl font-bold">{value || 0}</p></div>)}</div><div className="border rounded-xl overflow-auto bg-white"><table className="w-full text-sm"><thead><tr className="text-left bg-[#faf9f4]"><th className="p-3">User</th><th>Tier</th><th>Organizations</th><th>Last seen</th><th>Status</th></tr></thead><tbody>{data.users.map((user) => <tr key={user.id} className="border-t"><td className="p-3"><div>{user.displayName || 'Unnamed'}</div><div className="text-xs text-[#737373]">{user.email}</div></td><td>{user.tier.toUpperCase()}</td><td>{user.organization_count}</td><td>{when(user.lastActiveAt)}</td><td>{user.active ? 'Active' : 'Sleeping'}</td></tr>)}</tbody></table></div><section className="mt-6 border rounded-xl bg-[#111827] overflow-hidden"><div className="px-4 py-3 text-sm text-white flex justify-between"><span>Live control-plane logs</span><span className="text-[#a7f3d0]">Polling every 2s</span></div><pre className="max-h-96 overflow-auto p-4 text-xs leading-5 text-[#d1fae5] whitespace-pre-wrap">{logs.length ? logs.join('\n') : 'Waiting for logs...'}</pre></section></main>;
}
