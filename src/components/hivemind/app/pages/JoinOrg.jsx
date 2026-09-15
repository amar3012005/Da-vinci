import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FolderKanban, Hexagon, Users, XCircle, Loader2 } from 'lucide-react';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';

export default function JoinOrg() {
  const { t } = useTranslation('dashboard');
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const {
    refresh: refreshAuth,
    isAuthenticated,
    loading: authLoading,
    login,
  } = useAuth() || {};

  // Phases: loading | consent | accepting | success | declined | error
  const [phase, setPhase] = useState('loading');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [acceptedOrg, setAcceptedOrg] = useState(null);

  // Fetch preview (does NOT accept).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.getInvitePreview(token);
        if (cancelled) return;
        if (data.status === 'accepted') {
          // already accepted — bounce in
          try { await (refreshAuth ? refreshAuth() : Promise.resolve()); } catch {}
          navigate('/hivemind/app/overview', { replace: true });
          return;
        }
        if (data.status === 'expired' || data.status === 'revoked') {
          setError(t('joinOrg.inviteStatus', 'Invite {{status}}', { status: data.status }));
          setPhase('error');
          return;
        }
        setPreview(data);
        setPhase('consent');
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error || err.message);
        setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [token, navigate, refreshAuth, t]);

  async function handleAccept() {
    if (!isAuthenticated) {
      // Keep the invite token in the server-owned OAuth state.  The control
      // plane validates it before and after OAuth, then returns here so this
      // explicit consent action remains the sole membership mutation.
      const returnTo = `${window.location.origin}${window.location.pathname}`;
      login?.({ provider: 'google', returnTo, workspaceInviteToken: token });
      return;
    }
    setPhase('accepting');
    try {
      const data = await apiClient.acceptInvite(token);
      try { await (refreshAuth ? refreshAuth() : Promise.resolve()); } catch {}
      setAcceptedOrg(data.organization || null);
      setPhase('success');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setPhase('error');
    }
  }

  async function handleDecline() {
    try { await apiClient.declineInvite(token); } catch { /* best-effort */ }
    setPhase('declined');
  }

  const projects = preview?.projects || [];
  const teams    = preview?.teams    || [];
  const orgName  = preview?.organization?.name || slug;

  return (
    <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-[#e3e0db] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
            <Hexagon size={20} className="text-[#117dff]" />
          </div>
          <span className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">HIVEMIND</span>
        </div>

        {phase === 'loading' && (
          <>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-2">{t('joinOrg.loadingInvite', 'Loading invite')}</h1>
            <p className="text-sm text-[#525252]">{t('joinOrg.fetchingDetails', 'Fetching details for')} <span className="font-mono">{slug}</span>…</p>
          </>
        )}

        {phase === 'consent' && preview && (
          <>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-2">
              {t('joinOrg.invitedTo', "You're invited to {{orgName}}", { orgName })}
            </h1>
            {preview.inviter && (
              <p className="text-sm text-[#525252] mb-5">
                {t('joinOrg.invitedBy', 'Invited by')} <span className="font-medium text-[#0a0a0a]">
                  {preview.inviter.displayName || preview.inviter.email}
                </span>
              </p>
            )}

            {projects.length > 0 && (
              <section className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2">
                  {t('joinOrg.projectsYoullJoin', "Projects you'll join")}
                </div>
                <div className="space-y-2">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-start gap-2 p-3 rounded-[8px] border border-[#e3e0db] bg-[#faf9f4]">
                      <FolderKanban size={14} className="text-emerald-700 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#0a0a0a]">{p.name}</div>
                        {p.description && (
                          <div className="text-[12px] text-[#525252] mt-0.5">{p.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {teams.length > 0 && (
              <section className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2">
                  {t('joinOrg.teams', 'Teams')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {teams.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-[11px] text-blue-700">
                      <Users size={10} /> {t.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-6 p-3 rounded-[8px] bg-[#fafaf9] border border-[#eae7e1] text-[12px] text-[#525252]">
              {t('joinOrg.acceptDisclaimer', projects.length > 0
                ? "By accepting, you'll get access to the projects above."
                : "By accepting, you'll join this organization's shared HIVEMIND workspace.")}
            </section>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAccept}
                disabled={authLoading}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0066e0] disabled:cursor-wait disabled:opacity-60"
              >
                {authLoading
                  ? t('joinOrg.checkingAccount', 'Checking your account…')
                  : isAuthenticated
                    ? t('joinOrg.acceptAndJoin', 'Accept and join')
                    : t('joinOrg.signInToJoin', 'Sign in to join')}
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={handleDecline}
                className="rounded-[8px] border border-[#e3e0db] bg-white px-4 py-2.5 text-sm font-semibold text-[#525252] hover:bg-[#faf9f4]"
              >
                {t('joinOrg.decline', 'Decline')}
              </button>
            </div>
          </>
        )}

        {phase === 'accepting' && (
          <>
            <Loader2 size={22} className="animate-spin text-[#117dff] mb-3" />
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-2">{t('joinOrg.joining', 'Joining…')}</h1>
            <p className="text-sm text-[#525252]">{t('joinOrg.provisioningAccess', 'Provisioning access to projects.')}</p>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#16a34a]/10 text-[#16a34a] mb-4">
              <CheckCircle2 size={22} />
            </div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-2">{t('joinOrg.youreIn', "You're in")}</h1>
            <p className="text-sm text-[#525252] mb-6">
              {t('joinOrg.welcomeTo', 'Welcome to')} <span className="font-semibold text-[#0a0a0a]">{acceptedOrg?.name || orgName}</span>.
            </p>
            <button
              type="button"
              onClick={() => navigate('/hivemind/app/overview')}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t('joinOrg.openWorkspace', 'Open workspace')}
              <ArrowRight size={16} />
            </button>
          </>
        )}

        {phase === 'declined' && (
          <>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#737373]/10 text-[#737373] mb-4">
              <XCircle size={22} />
            </div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-2">{t('joinOrg.inviteDeclined', 'Invite declined')}</h1>
            <p className="text-sm text-[#525252]">{t('joinOrg.canCloseTab', 'You can close this tab.')}</p>
          </>
        )}

        {phase === 'error' && (
          <>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-2">{t('joinOrg.inviteCouldNotBeOpened', 'Invite could not be opened')}</h1>
            <p className="text-sm text-[#525252] mb-6">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/hivemind/app/overview')}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t('joinOrg.returnToOverview', 'Return to overview')}
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
