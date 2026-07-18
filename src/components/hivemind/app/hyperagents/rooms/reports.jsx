// Per-kind final-report views. Each renders the sealed synthesis as the
// SINGULANCE HIVEMIND brochure (editorial long-form: serif hero, sectioned
// rhythm, dark feature bands, gradient CTA) via BrochureReport. Registered in
// rooms/index.js → reportViewFor(kind). Accents from the brochure palette.
import React from 'react';
import BrochureReport from './brochure';

const KIND = {
  outreach: { eyebrow: 'Outreach · Outreach desk', title: 'Outreach desk', accent: '#B0836A' },
  research: { eyebrow: 'Research · Evidence desk', title: 'Research desk', accent: '#3E8E5B' },
  strategy: { eyebrow: 'Strategy · Decision desk', title: 'Strategy desk', accent: '#4A3550' },
  content: { eyebrow: 'Content · Editorial desk', title: 'Content desk', accent: '#D8A87F' },
  general: { eyebrow: 'Room · Operating desk', title: 'Room report', accent: '#7c3aed' },
};

export function OutreachReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.outreach} />;
}
export function ResearchReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.research} />;
}
export function StrategyReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.strategy} />;
}
export function ContentReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.content} />;
}
// Default view for hq/general/unknown kinds — same brochure system, neutral
// accent — so EVERY room's sealed report renders uniformly (no old fallback).
export function GeneralReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.general} />;
}
