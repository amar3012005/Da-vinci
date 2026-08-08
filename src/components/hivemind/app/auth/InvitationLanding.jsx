import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, Check, Cloud, Shield, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../shared/api-client';
import { saveInvitationContext } from './invitation-session';

export default function InvitationLanding() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const enterpriseToken = params.get('enterprise_invite') || '';
  const personalToken = params.get('personal_invite') || '';
  const kind = enterpriseToken ? 'enterprise' : personalToken ? 'personal' : null;
  const credential = enterpriseToken || personalToken;
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(kind ? 'loading' : 'invalid');

  useEffect(() => {
    if (!kind || !credential) return;
    let cancelled = false;
    const request = kind === 'enterprise'
      ? apiClient.previewEnterpriseInvitation(credential)
      : apiClient.previewPersonalInvitation(credential);
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
      expires_at: preview?.invitation_expires_at,
    });
    if (!saved) {
      setStatus('storage_unavailable');
      return;
    }
    navigate('/hivemind/login?create=1&invitation=1', { replace: true });
  };

  const isEnterprise = kind === 'enterprise';
  const selfHosted = preview?.hosting_mode === 'self_host';

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-10 font-['Space_Grotesk'] text-[#0a0a0a] sm:py-16">
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-[8px] border border-[#dedfe4] bg-white shadow-[0_24px_70px_rgba(17,24,39,0.08)]">
        <div className="h-1 bg-[#117dff]" />
        <div className="grid md:grid-cols-[1.12fr_0.88fr]">
          <div className="p-7 sm:p-10">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[7px] border border-[#bcd5ff] bg-[#edf4ff]"><Shield size={20} className="text-[#117dff]" /></span>
              <div><p className="text-lg font-bold">HIVEMIND</p><p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#8b8d94]">AI Operating System</p></div>
            </div>

            {status === 'loading' && <div className="mt-14 h-44 animate-pulse rounded-[6px] bg-[#f1f2f4]" aria-label="Checking invitation" />}
            {status === 'invalid' && <div className="mt-12"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-600">Invitation unavailable</p><h1 className="mt-3 text-3xl font-semibold">This invitation cannot be used.</h1><p className="mt-3 text-sm leading-6 text-[#676971]">It may have expired, been revoked, or already been redeemed. Ask your Singulance contact for a new invitation.</p></div>}
            {status === 'storage_unavailable' && <div className="mt-12"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-600">Browser storage unavailable</p><h1 className="mt-3 text-3xl font-semibold">Enable session storage to continue.</h1><p className="mt-3 text-sm leading-6 text-[#676971]">HIVEMIND uses temporary browser storage to carry your verified invitation safely through account setup.</p></div>}
            {status === 'ready' && <>
              <p className="mt-12 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#117dff]">Private invitation</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight">{isEnterprise ? `Build ${preview?.company_name || 'your company'}'s AI workforce.` : 'Your personal HIVEMIND is ready.'}</h1>
              <p className="mt-4 text-sm leading-6 text-[#676971]">{isEnterprise ? 'A company AI Operating System with an AI workforce living inside your own company brain.' : 'A private second brain that connects your knowledge, work, meetings, and agents.'}</p>
              <div className="mt-7 space-y-3 border-y border-[#e4e5e9] py-5 text-sm">
                <p className="flex items-center gap-2"><Check size={15} className="text-[#117dff]" /> <strong>{isEnterprise ? 'Enterprise workspace' : 'Personal workspace'}</strong></p>
                {isEnterprise && <p className="flex items-center gap-2"><Check size={15} className="text-[#117dff]" /> {selfHosted ? 'Self-hosted sovereign infrastructure' : 'Singulance-managed infrastructure'}</p>}
                <p className="flex items-center gap-2"><Check size={15} className="text-[#117dff]" /> Setup choices are secured by this invitation</p>
              </div>
              <button onClick={checkIn} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[#117dff] text-sm font-semibold text-white hover:bg-[#066fe8]">Check in to your workspace <ArrowRight size={16} /></button>
              <p className="mt-3 text-center text-[11px] text-[#8b8d94]">The invitation will be retained only for this browser session.</p>
            </>}
          </div>
          <aside className="flex min-h-72 flex-col justify-between bg-[#101114] p-7 text-white sm:p-9">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#24d2ed]">Access profile</p>
              <div className="mt-8 flex h-14 w-14 items-center justify-center border border-white/15 bg-white/5">{isEnterprise ? <Building2 size={25} /> : <UserRound size={25} />}</div>
              <h2 className="mt-5 text-xl font-semibold">{isEnterprise ? (selfHosted ? 'Enterprise self-hosted' : 'Enterprise managed') : 'Personal'}</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">{isEnterprise ? (selfHosted ? 'Your organization operates its memory infrastructure.' : 'Singulance hosts and operates your workspace.') : 'Designed for individual use and private memory.'}</p>
            </div>
            <div className="mt-10 flex items-center gap-2 border-t border-white/10 pt-5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/45"><Cloud size={13} /> Invitation verified server-side</div>
          </aside>
        </div>
      </section>
    </main>
  );
}
