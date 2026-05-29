import React, { useState, useEffect, useCallback } from 'react';
import { FolderKanban, Plus, RefreshCw, Trash2, AlertCircle, Folder, Shield, Users, UserPlus, X, UserMinus, Activity, Clock } from 'lucide-react';
import { useTeamContext } from '../shared/team-context';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';
import ShareInviteModal from '../components/ShareInviteModal';

/**
 * TeamProjects — manage projects under the currently-active team.
 * Uses P0-1 endpoints under /v1/teams/:id/projects and /v1/projects/:id.
 */
export default function TeamProjects() {
  const { activeTeam, activeTeamId, refresh: refreshTeams } = useTeamContext();
  const { org } = useAuth();
  const activeOrgId = org?.id;
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPolicy, setNewPolicy] = useState('private');
  // ShareInviteModal target — { projectId, projectName } or null.
  const [inviteTarget, setInviteTarget] = useState(null);
  // Project-members modal target — { projectId, projectName } or null.
  const [membersTarget, setMembersTarget] = useState(null);
  const [activityTarget, setActivityTarget] = useState(null);

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
          <div
            key={p.id}
            onClick={() => setActivityTarget({ projectId: p.id, projectName: p.name })}
            className="bg-white border border-[#e3e0db] rounded-[8px] p-4 hover:border-[#d4d0ca] transition-colors cursor-pointer"
            title="View project activity"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-[#117dff]" />
                <h3 className="text-[14px] font-semibold text-[#0a0a0a]">{p.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setMembersTarget({ projectId: p.id, projectName: p.name }); }}
                  className="text-[#a3a3a3] hover:text-[#16a34a] transition-colors p-1"
                  title="Manage members + roles"
                >
                  <Users size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setInviteTarget({ projectId: p.id, projectName: p.name }); }}
                  className="text-[#a3a3a3] hover:text-[#117dff] transition-colors p-1"
                  title="Invite to this project"
                >
                  <UserPlus size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleArchive(p.id); }}
                  className="text-[#a3a3a3] hover:text-[#dc2626] transition-colors p-1"
                  title="Archive"
                >
                  <Trash2 size={13} />
                </button>
              </div>
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

      <ShareInviteModal
        open={!!inviteTarget}
        onClose={() => setInviteTarget(null)}
        orgId={activeOrgId}
        defaultProjectIds={inviteTarget ? [inviteTarget.projectId] : []}
        defaultTeamIds={activeTeamId ? [activeTeamId] : []}
        contextLabel={inviteTarget ? `${inviteTarget.projectName} (project)` : 'project'}
      />

      {membersTarget && (
        <ProjectMembersModal
          projectId={membersTarget.projectId}
          projectName={membersTarget.projectName}
          onClose={() => setMembersTarget(null)}
        />
      )}

      {activityTarget && (
        <ProjectActivityModal
          projectId={activityTarget.projectId}
          projectName={activityTarget.projectName}
          onClose={() => setActivityTarget(null)}
        />
      )}

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


// ─── ProjectMembersModal — manage role + remove ────────────────────────────
function ProjectMembersModal({ projectId, projectName, onClose }) {
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);
  const [busyId, setBusyId] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiClient.listProjectMembers(projectId);
      setMembers(data.members || []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => { load(); }, [load]);

  async function changeRole(userId, role) {
    setBusyId(userId);
    setErr(null);
    try {
      await apiClient.updateProjectMemberRole(projectId, userId, role);
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(userId) {
    if (!window.confirm("Remove this member from project?")) return;
    setBusyId(userId);
    setErr(null);
    try {
      await apiClient.removeProjectMember(projectId, userId);
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-[8px] p-5 w-[520px] max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#0a0a0a]">Members — {projectName}</h2>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={16} /></button>
        </div>
        {err && (
          <div className="mb-3 p-2 bg-[#fee] border border-[#fbb] rounded-[4px] text-[12px] text-[#dc2626] flex items-center gap-2">
            <AlertCircle size={12} /> {err}
          </div>
        )}
        {loading ? (
          <div className="py-8 text-center text-[12px] text-[#a3a3a3]">Loading…</div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-[#a3a3a3]">No members yet. Use Invite icon to add.</div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id || m.userId} className="flex items-center justify-between p-2 border border-[#e3e0db] rounded-[4px] hover:bg-[#faf9f4]">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-[#0a0a0a] truncate">{m.display_name || m.email || (m.user_id || m.userId).slice(0, 8)}</div>
                  {m.email && <div className="text-[10px] text-[#737373] truncate">{m.email}</div>}
                </div>
                <select
                  value={m.role || "contributor"}
                  disabled={busyId === (m.user_id || m.userId)}
                  onChange={(e) => changeRole(m.user_id || m.userId, e.target.value)}
                  className="text-[11px] px-2 py-1 border border-[#e3e0db] rounded-[4px] bg-white mr-2"
                >
                  <option value="owner">Owner</option>
                  <option value="contributor">Contributor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => removeMember(m.user_id || m.userId)}
                  disabled={busyId === (m.user_id || m.userId)}
                  className="text-[#a3a3a3] hover:text-[#dc2626] p-1 disabled:opacity-50"
                  title="Remove from project"
                >
                  <UserMinus size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ProjectActivityModal — last activity, contributors, recent memories ────
function ProjectActivityModal({ projectId, projectName, onClose }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    apiClient.getProjectActivity(projectId)
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(e => { if (alive) { setErr(e.response?.data?.error || e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [projectId]);

  const when = (t) => t ? new Date(t).toLocaleString() : '—';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[8px] w-[560px] max-h-[80vh] shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e3e0db]">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#117dff]" />
            <h2 className="text-[15px] font-semibold text-[#0a0a0a]">{projectName} · Activity</h2>
          </div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {loading && <div className="text-[12px] text-[#a3a3a3]">Loading…</div>}
          {err && <div className="text-[12px] text-red-600">{err}</div>}
          {data && !loading && (
            <>
              <div className="text-[12px] text-[#525252]">
                <span className="font-semibold text-[#0a0a0a]">{data.total_memories ?? 0}</span> memories in this project
              </div>

              {(data.contributors || []).length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-1">Contributors</div>
                  <div className="border border-[#f3f1ec] rounded-[6px] divide-y divide-[#f3f1ec]">
                    {data.contributors.map((c) => (
                      <div key={c.user_id} className="flex items-center justify-between px-3 py-1.5 text-[12px]">
                        <span className="text-[#0a0a0a]">{c.name}</span>
                        <span className="font-mono text-[#a3a3a3] flex items-center gap-2">
                          {c.memory_count} mem
                          <span className="flex items-center gap-1"><Clock size={10} /> {when(c.last_activity)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data.recent_memories || []).length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-1">Recent memories</div>
                  <div className="border border-[#f3f1ec] rounded-[6px] divide-y divide-[#f3f1ec] max-h-[200px] overflow-y-auto">
                    {data.recent_memories.map((m) => (
                      <div key={m.id} className="px-3 py-1.5 text-[12px]">
                        <div className="text-[#0a0a0a] truncate">{m.title || '(untitled)'}</div>
                        <div className="text-[10px] text-[#a3a3a3] font-mono">{m.by} · {m.type} · {when(m.at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data.audit || []).length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-1">Admin events</div>
                  <div className="border border-[#f3f1ec] rounded-[6px] divide-y divide-[#f3f1ec]">
                    {data.audit.map((a, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                        <span className="text-[#525252]">{a.event} · {a.by}</span>
                        <span className="font-mono text-[#a3a3a3]">{when(a.at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data.total_memories ?? 0) === 0 && (data.audit || []).length === 0 && (
                <div className="text-[12px] text-[#a3a3a3]">No activity yet in this project.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
