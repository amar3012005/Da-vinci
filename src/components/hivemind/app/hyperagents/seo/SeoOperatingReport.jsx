import React, { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, ChevronRight, ExternalLink, FileSearch, Gauge, Layers3, ListChecks } from 'lucide-react';
import BrochureReport from '../rooms/brochure';

const ACCENT = '#047857';
const severityColor = { critical: '#b42318', high: '#b54708', medium: '#175cd3', low: '#667085' };

export function parseSeoAudit(report) {
  const content = String(report?.content || '');
  const match = content.match(/```seo_audit\s*([\s\S]*?)```/i);
  if (!match) return { audit: null, content };
  try {
    const audit = JSON.parse(match[1].trim());
    return { audit: audit?.schema === 'seo-audit-v1' ? audit : null, content: content.replace(match[0], '').trim() };
  } catch {
    return { audit: null, content };
  }
}

const readable = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const compact = (value) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
const percent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
const change = (value, inverse = false) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'New';
  const adjusted = inverse ? -Number(value) : Number(value);
  return `${adjusted > 0 ? '+' : ''}${(adjusted * 100).toFixed(1)}%`;
};

function Metric({ label, value, tone }) {
  return <div className="min-w-0 border-r border-[#dedbd5] px-4 last:border-r-0 first:pl-0">
    <div className="text-[10px] font-mono uppercase text-[#77716a]">{label}</div>
    <div className="mt-1 text-[24px] font-semibold" style={{ color: tone || '#191919' }}>{value ?? 0}</div>
  </div>;
}

function FindingRow({ finding, selected, onSelect }) {
  return <button type="button" onClick={onSelect}
    className={`w-full border-b border-[#e6e2dc] px-1 py-3 text-left transition-colors hover:bg-[#f4f1eb] ${selected ? 'bg-[#f1eee7]' : ''}`}>
    <div className="flex items-start gap-3">
      <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: severityColor[finding.severity] || '#667085' }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-[#191919]">{finding.title}</span>
          <span className="text-[9px] font-mono uppercase text-[#77716a]">{finding.instances || 1} affected</span>
        </div>
        <div className="mt-1 truncate text-[11px] text-[#77716a]">{finding.template || finding.url || 'Site-wide'}</div>
      </div>
      <ChevronRight size={15} className="mt-1 shrink-0 text-[#8a857f]" />
    </div>
  </button>;
}

export default function SeoOperatingReport({ report, taskTitle, surface = 'card' }) {
  const parsed = useMemo(() => parseSeoAudit(report), [report]);
  const audit = parsed.audit;
  const [view, setView] = useState('fixes');
  const [severity, setSeverity] = useState('all');
  const [performanceSlice, setPerformanceSlice] = useState('opportunities');
  const findings = useMemo(() => (audit?.findings || []).filter((row) => severity === 'all' || row.severity === severity), [audit, severity]);
  const [selectedId, setSelectedId] = useState('');
  const selected = findings.find((row) => row.id === selectedId) || findings[0];

  if (!audit) {
    return <BrochureReport report={report} taskTitle={taskTitle} surface={surface} eyebrow="SEO · Search operating desk" title="SEO operating report" accent={ACCENT} />;
  }

  return <div className={`overflow-hidden text-[#191919] ${surface === 'room' ? '' : 'rounded-lg border border-[#dedbd5] bg-[#fbfaf7]'}`}>
    <header className="border-b border-[#dedbd5] px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-[#047857]"><FileSearch size={14} /> SEO intelligence</div>
          <h2 className="mt-2 break-words text-[24px] font-semibold">{taskTitle || 'Website SEO audit'}</h2>
          <a href={audit.seed_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[12px] text-[#5f5a54] hover:text-[#047857]">
            {audit.seed_url}<ExternalLink size={12} />
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right"><div className="text-[9px] font-mono uppercase text-[#77716a]">{audit.evidence_quality?.score_status === 'provisional' ? 'Provisional health' : 'SEO health'}</div><div className="text-[32px] font-semibold leading-none">{audit.score}</div></div>
          <Gauge size={30} color={audit.score >= 80 ? ACCENT : audit.score >= 55 ? '#b54708' : '#b42318'} />
        </div>
      </div>
      {audit.evidence_quality?.level === 'degraded' && <div className="mt-4 flex items-start gap-2 border border-[#f5c26b] bg-[#fff8e8] p-3 text-[11px] leading-4 text-[#7a4b00]"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{audit.evidence_quality.reason} The findings remain visible, but rerun the rendered crawl before acting on content depth, architecture, or the health score.</span></div>}
      {audit.maturity && <div className="mt-5 grid gap-4 border-y border-[#dedbd5] py-4 md:grid-cols-[180px_1fr_auto] md:items-center">
        <div><div className="text-[9px] font-mono uppercase text-[#77716a]">Current SEO stage</div><div className="mt-1 text-[15px] font-semibold text-[#047857]">{audit.maturity.label}</div></div>
        <p className="text-[11px] leading-5 text-[#5f5a54]">{audit.maturity.rationale}</p>
        <div className="text-[10px] font-mono uppercase text-[#77716a]">Stage {audit.maturity.stage_number} / {audit.maturity.stage_count}</div>
      </div>}
      <div className="mt-6 grid grid-cols-2 border-t border-[#dedbd5] pt-4 sm:grid-cols-6">
        <Metric label="Pages" value={audit.coverage?.pages_scanned} />
        <Metric label="Discovered" value={audit.coverage?.pages_discovered} />
        <Metric label="Critical" value={audit.severity?.critical} tone={severityColor.critical} />
        <Metric label="High" value={audit.severity?.high} tone={severityColor.high} />
        <Metric label="Templates" value={audit.templates?.length} />
        <Metric label="Crawl errors" value={audit.coverage?.crawl_errors} />
      </div>
    </header>

    <nav className="flex overflow-x-auto border-b border-[#dedbd5] px-5" aria-label="SEO report views">
      {[['fixes', 'Priority fixes'], ['procedure', 'Optimization procedure'], ['performance', 'Search performance'], ['pages', 'Pages'], ['architecture', 'Architecture'], ['evidence', 'Evidence']].map(([id, label]) => (
        <button type="button" key={id} onClick={() => setView(id)} className={`h-11 shrink-0 border-b-2 px-3 text-[12px] font-semibold ${view === id ? 'border-[#191919] text-[#191919]' : 'border-transparent text-[#77716a]'}`}>{label}</button>
      ))}
    </nav>

    {view === 'fixes' && <div className="grid min-h-[360px] md:grid-cols-[minmax(260px,0.9fr)_minmax(320px,1.1fr)]">
      <section className="border-b border-[#dedbd5] p-5 md:border-b-0 md:border-r">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {['all', 'critical', 'high', 'medium', 'low'].map((key) => <button type="button" key={key} onClick={() => setSeverity(key)}
            className={`h-7 px-2 text-[10px] font-mono uppercase ${severity === key ? 'bg-[#191919] text-white' : 'border border-[#d5d0c9] text-[#66615b]'}`}>{key}</button>)}
        </div>
        <div>{findings.length ? findings.map((row) => <FindingRow key={row.id} finding={row} selected={selected?.id === row.id} onSelect={() => setSelectedId(row.id)} />) : <div className="py-12 text-center text-[12px] text-[#77716a]">No findings in this severity.</div>}</div>
      </section>
      <section className="p-6">
        {selected ? <>
          <div className="flex items-center gap-2"><AlertTriangle size={17} color={severityColor[selected.severity]} /><span className="text-[10px] font-mono uppercase" style={{ color: severityColor[selected.severity] }}>{selected.severity} · {readable(selected.category)}</span></div>
          <h3 className="mt-3 text-[20px] font-semibold">{selected.title}</h3>
          <p className="mt-3 text-[13px] leading-6 text-[#4f4b46]">{selected.recommendation}</p>
          <dl className="mt-6 divide-y divide-[#dedbd5] border-y border-[#dedbd5] text-[12px]">
            <div className="grid grid-cols-[110px_1fr] gap-3 py-3"><dt className="text-[#77716a]">Scope</dt><dd>{selected.template || 'Site-wide'} · {selected.instances || 1} page(s)</dd></div>
            <div className="grid grid-cols-[110px_1fr] gap-3 py-3"><dt className="text-[#77716a]">Effort</dt><dd>{readable(selected.effort)}</dd></div>
            <div className="grid grid-cols-[110px_1fr] gap-3 py-3"><dt className="text-[#77716a]">Evidence</dt><dd className="break-words font-mono text-[10px]">{JSON.stringify(selected.evidence || {})}</dd></div>
          </dl>
          <div className="mt-5"><div className="text-[10px] font-mono uppercase text-[#77716a]">Example URLs</div>{(selected.affected_urls || [selected.url]).filter(Boolean).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 break-all text-[11px] text-[#047857] hover:underline">{url}<ExternalLink size={11} /></a>)}</div>
        </> : <div className="flex h-full items-center justify-center text-[12px] text-[#77716a]">Select a finding.</div>}
      </section>
    </div>}

    {view === 'performance' && <SearchPerformance evidence={audit.search_console} slice={performanceSlice} onSlice={setPerformanceSlice} />}

    {view === 'procedure' && <section className="p-6">
      <div className="flex items-center gap-2"><ListChecks size={17} color={ACCENT} /><h3 className="text-[15px] font-semibold">Website optimization procedure</h3></div>
      <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#66615b]">Work through these evidence-gated phases in order. A phase advances only after its verification condition is met.</p>
      <div className="mt-5 divide-y divide-[#dedbd5] border-y border-[#dedbd5]">
        {(audit.optimization_procedure || []).map((step) => <div key={step.id} className="grid gap-4 py-5 md:grid-cols-[90px_230px_1fr]">
          <div><span className={`inline-flex px-2 py-1 text-[9px] font-mono uppercase ${step.status === 'current' ? 'bg-[#047857] text-white' : step.status === 'complete' ? 'bg-[#e7f6ef] text-[#047857]' : 'bg-[#efede8] text-[#77716a]'}`}>{step.status}</span></div>
          <div><div className="text-[10px] font-mono uppercase text-[#77716a]">Phase {step.order}</div><div className="mt-1 text-[13px] font-semibold">{step.phase}</div><p className="mt-2 text-[11px] leading-5 text-[#66615b]">{step.objective}</p></div>
          <div><div className="space-y-2">{(step.actions || []).map((action) => <div key={action} className="flex gap-2 text-[12px] leading-5"><CheckCircle2 size={14} className="mt-0.5 shrink-0" color={step.status === 'upcoming' ? '#9a958e' : ACCENT} /><span>{action}</span></div>)}</div><div className="mt-4 border-l-2 border-[#b7b1a9] pl-3 text-[10px] leading-4 text-[#66615b]"><strong>Verify:</strong> {step.verification}</div></div>
        </div>)}
      </div>
      {audit.maturity?.exit_criteria?.length > 0 && <div className="mt-5"><div className="text-[9px] font-mono uppercase text-[#77716a]">Advance when</div><div className="mt-2 text-[12px] font-medium">{audit.maturity.exit_criteria.join(' ')}</div></div>}
    </section>}

    {view === 'pages' && <section className="overflow-x-auto p-5">
      <table className="w-full min-w-[760px] border-collapse text-left text-[11px]"><thead><tr className="border-b border-[#cfcac2] text-[9px] font-mono uppercase text-[#77716a]"><th className="py-2 pr-4">Page</th><th>Status</th><th>Words</th><th>Links</th><th>Inlinks</th><th>Depth</th><th>Source</th><th>Issues</th><th>Template</th></tr></thead><tbody>{(audit.pages || []).map((page) => <tr key={page.url} className="border-b border-[#e6e2dc]"><td className="max-w-[300px] py-3 pr-4"><a href={page.url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:text-[#047857]">{page.title || page.url}</a><div className="truncate text-[9px] text-[#8a857f]">{page.url}</div></td><td>{page.status}</td><td>{page.word_count}</td><td>{page.internal_links}</td><td>{page.internal_inlinks}</td><td>{page.crawl_depth ?? '-'}</td><td>{readable(page.discovery_source)}</td><td>{page.issue_count}</td><td>{page.template}</td></tr>)}</tbody></table>
    </section>}

    {view === 'architecture' && <section className="p-6">
      <div className="grid gap-px overflow-hidden border border-[#dedbd5] bg-[#dedbd5] sm:grid-cols-3">
        <div className="bg-[#fbfaf7] p-4"><div className="text-[9px] font-mono uppercase text-[#77716a]">Orphan candidates</div><div className="mt-2 text-[26px] font-semibold">{audit.architecture?.orphan_candidates || 0}</div></div>
        <div className="bg-[#fbfaf7] p-4"><div className="text-[9px] font-mono uppercase text-[#77716a]">Without inlinks</div><div className="mt-2 text-[26px] font-semibold">{audit.architecture?.pages_without_internal_inlinks || 0}</div></div>
        <div className="bg-[#fbfaf7] p-4"><div className="text-[9px] font-mono uppercase text-[#77716a]">Maximum depth</div><div className="mt-2 text-[26px] font-semibold">{audit.architecture?.max_crawl_depth || 0}</div></div>
      </div>
      <div className="mt-6"><h3 className="text-[14px] font-semibold">Template coverage</h3><div className="mt-3 divide-y divide-[#dedbd5] border-y border-[#dedbd5]">{(audit.templates || []).map((row) => <div key={row.template} className="grid grid-cols-[1fr_auto_auto] gap-5 py-3 text-[11px]"><span className="font-medium">{row.template}</span><span>{row.pages} page(s)</span><span>{row.issues} issue(s)</span></div>)}</div></div>
    </section>}

    {view === 'evidence' && <section className="grid gap-0 md:grid-cols-2">
      <div className="border-b border-[#dedbd5] p-6 md:border-b-0 md:border-r"><div className="flex items-center gap-2"><Layers3 size={16} color={ACCENT} /><h3 className="text-[14px] font-semibold">Evidence boundaries</h3></div><div className="mt-4 grid grid-cols-2 border-y border-[#dedbd5] py-3 text-[11px]"><div>robots.txt<br/><strong>{audit.site_files?.robots?.present ? 'Detected' : 'Not detected'}</strong></div><div>sitemap<br/><strong>{audit.site_files?.sitemap?.present ? 'Detected' : 'Not detected'}</strong></div></div><div className="mt-4 text-[10px] font-mono uppercase text-[#77716a]">{audit.capability?.id || 'seo audit'} · v{audit.capability?.version || 'legacy'} · {readable(audit.site_files?.discovery?.source || 'rendered links')}</div><div className="mt-4 space-y-3">{(audit.limitations || []).map((item) => <div key={item} className="flex gap-2 text-[12px] leading-5 text-[#56514c]"><CheckCircle2 size={14} className="mt-0.5 shrink-0" color={ACCENT} />{item}</div>)}</div></div>
      <div className="p-6"><h3 className="text-[14px] font-semibold">Crawl errors</h3>{(audit.crawl_errors || []).length ? <div className="mt-4 divide-y divide-[#dedbd5]">{audit.crawl_errors.map((row, index) => <div key={`${row.url}-${index}`} className="py-3 text-[11px]"><div className="font-medium">{readable(row.type)}</div><div className="mt-1 break-all text-[#77716a]">{row.url || row.message}</div></div>)}</div> : <div className="mt-5 text-[12px] text-[#77716a]">No crawl errors were recorded in this sample.</div>}</div>
    </section>}

    {parsed.content && <div className="border-t border-[#dedbd5]"><BrochureReport report={{ ...report, content: parsed.content }} taskTitle={taskTitle} surface={surface} eyebrow="SEO · Search operating desk" title="SEO operating report" accent={ACCENT} /></div>}
  </div>;
}

function SearchPerformance({ evidence, slice, onSlice }) {
  if (evidence?.status !== 'connected') {
    const copy = evidence?.status === 'property_required'
      ? 'Search Console is connected, but this organization has not selected its verified property.'
      : evidence?.status === 'reauthorization_required'
        ? 'The organization property needs a current authorized owner connection.'
        : 'Connect Search Console to replace inferred demand with first-party queries, pages, clicks, impressions, CTR, and position.';
    return <section className="p-6">
      <div className="border border-[#dedbd5] bg-white p-5">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-[#047857]"><BarChart3 size={15} /> First-party search evidence</div>
        <h3 className="mt-3 text-[18px] font-semibold">Search performance is not available yet</h3>
        <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[#5f5a54]">{copy}</p>
        <a href="/hivemind/app/connectors" className="mt-4 inline-flex h-9 items-center bg-[#047857] px-4 text-[12px] font-semibold text-white">Open connectors</a>
      </div>
    </section>;
  }
  const totals = evidence.totals || {};
  const current = totals.current || {};
  const changes = totals.change || {};
  const slices = [['opportunities', 'Opportunities'], ['queries', 'Queries'], ['landing_pages', 'Landing pages'], ['trend', 'Daily trend']];
  return <section>
    <header className="border-b border-[#dedbd5] px-6 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-mono uppercase text-[#047857]">Google Search Console · finalized data</div><h3 className="mt-1 break-all text-[15px] font-semibold">{evidence.site_url}</h3><div className="mt-1 text-[10px] text-[#77716a]">{evidence.periods?.current?.start_date} to {evidence.periods?.current?.end_date} · compared with previous 28 days</div></div><div className="text-[9px] font-mono uppercase text-[#77716a]">{readable(evidence.permission_level)}</div></div>
      <div className="mt-5 grid grid-cols-2 gap-px border border-[#dedbd5] bg-[#dedbd5] sm:grid-cols-4">
        {[
          ['Clicks', compact(current.clicks), change(changes.clicks)],
          ['Impressions', compact(current.impressions), change(changes.impressions)],
          ['CTR', percent(current.ctr), change(changes.ctr)],
          ['Position', Number(current.position || 0).toFixed(1), `${Number(changes.position || 0) > 0 ? '+' : ''}${Number(changes.position || 0).toFixed(1)}`],
        ].map(([label, value, delta]) => <div key={label} className="bg-[#fbfaf7] p-4"><div className="text-[9px] font-mono uppercase text-[#77716a]">{label}</div><div className="mt-1 text-[23px] font-semibold">{value}</div><div className="mt-1 text-[10px] text-[#66615b]">{delta} vs previous</div></div>)}
      </div>
    </header>
    <nav className="flex overflow-x-auto border-b border-[#dedbd5] px-5">{slices.map(([id, label]) => <button type="button" key={id} onClick={() => onSlice(id)} className={`h-10 shrink-0 border-b-2 px-3 text-[11px] font-semibold ${slice === id ? 'border-[#047857] text-[#047857]' : 'border-transparent text-[#77716a]'}`}>{label}</button>)}</nav>
    {slice === 'opportunities' && <div className="divide-y divide-[#e6e2dc] px-6">{(evidence.opportunities || []).length ? evidence.opportunities.map((item, index) => <div key={`${item.type}-${item.query || item.page}-${index}`} className="grid gap-2 py-4 md:grid-cols-[180px_1fr_220px]"><div className="text-[10px] font-mono uppercase text-[#047857]">{readable(item.type)}</div><div className="min-w-0 break-words text-[12px] font-semibold">{item.query || item.page}</div><div className="break-words font-mono text-[9px] text-[#77716a]">{JSON.stringify(item.evidence || {})}</div></div>) : <div className="py-12 text-center text-[12px] text-[#77716a]">No deterministic opportunity crossed the current evidence thresholds.</div>}</div>}
    {slice === 'queries' && <PerformanceTable rows={evidence.queries || []} primary="query" />}
    {slice === 'landing_pages' && <PerformanceTable rows={evidence.pages || []} primary="page" />}
    {slice === 'trend' && <PerformanceTable rows={evidence.daily || []} primary="date" />}
    <footer className="border-t border-[#dedbd5] px-6 py-4 text-[10px] leading-4 text-[#77716a]">{(evidence.limitations || []).join(' ')}</footer>
  </section>;
}

function PerformanceTable({ rows, primary }) {
  return <div className="overflow-x-auto p-5"><table className="w-full min-w-[680px] border-collapse text-left text-[11px]"><thead><tr className="border-b border-[#cfcac2] text-[9px] font-mono uppercase text-[#77716a]"><th className="py-2 pr-4">{readable(primary)}</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Position</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[primary]}-${index}`} className="border-b border-[#e6e2dc]"><td className="max-w-[430px] break-words py-3 pr-4 font-medium">{row[primary]}</td><td>{compact(row.clicks)}</td><td>{compact(row.impressions)}</td><td>{percent(row.ctr)}</td><td>{Number(row.position || 0).toFixed(1)}</td></tr>)}</tbody></table>{!rows.length && <div className="py-10 text-center text-[12px] text-[#77716a]">No rows were returned for this finalized period.</div>}</div>;
}
