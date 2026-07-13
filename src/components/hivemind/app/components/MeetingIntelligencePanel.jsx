import React from 'react';
import { Brain, User, GitBranch, CircleDot, ArrowUpRight, Sparkles, Target, AlertTriangle, TrendingUp, Zap } from 'lucide-react';

const REL = {
  UPDATES:   { label: 'UPDATES',   color: '#b45309', bg: '#fff3e0', bd: '#fde0b8' },
  CONFLICTS: { label: 'CONFLICTS', color: '#dc2626', bg: '#fef2f2', bd: '#fecaca' },
};

// A strategic point + its provenance chips. Tolerates a legacy plain string.
// Each chip names the source memory/meeting the dot was connected from, and
// (when it has a real id) clicks through to that memory.
function SynPoint({ p, onOpen }) {
  const text = typeof p === 'string' ? p : (p?.text || '');
  const sources = (p && Array.isArray(p.sources)) ? p.sources : [];
  return (
    <div className="flex-1">
      <div>{text}</div>
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {sources.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => s.id && onOpen?.(s.id)}
              title={s.when ? `${s.title} · ${s.when}` : s.title}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#faf9f4] border border-[#e3e0db] text-[9px] text-[#737373] max-w-[180px] truncate ${s.id ? 'hover:border-[#117dff]/50 hover:text-[#117dff] cursor-pointer' : 'cursor-default'}`}
            >
              <CircleDot size={8} className="flex-shrink-0" />
              <span className="truncate">{s.title}{s.when ? ` · ${s.when}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MeetingIntelligencePanel({ intelligence, status, onOpenMemory }) {
  if (status === 'pending' || status === 'none') {
    return (
      <div className="bg-white border border-[#117dff]/30 rounded-[12px] p-4 flex items-center gap-2">
        <Brain size={15} className="text-[#117dff] animate-pulse" />
        <span className="text-[12px] text-[#737373]">Cross-referencing your organization's memory…</span>
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
  const { entities = [], continuity = [], open_loops = [], related = [], related_count = 0, synthesis = null } = intelligence;
  const open = (id) => id && onOpenMemory?.(id);
  const syn = synthesis && typeof synthesis === 'object' ? synthesis : null;
  const hasSyn = syn && (syn.headline || syn.strategic_points?.length || syn.whats_changed?.length || syn.risks_opportunities?.length || syn.recommended_focus?.length);

  return (
    <div className="bg-white border border-[#117dff] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(17,125,255,0.08)]">
      <div className="px-4 py-3 border-b border-[#eaf2ff] bg-[#117dff]/[0.04] flex items-center gap-2">
        <Brain size={16} className="text-[#117dff]" />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Strategic Intelligence</div>
          <div className="text-[11px] text-[#737373]">Grounded in your organization · {related_count} related memories cross-referenced</div>
        </div>
      </div>

      {/* SYNTHESIS — the high-level, org-grounded distillation (the star). */}
      {hasSyn && (
        <div className="px-4 py-3.5 border-b border-[#f3f1ec] bg-[#faf9f4]">
          {syn.headline && (
            <div className="flex items-start gap-2 mb-3">
              <Zap size={15} className="text-[#117dff] mt-0.5 shrink-0" />
              <div className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] leading-snug">{syn.headline}</div>
            </div>
          )}
          {syn.strategic_points?.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#737373] mb-1.5">What matters</div>
              <ul className="space-y-2">{syn.strategic_points.map((p, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-[#525252] leading-snug"><span className="text-[#117dff] mt-px">▸</span><SynPoint p={p} onOpen={open} /></li>
              ))}</ul>
            </div>
          )}
          {syn.whats_changed?.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#737373] mb-1.5 flex items-center gap-1"><GitBranch size={11} /> What this changes</div>
              <ul className="space-y-2">{syn.whats_changed.map((c, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-[#525252] leading-snug"><span className="text-[#b45309] mt-px">↻</span><SynPoint p={c} onOpen={open} /></li>
              ))}</ul>
            </div>
          )}
          {syn.risks_opportunities?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {syn.risks_opportunities.map((r, i) => (
                <span key={i} className={`inline-flex items-start gap-1 px-2 py-1 rounded-[6px] text-[11px] leading-snug border ${r.type === 'opportunity' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {r.type === 'opportunity' ? <TrendingUp size={11} className="mt-0.5 shrink-0" /> : <AlertTriangle size={11} className="mt-0.5 shrink-0" />}
                  {r.text}
                </span>
              ))}
            </div>
          )}
          {syn.recommended_focus?.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#737373] mb-1.5 flex items-center gap-1"><Target size={11} /> Recommended focus</div>
              <ul className="space-y-1.5">{syn.recommended_focus.map((f, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-[#0a0a0a] leading-snug"><span className="text-[#117dff] mt-0.5 shrink-0"><ArrowUpRight size={12} /></span>{f}</li>
              ))}</ul>
            </div>
          )}
        </div>
      )}

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
            <button key={i} onClick={() => open(o.progress_memory_id || o.memory_id)} className="w-full text-left flex items-start gap-2 mb-1.5">
              <span className="text-[12px] shrink-0 mt-0.5" style={{ color: o.kind === 'risk' ? '#dc2626' : o.loop_status === 'in_progress' ? '#f59e0b' : '#117dff' }}>{o.kind === 'risk' ? '!' : o.loop_status === 'in_progress' ? '◐' : '☐'}</span>
              <span className="text-[12px] text-[#525252] leading-snug">
                {o.loop_status === 'in_progress' && <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 mr-1.5">in progress</span>}
                {o.text}
                {o.progress && <span className="text-[#b45309]"> — {o.progress}</span>}
                {(o.source_meeting_title || o.age_days != null) && (
                  <span className="text-[#a3a3a3]"> · {o.source_meeting_title ? `from “${o.source_meeting_title}”` : 'earlier'}{o.age_days != null ? `, ${o.age_days}d ago` : ''}{o.owner ? ` · ${o.owner}` : ''}</span>
                )}
              </span>
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
