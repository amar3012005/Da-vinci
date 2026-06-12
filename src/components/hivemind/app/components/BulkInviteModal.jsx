import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, Check, AlertCircle, Copy, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * BulkInviteModal — "Invite your Team" from the top navbar.
 *
 * Paste/type MULTIPLE email addresses (comma / space / newline separated),
 * pick a role, send once. Each invitee gets the branded `team_invite`
 * system email ("{{orgName}} is on HIVEMIND — your admin has invited you")
 * through the same email pipeline as the login welcome mails, with a join
 * link that lands them in the org via OAuth.
 */
export default function BulkInviteModal({ open, onClose, org }) {
  const { t } = useTranslation('dashboard');
  const [raw, setRaw] = useState('');
  const [role, setRole] = useState('member');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Parse the textarea into address chips as the user types.
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

  if (!open) return null;

  const handleSend = async () => {
    if (!org?.id || parsed.valid.length === 0 || sending) return;
    setSending(true);
    setError(null);
    setResults(null);
    try {
      const resp = await apiClient.bulkInvite(org.id, parsed.valid, role);
      setResults(resp);
    } catch (err) {
      setError(err.response?.status === 403
        ? t('invite.adminOnly', 'Only organization admins can send invitations — ask your admin to invite the team.')
        : (err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send invitations'));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setRaw('');
    setResults(null);
    setError(null);
    onClose();
  };

  const statusChip = (r) => {
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-xl rounded-2xl border border-[#e3e0db] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
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

          {!results ? (
            <>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={4}
                placeholder={t('invite.placeholder', 'alice@company.com, bob@company.com\ncarol@company.com …')}
                className="w-full rounded-xl border border-[#e3e0db] bg-[#faf9f4] px-3 py-2.5 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40 font-mono"
              />

              {/* Parsed chips */}
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

              <div className="mt-4 flex items-center justify-between gap-3">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-[8px] border border-[#e3e0db] px-3 py-2 text-sm text-[#0a0a0a] focus:outline-none"
                >
                  <option value="member">{t('invite.roleMember', 'Member')}</option>
                  <option value="viewer">{t('invite.roleViewer', 'Viewer')}</option>
                  <option value="admin">{t('invite.roleAdmin', 'Admin')}</option>
                </select>
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

              <p className="mt-4 text-[11px] text-[#a3a3a3] font-mono">
                {t('invite.footer', 'Each person receives: "{{name}} is on HIVEMIND — your admin has invited you" with a join link. Invitees join via OAuth and land in {{name}}.', { name: org?.name || 'your org' })}
              </p>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-4 py-3 mb-4">
                <p className="text-sm font-semibold text-[#0a0a0a]">
                  {t('invite.resultHeadline', '{{invited}} of {{total}} invited', { invited: results.invited, total: results.total })}
                </p>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(results.results || []).map((r) => (
                  <div key={r.email} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[#0a0a0a] font-mono text-xs">{r.email}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {statusChip(r)}
                      {r.join_url && (
                        <button
                          type="button"
                          title={t('invite.copyLink', 'Copy join link')}
                          onClick={() => navigator.clipboard?.writeText(r.join_url).catch(() => {})}
                          className="rounded p-1 text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f3f1ec]"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setResults(null); setRaw(''); }}
                  className="rounded-[8px] border border-[#e3e0db] px-4 py-2 text-sm font-semibold text-[#525252]"
                >
                  {t('invite.inviteMore', 'Invite more')}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-[8px] bg-[#117dff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e6fe0]"
                >
                  {t('invite.done', 'Done')}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
