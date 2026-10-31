import { readRuntimeRoute } from '../shared/runtime-presentation-cache';
import { fetchRuntime } from '../shared/runtime-admission';
import { RUNTIME_WORKSPACE, openBrainChat } from '../shared/runtime-workspace';
import RuntimeAvatar from '../shared/RuntimeAvatar';
import { ownedOpenDotRoomStatuses, withEmployeeTaskStatuses, reconnectingOpenDotRoomStatuses, withRuntimeReviewDecisions } from '../shared/open-dot-room-status';
import { workspaceModeForPath, employeeAppsPath } from '../shared/workspace-mode';
import { agentRoster } from '../shared/agent-roster';
import { focusCardInRoom, waitingEmployeeIds } from '../shared/needs-you';
import { setEmployeeRoomOpen, useRuntimeEnabled } from '../shared/runtime-enabled';
import { hasOpenDotEmployeeBinding, openDotEmployeeIdFromPath, openDotEmployeePath } from '../shared/open-dot-employee-route';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AgentRoomStatus, { aggregateAgentRooms } from './AgentRoomStatus';
import WorkspaceModeSwitcher from './WorkspaceModeSwitcher';
import BrainModeIcon from './BrainModeIcon';
import DesktopBrainNavigation from './DesktopBrainNavigation';
import DesktopHyperAgentsNavigation, { HYPERAGENT_WIDTHS, columnsForWidth } from './DesktopHyperAgentsNavigation';
import AutonomyDial from './AutonomyDial';
import { CALENDAR_PATH, LIBRARY_PATH } from './sidebar-tools';
import AnatomyModeToggle from './AnatomyModeToggle';
import LangSwitcher from './LangSwitcher';
import WorkspaceNotifications from './WorkspaceNotifications';
import {
  LayoutDashboard,
  Moon,
  Brain,
  Key,
  Cable,
  User,
  Users,
  UserPlus,
  Plus,
  FlaskConical,
  Settings,
  LogOut,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  Globe,
  Server,
  Network,
  Cpu,
  BookOpen,
  Bot,
  Mic,
  Building2,
  CalendarDays,
  Gauge,
  FolderKanban,
  FileSearch,
  Waypoints,
  Sliders,
  Star,
  Clock,
  PhoneCall,
  Database,
  Monitor,
  MessageCircle,
  Library,
  Inbox,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import { isNativeApp } from '../shared/native-app';
import { openNativeRoom } from '../shared/native-room';
import apiClient from '../shared/api-client';
import { useUsage } from '../shared/useUsage';
import CreditBalance from '../shared/CreditBalance';
import AgentAvatar from '../hyperagents/AgentAvatar';
import { fillCopy, usePlanLabel } from './sidebar-copy';
import './needs-you.css';

const CreateEmployeeDialog = React.lazy(() => import('./CreateEmployeeDialog'));
const GetStartedCard = React.lazy(() => import('./GetStartedCard'));
const NeedsYouPanel = React.lazy(() => import('./NeedsYouPanel'));
const CompanyWorkspaceOverlay = React.lazy(() => import('../shared/CompanyWorkspaceOverlay'));

/** Build nav sections, conditionally including admin items. Filtered by activeSection. */
function buildNavSections({ showWebAdmin, showEnterpriseTeam, t, activeSection = 'hivemind', team = [], runtimeEnabled = true }) {
  const tt = (k, def) => t(`sidebar.${k}`, { defaultValue: def });
  const advancedItems = [
    // Agent Swarm + Engine hidden for now (kept routable, just off the sidebar).
    { to: '/hivemind/app/mcp',        icon: Server,       label: tt('mcpServer', 'MCP Server') },
    { to: '/hivemind/app/keys',       icon: Key,          label: tt('apiKeys', 'API Keys') },
    { to: '/hivemind/app/evaluation', icon: FlaskConical, label: tt('evaluation', 'Evaluation') },
  ];

  // Web Admin used to be a separate entry. It now lives as a collapsible
  // "System Health" drawer inside /web (Web Studio) — same admin gate.
  const adminItems = [
    { to: '/hivemind/app/workspace', icon: Building2, label: tt('workspaceAdmin', 'Workspace Admin') },
    { to: '/hivemind/app/employees', icon: Bot,      label: tt('hyperAgents', 'Hyper Agents') },
    { to: '/hivemind/app/hermes',    icon: Cpu,      label: tt('hermesAgents', 'Hermes Agents') },
  ];

  if (activeSection === 'hyperagents') {
    return [
      { label: null, items: [{ to: '/hivemind/app/employees', icon: Bot, label: tt('hyperAgents', 'Hyper Agents') }] },
      {
        label: tt('groups.workspaceAdmin', 'Workspace Admin'),
        items: adminItems,
      },
    ];
  }

  if (activeSection === 'tara') {
    return [
      {
        label: null,
        items: [
          { to: '/hivemind/app/tara', icon: Mic, label: tt('tara', 'TARA × HIVE'), children: [
            { to: '/hivemind/app/tara?tab=skills',    icon: Sliders,   label: tt('taraSkills', 'Skills') },
            { to: '/hivemind/app/tara?tab=leads',     icon: Star,      label: tt('taraLeads', 'Leads') },
            { to: '/hivemind/app/tara?tab=history',   icon: Clock,     label: tt('taraHistory', 'Call History') },
            { to: '/hivemind/app/tara?tab=insights',  icon: Brain,     label: tt('taraInsights', 'Insights') },
            { to: '/hivemind/app/tara?tab=usage',     icon: Gauge,     label: tt('taraUsage', 'Usage') },
            { to: '/hivemind/app/tara?tab=outbound',  icon: PhoneCall, label: tt('taraOutbound', 'Outbound') },
            { to: '/hivemind/app/tara?tab=campaigns', icon: Waypoints, label: tt('taraCampaigns', 'Campaigns') },
          ]},
        ],
      },
      {
        label: tt('groups.taraMemory', 'TARA Memory'),
        items: [
          { to: '/hivemind/app/tara?tab=memory', icon: Database, label: tt('taraMemory', 'TARA-MEMORY') },
        ],
      },
    ];
  }

  // Default: hivemind
  return [
    {
      label: null,
      items: [
        { to: '/hivemind/app/overview', icon: LayoutDashboard, label: tt('overview', 'Overview') },
        { to: '/hivemind/app/overview/dreaming', icon: Moon, label: tt('dreaming', 'Dreaming') },
      ],
    },
    {
      label: tt('groups.yourTeam', 'Your Team'),
      items: [
        ...(runtimeEnabled ? [{ to: '/hivemind/app/employee/harness', icon: Cpu, label: tt('runTime', 'Run Time'), runtime: true }] : []),
        ...team.map(agent => ({ to: '/hivemind/app/overview', agent, label: agent.name })),
        { to: '/hivemind/app/employee/create', icon: Plus, label: tt('createEmployee', 'Create employee'), createEmployee: true },
      ],
    },
    {
      label: tt('groups.yourBrain', 'Your Brain'),
      items: [
        { to: '/hivemind/app/overview/new', icon: MessageCircle, label: tt('brainChat', 'Chat'), brainChat: true },
        { to: '/hivemind/app/connectors', icon: Cable,    label: tt('connectors',  'Connectors') },
        { to: '/hivemind/app/memories',   icon: Brain,    label: tt('memories',    'Memories') },
        { to: '/hivemind/app/meeting-notes', icon: Mic,   label: tt('meetingNotes', 'AI Meeting Notes') },
        { to: '/hivemind/app/graph',      icon: Network,  label: tt('graphMain',   'Memory Graph') },
        { to: '/hivemind/app/knowledge',  icon: BookOpen, label: tt('knowledge',   'Upload Everything') },
      ],
    },
    {
      label: tt('groups.workspaceAdmin', 'Workspace Admin'),
      items: [
        { to: '/hivemind/app/workspace',      icon: Building2,    label: tt('workspaceAdmin', 'Workspace Admin'), children: [
          { to: '/hivemind/app/workspace?tab=members',   icon: Users,        label: tt('orgMembers', 'Org Members') },
          { to: '/hivemind/app/workspace?tab=teams',     icon: User,         label: tt('teamMembers', 'Team Members') },
          { to: '/hivemind/app/workspace?tab=projects',  icon: FolderKanban, label: tt('projects', 'Projects') },
          { to: '/hivemind/app/workspace?tab=invites',   icon: UserPlus,     label: tt('invites', 'Invites') },
          { to: '/hivemind/app/workspace?tab=cognition', icon: Waypoints,    label: tt('cognitiveLayer', 'Cognitive Layer') },
        ]},
      ],
    },
    // Web Intelligence remains routable and entitled server-side, but is
    // intentionally not advertised in the HIVE sidebar at this stage.
    {
      label: tt('groups.advanced', 'Advanced'),
      items: advancedItems,
    },
  ];
}

/** Runtime's accepted review decisions for the cached Runtime room; unavailable reads keep Open Dot's view. */
async function runtimeReviewDecisions(scope, signal) {
  if (window.location.hostname !== 'runtime-runner.singulancelabs.com') return undefined;
  // The open Runtime room names its root directly; otherwise use the room cached when it was last opened.
  const current = window.location.pathname.match(/^\/hivemind\/app\/employee\/harness\/session\/(session-[a-z0-9-]+)/i);
  const route = current ? current[1] : readRuntimeRoute(scope);
  const sessionId = route && route.split('/').pop();
  if (!sessionId) return undefined;
  try {
    const response = await fetchRuntime(`/api/hivemindHq/teamStatus?sessionId=${encodeURIComponent(sessionId)}`, { credentials: 'same-origin', cache: 'no-store', signal });
    return response.ok ? (await response.json())?.employees : undefined;
  } catch { return undefined; }
}

const TEAM_RETRY_DELAYS_MS = [250, 1000, 2000, 4000, 8000, 15000, 30000];
export default function Sidebar({
  activeSection = 'hivemind',
  collapsed = false,
  onCollapsedChange,
  mobileDrawer = false,
  mobileRoster = false,
  onOpenEmployee,
  portalContainer,
  contextPath,
  desktopColumns = 3,
  onDesktopColumnsChange,
}) {
  const { t } = useTranslation('dashboard');
  const formatPlanLabel = usePlanLabel();
  const { logout, org, user } = useAuth();
  const runtimeEnabled = useRuntimeEnabled();
  const location = useLocation();
  const navigate = useNavigate();
  const scope = user?.id && org?.id ? `${user.id}:${org.id}` : null;
  const [teamData, setTeamData] = useState(() => ({ scope, profiles: agentRoster.peek(scope) || [] }));
  const team = teamData.scope === scope ? teamData.profiles : agentRoster.peek(scope) || [];
  const setTeam = useCallback(value => setTeamData(previous => {
    const current = previous.scope === scope ? previous.profiles : agentRoster.peek(scope) || [];
    return { scope, profiles: typeof value === 'function' ? value(current) : value };
  }), [scope]);
  const [rosterPage, setRosterPage] = useState(0);
  const rosterGesture = useRef(null);
  const rosterSwiped = useRef(false);
  const profileImage = user?.avatar_url || user?.picture || user?.photoURL;
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  useEffect(() => setProfileImageFailed(false), [profileImage]);
  useEffect(() => setRosterPage(page => Math.min(page, Math.max(0, Math.ceil(team.length / 5) - 1))), [team.length]);
  const [rosterProfileOpen, setRosterProfileOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const teamMode = workspaceModeForPath(location.pathname) === 'hyperagents';
  const [desktopRosterViewport, setDesktopRosterViewport] = useState(() => window.matchMedia('(min-width: 901px)').matches);
  const [fallbackColumns, setFallbackColumns] = useState(3);
  const rosterColumns = onDesktopColumnsChange ? desktopColumns : fallbackColumns;
  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px)');
    const update = () => setDesktopRosterViewport(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const desktopHyperAgents = teamMode && !mobileDrawer && !mobileRoster && desktopRosterViewport;
  const resizeGesture = useRef(false);
  const resizeRoster = count => {
    if (count === 0) { onCollapsedChange?.(true); return; }
    (onDesktopColumnsChange || setFallbackColumns)(count);
    onCollapsedChange?.(false);
  };
  const [selectedAgent, setSelectedAgent] = useState(null);
  const selectionPending = useRef(null);
  const currentPath = useRef(location.pathname);
  currentPath.current = location.pathname;
  const [openingAgent, setOpeningAgent] = useState(null);
  const [teamError, setTeamError] = useState('');
  const [nativeRooms, setRooms] = useState([]);
  const [dotRooms, setDotRooms] = useState({});
  const [liveDotRooms, setLiveDotRooms] = useState({});
  const liveDotSnapshot = useRef(null);
  const liveStatusSignal = useRef(null);
  const [scheduledEmployees, setScheduledEmployees] = useState([]);
  // Only OpenDot's server status shows an employee as working, waiting or failed; a native room for another id keeps its presence and unread marks only.
  const presenceOnly = room => room.id === 'runtime' ? room : { ...room, status: undefined, activity: undefined, running: false, actionRequired: false, waitingForAnswer: false, error: false };
  const rooms = [...nativeRooms.map(presenceOnly), ...Object.values(dotRooms).flat(), ...Object.values(liveDotRooms).flat(), ...scheduledEmployees.map(id => ({ id, scheduled: true, scheduleOnly: true, updatedAt: 0 }))];
  const dotReadAt = useRef({});
  const lastDotPush = useRef(0);
  // Last authoritative task state per employee from the status read. Live room
  // frames carry rooms but not task state, so every room update re-applies it.
  const taskStatusRef = useRef(new Map());
  const withTaskStatus = rows => withEmployeeTaskStatuses(rows, [...taskStatusRef.current].map(([employeeId, status]) => ({ employeeId, status })));
  useEffect(() => {
    setDotRooms({});
    const key = `hivemind.dot-read-at:${scope}`;
    try { dotReadAt.current = JSON.parse(localStorage.getItem(key) || '{}'); } catch { dotReadAt.current = {}; }
    const controller = new AbortController();
    let timer;
    let loading = false;
    let failures = 0;
    let retryAllowed = true;
    let quiet = false;
    const load = async () => {
      if (!scope || document.hidden || controller.signal.aborted || loading) return;
      // Live Open Dot room frames already carry these statuses; skip the read
      // while they keep arriving and resume when they stop.
      if (Date.now() - lastDotPush.current < 20000) { timer = setTimeout(load, 20000); return; }
      loading = true;
      let responseStatus;
      try {
        const response = await fetchRuntime('/api/hivemind/employees/status', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        responseStatus = response.status;
        // A fresh Runtime pane can finish its cookie exchange after this first
        // read. Retry authorization a couple of times, then stop until the
        // authenticated session event or a visible-page refresh arrives.
        retryAllowed = ![401, 403, 404].includes(response.status)
          || ([401, 403].includes(response.status) && failures < 2);
        if (!response.ok) throw new Error('Status unavailable');
        failures = 0;
        const result = await response.json();
        // A team with no active task or running room is read less often; any
        // assignment, room activity or visibility change returns to 15 s.
        quiet = Array.isArray(result.employees) && result.employees.every(entry => ['idle', 'paused', 'archived', undefined].includes(entry?.status) && !(entry?.rooms ?? []).some(room => room?.running || room?.live))
          && (!Array.isArray(result.taskStatus) || result.taskStatus.every(entry => entry?.status === 'idle' || entry?.status === 'accepted'));
        if (Array.isArray(result.taskStatus)) {
          result.taskStatus = withRuntimeReviewDecisions(result.taskStatus, await runtimeReviewDecisions(scope, controller.signal));
          taskStatusRef.current = new Map(result.taskStatus.filter(entry => typeof entry?.employeeId === 'string' && entry.status && entry.status !== 'idle').map(entry => [entry.employeeId, entry.status]));
        }
        if (!controller.signal.aborted && result.version === 1) setDotRooms(withTaskStatus(ownedOpenDotRoomStatuses(result.employees, agentRoster.peek(scope) || [], dotReadAt.current)));
      } catch { failures += 1; if (!controller.signal.aborted) setDotRooms(previous => reconnectingOpenDotRoomStatuses(previous, responseStatus)); }
      finally { loading = false; if (!controller.signal.aborted && retryAllowed) timer = setTimeout(load,
        responseStatus === 401 || responseStatus === 403 ? (failures === 1 ? 250 : 1000) : failures === 0 && quiet ? 45000 : Math.min(300000, 15000 * (2 ** Math.min(failures, 5)))); }
    };
    const visible = () => { clearTimeout(timer); if (!document.hidden) load(); };
    load();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('hivemind:session-established', visible);
    window.addEventListener('hm:employees-changed', visible);
    window.addEventListener('hivemind:employee-status-changed', visible);
    return () => { controller.abort(); clearTimeout(timer); window.removeEventListener('hivemind:employee-status-changed', visible); document.removeEventListener('visibilitychange', visible); window.removeEventListener('hivemind:session-established', visible); window.removeEventListener('hm:employees-changed', visible); };
  }, [scope]);
  const teamScope = useRef(null);
  const [teamLoadError, setTeamLoadError] = useState(false);
  const [teamRetry, setTeamRetry] = useState(0);
  const rosterRefreshRevision = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    if (teamScope.current !== scope) {
      teamScope.current = scope;
      setTeam(agentRoster.peek(scope) || []);
      setTeamLoadError(false);
    }
    let forceRefresh = rosterRefreshRevision.current !== teamRetry;
    rosterRefreshRevision.current = teamRetry;
    let retryTimer;
    let attempts = 0;
    const load = async () => {
      if (!scope || controller.signal.aborted) return;
      try {
        const profiles = await agentRoster.load(scope, { force: forceRefresh || attempts > 0 });
        if (controller.signal.aborted || teamScope.current !== scope) return;
        setTeam(profiles);
        forceRefresh = false;
        setTeamLoadError(false);
      } catch {
        if (controller.signal.aborted || teamScope.current !== scope) return;
        // A Runtime or HyperAgent restart takes up to a minute: keep retrying across it and only
        // report the failure once brief blips are ruled out.
        attempts += 1;
        if (attempts >= 3) setTeamLoadError(true);
        if (attempts <= TEAM_RETRY_DELAYS_MS.length) retryTimer = setTimeout(load, TEAM_RETRY_DELAYS_MS[attempts - 1]);
      }
    };
    const refresh = () => { clearTimeout(retryTimer); attempts = 0; forceRefresh = true; load(); };
    const nativeRoster = event => { if (event.detail?.scope !== scope || !Array.isArray(event.detail.profiles)) return; clearTimeout(retryTimer); setTeam(event.detail.profiles); setTeamLoadError(false); };
    window.addEventListener('hivemind:runtime-roster',nativeRoster);
    load();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('hivemind:session-established', refresh);
    window.addEventListener('hm:employees-changed', refresh);
    return () => { controller.abort(); clearTimeout(retryTimer); window.removeEventListener('hivemind:runtime-roster',nativeRoster); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('hivemind:session-established', refresh); window.removeEventListener('hm:employees-changed', refresh); };
  }, [scope, setTeam, teamRetry]);

  useEffect(() => {
    const selection = event => {
      if (!/^\/hivemind\/app\/(overview|employee\/harness)(\/|$)/.test(currentPath.current)) return;
      if (selectionPending.current && selectionPending.current !== (event.detail?.id || 'runtime')) return;
      selectionPending.current = null;
      setSelectedAgent(event.detail?.id === 'runtime' ? null : event.detail?.id || null);
    };
    const activity = event => setRooms(event.detail?.rooms || []);
    const schedules = event => setScheduledEmployees(Array.isArray(event.detail?.employees) ? event.detail.employees.filter(id => typeof id === 'string') : []);
    setScheduledEmployees([]);
    setLiveDotRooms({});
    liveDotSnapshot.current = null;
    window.addEventListener('hivemind:agent-schedules', schedules);
    window.dispatchEvent(new Event('hivemind:request-agent-schedules'));
    setRooms([]);
    setDotRooms({});
    const dotActivity = event => {
      // A push that carries the server's agent status replaces the next read; live room frames and older frames do not.
      if (event.detail?.clear !== true && (event.detail?.employees ?? []).some(entry => entry?.agent)) lastDotPush.current = Date.now();
      if (event.detail?.clear === true) { liveDotSnapshot.current = null; setLiveDotRooms({}); setDotRooms(previous => reconnectingOpenDotRoomStatuses(previous)); return; }
      const employeeId = event.detail?.employeeId;
      if (typeof employeeId !== 'string' || !Array.isArray(event.detail?.rooms)) return;
      const entries = event.detail.employees ?? [{ employeeId, dotId: event.detail.dotId, rooms: event.detail.rooms }];
      if (Array.isArray(entries) && entries.length <= 64 && entries.some(entry => entry.rooms?.some(room => room.live === true))) {
        // The stored word never shows; a change of it only asks for a fresh server status read.
        const signal = entries.map(entry => `${entry.employeeId}:${entry.rooms?.map(room => room.status).join(',')}`).join('|');
        if (liveStatusSignal.current !== null && liveStatusSignal.current !== signal) window.dispatchEvent(new Event('hivemind:employee-status-changed'));
        liveStatusSignal.current = signal;
        liveDotSnapshot.current = entries;
        setLiveDotRooms(withTaskStatus(ownedOpenDotRoomStatuses(entries, agentRoster.peek(scope) || [], dotReadAt.current)));
        return;
      }
      const verified = ownedOpenDotRoomStatuses(entries, agentRoster.peek(scope) || [], dotReadAt.current);
      for (const entry of Array.isArray(entries) ? entries : []) {
        if (Number.isFinite(entry.readAt) && entry.readAt >= 0 && Object.hasOwn(verified, entry.employeeId)) dotReadAt.current[entry.employeeId] = entry.readAt;
      }
      try { localStorage.setItem(`hivemind.dot-read-at:${scope}`, JSON.stringify(dotReadAt.current)); } catch { /* Optional local watermark. */ }
      setDotRooms(previous => withTaskStatus({ ...previous, ...ownedOpenDotRoomStatuses(entries, agentRoster.peek(scope) || [], dotReadAt.current) }));
    };
    window.addEventListener('hivemind:open-dot-rooms', dotActivity);
    window.addEventListener('hivemind:agent-rooms', activity);
    window.addEventListener('hivemind:agent-selected', selection);
    window.dispatchEvent(new Event('hivemind:request-agent-rooms'));
    return () => { window.removeEventListener('hivemind:agent-schedules', schedules); window.removeEventListener('hivemind:open-dot-rooms', dotActivity); window.removeEventListener('hivemind:agent-selected', selection); window.removeEventListener('hivemind:agent-rooms', activity); };
  }, [user?.id, org?.id]);

  useEffect(() => {
    const routeEmployeeId = openDotEmployeeIdFromPath(contextPath || location.pathname);
    const boundEmployee = routeEmployeeId && team.find(employee => employee.id?.toLowerCase() === routeEmployeeId.toLowerCase() && openDotEmployeePath(employee));
    if (boundEmployee) setSelectedAgent(routeEmployeeId);
    else if (!/^\/hivemind\/app\/(overview|employee\/harness)(\/|$)/.test(location.pathname)) setSelectedAgent(null);
  }, [location.pathname, contextPath, team]);

  useEffect(() => {
    if (liveDotSnapshot.current) setLiveDotRooms(withTaskStatus(ownedOpenDotRoomStatuses(liveDotSnapshot.current, team, dotReadAt.current)));
  }, [team]);

  const openAgent = async (event, agent) => {
    event.preventDefault();
    if (openingAgent) return false;
    // A company without Runtime has no Chief of Staff room to open.
    if (agent.id === 'runtime' && !runtimeEnabled) return false;
    if (onOpenEmployee) {
      const previousSelection = selectedAgent;
      setSelectedAgent(agent.id === 'runtime' ? null : agent.id);
      try {
        const opened = await onOpenEmployee(agent);
        if (opened === false) setSelectedAgent(previousSelection);
        return opened;
      } catch (error) {
        setSelectedAgent(previousSelection);
        throw error;
      }
    }
    // Brain's host has no Runtime starter; Runtime's room lives on the Runtime host.
    if (agent.id === 'runtime' && window.location.hostname === 'next.singulancelabs.com') { window.location.assign(RUNTIME_WORKSPACE); return true; }
    const cachedRuntime = agent.id === 'runtime' && window.location.hostname === 'runtime-runner.singulancelabs.com' && readRuntimeRoute(scope);
    if (cachedRuntime) { setSelectedAgent(null); navigate(cachedRuntime); return true; }
    const openDotPath = openDotEmployeePath(agent);
    if (openDotPath) {
      selectionPending.current = null;
      setTeamError('');
      setSelectedAgent(agent.id);
      // The packaged app shows the room natively: ask for it on the tap itself, not after the route's page has loaded.
      if (isNativeApp()) openNativeRoom(agent.id, { scope: org?.id && user?.id ? `${org.id}:${user.id}` : undefined }).catch(() => { /* The route's page offers Try again. */ });
      navigate(openDotPath);
      return true;
    }
    if (hasOpenDotEmployeeBinding(agent)) {
      setTeamError(tt('teamWorkspacePending', 'This employee’s computer workspace is still being set up. Try again shortly.'));
      return false;
    }
    const previousSelection = selectedAgent;
    setSelectedAgent(agent.id === 'runtime' ? null : agent.id);
    selectionPending.current = agent.id;
    setOpeningAgent(agent.id); setTeamError('');
    document.documentElement.dataset.agentRoomOpening = 'true';
    const previousStart = window.__HIVEMIND_START_AGENT__;
    const needsNavigation = !/^\/hivemind\/app\/(overview|employee\/harness)(\/|$)/.test(location.pathname);
    // Native-Harness employee rooms share Runtime's route; tell a company without Runtime that this visit is deliberate.
    if (needsNavigation) { setEmployeeRoomOpen(true); navigate('/hivemind/app/employee/harness'); }
    try {
      let start;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        start = window.__HIVEMIND_START_AGENT__;
        if (typeof start === 'function' && (!needsNavigation || start !== previousStart || start?.nativePane || window.__DSH_EMBED_APP__)) break;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (typeof start !== 'function' || (needsNavigation && start === previousStart && !start?.nativePane && !window.__DSH_EMBED_APP__) || !await start(agent.id)) throw new Error('selection unavailable');
      setSelectedAgent(agent.id === 'runtime' ? null : agent.id);
      return true;
    } catch { setSelectedAgent(previousSelection); setTeamError(tt('teamOpenError', 'Could not open this agent. Please try again.')); return false; }
    finally { selectionPending.current = null; setOpeningAgent(null); delete document.documentElement.dataset.agentRoomOpening; }
  };
  // Full-page return from the shared Apps shell uses the same existing selection action.
  const handledEmployeeReturn = useRef(null);
  useEffect(() => {
    if (onOpenEmployee || window.location.hostname !== 'runtime-runner.singulancelabs.com') return;
    const requested = new URLSearchParams(location.search).get('employee');
    if (!requested || handledEmployeeReturn.current === requested || !scope) return;
    const employee = requested === 'runtime' ? { id: 'runtime' } : team.find(row => row.id === requested);
    if (!employee) return; // A URL never grants visibility to an employee.
    handledEmployeeReturn.current = requested;
    void openAgent({ preventDefault() {} }, employee).then(opened => {
      if (!opened) { handledEmployeeReturn.current = null; return; }
      const current = new URL(window.location.href);
      current.searchParams.delete('employee');
      window.history.replaceState(window.history.state, '', `${current.pathname}${current.search}${current.hash}`);
    });
  }, [scope, team, location.search, onOpenEmployee]);
  const [createEmployeeOpen, setCreateEmployeeOpen] = useState(false);
  // The walkthrough's "meet your first employee" step opens employee creation when the team is empty.
  useEffect(() => {
    if (!teamMode && !mobileRoster) return undefined;
    const open = () => setCreateEmployeeOpen(true);
    window.addEventListener('hm:create-employee', open);
    return () => window.removeEventListener('hm:create-employee', open);
  }, [teamMode, mobileRoster]);
  const closeCreateEmployee = useCallback(() => setCreateEmployeeOpen(false), []);
  useEffect(() => setCreateEmployeeOpen(false), [org?.id, user?.id]);
  const employeeCreated = async employee => {
    if (!user?.id || !org?.id || teamScope.current !== `${user.id}:${org.id}`) return false;
    setTeam(current => current.some(item => item.id === employee.id) ? current : [...current, employee]);
    agentRoster.remember(scope, [...team.filter(item => item.id !== employee.id), employee]);
    setTeamRetry(value => value + 1);
    // The employee exists: the setup dialog is finished whatever the room does next, so a remount or a failed open cannot leave a fresh empty one.
    setCreateEmployeeOpen(false);
    // Tells the retained room frame this employee is new, before the route moves to it.
    window.dispatchEvent(new CustomEvent('hivemind:employee-created', { detail: { employeeId: employee.id } }));
    return openAgent({ preventDefault() {} }, employee);
  };
  // A deleted employee leaves the roster at once; a person viewing its room moves to another employee, or home when none is left.
  useEffect(() => {
    const removed = event => {
      const id = typeof event.detail?.employeeId === 'string' ? event.detail.employeeId : null;
      if (!id) return;
      const next = team.filter(item => item.id !== id);
      setTeam(next);
      agentRoster.remember(scope, next);
      window.dispatchEvent(new Event('hm:employees-changed'));
      if (openDotEmployeeIdFromPath(location.pathname) !== id && selectedAgent !== id) return;
      setSelectedAgent(null);
      const following = next.find(item => openDotEmployeePath(item)) || next[0];
      if (following) openAgent({ preventDefault() {} }, following);
      else navigate(runtimeEnabled ? '/hivemind/app/employee/harness' : '/hivemind/app/overview', { replace: true });
    };
    window.addEventListener('hivemind:employee-removed', removed);
    return () => window.removeEventListener('hivemind:employee-removed', removed);
  });
  // An unarchived employee joins the roster at once; a normal refresh follows once the workspace has caught up.
  const restoredRefresh = useRef(null);
  useEffect(() => () => clearTimeout(restoredRefresh.current), []);
  useEffect(() => {
    const restored = event => {
      const profile = event.detail?.profile;
      if (!profile || typeof profile.id !== 'string' || typeof profile.name !== 'string') return;
      const next = [...team.filter(item => item.id !== profile.id), profile];
      setTeam(next);
      agentRoster.remember(scope, next);
      clearTimeout(restoredRefresh.current);
      restoredRefresh.current = setTimeout(() => window.dispatchEvent(new Event('hm:employees-changed')), 4000);
    };
    window.addEventListener('hivemind:employee-restored', restored);
    return () => window.removeEventListener('hivemind:employee-restored', restored);
  });
  // Native employees are removed through Control's native lifecycle; Library files they made stay.
  const deleteNativeEmployee = async employee => {
    await apiClient.manageNativeEmployeeLifecycle({ operation: 'remove', employee_id: employee.id });
    window.dispatchEvent(new CustomEvent('hivemind:employee-removed', { detail: { employeeId: employee.id } }));
  };
  // The Needs you badge counts the employees the roster shows as "Waiting for you", read from the same room rows the shared poll and live frames fill.
  const waitingIds = waitingEmployeeIds(rooms);
  const waitingKey = waitingIds.join(',');
  const [needsYouOpen, setNeedsYouOpen] = useState(false);
  const closeNeedsYou = useCallback(() => setNeedsYouOpen(false), []);
  useEffect(() => { setNeedsYouOpen(false); }, [org?.id, user?.id]);
  const cancelFocus = useRef(null);
  useEffect(() => () => cancelFocus.current?.(), []);
  const openNeedsYouCard = async card => {
    setNeedsYouOpen(false);
    const agent = team.find(item => item.id?.toLowerCase() === card.employeeId.toLowerCase());
    if (!agent) return;
    cancelFocus.current?.();
    await openAgent({ preventDefault() {} }, agent);
    cancelFocus.current = focusCardInRoom(card);
  };
  const [companyOpen, setCompanyOpen] = useState(false);
  const closeCompany = useCallback(() => setCompanyOpen(false), []);
  useEffect(() => { setCompanyOpen(false); }, [org?.id, user?.id]);
  const [showWebAdmin, setShowWebAdmin] = useState(false);
  const { usage } = useUsage();

  // Probe admin access once on mount
  useEffect(() => {
    apiClient.getWebAdminMetrics()
      .then(() => setShowWebAdmin(true))
      .catch(() => setShowWebAdmin(false));
  }, []);

  useEffect(() => {
    const handleClose = () => onCollapsedChange?.(true);
    const handleOpen = () => onCollapsedChange?.(false);
    window.addEventListener('hivemind:close-sidebar', handleClose);
    window.addEventListener('hivemind:open-sidebar', handleOpen);
    return () => {
      window.removeEventListener('hivemind:close-sidebar', handleClose);
      window.removeEventListener('hivemind:open-sidebar', handleOpen);
    };
  }, [onCollapsedChange]);

  const allNavSections = buildNavSections({ showWebAdmin, showEnterpriseTeam: org?.plan === 'enterprise', t, activeSection: activeSection === 'tara' ? 'tara' : 'hivemind', team, runtimeEnabled });
  const navSections = activeSection === 'tara' ? allNavSections : teamMode
    ? [allNavSections[1], { label: null, items: [
      { to: employeeAppsPath(location), icon: Cable, label: t('sidebar.apps', { defaultValue: 'Apps' }) },
      { to: '/hivemind/app/employees', companyWorkspace: true, icon: Building2, label: t('sidebar.companyWorkspace', { defaultValue: 'Company workspace' }) },
      ...(process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED === 'true' ? [{ to: '/hivemind/app/crm', icon: FolderKanban, label: 'Your CRM' }] : []),
    ] }]
    : allNavSections.filter((_, index) => index !== 1);
  const planLabel = formatPlanLabel(org?.plan);
  const tt = (k, def, vars) => fillCopy(t(`sidebar.${k}`, { ...vars, defaultValue: def }), vars);

  const workspaceModeSwitcher = <WorkspaceModeSwitcher collapsed={collapsed} />;

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[300px]';
  const desktopBrain = !collapsed && !mobileDrawer && !mobileRoster && !teamMode && activeSection !== 'tara';

  return (
    <aside
      data-desktop-hyperagents={desktopHyperAgents || undefined}
      data-mobile-roster={mobileRoster || undefined}
      data-tour-sidebar
      data-crm-enabled={process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED === 'true' ? 'true' : undefined}
      style={{ viewTransitionName: 'product-sidebar', ...(desktopHyperAgents ? { width: collapsed ? 68 : HYPERAGENT_WIDTHS[rosterColumns] } : {}), ...(mobileDrawer ? { paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : {}) }}
      className={`${mobileDrawer ? 'absolute' : 'fixed'} left-0 top-0 h-[var(--hm-app-viewport-height,100dvh)] ${mobileDrawer ? 'w-[min(300px,85vw)]' : sidebarWidth} bg-[#faf9f4] border-r border-[#e3e0db] flex flex-col z-40 transition-all duration-200`}
    >
      {mobileRoster && <div className="mobile-roster-intro">
        <header className="mobile-roster-top">
          <NavLink to="/hivemind/app/overview/new" state={{ fromTeam: true }} className="mobile-unified-brand" aria-label={tt('openBrainChat', 'Open Brain chat')}><img src="/images/singulance-orbit.png" alt=""/>HIVEMIND</NavLink>
          <div className="mobile-roster-header-utilities"><LangSwitcher compact/><WorkspaceNotifications/></div>
        </header>
        <div className="mobile-unified-user-name">{user?.display_name || user?.name || user?.email?.split('@')[0] || tt('yourAccount', 'Your account')}</div>
        <div className="mobile-roster-org"><Building2 size={18}/><strong>{org?.name || org?.slug || tt('workspaceFallback', 'Workspace')}</strong></div>
        <React.Suspense fallback={null}><GetStartedCard variant="home" userId={user?.id} orgId={org?.id} /></React.Suspense>
        <CreditBalance credits={usage?.credits} inline className="mobile-unified-plan" />
        <div className="mobile-roster-team">
          <div className="mobile-unified-heading"><h2>{tt('yourTeam', 'Your team')}</h2><div className="mobile-roster-shortcuts">
            <button type="button" onClick={() => setCompanyOpen(true)}><Building2 size={18}/><span>{tt('company', 'Company')}</span></button>
            {process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED === 'true' && <NavLink to="/hivemind/app/crm"><FolderKanban size={18}/><span>CRM</span></NavLink>}
            <button type="button" data-sidebar-tool="needs-you" aria-label={waitingIds.length ? tt('needsYouBadge', '{{n}} waiting for you', { n: waitingIds.length }) : undefined} onClick={() => setNeedsYouOpen(true)}><Inbox size={18}/><span>{tt('needsYou', 'Needs you')}{waitingIds.length > 0 && <b className="ny-badge">{waitingIds.length}</b>}</span></button>
            <NavLink to={CALENDAR_PATH} data-sidebar-tool="calendar"><CalendarDays size={18}/><span>{tt('calendar', 'Calendar')}</span></NavLink>
            <NavLink to={LIBRARY_PATH} data-sidebar-tool="library"><Library size={18}/><span>{tt('library', 'Library')}</span></NavLink>
          </div></div>
          <div className="mobile-roster-grid" aria-label={tt('yourEmployees', 'Your employees')}
            onClickCapture={event => { if (rosterSwiped.current) { event.preventDefault(); event.stopPropagation(); rosterSwiped.current = false; } }}
            onTouchStart={event => { rosterSwiped.current = false; const touch = event.touches[0]; rosterGesture.current = { x: touch.clientX, y: touch.clientY }; }}
            onTouchCancel={() => { rosterGesture.current = null; }}
            onTouchEnd={event => {
              const start = rosterGesture.current;
              rosterGesture.current = null;
              if (!start || !event.changedTouches[0]) return;
              const touch = event.changedTouches[0];
              const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
              if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
              rosterSwiped.current = true;
              setRosterPage(page => Math.max(0, Math.min(Math.max(0, Math.ceil(team.length / 5) - 1), page + (dx < 0 ? 1 : -1))));
            }}>
            {runtimeEnabled && <button type="button" data-agent-room-link className="mobile-roster-runtime" aria-busy={openingAgent === 'runtime' || undefined} onClick={event => openAgent(event, { id: 'runtime' })}><RuntimeAvatar alt="" room={aggregateAgentRooms(rooms, 'runtime')}/><strong>Runtime</strong><small>{tt('runtimeRoleShort', 'Chief of Staff')}</small><AgentRoomStatus room={{ ...aggregateAgentRooms(rooms, 'runtime'), loading: openingAgent === 'runtime' }} compact /></button>}
            {team.slice(rosterPage * 5, rosterPage * 5 + 5).map(agent => <button type="button" data-agent-room-link key={agent.id} aria-busy={openingAgent === agent.id || undefined} onClick={event => openAgent(event, agent)}><AgentAvatar agent={agent} size={64}/><span title={agent.name}>{agent.name}</span><AgentRoomStatus room={{ ...aggregateAgentRooms(rooms, agent.id), loading: openingAgent === agent.id }} compact /></button>)}
          </div>
          {team.length > 5 && <div className="mobile-roster-pages"><button type="button" disabled={rosterPage === 0} onClick={() => setRosterPage(value => value - 1)}>{tt('previous', 'Previous')}</button><span>{rosterPage + 1} / {Math.ceil(team.length / 5)}</span><button type="button" disabled={(rosterPage + 1) * 5 >= team.length} onClick={() => setRosterPage(value => value + 1)}>{tt('next', 'Next')}</button></div>}
        </div>
        <button type="button" className="mobile-roster-create" onClick={() => setCreateEmployeeOpen(true)}><Plus size={20}/>{tt('createEmployee', 'Create employee')}</button>
        <section className="mobile-unified-brain" aria-label={tt('yourBrain', 'Your Brain')}>
          <div className="mobile-unified-heading"><h2 className="mobile-unified-brain-title"><BrainModeIcon size={25}/>{tt('yourBrain', 'Your Brain')}</h2><button type="button" className="mobile-unified-advanced" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen(value => !value)}><Sliders size={17}/>{tt('advanced', 'Advanced')}</button></div>
          <div className="mobile-unified-brain-grid">
            <button type="button" data-brain-chat-link onClick={() => openBrainChat(navigate)}><MessageCircle size={19}/><span>{tt('brainChat', 'Chat')}</span><ChevronRight size={14}/></button>
            {[{to:'/hivemind/m/memories',label:tt('memories', 'Memories'),icon:Brain},{to:'/hivemind/m/uploads',label:tt('uploads', 'Uploads'),icon:BookOpen},{to:'/hivemind/m/connectors',label:tt('connectors', 'Connectors'),icon:Cable},{to:'/hivemind/m/meeting-notes',label:tt('aiMeetingNotes', 'AI meeting notes'),icon:Mic},{to:'/hivemind/m/graph',label:tt('memoryGraphLower', 'Memory graph'),icon:Network}].map(({to,label,icon:Icon}) => <NavLink key={to} to={to}><Icon size={19}/><span>{label}</span><ChevronRight size={14}/></NavLink>)}
          </div>
          {advancedOpen && <div className="mobile-unified-advanced-links" aria-label={tt('advancedFeatures', 'Advanced features')}>{[{to:'/hivemind/app/mcp',label:tt('mcps', 'MCPs')},{to:'/hivemind/app/keys',label:tt('apiKeysLower', 'API keys')},{to:'/hivemind/m/projects',label:tt('projects', 'Projects')},{to:'/hivemind/app/evaluation',label:tt('evaluation', 'Evaluation')}].map(item => <NavLink key={item.to} to={item.to}>{item.label}<ChevronRight size={14}/></NavLink>)}</div>}
        </section>
        {/* Company-wide controls sit together at the bottom, above Account. */}
        <div className="ha-autonomy-seat is-drawer mobile-roster-autonomy" data-drawer-autonomy-seat><AutonomyDial orgId={org?.id} runtimeEnabled={runtimeEnabled}/></div>
        <AnatomyModeToggle />
        <div className="mobile-roster-account">
          <button type="button" className="mobile-roster-account-identity" onClick={() => setRosterProfileOpen(true)}>
            {profileImage && !profileImageFailed ? <img src={profileImage} alt="" referrerPolicy="no-referrer" onError={() => setProfileImageFailed(true)}/> : <User size={24}/>}
            <span>{tt('accountAndSecurity', 'Account and security')}</span>
          </button>
          <NavLink to="/hivemind/m/settings" aria-label={tt('settingsAria', 'Settings')} className="mobile-roster-settings"><Settings size={21}/></NavLink>
        </div>
      </div>}
      <div className="mobile-roster-legacy shrink-0 px-4 pt-2 pb-3 border-b border-[#e3e0db]">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/images/singulance-orbit.png" alt="Singulance" className="h-10 w-10 shrink-0 object-contain" />
            {!collapsed && <span className="text-[19px] font-semibold tracking-wide text-[#292929]">HIVEMIND</span>}
          </div>
          {!collapsed && !mobileDrawer && <button type="button" aria-label={tt('collapseSidebar', 'Collapse sidebar')} aria-expanded="true" onClick={() => onCollapsedChange?.(true)} className="p-1 rounded-md hover:bg-[#eeece6] text-[#737373]"><PanelLeft size={18} strokeWidth={1.75} /></button>}
        </div>
        {collapsed && <button type="button" aria-label={tt('expandSidebar', 'Expand sidebar')} aria-expanded="false" onClick={() => onCollapsedChange?.(false)} className="mx-auto block p-1 text-[#737373]"><PanelLeft size={18} /></button>}
        {!mobileRoster && (desktopBrain ? <div className="desktop-brain-header-controls">{workspaceModeSwitcher}</div> : workspaceModeSwitcher)}
      </div>

      {(teamMode || mobileRoster) && teamLoadError && <p role="status" className="px-4 py-2 text-xs text-[#737373]">{tt('teamRefreshFailed', 'Could not refresh our team.')} <button type="button" className="underline" onClick={() => setTeamRetry(value => value + 1)}>{tt('retry', 'Retry')}</button></p>}
      {teamError && <p role="status" className="px-4 py-2 text-xs text-[#737373]">{teamError}</p>}
      {desktopBrain && <DesktopBrainNavigation sections={navSections} user={user} planLabel={planLabel} credits={usage?.credits} logout={logout} />}
      {desktopHyperAgents && <DesktopHyperAgentsNavigation team={team} rooms={rooms} selectedAgent={selectedAgent} openingAgent={openingAgent} onOpenAgent={openAgent} onCreate={() => setCreateEmployeeOpen(true)} onCompany={() => setCompanyOpen(true)} onNeedsYou={() => setNeedsYouOpen(true)} needsYouCount={waitingIds.length} columns={rosterColumns} collapsed={collapsed} user={user} planLabel={planLabel} credits={usage?.credits} logout={logout} orgId={org?.id} onDeleteEmployee={deleteNativeEmployee} runtimeEnabled={runtimeEnabled}/>}
      {desktopHyperAgents && <div className="ha-resize-grip" role="separator" aria-label={tt('resizeSidebar', 'Resize team sidebar')} aria-orientation="vertical" aria-valuemin={68} aria-valuemax={452} aria-valuenow={collapsed ? 68 : HYPERAGENT_WIDTHS[rosterColumns]} aria-valuetext={collapsed ? tt('collapsedValue', 'Collapsed') : tt('columnsValue', '{{count}} columns', { count: rosterColumns })} tabIndex={0}
        onKeyDown={event => { const current = collapsed ? 0 : rosterColumns; if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); resizeRoster(Math.max(0, Math.min(3, current + (event.key === 'ArrowLeft' ? -1 : 1)))); } }}
        onPointerDown={event => { resizeGesture.current = true; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => { if (!resizeGesture.current) return; const aside = event.currentTarget.closest('aside'); const rect = aside.getBoundingClientRect(); const scale = rect.width / aside.offsetWidth; resizeRoster(columnsForWidth((event.clientX - rect.left) / scale)); }}
        onPointerUp={event => { resizeGesture.current = false; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { resizeGesture.current = false; }}><span/></div>}
      {/* Navigation */}
      {!desktopHyperAgents && <nav className={`${desktopBrain ? 'desktop-brain-legacy ' : ''}mobile-roster-legacy flex-1 min-h-0 py-3 px-2.5 overflow-y-auto space-y-4`}>
        {navSections.map((section, si) => (
          <div key={si}>
            {teamMode && mobileDrawer && !mobileRoster && si === 1 && <div className="ha-autonomy-seat is-drawer" data-drawer-autonomy-seat><AutonomyDial orgId={org?.id} runtimeEnabled={runtimeEnabled}/></div>}
            {section.label && !collapsed && (
              <div className="px-2.5 mb-1.5">
                <span className="text-[#737373] text-[11px] font-semibold uppercase tracking-[0.08em]">
                  {section.label}
                </span>
              </div>
            )}
            {collapsed && section.label && (
              <div className="h-px bg-[#e3e0db] mx-2 mb-2" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const pathOnly = item.to.split('?')[0];
                const isActive = item.brainChat ? /^\/hivemind\/app\/overview(?:\/(?:new|session\/[^/]+))?\/?$/.test(location.pathname) : item.createEmployee ? createEmployeeOpen : item.agent ? selectedAgent === item.agent.id : item.runtime ? location.pathname.startsWith('/hivemind/app/employee/harness') && !selectedAgent :
                  location.pathname === pathOnly ||
                  (location.pathname.startsWith(`${pathOnly}/`)
                    && !(pathOnly === '/hivemind/app/overview' && location.pathname === '/hivemind/app/overview/dreaming'));
                const ItemLink = item.agent || item.runtime || item.companyWorkspace || item.createEmployee || item.brainChat ? 'button' : NavLink;
                const agentId = item.agent?.id || 'runtime';
                const room = { ...aggregateAgentRooms(rooms, agentId), loading: openingAgent === agentId };
                const hasChildren = item.children && item.children.length > 0;

                return (
                  <div key={item.agent?.id || item.to}>
                    {hasChildren && !collapsed ? (
                      <div
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[15px] group`}
                      >
                        <item.icon
                          size={18}
                          strokeWidth={1.75}
                          className="text-[#737373] flex-shrink-0"
                        />
                        <span className="text-[#333333] font-medium truncate">
                          {item.label}
                        </span>
                      </div>
                    ) : (
                      <ItemLink
                        data-agent-room-link={item.agent || item.runtime ? true : undefined}
                        type={item.agent || item.runtime || item.companyWorkspace || item.createEmployee || item.brainChat ? "button" : undefined}
                        to={item.agent || item.runtime || item.companyWorkspace || item.createEmployee || item.brainChat ? undefined : item.to}
                        data-tour-id={item.to}
                        onClick={item.brainChat ? () => openBrainChat(navigate) : item.createEmployee ? () => setCreateEmployeeOpen(true) : item.agent ? event => openAgent(event, item.agent) : item.runtime ? event => openAgent(event, { id: 'runtime' }) : item.companyWorkspace ? () => setCompanyOpen(true) : undefined}
                        aria-busy={openingAgent === (item.agent?.id || (item.runtime ? 'runtime' : undefined)) ? true : undefined}
                        className={`relative w-full text-left flex items-center ${collapsed ? 'justify-center gap-2.5 px-2.5 py-2' : item.runtime ? 'gap-3 px-2.5 py-3 mb-2 min-h-[96px]' : 'gap-2.5 px-2.5 py-2'} rounded-lg text-[15px] transition-all duration-150 group`}
                        title={collapsed ? item.label : undefined}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active"
                            className="absolute inset-0 bg-[#f3f1ec] rounded-lg"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        {item.runtime ? <RuntimeAvatar alt="" room={aggregateAgentRooms(rooms, 'runtime')} aria-hidden="true" size={collapsed ? 24 : 80} className="relative z-10 flex-shrink-0 object-contain" /> : item.agent ? <AgentAvatar agent={item.agent} size={25} className="relative z-10" /> : <item.icon
                          size={18}
                          strokeWidth={1.75}
                          className={`relative z-10 transition-colors flex-shrink-0 ${
                            isActive ? 'text-[#0a0a0a]' : 'text-[#737373] group-hover:text-[#333333]'
                          }`}
                        />}
                        {collapsed && item.agent && openDotEmployeePath(item.agent) && <Monitor size={11} strokeWidth={2} aria-label={tt('computerWorkspace', 'Computer workspace')} title={tt('computerWorkspace', 'Computer workspace')} className="absolute right-1 top-1 z-20 rounded-sm bg-white text-[#737373]" />}
                        {!collapsed && (
                          <span
                            className={`relative z-10 min-w-0 flex-1 transition-colors ${
                              isActive ? 'text-[#0a0a0a] font-medium' : 'text-[#333333] group-hover:text-[#0a0a0a]'
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate">{item.runtime ? <strong className="block text-[24px] font-semibold leading-tight tracking-tight">Runtime</strong> : item.label}</span>
                              {item.agent && openDotEmployeePath(item.agent) && <Monitor size={13} strokeWidth={1.8} aria-label={tt('computerWorkspace', 'Computer workspace')} title={tt('computerWorkspace', 'Computer workspace')} className="shrink-0 text-[#737373]" />}
                            </span>
                            {teamMode && (item.agent || item.runtime) && <small className="block font-normal text-[12px] text-[#737373] leading-snug mt-1 truncate capitalize">{item.runtime ? tt('runtimeRole', 'AI Chief of Staff') : String(item.agent?.role || item.agent?.job_title || item.agent?.role_archetype || item.agent?.roleArchetype || tt('teamMemberFallback', 'Team member')).replace(/_/g, ' ')}</small>}
                            {teamMode && (item.agent || item.runtime) && <AgentRoomStatus room={room} />}
                          </span>
                        )}
                        {collapsed && teamMode && (item.agent || item.runtime) && <AgentRoomStatus room={room} collapsed />}
                      </ItemLink>
                    )}
                    {/* Always-visible children sub-nav */}
                    {hasChildren && !collapsed && (
                      <div className="ml-4 pl-2.5 border-l border-[#e3e0db] mt-0.5 space-y-0.5">
                        {item.children.map((child) => {
                          const cp = child.to.split('?')[0];
                          const qs = child.to.includes('?') ? '?' + child.to.split('?')[1] : '';
                          const cIsActive = location.pathname === cp && (!qs || location.search === qs);
                          return (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[14px] transition-all duration-150 group ${
                                cIsActive ? 'bg-[#f3f1ec] text-[#0a0a0a] font-medium' : 'text-[#333333] hover:text-[#0a0a0a] hover:bg-[#f3f1ec]/50'
                              }`}
                            >
                              <child.icon
                                size={14}
                                strokeWidth={1.75}
                                className={`flex-shrink-0 ${cIsActive ? 'text-[#0a0a0a]' : 'text-[#737373] group-hover:text-[#333333]'}`}
                              />
                              <span className="truncate">{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {teamMode && !mobileRoster && (
          <><button type="button" data-sidebar-tool="needs-you" title={collapsed ? tt('needsYou', 'Needs you') : undefined} aria-label={waitingIds.length ? tt('needsYouBadge', '{{n}} waiting for you', { n: waitingIds.length }) : undefined} onClick={() => setNeedsYouOpen(true)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-[#333333] hover:bg-[#f3f1ec] ${collapsed ? 'justify-center' : ''}`}><Inbox size={18}/>{!collapsed && <span className="flex flex-1 items-center">{tt('needsYou', 'Needs you')}{waitingIds.length > 0 && <b className="ny-badge">{waitingIds.length}</b>}</span>}</button>{[[CALENDAR_PATH, 'Calendar', <CalendarDays key="i" size={18}/>, 'calendar'], [LIBRARY_PATH, 'Library', <Library key="i" size={18}/>, 'library']].map(([to, label, icon, tool]) =>
            <NavLink key={tool} to={to} data-sidebar-tool={tool} title={collapsed ? label : undefined} className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] hover:bg-[#f3f1ec] ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-[#f3f1ec] text-[#0a0a0a] font-medium' : 'text-[#333333]'}`}>{icon}{!collapsed && <span>{label}</span>}</NavLink>)}</>
        )}
      </nav>}

      {/* Fixed bottom: Account nav + upgrade banner + user/logout */}
      {!desktopHyperAgents && <div className={`${desktopBrain ? 'desktop-brain-legacy ' : ''}mobile-roster-legacy flex-shrink-0 border-t border-[#e3e0db]`}>
        {collapsed && (
          <div className="pt-2">
            <CreditBalance credits={usage?.credits} compact collapsed />
          </div>
        )}
        <div className="px-3 py-3">
          {activeSection === 'hyperagents' && runtimeEnabled && <button type="button" title={t('hyperagentsTour:replay', { defaultValue:'Explore your team' })} onClick={() => window.dispatchEvent(new Event('hm:replay-hyperagents-tour'))} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-[#333333] hover:bg-[#f3f1ec] ${collapsed ? 'justify-center' : ''}`}><BookOpen size={18}/>{!collapsed && <span>{t('hyperagentsTour:replay', { defaultValue:'Explore your team' })}</span>}</button>}
          <button type="button" title={tt('accountSettings', 'Account & Settings')} onClick={() => window.dispatchEvent(new Event('hm:open-account-settings'))} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-[#333333] hover:bg-[#f3f1ec] ${collapsed ? 'justify-center' : ''}`}>
            <Settings size={18}/>{!collapsed && <span>{tt('accountSettings', 'Account & Settings')}</span>}
          </button>
        </div>

        {/* User + Logout */}
        <div className="p-2.5 border-t border-[#e3e0db]">
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
              <div className="w-7 h-7 rounded-full bg-[#117dff]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#117dff] text-[10px] font-bold font-mono">
                  {(user.display_name || user.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#0a0a0a] text-xs truncate">
                  {user.display_name || user.email || 'User'}
                </p>
                <p className="text-[#737373] text-[10px] font-mono truncate">
                  {planLabel}
                </p>
                <CreditBalance credits={usage?.credits} inline />
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 w-full px-2.5 py-2 rounded-lg text-[15px] text-[#737373] hover:text-[#dc2626] hover:bg-[#dc2626]/5 transition-all`}
            title={collapsed ? tt('signOut', 'Sign Out') : undefined}
          >
            <LogOut size={16} />
            {!collapsed && <span>{t('sidebar.signOut', 'Sign Out')}</span>}
          </button>
        </div>
      </div>}
      {mobileRoster && rosterProfileOpen && <div className="mobile-roster-profile fixed inset-0 z-[95] flex items-end bg-black/25 p-2" onClick={() => setRosterProfileOpen(false)}><section data-mobile-roster-profile role="dialog" aria-modal="true" aria-label={tt('yourProfile', 'Your profile')} onClick={event => event.stopPropagation()} className="w-full rounded-[32px] bg-white p-6" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}><button type="button" autoFocus aria-label={tt('closeProfile', 'Close profile')} onClick={() => setRosterProfileOpen(false)} className="mb-6 h-11 w-11 rounded-full bg-[#f3f1ec]">×</button><div className="overflow-hidden rounded-3xl bg-[#f3f1ec]">{[{to:'/hivemind/m/profile',label:user?.display_name || user?.name || 'Profile'}, {to:'/hivemind/m/usage',label:tt('usage', 'Usage')}, {to:'/hivemind/m/billing',label:tt('billing', 'Billing')}, {to:'/hivemind/m/settings',label:tt('settings', 'Settings')}, {to:'/hivemind/m/connectors',label:tt('appsConnectors', 'Apps & connectors')}].map(item => <NavLink key={item.to} to={item.to} className="block border-b border-[#e3e0db] p-5 text-[17px]">{item.label}</NavLink>)}<button type="button" onClick={logout} className="block w-full p-5 text-left text-[17px]">{tt('signOutShort', 'Sign out')}</button></div></section></div>}
      {needsYouOpen ? <React.Suspense fallback={<div role="status" className="sr-only">{tt('openingNeedsYou', 'Opening Needs you…')}</div>}><NeedsYouPanel team={team} refreshKey={waitingKey} onClose={closeNeedsYou} onOpenCard={openNeedsYouCard} portalContainer={portalContainer} /></React.Suspense> : null}
      {companyOpen ? <React.Suspense fallback={<div role="status" className="sr-only">{tt('openingCompany', 'Opening Company HQ…')}</div>}><CompanyWorkspaceOverlay onClose={closeCompany} portalContainer={portalContainer} team={team} rooms={rooms} onOpenTeammate={openAgent} /></React.Suspense> : null}
      {createEmployeeOpen && <React.Suspense fallback={<div role="status">{tt('openingEmployeeSetup', 'Opening employee setup…')}</div>}><CreateEmployeeDialog onClose={closeCreateEmployee} onCreated={employeeCreated} portalContainer={portalContainer} /></React.Suspense>}
    </aside>
  );
}
