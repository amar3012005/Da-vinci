import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Copy, Check, Mail, MessageSquare, Send, Linkedin, Twitter,
  AlertCircle, Loader2, RefreshCw, Trash2, Clock, CheckCircle2, XCircle,
  FolderKanban, Users, Link as LinkIcon,
} from 'lucide-react';
import apiClient from '../shared/api-client';

/**
 * ShareInviteModal — reusable invite popup.
 *
 * One modal handles all share channels + status list:
 *   1. Generate or reuse an invite token (server creates OrgInvite row).
 *   2. Surface the join URL with one-click copy + share targets:
 *        - Copy link
 *        - Email (server-side Resend/SMTP dispatch)
 *        - Slack deep-link (slack://share?text=...)
 *        - WhatsApp / Telegram / X / LinkedIn / mailto deep-links
 *   3. List existing invites (pending / accepted / expired / revoked)
 *      with resend + revoke + copy actions.
 *
 * Props:
 *   open            boolean
 *   onClose         () => void
 *   orgId           string  (control-plane org UUID, required)
 *   defaultProjectIds string[]  (optional — pre-scope new invites to project)
 *   defaultTeamIds  string[]    (optional)
 *   contextLabel    string      (e.g. "Project Alpha" — shown in title)
 */
export default function ShareInviteModal({
  open,
  onClose,
  orgId,
  defaultProjectIds = [],
  defaultTeamIds = [],
  contextLabel = null,
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [newInvite, setNewInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [invites, setInvites] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyById, setBusyById] = useState({});
  const [deliveryNotice, setDeliveryNotice] = useState(null);

  // Depend on the PRIMITIVE project id, never the array prop: `defaultProjectIds`
  // defaults to `[]`, which is a fresh identity on every parent render. With the
  // array in the useCallback deps, each fetch's own setState re-rendered the tree,
  // minted a new fetchInvites, and re-fired the effect — an unbounded
  // listInvites?status=pending request storm (ERR_INSUFFICIENT_RESOURCES) that
  // starved every other call on the page.
  const projectScopeId = Array.isArray(defaultProjectIds) && defaultProjectIds.length
    ? defaultProjectIds[0]
    : null;

  const fetchInvites = useCallback(async () => {
    if (!orgId) return;
    setLoadingList(true);
    try {
      const resp = await apiClient.listInvites(orgId, {
        status: statusFilter,
        projectId: projectScopeId,
      });
      setInvites(resp.invites || []);
    } catch {
      setInvites([]);
    } finally {
      setLoadingList(false);
    }
  }, [orgId, statusFilter, projectScopeId]);

  useEffect(() => {
    if (open) fetchInvites();
  }, [open, fetchInvites]);

  // Build a shareable URL + prefilled message.
  const inviteUrl = newInvite?.join_url || newInvite?.full_url || '';
  const orgLabel = contextLabel || 'our HIVEMIND';
  const shareText = `Join ${orgLabel} on HIVEMIND — persistent AI memory for teams. ${inviteUrl}`;

  // Deep-link share targets. Each opens the target app's compose flow
  // with the URL + text prefilled — no server-side OAuth needed.
  const shareTargets = useMemo(() => ([
    {
      key: 'slack',
      label: 'Slack',
      Icon: MessageSquare,
      color: '#4A154B',
      href: inviteUrl ? `slack://share?text=${encodeURIComponent(shareText)}` : null,
      hint: 'Opens Slack desktop',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      Icon: MessageSquare,
      color: '#25D366',
      href: inviteUrl ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : null,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      Icon: Send,
      color: '#229ED9',
      href: inviteUrl ? `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join ${orgLabel} on HIVEMIND`)}` : null,
    },
    {
      key: 'x',
      label: 'X',
      Icon: Twitter,
      color: '#0a0a0a',
      href: inviteUrl ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}` : null,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      Icon: Linkedin,
      color: '#0A66C2',
      href: inviteUrl ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}` : null,
    },
    {
      key: 'mailto',
      label: 'Mail app',
      Icon: Mail,
      color: '#525252',
      href: inviteUrl ? `mailto:?subject=${encodeURIComponent(`Join ${orgLabel} on HIVEMIND`)}&body=${encodeURIComponent(shareText)}` : null,
    },
  ]), [inviteUrl, orgLabel, shareText]);

  async function handleCreate() {
    if (!orgId) return;
    setCreating(true);
    setCreateError(null);
    setDeliveryNotice(null);
    setNewInvite(null);
    try {
      const payload = {
        email: email.trim() || undefined,
        role,
        team_ids: defaultTeamIds,
        project_ids: defaultProjectIds,
      };
      const resp = await apiClient.createInvite(orgId, payload);
      const inv = resp.invite || resp;
      setNewInvite(inv);
      await fetchInvites();
    } catch (err) {
      setCreateError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // older browsers — fallback noop
    }
  }

  async function handleResend(inv) {
    setBusyById(b => ({ ...b, [inv.id]: 'resend' }));
    setCreateError(null);
    setDeliveryNotice(null);
    try {
      const response = await apiClient.resendInvite(orgId, inv.id);
      const dispatch = response.email_dispatch;
      if (dispatch?.ok) {
        setDeliveryNotice(`Invitation email accepted by ${dispatch.provider || 'the delivery provider'}.`);
      } else {
        setCreateError(`The invitation is still active, but email delivery failed: ${dispatch?.error || 'please retry'}.`);
      }
      await fetchInvites();
    } catch (err) {
      setCreateError(err.response?.data?.error || err.message);
    } finally {
      setBusyById(b => ({ ...b, [inv.id]: null }));
    }
  }

  async function handleRevoke(inv) {
    if (!window.confirm(`Revoke invite for ${inv.email || 'link-only invite'}?`)) return;
    setBusyById(b => ({ ...b, [inv.id]: 'revoke' }));
    try {
      await apiClient.revokeInvite(orgId, inv.id);
      await fetchInvites();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setBusyById(b => ({ ...b, [inv.id]: null }));
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[12px] w-full max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#e3e0db]">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
              Invite to {contextLabel || 'workspace'}
            </h2>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">
              Share a link, send by email, or pick a channel.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {/* Compose: email + role */}
          <section>
            <label className="block text-[11px] font-medium text-[#525252] mb-1.5">Invite by email (optional)</label>
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="flex-1 h-9 px-3 text-[13px] border border-[#e3e0db] rounded-[6px] focus:outline-none focus:border-[#117dff]"
              />
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="h-9 px-2 text-[12px] border border-[#e3e0db] rounded-[6px] bg-white"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="h-9 px-4 bg-[#117dff] text-white text-[12px] font-medium rounded-[6px] hover:bg-[#0066e0] disabled:opacity-60 flex items-center gap-1.5"
              >
                {creating ? <Loader2 size={13} className="animate-spin" /> : <LinkIcon size={13} />}
                {email ? 'Send invite' : 'Create link'}
              </button>
            </div>
            {deliveryNotice && <p role="status" className="mb-3 text-[11px] text-emerald-700">{deliveryNotice}</p>}

            {(defaultProjectIds.length > 0 || defaultTeamIds.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px] text-[#525252]">
                <span className="text-[10px] uppercase tracking-wider text-[#a3a3a3]">Scoped to:</span>
                {defaultProjectIds.map(id => (
                  <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                    <FolderKanban size={9} className="text-emerald-700" />
                    project
                  </span>
                ))}
                {defaultTeamIds.map(id => (
                  <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full">
                    <Users size={9} className="text-blue-700" />
                    team
                  </span>
                ))}
              </div>
            )}

            {createError && (
              <div className="mb-3 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-[6px] text-[11px] text-red-700">
                <AlertCircle size={12} /> {createError}
              </div>
            )}

            {newInvite && inviteUrl && (
              <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-[8px] p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteUrl}
                    onClick={e => e.target.select()}
                    className="flex-1 h-8 px-2 text-[12px] bg-white border border-[#e3e0db] rounded-[4px] font-mono"
                  />
                  <button
                    onClick={() => handleCopy(inviteUrl)}
                    className="h-8 px-3 bg-[#0a0a0a] text-white text-[11px] font-medium rounded-[4px] hover:bg-[#262626] flex items-center gap-1"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {newInvite.email_dispatch && (
                  <div className={`text-[10px] font-mono ${newInvite.email_dispatch.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {newInvite.email_dispatch.ok
                      ? `✓ Email sent via ${newInvite.email_dispatch.provider}`
                      : newInvite.email_dispatch.attempted
                        ? `Email dispatch failed: ${newInvite.email_dispatch.error || 'no provider configured'}`
                        : 'Link-only — share via channels below'}
                  </div>
                )}

                {/* Invitee status — make it OBVIOUS when this person already
                    belongs to another organization and will join as a guest. */}
                {newInvite.invitee_status === 'external_existing_user' && (
                  <div className="flex items-start gap-2 text-[11px] rounded-[6px] border border-violet-200 bg-violet-50 px-2.5 py-2 text-violet-800">
                    <span className="mt-0.5">🌐</span>
                    <span>
                      <strong>{newInvite.email}</strong> already belongs to another organization.
                      {newInvite.joins_as === 'guest'
                        ? ' They will join as a GUEST — access to the invited project(s) only: no other projects, no org-wide memories.'
                        : ` They will join this org with the ${newInvite.joins_as || newInvite.role} role alongside their existing organization(s).`}
                    </span>
                  </div>
                )}
                {newInvite.invitee_status === 'already_member' && (
                  <div className="text-[11px] rounded-[6px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-800">
                    {newInvite.email} is already a member of this organization — this invite changes nothing.
                  </div>
                )}
                {newInvite.invitee_status === 'new_user' && newInvite.joins_as === 'guest' && (
                  <div className="text-[11px] rounded-[6px] border border-[#e3e0db] bg-[#faf9f4] px-2.5 py-2 text-[#525252]">
                    New user — will join as a project GUEST (invited project(s) only).
                  </div>
                )}

                {/* Share targets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {shareTargets.map(t => (
                    <a
                      key={t.key}
                      href={t.href || '#'}
                      target={t.key.startsWith('mailto') || t.key === 'slack' ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      onClick={e => { if (!t.href) e.preventDefault(); }}
                      className="flex flex-col items-center gap-1 p-2 bg-white border border-[#e3e0db] rounded-[6px] hover:border-[#0a0a0a] hover:shadow-sm transition-all group"
                      title={t.hint || `Share via ${t.label}`}
                    >
                      <t.Icon size={16} style={{ color: t.color }} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] text-[#525252] font-medium">{t.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Status list */}
          <section className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[12px] font-semibold text-[#0a0a0a] uppercase tracking-wider">Invitations</h3>
              <div className="flex items-center gap-1">
                {['pending', 'accepted', 'expired', 'revoked'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-[10px] px-2 py-1 rounded-[4px] font-medium capitalize transition-colors ${
                      statusFilter === s
                        ? 'bg-[#0a0a0a] text-white'
                        : 'text-[#525252] hover:bg-[#f3f1ec]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  onClick={fetchInvites}
                  className="ml-1 text-[#a3a3a3] hover:text-[#0a0a0a] p-1"
                  title="Refresh"
                >
                  <RefreshCw size={11} className={loadingList ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="border border-[#e3e0db] rounded-[8px] divide-y divide-[#eae7e1] max-h-[260px] overflow-y-auto">
              {invites.length === 0 && !loadingList && (
                <div className="px-3 py-6 text-center text-[11px] text-[#a3a3a3]">
                  No {statusFilter} invitations
                </div>
              )}
              {invites.map(inv => (
                <InviteRow
                  key={inv.id}
                  invite={inv}
                  onCopy={() => handleCopy(inv.join_url)}
                  onResend={() => handleResend(inv)}
                  onRevoke={() => handleRevoke(inv)}
                  busy={busyById[inv.id]}
                />
              ))}
            </div>
          </section>
        </div>

        <footer className="px-5 py-3 border-t border-[#e3e0db] bg-[#faf9f4] flex items-center justify-between">
          <span className="text-[10px] text-[#a3a3a3] font-mono">
            Invitees join via OAuth → land in {contextLabel || 'org'}
          </span>
          <button
            onClick={onClose}
            className="text-[11px] text-[#525252] hover:text-[#0a0a0a] font-medium"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

function InviteRow({ invite, onCopy, onResend, onRevoke, busy }) {
  const status = invite.status || 'pending';
  const STATUS_BADGE = {
    pending:  { label: 'Pending',  cls: 'text-amber-700 bg-amber-50 border-amber-200',     Icon: Clock },
    accepted: { label: 'Joined',   cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: CheckCircle2 },
    expired:  { label: 'Expired',  cls: 'text-[#737373] bg-[#f3f1ec] border-[#e3e0db]',    Icon: Clock },
    revoked:  { label: 'Revoked',  cls: 'text-red-700 bg-red-50 border-red-200',           Icon: XCircle },
  };
  const badge = STATUS_BADGE[status] || STATUS_BADGE.pending;

  return (
    <div className="px-3 py-2.5 hover:bg-[#faf9f4]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[#0a0a0a] truncate">
              {invite.email || <span className="text-[#a3a3a3]">link-only invite</span>}
            </span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${badge.cls}`}>
              <badge.Icon size={8} />
              {badge.label}
            </span>
            <span className="text-[10px] text-[#a3a3a3] font-mono">{invite.role}</span>
          </div>
          <div className="text-[10px] text-[#a3a3a3] mt-0.5 truncate">
            {invite.projects?.length > 0 && (
              <span>Projects: {invite.projects.map(p => p.name).join(', ')} · </span>
            )}
            {status === 'pending' && invite.expires_at && (
              <span>Expires {new Date(invite.expires_at).toLocaleDateString()}</span>
            )}
            {status === 'accepted' && invite.used_at && (
              <span>Joined {new Date(invite.used_at).toLocaleDateString()}</span>
            )}
            {status === 'expired' && invite.expires_at && (
              <span>Expired {new Date(invite.expires_at).toLocaleDateString()}</span>
            )}
            {status === 'revoked' && invite.revoked_at && (
              <span>Revoked {new Date(invite.revoked_at).toLocaleDateString()}</span>
            )}
            {invite.send_count > 1 && <span> · sent {invite.send_count}×</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(status === 'pending' || status === 'expired') && (
            <>
              <button
                onClick={onCopy}
                className="p-1.5 text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f3f1ec] rounded"
                title="Copy link"
              >
                <Copy size={12} />
              </button>
              {invite.email && (
                <button
                  onClick={onResend}
                  disabled={busy === 'resend'}
                  className="p-1.5 text-[#525252] hover:text-[#117dff] hover:bg-blue-50 rounded disabled:opacity-50"
                  title="Resend email"
                >
                  {busy === 'resend' ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                </button>
              )}
              <button
                onClick={onRevoke}
                disabled={busy === 'revoke'}
                className="p-1.5 text-[#a3a3a3] hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                title="Revoke"
              >
                {busy === 'revoke' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
