import React from 'react';
import AgentMember from './AgentMember';

export default function TeamDrawer({ open, team, onClose }) {
  if (!open) return null;
  const list = Array.isArray(team) ? team : [];
  return (
    <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} role="presentation">
      <div className="absolute right-0 top-0 h-full w-[360px] bg-white border-l border-[#e3e0db] p-4" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="text-[13px] font-medium mb-3">Team</div>
        {list.map((m) => (
          <AgentMember key={m.member || m.label} member={m.member || m.label} status={m.status} />
        ))}
      </div>
    </div>
  );
}
