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
  ArrowLeft, ArrowRight, Target, Eye, Pencil,
  User, Gauge, CreditCard, Settings, Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';
import DigitalEmployees from './DigitalEmployees';
import { HyperOnboarding, CompanyDashboard } from '../hyperagents';
import { PageWalkthrough, HYPER_AGENTS_STEPS } from '../shared/Walkthrough';
import { BRAND_LOGOS } from '../shared/connectors-catalog';
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

function relTime(ts) {
  if (!ts) return '';
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return '';
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 45) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}

/* ─── Lane → glyph + color ──────────────────────────────────────────── */

const LANE_META = {
  Strategist:   { icon: Crown,      color: '#a855f7', bg: 'rgba(168,85,247,0.10)', label: 'Strategist' },
  Builder:      { icon: Network,    color: '#117dff', bg: 'rgba(17,125,255,0.10)', label: 'Builder' },
  Skeptic:      { icon: Shield,     color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Skeptic' },
  Researcher:   { icon: Lightbulb,  color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Researcher' },
  Communicator: { icon: MessageCircle, color: '#ec4899', bg: 'rgba(236,72,153,0.10)', label: 'Communicator' },
};

const AGREEMENT_META = {
  agree:     { emoji: '👍', label: 'agree',     color: '#117dff', bg: 'rgba(17,125,255,0.08)' },
  extend:    { emoji: '➕', label: 'extend',    color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  challenge: { emoji: '⚠️', label: 'challenge', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
};

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
  // viewMode: 'hero' (company dashboard — /employees/mycompany, the landing)
  // | 'thread' (room chat — /employees/rooms/:id) | 'roster' (/employees/agents).
  // The URL is the source of truth on mount/deep-link; goMode() keeps it in
  // sync on every in-app switch so each feature has its own address.
  const _parsePath = () => {
    try {
      const p = window.location.pathname;
      const m = p.match(/\/employees\/rooms\/([0-9a-f-]{36})/i);
      if (m) return { mode: 'thread', roomId: m[1] };
      if (/\/employees\/agents/.test(p)) return { mode: 'roster', roomId: null };
      return { mode: 'hero', roomId: null };
    } catch { return { mode: 'hero', roomId: null }; }
  };
  const _init = _parsePath();
  const [activeRoomId, setActiveRoomId] = useState(_init.roomId);
  const [viewMode, setViewMode] = useState(_init.mode);
  const goMode = useCallback((mode, roomId) => {
    setViewMode(mode);
    if (roomId !== undefined) setActiveRoomId(roomId);
    const base = '/hivemind/app/employees';
    const url = mode === 'hero' ? `${base}/mycompany`
      : mode === 'roster' ? `${base}/agents`
        : (roomId ? `${base}/rooms/${roomId}` : base);
    navigate(url, { replace: true });
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
      <aside className="w-[240px] min-w-[240px] border-r border-[#e3e0db] bg-[#faf9f4] flex flex-col shrink-0">
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
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-1">
          <div className="px-3 pt-2 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-[#a3a3a3]">
            {t('hyperAgents.rooms', 'Rooms')}
          </div>
          {liveRooms.map(r => (
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
          />
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
          {participants.slice(0, 4).map(p => {
            const lane = p.lane || 'Communicator';
            return (
              <span
                key={p.id}
                title={`${p.name} · ${lane}`}
                className="px-1 rounded"
                style={{ background: LANE_META[lane]?.bg, color: LANE_META[lane]?.color }}
              >
                {p.name?.[0] || '?'}
              </span>
            );
          })}
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

/* ─── Room thread (middle + right) ───────────────────────────────────── */

function hyperEventKey(event, index) {
  if (!event) return `empty:${index}`;
  if (event.id) return `id:${event.id}`;
  return [
    event.t || 'line',
    event.ts || '',
    event.agent || event.reviewer || event.voter || '',
    event.kind || event.phase || event.round || '',
    event.id || event.target_hypothesis_id || '',
  ].join('|') || `idx:${index}`;
}

function mergeHyperEvents(base, overlay) {
  const merged = Array.isArray(base) ? [...base] : [];
  const incoming = Array.isArray(overlay) ? overlay : [];
  if (!incoming.length) return merged;
  const seen = new Set(merged.map(hyperEventKey));
  incoming.forEach((event, index) => {
    const key = hyperEventKey(event, index);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(event);
    }
  });
  return merged;
}

function RoomThread({ roomId, onArchived }) {
  const { t, i18n } = useTranslation('dashboard');
  const [room, setRoom] = useState(null);
  const [turns, setTurns] = useState([]);
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
  const [showConnectors, setShowConnectors] = useState(false);
  const [showEvo, setShowEvo] = useState(false);
  // Live per-turn self-evolve signal: {added, employees:[{slug,name,added,total}]} → transient chip.
  const [evoFlash, setEvoFlash] = useState(null);
  const evoFlashTimer = useRef(null);
  const [showJournal, setShowJournal] = useState(false);
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
  const [projects, setProjects] = useState([]);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [savingScope, setSavingScope] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const threadEndRef = useRef(null);
  const scrollRef = useRef(null);
  // Auto-scroll only when the user is already pinned to the bottom — so a live turn's rapid SSE
  // events don't yank them back down while they scroll up to read. Updated on manual scroll.
  const pinnedRef = useRef(true);
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
  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await apiClient.getHyperRoom(roomId);
      setRoom(resp.room);
      setTurns(resp.turns || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll on new content — ONLY when pinned to the bottom, and INSTANTLY (no 'smooth', which
  // fights itself when live SSE events fire in rapid succession). Scrolls just the thread container,
  // never the page. This removes the jank + the scroll-up-yank-back glitch.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [turns, liveLines]);

  // SSE subscription while a turn is live
  useEffect(() => {
    if (!activeTurnId) return;
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
        setLiveLines(prev => mergeLiveEvents(prev, [{ ...data, t: e.type === 'message' ? (data.t || 'line') : e.type }]));
        if (e.type === 'seal' || data.t === 'seal') {
          es.close();
          setActiveTurnId(null);
          setSubmitting(false);
          // Refetch the sealed turn for cached DB read
          load();
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
      // Self-evolving employees: per-turn playbook learning signal.
      'self_evolve',
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
          setActiveTurnId(null);
          setSubmitting(false);
          load();
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
    try {
      if (!window.localStorage.getItem(`hm-room-setup-${room.id}`)) {
        setSetupStep(0);
        setShowSetup(true);
      }
    } catch { /* noop */ }
  }, [room?.id, room?.archived_at]);

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

  async function handleSubmit(e) {
    e?.preventDefault?.();
    const base = draft.trim();
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

  // Total LLM usage across the room = sum of every sealed turn's cost_tokens
  // (+ the live turn's seal if present). Surfaced top-right of the navbar.
  const sealedTokens = turns.reduce((sum, trn) => {
    const seal = (trn.lines || []).find(l => l && l.t === 'seal');
    return sum + (Number(seal?.cost_tokens) || 0);
  }, 0);
  const liveSeal = liveLines.find(l => l && l.t === 'seal');
  const totalTokens = sealedTokens + (Number(liveSeal?.cost_tokens) || 0);
  const fmtTokens = totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : `${totalTokens}`;

  return (
    <div className="flex flex-1 min-w-0 min-h-0 h-full">
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
            {!archived && (
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

        {/* Thread */}
        <div ref={scrollRef} onScroll={onThreadScroll} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          {turns.length === 0 && (
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
              onFlybyDecision={(decision, spec) => handleFlybyDecision(turn, decision, spec)}
              flybyBusy={flybyBusy}
              onApprove={(approvalId, decision) => handleApprove(turn, approvalId, decision)}
              approveBusy={approveBusy}
              roomId={roomId}
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
                          <span className="h-5 w-5 grid place-items-center rounded-full bg-violet-100 text-violet-700 text-[9px] font-semibold shrink-0">
                            {(p.name || p.slug || '?').slice(0, 1).toUpperCase()}
                          </span>
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
      </aside>

      <AnimatePresence>
        {showPicker && (
          <AgentPickerModal
            currentIds={room.participantIds || room.participant_ids || []}
            onClose={() => setShowPicker(false)}
            onPick={(ids) => { setShowPicker(false); handleParticipantsChange(ids); }}
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
      {showSetup && room && (
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
function fmtTs(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ''; }
}

function eventDisplayTs(event) {
  return event?.received_ts || event?.ts || null;
}

function getPersonaContract(agent) {
  return agent?.hyper?.persona_contract || agent?.persona_contract || null;
}

function contractSnippet(contract) {
  if (!contract) return '';
  const parts = [];
  if (contract.stance) parts.push(contract.stance);
  if (contract.context_home) parts.push(`home:${contract.context_home}`);
  return parts.join(' · ');
}

// Immediate "it's working" feedback shown while a live turn has no events yet.
// Cycles through the real startup phases so the room never looks frozen.
function SwarmSpinningUp() {
  const { t } = useTranslation('dashboard');
  const stages = [
    t('hyperAgents.spin1', 'Spinning up the room…'),
    t('hyperAgents.spin2', 'Spawning the agents…'),
    t('hyperAgents.spin3', 'Assigning lead + reactors…'),
    t('hyperAgents.spin4', 'Pulling relevant memories…'),
    t('hyperAgents.spin5', 'Agents thinking…'),
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => Math.min(p + 1, stages.length - 1)), 1200);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex items-center gap-2 pl-2 py-2 text-[12px] text-[#737373]">
      <Loader2 size={13} className="animate-spin text-violet-500 shrink-0" />
      <span className="font-mono">{stages[i]}</span>
      <span className="flex items-center gap-0.5 ml-1">
        {stages.map((_, ix) => (
          <span key={ix} className={`w-1 h-1 rounded-full transition-colors ${ix <= i ? 'bg-violet-400' : 'bg-[#d4d0ca]'}`} />
        ))}
      </span>
    </div>
  );
}

// ─── Population-sim dialogue theater ────────────────────────────────────────
// The sim's 10-100 synthetic voices used to hide behind a flat "open" button.
// This renders them as a LIVE dialogue replay: posts land one-by-one in a feed,
// the sentiment bar fills and the voice counter ticks as each lands — the crowd
// visibly "happens" in the room. Real data only (the posts the backend simulated);
// the animation is a replay of that real burst. Skippable; settles into a summary.
function SimTheater({ simReport, onOpenFull }) {
  const { t } = useTranslation('dashboard');
  const posts = useMemo(() => (Array.isArray(simReport?.posts) ? simReport.posts : []), [simReport]);
  const [shown, setShown] = useState(0);          // how many posts have landed
  const [playing, setPlaying] = useState(true);
  const feedRef = useRef(null);
  const done = shown >= posts.length;
  // Stagger so the whole replay fits ~18s regardless of crowd size.
  const stepMs = Math.max(120, Math.min(450, Math.floor(18000 / Math.max(1, posts.length))));

  useEffect(() => {
    if (!playing || done || !posts.length) return undefined;
    const id = setInterval(() => setShown(s => Math.min(posts.length, s + 1)), stepMs);
    return () => clearInterval(id);
  }, [playing, done, posts.length, stepMs]);
  useEffect(() => {   // follow the feed as voices land
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [shown]);

  if (!posts.length) return null;
  const visible = posts.slice(0, shown);
  const S = { positive: 0, neutral: 0, negative: 0 };
  visible.forEach(p => { const s = (p.sentiment === 'positive' || p.sentiment === 'negative') ? p.sentiment : 'neutral'; S[s]++; });
  const total = Math.max(1, visible.length);
  const ring = s => s === 'positive' ? 'ring-green-400 bg-green-50 text-green-700'
    : s === 'negative' ? 'ring-red-400 bg-red-50 text-red-700' : 'ring-[#d4d0ca] bg-[#faf9f4] text-[#737373]';

  return (
    <div className="rounded-xl border border-violet-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3.5 py-2 border-b border-violet-100 bg-violet-50/60">
        <span className="relative flex h-2.5 w-2.5">
          {!done && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${done ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </span>
        <span className="text-[11px] font-semibold text-violet-800 uppercase tracking-wider font-mono">
          {done ? t('hyperAgents.simDone', 'Population simulation') : t('hyperAgents.simLive', 'Population simulation — replaying')}
        </span>
        <span className="text-[10px] text-violet-500 font-mono tabular-nums">
          {shown}/{posts.length} {t('hyperAgents.simVoices', 'voices')}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {!done && (
            <button type="button" onClick={() => setPlaying(p => !p)}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-violet-600 hover:bg-violet-100">
              {playing ? t('hyperAgents.simPause', 'pause') : t('hyperAgents.simPlay', 'play')}
            </button>
          )}
          {!done && (
            <button type="button" onClick={() => setShown(posts.length)}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-violet-600 hover:bg-violet-100">
              {t('hyperAgents.simSkip', 'skip ▸')}
            </button>
          )}
          <button type="button" onClick={onOpenFull}
            className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-violet-600 hover:bg-violet-100">
            {t('hyperAgents.simFull', 'full report')}
          </button>
        </div>
      </div>
      {/* live sentiment bar — fills as voices land */}
      <div className="px-3.5 pt-2">
        <div className="flex h-2 rounded overflow-hidden border border-[#ece9e3]">
          <div style={{ width: `${(S.positive / total) * 100}%` }} className="bg-green-500 transition-all duration-300" />
          <div style={{ width: `${(S.neutral / total) * 100}%` }} className="bg-[#d4d0ca] transition-all duration-300" />
          <div style={{ width: `${(S.negative / total) * 100}%` }} className="bg-red-500 transition-all duration-300" />
        </div>
        <div className="flex gap-3 mt-1 text-[9px] text-[#737373] font-mono tabular-nums">
          <span>▲ {S.positive}</span><span>— {S.neutral}</span><span>▼ {S.negative}</span>
        </div>
      </div>
      {/* the dialogue feed */}
      <div ref={feedRef} className="max-h-64 overflow-y-auto px-3.5 py-2 space-y-1.5 scroll-smooth">
        {visible.map((p, i) => (
          <div key={i} className="flex items-start gap-2" style={{ animation: 'simpop .25s ease-out' }}>
            <span className={`h-5 w-5 grid place-items-center rounded-full ring-1 text-[9px] font-semibold shrink-0 mt-0.5 ${ring(p.sentiment)}`}>
              {(p.name || '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-[#0a0a0a]">{p.name}</span>
              <span className="text-[9px] text-[#a3a3a3] ml-1.5">{p.role}</span>
              <div className="text-[11px] text-[#525252] leading-snug">{p.text}</div>
            </div>
          </div>
        ))}
        {!done && playing && (
          <div className="text-[10px] text-violet-400 font-mono animate-pulse pl-7">…</div>
        )}
      </div>
      <style>{'@keyframes simpop { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: none;} }'}</style>
    </div>
  );
}

// Claude-style tool-activity timeline. Reshapes the turn's gather/tool/connector/web
// events into a collapsible vertical trail ("Used N tools" → step rows → Done) so the
// user sees exactly what fired after their message (recall, connector reads, web search).
// Pure render over events that already stream in — no new data, calm HIVEMIND-light theme.
function ToolTimeline({ gathers, webIntels, sealed }) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(true);

  const recalls = (gathers || []).filter(g => !g.tool);
  const connectorReads = (gathers || []).filter(g => g.tool);
  const steps = [];
  if (recalls.length) {
    const facts = recalls.reduce((n, g) => n + (g.memory_hits || 0), 0);
    steps.push({
      key: 'recall', ts: recalls[0].ts || 0, kind: 'recall',
      label: t('hyperAgents.tlRecall', 'Recalled the company brain'),
      chip: facts > 0 ? t('hyperAgents.tlFacts', '{{n}} facts', { n: facts })
        : (recalls.length > 1 ? `${recalls.length}×` : null),
    });
  }
  connectorReads.forEach((g, i) => {
    steps.push({
      key: `conn-${i}`, ts: g.ts || 0, kind: 'connector',
      connector: (g.sources || [])[0] || 'connector', label: (g.sources || [])[0] || 'connector',
      mono: g.tool, detail: g.query || null,
    });
  });
  (webIntels || []).forEach((w, i) => {
    steps.push({
      key: `web-${i}`, ts: w.ts || 0, kind: 'web',
      label: t('hyperAgents.webSearch', 'Web search'), detail: w.query || null,
      sources: (w.sources || []).slice(0, 4),
    });
  });
  steps.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (!steps.length) return null;

  const iconFor = (s) => {
    if (s.kind === 'recall') return <Brain size={12} className="text-[#117dff]" />;
    if (s.kind === 'web') return <Globe size={12} className="text-[#117dff]" />;
    const logo = BRAND_LOGOS[s.connector] || BRAND_LOGOS[String(s.connector || '').replace(/_/g, '-')]
      || BRAND_LOGOS[String(s.connector || '').replace(/-/g, '_')];
    if (logo) return <img src={logo} alt="" className="w-3 h-3" onError={e => { e.currentTarget.style.display = 'none'; }} />;
    return <Zap size={12} className="text-[#117dff]" />;
  };

  return (
    <div className="rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 w-full text-left">
        {sealed
          ? <CheckCheck size={13} className="text-emerald-600 shrink-0" />
          : <Loader2 size={13} className="text-[#117dff] animate-spin shrink-0" />}
        <span className="text-[11px] font-medium text-[#525252]">
          {sealed
            ? t('hyperAgents.tlUsedTools', 'Used {{n}} tools', { n: steps.length })
            : t('hyperAgents.tlWorking', 'Working… {{n}} tools', { n: steps.length })}
        </span>
        <ChevronDown size={13} className={`ml-auto text-[#a3a3a3] transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mt-2">
          {steps.map((s, i) => (
            <div key={s.key} className="relative flex gap-2.5 pl-5 pb-2">
              {i < steps.length - 1 && <span className="absolute left-[5.5px] top-3.5 bottom-0 w-px bg-[#e3e0db]" />}
              <span className="absolute left-0 top-0.5 flex h-3 w-3 items-center justify-center">{iconFor(s)}</span>
              <div className="min-w-0 text-[11px] text-[#525252] leading-snug">
                <span className="font-medium">{s.label}</span>
                {s.mono && <span className="font-mono text-[10px] text-[#117dff] ml-1">· {s.mono}</span>}
                {s.chip && <span className="ml-1.5 rounded-full bg-white border border-[#e3e0db] px-1.5 py-0.5 text-[9px] text-[#737373]">{s.chip}</span>}
                {s.detail && <span className="text-[#737373]"> · “{s.detail}”</span>}
                {Array.isArray(s.sources) && s.sources.length > 0 && (
                  <span className="flex flex-wrap gap-1 mt-0.5">
                    {s.sources.map((src, j) => (
                      <a key={j} href={src.url} target="_blank" rel="noopener noreferrer"
                         className="rounded-[6px] bg-white border border-[#e3e0db] px-1.5 py-0.5 text-[9px] text-[#117dff] hover:bg-[#f3f1ec] truncate max-w-[180px]"
                         title={src.url}>{src.title || src.url}</a>
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="relative flex items-center gap-2.5 pl-5">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 flex h-3 w-3 items-center justify-center">
              {sealed ? <CheckCheck size={12} className="text-emerald-600" /> : <Loader2 size={11} className="text-[#117dff] animate-spin" />}
            </span>
            <span className="text-[11px] font-medium text-[#0a0a0a]">
              {sealed ? t('hyperAgents.tlDone', 'Done') : t('hyperAgents.tlRunning', 'Running…')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TurnView({ turn, participants, liveLines, archived, busy, onClear, onRerun, onFlybyDecision, flybyBusy, onApprove, approveBusy, roomId }) {
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

  // Phase 1-6 — lead plan, recon/verify verdict, write-approval cards, and the
  // goalkeeper's re-plan rounds. A turn may re-plan (one `plan` per round, all
  // under the same turn_id), so take the LATEST plan/verdict and group rounds.
  const planLine = [...lines].reverse().find(l => l.t === 'plan');
  // Every tool call the room made, in order — recall sweeps + live web searches —
  // so the simulation shows its working (not just the final answer).
  const gathers = lines.filter(l => l.t === 'gather');
  const webIntels = lines.filter(l => l.t === 'web_intel');
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
      <ToolTimeline gathers={gathers} webIntels={webIntels} sealed={!!seal} />

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

      {synthLine && (() => {
        // Report-card chrome around the deliverable: WHO wrote it (lead + the team),
        // whether the recon pass VERIFIED it as grounded, and the turn's true cost —
        // so the final card reads like a signed-off report, not an anonymous blob.
        const _leadP = participants[synthLine.agent] || {};
        const _crew = Object.values(participants || {}).filter(p => (p.slug || p.id) !== synthLine.agent);
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
            <div className="px-4 py-3 text-[13px] text-[#0a0a0a] leading-relaxed break-words space-y-1">
              {renderMarkdownLite(synthLine.content)}
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 border-t border-violet-100 bg-[#faf9f4] flex-wrap">
              <span className="h-5 w-5 grid place-items-center rounded-full bg-violet-100 text-violet-700 text-[9px] font-semibold">
                {(_leadP.name || synthLine.agent || '?').slice(0, 1).toUpperCase()}
              </span>
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

      {finalReport && (
        <FinalReportCard
          report={finalReport}
          webSources={webIntel?.sources || []}
          onOpenMemory={setEvidenceMemoryId}
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
            <span key={i} className="flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> {typingLine.note || t('hyperAgents.agentTyping', '{{agent}} typing…', { agent: typingLine.agent })}
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

function FinalReportCard({ report, webSources = [], onOpenMemory }) {
  const { t } = useTranslation('dashboard');
  if (!report?.content) return null;
  const verdict = String(report.verdict || report.status || '').toUpperCase();
  const goalProgress = report.goal_progress && typeof report.goal_progress === 'object' ? report.goal_progress : null;
  const evidence = Array.isArray(report.evidence) ? report.evidence.filter(e => e?.id) : [];
  const sources = [
    ...(Array.isArray(report.sources) ? report.sources : []),
    ...(Array.isArray(webSources) ? webSources : []),
  ].filter((src, index, arr) => {
    const key = src?.url || src?.title || index;
    return key && arr.findIndex(s => (s?.url || s?.title) === key) === index;
  }).slice(0, 8);
  const tone = verdict.includes('AGREED') || verdict.includes('RESOLVED') || verdict.includes('COMPLETE')
    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700'
    : verdict.includes('CONDITIONAL') || verdict.includes('ESCALATED')
      ? 'border-amber-200 bg-amber-50/50 text-amber-700'
      : 'border-[#e3e0db] bg-white text-[#525252]';
  return (
    <div className="mx-2 my-3 rounded-lg border border-[#d7d2ca] bg-white shadow-sm overflow-hidden">
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${tone}`}>
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardCheck size={14} className="shrink-0" />
          <span className="text-[10px] font-mono uppercase tracking-wider truncate">
            {t('hyperAgents.finalReport', 'Final report')}
          </span>
        </div>
        {verdict && (
          <span className="text-[9px] font-mono uppercase tracking-wider shrink-0">
            {verdict}{report.weighted_score != null ? ` · ${report.weighted_score}` : ''}
          </span>
        )}
      </div>
      <div className="px-3 py-3 text-[12px] leading-relaxed text-[#0a0a0a]">
        {goalProgress && (
          <div className="mb-3 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#117dff]">
                  {t('hyperAgents.goalProgress', 'Goal progress')}
                </div>
                <div className="mt-0.5 text-[12px] font-semibold text-[#0f172a] truncate">
                  {goalProgress.label || goalProgress.status || t('hyperAgents.goalProgressStatus', 'Progress')}
                </div>
              </div>
              {goalProgress.score != null && (
                <div className="shrink-0 text-[18px] font-bold text-[#117dff] font-['Space_Grotesk']">
                  {goalProgress.score}<span className="text-[10px] text-[#64748b]">/100</span>
                </div>
              )}
            </div>
            {goalProgress.summary && (
              <div className="mt-1.5 text-[10.5px] text-[#475569] leading-snug">
                {goalProgress.summary}
              </div>
            )}
          </div>
        )}
        {renderMarkdownLite(report.content)}
        {(evidence.length > 0 || sources.length > 0) && (
          <div className="mt-3 space-y-3 border-t border-[#e3e0db] pt-3">
            {evidence.length > 0 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#737373] mb-1.5">
                  {t('hyperAgents.reportMemories', 'Memory evidence')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {evidence.map((mem) => (
                    <button
                      key={mem.id}
                      type="button"
                      onClick={() => onOpenMemory?.(mem.id)}
                      className="max-w-full inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 text-[10.5px] font-medium transition-colors"
                      title={mem.snippet || mem.title || t('hyperAgents.openMemoryEvidence', 'Open memory evidence')}
                    >
                      <Brain size={11} className="shrink-0" />
                      <span className="truncate max-w-[220px]">{mem.title || t('hyperAgents.memoryEvidence', 'Memory evidence')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sources.length > 0 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#737373] mb-1.5">
                  {t('hyperAgents.reportSources', 'Web sources')}
                </div>
                <div className="grid gap-1.5">
                  {sources.map((src, i) => {
                    const href = src.url || '';
                    const body = (
                      <>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Globe size={11} className="text-[#117dff] shrink-0" />
                          <span className="truncate font-semibold">{src.title || href || t('hyperAgents.webSource', 'Web source')}</span>
                          {href && <ExternalLink size={10} className="text-[#a3a3a3] shrink-0" />}
                        </div>
                        {src.snippet && <div className="mt-0.5 text-[10px] text-[#737373] line-clamp-2">{src.snippet}</div>}
                      </>
                    );
                    return href ? (
                      <a
                        key={`${href}-${i}`}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-2.5 py-2 text-[11px] text-[#0f172a] hover:border-[#117dff]/40 transition-colors"
                      >
                        {body}
                      </a>
                    ) : (
                      <div key={`source-${i}`} className="rounded-lg border border-[#e3e0db] bg-[#faf9f4] px-2.5 py-2 text-[11px] text-[#0f172a]">
                        {body}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Mermaid diagram (lazy, sandboxed, fail-safe) ─────────────────────
 * Renders a ```mermaid block in the synthesis as a real diagram. mermaid is
 * lazy-imported (own chunk — no main-bundle bloat) and rendered with
 * securityLevel:'strict' (mermaid sanitizes its own SVG, so the
 * dangerouslySetInnerHTML is safe). ANY parse/render failure falls back to the
 * raw code in a <pre> — a malformed diagram never breaks the report.
 */
// Repair the common invalid-mermaid the LLM emits so a near-valid diagram still renders.
// gantt is the frequent offender: `parallel <id>` is not a mermaid keyword, and a task line
// needs a SPACE before its `:id,` metadata (`check:d3` → `check :d3`). Conservative — only
// touches task lines, leaves valid diagrams unchanged.
function sanitizeMermaid(code) {
  let s = String(code || '').trim();
  const lines = s.split('\n');
  if (!/^\s*gantt\b/.test(lines[0] || '')) return s;
  return lines.map((ln) => {
    if (/^\s*(gantt|dateFormat|title|section|excludes|axisFormat|todayMarker|tickInterval|weekday)\b/.test(ln)) return ln;
    let l = ln;
    l = l.replace(/([^\s:]):([A-Za-z][\w-]*\s*,)/, '$1 :$2');   // ensure space before metadata colon
    l = l.replace(/\bparallel\s+([A-Za-z][\w-]*)/g, 'after $1'); // `parallel X` (invalid) → `after X`
    return l;
  }).join('\n');
}

function MermaidDiagram({ code }) {
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'inherit' });
      const raw = String(code || '').trim();
      // Try the raw diagram first, then a sanitized repair — only fall back to <pre> if both fail.
      for (const candidate of [raw, sanitizeMermaid(raw)]) {
        const id = 'mmd-' + Math.random().toString(36).slice(2, 10);
        try {
          const { svg: out } = await mermaid.render(id, candidate);
          if (alive) setSvg(out);
          return;
        } catch (e) {
          // mermaid v10 leaves a temp/error node ("Syntax error in text") in the DOM on failure — purge it.
          [id, 'd' + id].forEach((x) => document.getElementById(x)?.remove());
        }
      }
      if (alive) setFailed(true);
    })();
    return () => { alive = false; };
  }, [code]);
  if (failed) {
    return (
      <pre className="my-2 overflow-x-auto rounded-md border border-[#e3e0db] bg-[#faf9f4] p-2 text-[11px] font-mono text-[#525252] whitespace-pre">
        {code}
      </pre>
    );
  }
  if (!svg) {
    return <div className="my-2 text-[11px] text-[#a3a3a3] italic">rendering diagram…</div>;
  }
  // eslint-disable-next-line react/no-danger -- svg sanitized by mermaid securityLevel:'strict'
  return <div className="mermaid-diagram my-2 overflow-x-auto rounded-md border border-[#e3e0db] bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/* ─── Mermaid → PNG (base64, no data: prefix) for email attachments ─────
 * Client-side render (same mermaid the room uses) → SVG → canvas → PNG.
 * Returns null on any failure — a diagram must never block a send. */
async function mermaidPngB64(code) {
  try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'inherit' });
    let svg = null;
    for (const candidate of [String(code || '').trim(), sanitizeMermaid(String(code || '').trim())]) {
      const id = 'mmdx-' + Math.random().toString(36).slice(2, 10);
      try { ({ svg } = await mermaid.render(id, candidate)); break; }
      catch { [id, 'd' + id].forEach((x) => document.getElementById(x)?.remove()); }
    }
    if (!svg) return null;
    const vb = svg.match(/viewBox="([\d.\s-]+)"/);
    const p = vb ? vb[1].trim().split(/\s+/).map(Number) : [];
    const w0 = p[2] || 900; const h0 = p[3] || 500;
    const w = Math.min(1600, Math.max(480, Math.ceil(w0)));
    const h = Math.max(120, Math.ceil(h0 * (w / w0)));
    const img = new Image();
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = w * 2; canvas.height = h * 2;
    const c2 = canvas.getContext('2d');
    c2.fillStyle = '#ffffff'; c2.fillRect(0, 0, canvas.width, canvas.height);
    c2.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1] || null;
  } catch { return null; }
}

/* ─── In-app artifact preview popup (hivemind-popup style: sharp corners) ───
 * Previews ANY textual artifact (email draft / doc / notion body) rendered as
 * the room renders it — without redirecting to Google. Email drafts get a
 * pencil edit toggle + a one-click Send (mermaid blocks are client-rendered
 * to PNG and attached; the send itself is the human approval). */
function ArtifactPreviewModal({ preview, roomId, onClose }) {
  const { t } = useTranslation('dashboard');
  const isEmail = preview?.kind === 'email';
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(preview?.body_md || '');
  const [to, setTo] = useState(preview?.to || '');
  const [subject, setSubject] = useState(preview?.subject || preview?.title || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  if (!preview) return null;
  const logo = BRAND_LOGOS[preview.connector] || BRAND_LOGOS.gmail;
  const canSend = isEmail && to.trim() && subject.trim() && body.trim() && !sending && !sent;

  const doSend = async () => {
    if (!canSend) return;
    setSending(true); setError('');
    try {
      // Client-render every mermaid block → PNG attachment (bounded 6, same as backend).
      const codes = [...body.matchAll(/```mermaid\n?([\s\S]*?)```/g)].map((m) => m[1]).slice(0, 6);
      const attachments = [];
      for (let i = 0; i < codes.length; i++) {
        const b64 = await mermaidPngB64(codes[i]);
        if (b64) attachments.push({ filename: `diagram-${i + 1}.png`, mime: 'image/png', data_b64: b64 });
      }
      await apiClient.sendHyperRoomEmail(roomId, {
        to: to.trim(), subject: subject.trim(), bodyMd: body,
        attachments, approvalId: preview.approval_id || null,
      });
      setSent(true);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'send failed');
    } finally { setSending(false); }
  };

  return (
    <AnimatePresence>
      <motion.div key="apm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#1a1814]/45 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="bg-white rounded-none w-full max-w-[880px] max-h-[88vh] flex flex-col border border-[#e3e0db] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          {/* header */}
          <div className="px-6 py-4 flex items-center gap-3 border-b border-[#e3e0db]">
            <div className="w-10 h-10 rounded-none flex items-center justify-center bg-[#117dff]/10 border border-[#117dff]/20 shrink-0">
              {logo ? <img src={logo} alt="" className="w-5 h-5" /> : <FileText size={18} className="text-[#117dff]" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#737373]">
                {isEmail ? t('hyperAgents.previewEmail', 'Email draft — preview') : t('hyperAgents.previewArtifact', 'Artifact — preview')}
              </div>
              <div className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate">
                {subject || preview.title || 'Draft'}
              </div>
            </div>
            {isEmail && !sent && (
              <button type="button" onClick={() => setEditing((v) => !v)}
                title={t('hyperAgents.previewEdit', 'Edit the draft')}
                className={`w-9 h-9 rounded-none flex items-center justify-center border transition-colors ${editing ? 'bg-[#117dff] border-[#117dff] text-white' : 'border-[#e3e0db] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#faf9f4]'}`}>
                <Pencil size={14} />
              </button>
            )}
            <button type="button" onClick={onClose}
              className="w-9 h-9 rounded-none flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]">
              <X size={16} />
            </button>
          </div>
          {/* email meta */}
          {isEmail && (
            <div className="px-6 py-2.5 border-b border-[#e3e0db] bg-[#faf9f4] grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 items-center">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#737373]">{t('hyperAgents.previewTo', 'To')}</span>
              {editing
                ? <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com"
                    className="h-8 px-2.5 text-[12.5px] bg-white border border-[#e3e0db] rounded-none focus:outline-none focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/15" />
                : <span className={`text-[12.5px] ${to ? 'text-[#0a0a0a]' : 'text-amber-600'}`}>{to || t('hyperAgents.previewNoRecipient', 'no recipient yet — click the pencil to add one')}</span>}
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#737373]">{t('hyperAgents.previewSubject', 'Subject')}</span>
              {editing
                ? <input value={subject} onChange={(e) => setSubject(e.target.value)}
                    className="h-8 px-2.5 text-[12.5px] bg-white border border-[#e3e0db] rounded-none focus:outline-none focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/15" />
                : <span className="text-[12.5px] text-[#0a0a0a] truncate">{subject}</span>}
            </div>
          )}
          {/* body */}
          <div className="px-6 py-4 overflow-y-auto min-h-0 flex-1">
            {editing
              ? <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16}
                  className="w-full text-[12.5px] font-mono leading-relaxed px-3 py-2.5 bg-[#faf9f4] border border-[#e3e0db] rounded-none focus:outline-none focus:bg-white focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/15 resize-y" />
              : <div className="text-[13px] text-[#262626] leading-relaxed">{renderMarkdownLite(body)}</div>}
          </div>
          {/* footer */}
          <div className="px-6 py-3.5 border-t border-[#e3e0db] flex items-center justify-between gap-3">
            <div className="text-[11px] text-[#737373] min-w-0 truncate">
              {error ? <span className="text-red-600">{error}</span>
                : sent ? <span className="text-emerald-600 font-medium">{t('hyperAgents.previewSent', 'Sent ✓ — delivered via Gmail')}</span>
                : isEmail ? t('hyperAgents.previewSendHint', 'Sending is the approval — diagrams are attached as images, the body is delivered as polished HTML.')
                : (preview.url ? t('hyperAgents.previewOpenHint', 'Read-only preview of the produced artifact.') : '')}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {preview.url && (
                <a href={preview.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-none border border-[#e3e0db] text-[12px] text-[#525252] hover:text-[#0a0a0a] hover:bg-[#faf9f4]">
                  <ExternalLink size={13} /> {t('hyperAgents.previewOpen', 'Open')}
                </a>
              )}
              {isEmail && (
                <button type="button" onClick={doSend} disabled={!canSend}
                  title={!to.trim() ? t('hyperAgents.previewNeedTo', 'Add a recipient first (pencil)') : ''}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-none bg-[#117dff] text-white text-[12.5px] font-['Space_Grotesk'] font-semibold shadow-[0_4px_14px_rgba(17,125,255,0.32)] hover:bg-[#0066e0] active:scale-95 disabled:opacity-40 disabled:shadow-none transition-all">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : sent ? <CheckCheck size={14} /> : <Send size={14} />}
                  {sent ? t('hyperAgents.previewSentBtn', 'Sent') : t('hyperAgents.previewSend', 'Send')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Markdown-lite renderer ───────────────────────────────────────────
 * Just enough to make lead reports look like a clean Slack message.
 * Headers, lists, bold, inline code, tables, and ```mermaid diagrams. No full markdown engine.
 */
function renderMarkdownLite(raw) {
  if (!raw) return null;
  const text = String(raw).replace(/^\s+|\s+$/g, '');
  const blocks = [];
  const lines = text.split(/\r?\n/);
  let i = 0;
  let key = 0;

  const fmt = (seg, out, kp) => {
    let rest = seg;
    let mIdx = 0;
    while (rest.length) {
      const b = rest.match(/\*\*([^*]+)\*\*/);
      const it = rest.match(/`([^`]+)`/);
      const first = [b, it].filter(Boolean).sort((a, c) => a.index - c.index)[0];
      if (!first) { out.push(rest); break; }
      if (first.index > 0) out.push(rest.slice(0, first.index));
      if (first === b) out.push(<strong key={`${kp}b-${mIdx++}`}>{b[1]}</strong>);
      else out.push(<code key={`${kp}c-${mIdx++}`} className="px-1 py-0.5 rounded bg-black/5 text-[12px] font-mono">{it[1]}</code>);
      rest = rest.slice(first.index + first[0].length);
    }
  };
  // inline: handle **bold**, `code`, and <br> (LLMs emit literal <br> inside table cells)
  const inline = (s) => {
    const segs = String(s == null ? '' : s).split(/<br\s*\/?>/i);
    const out = [];
    segs.forEach((seg, si) => {
      if (si > 0) out.push(<br key={`br-${si}`} />);
      fmt(seg, out, `s${si}-`);
    });
    return out;
  };
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l || '');
  const isTableSep = (l) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l || '') && (l || '').includes('-');
  const splitRow = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }
    // Fenced code block ```lang … ``` — render ```mermaid as a real diagram, else a <pre>.
    const fence = trimmed.match(/^`{3,}\s*([a-zA-Z0-9_-]*)\s*$/);
    if (fence) {
      const lang = (fence[1] || '').toLowerCase();
      i++;
      const buf = [];
      while (i < lines.length && !/^`{3,}\s*$/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      if (i < lines.length) i++;  // consume closing fence
      const code = buf.join('\n');
      if (lang === 'mermaid') {
        blocks.push(<MermaidDiagram key={key++} code={code} />);
      } else {
        blocks.push(
          <pre key={key++} className="my-2 overflow-x-auto rounded-md border border-[#e3e0db] bg-[#faf9f4] p-2 text-[11px] font-mono text-[#262626] whitespace-pre">{code}</pre>,
        );
      }
      continue;
    }
    // Heading
    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? 'text-[14px] font-bold mt-2 mb-1'
                : level === 2 ? 'text-[13px] font-bold mt-2 mb-1'
                : 'text-[12px] font-semibold uppercase tracking-wider text-[#525252] mt-1.5 mb-0.5';
      blocks.push(<div key={key++} className={cls}>{inline(h[2])}</div>);
      i++;
      continue;
    }
    // Table — a "| a | b |" row followed by a "|---|---|" separator → real <table>.
    if (isTableRow(line) && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2; // consume header + separator
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      blocks.push(
        <div key={key++} className="my-2 overflow-x-auto rounded-md border border-[#e3e0db]">
          <table className="w-full text-[11.5px] border-collapse">
            <thead>
              <tr>{header.map((hc, hi) => (
                <th key={hi} className="text-left font-semibold text-[#0a0a0a] bg-[#f3f1ec] border-b border-[#e3e0db] px-2.5 py-1.5 align-top">{inline(hc)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((cells, ri) => (
                <tr key={ri} className={ri % 2 ? 'bg-[#faf9f4]' : 'bg-white'}>
                  {cells.map((c, ci) => (
                    <td key={ci} className="border-t border-[#ece9e3] px-2.5 py-1.5 align-top text-[#262626] leading-relaxed">{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    // Bullet list
    if (/^\s*[*-]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[*-]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[*-]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-0.5 my-1">
          {items.map((it, ix) => <li key={ix}>{inline(it)}</li>)}
        </ul>,
      );
      continue;
    }
    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-5 space-y-0.5 my-1">
          {items.map((it, ix) => <li key={ix}>{inline(it)}</li>)}
        </ol>,
      );
      continue;
    }
    // Paragraph
    const para = [];
    while (i < lines.length && lines[i].trim()
           && !/^(#{1,3}\s|\s*[*-]\s+|\s*\d+\.\s+)/.test(lines[i])
           && !isTableRow(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(<p key={key++} className="my-1 leading-relaxed">{inline(para.join(' '))}</p>);
  }
  return blocks;
}

/* ─── Swarm R1-R5 renderer (Phase 4) ──────────────────────────────────── */

function EvidenceChip({ id, onClick }) {
  const { t } = useTranslation('dashboard');
  if (!id) return null;
  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f3f1ec] text-[#525252] hover:bg-violet-100 hover:text-violet-700 transition-colors cursor-pointer"
      title={t('hyperAgents.openMemory', 'Open memory {{id}}', { id })}
    >
      m·{String(id).slice(0, 8)}
    </button>
  );
}

function EvidenceModal({ memoryId, onClose }) {
  const { t } = useTranslation('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null); setData(null);
    apiClient.getMemory(memoryId)
      .then((res) => { if (!cancelled) setData(res?.memory || res); })
      .catch((e) => { if (!cancelled) setErr(e?.response?.data?.error || e?.message || 'load failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memoryId]);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm lg:hidden" />
      <div
        className="absolute inset-y-0 right-0 w-full max-w-lg bg-[#faf9f4] border-l border-[#e3e0db] shadow-2xl flex flex-col animate-slideInRight"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-[#e3e0db] flex items-center justify-between bg-[#faf9f4]">
          <div className="flex items-center gap-2 min-w-0">
            <Brain size={16} className="text-[#117dff] shrink-0" />
            <span className="text-[14px] font-bold text-[#0a0a0a] font-['Space_Grotesk'] truncate">
              {t('hyperAgents.memoryPreview', 'Memory preview')}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f1ec] text-[#525252] hover:text-[#0a0a0a]">
            <X size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-[12px] text-[#a3a3a3]">
              <Loader2 size={13} className="animate-spin" /> {t('hyperAgents.loading', 'Loading...')}
            </div>
          )}
          {err && <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
          {data && (
            <>
              <h3 className="text-[18px] font-bold text-[#0a0a0a] font-['Space_Grotesk'] leading-snug">
                {data.title || t('hyperAgents.untitledMemory', 'Untitled memory')}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {data.memory_type && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
                    <FileText size={10} /> {data.memory_type}
                  </span>
                )}
                {(data.source || data.source_platform || data.source_metadata?.source_platform) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200">
                    <Globe size={10} /> {data.source || data.source_platform || data.source_metadata?.source_platform}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                  {t('hyperAgents.content', 'Content')}
                </label>
                <div className="bg-white border border-[#e3e0db] rounded-xl p-4 text-[#525252] text-sm leading-relaxed whitespace-pre-wrap">
                  {data.content || t('hyperAgents.noContent', 'No content')}
                </div>
              </div>
              {(data.tags || []).length > 0 && (
                <div>
                  <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                    {t('hyperAgents.tags', 'Tags')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(data.tags || []).slice(0, 30).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#e3e0db] text-[10px] text-[#525252]">
                        <Tag size={9} /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DeepSimulationPanel({
  ontology,
  workforceAssessment,
  flybyProposal,
  flybyDecision,
  flybyJoined,
  flybySkipped,
  simulationPhases,
  simulationClaims,
  peerReviews = [],
  participants,
  onFlybyDecision,
  busy,
  archived,
}) {
  const { t } = useTranslation('dashboard');
  const requiredRoles = ontology?.required_roles || [];
  const missingRoles = workforceAssessment?.missing_roles || flybyProposal?.missing_roles || [];
  const coverage = workforceAssessment?.coverage || {};
  const spec = flybyProposal?.spec;
  const resolved = !!flybyDecision || !!flybyJoined || !!flybySkipped;

  return (
    <div className="ml-2 mr-2 space-y-2 border-l-2 border-blue-200 pl-3">
      {(ontology || workforceAssessment) && (
        <div className="rounded-md border border-[#e3e0db] bg-white px-3 py-2">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-blue-700">
            <Search size={11} /> {t('hyperAgents.deepSimAssess', 'Simulation assessment')}
          </div>
          {requiredRoles.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {requiredRoles.map(role => {
                const covered = (coverage[role] || []).length > 0;
                return (
                  <span
                    key={role}
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-mono ${
                      covered ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                    title={(coverage[role] || []).join(', ') || t('hyperAgents.noCoverage', 'No current employee covers this lens')}
                  >
                    {role}{covered ? ` · ${(coverage[role] || []).join(', ')}` : ' · gap'}
                  </span>
                );
              })}
            </div>
          )}
          {missingRoles.length > 0 && (
            <div className="mt-1 text-[10px] text-[#737373]">
              {t('hyperAgents.missingRoles', 'Missing lens: {{roles}}', { roles: missingRoles.join(', ') })}
            </div>
          )}
        </div>
      )}

      {flybyProposal && spec && (
        <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-white text-blue-700 flex items-center justify-center shrink-0">
              <UserPlus size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[#0a0a0a]">
                {spec.name || spec.slug}
                <span className="ml-1 text-[9px] font-mono uppercase tracking-wider text-blue-700">
                  {spec.role || 'flyby'}
                </span>
              </div>
              <div className="text-[11px] text-[#525252] mt-0.5">{flybyProposal.reason || spec.reason}</div>
              {!archived && !resolved && (
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onFlybyDecision?.('agree', spec)}
                    className="h-7 px-2.5 rounded bg-[#0a0a0a] text-white text-[10px] font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    {t('hyperAgents.agreeFlyby', 'Agree')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onFlybyDecision?.('disagree', spec)}
                    className="h-7 px-2.5 rounded border border-[#d4d0ca] bg-white text-[#525252] text-[10px] font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <X size={11} /> {t('hyperAgents.disagreeFlyby', 'Disagree')}
                  </button>
                </div>
              )}
              {resolved && (
                <div className="mt-1 text-[10px] font-mono text-blue-700">
                  {flybyJoined ? t('hyperAgents.flybyJoined', 'flyby joined') : t('hyperAgents.flybySkipped', 'flyby skipped')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(simulationPhases.length > 0 || simulationClaims.length > 0) && (
        <div className="space-y-1">
          {simulationPhases.slice(-3).map((p, i) => (
            <div key={`${p.phase}-${i}`} className="text-[9px] font-mono uppercase tracking-wider text-[#737373] pl-1">
              {p.label || p.phase}
            </div>
          ))}
          {simulationClaims.map((claim, i) => {
            const agent = participants[claim.agent] || { slug: claim.agent, lane: claim.lane || 'Communicator' };
            const meta = LANE_META[agent.lane || claim.lane] || LANE_META.Communicator;
            const Icon = meta.icon;
            return (
              <div key={`${claim.id}-${i}`} className="rounded-md border border-[#e3e0db] bg-white px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-[#0a0a0a]">{agent.name || claim.agent}</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: meta.bg, color: meta.color }}>
                    <Icon size={9} /> {claim.stance || meta.label}
                  </span>
                  {Number.isFinite(claim.confidence) && (
                    <span className="text-[9px] font-mono text-[#a3a3a3] ml-auto">{Math.round(claim.confidence * 100)}%</span>
                  )}
                </div>
                <div className="text-[12px] text-[#0a0a0a] leading-relaxed">{claim.content || claim.claim}</div>
                {claim.risk && <div className="mt-1 text-[10px] text-amber-700">Risk: {claim.risk}</div>}
              </div>
            );
          })}
        </div>
      )}

      {peerReviews.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#737373] pl-1">
            {t('hyperAgents.peerReview', 'Peer review')}
          </div>
          {peerReviews.map((review, i) => {
            const reviewer = participants[review.reviewer] || { slug: review.reviewer, lane: 'Skeptic' };
            const meta = LANE_META[reviewer.lane] || LANE_META.Skeptic;
            const Icon = meta.icon;
            const agreementTone =
              review.agreement === 'challenge' ? 'text-amber-700 bg-amber-50' :
              review.agreement === 'agree' ? 'text-emerald-700 bg-emerald-50' :
              'text-blue-700 bg-blue-50';
            return (
              <div key={`${review.reviewer || 'review'}-${review.target_hypothesis_id || i}-${review.ts || i}`} className="rounded-md border border-[#e3e0db] bg-white px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-[#0a0a0a]">{reviewer.name || review.reviewer}</span>
                  <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${agreementTone}`}>
                    <Icon size={9} /> {review.agreement || 'review'}
                  </span>
                  {Number.isFinite(review.confidence) && (
                    <span className="text-[9px] font-mono text-[#a3a3a3] ml-auto">{Math.round(review.confidence * 100)}%</span>
                  )}
                </div>
                <div className="text-[12px] text-[#525252] leading-relaxed">{review.content}</div>
                {review.condition && <div className="mt-1 text-[10px] text-blue-700">{review.condition}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SwarmRounds({ participants, hypotheses, peerReviews, chains, skepticChallenge, votes, swarmVerdict, roundStarts, costCapHit, deadlineHit, roomWarnings = [], onOpenEvidence }) {
  const { t } = useTranslation('dashboard');
  const reviewsByTarget = useMemo(() => {
    const out = {};
    for (const r of peerReviews || []) {
      const k = r.target_hypothesis_id;
      if (!k) continue;
      (out[k] = out[k] || []).push(r);
    }
    return out;
  }, [peerReviews]);
  const chainByAgent = useMemo(() => {
    const out = {};
    for (const c of chains || []) out[c.id || c.agent] = c;
    return out;
  }, [chains]);

  const roundHeader = (round, label) => (
    <div className="flex items-center gap-2 pt-3 pb-1 pl-2">
      <span className="text-[9px] uppercase tracking-wider font-mono text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
        R{round}
      </span>
      <span className="text-[11px] text-[#525252] font-mono">{label}</span>
    </div>
  );

  return (
    <div className="space-y-1">
      {/* R1 — Independent Hypotheses */}
      {hypotheses.length > 0 && (
        <>
          {roundHeader(1, t('hyperAgents.independentHypotheses', 'Independent Hypotheses'))}
          {hypotheses.map((h) => {
            const agent = participants[h.agent] || { slug: h.agent, lane: h.lane || 'Communicator' };
            const childReviews = reviewsByTarget[h.id] || [];
            const refined = chainByAgent[h.id];
            return (
              <div key={h.id} className="ml-2 border-l-2 border-violet-200 pl-3">
                <AgentBubble agent={agent} content={h.content} kind="hypothesis" confidence={h.confidence} ts={eventDisplayTs(h)} />
                {(h.evidence_memory_ids || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-1">
                    {h.evidence_memory_ids.map((mid) => (
                      <EvidenceChip key={mid} id={mid} onClick={onOpenEvidence} />
                    ))}
                  </div>
                )}
                {/* R2 — peer reviews for this hypothesis */}
                {childReviews.length > 0 && (
                  <div className="ml-3 mt-2 space-y-1 border-l border-dashed border-[#d4d0ca] pl-2">
                    <div className="text-[9px] uppercase tracking-wider font-mono text-[#737373]">{t('hyperAgents.r2PeerReview', 'R2 · Peer review')}</div>
                    {childReviews.map((r, i) => {
                      const reviewerAgent = participants[r.reviewer] || { slug: r.reviewer, lane: 'Communicator' };
                      const agreeColor =
                        (r.agreement === 'agree' || r.agreement === 'support') ? 'text-emerald-700' :
                        r.agreement === 'challenge' ? 'text-amber-700' : 'text-blue-700';
                      return (
                        <div key={i} className="text-[12px]">
                          <span className={`text-[10px] font-mono ${agreeColor}`}>[{r.agreement}]</span>{' '}
                          <span className="font-semibold text-[#0a0a0a]">{reviewerAgent.name || r.reviewer}:</span>{' '}
                          <span className="text-[#525252]">{r.content}</span>
                          {(r.evidence_memory_ids || []).length > 0 && (
                            <span className="ml-1 inline-flex flex-wrap gap-1">
                              {r.evidence_memory_ids.map((m) => (
                                <EvidenceChip key={m} id={m} onClick={onOpenEvidence} />
                              ))}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* R3 — refined hypothesis + chain of thought */}
                {refined && (
                  <details className="ml-3 mt-2 text-[12px]">
                    <summary className="cursor-pointer text-[9px] uppercase tracking-wider font-mono text-emerald-700">
                      {t('hyperAgents.r3Refined', 'R3 · Refined hypothesis + {{n}} chain-of-thought steps', { n: (refined.steps || []).length })}
                    </summary>
                    <div className="mt-1 pl-2 border-l border-emerald-200 space-y-1">
                      <div className="text-[12px] text-[#0a0a0a]">{refined.refined_hypothesis}</div>
                      {(refined.steps || []).map((s, i) => (
                        <div key={i} className="text-[10px] font-mono text-[#737373]">→ {s}</div>
                      ))}
                      {refined.lane_specific_finding && (
                        <div className="text-[11px] italic text-violet-700 mt-1">
                          {refined.lane_specific_finding}
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* R4 — Skeptic challenge */}
      {skepticChallenge && (
        <>
          {roundHeader(4, t('hyperAgents.r4Skeptic', 'Skeptic — unorthodox + hidden assumptions'))}
          <div className="ml-2 border-l-2 border-red-400 pl-3 bg-red-50/30 rounded-r-md py-2">
            <div className="text-[10px] font-mono text-red-700 mb-1">
              {skepticChallenge.agent} (permanent Skeptic)
            </div>
            {(skepticChallenge.challenges || []).map((c, i) => (
              <div key={`c-${i}`} className="text-[12px] mb-1">
                <span className="text-[9px] font-mono text-amber-700 mr-1">[challenges {c.target_hypothesis_id}]</span>
                {c.challenge}
                {(c.evidence_memory_ids || []).length > 0 && (
                  <span className="ml-1 inline-flex flex-wrap gap-1">
                    {c.evidence_memory_ids.map((m) => (
                      <EvidenceChip key={m} id={m} onClick={onOpenEvidence} />
                    ))}
                  </span>
                )}
              </div>
            ))}
            {(skepticChallenge.unorthodox_alternatives || []).map((u, i) => (
              <div key={`u-${i}`} className="text-[12px] mb-1">
                <span className="text-[9px] font-mono text-violet-700 mr-1">[unorthodox-{i + 1}]</span>
                {u.angle}
              </div>
            ))}
            {(skepticChallenge.hidden_assumptions || []).length > 0 && (
              <div className="text-[11px] italic text-[#525252] mt-1">
                {t('hyperAgents.hiddenAssumptions', 'Hidden assumptions: {{list}}', { list: skepticChallenge.hidden_assumptions.join(' · ') })}
              </div>
            )}
          </div>
        </>
      )}

      {/* R5 — Vote grid */}
      {votes.length > 0 && (
        <>
          {roundHeader(5, t('hyperAgents.r5ConvergenceVote', 'Convergence vote'))}
          <div className="ml-2 overflow-x-auto">
            <table className="text-[11px] min-w-full">
              <thead>
                <tr className="text-[#737373] border-b border-[#e3e0db]">
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.voter', 'Voter')}</th>
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.for', 'For')}</th>
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.score', 'Score')}</th>
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.conditions', 'Conditions')}</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((v, i) => (
                  <tr key={i} className="border-b border-[#f3f1ec]">
                    <td className="pr-3 py-1 font-semibold">{v.voter}</td>
                    <td className="pr-3 py-1 font-mono text-[10px]">{v.vote_for_hypothesis_id}</td>
                    <td className="pr-3 py-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        v.score >= 4 ? 'bg-emerald-100 text-emerald-700' :
                        v.score >= 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{v.score}</span>
                    </td>
                    <td className="pr-3 py-1 text-[10px] text-[#525252]">
                      {(v.conditions || []).join('; ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Prod hardening notices — truncation + role warnings (never silent) */}
      {(costCapHit || deadlineHit || roomWarnings.length > 0) && (
        <div className="mx-2 mt-3 space-y-1">
          {costCapHit && (
            <div className="p-2 rounded-md border border-amber-300 bg-amber-50 text-[11px] text-amber-800">
              {t('hyperAgents.costCapHit', '⚠ Turn truncated at the tool-call budget — synthesis ran on the rounds completed so far.')}
            </div>
          )}
          {deadlineHit && (
            <div className="p-2 rounded-md border border-amber-300 bg-amber-50 text-[11px] text-amber-800">
              {t('hyperAgents.deadlineHit', '⏱ Turn hit the time limit ({{cap}}s) — sealed early from round {{round}}.', { cap: deadlineHit.cap_s || '—', round: deadlineHit.skipped_from_round || '?' })}
            </div>
          )}
          {roomWarnings.map((w, i) => (
            <div key={i} className="p-2 rounded-md border border-blue-200 bg-blue-50 text-[11px] text-blue-800">
              {w.code === 'configured_skeptic_absent'
                ? t('hyperAgents.skepticAbsent', 'ℹ Configured Skeptic absent this turn — a stand-in{{standin}} challenged instead.', { standin: w.stand_in_skeptic ? ` (${w.stand_in_skeptic})` : '' })
                : w.code === 'lead_skeptic_collision'
                ? t('hyperAgents.leadSkepticCollision', 'ℹ Lead and Skeptic resolved to the same agent{{slug}} — Skeptic dropped for this turn.', { slug: w.slug ? ` (${w.slug})` : '' })
                : `ℹ ${w.code || t('hyperAgents.notice', 'notice')}`}
            </div>
          ))}
          {peerReviews.map((review, i) => (
            <div key={`deep-review-${i}`} className="ml-3 rounded-md border border-[#e3e0db] bg-[#faf9f4] px-3 py-2">
              <div className="text-[10px] font-mono text-[#737373] mb-0.5">
                {review.reviewer} {review.agreement || 'review'} {review.target_author || review.target_hypothesis_id}
              </div>
              <div className="text-[12px] text-[#525252] leading-relaxed">{review.content}</div>
              {review.condition && <div className="mt-1 text-[10px] text-blue-700">Condition: {review.condition}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Swarm verdict banner */}
      {swarmVerdict && (
        <div className={`mx-2 mt-3 p-3 rounded-md border ${
          swarmVerdict.verdict === 'AGREED' ? 'border-emerald-300 bg-emerald-50' :
          swarmVerdict.verdict === 'CONDITIONAL' ? 'border-amber-300 bg-amber-50' :
          'border-red-300 bg-red-50'
        }`}>
          <div className="text-[10px] uppercase font-mono mb-1 tracking-wider">
            ⛬ Verdict · <span className="font-bold">{swarmVerdict.verdict}</span>
            <span className="ml-2 text-[#737373]">
              weighted {swarmVerdict.weighted_score} · {swarmVerdict.vote_count} votes
            </span>
          </div>
          <div className="text-[12px] text-[#0a0a0a]">
            {t('hyperAgents.winner', 'Winner:')} <span className="font-mono">{swarmVerdict.winning_hypothesis_id || t('hyperAgents.none', 'none')}</span>
          </div>
          {(swarmVerdict.action_items || []).length > 0 && (
            <div className="mt-1.5 text-[11px]">
              <div className="text-[9px] uppercase font-mono text-[#737373]">{t('hyperAgents.actionItems', 'Action items')}</div>
              <ul className="list-disc list-inside text-[#525252]">
                {swarmVerdict.action_items.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Bubble ─────────────────────────────────────────────────────────── */

// Defensive: the engine sometimes emits a raw reactor-decision JSON as the line
// content (e.g. {"react":true,"agreement":"extend","line":"..."} or
// {"react":false}). Render the prose `.line`; hide silent {"react":false}.
function coerceLine(raw) {
  if (typeof raw !== 'string') return raw;
  const s = raw.trim();
  if (!(s.startsWith('{') && s.includes('"react"'))) return raw;
  try {
    const o = JSON.parse(s);
    if (o && typeof o === 'object' && ('react' in o || 'line' in o)) {
      if (o.line && String(o.line).trim()) return String(o.line);
      if (o.react === false) return null; // silent reactor — don't render
    }
  } catch { /* not JSON — render as-is */ }
  return raw;
}

function AgentBubble({ agent, content: rawContent, kind, agreement, confidence, ts }) {
  const content = coerceLine(rawContent);
  if (content == null) return null; // silent {"react":false}
  const lane = agent?.lane || 'Communicator';
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const Icon = meta.icon;
  const contract = getPersonaContract(agent);
  const indent = kind === 'react' || kind === 'validate';
  const agMeta = agreement ? AGREEMENT_META[agreement] : null;
  const isShort = (content || '').length < 280 && !/\n.*\n/.test(content || '');

  return (
    <div className={`flex gap-2 ${indent ? 'ml-6' : ''}`}>
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
        style={{ background: meta.bg, color: meta.color }}
        title={`${agent?.name || agent?.slug} · ${lane}`}
      >
        {agent?.avatarUrl
          ? <img src={agent.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          : (agent?.name?.[0] || agent?.slug?.[0] || '?').toUpperCase()}
      </div>
      <div className="min-w-0 max-w-[78%]">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[11px] font-semibold text-[#0a0a0a]">{agent?.name || agent?.slug}</span>
          <span
            className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
            style={{ background: meta.bg, color: meta.color }}
          >
            <Icon size={9} /> {meta.label}
          </span>
          {contract?.stance && (
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#faf9f4] text-[#525252] border border-[#e3e0db]">
              {contract.stance}
            </span>
          )}
          {agMeta && (
            <span
              className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: agMeta.bg, color: agMeta.color }}
            >
              {agMeta.emoji} {agMeta.label}
              {Number.isFinite(confidence) && ` ${Math.round(confidence * 100)}%`}
            </span>
          )}
          {ts ? <span className="text-[9px] font-mono text-[#a3a3a3] ml-auto">{fmtTs(ts)}</span> : null}
        </div>
        <div
          className="border border-[#e3e0db] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-[#0a0a0a] leading-relaxed break-words overflow-hidden"
          style={{ background: kind === 'lead' ? '#ffffff' : '#faf9f4' }}
        >
          {isShort
            ? <span className="whitespace-pre-wrap">{content || '…'}</span>
            : <div className="space-y-0.5">{renderMarkdownLite(content)}</div>}
        </div>
      </div>
    </div>
  );
}

/* ─── Participant chip in right rail ─────────────────────────────────── */

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
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
        style={{ background: meta.bg, color: meta.color }}
      >
        {agent?.avatarUrl
          ? <img src={agent.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          : (agent?.name?.[0] || agent?.slug?.[0] || '?').toUpperCase()}
      </div>
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
          <div
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-semibold"
            style={{ background: meta.bg, color: meta.color }}
          >
            {agent.avatarUrl
              ? <img src={agent.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              : (agent.name?.[0] || agent.slug?.[0] || '?').toUpperCase()}
          </div>
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
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {(agent.name?.[0] || '?').toUpperCase()}
                  </div>
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
  const step1Valid = !!name.trim() && !!goal.trim() && scopeReady;
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
                          <div
                            className="w-9 h-9 rounded-[8px] shrink-0 flex items-center justify-center text-[12px] font-semibold font-['Space_Grotesk']"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {emp.avatar_url
                              ? <img src={emp.avatar_url} alt="" className="w-full h-full rounded-[8px] object-cover" />
                              : (emp.name?.[0] || '?').toUpperCase()}
                          </div>
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
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {(emp.name?.[0] || '?').toUpperCase()}
                </div>
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
