import React, { useEffect, useMemo, useState } from 'react';
import { Folder, Search, Plus, X, Loader2 } from 'lucide-react';
import apiClient from '../../shared/api-client';
import { useAuth } from '../../auth/AuthProvider';
import MobileShell from '../MobileShell';

function editedLabel(p) {
  const iso = p?.updatedAt || p?.updated_at || p?.createdAt || p?.created_at;
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `Edited ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } catch { return ''; }
}

export default function MobileProjects() {
  const { org } = useAuth() || {};
  const orgId = org?.id;
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!orgId) return;
    setLoading(true); setError('');
    try {
      const data = await apiClient.listProjects(orgId);
      setProjects(data?.projects || data || []);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Could not load projects.');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? projects.filter((p) => (p.name || '').toLowerCase().includes(q)) : projects;
  }, [projects, query]);

  const create = async () => {
    const name = newName.trim();
    if (!name || !orgId) return;
    setSaving(true);
    try {
      await apiClient.createProject(orgId, { name });
      setNewName(''); setCreating(false);
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Could not create project.');
    } finally { setSaving(false); }
  };

  return (
    <MobileShell>
      <div className="px-6 pt-1 pb-28">
        <h1 className="text-[34px] leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Projects</h1>

        <div className="mt-4 flex items-center gap-2 h-11 px-4 rounded-full border border-[#dcd8d0] focus-within:border-[#b6b1a7]">
          <Search size={17} className="text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[#a8a49c]" />
          {query && <button onClick={() => setQuery('')} className="text-[#a3a3a3]"><X size={16} /></button>}
        </div>

        <div className="mt-4">
          {loading && <div className="py-12 text-center text-[13px] text-[#737373]">Loading…</div>}
          {error && <div className="py-3 text-[13px] text-red-700">{error}</div>}
          {!loading && !error && filtered.length === 0 && <div className="py-16 text-center text-[13px] text-[#737373]">No projects yet.</div>}
          {filtered.map((p) => (
            <button key={p.id} className="w-full text-left py-3.5 flex items-center gap-3 active:opacity-60">
              {/* Same folder element as the desktop projects UI */}
              <Folder size={18} className="text-[#117dff] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[16px] leading-tight truncate">{p.name}</div>
                {editedLabel(p) && <div className="text-[12px] text-[#a8a49c] mt-0.5">{editedLabel(p)}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Black pill FAB */}
      <button
        onClick={() => setCreating(true)}
        className="fixed right-5 flex items-center gap-2 h-12 px-5 rounded-full bg-[#1a1a17] text-white text-[14px] font-medium shadow-lg active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        <Plus size={18} /> New project
      </button>

      {/* Create sheet */}
      {creating && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end" onClick={() => !saving && setCreating(false)}>
          <div className="w-full bg-white rounded-t-[28px] p-5" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <div className="w-10 h-1 rounded-full bg-[#d4d0ca] mx-auto mb-4" />
            <div className="text-[19px] leading-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>New project</div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
              placeholder="Project name"
              className="w-full h-12 px-4 rounded-full border border-[#dcd8d0] outline-none text-[15px] focus:border-[#b6b1a7]"
            />
            <button
              onClick={create}
              disabled={!newName.trim() || saving}
              className="mt-4 w-full h-12 rounded-full bg-[#1a1a17] text-white text-[15px] font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />} Create project
            </button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
