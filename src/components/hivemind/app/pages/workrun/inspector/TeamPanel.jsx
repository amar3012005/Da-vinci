import React from 'react';
import AgentMember from '../team/AgentMember';

export default function TeamPanel({ team }) {
  const list = Array.isArray(team) ? team : [];
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-[#0a0a0a]">Active agent</span>
          <span className="text-[11px] text-[#737373]">View all</span>
        </div>
        <div className="rounded-[14px] border border-[#e3e0db] bg-white p-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#eef6d8] flex items-center justify-center text-[11px] text-[#3f6212]">HM</div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[#0a0a0a]">
                Research Agent <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e] ml-1 align-middle" />
              </div>
              <p className="text-[12px] text-[#737373]">Specialized in research, analysis and synthesis.</p>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-[#0a0a0a]">Connected apps</span>
          <span className="text-[11px] text-[#737373]">Manage</span>
        </div>
        <div className="flex gap-2">
          {['G', 'N', 'Gh', 'Sl', '+'].map((k) => (
            <div key={k} className="w-9 h-9 rounded-[12px] border border-[#e3e0db] bg-white text-[11px] flex items-center justify-center text-[#525252]">{k}</div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[13px] font-medium text-[#0a0a0a] mb-1">Scope</div>
        <div className="rounded-[12px] border border-[#e3e0db] px-3 py-2 text-[13px] text-[#171717]">Whole company</div>
        <p className="text-[12px] text-[#a3a3a3] mt-1">Agents can access company knowledge, files, and tools relevant to this workspace.</p>
      </div>
      {list.length ? (
        <div>
          {list.map((m) => (
            <AgentMember key={m.member || m.label} member={m.member || m.label} status={m.status} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
