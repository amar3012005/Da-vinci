import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Trash2, AlertCircle, RefreshCw, Crown, FolderKanban, Send } from 'lucide-react';
import { useTeamContext } from '../shared/team-context';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';
import ShareInviteModal from '../components/ShareInviteModal';

const ROLE_BADGES = {
  lead: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  member: 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]',
};

/**
 * TeamMembers — manage membership of the currently-active team.
 * Uses P0-1 endpoints under /v1/teams/:id/members.
 */
export default function TeamMembers() {
  const { t } = useTranslation('dashboard');
  const { activeTeam, activeTeamId } = useTeamContext();
  const { user, org } = useAuth();
  const activeOrgId = org?.id;
  const [members, setMembers] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addingUserId, setAddingUserId] = useState('');
  const [addingRole, setAddingRole] = useState('member');
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!activeTeamId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.listTeamMembers(activeTeamId);
      setMembers(resp.members || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTeamId]);

  const fetchOrgMembers = useCallback(async () => {
    try {
      const resp = await apiClient.listOrgMembers?.();
      const list = resp?.members || resp || [];
      setOrgMembers(Array.isArray(list) ? list : []);
    } catch {
      setOrgMembers([]);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!activeTeamId) return;
    try {
      const resp = await apiClient.listTeamProjects(activeTeamId);
      setProjects(resp.projects || []);
    } catch {
      setProjects([]);
    }
  }, [activeTeamId]);

  useEffect(() => { fetchMembers(); fetchProjects(); }, [fetchMembers, fetchProjects]);
  useEffect(() => { fetchOrgMembers(); }, [fetchOrgMembers]);

  async function handleAdd() {
    if (!addingUserId || !activeTeamId) return;
    setError(null);
    try {
      await apiClient.addTeamMember(activeTeamId, { user_id: addingUserId, role: addingRole });
      setAddOpen(false);
      setAddingUserId('');
      setAddingRole('member');
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handleRemove(memberUserId) {
    if (!activeTeamId) return;
    if (!window.confirm(t('teammembers.removeConfirm', 'Remove this member from the team?'))) return;
    setError(null);
    try {
      await apiClient.removeTeamMember(activeTeamId, memberUserId);
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handlePromote(m) {
    if (!activeTeamId) return;
    const newRole = m.role === 'lead' ? 'member' : 'lead';
    setError(null);
    try {
      await apiClient.addTeamMember(activeTeamId, { user_id: m.userId, role: newRole });
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  const availableToAdd = orgMembers.filter(om =>
    !members.find(tm => tm.userId === (om.user_id || om.userId || om.id))
  );

  if (!activeTeamId) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white border border-[#e3e0db] rounded-[8px] text-center">
        <Users size={32} className="text-[#a3a3a3] mx-auto mb-3" />
        <h2 className="text-[#0a0a0a] font-semibold mb-1">{t('teammembers.noTeamTitle', 'No team selected')}</h2>
        <p className="text-[12px] text-[#a3a3a3]">{t('teammembers.noTeamHint', 'Pick a team from the top-bar switcher.')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
            {t('teammembers.title', 'Team Members')}
          </h1>
          <p className="text-[12px] text-[#a3a3a3] mt-1">
            {activeTeam?.name || t('teammembers.activeTeamFallback', 'Active team')} — {members.length} {members.length === 1 ? t('teammembers.memberSingular', 'member') : t('teammembers.memberPlural', 'members')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchMembers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#f3f1ec] border border-[#e3e0db] text-[12px] hover:bg-[#eae7e1]"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {t('teammembers.btnRefresh', 'Refresh')}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#f3f1ec] border border-[#e3e0db] text-[12px] hover:bg-[#eae7e1] text-[#0a0a0a]"
          >
            <UserPlus size={13} />
            {t('teammembers.btnAddExisting', 'Add Existing')}
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]"
          >
            <Send size={13} />
            {t('teammembers.btnInvite', 'Invite to Team')}
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[8px] text-[12px] text-[#dc2626]">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div className="bg-white border border-[#e3e0db] rounded-[8px] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#faf9f4] border-b border-[#e3e0db]">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">{t('teammembers.colUser', 'User')}</th>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">{t('teammembers.colRole', 'Role')}</th>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">{t('teammembers.colProjectAccess', 'Project Access')}</th>
              <th className="text-left px-3 py-2 font-medium text-[#525252]">{t('teammembers.colJoined', 'Joined')}</th>
              <th className="text-right px-3 py-2 font-medium text-[#525252]">{t('teammembers.colActions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[#a3a3a3]">{t('teammembers.noMembers', 'No members yet')}</td>
              </tr>
            )}
            {members.map(m => {
              const u = m.user || {};
              const cls = ROLE_BADGES[m.role] || ROLE_BADGES.member;
              const isSelf = (u.id || m.userId) === user?.id;
              const memberProjectCount = projects.filter(p =>
                p._count?.members > 0 || p.policy === 'team_inherited'
              ).length;

              return (
                <tr key={m.userId || m.user_id} className="border-b border-[#eae7e1] hover:bg-[#faf9f4]">
                  <td className="px-3 py-2">
                    <div className="font-medium text-[#0a0a0a]">{u.displayName || u.email || (m.userId || '').slice(0, 8)}</div>
                    {u.email && <div className="text-[11px] text-[#a3a3a3]">{u.email}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
                      {m.role === 'lead' && <Crown size={9} />}
                      {m.role}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#525252]">
                      <FolderKanban size={11} className="text-[#117dff]" />
                      {memberProjectCount} {memberProjectCount === 1 ? t('teammembers.projectSingular', 'project') : t('teammembers.projectPlural', 'projects')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#a3a3a3] text-[11px]">
                    {m.addedAt ? new Date(m.addedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {!isSelf && (
                        <button
                          onClick={() => handlePromote(m)}
                          className="text-[11px] text-[#525252] hover:text-[#117dff]"
                        >
                          {m.role === 'lead' ? t('teammembers.btnDemote', 'Demote') : t('teammembers.btnPromote', 'Promote to lead')}
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          onClick={() => handleRemove(m.userId || m.user_id)}
                          className="text-[#dc2626]/60 hover:text-[#dc2626]"
                          title={t('teammembers.removeTitle', 'Remove from team')}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ShareInviteModal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); fetchMembers(); }}
        orgId={activeOrgId}
        defaultTeamIds={activeTeamId ? [activeTeamId] : []}
        contextLabel={activeTeam?.name ? `${activeTeam.name} (team)` : t('teammembers.contextLabelFallback', 'team')}
      />

      {addOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setAddOpen(false)}>
          <div className="bg-white rounded-[8px] p-5 w-[420px] shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold mb-3">{t('teammembers.addModalTitle', 'Add Team Member')}</h2>
            {availableToAdd.length === 0 ? (
              <p className="text-[12px] text-[#a3a3a3]">{t('teammembers.allMembersAdded', 'All org members are already in this team.')}</p>
            ) : (
              <>
                <label className="block text-[11px] text-[#525252] mb-1">{t('teammembers.addModalLabelUser', 'User')}</label>
                <select
                  value={addingUserId}
                  onChange={e => setAddingUserId(e.target.value)}
                  className="w-full h-9 px-2 text-[13px] border border-[#e3e0db] rounded-[4px] mb-3"
                >
                  <option value="">{t('teammembers.addModalSelectPlaceholder', '— select org member —')}</option>
                  {availableToAdd.map(u => (
                    <option key={u.user_id || u.userId || u.id} value={u.user_id || u.userId || u.id}>
                      {u.email || u.displayName || u.user_id}
                    </option>
                  ))}
                </select>
                <label className="block text-[11px] text-[#525252] mb-1">{t('teammembers.addModalLabelRole', 'Role')}</label>
                <select
                  value={addingRole}
                  onChange={e => setAddingRole(e.target.value)}
                  className="w-full h-9 px-2 text-[13px] border border-[#e3e0db] rounded-[4px] mb-4"
                >
                  <option value="member">{t('teammembers.roleMember', 'Member')}</option>
                  <option value="lead">{t('teammembers.roleLead', 'Lead')}</option>
                </select>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setAddOpen(false)} className="px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec] rounded-[4px]">{t('teammembers.btnCancel', 'Cancel')}</button>
              <button
                onClick={handleAdd}
                disabled={!addingUserId}
                className="px-3 py-2 text-[12px] bg-[#117dff] text-white rounded-[4px] hover:bg-[#0066e0] disabled:opacity-50"
              >
                {t('teammembers.btnAdd', 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
