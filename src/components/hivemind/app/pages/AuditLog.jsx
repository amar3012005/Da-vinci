import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';
import apiClient from '../shared/api-client';

const ACTION_COLORS = {
  create: 'text-[#16a34a] bg-emerald-500/10 border-emerald-500/20',
  update: 'text-[#117dff] bg-blue-500/10 border-blue-500/20',
  delete: 'text-[#dc2626] bg-red-500/10 border-red-500/20',
  read: 'text-[#525252] bg-[#f3f1ec] border-[#e3e0db]',
  export: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
};

function ActionBadge({ action }) {
  const cls = ACTION_COLORS[action] || ACTION_COLORS.read;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {action}
    </span>
  );
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    category: '',
    from: '',
    to: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      params.set('limit', '100');
      const { data } = await apiClient.controlPlane.get(`/v1/audit/logs?${params}`);
      setLogs(data.logs || data.rows || []);
      setTotal(data.total || data.rows?.length || 0);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function exportCsv() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const base = apiClient.controlPlane.defaults.baseURL;
    window.open(`${base}/v1/audit/export.csv?${params}`, '_blank');
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
            Audit Log
          </h1>
          <p className="text-[12px] text-[#a3a3a3] mt-1">
            Immutable trail of every mutating action. SOC2 + GDPR ready.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#f3f1ec] border border-[#e3e0db] text-[12px] hover:bg-[#eae7e1]"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-5 gap-2 p-3 bg-white border border-[#e3e0db] rounded-[8px]">
        <input
          placeholder="user_id"
          value={filters.user_id}
          onChange={e => setFilters({ ...filters, user_id: e.target.value })}
          className="h-8 px-2 text-[12px] border border-[#e3e0db] rounded-[4px]"
        />
        <select
          value={filters.action}
          onChange={e => setFilters({ ...filters, action: e.target.value })}
          className="h-8 px-2 text-[12px] border border-[#e3e0db] rounded-[4px]"
        >
          <option value="">All actions</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="delete">delete</option>
          <option value="read">read</option>
          <option value="export">export</option>
        </select>
        <select
          value={filters.category}
          onChange={e => setFilters({ ...filters, category: e.target.value })}
          className="h-8 px-2 text-[12px] border border-[#e3e0db] rounded-[4px]"
        >
          <option value="">All categories</option>
          <option value="memory">memory</option>
          <option value="team">team</option>
          <option value="project">project</option>
          <option value="connector">connector</option>
          <option value="compliance">compliance</option>
          <option value="auth">auth</option>
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={e => setFilters({ ...filters, from: e.target.value })}
          className="h-8 px-2 text-[12px] border border-[#e3e0db] rounded-[4px]"
        />
        <input
          type="date"
          value={filters.to}
          onChange={e => setFilters({ ...filters, to: e.target.value })}
          className="h-8 px-2 text-[12px] border border-[#e3e0db] rounded-[4px]"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[8px] text-[12px] text-[#dc2626]">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="text-[11px] text-[#a3a3a3]">
        {total} {total === 1 ? 'event' : 'events'}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e3e0db] rounded-[8px] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-[#faf9f4] border-b border-[#e3e0db]">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">When</th>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">Actor</th>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">Event</th>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">Action</th>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">Resource</th>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#a3a3a3]">
                  No events yet
                </td>
              </tr>
            )}
            {logs.map(l => (
              <tr key={l.id} className="border-b border-[#eae7e1] hover:bg-[#faf9f4]">
                <td className="px-3 py-2 font-mono text-[10px] text-[#525252]">
                  {l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-[#a3a3a3]">
                  {l.userId ? l.userId.slice(0, 8) : l.actorType || 'system'}
                </td>
                <td className="px-3 py-2">
                  <span className="text-[#0a0a0a] font-medium">{l.eventType}</span>
                  {l.eventCategory && <span className="text-[#a3a3a3] ml-1">/{l.eventCategory}</span>}
                </td>
                <td className="px-3 py-2"><ActionBadge action={l.action} /></td>
                <td className="px-3 py-2 font-mono text-[10px]">
                  {l.resourceType}{l.resourceId ? ` · ${l.resourceId.slice(0, 8)}` : ''}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-[#a3a3a3]">
                  {l.ipAddress || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
