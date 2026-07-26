// Per-kind final-report views. General desks use the editorial BrochureReport;
// Campaign Rooms use a structured operating report built for launch review.
// Registered in rooms/index.js -> reportViewFor(kind).
import React from 'react';
import BrochureReport from './brochure';
import CampaignOperatingReport from '../campaigns/CampaignOperatingReport';

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
export function CampaignReport({ report, taskTitle }) {
  return <CampaignOperatingReport report={report} taskTitle={taskTitle} />;
}
// Default view for hq/general/unknown kinds — same brochure system, neutral
// accent — so EVERY room's sealed report renders uniformly (no old fallback).
export function GeneralReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.general} />;
}
