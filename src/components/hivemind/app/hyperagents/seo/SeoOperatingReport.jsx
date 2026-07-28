import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, ExternalLink, FileSearch, Gauge, Layers3 } from 'lucide-react';
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

export default function SeoOperatingReport({ report, taskTitle }) {
  const parsed = useMemo(() => parseSeoAudit(report), [report]);
  const audit = parsed.audit;
  const [view, setView] = useState('fixes');
  const [severity, setSeverity] = useState('all');
  const findings = useMemo(() => (audit?.findings || []).filter((row) => severity === 'all' || row.severity === severity), [audit, severity]);
  const [selectedId, setSelectedId] = useState('');
  const selected = findings.find((row) => row.id === selectedId) || findings[0];

  if (!audit) {
    return <BrochureReport report={report} taskTitle={taskTitle} eyebrow="SEO · Search operating desk" title="SEO operating report" accent={ACCENT} />;
  }

  return <div className="overflow-hidden rounded-lg border border-[#dedbd5] bg-[#fbfaf7] text-[#191919]">
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
          <div className="text-right"><div className="text-[9px] font-mono uppercase text-[#77716a]">SEO health</div><div className="text-[32px] font-semibold leading-none">{audit.score}</div></div>
          <Gauge size={30} color={audit.score >= 80 ? ACCENT : audit.score >= 55 ? '#b54708' : '#b42318'} />
        </div>
      </div>
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
      {[['fixes', 'Priority fixes'], ['pages', 'Pages'], ['architecture', 'Architecture'], ['evidence', 'Evidence']].map(([id, label]) => (
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

    {parsed.content && <div className="border-t border-[#dedbd5]"><BrochureReport report={{ ...report, content: parsed.content }} taskTitle={taskTitle} eyebrow="SEO · Search operating desk" title="SEO operating report" accent={ACCENT} /></div>}
  </div>;
}
