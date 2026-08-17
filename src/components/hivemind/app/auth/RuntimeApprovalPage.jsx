import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Power, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import apiClient from '../shared/api-client';

// Public, unauthenticated page (no ProtectedRoute) — the whole point is
// approving from a phone without a desktop login. Mirrors
// InvitationLanding.jsx's preview-then-act shape: GET on mount never
// mutates anything; only clicking Approve does. A prefetch by an email
// client or security scanner just shows the preview, harmlessly.
export default function RuntimeApprovalPage() {
  const { token } = useParams();
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(token ? 'loading' : 'invalid');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiClient.previewRuntimeApproval(token)
      .then((data) => { if (!cancelled) { setPreview(data); setStatus(data.status); } })
      .catch(() => { if (!cancelled) setStatus('invalid'); });
    return () => { cancelled = true; };
  }, [token]);

  const approve = async () => {
    if (approving) return;
    setApproving(true);
    try {
      const result = await apiClient.approveRuntimeApproval(token);
      setStatus(result.ok ? 'approved' : (result.status || 'invalid'));
    } catch {
      setStatus('invalid');
    } finally {
      setApproving(false);
    }
  };

  const heading = {
    loading: null,
    ready: 'This is what I need your go-ahead on.',
    approved: "Approved — I'm continuing now.",
    used: 'Already handled.',
    expired: 'This link has expired.',
    stale: 'This no longer needs a decision.',
    not_found: 'This link isn\'t valid.',
    invalid: 'This link isn\'t valid.',
  }[status] || 'This link isn\'t valid.';

  const body = {
    approved: 'Thanks — I picked up right where I left off.',
    used: 'This was already approved (or the decision was made another way). Nothing further is needed here.',
    expired: 'For your security these links expire after a while. Check the Runtime terminal in the app for the current status.',
    stale: 'The task this was for has already moved on — completed, or the decision was made elsewhere. Nothing further is needed here.',
    not_found: 'It may have been mistyped, or the underlying task no longer exists.',
    invalid: 'It may have been mistyped, or the underlying task no longer exists.',
  }[status] || null;

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-10 font-['Space_Grotesk'] text-[#0a0a0a] sm:py-16">
      <section className="mx-auto w-full max-w-lg overflow-hidden rounded-[8px] border border-[#dedfe4] bg-white shadow-[0_24px_70px_rgba(17,24,39,0.08)]">
        <div className="h-1 bg-[#171717]" />
        <div className="p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[7px] border border-[#d8d3cc] bg-[#f5f4f0]"><Power size={19} className="text-[#171717]" /></span>
            <div>
              <p className="text-lg font-bold">{preview?.orgName || 'Runtime'}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#8b8d94]">HQ Runtime approval</p>
            </div>
          </div>

          {status === 'loading' && <div className="mt-10 h-32 animate-pulse rounded-[6px] bg-[#f1f2f4]" aria-label="Loading approval" />}

          {status === 'ready' && <>
            <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#171717]">Needs your go-ahead</p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight">{preview?.title}</h1>
            <p className="mt-4 text-sm leading-6 text-[#525252]">{preview?.summary}</p>
            <button
              type="button" onClick={approve} disabled={approving}
              className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[#171717] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#000]"
            >
              <ShieldCheck size={16} /> {approving ? 'Approving…' : 'Approve'}
            </button>
            <p className="mt-3 text-center text-[11px] text-[#8b8d94]">This approves exactly this one checkpoint — nothing broader.</p>
          </>}

          {status === 'approved' && <div className="mt-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf7ee] text-[#1a7f37]"><Check size={22} /></span>
            <h1 className="mt-4 text-2xl font-semibold">{heading}</h1>
            <p className="mt-3 text-sm leading-6 text-[#525252]">{body}</p>
          </div>}

          {['used', 'expired', 'stale', 'not_found', 'invalid'].includes(status) && <div className="mt-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf1ea] text-[#b5590c]"><AlertTriangle size={20} /></span>
            <h1 className="mt-4 text-2xl font-semibold">{heading}</h1>
            <p className="mt-3 text-sm leading-6 text-[#525252]">{body}</p>
          </div>}
        </div>
      </section>
    </main>
  );
}
