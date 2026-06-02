import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OverviewTour, { useOverviewTour } from '../shared/OverviewTour';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Brain,
  GitFork,
  Plug,
  Search,
  Tag,
  Clock,
  KeyRound,
  Cable,
  BookOpen,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileText,
  MessageSquare,
  Globe,
  Bookmark,
  Hexagon,
  Sparkles,
  Building2,
  Users,
  Network,
  Boxes,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useDebounce, useHealthStatus } from '../shared/hooks';
import { useTeamContext } from '../shared/team-context';

// ─── Animation variants ──────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Type badge color map ────────────────────────────────────────

const TYPE_STYLES = {
  note:         { bg: 'bg-blue-500/10',   text: 'text-blue-500/70',   icon: FileText },
  conversation: { bg: 'bg-purple-500/10', text: 'text-purple-500/70', icon: MessageSquare },
  web:          { bg: 'bg-cyan-500/10',   text: 'text-cyan-500/70',   icon: Globe },
  bookmark:     { bg: 'bg-amber-500/10',  text: 'text-amber-500/70',  icon: Bookmark },
  document:     { bg: 'bg-emerald-500/10', text: 'text-emerald-500/70', icon: FileText },
};

function getTypeStyle(type) {
  return TYPE_STYLES[type?.toLowerCase()] || { bg: 'bg-[#f3f1ec]', text: 'text-[#525252]', icon: FileText };
}

// ─── Sub-components ──────────────────────────────────────────────

function HealthCard({ healthy, onRefresh }) {
  const { t } = useTranslation('dashboard');
  const isUnknown = healthy === null;
  const label = isUnknown ? 'Checking...' : healthy ? 'All Systems Operational' : 'Service Degraded';
  const dotColor = isUnknown
    ? 'bg-[#d4d0ca]'
    : healthy
      ? 'bg-[#16a34a]'
      : 'bg-[#dc2626]';
  const glowColor = isUnknown
    ? ''
    : healthy
      ? 'shadow-[0_0_8px_rgba(22,163,74,0.4)]'
      : 'shadow-[0_0_8px_rgba(220,38,38,0.4)]';

  return (
    <motion.div variants={fadeUp} className="col-span-full">
      <div className="bg-white border border-[#e3e0db] rounded-xl p-5 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
            <Activity size={20} className="text-[#117dff]" />
          </div>
          <div>
            <p className="text-[#525252] text-xs font-mono uppercase tracking-wider mb-0.5">{t('overview.coreApiHealth', 'Core API Health')}</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${glowColor}`} />
              <span className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-medium">{label}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg hover:bg-[#f3f1ec] transition-colors text-[#a3a3a3] hover:text-[#525252]"
          title="Refresh health"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, accent = false }) {
  return (
    <motion.div variants={fadeUp}>
      <div className="bg-white border border-[#e3e0db] rounded-xl p-4 h-full hover:border-[#d4d0ca] transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-2.5">
          <Icon size={14} className={accent ? 'text-[#117dff]' : 'text-[#a3a3a3]'} strokeWidth={1.75} />
          <span className="text-[#a3a3a3] text-[11px] font-['Space_Grotesk'] uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-[#0a0a0a] text-xl font-mono font-semibold tabular-nums">
          {value !== null && value !== undefined ? value.toLocaleString() : (
            <span className="inline-block w-10 h-5 bg-[#f3f1ec] rounded animate-pulse" />
          )}
        </p>
      </div>
    </motion.div>
  );
}

function RecentMemoryRow({ memory, index }) {
  const style = getTypeStyle(memory.type || memory.source_platform);
  const TypeIcon = style.icon;
  const title = memory.title || memory.content?.slice(0, 50) || 'Untitled';
  const preview = memory.content
    ? memory.content.length > 120 ? memory.content.slice(0, 120) + '...' : memory.content
    : null;
  const date = memory.created_at
    ? new Date(memory.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <motion.div
      variants={fadeUp}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#f3f1ec] transition-colors group"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${style.bg}`}>
        <TypeIcon size={14} className={style.text} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-medium truncate">{title}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${style.bg} ${style.text} uppercase flex-shrink-0`}>
            {memory.type || memory.source_platform || 'memory'}
          </span>
        </div>
        {preview && (
          <p className="text-[#a3a3a3] text-xs leading-relaxed line-clamp-2">{preview}</p>
        )}
        {date && (
          <p className="text-[#d4d0ca] text-[10px] font-mono mt-1">{date}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Source provenance badge ─────────────────────────────────

const SOURCE_STYLES = {
  vector:  { label: 'Vector',  color: 'text-purple-500/70', bg: 'bg-purple-500/10' },
  keyword: { label: 'Keyword', color: 'text-blue-500/70',   bg: 'bg-blue-500/10' },
  graph:   { label: 'Graph',   color: 'text-amber-500/70',  bg: 'bg-amber-500/10' },
  hybrid:  { label: 'Hybrid',  color: 'text-emerald-500/70', bg: 'bg-emerald-500/10' },
};

function SourceBadge({ source }) {
  const s = SOURCE_STYLES[source] || SOURCE_STYLES.hybrid;
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${s.bg} ${s.color} uppercase tracking-wider flex-shrink-0`}>
      {s.label}
    </span>
  );
}

function SearchResult({ result }) {
  const title = result.title || result.payload?.title || result.content?.slice(0, 60) || 'Untitled';
  const snippet = result.content || result.payload?.content;
  const trimmedSnippet = snippet
    ? snippet.length > 100 ? snippet.slice(0, 100) + '...' : snippet
    : null;
  const score = result.score != null ? (result.score * 100).toFixed(0) : null;
  const source = result.source || (result.breakdown
    ? Object.entries(result.breakdown).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null);

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#f3f1ec] transition-colors">
      <Search size={14} className="text-[#d4d0ca] mt-1 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] truncate">{title}</span>
          {source && <SourceBadge source={source} />}
          {score && (
            <span className="text-[10px] font-mono text-[#117dff]/70 bg-[#117dff]/10 px-1.5 py-0.5 rounded flex-shrink-0">
              {score}%
            </span>
          )}
        </div>
        {trimmedSnippet && <p className="text-[#a3a3a3] text-xs mt-0.5 line-clamp-2">{trimmedSnippet}</p>}
      </div>
    </div>
  );
}

// ─── Control-console live clock ──────────────────────────────────
// Self-contained so its per-tick re-render is isolated from the page.
function ConsoleClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const date = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className="flex items-center gap-3">
      <div className="leading-tight">
        <p className="text-[#0a0a0a] text-[11px] font-semibold">{day}</p>
        <p className="text-[#a3a3a3] text-[10px] -mt-0.5">{date}</p>
      </div>
      <span className="text-[#0a0a0a] text-2xl font-bold tracking-tight tabular-nums font-mono">{time}</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────

export default function Overview() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const healthy = useHealthStatus(30000);
  // First-visit guided tour — glass overlay + arrows to each sidebar page.
  const tour = useOverviewTour();

  // Auto-redirect to the dedicated mobile chat page on phones. The full
  // Overview surface (graph stats, quick-actions grid, sidebar chrome) is
  // bandwidth-heavy and hard to navigate one-handed; mobile users land on
  // /hivemind/m/chat which is a full-screen Talk-to-HIVE.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Detect phones either by narrow viewport OR by UA — catches the
    // "Request Desktop Site" case where the viewport widens beyond 768px
    // but the device is still a phone (Safari/Chrome desktop-mode toggle,
    // iPad in spoof-desktop, etc).
    const narrowViewport = window.matchMedia('(max-width: 768px)').matches;
    const uaDataMobile = !!(navigator.userAgentData && navigator.userAgentData.mobile);
    const uaSniff = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i.test(navigator.userAgent || '');
    const isMobile = narrowViewport || uaDataMobile || uaSniff;
    // Forced entry from a QR/share link.
    const fromQR = new URLSearchParams(window.location.search).get('from');
    // Explicit opt-out so power users can still get the full dashboard
    // on phone if they really want it: ?desktop=1.
    const optOut = new URLSearchParams(window.location.search).get('desktop') === '1';
    if ((isMobile || fromQR) && !optOut) navigate('/hivemind/m/chat', { replace: true });
  }, [navigate]);

  // Auto-greet: slide the Talk-to-HIVE panel out ~1.5s after the dashboard
  // settles, so the assistant proactively welcomes the user. Once per browser
  // session (so revisiting Overview doesn't re-pop), desktop only (mobile
  // redirects to /m/chat above).
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    try { if (window.sessionStorage.getItem('hm.autoChatShown')) return undefined; } catch { /* storage blocked */ }
    if (window.matchMedia('(max-width: 768px)').matches) return undefined;
    const timer = window.setTimeout(() => {
      try { window.sessionStorage.setItem('hm.autoChatShown', '1'); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent('hivemind:open-chat'));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  // Post-login welcome email. Fires once the user reaches Overview after a
  // successful login. Guarded to once per browser session so revisiting the
  // page (or re-renders) won't re-send; the server also dedupes per session.
  // Fire-and-forget — must never block or surface errors in the UI.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const FLAG = 'hm.welcomeEmailSent';
    try {
      if (window.sessionStorage.getItem(FLAG)) return;
      window.sessionStorage.setItem(FLAG, '1');
    } catch {
      // sessionStorage blocked — fall through; server dedup still protects us.
    }
    apiClient.sendWelcomeEmail().catch(() => { /* silent: non-critical */ });
  }, []);

  // Project scope from TeamSwitcher.
  const { activeProjectId } = useTeamContext() || {};

  // Profile / stats
  const { data: profileData, refetch: refetchProfile } = useApiQuery(
    () => apiClient.getProfile(),
    []
  );

  // Recent memories — project-scoped when TeamSwitcher set.
  const { data: recentMemories, loading: memoriesLoading } = useApiQuery(
    () => apiClient.listMemories({ limit: 5, ...(activeProjectId ? { project_id: activeProjectId } : {}) }),
    [activeProjectId]
  );

  // Connector status
  const { data: connectors } = useApiQuery(
    () => apiClient.getConnectorStatus().catch(() => null),
    []
  );

  // Quick search
  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebounce(searchInput, 350);

  const { data: searchResults, loading: searchLoading } = useApiQuery(
    () => debouncedQuery.trim().length >= 2
      ? apiClient.quickSearch(debouncedQuery.trim())
      : Promise.resolve(null),
    [debouncedQuery]
  );

  // Derived stats - profile data is nested: { ok: true, profile: {...}, graph_summary: {...} }
  const profile = profileData?.profile || profileData || null;
  const memoryCount = profile?.memory_count ?? null;
  const relationshipCount = profile?.relationship_count ?? null;
  const activeConnectors = useMemo(() => {
    if (!connectors) return null;
    if (Array.isArray(connectors)) return connectors.filter(c => c && (c.status === 'connected' || c.healthy)).length;
    if (typeof connectors === 'object' && connectors.count != null) return connectors.count;
    if (typeof connectors === 'object' && connectors.active_count != null) return connectors.active_count;
    return 0;
  }, [connectors]);
  const topTags = profile?.top_tags ?? [];

  const memories = useMemo(() => {
    if (!recentMemories) return [];
    return Array.isArray(recentMemories) ? recentMemories : (recentMemories.memories || recentMemories.data || []);
  }, [recentMemories]);

  const results = useMemo(() => {
    if (!searchResults) return [];
    return Array.isArray(searchResults) ? searchResults : (searchResults.results || searchResults.data || []);
  }, [searchResults]);

  // Extract search metadata for fallback mode indicator
  const searchMeta = useMemo(() => {
    if (!searchResults || Array.isArray(searchResults)) return null;
    return searchResults.metadata || null;
  }, [searchResults]);

  // Feature launcher — Overview is the entrance to every surface. Primary
  // action (Talk to HIVE) slides the assistant panel out; the rest navigate.
  const openChat = () => window.dispatchEvent(new CustomEvent('hivemind:open-chat'));
  const FEATURES = [
    { key: 'chat',      icon: Sparkles,  label: t('overview.feat.chat', 'Talk to HIVE'),        hint: t('overview.feat.chatHint', 'Ask your second brain anything'), onClick: openChat, primary: true },
    { key: 'rooms',     icon: Users,     label: t('overview.feat.rooms', 'HyperAgents Rooms'),  hint: t('overview.feat.roomsHint', 'Multi-agent collaboration rooms'), onClick: () => navigate('../employees') },
    { key: 'workspace', icon: Building2, label: t('overview.feat.workspace', 'Workspace'),       hint: t('overview.feat.workspaceHint', 'Team, members & projects'),     onClick: () => navigate('../workspace') },
    { key: 'knowledge', icon: BookOpen,  label: t('overview.feat.knowledge', 'Knowledge Base'),  hint: t('overview.feat.knowledgeHint', 'Upload & manage documents'),    onClick: () => navigate('../knowledge') },
    { key: 'graph',     icon: Network,   label: t('overview.feat.graph', 'Memory Graph'),        hint: t('overview.feat.graphHint', '3D map of your memories'),         onClick: () => navigate('../graph') },
    { key: 'swarm',     icon: Boxes,     label: t('overview.feat.swarm', 'Swarm'),               hint: t('overview.feat.swarmHint', 'Digital employees & agents'),      onClick: () => navigate('../swarm') },
    { key: 'connectors',icon: Cable,     label: t('overview.feat.connectors', 'Connectors'),     hint: t('overview.feat.connectorsHint', 'Link Slack, Gmail, Notion…'), onClick: () => navigate('../connectors') },
    { key: 'web',       icon: Globe,     label: t('overview.feat.web', 'Web Intelligence'),      hint: t('overview.feat.webHint', 'Research & live web recall'),        onClick: () => navigate('../web') },
  ];

  return (
    <div className="max-w-6xl mx-auto font-['Space_Grotesk']">
      {/* First-visit guided tour */}
      <AnimatePresence>
        {tour.open && <OverviewTour onClose={tour.close} />}
      </AnimatePresence>

      {/* Control console — device-style status bar (bezel → screen) */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6 rounded-[26px] bg-gradient-to-b from-[#f3f1ec] to-[#e9e6df] border border-[#dcd8d0] p-2 shadow-[0_2px_10px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]"
      >
        <div className="relative flex items-center gap-3 rounded-[18px] bg-white border border-[#e8e5df] px-3 py-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Left edge status LED strip */}
          <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${healthy ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'} shadow-[0_0_8px_currentColor]`} />

          {/* Device badge */}
          <div className="ml-1.5 w-9 h-9 rounded-xl bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
            <Hexagon size={18} className="text-white" />
          </div>

          {/* Live clock */}
          <ConsoleClock />

          <span className="h-7 w-px bg-[#e8e5df] mx-1" />

          {/* Operator / scope pill */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#f7f6f2] border border-[#e8e5df]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]" />
            <span className="text-[#0a0a0a] text-xs font-medium truncate max-w-[160px]">
              {profile?.name || profile?.org_name || t('overview.title', 'Memory Engine')}
            </span>
          </div>

          {/* System status pill (right) */}
          <div className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            healthy ? 'bg-[#117dff] text-white shadow-[0_2px_8px_rgba(17,125,255,0.3)]' : 'bg-[#f59e0b] text-white'
          }`}>
            <Activity size={12} />
            <span>{healthy ? t('overview.online', 'Online') : t('overview.degraded', 'Degraded')}</span>
          </div>
        </div>
      </motion.div>

      {/* Feature launcher — compact console tabs */}
      <div className="mb-6">
        <p className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-[0.18em] mb-2 ml-1">{t('overview.launch', 'Launch')}</p>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-wrap gap-2"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.button
                key={f.key}
                variants={fadeUp}
                onClick={f.onClick}
                title={f.hint}
                className={`group flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  f.primary
                    ? 'bg-[#117dff] border-[#117dff] text-white shadow-[0_2px_8px_rgba(17,125,255,0.28)] hover:shadow-[0_3px_12px_rgba(17,125,255,0.4)]'
                    : 'bg-white border-[#e3e0db] text-[#0a0a0a] hover:border-[#117dff]/40 hover:bg-[#f7f6f2]'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  f.primary ? 'bg-white/20' : 'bg-[#117dff]/10'
                }`}>
                  <Icon size={13} className={f.primary ? 'text-white' : 'text-[#117dff]'} />
                </span>
                {f.label}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Grid */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Health */}
        <HealthCard
          healthy={healthy}
          onRefresh={refetchProfile}
        />

        {/* Stats row */}
        <StatCard icon={Brain}   label="Total Memories"   value={memoryCount}      accent />
        <StatCard icon={GitFork} label="Relationships"     value={relationshipCount} />
        <StatCard icon={Plug}    label="Active Connectors" value={activeConnectors}  />
        <StatCard
          icon={Tag}
          label="Top Tags"
          value={topTags?.length > 0 ? topTags.length : 0}
        />
      </motion.div>

      {/* Bottom section: Recent + Search + Actions */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4"
      >
        {/* Recent Memories */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <div className="bg-white border border-[#e3e0db] rounded-xl p-5 h-full shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#a3a3a3]" />
                <h2 className="text-[#0a0a0a] text-sm font-semibold uppercase tracking-wider">{t('overview.recentMemories', 'Recent Memories')}</h2>
              </div>
              <button
                onClick={() => navigate('../memories')}
                className="text-xs text-[#a3a3a3] hover:text-[#117dff] transition-colors flex items-center gap-1 font-mono"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>

            {memoriesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f3f1ec] animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-[#f3f1ec] rounded w-3/4 animate-pulse" />
                      <div className="h-2 bg-[#f3f1ec] rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Brain size={28} className="text-[#e3e0db] mb-3" />
                <p className="text-[#a3a3a3] text-sm">{t('overview.noMemories', 'No memories yet.')}</p>
                <p className="text-[#d4d0ca] text-xs mt-1">{t('overview.noMemoriesHint', 'Connect an MCP client to start ingesting memories.')}</p>
              </div>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-1">
                {memories.slice(0, 5).map((mem, i) => (
                  <RecentMemoryRow key={mem.id || i} memory={mem} index={i} />
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Right column: Search + Quick Actions */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4">
          {/* Quick Search */}
          <div className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} className="text-[#a3a3a3]" />
              <h2 className="text-[#0a0a0a] text-sm font-semibold uppercase tracking-wider">{t('overview.quickSearch', 'Quick Search')}</h2>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search memories..."
                className="w-full bg-transparent border border-[#e3e0db] rounded-[6px] py-2.5 pl-9 pr-4 text-[#0a0a0a] text-sm font-['Space_Grotesk'] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 transition-colors"
              />
              {searchLoading && debouncedQuery.trim().length >= 2 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-[#117dff]/40 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search mode indicator */}
            {searchMeta && debouncedQuery.trim().length >= 2 && !searchLoading && (
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-[#a3a3a3]">
                <span className={`w-1 h-1 rounded-full ${searchMeta.fallbackApplied ? 'bg-[#d97706]' : 'bg-[#16a34a]'}`} />
                {searchMeta.fallbackApplied
                  ? 'Keyword only (vector unavailable)'
                  : `Vector + keyword`}
                {searchMeta.durationMs != null && (
                  <span className="ml-auto">{searchMeta.durationMs}ms</span>
                )}
              </div>
            )}

            {/* Search results */}
            {debouncedQuery.trim().length >= 2 && (
              <div className="mt-3 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                {results.length > 0 ? (
                  <div className="space-y-0.5">
                    {results.slice(0, 6).map((r, i) => (
                      <SearchResult key={r.id || i} result={r} />
                    ))}
                  </div>
                ) : !searchLoading ? (
                  <div className="flex items-center gap-2 p-3 text-[#a3a3a3] text-xs">
                    <AlertCircle size={12} />
                    <span>No results for &quot;{debouncedQuery}&quot;</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="text-[#0a0a0a] text-sm font-semibold uppercase tracking-wider mb-3">{t('overview.quickActions', 'Quick Actions')}</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('../keys')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-[#eae7e1] border border-[#eae7e1] hover:border-[#117dff]/30 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center flex-shrink-0">
                  <KeyRound size={14} className="text-[#117dff]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[#0a0a0a] text-sm font-medium">{t('overview.createApiKey', 'Create API Key')}</p>
                  <p className="text-[#a3a3a3] text-[11px]">{t('overview.createApiKeyHint', 'Generate keys for MCP clients')}</p>
                </div>
                <ArrowRight size={14} className="text-[#e3e0db] group-hover:text-[#117dff]/50 ml-auto transition-colors" />
              </button>

              <button
                onClick={() => navigate('../connectors')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-[#eae7e1] border border-[#eae7e1] hover:border-[#117dff]/30 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f3f1ec] border border-[#e3e0db] flex items-center justify-center flex-shrink-0">
                  <Cable size={14} className="text-[#525252]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[#0a0a0a] text-sm font-medium">{t('overview.connectMcp', 'Connect MCP Client')}</p>
                  <p className="text-[#a3a3a3] text-[11px]">{t('overview.connectMcpHint', 'Link Claude, Cursor, or custom clients')}</p>
                </div>
                <ArrowRight size={14} className="text-[#e3e0db] group-hover:text-[#117dff]/50 ml-auto transition-colors" />
              </button>

              <button
                onClick={() => navigate('../memories')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-[#eae7e1] border border-[#eae7e1] hover:border-[#117dff]/30 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f3f1ec] border border-[#e3e0db] flex items-center justify-center flex-shrink-0">
                  <BookOpen size={14} className="text-[#525252]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[#0a0a0a] text-sm font-medium">{t('overview.browseMemories', 'Browse Memories')}</p>
                  <p className="text-[#a3a3a3] text-[11px]">{t('overview.browseMemoriesHint', 'Explore and manage stored memories')}</p>
                </div>
                <ArrowRight size={14} className="text-[#e3e0db] group-hover:text-[#117dff]/50 ml-auto transition-colors" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
