import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  RefreshCw,
  UserPlus,
  Edit2,
  UserX,
  UserCheck,
  ExternalLink,
  AlertCircle,
  X,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';
import ShareInviteModal from '../components/ShareInviteModal';

// Roles available for assignment — mirrors ROLES set in backend permissions.js
const ALL_ROLES = [
  { value: 'org_owner', label: 'Org Owner' },
  { value: 'org_admin', label: 'Org Admin' },
  { value: 'compliance_admin', label: 'Compliance Admin' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'service_account', label: 'Service Account' },
];

const ROLE_COLORS = {
  org_owner: 'bg-purple-100 text-purple-700 border-purple-200',
  org_admin: 'bg-blue-100 text-[#117dff] border-blue-200',
  compliance_admin: 'bg-amber-100 text-amber-700 border-amber-200',
  team_lead: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  member: 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]',
  viewer: 'bg-[#f3f1ec] text-[#737373] border-[#e3e0db]',
  service_account: 'bg-slate-100 text-slate-600 border-slate-200',
};

function RoleChip({ role }) {
  const cls = ROLE_COLORS[role] || ROLE_COLORS.member;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {role}
    </span>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
        isActive
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
          : 'bg-red-100 text-red-600 border-red-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Edit Roles Modal ─────────────────────────────────────────────────────────

function EditRolesModal({ member, onClose, onSave }) {
  const [selected, setSelected] = useState(member.roles || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function toggle(role) {
    setSelected(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }

  async function handleSave() {
    if (selected.length === 0) {
      setError('At least one role must be selected');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(selected);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#0a0a0a]">Edit Roles</h2>
          <button onClick={onClose} className="text-[#737373] hover:text-[#0a0a0a]">
            <X size={18} />
          </button>
        </div>
        <p className="text-[12px] text-[#737373] mb-4">
          {member.email || member.display_name || member.user_id}
        </p>

        <div className="space-y-2 mb-4">
          {ALL_ROLES.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(value)}
                onChange={() => toggle(value)}
                className="w-4 h-4 accent-[#117dff]"
              />
              <span className="text-[13px] text-[#0a0a0a]">{label}</span>
              <RoleChip role={value} />
            </label>
          ))}
        </div>

        {error && (
          <p className="text-[12px] text-red-600 mb-3">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-[#525252] hover:bg-[#f3f1ec] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium bg-[#117dff] text-white rounded-lg hover:bg-[#0e6de0] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { org } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editTarget, setEditTarget] = useState(null);   // member row being role-edited
  const [showInvite, setShowInvite] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchMembers = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listOrgMembers(org.id);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [org?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleSaveRoles(member, newRoles) {
    await apiClient.updateMemberRoles(org.id, member.user_id, newRoles);
    await fetchMembers();
  }

  async function handleDeactivate(member) {
    setActionError(null);
    try {
      await apiClient.deactivateMember(org.id, member.user_id);
      await fetchMembers();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    }
  }

  async function handleReactivate(member) {
    setActionError(null);
    try {
      await apiClient.reactivateMember(org.id, member.user_id);
      await fetchMembers();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#0a0a0a] flex items-center gap-2">
            <Users size={20} className="text-[#117dff]" />
            Admin Users
          </h1>
          <p className="text-[13px] text-[#737373] mt-0.5">
            Manage organization members, roles, and access control.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchMembers}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-[#525252] border border-[#e3e0db] rounded-lg hover:bg-[#f3f1ec] transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium bg-[#117dff] text-white rounded-lg hover:bg-[#0e6de0] transition-colors"
          >
            <UserPlus size={14} />
            Invite
          </button>
        </div>
      </div>

      {/* Errors */}
      {(error || actionError) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          <AlertCircle size={15} />
          {error || actionError}
        </div>
      )}

      {/* Member table */}
      <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e3e0db] bg-[#faf9f4]">
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                Member
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                Roles
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                Last Active
              </th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#737373]">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#737373]">
                  No members found.
                </td>
              </tr>
            )}
            {members.map(member => (
              <tr
                key={member.user_id}
                className="border-b border-[#f3f1ec] last:border-0 hover:bg-[#faf9f4] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-[#0a0a0a]">
                    {member.display_name || '—'}
                  </div>
                  <div className="text-[11px] text-[#737373]">{member.email || member.user_id}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(member.roles || []).length > 0
                      ? (member.roles || []).map(role => <RoleChip key={role} role={role} />)
                      : <RoleChip role={member.role || 'member'} />
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge isActive={member.is_active !== false} />
                </td>
                <td className="px-4 py-3 text-[#525252]">
                  {formatDate(member.last_active_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Edit roles */}
                    <button
                      onClick={() => setEditTarget(member)}
                      title="Edit roles"
                      className="p-1.5 text-[#737373] hover:text-[#117dff] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>

                    {/* View audit activity */}
                    <a
                      href={`/hivemind/app/audit?user_id=${member.user_id}`}
                      title="View activity"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-[#737373] hover:text-[#117dff] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>

                    {/* Deactivate / Reactivate */}
                    {member.is_active !== false ? (
                      <button
                        onClick={() => handleDeactivate(member)}
                        title="Deactivate"
                        className="p-1.5 text-[#737373] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <UserX size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(member)}
                        title="Reactivate"
                        className="p-1.5 text-[#737373] hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <UserCheck size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[#737373]">
        {members.length} member{members.length !== 1 ? 's' : ''}
      </p>

      {/* Edit roles modal */}
      {editTarget && (
        <EditRolesModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={newRoles => handleSaveRoles(editTarget, newRoles)}
        />
      )}

      {/* Share invite modal — replaces legacy InviteModal with multi-channel popup */}
      <ShareInviteModal
        open={showInvite}
        onClose={() => { setShowInvite(false); fetchMembers(); }}
        orgId={org?.id}
        contextLabel={org?.name || 'workspace'}
      />
    </div>
  );
}
