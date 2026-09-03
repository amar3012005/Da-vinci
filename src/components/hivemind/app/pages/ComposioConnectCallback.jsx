import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { COMPOSIO_CONNECT_CHANNEL, COMPOSIO_CONNECT_EVENT } from '../shared/connect-continuation';

/**
 * Lands here after Composio OAuth (new tab). Notifies the original chat tab
 * and closes when it can so the user returns to the paused turn.
 */
export default function ComposioConnectCallback() {
  const [params] = useSearchParams();
  const payload = useMemo(() => ({
    type: COMPOSIO_CONNECT_EVENT,
    toolkit: params.get('composio_toolkit') || params.get('toolkit') || '',
    status: params.get('status') || (params.get('connected_account_id') ? 'success' : 'unknown'),
    connectedAccountId: params.get('connected_account_id') || '',
  }), [params]);

  useEffect(() => {
    try {
      window.opener?.postMessage(payload, window.location.origin);
    } catch { /* opener gone */ }
    try {
      const channel = new BroadcastChannel(COMPOSIO_CONNECT_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    } catch { /* BroadcastChannel unsupported */ }
    const timer = window.setTimeout(() => {
      if (window.opener && !window.opener.closed) window.close();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [payload]);

  const ok = payload.status === 'success' || Boolean(payload.connectedAccountId);
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="text-[16px] font-semibold text-[#1a1a17]">
        {ok ? 'Gmail connected' : 'Connection returned'}
      </div>
      <div className="text-[13px] text-[#5f5b54]">
        {ok
          ? 'This tab can close. Continue the request in Singulance.'
          : 'Return to the chat tab and click continue if the banner has not updated.'}
      </div>
    </div>
  );
}
