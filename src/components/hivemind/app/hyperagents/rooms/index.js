// Room-kind registry — maps a room kind to its dedicated final-report view.
// P1 ships the registry with NO overrides: every kind falls back to the default
// renderer (the existing FinalReportCard / markdown synthesis in TurnView), so
// behavior is unchanged. P3 fills these in per kind (outreach / research /
// strategy / content) with dedicated, high-aesthetic report UIs.
//
// Canonical kinds (mirror the BE classifier in hyper/skills): hq, outreach,
// research(=market), strategy(+business+decision), content, general.
//
// Usage in TurnView:
//   const ReportView = reportViewFor(roomKind);
//   return ReportView ? <ReportView report={...} .../> : <FinalReportCard .../>;

import { OutreachReport, ResearchReport, StrategyReport, ContentReport } from './reports';

// kind → React component (or null = use the default FinalReportCard).
const REPORT_VIEWS = {
  outreach: OutreachReport,
  research: ResearchReport,
  strategy: StrategyReport,
  content: ContentReport,
};

// Normalize the BE kind aliases to the FE vertical.
const KIND_ALIAS = {
  market: 'research',
  business: 'strategy',
  decision: 'strategy',
  general: 'general',
};

export function normalizeKind(kind) {
  const k = String(kind || 'general').toLowerCase();
  return KIND_ALIAS[k] || k;
}

// Returns the dedicated ReportView for a kind, or null to signal "use default".
export function reportViewFor(kind) {
  return REPORT_VIEWS[normalizeKind(kind)] || null;
}
