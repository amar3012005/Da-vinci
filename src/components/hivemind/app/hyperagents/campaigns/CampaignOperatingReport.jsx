import React from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Compass,
  FileText,
  Gauge,
  Layers3,
  Megaphone,
  MessageSquareQuote,
  ShieldCheck,
  Target,
  UsersRound,
} from 'lucide-react';

const COLORS = {
  ink: '#191919',
  muted: '#68635d',
  line: '#dedbd5',
  paper: '#fbfaf7',
  green: '#176b57',
  blue: '#245f89',
  gold: '#8a6418',
  red: '#9b3c35',
};

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item != null && item !== '');
  return value == null || value === '' ? [] : [value];
};

const readable = (value) => String(value || '')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const textFrom = (value, keys = []) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  for (const key of keys) {
    if (value[key] != null && value[key] !== '') return String(value[key]);
  }
  return '';
};

function LegacyContent({ content }) {
  return String(content || '').split(/\n{2,}/).map((block, index) => {
    const heading = block.match(/^#{1,3}\s+(.+)$/m);
    const body = heading ? block.replace(heading[0], '').trim() : block.trim();
    return (
      <div key={`${heading?.[1] || 'paragraph'}-${index}`} className="mb-4 last:mb-0">
        {heading ? <h3 className="mb-1.5 text-[13px] font-semibold">{heading[1]}</h3> : null}
        {body ? <p className="whitespace-pre-wrap">{body.replace(/\*\*/g, '')}</p> : null}
      </div>
    );
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
  } catch {
    return null;
  }
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
  const finalCopy = textFrom(action, ['final_copy', 'copy', 'body', 'text'])
    || textFrom(payload, ['text', 'body', 'opening', 'message']);
  return {
    id: String(action?.id || `action-${index + 1}`),
    channel: readable(action?.channel || action?.type || 'Campaign'),
    title: textFrom(action, ['title', 'name']) || `Campaign action ${index + 1}`,
    finalCopy,
    subject: textFrom(payload, ['subject']),
    recipient: textFrom(payload, ['recipient_name', 'to', 'audience']),
    rationale: textFrom(action, ['rationale', 'purpose']),
    date: textFrom(action, ['scheduled_at', 'publish_at', 'date', 'scheduledAt']),
    offset: Number.isFinite(action?.scheduled_offset_minutes) ? action.scheduled_offset_minutes : null,
    evidence: asArray(action?.evidence),
  };
}

function normalizeRows(values, titleKeys, detailKeys) {
  return asArray(values).map((value) => ({
    title: textFrom(value, titleKeys) || String(value),
    detail: textFrom(value, detailKeys),
  }));
}

function formatSchedule(action) {
  if (action.date) {
    const parsed = new Date(action.date);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed);
    }
    return action.date;
  }
  if (action.offset === 0) return 'Immediately after launch';
  if (action.offset != null) {
    const days = Math.floor(action.offset / 1440);
    const hours = Math.floor((action.offset % 1440) / 60);
    const minutes = action.offset % 60;
    const parts = [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean);
    return `${parts.join(' ') || '0m'} after launch`;
  }
  return 'Schedule to be confirmed';
}

export function normalizeCampaignReport(report) {
  const bundle = parseBundle(report) || {};
  const actions = asArray(bundle.actions || bundle.timeline?.actions).map(normalizeAction);
  const audience = normalizeAudience(bundle.audience);
  const risks = [
    ...audience.safetyNotes,
    ...asArray(bundle.safety?.notes || bundle.safety),
    ...asArray(bundle.risks),
    ...asArray(bundle.prohibited_claims),
  ].map((item) => textFrom(item, ['title', 'risk', 'description', 'note']) || String(item));
  const evidence = [
    ...asArray(bundle.evidence || bundle.sources),
    ...actions.flatMap((action) => action.evidence),
  ].map((item) => textFrom(item, ['title', 'source', 'url', 'claim']) || String(item));
  const hasBundle = Object.keys(bundle).length > 0;
  const launchChecklist = normalizeRows(
    bundle.launch_checklist || bundle.launchChecklist,
    ['title', 'item', 'name'],
    ['detail', 'status', 'owner'],
  );
  const derivedChecklist = [
    { title: 'Strategy and positioning', complete: Boolean(bundle.strategy || bundle.positioning) },
    { title: 'Audience defined', complete: Boolean(audience.rationale || audience.segments.length) },
    { title: 'Final content prepared', complete: actions.length > 0 && actions.every((action) => action.finalCopy) },
    { title: 'Timeline prepared', complete: actions.length > 0 && actions.every((action) => action.date || action.offset != null) },
    { title: 'Safety reviewed', complete: risks.length > 0 },
  ];

  return {
    hasBundle,
    legacyContent: hasBundle ? '' : String(report?.content || ''),
    summary: textFrom(bundle.summary || bundle.overview, ['summary', 'description', 'objective'])
      || textFrom(bundle, ['goal', 'objective']),
    strategy: textFrom(bundle, ['strategy', 'strategic_thesis']),
    positioning: textFrom(bundle.positioning, ['statement', 'summary', 'value_proposition'])
      || (typeof bundle.positioning === 'string' ? bundle.positioning : ''),
    audience,
    pillars: normalizeRows(bundle.content_pillars || bundle.contentPillars, ['title', 'name', 'pillar'], ['description', 'rationale', 'angle']),
    actions,
    decisions: normalizeRows(bundle.debate_decisions || bundle.debate?.decisions || bundle.decisions, ['decision', 'title', 'topic'], ['rationale', 'reason', 'outcome']),
    evidence: [...new Set(evidence.filter(Boolean))],
    risks: [...new Set(risks.filter(Boolean))],
    kpis: normalizeRows(bundle.kpis || bundle.measurement, ['name', 'metric', 'title'], ['target', 'source', 'definition']),
    assumptions: normalizeRows(bundle.assumptions, ['assumption', 'title', 'name'], ['validation', 'detail', 'owner']),
    launchChecklist: launchChecklist.length
      ? launchChecklist.map((item) => ({ ...item, complete: !/pending|missing|blocked|not ready/i.test(item.detail) }))
      : derivedChecklist,
  };
}

function Section({ icon: Icon, title, note, children }) {
  return (
    <section className="border-t px-5 py-6 sm:px-7" style={{ borderColor: COLORS.line }}>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white" style={{ color: COLORS.green, border: `1px solid ${COLORS.line}` }}>
          <Icon size={16} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>{title}</h2>
          {note ? <p className="mt-0.5 text-[11px]" style={{ color: COLORS.muted }}>{note}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ children = 'Not included in this campaign plan.' }) {
  return <p className="text-[12px] italic" style={{ color: COLORS.muted }}>{children}</p>;
}

function DetailRows({ rows }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="divide-y" style={{ borderColor: COLORS.line }}>
      {rows.map((row, index) => (
        <div key={`${row.title}-${index}`} className="py-3 first:pt-0 last:pb-0">
          <div className="text-[12.5px] font-semibold" style={{ color: COLORS.ink }}>{row.title}</div>
          {row.detail ? <div className="mt-1 text-[12px] leading-5" style={{ color: COLORS.muted }}>{row.detail}</div> : null}
        </div>
      ))}
    </div>
  );
}

function ActionPreview({ action, index }) {
  return (
    <article className="rounded-lg border bg-white p-4" style={{ borderColor: COLORS.line }}>
      <div className="flex flex-wrap items-start gap-2">
        <span className="rounded px-2 py-1 text-[10px] font-semibold" style={{ background: '#e9f2ef', color: COLORS.green }}>
          {action.channel}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold" style={{ color: COLORS.ink }}>{index + 1}. {action.title}</h3>
          <p className="mt-0.5 text-[11px]" style={{ color: COLORS.blue }}>{formatSchedule(action)}</p>
        </div>
      </div>
      {action.recipient ? <p className="mt-3 text-[11px]" style={{ color: COLORS.muted }}>Audience: {action.recipient}</p> : null}
      {action.subject ? <p className="mt-3 text-[12px] font-semibold" style={{ color: COLORS.ink }}>Subject: {action.subject}</p> : null}
      {action.finalCopy ? (
        <div className="mt-3 whitespace-pre-wrap border-l-2 pl-3 text-[12.5px] leading-5" style={{ borderColor: COLORS.green, color: COLORS.ink }}>
          {action.finalCopy}
        </div>
      ) : <Empty>Final copy is not available in this legacy plan.</Empty>}
      {action.rationale ? <p className="mt-3 text-[11px] leading-5" style={{ color: COLORS.muted }}>{action.rationale}</p> : null}
    </article>
  );
}

export default function CampaignOperatingReport({ report, taskTitle, surface = 'card' }) {
  const data = normalizeCampaignReport(report);
  const displayTitle = data.summary || taskTitle || 'Campaign operating plan';

  return (
    <div className={surface === 'dashboard' ? 'overflow-hidden' : 'overflow-hidden rounded-lg border'} style={{ background: COLORS.paper, borderColor: COLORS.line, color: COLORS.ink }}>
      <header className="px-5 py-6 sm:px-7 sm:py-8" style={{ background: '#202522', color: '#f7f4ed' }}>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase">
          <Megaphone size={14} aria-hidden="true" /> Campaign operating report
        </div>
        <h1 className="mt-3 max-w-3xl text-[25px] font-semibold leading-tight sm:text-[30px]">{displayTitle}</h1>
        <p className="mt-3 max-w-2xl text-[12px] leading-5 text-[#d8d5cd]">
          Strategy, executable content, timing, evidence, and launch readiness in one approved plan.
        </p>
      </header>

      {!data.hasBundle && data.legacyContent ? (
        <Section icon={FileText} title="Campaign brief" note="Legacy report preserved while structured campaign details are unavailable.">
          <div className="hyper-markdown text-[12.5px] leading-6" style={{ color: COLORS.ink }}>
            <LegacyContent content={data.legacyContent} />
          </div>
        </Section>
      ) : null}

      <Section icon={Compass} title="Strategy and positioning" note="The campaign's core choice and market-facing promise.">
        {data.strategy ? <p className="whitespace-pre-wrap text-[13px] leading-6">{data.strategy}</p> : <Empty />}
        {data.positioning ? (
          <div className="mt-4 border-l-2 pl-4 text-[13px] font-medium leading-6" style={{ borderColor: COLORS.gold }}>
            {data.positioning}
          </div>
        ) : null}
      </Section>

      <Section icon={UsersRound} title="Audience" note="Who this campaign is for and why the message should matter.">
        {data.audience.rationale ? <p className="mb-4 text-[12.5px] leading-6">{data.audience.rationale}</p> : null}
        <DetailRows rows={data.audience.segments} />
      </Section>

      <Section icon={Layers3} title="Content pillars" note="The themes holding the campaign together across channels.">
        <DetailRows rows={data.pillars} />
      </Section>

      <Section icon={FileText} title="Ready-to-publish content" note="Full copy and channel-specific delivery details.">
        {data.actions.length ? <div className="grid gap-3">{data.actions.map((action, index) => <ActionPreview key={action.id} action={action} index={index} />)}</div> : <Empty />}
      </Section>

      <Section icon={CalendarDays} title="Timeline" note="Exact dates when available; otherwise timing is relative to launch approval.">
        {data.actions.length ? (
          <ol className="space-y-0">
            {data.actions.map((action, index) => (
              <li key={`schedule-${action.id}`} className="flex gap-3 border-b py-3 first:pt-0 last:border-0 last:pb-0" style={{ borderColor: COLORS.line }}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ background: index === 0 ? COLORS.green : COLORS.blue }}>{index + 1}</span>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold">{formatSchedule(action)}</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: COLORS.muted }}>{action.channel} · {action.title}</div>
                </div>
              </li>
            ))}
          </ol>
        ) : <Empty />}
      </Section>

      <Section icon={MessageSquareQuote} title="Debate decisions" note="Trade-offs the agent team resolved before producing this plan.">
        <DetailRows rows={data.decisions} />
      </Section>

      <Section icon={Target} title="Evidence" note="Sources and signals used to ground campaign choices.">
        {data.evidence.length ? <ul className="space-y-2">{data.evidence.map((item, index) => <li key={`${item}-${index}`} className="text-[12px] leading-5">{item}</li>)}</ul> : <Empty />}
      </Section>

      <Section icon={ShieldCheck} title="Safety and constraints" note="Claims, exclusions, and risks that must remain true at execution time.">
        {data.risks.length ? <ul className="space-y-2">{data.risks.map((risk, index) => <li key={`${risk}-${index}`} className="border-l-2 pl-3 text-[12px] leading-5" style={{ borderColor: COLORS.red }}>{risk}</li>)}</ul> : <Empty>No explicit risks or safety constraints were included in this legacy plan.</Empty>}
      </Section>

      <Section icon={Gauge} title="KPIs" note="How progress will be measured against the campaign objective.">
        <DetailRows rows={data.kpis} />
      </Section>

      <Section icon={Circle} title="Assumptions" note="Beliefs to validate as campaign evidence arrives.">
        <DetailRows rows={data.assumptions} />
      </Section>

      <Section icon={CheckCircle2} title="Launch checklist" note="A concise readiness view; approval and provider checks still happen at launch.">
        <div className="grid gap-2 sm:grid-cols-2">
          {data.launchChecklist.map((item, index) => (
            <div key={`${item.title}-${index}`} className="flex items-start gap-2 py-1.5">
              {item.complete
                ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: COLORS.green }} aria-label="Ready" />
                : <Circle size={16} className="mt-0.5 shrink-0" style={{ color: COLORS.gold }} aria-label="Needs review" />}
              <div>
                <div className="text-[12px] font-semibold">{item.title}</div>
                {item.detail ? <div className="mt-0.5 text-[10.5px]" style={{ color: COLORS.muted }}>{item.detail}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
