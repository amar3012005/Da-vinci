/**
 * HyperAgents page — Slack/WhatsApp-style Cognitive Swarm Intelligence
 * workspace on HIVEMIND.
 *
 * Two display modes, decided by whether the user has any rooms:
 *   1. First-visit / no rooms  → render the existing <DigitalEmployees>
 *      roster (no duplicate code), plus a "Create your first room"
 *      banner along the top.
 *   2. ≥1 room                  → pure WhatsApp layout:
 *         left rail (rooms list) | thread | participants rail
 *      No way back to the roster grid — cards live one click deep
 *      inside the "+ Add agent" picker.
 *
 * Streaming during live turns uses SSE; after seal, the transcript is
 * a pure DB read (no LLM, no streaming). Idempotent send button.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Nango from '@nangohq/frontend';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Sparkles, Send, Users, Hash, X, Archive, Globe, FolderOpen, ChevronDown,
  AlertTriangle, Loader2, Trash2, Eraser, RotateCcw,
  Network, Shield, Crown, Lightbulb, MessageCircle, Check,
  Clock, LayoutGrid, Zap, CheckCheck,
  Swords, Gavel, Scale, Coffee, History, ClipboardCheck, ListChecks, Search, Layers,
  UserPlus, LogOut, ExternalLink, Brain, Tag, FileText, Boxes, Paperclip,
  ArrowLeft, ArrowRight, ArrowUpRight, Target, Eye, Pencil, PhoneCall,
  User, Gauge, CreditCard, Settings, Building2, Megaphone, Rocket,
  MapPin, Mail,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../shared/api-client';
import { EmailComposeCard, CallRingingCard, EmailBlock, parseEmailMarkdown, GmailConnectGate } from '../hyperagents/elements';
import { useAuth } from '../auth/AuthProvider';
import DigitalEmployees from './DigitalEmployees';
import { HyperOnboarding, CompanyDashboard } from '../hyperagents';
import CampaignPanel from '../hyperagents/CampaignPanel';
import LeadsView from '../hyperagents/LeadsView';
import CampaignsView from '../hyperagents/CampaignsView';
import AaasVoiceWidget from '../../AaasVoiceWidget';
import { reportViewFor } from '../hyperagents/rooms';
import {
  FinalReportCard, SwarmRounds, ArtifactPreviewModal, AgentBubble, DeepSimulationPanel,
  EvidenceChip, EvidenceModal, MermaidDiagram, renderMarkdownLite, sanitizeMermaid, coerceLine,
  LANE_META, AGREEMENT_META,
  fmtTs, eventDisplayTs, getPersonaContract, contractSnippet,
  SwarmSpinningUp, SimTheater, HqReportBubble, ProspectStack, ToolTimeline,
  relTime, sectionIconFor, splitSynthesisSections, hyperEventKey,
} from '../hyperagents/rooms/shared';
import { PageWalkthrough, HYPER_AGENTS_STEPS } from '../shared/Walkthrough';
import { BRAND_LOGOS } from '../shared/connectors-catalog';
import { FIELDS, professionsForField, NAME_SUGGESTIONS } from '../shared/field-catalog';
import AgentAvatar from '../hyperagents/AgentAvatar';
import UsageTracker from '../components/UsageTracker';
import { emitUsageChanged } from '../shared/useUsage';

// Compact relative-time for room last-used. Pure, no deps.
// 3rd-party connector catalog (mirrors core/src/connectors/mcp/catalog-seed.js).
// Granting one to a character gives that agent its live MCP tools in the room.
const ROOM_CONNECTORS = [
  { id: 'gmail', label: 'Gmail', color: '#ea4335', desc: 'Read & search email' },
  { id: 'google_docs', label: 'Google Docs', color: '#1a73e8', desc: 'Create & write docs' },
  { id: 'google_sheets', label: 'Google Sheets', color: '#0f9d58', desc: 'Build & fill spreadsheets' },
  { id: 'github', label: 'GitHub', color: '#24292f', desc: 'Repos, issues, PRs' },
  { id: 'notion', label: 'Notion', color: '#0a0a0a', desc: 'Pages & databases' },
  { id: 'slack', label: 'Slack', color: '#611f69', desc: 'Channels & messages' },
  { id: 'hubspot', label: 'HubSpot', color: '#ff7a59', desc: 'CRM records' },
  { id: 'airtable', label: 'Airtable', color: '#2d7ff9', desc: 'Bases & records' },
  { id: 'linear', label: 'Linear', color: '#5e6ad2', desc: 'Issues & projects' },
];

/* ─── Lane → glyph + color ──────────────────────────────────────────── */


/* ─── Room formats (collaboration templates) ─────────────────────────────
 * Single source of truth for the create-room format picker. `auto` is the
 * hero/default — the orchestrator picks the best format from the first
 * question, so no-code users never need to learn the others. Each entry
 * carries an icon, a tier tag, and a one-line plain-English description.
 */
const ROOM_FORMATS = [
  { key: 'auto',          icon: Sparkles,      tier: 'Recommended', color: '#7c3aed',
    labelKey: 'hyperAgents.tmplAutoLabel',      label: 'Smart',
    descKey: 'hyperAgents.tmplAutoDesc',        desc: 'Picks the best format from your question automatically.' },
  { key: 'debate',        icon: Swords,        tier: 'Deep',        color: '#f59e0b',
    labelKey: 'hyperAgents.tmplDebateLabel',    label: 'Debate',
    descKey: 'hyperAgents.tmplDebateDesc',      desc: 'Lead → reactors → synthesis → revise loop.' },
  { key: 'decision',      icon: Gavel,         color: '#117dff',
    labelKey: 'hyperAgents.tmplDecisionLabel',  label: 'Decision',
    descKey: 'hyperAgents.tmplDecisionDesc',    desc: 'Lead commits, saves the call as memory. No debate.' },
  { key: 'swarm',         icon: Network,       tier: 'Deep',        color: '#a855f7',
    labelKey: 'hyperAgents.tmplSwarmLabel',     label: 'Swarm',
    descKey: 'hyperAgents.tmplSwarmDesc',       desc: 'R1–R5: hypotheses → cross-exam → Skeptic → vote.' },
  { key: 'deep_sim',      icon: UserPlus,      tier: 'Deep',        color: '#117dff',
    labelKey: 'hyperAgents.tmplDeepSimLabel',   label: 'Simulation',
    descKey: 'hyperAgents.tmplDeepSimDesc',     desc: 'Ontology check, flyby expert gate, live peer simulation.' },
  { key: 'brainstorm',    icon: Lightbulb,     color: '#10b981',
    labelKey: 'hyperAgents.tmplBrainstormLabel',label: 'Brainstorm',
    descKey: 'hyperAgents.tmplBrainstormDesc',  desc: 'Generative-only. Top 5–8 ideas, no early pick.' },
  { key: 'council',       icon: Scale,         color: '#a855f7',
    labelKey: 'hyperAgents.tmplCouncilLabel',   label: 'Council',
    descKey: 'hyperAgents.tmplCouncilDesc',     desc: 'Majority vote: APPROVED / CONDITIONAL / REJECTED.' },
  { key: 'lean_coffee',   icon: Coffee,        tier: 'Fast',        color: '#ec4899',
    labelKey: 'hyperAgents.tmplLeanCoffeeLabel',label: 'Lean Coffee',
    descKey: 'hyperAgents.tmplLeanCoffeeDesc',  desc: 'Rotate 2–3 sub-topics, time-boxed exploration.' },
  { key: 'retrospective', icon: History,       color: '#117dff',
    labelKey: 'hyperAgents.tmplRetroLabel',     label: 'Retrospective',
    descKey: 'hyperAgents.tmplRetroDesc',       desc: "What worked / didn't / what to change." },
  { key: 'review',        icon: ClipboardCheck,color: '#10b981',
    labelKey: 'hyperAgents.tmplReviewLabel',    label: 'Review',
    descKey: 'hyperAgents.tmplReviewDesc',      desc: 'Score per dimension: PASS / NEEDS_WORK / FAIL.' },
  { key: 'standup',       icon: ListChecks,    tier: 'Fast',        color: '#ec4899',
    labelKey: 'hyperAgents.tmplStandupLabel',   label: 'Standup',
    descKey: 'hyperAgents.tmplStandupDesc',     desc: 'Yesterday / Today / Blockers status report.' },
];

// Expertise and collaboration are orthogonal. `room_tag` selects a versioned
// Director/skills/toolkit/report pack; `template` still selects how agents work.
const DOMAIN_ROOMS = [
  { key: 'general', label: 'General', icon: Sparkles, color: '#7c3aed', desc: 'Flexible room with the existing general behavior.' },
  { key: 'seo', label: 'SEO', icon: Search, color: '#047857', desc: 'Search demand, SERPs, technical discovery, and organic growth.' },
  { key: 'marketing', label: 'Marketing', icon: Megaphone, color: '#c2410c', desc: 'Audience, campaigns, channels, assets, and experiments.' },
  { key: 'branding', label: 'Branding', icon: Eye, color: '#9d174d', desc: 'Positioning, narrative, voice, and visual direction.' },
  { key: 'fundraising', label: 'Fundraising', icon: CreditCard, color: '#4338ca', desc: 'Investor narrative, readiness, targeting, and process.' },
  { key: 'research', label: 'Research', icon: FileText, color: '#0369a1', desc: 'Source-backed investigation and decision evidence.' },
  { key: 'product', label: 'Product', icon: Rocket, color: '#0f766e', desc: 'Discovery, requirements, prioritization, and rollout.' },
  { key: 'design', label: 'Design', icon: LayoutGrid, color: '#be185d', desc: 'User flows, interaction systems, and accessibility.' },
  { key: 'legal_finance', label: 'Legal & Finance', icon: Scale, color: '#4a3550', desc: 'Contracts, compliance, financial analysis, and controls.' },
];
const domainRoomDefinition = (key) => DOMAIN_ROOMS.find((domain) => domain.key === key) || DOMAIN_ROOMS[0];

const DOMAIN_ROOM_STAGES = {
  general: [
    ['Understand', 'Assess the company now', 'Synthesize what the company is, what it offers, its audience, current evidence, and the most important unknowns.', 'Assess everything currently known about the company. Separate verified facts from assumptions, identify the most consequential gaps, and produce a concise operating diagnosis.'],
    ['Prioritize', 'Find the highest-leverage move', 'Compare the strongest opportunities across the company before committing resources.', 'Compare the highest-leverage opportunities across product, growth, operations, finance, and risk. Recommend one priority with explicit trade-offs and evidence.'],
    ['Plan', 'Build the next 30 days', 'Turn the chosen priority into owners, milestones, dependencies, and success checks.', 'Build a practical 30-day operating plan for the company. Include milestones, owners, dependencies, risks, and measurable success criteria.'],
    ['Execute', 'Create the first deliverable', 'Produce the most useful ready-to-use artifact from the plan.', 'Choose and create the highest-value first deliverable from the current operating plan. Make it complete, usable, and grounded in company context.'],
  ],
  seo: [
    ['Baseline', 'Audit search readiness', 'Inspect positioning, site structure, technical discoverability, and current search evidence.', 'Audit the company search baseline using available company knowledge and live evidence. Cover technical discoverability, content, authority, and measurement gaps.'],
    ['Demand', 'Map search opportunities', 'Find intent clusters and questions the company can credibly win.', 'Map the most valuable search-intent clusters for the company and its real audience. Include evidence, intent, difficulty assumptions, and business relevance.'],
    ['Build', 'Create the SEO roadmap', 'Prioritize technical fixes, pages, content, and internal linking.', 'Create a prioritized SEO execution roadmap with technical fixes, page opportunities, content briefs, internal links, owners, and timing.'],
    ['Measure', 'Define the learning loop', 'Choose leading and lagging indicators with review intervals.', 'Define an SEO measurement system with baseline requirements, leading indicators, business outcomes, review cadence, and decision thresholds.'],
  ],
  marketing: [
    ['Audience', 'Clarify audience and offer', 'Test the target, pain, promise, proof, and call to action.', 'Clarify the company audience and offer. Challenge the pain, promise, proof, objections, and call to action using available evidence.'],
    ['Strategy', 'Choose the channel system', 'Decide where the audience can be reached and how channels work together.', 'Design the best evidence-backed channel strategy for this company. Explain channel roles, sequencing, trade-offs, and prerequisites.'],
    ['Create', 'Build campaign assets', 'Produce ready-to-use content matched to the chosen channels.', 'Create a coherent set of launch-ready marketing assets for the recommended channels. Keep every claim grounded and every action channel-correct.'],
    ['Learn', 'Plan the experiments', 'Schedule tests with hypotheses, metrics, and stop or scale rules.', 'Build a marketing experiment calendar with hypotheses, variants, success metrics, minimum evidence, and stop, iterate, or scale rules.'],
  ],
  branding: [
    ['Audit', 'Review the current brand', 'Identify strengths, contradictions, sameness, and missing proof.', 'Audit the current company brand using all available context. Assess positioning, differentiation, narrative, voice, visual signals, and proof gaps.'],
    ['Position', 'Define the market position', 'Choose the category, audience, differentiated promise, and reasons to believe.', 'Develop a defensible positioning system: audience, category, problem, differentiated promise, reasons to believe, alternatives, and boundaries.'],
    ['Express', 'Build the messaging system', 'Create the narrative hierarchy, voice, messages, and examples.', 'Create a complete messaging architecture with narrative, message hierarchy, voice rules, proof points, objections, and channel examples.'],
    ['Activate', 'Plan brand activation', 'Apply the system consistently across the highest-impact surfaces.', 'Plan brand activation across the company website, product, sales, social, and customer touchpoints with priorities and quality checks.'],
  ],
  fundraising: [
    ['Readiness', 'Assess fundraising readiness', 'Review traction, evidence, economics, team, risks, and missing materials.', 'Assess the company fundraising readiness. Separate evidence from aspiration and identify the critical gaps in traction, economics, team, narrative, and diligence.'],
    ['Narrative', 'Build the investor story', 'Connect problem, insight, solution, market, traction, model, and ask.', 'Build an investor narrative grounded only in known company facts. Include problem, insight, solution, market, traction, business model, moat, team, roadmap, and ask.'],
    ['Target', 'Define investor fit', 'Specify the investor profile and a research method for a qualified list.', 'Define the ideal investor profile and create an evidence-first method to identify and rank suitable investors without inventing names or fit.'],
    ['Process', 'Create the raise plan', 'Design materials, outreach waves, meetings, diligence, and decision gates.', 'Create a fundraising operating plan with materials, outreach waves, meeting sequence, diligence readiness, owners, timing, and decision gates.'],
  ],
  research: [
    ['Frame', 'Define the research question', 'Turn the business need into answerable questions, scope, and evidence standards.', 'Frame the highest-value research question for the company. Define scope, sub-questions, evidence standards, exclusions, and the decision it must inform.'],
    ['Gather', 'Build the evidence base', 'Collect relevant company, market, customer, and external sources.', 'Gather a source-backed evidence base for the current research question. Keep verified facts, source quality, assumptions, and unknowns visibly separate.'],
    ['Challenge', 'Test competing explanations', 'Debate interpretations, contradictions, limitations, and confidence.', 'Challenge the evidence through competing hypotheses. Identify contradictions, weak sources, missing data, confidence levels, and what would change the conclusion.'],
    ['Decide', 'Produce the decision brief', 'Convert findings into implications, recommendation, and next research.', 'Produce a decision-ready research brief with findings, sources, confidence, implications, recommendation, risks, and the next evidence to collect.'],
  ],
  product: [
    ['Discover', 'Clarify the user problem', 'Connect users, jobs, pain, evidence, alternatives, and desired outcomes.', 'Clarify the most important user problem using current company knowledge. Separate observed evidence from assumptions and define the desired outcome.'],
    ['Define', 'Write the product requirements', 'Specify outcomes, scope, flows, constraints, states, and acceptance criteria.', 'Write decision-ready product requirements for the priority problem, including users, outcomes, scope, flows, constraints, edge states, and acceptance criteria.'],
    ['Prioritize', 'Choose what to build', 'Compare impact, evidence, effort, risk, and strategic fit.', 'Prioritize the product opportunities using impact, evidence, effort, risk, dependencies, and strategic fit. Make one explicit recommendation.'],
    ['Deliver', 'Plan validation and rollout', 'Define prototype, experiment, instrumentation, release, and review gates.', 'Create the validation and rollout plan with prototype or experiment, instrumentation, release stages, owners, risks, and review gates.'],
  ],
  design: [
    ['Journey', 'Map the user journey', 'Identify actors, steps, goals, friction, handoffs, and failure states.', 'Map the end-to-end user journey for the priority experience. Include actors, goals, steps, friction, handoffs, edge cases, and failure states.'],
    ['Interaction', 'Design the core flow', 'Specify information hierarchy, actions, states, feedback, and recovery.', 'Design the core interaction flow with information hierarchy, controls, states, feedback, empty states, errors, and recovery paths.'],
    ['System', 'Define reusable patterns', 'Turn the flow into components, behavior rules, content, and accessibility.', 'Define the reusable design system patterns needed for this experience, including components, behaviors, content rules, responsive constraints, and accessibility.'],
    ['Validate', 'Create the validation plan', 'Test comprehension, completion, confidence, and accessibility.', 'Create a design validation plan with target users, scenarios, tasks, success measures, accessibility checks, and decision thresholds.'],
  ],
  legal_finance: [
    ['Scope', 'Define jurisdiction and exposure', 'Identify the decision, entities, regions, contracts, money flows, and review boundaries.', 'Define the legal and financial scope of the current company decision. Identify entities, jurisdictions, contracts, money flows, assumptions, and professional-review boundaries.'],
    ['Analyze', 'Assess obligations and economics', 'Map requirements, liabilities, costs, revenue effects, and scenarios.', 'Analyze the relevant obligations, liabilities, controls, unit economics, cash effects, and scenarios. Clearly distinguish facts, assumptions, and items requiring qualified review.'],
    ['Control', 'Design safeguards', 'Create approvals, records, limits, monitoring, and escalation paths.', 'Design practical legal and financial controls with owners, approvals, evidence records, thresholds, monitoring, and escalation paths.'],
    ['Decide', 'Prepare the review package', 'Summarize recommendation, exposure, alternatives, and required sign-offs.', 'Prepare a decision package with recommendation, alternatives, financial impact, legal exposure, unresolved questions, and required expert sign-offs.'],
  ],
};

const SYNTHESIS_PRESENTATIONS = {
  RESEARCH: { label: 'Evidence brief', accent: '#0f766e', soft: '#ecfdf5', icon: Search, note: 'Grounded findings and confidence signals' },
  OUTREACH: { label: 'Outreach desk', accent: '#be185d', soft: '#fdf2f8', icon: Send, note: 'Targets, personalisation, and ready-to-use sequences' },
  MARKETING: { label: 'Campaign board', accent: '#c2410c', soft: '#fff7ed', icon: Megaphone, note: 'Positioning, assets, channels, and experiments' },
  STRATEGY: { label: 'Decision memo', accent: '#4338ca', soft: '#eef2ff', icon: Gavel, note: 'Trade-offs, accountability, and the next institutional move' },
  FEATURE: { label: 'Delivery plan', accent: '#0369a1', soft: '#f0f9ff', icon: Rocket, note: 'Requirements, validation, and rollout control' },
  GENERAL: { label: 'Operating synthesis', accent: '#7c3aed', soft: '#f5f3ff', icon: Sparkles, note: 'A clear answer, evidence, and accountable next steps' },
  // Room-KIND desks (preferred key — derived from skill_used.room_kind; the
  // upper-case task tags above remain as aliases for old turns):
  market:   { label: 'Competitive desk', accent: '#0f766e', soft: '#ecfdf5', icon: Layers,   note: 'Landscape, asymmetries, threats, and the next moves' },
  content:  { label: 'Editorial desk',   accent: '#c2410c', soft: '#fff7ed', icon: Megaphone, note: 'Pillars, calendar, hooks, and distribution' },
  outreach: { label: 'Outreach desk',    accent: '#be185d', soft: '#fdf2f8', icon: Send,     note: 'ICP, ranked prospects, sequence, and signals' },
  business: { label: 'Operating desk',   accent: '#0369a1', soft: '#f0f9ff', icon: Gauge,    note: 'Unit economics, pricing, risks, and the fatal metric' },
  strategy: { label: 'Decision memo',    accent: '#4338ca', soft: '#eef2ff', icon: Gavel,    note: 'Options scored, decision taken, tripwire set' },
  seo: { label: 'SEO operating report', accent: '#047857', soft: '#ecfdf5', icon: Search, note: 'Search opportunity, priorities, execution, and measurement' },
  marketing: { label: 'Marketing operating report', accent: '#c2410c', soft: '#fff7ed', icon: Megaphone, note: 'Audience, channels, ready assets, calendar, and experiments' },
  branding: { label: 'Brand operating report', accent: '#9d174d', soft: '#fdf2f8', icon: Eye, note: 'Positioning, messaging, voice, visual direction, and activation' },
  fundraising: { label: 'Fundraising operating report', accent: '#4338ca', soft: '#eef2ff', icon: CreditCard, note: 'Readiness, investor narrative, fit, process, and risk' },
  product: { label: 'Product operating report', accent: '#0f766e', soft: '#ecfdf5', icon: Rocket, note: 'Decision, users, requirements, delivery, and measurement' },
  design: { label: 'Design operating report', accent: '#be185d', soft: '#fdf2f8', icon: LayoutGrid, note: 'Experience, flow, components, states, and validation' },
  legal_finance: { label: 'Legal & Finance report', accent: '#4a3550', soft: '#f5f3ff', icon: Scale, note: 'Sources, analysis, exposure, controls, and review gates' },
  general:  { label: 'Operating synthesis', accent: '#7c3aed', soft: '#f5f3ff', icon: Sparkles, note: 'A clear answer, evidence, and accountable next steps' },
};

// Per-section icons matched by heading keyword — the row-cards read like a
// specialist's dossier, not uniform bullets. Fallback = accent dot (existing).


function TaskSynthesisRenderer({ taskTag, roomKind, content }) {
  // room_kind (from skill_used events) wins; task tag stays as the legacy alias.
  const kind = String(roomKind || '').toLowerCase();
  const spec = SYNTHESIS_PRESENTATIONS[kind]
    || SYNTHESIS_PRESENTATIONS[String(taskTag || 'GENERAL').toUpperCase()]
    || SYNTHESIS_PRESENTATIONS.GENERAL;
  const Icon = spec.icon;
  const sections = splitSynthesisSections(content);
  return (
    <div className="overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: `${spec.accent}33` }}>
      <div className="px-4 py-3" style={{ background: `linear-gradient(110deg, ${spec.soft}, white)` }}>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${spec.accent}16`, color: spec.accent }}><Icon size={17} /></span>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.16em]" style={{ color: spec.accent }}>
              {kind && SYNTHESIS_PRESENTATIONS[kind] ? `${kind.toUpperCase()} · ${spec.label}` : spec.label}
            </div>
            <p className="mt-0.5 text-[12px] text-[#525252]">{spec.note}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-px bg-[#e9e6e0]">
        {sections.map((section, index) => (
          <section key={`${section.title}-${index}`} className="bg-white px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              {(() => {
                const SIcon = sectionIconFor(kind, section.title);
                return SIcon
                  ? <SIcon size={12} style={{ color: spec.accent }} />
                  : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: spec.accent }} />;
              })()}
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#262626]">{section.title}</h4>
            </div>
            {(() => {
              const bodyMd = section.body.join('\n').trim();
              // An outreach section that IS an email renders as a real email
              // artifact (envelope + letter body), never raw markdown prose.
              const email = parseEmailMarkdown(bodyMd);
              if (email) {
                return <EmailBlock subject={email.subject} envelope={email.envelope} body={email.body} renderMarkdown={renderMarkdownLite} />;
              }
              return <div className="text-[12.5px] leading-relaxed text-[#262626] break-words">{renderMarkdownLite(bodyMd)}</div>;
            })()}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ─── Top-level page ─────────────────────────────────────────────────── */

export default function HyperAgents() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { user, org, logout } = useAuth();

  // Collapse the sidebar to a rail in the Hyper Agents room (more canvas for
  // the live swarm). Sidebar's ChevronRight re-opens it. Restore on leave.
  useEffect(() => {
    window.dispatchEvent(new Event('hivemind:close-sidebar'));
    return () => window.dispatchEvent(new Event('hivemind:open-sidebar'));
  }, []);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const domainRoomsEnsuredRef = useRef(false);
  // viewMode: 'hero' (company dashboard — /employees/mycompany, the landing)
  // | 'leads' | 'campaigns' | 'thread' (room chat) | 'roster'.
  // The URL is the source of truth on mount/deep-link; goMode() keeps it in
  // sync on every in-app switch so each feature has its own address.
  const _parsePath = () => {
    try {
      const p = window.location.pathname;
      const m = p.match(/\/employees\/rooms\/([0-9a-f-]{36})/i);
      if (m) return { mode: 'thread', roomId: m[1] };
      if (/\/employees\/agents/.test(p)) return { mode: 'roster', roomId: null };
      if (/\/employees\/leads/.test(p)) return { mode: 'leads', roomId: null };
      if (/\/employees\/campaigns/.test(p)) return { mode: 'campaigns', roomId: null };
      return { mode: 'hero', roomId: null };
    } catch { return { mode: 'hero', roomId: null }; }
  };
  const _init = _parsePath();
  const [activeRoomId, setActiveRoomId] = useState(_init.roomId);
  const [viewMode, setViewMode] = useState(_init.mode);
  const goMode = useCallback((mode, roomId, query = {}) => {
    setViewMode(mode);
    if (roomId !== undefined) setActiveRoomId(roomId);
    const base = '/hivemind/app/employees';
    const url = mode === 'hero' ? `${base}/mycompany`
      : mode === 'roster' ? `${base}/agents`
        : mode === 'leads' ? `${base}/leads`
          : mode === 'campaigns' ? `${base}/campaigns`
          : (roomId ? `${base}/rooms/${roomId}` : base);
    const params = new URLSearchParams();
    if (query.campaignReturn) params.set('campaignReturn', query.campaignReturn);
    if (query.campaign) params.set('campaign', query.campaign);
    navigate(`${url}${params.size ? `?${params.toString()}` : ''}`, { replace: true });
  }, [navigate]);
  // Canonicalize the bare /employees URL to /employees/mycompany (keep ?onboard=1).
  useEffect(() => {
    if (/\/employees\/?$/.test(window.location.pathname)) {
      navigate(`/hivemind/app/employees/mycompany${window.location.search}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRooms = useCallback(async () => {
    setError(null);
    try {
      if (!domainRoomsEnsuredRef.current) {
        domainRoomsEnsuredRef.current = true;
        try {
          await apiClient.ensureHyperDomainRooms();
        } catch {
          domainRoomsEnsuredRef.current = false;
        }
      }
      const resp = await apiClient.listHyperRooms();
      const list = resp?.rooms || [];
      setRooms(list);
      if (!activeRoomId && list.length && !list[0].archived_at) {
        setActiveRoomId(list[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [activeRoomId]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleDeleteRoom = useCallback(async (room) => {
    if (!window.confirm(t('hyperAgents.confirmDeleteRoom', 'Permanently delete #{{name}}? This removes the room and all its discussion. Cannot be undone.', { name: room.name }))) return;
    try {
      await apiClient.deleteHyperRoom(room.id);
      setRooms(prev => prev.filter(r => r.id !== room.id));
      setActiveRoomId(prev => (prev === room.id ? null : prev));
    } catch (err) {
      // HQ room: carries the company dashboard state — needs an explicit
      // second confirm; a forced delete drops the org back to onboarding.
      if (err.response?.status === 409 && err.response?.data?.code === 'HQ_ROOM') {
        const msg = err.response.data.error || 'This is your company HQ. Deleting it clears your company dashboard and you will need to onboard again.';
        if (!window.confirm(`${msg}\n\n${t('hyperAgents.confirmHqDelete', 'Delete anyway and start fresh?')}`)) return;
        try {
          await apiClient.deleteHyperRoom(room.id, { force: true });
          setRooms(prev => prev.filter(r => r.id !== room.id));
          setActiveRoomId(prev => (prev === room.id ? null : prev));
          goMode('hero', null); // hero now renders the onboarding flow (no company)
        } catch (e2) {
          setError(e2.response?.data?.error || e2.message);
        }
        return;
      }
      setError(err.response?.data?.error || err.message);
    }
  }, [t, goMode]);

  const liveRooms = useMemo(() => rooms.filter(r => !r.archived_at), [rooms]);
  const archivedRooms = useMemo(() => rooms.filter(r => r.archived_at), [rooms]);
  const domainHomeRooms = useMemo(() => {
    const order = Object.fromEntries(DOMAIN_ROOMS.map((domain, index) => [domain.key, index]));
    return liveRooms
      .filter(room => room.is_domain_home)
      .sort((a, b) => (order[a.room_tag] ?? 99) - (order[b.room_tag] ?? 99));
  }, [liveRooms]);
  const workRooms = useMemo(() => liveRooms.filter(room => !room.is_domain_home), [liveRooms]);

  // ── First-run gate: Polsia-style company onboarding ────────────────
  // A brand-new org (no rooms yet, never onboarded/skipped) gets the
  // website→company-genesis flow instead of the bare playground. The
  // orchestrator grounds a profile+mission in HIVEMIND memory, hires a
  // starting team and provisions the HQ room.
  // ?onboard=1 forces the flow even when rooms exist (re-run for a new
  // company / demo) — non-destructive; existing rooms are untouched.
  const forceOnboard = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('onboard') === '1'; } catch { return false; }
  }, []);
  const [onboardDone, setOnboardDone] = useState(() => {
    try { return localStorage.getItem('hm_hyper_onboarded') === '1'; } catch { return true; }
  });
  const [onboardDismissed, setOnboardDismissed] = useState(false);
  const finishOnboarding = useCallback((result) => {
    try { localStorage.setItem('hm_hyper_onboarded', '1'); } catch { /* noop */ }
    setOnboardDone(true);
    setOnboardDismissed(true);
    // Strip ?onboard=1 so a refresh doesn't re-trigger the flow.
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.has('onboard')) { u.searchParams.delete('onboard'); window.history.replaceState({}, '', u); }
    } catch { /* noop */ }
    goMode('hero', null); // Enter your workspace → the mycompany dashboard
    domainRoomsEnsuredRef.current = false;
    fetchRooms();
    emitUsageChanged();
  }, [fetchRooms, goMode]);
  const showOnboarding = !loading && !onboardDismissed && ((liveRooms.length === 0 && !onboardDone) || forceOnboard);
  if (showOnboarding) {
    return (
      <div className="max-w-[1280px] mx-auto">
        <HyperOnboarding onComplete={finishOnboarding} onSkip={() => finishOnboarding(null)} />
      </div>
    );
  }

  // ── Empty state: render existing DigitalEmployees roster + CTA ─────
  // Only when the org has never onboarded — an onboarded org with no rooms
  // still lands on the company hero (full rail layout below).
  if (!loading && liveRooms.length === 0 && !onboardDone) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <PageWalkthrough pageKey="hyper-agents" steps={HYPER_AGENTS_STEPS} />
        <div className="mb-5 bg-gradient-to-br from-[#faf9f4] to-white border border-[#e3e0db] rounded-xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
              {t('hyperAgents.title', 'Hyper Agents — Cognitive Swarm Intelligence on HIVEMIND')}
            </h2>
            <p className="text-[12px] text-[#525252] mt-1">
              {t('hyperAgents.emptyStateDesc', 'Build a room. Your agents talk to each other under WhatsApp-style threads, debate when their roles clash, and self-evolve from your conversations over time.')}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <UsageTracker resource="hyperRooms" />
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-[#0a0a0a] hover:bg-[#262626] text-white text-[12px] font-semibold px-3.5 py-2 rounded-lg"
            >
              <Plus size={13} /> {t('hyperAgents.newRoom', 'New room')}
            </button>
          </div>
        </div>

        {/* Existing roster (no duplication) */}
        <DigitalEmployees />

        <AnimatePresence>
          {showCreate && (
            <CreateRoomModal
              onClose={() => setShowCreate(false)}
              onCreated={(room) => {
                setShowCreate(false);
                setRooms(prev => [room, ...prev]);
                goMode('thread', room.id); // drop straight into the new room
                emitUsageChanged(); // refresh the Rooms usage meter
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── WhatsApp layout (post-first-room) ──────────────────────────────
  return (
    <div className="font-['Space_Grotesk'] flex h-[calc(100vh-3.5rem)] min-h-[600px] -m-6 max-w-none bg-white border-t border-[#e3e0db] overflow-hidden">
      <PageWalkthrough pageKey="hyper-agents" steps={HYPER_AGENTS_STEPS} />
      {/* Left rail: rooms */}
      <aside className="hidden w-[240px] min-w-[240px] shrink-0 flex-col border-r border-[#e3e0db] bg-[#faf9f4] md:flex">
        <header className="px-3 py-3 border-b border-[#e3e0db] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-violet-500" />
            <span className="text-[12px] font-semibold text-[#0a0a0a]">{t('hyperAgents.rooms', 'Rooms')}</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="text-[#525252] hover:text-[#0a0a0a]"
            title={t('hyperAgents.newRoom', 'New room')}
          >
            <Plus size={14} />
          </button>
        </header>

        <div className="px-3 py-2 border-b border-[#e3e0db]">
          <UsageTracker resource="hyperRooms" compact />
        </div>

        {/* YOUR COMPANY — always-present entry to the company/onboarding hero. */}
        <div className="px-2 pt-2">
          <button
            onClick={() => goMode('hero', null)}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold transition-colors ${viewMode === 'hero' ? 'bg-[#0a0a0a] text-white' : 'text-[#0a0a0a] hover:bg-white border border-[#e3e0db]'}`}
          >
            <Building2 size={13} className={viewMode === 'hero' ? 'text-white' : 'text-violet-500'} />
            {t('hyperAgents.yourCompany', 'Your Company')}
          </button>
          {/* YOUR LEADS — outreach progress board (Notion-style). */}
          <button
            onClick={() => goMode('leads', null)}
            className={`mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold transition-colors ${viewMode === 'leads' ? 'bg-[#0a0a0a] text-white' : 'text-[#0a0a0a] hover:bg-white border border-[#e3e0db]'}`}
          >
            <ListChecks size={13} className={viewMode === 'leads' ? 'text-white' : 'text-[#117dff]'} />
            {t('hyperAgents.yourLeads', 'Your Leads')}
          </button>
          {/* YOUR CAMPAIGNS — standalone paid media workspace, outside rooms. */}
          <button
            onClick={() => goMode('campaigns', null)}
            className={`mt-1.5 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold transition-colors ${viewMode === 'campaigns' ? 'bg-[#0a0a0a] text-white' : 'text-[#0a0a0a] hover:bg-white border border-[#e3e0db]'}`}
          >
            <Megaphone size={13} className={viewMode === 'campaigns' ? 'text-white' : 'text-[#c2410c]'} />
            {t('hyperAgents.runAdsOnX', 'Run Ads on X')}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-1">
          <div className="px-3 pt-2 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3]">
            {t('hyperAgents.companyRooms', 'Company rooms')}
          </div>
          {domainHomeRooms.map(r => (
            <RoomRow
              key={r.id}
              room={r}
              active={r.id === activeRoomId && viewMode === 'thread'}
              onClick={() => goMode('thread', r.id)}
            />
          ))}
          {workRooms.length > 0 && (
            <div className="px-3 pt-3 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3] border-t border-[#e3e0db] mt-1">
              {t('hyperAgents.workRooms', 'Work rooms')}
            </div>
          )}
          {workRooms.map(r => (
            <RoomRow
              key={r.id}
              room={r}
              active={r.id === activeRoomId && viewMode === 'thread'}
              onClick={() => goMode('thread', r.id)}
              onDelete={handleDeleteRoom}
            />
          ))}
          {archivedRooms.length > 0 && (
            <details className="px-2 pt-3 text-[10px] text-[#a3a3a3]">
              <summary className="cursor-pointer hover:text-[#525252] flex items-center gap-1">
                <Archive size={10} /> Archived ({archivedRooms.length})
              </summary>
              <div className="mt-1">
                {archivedRooms.map(r => (
                  <RoomRow
                    key={r.id}
                    room={r}
                    active={r.id === activeRoomId}
                    onClick={() => goMode('thread', r.id)}
                    onDelete={handleDeleteRoom}
                    archived
                  />
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Footer: one-tap toggle. In a room → "Out of Room" (exits to the
            agent roster). In the roster → "Back to Room". Lives at the bottom
            of the rooms stack so the room view stays focused + uncluttered. */}
        {viewMode === 'thread' && (
          <div className="border-t border-[#e3e0db] p-2 shrink-0">
            <button
              onClick={() => goMode('hero')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono uppercase tracking-wider text-[#525252] border border-[#e3e0db] bg-white hover:bg-[#faf9f4] hover:text-[#0a0a0a] transition-colors"
              title={t('hyperAgents.exitRoom', 'Out of room — back to the company dashboard')}
            >
              <LogOut size={13} /> {t('hyperAgents.outOfRoom', 'Out of Room')}
            </button>
          </div>
        )}

        {/* Account — the app sidebar is hidden on this page, so the rooms
            rail carries the account section (profile/usage/billing/settings,
            user card, sign out) at its bottom. */}
        <div className="border-t border-[#e3e0db] px-2 pt-2.5 pb-2 shrink-0 bg-[#faf9f4]">
          <div className="text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3] px-2 mb-1">
            {t('hyperAgents.account', 'Account')}
          </div>
          {[
            { icon: User, label: t('hyperAgents.profile', 'Profile'), to: '/hivemind/app/profile' },
            { icon: Gauge, label: t('hyperAgents.usage', 'Usage'), to: '/hivemind/app/usage' },
            { icon: CreditCard, label: t('hyperAgents.billing', 'Billing'), to: '/hivemind/app/billing', badge: 'PRO' },
            { icon: Settings, label: t('hyperAgents.settings', 'Settings'), to: '/hivemind/app/settings' },
          ].map(({ icon: Icon, label, to, badge }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-[#525252] hover:text-[#0a0a0a] hover:bg-white transition-colors"
            >
              <Icon size={13} /> {label}
              {badge ? <span className="ml-auto text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-[#117dff]/10 text-[#117dff]">{badge}</span> : null}
            </button>
          ))}
          <div className="flex items-center gap-2 px-2 py-2 mt-1 border-t border-[#e3e0db]">
            <span className="w-7 h-7 rounded-lg bg-[#117dff]/10 text-[#117dff] flex items-center justify-center text-[11px] font-bold shrink-0">
              {(user?.display_name || user?.email || '?')[0].toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold text-[#0a0a0a] truncate">{user?.display_name || user?.email}</div>
              <div className="text-[9.5px] font-mono text-[#a3a3a3] capitalize">{(org?.plan || 'free')} {t('hyperAgents.plan', 'Plan')}</div>
            </div>
          </div>
          <button
            onClick={async () => { try { await logout(); } catch { /* noop */ } navigate('/hivemind/login'); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-[#525252] hover:text-[#dc2626] transition-colors"
          >
            <LogOut size={13} /> {t('hyperAgents.signOut', 'Sign Out')}
          </button>
        </div>
      </aside>

      {/* Middle: hero dashboard, thread or roster */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col">
        {viewMode === 'hero' ? (
          <CompanyDashboard
            onOpenRoom={(room) => {
              fetchRooms();
              goMode('thread', room.id);
            }}
            onShowRoster={() => goMode('roster')}
            onOpenLeads={() => goMode('leads', null)}
          />
        ) : viewMode === 'leads' ? (
          <LeadsView />
        ) : viewMode === 'campaigns' ? (
          <CampaignsView onOpenRoom={(roomId, campaignId) => goMode('thread', roomId, { campaignReturn: campaignId })} />
        ) : viewMode === 'roster' ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-4 py-3 border-b border-[#e3e0db] bg-white flex items-center gap-2 sticky top-0 z-10">
              <LayoutGrid size={14} className="text-violet-500" />
              <span className="text-[13px] font-semibold text-[#0a0a0a]">{t('hyperAgents.agentRoster', 'Agent roster')}</span>
              <button onClick={() => goMode('hero')} className="text-[10px] text-[#117dff] hover:underline ml-auto">
                {t('hyperAgents.backToDashboard', '← Company dashboard')}
              </button>
            </div>
            <div className="p-4">
              <DigitalEmployees />
            </div>
          </div>
        ) : activeRoomId ? (
          <RoomThread
            key={activeRoomId}
            roomId={activeRoomId}
            onArchived={() => { fetchRooms(); setActiveRoomId(null); }}
            onCampaignReady={(campaignId) => goMode('campaigns', null, { campaign: campaignId })}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-[12px] text-[#a3a3a3]">
            <span>{t('hyperAgents.pickRoom', 'Pick a room from the left.')}</span>
            <button
              onClick={() => goMode('hero')}
              className="text-[11px] text-[#117dff] hover:underline"
            >
              {t('hyperAgents.backToDashboard2', 'Back to the company dashboard →')}
            </button>
          </div>
        )}
      </main>

      {/* Right rail: participants is rendered inside <RoomThread/> so the
          rail is co-located with thread-only data (live participants
          from /v1/hyper-rooms/:id). When viewMode='roster' the right
          rail is hidden — DigitalEmployees fills the full width. */}

      <AnimatePresence>
        {showCreate && (
          <CreateRoomModal
            onClose={() => setShowCreate(false)}
            onCreated={(room) => {
              setShowCreate(false);
              setRooms(prev => [room, ...prev]);
              goMode('thread', room.id); // drop straight into the new room
              emitUsageChanged(); // refresh the Rooms usage meter
            }}
          />
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute top-3 right-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

/* ─── Room row in the left rail ──────────────────────────────────────── */

function RoomRow({ room, active, onClick, archived, onDelete }) {
  const { t } = useTranslation('dashboard');
  const participants = room.participants || [];
  const projectLabel = room.project?.name || room.project?.slug || null;
  const domain = domainRoomDefinition(room.room_tag || room.roomTag || 'general');
  const DomainIcon = domain.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick?.(); }}
      className={`group w-full text-left px-3 py-2 flex items-center gap-2 transition-colors cursor-pointer ${
        active ? 'bg-white border-l-2 border-violet-500' : 'hover:bg-white/60 border-l-2 border-transparent'
      } ${archived ? 'opacity-60' : ''}`}
    >
      <Hash size={11} className="text-[#a3a3a3] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[12px] font-semibold text-[#0a0a0a] truncate">{room.name}</div>
          {projectLabel && (
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#117dff]/10 text-[#117dff] text-[8px] font-mono uppercase tracking-wider max-w-[86px] truncate">
              <FolderOpen size={8} /> {projectLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-[#a3a3a3] font-mono">
          <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase" style={{ color: domain.color }}>
            <DomainIcon size={9} /> {domain.label}
          </span>
          <span className="text-[#d4d0ca]">·</span>
          {participants.slice(0, 4).map(p => (
            <AgentAvatar key={p.id} agent={p} size={18} />
          ))}
          {participants.length > 4 && (
            <span className="text-[9px] text-[#a3a3a3]">+{participants.length - 4}</span>
          )}
        </div>
      </div>
      <div className="relative shrink-0 w-9 flex items-center justify-end">
        {(() => {
          const rt = relTime(room.updated_at || room.updatedAt);
          return rt ? (
            <span
              className="absolute right-0 text-[9px] font-mono text-[#b3aea4] group-hover:opacity-0 transition-opacity flex items-center gap-0.5"
              title={t('hyperAgents.lastUsed', 'Last used {{t}} ago', { t: rt })}
            >
              <Clock size={8} /> {rt}
            </span>
          ) : null;
        })()}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(room); }}
            className="opacity-0 group-hover:opacity-100 text-[#a3a3a3] hover:text-red-500 transition-opacity p-1"
            title={t('hyperAgents.deleteRoomPermanently', 'Delete room permanently')}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function DomainRoomIntro({ room, company, busy, onRun, onEnter }) {
  const domain = domainRoomDefinition(room.room_tag || room.roomTag || 'general');
  const DomainIcon = domain.icon;
  const displayLabel = domain.key === 'general' ? (room.name || 'Company HQ') : domain.label;
  const stages = DOMAIN_ROOM_STAGES[domain.key] || DOMAIN_ROOM_STAGES.general;
  const profile = company?.profile || {};
  const companyName = company?.company || 'Your company';
  const facts = [
    ['Mission', company?.mission],
    ['What you do', profile.what_it_does],
    ['Positioning', profile.positioning],
    ['Audience', profile.icp],
    ['Offer', profile.offer],
  ].filter(([, value]) => typeof value === 'string' && value.trim());
  const contextPrefix = [
    `Company: ${companyName}.`,
    company?.mission ? `Mission: ${company.mission}` : '',
    profile.positioning ? `Positioning: ${profile.positioning}` : '',
    profile.icp ? `Audience: ${profile.icp}` : '',
    profile.offer ? `Offer: ${profile.offer}` : '',
  ].filter(Boolean).join('\n');

  return (
    <div className="-mx-4 -mt-4 mb-6 border-b border-[#e3e0db] bg-white">
      <section
        className="min-h-[42vh] max-h-[520px] px-6 py-8 md:px-10 md:py-10 flex flex-col justify-between overflow-hidden border-b"
        style={{ backgroundColor: `${domain.color}14`, borderColor: `${domain.color}35` }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold uppercase text-[#404040]">
            <DomainIcon size={15} style={{ color: domain.color }} /> Company room
          </span>
          <button type="button" onClick={onEnter} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#404040] hover:text-[#0a0a0a]">
            Enter discussion <ArrowRight size={13} />
          </button>
        </div>
        <div
          className="max-w-[880px] border px-5 py-5 md:px-7 md:py-6 shadow-[0_18px_50px_-36px_rgba(0,0,0,0.45)]"
          style={{ backgroundColor: 'rgba(255,255,255,0.72)', borderColor: `${domain.color}55`, backdropFilter: 'blur(18px)' }}
        >
          <p className="text-[11px] font-mono uppercase text-[#525252]">{companyName} · {displayLabel}</p>
          <h1 className="mt-3 text-[38px] md:text-[58px] leading-[1.02] font-semibold text-[#0a0a0a] break-words">
            {displayLabel}
          </h1>
          <p className="mt-4 max-w-[720px] text-[14px] md:text-[16px] leading-relaxed text-[#404040]">{domain.desc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] font-mono text-[#525252]">
          <span>{facts.length} company facts loaded</span>
          <span>{Array.isArray(company?.research) ? company.research.length : 0} research signals</span>
          <span>{Array.isArray(company?.team) ? company.team.length : 0} team members</span>
        </div>
      </section>

      <section className="px-6 py-7 md:px-10 md:py-8 border-b border-[#e3e0db]">
        <div className="max-w-[1080px]">
          <p className="text-[10px] font-mono uppercase text-[#a3a3a3]">Company context</p>
          <h2 className="mt-1 text-[20px] font-semibold text-[#0a0a0a]">What this Room already knows</h2>
          <div className="mt-5 divide-y divide-[#e3e0db] border-y border-[#e3e0db]">
            {facts.map(([label, value]) => (
              <div key={label} className="grid grid-cols-1 gap-1 py-3 md:grid-cols-[150px_1fr] md:gap-5">
                <span className="text-[10px] font-mono uppercase text-[#737373]">{label}</span>
                <span className="text-[12.5px] leading-relaxed text-[#262626]">{value}</span>
              </div>
            ))}
            {facts.length === 0 && (
              <div className="py-3 text-[12px] text-[#737373]">Company context will appear here after onboarding completes.</div>
            )}
          </div>
          <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-2">
            <div>
              <h3 className="text-[11px] font-semibold text-[#262626]">Evidence already available</h3>
              <div className="mt-2 divide-y divide-[#e3e0db] border-y border-[#e3e0db]">
                {(Array.isArray(company?.research) ? company.research : []).slice(0, 8).map((item, index) => (
                  <div key={`${item?.url || item?.title || 'signal'}-${index}`} className="py-2.5">
                    <p className="text-[11.5px] font-medium text-[#262626]">{item?.title || `Research signal ${index + 1}`}</p>
                    {item?.snippet && <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#737373] line-clamp-2">{item.snippet}</p>}
                  </div>
                ))}
                {(!Array.isArray(company?.research) || company.research.length === 0) && (
                  <div className="py-2.5 text-[11px] text-[#a3a3a3]">No external research has been filed yet.</div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold text-[#262626]">Team and company documents</h3>
              <div className="mt-2 divide-y divide-[#e3e0db] border-y border-[#e3e0db]">
                {(Array.isArray(company?.team) ? company.team : []).map((member) => (
                  <div key={member.id || member.name} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-[11.5px] font-medium text-[#262626]">{member.name}</span>
                    <span className="text-[9.5px] font-mono uppercase text-[#737373] text-right">{member.role || 'Agent'}</span>
                  </div>
                ))}
                {(Array.isArray(company?.documents) ? company.documents : []).map((document) => (
                  <div key={document} className="flex items-center gap-2 py-2.5 text-[11px] text-[#525252]">
                    <FileText size={11} style={{ color: domain.color }} /> {document}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-7 md:px-10 md:py-8">
        <div className="max-w-[1080px]">
          <p className="text-[10px] font-mono uppercase text-[#a3a3a3]">Suggested operating path</p>
          <h2 className="mt-1 text-[20px] font-semibold text-[#0a0a0a]">Start with the next useful task</h2>
          <div className="mt-5 border-y border-[#e3e0db] divide-y divide-[#e3e0db]">
            {stages.map(([stage, title, detail, prompt], index) => (
              <div key={title} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 py-4">
                <span
                  className="h-7 w-7 flex items-center justify-center rounded-[6px] text-[10px] font-mono font-semibold border"
                  style={{ color: domain.color, borderColor: `${domain.color}55`, backgroundColor: `${domain.color}12` }}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[9.5px] font-mono uppercase" style={{ color: domain.color }}>{stage}</span>
                    <h3 className="text-[13px] font-semibold text-[#171717]">{title}</h3>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#737373]">{detail}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRun(`${contextPrefix}\n\nTask: ${prompt}`)}
                  className="h-8 px-3 inline-flex items-center gap-1.5 rounded-[6px] bg-[#0a0a0a] text-white text-[10.5px] font-semibold hover:bg-[#262626] disabled:opacity-50"
                >
                  <ArrowUpRight size={12} /> Run
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Room thread (middle + right) ───────────────────────────────────── */


function mergeHyperEvents(base, overlay) {
  // Returns the SAME array reference when nothing new arrived — the 250ms
  // fallback poll calls this constantly, and a fresh identity every tick made
  // React re-render the whole thread 4×/sec (visible jank on long turns).
  const current = Array.isArray(base) ? base : [];
  const incoming = Array.isArray(overlay) ? overlay : [];
  if (!incoming.length) return current;
  const seen = new Set(current.map(hyperEventKey));
  let merged = null;
  incoming.forEach((event, index) => {
    const key = hyperEventKey(event, index);
    if (!seen.has(key)) {
      seen.add(key);
      if (!merged) merged = [...current];
      merged.push(event);
    }
  });
  return merged || current;
}

function RoomThread({ roomId, onArchived, onCampaignReady }) {
  const { t, i18n } = useTranslation('dashboard');
  const { user, org } = useAuth() || {};
  const [room, setRoom] = useState(null);
  const [turns, setTurns] = useState([]);
  const [companyContext, setCompanyContext] = useState(null);
  const [showRoomIntro, setShowRoomIntro] = useState(true);
  const [roomIntroAcknowledged, setRoomIntroAcknowledged] = useState(false);
  const [hqActivity, setHqActivity] = useState([]); // HQ control-room feed (agent reports)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTurnId, setActiveTurnId] = useState(null);
  const [liveLines, setLiveLines] = useState([]);
  const [draft, setDraft] = useState('');
  // Uploaded attachments for the next turn — each {id, name, status, documentId, error}.
  // On upload they ingest into HIVEMIND (persist); the turn references them so the
  // team recalls their content this turn too (hybrid: persist + immediate use).
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showHire, setShowHire] = useState(false);      // marketplace popup (hire NEW agents)
  const [hiredCongrats, setHiredCongrats] = useState(null); // {name, title} → congrats overlay
  const [showConnectors, setShowConnectors] = useState(false);
  const [showEvo, setShowEvo] = useState(false);
  // Live per-turn self-evolve signal: {added, employees:[{slug,name,added,total}]} → transient chip.
  const [evoFlash, setEvoFlash] = useState(null);
  const evoFlashTimer = useRef(null);
  const [showJournal, setShowJournal] = useState(false);
  // Gmail connect gate — the outreach-powers nudge. Opens once per room when a
  // task room loads and no Google connector is connected; also opened when Send
  // is pressed with no connection. `null` = unknown (still checking).
  const [gmailConnected, setGmailConnected] = useState(null);
  const [gmailGateOpen, setGmailGateOpen] = useState(false);
  const gmailGateShownRef = useRef(false);
  const navigate = useNavigate();
  // Swarm Instructions: per-room free-form override the director follows on top of all defaults.
  const [showSwarm, setShowSwarm] = useState(false);
  const [swarmDraft, setSwarmDraft] = useState('');
  const [savingSwarm, setSavingSwarm] = useState(false);
  // First-run setup walkthrough (4 slides, per-room, no Save — changes apply live).
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(0);
  const [dmAgent, setDmAgent] = useState(null);
  const [flybyBusy, setFlybyBusy] = useState(false);
  const [approveBusy, setApproveBusy] = useState(null); // approval_id being resolved
  const [callOpen, setCallOpen] = useState(false);
  const [callNumber, setCallNumber] = useState('');
  const [callBusy, setCallBusy] = useState(false);
  const [callStatus, setCallStatus] = useState(null);
  const [browserCall, setBrowserCall] = useState(null);
  const [projects, setProjects] = useState([]);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [savingScope, setSavingScope] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const threadEndRef = useRef(null);
  const scrollRef = useRef(null);
  const discussionStartRef = useRef(null);
  const campaignReturnRef = useRef(new URLSearchParams(window.location.search).get('campaignReturn'));
  const campaignReturnedRef = useRef(false);
  const isCampaignRoom = Boolean(campaignReturnRef.current || room?.campaign_id);
  // Auto-scroll only when the user is already pinned to the bottom — so a live turn's rapid SSE
  // events don't yank them back down while they scroll up to read. Updated on manual scroll.
  // Normal rooms open on their permanent category workspace. Once the user
  // sends or scrolls to the discussion, live activity follows the bottom.
  const pinnedRef = useRef(false);
  const onThreadScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) pinnedRef.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 120;
  }, []);

  // Projects for the scope badge / changer (room can be moved Org ↔ Project).
  useEffect(() => {
    apiClient.listAccessibleProjects()
      .then(d => setProjects((d?.projects || d || []).filter(Boolean)))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    setGoalDraft(room?.goal || '');
  }, [room?.id, room?.goal]);

  // Ringing overlay: the call visibly "happens" (pulse rings while Telnyx
  // dials, then in-progress). {number, status: dialing|ok|error} | null.
  const [callOverlay, setCallOverlay] = useState(null);
  const handleRoomCall = useCallback(async () => {
    const to = callNumber.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(to) || callBusy) return;
    setCallBusy(true);
    setCallStatus(null);
    setBrowserCall(null);
    setCallOverlay({ number: to, status: 'dialing' });
    try {
      const result = await apiClient.callHyperRoom(roomId, { to, goal: room?.goal || '' });
      if (result?.delivery === 'browser') {
        setCallStatus({ ok: true, message: t('hyperAgents.browserCallReady', 'Telephony is not connected for this provider. Run the same call contract in your browser.') });
        setBrowserCall(result.browser_call || { provider: result.provider, goal: room?.goal || '', language: 'en', mode: 'external' });
        setCallOverlay(null);
      } else {
        setCallStatus({ ok: true, message: t('hyperAgents.callStarted', 'TARA is dialing now.'), result });
        setCallOverlay({ number: to, status: 'ok' });
        setCallNumber('');
      }
    } catch (err) {
      setCallStatus({ ok: false, message: err.response?.data?.error || err.message });
      setCallOverlay({ number: to, status: 'error' });
    } finally {
      setCallBusy(false);
    }
  }, [callBusy, callNumber, room?.goal, roomId, t]);

  // Change room scope after creation: null = org-wide, <id> = project HIVEMIND.
  const handleSetScope = useCallback(async (newProjectId) => {
    setSavingScope(true);
    try {
      const resp = await apiClient.updateHyperRoom(roomId, { project_id: newProjectId || null });
      setRoom(prev => ({ ...prev, ...resp.room, participants: prev?.participants }));
      setScopeOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSavingScope(false);
    }
  }, [roomId]);

  const handleSaveGoal = useCallback(async () => {
    const nextGoal = goalDraft.trim();
    if (!nextGoal || savingGoal) return;
    setSavingGoal(true);
    try {
      const resp = await apiClient.updateHyperRoom(roomId, { goal: nextGoal });
      setRoom(prev => ({ ...prev, ...resp.room, participants: prev?.participants }));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSavingGoal(false);
    }
  }, [goalDraft, roomId, savingGoal]);

  const mergeLiveEvents = useCallback((current, incoming) => {
    return mergeHyperEvents(current, incoming);
  }, []);

  // Load room + history
  const load = useCallback(async (opts = {}) => {
    setError(null);
    // quiet = refresh in place (turn seal, background refetch). The full-screen
    // spinner is ONLY for the first mount — flipping it on seal made the whole
    // thread blink to a loader and back right after the synthesis landed.
    if (!opts.quiet) setLoading(true);
    try {
      const resp = await apiClient.getHyperRoom(roomId);
      setRoom(resp.room);
      const nextTurns = resp.turns || [];
      setTurns(nextTurns);
      // Task rooms may already be running because the control plane starts
      // them before navigation. Adopt that turn so SSE and the DB fallback
      // poll begin immediately instead of waiting for a reload.
      const liveTurn = [...nextTurns].reverse().find((turn) => turn?.status === 'live');
      setActiveTurnId(liveTurn?.id || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiClient.hyperCompany()
      .then((data) => setCompanyContext(data?.company || null))
      .catch(() => setCompanyContext(null));
  }, [roomId]);

  useEffect(() => {
    if (!room?.id) return;
    if (isCampaignRoom || room.archivedAt || room.archived_at) {
      setShowRoomIntro(false);
      setRoomIntroAcknowledged(true);
      return;
    }
    // The category workspace is a permanent part of the room. A separate
    // acknowledgement flag sequences the optional first-run setup without
    // making the banner disappear after the first task.
    setShowRoomIntro(true);
    try {
      setRoomIntroAcknowledged(Boolean(window.localStorage.getItem(`hm-room-intro-${room.id}`)));
    } catch {
      setRoomIntroAcknowledged(false);
    }
  }, [isCampaignRoom, room?.id, room?.archivedAt, room?.archived_at]);

  const finishRoomIntro = useCallback(() => {
    try { window.localStorage.setItem(`hm-room-intro-${roomId}`, '1'); } catch { /* noop */ }
    setRoomIntroAcknowledged(true);
    window.requestAnimationFrame(() => {
      discussionStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [roomId]);

  useEffect(() => {
    const campaignId = campaignReturnRef.current || room?.campaign_id || room?.campaignId;
    if (!campaignId || !onCampaignReady) return undefined;
    let active = true;
    const checkCampaign = async () => {
      try {
        const response = await apiClient.getCampaign(campaignId);
        const campaign = response?.campaign;
        const hasPlan = Boolean(campaign?.planVersions?.length);
        if (active && !campaignReturnedRef.current && campaign?.roomId === roomId
          && hasPlan && ['READY_FOR_APPROVAL', 'RUNNING', 'SCHEDULED', 'PAUSED', 'COMPLETED'].includes(campaign.status)) {
          campaignReturnedRef.current = true;
          onCampaignReady(campaignId);
        }
      } catch { /* The Room remains usable while campaign status is temporarily unavailable. */ }
    };
    checkCampaign();
    const timer = window.setInterval(checkCampaign, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [onCampaignReady, room?.campaignId, room?.campaign_id, roomId]);

  // HQ control-room feed — agent reports from every other room's runs. Non-HQ
  // rooms just get an empty list, so this is safe to call for any room. Refreshes
  // when a turn seals (activeTurnId clears) so new reports appear live.
  useEffect(() => {
    let alive = true;
    apiClient.getHqActivity(roomId)
      .then((d) => { if (alive) setHqActivity(d?.activity || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [roomId, activeTurnId]);

  // Probe Gmail connection so outreach rooms can nudge (and gate Send).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const st = await apiClient.getConnectorConnectionStatus();
        const on = (st?.connectors || []).some(c => c?.connection
          && (String(c.id || '').toLowerCase() === 'gmail' || String(c.id || '').toLowerCase().startsWith('google')));
        if (alive) setGmailConnected(!!on);
      } catch { if (alive) setGmailConnected(false); }
    })();
    return () => { alive = false; };
  }, [roomId]);

  // Auto-open the gate ONCE for an outreach-shaped room with no Gmail.
  useEffect(() => {
    if (gmailConnected === false && !gmailGateShownRef.current && room) {
      const outreachy = /outreach|cold[- ]?email|email (campaign|sequence|messaging)|messaging|prospect/i
        .test(`${room.name || ''} ${room.goal || ''}`);
      if (outreachy) { gmailGateShownRef.current = true; setGmailGateOpen(true); }
    }
  }, [gmailConnected, room]);

  const connectGmail = useCallback(() => {
    navigate('/hivemind/app/connectors?connect=gmail');
  }, [navigate]);

  // Auto-scroll on new content — ONLY when pinned to the bottom, and INSTANTLY (no 'smooth', which
  // fights itself when live SSE events fire in rapid succession). Scrolls just the thread container,
  // never the page. This removes the jank + the scroll-up-yank-back glitch.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [turns, liveLines]);

  // One-shot seal latch per live turn: SSE and the fallback poll BOTH detect the
  // seal (they race) — without the latch load() fired twice back-to-back.
  const sealedRef = useRef(false);

  // SSE subscription while a turn is live
  useEffect(() => {
    if (!activeTurnId) return;
    sealedRef.current = false;
    const url = apiClient.hyperTurnStreamUrl(roomId, activeTurnId);
    let es;
    try {
      es = new EventSource(url, { withCredentials: true });
    } catch {
      return;
    }
    const onAny = (e) => {
      try {
        const data = JSON.parse(e.data);
        // Self-evolve: employees reflected this turn into their playbook. Update the playbook view
        // race-free (the event arrives just before seal) + flash a live "learned N" chip. Not a
        // thread line, so don't merge it into liveLines.
        if (e.type === 'self_evolve' || data.t === 'self_evolve') {
          setRoom(p => (p ? { ...p, evo_playbooks: data.playbooks || p.evo_playbooks } : p));
          setEvoFlash({ added: data.added || 0, employees: Array.isArray(data.employees) ? data.employees : [] });
          if (evoFlashTimer.current) clearTimeout(evoFlashTimer.current);
          evoFlashTimer.current = setTimeout(() => setEvoFlash(null), 7000);
          return;
        }
        // TARA call contract: the OS proposed an outbound call. Surface the global
        // first-contact-HITL popup (<CallContractModal> in AppShell). Not a thread line.
        if ((e.type === 'call_contract' || data.t === 'call_contract') && data.contract) {
          try {
            window.dispatchEvent(new CustomEvent('hm:call-contract', {
              detail: { campaign_id: data.campaign_id, contract: data.contract },
            }));
          } catch { /* ignore */ }
          return;
        }
        setLiveLines(prev => mergeLiveEvents(prev, [{ ...data, t: e.type === 'message' ? (data.t || 'line') : e.type }]));
        if (e.type === 'seal' || data.t === 'seal') {
          es.close();
          if (!sealedRef.current) {
            sealedRef.current = true;
            // Quiet refetch FIRST so the sealed turn is in `turns` before the
            // live lines are released — no spinner, no content gap, no blink.
            Promise.resolve(load({ quiet: true })).finally(() => {
              setActiveTurnId(null);
              setSubmitting(false);
            });
          }
        }
      } catch {
        // ignore
      }
    };
    [
      'router', 'router_bootstrap', 'typing', 'line', 'react', 'revise', 'validate',
      'seal', 'error', 'heartbeat',
      // Phase 4 cognitive upgrades:
      'decision_required', 'decision_saved',
      'final_report', 'harness_check', 'memory_audit',
      // Phase 4 swarm (R1-R5):
      'round_start', 'round_end',
      'hypothesis', 'peer_review', 'chain_of_thought',
      'skeptic_challenge', 'vote', 'swarm_verdict',
      // Deep simulation + flyby specialist gate:
      'ontology', 'workforce_assessment', 'flyby_proposal',
      'flyby_decision', 'flyby_joined', 'flyby_skipped',
      'simulation_phase', 'simulation_claim',
      // Recursive CSI convergence (multi-cycle):
      'cycle_start', 'cycle_end', 'convergence',
      // Prod hardening events (cost cap / wall-clock deadline / role warnings):
      'cost_cap_hit', 'deadline_hit', 'warning',
      // Phase 1-6: lead plan, recon/verify verdict, write-approval cards,
      // goalkeeper re-plan rounds:
      'plan', 'verify', 'approval_request', 'approval_resolved', 'goalkeeper_round',
      // Additional Population-Sim report (hideable popup dashboard):
      'sim_report',
      'connector_logo', 'gather', 'recon_pre', 'execute',
      // Places prospect discovery — 'using Maps' chip.
      'prospects',
      // Self-evolving employees: per-turn playbook learning signal.
      'self_evolve',
      // Room METHOD skills: progressive-disclosure skill loads (timeline chips).
      'skill_used',
      // Post-seal follow-up suggestions (clickable, one-click auto-run):
      'next_tasks',
      // TARA call contract → first-contact-HITL popup (approve to dial).
      'call_contract',
    ].forEach(name => es.addEventListener(name, onAny));
    es.addEventListener('error', () => {
      // network blip — let auto-reconnect handle it
    });

    // Fallback poll — guarantees the turn renders + completes even when the
    // browser blocks EventSource (wallet/ad-block extensions, partitioned
    // storage, or a buffering proxy). Reads the turn's lines from the DB and
    // merges by event identity so same-length SSE/poll races cannot hide a
    // fresh event.
    let stopped = false;
    const doPoll = async () => {
      if (stopped) return;
      try {
        const { turn } = await apiClient.getHyperTurn(roomId, activeTurnId);
        if (Array.isArray(turn?.lines) && turn.lines.length) {
          setLiveLines(prev => mergeLiveEvents(prev, turn.lines));
        }
        if (turn?.status && turn.status !== 'live') {
          stopped = true;
          clearInterval(poll);
          try { es.close(); } catch { /* ignore */ }
          if (!sealedRef.current) {
            sealedRef.current = true;
            Promise.resolve(load({ quiet: true })).finally(() => {
              setActiveTurnId(null);
              setSubmitting(false);
            });
          }
        }
      } catch { /* ignore — SSE may still deliver */ }
    };
    // Poll is the reliable path when SSE is buffered/blocked (wallet extensions,
    // partitioned storage, or an edge proxy holding text/event-stream). Fire it
    // RIGHT AWAY and at 250ms so the first agent bubble surfaces in well under a
    // second instead of waiting on the SSE connection.
    doPoll();
    const poll = setInterval(doPoll, 250);

    return () => {
      stopped = true;
      clearInterval(poll);
      try { es.close(); } catch { /* ignore */ }
    };
  }, [activeTurnId, roomId, load, mergeLiveEvents]);

  // Reset live overlay when turn changes
  useEffect(() => {
    if (!activeTurnId) setLiveLines([]);
  }, [activeTurnId]);

  async function setQualityMode(mode) {
    if (!room || (room.quality_mode || 'auto') === mode) return;
    const prevMode = room.quality_mode || 'auto';
    setRoom(prev => ({ ...prev, quality_mode: mode }));  // optimistic
    try {
      await apiClient.updateHyperRoom(roomId, { quality_mode: mode });
    } catch (e) {
      setRoom(prev => ({ ...prev, quality_mode: prevMode }));
      setError(e.response?.data?.error || e.message);
    }
  }

  // Additional Population-Sim toggle (opt-in). Optimistic + reverts on failure — and since
  // it's purely additive, a failed PATCH never blocks running the room normally.
  async function setSimMode(on) {
    if (!room) return;
    const next = on ? 'on' : 'off';
    const prev = room.sim_mode || 'off';
    if (prev === next) return;
    setRoom(p => ({ ...p, sim_mode: next }));  // optimistic
    try {
      await apiClient.updateHyperRoom(roomId, { sim_mode: next });
    } catch (e) {
      setRoom(p => ({ ...p, sim_mode: prev }));
      setError(e.response?.data?.error || e.message);
    }
  }

  // Self-evolving employees toggle (opt-in, additive). When on, employees reflect each turn
  // into a per-employee playbook and recall it next turn — they get better at THIS room over
  // time. Optimistic + reverts on failure; a failed PATCH never blocks running the room.
  async function setEvoMode(on) {
    if (!room) return;
    const next = on ? 'on' : 'off';
    const prev = room.evo_mode || 'off';
    if (prev === next) return;
    setRoom(p => ({ ...p, evo_mode: next }));  // optimistic
    try {
      await apiClient.updateHyperRoom(roomId, { evo_mode: next });
    } catch (e) {
      setRoom(p => ({ ...p, evo_mode: prev }));
      setError(e.response?.data?.error || e.message);
    }
  }

  // Reset learned playbooks. target=true → wipe all; target="<slug>" → wipe one employee.
  // Optimistic + reverts; the room re-learns over future turns.
  async function resetEvo(target = true) {
    if (!room) return;
    const prev = room.evo_playbooks || {};
    const next = target === true ? {} : (() => { const c = { ...prev }; delete c[target]; return c; })();
    setRoom(p => ({ ...p, evo_playbooks: next }));  // optimistic
    try {
      await apiClient.updateHyperRoom(roomId, { evo_reset: target });
    } catch (e) {
      setRoom(p => ({ ...p, evo_playbooks: prev }));
      setError(e.response?.data?.error || e.message);
    }
  }

  // Clear the room's journal (forget prior-turn memory). Optimistic + reverts.
  async function resetJournal() {
    if (!room) return;
    const prev = room.evo_journal || [];
    setRoom(p => ({ ...p, evo_journal: [] }));
    try {
      await apiClient.updateHyperRoom(roomId, { journal_reset: true });
    } catch (e) {
      setRoom(p => ({ ...p, evo_journal: prev }));
      setError(e.response?.data?.error || e.message);
    }
  }

  // Save the room's Swarm Instructions (custom override directives). Optimistic + reverts.
  async function saveSwarm() {
    if (!room) return;
    const prev = room.swarm_instructions || '';
    const next = swarmDraft.slice(0, 4000);
    setSavingSwarm(true);
    setRoom(p => ({ ...p, swarm_instructions: next }));  // optimistic
    try {
      await apiClient.updateHyperRoom(roomId, { swarm_instructions: next });
      setShowSwarm(false);
    } catch (e) {
      setRoom(p => ({ ...p, swarm_instructions: prev }));
      setError(e.response?.data?.error || e.message);
    } finally {
      setSavingSwarm(false);
    }
  }

  // First-run setup walkthrough: show once per room (localStorage). Configures quality /
  // pop-sim / connectors live; finishing just closes it — the room then works as usual.
  useEffect(() => {
    if (!room?.id) return;
    if (room.archived_at) return;  // no setup walkthrough on archived rooms
    if (isCampaignRoom) return;    // Campaign orchestration owns model and simulation choices.
    if (!roomIntroAcknowledged) return; // Acknowledge the workspace before advanced controls.
    if (submitting || activeTurnId) return; // Never interrupt a task launched from the welcome surface.
    try {
      if (!window.localStorage.getItem(`hm-room-setup-${room.id}`)) {
        setSetupStep(0);
        setShowSetup(true);
      }
    } catch { /* noop */ }
  }, [activeTurnId, isCampaignRoom, room?.id, room?.archived_at, roomIntroAcknowledged, submitting]);

  function finishSetup() {
    try { window.localStorage.setItem(`hm-room-setup-${room?.id}`, '1'); } catch { /* noop */ }
    setShowSetup(false);
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    for (const file of files) {
      const id = (window.crypto?.randomUUID?.() || `att-${Date.now()}-${Math.random()}`);
      setAttachments(prev => [...prev, { id, name: file.name, status: 'uploading', documentId: null }]);
      try {
        // Ingest into HIVEMIND (persists; awaits 'indexed' so the team can recall it).
        const res = await apiClient.uploadDocument(file, { targetScope: 'org' });
        const documentId = res?.documentId || res?.document_id || null;
        setAttachments(prev => prev.map(a => (a.id === id ? { ...a, status: 'done', documentId } : a)));
      } catch (e) {
        setAttachments(prev => prev.map(a => (a.id === id ? { ...a, status: 'error', error: e?.response?.data?.error || e?.message } : a)));
      }
    }
  }

  function removeAttachment(id) {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }

  async function handleSubmit(e, suggestedText = '') {
    e?.preventDefault?.();
    const base = String(suggestedText || draft).trim();
    const doneAtts = attachments.filter(a => a.status === 'done');
    if (attachments.some(a => a.status === 'uploading')) return;   // wait for uploads
    if ((!base && doneAtts.length === 0) || submitting) return;
    if (!room?.goal?.trim()) {
      setError(t('hyperAgents.goalRequiredBeforeSend', 'Set a room goal before sending the next turn.'));
      return;
    }
    // Reference the just-ingested docs so the team recalls their content this turn.
    const names = doneAtts.map(a => a.name).join(', ');
    const attNote = doneAtts.length
      ? `\n\n[Attached document${doneAtts.length > 1 ? 's' : ''} (now in HIVEMIND — recall ${doneAtts.length > 1 ? 'them' : 'it'} to read the content): ${names}]`
      : '';
    const msg = (base || `Please review the attached ${doneAtts.length > 1 ? 'documents' : 'document'}.`) + attNote;
    const echo = (base || `Please review the attached ${doneAtts.length > 1 ? 'documents' : 'document'}.`)
      + (doneAtts.length ? `   📎 ${names}` : '');
    setSubmitting(true);
    if (suggestedText) finishRoomIntro();
    pinnedRef.current = true;  // user just sent → pin to bottom so they see their message + the reply
    setLiveLines([]);
    setDraft('');
    setAttachments([]);
    // Instant optimistic echo — render the user's message IMMEDIATELY, before
    // the network round-trip, so the room never looks frozen while the POST is
    // in flight. Reconciled with the real turn id on response.
    const tempId = (window.crypto?.randomUUID?.() || `pending-${Date.now()}`);
    setTurns(prev => [
      ...prev,
      { id: tempId, seq: (prev[prev.length - 1]?.seq || 0) + 1, userMessage: echo, status: 'live', lines: [], createdAt: new Date().toISOString() },
    ]);
    setActiveTurnId(tempId);
    try {
      const idempo = `${roomId}:${Date.now()}:${msg.length}`;
      const resp = await apiClient.postHyperTurn(roomId, {
        user_message: msg,
        idempotency_key: idempo,
        turn_id: tempId,
        language: i18n?.language,  // run-wide output language from the navbar toggle
      });
      // Swap the temp turn for the real id, then start streaming/polling.
      setTurns(prev => prev.map(trn => (trn.id === tempId ? { ...trn, id: resp.turn_id } : trn)));
      setActiveTurnId(resp.turn_id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setTurns(prev => prev.filter(trn => trn.id !== tempId));
      setActiveTurnId(null);
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm(t('hyperAgents.confirmArchive', 'Archive #{{name}}? Transcript distills into a memory.', { name: room?.name }))) return;
    try {
      await apiClient.archiveHyperRoom(roomId);
      onArchived?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handleClearDiscussion() {
    if (!window.confirm(t('hyperAgents.confirmClearDiscussion', 'Clear the entire discussion in #{{name}}? Every turn and all agent activity will be deleted. The room itself stays. Cannot be undone.', { name: room?.name }))) return;
    try {
      await apiClient.clearHyperRoomTurns(roomId);
      setActiveTurnId(null);
      setLiveLines([]);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  // Clear ONE turn — e.g. when its answer was wrong or time-stale. Removes the
  // user bubble + the agents' answer from the room. Pending (not-yet-posted)
  // turns are dropped client-side only.
  async function handleClearTurn(turn) {
    const oldId = turn.id;
    if (!window.confirm(t('hyperAgents.confirmClearTurn', 'Remove this turn and its answer from the room? Cannot be undone.'))) return;
    if (String(oldId).startsWith('pending-')) {
      setTurns(prev => prev.filter(trn => trn.id !== oldId));
      return;
    }
    try {
      await apiClient.deleteHyperTurn(roomId, oldId);
      setTurns(prev => prev.filter(trn => trn.id !== oldId));
      if (activeTurnId === oldId) { setActiveTurnId(null); setLiveLines([]); }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  // Update & rerun — drop the stale turn, then re-ask the same question so the
  // team answers again (now with the current time-context). One click redo.
  async function handleRerunTurn(turn) {
    const msg = (turn.userMessage || turn.user_message || '').trim();
    if (!msg || submitting) return;
    if (!room?.goal?.trim()) {
      setError(t('hyperAgents.goalRequiredBeforeSend', 'Set a room goal before rerunning this turn.'));
      return;
    }
    const oldId = turn.id;
    setSubmitting(true);
    setLiveLines([]);
    setTurns(prev => prev.filter(trn => trn.id !== oldId));
    if (!String(oldId).startsWith('pending-')) {
      try { await apiClient.deleteHyperTurn(roomId, oldId); } catch { /* non-fatal — re-post anyway */ }
    }
    const tempId = (window.crypto?.randomUUID?.() || `pending-${Date.now()}`);
    setTurns(prev => [
      ...prev,
      { id: tempId, seq: (prev[prev.length - 1]?.seq || 0) + 1, userMessage: msg, status: 'live', lines: [], createdAt: new Date().toISOString() },
    ]);
    setActiveTurnId(tempId);
    try {
      const idempo = `${roomId}:${Date.now()}:${msg.length}`;
      const resp = await apiClient.postHyperTurn(roomId, { user_message: msg, idempotency_key: idempo, turn_id: tempId,
        language: i18n?.language,  // run-wide output language from the navbar toggle
        // self-evolve signal: a rerun = the prior answer was rejected → the employees learn from it
        user_signal: 'the user reran this turn — the previous answer was rejected as wrong or stale' });
      setTurns(prev => prev.map(trn => (trn.id === tempId ? { ...trn, id: resp.turn_id } : trn)));
      setActiveTurnId(resp.turn_id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setTurns(prev => prev.filter(trn => trn.id !== tempId));
      setActiveTurnId(null);
      setSubmitting(false);
    }
  }

  // One-click follow-up: a suggested next task becomes a NEW auto-run turn in
  // this room (keeps the journal/context; no dashboard round-trip).
  async function runNextTask(taskLine) {
    if (submitting || activeTurnId) return;
    const msg = `${taskLine.title}${taskLine.detail ? ` — ${taskLine.detail}` : ''}`;
    setSubmitting(true);
    const tempId = (window.crypto?.randomUUID?.() || `pending-${Date.now()}`);
    setTurns(prev => [
      ...prev,
      { id: tempId, seq: (prev[prev.length - 1]?.seq || 0) + 1, userMessage: msg, status: 'live', lines: [], createdAt: new Date().toISOString() },
    ]);
    setActiveTurnId(tempId);
    try {
      const resp = await apiClient.postHyperTurn(roomId, {
        user_message: msg, idempotency_key: `${roomId}:next:${Date.now()}`, turn_id: tempId,
        language: i18n?.language });
      setTurns(prev => prev.map(trn => (trn.id === tempId ? { ...trn, id: resp.turn_id } : trn)));
      setActiveTurnId(resp.turn_id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setTurns(prev => prev.filter(trn => trn.id !== tempId));
      setActiveTurnId(null);
      setSubmitting(false);
    }
  }

  async function handleFlybyDecision(turn, decision, spec) {
    if (!turn?.id || String(turn.id).startsWith('pending-') || flybyBusy) return;
    setFlybyBusy(true);
    setError(null);
    try {
      await apiClient.decideHyperRoomFlyby(roomId, turn.id, { decision, flyby_spec: spec });
      setActiveTurnId(turn.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setFlybyBusy(false);
    }
  }

  async function handleApprove(turn, approvalId, decision) {
    if (!approvalId || approveBusy) return;
    setApproveBusy(approvalId);
    setError(null);
    try {
      await apiClient.approveHyperRoomWrite(roomId, approvalId, decision);
      // Re-load so the approval_resolved event (with the produced artifact)
      // surfaces in the turn's lines.
      if (turn?.id) setActiveTurnId(turn.id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setApproveBusy(null);
    }
  }

  async function handleParticipantsChange(participantIds) {
    try {
      const resp = await apiClient.updateHyperRoom(roomId, { participant_ids: participantIds });
      setRoom(prev => ({ ...prev, ...resp.room, participants: prev.participants })); // keep hydrated list
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  // Hire a NEW agent from the marketplace, straight into THIS room: org-tune the
  // persona from the profession brief, create the employee, add them to the
  // room's participants, then play the congrats moment.
  async function handleHireIntoRoom(prof, field, chosenName) {
    const empName = (chosenName || '').trim() || prof.title;
    let persona = prof.brief;
    try {
      const { persona: p } = await apiClient.optimizeEmployeePersona({
        brief: prof.brief, name: empName, role: prof.role_archetype, ground_org: true,
      });
      if (p) persona = p;
    } catch { /* fall back to the raw brief */ }
    const created = await apiClient.createEmployee({
      name: empName, persona, scope: 'organization', team_id: null,
      slack_team_id: null, slack_channels_allowed: [], tools: [],
      role_archetype: prof.role_archetype,
      policy_rules: { rate_limit_per_min: 30, marketplace_category: field, marketplace_profession: prof.title },
    });
    const emp = created?.employee || created || {};
    const newId = emp.id || emp.employee_id;
    if (newId) {
      const ids = [...(room.participantIds || room.participant_ids || participants.map(p => p.id)), newId];
      await handleParticipantsChange(Array.from(new Set(ids)));
    }
    setShowHire(false);
    setHiredCongrats({ name: empName, title: prof.title });
    return emp;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={16} className="animate-spin text-[#a3a3a3]" />
      </div>
    );
  }
  if (!room) {
    return <div className="flex-1 flex items-center justify-center text-[12px] text-[#a3a3a3]">{t('hyperAgents.roomNotFound', 'Room not found.')}</div>;
  }

  const participants = room.participants || [];
  const archived = !!room.archivedAt;
  const participantBySlug = Object.fromEntries(participants.map(p => [p.slug, p]));
  const roomDomain = domainRoomDefinition(room.room_tag || room.roomTag || 'general');
  const RoomDomainIcon = roomDomain.icon;

  // Total LLM usage across the room = sum of every sealed turn's cost_tokens
  // (+ the live turn's seal if present). Surfaced top-right of the navbar.
  const sealedTokens = turns.reduce((sum, trn) => {
    const seal = (trn.lines || []).find(l => l && l.t === 'seal');
    return sum + (Number(seal?.cost_tokens) || 0);
  }, 0);
  // Count the live seal ONLY while its turn hasn't been refetched into `turns`
  // yet — otherwise the just-sealed turn is double-counted (11.6k showed 23.3k).
  const liveSeal = liveLines.find(l => l && l.t === 'seal');
  const liveTurnAlreadyCounted = !!turns.find(trn => trn.id === activeTurnId
    && (trn.lines || []).some(l => l && l.t === 'seal'));
  const totalTokens = sealedTokens + (liveTurnAlreadyCounted ? 0 : (Number(liveSeal?.cost_tokens) || 0));
  const fmtTokens = totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : `${totalTokens}`;

  return (
    <div className="flex flex-1 min-w-0 min-h-0 h-full">
      <GmailConnectGate open={gmailGateOpen} onClose={() => setGmailGateOpen(false)}
        onConnect={connectGmail} connecting={false} />
      <section className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Header */}
        <header className="px-4 py-3 border-b border-[#e3e0db] bg-white flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2">
            {/* "Out of Room" moved to the left-rail footer for a calmer, more
                feasible room UX — exit lives with the room list, not the header. */}
            <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[#0a0a0a]">
              <Hash size={13} className="text-[#a3a3a3]" />
              <h2 className="text-[14px] font-semibold truncate">{room.name}</h2>
              <span
                className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border"
                style={{ color: roomDomain.color, borderColor: `${roomDomain.color}55`, backgroundColor: `${roomDomain.color}12` }}
              >
                <RoomDomainIcon size={9} /> {roomDomain.label}
              </span>
              {archived && (
                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-[#f3f1ec] text-[#525252] rounded">
                  {t('hyperAgents.archived', 'archived')}
                </span>
              )}
              {/* Scope badge — Org vs Project; click to change (even after creation) */}
              {(() => {
                const inProject = !!room.projectId;
                const projName = inProject ? (projects.find(p => p.id === room.projectId)?.name || t('hyperAgents.scopeProject', 'Project')) : null;
                return (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setScopeOpen(o => !o)}
                      title={t('hyperAgents.changeScope', 'Change scope (Org ↔ Project)')}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${inProject ? 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20 hover:bg-[#117dff]/15' : 'bg-[#faf9f4] text-[#525252] border-[#e3e0db] hover:border-[#117dff]/30'}`}
                    >
                      {inProject ? <FolderOpen size={10} /> : <Globe size={10} />}
                      <span className="truncate max-w-[120px]">{inProject ? projName : t('hyperAgents.scopeOrg', 'Whole Org')}</span>
                      <ChevronDown size={10} className="opacity-60" />
                    </button>
                    {scopeOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setScopeOpen(false)} />
                        <div className="absolute left-0 top-full mt-1 z-30 w-56 bg-white border border-[#e3e0db] rounded-xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)] p-1.5">
                          <div className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3] px-2 py-1">{t('hyperAgents.moveRoomTo', 'Move room to')}</div>
                          <button type="button" disabled={savingScope} onClick={() => handleSetScope(null)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-left hover:bg-[#faf9f4] ${!inProject ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'}`}>
                            <Globe size={12} /> {t('hyperAgents.scopeOrg', 'Whole Org')} {!inProject && <Check size={12} className="ml-auto" />}
                          </button>
                          <div className="max-h-44 overflow-y-auto">
                            {projects.map(p => (
                              <button type="button" key={p.id} disabled={savingScope} onClick={() => handleSetScope(p.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-left hover:bg-[#faf9f4] ${room.projectId === p.id ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'}`}>
                                <FolderOpen size={12} /> <span className="truncate">{p.name || p.slug || p.id}</span>
                                {room.projectId === p.id && <Check size={12} className="ml-auto shrink-0" />}
                              </button>
                            ))}
                            {projects.length === 0 && <div className="px-2 py-2 text-[11px] text-[#a3a3a3]">{t('hyperAgents.noProjects', 'No projects yet.')}</div>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="text-[10px] text-[#a3a3a3] font-mono mt-0.5">
              {t('hyperAgents.participantsTurns', '{{pCount}} participant{{pPlural}} · {{tCount}} turn{{tPlural}}', { pCount: participants.length, pPlural: participants.length !== 1 ? 's' : '', tCount: turns.length, tPlural: turns.length !== 1 ? 's' : '' })}
            </div>
            {!archived && !isCampaignRoom && (
              <div className="mt-1 inline-flex items-center gap-1.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('hyperAgents.quality', 'Quality')}</span>
                <div className="inline-flex rounded-lg border border-[#e3e0db] overflow-hidden">
                  {[
                    ['auto', t('hyperAgents.qAuto', 'Auto'), t('hyperAgents.qAutoHint', 'Multi-model: cheap gather + debate, strong 120b synthesis. Best value (~⅓ cost).')],
                    ['best', t('hyperAgents.qBest', 'Best'), t('hyperAgents.qBestHint', 'All gpt-oss-120b — maximum rigor, higher cost.')],
                  ].map(([val, label, hint]) => {
                    const on = (room.quality_mode || 'auto') === val;
                    return (
                      <button
                        key={val} type="button" onClick={() => setQualityMode(val)} title={hint}
                        className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${on ? 'bg-[#117dff] text-white' : 'bg-white text-[#737373] hover:text-[#117dff]'}`}
                      >
                        {label}{val === 'auto' && on ? ' ⚡' : ''}
                      </button>
                    );
                  })}
                </div>
                {/* Additional Population-Sim toggle — opt-in; default off leaves the main flow untouched. */}
                <span className="ml-2 text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('hyperAgents.simLbl', 'Pop-sim')}</span>
                <button
                  type="button"
                  onClick={() => setSimMode((room.sim_mode || 'off') !== 'on')}
                  title={t('hyperAgents.simHint', 'Additional: simulate a population of stakeholder voices and fold their report into the answer. Adds ~10s. Off = normal room.')}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-medium transition-colors ${(room.sim_mode || 'off') === 'on' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-[#737373] border-[#e3e0db] hover:text-violet-600'}`}
                >
                  {(room.sim_mode || 'off') === 'on' ? '👥 On' : 'Off'}
                </button>
                {(room.sim_mode || 'off') === 'on' && (
                  <span className="inline-flex items-center gap-1.5" title={t('hyperAgents.simAgentsHint', 'Number of simulated voices (10–100)')}>
                    <input
                      type="range" min={10} max={100} step={5}
                      value={room.sim_agents || 24}
                      onChange={e => setRoom(p => ({ ...p, sim_agents: +e.target.value }))}
                      onMouseUp={e => apiClient.updateHyperRoom(roomId, { sim_agents: +e.target.value }).catch(() => {})}
                      onTouchEnd={e => apiClient.updateHyperRoom(roomId, { sim_agents: +e.target.value }).catch(() => {})}
                      className="w-24 accent-violet-600 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-violet-600 w-10 text-right">{(room.sim_agents || 24)} voices</span>
                  </span>
                )}
                {/* Self-evolving employees — opt-in; default off. On = employees learn a playbook
                    from each turn's outcome and apply it next turn (better over time in THIS room). */}
                <span className="ml-2 text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('hyperAgents.evoLbl', 'Self-evolve')}</span>
                <button
                  type="button"
                  onClick={() => setEvoMode((room.evo_mode || 'off') !== 'on')}
                  title={t('hyperAgents.evoHint', 'Additional: after each turn, employees reflect the outcome into a private playbook and recall it next turn — they get sharper at this room over time. Off = static employees.')}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-medium transition-colors ${(room.evo_mode || 'off') === 'on' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-[#737373] border-[#e3e0db] hover:text-emerald-600'}`}
                >
                  {(room.evo_mode || 'off') === 'on' ? '🧬 On' : 'Off'}
                </button>
                {(() => {
                  const pb = room.evo_playbooks || {};
                  const n = Object.values(pb).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0);
                  if (!n) return null;
                  return (
                    <button type="button" onClick={() => setShowEvo(true)}
                      title={t('hyperAgents.evoLearnedHint', 'See what each employee has learned in this room')}
                      className="text-[10px] font-mono text-emerald-700 hover:text-emerald-900 underline decoration-dotted">
                      {t('hyperAgents.evoLearned', 'learned ({{n}})', { n })}
                    </button>
                  );
                })()}
                {(() => {
                  const jr = Array.isArray(room.evo_journal) ? room.evo_journal : [];
                  if (!jr.length) return null;
                  return (
                    <button type="button" onClick={() => setShowJournal(true)}
                      title={t('hyperAgents.journalHint', "The room's memory of prior turns — what was asked, decided, and who argued what")}
                      className="ml-1 text-[10px] font-mono text-[#117dff] hover:text-[#0a5fd0] underline decoration-dotted">
                      {t('hyperAgents.journalLink', '🧠 memory ({{n}})', { n: jr.length })}
                    </button>
                  );
                })()}
                {/* Swarm Instructions — per-room custom directives the director obeys on top of defaults */}
                <button type="button" onClick={() => { setSwarmDraft(room.swarm_instructions || ''); setShowSwarm(true); }}
                  title={t('hyperAgents.swarmHint', "Custom instructions the director follows on top of all defaults — e.g. ‘no Gaps to confirm’, ‘no mermaid’")}
                  className="ml-1 text-[10px] font-mono text-[#7c3aed] hover:text-[#5b21b6] underline decoration-dotted">
                  {t('hyperAgents.swarmLink', '📋 instructions')}{(room.swarm_instructions || '').trim() ? ' •' : ''}
                </button>
              </div>
            )}
            {showJournal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowJournal(false)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[86vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#cfe2ff] bg-[#eef5ff] shrink-0">
                    <span className="text-[15px]">🧠</span>
                    <span className="text-[13px] font-semibold text-[#0a3a7a]">{t('hyperAgents.journalTitle', 'Room memory')}</span>
                    <button type="button"
                      onClick={() => { if (window.confirm(t('hyperAgents.journalClearConfirm', "Clear this room's memory of prior turns? Future turns start fresh."))) { resetJournal(); setShowJournal(false); } }}
                      className="ml-auto text-[10px] font-medium text-[#a3a3a3] hover:text-red-600 transition-colors">
                      {t('hyperAgents.journalClear', 'Clear memory')}
                    </button>
                    <button type="button" onClick={() => setShowJournal(false)} className="text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors"><X size={16} /></button>
                  </div>
                  <div className="overflow-y-auto px-5 py-4 space-y-2">
                    <p className="text-[11px] text-[#737373] leading-snug">{t('hyperAgents.journalBlurb', 'What this room asked and decided in prior turns — injected at the start of each new turn so the team has continuity (and answers direct recall questions instantly).')}</p>
                    {(Array.isArray(room.evo_journal) ? room.evo_journal : []).map((entry, i) => (
                      <div key={i} className="flex gap-2 border border-[#e3e0db] rounded-lg px-3 py-2 text-[11px] leading-snug text-[#404040] bg-[#faf9f7]">
                        <span className="text-[#117dff] font-mono shrink-0">{i + 1}.</span>
                        <span className="break-words">{String(entry)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {showEvo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEvo(false)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[86vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-100 bg-emerald-50/60 shrink-0">
                    <span className="text-[15px]">🧬</span>
                    <span className="text-[13px] font-semibold text-emerald-900">{t('hyperAgents.evoPanelTitle', 'What the employees learned')}</span>
                    <button type="button"
                      onClick={() => { if (window.confirm(t('hyperAgents.evoResetAllConfirm', 'Reset ALL learned playbooks in this room? They re-learn over future turns.'))) { resetEvo(true); setShowEvo(false); } }}
                      className="ml-auto text-[10px] font-medium text-[#a3a3a3] hover:text-red-600 transition-colors">
                      {t('hyperAgents.evoResetAll', 'Reset all')}
                    </button>
                    <button type="button" onClick={() => setShowEvo(false)} className="text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors"><X size={16} /></button>
                  </div>
                  <div className="overflow-y-auto px-5 py-4 space-y-4">
                    <p className="text-[11px] text-[#737373] leading-snug">{t('hyperAgents.evoPanelBlurb', 'Lessons each employee distilled from past turns in this room and now applies before it speaks. Stored privately per room — not in the company brain.')}</p>
                    {Object.entries(room.evo_playbooks || {}).filter(([, v]) => Array.isArray(v) && v.length).map(([slug, lessons]) => {
                      const emp = (room.participants || []).find(p => (p.slug || p.id) === slug);
                      const nm = emp?.name || slug;
                      return (
                        <div key={slug} className="border border-[#e3e0db] rounded-lg overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-[#faf9f7] border-b border-[#eeece8]">
                            <span className="text-[12px] font-semibold text-[#0a0a0a]">{nm}</span>
                            {emp?._lane && <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-700">{emp._lane}</span>}
                            <span className="text-[10px] text-[#a3a3a3] font-mono ml-1">{lessons.length} {t('hyperAgents.evoLessons', 'lessons')}</span>
                            <button type="button" onClick={() => resetEvo(slug)}
                              className="ml-auto text-[10px] text-[#a3a3a3] hover:text-red-600 transition-colors">{t('hyperAgents.evoForget', 'Forget')}</button>
                          </div>
                          <ul className="px-3 py-2 space-y-1.5">
                            {lessons.map((l, i) => (
                              <li key={i} className="flex gap-2 text-[11px] leading-snug text-[#404040]">
                                <span className="text-emerald-500 shrink-0">▹</span><span>{l}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {showSwarm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSwarm(false)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[86vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e9d5ff] bg-[#f5f0ff] shrink-0">
                    <span className="text-[15px]">📋</span>
                    <span className="text-[13px] font-semibold text-[#5b21b6]">{t('hyperAgents.swarmTitle', 'Swarm instructions')}</span>
                    <button type="button" onClick={() => setShowSwarm(false)} className="ml-auto text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors"><X size={16} /></button>
                  </div>
                  <div className="overflow-y-auto px-5 py-4 space-y-3">
                    <p className="text-[11px] text-[#737373] leading-snug">{t('hyperAgents.swarmBlurb', 'Custom instructions the director follows on TOP of all defaults, every turn — overriding them on conflict. Examples: “Never add a ‘Gaps to confirm’ section.” · “No mermaid diagrams.” · “Always answer in bullet points.” · “Keep replies under 200 words.”')}</p>
                    <textarea
                      value={swarmDraft}
                      onChange={e => setSwarmDraft(e.target.value)}
                      maxLength={4000}
                      rows={12}
                      placeholder={t('hyperAgents.swarmPlaceholder', '- Do NOT include a “Gaps to confirm” section.\n- No mermaid diagrams.\n- …')}
                      className="w-full rounded-lg border border-[#e3e0db] bg-[#faf9f7] px-3 py-2 text-[12px] font-mono leading-relaxed text-[#0a0a0a] outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/15 resize-y"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#a3a3a3] font-mono">{swarmDraft.length}/4000</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setShowSwarm(false)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#737373] hover:text-[#0a0a0a]">{t('hyperAgents.swarmCancel', 'Cancel')}</button>
                        <button type="button" onClick={saveSwarm} disabled={savingSwarm}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-60">
                          {savingSwarm ? t('hyperAgents.swarmSaving', 'Saving…') : t('hyperAgents.swarmSave', 'Save instructions')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {room.goal ? (
              <div className="mt-1 max-w-[720px] text-[11px] leading-snug text-[#525252] line-clamp-2">
                <span className="font-mono uppercase tracking-wider text-[#117dff] text-[9px] mr-1">{t('hyperAgents.goalLbl', 'Goal')}</span>
                {room.goal}
              </div>
            ) : !archived && (
              <div className="mt-2 max-w-[720px] flex items-center gap-1.5">
                <input
                  value={goalDraft}
                  onChange={e => setGoalDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveGoal();
                    }
                  }}
                  placeholder={t('hyperAgents.goalRequiredPlaceholder', 'Set this room goal before the next turn')}
                  className="min-w-0 flex-1 h-7 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] text-[#0a0a0a] placeholder:text-amber-700/60 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15"
                />
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  disabled={!goalDraft.trim() || savingGoal}
                  className="h-7 px-2.5 rounded-lg bg-amber-500 text-white text-[10px] font-semibold disabled:opacity-50 flex items-center gap-1"
                >
                  {savingGoal ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  {t('hyperAgents.saveGoal', 'Save goal')}
                </button>
              </div>
            )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!archived && (
              <button
                type="button"
                onClick={() => { setCallStatus(null); setCallOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e0db] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#0a0a0a] hover:border-[#117dff]/50 hover:text-[#117dff]"
                title={t('hyperAgents.callWithTaraHint', 'Place an approved outbound call through TARA')}
              >
                <PhoneCall size={12} /> {t('hyperAgents.callWithTara', 'Call with TARA')}
              </button>
            )}
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-mono font-semibold"
              title={t('hyperAgents.totalLlmTokens', 'Total LLM tokens used in this room')}
            >
              <Zap size={11} /> {fmtTokens} {t('hyperAgents.tok', 'tok')}
            </span>
            {turns.length > 0 && (
              <button
                onClick={handleClearDiscussion}
                className="p-1.5 text-[#a3a3a3] hover:text-red-600 rounded hover:bg-[#faf9f4]"
                title={t('hyperAgents.clearDiscussionTitle', 'Clear discussion — delete all turns + agent activity (keeps the room)')}
              >
                <Eraser size={13} />
              </button>
            )}
            {!archived && (
              <button
                onClick={handleArchive}
                className="p-1.5 text-[#a3a3a3] hover:text-red-600 rounded hover:bg-[#faf9f4]"
                title={t('hyperAgents.archiveRoomTitle', 'Archive room (distills into 1 memory)')}
              >
                <Archive size={13} />
              </button>
            )}
          </div>
        </header>

        {callOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !callBusy && setCallOpen(false)}>
            <div className="w-full max-w-md rounded-xl border border-[#e3e0db] bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#117dff]"><PhoneCall size={16} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-[#0a0a0a]">{t('hyperAgents.callTitle', 'Call with TARA')}</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#737373]">{t('hyperAgents.callDescription', 'The destination must be allowlisted. TARA uses this room goal and records the outcome for your workspace.')}</p>
                </div>
                <button type="button" disabled={callBusy} onClick={() => setCallOpen(false)} className="text-[#a3a3a3] hover:text-[#0a0a0a] disabled:opacity-50"><X size={16} /></button>
              </div>
              <label className="mt-4 block text-[10px] font-mono uppercase tracking-wider text-[#737373]">{t('hyperAgents.destination', 'Destination (E.164)')}</label>
              <input
                autoFocus
                type="tel"
                value={callNumber}
                onChange={event => setCallNumber(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') handleRoomCall(); }}
                placeholder="+49123456789"
                className="mt-1.5 h-10 w-full rounded-lg border border-[#e3e0db] px-3 font-mono text-[13px] outline-none focus:border-[#117dff] focus:ring-2 focus:ring-[#117dff]/10"
              />
              {callStatus && (
                <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${callStatus.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {callStatus.message}
                </div>
              )}
              {browserCall && (
                <div className="mt-3">
                  <AaasVoiceWidget
                    userId={user?.id}
                    orgId={org?.id}
                    provider={browserCall.provider || 'grok'}
                    language={browserCall.language || 'en'}
                    initialGoal={browserCall.goal || room?.goal || ''}
                    initialMode={browserCall.mode || 'external'}
                  />
                </div>
              )}
              {callOverlay && (
                <CallRingingCard number={callOverlay.number} status={callOverlay.status}
                  onClose={() => setCallOverlay(null)} />
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" disabled={callBusy} onClick={() => setCallOpen(false)} className="h-9 px-3 text-[11px] font-medium text-[#737373] disabled:opacity-50">{t('common.cancel', 'Cancel')}</button>
                <button
                  type="button"
                  onClick={handleRoomCall}
                  disabled={callBusy || !/^\+[1-9]\d{7,14}$/.test(callNumber.trim())}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {callBusy ? <Loader2 size={12} className="animate-spin" /> : <PhoneCall size={12} />}
                  {callBusy ? t('hyperAgents.dialing', 'Dialing…') : t('hyperAgents.startCall', 'Start call')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thread */}
        <div ref={scrollRef} onScroll={onThreadScroll} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          {showRoomIntro && (
            <DomainRoomIntro
              room={room}
              company={companyContext}
              busy={submitting}
              onRun={(prompt) => handleSubmit(null, prompt)}
              onEnter={finishRoomIntro}
            />
          )}
          <div ref={discussionStartRef} />
          {/* HQ control-room feed — agents reporting their room activity to you. */}
          {hqActivity.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">
                <Network size={11} className="text-violet-500" />
                {t('hyperAgents.controlRoom', 'Control room · reports from your rooms')}
              </div>
              {hqActivity.map((a) => (
                <HqReportBubble key={a.id} report={a}
                  onOpenRoom={() => a.source_room_id && navigate(`/hivemind/app/employees/rooms/${a.source_room_id}`)} />
              ))}
            </div>
          )}
          {!showRoomIntro && turns.length === 0 && hqActivity.length === 0 && (
            <div className="text-center text-[12px] text-[#a3a3a3] py-8">
              {t('hyperAgents.startConversation', 'Start the conversation — ask your team anything.')}
            </div>
          )}
          {turns.map(turn => (
            <TurnView
              key={turn.id}
              turn={turn}
              participants={participantBySlug}
              liveLines={turn.id === activeTurnId ? liveLines : null}
              archived={archived}
              busy={submitting}
              onClear={() => handleClearTurn(turn)}
              onRerun={() => handleRerunTurn(turn)}
              onRunNextTask={runNextTask}
              onFlybyDecision={(decision, spec) => handleFlybyDecision(turn, decision, spec)}
              flybyBusy={flybyBusy}
              onApprove={(approvalId, decision) => handleApprove(turn, approvalId, decision)}
              approveBusy={approveBusy}
              roomId={roomId}
              taskTag={room?.taskTag || 'GENERAL'}
            />
          ))}
          {error && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={11} className="inline mr-1" /> {error}
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Self-evolve live signal — employees reflected this turn into their playbook */}
        {evoFlash && evoFlash.added > 0 && (
          <button
            type="button"
            onClick={() => { setEvoFlash(null); setShowEvo(true); }}
            title={t('hyperAgents.evoFlashHint', 'Employees reflected this turn into their private playbook — click to view what they learned.')}
            className="mx-4 mb-1 flex items-center gap-2 self-start rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            <span>🧬</span>
            <span>
              {(evoFlash.employees || []).filter(e => e.added > 0).map(e => e.name).join(' & ') || t('hyperAgents.evoFlashEmps', 'Employees')}
              {' '}{t('hyperAgents.evoFlashLearned', 'learned')} {evoFlash.added} {evoFlash.added === 1 ? t('hyperAgents.evoFlashLesson', 'lesson') : t('hyperAgents.evoFlashLessons', 'lessons')} {t('hyperAgents.evoFlashThisTurn', 'this turn')}
            </span>
          </button>
        )}

        {/* Composer */}
        {!archived && (
          <form onSubmit={handleSubmit} className="border-t border-[#e3e0db] bg-[#faf9f4] px-4 py-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachments.map(a => (
                  <span
                    key={a.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] border ${a.status === 'error' ? 'border-red-200 bg-red-50 text-red-700' : a.status === 'uploading' ? 'border-[#e3e0db] bg-white text-[#737373]' : 'border-[#117dff]/30 bg-[#117dff]/5 text-[#0a0a0a]'}`}
                    title={a.status === 'error' ? a.error : a.status === 'done' ? t('hyperAgents.attachDone', 'Ingested into HIVEMIND — the team can recall it') : undefined}
                  >
                    {a.status === 'uploading' ? <Loader2 size={10} className="animate-spin" /> : a.status === 'error' ? <AlertTriangle size={10} /> : <FileText size={10} className="text-[#117dff]" />}
                    <span className="max-w-[160px] truncate">{a.name}</span>
                    {a.status === 'uploading' && <span className="text-[#a3a3a3]">{t('hyperAgents.ingesting', 'ingesting…')}</span>}
                    <button type="button" onClick={() => removeAttachment(a.id)} className="text-[#a3a3a3] hover:text-red-600 ml-0.5"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                title={t('hyperAgents.attachHint', 'Attach a document or image — ingested into HIVEMIND and used by the team this turn')}
                className="h-9 w-9 grid place-items-center border border-[#e3e0db] bg-white rounded-lg text-[#525252] hover:text-[#117dff] hover:border-[#117dff]/40 transition-colors shrink-0 disabled:opacity-50"
              >
                <Paperclip size={15} />
              </button>
              <button
                type="button"
                onClick={() => setShowConnectors(true)}
                title={t('hyperAgents.roomConnectorsHint', 'Room connectors — give each agent 3rd-party tools (Gmail, GitHub, Slack…)')}
                className="h-9 w-9 grid place-items-center border border-[#e3e0db] bg-white rounded-lg text-[#525252] hover:text-[#117dff] hover:border-[#117dff]/40 transition-colors shrink-0"
              >
                <Boxes size={15} />
              </button>
              <div className="flex-1 relative bg-white border border-[#e3e0db] rounded-xl px-3 py-2 focus-within:border-violet-500">
                {/* @mention picker — typing "@..." lists the room's agents; pick one to
                    address them DIRECTLY (backend fast-path: that agent answers alone). */}
                {(() => {
                  const m = draft.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
                  const roster = (room?.participants || []).filter(p => {
                    if (!m) return false;
                    const q = m[1].toLowerCase();
                    return !q || (p.slug || '').toLowerCase().startsWith(q)
                      || (p.name || '').toLowerCase().startsWith(q);
                  });
                  if (!m || !roster.length) return null;
                  return (
                    <div className="absolute bottom-full left-0 mb-1 w-60 bg-white border border-[#e3e0db] rounded-[10px] shadow-sm overflow-hidden z-20">
                      <div className="px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3] border-b border-[#eae7e1]">
                        {t('hyperAgents.mentionHint', 'Ask one agent directly')}
                      </div>
                      {roster.slice(0, 5).map(p => (
                        <button key={p.slug} type="button"
                          onClick={() => setDraft(draft.replace(/@[a-zA-Z0-9_-]*$/, `@${p.slug} `))}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-[#faf9f4]">
                          <AgentAvatar agent={p} size={20} />
                          <span className="text-[12px] text-[#0a0a0a]">{p.name || p.slug}</span>
                          <span className="ml-auto text-[9px] font-mono text-[#a3a3a3]">@{p.slug}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
                  }}
                  rows={1}
                  placeholder={t('hyperAgents.composerPlaceholder', 'Message the team…  use @slug to address one agent')}
                  disabled={submitting}
                  className="w-full bg-transparent resize-none outline-none text-[13px] text-[#0a0a0a] placeholder:text-[#a3a3a3]"
                />
              </div>
              <button
                type="submit"
                disabled={(!draft.trim() && !attachments.some(a => a.status === 'done')) || submitting || !room?.goal?.trim() || attachments.some(a => a.status === 'uploading')}
                title={!room?.goal?.trim() ? t('hyperAgents.goalRequiredBeforeSend', 'Set a room goal before sending the next turn.') : undefined}
                className="h-9 px-3 bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {t('hyperAgents.send', 'Send')}
              </button>
            </div>
            <div className="text-[9px] text-[#a3a3a3] mt-1 font-mono">{t('hyperAgents.composerHint', 'Enter to send · Shift+Enter newline · @slug to force lead')}</div>
          </form>
        )}
      </section>

      {/* Right rail: participants */}
      <aside className="w-[260px] min-w-[260px] border-l border-[#e3e0db] bg-[#faf9f4] flex flex-col shrink-0">
        <header className="px-3 py-3 border-b border-[#e3e0db] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-[#525252]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">{t('hyperAgents.participants', 'Participants')}</span>
          </div>
          {!archived && (
            <button
              onClick={() => setShowPicker(true)}
              className="text-[#525252] hover:text-[#0a0a0a]"
              title={t('hyperAgents.addAgent', 'Add agent')}
            >
              <Plus size={13} />
            </button>
          )}
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {participants.map(p => (
            <ParticipantChip
              key={p.id}
              agent={p}
              canRemove={!archived}
              onOpenDm={(emp) => setDmAgent(emp)}
              onRemove={() => handleParticipantsChange(
                (room.participantIds || room.participant_ids || []).filter(id => id !== p.id)
              )}
            />
          ))}
          {participants.length === 0 && (
            <p className="text-[11px] text-[#a3a3a3]">{t('hyperAgents.noAgentsYet', 'No agents yet. Add one to start.')}</p>
          )}
        </div>
        {!archived && (
          <div className="p-3 border-t border-[#e3e0db]">
            <button
              onClick={() => setShowHire(true)}
              className="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg bg-[#0a0a0a] hover:bg-[#262626] text-white text-[12px] font-semibold transition-colors"
            >
              <Sparkles size={13} /> {t('hyperAgents.hireMoreAgents', 'Hire more Agents')}
            </button>
          </div>
        )}
      </aside>

      <AnimatePresence>
        {showPicker && (
          <AgentPickerModal
            currentIds={room.participantIds || room.participant_ids || []}
            onClose={() => setShowPicker(false)}
            onPick={(ids) => { setShowPicker(false); handleParticipantsChange(ids); }}
          />
        )}
        {showHire && (
          <HireAgentsModal
            roomName={room.name}
            onClose={() => setShowHire(false)}
            onHire={handleHireIntoRoom}
          />
        )}
        {hiredCongrats && (
          <HiredCongrats
            hire={hiredCongrats}
            onDone={() => setHiredCongrats(null)}
          />
        )}
        {showConnectors && (
          <RoomToolsModal
            room={room}
            onClose={() => setShowConnectors(false)}
          />
        )}
        {dmAgent && (
          <AgentDmModal
            agent={dmAgent}
            onClose={() => setDmAgent(null)}
          />
        )}
      </AnimatePresence>

      {/* First-run setup walkthrough — 4 small slides. No Save: each choice applies live.
          Finishing (or skipping) just closes it; the room then works as usual. */}
      {showSetup && room && !isCampaignRoom && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={finishSetup}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('hyperAgents.setupOf', 'Set up · {{n}}/4', { n: setupStep + 1 })}</span>
              <button type="button" onClick={finishSetup} className="text-[#a3a3a3] hover:text-[#0a0a0a]" title={t('hyperAgents.skip', 'Skip')}><X size={15} /></button>
            </div>
            <div className="px-5 py-3 min-h-[210px]">
              {setupStep === 0 && (
                <div>
                  <div className="text-[15px] font-bold text-[#0a0a0a] flex items-center gap-1.5"><Users size={16} className="text-violet-600" /> {t('hyperAgents.setupIntroTitle', 'Welcome to HyperAgents')}</div>
                  <p className="mt-2 text-[12.5px] text-[#525252] leading-relaxed">
                    {t('hyperAgents.setupIntroBody', 'A room of AI teammates that pull from your company brain + connected tools, debate the question, and write ONE grounded, cited answer.')}
                  </p>
                  <p className="mt-2 text-[12.5px] text-[#525252] leading-relaxed">
                    {t('hyperAgents.setupIntroUse', 'Use it for decisions, research, drafts, and simulating how a population of stakeholders would react. Quick setup — 20 seconds.')}
                  </p>
                </div>
              )}
              {setupStep === 1 && (
                <div>
                  <div className="text-[14px] font-bold text-[#0a0a0a]">{t('hyperAgents.setupQualityTitle', 'Answer quality')}</div>
                  <p className="mt-1 text-[11.5px] text-[#737373]">{t('hyperAgents.setupQualitySub', 'Pick the model mix. You can change it anytime.')}</p>
                  <div className="mt-2.5 space-y-2">
                    {[
                      ['auto', t('hyperAgents.qAuto', 'Auto'), t('hyperAgents.setupAutoDesc', 'Multi-model — cheap gather + debate, strong 120B synthesis. Best value (~⅓ the cost). Recommended.')],
                      ['best', t('hyperAgents.qBest', 'Best'), t('hyperAgents.setupBestDesc', 'Everything on the strongest model (120B) — maximum rigor, higher cost.')],
                    ].map(([val, label, desc]) => {
                      const on = (room.quality_mode || 'auto') === val;
                      return (
                        <button key={val} type="button" onClick={() => setQualityMode(val)}
                          className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${on ? 'border-[#117dff] bg-[#117dff]/5' : 'border-[#e3e0db] hover:border-[#117dff]/40'}`}>
                          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0a0a0a]">{label}{on && <span className="text-[#117dff]">✓</span>}{val === 'auto' && ' ⚡'}</div>
                          <div className="text-[11px] text-[#737373] mt-0.5 leading-snug">{desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {setupStep === 2 && (
                <div>
                  <div className="text-[14px] font-bold text-[#0a0a0a]">{t('hyperAgents.setupSimTitle', 'Population simulation')}</div>
                  <p className="mt-1 text-[11.5px] text-[#737373] leading-snug">{t('hyperAgents.setupSimSub', 'Optional. Simulate a population of stakeholder voices; their report folds into the answer (adds ~10s).')}</p>
                  <button type="button" onClick={() => setSimMode((room.sim_mode || 'off') !== 'on')}
                    className={`mt-2.5 w-full flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${(room.sim_mode || 'off') === 'on' ? 'border-violet-500 bg-violet-50' : 'border-[#e3e0db] hover:border-violet-300'}`}>
                    <span className="text-[12.5px] font-semibold text-[#0a0a0a]">👥 {t('hyperAgents.setupSimToggle', 'Population sim')}</span>
                    <span className={`text-[11px] font-medium ${(room.sim_mode || 'off') === 'on' ? 'text-violet-700' : 'text-[#a3a3a3]'}`}>{(room.sim_mode || 'off') === 'on' ? t('hyperAgents.on', 'On') : t('hyperAgents.off', 'Off')}</span>
                  </button>
                  {(room.sim_mode || 'off') === 'on' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-[#525252] mb-1">
                        <span>{t('hyperAgents.setupVoices', 'Number of voices')}</span>
                        <span className="font-mono text-violet-600">{room.sim_agents || 24}</span>
                      </div>
                      <input type="range" min={10} max={100} step={5} value={room.sim_agents || 24}
                        onChange={e => setRoom(p => ({ ...p, sim_agents: +e.target.value }))}
                        onMouseUp={e => apiClient.updateHyperRoom(roomId, { sim_agents: +e.target.value }).catch(() => {})}
                        onTouchEnd={e => apiClient.updateHyperRoom(roomId, { sim_agents: +e.target.value }).catch(() => {})}
                        className="w-full accent-violet-600 cursor-pointer" />
                      <div className="flex justify-between text-[9px] text-[#a3a3a3] font-mono"><span>10</span><span>100</span></div>
                    </div>
                  )}
                </div>
              )}
              {setupStep === 3 && (
                <div>
                  <div className="text-[14px] font-bold text-[#0a0a0a]">{t('hyperAgents.setupConnTitle', 'Connect your tools')}</div>
                  <p className="mt-1 text-[12px] text-[#525252] leading-relaxed">{t('hyperAgents.setupConnBody', 'Toggle on Gmail, Notion, Slack, Drive… so the room reads live data instead of guessing. Each connector becomes a read-tool for the agents.')}</p>
                  <button type="button" onClick={() => setShowConnectors(true)}
                    className="mt-3 w-full rounded-lg border border-[#117dff] bg-[#117dff]/5 px-3 py-2 text-[12.5px] font-semibold text-[#117dff] hover:bg-[#117dff]/10 transition-colors">
                    {t('hyperAgents.setupOpenConn', 'Open connector settings →')}
                  </button>
                  <p className="mt-2 text-[10.5px] text-[#a3a3a3]">{t('hyperAgents.setupConnLater', 'You can also manage connectors anytime from the room header.')}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#ece9e3] bg-[#faf9f4]">
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map(s => <span key={s} className={`w-1.5 h-1.5 rounded-full ${s === setupStep ? 'bg-violet-600' : 'bg-[#d4d0ca]'}`} />)}
              </div>
              <div className="flex items-center gap-2">
                {setupStep > 0 && (
                  <button type="button" onClick={() => setSetupStep(s => s - 1)} className="px-2.5 py-1 text-[11px] font-medium text-[#737373] hover:text-[#0a0a0a]">{t('hyperAgents.back', 'Back')}</button>
                )}
                {setupStep < 3 ? (
                  <button type="button" onClick={() => setSetupStep(s => s + 1)} className="px-3 py-1 rounded-lg bg-violet-600 text-white text-[11px] font-semibold hover:bg-violet-700 transition-colors">{t('hyperAgents.next', 'Next')}</button>
                ) : (
                  <button type="button" onClick={finishSetup} className="px-3 py-1 rounded-lg bg-violet-600 text-white text-[11px] font-semibold hover:bg-violet-700 transition-colors">{t('hyperAgents.finish', 'Finish')}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Per-turn render ────────────────────────────────────────────────── */

// Small HH:MM:SS stamp for verifying turn/agent timing in the UI.

// Immediate "it's working" feedback shown while a live turn has no events yet.
// Cycles through the real startup phases so the room never looks frozen.

function TurnView({ turn, participants: participantsProp, liveLines, archived, busy, onClear, onRerun, onFlybyDecision, flybyBusy, onApprove, approveBusy, roomId, taskTag, onRunNextTask }) {
  // Normalise participants to an ARRAY once. This component used it both as an
  // array ((participants || []).find, line ~3009) and as an object
  // (Object.values(participants || {}), line ~2641). When the backend sends the
  // non-array shape, the array-style .find threw "(s || []).find is not a
  // function" and crashed the whole room render. Accept either shape (array, or
  // an object keyed by slug) and expose a stable array downstream.
  const participants = Array.isArray(participantsProp)
    ? participantsProp
    : (participantsProp && typeof participantsProp === 'object' ? Object.values(participantsProp) : []);
  // Per-room send automation for outbound email approvals ("automate from next
  // turn"). Client-side latch on the existing HITL gate: the approve call is
  // identical, only the click is automated. Persisted per room.
  // Outreach campaign runner — which channel's panel is open for this turn
  // (null = closed). Buttons appear under the prospect stack once sealed.
  const [campaignChannel, setCampaignChannel] = useState(null);
  const autoSendKey = `hm_auto_send_${roomId || 'room'}`;
  const [autoSendOn, setAutoSendOn] = useState(() => {
    try { return window.localStorage.getItem(autoSendKey) === '1'; } catch { return false; }
  });
  const toggleAutoSend = () => setAutoSendOn((p) => {
    const v = !p; try { window.localStorage.setItem(autoSendKey, v ? '1' : '0'); } catch { /* ignore */ }
    return v;
  });
  const roomAgentName = (participants && participants[0] && (participants[0].name || participants[0].slug)) || 'HIVEMIND agent';
  const { t } = useTranslation('dashboard');
  // Merge sealed lines with any in-flight overlay
  const lines = useMemo(() => {
    const base = Array.isArray(turn.lines) ? turn.lines : [];
    if (!liveLines) return base;
    return mergeHyperEvents(base, liveLines);
  }, [turn.lines, liveLines]);

  const router = lines.find(l => l.t === 'router') || lines.find(l => l.t === 'router_bootstrap');
  const visibleUserMessage = (() => {
    const message = turn.userMessage || turn.user_message || '';
    const task = message.match(/^You are the .*? team\. Execute this task now\.\s*TASK \[[^\]]+\]:\s*([^\n]+)/s);
    return task ? `Start task: ${task[1].trim()}.` : message;
  })();
  const leadLine = lines.find(l => l.t === 'line' && l.kind === 'lead');
  const synthLine = lines.find(l => l.t === 'line' && l.kind === 'synthesis');
  const rescueLine = lines.find(l => l.t === 'line' && l.kind === 'rescue');
  // Honest dead-end — the goal was un-reachable with the connected tools / data;
  // the backend surfaces WHY (what it searched, what it couldn't do) instead of
  // looping or shipping a fabricated result. Rendered as a distinct banner.
  const deadEndLine = lines.find(l => l.t === 'line' && l.kind === 'dead_end');
  const reactions = lines.filter(l => l.t === 'react' && l.agreement !== 'abstain');
  // Multi-round debate: collect all revises + validates (was single).
  const revises = lines.filter(l => l.t === 'revise');
  const validates = lines.filter(l => l.t === 'validate');
  const seal = lines.find(l => l.t === 'seal');
  const errorLine = lines.find(l => l.t === 'error');
  const typing = lines.filter(l => l.t === 'typing').slice(-2);
  // Additional Population-Sim report (opt-in). Guarded — absent on normal turns.
  const simReport = lines.find(l => l.t === 'sim_report' && (l.report || l.n_personas));
  const [showSim, setShowSim] = useState(false);
  const [vFilter, setVFilter] = useState('all');  // population-sim voices filter
  // Phase 4 events:
  const decisionRequired = lines.find(l => l.t === 'decision_required');
  const decisionSaved = lines.find(l => l.t === 'decision_saved');
  const finalReport = [...lines].reverse().find(l => l.t === 'final_report');
  const harnessCheck = [...lines].reverse().find(l => l.t === 'harness_check');
  const memoryAudit = [...lines].reverse().find(l => l.t === 'memory_audit');
  const webIntel = [...lines].reverse().find(l => l.t === 'web_intel');
  const ontology = lines.find(l => l.t === 'ontology');
  const workforceAssessment = lines.find(l => l.t === 'workforce_assessment');
  const flybyProposal = lines.find(l => l.t === 'flyby_proposal');
  const flybyDecision = lines.find(l => l.t === 'flyby_decision');
  const flybyJoined = lines.find(l => l.t === 'flyby_joined');
  const flybySkipped = lines.find(l => l.t === 'flyby_skipped');
  const simulationPhases = lines.filter(l => l.t === 'simulation_phase');
  const simulationClaims = lines.filter(l => l.t === 'simulation_claim');
  const trustDeltas = seal?.trust || {};
  const template = router?.template || 'debate';
  const sealStatus = seal?.status || 'complete';
  const qualityLow = seal?.quality_low;
  const toolCallCounts = seal?.tool_call_counts || {};
  const toolCallTotal = seal?.tool_call_total || 0;

  // Recursive CSI convergence — a turn now runs N cycles until consensus.
  // `cycle` is on every swarm event (legacy single-pass turns have none → 1).
  const cycleOf = (l) => l.cycle || 1;
  const cycleEnds = lines.filter(l => l.t === 'cycle_end');
  const convergence = lines.find(l => l.t === 'convergence');
  const allHypotheses = lines.filter(l => l.t === 'hypothesis');
  const maxCycle = Math.max(
    1,
    ...lines.filter(l => ['hypothesis', 'vote', 'cycle_end', 'chain_of_thought'].includes(l.t)).map(cycleOf),
  );
  // Convergence trail: one entry per completed cycle (verdict + score).
  const convergenceTrail = (convergence?.trail && convergence.trail.length)
    ? convergence.trail
    : cycleEnds.map(c => ({ cycle: c.cycle, verdict: c.verdict, weighted_score: c.weighted_score, converged: c.converged }));

  // Phase 4 swarm events (R1-R5) — detail view shows the LATEST cycle so the
  // converged result is front-and-centre; earlier cycles live in the trail.
  const hypotheses = allHypotheses.filter(l => cycleOf(l) === maxCycle);
  const peerReviews = lines.filter(l => l.t === 'peer_review' && cycleOf(l) === maxCycle);
  const chains = lines.filter(l => l.t === 'chain_of_thought' && cycleOf(l) === maxCycle);
  const skepticChallenge = [...lines].reverse().find(l => l.t === 'skeptic_challenge' && cycleOf(l) === maxCycle)
    || lines.find(l => l.t === 'skeptic_challenge');
  const votes = lines.filter(l => l.t === 'vote' && cycleOf(l) === maxCycle);
  const swarmVerdict = lines.find(l => l.t === 'swarm_verdict');
  const isSwarm = template === 'swarm' || allHypotheses.length > 0;
  const roundStarts = lines.filter(l => l.t === 'round_start' && cycleOf(l) === maxCycle);
  // Prod hardening signals — surfaced so a truncated/degraded turn isn't silent.
  const costCapHit = lines.find(l => l.t === 'cost_cap_hit') || lines.find(l => l.t === 'seal' && l.cost_cap_hit);
  const deadlineHit = lines.find(l => l.t === 'deadline_hit');
  const roomWarnings = lines.filter(l => l.t === 'warning');
  const campaignHandoff = [...lines].reverse().find(l => l.t === 'campaign_handoff' && l.campaign_id);
  const campaignHandoffFailed = [...lines].reverse().find(l => l.t === 'campaign_handoff_failed');

  // Phase 1-6 — lead plan, recon/verify verdict, write-approval cards, and the
  // goalkeeper's re-plan rounds. A turn may re-plan (one `plan` per round, all
  // under the same turn_id), so take the LATEST plan/verdict and group rounds.
  const planLine = [...lines].reverse().find(l => l.t === 'plan');
  // Every tool call the room made, in order — recall sweeps + live web searches —
  // so the simulation shows its working (not just the final answer).
  const gathers = lines.filter(l => l.t === 'gather');
  const webIntels = lines.filter(l => l.t === 'web_intel');
  const prospectHunts = lines.filter(l => l.t === 'prospects');
  // Latest prospects event per query (a re-run replaces, not stacks, the same search)
  // — rendered as the full stacked-card view with email-verified badges below.
  const prospectStacks = (() => {
    const byQuery = {};
    prospectHunts.filter(l => Array.isArray(l.prospects) && l.prospects.length)
      .forEach(l => { byQuery[l.query || '_'] = l; });
    return Object.values(byQuery);
  })();
  const skillUses = lines.filter(l => l.t === 'skill_used');
  // Room kind for the sealed report's desk identity — already emitted on every
  // skill_used event; old turns without it fall back to the task-tag alias.
  const domainPack = lines.find(l => l.t === 'domain_pack');
  const roomKind = domainPack?.room_kind
    || (skillUses.find(sk => sk.room_kind) || {}).room_kind
    || router?.room_kind
    || '';
  const reconPreLine = [...lines].reverse().find(l => l.t === 'recon_pre');
  const executeLines = lines.filter(l => l.t === 'execute');
  const verifyLine = [...lines].reverse().find(l => l.t === 'verify');
  const goalkeeperRounds = lines.filter(l => l.t === 'goalkeeper_round');
  // Produced artifacts (docs/sheets) — "view in new tab" buttons with the
  // connector's brand logo. Dedup to the last per (connector,url).
  const connectorLogos = (() => {
    const byUrl = {};
    lines.filter(l => l.t === 'connector_logo' && l.url).forEach(l => { byUrl[l.url] = l; });
    return Object.values(byUrl);
  })();
  const approvalRequests = lines.filter(l => l.t === 'approval_request');
  const approvalResolutions = lines.filter(l => l.t === 'approval_resolved');
  const resolutionById = {};
  approvalResolutions.forEach(r => { if (r.approval_id) resolutionById[r.approval_id] = r; });

  // Phase 4 polish — clickable evidence chips open this memory modal.
  const [evidenceMemoryId, setEvidenceMemoryId] = useState(null);
  // In-app artifact preview (email draft / doc / notion) — no Google redirect.
  const [artifactPreview, setArtifactPreview] = useState(null);

  const isCampaignTurn = roomKind === 'campaign'
    || String(taskTag || '').toUpperCase() === 'CAMPAIGN'
    || /^Create a [^\n]+? campaign for this goal:/i.test(turn.userMessage || turn.user_message || '');
  const campaignBundleLine = [...lines].reverse().find((line) => line.t === 'campaign_bundle' && line.bundle);
  const campaignBundle = campaignBundleLine?.bundle || null;
  const campaignInvalid = [...lines].reverse().find((line) => line.t === 'campaign_bundle_invalid');
  if (campaignHandoff || campaignHandoffFailed) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-violet-500 px-3 py-2 text-[13px] text-white shadow-sm">{visibleUserMessage}</div>
        </div>
        {campaignHandoff ? (
          <section className="overflow-hidden rounded-md border border-[#d8d3cc] bg-white" aria-label="Campaign created">
            <div className="border-b border-[#e4e0da] bg-[#171d1a] px-4 py-4 text-white">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase"><Megaphone size={13} />Campaign toolkit</div>
              <h3 className="mt-2 text-[16px] font-semibold">{campaignHandoff.name || 'Campaign Room started'}</h3>
              <p className="mt-1 text-[11px] text-[#cfd7d2]">The specialist Room is building the strategy, evidence, complete sequence, and schedule. Nothing has been published.</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] text-[#6f6962]"><span className="h-2 w-2 rounded-full bg-emerald-600" />{String(campaignHandoff.status || 'GENERATING').replaceAll('_', ' ')}</div>
              <div className="flex flex-wrap gap-2">
                {campaignHandoff.room_url && <a href={campaignHandoff.room_url} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#cfc9c1] px-3 text-[10.5px] font-semibold text-[#26221f] hover:bg-[#f6f4f0]"><Users size={12} />Open Campaign Room</a>}
                <a href={campaignHandoff.campaign_url} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#171717] px-3 text-[10.5px] font-semibold text-white"><Megaphone size={12} />Open Campaign<ExternalLink size={11} /></a>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[10.5px] text-red-800">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{campaignHandoffFailed.message || 'The Campaign Room could not be created.'}</span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {/* User bubble */}
      <div className="flex flex-col items-end">
        <div className="max-w-[80%] bg-violet-500 text-white text-[13px] rounded-2xl rounded-tr-md px-3 py-2 shadow-sm">
          {visibleUserMessage}
        </div>
        {(() => {
          const uts = turn.createdAt ? new Date(turn.createdAt).getTime() : (lines[0]?.ts || 0);
          return uts ? <div className="text-[9px] font-mono text-[#a3a3a3] mt-0.5 pr-1">{fmtTs(uts)}</div> : null;
        })()}
        {/* Per-turn controls — clear a wrong/time-stale answer, or update & rerun.
            Hidden while the turn is still streaming (no seal/error yet) and in
            archived rooms. */}
        {!archived && !String(turn.id).startsWith('pending-') && (seal || errorLine || liveLines == null) && (onClear || onRerun) && (
          <div className="flex items-center gap-1 mt-1 pr-0.5">
            {onRerun && (
              <button
                type="button"
                onClick={onRerun}
                disabled={busy}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3] hover:text-violet-600 hover:bg-violet-50 disabled:opacity-40 transition-colors"
                title={t('hyperAgents.rerunTurnTitle', 'Wrong answer? Drop it and ask the team again with current context.')}
              >
                <RotateCcw size={10} /> {t('hyperAgents.rerunTurn', 'Update & rerun')}
              </button>
            )}
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                disabled={busy}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3] hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                title={t('hyperAgents.clearTurnTitle', 'Remove this turn and its answer from the room.')}
              >
                <Trash2 size={10} /> {t('hyperAgents.clearTurn', 'Clear')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Phase 1/3/6 — the lead's plan + goal progress. Frames the turn: target
          output, done-criterion, ordered steps, per-agent assignments, and (if
          the goalkeeper re-planned) the current round. */}
      {planLine && (
        <div className="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <ListChecks size={12} className="text-violet-600" />
            <span className="text-[11px] font-medium text-violet-800">{t('hyperAgents.planLabel', 'Plan')}</span>
            <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-mono uppercase tracking-wider">→ {planLine.intended_output}</span>
            {goalkeeperRounds.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-mono uppercase tracking-wider" title={t('hyperAgents.goalkeeperTitle', 'The goalkeeper re-planned because the previous round fell short of the done-criterion.')}>
                {t('hyperAgents.round', 'round')} {goalkeeperRounds.length + 1}
              </span>
            )}
          </div>
          {planLine.done_criterion && (
            <div className="text-[10px] text-[#525252] mb-1">
              <span className="text-[#a3a3a3]">{t('hyperAgents.doneWhen', 'done when:')}</span> {planLine.done_criterion}
            </div>
          )}
          {Array.isArray(planLine.steps) && planLine.steps.length > 0 && (
            <ol className="list-decimal list-inside text-[10px] text-[#525252] space-y-0.5 mb-1 marker:text-violet-400">
              {planLine.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
          {planLine.assignments && Object.keys(planLine.assignments).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(planLine.assignments).map(([who, task]) => (
                <span key={who} className="px-1.5 py-0.5 rounded bg-white border border-violet-100 text-[9px] text-[#525252]" title={String(task)}>
                  <span className="text-violet-700 font-medium">{who}</span>: {String(task).slice(0, 64)}{String(task).length > 64 ? '…' : ''}
                </span>
              ))}
            </div>
          )}
          {goalkeeperRounds.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-violet-100 space-y-0.5">
              {goalkeeperRounds.map((g, i) => (
                <div key={i} className="text-[9px] text-amber-700 font-mono">
                  ↻ {t('hyperAgents.replanned', 'round')} {g.round} → {g.next_round}: {(g.gaps || []).join('; ') || t('hyperAgents.unmet', 'done-criterion unmet')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ROOM ACTIVITY — Claude-style tool timeline: every recall / connector read /
          web search the room ran after the user's message, in order, ending in Done. */}
      <ToolTimeline gathers={gathers} webIntels={webIntels} prospectHunts={prospectHunts} skillUses={skillUses} sealed={!!seal} />



      {/* RECON-PRE — evidence-sufficiency check before the team writes the output. */}
      {reconPreLine && (
        <div className="flex items-start gap-1.5 flex-wrap text-[10px] pl-2">
          {reconPreLine.sufficient
            ? <><CheckCheck size={11} className="text-emerald-600 mt-px" /><span className="text-emerald-700">Evidence sufficient — ready to produce</span></>
            : <><AlertTriangle size={11} className="text-amber-600 mt-px" /><span className="text-amber-700">Evidence gaps (resolve before producing):</span><span className="text-amber-800">{(reconPreLine.missing || []).join('; ')}</span></>}
        </div>
      )}

      {/* EXECUTE — each assigned owner did their slice (phased, sequential
          handoff) before the team integrated. The visible "phases" of work. */}
      {executeLines.length > 0 && (
        <div className="pl-2 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px]">
            <Layers size={11} className="text-indigo-600" />
            <span className="font-medium text-indigo-800">{t('hyperAgents.executed', 'Executed by owners')}</span>
            <span className="text-[#a3a3a3]">· {executeLines.length} {executeLines.length > 1 ? 'parts' : 'part'}</span>
          </div>
          {executeLines.map((e, i) => (
            <div key={i} className="ml-3 border-l-2 border-indigo-100 pl-2 py-0.5">
              <div className="text-[10px] font-medium text-[#404040]">
                {e.name || e.owner} <span className="text-[#a3a3a3] font-normal">— {e.subtask}</span>
              </div>
              {e.contribution && (
                <div className="text-[10px] text-[#737373] leading-snug mt-0.5 whitespace-pre-wrap">{e.contribution}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Live turn with nothing rendered yet — show the swarm spinning up so the
          room feels alive instead of blank while the first events arrive. */}
      {!seal && !errorLine && !router && lines.length === 0 && <SwarmSpinningUp />}

      {/* Before the first router event lands, show a light-weight live status
          row so the room does not look frozen while the server is picking the
          lead/reactors and the SSE stream catches up. */}
      {!seal && !errorLine && !router && liveLines && (
        <div className="text-[10px] text-[#a3a3a3] font-mono pl-2">
          → selecting lead and reactors…
        </div>
      )}

      {router && (
        <div className="text-[10px] text-[#a3a3a3] font-mono pl-2">
          → lead: <span className="text-[#525252]">{router.lead}</span>
          {(router.reactors || []).length > 0 && (
            <> · reactors: <span className="text-[#525252]">{router.reactors.join(', ')}</span></>
          )}
          {router.t === 'router_bootstrap' && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 text-[9px] uppercase tracking-wider">
              bootstrap
            </span>
          )}
          {template && template !== 'debate' && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] uppercase tracking-wider">
              {template}
            </span>
          )}
        </div>
      )}

      {(ontology || workforceAssessment || flybyProposal || simulationPhases.length > 0 || simulationClaims.length > 0) && (
        <DeepSimulationPanel
          ontology={ontology}
          workforceAssessment={workforceAssessment}
          flybyProposal={flybyProposal}
          flybyDecision={flybyDecision}
          flybyJoined={flybyJoined}
          flybySkipped={flybySkipped}
          simulationPhases={simulationPhases}
          simulationClaims={simulationClaims}
          peerReviews={lines.filter(l => l.t === 'peer_review')}
          participants={participants}
          onFlybyDecision={onFlybyDecision}
          busy={flybyBusy}
          archived={archived}
        />
      )}

      {/* Recursive CSI convergence trail — one chip per cycle, verdict + score. */}
      {isSwarm && convergenceTrail.length > 0 && (
        <div className="flex items-center flex-wrap gap-1.5 pl-2 py-1">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3] mr-0.5">
            {t('hyperAgents.convergence', 'Convergence')} · {convergenceTrail.length} {convergenceTrail.length === 1 ? 'cycle' : 'cycles'}
          </span>
          {convergenceTrail.map((c, i) => {
            const v = c.verdict;
            const tone = v === 'AGREED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : v === 'CONDITIONAL' ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';
            return (
              <React.Fragment key={c.cycle ?? i}>
                {i > 0 && <span className="text-[#cbcbcb] text-[10px]">→</span>}
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono ${tone}`} title={`weighted ${c.weighted_score ?? '–'}`}>
                  C{c.cycle ?? i + 1} {v}{typeof c.weighted_score === 'number' ? ` ${c.weighted_score}` : ''}
                  {c.converged ? ' ✓' : ''}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Swarm R1-R5 widget — only when the OLD engine emitted hypotheses/votes.
          The single-director engine streams the debate as the agent bubbles below
          (round dividers + per-persona react), so we skip the empty vote widget. */}
      {isSwarm && (hypotheses.length > 0 || votes.length > 0) && (
        <SwarmRounds
          participants={participants}
          hypotheses={hypotheses}
          peerReviews={peerReviews}
          chains={chains}
          skepticChallenge={skepticChallenge}
          votes={votes}
          swarmVerdict={swarmVerdict}
          roundStarts={roundStarts}
          costCapHit={costCapHit}
          deadlineHit={deadlineHit}
          roomWarnings={roomWarnings}
          onOpenEvidence={setEvidenceMemoryId}
        />
      )}

      {evidenceMemoryId && (
        <EvidenceModal
          memoryId={evidenceMemoryId}
          onClose={() => setEvidenceMemoryId(null)}
        />
      )}

      {leadLine && !isSwarm && (
        <AgentBubble
          agent={participants[leadLine.agent] || { slug: leadLine.agent, lane: 'Communicator' }}
          content={leadLine.content}
          kind="lead"
          ts={eventDisplayTs(leadLine)}
        />
      )}

      {reactions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#737373] pl-1">
            <MessageCircle size={11} className="text-violet-500" />
            {t('hyperAgents.discussion', 'Discussion')}
            <span className="text-[#a3a3a3] normal-case font-sans tracking-normal">· {reactions.length} {reactions.length > 1 ? 'messages' : 'message'}</span>
          </div>
          {reactions.map((r, i) => {
            const prev = reactions[i - 1];
            const showRound = r.round && (!prev || prev.round !== r.round);
            return (
              <div key={`react-${i}`} className="space-y-1.5">
                {showRound && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="h-px flex-1 bg-[#e3e0db]" />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('hyperAgents.round', 'round')} {r.round}</span>
                    <div className="h-px flex-1 bg-[#e3e0db]" />
                  </div>
                )}
                <AgentBubble
                  agent={participants[r.agent] || { slug: r.agent, name: r.name, lane: r.lane || 'Communicator' }}
                  content={r.content || r.line}
                  kind="react"
                  agreement={r.agreement}
                  confidence={r.confidence}
                  ts={eventDisplayTs(r)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Additional Population-Sim — a chip that opens the FULL report as a popup modal
          (report + every voice). The synthesis below already incorporates it; this surfaces
          the raw population. Guarded: absent on normal turns, every field defensive. */}
      {simReport && (
        <>
          <SimTheater simReport={simReport} onOpenFull={() => setShowSim(true)} />
          {showSim && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSim(false)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[86vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-violet-100 bg-violet-50/60 shrink-0">
                  <Users size={15} className="text-violet-600" />
                  <span className="text-[13px] font-semibold text-violet-900">{t('hyperAgents.popSimTitle', 'Population Simulation')}</span>
                  <span className="text-[11px] text-violet-500 font-mono">{(simReport.n_personas || 0)} voices · {(simReport.n_posts || 0)} posts</span>
                  <button type="button" onClick={() => setShowSim(false)} className="ml-auto text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors"><X size={16} /></button>
                </div>
                <div className="overflow-y-auto px-5 py-4 space-y-3">
                  {Array.isArray(simReport.ontology) && simReport.ontology.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {simReport.ontology.map((o, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-violet-50 border border-violet-100 text-[10px] text-violet-700">{String(o)}</span>
                      ))}
                    </div>
                  )}
                  {simReport.role_mix && Object.keys(simReport.role_mix).length > 0 && (
                    <div className="text-[10px] text-[#737373] font-mono break-words">
                      {Object.entries(simReport.role_mix).map(([r, n]) => `${r}×${n}`).join(' · ')}
                    </div>
                  )}
                  {Array.isArray(simReport.posts) && simReport.posts.length > 0 && (() => {
                    const ps = simReport.posts;
                    const S = { positive: 0, neutral: 0, negative: 0 };
                    ps.forEach(p => { const s = (p.sentiment === 'positive' || p.sentiment === 'negative') ? p.sentiment : 'neutral'; S[s]++; });
                    const total = ps.length || 1;
                    const score = (S.positive - S.negative) / total;
                    const pct = Math.round(((score + 1) / 2) * 100);
                    const ang = Math.PI * (1 - pct / 100);
                    const nx = 80 + 58 * Math.cos(ang), ny = 70 - 58 * Math.sin(ang);
                    const col = score > 0.15 ? '#16a34a' : score < -0.15 ? '#dc2626' : '#d97706';
                    const byRole = {};
                    ps.forEach(p => { const r = p.role || '—'; const s = (p.sentiment === 'positive' || p.sentiment === 'negative') ? p.sentiment : 'neutral'; (byRole[r] = byRole[r] || { positive: 0, neutral: 0, negative: 0, n: 0 }); byRole[r][s]++; byRole[r].n++; });
                    const factions = Object.entries(byRole).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
                    return (
                      <div className="border-t border-violet-100 pt-3 space-y-2">
                        <div className="text-[11px] font-semibold text-violet-800 uppercase tracking-wider font-mono">{t('hyperAgents.popSentiment', 'Population sentiment')}</div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <svg viewBox="0 0 160 80" className="w-36 h-20 shrink-0">
                            <path d="M20 70 A60 60 0 0 1 140 70" fill="none" stroke="#ece9e3" strokeWidth="9" strokeLinecap="round" />
                            <line x1="80" y1="70" x2={nx} y2={ny} stroke={col} strokeWidth="3" strokeLinecap="round" />
                            <circle cx="80" cy="70" r="3.5" fill={col} />
                            <text x="80" y="52" textAnchor="middle" style={{ fontSize: '16px', fontWeight: 700, fill: col }}>{pct}</text>
                            <text x="80" y="64" textAnchor="middle" style={{ fontSize: '6.5px', fill: '#737373' }}>net sentiment</text>
                          </svg>
                          <div className="flex-1 min-w-[180px]">
                            <div className="flex h-3.5 rounded overflow-hidden border border-[#ece9e3]">
                              <div style={{ width: `${Math.round(S.positive / total * 100)}%` }} className="bg-green-500" />
                              <div style={{ width: `${Math.round(S.neutral / total * 100)}%` }} className="bg-[#d4d0ca]" />
                              <div style={{ width: `${Math.round(S.negative / total * 100)}%` }} className="bg-red-500" />
                            </div>
                            <div className="flex gap-3 mt-1 text-[10px] text-[#525252]">
                              <span><span className="inline-block w-2 h-2 rounded-sm bg-green-500 mr-1 align-middle" />{S.positive} positive</span>
                              <span><span className="inline-block w-2 h-2 rounded-sm bg-[#d4d0ca] mr-1 align-middle" />{S.neutral} neutral</span>
                              <span><span className="inline-block w-2 h-2 rounded-sm bg-red-500 mr-1 align-middle" />{S.negative} negative</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {factions.map(([r, d]) => (
                            <div key={r} className="flex items-center gap-2 text-[10px]">
                              <span className="w-28 truncate text-[#525252]" title={r}>{r}</span>
                              <div className="flex-1 flex h-2 rounded overflow-hidden border border-[#ece9e3]">
                                <div style={{ width: `${d.positive / d.n * 100}%` }} className="bg-green-500" />
                                <div style={{ width: `${d.neutral / d.n * 100}%` }} className="bg-[#d4d0ca]" />
                                <div style={{ width: `${d.negative / d.n * 100}%` }} className="bg-red-500" />
                              </div>
                              <span className="w-5 text-right text-[#a3a3a3] font-mono">{d.n}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="text-[12.5px] text-[#0a0a0a] leading-relaxed break-words space-y-1 border-t border-violet-100 pt-3">
                    {renderMarkdownLite(String(simReport.report || ''))}
                  </div>
                  {Array.isArray(simReport.posts) && simReport.posts.length > 0 && (() => {
                    const dot = s => s === 'positive' ? 'bg-green-500' : s === 'negative' ? 'bg-red-500' : 'bg-[#d4d0ca]';
                    const filtered = simReport.posts.filter(p =>
                      vFilter === 'all' ? true
                        : ['positive', 'neutral', 'negative'].includes(vFilter) ? ((p.sentiment || 'neutral') === vFilter)
                          : p.role === vFilter);
                    const roles = Array.from(new Set(simReport.posts.map(p => p.role).filter(Boolean))).slice(0, 8);
                    const chip = (val, label) => (
                      <button key={val} type="button" onClick={() => setVFilter(val)}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] border transition-colors ${vFilter === val ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-[#737373] border-[#e3e0db] hover:text-violet-600'}`}>{label}</button>
                    );
                    return (
                      <div className="border-t border-violet-100 pt-3">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className="text-[11px] font-semibold text-violet-800 uppercase tracking-wider font-mono mr-1">
                            {t('hyperAgents.theVoices', 'The voices')} ({filtered.length})
                          </span>
                          {chip('all', t('hyperAgents.fAll', 'All'))}
                          {chip('positive', '😀 +')}{chip('neutral', '😐')}{chip('negative', '😟 −')}
                          {roles.map(r => chip(r, r))}
                        </div>
                        <div className="space-y-1.5">
                          {filtered.map((p, i) => (
                            <div key={i} className="rounded-md border border-[#ece9e3] bg-[#faf9f4] px-2.5 py-1.5">
                              <div className="text-[10px] font-mono text-violet-600 flex items-center gap-1.5">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot(p.sentiment)}`} />
                                {p.name} · {p.role}{p.stance ? ` · ${p.stance}` : ''}
                              </div>
                              <div className="text-[11.5px] text-[#262626] leading-relaxed mt-0.5 break-words">{p.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {synthLine && !isCampaignTurn && (() => {
        // Report-card chrome around the deliverable: WHO wrote it (lead + the team),
        // whether the recon pass VERIFIED it as grounded, and the turn's true cost —
        // so the final card reads like a signed-off report, not an anonymous blob.
        const _leadP = participants[synthLine.agent] || {};
        const _crew = participants.filter(p => (p.slug || p.id) !== synthLine.agent);
        const _v = verifyLine || {};
        const _verified = _v.grounded_ok === true || _v.met === true;
        const _durS = seal?.duration_ms ? Math.round(Number(seal.duration_ms) / 1000) : null;
        return (
          <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 border-b border-violet-100 bg-violet-50/50 flex-wrap">
              <Sparkles size={13} className="text-violet-600" />
              <span className="text-[11px] font-semibold text-violet-800 uppercase tracking-wider font-mono">
                {t('hyperAgents.finalOutput', 'Final — room synthesis')}
              </span>
              {_verified && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-medium"
                      title={t('hyperAgents.verifiedTitle', 'The recon pass checked this deliverable against the gathered evidence — grounded.')}>
                  <CheckCheck size={10} /> {t('hyperAgents.verified', 'verified')}
                </span>
              )}
              <button
                type="button"
                onClick={() => { try { navigator.clipboard.writeText(synthLine.content || ''); } catch { /* noop */ } }}
                className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-violet-600 hover:bg-violet-100"
                title={t('hyperAgents.copySynth', 'Copy the deliverable as markdown')}
              >{t('hyperAgents.copy', 'copy')}</button>
              {eventDisplayTs(synthLine) ? (
                <span className="text-[9px] font-mono text-[#a3a3a3]">{fmtTs(eventDisplayTs(synthLine))}</span>
              ) : null}
            </div>
            <div className="px-4 py-3">
              {(() => {
                // Kind report views (brochure) own the synthesis when registered —
                // the legacy desk renderer is the fallback. This is the SAME
                // registry the final_report path uses, so both paths match.
                const KindReport = reportViewFor(roomKind);
                return KindReport
                  ? <KindReport report={{ content: synthLine.content }} roomKind={roomKind} prospectHunts={prospectHunts}
                      taskTitle={String(turn.userMessage || '').replace(/^Start task:\s*/i, '').split(/[.\n]/)[0].slice(0, 90)} />
                  : <TaskSynthesisRenderer taskTag={taskTag} roomKind={roomKind} content={synthLine.content} />;
              })()}
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 border-t border-violet-100 bg-[#faf9f4] flex-wrap">
              <AgentAvatar agent={_leadP && _leadP.name ? _leadP : { name: synthLine.agent, slug: synthLine.agent }} size={20} />
              <span className="text-[10px] text-[#525252]">
                {t('hyperAgents.synthBy', 'by')} <span className="font-medium text-[#0a0a0a]">{_leadP.name || synthLine.agent}</span>
                {_crew.length > 0 && <> · {t('hyperAgents.synthWith', 'with')} {_crew.map(p => p.name || p.slug).filter(Boolean).join(', ')}</>}
              </span>
              <span className="ml-auto flex items-center gap-2 text-[9px] font-mono text-[#a3a3a3] tabular-nums">
                {_durS != null && <span>{_durS}s</span>}
                {seal?.cost_tokens != null && <span>{Number(seal.cost_tokens).toLocaleString()} tok</span>}
              </span>
            </div>
          </div>
        );
      })()}

      {revises.map((rev, i) => (
        <div key={`revise-${i}`} className="border-l-2 border-dashed border-[#a3a3a3] ml-3 pl-3">
          <div className="text-[9px] uppercase tracking-wider text-[#737373] font-mono mb-0.5">
            {t('hyperAgents.revision', 'Revision · round {{n}}', { n: rev.round || (i + 2) })}
          </div>
          <AgentBubble
            agent={participants[rev.agent] || { slug: rev.agent, lane: 'Communicator' }}
            content={rev.content}
            kind="revise"
            ts={eventDisplayTs(rev)}
          />
          {validates[i] && (
            <div className="mt-1.5">
              <div className="text-[9px] uppercase tracking-wider text-[#737373] font-mono mb-0.5">
                {t('hyperAgents.verdict', 'Verdict · {{v}}', { v: validates[i].verdict || t('hyperAgents.resolved', 'resolved') })}
              </div>
              <AgentBubble
                agent={participants[validates[i].agent] || { slug: validates[i].agent, lane: 'Communicator' }}
                content={validates[i].content}
                kind="validate"
                ts={eventDisplayTs(validates[i])}
              />
            </div>
          )}
        </div>
      ))}

      {rescueLine && (
        <div className="border-l-2 border-amber-400 ml-3 pl-3 bg-amber-50/50 rounded-r-md">
          <div className="text-[9px] uppercase tracking-wider text-amber-700 font-mono mb-0.5">
            {t('hyperAgents.rescue', 'Rescue · concrete answer')}
          </div>
          <AgentBubble
            agent={participants[rescueLine.agent] || { slug: rescueLine.agent, lane: 'Communicator' }}
            content={rescueLine.content}
            kind="rescue"
            ts={eventDisplayTs(rescueLine)}
          />
        </div>
      )}

      {decisionRequired && (
        <div className="mx-2 my-2 p-3 rounded-md border border-amber-300 bg-amber-50 text-[12px]">
          <div className="text-[9px] uppercase tracking-wider text-amber-700 font-mono mb-1">
            {t('hyperAgents.decisionRequired', '⚠ Decision required · escalated after {{n}} rounds', { n: decisionRequired.rounds_run || '?' })}
          </div>
          <div className="text-[#525252]">{decisionRequired.open_question}</div>
          {decisionRequired.raised_by && (
            <div className="text-[10px] text-[#737373] mt-1">{t('hyperAgents.raisedBy', 'raised by: {{who}}', { who: decisionRequired.raised_by })}</div>
          )}
        </div>
      )}

      {decisionSaved && (
        <div className="mx-2 text-[10px] text-emerald-700 font-mono pl-2">
          {t('hyperAgents.savedToMemory', '✓ saved to memory · trigger: {{trigger}} · id: {{id}}', { trigger: decisionSaved.trigger, id: (decisionSaved.memory_id || '').slice(0, 8) })}
        </div>
      )}

      {memoryAudit && (
        <div className={`mx-2 my-2 rounded-lg border px-3 py-2 text-[11px] ${
          memoryAudit.project_scoped && memoryAudit.project_hits === 0 && memoryAudit.web_allowed
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}>
          <div className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-[9px] mb-1">
            <Brain size={11} /> {t('hyperAgents.memoryAudit', 'Memory audit')}
          </div>
          {memoryAudit.project_scoped
            ? t('hyperAgents.memoryAuditProject', 'Project hits: {{project}} · org fallback: {{org}} · web: {{web}}', {
                project: memoryAudit.project_hits || 0,
                org: memoryAudit.org_fallback_hits || 0,
                web: memoryAudit.web_allowed ? memoryAudit.web_reason || 'allowed' : 'blocked',
              })
            : t('hyperAgents.memoryAuditOrg', 'Memory hits: {{hits}} · web: {{web}}', {
                hits: memoryAudit.memory_hits || 0,
                web: memoryAudit.web_allowed ? memoryAudit.web_reason || 'allowed' : 'blocked',
              })}
        </div>
      )}

      {harnessCheck?.status === 'warn' && (
        <div className="mx-2 my-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <div className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-[9px] mb-1">
            <AlertTriangle size={11} /> {t('hyperAgents.harnessCheckWarn', 'Report quality check')}
          </div>
          {(harnessCheck.failed || []).length > 0
            ? t('hyperAgents.harnessCheckFailed', 'Needs attention: {{items}}', { items: harnessCheck.failed.join(', ') })
            : t('hyperAgents.harnessCheckGeneric', 'Some report quality checks need attention.')}
        </div>
      )}

      {finalReport && (() => {
        // Per-kind report view (P3) if the kind registers one; else the default
        // FinalReportCard. Registry falls back to null, so behavior is unchanged
        // until a kind ships its dedicated view.
        const KindReport = reportViewFor(isCampaignTurn ? 'campaign' : roomKind);
        if (isCampaignTurn && !campaignBundle) {
          const errors = Array.isArray(campaignInvalid?.errors) ? campaignInvalid.errors : [];
          return <section className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50/60" aria-label="Campaign plan needs refinement">
            <div className="border-b border-amber-200 px-4 py-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-amber-900"><AlertTriangle size={14} />Campaign plan needs refinement</div><p className="mt-1 text-[10.5px] leading-5 text-amber-800">The Room did not submit an executable campaign contract, so no plan was marked ready and nothing was published.</p></div>
            {errors.length ? <div className="px-4 py-3"><div className="text-[9px] font-mono uppercase text-amber-700">Contract checks</div><ul className="mt-2 space-y-1 text-[10.5px] leading-5 text-amber-900">{errors.slice(0, 8).map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
          </section>;
        }
        return KindReport ? (
          <KindReport
            report={isCampaignTurn ? { ...finalReport, bundle: campaignBundle } : finalReport}
            roomKind={roomKind}
            webSources={webIntel?.sources || []}
            prospectHunts={prospectHunts}
            taskTitle={String(turn.userMessage || '').replace(/^Start task:\s*/i, '').split(/[.\n]/)[0].slice(0, 90)}
            onOpenMemory={setEvidenceMemoryId}
          />
        ) : (
          <FinalReportCard
            report={finalReport}
            webSources={webIntel?.sources || []}
            onOpenMemory={setEvidenceMemoryId}
          />
        );
      })()}

      {/* OUTREACH PROSPECTS — full stacked cards with all firm info; green "email
          verified" badge on the ones we found an email for (the ones that get emailed). */}
      {prospectStacks.map((pe, i) => <ProspectStack key={`ps-${i}`} ev={pe} />)}

      {/* OUTREACH EXECUTION — after the report seals, run the prospects as a
          one-by-one campaign: emails to the verified ones, TARA calls to the
          ones with phones. Progress bar + stop/deselect; drain worker finishes
          the run if the tab dies. */}
      {seal && prospectStacks.length > 0 && !campaignChannel && (() => {
        const allP = prospectStacks.flatMap(ev => ev.prospects || []);
        const nEmail = allP.filter(p => p.email && /^[\w.+-]+@[\w.-]+\.\w+$/.test(p.email)).length;
        const nCall = allP.filter(p => p.phone && /^\+[1-9]\d{6,14}$/.test(String(p.phone).replace(/[\s()/-]/g, ''))).length;
        if (!nEmail && !nCall) return null;
        return (
          <div className="pl-2 flex items-center gap-2 flex-wrap">
            {nEmail > 0 && (
              <button onClick={() => setCampaignChannel('email')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider bg-[#117dff] text-white hover:bg-[#0e6be0]">
                <Send size={11} /> {t('hyperAgents.sendOutreachEmails', 'Send outreach emails ({{n}})', { n: nEmail })}
              </button>
            )}
            {nCall > 0 && (
              <button onClick={() => setCampaignChannel('call')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider border border-[#117dff] text-[#117dff] hover:bg-blue-50">
                <PhoneCall size={11} /> {t('hyperAgents.startOutreachCalls', 'Start outreach calls ({{n}})', { n: nCall })}
              </button>
            )}
          </div>
        );
      })()}
      {campaignChannel && (
        <CampaignPanel
          roomId={roomId}
          turnId={turn.id}
          channel={campaignChannel}
          eligibleCount={prospectStacks.flatMap(ev => ev.prospects || [])
            .filter(p => (campaignChannel === 'email' ? p.email : p.phone)).length}
          onClose={() => setCampaignChannel(null)}
        />
      )}

      {/* Produced deliverables (docs/sheets) — connector-logo "view in new tab"
          buttons. The swarm built these after reaching consensus; no approval. */}
      {connectorLogos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {connectorLogos.map((art, i) => {
            const logo = BRAND_LOGOS[art.connector];
            return (
              <div key={art.url || i} className="flex items-stretch gap-0">
                <a
                  href={art.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`group flex items-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 transition-colors ${art.body_md ? 'rounded-l-lg' : 'rounded-lg'}`}
                  title={art.title || art.label || 'Open'}
                >
                  {logo
                    ? <img src={logo} alt={art.connector} className="w-4 h-4" />
                    : <ExternalLink size={14} className="text-emerald-700" />}
                  <span className="text-[11px] font-medium text-emerald-800 truncate max-w-[220px]">
                    {art.label || art.title || t('hyperAgents.openArtifact', 'Open')}
                  </span>
                  <ExternalLink size={11} className="text-emerald-500 group-hover:text-emerald-700" />
                </a>
                {art.body_md && (
                  <button type="button"
                    onClick={() => setArtifactPreview({
                      kind: art.connector === 'gmail' ? 'email' : art.connector,
                      connector: art.connector, title: art.title, subject: art.title,
                      body_md: art.body_md, url: art.url,
                    })}
                    className="flex items-center gap-1 px-2.5 rounded-r-lg border border-l-0 border-emerald-200 bg-white text-[10.5px] font-medium text-emerald-700 hover:bg-emerald-100/70 transition-colors"
                    title={t('hyperAgents.previewTitle', 'Preview the draft in-app — edit + send with one click')}>
                    <Eye size={12} /> {t('hyperAgents.preview', 'Preview')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* In-app preview popup — renders the artifact (email/doc/notion) as the room does;
          email drafts: pencil-edit + one-click Send (mermaid → PNG attachments). */}
      {artifactPreview && (
        <ArtifactPreviewModal key={artifactPreview.approval_id || artifactPreview.url || 'p'}
          preview={artifactPreview} roomId={roomId} onClose={() => setArtifactPreview(null)} />
      )}

      {/* Phase 5 — recon/verify verdict vs the done-criterion. */}
      {verifyLine && (
        <div className={`rounded-lg border px-3 py-2 ${verifyLine.met ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {verifyLine.met
              ? <CheckCheck size={12} className="text-emerald-600" />
              : <AlertTriangle size={12} className="text-amber-600" />}
            <span className={`text-[11px] font-medium ${verifyLine.met ? 'text-emerald-800' : 'text-amber-800'}`}>
              {verifyLine.met ? t('hyperAgents.verifyMet', 'Verified — done-criterion met') : t('hyperAgents.verifyGaps', 'Recon — gaps remain')}
            </span>
            <div className="ml-auto flex gap-1">
              {[['artifact', 'artifact_ok'], ['assign', 'assignments_ok'], ['grounded', 'grounded_ok']].map(([lbl, k]) => (
                <span key={k} className={`px-1 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider ${verifyLine[k] ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{lbl}</span>
              ))}
            </div>
          </div>
          {!verifyLine.met && Array.isArray(verifyLine.gaps) && verifyLine.gaps.length > 0 && (
            <ul className="list-disc list-inside text-[10px] text-amber-800 space-y-0.5">
              {verifyLine.gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          )}
          {verifyLine.note && <div className="text-[9px] text-[#a3a3a3] mt-1 italic">{verifyLine.note}</div>}
        </div>
      )}

      {/* Phase 4/7 — write-approval cards. Side-effectful writes (send email,
          create/append doc, CRM/PR) are held until the user approves here. */}
      {approvalRequests.length > 0 && (
        <div className="space-y-1.5">
          {approvalRequests.map((a, i) => {
            const resolved = resolutionById[a.approval_id];
            const busyHere = approveBusy === a.approval_id;
            const artifactUrl = resolved?.result?.result?.url || resolved?.result?.url;
            // Outbound email → the cinematic Gmail-style compose card: the agent
            // visibly types the draft, the user sends with one click (or the
            // room's auto-send automation fires once typing completes).
            if (a.body_md && !archived) {
              return (
                <EmailComposeCard key={a.approval_id || i}
                  approval={a}
                  fromName={roomAgentName}
                  resolved={resolved}
                  busy={busyHere}
                  autoSend={autoSendOn}
                  onToggleAutoSend={toggleAutoSend}
                  onSend={() => onApprove && onApprove(a.approval_id, 'approve')}
                  onDeny={() => onApprove && onApprove(a.approval_id, 'deny')}
                />
              );
            }
            return (
              <div key={a.approval_id || i} className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Shield size={12} className="text-blue-600" />
                  <span className="text-[11px] font-medium text-blue-800">{t('hyperAgents.approvalNeeded', 'Approval needed')}</span>
                  {a.label && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-mono">{a.label}</span>}
                  {a.body_md && !resolved && (
                    <button type="button"
                      onClick={() => setArtifactPreview({ kind: 'email', connector: 'gmail', to: a.to, subject: a.subject, body_md: a.body_md, approval_id: a.approval_id })}
                      className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded border border-blue-200 bg-white text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      title={t('hyperAgents.previewTitle', 'Preview the draft in-app — edit + send with one click')}>
                      <Eye size={11} /> {t('hyperAgents.preview', 'Preview')}
                    </button>
                  )}
                </div>
                {a.summary && <div className="text-[10px] text-[#525252] mb-1.5">{a.summary}</div>}
                {resolved ? (
                  <div className="text-[10px] font-mono flex items-center gap-2">
                    {resolved.decision === 'approve'
                      ? <span className="text-emerald-700 flex items-center gap-1"><Check size={11} /> {t('hyperAgents.approved', 'Approved')}</span>
                      : <span className="text-red-600 flex items-center gap-1"><X size={11} /> {t('hyperAgents.denied', 'Denied')}</span>}
                    {artifactUrl && (
                      <a href={artifactUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                        <ExternalLink size={10} /> {t('hyperAgents.openArtifact', 'open')}
                      </a>
                    )}
                  </div>
                ) : archived ? (
                  <div className="text-[9px] text-[#a3a3a3] font-mono">{t('hyperAgents.archivedNoAction', 'archived — no action')}</div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={busyHere || !onApprove}
                      onClick={() => onApprove && onApprove(a.approval_id, 'approve')}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                    >
                      {busyHere ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} {t('hyperAgents.approve', 'Approve')}
                    </button>
                    <button
                      type="button"
                      disabled={busyHere || !onApprove}
                      onClick={() => onApprove && onApprove(a.approval_id, 'deny')}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                    >
                      <X size={11} /> {t('hyperAgents.deny', 'Deny')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!seal && typing.length > 0 && (
        <div className="text-[11px] text-[#a3a3a3] italic flex items-center gap-2 pl-2">
          {typing.map((typingLine, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <AgentAvatar
                agent={(participants || []).find(pp => pp.slug === typingLine.agent || pp.name === typingLine.agent) || { name: typingLine.agent, slug: typingLine.agent }}
                size={18} active
              />
              {typingLine.note || t('hyperAgents.agentTyping', '{{agent}} typing…', { agent: typingLine.agent })}
            </span>
          ))}
        </div>
      )}

      {deadEndLine?.content && (
        <div className="mx-2 my-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
          <div className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-[9px] mb-1 text-amber-700">
            <AlertTriangle size={11} /> {t('hyperAgents.deadEnd', "Couldn't fully finish — here's why")}
          </div>
          {deadEndLine.content}
        </div>
      )}
      {seal && (() => {
        const nt = lines.filter(l => l && l.t === 'next_tasks').flatMap(l => l.tasks || []);
        if (!nt.length || archived) return null;
        return (
          <div className="mt-2 space-y-1.5">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">Suggested next moves — one click runs it</div>
            <div className="flex flex-wrap gap-1.5">
              {nt.map((task, i) => (
                <button key={i} type="button" disabled={busy} onClick={() => onRunNextTask && onRunNextTask(task)}
                  title={task.detail || ''}
                  className="group text-left rounded-lg border border-[#117dff]/30 bg-[#117dff]/5 hover:bg-[#117dff]/10 px-3 py-2 max-w-[260px] transition-colors">
                  <div className="text-[11px] font-medium text-[#0a0a0a] flex items-center gap-1.5">
                    <span className="px-1 py-0.5 rounded bg-[#117dff]/10 text-[#117dff] text-[8px] font-mono">{task.tag || 'NEXT'}</span>
                    {task.title}
                  </div>
                  {task.detail && <div className="text-[10px] text-[#525252] mt-0.5 line-clamp-2">{task.detail}</div>}
                  <div className="text-[9px] font-mono text-[#117dff] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">▶ run now</div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
      {seal && (
        <div className="space-y-1 py-1">
          <div className={`text-[9px] uppercase tracking-wider font-mono text-center ${
            sealStatus === 'escalated' ? 'text-amber-700' :
            sealStatus === 'blocked' ? 'text-amber-700' :
            sealStatus === 'failed' ? 'text-red-600' :
            qualityLow ? 'text-amber-600' :
            'text-[#a3a3a3]'
          }`}>
            {errorLine
              ? t('hyperAgents.sealFailed', '─── failed: {{msg}} ───', { msg: errorLine.message || t('hyperAgents.unknownError', 'unknown error') })
              : sealStatus === 'blocked'
                ? t('hyperAgents.sealBlocked', '─── blocked · {{tok}} tok ───', { tok: seal.cost_tokens || 0 })
                : sealStatus === 'escalated'
                  ? t('hyperAgents.sealEscalated', '─── escalated · {{tok}} tok ───', { tok: seal.cost_tokens || 0 })
                  : qualityLow
                    ? t('hyperAgents.sealLowQuality', '─── sealed (low quality) · {{tok}} tok ───', { tok: seal.cost_tokens || 0 })
                    : t('hyperAgents.sealComplete', '─── sealed · {{tok}} tok ───', { tok: seal.cost_tokens || 0 })}
          </div>
          {seal && (Number(seal.tokens_in) > 0 || Number(seal.tokens_out) > 0) && (
            <div className="mt-1 flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5 text-[9px] font-mono text-[#a3a3a3]">
              {Number(seal.tokens_in) > 0 && <span><span className="text-[#737373]">{Number(seal.tokens_in).toLocaleString()}</span> in</span>}
              {Number(seal.tokens_out) > 0 && <span>· <span className="text-[#737373]">{Number(seal.tokens_out).toLocaleString()}</span> out</span>}
              {Number(seal.tokens_cached) > 0 && (
                <span className="text-emerald-600" title={t('hyperAgents.cachedHint', 'Groq prompt-cache hits — cached input billed at 50%')}>
                  · {Number(seal.tokens_cached).toLocaleString()} cached ⚡
                </span>
              )}
              {seal.tok_by && ((seal.tok_by.director || 0) + (seal.tok_by.synth || 0) + (seal.tok_by.debate || 0) + (seal.tok_by.web || 0)) > 0 && (
                <span title={t('hyperAgents.tokByHint', 'director = gather plan (fast model) · synth = final deliverable (best model) · debate = the room · web = live search')}>
                  · plan {Math.round((seal.tok_by.director || 0) / 1000)}k
                  {(seal.tok_by.synth || 0) > 0 ? ` · synth ${Math.round(seal.tok_by.synth / 1000)}k` : ''}
                  {(seal.tok_by.debate || 0) > 0 ? ` · debate ${Math.round(seal.tok_by.debate / 1000)}k` : ''}
                  {(seal.tok_by.web || 0) > 0 ? ` · web ${Math.round(seal.tok_by.web / 1000)}k` : ''}
                </span>
              )}
            </div>
          )}
          {Object.keys(trustDeltas).length > 0 && (
            <div className="text-[9px] text-[#737373] font-mono text-center flex flex-wrap justify-center gap-2">
              {Object.entries(trustDeltas).map(([slug, score]) => (
                <span key={slug} className="px-1.5 py-0.5 rounded bg-[#f3f1ec]">
                  {slug}: trust {(Number(score) * 100).toFixed(0)}
                </span>
              ))}
            </div>
          )}
          {toolCallTotal > 0 && (
            <div className="text-[9px] text-[#737373] font-mono text-center flex flex-wrap justify-center gap-2 mt-1">
              <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">
                {toolCallTotal} tool calls
              </span>
              {Object.entries(toolCallCounts).map(([slug, count]) => (
                count > 0 && (
                  <span key={slug} className="px-1.5 py-0.5 rounded bg-[#f3f1ec]">
                    {slug}: {count}
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParticipantChip({ agent, canRemove, onRemove, onOpenDm }) {
  const { t } = useTranslation('dashboard');
  const lane = agent?.lane || 'Communicator';
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const Icon = meta.icon;
  const [hover, setHover] = useState(false);
  const contract = getPersonaContract(agent);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="bg-white border border-[#e3e0db] rounded-lg px-2.5 py-2 flex items-center gap-2 hover:border-[#d4d0ca] cursor-pointer transition-colors"
      onClick={() => onOpenDm?.(agent)}
      title={t('hyperAgents.dmAgent', 'DM {{name}}', { name: agent?.name || agent?.slug })}
    >
      <AgentAvatar agent={agent} size={28} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-[#0a0a0a] truncate">{agent?.name || agent?.slug}</div>
        <div className="flex items-center gap-1 text-[9px] font-mono" style={{ color: meta.color }}>
          <Icon size={9} /> {meta.label}
          {typeof agent?.trustScore === 'number' && (
            <span
              className="ml-1 px-1 rounded bg-[#f3f1ec] text-[#525252]"
              title={t('hyperAgents.trustScore', 'Trust score (display-only, {{w}}W / {{l}}L)', { w: agent.trustWins || 0, l: agent.trustLosses || 0 })}
            >
              t{Math.round(agent.trustScore * 100)}
            </span>
          )}
        </div>
        {contract?.stance && (
          <div className="mt-0.5 text-[9px] text-[#737373] truncate" title={contractSnippet(contract)}>
            {contract.stance}
          </div>
        )}
      </div>
      {canRemove && hover && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="text-[#a3a3a3] hover:text-red-600 shrink-0"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}

/* ─── 1-on-1 DM modal (history persisted in localStorage) ───────────── */

function AgentDmModal({ agent, onClose }) {
  const { t } = useTranslation('dashboard');
  // Stable per-user-agent conversation id. Backend uses this to keep
  // ReAct agent memory across turns within the same conversation; we
  // also use it as the localStorage key so refresh / re-open re-hydrates
  // the prior thread.
  const convId = useMemo(() => `dm:${agent?.slug || agent?.id}`, [agent]);
  const storageKey = useMemo(() => `hyper-agents:dm:${agent?.slug || agent?.id}`, [agent]);

  const [messages, setMessages] = useState(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(messages)); }
    catch { /* storage may be disabled */ }
  }, [messages, storageKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function handleSend(e) {
    e?.preventDefault?.();
    const text = draft.trim();
    if (!text || sending) return;
    setErr(null);
    setSending(true);
    const userMsg = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setDraft('');
    try {
      const resp = await apiClient.controlPlane.post(
        `/v1/employees/${agent.slug}/chat`,
        { text, conversation_id: convId },
      );
      const reply = resp?.data?.reply || '(no reply)';
      setMessages(prev => [...prev, { role: 'agent', content: reply, ts: Date.now() }]);
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
      // Roll back user msg so they can retry without dupes? keep it for context
    } finally {
      setSending(false);
    }
  }

  function clearHistory() {
    if (!window.confirm(t('hyperAgents.confirmClearDm', 'Clear this DM history?'))) return;
    setMessages([]);
    try { window.localStorage.removeItem(storageKey); } catch { /* noop */ }
  }

  if (!agent) return null;
  const lane = agent.lane || 'Communicator';
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white rounded-xl w-full max-w-[640px] h-[70vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 py-3 border-b border-[#e3e0db] bg-white flex items-center gap-3 shrink-0">
          <AgentAvatar agent={agent} size={36} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#0a0a0a] truncate">{agent.name || agent.slug}</div>
            <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: meta.color }}>
              <Icon size={10} /> {meta.label}
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="text-[10px] uppercase tracking-wider text-[#a3a3a3] hover:text-red-600 px-2 py-1 rounded"
            title={t('hyperAgents.clearDmHistory', 'Clear DM history')}
          >
            {t('hyperAgents.clear', 'Clear')}
          </button>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a] p-1" title={t('hyperAgents.close', 'Close')}>
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-[#faf9f4]">
          {messages.length === 0 && (
            <div className="text-center text-[11px] text-[#a3a3a3] py-6">
              {t('hyperAgents.dmEmptyState', 'Start a 1-on-1 with {{name}}. History stays here across visits.', { name: agent.name || agent.slug })}
            </div>
          )}
          {messages.map((m, i) => (
            m.role === 'user'
              ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[78%] bg-violet-500 text-white text-[13px] rounded-2xl rounded-tr-md px-3 py-2 whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              )
              : (
                <div key={i} className="flex gap-2">
                  <AgentAvatar agent={agent} size={28} />
                  <div className="max-w-[78%] bg-white border border-[#e3e0db] rounded-2xl rounded-tl-md px-3 py-2 text-[13px] text-[#0a0a0a] whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              )
          ))}
          {sending && (
            <div className="text-[11px] text-[#a3a3a3] flex items-center gap-2 pl-2">
              <Loader2 size={11} className="animate-spin" /> {t('hyperAgents.agentTyping', '{{agent}} typing…', { agent: agent.name || agent.slug })}
            </div>
          )}
          {err && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              <AlertTriangle size={11} className="inline mr-1" /> {err}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-[#e3e0db] bg-white px-3 py-3 flex items-end gap-2 shrink-0">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
            rows={1}
            placeholder={t('hyperAgents.dmPlaceholder', 'Message {{name}}…', { name: agent.name || agent.slug })}
            disabled={sending}
            className="flex-1 bg-[#faf9f4] border border-[#e3e0db] rounded-xl px-3 py-2 text-[13px] text-[#0a0a0a] outline-none focus:border-violet-500 resize-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="h-9 px-3 bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {t('hyperAgents.send', 'Send')}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Create-room modal ──────────────────────────────────────────────── */

function CreateRoomModal({ onClose, onCreated }) {
  const { t } = useTranslation('dashboard');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  // Default to Smart (auto) — the orchestrator picks the best format from the
  // first question. No-code users never have to understand the 10 templates.
  const [template, setTemplate] = useState('auto');
  const [roomTag, setRoomTag] = useState('');
  const [employees, setEmployees] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [skepticId, setSkepticId] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  // Scope — org-wide (default) or inside a specific project HIVEMIND.
  const [scope, setScope] = useState('org'); // 'org' | 'project'
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const activeFormat = ROOM_FORMATS.find(f => f.key === template) || ROOM_FORMATS[0];

  // ALL org agents are always selectable regardless of scope — project scope only
  // affects what the room recalls (memories), never who can join it.
  const allowedEmployees = employees;
  const filteredEmployees = agentQuery.trim()
    ? employees.filter(e => (e.name || '').toLowerCase().includes(agentQuery.trim().toLowerCase()))
    : employees;
  const selectedProject = projects.find(p => p.id === projectId);

  useEffect(() => {
    apiClient.listEmployees()
      .then(d => setEmployees(d?.employees || d || []))
      .catch(() => setEmployees([]));
    apiClient.listAccessibleProjects()
      .then(d => setProjects((d?.projects || d || []).filter(Boolean)))
      .catch(() => setProjects([]));
  }, []);

  function toggle(id) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const scopeReady = scope === 'org' || (scope === 'project' && projectId);

  // ── 3-step wizard ──────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const STEPS = [
    { n: 1, label: t('hyperAgents.stepRoom', 'Room'), icon: Target },
    { n: 2, label: t('hyperAgents.stepFlow', 'Collaboration'), icon: Network },
    { n: 3, label: t('hyperAgents.stepAgents', 'Agents'), icon: Users },
  ];
  const step1Valid = !!roomTag && !!name.trim() && !!goal.trim() && scopeReady;
  const step3Valid = picked.size > 0;
  const canCreate = step1Valid && step3Valid && !busy;
  const stepValid = step === 1 ? step1Valid : step === 3 ? step3Valid : true;
  function goNext() { if (step < 3 && stepValid) setStep(step + 1); }
  function goBack() { if (step > 1) setStep(step - 1); }

  async function submit(e) {
    e?.preventDefault?.();
    if (step < 3) { goNext(); return; }
    if (!name.trim() || !goal.trim() || picked.size === 0 || !scopeReady || busy) return;
    setBusy(true); setErr(null);
    try {
      const payload = {
        name: name.trim(),
        goal: goal.trim(),
        participant_ids: Array.from(picked),
        template,
        room_tag: roomTag,
      };
      if (template === 'swarm' && skepticId) {
        payload.permanent_skeptic_id = skepticId;
      }
      // Scope: omit project_id for org-wide; set it to nest the room inside a project HIVEMIND.
      if (scope === 'project' && projectId) {
        payload.project_id = projectId;
      }
      const resp = await apiClient.createHyperRoom(payload);
      onCreated?.(resp.room);
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#1a1814]/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.form
        onSubmit={submit}
        initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-white rounded-[12px] w-full max-w-[680px] max-h-[88vh] flex flex-col border border-[#e3e0db] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.22)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header + stepper ─────────────────────────────────────────── */}
        <header className="px-7 pt-5 pb-4 flex-shrink-0 border-b border-[#e3e0db] bg-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center bg-[#117dff]/10 text-[#117dff]">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-[#0a0a0a] leading-tight font-['Space_Grotesk'] tracking-tight">{t('hyperAgents.newRoomTitle', 'New room')}</h2>
                <p className="text-[11.5px] text-[#737373] leading-tight mt-0.5">{t('hyperAgents.newRoomSub', 'Spin up a multi-agent collaboration room')}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4] transition-colors"><X size={16} /></button>
          </div>

          {/* Stepper */}
          <div className="mt-5 flex items-center">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.n;
              const active = step === s.n;
              const reachable = s.n === 1 || (s.n === 2 && step1Valid) || (s.n === 3 && step1Valid);
              return (
                <React.Fragment key={s.n}>
                  <button
                    type="button"
                    onClick={() => reachable && setStep(s.n)}
                    disabled={!reachable}
                    className={`flex items-center gap-2 group ${reachable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold font-['Space_Grotesk'] border transition-colors ${
                      active ? 'bg-[#117dff] border-[#117dff] text-white'
                      : done ? 'bg-white border-[#117dff] text-[#117dff]'
                      : 'bg-white border-[#e3e0db] text-[#a3a3a3]'
                    }`}>
                      {done ? <Check size={13} /> : <Icon size={13} />}
                    </span>
                    <span className={`text-[12px] font-medium hidden sm:block ${active ? 'text-[#0a0a0a]' : done ? 'text-[#525252]' : 'text-[#a3a3a3]'}`}>{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-3 ${step > s.n ? 'bg-[#117dff]' : 'bg-[#e3e0db]'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </header>

        {/* ── Body (per-step) ──────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="px-7 py-6"
            >
              {/* ───────── STEP 1 — Room ───────── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2 block">Room expertise</label>
                    <p className="text-[10.5px] text-[#737373] -mt-1 mb-2.5">Choose the operating specialty that controls this Room's skills, toolkit, and final report.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DOMAIN_ROOMS.map((domain) => {
                        const Icon = domain.icon;
                        const on = roomTag === domain.key;
                        return (
                          <button
                            type="button"
                            key={domain.key}
                            onClick={() => {
                              setRoomTag(domain.key);
                              if (!name.trim() && domain.key !== 'general') setName(`${domain.label} room`);
                            }}
                            title={domain.desc}
                            className={`min-h-[86px] text-left p-3 rounded-[8px] border transition-colors ${on ? 'border-[#117dff] bg-[#117dff]/[0.04]' : 'border-[#e3e0db] bg-white hover:border-[#d4d0ca]'}`}
                          >
                            <span className="w-7 h-7 rounded-[6px] flex items-center justify-center mb-2" style={{ background: `${domain.color}16`, color: domain.color }}>
                              <Icon size={14} />
                            </span>
                            <span className="block text-[12.5px] font-semibold text-[#171717]">{domain.label}</span>
                            <span className="block mt-0.5 text-[10px] leading-snug text-[#737373]">{domain.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-1.5 block">{t('hyperAgents.nameLbl', 'Name')}</label>
                    <input
                      autoFocus
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('hyperAgents.namePlaceholder', 'Q2 planning')}
                      className="w-full h-11 px-3.5 text-[14px] bg-white border border-[#e3e0db] rounded-[8px] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-1.5 block">{t('hyperAgents.scopeLbl', 'Scope')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[['org', t('hyperAgents.scopeOrg', 'Whole Org'), Globe], ['project', t('hyperAgents.scopeProject', 'Project'), FolderOpen]].map(([key, label, Icon]) => {
                        const on = scope === key;
                        return (
                          <button type="button" key={key} onClick={() => setScope(key)}
                            className={`flex items-center justify-center gap-1.5 h-11 rounded-[8px] border text-[13px] font-medium transition-colors ${on ? 'bg-[#117dff] border-[#117dff] text-white' : 'bg-white border-[#e3e0db] text-[#525252] hover:border-[#d4d0ca]'}`}>
                            <Icon size={14} /> {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Project picker — only when scope=project */}
                  {scope === 'project' && (
                    <div className="rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] px-3.5 py-3">
                      <label className="text-[11px] font-semibold text-[#117dff] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <FolderOpen size={12} /> {t('hyperAgents.pickProject', 'Project HIVEMIND')}
                      </label>
                      <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full h-10 px-3 text-[13px] bg-white border border-[#e3e0db] rounded-[6px] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20 transition-all"
                      >
                        <option value="">{t('hyperAgents.selectProject', '— select a project —')}</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name || p.slug || p.id}</option>
                        ))}
                      </select>
                      <div className="text-[11px] text-[#737373] mt-1.5">
                        {projects.length === 0
                          ? t('hyperAgents.noProjects', 'No projects yet — the room will live org-wide.')
                          : t('hyperAgents.projectScopeHint', 'Room recalls + saves memories inside this project. Any org agent can join.')}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 text-[#737373]">
                      <Target size={12} /> {t('hyperAgents.goalLbl', 'Goal')}
                      <span className="normal-case font-normal tracking-normal text-[10px] text-[#a3a3a3]">· {t('hyperAgents.goalRequired', 'required')}</span>
                    </label>
                    <textarea
                      value={goal}
                      onChange={e => setGoal(e.target.value)}
                      placeholder={t('hyperAgents.goalPlaceholder', 'Example: Decide our Q2 go-to-market plan and keep every discussion grounded in profitable enterprise growth.')}
                      rows={4}
                      maxLength={2000}
                      className="w-full resize-none px-3.5 py-3 text-[14px] leading-relaxed bg-white border border-[#e3e0db] rounded-[8px] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20 transition-all"
                    />
                    <div className="mt-1.5 text-[11.5px] text-[#737373]">
                      {t('hyperAgents.goalHint', 'This becomes the standing objective the lead and agents optimize for in every turn.')}
                    </div>
                  </div>
                </div>
              )}

              {/* ───────── STEP 2 — Collaboration ───────── */}
              {step === 2 && (
                <div>
                  <h3 className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('hyperAgents.formatLbl', 'How should they collaborate?')}</h3>
                  <p className="text-[12px] text-[#737373] mt-0.5 mb-4">{t('hyperAgents.formatSub', 'Pick how the lead and agents run the room. Smart auto-selects the best format.')}</p>

                  {/* Hero: Smart (auto) */}
                  {(() => {
                    const fmt = ROOM_FORMATS[0];
                    const Icon = fmt.icon;
                    const on = template === fmt.key;
                    return (
                      <button
                        type="button"
                        onClick={() => setTemplate(fmt.key)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-[10px] border transition-colors ${
                          on ? 'border-[#117dff] bg-[#117dff]/[0.04]' : 'border-[#e3e0db] bg-white hover:border-[#d4d0ca]'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-[8px] flex items-center justify-center bg-[#117dff]/10 text-[#117dff] shrink-0">
                          <Icon size={17} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t(fmt.labelKey, fmt.label)}</span>
                            <span className="text-[9px] font-mono uppercase tracking-wider text-[#117dff] bg-[#117dff]/10 rounded-full px-1.5 py-0.5">{t('hyperAgents.recommended', 'Recommended')}</span>
                          </div>
                          <div className="text-[11px] text-[#737373] mt-0.5 leading-snug">{t(fmt.descKey, fmt.desc)}</div>
                        </div>
                        <span className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 transition-colors ${on ? 'border-[#117dff] bg-[#117dff]' : 'border-[#d4d0ca]'}`}>
                          {on && <Check size={11} className="text-white" />}
                        </span>
                      </button>
                    );
                  })()}

                  {/* Divider */}
                  <div className="flex items-center gap-2 my-3.5">
                    <div className="h-px flex-1 bg-[#e3e0db]" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('hyperAgents.orPickFormat', 'Or pick a specific format')}</span>
                    <div className="h-px flex-1 bg-[#e3e0db]" />
                  </div>

                  {/* Grid of the 9 specific formats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ROOM_FORMATS.slice(1).map((fmt) => {
                      const Icon = fmt.icon;
                      const on = template === fmt.key;
                      return (
                        <button
                          type="button"
                          key={fmt.key}
                          onClick={() => setTemplate(fmt.key)}
                          title={t(fmt.descKey, fmt.desc)}
                          className={`text-left p-3 rounded-[10px] border transition-colors ${
                            on ? 'border-[#117dff] bg-[#117dff]/[0.04]' : 'border-[#e3e0db] bg-white hover:border-[#d4d0ca]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
                              style={{ background: `${fmt.color}1a`, color: fmt.color }}>
                              <Icon size={13} />
                            </span>
                            {fmt.tier && (
                              <span className="text-[8px] font-mono uppercase tracking-wider rounded-full px-1.5 py-0.5"
                                style={{ background: `${fmt.color}14`, color: fmt.color }}>{t(`hyperAgents.tier${fmt.tier}`, fmt.tier)}</span>
                            )}
                          </div>
                          <div className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t(fmt.labelKey, fmt.label)}</div>
                          <div className="text-[10px] text-[#737373] mt-0.5 leading-snug line-clamp-2">{t(fmt.descKey, fmt.desc)}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected-format recap line */}
                  <div className="mt-3.5 flex items-center gap-1.5 text-[11.5px] text-[#737373] border-t border-[#eae7e1] pt-3">
                    <activeFormat.icon size={13} style={{ color: activeFormat.color }} />
                    <span className="font-medium text-[#0a0a0a]">{t(activeFormat.labelKey, activeFormat.label)}</span>
                    <span className="text-[#a3a3a3]">— {t(activeFormat.descKey, activeFormat.desc)}</span>
                  </div>
                </div>
              )}

              {/* ───────── STEP 3 — Agents ───────── */}
              {step === 3 && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('hyperAgents.addAgentsTitle', 'Add agents')}</h3>
                      <p className={`text-[12px] mt-0.5 ${picked.size === 0 ? 'text-[#a3a3a3]' : 'text-[#737373]'}`}>
                        {picked.size === 0 ? t('hyperAgents.pickAtLeastOne', 'pick at least 1') : t('hyperAgents.nSelected', '{{n}} selected', { n: picked.size })}
                      </p>
                    </div>
                    {allowedEmployees.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPicked(picked.size === allowedEmployees.length ? new Set() : new Set(allowedEmployees.map(e => e.id)))}
                        className="flex items-center gap-1 text-[11px] font-medium text-[#117dff] hover:text-[#0066e0]"
                      >
                        <CheckCheck size={12} /> {picked.size === allowedEmployees.length ? t('hyperAgents.clearAll', 'Clear') : t('hyperAgents.selectAll', 'Select all')}
                      </button>
                    )}
                  </div>

                  {allowedEmployees.length > 6 && (
                    <div className="relative mb-2.5">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
                      <input
                        value={agentQuery}
                        onChange={e => setAgentQuery(e.target.value)}
                        placeholder={t('hyperAgents.searchAgents', 'Search agents…')}
                        className="w-full h-10 pl-9 pr-3 text-[13px] bg-white border border-[#e3e0db] rounded-[8px] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20 transition-all"
                      />
                    </div>
                  )}

                  <div className="border border-[#e3e0db] rounded-[10px] divide-y divide-[#eae7e1] overflow-hidden">
                    {employees.length === 0 && (
                      <div className="px-3 py-12 text-center text-[12px] text-[#a3a3a3]">
                        {t('hyperAgents.noEmployeesYet', 'No employees yet.')}
                        <div className="mt-1 text-[11px]">{t('hyperAgents.seedFirst', 'Seed or create employees from the roster first.')}</div>
                      </div>
                    )}
                    {employees.length > 0 && filteredEmployees.length === 0 && (
                      <div className="px-3 py-12 text-center text-[12px] text-[#a3a3a3]">
                        {t('hyperAgents.noAgentMatch', 'No agents match your search.')}
                      </div>
                    )}
                    {filteredEmployees.map(emp => {
                      const lane = emp.hyper?.lane || emp.roleArchetype || 'Communicator';
                      const meta = LANE_META[lane] || LANE_META.Communicator;
                      const checked = picked.has(emp.id);
                      return (
                        <label key={emp.id} className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors ${checked ? 'bg-[#117dff]/[0.04]' : 'hover:bg-[#faf9f4]'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggle(emp.id)} className="w-4 h-4 accent-[#117dff]" />
                          <AgentAvatar agent={emp} size={36} shape="square" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-[#0a0a0a] truncate font-['Space_Grotesk']">{emp.name}</div>
                            <div className="text-[10px] font-mono mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded-full"
                              style={{ background: meta.bg, color: meta.color }}>{meta.label}</div>
                          </div>
                          {checked && <Check size={16} className="text-[#117dff] shrink-0" />}
                        </label>
                      );
                    })}
                  </div>

                  {/* Swarm-only Skeptic picker — agents chosen, so list is populated */}
                  {template === 'swarm' && (
                    <div className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50/60 px-3.5 py-3">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1.5 flex items-center gap-1">
                        <Shield size={12} /> {t('hyperAgents.permanentSkepticLbl', 'Permanent Skeptic (silent R1-R3, mandatory R4)')}
                      </label>
                      <select
                        value={skepticId}
                        onChange={(e) => setSkepticId(e.target.value)}
                        className="w-full h-10 px-3 text-[13px] bg-white border border-amber-200 rounded-[6px] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/20 transition-all"
                      >
                        <option value="">{t('hyperAgents.skepticAutoPick', '— auto-pick (first Skeptic-lane participant) —')}</option>
                        {employees
                          .filter((emp) => picked.has(emp.id))
                          .map((emp) => {
                            const lane = emp.hyper?.lane || emp.roleArchetype || 'Communicator';
                            return (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} ({lane}{lane.toLowerCase() === 'skeptic' ? ' ★' : ''})
                              </option>
                            );
                          })}
                      </select>
                      <div className="text-[11px] text-amber-700/70 mt-1.5">
                        {t('hyperAgents.skepticHint', 'Skeptic challenges consensus + proposes unorthodox angles. Pick a Skeptic-lane agent for best results.')}
                      </div>
                    </div>
                  )}

                  {err && (
                    <div className="mt-3 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">
                      <AlertTriangle size={12} className="inline mr-1" /> {err}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="px-6 py-3.5 border-t border-[#e3e0db] bg-white flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#737373]">
            {scope === 'project'
              ? <><FolderOpen size={12} className="text-[#117dff]" /> {selectedProject?.name || t('hyperAgents.scopeProject', 'Project')}</>
              : <><Globe size={12} className="text-[#117dff]" /> {t('hyperAgents.scopeOrg', 'Whole Org')}</>}
            <span className="text-[#d4d0ca]">·</span>
            <span className="tabular-nums">{picked.size} {t('hyperAgents.agentsWord', 'agents')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={step === 1 ? onClose : goBack}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#525252] hover:text-[#0a0a0a] px-3 py-2 rounded-[6px] hover:bg-[#faf9f4] transition-colors"
            >
              {step === 1 ? t('hyperAgents.cancel', 'Cancel') : <><ArrowLeft size={13} /> {t('hyperAgents.back', 'Back')}</>}
            </button>
            {step < 3 ? (
              <button
                type="submit"
                disabled={!stepValid}
                title={step === 1 && !step1Valid ? (!name.trim() ? t('hyperAgents.nameRequired', 'Name is required') : !goal.trim() ? t('hyperAgents.goalRequired', 'Goal is required') : t('hyperAgents.selectProject', '— select a project —')) : undefined}
                className="flex items-center gap-1.5 text-white text-[12px] font-semibold px-5 py-2 rounded-[6px] bg-[#117dff] hover:bg-[#0066e0] active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-[#117dff] transition-all font-['Space_Grotesk']"
              >
                {t('hyperAgents.next', 'Next')} <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canCreate}
                title={picked.size === 0 ? t('hyperAgents.pickAtLeastOne', 'pick at least 1') : undefined}
                className="flex items-center gap-1.5 text-white text-[12px] font-semibold px-5 py-2 rounded-[6px] bg-[#117dff] hover:bg-[#0066e0] active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-[#117dff] transition-all font-['Space_Grotesk']"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {t('hyperAgents.createRoom', 'Create room')}
              </button>
            )}
          </div>
        </footer>
      </motion.form>
    </motion.div>
  );
}

/* ─── Agent picker modal (add to room) ───────────────────────────────── */

/* ─── Room tools — room-level connector toggles (like the web tool) ──── */

function RoomToolsModal({ room, onClose }) {
  const { t } = useTranslation('dashboard');
  const [enabled, setEnabled] = useState(new Set());   // connector ids on for the room
  const [connected, setConnected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);
  const [connecting, setConnecting] = useState(null);  // connector id mid-OAuth

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [g, st] = await Promise.all([
          apiClient.getRoomConnectors(room.id).catch(() => ({ enabled_connectors: [] })),
          // Authoritative per-tenant connection status (same source the Connectors page
          // uses) — connected iff connection != null. listOAuthConnectors did NOT reflect
          // real connected state, so connectors connected on the Connectors page showed
          // as "not connected" here.
          apiClient.getConnectorConnectionStatus().catch(() => ({ connectors: [] })),
        ]);
        if (!alive) return;
        setEnabled(new Set(g?.enabled_connectors || []));
        const ids = new Set();
        let googleConnected = false;
        for (const c of (st?.connectors || [])) {
          if (!c || !c.connection) continue;          // connection==null → not connected
          const id = String(c.id || '').toLowerCase();
          if (!id) continue;
          ids.add(id);
          ids.add(id.replace(/_/g, '-'));
          ids.add(id.replace(/-/g, '_'));
          if (id === 'gmail' || id.startsWith('google')) googleConnected = true;
        }
        // Google products share ONE OAuth token (the bridge falls back across
        // gmail/docs/sheets/drive), so any connected Google connector means all are usable.
        if (googleConnected) {
          ['gmail', 'google_docs', 'google-docs', 'google_sheets', 'google-sheets',
           'google_drive', 'google-drive'].forEach(x => ids.add(x));
        }
        setConnected(ids);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [room.id]);

  function toggle(connId) {
    // Only connected connectors can be toggled on — an enabled-but-unconnected
    // connector would hand the agents tools that fail at the bridge (no token).
    if (!connected.has(connId) && !enabled.has(connId)) return;
    setSaved(false);
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(connId)) next.delete(connId); else next.add(connId);
      return next;
    });
  }

  // Connect a connector right here (same Nango popup as the Connectors page), so
  // the user doesn't have to leave the room. On success, mark it connected + turn
  // it on for the room.
  async function connect(c) {
    setConnecting(c.id); setErr(null);
    try {
      // Catalog keys are hyphenated (google-docs); room ids are underscored
      // (google_docs). Send the hyphen form so the backend's nango_provider lookup
      // resolves (else connect-session 404s).
      const baseURL = process.env.REACT_APP_NANGO_CONNECT_URL || 'https://api.hivemind.davinciai.eu:8043';
      const apiURL = process.env.REACT_APP_NANGO_HOST || 'https://api.hivemind.davinciai.eu:8042';
      // Open the popup synchronously in the click gesture (no await before it) so
      // the browser / Electron doesn't block it; token is set once fetched.
      const nango = new Nango();
      await new Promise((resolve, reject) => {
        const ui = nango.openConnectUI({
          baseURL, apiURL,
          onEvent: async (event) => {
            try {
              if (event?.type === 'connect') {
                const p = event.payload || {};
                const pKey = p.providerConfigKey || p.provider_config_key;
                const connectionId = p.connectionId || p.connection_id;
                if (!connectionId) throw new Error('Nango did not return a connection id');
                await apiClient.finalizeNangoConnection(pKey, connectionId);
                setConnected(prev => {
                  const n = new Set(prev);
                  n.add(c.id); n.add(c.id.replace(/_/g, '-')); n.add(c.id.replace(/-/g, '_'));
                  return n;
                });
                setEnabled(prev => new Set(prev).add(c.id));  // auto-on now that it's connected
                setSaved(false);
                resolve();
              } else if (event?.type === 'close') { resolve(); }
              else if (event?.type === 'error') { reject(new Error(event?.payload?.error || 'Nango connect error')); }
            } catch (e) { reject(e); }
          },
        });
        apiClient.getNangoConnectSession(c.id.replace(/_/g, '-'))
          .then(({ connect_session_token }) => {
            if (ui && typeof ui.setSessionToken === 'function') ui.setSessionToken(connect_session_token);
            else reject(new Error('Nango Connect UI unavailable'));
          })
          .catch((e) => { try { ui && ui.close && ui.close(); } catch { /* noop */ } reject(e); });
      });
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Connect failed');
    } finally {
      setConnecting(null);
    }
  }

  async function save() {
    setSaving(true); setErr(null);
    try {
      const resp = await apiClient.setRoomConnectors(room.id, [...enabled]);
      setEnabled(new Set(resp?.enabled_connectors || [...enabled]));
      setSaved(true);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#16181d]/45 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-none w-full max-w-[560px] max-h-[88vh] flex flex-col border border-[#e3e0db] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)]"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-[#e3e0db] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none grid place-items-center bg-[#117dff]/10 border border-[#117dff]/20 text-[#117dff]"><Boxes size={17} /></div>
            <div>
              <h2 className="text-[16px] font-bold text-[#0a0a0a] font-['Space_Grotesk'] tracking-tight">{t('hyperAgents.roomTools', 'Room tools')}</h2>
              <p className="text-[11px] text-[#a3a3a3]">{t('hyperAgents.roomToolsSub2', 'Toggle a connector on — every agent in the room can use it during the discussion (like the web tool).')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-none grid place-items-center border border-[#e3e0db] text-[#a3a3a3] hover:text-[#0a0a0a] hover:border-[#c4c9d2]"><X size={15} /></button>
        </header>

        <div className="overflow-y-auto flex-1 px-6 py-4 bg-[#faf9f4]">
          {loading && <div className="text-[12px] text-[#a3a3a3] py-10 text-center">{t('common.loading', 'Loading…')}</div>}
          {!loading && ROOM_CONNECTORS.map(c => {
            const on = enabled.has(c.id);
            const conn = connected.has(c.id);
            return (
              <button
                key={c.id} type="button"
                onClick={() => (conn ? toggle(c.id) : connect(c))}
                disabled={connecting === c.id}
                className={`w-full mb-2 flex items-center gap-3 px-3.5 py-3 rounded-none border text-left transition-colors disabled:opacity-60 ${on ? 'border-[#117dff] bg-[#117dff]/5' : conn ? 'border-[#e3e0db] bg-white hover:border-[#117dff]/40' : 'border-dashed border-[#e3e0db] bg-[#faf9f4] hover:border-[#117dff]/50'}`}
              >
                <span className="w-9 h-9 rounded-none grid place-items-center text-[13px] font-bold text-white shrink-0" style={{ background: c.color, opacity: conn ? 1 : 0.55 }}>{c.label[0]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{c.label}</span>
                    <span className="w-1.5 h-1.5 rounded-full" title={conn ? t('hyperAgents.connected', 'Connected') : t('hyperAgents.notConnected', 'Not connected')} style={{ background: conn ? '#22c55e' : '#cbd5e1' }} />
                  </div>
                  <div className="text-[10.5px] text-[#737373]">{c.desc}{!conn && <span className="text-[#c2410c]"> · {t('hyperAgents.connectToUse', 'connect it to use in the room')}</span>}</div>
                </div>
                {conn ? (
                  /* toggle switch — only for connected connectors */
                  <span className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${on ? 'bg-[#117dff]' : 'bg-[#d4d0ca]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                  </span>
                ) : (
                  /* not connected → connect inline (same Nango popup as Connectors) */
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-none border border-[#117dff]/50 text-[#117dff] text-[10px] font-mono uppercase tracking-wider">
                    {connecting === c.id ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    {connecting === c.id ? t('hyperAgents.connecting', 'Connecting…') : t('hyperAgents.connect', 'Connect')}
                  </span>
                )}
              </button>
            );
          })}
          {err && <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-none px-2 py-1.5 mt-1"><AlertTriangle size={11} className="inline mr-1" />{err}</div>}
        </div>

        <footer className="px-6 py-3.5 border-t border-[#e3e0db] flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-[#737373] font-mono">{enabled.size} {t('hyperAgents.enabledWord', 'enabled')} · <span className="text-[#22c55e]">●</span> {t('hyperAgents.connectedWord', 'connected')}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="text-[12px] font-medium text-[#525252] hover:text-[#0a0a0a] px-3 py-2 rounded-none hover:bg-[#faf9f4]">{t('hyperAgents.cancel', 'Cancel')}</button>
            <button
              type="button" onClick={save} disabled={saving}
              className="flex items-center gap-1.5 bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-50 text-white text-[12px] font-bold px-4 py-2 rounded-none font-['Space_Grotesk']"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Boxes size={13} />}
              {saving ? t('hyperAgents.saving', 'Saving') : saved ? t('hyperAgents.saved', 'Saved') : t('hyperAgents.saveTools', 'Save')}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}

// Marketplace popup — hire a NEW agent straight into the room. Two-level browse
// (field → profession, from the shared field-catalog), optional name, then Hire.
function HireAgentsModal({ roomName, onClose, onHire }) {
  const { t } = useTranslation('dashboard');
  const [field, setField] = useState(null);
  const [sel, setSel] = useState(null);       // selected profession
  const [name, setName] = useState('');
  const [hiring, setHiring] = useState(false);
  const [err, setErr] = useState(null);
  const professions = field ? professionsForField(field) : [];

  async function doHire() {
    if (!sel || hiring) return;
    setHiring(true); setErr(null);
    try {
      await onHire(sel, field, name);
    } catch (e) {
      setErr(e.response?.data?.error || e.message || 'Hire failed');
      setHiring(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white rounded-xl w-full max-w-[560px] shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-[#e3e0db] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#7c3aed]" />
            <h2 className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
              {t('hyperAgents.hireInto', 'Hire an agent into #{{name}}', { name: roomName || 'room' })}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={14} /></button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {!field ? (
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map(f => (
                <button key={f.field} onClick={() => setField(f.field)}
                  className="text-left rounded-lg border border-[#e3e0db] hover:border-[#7c3aed] hover:bg-[#faf9ff] px-3 py-2.5 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[17px]">{f.icon}</span>
                    <span className="text-[13px] font-semibold text-[#0a0a0a]">{f.field}</span>
                  </div>
                  <div className="text-[11px] text-[#737373] mt-0.5">{f.blurb}</div>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button onClick={() => { setField(null); setSel(null); }}
                className="mb-2 flex items-center gap-1 text-[11px] font-mono text-[#737373] hover:text-[#0a0a0a]">
                <ChevronDown size={12} className="rotate-90" /> {t('hyperAgents.allFields', 'All fields')}
              </button>
              <div className="space-y-1.5">
                {professions.map(p => (
                  <button key={p.title} onClick={() => setSel(p)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${sel?.title === p.title ? 'border-[#7c3aed] bg-[#faf9ff]' : 'border-[#e3e0db] hover:bg-[#faf9f4]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#0a0a0a]">{p.title}</span>
                      <span className="text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3]">{p.role_archetype}</span>
                    </div>
                    <div className="text-[11px] text-[#737373] mt-0.5">{p.blurb}</div>
                  </button>
                ))}
              </div>
              {sel && (
                <div className="mt-3">
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder={t('hyperAgents.agentNameOpt', 'Name (optional) — e.g. {{n}}', { n: NAME_SUGGESTIONS[0] })}
                    className="w-full h-10 px-3 text-[13px] bg-white border border-[#e3e0db] rounded-lg focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]/20"
                  />
                </div>
              )}
            </div>
          )}
          {err && <div className="mt-3 text-[11.5px] text-red-600">{err}</div>}
        </div>

        <footer className="px-5 py-3.5 border-t border-[#e3e0db] flex items-center justify-between">
          <span className="text-[11px] text-[#a3a3a3]">
            {sel ? t('hyperAgents.hireSelected', 'Hire {{title}} into the room', { title: sel.title }) : t('hyperAgents.pickProfession', 'Pick a field, then a profession')}
          </span>
          <button
            onClick={doHire} disabled={!sel || hiring}
            className="h-9 px-4 bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5"
          >
            {hiring ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {hiring ? t('hyperAgents.hiring', 'Hiring…') : t('hyperAgents.hire', 'Hire')}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}

// Congrats moment — a brief celebratory overlay when a new agent joins the room.
function HiredCongrats({ hire, onDone }) {
  const { t } = useTranslation('dashboard');
  useEffect(() => {
    const id = setTimeout(onDone, 3200);
    return () => clearTimeout(id);
  }, [onDone]);
  const CONFETTI = ['#7c3aed', '#117dff', '#3E8E5B', '#F4B14D', '#EE9A6B', '#B39BE6'];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onDone}
    >
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 36 }).map((_, i) => (
          <motion.span key={i}
            initial={{ y: -40, x: `${(i * 137) % 100}vw`, opacity: 1, rotate: 0 }}
            animate={{ y: '105vh', rotate: 360 + (i % 5) * 90, opacity: [1, 1, 0.8] }}
            transition={{ duration: 2.4 + (i % 6) * 0.25, ease: 'easeIn', delay: (i % 8) * 0.06 }}
            className="absolute top-0 w-2 h-3 rounded-[1px]"
            style={{ background: CONFETTI[i % CONFETTI.length] }}
          />
        ))}
      </div>
      <motion.div
        initial={{ scale: 0.8, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative z-10 bg-white rounded-2xl shadow-2xl px-8 py-7 text-center max-w-[360px]"
      >
        <div className="mx-auto mb-3 w-fit">
          <AgentAvatar agent={hire} size={64} shape="square" active />
        </div>
        <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#7c3aed]">{t('hyperAgents.hiredEyebrow', 'Hired an agent')}</div>
        <h3 className="mt-1.5 text-[20px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">{t('hyperAgents.congrats', 'Congratulations!')}</h3>
        <p className="mt-1.5 text-[13px] text-[#525252]">
          {t('hyperAgents.joinedRoom', '{{name}} — {{title}} — just joined your team.', { name: hire.name, title: hire.title })}
        </p>
      </motion.div>
    </motion.div>
  );
}

function AgentPickerModal({ currentIds, onClose, onPick }) {
  const { t } = useTranslation('dashboard');
  const [employees, setEmployees] = useState([]);
  const [picked, setPicked] = useState(new Set(currentIds || []));

  useEffect(() => {
    apiClient.listEmployees()
      .then(d => setEmployees(d?.employees || d || []))
      .catch(() => setEmployees([]));
  }, []);

  function toggle(id) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white rounded-xl w-full max-w-[480px] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-[#e3e0db] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#0a0a0a]">{t('hyperAgents.addAgentsToRoom', 'Add agents to room')}</h2>
          <button type="button" onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={14} /></button>
        </header>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-[#f3f1ec]">
          {employees.map(emp => {
            const lane = emp.hyper?.lane || emp.roleArchetype || 'Communicator';
            const meta = LANE_META[lane] || LANE_META.Communicator;
            return (
              <label key={emp.id} className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-[#faf9f4]">
                <input type="checkbox" checked={picked.has(emp.id)} onChange={() => toggle(emp.id)} className="accent-violet-500" />
                <AgentAvatar agent={emp} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[#0a0a0a] truncate">{emp.name}</div>
                  <div className="text-[10px] font-mono" style={{ color: meta.color }}>{meta.label}</div>
                </div>
              </label>
            );
          })}
        </div>
        <footer className="px-5 py-3 border-t border-[#e3e0db] bg-[#faf9f4] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="text-[12px] text-[#525252] hover:text-[#0a0a0a] px-3 py-1.5">
            {t('hyperAgents.cancel', 'Cancel')}
          </button>
          <button
            onClick={() => onPick(Array.from(picked))}
            className="bg-[#0a0a0a] hover:bg-[#262626] text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg"
          >
            {t('hyperAgents.save', 'Save')}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
