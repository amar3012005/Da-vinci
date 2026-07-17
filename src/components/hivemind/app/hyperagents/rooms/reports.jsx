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
function ReportFrame({ accent, icon: Icon, label, sublabel, strip, report }) {
  const body = String(report?.content || '');
  return (
    <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: `${accent}33` }}>
      <div className="px-5 py-3 flex items-center gap-2.5 border-b" style={{ background: `${accent}0d`, borderColor: `${accent}1f` }}>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}1a`, color: accent }}>
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">{label}</div>
          {sublabel && <div className="text-[10.5px] font-mono uppercase tracking-wider" style={{ color: accent }}>{sublabel}</div>}
        </div>
      </div>
      {strip && <div className="px-5 pt-3">{strip}</div>}
      <div className="px-5 py-4 text-[13px] text-[#0a0a0a] leading-relaxed hyper-markdown">
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
