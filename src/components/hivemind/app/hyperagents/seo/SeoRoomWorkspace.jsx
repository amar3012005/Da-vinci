import React from 'react';
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, Circle, ExternalLink,
  FileSearch, Loader2, Search, Unplug,
} from 'lucide-react';
import { parseSeoAudit } from './SeoOperatingReport';

const DEFAULT_PHASES = [
  { id: 'rendered_baseline', order: 1, phase: 'Confirm the baseline', status: 'current' },
  { id: 'technical_foundation', order: 2, phase: 'Technical foundation', status: 'upcoming' },
  { id: 'measurement_setup', order: 3, phase: 'Connect measurement', status: 'upcoming' },
  { id: 'opportunity_execution', order: 4, phase: 'Execute opportunities', status: 'upcoming' },
  { id: 'continuous_optimization', order: 5, phase: 'Verify and compound', status: 'upcoming' },
];

const cleanHost = (value) => {
  try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return value || 'Company website'; }
};

const scanDate = (value) => {
  if (!value) return 'Not scanned';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not scanned' : date.toLocaleString();
};

export function latestSeoAuditFromTurns(turns = [], liveLines = []) {
  const candidates = [
    ...(Array.isArray(liveLines) ? [...liveLines].reverse() : []),
    ...(Array.isArray(turns) ? [...turns].reverse().flatMap((turn) => [...(turn?.lines || [])].reverse()) : []),
  ];
  for (const line of candidates) {
    const content = typeof line?.content === 'string' ? line.content : '';
    if (!content.includes('```seo_audit')) continue;
    const parsed = parseSeoAudit({ content });
    if (parsed.audit) return parsed.audit;
  }
  return null;
}

export function seoProcedure(audit, running = false) {
  const measured = Array.isArray(audit?.optimization_procedure) && audit.optimization_procedure.length
    ? audit.optimization_procedure : DEFAULT_PHASES;
  if (!running || audit?.optimization_procedure?.length) return measured;
  return measured.map((phase, index) => ({ ...phase, status: index === 0 ? 'current' : 'upcoming' }));
}

function suggestedTasks(audit, website) {
  const target = website || 'the company website';
  const stage = audit?.maturity?.stage || 'assessment_incomplete';
  const tasks = {
    assessment_incomplete: [
      ['Inspect site architecture', `Inspect ${target} using rendered evidence. Map templates, crawl depth, internal links, orphan candidates, robots.txt, and sitemaps. Return prioritized architecture decisions.`],
      ['Establish measurement', `Define the SEO measurement baseline for ${target}. Separate currently connected evidence from missing Search Console, analytics, and field-performance access.`],
      ['Find the first opportunities', `Using verified company context and rendered website evidence for ${target}, identify the first credible technical, content, and internal-link opportunities without inventing search demand.`],
    ],
    technical_foundation: [
      ['Fix technical blockers', `Turn the current SEO audit for ${target} into an implementation-ready technical fix plan. Group recurring defects by template, assign owners, and define verification for every fix.`],
      ['Repair page templates', `Analyze recurring template-level SEO defects on ${target}. Specify the shared code or content change, affected URLs, rollout order, and rendered rescan checks.`],
      ['Strengthen internal links', `Create an evidence-backed internal-link plan for ${target}. Use the measured page graph, crawl depth, inlinks, and orphan candidates; provide exact source and destination page recommendations.`],
    ],
    measurement_setup: [
      ['Define the search baseline', `Create the measurement contract for ${target}: Search Console property, query and landing-page baselines, clicks, impressions, CTR, position, review cadence, and decision thresholds.`],
      ['Prioritize existing pages', `Review the rendered pages already measured for ${target}. Prioritize which existing pages to improve first using technical evidence, company relevance, and implementation effort.`],
      ['Build the next 30 days', `Build a 30-day SEO operating plan for ${target} from the current measured stage. Include owners, dependencies, releases, rescans, and the evidence required to advance stages.`],
    ],
    opportunity_execution: [
      ['Prioritize search demand', `Rank the current Search Console opportunities for ${target} by business relevance, evidence confidence, expected impact, and effort. Recommend the first execution batch.`],
      ['Create page briefs', `Create implementation-ready SEO briefs for the highest-priority opportunities on ${target}. Include intent, audience need, page role, structure, internal links, evidence, and measurement.`],
      ['Plan the release sequence', `Sequence the approved technical, content, and architecture changes for ${target}. Include owners, release dates, dependencies, and before-and-after measurements.`],
    ],
    continuous_optimization: [
      ['Review SEO movement', `Compare the latest verified SEO evidence for ${target} with the previous baseline. Explain material movement, regressions, confidence, and the next intervention.`],
      ['Find new opportunities', `Use current Search Console and rendered crawl evidence for ${target} to identify newly emerging opportunities without repeating completed work.`],
      ['Run the next cycle', `Design the next SEO optimization cycle for ${target}. Preserve verified learnings, prioritize the next changes, and define release and measurement gates.`],
    ],
  };
  return tasks[stage] || tasks.assessment_incomplete;
}

function PhaseMark({ status, running }) {
  if (status === 'complete') return <CheckCircle2 size={13} className="text-[#047857]" />;
  if (status === 'current' && running) return <Loader2 size={13} className="animate-spin text-[#047857]" />;
  return <Circle size={13} className={status === 'current' ? 'fill-[#047857] text-[#047857]' : 'text-[#aaa49c]'} />;
}

export function SeoRoomBanner({ audit, website, connection, running, busy, onRun, onConnect }) {
  const phases = seoProcedure(audit, running);
  const current = audit?.maturity || {
    label: running ? 'Assessing website' : 'Not assessed',
    rationale: running ? 'The Room is assembling rendered website evidence.' : 'Run a rendered audit to establish the website baseline.',
    stage_number: 0,
    stage_count: 4,
  };
  const identityConnected = Boolean(connection?.connected);
  const connected = Boolean(audit?.search_console?.status === 'connected'
    || (identityConnected && connection?.property_selected));
  const tasks = suggestedTasks(audit, website);

  return <section className="shrink-0 border-b border-[#bed9ce] bg-[#f0f8f4] px-4 py-4" aria-label="SEO Intelligence workspace">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono uppercase text-[#047857]"><Search size={13} /> SEO Intelligence <span className="text-[#8a857f]">{cleanHost(website)}</span></div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="text-[19px] font-semibold text-[#171717]">{current.label}</h2><span className="text-[9px] font-mono uppercase text-[#77716a]">Stage {current.stage_number} / {current.stage_count}</span></div>
        <p className="mt-1 max-w-3xl text-[11px] leading-5 text-[#5f5a54]">{current.rationale}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!connected && <button type="button" onClick={onConnect} className="inline-flex h-8 items-center gap-1.5 border border-[#9bc9b5] bg-white px-3 text-[10px] font-semibold text-[#047857] hover:bg-[#e7f6ef]"><Unplug size={12} /> {identityConnected ? 'Select Search Console property' : 'Connect Search Console'}</button>}
        <button type="button" disabled={busy || running} onClick={() => onRun(`Run a fresh rendered SEO audit of ${website || 'the company website'}. Determine the current SEO stage from measured evidence, have the specialists debate priorities, and produce the complete SEO operating report and optimization procedure.`)} className="inline-flex h-8 items-center gap-1.5 bg-[#171717] px-3 text-[10px] font-semibold text-white disabled:bg-[#aaa49c]">
          {running ? <Loader2 size={12} className="animate-spin" /> : <FileSearch size={12} />}{running ? 'Audit running' : audit ? 'Rescan website' : 'Run SEO audit'}
        </button>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-px border-y border-[#c9ded5] bg-[#c9ded5] sm:grid-cols-5">
      {phases.map((phase) => <div key={phase.id} className="flex min-h-[46px] items-center gap-2 bg-[#f0f8f4] px-3 py-2">
        <PhaseMark status={phase.status} running={running} />
        <div className="min-w-0"><div className="text-[8px] font-mono uppercase text-[#77716a]">{phase.status}</div><div className="truncate text-[10px] font-semibold text-[#343434]">{phase.phase}</div></div>
      </div>)}
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-2">
      {tasks.map(([label, prompt]) => <button key={label} type="button" disabled={busy} onClick={() => onRun(prompt)} className="inline-flex h-8 items-center gap-1.5 border border-[#c9ded5] bg-white px-3 text-[10px] font-medium text-[#343434] hover:border-[#6eaa91] hover:text-[#047857] disabled:opacity-50">{label}<ArrowUpRight size={11} /></button>)}
      <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-mono uppercase text-[#77716a]">
        <span>{audit?.coverage?.pages_scanned || 0} pages</span>
        <span>{audit?.templates?.length || 0} templates</span>
        <span>{connected ? 'Search Console connected' : 'Search Console not connected'}</span>
        <span>{scanDate(audit?.scanned_at)}</span>
        {website && <a href={website} target="_blank" rel="noreferrer" title="Open website" className="inline-flex items-center gap-1 text-[#047857] hover:underline">Open site <ExternalLink size={10} /></a>}
      </div>
    </div>
  </section>;
}

export function SeoRoomProgress({ audit, connection, running, busy, onRun, onConnect }) {
  const phases = seoProcedure(audit, running);
  const currentPhase = phases.find((phase) => phase.status === 'current') || phases[phases.length - 1];
  const identityConnected = Boolean(connection?.connected);
  const connected = Boolean(audit?.search_console?.status === 'connected'
    || (identityConnected && connection?.property_selected));
  const blockers = audit?.maturity?.blockers || (!audit ? ['A rendered baseline has not been completed'] : []);
  const currentAction = currentPhase?.actions?.[0] || `Continue the ${currentPhase?.phase || 'SEO assessment'} stage using the latest measured evidence.`;

  return <section className="mt-4 border-t border-[#c9ded5] pt-4" aria-label="SEO Intelligence progress">
    <div className="text-[9px] font-mono uppercase text-[#047857]">Website progress</div>
    <div className="mt-3 space-y-3">
      {phases.map((phase) => <div key={phase.id} className="flex items-start gap-2">
        <span className="mt-0.5"><PhaseMark status={phase.status} running={running} /></span>
        <div className="min-w-0"><div className={`text-[10px] font-semibold leading-4 ${phase.status === 'current' ? 'text-[#047857]' : 'text-[#343434]'}`}>{phase.phase}</div><div className="text-[8.5px] font-mono uppercase text-[#8a857f]">{phase.status}</div></div>
      </div>)}
    </div>
    {blockers.length > 0 && <div className="mt-4 border-t border-[#dedbd5] pt-3"><div className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-[#77716a]"><AlertTriangle size={11} /> Current blockers</div><div className="mt-2 space-y-1.5">{blockers.slice(0, 3).map((blocker) => <div key={blocker} className="text-[9.5px] leading-4 text-[#5f5a54]">{blocker}</div>)}</div></div>}
    <div className="mt-4 border-t border-[#dedbd5] pt-3">
      <div className="text-[9px] font-mono uppercase text-[#77716a]">Evidence providers</div>
      <div className="mt-2 flex items-center justify-between text-[9.5px]"><span>Rendered crawler</span><span className={audit?.evidence_quality?.level === 'rendered' ? 'text-[#047857]' : 'text-[#8a857f]'}>{audit?.evidence_quality?.level === 'rendered' ? 'Ready' : 'Pending'}</span></div>
      <div className="mt-1.5 flex items-center justify-between text-[9.5px]"><span>Search Console</span><span className={connected ? 'text-[#047857]' : 'text-[#8a857f]'}>{connected ? 'Connected' : 'Not connected'}</span></div>
    </div>
    {!connected && audit?.maturity?.stage === 'measurement_setup'
      ? <button type="button" onClick={onConnect} className="mt-4 h-8 w-full bg-[#047857] px-3 text-[10px] font-semibold text-white">{identityConnected ? 'Select Search Console property' : 'Connect Search Console'}</button>
      : <button type="button" disabled={busy} onClick={() => onRun(currentAction)} className="mt-4 h-8 w-full bg-[#171717] px-3 text-[10px] font-semibold text-white disabled:bg-[#aaa49c]">Continue current stage</button>}
  </section>;
}
