import React from 'react';
import AgentMember from '../team/AgentMember';

export default function TeamPanel({ team }) {
  const list = Array.isArray(team) ? team : [];
  if (!list.length) return <p className="text-[12px] text-[#a3a3a3]">No team yet.</p>;
  return (
    <div>
      {list.map((m) => (
        <AgentMember key={m.member || m.label} member={m.member || m.label} status={m.status} />
      ))}
    </div>
  );
}
