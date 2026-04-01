import React, { useCallback, useEffect, useState } from 'react';
import { Copy, MailPlus, Trash2, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';

const ROLE_OPTIONS = ['member', 'viewer', 'developer', 'admin'];

function RolePill({ role }) {
  const tone = {
    owner: 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20',
    admin: 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20',
    developer: 'bg-[#f59e0b]/10 text-[#b45309] border-[#f59e0b]/20',
    viewer: 'bg-[#737373]/10 text-[#525252] border-[#737373]/20',
    member: 'bg-[#16a34a]/10 text-[#15803d] border-[#16a34a]/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-mono uppercase tracking-[0.08em] ${tone[role] || tone.member}`}>
      {role}
    </span>
  );
}

export default function TeamMembers() {
  const { org, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLink, setInviteLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    setError('');
    try {
      const [membersResp, invitesResp] = await Promise.all([
        apiClient.listMembers(org.id),
        apiClient.listInvites(org.id),
      ]);
      setMembers(membersResp.members || []);
      setInvites(invitesResp.invites || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [org?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!org?.id) return;
    setSubmitting(true);
    setError('');
    try {
      const resp = await apiClient.createInvite(org.id, {
        email: inviteEmail.trim() || undefined,
        role: inviteRole,
      });
      setInviteLink(resp.invite?.join_url || '');
      setInviteEmail('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = async (value) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setInviteLink(value);
  };

  const revokeInvite = async (inviteId) => {
    if (!org?.id) return;
    await apiClient.revokeInvite(org.id, inviteId);
    await load();
  };

  const updateRole = async (memberUserId, role) => {
    if (!org?.id) return;
    await apiClient.updateMemberRole(org.id, memberUserId, role);
    await load();
  };

  const removeMember = async (memberUserId) => {
    if (!org?.id) return;
    await apiClient.removeMember(org.id, memberUserId);
    await load();
  };

  if (org?.plan !== 'enterprise') {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-[#e3e0db] bg-white p-6">
          <p className="text-[#0a0a0a] font-semibold font-['Space_Grotesk'] mb-2">Enterprise workspace required</p>
          <p className="text-sm text-[#525252]">Team members are available only on enterprise orgs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-[#e3e0db] bg-white p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <Users size={18} className="text-[#117dff]" />
            </div>
            <div>
              <h2 className="text-[#0a0a0a] font-semibold font-['Space_Grotesk']">Invite team members</h2>
              <p className="text-sm text-[#525252]">Generate an invite link with an optional email restriction.</p>
            </div>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-[#525252] text-xs font-mono mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Optional. Restrict invite to one email."
                className="w-full rounded-[8px] border border-[#e3e0db] px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40"
              />
            </div>
            <div>
              <label className="block text-[#525252] text-xs font-mono mb-2 uppercase tracking-wider">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-[8px] border border-[#e3e0db] px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e6fe0] disabled:opacity-50"
            >
              <MailPlus size={16} />
              Create invite
            </button>
          </form>

          {inviteLink && (
            <div className="mt-5 rounded-xl border border-[#d8e6ff] bg-[#117dff]/[0.04] p-4">
              <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#117dff] mb-2">Latest invite</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 rounded-[8px] border border-[#cfe0ff] bg-white px-3 py-2 text-xs text-[#0a0a0a] font-mono"
                />
                <button
                  type="button"
                  onClick={() => copyInviteLink(inviteLink)}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-[#cfe0ff] bg-white px-3 py-2 text-xs font-semibold text-[#117dff]"
                >
                  <Copy size={14} />
                  Copy
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#e3e0db] bg-white p-6">
          <h2 className="text-[#0a0a0a] font-semibold font-['Space_Grotesk'] mb-4">Pending invites</h2>
          <div className="space-y-3">
            {invites.length === 0 && (
              <p className="text-sm text-[#525252]">No pending invites.</p>
            )}
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-xl border border-[#ece8de] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#0a0a0a]">{invite.email || 'Shareable invite link'}</p>
                    <p className="text-xs text-[#737373] font-mono mt-1">Expires {new Date(invite.expires_at).toLocaleString()}</p>
                  </div>
                  <RolePill role={invite.role} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => copyInviteLink(invite.join_url)} className="rounded-[8px] border border-[#e3e0db] px-3 py-2 text-xs font-semibold text-[#525252]">
                    Copy link
                  </button>
                  <button type="button" onClick={() => revokeInvite(invite.id)} className="rounded-[8px] border border-[#f8d7da] px-3 py-2 text-xs font-semibold text-[#b91c1c]">
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#e3e0db] bg-white p-6">
        <h2 className="text-[#0a0a0a] font-semibold font-['Space_Grotesk'] mb-4">Current members</h2>
        {loading ? (
          <p className="text-sm text-[#525252]">Loading members…</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.user_id} className="flex flex-col gap-3 rounded-xl border border-[#ece8de] p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0a0a0a]">{member.display_name || member.email || member.user_id}</p>
                  <p className="text-xs text-[#737373] font-mono mt-1">{member.email || member.user_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  {member.role === 'owner' ? (
                    <RolePill role="owner" />
                  ) : (
                    <select
                      value={member.role}
                      onChange={(e) => updateRole(member.user_id, e.target.value)}
                      className="rounded-[8px] border border-[#e3e0db] px-3 py-2 text-xs font-mono"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  )}
                  {member.user_id !== user?.id && member.role !== 'owner' && (
                    <button
                      type="button"
                      onClick={() => removeMember(member.user_id)}
                      className="inline-flex items-center gap-2 rounded-[8px] border border-[#f8d7da] px-3 py-2 text-xs font-semibold text-[#b91c1c]"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="mt-4 text-xs font-mono text-[#dc2626]">{error}</p>}
      </section>
    </div>
  );
}
