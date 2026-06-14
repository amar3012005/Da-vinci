import React from 'react';
import { Brain, User, GitBranch, CircleDot, ArrowUpRight, Sparkles } from 'lucide-react';

const REL = {
  UPDATES:   { label: 'UPDATES',   color: '#b45309', bg: '#fff3e0', bd: '#fde0b8' },
  CONFLICTS: { label: 'CONFLICTS', color: '#dc2626', bg: '#fef2f2', bd: '#fecaca' },
};

export default function MeetingIntelligencePanel({ intelligence, status, onOpenMemory }) {
  if (status === 'pending' || status === 'none') {
    return (
      <div className="bg-white border border-[#117dff]/30 rounded-[12px] p-4 flex items-center gap-2">
        <Brain size={15} className="text-[#117dff] animate-pulse" />
        <span className="text-[12px] text-[#737373]">Cross-referencing your memory…</span>
      </div>
    );
  }
  if (status === 'empty' || !intelligence) {
    return (
      <div className="bg-white border border-[#e3e0db] rounded-[12px] p-3 flex items-center gap-2">
        <Brain size={14} className="text-[#a3a3a3]" />
        <span className="text-[12px] text-[#a3a3a3]">Nothing related in your memory yet.</span>
      </div>
    );
  }
  const { entities = [], continuity = [], open_loops = [], related = [], related_count = 0 } = intelligence;
  const open = (id) => id && onOpenMemory?.(id);
  return (
    <div className="bg-white border border-[#117dff] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(17,125,255,0.08)]">
      <div className="px-4 py-3 border-b border-[#eaf2ff] bg-gradient-to-br from-[#117dff]/[0.04] to-white flex items-center gap-2">
        <Brain size={16} className="text-[#117dff]" />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">What HIVEMIND already knows</div>
          <div className="text-[11px] text-[#737373]">{related_count} related memories cross-referenced</div>
        </div>
      </div>

      {entities.length > 0 && (
        <div className="px-4 py-3 border-b border-[#f3f1ec]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#737373] mb-2 flex items-center gap-1"><User size={11} /> Who &amp; what's involved</div>
          {entities.map((e, i) => (
            <button key={i} onClick={() => open(e.memory_ids?.[0])} className="w-full text-left flex items-start gap-2 p-2 rounded-[8px] hover:bg-[#faf9f4] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-[#0a0a0a]">{e.name} <span className="text-[10px] font-normal text-[#a3a3a3]">· {e.kind} · {e.memory_count} memories</span></div>
                <div className="text-[12px] text-[#525252] leading-snug">{e.brief}</div>
              </div>
              <ArrowUpRight size={12} className="text-[#a3a3a3] mt-0.5 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {continuity.length > 0 && (
        <div className="px-4 py-3 border-b border-[#f3f1ec]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#737373] mb-2 flex items-center gap-1"><GitBranch size={11} /> How this connects to past decisions</div>
          {continuity.map((c, i) => {
            const r = REL[c.relation] || REL.UPDATES;
            return (
              <button key={i} onClick={() => open(c.prior_memory_id)} className="w-full text-left flex items-start gap-2 mb-1.5">
                <span className="text-[9px] font-bold rounded px-1.5 py-0.5 shrink-0 mt-0.5" style={{ color: r.color, background: r.bg, border: `1px solid ${r.bd}` }}>{r.label}</span>
                <span className="text-[12px] text-[#525252] leading-snug"><b>"{c.decision}"</b> — {c.reason} <span className="text-[#a3a3a3]">(prior: {c.prior})</span></span>
              </button>
            );
          })}
        </div>
      )}

      {open_loops.length > 0 && (
        <div className="px-4 py-3 border-b border-[#f3f1ec]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#737373] mb-2 flex items-center gap-1"><CircleDot size={11} /> Still-open from before</div>
          {open_loops.map((o, i) => (
            <button key={i} onClick={() => open(o.memory_id)} className="w-full text-left flex items-start gap-2 mb-1.5">
              <span className="text-[12px] shrink-0 mt-0.5" style={{ color: o.kind === 'risk' ? '#dc2626' : '#117dff' }}>{o.kind === 'risk' ? '!' : '☐'}</span>
              <span className="text-[12px] text-[#525252] leading-snug">{o.text}</span>
            </button>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#737373] mb-2 flex items-center gap-1"><Sparkles size={11} /> Related from your memory</div>
          {related.map((r, i) => (
            <button key={i} onClick={() => open(r.memory_id)} className="w-full text-left flex items-start gap-2 p-2 rounded-[8px] hover:bg-[#faf9f4] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-[#0a0a0a] truncate">{r.title}</div>
                {r.snippet && <div className="text-[11px] text-[#737373] leading-snug line-clamp-2">{r.snippet}</div>}
              </div>
              <ArrowUpRight size={12} className="text-[#a3a3a3] mt-0.5 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
