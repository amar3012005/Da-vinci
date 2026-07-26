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
  seo: { eyebrow: 'SEO · Search operating desk', title: 'SEO operating report', accent: '#047857' },
  marketing: { eyebrow: 'Marketing · Growth operating desk', title: 'Marketing operating report', accent: '#C2410C' },
  branding: { eyebrow: 'Branding · Identity operating desk', title: 'Brand operating report', accent: '#9D174D' },
  fundraising: { eyebrow: 'Fundraising · Capital operating desk', title: 'Fundraising operating report', accent: '#4338CA' },
  product: { eyebrow: 'Product · Product operating desk', title: 'Product operating report', accent: '#0F766E' },
  design: { eyebrow: 'Design · Experience operating desk', title: 'Design operating report', accent: '#BE185D' },
  legal_finance: { eyebrow: 'Legal & Finance · Control desk', title: 'Legal & Finance report', accent: '#4A3550' },
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
export function SeoReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.seo} />;
}
export function MarketingReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.marketing} />;
}
export function BrandingReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.branding} />;
}
export function FundraisingReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.fundraising} />;
}
export function ProductReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.product} />;
}
export function DesignReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.design} />;
}
export function LegalFinanceReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.legal_finance} />;
}
export function CampaignReport({ report, taskTitle, surface }) {
  return <CampaignOperatingReport report={report} taskTitle={taskTitle} surface={surface} />;
}
// Default view for hq/general/unknown kinds — same brochure system, neutral
// accent — so EVERY room's sealed report renders uniformly (no old fallback).
export function GeneralReport({ report, taskTitle }) {
  return <BrochureReport report={report} taskTitle={taskTitle} {...KIND.general} />;
}
