import React from 'react';
import { Laptop, ExternalLink } from 'lucide-react';

export default function ComputerPanel({ computer }) {
  return (
    <div className="space-y-3">
      {computer ? (
        <div className="space-y-3 text-[12px] text-[#525252]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#0a0a0a]"><Laptop size={15} />{computer.label || 'Computer run'}</div>
          {computer.status ? <div>Status · {computer.status}</div> : null}
          {computer.computer_run_id ? <div className="break-all font-mono text-[11px]">Run · {computer.computer_run_id}</div> : null}
          {computer.objective ? <div>Objective · {computer.objective}</div> : null}
          {(computer.evidence || []).map((item, i) => item?.url || item?.screenshot_url ? (
            <a key={item.id || i} href={item.url || item.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#117dff]">Open evidence <ExternalLink size={12} /></a>
          ) : <pre key={item.id || i} className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-[#e3e0db] bg-[#faf9f4] p-2">{typeof item === 'string' ? item : JSON.stringify(item, null, 2)}</pre>)}
          {computer.status === 'human' || computer.status === 'needs_human' ? <p className="rounded-[6px] bg-[#fff7ed] p-2 text-[#9a3412]">Human help is required. Complete the requested step in the computer session, then continue the agent turn.</p> : null}
        </div>
      ) : (
        <button type="button" className="w-full text-left rounded-[14px] bg-[#f4fbe8] border border-[#e3efc8] p-3 flex items-start gap-3">
          <Laptop size={18} className="text-[#3f6212] mt-0.5" />
          <div>
            <div className="text-[13px] font-medium text-[#0a0a0a]">
              Computer use <span className="ml-1 text-[9px] uppercase tracking-wide text-[#65a30d]">Beta</span>
            </div>
            <p className="text-[12px] text-[#525252] mt-0.5">Allow agents to use a computer and take actions in the environment.</p>
          </div>
        </button>
      )}
    </div>
  );
}
