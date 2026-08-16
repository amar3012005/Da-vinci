// Mobile Projects — fixed to use the same V2 team-scoped API desktop's
// TeamProjects.jsx actually uses (listTeamProjects/createTeamProject/
// archiveProjectV2 under /v1/teams/:id/projects). The old org-level
// /v1/orgs/:id/projects endpoint this page called before no longer exists
// on the backend (only /v1/teams/:id/projects is registered), so every
// load 404'd and the page always showed empty — the actual "fix" here.
// Needs <TeamProvider> in the route tree (HiveMindApp.jsx) — without it
// useTeamContext() falls back to activeTeamId: null and the page reads as
// "no team selected" forever.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Folder, Loader2, Plus, Search, Shield, Trash2, X } from 'lucide-react';
import apiClient from '../../shared/api-client';
import { useTeamContext } from '../../shared/team-context';
import MobileShell from '../MobileShell';

const POLICY_LABEL = { team_inherited: 'Team Access', org_visible: 'Org Visible', private: 'Private' };
const POLICY_COLOR = { team_inherited: 'text-emerald-600', org_visible: 'text-blue-600', private: 'text-amber-600' };

export default function MobileProjects() {
  const { activeTeam, activeTeamId, refresh: refreshTeams } = useTeamContext();
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPolicy, setNewPolicy] = useState('private');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeTeamId) return;
    setLoading(true); setError('');
    try {
      const data = await apiClient.listTeamProjects(activeTeamId);
      setProjects(data?.projects || []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not load projects.');
    } finally { setLoading(false); }
  }, [activeTeamId]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? projects.filter((p) => (p.name || '').toLowerCase().includes(q)) : projects;
  }, [projects, query]);

  const create = async () => {
    const name = newName.trim();
    const description = newDescription.trim();
    if (!name || !description || !activeTeamId) return;
    setSaving(true);
    try {
      await apiClient.createTeamProject(activeTeamId, { name, description, policy: newPolicy, teamId: activeTeamId });
      setNewName(''); setNewDescription(''); setNewPolicy('private'); setCreating(false);
      await load();
      await refreshTeams();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not create project.');
    } finally { setSaving(false); }
  };

  const archive = async (projectId, e) => {
    e.stopPropagation();
    // eslint-disable-next-line no-alert
    if (!window.confirm('Archive this project? Memories stay; project becomes read-only.')) return;
    setError('');
    try {
      await apiClient.archiveProjectV2(projectId);
      if (selected?.id === projectId) setSelected(null);
      await load();
      await refreshTeams();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not archive project.');
    }
  };

  if (!activeTeamId) {
    return (
      <MobileShell title="Projects">
        <div className="px-6 pt-10 text-center">
          <Folder size={28} className="text-[#cbd5e1] mx-auto mb-3" />
          <h2 className="text-[15px] font-semibold text-[#0a0a0a] mb-1">No team selected</h2>
          <p className="text-[12.5px] text-[#a3a3a3]">Pick a team from the desktop app's top-bar switcher first.</p>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Projects">
      <div className="px-6 pt-1 pb-28">
        <h1 className="text-[34px] leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Projects</h1>
        <p className="mt-1 text-[12.5px] text-[#a3a3a3]">{activeTeam?.name || 'Active team'} — {projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>

        <div className="mt-4 flex items-center gap-2 h-11 px-4 rounded-full border border-[#dcd8d0] focus-within:border-[#b6b1a7]">
          <Search size={17} className="text-[#a3a3a3]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[#a8a49c]" />
          {query && <button onClick={() => setQuery('')} className="text-[#a3a3a3]"><X size={16} /></button>}
        </div>

        <div className="mt-4">
          {loading && <div className="py-12 text-center text-[13px] text-[#737373]">Loading…</div>}
          {error && <div className="py-3 text-[13px] text-red-700">{error}</div>}
          {!loading && !error && filtered.length === 0 && <div className="py-16 text-center text-[13px] text-[#737373]">No projects yet.</div>}
          {filtered.map((p, i) => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`w-full text-left py-3.5 flex items-start gap-3 active:opacity-60 ${i ? 'border-t border-[#eceae3]' : ''}`}>
              <Folder size={18} className="text-[#117dff] flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-[16px] leading-tight truncate">{p.name}</div>
                {p.description && <div className="text-[12px] text-[#8b857d] mt-0.5 line-clamp-2">{p.description}</div>}
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  <Shield size={11} className={POLICY_COLOR[p.policy] || 'text-amber-600'} />
                  <span className={POLICY_COLOR[p.policy] || 'text-amber-600'}>{POLICY_LABEL[p.policy] || 'Private'}</span>
                </div>
              </div>
              <button onClick={(e) => archive(p.id, e)} className="text-[#a3a3a3] p-1 flex-shrink-0" aria-label="Archive project">
                <Trash2 size={15} />
              </button>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setCreating(true)}
        className="fixed right-5 flex items-center gap-2 h-12 px-5 rounded-full bg-[#1a1a17] text-white text-[14px] font-medium shadow-lg active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        <Plus size={18} /> New project
      </button>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end" onClick={() => setSelected(null)}>
          <div className="w-full max-h-[75vh] overflow-y-auto bg-white rounded-t-[28px] p-5" onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <div className="w-10 h-1 rounded-full bg-[#d4d0ca] mx-auto mb-4" />
            <div className="flex items-start gap-3">
              <Folder size={20} className="text-[#117dff] flex-shrink-0 mt-1" />
              <div className="min-w-0 flex-1">
                <div className="text-[22px] leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{selected.name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  <Shield size={11} className={POLICY_COLOR[selected.policy] || 'text-amber-600'} />
                  <span className={POLICY_COLOR[selected.policy] || 'text-amber-600'}>{POLICY_LABEL[selected.policy] || 'Private'}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full grid place-items-center bg-[#f3f1ec] flex-shrink-0"><X size={16} /></button>
            </div>
            {selected.description
              ? <p className="mt-3 text-[14px] leading-relaxed text-[#3d3d3a]">{selected.description}</p>
              : <p className="mt-3 text-[13px] text-[#a8a49c]">No description.</p>}
            <button
              onClick={(e) => archive(selected.id, e)}
              className="mt-4 w-full h-11 rounded-full border border-red-200 text-red-600 text-[13.5px] font-medium flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> Archive project
            </button>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end" onClick={() => !saving && setCreating(false)}>
          <div className="w-full bg-white rounded-t-[28px] p-5" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <div className="w-10 h-1 rounded-full bg-[#d4d0ca] mx-auto mb-4" />
            <div className="text-[19px] leading-tight mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>New project</div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="w-full h-12 px-4 rounded-full border border-[#dcd8d0] outline-none text-[15px] focus:border-[#b6b1a7]"
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description"
              rows={3}
              className="mt-3 w-full px-4 py-3 rounded-[16px] border border-[#dcd8d0] outline-none text-[14px] resize-none focus:border-[#b6b1a7]"
            />
            <div className="mt-3 flex gap-2">
              {['private', 'team_inherited', 'org_visible'].map((pol) => (
                <button
                  key={pol}
                  onClick={() => setNewPolicy(pol)}
                  className={`flex-1 h-10 rounded-full text-[12px] font-medium border ${newPolicy === pol ? 'bg-[#1a1a17] text-white border-[#1a1a17]' : 'border-[#dcd8d0] text-[#525252]'}`}
                >
                  {POLICY_LABEL[pol]}
                </button>
              ))}
            </div>
            <button
              onClick={create}
              disabled={!newName.trim() || !newDescription.trim() || saving}
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
