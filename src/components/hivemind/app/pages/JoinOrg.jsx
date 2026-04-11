import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Hexagon } from 'lucide-react';
import apiClient from '../shared/api-client';

export default function JoinOrg() {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', org: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiClient.acceptInvite(token);
        if (cancelled) return;
        setState({ loading: false, error: '', org: data.organization || null });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          error: err.response?.data?.error || err.message,
          org: null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-[#e3e0db] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
            <Hexagon size={20} className="text-[#117dff]" />
          </div>
          <span className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">HIVEMIND</span>
        </div>

        {state.loading ? (
          <>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-2">Joining workspace</h1>
            <p className="text-sm text-[#525252]">Accepting invite for <span className="font-mono">{slug}</span>…</p>
          </>
        ) : state.error ? (
          <>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-2">Invite could not be accepted</h1>
            <p className="text-sm text-[#525252] mb-6">{state.error}</p>
            <button
              type="button"
              onClick={() => navigate('/hivemind/app/overview')}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Return to overview
              <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#16a34a]/10 text-[#16a34a] mb-4">
              <CheckCircle2 size={22} />
            </div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-[#0a0a0a] mb-2">Workspace joined</h1>
            <p className="text-sm text-[#525252] mb-6">
              You now have access to <span className="font-semibold text-[#0a0a0a]">{state.org?.name || slug}</span>.
            </p>
            <button
              type="button"
              onClick={() => navigate('/hivemind/app/overview')}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Open workspace
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
