import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, Check, Cloud, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../shared/api-client';
import { saveInvitationContext } from './invitation-session';
import SingulanceBrand from '../shared/SingulanceBrand';

export default function InvitationLanding() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const enterpriseToken = params.get('enterprise_invite') || '';
  const personalToken = params.get('personal_invite') || '';
  const referralToken = params.get('referral_token') || '';
  const kind = enterpriseToken ? 'enterprise' : personalToken ? 'personal' : referralToken ? 'referral' : null;
  const credential = enterpriseToken || personalToken || referralToken;
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(kind ? 'loading' : 'invalid');

  useEffect(() => {
    if (!kind || !credential) return;
    let cancelled = false;
    const request = kind === 'enterprise'
      ? apiClient.previewEnterpriseInvitation(credential)
      : kind === 'personal'
        ? apiClient.previewPersonalInvitation(credential)
        : apiClient.previewPartnerReferral(credential, true);
    request
      .then(({ invitation }) => {
        if (cancelled) return;
        setPreview(invitation);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('invalid'); });
    return () => { cancelled = true; };
  }, [credential, kind]);

  const checkIn = () => {
    const saved = saveInvitationContext({
      kind,
      credential,
      preview,
      expires_at: preview?.invitation_expires_at || preview?.offer?.expires_at,
    });
    if (!saved) {
      setStatus('storage_unavailable');
      return;
    }
    navigate('/hivemind/login?create=1&invitation=1', { replace: true });
  };

  const isEnterprise = kind === 'enterprise';
  const isReferral = kind === 'referral';
  const referralName = preview?.referrer?.display_name || 'A trusted partner';
  const referralEnterprise = isReferral && preview?.offer?.account_type !== 'personal';
  const selfHosted = preview?.hosting_mode === 'self_host';
  const companyName = preview?.company_name || 'your company';
  const companyHeadline = companyName.toUpperCase();

  return (
    <main className="min-h-screen bg-[#faf9f4] px-4 py-5 font-['Space_Grotesk'] text-[#0a0a0a] sm:px-7 sm:py-10">
      <section className="mx-auto w-full max-w-5xl overflow-hidden border border-[#e3e0db] bg-white shadow-[0_24px_70px_rgba(10,10,10,0.09)]">
        <div className="h-[3px] bg-[#117dff]" />
        <div className="grid min-h-[620px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex flex-col p-7 sm:p-12">
            <div className="flex items-center justify-between border-b border-[#eae7e1] pb-6">
              <div>
                <SingulanceBrand variant="light" markSize={34} />
                <p className="mt-2 pl-[46px] font-mono text-[8px] font-semibold uppercase tracking-[0.28em] text-[#a3a3a3]">HIVEMIND · OPERATING SYSTEM</p>
              </div>
              <span className="font-mono text-[9px] font-semibold tracking-[0.2em] text-[#117dff]">ACCESS / 01</span>
            </div>

            {status === 'loading' && <div className="mt-14 h-44 animate-pulse rounded-[6px] bg-[#f1f2f4]" aria-label="Checking invitation" />}
            {status === 'invalid' && <div className="mt-12"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-600">Invitation unavailable</p><h1 className="mt-3 text-3xl font-semibold">This invitation cannot be used.</h1><p className="mt-3 text-sm leading-6 text-[#676971]">It may have expired, been revoked, or already been redeemed. Ask your Singulance contact for a new invitation.</p></div>}
            {status === 'storage_unavailable' && <div className="mt-12"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-600">Browser storage unavailable</p><h1 className="mt-3 text-3xl font-semibold">Enable session storage to continue.</h1><p className="mt-3 text-sm leading-6 text-[#676971]">HIVEMIND uses temporary browser storage to carry your verified invitation safely through account setup.</p></div>}
            {status === 'ready' && <>
              <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#117dff]">{isReferral ? `Invited by ${referralName}` : isEnterprise ? 'Enterprise invitation' : 'Private invitation'}</p>
              <h1 className="mt-4 max-w-xl text-[36px] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[52px]">{isReferral ? <>AWAKEN YOUR<br />HIVEMIND.</> : isEnterprise ? <>RUN {companyHeadline}<br />AS AN AI COMPANY.</> : 'YOUR HIVEMIND IS READY.'}</h1>
              <p className="mt-6 max-w-md text-[15px] leading-7 text-[#525252]">{isReferral ? (preview?.welcome_message || `${referralName} opened this private HIVEMIND experience for you.`) : isEnterprise ? `${companyName} now has a secure entry point into a company memory and AI workforce that can grow with the people inside it.` : 'A private second brain that connects your knowledge, work, meetings, and agents.'}</p>
              <div className="mt-8 space-y-3 border-y border-[#eae7e1] py-5 text-[13px]">
                <p className="flex items-center gap-2"><Check size={15} className="text-[#117dff]" /> <strong>{isReferral ? `${preview?.offer?.trial_days} days free` : isEnterprise ? 'Enterprise workspace' : 'Personal workspace'}</strong></p>
                {isReferral && <p className="flex items-center gap-2"><Check size={15} className="text-[#117dff]" /> {Number(preview?.offer?.monthly_credits || 0).toLocaleString()} credits every month</p>}
                {isReferral && preview?.offer?.discount?.percent_off && <p className="flex items-center gap-2"><Check size={15} className="text-[#117dff]" /> {preview.offer.discount.percent_off}% off after your trial</p>}
                {isEnterprise && <p className="flex items-center gap-2"><Check size={15} className="text-[#117dff]" /> {selfHosted ? 'Self-hosted sovereign infrastructure' : 'Singulance-managed infrastructure'}</p>}
                <p className="flex items-center gap-2"><Check size={15} className="text-[#117dff]" /> Setup choices are secured by this invitation</p>
              </div>
              <button onClick={checkIn} className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-[#117dff] text-sm font-semibold text-white transition-colors hover:bg-[#0066e0]">Accept {isReferral ? `${referralName}'s invitation` : 'invitation'} <ArrowRight size={16} /></button>
              <p className="mt-3 text-center text-[10px] text-[#a3a3a3]">The invitation will be retained only for this browser session.</p>
            </>}
          </div>
          <aside className="relative flex min-h-72 flex-col justify-between overflow-hidden bg-[#0a0a0a] p-7 text-white sm:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#117dff]/15 blur-3xl" />
            <div>
              <p className="relative font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[#22d3ee]">Access profile</p>
              <div className="relative mt-12 flex h-16 w-16 items-center justify-center border border-white/15 bg-white/[0.04]">{isEnterprise || referralEnterprise ? <Building2 size={29} /> : <UserRound size={29} />}</div>
              <h2 className="relative mt-7 text-[29px] font-semibold leading-tight tracking-[-0.03em]">{isReferral ? `${preview?.offer?.plan || 'Free'} access, prepared for you.` : isEnterprise ? (selfHosted ? 'Enterprise, self-hosted.' : 'Enterprise, managed.') : 'Personal memory.'}</h2>
              <p className="relative mt-4 max-w-sm text-[14px] leading-7 text-white/55">{isEnterprise ? (selfHosted ? 'Your organization operates its memory infrastructure. Your invitation opens the company operating layer.' : 'Singulance hosts and operates your workspace. Your invitation opens the company operating layer.') : 'Designed for individual use and private memory.'}</p>
            </div>
            <div className="relative mt-10 flex items-center gap-2 border-t border-white/10 pt-5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/45"><Cloud size={13} /> Invitation verified server-side</div>
          </aside>
        </div>
      </section>
    </main>
  );
}
