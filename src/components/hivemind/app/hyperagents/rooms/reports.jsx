// Per-kind final-report views (P3). Each wraps the sealed synthesis in a
// dedicated, high-aesthetic frame for its vertical, reusing the shared markdown
// renderer for the body. Registered in rooms/index.js → reportViewFor(kind).
// Falls back to the default FinalReportCard when a kind has no view.
import React from 'react';
import {
  Megaphone, Search, Scale, FileText, Mail, PhoneCall, Globe, CheckCheck,
  Target, Lightbulb, ListChecks,
} from 'lucide-react';
import { renderMarkdownLite } from './shared';

// Shared frame: colored kind header + rail, markdown body, optional top strip.
// Brochure-style report frame — a flowing document, NOT a boxed card. Warm-cream
// ground, serif desk header over an accent rule, generous reading measure. The
// rich elements (tables/callouts/timeline/mermaid/chart) render inline via
// renderMarkdownLite.
function ReportFrame({ accent, icon: Icon, label, sublabel, strip, report }) {
  const body = String(report?.content || '');
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#F7F3EC' }}>
      {/* Masthead */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em]" style={{ color: accent }}>
          <Icon size={13} /> {sublabel || label}
        </div>
        <h2 className="mt-1 text-[22px] leading-tight font-semibold text-[#1c1a16]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{label}</h2>
        <div className="mt-2 h-px w-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      </div>
      {strip && <div className="px-6 pb-1">{strip}</div>}
      {/* Body — flowing, on the warm ground, comfortable measure */}
      <div className="px-6 pb-6 pt-2 text-[13.5px] text-[#1c1a16] leading-relaxed hyper-markdown max-w-[760px]">
        {renderMarkdownLite(body)}
      </div>
    </div>
  );
}

function chip(accent, icon, text) {
  const Icon = icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono"
      style={{ background: `${accent}14`, color: accent }}>
      <Icon size={11} /> {text}
    </span>
  );
}

// ── Outreach — prospects + campaign posture ──────────────────────────────
export function OutreachReport({ report, prospectHunts = [] }) {
  const accent = '#117dff';
  const rows = (prospectHunts || []).flatMap((p) => p.prospects || []);
  const withEmail = rows.filter((r) => r && r.email).length;
  const strip = rows.length ? (
    <div className="flex items-center gap-2 flex-wrap pb-1">
      {chip(accent, Target, `${rows.length} prospects`)}
      {chip('#16a34a', Mail, `${withEmail} email-ready`)}
      {chip('#a855f7', PhoneCall, `${rows.length - withEmail} call-only`)}
    </div>
  ) : null;
  return <ReportFrame accent={accent} icon={Megaphone} label="Outreach desk"
    sublabel="prospects · sequence · signals" strip={strip} report={report} />;
}

// ── Research — sources + findings ────────────────────────────────────────
export function ResearchReport({ report, webSources = [] }) {
  const accent = '#10b981';
  const srcs = [
    ...(Array.isArray(report?.sources) ? report.sources : []),
    ...(Array.isArray(webSources) ? webSources : []),
  ].filter((s, i, a) => (s?.url || s?.title) && a.findIndex((x) => (x?.url || x?.title) === (s?.url || s?.title)) === i).slice(0, 10);
  const strip = (
    <div className="flex items-center gap-2 flex-wrap pb-1">
      {chip(accent, Lightbulb, 'evidence-grounded')}
      {srcs.length ? chip('#0891b2', Globe, `${srcs.length} sources`) : null}
    </div>
  );
  return (
    <ReportFrame accent={accent} icon={Search} label="Research desk"
      sublabel="findings · evidence · sources" strip={strip} report={report} />
  );
}

// ── Strategy — decision posture ──────────────────────────────────────────
export function StrategyReport({ report }) {
  const accent = '#a855f7';
  const strip = (
    <div className="flex items-center gap-2 flex-wrap pb-1">
      {chip(accent, Scale, 'options weighed')}
      {chip('#f59e0b', CheckCheck, 'decision + rationale')}
    </div>
  );
  return <ReportFrame accent={accent} icon={Scale} label="Strategy desk"
    sublabel="options · tradeoffs · decision" strip={strip} report={report} />;
}

// ── Content — publish-ready deliverable ──────────────────────────────────
export function ContentReport({ report }) {
  const accent = '#ec4899';
  const strip = (
    <div className="flex items-center gap-2 flex-wrap pb-1">
      {chip(accent, FileText, 'publish-ready draft')}
      {chip('#525252', ListChecks, 'review before send')}
    </div>
  );
  return <ReportFrame accent={accent} icon={FileText} label="Content desk"
    sublabel="draft · copy · export" strip={strip} report={report} />;
}
