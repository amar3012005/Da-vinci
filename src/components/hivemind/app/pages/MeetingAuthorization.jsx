import React, { useEffect, useState } from 'react';
import apiClient from '../shared/api-client';

export default function MeetingAuthorization() {
  const [exchangeId, setExchangeId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [emailHint, setEmailHint] = useState('');
  const [otp, setOtp] = useState('');
  const [decisionToken, setDecisionToken] = useState(null);
  const [purposes, setPurposes] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
    window.history.replaceState(null, '', window.location.pathname);
    if (!token) { setError('This invitation link is missing or expired.'); setState('error'); return; }
    apiClient.core.post('/v1/public/meeting-authorization/exchange', { token }, { suppressServiceError: true })
      .then(({ data }) => { setExchangeId(data.exchange_id); setNotice(data.notice); setPurposes(data.notice?.purposes || []); setEmailHint(data.email_hint || ''); setState('otp'); })
      .catch(() => { setError('This invitation link is invalid, expired, or already used.'); setState('error'); });
  }, []);

  const verify = async () => {
    setError('');
    try {
      const { data } = await apiClient.core.post('/v1/public/meeting-authorization/verify', { exchange_id: exchangeId, otp }, { suppressServiceError: true });
      setDecisionToken(data.decision_token); setState('decision');
    } catch { setError('The verification code is invalid or expired.'); }
  };
  const decide = async (decision) => {
    setError('');
    try {
      await apiClient.core.post('/v1/public/meeting-authorization/decision', { exchange_id: exchangeId, decision_token: decisionToken, decision, purposes }, { suppressServiceError: true });
      setState(decision === 'accepted' ? 'accepted' : 'declined');
    } catch (e) { setError(e?.response?.data?.error || 'The decision could not be recorded.'); }
  };

  return <main className="min-h-screen bg-[#fbfaf7] px-4 py-10 text-[#0a0a0a]">
    <section className="mx-auto max-w-xl rounded-2xl border border-[#ddd9d1] bg-white p-6 shadow-sm">
      <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#117dff]">SINGULANCE · Meeting privacy</div>
      <h1 className="mt-3 text-2xl font-semibold">Recording authorization</h1>
      {state === 'loading' && <p className="mt-5 text-sm text-[#737373]">Validating the invitation…</p>}
      {notice && <div className="mt-5 space-y-3 text-sm leading-6">
        <h2 className="font-semibold">{notice.title}</h2><p className="whitespace-pre-wrap text-[#525252]">{notice.body}</p>
        <dl className="grid grid-cols-[130px_1fr] gap-2 border-t pt-4 text-xs"><dt>Controller</dt><dd>{notice.controller}</dd><dt>Privacy contact</dt><dd>{notice.privacy_contact}</dd><dt>Jurisdiction</dt><dd>{notice.jurisdiction}</dd></dl>
      </div>}
      {state === 'otp' && <div className="mt-6"><p className="text-sm text-[#525252]">Enter the one-time code sent to {emailHint}.</p><div className="mt-3 flex gap-2"><input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="min-w-0 flex-1 rounded-lg border px-3 py-2" /><button onClick={verify} disabled={otp.length !== 6} className="rounded-lg bg-[#117dff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Verify</button></div></div>}
      {state === 'decision' && <div className="mt-6"><p className="text-sm font-semibold">Choose the purposes you authorize.</p><div className="mt-3 space-y-2">{(notice?.purposes || []).map((purpose) => { const required = purpose === 'record_audio' || purpose === 'transcribe_and_summarize'; return <label key={purpose} className="flex gap-2 text-sm"><input type="checkbox" checked={purposes.includes(purpose)} disabled={required} onChange={(e) => setPurposes((current) => e.target.checked ? [...new Set([...current, purpose])] : current.filter((item) => item !== purpose))} />{purpose.replaceAll('_', ' ')}{required ? ' (required)' : ' (optional)'}</label>; })}</div><div className="mt-5 flex gap-2"><button onClick={() => decide('declined')} className="rounded-lg border px-4 py-2 text-sm font-semibold">Decline</button><button onClick={() => decide('accepted')} className="rounded-lg bg-[#117dff] px-4 py-2 text-sm font-semibold text-white">Authorize recording</button></div></div>}
      {state === 'accepted' && <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Your authorization was recorded. You may close this page.</p>}
      {state === 'declined' && <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Your decision was recorded. Recording remains blocked.</p>}
      {(state === 'error' || error) && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
    </section>
  </main>;
}
