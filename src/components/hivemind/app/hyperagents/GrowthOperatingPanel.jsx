import React from 'react';
import { ArrowRight, Check, Circle, Loader2, Sparkles } from 'lucide-react';

export default function GrowthOperatingPanel({ baselineReady, baselineRunning, initialPlan, state, loading, running, error, onRunBaseline, onRunInitialPlan }) {
  const planReady = Boolean(initialPlan);
  const rows = [
    { title: 'Initial baseline', detail: baselineReady ? 'Company position captured' : 'Analyse company and connected channels', done: baselineReady },
    { title: 'Initial growth plan', detail: planReady ? initialPlan?.stage?.name || 'Company operating plan ready' : 'Turn the baseline into the first operating stage', done: planReady, active: baselineReady && !planReady },
  ];
  return <section className="mt-4 border-t border-[#d8d3cc] pt-4" aria-label="Company growth setup">
    <div className="flex items-center justify-between"><span className="text-[9px] font-mono uppercase tracking-wider text-[#185bcc]">Company operating setup</span><Sparkles size={12} className="text-[#185bcc]" /></div>
    <div className="mt-3 overflow-hidden rounded-md border border-[#cbdaf3] bg-white">
      {rows.map((row, index) => <div key={row.title} className={`flex gap-2.5 px-3 py-3 ${index ? 'border-t border-[#e0e8f5]' : ''}`}>
        <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${row.done ? 'bg-[#185bcc] text-white' : row.active ? 'border border-[#185bcc] text-[#185bcc]' : 'border border-[#c5ccd8] text-[#a3aab5]'}`}>{row.done ? <Check size={10} strokeWidth={3} /> : running && row.active ? <Loader2 size={10} className="animate-spin" /> : <Circle size={6} fill="currentColor" />}</span>
        <div className="min-w-0"><div className="text-[10.5px] font-semibold text-[#172b52]">{row.title}</div><div className="mt-0.5 text-[9px] leading-4 text-[#70809a]">{row.detail}</div></div>
      </div>)}
    </div>
    {!baselineReady ? <button type="button" onClick={() => onRunBaseline?.('full_all')} disabled={baselineRunning || loading} className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-[#172b52] px-3 text-[10px] font-semibold text-white hover:bg-[#10213f] disabled:opacity-60">{baselineRunning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}{baselineRunning ? 'Analysing company' : 'Analyse initial baseline'}</button> : null}
    {baselineReady && !planReady ? <button type="button" onClick={onRunInitialPlan} disabled={running || loading} className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-[#185bcc] px-3 text-[10px] font-semibold text-white hover:bg-[#124cae] disabled:opacity-60">{running ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}{running ? 'Building growth plan' : 'Create initial growth plan'}</button> : null}
    {planReady && state?.stage ? <div className="mt-2.5 rounded-md bg-[#eaf2ff] px-3 py-2.5"><div className="text-[8px] font-mono uppercase text-[#185bcc]">Current stage</div><div className="mt-1 text-[10px] font-semibold leading-4 text-[#172b52]">{state.stage.name}</div><div className="mt-1 flex items-center gap-1 text-[9px] text-[#46658f]">{state.next_action?.action || 'monitor'} <ArrowRight size={10} /></div></div> : null}
    {error ? <p className="mt-2 text-[9px] leading-4 text-red-700">{error}</p> : null}
  </section>;
}
