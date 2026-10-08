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
  ArrowRight,
  Globe,
  Mail,
  Briefcase,
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

function PlanBadge({ plan, label }) {
  const map = {
    free: { label: 'Free', variant: 'gray', dot: '#a3a3a3' },
    plus: { label: 'BRAIN+', variant: 'blue', dot: '#117dff' },
    pro: { label: 'Pro', variant: 'blue', dot: '#117dff' },
    team: { label: 'Team', variant: 'purple', dot: '#a855f7' },
    scale: { label: 'Scale', variant: 'purple', dot: '#a855f7' },
    enterprise: { label: 'Enterprise', variant: 'green', dot: '#059669' },
  };
  const cfg = map[plan?.toLowerCase()] || { label: plan ? String(plan).replaceAll('_', ' ') : 'Not available', variant: 'gray', dot: '#a3a3a3' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
        { gray: 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]', blue: 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20', purple: 'bg-purple-50 text-purple-700 border-purple-200', green: 'bg-emerald-50 text-emerald-700 border-emerald-200' }[cfg.variant]
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {label || cfg.label}
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
function AccountHeaderCard({ user, org, plan, planLabel, onSignOut }) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const displayName = user?.display_name || user?.name || user?.email?.split('@')[0] || 'Your account';

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar displayName={displayName} email={user?.email} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[#0a0a0a] break-words">{displayName}</h2>
          <p className="mt-1 text-sm text-[#737373] break-all">{user?.email || '—'}</p>
        </div>
        <button onClick={onSignOut} className="rounded-lg border border-[#e3e0db] px-4 py-2 text-sm text-[#525252] hover:bg-[#f3f1ec]">
          {t('profile.signOut', 'Sign Out')}
        </button>
      </div>
      <div className="mt-6 divide-y divide-[#e3e0db] border-t border-[#e3e0db]">
        <div className="flex items-center justify-between gap-4 py-4 text-sm">
          <span className="text-[#737373]">{t('profile.workspaceLabel', 'Workspace')}</span>
          <span className="text-right text-[#0a0a0a]">{org?.name || org?.slug || 'Personal'}{user?.role ? ` · ${user.role}` : ''}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
          <span className="text-[#737373]">{t('profile.planLabel', 'Plan')}</span>
          <div className="flex items-center gap-3"><PlanBadge plan={plan} label={planLabel} /><button onClick={() => navigate('/hivemind/app/billing')} className="text-[#117dff] hover:underline">{t('profile.manageBilling', 'Manage billing')}</button></div>
        </div>
        <div className="flex items-center justify-between gap-4 pt-4 text-sm">
          <span className="text-[#737373]">{t('profile.preferencesLabel', 'Preferences')}</span>
          <button onClick={() => navigate('/hivemind/app/settings')} className="text-[#117dff] hover:underline">{t('profile.openSettings', 'Open settings')}</button>
        </div>
      </div>
    </Card>
  );
}

// ─── Section 2: Knowledge Identity Card ─────────────────────────────────────

function isWorkspaceFact(fact) {
  return /^(company|organization|workspace)(:|_|$)/i.test(fact.key || '');
}

function readableFactKey(key) {
  return String(key || 'Context').replace(/^(company|organization|workspace)[:_]/i, '').replace(/[_:]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function KnowledgeIdentityCard({ facts, onManage, workspace = false }) {
  const { t } = useTranslation('dashboard');
  const groups = [
    { id: 'static', title: t('profile.learnedAboutYou', 'Background'), hint: 'Details Brain has learned from your work.', icon: User },
    { id: 'preference', title: t('profile.workingStyle', 'Working style'), hint: 'Your communication and working preferences.', icon: Settings2 },
    { id: 'goal', title: t('profile.priorities', 'Goals and priorities'), hint: 'The outcomes you are working toward.', icon: Target },
    { id: 'dynamic', title: t('profile.currentFocus', 'Current focus'), hint: 'Context that may change as your work evolves.', icon: Sparkles },
  ];
  const knownCategories = groups.map((group) => group.id);
  const other = facts.filter((fact) => !knownCategories.includes(fact.category || 'static'));
  if (other.length) groups.push({ id: 'other', title: 'Other context', hint: 'Additional details saved in your profile.', icon: Tag });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0a0a0a]">{workspace ? t('profile.learnedCompanyContext', 'What Brain has learned about your company') : t('profile.personalContext', 'Make Brain familiar with your work')}</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#737373]">{workspace ? 'Learned context is separate from your company profile. Review it when something changes.' : 'Review what Brain remembers, correct a detail, or add a preference. These details are separate from your account information.'}</p>
        </div>
        <button type="button" onClick={() => onManage(null)} className="rounded-lg border border-[#e3e0db] bg-white px-4 py-2 text-sm font-medium text-[#117dff] hover:bg-[#f3f1ec]">{t('profile.manageRememberedDetails', 'Manage details')}</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map(({ id, title, hint, icon: Icon }) => {
          const items = id === 'other' ? other : facts.filter((fact) => (fact.category || 'static') === id);
          return (
            <section key={id} className="min-w-0 rounded-xl border border-[#e3e0db] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0a0a0a]"><Icon size={16} className="text-[#737373]" />{title}</h3>
                <span className="text-xs text-[#737373]">{items.length}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#737373]">{hint}</p>
              {items.length ? (
                <div className="mt-4 space-y-3">
                  {items.slice(0, 2).map((fact) => (
                    <div key={fact.id || `${fact.category}:${fact.key}`} className="min-w-0">
                      <p className="text-xs font-medium text-[#737373]">{readableFactKey(fact.key)}</p>
                      <p className="mt-1 line-clamp-3 break-words text-sm leading-6 text-[#202020]">{fact.value}</p>
                    </div>
                  ))}
                  {items.length > 2 && <p className="text-xs text-[#737373]">+{items.length - 2} more saved details</p>}
                </div>
              ) : <p className="mt-4 text-sm text-[#a3a3a3]">{id === 'preference' ? 'No preferences saved yet.' : 'Nothing saved here yet.'}</p>}
              <button type="button" onClick={() => onManage(id === 'other' ? null : id)} className="mt-4 text-sm font-medium text-[#117dff] hover:underline">{items.length ? 'Review and edit' : 'Get started'}</button>
            </section>
          );
        })}
      </div>
    </div>
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

function ProfileFactsSection({ facts, onRefresh, initialCategory = 'all', canRebuild = false }) {
  const { t } = useTranslation('dashboard');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  useEffect(() => { setCategoryFilter(initialCategory); setSearch(''); }, [initialCategory]);
  const visibleFacts = facts.filter((fact) => (categoryFilter === 'all' || (fact.category || 'static') === categoryFilter) && `${fact.key} ${fact.value}`.toLowerCase().includes(search.toLowerCase()));
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newFact, setNewFact] = useState({ category: initialCategory === 'all' ? 'static' : initialCategory, key: '', value: '' });
  useEffect(() => { setNewFact((current) => ({ ...current, category: initialCategory === 'all' ? 'static' : initialCategory })); }, [initialCategory]);
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
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="min-w-[180px] flex-1"><span className="sr-only">Search saved details</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search saved details" className="w-full rounded-lg border border-[#e3e0db] px-3 py-2 text-sm focus:border-[#117dff]" /></label>
        <label><span className="sr-only">Type of detail</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-[#e3e0db] bg-white px-3 py-2 text-sm"><option value="all">All details</option>{CATEGORIES.map((category) => <option key={category} value={category}>{({ static: 'Background', dynamic: 'Current focus', preference: 'Working style', goal: 'Goals' })[category]}</option>)}</select></label>
      </div>
      {addError && <p role="alert" className="mb-3 text-sm text-red-600">{addError}</p>}
      <div>
        {!visibleFacts.length && <p className="rounded-lg bg-[#faf9f4] p-5 text-sm text-[#737373]">{facts.length ? 'No saved details match these filters.' : 'Add a detail to help Brain understand your work.'}</p>}
        <div className="divide-y divide-[#e3e0db]">
          {visibleFacts.map((fact) => (
            <div key={fact.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#0a0a0a]">{readableFactKey(fact.key)}</p>
                  {editingId === fact.id ? <label><span className="sr-only">Edit {readableFactKey(fact.key)}</span><textarea value={editValue} onChange={(event) => setEditValue(event.target.value)} onKeyDown={(event) => handleEditKeyDown(event, fact)} rows={3} className="mt-2 w-full rounded-lg border border-[#e3e0db] p-3 text-sm" /></label> : <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#525252]">{fact.value}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {editingId === fact.id ? <><button onClick={() => saveEdit(fact)} disabled={saving} aria-label="Save detail" className="rounded-lg p-2 text-[#117dff] disabled:opacity-50"><Check size={16} /></button><button onClick={cancelEdit} disabled={saving} aria-label="Cancel editing" className="rounded-lg p-2 text-[#737373]"><X size={16} /></button></> : <><button onClick={() => startEdit(fact)} aria-label={`Edit ${readableFactKey(fact.key)}`} className="rounded-lg p-2 text-[#737373] hover:bg-[#f3f1ec]"><Pencil size={15} /></button><button onClick={() => setDeleteTarget(fact)} aria-label={`Remove ${readableFactKey(fact.key)}`} className="rounded-lg p-2 text-[#737373] hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button></>}
                </div>
              </div>
              <details className="mt-2 text-xs text-[#737373]"><summary className="cursor-pointer">Details</summary><div className="mt-2 space-y-1"><p>Stored as: {fact.key} · {fact.category || 'static'}</p><p>Last seen: {formatDate(fact.lastSeen || fact.last_seen)}</p>{typeof fact.confidence === 'number' && <p>Confidence: {Math.round(fact.confidence * 100)}%</p>}<p>Confirmed: {fact.confirmedCount || fact.confirmed_count || 0} times</p></div></details>
            </div>
          ))}
        </div>
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
                          {({ static: 'Background', dynamic: 'Current focus', preference: 'Working style', goal: 'Goals' })[cat] || cat}
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
                    placeholder={t('profile.detailTopicPlaceholder', 'Topic, e.g. communication style')}
                    className="flex-1 min-w-[140px] bg-white border border-[#e3e0db] rounded-lg py-2 px-3 text-[#0a0a0a] text-sm font-['Space_Grotesk'] placeholder:text-[#a3a3a3] outline-none focus:border-[#117dff]/40 transition-colors"
                  />
                  {/* Value */}
                  <input
                    type="text"
                    value={newFact.value}
                    onChange={(e) => setNewFact((prev) => ({ ...prev, value: e.target.value }))}
                    onKeyDown={handleAddKeyDown}
                    placeholder={t('profile.detailValuePlaceholder', 'What would you like Brain to remember?')}
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

      {canRebuild && <details className="mt-6 border-t border-[#e3e0db] pt-4 text-sm"><summary className="cursor-pointer text-[#737373]">Advanced</summary><p className="mt-3 text-xs text-[#737373]">Refresh learned details from your latest memories.</p><button onClick={handleRebuild} disabled={rebuilding} className="mt-3 inline-flex items-center gap-2 text-[#117dff] disabled:opacity-50"><RefreshCw size={14} />{rebuilding ? 'Refreshing…' : 'Refresh learned profile'}</button></details>}
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
      const response = await apiClient.controlPlane.post('/v1/account/export', {}, { timeout: 60000 });
      const records = response.data;
      if (records?.format !== 'hivemind-account-records-v1') throw new Error('The export was not completed. Please retry.');
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hivemind-account-records.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMsg({ type: 'success', text: 'Your records download is ready. The file lists included categories and exclusions; original file bytes are not included.' });
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
              {t('profile.privacyInformationTitle', 'How your records are handled')}
            </p>
            <p className="text-emerald-700 text-xs font-['Space_Grotesk'] mt-0.5">
              {t('profile.privacyInformationDesc', 'See our Privacy Policy for data processing, service providers and storage information.')}
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
                {t('profile.exportRecordsDesc', 'Download available personal account records as JSON. The file identifies included categories and exclusions; original file bytes are not included.')}
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
                  ? t('profile.deleteSelfHostedRecordsDesc', 'Request deletion of your Singulance account and associated service records. Data on your own server is managed separately.')
                  : t('profile.deleteManagedRecordsDesc', 'Request deletion of your account and associated personal records. Shared company records and unresolved cleanup may be retained. This action cannot be undone.')}
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
              ? t('profile.deleteRecordsFinalConfirmMsg', 'Confirm account deletion. Deleted records cannot be recovered; this does not guarantee removal of every record or external copy.')
              : isSelfHost
              ? t('profile.deleteSelfHostedRecordsMsg', 'Request deletion of your Singulance account and associated service records. Data on your own server is managed separately; shared records and unresolved cleanup may remain. Type DELETE to confirm.')
              : t('profile.deleteManagedRecordsMsg', 'Request deletion of your account and associated personal records. Shared company records, external copies and unresolved cleanup may remain. Deleted records cannot be recovered. Type DELETE to continue.')
          }
          confirmLabel={
            managedReconfirm
              ? t('profile.deleteRecordsFinalConfirmBtn', 'Yes, delete my account')
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
            <p className="mt-1 text-sm leading-relaxed text-[#525252]">Your company profile and workspace information.</p>
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
            <p className="mt-0.5 text-xs text-[#737373]">Help Brain understand your company.</p>
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
  const [activeTab, setActiveTab] = useState('account');
  const [factsExpanded, setFactsExpanded] = useState(false);
  const [detailScope, setDetailScope] = useState('personal');
  const [detailCategory, setDetailCategory] = useState('all');
  const manageDetails = (scope, category) => {
    setDetailScope(scope); setDetailCategory(category || 'all'); setFactsExpanded(true); setActiveTab('about');
    requestAnimationFrame(() => document.getElementById('profile-saved-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

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
  const personalFacts = facts.filter((fact) => !isWorkspaceFact(fact));
  const workspaceFacts = facts.filter(isWorkspaceFact);
  const editorFacts = detailScope === 'all' ? facts : detailScope === 'workspace' ? workspaceFacts : personalFacts;
  const loading = profilesLoading && statsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full mx-auto max-w-3xl pb-8">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk'] mb-1">{t('profile.title', 'Your Profile')}</h1>
        <p className="text-[#525252] text-sm font-['Space_Grotesk']">
          {t('profile.settingsSubtitle', 'Your account, what Brain remembers, and your privacy.')}
        </p>
      </motion.div>

      <div role="tablist" aria-label={t('profile.sectionsLabel', 'Profile sections')} className="mb-6 flex gap-1 overflow-x-auto border-b border-[#e3e0db]">
        {[
          ['account', t('profile.accountTab', 'Account')],
          ['about', t('profile.personalizationTab', 'Personalization')],
          ['workspace', t('profile.workspaceTab', 'Workspace')],
          ['privacy', t('profile.privacyTab', 'Privacy')],
        ].map(([id, label]) => (
          <button key={id} id={`profile-tab-${id}`} type="button" role="tab" tabIndex={activeTab === id ? 0 : -1} aria-selected={activeTab === id} aria-controls={`profile-panel-${id}`} onClick={() => setActiveTab(id)} onKeyDown={(event) => {
            const ids = ['account', 'about', 'workspace', 'privacy'];
            const current = ids.indexOf(id);
            const next = event.key === 'ArrowRight' ? ids[(current + 1) % ids.length]
              : event.key === 'ArrowLeft' ? ids[(current + ids.length - 1) % ids.length]
              : event.key === 'Home' ? ids[0] : event.key === 'End' ? ids[ids.length - 1] : null;
            if (next) {
              event.preventDefault();
              setActiveTab(next);
              document.getElementById(`profile-tab-${next}`)?.focus();
            }
          }} className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === id ? 'border-[#117dff] text-[#117dff]' : 'border-transparent text-[#737373] hover:text-[#0a0a0a]'}`}>{label}</button>
        ))}
      </div>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <section id="profile-panel-account" role="tabpanel" aria-labelledby="profile-tab-account" hidden={activeTab !== 'account'} className="space-y-5">
        <AccountHeaderCard
          user={user}
          org={org}
          plan={billing?.plan?.id || statsData?.plan || org?.plan}
          planLabel={billing?.plan?.name}
          onSignOut={logout}
        />

        </section>
        <section id="profile-panel-about" role="tabpanel" aria-labelledby="profile-tab-about" hidden={activeTab !== 'about'} className="space-y-5">

        {/* Section 2: Knowledge Identity Card */}
        <KnowledgeIdentityCard
          facts={personalFacts}
          onManage={(category) => manageDetails('personal', category)}
        />

        {/* Section 3: Knowledge Breakdown */}
        <details className="rounded-xl border border-[#e3e0db] bg-white">
          <summary className="cursor-pointer p-5 text-sm font-medium text-[#0a0a0a]">{t('profile.viewActivity', 'View knowledge and activity')}</summary>
          <div className="space-y-5 px-4 pb-4"><KnowledgeBreakdown stats={statsData} /><RecentBrainActivity /></div>
        </details>

        {/* Section 5: Profile Facts (collapsible) */}
        <div id="profile-saved-details" className="scroll-mt-6"><Card>
          <button
            aria-expanded={factsExpanded}
            aria-controls="profile-detail-editor"
            onClick={() => setFactsExpanded((p) => !p)}
            className="flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-2">
              <User size={16} className="text-[#117dff]" />
              <SectionHeading>{t('profile.editAboutYou', 'Edit what Brain remembers')}</SectionHeading>
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
                <div id="profile-detail-editor" className="mt-5 pt-5 border-t border-[#f3f1ec]">
                  <label className="mb-4 block text-sm text-[#737373]">Show context for<select value={detailScope} onChange={(event) => setDetailScope(event.target.value)} className="ml-3 rounded-lg border border-[#e3e0db] bg-white px-3 py-2"><option value="personal">You</option><option value="workspace">Your company</option><option value="all">All saved details</option></select></label>
                  <ProfileFactsSection
                    facts={editorFacts}
                    initialCategory={detailCategory}
                    canRebuild={['owner', 'admin'].includes(user?.role)}
                    onRefresh={refetchProfiles}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card></div>

        </section>
        <section id="profile-panel-workspace" role="tabpanel" aria-labelledby="profile-tab-workspace" hidden={activeTab !== 'workspace'} className="space-y-5">
          <OrganizationContextCard org={org} user={user} />
          <KnowledgeIdentityCard facts={workspaceFacts} workspace onManage={(category) => manageDetails('workspace', category)} />
          <details className="rounded-xl border border-[#e3e0db] bg-white"><summary className="cursor-pointer p-5 text-sm font-medium text-[#0a0a0a]">Workspace access and infrastructure</summary><div className="px-4 pb-4"><WorkspaceAccessCard billing={billing} /></div></details>
        </section>
        <section id="profile-panel-privacy" role="tabpanel" aria-labelledby="profile-tab-privacy" hidden={activeTab !== 'privacy'}>
          <DataPrivacySection />
        </section>
      </motion.div>
    </div>
  );
}
