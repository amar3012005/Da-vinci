import { useNavigate } from 'react-router-dom';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Target, FileText, Globe, ArrowUpRight,
  Sparkles, LayoutGrid, MessageSquare, RefreshCw, Search,
  MapPin, Mail, Phone, Pencil, X, Power, Check, BookOpen,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import WebsitePreview from './WebsitePreview';
import AgentAvatar from './AgentAvatar';
import { LANE_META } from './rooms/shared';
import WorkspacePopupSurface from '../shared/WorkspacePopupSurface';
import { aggregateAgentRooms } from '../layout/AgentRoomStatus';
import { pageCache } from '../shared/resource-cache';
import { libraryUrl, readLibraryFirstPage } from '../shared/runtime-library';
import { assignmentsByTeammate, recentDeliverables, runtimeAgendas, runtimeStatusSummary, upcomingWakes } from './company-hq-model';
import { DeliverablesCard, EmptyNote, FOCUS, HqCard, HqSkeleton, RuntimeCard, StatusChip, TeamCard, WakesCard } from './CompanyHqSections';
import '../shared/skeleton.css';
import './company-hq.css';

// Onboarding is only needed before a company exists; the Company HQ reader never loads it.
const HyperOnboarding = React.lazy(() => import('./HyperOnboarding'));

/**
 * CompanyDashboard — Company HQ: the company overview, Runtime's status and
 * agendas, assignments by teammate, the calendar of next wakes, recent
 * deliverables, and company knowledge, in one responsive card grid.
 *
 * Reads GET /v1/hyper/company (company profile, planned tasks, deliverables),
 * GET /v1/hq/runtime and GET /v1/hq/work (Runtime state, agendas, schedules)
 * and the Library's first page. Every read goes through the shared page cache,
 * so reopening HQ paints the last result immediately and revalidates.
 * Live Runtime and teammate states come from the sidebar's room statuses
 * (`team`, `rooms`) when the caller has them.
 */

// Same class of drift found and fixed in the sibling HqRuntimeConsole.jsx:
// two catch blocks each hand-copied this extraction with subtly different
// optional-chaining. One helper, one behavior.
export const extractErrorMessage = (err, fallback) => err?.response?.data?.error
  || err?.message || fallback;

// The same spinner markup (only size/color literals differ) was copy-pasted
// at two call sites in this file. NOT extracted app-wide (this exact markup
// repeats in 12+ other files too) — that's a real, larger follow-up, out of
// scope for this file's cleanup pass.
export const Spinner = ({ size = 'w-4 h-4', colorClass = 'border-[#117dff]' }) => (
  <span className={`block ${size} border-2 ${colorClass} border-t-transparent rounded-full animate-spin`} />
);

const TAG_STYLES = {
  RESEARCH: 'bg-[#117dff]/10 text-[#117dff]',
  FEATURE: 'bg-orange-500/10 text-orange-600',
  MARKETING: 'bg-violet-500/10 text-violet-700',
  OUTREACH: 'bg-emerald-500/10 text-emerald-700',
  STRATEGY: 'bg-[#0a0a0a]/8 text-[#3f3d39]',
};

const SOCIAL_BRANDS = {
  linkedin: { label: 'LinkedIn', icon: 'logos:linkedin-icon' },
  instagram: { label: 'Instagram', icon: 'skill-icons:instagram' },
  x: { label: 'X', icon: 'fa6-brands:x-twitter' },
  twitter: { label: 'X', icon: 'fa6-brands:x-twitter' },
  facebook: { label: 'Facebook', icon: 'logos:facebook' },
  youtube: { label: 'YouTube', icon: 'logos:youtube-icon' },
  tiktok: { label: 'TikTok', icon: 'logos:tiktok-icon' },
  github: { label: 'GitHub', icon: 'logos:github-icon' },
  threads: { label: 'Threads', icon: 'fa6-brands:threads' },
};

function socialBrand(platform) {
  const key = String(platform || '').trim().toLowerCase();
  return SOCIAL_BRANDS[key] || {
    label: platform || 'Social profile',
    icon: 'material-symbols:public',
  };
}

function socialUsername(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const value = parts.at(-1) || '';
    return value ? `@${value.replace(/^@/, '')}` : '';
  } catch { return ''; }
}

// Same normalization AgentAvatar.jsx uses internally to pick a ring color —
// duplicated here (small, static) so the Team card's role pill and the
// profile popup can show the matching lane color/icon without reaching into
// that module's private helper.
const ARCHETYPE_TO_LANE = {
  strategist: 'Strategist', coordinator: 'Strategist',
  builder: 'Builder',
  skeptic: 'Skeptic',
  investigator: 'Researcher', researcher: 'Researcher',
  generalist: 'Communicator', communicator: 'Communicator',
};
function laneFor(member) {
  const raw = String(member?.roleArchetype || 'Communicator').trim();
  if (LANE_META[raw]) return raw;
  const normalized = raw.toLowerCase();
  if (ARCHETYPE_TO_LANE[normalized]) return ARCHETYPE_TO_LANE[normalized];
  if (/(risk|quality|compliance|legal|audit|security)/.test(normalized)) return 'Skeptic';
  if (/(research|analyst|insight|intelligence|investigat)/.test(normalized)) return 'Researcher';
  if (/(strategy|strategist|positioning|brand|direction)/.test(normalized)) return 'Strategist';
  if (/(engineer|builder|developer|architect|implementation)/.test(normalized)) return 'Builder';
  return 'Communicator';
}
// What each role actually does in the HyperAgents process — real, not a
// fabricated per-person bio (the dashboard's employee record doesn't carry
// a persona contract, only id/name/roleArchetype/status).
const LANE_BLURB = {
  Strategist: 'Sets direction — decides what the team works on next and why.',
  Builder: 'Ships the plan — turns decisions into the actual work product.',
  Skeptic: 'Pressure-tests claims and flags risk before it becomes a mistake.',
  Researcher: 'Gathers and verifies evidence before decisions get made.',
  Communicator: 'Keeps the answer legible and usable by the rest of the team.',
};

function EmployeeProfileModal({ member, onClose, onShowRoster }) {
  const { t } = useTranslation('dashboard');
  if (!member) return null;
  const lane = laneFor(member);
  const jobTitle = String(member.roleArchetype || lane).trim();
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const Icon = meta.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white border border-[#e3e0db] rounded-2xl max-w-[380px] w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="h-16" style={{ background: `linear-gradient(135deg, ${meta.color}22, ${meta.color}08)` }} />
        <div className="px-5 pb-5 -mt-10">
          <div className="flex items-end justify-between">
            <span className="rounded-2xl border-4 border-white shadow-sm" style={{ background: '#fff' }}>
              <AgentAvatar agent={{ ...member, lane }} size={72} />
            </span>
            <button onClick={onClose} className="mb-1 text-[#a3a3a3] hover:text-[#0a0a0a] p-1" aria-label={t('hyperDash.close', 'Close')}>
              <X size={16} />
            </button>
          </div>
          <h3 className="mt-3 text-[17px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{member.name}</h3>
          <span className="inline-flex items-center gap-1.5 mt-1 text-[11.5px] font-mono px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
            <Icon size={12} /> {jobTitle}
          </span>
          {member.status ? (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-mono uppercase text-[#a3a3a3]">
              <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-[#d4d0ca]'}`} />
              {member.status}
            </span>
          ) : null}
          <p className="mt-3 text-[12.5px] text-[#525252] leading-relaxed">
            {member.persona || LANE_BLURB[lane]}
          </p>
          {onShowRoster ? (
            <button
              onClick={() => { onClose(); onShowRoster(); }}
              className="mt-4 w-full rounded-lg border border-[#e3e0db] hover:border-[#0a0a0a] py-2 text-[12px] font-semibold text-[#0a0a0a] transition-colors"
            >
              {t('hyperDash.viewInRoster', 'View in full roster')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const RUNTIME_FOCUSES = [
  { id: 'seo', label: 'SEO', detail: 'Grow qualified search visibility.' },
  { id: 'social_campaigns', label: 'Social media campaigns', detail: 'Plan, publish, and learn from connected channels.' },
  { id: 'marketing', label: 'Marketing', detail: 'Improve positioning, offers, and demand.' },
  { id: 'outreach', label: 'Outreach', detail: 'Build and operate accountable outreach.' },
  { id: 'clients_revenue', label: 'Getting clients & making money', detail: 'Prioritize pipeline and measurable revenue work.' },
  { id: 'legal_finance', label: 'Legal & finance', detail: 'Track material obligations, risk, and financial work.' },
  { id: 'fundraising', label: 'Fundraising', detail: 'Prepare evidence, narrative, and investor work.' },
];


const COMPANY_KEY = 'hyper:company';
const RUNTIME_KEY = 'hq:runtime';
const WORK_KEY = 'hq:work';
const LIBRARY_KEY = libraryUrl({});
/** A cached read younger than this paints without a revalidation request. */
const COMPANY_FRESH_MS = 10000;
const SIDE_FRESH_MS = 30000;


function Fact({ icon: Icon, label, children }) {
  return <div className="min-w-0 rounded-xl bg-[#f7f6f2] px-3.5 py-3">
    <dt className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#8b8b86]"><Icon size={12} aria-hidden="true" />{label}</dt>
    <dd className="mt-1 text-[13px] leading-5 text-[#262b31]">{children}</dd>
  </div>;
}

/**
 * @param {object} props
 * @param {(room: object) => void} [props.onOpenRoom] - opens a company room; planned work is clickable only with it.
 * @param {() => void} [props.onShowRoster] - shows the full roster.
 * @param {(result: object) => void} [props.onOpenRuntime] - called after the Runtime invitation launches Runtime.
 * @param {boolean} [props.showRuntimeInvite] - offers the Runtime invitation once per version.
 * @param {string} [props.runtimeInviteVersion] - invitation version stored per company.
 * @param {boolean} [props.showTasks] - false renders planned company work read-only (the HQ reader).
 * @param {boolean} [props.allowOnboarding] - false never starts onboarding from this surface.
 * @param {Array<object>} [props.team] - native roster; preferred over company employees for assignments.
 * @param {Array<object>} [props.rooms] - live room statuses from the sidebar, aggregated per agent id.
 * @param {(event: Event, agent: object) => void} [props.onOpenTeammate] - opens a teammate's room.
 * @param {() => void} [props.onDismiss] - closes the hosting reader before navigating away.
 */
export default function CompanyDashboard({ onOpenRoom, onShowRoster, onOpenRuntime, showRuntimeInvite = true, runtimeInviteVersion = 'v1', showTasks = true, allowOnboarding = true, team, rooms, onOpenTeammate, onDismiss }) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [entryError, setEntryError] = useState('');
  const cachedCompany = pageCache.read(COMPANY_KEY)?.value;
  const [state, setState] = useState(cachedCompany || null); // {company, employees, hq_room_id}
  const [loading, setLoading] = useState(!cachedCompany);
  const [loadError, setLoadError] = useState(false);
  const [openingTask, setOpeningTask] = useState(null);
  const [confirmRerun, setConfirmRerun] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [editingContacts, setEditingContacts] = useState(false);
  const [savingContacts, setSavingContacts] = useState(false);
  const [contactDraft, setContactDraft] = useState(null);
  const [runtimeInvite, setRuntimeInvite] = useState(null);
  const [runtimeFocuses, setRuntimeFocuses] = useState([]);
  const [runtimeLaunching, setRuntimeLaunching] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const [selectedWebArtifact, setSelectedWebArtifact] = useState(null);
  // undefined = still loading, null = unavailable for this workspace.
  const [hq, setHq] = useState(() => ({
    runtime: pageCache.read(RUNTIME_KEY)?.value, work: pageCache.read(WORK_KEY)?.value, library: pageCache.read(LIBRARY_KEY)?.value,
  }));
  const [sideRevision, setSideRevision] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const runtimeCompanyReady = Boolean(state?.onboarded && state?.company?.company);
  const runtimeInviteStorageKey = `hm_runtime_invite:${runtimeInviteVersion}:${state?.hq_room_id || state?.company?.company || 'company'}`;

  const doRerun = async () => {
    if (resetting) return;
    setResetting(true);
    setRuntimeError('');
    try {
      await apiClient.resetHyperOnboarding();
      pageCache.clear();
      try {
        window.localStorage.removeItem('hm_hyper_onboarded');
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith('hm_runtime_invite:') || key.startsWith('hm-room-intro-') || key.startsWith('hm-room-setup-'))
          .forEach((key) => window.localStorage.removeItem(key));
        Object.keys(window.sessionStorage)
          .filter((key) => key.startsWith('hm_hq_runtime_stream:'))
          .forEach((key) => window.sessionStorage.removeItem(key));
      } catch { /* storage can be unavailable */ }
      window.location.href = '/hivemind/app/employees?onboard=1';
    } catch (error) {
      setRuntimeError(extractErrorMessage(error, 'Company reset did not complete. Nothing new was started.'));
      setResetting(false);
    }
  };

  const load = useCallback(async ({ ifStale = false } = {}) => {
    const cached = pageCache.read(COMPANY_KEY);
    if (ifStale && cached && Date.now() - cached.at < COMPANY_FRESH_MS) return;
    if (!cached) setLoading(true);
    setLoadError(false);
    try {
      const d = await pageCache.load(COMPANY_KEY, () => apiClient.hyperCompany());
      setState(d);
    } catch {
      // A cached company stays on screen during a failed revalidation.
      if (!pageCache.read(COMPANY_KEY)) setLoadError(true);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load({ ifStale: true }); }, [load]);
  const refresh = () => { load(); setSideRevision((value) => value + 1); };

  // Runtime state, agendas, schedules and the newest Library files load after
  // the company paints and never block it; a failed read leaves its card empty.
  useEffect(() => {
    if (!runtimeCompanyReady) return undefined;
    let active = true;
    const read = (key, field, fetcher) => {
      const cached = pageCache.read(key);
      if (!sideRevision && cached && Date.now() - cached.at < SIDE_FRESH_MS) return;
      pageCache.load(key, fetcher)
        .then((value) => { if (active) setHq((current) => ({ ...current, [field]: value })); })
        .catch(() => { if (active) setHq((current) => ({ ...current, [field]: current[field] ?? null })); });
    };
    read(RUNTIME_KEY, 'runtime', () => apiClient.getHqRuntime());
    read(WORK_KEY, 'work', () => apiClient.getHqWork());
    read(LIBRARY_KEY, 'library', () => readLibraryFirstPage(LIBRARY_KEY));
    const projection = (event) => {
      if (!active) return;
      setHq((current) => ({
        ...current,
        ...(event.detail?.runtime !== undefined ? { runtime: { ...(current.runtime || {}), runtime: event.detail.runtime } } : {}),
        ...(event.detail?.work ? { work: event.detail.work } : {}),
      }));
    };
    window.addEventListener('hq-runtime-projection', projection);
    return () => { active = false; window.removeEventListener('hq-runtime-projection', projection); };
  }, [runtimeCompanyReady, sideRevision]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showRuntimeInvite || !runtimeCompanyReady) return undefined;
    try { if (window.localStorage.getItem(runtimeInviteStorageKey) === 'seen') return undefined; } catch { /* continue */ }
    const timer = window.setTimeout(() => setRuntimeInvite('intro'), 5000);
    return () => window.clearTimeout(timer);
  }, [runtimeCompanyReady, runtimeInviteStorageKey, showRuntimeInvite]);
  useEffect(() => {
    if (!state?.company?.screenshot_pending) return undefined;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      load();
      if (attempts >= 24) window.clearInterval(timer);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [state?.company?.screenshot_pending, load]);

  const employees = state?.employees;
  const roomFor = useCallback((id) => (Array.isArray(rooms) && rooms.length ? aggregateAgentRooms(rooms, id) : undefined), [rooms]);
  const agendas = useMemo(() => runtimeAgendas(hq.work || {}), [hq.work]);
  const members = useMemo(() => assignmentsByTeammate({ team, employees, roomFor, agendas }), [team, employees, roomFor, agendas]);
  const wakeGroups = useMemo(() => upcomingWakes(hq.work?.schedules, now), [hq.work, now]);
  const deliverableRows = useMemo(() => recentDeliverables({ deliverables: state?.company?.deliverables, libraryItems: hq.library?.items }), [state?.company?.deliverables, hq.library]);
  const runtimeRoom = roomFor('runtime');
  const runtimeStatus = runtimeStatusSummary({ room: runtimeRoom, runtime: hq.runtime?.runtime });

  const openTask = async (task) => {
    if (openingTask) return;
    setOpeningTask(task.id);
    try {
      const d = await apiClient.openHyperTask(task.id);
      // The control plane creates and dispatches the first turn atomically.
      // Navigation cannot lose the kickoff if this component unmounts.
      if (d?.room?.id) onOpenRoom?.(d.room);
      load(); // refresh task→room links
    } catch { /* stays on dashboard */ }
    finally { setOpeningTask(null); }
  };

  if (loading) return <HqSkeleton />;
  if (loadError) {
    return <div role="alert" className="flex-1 p-6 text-sm">
      <p>We couldn’t load your company. Your setup hasn’t been reset.</p>
      <button type="button" onClick={() => load()} className={`mt-3 min-h-[40px] text-[#117dff] underline ${FOCUS}`}>Try again</button>
    </div>;
  }
  if (!state?.onboarded || !state?.company) {
    if (!allowOnboarding) return <div className="flex-1 grid place-items-center p-6"><EmptyNote>Company information is not available yet.</EmptyNote></div>;
    // No company state (fresh org, or the HQ room carrying it was deleted) →
    // "Your Company" IS the onboarding page. Render the full genesis flow
    // inline instead of a dead placeholder.
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#faf9f4] px-4 py-4 sm:px-6">
        <div className="max-w-[1280px] mx-auto">
          {entryError ? <p role="alert">{entryError}</p> : null}
          <Suspense fallback={<HqSkeleton />}>
            <HyperOnboarding
              // Company details are already saved by onboarding. New users land in
              // Brain chat; the Runtime room is no longer opened automatically.
              onComplete={() => navigate('/hivemind/app/overview/new')}
              onSkip={() => load()}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  const c = state.company;
  const p = c.profile || {};
  const tasks = c.tasks || [];
  const interactiveTasks = showTasks && Boolean(onOpenRoom);
  const sideLoading = hq.work === undefined || hq.runtime === undefined;
  const libraryAvailable = Boolean(hq.library && !hq.library.unavailable);
  const openContactEditor = () => {
    setContactDraft({
      emails: (p.contact_details?.emails || []).join('\n'),
      phones: (p.contact_details?.phones || []).join('\n'),
      social_profiles: (p.social_profiles || []).map((item) => ({ platform: item.platform || '', url: item.url || '' })),
    });
    setEditingContacts(true);
  };
  const saveContacts = async () => {
    if (!contactDraft || savingContacts) return;
    setSavingContacts(true);
    try {
      const response = await apiClient.updateHyperCompanyContacts({
        emails: contactDraft.emails.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
        phones: contactDraft.phones.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
        social_profiles: contactDraft.social_profiles.filter((item) => item.platform && item.url),
      });
      setState((current) => current ? { ...current, company: response.company } : current);
      pageCache.clear();
      setEditingContacts(false);
    } finally { setSavingContacts(false); }
  };
  const closeRuntimeInvite = () => {
    try { window.localStorage.setItem(runtimeInviteStorageKey, 'seen'); } catch { /* noop */ }
    setRuntimeInvite(null);
  };
  const toggleRuntimeFocus = (focus) => {
    setRuntimeFocuses((current) => current.includes(focus)
      ? current.filter((item) => item !== focus)
      : [...current, focus]);
    setRuntimeError('');
  };
  const wakeRuntime = async () => {
    if (!runtimeFocuses.length || runtimeLaunching) {
      if (!runtimeFocuses.length) setRuntimeError('Choose at least one operating focus.');
      return;
    }
    setRuntimeLaunching(true);
    setRuntimeError('');
    const labels = RUNTIME_FOCUSES.filter((item) => runtimeFocuses.includes(item.id)).map((item) => item.label);
    const instruction = `Run this company autonomously with primary focus on ${labels.join(', ')}. Read the current company context, location, baseline, active plans, and connected capabilities first. Build a durable prioritized todo list, execute bounded work through the right Company Rooms and tools, measure outcomes, and adapt without discarding valid prior decisions.`;
    try {
      const result = await apiClient.launchHqRuntime({
        instruction,
        focuses: runtimeFocuses,
        authority_policy: { internal_autonomy: true },
      });
      if (result?.runtime?.id && result?.activation_event?.sequence) {
        const epoch = result.runtime.epoch || result.runtime.activatedAt || result.runtime.createdAt || 'current';
        const key = `hm_hq_runtime_stream:${result.runtime.id}:${epoch}`;
        try {
          window.sessionStorage.setItem(key, JSON.stringify({
            cursor: String(result.activation_event.sequence),
            events: [result.activation_event],
          }));
        } catch { /* persisted SSE hydration remains the fallback */ }
      }
      try { window.localStorage.setItem(runtimeInviteStorageKey, 'seen'); } catch { /* noop */ }
      setRuntimeInvite(null);
      onOpenRuntime?.(result);
    } catch (error) {
      setRuntimeError(extractErrorMessage(error, 'Runtime could not be started.'));
    } finally { setRuntimeLaunching(false); }
  };
  const openLibrary = libraryAvailable ? () => { onDismiss?.(); navigate('/hivemind/app/employee/library'); } : undefined;
  const linkClass = `inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 hover:bg-[#f0eee7] hover:text-[#1f2328] ${FOCUS}`;
  const webArtifacts = Array.isArray(c.web_artifacts) ? c.web_artifacts : [];
  const research = (c.research || []).slice(0, 6);

  const plannedWork = <ul className="space-y-1.5">
    {tasks.map((task) => {
      const taskActive = task.status === 'active' || Boolean(task.room_id);
      const taskDone = task.status === 'done';
      const inner = <>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-5 text-[#262b31]">{task.title}</span>
          {task.detail ? <span className="mt-0.5 line-clamp-1 block text-[12px] leading-[18px] text-[#6f747b]">{task.detail}</span> : null}
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${TAG_STYLES[task.tag] || TAG_STYLES.RESEARCH}`}>{task.room_name || task.room_tag || task.tag}</span>
            {taskDone ? <StatusChip tone="done">Done</StatusChip> : taskActive ? <StatusChip tone="active">In room</StatusChip> : null}
          </span>
        </span>
        {interactiveTasks ? <span className="mt-0.5 shrink-0">{openingTask === task.id ? <Spinner /> : taskActive ? <MessageSquare size={15} className="text-[#2f74e0]" aria-hidden="true" /> : <ArrowUpRight size={15} className="text-[#a3a3a3] group-hover:text-[#1f2328]" aria-hidden="true" />}</span> : null}
      </>;
      const title = `${task.title}${task.detail ? `\n\n${task.detail}` : ''}${task.deliverable ? `\n\nOutput: ${task.deliverable}` : ''}`;
      return <li key={task.id}>
        {interactiveTasks
          ? <button type="button" data-company-task="true" title={title} onClick={() => openTask(task)} className={`group flex min-h-[56px] w-full items-start gap-3 rounded-xl border border-[#eeece6] px-3 py-2.5 text-left hover:border-[#cfcac0] ${FOCUS}`}>{inner}</button>
          : <div data-company-task="true" title={title} className="flex min-h-[56px] items-start gap-3 rounded-xl border border-[#eeece6] px-3 py-2.5">{inner}</div>}
      </li>;
    })}
  </ul>;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#faf9f4]">
      {selectedWebArtifact ? (
        <div className="fixed inset-0 z-[92] grid place-items-center bg-black/35 p-3 backdrop-blur-[2px] sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedWebArtifact(null); }}>
          <div className="flex max-h-[calc(100dvh-24px)] w-full max-w-[920px] flex-col">
            <WorkspacePopupSurface
              variant="reader"
              label="hivemind — onboarding evidence"
              ariaLabel={`Preview ${selectedWebArtifact.title || selectedWebArtifact.url}`}
              onClose={() => setSelectedWebArtifact(null)}
              meta={`${selectedWebArtifact.content_chars || 0} characters · ${selectedWebArtifact.provider || 'web crawl'} · stored in company memory`}
              secondaryAction={{ label: 'Open source', onClick: () => window.open(selectedWebArtifact.url, '_blank', 'noopener,noreferrer') }}
              primaryAction={{ label: 'Open exact crawl', onClick: () => window.open(apiClient.hyperCompanyWebArtifactPreviewUrl(selectedWebArtifact.id), '_blank', 'noopener,noreferrer') }}
            >
              <div className="flex h-[min(640px,calc(100dvh-120px))] min-h-0 flex-col bg-[#fbfaf7]">
                <div className="border-b border-[#deddd7] px-6 py-5 sm:px-8">
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#248564]"><Globe size={12} /> Verified web source</div>
                  <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-[#111] sm:text-[24px]">{selectedWebArtifact.title || selectedWebArtifact.url}</h2>
                  <p className="mt-1 truncate text-[12px] text-[#347df4]">{selectedWebArtifact.url}</p>
                </div>
                <iframe title={selectedWebArtifact.title || 'Web source preview'} src={apiClient.hyperCompanyWebArtifactPreviewUrl(selectedWebArtifact.id)} className="min-h-0 flex-1 border-0 bg-white" sandbox="allow-same-origin allow-popups" />
              </div>
            </WorkspacePopupSurface>
          </div>
        </div>
      ) : null}
      {runtimeInvite ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Activate Runtime">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex max-h-[calc(100vh-2rem)] w-full max-w-[760px] flex-col">
            {runtimeInvite === 'intro' ? (
              <WorkspacePopupSurface label="hivemind — page guide" title="This is where Runtime operates your company." description="Runtime reads company memory, chooses bounded work, delegates to operating rooms, and wakes again when evidence changes." visual={<div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#111] text-white"><Power size={18} /></span><span><strong className="block text-[14px] text-[#181918]">HIVEMIND Runtime</strong><span className="mt-0.5 block text-[11px] text-[#777]">You remain in control; approval gates stay active.</span></span></div>} onClose={closeRuntimeInvite} secondaryAction={{ label: 'Not now', onClick: closeRuntimeInvite }} primaryAction={{ label: 'Choose priorities', onClick: () => setRuntimeInvite('focus') }} />
            ) : (
              <WorkspacePopupSurface label="hivemind — Runtime setup" title="What do you want Runtime to operate?" description="Choose one or more priorities. Runtime orders the work from current company evidence." onClose={closeRuntimeInvite} secondaryAction={{ label: 'Back', onClick: () => setRuntimeInvite('intro') }} primaryAction={{ label: runtimeLaunching ? 'Waking…' : 'Wake Runtime', onClick: wakeRuntime }}>
                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{RUNTIME_FOCUSES.map((item) => { const selected = runtimeFocuses.includes(item.id); return <button key={item.id} type="button" onClick={() => toggleRuntimeFocus(item.id)} aria-pressed={selected} className={`min-h-[92px] rounded-md border p-3 text-left transition-colors ${selected ? 'border-[#347df4] bg-[#eef4ff]' : 'border-[#deddd7] bg-white hover:border-[#9db7df]'} ${FOCUS}`}><span className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#111]">{item.label}{selected ? <Check size={14} className="text-[#347df4]" /> : null}</span><span className="mt-2 block text-[11px] leading-4 text-[#667085]">{item.detail}</span></button>; })}</div>{runtimeError ? <p className="mt-3 text-[11px] text-[#c2410c]">{runtimeError}</p> : null}
              </WorkspacePopupSurface>
            )}
          </motion.div>
        </div>
      ) : null}

      <div className="hm-hq-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <header className="px-4 pt-5 pb-3 sm:px-6 border-b border-[#e3e0db] flex items-start justify-between bg-[#faf9f4] flex-wrap gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#8b8b86]"><Building2 size={13} aria-hidden="true" /> Company HQ</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="min-w-0 break-words text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[#1a1d21] sm:text-[28px] font-['Space_Grotesk']">{c.company}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f3ea] px-2.5 py-1 text-[11.5px] font-medium text-[#24683b]"><span className="h-1.5 w-1.5 rounded-full bg-[#22a35a]" aria-hidden="true" /> {t('hyperDash.shipped', 'Operating')}</span>
            </div>
            <div className="-ml-2 mt-1.5 flex flex-wrap items-center gap-x-0.5 text-[12.5px] text-[#5f646b]">
              {c.website ? <a href={c.website} target="_blank" rel="noreferrer" className={linkClass}><Globe size={13} aria-hidden="true" /> {c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a> : null}
              {(p.social_profiles || []).map((social) => {
                const brand = socialBrand(social.platform);
                return (
                  <a key={social.url} href={social.url} target="_blank" rel="noreferrer" title={brand.label} className={linkClass}>
                    <img src={`https://api.iconify.design/${brand.icon}.svg`} alt={brand.label} width="14" height="14" loading="lazy" className="h-3.5 w-3.5 object-contain" />
                    <span>{socialUsername(social.url) || brand.label}</span>
                  </a>
                );
              })}
              {(p.contact_details?.emails || []).slice(0, 1).map((email) => (
                <a key={email} href={`mailto:${email}`} className={`hidden xl:inline-flex ${linkClass.replace('inline-flex ', '')}`}><Mail size={13} aria-hidden="true" /> {email}</a>
              ))}
              {(p.contact_details?.phones || []).slice(0, 1).map((phone) => (
                <a key={phone} href={`tel:${phone}`} className={linkClass}><Phone size={13} aria-hidden="true" /> {phone}</a>
              ))}
              <button type="button" onClick={openContactEditor} title="Edit company contacts and social profiles" aria-label="Edit company contacts and social profiles" className={`grid h-10 w-10 place-items-center rounded-lg text-[#737373] hover:bg-[#f0eee7] hover:text-[#0a0a0a] ${FOCUS}`}><Pencil size={14} /></button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onShowRoster ? <button type="button" onClick={onShowRoster} className={`inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#e3e0db] bg-white px-3 text-[12.5px] font-medium text-[#3d4249] hover:border-[#c9c5bc] hover:text-[#0a0a0a] ${FOCUS}`}>
              <LayoutGrid size={14} aria-hidden="true" /> {t('hyperDash.agents', 'Agents')}
            </button> : null}
            <button type="button" onClick={refresh} aria-label={t('hyperDash.refresh', 'Refresh')} className={`inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#e3e0db] bg-white px-3 text-[12.5px] font-medium text-[#3d4249] hover:border-[#c9c5bc] hover:text-[#0a0a0a] ${FOCUS}`}>
              <RefreshCw size={14} aria-hidden="true" /> <span className="hidden sm:inline">{t('hyperDash.refresh', 'Refresh')}</span>
            </button>
          </div>
        </header>

        <div className="hm-hq-grid px-4 py-4 sm:px-6 sm:py-5">
          <HqCard area="overview" title="Company overview" icon={Building2}>
            <div className="hm-hq-overview-body">
              <div className="min-w-0">
                {p.tagline ? <p className="text-[17px] font-semibold leading-[26px] text-[#1f2328]">{p.tagline}</p> : null}
                {p.what_it_does ? <p className="mt-2 text-[13.5px] leading-[22px] text-[#4f545a]">{p.what_it_does}</p> : null}
                <dl className="hm-hq-facts mt-4">
                  {c.mission ? <Fact icon={Target} label={t('hyperDash.mission', 'Mission')}>{c.mission}</Fact> : null}
                  {p.icp ? <Fact icon={Search} label="Customers">{p.icp}</Fact> : null}
                  {p.positioning ? <Fact icon={Sparkles} label="Positioning">{p.positioning}</Fact> : null}
                  {p.location ? <Fact icon={MapPin} label="Location">{p.location}</Fact> : null}
                </dl>
              </div>
              {c.website ? <div className="min-w-0">
                <WebsitePreview
                  image={c.screenshot}
                  source={c.website_visual_source}
                  website={c.website}
                  company={c.company}
                  tagline={p.tagline}
                  loading={Boolean(c.screenshot_pending)}
                  compact
                  className="w-full shadow-[0_10px_30px_rgba(10,10,10,0.05)]"
                />
              </div> : null}
            </div>
          </HqCard>

          <RuntimeCard status={runtimeStatus} room={runtimeRoom} agendas={agendas} loading={hq.work === undefined} />

          <TeamCard members={members} onOpenTeammate={onOpenTeammate} onViewProfile={team?.length ? undefined : setViewingProfile} plannedCount={tasks.length} plannedWork={plannedWork} />

          <WakesCard groups={wakeGroups} scheduledMembers={members.filter((member) => member.state === 'scheduled')} loading={sideLoading} now={now} />

          <DeliverablesCard rows={deliverableRows} loading={hq.library === undefined && !(c.deliverables || []).length} now={now} onOpenRoom={onOpenRoom} onOpenLibrary={openLibrary} />

          {/* Durable company memory, onboarding web sources and research. */}
          <HqCard area="files" title={t('hyperDash.knowledge', 'Company knowledge')} icon={BookOpen} count={(c.documents || []).length + webArtifacts.length || undefined}>
            {!(c.documents || []).length && !webArtifacts.length && !research.length ? <EmptyNote>Documents filed to company memory appear here.</EmptyNote> : null}
            {(c.documents || []).length ? <ul className="space-y-0.5">
              {(c.documents || []).map((documentTitle) => (
                <li key={documentTitle} className="flex min-h-[32px] items-center gap-2 text-[13px] text-[#3f3d39]">
                  <FileText size={14} className="shrink-0 text-[#a3a3a3]" aria-hidden="true" /> <span className="min-w-0 truncate">{documentTitle}</span>
                </li>
              ))}
            </ul> : null}
            {webArtifacts.length ? <ul className="mt-2 space-y-1.5">
              {webArtifacts.map((artifact) => (
                <li key={artifact.id} className="flex items-stretch gap-1">
                  <button type="button" onClick={() => setSelectedWebArtifact(artifact)}
                    className={`flex min-h-[48px] min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#eeece6] bg-white px-3 py-2 text-left text-[13px] text-[#3f3d39] hover:border-[#9fb4cf] ${FOCUS}`}>
                    <Globe size={14} className="shrink-0 text-[#2f74e0]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{artifact.title || artifact.url}</span>
                      <span className="block truncate text-[11.5px] text-[#8b8b86]">{(artifact.content_chars || 0).toLocaleString()} characters · {artifact.provider || 'web crawl'}</span>
                    </span>
                  </button>
                  <a href={apiClient.hyperCompanyWebArtifactPreviewUrl(artifact.id)} target="_blank" rel="noreferrer" aria-label={`Open ${artifact.title || 'web source'} in a new tab`} title="Open in a new tab"
                    className={`grid w-10 shrink-0 place-items-center rounded-xl text-[#8b8b86] hover:bg-[#f0eee7] hover:text-[#1f2328] ${FOCUS}`}><ArrowUpRight size={15} /></a>
                </li>
              ))}
            </ul> : null}
            {research.length ? <>
              <h3 className="mb-1 mt-4 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#8b8b86]">{t('hyperDash.research', 'Market research')}</h3>
              <ul className="space-y-0.5">
                {research.map((researchItem, index) => (
                  <li key={`${researchItem.url || 'research'}-${index}`}>
                    <a href={researchItem.url} target="_blank" rel="noreferrer" className={`group block rounded-lg px-1 py-1.5 hover:bg-[#f7f6f2] ${FOCUS}`}>
                      <span className="block text-[13px] font-medium leading-5 text-[#262b31] group-hover:underline">{researchItem.title || researchItem.url}</span>
                      {researchItem.snippet ? <span className="mt-0.5 line-clamp-2 block text-[12px] leading-[18px] text-[#7a7f86]">{researchItem.snippet}</span> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </> : null}
            {(c.documents || []).length || webArtifacts.length ? <p className="mt-3 text-[11.5px] leading-[18px] text-[#8b8b86]">{t('hyperDash.filedTo', 'Filed to HIVEMIND memory — open a web source to see the exact page your team can recall.')}</p> : null}
          </HqCard>
        </div>

        <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-6 text-[12px] text-[#7a7f86] sm:px-6">
          {onOpenRoom ? <button type="button"
            onClick={() => state.hq_room_id && onOpenRoom?.({ id: c.room_id || state.hq_room_id, name: c.room_name })}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#e3e0db] bg-white px-3 text-[12.5px] font-medium text-[#1f2328] hover:border-[#c9c5bc] ${FOCUS}`}>
            <Sparkles size={14} className="text-violet-500" aria-hidden="true" /> {c.room_name || `${c.company} — HQ`} <ArrowUpRight size={14} className="text-[#a3a3a3]" aria-hidden="true" />
          </button> : null}
          <span className="inline-flex items-center gap-1.5"><Building2 size={13} aria-hidden="true" /> {t('hyperDash.onboardedAt', 'Onboarded')} {c.onboarded_at ? new Date(c.onboarded_at).toLocaleDateString() : ''}</span>
          {allowOnboarding ? <button type="button" onClick={() => setConfirmRerun(true)} className={`min-h-[40px] rounded-lg px-1 text-[#2559a8] hover:underline ${FOCUS}`}>{t('hyperDash.rerun', 'Re-run onboarding')}</button> : null}
        </footer>
      </div>

      {editingContacts && contactDraft ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/25 p-4" role="dialog" aria-modal="true" aria-label="Edit company contacts">
          <div className="w-full max-w-[620px] rounded-lg border border-[#d9dee5] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ece9e3] px-5 py-4">
              <div><h2 className="text-[16px] font-semibold text-[#0a0a0a]">Company contact details</h2><p className="mt-1 text-[11.5px] text-[#737373]">These corrections become the context your rooms use.</p></div>
              <button type="button" onClick={() => setEditingContacts(false)} className={`h-10 w-10 grid place-items-center rounded-lg text-[#737373] hover:text-[#0a0a0a] ${FOCUS}`} title="Close" aria-label="Close"><X size={16} /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-[11px] font-semibold text-[#525252]">Emails<textarea value={contactDraft.emails} onChange={(event) => setContactDraft({ ...contactDraft, emails: event.target.value })} className="mt-1.5 min-h-16 w-full resize-y rounded-md border border-[#d9dee5] p-2 text-[12px] font-mono text-[#0a0a0a] outline-none focus:border-[#117dff]" placeholder="hello@company.com" /></label>
              <label className="block text-[11px] font-semibold text-[#525252]">Phone numbers<textarea value={contactDraft.phones} onChange={(event) => setContactDraft({ ...contactDraft, phones: event.target.value })} className="mt-1.5 min-h-16 w-full resize-y rounded-md border border-[#d9dee5] p-2 text-[12px] font-mono text-[#0a0a0a] outline-none focus:border-[#117dff]" placeholder="+49 ..." /></label>
              <div><span className="text-[11px] font-semibold text-[#525252]">Social profiles</span><div className="mt-1.5 space-y-2">{contactDraft.social_profiles.map((social, index) => <div key={`${social.platform}-${index}`} className="grid grid-cols-[120px_1fr] gap-2"><input aria-label="Platform" value={social.platform} onChange={(event) => { const next = [...contactDraft.social_profiles]; next[index] = { ...social, platform: event.target.value }; setContactDraft({ ...contactDraft, social_profiles: next }); }} className="rounded-md border border-[#d9dee5] px-2 py-1.5 text-[12px]" placeholder="platform" /><input aria-label="Profile URL" value={social.url} onChange={(event) => { const next = [...contactDraft.social_profiles]; next[index] = { ...social, url: event.target.value }; setContactDraft({ ...contactDraft, social_profiles: next }); }} className="rounded-md border border-[#d9dee5] px-2 py-1.5 text-[12px] font-mono" placeholder="https://..." /></div>)}</div><button type="button" onClick={() => setContactDraft({ ...contactDraft, social_profiles: [...contactDraft.social_profiles, { platform: '', url: '' }] })} className="mt-2 min-h-[40px] text-[11px] font-semibold text-[#117dff]">Add social profile</button></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#ece9e3] px-5 py-3"><button type="button" onClick={() => setEditingContacts(false)} className="min-h-[40px] px-3 py-2 text-[12px] font-semibold text-[#525252]">Cancel</button><button type="button" onClick={saveContacts} disabled={savingContacts} className="min-h-[40px] rounded-md bg-[#0a0a0a] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">{savingContacts ? 'Saving...' : 'Save details'}</button></div>
          </div>
        </div>
      ) : null}

      {viewingProfile && (
        <EmployeeProfileModal
          member={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onShowRoster={onShowRoster}
        />
      )}

      {confirmRerun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !resetting && setConfirmRerun(false)}>
          <div className="bg-white border border-[#e3e0db] rounded-2xl max-w-[440px] w-full p-6" role="dialog" aria-modal="true" aria-label={t('hyperDash.rerunTitle', 'Start fresh?')} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[17px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('hyperDash.rerunTitle', 'Start fresh?')}</h3>
            <p className="text-[13px] text-[#525252] mt-2 leading-relaxed">
              {t('hyperDash.rerunBody', 'Re-running onboarding clears your current company profile, mission, tasks, research and homepage capture, and lets you set it up from scratch.')}
            </p>
            <p className="text-[12.5px] text-[#0a0a0a] mt-2 leading-relaxed">
              {t('hyperDash.rerunRooms', 'Your existing rooms stay — including any task rooms. Delete each one manually from the rooms rail if you want a clean slate.')}
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button type="button" onClick={() => setConfirmRerun(false)} disabled={resetting}
                className="min-h-[40px] text-[12.5px] font-semibold text-[#525252] hover:text-[#0a0a0a] px-3.5 py-2 rounded-lg">
                {t('hyperDash.cancel', 'Cancel')}
              </button>
              <button type="button" onClick={doRerun} disabled={resetting}
                className="min-h-[40px] flex items-center gap-2 text-[12.5px] font-semibold text-white bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-50 px-3.5 py-2 rounded-lg">
                {resetting ? <Spinner size="w-3.5 h-3.5" colorClass="border-white" /> : null}
                {t('hyperDash.rerunConfirm', 'Clear & start fresh')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
