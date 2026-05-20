import React, { useState, useEffect, useCallback } from 'react';
import { FolderKanban, Plus, RefreshCw, Trash2, AlertCircle, Folder, Shield, Users } from 'lucide-react';
import { useTeamContext } from '../shared/team-context';
import apiClient from '../shared/api-client';

/**
 * TeamProjects — manage projects under the currently-active team.
 * Uses P0-1 endpoints under /v1/teams/:id/projects and /v1/projects/:id.
 */
export default function TeamProjects() {
  const { activeTeam, activeTeamId, refresh: refreshTeams } = useTeamContext();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPolicy, setNewPolicy] = useState('private');

  const fetchProjects = useCallback(async () => {
    if (!activeTeamId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.listTeamProjects(activeTeamId);
      setProjects(resp.projects || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTeamId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  async function handleCreate() {
    if (!newName.trim() || !activeTeamId) return;
    setError(null);
    try {
      await apiClient.createTeamProject(activeTeamId, {
        name: newName.trim(),
        description: newDescription.trim() || null,
        policy: newPolicy,
        teamId: activeTeamId,
      });
      setCreateOpen(false);
      setNewName('');
      setNewDescription('');
      setNewPolicy('private');
      await fetchProjects();
      await refreshTeams();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handleArchive(projectId) {
    if (!window.confirm('Archive this project? Memories stay; project becomes read-only.')) return;
    setError(null);
    try {
      await apiClient.archiveProjectV2(projectId);
      await fetchProjects();
      await refreshTeams();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  if (!activeTeamId) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white border border-[#e3e0db] rounded-[8px] text-center">
        <FolderKanban size={32} className="text-[#a3a3a3] mx-auto mb-3" />
        <h2 className="text-[#0a0a0a] font-semibold mb-1">No team selected</h2>
        <p className="text-[12px] text-[#a3a3a3]">Pick a team from the top-bar switcher.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
            Projects
          </h1>
          <p className="text-[12px] text-[#a3a3a3] mt-1">
            {activeTeam?.name || 'Active team'} — {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchProjects}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#f3f1ec] border border-[#e3e0db] text-[12px] hover:bg-[#eae7e1]"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]"
          >
            <Plus size={13} />
            New Project
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[8px] text-[12px] text-[#dc2626]">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.length === 0 && !loading && (
          <div className="col-span-full text-center py-8 text-[#a3a3a3] bg-white border border-[#e3e0db] rounded-[8px]">
            No projects yet — click "New Project" to create one.
          </div>
        )}
        {projects.map(p => {
          const policyLabel = 
            p.policy === 'team_inherited' ? 'Team Access' :
            p.policy === 'org_visible' ? 'Org Visible' : 'Private';
          const policyColor = 
            p.policy === 'team_inherited' ? 'text-emerald-600' :
            p.policy === 'org_visible' ? 'text-blue-600' : 'text-amber-600';
          
          return (
          <div key={p.id} className="bg-white border border-[#e3e0db] rounded-[8px] p-4 hover:border-[#d4d0ca] transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-[#117dff]" />
                <h3 className="text-[14px] font-semibold text-[#0a0a0a]">{p.name}</h3>
              </div>
              <button
                onClick={() => handleArchive(p.id)}
                className="text-[#a3a3a3] hover:text-[#dc2626] transition-colors"
                title="Archive"
              >
                <Trash2 size={13} />
              </button>
            </div>
            {p.description && (
              <p className="text-[12px] text-[#525252] mb-3 line-clamp-2">{p.description}</p>
            )}
            <div className="flex items-center gap-2 mb-3">
              <Shield size={11} className={policyColor} />
              <span className={`text-[10px] font-medium ${policyColor}`}>{policyLabel}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#a3a3a3] font-mono">
              <span className="flex items-center gap-1">
                <Users size={10} /> {p._count?.members ?? 0} members
              </span>
              <span>{p._count?.memories ?? 0} memories</span>
            </div>
            <div className="text-[10px] text-[#a3a3a3] mt-1">
              Created {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
            </div>
          </div>
        )})}
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setCreateOpen(false)}>
          <div className="bg-white rounded-[8px] p-5 w-[480px] shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold mb-3">New Project in {activeTeam?.name}</h2>
            
            <label className="block text-[11px] text-[#525252] mb-1">Name</label>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Q1 OKRs"
              className="w-full h-9 px-2 text-[13px] border border-[#e3e0db] rounded-[4px] mb-3"
            />
            
            <label className="block text-[11px] text-[#525252] mb-1">Description (optional)</label>
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              rows={3}
              className="w-full px-2 py-1.5 text-[13px] border border-[#e3e0db] rounded-[4px] mb-3 resize-y"
            />
            
            <label className="block text-[11px] font-medium text-[#525252] mb-2">Access Policy</label>
            <div className="space-y-2 mb-4">
              <label className="flex items-start gap-2 cursor-pointer p-2 border border-[#e3e0db] rounded-[6px] hover:bg-[#faf9f4] transition-colors">
                <input
                  type="radio"
                  name="policy"
                  value="private"
                  checked={newPolicy === 'private'}
                  onChange={e => setNewPolicy(e.target.value)}
                  className="mt-0.5 accent-[#117dff]"
                />
                <div>
                  <div className="text-[12px] font-medium text-[#0a0a0a]">Private</div>
                  <div className="text-[10px] text-[#737373]">Only creator + explicitly added members</div>
                </div>
              </label>
              
              <label className="flex items-start gap-2 cursor-pointer p-2 border border-[#e3e0db] rounded-[6px] hover:bg-[#faf9f4] transition-colors">
                <input
                  type="radio"
                  name="policy"
                  value="team_inherited"
                  checked={newPolicy === 'team_inherited'}
                  onChange={e => setNewPolicy(e.target.value)}
                  className="mt-0.5 accent-[#117dff]"
                />
                <div>
                  <div className="text-[12px] font-medium text-[#0a0a0a]">Team Access</div>
                  <div className="text-[10px] text-[#737373]">All team members automatically granted access</div>
                </div>
              </label>
              
              <label className="flex items-start gap-2 cursor-pointer p-2 border border-[#e3e0db] rounded-[6px] hover:bg-[#faf9f4] transition-colors">
                <input
                  type="radio"
                  name="policy"
                  value="org_visible"
                  checked={newPolicy === 'org_visible'}
                  onChange={e => setNewPolicy(e.target.value)}
                  className="mt-0.5 accent-[#117dff]"
                />
                <div>
                  <div className="text-[12px] font-medium text-[#0a0a0a]">Org Visible</div>
                  <div className="text-[10px] text-[#737373]">Discoverable but access requires explicit grant</div>
                </div>
              </label>
            </div>
            
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreateOpen(false)} className="px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec] rounded-[4px]">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-3 py-2 text-[12px] bg-[#117dff] text-white rounded-[4px] hover:bg-[#0066e0] disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
