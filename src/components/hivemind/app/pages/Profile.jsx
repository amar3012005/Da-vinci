import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Brain,
  Tag,
  Link,
  Clock,
  Building2,
  Shield,
  Eye,
  Download,
  Trash2,
  AlertTriangle,
  MapPin,
  ExternalLink,
  BarChart2,
  Plus,
  Pencil,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Target,
  Settings2,
  Sparkles,
  Activity,
  MessageSquare,
  ArrowRight,
  Globe,
  Mail,
  Briefcase,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';
import { useAuth } from '../auth/AuthProvider';

// ─── Animation Variants ───────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const startTime = useRef(null);
  const target = value || 0;

  useEffect(() => {
    if (target === 0) {
      setDisplay(0);
      return;
    }

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };

    startTime.current = null;
    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  return <>{display.toLocaleString()}</>;
}

// ─── Small Reusable Components ────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] mb-0">{children}</h3>
  );
}

function PillBadge({ children, variant = 'blue' }) {
  const variants = {
    blue: 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    gray: 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-mono border ${variants[variant] || variants.blue}`}
    >
      {children}
    </span>
  );
}

function Card({ children, className = '' }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`bg-white backdrop-blur-xl border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

function UserAvatar({ displayName, email }) {
  const initials = (displayName || email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#117dff] to-[#6366f1] flex items-center justify-center shadow-lg select-none">
      <span className="text-white text-xl font-bold font-mono">{initials || '?'}</span>
    </div>
  );
}

function PlanBadge({ plan }) {
  const map = {
    free: { label: 'Free', variant: 'gray', dot: '#a3a3a3' },
    pro: { label: 'Pro', variant: 'blue', dot: '#117dff' },
    team: { label: 'Team', variant: 'purple', dot: '#a855f7' },
    scale: { label: 'Scale', variant: 'purple', dot: '#a855f7' },
    enterprise: { label: 'Enterprise', variant: 'green', dot: '#059669' },
  };
  const cfg = map[plan?.toLowerCase()] || map.free;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
        { gray: 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]', blue: 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20', purple: 'bg-purple-50 text-purple-700 border-purple-200', green: 'bg-emerald-50 text-emerald-700 border-emerald-200' }[cfg.variant]
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Category Helpers ────────────────────────────────────────────────────────

const CATEGORIES = ['static', 'dynamic', 'preference', 'goal'];

const CATEGORY_CONFIG = {
  static: { variant: 'blue', icon: User, label: 'Static' },
  dynamic: { variant: 'purple', icon: Sparkles, label: 'Dynamic' },
  preference: { variant: 'amber', icon: Settings2, label: 'Preference' },
  goal: { variant: 'green', icon: Target, label: 'Goal' },
};

function CategoryBadge({ category }) {
  const cfg = CATEGORY_CONFIG[category] || { variant: 'gray', icon: Tag, label: category || 'Unknown' };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
        {
          blue: 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20',
          purple: 'bg-purple-50 text-purple-700 border-purple-200',
          amber: 'bg-amber-50 text-amber-700 border-amber-200',
          green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          gray: 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]',
        }[cfg.variant]
      }`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-[#f3f1ec] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[#a3a3a3] text-xs font-mono w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── Confirmation Dialog ─────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant = 'red',
  confirmDisabled = false,
  confirmLoading = false,
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-[#e3e0db] shadow-2xl p-6 max-w-sm w-full mx-4"
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className="text-[#dc2626] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-[#0a0a0a] font-bold font-['Space_Grotesk'] mb-1">{title}</h4>
            <p className="text-[#525252] text-sm font-['Space_Grotesk']">{message}</p>
          </div>
        </div>
        {children ? <div className="mb-4">{children}</div> : null}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-['Space_Grotesk'] font-semibold border border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled || confirmLoading}
            className={`px-4 py-2 rounded-xl text-sm font-['Space_Grotesk'] font-semibold text-white transition-colors ${
              confirmVariant === 'red' ? 'bg-[#dc2626] hover:bg-red-700 disabled:bg-red-300' : 'bg-[#117dff] hover:bg-[#0066e0] disabled:bg-[#7fb5ff]'
            }`}
          >
            {confirmLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Section 1: Brain Metrics Hero ──────────────────────────────────────────

function BrainMetricsHero({ user, org, plan, stats, profileFacts }) {
  const navigate = useNavigate();
  const nameFromFacts = profileFacts?.find((f) => f.key === 'name')?.value;
  const displayName = nameFromFacts || user?.display_name || user?.email?.split('@')[0] || 'User';

  const {
    memory_count: rawMemCount,
    observation_count = 0,
    relationship_count = 0,
  } = stats || {};
  const memoryCount = rawMemCount || (observation_count > 0 ? observation_count : 0);
  const factCount = profileFacts?.length || 0;

  const sourcePlatforms = stats?.top_source_platforms || [];

  const metrics = [
    { label: 'memories', value: memoryCount, icon: Brain },
    { label: 'connections', value: relationship_count, icon: Link },
    { label: 'facts', value: factCount, icon: User },
    { label: 'sources', value: sourcePlatforms.length, icon: Globe },
  ];

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-xl overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      <div className="p-8">
        {/* Header row */}
        <div className="flex items-center gap-5 mb-8">
          <UserAvatar displayName={displayName} email={user?.email} />
          <div>
            <h2 className="text-white text-2xl font-bold font-['Space_Grotesk']">
              {displayName}&apos;s Second Brain
            </h2>
            <div className="flex items-center gap-3 mt-1">
              {org && (
                <span className="text-[#a3a3a3] text-sm font-['Space_Grotesk'] flex items-center gap-1.5">
                  <Building2 size={13} />
                  {org.name}
                </span>
              )}
              <PlanBadge plan={plan} />
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/[0.08] transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className="text-[#117dff]" />
              </div>
              <p className="text-white text-3xl font-bold font-mono leading-none mb-1">
                <AnimatedCounter value={value} />
              </p>
              <p className="text-[#a3a3a3] text-xs font-mono uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/hivemind/app/graph')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#117dff] text-white text-sm font-['Space_Grotesk'] font-semibold hover:bg-[#0066e0] transition-colors"
          >
            View Graph
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => navigate('/hivemind/app/chat')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 text-white text-sm font-['Space_Grotesk'] font-semibold hover:bg-white/10 transition-colors"
          >
            <MessageSquare size={14} />
            Talk to HIVE
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section 2: Knowledge Identity Card ─────────────────────────────────────

const IDENTITY_ICON_MAP = {
  name: User,
  company: Building2,
  organization: Building2,
  location: MapPin,
  city: MapPin,
  country: MapPin,
  timezone: Clock,
  role: Briefcase,
  job: Briefcase,
  title: Briefcase,
  focus: Target,
  goal: Target,
  email: Mail,
  preference: Settings2,
};

function getIconForKey(key) {
  const lower = (key || '').toLowerCase();
  for (const [keyword, icon] of Object.entries(IDENTITY_ICON_MAP)) {
    if (lower.includes(keyword)) return icon;
  }
  return Sparkles;
}

function KnowledgeIdentityCard({ facts, onToggleEditor }) {
  if (!facts || facts.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} className="text-[#117dff]" />
          <SectionHeading>What Your Brain Knows About You</SectionHeading>
        </div>
        <div className="px-4 py-8 rounded-xl bg-[#faf9f4] border border-[#e3e0db] text-center">
          <User size={24} className="text-[#d4d0ca] mx-auto mb-2" />
          <p className="text-[#a3a3a3] text-sm font-['Space_Grotesk'] mb-1">
            No identity facts yet.
          </p>
          <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">
            Profile facts build automatically as you use HIVEMIND, or add them manually below.
          </p>
        </div>
        <button
          onClick={onToggleEditor}
          className="mt-4 flex items-center gap-2 text-sm font-['Space_Grotesk'] font-semibold text-[#117dff] hover:text-[#0066e0] transition-colors"
        >
          <Plus size={14} />
          Add Profile Facts
        </button>
      </Card>
    );
  }

  // Separate preferences from identity facts
  const identityFacts = facts.filter((f) => f.category !== 'preference');
  const preferences = facts.filter((f) => f.category === 'preference');

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-[#117dff]" />
          <SectionHeading>What Your Brain Knows About You</SectionHeading>
        </div>
        <span className="text-[#a3a3a3] text-xs font-mono">{facts.length} fact{facts.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Identity grid */}
      {identityFacts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {identityFacts.map((fact) => {
            const Icon = getIconForKey(fact.key);
            return (
              <div
                key={fact.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#faf9f4] border border-[#e3e0db] hover:border-[#117dff]/30 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#117dff]/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-[#117dff]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider">{fact.key}</p>
                  <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-semibold truncate">{fact.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preferences */}
      {preferences.length > 0 && (
        <div className="mb-4">
          <p className="text-[#a3a3a3] text-xs font-mono uppercase tracking-wider mb-2">Preferences</p>
          <div className="flex flex-wrap gap-2">
            {preferences.map((pref) => (
              <PillBadge key={pref.id} variant="amber">
                {pref.key}: {pref.value}
              </PillBadge>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onToggleEditor}
        className="flex items-center gap-2 text-sm font-['Space_Grotesk'] font-semibold text-[#117dff] hover:text-[#0066e0] transition-colors"
      >
        <Pencil size={13} />
        Edit Profile Facts
        <ChevronDown size={14} />
      </button>
    </Card>
  );
}

// ─── Section 3: Knowledge Breakdown ─────────────────────────────────────────

function KnowledgeBreakdown({ stats }) {
  const {
    top_source_platforms = [],
    memory_count: rawMemCount,
    observation_count = 0,
    graph_summary = {},
  } = stats || {};

  const memoryCount = rawMemCount || (observation_count > 0 ? observation_count : 0);

  // Build source data with estimated proportions
  const totalSources = top_source_platforms.length;
  const sourceData = top_source_platforms.map((platform, idx) => {
    // Estimate proportions — first platform gets most, decreasing
    const weight = totalSources > 1 ? Math.max(1, totalSources - idx) : 1;
    return { name: platform, weight };
  });
  const totalWeight = sourceData.reduce((s, d) => s + d.weight, 0) || 1;
  const sourcesWithPct = sourceData.map((s) => ({
    ...s,
    pct: Math.round((s.weight / totalWeight) * 100),
    count: Math.round((s.weight / totalWeight) * memoryCount),
  }));

  const relationshipTypes = [
    { label: 'Updates', count: graph_summary.update || 0, color: '#3b82f6' },
    { label: 'Extends', count: graph_summary.extend || 0, color: '#117dff' },
    { label: 'Derives', count: graph_summary.derive || 0, color: '#a855f7' },
  ];
  const maxRelCount = Math.max(...relationshipTypes.map((r) => r.count), 1);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 size={16} className="text-[#117dff]" />
        <SectionHeading>Knowledge Breakdown</SectionHeading>
      </div>

      {/* Knowledge Sources */}
      {sourcesWithPct.length > 0 && (
        <div className="mb-6">
          <p className="text-[#525252] text-xs font-mono uppercase tracking-wider mb-3">Knowledge Sources</p>
          <div className="space-y-3">
            {sourcesWithPct.map(({ name, pct, count }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-semibold">{name}</span>
                  <span className="text-[#a3a3a3] text-xs font-mono">
                    ~{count.toLocaleString()} memories &middot; {pct}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#f3f1ec] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                    className="h-full rounded-full bg-[#117dff]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Strength */}
      <div>
        <p className="text-[#525252] text-xs font-mono uppercase tracking-wider mb-3">Connection Strength</p>
        <div className="space-y-3">
          {relationshipTypes.map(({ label, count, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#525252] text-sm font-['Space_Grotesk']">{label}</span>
                <span className="text-[#0a0a0a] font-mono text-sm font-semibold">{count}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#f3f1ec] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxRelCount) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Tags */}
      {(stats?.top_tags || []).length > 0 && (
        <div className="mt-6 pt-5 border-t border-[#f3f1ec]">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag size={13} className="text-[#117dff]" />
            <span className="text-[#525252] text-xs font-mono uppercase tracking-wider">Top Tags</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.top_tags.map((tag) => (
              <PillBadge key={tag} variant="blue">{tag}</PillBadge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Section 4: Recent Brain Activity ───────────────────────────────────────

function RecentBrainActivity() {
  const navigate = useNavigate();
  const recentQuery = useApiQuery(
    useCallback(async () => {
      try {
        const { data } = await apiClient.controlPlane.get('/v1/proxy/memories?limit=5&sort=recent');
        return data;
      } catch {
        return null;
      }
    }, [])
  );
  const { data: recentData, loading: recentLoading } = recentQuery;

  const memories = recentData?.memories || recentData?.results || (Array.isArray(recentData) ? recentData : []);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-5">
        <Activity size={16} className="text-[#117dff]" />
        <SectionHeading>Recent Brain Activity</SectionHeading>
      </div>

      {recentLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : memories.length === 0 ? (
        <div className="px-4 py-8 rounded-xl bg-[#faf9f4] border border-[#e3e0db] text-center">
          <Brain size={24} className="text-[#d4d0ca] mx-auto mb-2" />
          <p className="text-[#a3a3a3] text-sm font-['Space_Grotesk']">
            No recent memories found. Start adding knowledge to your second brain.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {memories.slice(0, 5).map((mem, idx) => {
            const title = mem.title || mem.content?.slice(0, 60) || mem.text?.slice(0, 60) || 'Untitled memory';
            const source = mem.source_platform || mem.source || mem.metadata?.source || '';
            const time = mem.updated_at || mem.created_at || mem.timestamp;
            return (
              <div
                key={mem.id || idx}
                className="flex items-start gap-3 py-3 border-b border-[#f3f1ec] last:border-b-0 group hover:bg-[#faf9f4] -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="mt-1.5 w-2 h-2 rounded-full bg-[#117dff] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-medium truncate">
                    {title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {time && (
                      <span className="text-[#a3a3a3] text-xs font-mono">{formatTimeAgo(time)}</span>
                    )}
                    {source && (
                      <PillBadge variant="gray">{source}</PillBadge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate('/hivemind/app/memories')}
        className="mt-4 inline-flex items-center gap-2 text-sm font-['Space_Grotesk'] font-semibold text-[#117dff] hover:text-[#0066e0] transition-colors"
      >
        View All Memories
        <ArrowRight size={14} />
      </button>
    </Card>
  );
}

// ─── Section 5: Profile Facts (Collapsible) ─────────────────────────────────

function ProfileFactsSection({ facts, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newFact, setNewFact] = useState({ category: 'static', key: '', value: '' });
  const [addError, setAddError] = useState(null);

  const startEdit = (fact) => {
    setEditingId(fact.id);
    setEditValue(fact.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (fact) => {
    if (!editValue.trim() || editValue === fact.value) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await apiClient.controlPlane.post('/v1/proxy/profiles', {
        category: fact.category,
        key: fact.key,
        value: editValue.trim(),
        confidence: fact.confidence,
      });
      cancelEdit();
      onRefresh();
    } catch (err) {
      console.error('Failed to update fact:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiClient.controlPlane.delete(`/v1/proxy/profiles?id=${deleteTarget.id}`);
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete fact:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAdd = async () => {
    setAddError(null);
    if (!newFact.key.trim() || !newFact.value.trim()) {
      setAddError('Both key and value are required.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.controlPlane.post('/v1/proxy/profiles', {
        category: newFact.category,
        key: newFact.key.trim(),
        value: newFact.value.trim(),
        confidence: 1.0,
      });
      setShowAddRow(false);
      setNewFact({ category: 'static', key: '', value: '' });
      onRefresh();
    } catch (err) {
      setAddError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') {
      setShowAddRow(false);
      setNewFact({ category: 'static', key: '', value: '' });
      setAddError(null);
    }
  };

  const handleEditKeyDown = (e, fact) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit(fact);
    }
    if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <div>
        {facts.length === 0 && !showAddRow ? (
          <div className="px-4 py-8 rounded-xl bg-[#faf9f4] border border-[#e3e0db] text-center">
            <User size={24} className="text-[#d4d0ca] mx-auto mb-2" />
            <p className="text-[#a3a3a3] text-sm font-['Space_Grotesk'] mb-1">
              No profile facts yet.
            </p>
            <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">
              Profile facts build automatically as you use HIVEMIND, or you can add them manually.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f3f1ec]">
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3">Category</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3">Key</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3">Value</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3 hidden lg:table-cell">Confidence</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3 hidden md:table-cell">Confirmed</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3 hidden lg:table-cell">Last Seen</th>
                  <th className="text-right text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2" />
                </tr>
              </thead>
              <tbody>
                {facts.map((fact) => (
                  <tr key={fact.id} className="border-b border-[#f3f1ec] last:border-b-0 group hover:bg-[#faf9f4] transition-colors">
                    <td className="py-3 pr-3">
                      <CategoryBadge category={fact.category} />
                    </td>
                    <td className="py-3 pr-3">
                      <span className="text-[#0a0a0a] font-['Space_Grotesk'] font-semibold">{fact.key}</span>
                    </td>
                    <td className="py-3 pr-3 max-w-[200px]">
                      {editingId === fact.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, fact)}
                            className="flex-1 bg-white border border-[#117dff]/40 rounded-lg py-1.5 px-3 text-[#0a0a0a] text-sm font-['Space_Grotesk'] outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(fact)}
                            disabled={saving}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg text-[#a3a3a3] hover:bg-[#f3f1ec] transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#525252] font-['Space_Grotesk'] truncate block">{fact.value}</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 hidden lg:table-cell">
                      <ConfidenceBar value={fact.confidence} />
                    </td>
                    <td className="py-3 pr-3 hidden md:table-cell">
                      <span className="text-[#525252] font-mono text-xs">
                        {fact.confirmedCount ?? 0}x
                      </span>
                    </td>
                    <td className="py-3 pr-3 hidden lg:table-cell">
                      <span className="text-[#a3a3a3] font-mono text-xs">
                        {formatDate(fact.lastConfirmedAt)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {editingId !== fact.id && (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(fact)}
                            className="p-1.5 rounded-lg text-[#525252] hover:bg-[#f3f1ec] hover:text-[#117dff] transition-colors"
                            title="Edit value"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(fact)}
                            className="p-1.5 rounded-lg text-[#525252] hover:bg-red-50 hover:text-[#dc2626] transition-colors"
                            title="Delete fact"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Fact Row */}
        <AnimatePresence>
          {showAddRow && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 rounded-xl bg-[#faf9f4] border border-[#e3e0db] space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Category selector */}
                  <div className="relative">
                    <select
                      value={newFact.category}
                      onChange={(e) => setNewFact((prev) => ({ ...prev, category: e.target.value }))}
                      className="appearance-none bg-white border border-[#e3e0db] rounded-lg py-2 pl-3 pr-8 text-[#0a0a0a] text-sm font-mono outline-none focus:border-[#117dff]/40 transition-colors cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_CONFIG[cat]?.label || cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a3a3a3] pointer-events-none" />
                  </div>
                  {/* Key */}
                  <input
                    type="text"
                    value={newFact.key}
                    onChange={(e) => setNewFact((prev) => ({ ...prev, key: e.target.value }))}
                    onKeyDown={handleAddKeyDown}
                    placeholder="Key (e.g. favorite_color)"
                    className="flex-1 min-w-[140px] bg-white border border-[#e3e0db] rounded-lg py-2 px-3 text-[#0a0a0a] text-sm font-['Space_Grotesk'] placeholder:text-[#a3a3a3] outline-none focus:border-[#117dff]/40 transition-colors"
                  />
                  {/* Value */}
                  <input
                    type="text"
                    value={newFact.value}
                    onChange={(e) => setNewFact((prev) => ({ ...prev, value: e.target.value }))}
                    onKeyDown={handleAddKeyDown}
                    placeholder="Value (e.g. blue)"
                    className="flex-1 min-w-[140px] bg-white border border-[#e3e0db] rounded-lg py-2 px-3 text-[#0a0a0a] text-sm font-['Space_Grotesk'] placeholder:text-[#a3a3a3] outline-none focus:border-[#117dff]/40 transition-colors"
                  />
                </div>
                {addError && (
                  <p className="text-[#dc2626] text-xs font-mono">{addError}</p>
                )}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowAddRow(false);
                      setNewFact({ category: 'static', key: '', value: '' });
                      setAddError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-['Space_Grotesk'] font-semibold text-[#525252] hover:bg-[#e3e0db] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={saving || !newFact.key.trim() || !newFact.value.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-['Space_Grotesk'] font-semibold text-white bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    Save Fact
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Fact Button */}
        {!showAddRow && (
          <button
            onClick={() => setShowAddRow(true)}
            className="mt-4 flex items-center gap-2 text-sm font-['Space_Grotesk'] font-semibold text-[#117dff] hover:text-[#0066e0] transition-colors"
          >
            <Plus size={14} />
            Add Fact
          </button>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Profile Fact"
          message={`Remove "${deleteTarget.key}: ${deleteTarget.value}" from your profile? This fact may be re-learned from future conversations.`}
          confirmLabel="Delete Fact"
          confirmVariant="red"
          confirmLoading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleteLoading) setDeleteTarget(null);
          }}
        />
      )}
    </>
  );
}

// ─── Section 6: Data & Privacy ──────────────────────────────────────────────

function DataPrivacySection() {
  const { logout } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleExport = async () => {
    setExportLoading(true);
    setExportMsg(null);
    try {
      await apiClient.controlPlane.post('/v1/account/export');
      setExportMsg({ type: 'success', text: 'Export request received. You will receive an email when ready.' });
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        setExportMsg({ type: 'info', text: 'Data export is coming soon.' });
      } else {
        setExportMsg({ type: 'error', text: err.response?.data?.error || err.message });
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    setDeleteMsg(null);
    try {
      await apiClient.deleteAccount('DELETE');
      apiClient.clearApiKey();
      setShowDeleteDialog(false);
      await logout();
    } catch (err) {
      setDeleteMsg(err.response?.data?.error || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Shield size={16} className="text-[#525252]" />
          <SectionHeading>Data &amp; Privacy</SectionHeading>
        </div>

        {/* Trust badge */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 mb-5">
          <MapPin size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-800 text-sm font-['Space_Grotesk'] font-semibold">
              Your data is stored in Frankfurt, Germany
            </p>
            <p className="text-emerald-700 text-xs font-['Space_Grotesk'] mt-0.5">
              GDPR compliant &nbsp;&middot;&nbsp; No US data transfer &nbsp;&middot;&nbsp; EU data residency guaranteed
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Export */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4]">
            <div>
              <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-semibold">Export My Data</p>
              <p className="text-[#525252] text-xs font-['Space_Grotesk'] mt-0.5">
                Download all your memories, observations and settings as JSON.
              </p>
              {exportMsg && (
                <p
                  className={`text-xs font-mono mt-1.5 ${
                    exportMsg.type === 'error'
                      ? 'text-[#dc2626]'
                      : exportMsg.type === 'success'
                      ? 'text-emerald-600'
                      : 'text-[#a3a3a3]'
                  }`}
                >
                  {exportMsg.text}
                </p>
              )}
            </div>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e3e0db] bg-white text-[#525252] text-sm font-['Space_Grotesk'] font-semibold hover:bg-[#f3f1ec] disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-4 flex-shrink-0"
            >
              {exportLoading ? (
                <div className="w-4 h-4 border-2 border-[#525252] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Export
            </button>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-red-100 bg-red-50">
            <div>
              <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-semibold">Delete My Account</p>
              <p className="text-[#525252] text-xs font-['Space_Grotesk'] mt-0.5">
                Permanently delete all your data. This action cannot be undone.
              </p>
              {deleteMsg && (
                <p className="text-[#dc2626] text-xs font-mono mt-1.5">{deleteMsg}</p>
              )}
            </div>
            <button
              onClick={() => {
                setDeleteConfirm('');
                setDeleteMsg(null);
                setShowDeleteDialog(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-[#dc2626] text-sm font-['Space_Grotesk'] font-semibold hover:bg-red-50 transition-colors ml-4 flex-shrink-0"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Privacy policy link */}
        <div className="mt-4 pt-4 border-t border-[#f3f1ec]">
          <a
            href="https://hivemind.davinciai.eu/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#a3a3a3] hover:text-[#117dff] transition-colors"
          >
            Privacy Policy
            <ExternalLink size={11} />
          </a>
        </div>
      </Card>

      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Account"
          message="This permanently deletes your account, session access, connectors, API keys, and user-linked memory data. Type DELETE to continue."
          confirmLabel="Delete Account"
          confirmVariant="red"
          confirmDisabled={deleteConfirm.trim().toUpperCase() !== 'DELETE'}
          confirmLoading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            if (!deleteLoading) {
              setShowDeleteDialog(false);
              setDeleteMsg(null);
            }
          }}
        >
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
            className="w-full rounded-xl border border-[#e3e0db] bg-[#faf9f4] px-3 py-2.5 text-sm font-mono text-[#0a0a0a] outline-none focus:border-[#dc2626]"
            autoFocus
          />
          {deleteMsg ? (
            <p className="mt-2 text-[#dc2626] text-xs font-mono">{deleteMsg}</p>
          ) : null}
        </ConfirmDialog>
      )}
    </>
  );
}

// ─── Main Profile Page ───────────────────────────────────────────────────────

export default function Profile() {
  const { user, org } = useAuth();
  const [factsExpanded, setFactsExpanded] = useState(false);

  // Fetch persistent profile facts from /api/profiles (plural)
  const profilesQuery = useApiQuery(async () => {
    const { data } = await apiClient.controlPlane.get('/v1/proxy/profiles');
    return data;
  });
  const { data: profilesData, loading: profilesLoading, refetch: refetchProfiles } = profilesQuery;

  // Fetch stats from /api/profile (singular, existing)
  // getProfile() returns { ok, profile: { memory_count, plan, ... }, graph_summary }
  const statsQuery = useApiQuery(() => apiClient.getProfile());
  const { data: statsRaw, loading: statsLoading } = statsQuery;

  // Flatten so downstream components can destructure memory_count, plan, etc. directly
  const statsData = statsRaw
    ? { ...statsRaw.profile, graph_summary: statsRaw.graph_summary }
    : null;

  const facts = profilesData?.facts || [];
  const loading = profilesLoading && statsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk'] mb-1">Second Brain Dashboard</h1>
        <p className="text-[#525252] text-sm font-['Space_Grotesk']">
          Your knowledge identity, memory footprint, and privacy controls
        </p>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Section 1: Brain Metrics Hero */}
        <BrainMetricsHero
          user={user}
          org={org}
          plan={statsData?.plan}
          stats={statsData}
          profileFacts={facts}
        />

        {/* Section 2: Knowledge Identity Card */}
        <KnowledgeIdentityCard
          facts={facts}
          onToggleEditor={() => setFactsExpanded((p) => !p)}
        />

        {/* Section 3: Knowledge Breakdown */}
        <KnowledgeBreakdown stats={statsData} />

        {/* Section 4: Recent Brain Activity */}
        <RecentBrainActivity />

        {/* Section 5: Profile Facts (collapsible) */}
        <Card>
          <button
            onClick={() => setFactsExpanded((p) => !p)}
            className="flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-2">
              <User size={16} className="text-[#117dff]" />
              <SectionHeading>Profile Facts Editor</SectionHeading>
              <span className="text-[#a3a3a3] text-xs font-mono ml-2">{facts.length} fact{facts.length !== 1 ? 's' : ''}</span>
            </div>
            <motion.div
              animate={{ rotate: factsExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={18} className="text-[#a3a3a3] group-hover:text-[#117dff] transition-colors" />
            </motion.div>
          </button>

          <AnimatePresence>
            {factsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="mt-5 pt-5 border-t border-[#f3f1ec]">
                  <ProfileFactsSection
                    facts={facts}
                    onRefresh={refetchProfiles}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Section 6: Data & Privacy */}
        <DataPrivacySection />
      </motion.div>
    </div>
  );
}
