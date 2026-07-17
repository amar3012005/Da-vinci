// Per-kind final-report views (P3 / Room Report Studio). The sealed synthesis is
// rendered as an EDITORIAL BROCHURE — the exact visual system of the SINGULANCE
// HIVEMIND brochure: warm-cream ground (#F5F0E8), Newsreader serif headings,
// Hanken Grotesk body, muted-ink palette, coral/blue/purple accents. NOT a boxed
// card. Rich elements (tables/callouts/timeline/mermaid/chart) render inline via
// renderMarkdownLite. Registered in rooms/index.js → reportViewFor(kind).
import React from 'react';
import {
  Megaphone, Search, Scale, FileText, Mail, PhoneCall, Globe, CheckCheck,
  Target, Lightbulb, ListChecks,
} from 'lucide-react';
import { renderMarkdownLite } from './shared';

// Brochure design tokens (decoded from the reference HTML).
export const BROCHURE = {
  ground: '#F5F0E8', ink: '#1C1A16', muted: '#8A8073', faint: '#B8B0A2',
  serif: "'Newsreader', Georgia, 'Times New Roman', serif",
  sans: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  rule: 'rgba(28,26,22,0.12)',
};

function Brochure({ accent, soft, icon: Icon, label, sublabel, strip, report }) {
  const body = String(report?.content || '');
  return (
    <div className="rounded-2xl overflow-hidden hyper-brochure"
      style={{ background: BROCHURE.ground, fontFamily: BROCHURE.sans, color: BROCHURE.ink }}>
      {/* Masthead — kind eyebrow + serif title over a hairline rule */}
      <div className="px-7 pt-6 pb-4">
        <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em]"
          style={{ color: accent, fontFamily: BROCHURE.sans, fontWeight: 600 }}>
          <Icon size={13} /> {sublabel || label}
        </div>
        <h2 className="mt-1.5 text-[26px] leading-[1.15]" style={{ fontFamily: BROCHURE.serif, fontWeight: 500 }}>
          {label}
        </h2>
        <div className="mt-3 h-px w-full" style={{ background: BROCHURE.rule }} />
      </div>
      {strip && <div className="px-7 pb-1">{strip}</div>}
      {/* Body — flowing editorial column */}
      <div className="px-7 pb-7 pt-2 text-[14px] leading-[1.7] hyper-markdown max-w-[720px]"
        style={{ color: BROCHURE.ink }}>
        {renderMarkdownLite(body)}
      </div>
    </div>
  );
}

function chip(accent, icon, text) {
  const Icon = icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px]"
      style={{ background: `${accent}1c`, color: accent, fontFamily: BROCHURE.sans, fontWeight: 600 }}>
      <Icon size={11} /> {text}
    </span>
  );
}

// Kind accents drawn from the brochure palette (coral / blue / purple / gold).
export function OutreachReport({ report, prospectHunts = [] }) {
  const accent = '#B0836A';
  const rows = (prospectHunts || []).flatMap((p) => p.prospects || []);
  const withEmail = rows.filter((r) => r && r.email).length;
  const strip = rows.length ? (
    <div className="flex items-center gap-2 flex-wrap pb-1">
      {chip(accent, Target, `${rows.length} prospects`)}
      {chip('#3E8E5B', Mail, `${withEmail} email-ready`)}
      {chip('#7FB2E6', PhoneCall, `${rows.length - withEmail} call-only`)}
    </div>
  ) : null;
  return <Brochure accent={accent} icon={Megaphone} label="Outreach desk"
    sublabel="prospects · sequence · signals" strip={strip} report={report} />;
}

export function ResearchReport({ report, webSources = [] }) {
  const accent = '#3E8E5B';
  const srcs = [
    ...(Array.isArray(report?.sources) ? report.sources : []),
    ...(Array.isArray(webSources) ? webSources : []),
  ].filter((s, i, a) => (s?.url || s?.title) && a.findIndex((x) => (x?.url || x?.title) === (s?.url || s?.title)) === i).slice(0, 10);
  const strip = (
    <div className="flex items-center gap-2 flex-wrap pb-1">
      {chip(accent, Lightbulb, 'evidence-grounded')}
      {srcs.length ? chip('#7FB2E6', Globe, `${srcs.length} sources`) : null}
    </div>
  );
  return <Brochure accent={accent} icon={Search} label="Research desk"
    sublabel="findings · evidence · sources" strip={strip} report={report} />;
}

export function StrategyReport({ report }) {
  const accent = '#4A3550';
  const strip = (
    <div className="flex items-center gap-2 flex-wrap pb-1">
      {chip('#B39BE6', Scale, 'options weighed')}
      {chip('#F4B14D', CheckCheck, 'decision + rationale')}
    </div>
  );
  return <Brochure accent={accent} icon={Scale} label="Strategy desk"
    sublabel="options · tradeoffs · decision" strip={strip} report={report} />;
}

export function ContentReport({ report }) {
  const accent = '#D8A87F';
  const strip = (
    <div className="flex items-center gap-2 flex-wrap pb-1">
      {chip(accent, FileText, 'publish-ready draft')}
      {chip('#8A8073', ListChecks, 'review before send')}
    </div>
  );
  return <Brochure accent={accent} icon={FileText} label="Content desk"
    sublabel="draft · copy · export" strip={strip} report={report} />;
}
