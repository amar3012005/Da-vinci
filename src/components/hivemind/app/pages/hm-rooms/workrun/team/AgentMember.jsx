import React from 'react';

export default function AgentMember({ member, status }) {
  return (
    <div className="flex items-center justify-between text-[13px] py-1">
      <span>{member}</span>
      <span className="text-[11px] text-[#737373]">{status || 'working'}</span>
    </div>
  );
}
