import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UserPlus, Mail, Check, AlertCircle, Copy, Loader2,
  Clock, CheckCircle2, XCircle, RefreshCw, Trash2, FolderKanban,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUS_TABS = ['pending', 'accepted', 'expired', 'revoked'];

/**
 * BulkInviteModal — "Invite your Team" popup dashboard (top navbar).
 *
 * Compose: paste MULTIPLE email addresses in one go (comma / space /
 * newline separated), pick a role + optional project scope, one Send for
 * the whole batch. Each invitee gets the branded `team_invite` system
 * email through the same pipeline as the login welcome mails.
 *
 * Dashboard: existing invitations by status (pending / accepted /
 * expired / revoked) with copy-link, resend and revoke per row, plus the
 * role, projects, inviter and expiry details for each.
 */
export default function BulkInviteModal({ open, onClose, org }) {
  const { t } = useTranslation('dashboard');
  const [raw, setRaw] = useState('');
  const [role, setRole] = useState('member');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  // Invitations dashboard
  const [statusFilter, setStatusFilter] = useState('pending');
  const [invites, setInvites] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyById, setBusyById] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const parsed = useMemo(() => {
    const tokens = raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    const valid = [];
    const invalid = [];
    const seen = new Set();
    for (const tk of tokens) {
      const e = tk.toLowerCase();
      if (!EMAIL_RE.test(e)) { invalid.push(tk); continue; }
      if (seen.has(e)) continue;
      seen.add(e);
      valid.push(e);
    }
    return { valid, invalid };
  }, [raw]);

  const loadInvites = useCallback(async (status = statusFilter) => {
    if (!org?.id) return;
    setLoadingList(true);
    try {
      const resp = await apiClient.listInvites(org.id, { status });
      setInvites(resp.invites || []);
    } catch { setInvites([]); }
    setLoadingList(false);
  }, [org?.id, statusFilter]);

  // Load role-scoped projects + the pending list whenever the modal opens.
  useEffect(() => {
    if (!open || !org?.id) return;
    loadInvites();
    apiClient.listProjects(org.id)
      .then((d) => setProjects(d.projects || []))
      .catch(() => setProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, org?.id]);

  useEffect(() => { if (open) loadInvites(statusFilter); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  if (!open) return null;

  const handleSend = async () => {
    if (!org?.id || parsed.valid.length === 0 || sending) return;
    setSending(true);
    setError(null);
    setResults(null);
    try {
      const resp = await apiClient.bulkInvite(org.id, parsed.valid, role, projectId ? [projectId] : []);
      setResults(resp);
      loadInvites('pending');
      setStatusFilter('pending');
    } catch (err) {
      setError(err.response?.status === 403
        ? t('invite.adminOnly', 'Only organization admins can send invitations — ask your admin to invite the team.')
        : (err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send invitations'));
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (id, url) => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); } catch { /* noop */ }
  };
  const handleResend = async (inv) => {
    setBusyById((b) => ({ ...b, [inv.id]: 'resend' }));
    try { await apiClient.resendInvite(org.id, inv.id); await loadInvites(); } catch { /* surfaced via list refresh */ }
    setBusyById((b) => ({ ...b, [inv.id]: null }));
  };
  const handleRevoke = async (inv) => {
    setBusyById((b) => ({ ...b, [inv.id]: 'revoke' }));
    try { await apiClient.revokeInvite(org.id, inv.id); await loadInvites(); } catch { /* noop */ }
    setBusyById((b) => ({ ...b, [inv.id]: null }));
  };

  const handleClose = () => {
    setRaw('');
    setResults(null);
    setError(null);
    onClose();
  };

  const STATUS_BADGE = {
    pending:  { label: t('invite.statusPending', 'Pending'),  cls: 'text-amber-700 bg-amber-50 border-amber-200', Icon: Clock },
    accepted: { label: t('invite.statusJoined', 'Joined'),    cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: CheckCircle2 },
    expired:  { label: t('invite.statusExpired', 'Expired'),  cls: 'text-[#737373] bg-[#f3f1ec] border-[#e3e0db]', Icon: Clock },
    revoked:  { label: t('invite.statusRevoked', 'Revoked'),  cls: 'text-red-700 bg-red-50 border-red-200', Icon: XCircle },
  };

  const resultChip = (r) => {
    if (r.status === 'invited') {
      return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${r.email_sent ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fef9c3] text-[#a16207]'}`}>
          <Check size={9} />
          {r.email_sent ? t('invite.sent', 'invited + emailed') : t('invite.createdNoEmail', 'invited (email failed — copy link)')}
        </span>
      );
    }
    if (r.status === 'already_member') {
      return <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f3f1ec] text-[#a3a3a3]">{t('invite.alreadyMember', 'already a member')}</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#dc2626]">
        <AlertCircle size={9} />
        {r.error || t('invite.failed', 'failed')}
      </span>
    );
  };

  // PORTAL to document.body: the TopBar <header> uses backdrop-blur, which
  // makes it the containing block for position:fixed descendants.
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#e3e0db] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-[#0a0a0a] text-lg font-semibold font-['Space_Grotesk'] flex items-center gap-2">
                <UserPlus size={18} className="text-[#117dff]" />
                {t('invite.title', 'Invite your Team')}
              </h3>
              <p className="text-[#525252] text-sm mt-1">
                {t('invite.subtitle', 'Add multiple email addresses — everyone gets an invitation to {{name}} at once.', { name: org?.name || 'your org' })}
              </p>
            </div>
            <button type="button" onClick={handleClose} className="rounded-lg p-1 text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]">
              <X size={16} />
            </button>
          </div>

          {/* ── Compose ───────────────────────────────────────────── */}
          {!results ? (
            <>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={3}
                placeholder={t('invite.placeholder', 'alice@company.com, bob@company.com\ncarol@company.com …')}
                className="w-full rounded-xl border border-[#e3e0db] bg-[#faf9f4] px-3 py-2.5 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40 font-mono"
              />

              {(parsed.valid.length > 0 || parsed.invalid.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {parsed.valid.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#117dff]/8 border border-[#117dff]/20 text-[#117dff]">
                      <Mail size={9} />{e}
                    </span>
                  ))}
                  {parsed.invalid.map((e, i) => (
                    <span key={`${e}-${i}`} className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#fee2e2] border border-[#fecaca] text-[#dc2626]" title="Not a valid email">
                      {e}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-[8px] border border-[#e3e0db] px-3 py-2 text-sm text-[#0a0a0a] focus:outline-none"
                >
                  <option value="member">{t('invite.roleMember', 'Member')}</option>
                  <option value="viewer">{t('invite.roleViewer', 'Viewer')}</option>
                  <option value="admin">{t('invite.roleAdmin', 'Admin')}</option>
                </select>
                {projects.length > 0 && (
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    title={t('invite.projectScopeHint', 'Optional: invitees auto-join this project on accept')}
                    className="rounded-[8px] border border-[#e3e0db] px-3 py-2 text-sm text-[#525252] focus:outline-none max-w-[200px]"
                  >
                    <option value="">{t('invite.noProjectScope', 'No project (org only)')}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{t('invite.projectPrefix', 'Project:')} {p.name}</option>
                    ))}
                  </select>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={parsed.valid.length === 0 || sending}
                  className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e6fe0] disabled:opacity-50"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  {sending
                    ? t('invite.sending', 'Sending…')
                    : t('invite.sendN', 'Send {{n}} invitation{{s}}', { n: parsed.valid.length || '', s: parsed.valid.length === 1 ? '' : 's' })}
                </button>
              </div>

              {error && <p className="mt-3 text-xs text-[#dc2626]">{error}</p>}

              <p className="mt-3 text-[11px] text-[#a3a3a3] font-mono">
                {t('invite.footer', 'Each person gets a branded invitation email from your admin with a join link. Invitees join via OAuth and land directly in {{name}}.', { name: org?.name || 'your org' })}
              </p>
            </>
          ) : (
            /* ── Send results ─────────────────────────────────────── */
            <>
              <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-4 py-3 mb-3">
                <p className="text-sm font-semibold text-[#0a0a0a]">
                  {t('invite.resultHeadline', '{{invited}} of {{total}} invited', { invited: results.invited, total: results.total })}
                </p>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {(results.results || []).map((r) => (
                  <div key={r.email} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[#0a0a0a] font-mono text-xs">{r.email}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {resultChip(r)}
                      {r.join_url && (
                        <button
                          type="button"
                          title={t('invite.copyLink', 'Copy join link')}
                          onClick={() => handleCopy(r.email, r.join_url)}
                          className="rounded p-1 text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f3f1ec]"
                        >
                          {copiedId === r.email ? <Check size={12} className="text-[#16a34a]" /> : <Copy size={12} />}
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => { setResults(null); setRaw(''); }}
                  className="rounded-[8px] border border-[#e3e0db] px-4 py-2 text-sm font-semibold text-[#525252]"
                >
                  {t('invite.inviteMore', 'Invite more')}
                </button>
              </div>
            </>
          )}

          {/* ── Invitations dashboard ──────────────────────────────── */}
          <div className="mt-6 pt-4 border-t border-[#ece8de]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3]">
                {t('invite.invitationsHeading', 'Invitations')}
              </p>
              <div className="flex items-center gap-1">
                {STATUS_TABS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      statusFilter === s ? 'bg-[#0a0a0a] text-white' : 'text-[#525252] hover:bg-[#f3f1ec]'
                    }`}
                  >
                    {t(`invite.tab_${s}`, s.charAt(0).toUpperCase() + s.slice(1))}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => loadInvites()}
                  title={t('invite.refresh', 'Refresh')}
                  className="rounded p-1 text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f3f1ec]"
                >
                  <RefreshCw size={12} className={loadingList ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#e3e0db] divide-y divide-[#f0ede7] max-h-60 overflow-y-auto">
              {invites.length === 0 && !loadingList && (
                <div className="px-3 py-6 text-center text-[11px] text-[#a3a3a3]">
                  {t('invite.noneInStatus', 'No {{status}} invitations', { status: statusFilter })}
                </div>
              )}
              {invites.map((inv) => {
                const badge = STATUS_BADGE[inv.status || 'pending'] || STATUS_BADGE.pending;
                const projNames = (inv.projects || []).map((p) => p.name).filter(Boolean);
                const expires = inv.expires_at || inv.expiresAt;
                const inviter = inv.invited_by?.email || inv.invited_by?.display_name || inv.created_by_email || null;
                return (
                  <div key={inv.id} className="px-3 py-2.5 hover:bg-[#faf9f4]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-medium text-[#0a0a0a] truncate">
                            {inv.email || <span className="text-[#a3a3a3]">{t('invite.linkOnly', 'link-only invite')}</span>}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${badge.cls}`}>
                            <badge.Icon size={8} />
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-mono text-[#a3a3a3]">{inv.role || 'member'}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#a3a3a3] font-mono flex-wrap">
                          {projNames.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <FolderKanban size={9} />
                              {projNames.join(', ')}
                            </span>
                          )}
                          {expires && (
                            <span>{t('invite.expires', 'Expires')} {new Date(expires).toLocaleDateString()}</span>
                          )}
                          {inviter && (
                            <span>{t('invite.invitedBy', 'by')} {inviter}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {inv.join_url && (
                          <button
                            type="button"
                            title={t('invite.copyLink', 'Copy join link')}
                            onClick={() => handleCopy(inv.id, inv.join_url)}
                            className="rounded p-1.5 text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f3f1ec]"
                          >
                            {copiedId === inv.id ? <Check size={13} className="text-[#16a34a]" /> : <Copy size={13} />}
                          </button>
                        )}
                        {(inv.status || 'pending') === 'pending' && (
                          <>
                            <button
                              type="button"
                              title={t('invite.resend', 'Resend email + extend expiry')}
                              onClick={() => handleResend(inv)}
                              disabled={busyById[inv.id] === 'resend'}
                              className="rounded p-1.5 text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f3f1ec] disabled:opacity-40"
                            >
                              {busyById[inv.id] === 'resend' ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                            </button>
                            <button
                              type="button"
                              title={t('invite.revoke', 'Revoke invitation')}
                              onClick={() => handleRevoke(inv)}
                              disabled={busyById[inv.id] === 'revoke'}
                              className="rounded p-1.5 text-[#a3a3a3] hover:text-[#dc2626] hover:bg-[#fee2e2] disabled:opacity-40"
                            >
                              {busyById[inv.id] === 'revoke' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] text-[#a3a3a3] font-mono">
              {t('invite.oauthNote', 'Invitees join via OAuth → land in {{name}}', { name: org?.name || 'your org' })}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[8px] bg-[#117dff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e6fe0]"
            >
              {t('invite.done', 'Done')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
