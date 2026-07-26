import React from 'react';
import ActionCard from './ActionCard';

export default function ChannelTab({ channel, actions, onApprove, onRetry, onReconcile, busy }) {
  const rows = actions.filter((action) => action.channel === channel);
  if (!rows.length) return <div className="py-12 text-center text-[12px] text-[#8a847d]">No actions were generated for this channel.</div>;
  return <div>{rows.map((action) => <ActionCard key={action.id} action={action} onApprove={onApprove} onRetry={onRetry} onReconcile={onReconcile} busy={busy} />)}</div>;
}
