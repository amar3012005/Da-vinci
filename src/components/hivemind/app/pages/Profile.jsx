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
  Network,
  Cloud,
  Server,
  Save,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';
import { useAuth } from '../auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import WorkspaceAccessCard from '../shared/WorkspaceAccessCard';

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
    <div className="w-16 h-16 rounded-[10px] bg-[#117dff] flex items-center justify-center select-none">
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
  dynamic: { variant: 'slate', icon: Sparkles, label: 'Dynamic' },
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
          slate: 'bg-slate-100 text-slate-700 border-slate-300',
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
  const { t } = useTranslation('dashboard');
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
            {t('profile.cancel', 'Cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled || confirmLoading}
            className={`px-4 py-2 rounded-xl text-sm font-['Space_Grotesk'] font-semibold text-white transition-colors ${
              confirmVariant === 'red' ? 'bg-[#dc2626] hover:bg-red-700 disabled:bg-red-300' : 'bg-[#117dff] hover:bg-[#0066e0] disabled:bg-[#7fb5ff]'
            }`}
          >
            {confirmLoading ? t('profile.processing', 'Processing...') : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Section 1: Brain Metrics Hero ──────────────────────────────────────────

// ─── Account Header Card ─────────────────────────────────────────────────────
// Compact identity card: avatar, name, email, plan/org badges, quick actions,
// inline stat ticker. Replaces the old dark-themed BrainMetricsHero — same
// info, lighter footprint, cleaner hierarchy on the page.
function AccountHeaderCard({ user, org, plan, stats, profileFacts, onSignOut }) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const nameFromFacts = profileFacts?.find((f) => f.key === 'name')?.value;
  const displayName = nameFromFacts || user?.display_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '—';

  const {
    memory_count: rawMemCount,
    observation_count = 0,
    relationship_count = 0,
  } = stats || {};
  const memoryCount = rawMemCount || (observation_count > 0 ? observation_count : 0);
  const factCount = profileFacts?.length || 0;
  const sourceCount = (stats?.top_source_platforms || []).length;

  const stats4 = [
    { label: t('profile.statMemories', 'Memories'),    value: memoryCount,        icon: Brain,   to: '/hivemind/app/memories' },
    { label: t('profile.statConnections', 'Connections'), value: relationship_count, icon: Link,    to: '/hivemind/app/graph' },
    { label: t('profile.statFacts', 'Facts'),       value: factCount,          icon: User,    to: null },
    { label: t('profile.statSources', 'Sources'),     value: sourceCount,        icon: Globe,   to: '/hivemind/app/connectors' },
  ];

  const quickActions = [
    { label: t('profile.actionTalkToHive', 'Talk to HIVE'), icon: MessageSquare, to: '/hivemind/app/overview', primary: true },
    { label: t('profile.actionMemoryGraph', 'Memory Graph'), icon: Network,       to: '/hivemind/app/graph' },
    { label: t('profile.actionConnectors', 'Connectors'),   icon: ExternalLink,  to: '/hivemind/app/connectors' },
    { label: t('profile.actionSettings', 'Settings'),     icon: Settings2,     to: '/hivemind/app/settings' },
  ];

  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-[#e3e0db] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Top: identity row */}
      <div className="p-6 flex flex-col md:flex-row md:items-center gap-5">
        <UserAvatar displayName={displayName} email={email} />
        <div className="flex-1 min-w-0">
          <h2 className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk'] truncate">{displayName}</h2>
          <p className="text-[#737373] text-sm font-mono truncate">{email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {org && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#f3f1ec] text-[#525252] border border-[#e3e0db]">
                <Building2 size={11} />
                {org.name || org.slug || t('profile.org', 'Org')}
              </span>
            )}
            <PlanBadge plan={plan} />
            {org?.memory_storage_label && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]">
                <Brain size={11} />
                {org.plan === 'free' ? 'Personal' : 'Enterprise'} · {org.memory_storage_label}
              </span>
            )}
            {user?.role && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/20">
                <Shield size={11} />
                {user.role}
              </span>
            )}
          </div>
        </div>
        {/* Sign Out */}
        <button
          onClick={onSignOut}
          className="self-start md:self-center inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#dc2626] border border-[#dc2626]/20 hover:bg-[#dc2626]/5 transition-colors"
        >
          {t('profile.signOut', 'Sign Out')}
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-6 pb-5 grid grid-cols-2 md:grid-cols-4 gap-2">
        {quickActions.map(({ label, icon: Icon, to, primary }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[12.5px] font-semibold font-['Space_Grotesk'] transition-colors ${
              primary
                ? 'bg-[#0a0a0a] text-white hover:bg-[#262626]'
                : 'bg-[#faf9f4] text-[#0a0a0a] border border-[#e3e0db] hover:bg-[#f3f1ec]'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Stat ticker — click to jump */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[#f3f1ec]">
        {stats4.map(({ label, value, icon: Icon, to }, i) => {
          const inner = (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={12} className="text-[#117dff]" />
                <span className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-[0.1em]">{label}</span>
              </div>
              <p className="text-[#0a0a0a] text-2xl font-bold font-mono leading-none">
                <AnimatedCounter value={value} />
              </p>
            </>
          );
          const borderCls = i < stats4.length - 1 ? 'sm:border-r border-[#f3f1ec]' : '';
          return to ? (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={`px-5 py-4 text-left hover:bg-[#faf9f4] transition-colors ${borderCls}`}
            >
              {inner}
            </button>
          ) : (
            <div key={label} className={`px-5 py-4 ${borderCls}`}>
              {inner}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// BrainMetricsHero removed — superseded by AccountHeaderCard above which
// folds identity, plan/org badges, quick actions, and the stat ticker into
// one compact light-themed card.


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
  const { t } = useTranslation('dashboard');

  if (!facts || facts.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} className="text-[#117dff]" />
          <SectionHeading>{t('profile.brainKnows', 'What Your Brain Knows About You')}</SectionHeading>
        </div>
        <div className="px-4 py-8 rounded-xl bg-[#faf9f4] border border-[#e3e0db] text-center">
          <User size={24} className="text-[#d4d0ca] mx-auto mb-2" />
          <p className="text-[#a3a3a3] text-sm font-['Space_Grotesk'] mb-1">
            {t('profile.noIdentityFacts', 'No identity facts yet.')}
          </p>
          <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">
            {t('profile.identityFactsHint', 'Profile facts build automatically as you use HIVEMIND, or add them manually below.')}
          </p>
        </div>
        <button
          onClick={onToggleEditor}
          className="mt-4 flex items-center gap-2 text-sm font-['Space_Grotesk'] font-semibold text-[#117dff] hover:text-[#0066e0] transition-colors"
        >
          <Plus size={14} />
          {t('profile.addProfileFacts', 'Add Profile Facts')}
        </button>
      </Card>
    );
  }

  // Grouped, supermemory-style: durable Identity + live Current context + Goals,
  // then Preferences. Each group only renders when it has facts.
  const byCat = (c) => facts.filter((f) => (f.category || 'static') === c);
  const groups = [
    { cat: 'static', label: t('profile.identity', 'Identity'), icon: User },
    { cat: 'dynamic', label: t('profile.currentContext', 'Current context'), icon: Sparkles },
    { cat: 'goal', label: t('profile.goals', 'Goals'), icon: Target },
  ];
  const preferences = byCat('preference');

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-[#117dff]" />
          <SectionHeading>{t('profile.brainKnows', 'What Your Brain Knows About You')}</SectionHeading>
        </div>
        <span className="text-[#a3a3a3] text-xs font-mono">{facts.length} {facts.length !== 1 ? t('profile.facts', 'facts') : t('profile.fact', 'fact')}</span>
      </div>

      <div className="space-y-5">
        {groups.map(({ cat, label, icon: GIcon }) => {
          const items = byCat(cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2.5">
                <GIcon size={13} className="text-[#117dff]" />
                <span className="text-[#0a0a0a] text-[13px] font-semibold font-['Space_Grotesk']">{label}</span>
                <span className="text-[#a3a3a3] text-[11px] font-mono">{items.length}</span>
              </div>
              {cat === 'static' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((fact) => {
                    const Icon = getIconForKey(fact.key);
                    return (
                      <div
                        key={fact.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[#faf9f4] border border-[#e3e0db] hover:border-[#117dff]/30 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#117dff]/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={14} className="text-[#117dff]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider truncate">{fact.key}</p>
                          <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-semibold">{fact.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((fact) => (
                    <div key={fact.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#faf9f4] border border-[#e3e0db]">
                      <div className="min-w-0 flex-1">
                        <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk']">{fact.value}</p>
                        {fact.confirmedCount > 1 && (
                          <p className="text-[#a3a3a3] text-[10px] font-mono mt-0.5">confirmed {fact.confirmedCount}×</p>
                        )}
                      </div>
                      {typeof fact.confidence === 'number' && <ConfidenceBar value={fact.confidence} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {preferences.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Settings2 size={13} className="text-[#117dff]" />
              <span className="text-[#0a0a0a] text-[13px] font-semibold font-['Space_Grotesk']">{t('profile.preferences', 'Preferences')}</span>
              <span className="text-[#a3a3a3] text-[11px] font-mono">{preferences.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferences.map((pref) => (
                <PillBadge key={pref.id} variant="amber">{pref.value}</PillBadge>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onToggleEditor}
        className="mt-5 flex items-center gap-2 text-sm font-['Space_Grotesk'] font-semibold text-[#117dff] hover:text-[#0066e0] transition-colors"
      >
        <Pencil size={13} />
        {t('profile.editProfileFacts', 'Edit Profile Facts')}
        <ChevronDown size={14} />
      </button>
    </Card>
  );
}

// ─── Section 3: Knowledge Breakdown ─────────────────────────────────────────

function KnowledgeBreakdown({ stats }) {
  const { t } = useTranslation('dashboard');
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
    { label: t('profile.relUpdates', 'Updates'), count: graph_summary.update || 0, color: '#3b82f6' },
    { label: t('profile.relExtends', 'Extends'), count: graph_summary.extend || 0, color: '#117dff' },
    { label: t('profile.relDerives', 'Derives'), count: graph_summary.derive || 0, color: '#a855f7' },
  ];
  const maxRelCount = Math.max(...relationshipTypes.map((r) => r.count), 1);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 size={16} className="text-[#117dff]" />
        <SectionHeading>{t('profile.knowledgeBreakdown', 'Knowledge Breakdown')}</SectionHeading>
      </div>

      {/* Knowledge Sources */}
      {sourcesWithPct.length > 0 && (
        <div className="mb-6">
          <p className="text-[#525252] text-xs font-mono uppercase tracking-wider mb-3">{t('profile.knowledgeSources', 'Knowledge Sources')}</p>
          <div className="space-y-3">
            {sourcesWithPct.map(({ name, pct, count }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-semibold">{name}</span>
                  <span className="text-[#a3a3a3] text-xs font-mono">
                    ~{count.toLocaleString()} {t('profile.memories', 'memories')} &middot; {pct}%
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
        <p className="text-[#525252] text-xs font-mono uppercase tracking-wider mb-3">{t('profile.connectionStrength', 'Connection Strength')}</p>
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
            <span className="text-[#525252] text-xs font-mono uppercase tracking-wider">{t('profile.topTags', 'Top Tags')}</span>
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
  const { t } = useTranslation('dashboard');
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
    if (mins < 1) return t('profile.justNow', 'just now');
    if (mins < 60) return `${mins}${t('profile.minAgo', 'm ago')}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}${t('profile.hourAgo', 'h ago')}`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}${t('profile.dayAgo', 'd ago')}`;
    return `${Math.floor(days / 7)}${t('profile.weekAgo', 'w ago')}`;
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-5">
        <Activity size={16} className="text-[#117dff]" />
        <SectionHeading>{t('profile.recentBrainActivity', 'Recent Brain Activity')}</SectionHeading>
      </div>

      {recentLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : memories.length === 0 ? (
        <div className="px-4 py-8 rounded-xl bg-[#faf9f4] border border-[#e3e0db] text-center">
          <Brain size={24} className="text-[#d4d0ca] mx-auto mb-2" />
          <p className="text-[#a3a3a3] text-sm font-['Space_Grotesk']">
            {t('profile.noRecentMemories', 'No recent memories found. Start adding knowledge to your second brain.')}
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {memories.slice(0, 5).map((mem, idx) => {
            const title = mem.title || mem.content?.slice(0, 60) || mem.text?.slice(0, 60) || t('profile.untitledMemory', 'Untitled memory');
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
        {t('profile.viewAllMemories', 'View All Memories')}
        <ArrowRight size={14} />
      </button>
    </Card>
  );
}

// ─── Section 5: Profile Facts (Collapsible) ─────────────────────────────────

function ProfileFactsSection({ facts, onRefresh }) {
  const { t } = useTranslation('dashboard');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newFact, setNewFact] = useState({ category: 'static', key: '', value: '' });
  const [addError, setAddError] = useState(null);
  const [rebuilding, setRebuilding] = useState(false);

  // Re-run the profile-dreamer over the user's memories, then refresh the list.
  // Server-gated to admin/owner; a non-admin gets a 403 and we just stop.
  const handleRebuild = async () => {
    if (rebuilding) return;
    setRebuilding(true);
    try {
      await apiClient.rebuildProfile();
      await onRefresh?.();
    } catch (err) {
      console.warn('[profile] rebuild failed:', err?.message || err);
    } finally {
      setRebuilding(false);
    }
  };

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
      setAddError(err.response?.data?.error || err.message || 'Failed to update fact');
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
      setAddError(err.response?.data?.error || err.message || 'Failed to delete fact');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAdd = async () => {
    setAddError(null);
    if (!newFact.key.trim() || !newFact.value.trim()) {
      setAddError(t('profile.addErrorRequired', 'Both key and value are required.'));
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
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={handleRebuild}
          disabled={rebuilding}
          title={t('profile.rebuildHint', 'Rebuild your profile from your latest memories')}
          className="flex items-center gap-1.5 text-[#117dff] text-xs font-medium hover:text-[#0a5fd0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={13} className={rebuilding ? 'animate-spin' : ''} />
          {rebuilding ? t('profile.rebuilding', 'Rebuilding…') : t('profile.rebuild', 'Rebuild')}
        </button>
      </div>
      <div>
        {facts.length === 0 && !showAddRow ? (
          <div className="px-4 py-8 rounded-xl bg-[#faf9f4] border border-[#e3e0db] text-center">
            <User size={24} className="text-[#d4d0ca] mx-auto mb-2" />
            <p className="text-[#a3a3a3] text-sm font-['Space_Grotesk'] mb-1">
              {t('profile.noProfileFacts', 'No profile facts yet.')}
            </p>
            <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">
              {t('profile.profileFactsHint', 'Profile facts build automatically as you use HIVEMIND, or you can add them manually.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f3f1ec]">
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3">{t('profile.thCategory', 'Category')}</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3">{t('profile.thKey', 'Key')}</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3">{t('profile.thValue', 'Value')}</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3 hidden lg:table-cell">{t('profile.thConfidence', 'Confidence')}</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3 hidden md:table-cell">{t('profile.thConfirmed', 'Confirmed')}</th>
                  <th className="text-left text-[#a3a3a3] text-xs font-mono uppercase tracking-wider py-2 pr-3 hidden lg:table-cell">{t('profile.thLastSeen', 'Last Seen')}</th>
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
                            title={t('profile.editValue', 'Edit value')}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(fact)}
                            className="p-1.5 rounded-lg text-[#525252] hover:bg-red-50 hover:text-[#dc2626] transition-colors"
                            title={t('profile.deleteFact', 'Delete fact')}
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
                    placeholder={t('profile.keyPlaceholder', 'Key (e.g. favorite_color)')}
                    className="flex-1 min-w-[140px] bg-white border border-[#e3e0db] rounded-lg py-2 px-3 text-[#0a0a0a] text-sm font-['Space_Grotesk'] placeholder:text-[#a3a3a3] outline-none focus:border-[#117dff]/40 transition-colors"
                  />
                  {/* Value */}
                  <input
                    type="text"
                    value={newFact.value}
                    onChange={(e) => setNewFact((prev) => ({ ...prev, value: e.target.value }))}
                    onKeyDown={handleAddKeyDown}
                    placeholder={t('profile.valuePlaceholder', 'Value (e.g. blue)')}
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
                    {t('profile.cancel', 'Cancel')}
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
                    {t('profile.saveFact', 'Save Fact')}
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
            {t('profile.addFact', 'Add Fact')}
          </button>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title={t('profile.deleteFactTitle', 'Delete Profile Fact')}
          message={t('profile.deleteFactMsg', 'Remove "{{key}}: {{value}}" from your profile? This fact may be re-learned from future conversations.', { key: deleteTarget.key, value: deleteTarget.value })}
          confirmLabel={t('profile.deleteFactBtn', 'Delete Fact')}
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
  const { t } = useTranslation('dashboard');
  const { logout } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStep, setDeleteStep] = useState('');
  const [isSelfHost, setIsSelfHost] = useState(false);
  const [managedReconfirm, setManagedReconfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await apiClient.selfHostStatus();
        if (!cancelled) setIsSelfHost(!!(s && s.registered));
      } catch {
        if (!cancelled) setIsSelfHost(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = async () => {
    setExportLoading(true);
    setExportMsg(null);
    try {
      await apiClient.controlPlane.post('/v1/account/export');
      setExportMsg({ type: 'success', text: t('profile.exportSuccess', 'Export request received. You will receive an email when ready.') });
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        setExportMsg({ type: 'info', text: t('profile.exportComingSoon', 'Data export is coming soon.') });
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
    setDeleteProgress(0);
    setDeleteStep(t('profile.deletingInitiating', 'Initiating deletion...'));
    try {
      setDeleteProgress(20);
      setDeleteStep(t('profile.deletingAccountData', 'Deleting account data...'));
      await apiClient.deleteAccount('DELETE');
      apiClient.clearApiKey();
      setDeleteProgress(100);
      setDeleteStep(t('profile.deletingRedirecting', 'Account deleted. Redirecting...'));
      setTimeout(async () => {
        setShowDeleteDialog(false);
        await logout();
      }, 1500);
    } catch (err) {
      const serverErr = err.response?.data?.error;
      const blockingOrg = err.response?.data?.org;
      const friendly = blockingOrg && serverErr
        ? `${serverErr} (Org: ${blockingOrg.name})`
        : serverErr || err.message || t('profile.deletionFailed', 'Deletion failed');
      setDeleteMsg(friendly);
      setDeleteProgress(0);
      setDeleteStep('');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Shield size={16} className="text-[#525252]" />
          <SectionHeading>{t('profile.dataPrivacy', 'Data & Privacy')}</SectionHeading>
        </div>

        {/* Trust badge */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 mb-5">
          <MapPin size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-800 text-sm font-['Space_Grotesk'] font-semibold">
              {t('profile.dataLocation', 'Your data is stored in Frankfurt, Germany')}
            </p>
            <p className="text-emerald-700 text-xs font-['Space_Grotesk'] mt-0.5">
              {t('profile.gdprNote', 'GDPR compliant  ·  No US data transfer  ·  EU data residency guaranteed')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Export */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4]">
            <div>
              <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-semibold">{t('profile.exportMyData', 'Export My Data')}</p>
              <p className="text-[#525252] text-xs font-['Space_Grotesk'] mt-0.5">
                {t('profile.exportDesc', 'Download all your memories, observations and settings as JSON.')}
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
              {t('profile.exportBtn', 'Export')}
            </button>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-red-100 bg-red-50">
            <div>
              <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-semibold">{t('profile.deleteMyAccount', 'Delete My Account')}</p>
              <p className="text-[#525252] text-xs font-['Space_Grotesk'] mt-0.5">
                {isSelfHost
                  ? t('profile.deleteSelfHostDesc', 'Removes only your Singulance identity, API keys, sessions, and the connection. Your memories, vectors, and relationship graph stay on your own server and are not touched.')
                  : t('profile.deleteManagedDesc', 'Permanently delete all your data. This action cannot be undone.')}
              </p>
              {deleteMsg && (
                <p className="text-[#dc2626] text-xs font-mono mt-1.5">{deleteMsg}</p>
              )}
            </div>
            <button
              onClick={() => {
                setDeleteConfirm('');
                setDeleteMsg(null);
                setManagedReconfirm(false);
                setShowDeleteDialog(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-[#dc2626] text-sm font-['Space_Grotesk'] font-semibold hover:bg-red-50 transition-colors ml-4 flex-shrink-0"
            >
              <Trash2 size={14} />
              {t('profile.deleteBtn', 'Delete')}
            </button>
          </div>
        </div>

        {/* Privacy policy link */}
        <div className="mt-4 pt-4 border-t border-[#f3f1ec]">
          <a
            href="https://singulancelabs.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#a3a3a3] hover:text-[#117dff] transition-colors"
          >
            {t('profile.privacyPolicy', 'Privacy Policy')}
            <ExternalLink size={11} />
          </a>
        </div>
      </Card>

      {showDeleteDialog && (
        <ConfirmDialog
          title={t('profile.deleteAccountTitle', 'Delete Account')}
          message={
            deleteLoading
              ? ''
              : managedReconfirm
              ? t('profile.deleteFinalConfirmMsg', 'Are you absolutely sure? This is your final confirmation — data cannot be recovered.')
              : isSelfHost
              ? t('profile.deleteSelfHostMsg', 'Your memory data stays on your server. Your memories, vectors, and relationship graph live in the .amr (and Postgres) on your own machine and are NOT touched. This removes only your Singulance identity, API keys, sessions, and the connection. Type DELETE to confirm.')
              : t('profile.deleteManagedMsg', 'This permanently deletes your account, session access, connectors, API keys, and ALL your memory data on Singulance. This cannot be undone. Type DELETE to continue.')
          }
          confirmLabel={
            managedReconfirm
              ? t('profile.deleteFinalConfirmBtn', 'Yes, delete everything')
              : t('profile.deleteAccountBtn', 'Delete Account')
          }
          confirmVariant="red"
          confirmDisabled={deleteConfirm.trim().toUpperCase() !== 'DELETE' || deleteLoading}
          confirmLoading={deleteLoading}
          onConfirm={() => {
            if (!isSelfHost && !managedReconfirm) {
              setManagedReconfirm(true);
              return;
            }
            handleDeleteConfirm();
          }}
          onCancel={() => {
            if (!deleteLoading) {
              setShowDeleteDialog(false);
              setDeleteMsg(null);
              setDeleteProgress(0);
              setDeleteStep('');
              setManagedReconfirm(false);
            }
          }}
        >
          {deleteLoading ? (
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="w-full h-3 rounded-full bg-[#f3f1ec] overflow-hidden border border-[#e3e0db]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: deleteProgress >= 100
                      ? 'linear-gradient(90deg, #059669, #34d399)'
                      : 'linear-gradient(90deg, #dc2626, #f87171)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${deleteProgress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              {/* Percentage + step */}
              <div className="flex items-center justify-between">
                <span className="text-[#525252] text-xs font-['Space_Grotesk']">{deleteStep}</span>
                <span className="text-[#0a0a0a] text-sm font-mono font-bold">{deleteProgress}%</span>
              </div>
            </div>
          ) : (
            <>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={t('profile.typeDeletePlaceholder', 'Type DELETE')}
                className="w-full rounded-xl border border-[#e3e0db] bg-[#faf9f4] px-3 py-2.5 text-sm font-mono text-[#0a0a0a] outline-none focus:border-[#dc2626]"
                autoFocus
              />
              {deleteMsg ? (
                <p className="mt-2 text-[#dc2626] text-xs font-mono">{deleteMsg}</p>
              ) : null}
            </>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}

// ─── Main Profile Page ───────────────────────────────────────────────────────

function OrganizationContextCard({ org, user }) {
  const [draft, setDraft] = useState({ website: '', industry: '', description: '', audience: '', mission: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const profileQuery = useApiQuery(
    () => org?.id ? apiClient.getOrganizationProfile(org.id).catch(() => null) : Promise.resolve(null),
    [org?.id],
  );
  const context = profileQuery.data?.organization;
  const canEdit = profileQuery.data?.can_edit === true;
  const company = context?.company_profile || org?.company_profile || {};
  const plan = context?.plan || org?.plan || 'free';
  const hostingMode = context?.hosting_mode || org?.hosting_mode || 'managed';
  const userType = plan === 'enterprise' ? 'Enterprise' : 'Personal';

  useEffect(() => {
    setDraft({
      website: company.website || '',
      industry: company.industry || '',
      description: company.description || '',
      audience: company.audience || '',
      mission: company.mission || '',
    });
  }, [company.website, company.industry, company.description, company.audience, company.mission]);

  const save = async () => {
    if (!org?.id || !canEdit) return;
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.updateOrganizationProfile(org.id, draft);
      await profileQuery.refetch();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-4 border-b border-[#f3f1ec] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#117dff]/20 bg-[#117dff]/10">
            <Building2 size={18} className="text-[#117dff]" />
          </div>
          <div>
            <SectionHeading>Workspace identity</SectionHeading>
            <p className="mt-1 text-sm leading-relaxed text-[#525252]">Profile owns who you are and what this workspace represents. Settings controls how it operates; Team controls who can access it.</p>
          </div>
        </div>
        <span className="w-fit rounded-full border border-[#117dff]/20 bg-[#117dff]/10 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-[0.08em] text-[#117dff]">{userType}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Organization ID', context?.id || org?.id || '—'],
          ['Plan', plan],
          ['Hosting', hostingMode === 'self_host' ? 'Self-hosted' : 'Managed'],
          ['Your role', user?.role || 'member'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3]">{label}</p>
            <p className="mt-1 flex items-center gap-1.5 break-all text-sm font-semibold text-[#0a0a0a]">
              {label === 'Hosting' && (hostingMode === 'self_host' ? <Server size={13} className="text-[#117dff]" /> : <Cloud size={13} className="text-[#117dff]" />)}
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0a0a0a]">Company overview</p>
            <p className="mt-0.5 text-xs text-[#737373]">The canonical context available to your organization and AI workspace.</p>
          </div>
          {!canEdit && <span className="text-xs text-[#737373]">Only an owner or admin can edit</span>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#525252]">Website</span>
            <input value={draft.website} onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))} disabled={!canEdit} placeholder="https://company.com" className="w-full rounded-lg border border-[#e3e0db] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#117dff] disabled:cursor-not-allowed disabled:bg-[#faf9f4]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#525252]">Industry</span>
            <input value={draft.industry} onChange={(event) => setDraft((current) => ({ ...current, industry: event.target.value }))} disabled={!canEdit} placeholder="e.g. Climate technology" className="w-full rounded-lg border border-[#e3e0db] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#117dff] disabled:cursor-not-allowed disabled:bg-[#faf9f4]" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-[#525252]">What the company does</span>
            <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} disabled={!canEdit} rows={3} placeholder="Describe the product, services, and operating context." className="w-full resize-y rounded-lg border border-[#e3e0db] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#117dff] disabled:cursor-not-allowed disabled:bg-[#faf9f4]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#525252]">Audience</span>
            <input value={draft.audience} onChange={(event) => setDraft((current) => ({ ...current, audience: event.target.value }))} disabled={!canEdit} placeholder="Who you serve" className="w-full rounded-lg border border-[#e3e0db] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#117dff] disabled:cursor-not-allowed disabled:bg-[#faf9f4]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#525252]">Mission</span>
            <input value={draft.mission} onChange={(event) => setDraft((current) => ({ ...current, mission: event.target.value }))} disabled={!canEdit} placeholder="What the team is working toward" className="w-full rounded-lg border border-[#e3e0db] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#117dff] disabled:cursor-not-allowed disabled:bg-[#faf9f4]" />
          </label>
        </div>
        {canEdit && (
          <div className="mt-4 flex items-center gap-3">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0066e0] disabled:opacity-50">
              <Save size={14} /> {saving ? 'Saving…' : 'Save company overview'}
            </button>
            {saved && <span className="text-sm font-medium text-emerald-700">Saved to the organization context.</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Profile() {
  const { t } = useTranslation('dashboard');
  const { user, org, logout } = useAuth();
  // Profile Facts auto-expand by default — they're the most-useful
  // editable surface on this page, no reason to hide them on first load.
  const [factsExpanded, setFactsExpanded] = useState(true);

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
  const { data: billing } = useApiQuery(() => apiClient.getBillingPlan().catch(() => null), []);

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
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk'] mb-1">{t('profile.title', 'Your Profile')}</h1>
        <p className="text-[#525252] text-sm font-['Space_Grotesk']">
          {t('profile.subtitle', 'Account info, knowledge identity, and privacy controls')}
        </p>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Section 1: Account header — identity + quick actions + stat ticker */}
        <AccountHeaderCard
          user={user}
          org={org}
          plan={statsData?.plan}
          stats={statsData}
          profileFacts={facts}
          onSignOut={logout}
        />

        <WorkspaceAccessCard billing={billing} />

        <OrganizationContextCard org={org} user={user} />

        {/* Section 2: Knowledge Identity Card */}
        <KnowledgeIdentityCard
          facts={facts}
          onToggleEditor={() => setFactsExpanded(true)}
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
              <SectionHeading>{t('profile.profileFactsEditor', 'Profile Facts Editor')}</SectionHeading>
              <span className="text-[#a3a3a3] text-xs font-mono ml-2">{facts.length} {facts.length !== 1 ? t('profile.facts', 'facts') : t('profile.fact', 'fact')}</span>
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
