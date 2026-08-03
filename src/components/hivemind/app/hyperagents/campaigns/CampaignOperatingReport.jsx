import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clipboard,
  Compass,
  FileText,
  Gauge,
  Lightbulb,
  Layers3,
  Megaphone,
  RadioTower,
  Rocket,
  ShieldCheck,
  Target,
  UsersRound,
} from 'lucide-react';
import { CHANNEL_NAMES } from './channel-catalog';

const COLORS = {
  ink: '#191919', muted: '#68635d', line: '#dedbd5', paper: '#fbfaf7',
  green: '#176b57', blue: '#245f89', gold: '#8a6418', red: '#9b3c35',
};

const asArray = (value) => Array.isArray(value)
  ? value.filter((item) => item != null && item !== '')
  : (value == null || value === '' ? [] : [value]);
const readable = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const channelName = (value) => CHANNEL_NAMES[String(value || '').toLowerCase()] || readable(value);

const textFrom = (value, keys = []) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  for (const key of keys) if (value[key] != null && value[key] !== '') return String(value[key]);
  return '';
};

function LegacyContent({ content }) {
  return String(content || '').split(/\n{2,}/).map((block, index) => {
    const heading = block.match(/^#{1,3}\s+(.+)$/m);
    const body = heading ? block.replace(heading[0], '').trim() : block.trim();
    return <div key={`${heading?.[1] || 'paragraph'}-${index}`} className="mb-4 last:mb-0">
      {heading ? <h3 className="mb-1.5 text-[13px] font-semibold">{heading[1]}</h3> : null}
      {body ? <p className="whitespace-pre-wrap">{body.replace(/\*\*/g, '')}</p> : null}
    </div>;
  });
}

function parseBundle(report) {
  const direct = report?.bundle || report?.campaignBundle || report?.plan?.bundle;
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;
  if (report && typeof report === 'object' && (report.actions || report.content_pillars || report.strategy)) return report;
  const content = String(report?.content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (!content.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

function normalizeAudience(audience) {
  if (typeof audience === 'string') return { rationale: audience, segments: [], safetyNotes: [] };
  return {
    rationale: textFrom(audience, ['rationale', 'summary', 'description']),
    segments: asArray(audience?.segments || audience?.personas || audience?.targets).map((segment) => ({
      title: textFrom(segment, ['name', 'segment', 'title', 'label']) || String(segment),
      detail: textFrom(segment, ['rationale', 'description', 'pain', 'need']),
    })),
    safetyNotes: asArray(audience?.safety_notes || audience?.exclusions),
  };
}

function normalizeAction(action, index) {
  const payload = action?.payload && typeof action.payload === 'object' ? action.payload : {};
  const creative = action?.creative_brief && typeof action.creative_brief === 'object' ? action.creative_brief : {};
  return {
    id: String(action?.id || `action-${index + 1}`),
    channel: channelName(action?.channel || action?.type || 'Campaign'),
    channelId: String(action?.channel || action?.type || 'campaign').toLowerCase(),
    title: textFrom(action, ['title', 'name']) || `Campaign action ${index + 1}`,
    format: readable(action?.format || payload?.format || ''),
    finalCopy: textFrom(action, ['final_copy', 'copy', 'body', 'text']) || textFrom(payload, ['text', 'body', 'opening', 'message']),
    subject: textFrom(payload, ['subject']),
    recipient: textFrom(payload, ['recipient_name', 'to', 'audience']),
    rationale: textFrom(action, ['rationale', 'purpose']),
    date: textFrom(action, ['scheduled_at', 'publish_at', 'date', 'scheduledAt']),
    offset: Number.isFinite(action?.scheduled_offset_minutes) ? action.scheduled_offset_minutes : null,
    creativeRequired: creative.required === true,
    creativeConcept: textFrom(creative, ['objective', 'subject', 'generation_prompt', 'concept', 'description', 'direction']),
    claimStatus: String(action?.claim_status || '').toLowerCase(),
    evidenceIds: asArray(action?.evidence_ids).map(String),
    evidence: asArray(action?.evidence),
    hypothesisId: String(action?.hypothesis_id || ''),
    dependencies: asArray(action?.dependencies).map(String),
    successMeasure: textFrom(action, ['success_measure', 'success_metric']),
    rollbackOrExit: textFrom(action, ['rollback_or_exit']),
  };
}

function normalizeRows(values, titleKeys, detailKeys) {
  return asArray(values).map((value) => ({
    title: textFrom(value, titleKeys) || String(value),
    detail: value && typeof value === 'object' ? textFrom(value, detailKeys) : '',
  }));
}

function formatSchedule(action) {
  if (action.date) {
    const parsed = new Date(action.date);
    if (!Number.isNaN(parsed.getTime())) return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
    return action.date;
  }
  if (action.offset === 0) return 'Launch day';
  if (action.offset != null) {
    const days = Math.floor(action.offset / 1440);
    const hours = Math.floor((action.offset % 1440) / 60);
    const minutes = action.offset % 60;
    return `${[days && `Day ${days + 1}`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(' ') || 'Launch day'}`;
  }
  return 'Timing pending';
}

export function normalizeCampaignReport(report) {
  const bundle = parseBundle(report) || {};
  const actions = asArray(bundle.actions || bundle.timeline?.actions).map(normalizeAction);
  const audience = normalizeAudience(bundle.audience);
  const strategyOptions = asArray(bundle.strategy_options).map((option, index) => ({
    id: String(option?.id || `strategy-${index + 1}`),
    name: textFrom(option, ['name', 'title']) || `Strategy ${index + 1}`,
    thesis: textFrom(option, ['thesis', 'description', 'strategy']),
    tradeoff: textFrom(option, ['tradeoff', 'risk']),
  }));
  const evidence = asArray(bundle.evidence || bundle.sources).map((item, index) => ({
    id: String(item?.id || `evidence-${index + 1}`),
    claim: textFrom(item, ['claim', 'title', 'description']) || String(item),
    source: textFrom(item, ['source', 'url']),
    status: String(item?.status || 'verified').toLowerCase(),
    sourceType: readable(item?.source_type || ''),
    confidence: readable(item?.confidence || ''),
    url: textFrom(item, ['url']),
  }));
  actions.flatMap((action) => action.evidence).forEach((item, index) => evidence.push({
    id: `action-evidence-${index + 1}`, claim: String(item), source: 'Campaign action', status: 'verified', url: '',
  }));
  const risks = [...audience.safetyNotes, ...asArray(bundle.safety?.guardrails || bundle.safety?.notes || bundle.safety), ...asArray(bundle.safety?.prohibited_claims), ...asArray(bundle.risks), ...asArray(bundle.prohibited_claims)]
    .map((item) => textFrom(item, ['title', 'risk', 'description', 'note']) || String(item));
  const qualityChecks = bundle.quality_gate?.checks && typeof bundle.quality_gate.checks === 'object' ? bundle.quality_gate.checks : {};
  const launchPlan = bundle.launch_plan && typeof bundle.launch_plan === 'object' ? bundle.launch_plan : {};
  const launchChecklist = normalizeRows(bundle.launch_checklist || bundle.launchChecklist, ['title', 'item', 'name'], ['detail', 'status', 'owner']);
  const launchBlockers = asArray(launchPlan.blocked_by).map(String);
  const derivedChecklist = [
    { title: 'Goal aligned', complete: qualityChecks.goal_alignment === 'passed' || Boolean(bundle.strategy) },
    { title: 'Company grounded', complete: qualityChecks.company_grounding === 'passed' || evidence.length > 0 },
    { title: 'Content complete', complete: qualityChecks.channel_completeness === 'passed' || (actions.length > 0 && actions.every((action) => action.finalCopy)) },
    { title: 'Schedule complete', complete: qualityChecks.schedule_completeness === 'passed' || (actions.length > 0 && actions.every((action) => action.date || action.offset != null)) },
    { title: 'Providers ready', complete: qualityChecks.provider_validity === 'passed' },
  ];

  return {
    hasBundle: Object.keys(bundle).length > 0,
    legacyContent: Object.keys(bundle).length ? '' : String(report?.content || ''),
    summary: textFrom(bundle.summary || bundle.overview, ['summary', 'description', 'objective']) || textFrom(bundle, ['goal', 'objective']),
    strategy: textFrom(bundle, ['strategy', 'strategic_thesis']),
    strategyOptions,
    selectedStrategyId: String(bundle.selected_strategy_id || strategyOptions[0]?.id || ''),
    positioning: textFrom(bundle.positioning, ['statement', 'summary', 'value_proposition']) || (typeof bundle.positioning === 'string' ? bundle.positioning : ''),
    companyName: textFrom(bundle.company_grounding, ['company_name']),
    companyFacts: asArray(bundle.company_grounding?.facts_used).map(String),
    companyUnknowns: asArray(bundle.company_grounding?.unknowns).map(String),
    horizon: {
      days: Number(bundle.campaign_horizon?.duration_days || 0),
      intensity: readable(bundle.campaign_horizon?.intensity || ''),
      rationale: textFrom(bundle.campaign_horizon, ['rationale']),
    },
    audience,
    pillars: normalizeRows(bundle.content_pillars || bundle.contentPillars, ['title', 'name', 'pillar'], ['description', 'rationale', 'angle']),
    actions,
    mediaChannels: asArray(bundle.media_plan?.channels).map((item, index) => ({
      id: String(item?.channel || `channel-${index + 1}`),
      channel: channelName(item?.channel || `Channel ${index + 1}`),
      role: textFrom(item, ['role']),
      rationale: textFrom(item, ['rationale']),
      budget: item?.budget_amount == null ? '' : `${bundle.media_plan?.currency || ''} ${item.budget_amount}`.trim(),
      prerequisites: asArray(item?.prerequisites).map(String),
      exclusions: asArray(item?.exclusions).map(String),
    })),
    creativeHypotheses: asArray(bundle.creative_system?.hypotheses).map((item, index) => ({
      id: String(item?.id || `hypothesis-${index + 1}`),
      insight: textFrom(item, ['insight']),
      promise: textFrom(item, ['promise']),
      hook: textFrom(item, ['hook']),
      cta: textFrom(item, ['cta']),
      experiment: textFrom(item, ['experiment_hypothesis']),
      channels: asArray(item?.channels).map(channelName),
    })),
    decisions: normalizeRows(bundle.debate_decisions || bundle.debate?.decisions || bundle.decisions, ['decision', 'title', 'topic'], ['rationale', 'reason', 'outcome']),
    evidence,
    risks: [...new Set(risks.filter(Boolean))],
    kpis: asArray(bundle.kpis).map((item) => ({
      title: textFrom(item, ['name', 'metric', 'title']) || String(item),
      detail: item && typeof item === 'object'
        ? [item.target_type ? `${readable(item.target_type)} target` : '', textFrom(item, ['target']), textFrom(item, ['source']), textFrom(item, ['definition'])].filter(Boolean).join(' · ')
        : '',
    })),
    measurement: {
      primary: textFrom(bundle.measurement, ['primary_kpi']),
      attribution: textFrom(bundle.measurement, ['attribution_limit']),
      cadence: textFrom(bundle.measurement, ['review_cadence']),
    },
    monitoring: {
      baseline: textFrom(bundle.monitoring_plan, ['baseline']),
      primary: textFrom(bundle.monitoring_plan, ['primary_outcome']),
      attribution: textFrom(bundle.monitoring_plan, ['attribution_limit']),
      checkpoints: asArray(bundle.monitoring_plan?.checkpoints).map((item, index) => ({
        id: `checkpoint-${index + 1}`,
        timing: textFrom(item, ['timing']),
        metrics: asArray(item?.metrics).map(String),
        decision: textFrom(item, ['decision_rule']),
      })),
    },
    launchPlan: {
      mode: readable(launchPlan.mode || ''),
      approvalMode: readable(launchPlan.approval_mode || ''),
      prerequisites: asArray(launchPlan.prerequisites).map(String),
      blockers: launchBlockers,
      verification: asArray(launchPlan.verification_steps).map(String),
      rollback: asArray(launchPlan.rollback_steps).map(String),
    },
    assumptions: normalizeRows(bundle.assumptions, ['assumption', 'title', 'name'], ['validation', 'detail', 'owner']),
    launchChecklist: (launchChecklist.length
      ? launchChecklist.map((item) => ({ ...item, complete: !/pending|missing|blocked|not ready/i.test(item.detail) }))
      : derivedChecklist).concat(launchBlockers.map((blocker) => ({ title: blocker, detail: 'Required before launch', complete: false }))),
    qualityReady: bundle.quality_gate?.ready === true,
  };
}

function CampaignDesign({ data }) {
  const [activeId, setActiveId] = useState(data.creativeHypotheses[0]?.id || '');
  const hypothesis = data.creativeHypotheses.find((item) => item.id === activeId) || data.creativeHypotheses[0];
  if (!data.mediaChannels.length && !data.creativeHypotheses.length) return null;
  return <section className="grid border-b lg:grid-cols-2" style={{ borderColor: COLORS.line }}>
    <div className="px-5 py-6 sm:px-7 lg:border-r" style={{ borderColor: COLORS.line }}>
      <PanelHeading icon={RadioTower} title="Channel roles" note="Why each channel exists in this campaign." />
      <div className="mt-4 divide-y" style={{ borderColor: COLORS.line }}>{data.mediaChannels.map((item) => <div key={item.id} className="py-3 first:pt-0 last:pb-0"><div className="flex items-center justify-between gap-3"><div className="text-[11.5px] font-semibold">{item.channel}</div>{item.budget ? <div className="text-[10px]" style={{ color: COLORS.blue }}>{item.budget}</div> : null}</div><p className="mt-1 text-[11px] font-medium">{item.role}</p>{item.rationale ? <p className="mt-1 text-[10.5px] leading-5" style={{ color: COLORS.muted }}>{item.rationale}</p> : null}</div>)}</div>
    </div>
    <div className="px-5 py-6 sm:px-7">
      <PanelHeading icon={Lightbulb} title="Creative hypotheses" note="The message ideas this campaign will test." />
      {data.creativeHypotheses.length ? <><div className="mt-4 flex gap-2 overflow-x-auto" role="tablist" aria-label="Creative hypotheses">{data.creativeHypotheses.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={hypothesis?.id === item.id} onClick={() => setActiveId(item.id)} className={`shrink-0 rounded-md border px-3 py-2 text-[10.5px] font-semibold ${hypothesis?.id === item.id ? 'border-[#191919] bg-[#191919] text-white' : 'border-[#d8d3cc] bg-white'}`}>Idea {index + 1}</button>)}</div><div className="mt-4 border-l-2 pl-4" style={{ borderColor: COLORS.gold }}><p className="text-[12px] font-semibold">{hypothesis?.hook}</p><p className="mt-1 text-[11px] leading-5">{hypothesis?.promise}</p>{hypothesis?.experiment ? <p className="mt-2 text-[10px] leading-5" style={{ color: COLORS.muted }}><strong>Test:</strong> {hypothesis.experiment}</p> : null}</div></> : null}
    </div>
  </section>;
}

function PanelHeading({ icon: Icon, title, note, right }) {
  return <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border bg-white" style={{ color: COLORS.green, borderColor: COLORS.line }}><Icon size={16} /></span>
      <div><h2 className="text-[15px] font-semibold">{title}</h2>{note ? <p className="mt-0.5 text-[11px]" style={{ color: COLORS.muted }}>{note}</p> : null}</div>
    </div>
    {right}
  </div>;
}

function StrategyPanel({ data }) {
  const [activeId, setActiveId] = useState(data.selectedStrategyId);
  const active = data.strategyOptions.find((option) => option.id === activeId) || data.strategyOptions[0];
  return <section className="border-b px-5 py-6 sm:px-7" style={{ borderColor: COLORS.line }}>
    <PanelHeading icon={Compass} title="Strategy" note="The room compared routes and selected one recommendation." />
    {data.strategyOptions.length ? <>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Campaign strategies">
        {data.strategyOptions.map((option) => <button key={option.id} type="button" role="tab" aria-selected={active?.id === option.id} onClick={() => setActiveId(option.id)} className={`shrink-0 rounded-md border px-3 py-2 text-left ${active?.id === option.id ? 'border-[#191919] bg-[#191919] text-white' : 'border-[#d8d3cc] bg-white'}`}>
          <span className="block text-[11px] font-semibold">{option.name}</span>
          {option.id === data.selectedStrategyId ? <span className="mt-0.5 block text-[9px] opacity-70">Recommended</span> : null}
        </button>)}
      </div>
      <div className="mt-4 border-l-2 pl-4" style={{ borderColor: COLORS.gold }}>
        <p className="text-[13px] leading-6">{active?.thesis}</p>
        {active?.tradeoff ? <p className="mt-2 text-[11px] leading-5" style={{ color: COLORS.muted }}><strong>Trade-off:</strong> {active.tradeoff}</p> : null}
      </div>
    </> : <p className="mt-4 whitespace-pre-wrap text-[13px] leading-6">{data.strategy || 'Strategy is included in the legacy campaign report.'}</p>}
    {data.positioning ? <div className="mt-4 rounded-md bg-[#f4f0e6] px-4 py-3 text-[12.5px] font-medium leading-6">{data.positioning}</div> : null}
  </section>;
}

function ActionWorkspace({ actions, evidence }) {
  const [activeId, setActiveId] = useState(actions[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const action = actions.find((item) => item.id === activeId) || actions[0];
  const linkedEvidence = useMemo(() => evidence.filter((item) => action?.evidenceIds.includes(item.id)), [action, evidence]);
  const copy = async () => {
    if (!action?.finalCopy || !window.navigator?.clipboard) return;
    await window.navigator.clipboard.writeText(action.finalCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  if (!action) return <p className="mt-4 text-[12px] italic" style={{ color: COLORS.muted }}>No executable content was included in this legacy plan.</p>;
  return <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
    <div className="max-h-[520px] overflow-y-auto border-r pr-3" style={{ borderColor: COLORS.line }}>
      {actions.map((item, index) => <button key={item.id} type="button" onClick={() => { setActiveId(item.id); setCopied(false); }} className={`mb-1.5 w-full rounded-md border px-3 py-2.5 text-left last:mb-0 ${item.id === action.id ? 'border-[#191919] bg-white' : 'border-transparent hover:border-[#d8d3cc]'}`}>
        <span className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold">{index + 1}. {item.channel}</span><span className="text-[9px]" style={{ color: COLORS.blue }}>{formatSchedule(item)}</span></span>
        <span className="mt-1 block truncate text-[11.5px] font-medium">{item.title}</span>
      </button>)}
    </div>
    <article className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="text-[10px] font-semibold uppercase" style={{ color: COLORS.green }}>{action.channel}{action.format ? ` · ${action.format}` : ''}</div><h3 className="mt-1 text-[16px] font-semibold">{action.title}</h3><p className="mt-1 text-[11px]" style={{ color: COLORS.blue }}>{formatSchedule(action)}</p></div>
        <button type="button" onClick={copy} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-[10.5px] font-semibold" style={{ borderColor: COLORS.line }}>{copied ? <Check size={13} /> : <Clipboard size={13} />}{copied ? 'Copied' : 'Copy'}</button>
      </div>
      {action.subject ? <p className="mt-4 text-[12px] font-semibold">Subject: {action.subject}</p> : null}
      <div className="mt-4 whitespace-pre-wrap border-l-2 pl-4 text-[13px] leading-6" style={{ borderColor: COLORS.green }}>{action.finalCopy}</div>
      {action.channelId === 'x_organic' ? <div className={`mt-2 text-right text-[10px] ${action.finalCopy.length > 280 ? 'text-red-700' : 'text-[#817b74]'}`}>{action.finalCopy.length}/280 characters</div> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {action.rationale ? <div><div className="text-[9px] font-semibold uppercase" style={{ color: COLORS.muted }}>Why this action</div><p className="mt-1 text-[11.5px] leading-5">{action.rationale}</p></div> : null}
        {action.creativeConcept ? <div><div className="text-[9px] font-semibold uppercase" style={{ color: COLORS.muted }}>Creative direction</div><p className="mt-1 text-[11.5px] leading-5">{action.creativeConcept}</p></div> : null}
        {action.successMeasure ? <div><div className="text-[9px] font-semibold uppercase" style={{ color: COLORS.muted }}>Success signal</div><p className="mt-1 text-[11.5px] leading-5">{action.successMeasure}</p></div> : null}
        {action.rollbackOrExit ? <div><div className="text-[9px] font-semibold uppercase" style={{ color: COLORS.muted }}>Pause or exit when</div><p className="mt-1 text-[11.5px] leading-5">{action.rollbackOrExit}</p></div> : null}
      </div>
      {action.dependencies.length ? <div className="mt-4 flex flex-wrap gap-1.5">{action.dependencies.map((item) => <span key={item} className="rounded border bg-white px-2 py-1 text-[9.5px]" style={{ borderColor: COLORS.line }}>{item}</span>)}</div> : null}
      {(action.claimStatus || linkedEvidence.length) ? <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]"><span className="rounded bg-[#eef4f1] px-2 py-1 font-semibold" style={{ color: COLORS.green }}>{readable(action.claimStatus || 'grounded')}</span>{linkedEvidence.map((item) => <span key={item.id} className="rounded border bg-white px-2 py-1" style={{ borderColor: COLORS.line }}>{item.claim}</span>)}</div> : null}
    </article>
  </div>;
}

function DetailDisclosure({ title, count, children }) {
  if (!count) return null;
  return <details className="border-t px-5 py-4 sm:px-7" style={{ borderColor: COLORS.line }}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-semibold">{title}<span className="flex items-center gap-2 text-[10px] font-normal" style={{ color: COLORS.muted }}>{count}<ChevronDown size={13} /></span></summary>
    <div className="mt-4">{children}</div>
  </details>;
}

export default function CampaignOperatingReport({ report, taskTitle, surface = 'card' }) {
  const data = normalizeCampaignReport(report);
  const displayTitle = data.summary || taskTitle || 'Campaign operating plan';
  if (!data.hasBundle && data.legacyContent) return <div className={surface === 'card' ? 'overflow-hidden rounded-lg border' : ''} style={{ background: surface === 'room' ? 'transparent' : COLORS.paper, borderColor: COLORS.line }}>
    <header className="px-5 py-6 sm:px-7"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase"><FileText size={14} />Legacy campaign report</div><h1 className="mt-2 text-[22px] font-semibold">{displayTitle}</h1></header>
    <div className="border-t px-5 py-6 text-[12.5px] leading-6 sm:px-7" style={{ borderColor: COLORS.line }}><LegacyContent content={data.legacyContent} /></div>
  </div>;

  return <div className={surface === 'card' ? 'overflow-hidden rounded-lg border' : 'overflow-hidden'} style={{ background: surface === 'room' ? 'transparent' : COLORS.paper, borderColor: COLORS.line, color: COLORS.ink }}>
    <header className="px-5 py-6 sm:px-7" style={{ background: '#202522', color: '#f7f4ed' }}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase"><Megaphone size={14} />Campaign Board</div>{data.qualityReady ? <span className="inline-flex items-center gap-1.5 rounded bg-[#dcece5] px-2 py-1 text-[9px] font-semibold text-[#145b49]"><CheckCircle2 size={11} />Ready for approval</span> : null}</div>
      <h1 className="mt-3 max-w-4xl text-[24px] font-semibold leading-tight sm:text-[28px]">{displayTitle}</h1>
      {data.companyName ? <p className="mt-2 text-[11px] text-[#d8d5cd]">Grounded for {data.companyName}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-white/15 sm:grid-cols-4">
        {[
          ['Horizon', data.horizon.days ? `${data.horizon.days} days` : 'Campaign plan'],
          ['Pace', data.horizon.intensity || 'Defined by plan'],
          ['Actions', String(data.actions.length)],
          ['Channels', String(new Set(data.actions.map((action) => action.channel)).size)],
        ].map(([label, value]) => <div key={label} className="bg-[#2a302c] px-3 py-2.5"><div className="text-[8.5px] uppercase text-[#aaa9a3]">{label}</div><div className="mt-1 text-[12px] font-semibold">{value}</div></div>)}
      </div>
    </header>

    <StrategyPanel data={data} />

    <CampaignDesign data={data} />

    <section className="grid border-b lg:grid-cols-2" style={{ borderColor: COLORS.line }}>
      <div className="px-5 py-6 sm:px-7 lg:border-r" style={{ borderColor: COLORS.line }}><PanelHeading icon={UsersRound} title="Audience" note="Who the sequence is designed to move." /><p className="mt-4 text-[12.5px] leading-6">{data.audience.rationale}</p><div className="mt-3 flex flex-wrap gap-2">{data.audience.segments.map((segment) => <span key={segment.title} title={segment.detail} className="rounded border bg-white px-2.5 py-1.5 text-[10.5px] font-semibold" style={{ borderColor: COLORS.line }}>{segment.title}</span>)}</div></div>
      <div className="px-5 py-6 sm:px-7"><PanelHeading icon={Layers3} title="Content system" note="The themes connecting every action." /><div className="mt-4 space-y-3">{data.pillars.map((pillar) => <div key={pillar.title}><div className="text-[12px] font-semibold">{pillar.title}</div>{pillar.detail ? <p className="mt-0.5 text-[11px] leading-5" style={{ color: COLORS.muted }}>{pillar.detail}</p> : null}</div>)}</div></div>
    </section>

    <section className="border-b px-5 py-6 sm:px-7" style={{ borderColor: COLORS.line }}><PanelHeading icon={CalendarDays} title="Campaign sequence" note="Select an action to inspect its final copy, timing, rationale, and evidence." right={<span className="text-[10px]" style={{ color: COLORS.muted }}>{data.actions.length} actions</span>} /><ActionWorkspace actions={data.actions} evidence={data.evidence} /></section>

    <section className="grid border-b lg:grid-cols-2" style={{ borderColor: COLORS.line }}>
      <div className="px-5 py-6 sm:px-7 lg:border-r" style={{ borderColor: COLORS.line }}><PanelHeading icon={Target} title="Evidence" note="Verified facts stay distinct from assumptions." /><div className="mt-4 space-y-3">{data.evidence.map((item) => <div key={item.id} className="flex items-start gap-2"><span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.status === 'verified' ? 'bg-emerald-600' : item.status === 'missing' ? 'bg-red-600' : 'bg-amber-500'}`} /><div><p className="text-[11.5px] leading-5">{item.claim}</p>{item.source ? <p className="mt-0.5 text-[9.5px]" style={{ color: COLORS.muted }}>{[item.sourceType, item.confidence, item.source].filter(Boolean).join(' · ')}</p> : null}</div></div>)}</div></div>
      <div className="px-5 py-6 sm:px-7"><PanelHeading icon={Gauge} title="Measurement" note="What the team will learn after launch." /><div className="mt-4 space-y-3"><div><div className="text-[9px] font-semibold uppercase" style={{ color: COLORS.muted }}>Primary outcome</div><p className="mt-1 text-[12px]">{data.monitoring.primary || data.measurement.primary || data.kpis[0]?.title || 'Measure against the campaign objective'}</p></div>{data.monitoring.baseline ? <div><div className="text-[9px] font-semibold uppercase" style={{ color: COLORS.muted }}>Baseline</div><p className="mt-1 text-[11px] leading-5">{data.monitoring.baseline}</p></div> : null}{data.monitoring.checkpoints.map((item) => <div key={item.id} className="border-t pt-3" style={{ borderColor: COLORS.line }}><div className="text-[10.5px] font-semibold">{item.timing}</div><div className="mt-1 text-[9.5px]" style={{ color: COLORS.blue }}>{item.metrics.join(' · ')}</div><p className="mt-1 text-[10.5px] leading-5" style={{ color: COLORS.muted }}>{item.decision}</p></div>)}{data.measurement.cadence && !data.monitoring.checkpoints.length ? <div><div className="text-[9px] font-semibold uppercase" style={{ color: COLORS.muted }}>Review cadence</div><p className="mt-1 text-[12px]">{data.measurement.cadence}</p></div> : null}<p className="text-[10.5px] leading-5" style={{ color: COLORS.muted }}>{data.monitoring.attribution || data.measurement.attribution}</p></div></div>
    </section>

    <section className="border-b px-5 py-6 sm:px-7" style={{ borderColor: COLORS.line }}><PanelHeading icon={ShieldCheck} title="Launch readiness" note="A compact final check before anything is published." right={data.launchPlan.approvalMode ? <span className="inline-flex items-center gap-1 text-[9.5px]" style={{ color: COLORS.muted }}><Rocket size={12} />{data.launchPlan.approvalMode}</span> : null} /><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.launchChecklist.map((item) => <div key={`${item.title}-${item.detail}`} className="flex items-start gap-2 py-1">{item.complete ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: COLORS.green }} /> : <Circle size={15} className="mt-0.5 shrink-0" style={{ color: COLORS.gold }} />}<div><div className="text-[11.5px] font-semibold">{item.title}</div>{item.detail ? <div className="mt-0.5 text-[9.5px]" style={{ color: COLORS.muted }}>{item.detail}</div> : null}</div></div>)}</div></section>

    <DetailDisclosure title="Room decisions" count={data.decisions.length}><div className="space-y-3">{data.decisions.map((item) => <div key={item.title}><p className="text-[12px] font-semibold">{item.title}</p>{item.detail ? <p className="mt-1 text-[11px] leading-5" style={{ color: COLORS.muted }}>{item.detail}</p> : null}</div>)}</div></DetailDisclosure>
    <DetailDisclosure title="Company grounding" count={data.companyFacts.length + data.companyUnknowns.length}><div className="grid gap-5 sm:grid-cols-2"><div><div className="text-[9px] font-semibold uppercase" style={{ color: COLORS.green }}>Facts used</div><div className="mt-2 space-y-2">{data.companyFacts.map((fact) => <p key={fact} className="border-l-2 pl-3 text-[11px] leading-5" style={{ borderColor: COLORS.green }}>{fact}</p>)}</div></div><div><div className="text-[9px] font-semibold uppercase" style={{ color: COLORS.gold }}>Unknowns retained</div><div className="mt-2 space-y-2">{data.companyUnknowns.map((item) => <p key={item} className="border-l-2 pl-3 text-[11px] leading-5" style={{ borderColor: COLORS.gold }}>{item}</p>)}</div></div></div></DetailDisclosure>
    <DetailDisclosure title="KPI contract" count={data.kpis.length}><div className="grid gap-px overflow-hidden rounded-md border sm:grid-cols-2" style={{ borderColor: COLORS.line, background: COLORS.line }}>{data.kpis.map((item) => <div key={item.title} className="bg-white p-3"><p className="text-[11.5px] font-semibold">{item.title}</p>{item.detail ? <p className="mt-1 text-[10.5px] leading-5" style={{ color: COLORS.muted }}>{item.detail}</p> : null}</div>)}</div></DetailDisclosure>
    <DetailDisclosure title="Risks and assumptions" count={data.risks.length + data.assumptions.length}><div className="grid gap-4 sm:grid-cols-2"><div>{data.risks.map((risk) => <p key={risk} className="mb-2 border-l-2 pl-3 text-[11px] leading-5 last:mb-0" style={{ borderColor: COLORS.red }}>{risk}</p>)}</div><div>{data.assumptions.map((item) => <div key={item.title} className="mb-2 last:mb-0"><p className="text-[11px] font-semibold">{item.title}</p>{item.detail ? <p className="mt-0.5 text-[10px]" style={{ color: COLORS.muted }}>{item.detail}</p> : null}</div>)}</div></div></DetailDisclosure>
  </div>;
}
