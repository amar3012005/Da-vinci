import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  Brain,
  Trash2,
  ChevronRight,
  X,
  Clock,
  Tag,
  Monitor,
  AlertTriangle,
  Loader2,
  GitFork,
  FileText,
  Database,
  ExternalLink,
  User,
  Globe,
  FolderOpen,
  Users,
  Lock,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useDebounce } from '../shared/hooks';
import { useTeamContext } from '../shared/team-context';
import { filterUserVisibleMemories } from '../shared/memory-filters';
import UsageTracker from '../components/UsageTracker';

// ─── Constants ────────────────────────────────────────────────────────────────

// Normalize an org/entity label to a comparison key: lowercase, alphanumerics only.
// "SINGULANCE Labs" → "singulancelabs", entity:"singulance" → "singulance".
function normalizeOrgKey(s) {
  if (!s || typeof s !== 'string') return '';
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// True only when the memory's company intent matches the user's org name.
// Knowledge-base/document memories are labelled "Company Info" only in that case;
// otherwise they read as a neutral "Knowledge Base". Signal = entity tags first
// (cleanest), then a normalized title/content containment fallback.
function memoryMatchesOrg(memory, orgKey) {
  if (!orgKey || orgKey.length < 3) return false;
  const tags = Array.isArray(memory?.tags) ? memory.tags : [];
  const entityKeys = tags
    .filter((t) => typeof t === 'string' && t.startsWith('entity:'))
    .map((t) => normalizeOrgKey(t.slice(7)));
  for (const ek of entityKeys) {
    if (!ek) continue;
    if (ek === orgKey || ek.includes(orgKey) || orgKey.includes(ek)) return true;
  }
  // Fallback: org name appears verbatim in the title (content is noisier, so
  // only use it when title is empty).
  const titleKey = normalizeOrgKey(memory?.title || '');
  if (titleKey && titleKey.includes(orgKey)) return true;
  return false;
}

const TABS = [
  { id: 'memories', label: 'Memories', icon: Brain, description: 'Canonical organizational truths' },
  { id: 'documents', label: 'Documents', icon: FileText, description: 'Uploaded files and their structure' },
  { id: 'evidence', label: 'Evidence', icon: Database, description: 'Source segments and citations' },
];

const MEMORY_TYPES = [
  { key: 'experience', label: 'Experience', color: '#3b82f6' },
  { key: 'decision',   label: 'Decision',   color: '#f59e0b' },
  { key: 'fact',       label: 'Fact',       color: '#22c55e' },
  { key: 'preference', label: 'Preference', color: '#a855f7' },
  { key: 'procedure',  label: 'Procedure',  color: '#ec4899' },
  // Cognition-loop output = "dreams" (auto-synthesized, queryable bi-temporally)
  { key: 'synthesis',  label: '🌙 Dreams',  color: '#8b5cf6' },
  { key: 'summary',    label: 'Summary',    color: '#06b6d4' },
];

const TYPE_COLOR_MAP = Object.fromEntries(MEMORY_TYPES.map((t) => [t.key, t.color]));

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12) return `${diffMon}mo ago`;
  return `${Math.floor(diffMon / 12)}y ago`;
}

function truncate(text, maxLen = 180) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '...' : text;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const color = TYPE_COLOR_MAP[type] || '#666';
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-['Space_Grotesk'] uppercase tracking-wider"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {type}
    </span>
  );
}

// Cognitive-layer badge. Synthesis OUTPUTS of the dreaming loop (canonical /
// bridge / principle) are the "dreams" — the system's own consolidated insight,
// not ingested content. Brand them with a prominent highlighted 🌙 Dream badge
// so they stand apart. Governance bookkeeping roles (compression / reflection)
// keep the subtler COG· pill.
const COGNITIVE_ROLE_COLORS = {
  canonical:   '#8b5cf6',
  bridge:      '#f97316',
  principle:   '#6366f1',
  compression: '#0ea5e9',
  reflection:  '#94a3b8',
};
const DREAM_ROLES = new Set(['canonical', 'bridge', 'principle']);
function CognitiveBadge({ role }) {
  if (!role) return null;
  if (DREAM_ROLES.has(role)) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-['Space_Grotesk'] uppercase tracking-wider text-white shadow-[0_0_10px_rgba(139,92,246,0.45)]"
        style={{ background: 'linear-gradient(90deg,#8b5cf6,#6366f1)' }}
        title={`Dream — synthesized by the cognitive loop (${role})`}
      >
        🌙 Dream·{role}
      </span>
    );
  }
  const color = COGNITIVE_ROLE_COLORS[role] || '#525252';
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-['Space_Grotesk'] uppercase tracking-wider"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
      title={`Cognitive layer: ${role}`}
    >
      COG·{role}
    </span>
  );
}

// Scope badge — every memory belongs to org / project / team / personal scope.
const SCOPE_META = {
  organization: { label: 'Org',      Icon: Globe,      color: '#117dff' },
  project:      { label: 'Project',  Icon: FolderOpen, color: '#7c3aed' },
  team:         { label: 'Team',     Icon: Users,      color: '#10b981' },
  personal:     { label: 'Personal', Icon: Lock,       color: '#a3a3a3' },
};
function ScopeBadge({ scope, project }) {
  const meta = SCOPE_META[scope] || SCOPE_META.personal;
  const { Icon } = meta;
  const label = scope === 'project' && project ? project : meta.label;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-['Space_Grotesk'] uppercase tracking-wider max-w-[140px] truncate"
      style={{ backgroundColor: `${meta.color}14`, color: meta.color, border: `1px solid ${meta.color}33` }}
      title={`Scope: ${scope || 'personal'}${scope === 'project' && project ? ` (${project})` : ''}`}
    >
      <Icon size={9} /> {label}
    </span>
  );
}

function TagPill({ label }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f3f1ec] text-[#525252] text-[10px] font-mono">
      <Tag size={9} />
      {label}
    </span>
  );
}

function ImportanceBar({ score }) {
  const pct = Math.min(Math.max((score ?? 0) * 100, 0), 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 rounded-full bg-[#f3f1ec] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: pct > 70 ? '#117dff' : pct > 40 ? '#f59e0b' : '#666',
          }}
        />
      </div>
      <span className="text-[10px] font-mono text-[#a3a3a3]">{score != null ? score.toFixed(2) : '--'}</span>
    </div>
  );
}

// ─── Source Provenance Badge ──────────────────────────────────────────────────

const SOURCE_BADGE_STYLES = {
  vector:  { label: 'Vector',  color: 'text-[#117dff]', bg: 'bg-[#117dff]/10' },
  keyword: { label: 'Keyword', color: 'text-[#525252]', bg: 'bg-[#0a0a0a]/[0.06]' },
  graph:   { label: 'Graph',   color: 'text-amber-700',  bg: 'bg-amber-500/10' },
};

function SourceBadge({ source }) {
  if (!source || !SOURCE_BADGE_STYLES[source]) return null;
  const s = SOURCE_BADGE_STYLES[source];
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded ${s.bg} ${s.color} uppercase tracking-wider`}>
      {s.label}
    </span>
  );
}

// Render the LLM-extracted entities the post-save linker stashed as
// 'entity:<name>' tags. Memory model has no metadata JSONB column, so
// entities ride on the tags array — also lets users filter
// /api/memories?tags=entity:Rama directly.
//
// Row line scans as:
//   [type] [source] [linked N] [SUPERSEDED] [@Rama] [@Heidelberg]
function EntityChips({ memory }) {
  const tags = Array.isArray(memory?.tags) ? memory.tags : [];
  const ents = tags
    .filter(t => typeof t === 'string' && t.startsWith('entity:'))
    .map(t => t.slice(7).replace(/_/g, ' '));
  if (ents.length === 0) return null;
  // Cap at 4 visible chips + "+N" overflow so row height stays uniform.
  const visible = ents.slice(0, 4);
  const overflow = ents.length - visible.length;
  return (
    <>
      {visible.map((e) => (
        <span
          key={`ent-${e}`}
          title={`Mentioned entity: ${e}`}
          className="inline-flex items-center gap-1 text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 uppercase tracking-wider"
        >
          @ {String(e).slice(0, 24)}
        </span>
      ))}
      {overflow > 0 && (
        <span
          title={ents.slice(4).join(', ')}
          className="inline-flex items-center text-[9.5px] font-mono px-1 py-0.5 rounded text-violet-500"
        >
          +{overflow}
        </span>
      )}
    </>
  );
}

function RelationshipIndicator({ memory }) {
  // Three signals stacked left → right:
  //   1. SUPERSEDED   — this row is no longer the latest; another memory
  //                     replaced it via an Updates edge. Backend ships
  //                     superseded_by (id of newer memory) on the row.
  //   2. UPDATED BY N — count of incoming Updates/Extends edges (this row
  //                     spawned newer versions of itself).
  //   3. LINKED N     — total degree (incoming + outgoing edges) summary
  //                     that mirrors Supermemory's "linked memories" pill.
  // All three come from /api/memories list now ships edges_in_count /
  // edges_out_count / superseded_by inline (no N+1 fetch).
  const chips = [];

  if ((memory.is_latest === false) || memory.superseded_by) {
    chips.push(
      <span
        key="sup"
        title={memory.superseded_by ? `replaced by ${memory.superseded_by.slice(0, 8)}…` : 'superseded'}
        className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f3f1ec] text-[#a3a3a3] uppercase tracking-wider"
      >
        <GitFork size={8} />
        superseded
      </span>
    );
  }

  const totalEdges = (memory.edges_in_count || 0) + (memory.edges_out_count || 0);
  if (totalEdges > 0) {
    chips.push(
      <span
        key="links"
        title={`${memory.edges_out_count || 0} outgoing · ${memory.edges_in_count || 0} incoming`}
        className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#117dff]/10 text-[#0a5fcc] uppercase tracking-wider"
      >
        <GitFork size={8} />
        linked {totalEdges}
      </span>
    );
  }

  if (memory.graph_expanded) {
    const relType = memory.expansion_metadata?.relationship_type || 'related';
    chips.push(
      <span
        key="exp"
        className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 uppercase tracking-wider"
      >
        <GitFork size={8} />
        {relType}
      </span>
    );
  }

  if (!chips.length) return null;
  return <>{chips}</>;
}

// ─── Memory Card ──────────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function MemoryCard({ memory, index, onSelect, isSelected, orgKey }) {
  const { t } = useTranslation('dashboard');
  // Cognitive-layer memories (governance synthesis / canonical / bridge / principle /
  // reflection) get a distinct warm-beige card so the cognitive loop's output is
  // visually obvious among ingested memories.
  const isCognitive = !!memory.cognitive_layer_role
    || (memory.tags || []).some(t => typeof t === 'string'
        && (t === 'cognition-loop' || t.startsWith('synthesis:') || t === 'internal-audit'));
  // A "dream" = a synthesis output of the cognitive loop. Highlight its row with
  // an indigo left-accent + glow so it visibly stands apart from ingested memories.
  const isDream = (memory.cognitive_layer_role && DREAM_ROLES.has(memory.cognitive_layer_role))
    || (memory.tags || []).some(t => typeof t === 'string' && t.startsWith('synthesis:'));
  return (
    <motion.button
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={() => onSelect(memory)}
      className={`w-full text-left rounded-xl border transition-all duration-200 p-4 group cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        isSelected
          ? 'bg-[#117dff]/[0.06] border-[#117dff]/30 shadow-[0_0_20px_rgba(17,125,255,0.08)]'
          : isDream
            ? 'bg-[#f5f3ff] border-[#c7bfff] border-l-[3px] border-l-[#8b5cf6] hover:bg-[#efeaff] shadow-[0_0_14px_rgba(139,92,246,0.12)]'
            : isCognitive
              ? 'bg-[#f7f1e3] border-[#e6dabd] hover:border-[#d8c79c] hover:bg-[#f3ebd7]'
              : 'bg-white border-[#e3e0db] hover:border-[#d4d0ca] hover:bg-[#f9f8f3]'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-[#0a0a0a] text-sm font-bold font-['Space_Grotesk'] leading-tight line-clamp-1 flex-1">
          {memory.title || memory.content?.slice(0, 60) || t('memories.untitledMemory', 'Untitled Memory')}
        </h3>
        <ChevronRight
          size={14}
          className={`mt-0.5 shrink-0 transition-transform ${
            isSelected ? 'text-[#117dff] rotate-90' : 'text-[#d4d0ca] group-hover:text-[#525252] group-hover:translate-x-0.5'
          }`}
        />
      </div>

      {/* Type + Source + Provenance */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {memory.memory_type && <TypeBadge type={memory.memory_type} />}
        {memory.cognitive_layer_role && <CognitiveBadge role={memory.cognitive_layer_role} />}
        <ScopeBadge scope={memory.scope} project={memory.project} />
        {memory.source && <SourceBadge source={memory.source} />}
        <RelationshipIndicator memory={memory} />
        <EntityChips memory={memory} />
        {(() => {
          // Source platform may live at top level OR inside source_metadata
          // (Gmail/Drive/Calendar memories all write to source_metadata).
          // Resolve and render a consistent badge regardless of provider.
          const sp =
            memory.source_platform ||
            memory.source_metadata?.source_platform ||
            memory.metadata?.source_platform ||
            null;
          if (!sp) return null;
          const SOURCE_LABEL = {
            gmail: 'Gmail',
            google_drive: 'Drive',
            google_calendar: 'Calendar',
            google_docs: 'Docs',
            google_sheets: 'Sheets',
            google_slides: 'Slides',
            google_contacts: 'Contacts',
            google_chat: 'Google Chat',
            google_tasks: 'Tasks',
            google_forms: 'Forms',
            slack: 'Slack',
            notion: 'Notion',
            github: 'GitHub',
            knowledge_base: 'Company Info',
            document: 'Company Info',
            chat: 'Talk to HIVE',
            'talk-to-hive': 'Talk to HIVE',
          };
          const SOURCE_COLOR = {
            gmail: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
            google_drive: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
            google_calendar: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
            google_docs: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
            google_sheets: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
            google_slides: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
            slack: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
            knowledge_base: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
            document: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
            chat: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
          };
          // KB/document memories read as "Company Info" ONLY when the memory's
          // company intent matches the user's org name; otherwise neutral "Knowledge Base".
          const isKbSource = sp === 'knowledge_base' || sp === 'document';
          const label = isKbSource
            ? (memoryMatchesOrg(memory, orgKey) ? 'Company Info' : 'Knowledge Base')
            : (SOURCE_LABEL[sp] || sp);
          const c = SOURCE_COLOR[sp] || { bg: 'bg-[#faf9f4]', text: 'text-[#525252]', border: 'border-[#e3e0db]' };
          return (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-[0.06em] border ${c.bg} ${c.text} ${c.border}`}>
              <Monitor size={9} />
              {label}
            </span>
          );
        })()}
        {memory.document_date && (
          <span className="text-[10px] font-mono text-[#d4d0ca]">
            {new Date(memory.document_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Content preview */}
      <p className="text-[#525252] text-xs leading-relaxed mb-3 line-clamp-3 font-['Space_Grotesk']">
        {truncate(memory.content)}
      </p>

      {/* Footer: tags + date + importance.
          entity:* tags already render as @-chips above, and synthesis/cognition
          tags drive the badges — filter them out so the footer never duplicates. */}
      {(() => {
        const footerTags = (memory.tags || []).filter((t) =>
          typeof t === 'string' &&
          !t.startsWith('entity:') &&
          !t.startsWith('synthesis:') &&
          !['cognition-loop', 'internal-audit'].includes(t)
        );
        return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
          {footerTags.slice(0, 3).map((tag) => (
            <TagPill key={tag} label={tag} />
          ))}
          {footerTags.length > 3 && (
            <span className="text-[10px] text-[#d4d0ca] font-mono">+{footerTags.length - 3}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {(memory.owner_name || memory.owner?.name) && (
            <span className="text-[10px] font-mono text-[#a3a3a3] flex items-center gap-1 max-w-[120px] truncate" title={`Owner: ${memory.owner_name || memory.owner?.name}`}>
              <User size={9} /> {memory.owner_name || memory.owner?.name}
            </span>
          )}
          <ImportanceBar score={memory.importance} />
          <span className="text-[10px] font-mono text-[#d4d0ca] flex items-center gap-1">
            <Clock size={9} />
            {relativeTime(memory.created_at)}
          </span>
        </div>
      </div>
        );
      })()}
    </motion.button>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

// Render relations grouped by edge type. Shown inside MemoryDetailPanel
// when /api/memories/:id/relationships returns.
//
// Edge types + their visual treatment:
//   Updates      — green   (this memory updated something / something updated this)
//   Extends      — sky     (this extended / was extended)
//   Derives      — purple  (derived from / derivation source for)
//   Contradicts  — red     (conflict)
//   Mentions     — violet  (entity co-mention via LLM linker)
//   PartOf       — slate   (section/turn/message → parent doc/session/thread)
const REL_TYPE_STYLE = {
  Updates:     { bg: 'bg-emerald-50',  border: 'border-emerald-200',  text: 'text-emerald-700',  label: 'Updates' },
  Extends:     { bg: 'bg-sky-50',      border: 'border-sky-200',      text: 'text-sky-700',      label: 'Extends' },
  Derives:     { bg: 'bg-purple-50',   border: 'border-purple-200',   text: 'text-purple-700',   label: 'Derives' },
  Contradicts: { bg: 'bg-red-50',      border: 'border-red-200',      text: 'text-red-700',      label: 'Contradicts' },
  Mentions:    { bg: 'bg-violet-50',   border: 'border-violet-200',   text: 'text-violet-700',   label: 'Mentions' },
  PartOf:      { bg: 'bg-slate-50',    border: 'border-slate-200',    text: 'text-slate-700',    label: 'Part Of' },
};

function RelationsBlock({ loading, relations }) {
  const { t } = useTranslation('dashboard');
  if (loading) {
    return (
      <div>
        <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
          {t('memories.relations', 'Relations')}
        </label>
        <div className="text-[11px] text-[#a3a3a3] italic">{t('memories.loadingRelations', 'Loading…')}</div>
      </div>
    );
  }
  const byType = relations?.by_type;
  const total = relations?.counts?.total || 0;
  if (!byType || total === 0) {
    return (
      <div>
        <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
          {t('memories.relations', 'Relations')}
        </label>
        <div className="text-[11px] text-[#a3a3a3] italic">{t('memories.noRelations', 'No relations yet.')}</div>
      </div>
    );
  }
  // Stable order so the same memory always renders the same section sequence.
  const TYPE_ORDER = ['Updates', 'Extends', 'Derives', 'Contradicts', 'Mentions', 'PartOf'];
  const orderedTypes = [
    ...TYPE_ORDER.filter(t => byType[t]?.length),
    ...Object.keys(byType).filter(t => !TYPE_ORDER.includes(t)),
  ];

  return (
    <div>
      <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-2">
        {t('memories.relationsCount', 'Relations · {{count}}', { count: total })}
      </label>
      <div className="space-y-3">
        {orderedTypes.map((type) => {
          const edges = byType[type] || [];
          const style = REL_TYPE_STYLE[type] || REL_TYPE_STYLE.Mentions;
          return (
            <div key={type}>
              <div className={`inline-flex items-center gap-1 text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5 border ${style.bg} ${style.text} ${style.border}`}>
                {style.label} · {edges.length}
              </div>
              <div className="space-y-1">
                {edges.map((e) => {
                  const isOut = e.direction === 'out';
                  const peerTitle = isOut ? e.target_title : e.source_title;
                  const peerId = isOut ? e.target_id : e.source_id;
                  const peerDeleted = isOut ? e.target_deleted : e.source_deleted;
                  const peerNotLatest = isOut ? e.target_is_latest === false : e.source_is_latest === false;
                  const shared = e.metadata?.shared_entities || [];
                  const reason = e.metadata?.reason || '';
                  const conf = typeof e.confidence === 'number' ? e.confidence.toFixed(2) : '';
                  return (
                    <div
                      key={e.id}
                      title={reason || (peerId ? `Memory ${peerId.slice(0, 8)}` : '')}
                      className={`flex items-center gap-2 text-[11px] bg-white border ${style.border} rounded-lg px-2.5 py-1.5`}
                    >
                      <span className={`font-mono text-[10px] ${style.text}`} style={{ minWidth: 12 }}>
                        {isOut ? '→' : '←'}
                      </span>
                      <span className="text-[#0a0a0a] truncate flex-1">
                        {peerTitle || '(untitled)'}
                        {peerDeleted && <span className="ml-1 text-[#d4d0ca]">·deleted</span>}
                        {peerNotLatest && !peerDeleted && <span className="ml-1 text-[#d4d0ca]">·superseded</span>}
                      </span>
                      {shared.length > 0 && (
                        <span className="text-[9.5px] text-violet-700 font-mono">
                          @{shared.slice(0, 2).join(', @')}
                        </span>
                      )}
                      {conf && (
                        <span className="text-[9.5px] font-mono text-[#a3a3a3]">{conf}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemoryDetailPanel({ memory, onClose, onDelete, onViewEvidence, orgKey }) {
  const { t } = useTranslation('dashboard');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(null);
  const [entities, setEntities] = useState(null); // [{ canonical_name, entity_type, mention_count }]
  const [relations, setRelations] = useState(null); // { by_type: { Mentions: [...], ... }, counts: {} }
  const [relationsLoading, setRelationsLoading] = useState(false);

  // Fetch all relationships for this memory grouped by type (Mentions,
  // Updates, Extends, Derives, Contradicts, PartOf). One round-trip
  // pulls edges in both directions + peer titles for inline display.
  useEffect(() => {
    if (!memory?.id) return;
    let cancelled = false;
    setRelationsLoading(true);
    apiClient.core.get(`/api/memories/${memory.id}/relationships`)
      .then(({ data }) => {
        if (!cancelled) setRelations(data || null);
      })
      .catch(() => {
        if (!cancelled) setRelations(null);
      })
      .finally(() => {
        if (!cancelled) setRelationsLoading(false);
      });
    return () => { cancelled = true; };
  }, [memory?.id]);

  // Fetch entity mentions for this memory (P2 Memory Intelligence)
  useEffect(() => {
    if (!memory?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.controlPlane.get(`/v1/proxy/admin/topic-states`, { params: { limit: 10 } }).catch(() => ({ data: null }));
        if (cancelled) return;
        const fromMem = (data?.topics || []).filter(t => t.lastMemoryId === memory.id);
        setEntities(fromMem.length ? fromMem : []);
      } catch {
        if (!cancelled) setEntities([]);
      }
    })();
    return () => { cancelled = true; };
  }, [memory?.id]);

  // Fetch evidence count on mount
  useEffect(() => {
    apiClient.getMemoryEvidence(memory.id)
      .then(data => {
        const count = data?.evidence?.length || data?.length || 0;
        setEvidenceCount(count);
      })
      .catch(() => setEvidenceCount(0));
  }, [memory.id]);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await apiClient.deleteMemory(memory.id);
      onDelete(memory.id);
    } catch {
      // Swallow — parent will refetch
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed inset-y-0 right-0 w-full max-w-lg z-50 flex flex-col"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm -z-10 lg:hidden" onClick={onClose} />

      <div className="h-full bg-[#faf9f4] border-l border-[#e3e0db] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e3e0db]">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-[#117dff]" />
            <span className="text-[#0a0a0a] text-sm font-bold font-['Space_Grotesk']">{t('memories.memoryDetail', 'Memory Detail')}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f3f1ec] text-[#525252] hover:text-[#525252] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <h2 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] leading-snug">
            {memory.title || t('memories.untitledMemory', 'Untitled Memory')}
          </h2>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            {memory.memory_type && <TypeBadge type={memory.memory_type} />}
        {memory.cognitive_layer_role && <CognitiveBadge role={memory.cognitive_layer_role} />}
            {memory.source && <SourceBadge source={memory.source} />}
            <RelationshipIndicator memory={memory} />
            {(() => {
              const sp =
                memory.source_platform ||
                memory.source_metadata?.source_platform ||
                memory.metadata?.source_platform ||
                null;
              if (!sp) return null;
              const LABEL = { gmail: 'Gmail', google_drive: 'Drive', google_calendar: 'Calendar', google_docs: 'Docs', google_sheets: 'Sheets', google_slides: 'Slides', google_contacts: 'Contacts', google_chat: 'Google Chat', google_tasks: 'Tasks', google_forms: 'Forms', slack: 'Slack', notion: 'Notion', github: 'GitHub', knowledge_base: 'Company Info', document: 'Company Info', chat: 'Talk to HIVE', 'talk-to-hive': 'Talk to HIVE' };
              const COLOR = { gmail: 'bg-red-50 text-red-700 border-red-200', google_drive: 'bg-amber-50 text-amber-700 border-amber-200', google_calendar: 'bg-blue-50 text-blue-700 border-blue-200', google_docs: 'bg-sky-50 text-sky-700 border-sky-200', google_sheets: 'bg-emerald-50 text-emerald-700 border-emerald-200', slack: 'bg-violet-50 text-violet-700 border-violet-200', knowledge_base: 'bg-indigo-50 text-indigo-700 border-indigo-200', document: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
              const isKbSource = sp === 'knowledge_base' || sp === 'document';
              const displayLabel = isKbSource
                ? (memoryMatchesOrg(memory, orgKey) ? 'Company Info' : 'Knowledge Base')
                : (LABEL[sp] || sp);
              return (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-[0.08em] border ${COLOR[sp] || 'bg-[#faf9f4] text-[#525252] border-[#e3e0db]'}`}>
                  <Monitor size={10} />
                  {displayLabel}
                </span>
              );
            })()}
            <span className="text-xs font-mono text-[#d4d0ca] flex items-center gap-1">
              <Clock size={10} />
              {relativeTime(memory.created_at)}
            </span>
            {memory.is_latest === false && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f3f1ec] text-[#d4d0ca] uppercase">
                superseded
              </span>
            )}
            {memory.document_date && (
              <span className="text-[10px] font-mono text-[#d4d0ca] flex items-center gap-1">
                doc: {new Date(memory.document_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Importance */}
          {memory.importance != null && (
            <div>
              <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1">
                {t('memories.importance', 'Importance')}
              </label>
              <ImportanceBar score={memory.importance} />
            </div>
          )}

          {/* Full content */}
          <div>
            <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
              {t('memories.content', 'Content')}
            </label>
            <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-4 text-[#525252] text-sm font-['Space_Grotesk'] leading-relaxed whitespace-pre-wrap">
              {memory.content || t('memories.noContent', 'No content')}
            </div>
          </div>

          {/* Tags */}
          {memory.tags?.length > 0 && (
            <div>
              <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                {t('memories.tags', 'Tags')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {memory.tags.map((tag) => (
                  <TagPill key={tag} label={tag} />
                ))}
              </div>
            </div>
          )}

          {/* Relationships — grouped by edge type, fetched live from
              /api/memories/:id/relationships. Each type gets its own
              section (Mentions / Updates / Extends / Derives /
              Contradicts / PartOf). Direction icons distinguish
              outgoing (→) from incoming (←). Hover an edge for
              the shared_entities + reason metadata the LLM linker
              wrote at save time. */}
          <RelationsBlock loading={relationsLoading} relations={relations} />


          {/* Supporting Evidence */}
          {evidenceCount !== null && evidenceCount > 0 && (
            <div>
              <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                {t('memories.evidence', 'Evidence')}
              </label>
              <button
                onClick={onViewEvidence}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#117dff]/5 border border-[#117dff]/20 rounded-xl text-sm font-semibold text-[#117dff] hover:bg-[#117dff]/10 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Database size={16} />
                  <span>{t('memories.viewSupportingEvidence', 'View Supporting Evidence')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono">{evidenceCount} {t('memories.segment', 'segment', { count: evidenceCount })}{evidenceCount !== 1 ? 's' : ''}</span>
                  <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          )}

          {/* Entities (P2 Memory Intelligence) */}
          {entities && entities.length > 0 && (
            <div>
              <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                {t('memories.entities', 'Entities')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {entities.slice(0, 12).map((t) => (
                  <span key={t.id || t.topicKey}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border border-[#e3e0db] bg-white text-[#525252]">
                    <Brain size={9} />
                    {t.entity?.canonicalName || t.topicKey}
                    {t.entity?.entityType && (
                      <span className="text-[#a3a3a3]">·{t.entity.entityType}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
              {t('memories.metadata', 'Metadata')}
            </label>
            <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-3 space-y-1.5 text-[11px] font-mono">
              {memory.id && (
                <div className="flex justify-between">
                  <span className="text-[#d4d0ca]">{t('memories.metaId', 'ID')}</span>
                  <span className="text-[#525252] truncate ml-4 max-w-[240px]">{memory.id}</span>
                </div>
              )}
              {(memory.owner_name || memory.owner?.name) && (
                <div className="flex justify-between">
                  <span className="text-[#d4d0ca]">{t('memories.metaOwner', 'Owner')}</span>
                  <span className="text-[#525252] truncate ml-4 max-w-[200px]">{memory.owner_name || memory.owner?.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#d4d0ca]">{t('memories.metaScope', 'Scope')}</span>
                <span className="text-[#525252] uppercase">{memory.scope || 'personal'}</span>
              </div>
              {memory.project && (
                <div className="flex justify-between">
                  <span className="text-[#d4d0ca]">{t('memories.metaProject', 'Project')}</span>
                  <span className="text-[#525252]">{memory.project}</span>
                </div>
              )}
              {memory.version != null && (
                <div className="flex justify-between">
                  <span className="text-[#d4d0ca]">{t('memories.metaVersion', 'Version')}</span>
                  <span className="text-[#525252]">{memory.version}</span>
                </div>
              )}
              {memory.created_at && (
                <div className="flex justify-between">
                  <span className="text-[#d4d0ca]">{t('memories.metaCreated', 'Created')}</span>
                  <span className="text-[#525252]">{new Date(memory.created_at).toLocaleString()}</span>
                </div>
              )}
              {memory.updated_at && (
                <div className="flex justify-between">
                  <span className="text-[#d4d0ca]">{t('memories.metaUpdated', 'Updated')}</span>
                  <span className="text-[#525252]">{new Date(memory.updated_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Delete */}
        <div className="px-6 py-4 border-t border-[#e3e0db]">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] transition-all ${
              confirmDelete
                ? 'bg-red-500/20 text-[#dc2626] border border-red-500/30 hover:bg-red-500/30'
                : 'bg-[#f3f1ec] text-[#525252] border border-[#e3e0db] hover:text-[#dc2626] hover:border-red-500/20 hover:bg-red-50'
            }`}
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : confirmDelete ? (
              <>
                <AlertTriangle size={14} />
                {t('memories.confirmDelete', 'Confirm Delete')}
              </>
            ) : (
              <>
                <Trash2 size={14} />
                {t('memories.deleteMemory', 'Delete Memory')}
              </>
            )}
          </button>
          {confirmDelete && !deleting && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full mt-2 text-center text-xs text-[#a3a3a3] hover:text-[#525252] transition-colors font-['Space_Grotesk']"
            >
              {t('memories.cancel', 'Cancel')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }) {
  const { t } = useTranslation('dashboard');
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 px-4"
    >
      <div className="w-20 h-20 rounded-2xl bg-[#117dff]/[0.06] border border-[#117dff]/10 flex items-center justify-center mb-6">
        <Brain size={36} className="text-[#117dff]/40" />
      </div>
      <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] mb-2">
        {hasFilters ? t('memories.emptyFilterTitle', 'No memories match') : t('memories.emptyTitle', 'No memories yet')}
      </h3>
      <p className="text-[#a3a3a3] text-sm font-['Space_Grotesk'] text-center max-w-sm leading-relaxed">
        {hasFilters
          ? t('memories.emptyFilterHint', 'Try adjusting your search or filters to find what you are looking for.')
          : t('memories.emptyHint', 'Memories will appear here as your AI agents interact and learn. Connect a data source or create your first memory to get started.')}
      </p>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Memories() {
  const { t } = useTranslation('dashboard');
  // Project scope from TeamSwitcher — pages without project filter previously
  // showed org-wide rows even when a project was selected. activeProjectId is
  // included in listParams so backend recall returns only project-scoped rows.
  const { activeProjectId } = useTeamContext() || {};
  // Tab state
  const [activeTab, setActiveTab] = useState('memories');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  // Default the Memories view to ALL memories (no type filter). A separate
  // "Show Dreams" toggle overlays the last dream-run's syntheses on top — dreams
  // are no longer the default filter, they're an opt-in overlay.
  const [activeType, setActiveType] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  // Cognitive layer filter (canonical / bridge / compression / reflection)
  // Backed by client-side filter on the cognitive_layer_role field returned
  // from /api/memories — no extra backend param required.
  const [activeCognitiveRole, setActiveCognitiveRole] = useState(null);
  // is_latest toggle — when false, include superseded memories (post drift-compaction)
  const [showSuperseded, setShowSuperseded] = useState(false);
  // Hide noisy connector ingests (newsletters / promotions / social / forums
  // / notifications) — they're recall-demoted but still listed by default.
  // Toggle off to see your full inbox. ON by default for cleaner Memories.
  const [hideNoise, setHideNoise] = useState(true);
  // Tier scope (ALL / Org-level / Project-level / Personal-level) — mirrors
  // the Graph page switcher. 'visible' = ALL (merged personal+org+projects).
  const [tierScope, setTierScope] = useState('visible');
  // Project-level tier: which single project to narrow to. '' = all the
  // user's accessible projects. Only applied while tierScope === 'tier:project'.
  const [tierProject, setTierProject] = useState('');
  const { projects: accessibleProjects } = useTeamContext() || {};
  const [showFilters, setShowFilters] = useState(false);
  // Phase 2 polish
  const [activeEntity, setActiveEntity] = useState(null);   // tag like "person:alice-wong"
  const [groupByDoc, setGroupByDoc] = useState(false);
  const [topEntities, setTopEntities] = useState([]);
  const [contradictionsCount, setContradictionsCount] = useState(0);
  // Org name (normalized) — gates the "Company Info" label so it only shows
  // when a KB/document memory's company intent matches the user's organisation.
  const [orgKey, setOrgKey] = useState('');

  // Fetch top entities + contradiction count once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const boot = await apiClient.bootstrap().catch(() => null);
        if (!cancelled && boot?.organization?.name) {
          setOrgKey(normalizeOrgKey(boot.organization.name));
        }
      } catch { /* noop */ }
      // topic-states + contradictions read the CENTRAL knowledge graph, which is
      // empty for .amr / byod orgs (their graph lives on the agent). The core
      // returns 501 not_supported_for_amr_storage for those — a request that can
      // only ever fail, showing a red 501 in the console + a service-error toast
      // on every Memories load. Gate both on the tenant's storage_mode so we never
      // fire a call that 501s. Any non-amr value (incl. an older core that omits
      // the field) keeps the previous behaviour.
      let _storageMode = 'hybrid';
      try {
        const { data: _stats } = await apiClient.controlPlane.get('/v1/proxy/memory/stats').catch(() => ({ data: null }));
        if (_stats?.storage_mode) _storageMode = String(_stats.storage_mode);
      } catch { /* noop — default hybrid */ }
      const _centralGraph = _storageMode !== 'amr' && _storageMode !== 'byod' && _storageMode !== 'amr_embedded' && _storageMode !== 'byod_amr';
      if (_centralGraph) {
        try {
          const { data } = await apiClient.controlPlane.get('/v1/proxy/admin/topic-states', { params: { limit: 30 } }).catch(() => ({ data: null }));
          if (cancelled) return;
          const seen = new Map();
          for (const t of (data?.topics || [])) {
            const e = t.entity;
            if (!e?.canonicalName) continue;
            const key = `${e.entityType}:${e.canonicalName.toLowerCase().replace(/\s+/g, '-')}`;
            if (!seen.has(key)) seen.set(key, { key, type: e.entityType, name: e.canonicalName, count: e.mentionCount || 1 });
          }
          setTopEntities(Array.from(seen.values()).sort((a, b) => b.count - a.count).slice(0, 12));
        } catch { /* noop */ }
        try {
          const { data } = await apiClient.controlPlane.get('/v1/proxy/admin/contradictions', { params: { limit: 1 } }).catch(() => ({ data: null }));
          if (cancelled) return;
          setContradictionsCount(data?.count || 0);
        } catch { /* noop */ }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pagination
  const [offset, setOffset] = useState(0);
  const [allMemories, setAllMemories] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // Detail
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const debouncedQuery = useDebounce(searchQuery, 350);

  // ─── Data fetching ──────────────────────────────────────────────

  const isSearching = debouncedQuery.trim().length > 0;

  const listParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: 0,
      ...(activeType ? { memory_type: activeType } : {}),
      ...(activeTag || activeEntity
        ? { tags: [activeTag, activeEntity].filter(Boolean).join(',') }
        : {}),
      // Tri-state: showSuperseded=true → only superseded; false → include
      // BOTH latest + superseded (server tri-state). Superseded rows render
      // with a "Superseded" badge + Updates-target link so the timeline is
      // visible inline instead of hidden.
      is_latest: showSuperseded ? 'false' : 'all',
      ...(hideNoise ? { hide_noise: 'true' } : {}),
      // Project-level tier with a picked project narrows to it (takes
      // precedence over the TeamSwitcher project filter).
      ...((tierScope === 'tier:project' && tierProject)
        ? { project_id: tierProject }
        : (activeProjectId ? { project_id: activeProjectId } : {})),
      ...(tierScope !== 'visible' ? { scope: tierScope } : {}),
    }),
    [activeType, activeTag, activeEntity, showSuperseded, hideNoise, activeProjectId, tierScope, tierProject],
  );

  // List-mode fetch
  const {
    data: listData,
    loading: listLoading,
    error: listError,
    refetch: refetchList,
  } = useApiQuery(
    () => apiClient.listMemories(listParams),
    [listParams],
  );

  // Search-mode fetch
  const {
    data: searchData,
    loading: searchLoading,
    error: searchError,
  } = useApiQuery(
    () => (isSearching ? apiClient.quickSearch(debouncedQuery) : Promise.resolve(null)),
    [debouncedQuery, isSearching],
  );

  // Resolve which dataset to show
  const resolvedList = useMemo(() => {
    if (isSearching) {
      const results = searchData?.results || searchData?.memories || searchData || [];
      return filterUserVisibleMemories(Array.isArray(results) ? results : []);
    }
    const base = listData?.memories || listData?.results || listData || [];
    const arr = Array.isArray(base) ? base : [];
    // Merge for "load more"
    let result;
    if (allMemories.length > 0 && offset > 0) {
      const ids = new Set(allMemories.map((m) => m.id));
      const merged = [...allMemories];
      arr.forEach((m) => {
        if (!ids.has(m.id)) merged.push(m);
      });
      result = merged;
    } else {
      result = arr;
    }
    // Apply client-side cognitive-role filter when active.
    if (activeCognitiveRole) {
      result = result.filter((m) => m.cognitive_layer_role === activeCognitiveRole);
    }
    return filterUserVisibleMemories(result);
  }, [isSearching, searchData, listData, allMemories, offset, activeCognitiveRole]);

  // Total count from API pagination (server-side truth), not client array length
  // eslint-disable-next-line no-unused-vars
  const totalCount = useMemo(() => {
    if (isSearching) return null;
    return listData?.pagination?.total ?? listData?.total ?? null;
  }, [isSearching, listData]);

  // Sync hasMore from initial API response
  useEffect(() => {
    if (listData && !isSearching && offset === 0) {
      if (listData.pagination?.has_more === false) setHasMore(false);
    }
  }, [listData, isSearching, offset]);
  // eslint-disable-next-line no-unused-vars
  // eslint-disable-next-line no-unused-vars

  // eslint-disable-next-line no-unused-vars
  const loading = isSearching ? searchLoading : listLoading;
  // eslint-disable-next-line no-unused-vars
  const error = isSearching ? searchError : listError;

  // Collect all unique tags for the filter bar
  // eslint-disable-next-line no-unused-vars
  const availableTags = useMemo(() => {
    const tags = new Set();
    resolvedList.forEach((m) => (m.tags || []).forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  // eslint-disable-next-line no-unused-vars
  }, [resolvedList]);
  // eslint-disable-next-line no-unused-vars
  const visibleMemoryCount = resolvedList.length;

  // ─── Handlers ───────────────────────────────────────────────────

  // eslint-disable-next-line no-unused-vars
  const handleLoadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    try {
      const data = await apiClient.listMemories({ ...listParams, offset: nextOffset, limit: PAGE_SIZE });
      const arr = data?.memories || data?.results || data || [];
      const items = Array.isArray(arr) ? arr : [];
      if (items.length < PAGE_SIZE) setHasMore(false);
      setAllMemories((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        items.forEach((m) => {
          if (!ids.has(m.id)) merged.push(m);
        });
        return merged;
      });
      setOffset(nextOffset);
  // eslint-disable-next-line no-unused-vars
    } catch {
      // silently fail
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleSelectMemory = useCallback(
    async (memory) => {
      if (selectedMemory?.id === memory.id) {
        setSelectedMemory(null);
        return;
      }
      // Fetch full detail
      try {
        const full = await apiClient.getMemory(memory.id);
        setSelectedMemory(full?.memory || full);
      } catch {
  // eslint-disable-next-line no-unused-vars
        setSelectedMemory(memory);
      }
    },
    [selectedMemory],
  );

  // eslint-disable-next-line no-unused-vars
  const handleDeleteMemory = useCallback(
    (id) => {
      setSelectedMemory(null);
      setAllMemories((prev) => prev.filter((m) => m.id !== id));
      refetchList();
    },
    [refetchList],
  );

  const clearFilters = () => {
    setActiveType(null);
    setActiveTag(null);
    setSearchQuery('');
    setOffset(0);
    setAllMemories([]);
    setHasMore(true);
  };

  const hasFilters = isSearching || activeType || activeTag;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="font-['Space_Grotesk']">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#117dff]/[0.012] blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <Brain size={22} className="text-[#117dff]" />
            </div>
            <div>
              <h1 className="text-[#0a0a0a] text-xl font-bold">{t('memories.title', 'Memory Intelligence')}</h1>
              <p className="text-[#a3a3a3] text-xs">{t('memories.subtitle', 'Browse memories, documents, and evidence')}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <UsageTracker resource="memories" className="mt-1" />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-[#a3a3a3] hover:text-[#525252] transition-colors font-mono mt-1"
              >
                <X size={12} />
                {t('memories.clearFilters', 'Clear filters')}
              </button>
            )}
            {/* Tier scope switcher — same 4 tiers as the Graph page. ALL =
                personal + org-wide + accessible projects (the visible set). */}
            <div className="flex flex-col gap-1">
              {[
                { key: 'visible', label: 'ALL' },
                { key: 'tier:organization', label: 'Org-level' },
                { key: 'tier:project', label: 'Project-level' },
                { key: 'tier:personal', label: 'Personal-level' },
              ].map((option) => (
                <React.Fragment key={option.key}>
                  <button
                    type="button"
                    onClick={() => setTierScope(option.key)}
                    className={`rounded-lg border px-2.5 py-1 text-[10px] font-mono text-left transition-colors ${
                      tierScope === option.key
                        ? 'border-[#117dff]/40 bg-[#117dff]/10 text-[#117dff]'
                        : 'border-[#e3e0db] bg-white text-[#a3a3a3] hover:text-[#525252]'
                    }`}
                  >
                    {option.label}
                  </button>
                  {/* Project picker — appears under Project-level. Lists only
                      the user's role-scoped projects. '' = all of them. */}
                  {option.key === 'tier:project' && tierScope === 'tier:project' && (
                    <select
                      value={tierProject}
                      onChange={(e) => setTierProject(e.target.value)}
                      className="rounded-lg border border-[#e3e0db] bg-white px-2 py-1 text-[10px] font-mono text-[#525252] max-w-[160px]"
                    >
                      <option value="">All my projects</option>
                      {(accessibleProjects || []).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex items-center gap-2 mb-6 border-b border-[#e3e0db]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                  setSelectedMemory(null);
                  setSelectedDocument(null);
                }}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all relative ${
                  isActive
                    ? 'border-[#117dff] text-[#117dff]'
                    : 'border-transparent text-[#a3a3a3] hover:text-[#525252] hover:border-[#d4d0ca]'
                }`}
              >
                <Icon size={16} />
                <span className="text-sm font-semibold">{t(`memories.tab_${tab.id}`, tab.label)}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[#117dff]/5 rounded-t-lg -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Contradiction banner — surfaces conflicting memories */}
        {contradictionsCount > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-2">
            <div className="flex items-center gap-2 text-[#dc2626]">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-sm font-['Space_Grotesk']">
                <strong>{contradictionsCount}</strong> {t('memories.conflictingMemories', 'conflicting memor{{suffix}} detected', { suffix: contradictionsCount === 1 ? 'y' : 'ies' })}
              </span>
            </div>
            <a
              href="/hivemind/app/memories?tab=contradictions"
              className="text-[11px] font-mono uppercase tracking-wider text-[#dc2626] hover:underline"
            >
              Review →
            </a>
          </div>
        )}

        {/* Top-entity chip cloud + group-by toggle */}
        {topEntities.length > 0 && (
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('memories.filterByEntity', 'Filter by entity:')}</span>
            {topEntities.map(e => {
              const active = activeEntity === e.key;
              const tint = e.type === 'person' ? '#117dff'
                : e.type === 'organization' ? '#8b5cf6'
                : e.type === 'project' ? '#10b981'
                : e.type === 'product' ? '#f59e0b'
                : e.type === 'location' ? '#06b6d4'
                : '#64748b';
              return (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => setActiveEntity(active ? null : e.key)}
                  style={active ? { borderColor: tint, color: tint, background: tint + '14' } : undefined}
                  className={`rounded-lg px-2 py-1 text-[11px] font-mono border ${active ? '' : 'border-[#e3e0db] text-[#525252]'} hover:border-[${tint}]`}
                >
                  <span style={{ color: tint }}>●</span> {e.name}
                  <span className="text-[#a3a3a3] ml-1">·{e.count}</span>
                </button>
              );
            })}
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-[#737373]">
              <input
                type="checkbox"
                id="group-by-doc"
                checked={groupByDoc}
                onChange={(e) => setGroupByDoc(e.target.checked)}
                className="accent-[#117dff]"
              />
              <label htmlFor="group-by-doc" className="cursor-pointer">{t('memories.groupByDocument', 'Group by document')}</label>
            </span>
          </div>
        )}

        {/* ── Tab Content ── */}
        {activeTab === 'memories' && (
          <MemoriesTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeType={activeType}
            setActiveType={setActiveType}
            activeTag={activeTag}
            setActiveTag={setActiveTag}
            activeEntity={activeEntity}
            setActiveEntity={setActiveEntity}
            groupByDoc={groupByDoc}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            offset={offset}
            setOffset={setOffset}
            allMemories={allMemories}
            setAllMemories={setAllMemories}
            activeCognitiveRole={activeCognitiveRole}
            setActiveCognitiveRole={setActiveCognitiveRole}
            hasMore={hasMore}
            setHasMore={setHasMore}
            selectedMemory={selectedMemory}
            setSelectedMemory={setSelectedMemory}
            debouncedQuery={debouncedQuery}
            clearFilters={clearFilters}
            hasFilters={hasFilters}
            setActiveTab={setActiveTab}
            showSuperseded={showSuperseded}
            setShowSuperseded={setShowSuperseded}
            hideNoise={hideNoise}
            setHideNoise={setHideNoise}
            tierScope={tierScope}
            tierProject={tierProject}
            orgKey={orgKey}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedDocument={selectedDocument}
            setSelectedDocument={setSelectedDocument}
          />
        )}

        {activeTab === 'evidence' && (
          <EvidenceTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setActiveTab={setActiveTab}
            setSelectedDocument={setSelectedDocument}
          />
        )}
      </div>
    </div>
  );
}

// ─── Memories Tab (existing functionality) ──────────────────────────────────

function MemoriesTab({
  orgKey,
  searchQuery,
  setSearchQuery,
  activeType,
  setActiveType,
  activeTag,
  setActiveTag,
  activeEntity,
  setActiveEntity,
  groupByDoc,
  showFilters,
  setShowFilters,
  showSuperseded,
  setShowSuperseded,
  hideNoise,
  setHideNoise,
  tierScope,
  tierProject,
  offset,
  setOffset,
  allMemories,
  setAllMemories,
  hasMore,
  setHasMore,
  selectedMemory,
  setSelectedMemory,
  debouncedQuery,
  clearFilters,
  hasFilters,
  setActiveTab,
  activeCognitiveRole,
  setActiveCognitiveRole,
}) {
  // ─── Data fetching ──────────────────────────────────────────────

  const { t } = useTranslation('dashboard');
  const { activeProjectId } = useTeamContext() || {};
  const isSearching = debouncedQuery.trim().length > 0;

  // ─── Profile-based total count (fallback for self-host orgs where
  //     the list endpoint pagination.total may be absent) ───────────────
  const [profileMemoryCount, setProfileMemoryCount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    apiClient.getProfile()
      .then((data) => {
        if (!cancelled) {
          const count = data?.profile?.memory_count ?? data?.memory_count ?? null;
          setProfileMemoryCount(typeof count === 'number' ? count : null);
        }
      })
      .catch(() => { /* non-fatal — fallback to pagination count */ });
    return () => { cancelled = true; };
  }, []);

  // ─── Show Dreams overlay (last dream-run, opt-in) ───────────────────
  const [showDreams, setShowDreams] = useState(false);
  const [lastRunDreams, setLastRunDreams] = useState([]);
  const [dreamsLoading, setDreamsLoading] = useState(false);
  // Fetch recent DREAMS (synthesis memories) EXACTLY ONCE per enable. We read the
  // memories directly (memory_type=synthesis) rather than the cognition_run audit —
  // the audit is sparse (only post-audit runs) and misses legacy dreams, so reading
  // synthesis rows always surfaces the dreams. Guard on showDreams only (keying on
  // length/loading caused an infinite refetch loop → perpetual spinner).
  // Deps = [showDreams] ONLY. Putting dreamsLoading/dreamsDone in deps re-ran the
  // effect the instant we set dreamsLoading(true), whose cleanup cancelled the
  // in-flight fetch → the cancelled fetch never cleared loading → perpetual
  // spinner + empty strip. Run once per enable; no setState-triggered cancel.
  useEffect(() => {
    if (!showDreams) return;
    let active = true;
    setDreamsLoading(true);
    (async () => {
      try {
        const data = await apiClient.listMemories({ ...listParams, memory_type: 'synthesis', limit: 12, offset: 0, tags: undefined });
        const mems = Array.isArray(data?.memories) ? data.memories : (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []));
        const dreams = mems.map((m) => ({
          id: m.id,
          title: m.title,
          content: m.content,
          role: m.cognitive_layer_role || m.role,
          confidence: m.synthesis_confidence ?? m.confidence,
          tags: m.tags || [],
        }));
        if (active) setLastRunDreams(dreams);
      } catch {
        if (active) setLastRunDreams([]);
      } finally {
        if (active) setDreamsLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDreams]);

  const listParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: 0,
      ...(activeType ? { memory_type: activeType } : {}),
      ...(activeTag || activeEntity
        ? { tags: [activeTag, activeEntity].filter(Boolean).join(',') }
        : {}),
      // Tri-state: showSuperseded=true → only superseded; false → include
      // BOTH latest + superseded (server tri-state). Superseded rows render
      // with a "Superseded" badge + Updates-target link so the timeline is
      // visible inline instead of hidden.
      is_latest: showSuperseded ? 'false' : 'all',
      ...(hideNoise ? { hide_noise: 'true' } : {}),
      // Project scope from TeamSwitcher — when active, backend filters to
      // memories whose projectId matches OR whose legacy project string matches.
      // Project-level tier with a picked project takes precedence.
      ...((tierScope === 'tier:project' && tierProject)
        ? { project_id: tierProject }
        : (activeProjectId ? { project_id: activeProjectId } : {})),
      ...(tierScope && tierScope !== 'visible' ? { scope: tierScope } : {}),
    }),
    [activeType, activeTag, activeEntity, showSuperseded, hideNoise, activeProjectId, tierScope, tierProject],
  );

  // List-mode fetch
  const {
    data: listData,
    loading: listLoading,
    error: listError,
    refetch: refetchList,
  } = useApiQuery(
    () => apiClient.listMemories(listParams),
    [listParams],
  );

  // Search-mode fetch
  const {
    data: searchData,
    loading: searchLoading,
    error: searchError,
  } = useApiQuery(
    () => (isSearching ? apiClient.quickSearch(debouncedQuery) : Promise.resolve(null)),
    [debouncedQuery, isSearching],
  );

  // Resolve which dataset to show
  const resolvedList = useMemo(() => {
    if (isSearching) {
      const results = searchData?.results || searchData?.memories || searchData || [];
      return filterUserVisibleMemories(Array.isArray(results) ? results : []);
    }
    const base = listData?.memories || listData?.results || listData || [];
    const arr = Array.isArray(base) ? base : [];
    // Merge for "load more"
    let result;
    if (allMemories.length > 0 && offset > 0) {
      const ids = new Set(allMemories.map((m) => m.id));
      const merged = [...allMemories];
      arr.forEach((m) => {
        if (!ids.has(m.id)) merged.push(m);
      });
      result = merged;
    } else {
      result = arr;
    }
    // Apply client-side cognitive-role filter when active.
    if (activeCognitiveRole) {
      result = result.filter((m) => m.cognitive_layer_role === activeCognitiveRole);
    }
    return filterUserVisibleMemories(result);
  }, [isSearching, searchData, listData, allMemories, offset, activeCognitiveRole]);

  // Total count from API pagination (server-side truth), not client array length
  const totalCount = useMemo(() => {
    if (isSearching) return null;
    return listData?.pagination?.total ?? listData?.total ?? null;
  }, [isSearching, listData]);

  // Sync hasMore from initial API response
  useEffect(() => {
    if (listData && !isSearching && offset === 0) {
      if (listData.pagination?.has_more === false) setHasMore(false);
    }
  }, [listData, isSearching, offset, setHasMore]);

  const loading = isSearching ? searchLoading : listLoading;
  const error = isSearching ? searchError : listError;

  // Collect all unique tags for the filter bar
  const availableTags = useMemo(() => {
    const tags = new Set();
    resolvedList.forEach((m) => (m.tags || []).forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [resolvedList]);
  const visibleMemoryCount = resolvedList.length;
  const displayedMemoryCount = Math.min(
    totalCount ?? profileMemoryCount ?? visibleMemoryCount,
    visibleMemoryCount,
  );

  // ─── Handlers ───────────────────────────────────────────────────

  const handleLoadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    try {
      const data = await apiClient.listMemories({ ...listParams, offset: nextOffset, limit: PAGE_SIZE });
      const arr = data?.memories || data?.results || data || [];
      const items = Array.isArray(arr) ? arr : [];
      if (items.length < PAGE_SIZE) setHasMore(false);
      setAllMemories((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        items.forEach((m) => {
          if (!ids.has(m.id)) merged.push(m);
        });
        return merged;
      });
      setOffset(nextOffset);
    } catch {
      // silently fail
    }
  };

  const handleSelectMemory = useCallback(
    async (memory) => {
      if (selectedMemory?.id === memory.id) {
        setSelectedMemory(null);
        return;
      }
      // Fetch full detail
      try {
        const full = await apiClient.getMemory(memory.id);
        setSelectedMemory(full?.memory || full);
      } catch {
        setSelectedMemory(memory);
      }
    },
    [selectedMemory, setSelectedMemory],
  );

  const handleDeleteMemory = useCallback(
    (id) => {
      setSelectedMemory(null);
      setAllMemories((prev) => prev.filter((m) => m.id !== id));
      refetchList();
    },
    [refetchList, setAllMemories, setSelectedMemory],
  );

  return (
    <>
      {/* ── Search Bar ── */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4d0ca]" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d4d0ca] hover:text-[#525252] transition-colors"
          >
            <X size={14} />
          </button>
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setOffset(0);
            setAllMemories([]);
            setHasMore(true);
          }}
          placeholder={t('memories.searchPlaceholder', 'Search memories semantically...')}
          className="w-full bg-transparent border border-[#e3e0db] rounded-xl py-3.5 pl-11 pr-10 text-[#0a0a0a] text-sm placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 focus:ring-1 focus:ring-[#117dff]/20 transition-all"
        />
      </div>

      {/* Search mode indicator */}
      {isSearching && !searchLoading && searchData && (
        <div className="flex items-center gap-1.5 mb-3 text-[10px] font-mono text-[#d4d0ca]">
          <span className={`w-1 h-1 rounded-full ${searchData?.metadata?.fallbackApplied ? 'bg-amber-400' : 'bg-[#16a34a]'}`} />
          {searchData?.metadata?.fallbackApplied
            ? t('memories.keywordSearch', 'Keyword search (vector unavailable)')
            : t('memories.semanticSearch', 'Semantic search (vector + keyword)')}
          {searchData?.metadata?.durationMs != null && (
            <span className="ml-1">· {searchData.metadata.durationMs}ms</span>
          )}
          {searchData?.search_method && (
            <span className="ml-1">· {searchData.search_method}</span>
          )}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${
              showFilters ? 'text-[#117dff]' : 'text-[#a3a3a3] hover:text-[#525252]'
            }`}
          >
            <Filter size={12} />
            {t('memories.filters', 'Filters')}
            {(activeType || activeTag) && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#117dff]" />
            )}
          </button>
          {/* Show Dreams — opt-in overlay of the last dream-run on top of memories */}
          <button
            onClick={() => setShowDreams((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${
              showDreams ? 'text-[#8b5cf6]' : 'text-[#a3a3a3] hover:text-[#525252]'
            }`}
            title={t('memories.showDreamsHint', 'Overlay the last dream run on top')}
          >
            <span>🌙</span>
            {t('memories.showDreams', 'Show Dreams')}
            <span className={`ml-1 inline-flex h-3.5 w-6 items-center rounded-full transition-colors ${showDreams ? 'bg-[#8b5cf6]' : 'bg-[#d4d0ca]'}`}>
              <span className={`h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform ${showDreams ? 'translate-x-[12px]' : 'translate-x-0.5'}`} />
            </span>
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Type filters */}
              <div className="mb-3">
                <label className="block text-[#d4d0ca] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                  {t('memories.filterType', 'Type')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MEMORY_TYPES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => {
                        setActiveType(activeType === t.key ? null : t.key);
                        setOffset(0);
                        setAllMemories([]);
                        setHasMore(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        activeType === t.key
                          ? 'border-current'
                          : 'border-[#e3e0db] text-[#525252] hover:text-[#525252] hover:border-[#d4d0ca]'
                      }`}
                      style={activeType === t.key ? { color: t.color, backgroundColor: `${t.color}15`, borderColor: `${t.color}40` } : {}}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cognitive layer filter — canonical / bridge / compression / reflection */}
              <div className="mb-3">
                <label className="block text-[#d4d0ca] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                  {t('memories.filterCognitiveLayer', 'Cognitive Layer')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'canonical',   label: 'Canonical',   color: '#8b5cf6' },
                    { key: 'bridge',      label: 'Bridge',      color: '#f97316' },
                    { key: 'compression', label: 'Compression', color: '#0ea5e9' },
                    { key: 'reflection',  label: 'Reflection',  color: '#94a3b8' },
                  ].map((r) => (
                    <button
                      key={r.key}
                      onClick={() => {
                        setActiveCognitiveRole(activeCognitiveRole === r.key ? null : r.key);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        activeCognitiveRole === r.key
                          ? 'border-current'
                          : 'border-[#e3e0db] text-[#525252] hover:text-[#525252] hover:border-[#d4d0ca]'
                      }`}
                      style={activeCognitiveRole === r.key ? { color: r.color, backgroundColor: `${r.color}15`, borderColor: `${r.color}40` } : {}}
                    >
                      COG·{r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* is_latest toggle — show superseded (drift-compacted) memories */}
              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSuperseded}
                    onChange={(e) => {
                      setShowSuperseded(e.target.checked);
                      setOffset(0);
                      setAllMemories([]);
                      setHasMore(true);
                    }}
                    className="w-3.5 h-3.5 accent-[#117dff]"
                  />
                  <span className="text-[11px] font-mono text-[#525252]">
                    {t('memories.showSuperseded', 'Show superseded')}
                    <span className="ml-1 text-[#a3a3a3]">
                      {t('memories.showSupersededHint', '(older versions hidden by cognition drift-compaction + Updates edges)')}
                    </span>
                  </span>
                </label>
              </div>

              {/* Hide newsletters / promotions / notifications — connector noise */}
              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideNoise}
                    onChange={(e) => {
                      setHideNoise(e.target.checked);
                      setOffset(0);
                      setAllMemories([]);
                      setHasMore(true);
                    }}
                    className="w-3.5 h-3.5 accent-[#117dff]"
                  />
                  <span className="text-[11px] font-mono text-[#525252]">
                    {t('memories.hideNoise', 'Hide newsletters & notifications')}
                    <span className="ml-1 text-[#a3a3a3]">
                      {t('memories.hideNoiseHint', '(promotions / updates / social / forums / no-reply)')}
                    </span>
                  </span>
                </label>
              </div>

              {/* Tag filters */}
                {availableTags.length > 0 && (
                  <div>
                    <label className="block text-[#d4d0ca] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                      {t('memories.filterTags', 'Tags')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.slice(0, 20).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setActiveTag(activeTag === tag ? null : tag);
                            setOffset(0);
                            setAllMemories([]);
                            setHasMore(true);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all border ${
                            activeTag === tag
                              ? 'border-[#117dff]/40 bg-[#117dff]/10 text-[#117dff]'
                              : 'border-[#e3e0db] text-[#a3a3a3] hover:text-[#525252] hover:border-[#d4d0ca]'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-[#dc2626] text-sm">
            <AlertTriangle size={14} />
            <span className="font-mono text-xs">{error}</span>
          </div>
        )}

        {/* ── Content ── */}
        <div className="relative">
          {/* Show Dreams overlay — last dream-run on top, 4-per-row half-height cards */}
          {showDreams && (
            <div className="mb-4 rounded-lg border border-[#8b5cf6]/30 bg-[#8b5cf6]/[0.04] p-2">
              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono text-[#8b5cf6]">
                <span>🌙</span>
                <span>{t('memories.recentDreams', 'Recent dreams')}</span>
                {dreamsLoading
                  ? <Loader2 size={9} className="animate-spin" />
                  : <span className="text-[#a3a3a3]">· {lastRunDreams.length}</span>}
              </div>
              {!dreamsLoading && lastRunDreams.length === 0 ? (
                <p className="text-[10px] text-[#a3a3a3]">{t('memories.noDreamsYet', 'No dreams yet — enable the cognitive layer + run a dream.')}</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
                  {lastRunDreams.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedMemory({ id: d.id, title: d.title, content: d.content, cognitive_layer_role: d.role, tags: d.tags || [], memory_type: 'synthesis' })}
                      title={d.title || d.content}
                      className="text-left rounded-md border border-[#8b5cf6]/20 bg-white/70 hover:border-[#8b5cf6]/50 transition-colors px-1.5 py-1 h-[40px] overflow-hidden flex items-center gap-1.5"
                    >
                      <span className="px-1 py-0.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] text-[8px] font-semibold uppercase shrink-0">{(d.role || 'dream').slice(0, 4)}</span>
                      <span className="text-[9px] leading-tight text-[#0a0a0a] line-clamp-2">{d.title || d.content}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {loading && resolvedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 size={28} className="text-[#117dff]/50 animate-spin mb-4" />
              <span className="text-[#d4d0ca] text-sm">{t('memories.loadingMemories', 'Loading memories...')}</span>
            </div>
          ) : resolvedList.length === 0 ? (
            <EmptyState hasFilters={!!hasFilters} />
          ) : (
            <>
              {/* Count — prefer server pagination total; fall back to profile
                  memory_count for self-host orgs where the list endpoint
                  may not return a pagination block. */}
              <p className="text-[#d4d0ca] text-[11px] font-mono mb-3">
                {isSearching
                  ? t('memories.searchResultCount', '{{count}} result{{suffix}}', { count: resolvedList.length, suffix: resolvedList.length !== 1 ? 's' : '' })
                  : t('memories.memoryCount', '{{count}} memories', { count: displayedMemoryCount })}
                {loading && <Loader2 size={10} className="inline-block ml-2 animate-spin" />}
              </p>

              {/* Grid — flat or grouped-by-document */}
              {groupByDoc ? (
                <AnimatePresence mode="popLayout">
                  {(() => {
                    // Group by source_metadata.document_id (Phase 1 evidence-backed memories)
                    const groups = new Map();
                    for (const m of resolvedList) {
                      const docId = m.source_metadata?.document_id
                        || m.metadata?.source_metadata?.document_id
                        || m.metadata?.document_id
                        || null;
                      const key = docId || 'ungrouped';
                      if (!groups.has(key)) groups.set(key, { docId, items: [] });
                      groups.get(key).items.push(m);
                    }
                    return Array.from(groups.entries()).map(([key, grp]) => {
                      const first = grp.items[0];
                      const docTitle = first?.source_metadata?.heading
                        || first?.metadata?.source_metadata?.heading
                        || (grp.docId ? `Document ${grp.docId.slice(0, 8)}` : 'Other memories');
                      return (
                        <div key={key} className="mb-4">
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#117dff]" />
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#525252]">
                              {docTitle}
                            </span>
                            <span className="text-[10px] font-mono text-[#a3a3a3]">·{grp.items.length} {t('memories.memoryOrMemories', 'memor{{suffix}}', { suffix: grp.items.length === 1 ? 'y' : 'ies' })}</span>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {grp.items.map((memory, i) => (
                              <MemoryCard
                                key={memory.id || `${key}-${i}`}
                                memory={memory}
                                index={i}
                                onSelect={handleSelectMemory}
                                isSelected={selectedMemory?.id === memory.id}
                                orgKey={orgKey}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </AnimatePresence>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <AnimatePresence mode="popLayout">
                    {resolvedList.map((memory, i) => (
                      <MemoryCard
                        key={memory.id || i}
                        memory={memory}
                        index={i}
                        onSelect={handleSelectMemory}
                        isSelected={selectedMemory?.id === memory.id}
                        orgKey={orgKey}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Load more */}
              {!isSearching && hasMore && resolvedList.length >= PAGE_SIZE && (totalCount == null || resolvedList.length < totalCount) && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#f3f1ec] border border-[#e3e0db] text-[#525252] text-sm font-semibold hover:text-[#525252] hover:border-[#d4d0ca] transition-all"
                  >
                    {t('memories.loadMore', 'Load more')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      {/* ── Detail Slide-over ── */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryDetailPanel
            memory={selectedMemory}
            onClose={() => setSelectedMemory(null)}
            onDelete={handleDeleteMemory}
            onViewEvidence={() => setActiveTab('evidence')}
            orgKey={orgKey}
          />
        )}
      </AnimatePresence>
    </>
  // eslint-disable-next-line no-unused-vars
  );
}

// ─── Documents Tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ searchQuery, setSearchQuery, selectedDocument, setSelectedDocument }) {
  const { t } = useTranslation('dashboard');
  const PAGE_SIZE = 40;
  const [offset, setOffset] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);

  const debouncedQuery = useDebounce(searchQuery, 350);
  const isSearching = debouncedQuery.trim().length > 0;

  // Reset paging whenever the search term flips.
  useEffect(() => { setOffset(0); setDocuments([]); }, [debouncedQuery]);

  // Fetch documents (search returns all matches; list is paged + appended).
  const {
    data,
    loading,
    error,
  } = useApiQuery(
    () => isSearching
      ? apiClient.searchDocuments(debouncedQuery, { limit: 200 })
      : apiClient.listDocuments({ limit: PAGE_SIZE, offset }),
    [isSearching, debouncedQuery, offset]
  );

  useEffect(() => {
    if (!data) return;
    if (isSearching) {
      setDocuments(data.results || []);
      setTotal((data.results || []).length);
      return;
    }
    const page = data.documents || [];
    // Append on paging (offset>0), replace on first page. Dedup by id so a
    // re-fetch of page 0 never double-lists.
    setDocuments((prev) => {
      const base = offset === 0 ? [] : prev;
      const seen = new Set(base.map((d) => d.id));
      return [...base, ...page.filter((d) => !seen.has(d.id))];
    });
    setTotal(data.pagination?.total ?? data.total ?? 0);
  }, [data, isSearching, offset]);

  const hasMore = !isSearching && total > 0 && documents.length < total;

  return (
    <>
      {/* ── Search Bar ── */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4d0ca]" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d4d0ca] hover:text-[#525252] transition-colors"
          >
            <X size={14} />
          </button>
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('memories.searchDocumentsPlaceholder', 'Search documents by title, tags, or platform...')}
          className="w-full bg-transparent border border-[#e3e0db] rounded-xl py-3.5 pl-11 pr-10 text-[#0a0a0a] text-sm placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 focus:ring-1 focus:ring-[#117dff]/20 transition-all"
        />
      </div>

      {/* ── Loading / Error States ── */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#117dff]" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} />
          <span>{t('memories.failedToLoadDocuments', 'Failed to load documents')}</span>
        </div>
      )}

      {/* ── Document Grid ── */}
      {!loading && !error && documents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc, idx) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              index={idx}
              onSelect={() => setSelectedDocument(doc)}
              isSelected={selectedDocument?.id === doc.id}
            />
          ))}
        </div>
      )}

      {/* ── Load more (show ALL uploaded docs, not just the first page) ── */}
      {!loading && !error && documents.length > 0 && (
        <div className="flex items-center justify-center gap-3 pt-5">
          <span className="text-xs text-[#a3a3a3]">
            {t('memories.showingDocs', 'Showing')} {documents.length}{total ? ` / ${total}` : ''}
          </span>
          {hasMore && (
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-[#e5e2dc] text-[#525252] hover:bg-[#f5f3ee] transition-colors"
            >
              {t('memories.loadMore', 'Load more')}
            </button>
          )}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && !error && documents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={48} className="text-[#d4d0ca] mb-4" />
          <h3 className="text-[#525252] font-semibold mb-2">
            {isSearching ? t('memories.noDocumentsFound', 'No documents found') : t('memories.noDocumentsYet', 'No documents yet')}
          </h3>
          <p className="text-[#a3a3a3] text-sm max-w-md">
            {isSearching
              ? t('memories.noDocumentsHint', 'Try a different search query')
              : t('memories.noDocumentsUploadHint', 'Upload documents through the knowledge base to start building your intelligence repository')}
          </p>
        </div>
      )}

      {/* ── Document Detail Slide-over ── */}
      <AnimatePresence>
        {selectedDocument && (
          <DocumentDetailPanel
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Evidence Tab ──────────────────────────────────────────────────────────────

function EvidenceTab({ searchQuery, setSearchQuery, setActiveTab, setSelectedDocument }) {
  const { t } = useTranslation('dashboard');
  const [searchMode, setSearchMode] = useState('evidence'); // 'evidence' or 'hybrid'
  const debouncedQuery = useDebounce(searchQuery, 350);

  const {
    data,
    loading,
    error,
  } = useApiQuery(
    () => {
      if (!debouncedQuery.trim()) return Promise.resolve(null);
      return searchMode === 'hybrid'
        ? apiClient.hybridSearch(debouncedQuery, { limit: 20 })
        : apiClient.searchEvidence(debouncedQuery, { limit: 20 });
    },
    [debouncedQuery, searchMode]
  );

  const results = data?.results || data?.evidence || data || [];

  return (
    <>
      {/* ── Search Bar with Mode Toggle ── */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4d0ca]" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d4d0ca] hover:text-[#525252] transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('memories.searchEvidencePlaceholder', 'Search evidence segments...')}
            className="w-full bg-transparent border border-[#e3e0db] rounded-xl py-3.5 pl-11 pr-10 text-[#0a0a0a] text-sm placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 focus:ring-1 focus:ring-[#117dff]/20 transition-all"
          />
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#a3a3a3] font-mono">{t('memories.searchMode', 'Search mode:')}</span>
          <button
            onClick={() => setSearchMode('evidence')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              searchMode === 'evidence'
                ? 'border-[#117dff] bg-[#117dff]/10 text-[#117dff]'
                : 'border-[#e3e0db] text-[#525252] hover:border-[#d4d0ca]'
            }`}
          >
            {t('memories.evidenceOnly', 'Evidence only')}
          </button>
          <button
            onClick={() => setSearchMode('hybrid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              searchMode === 'hybrid'
                ? 'border-[#117dff] bg-[#117dff]/10 text-[#117dff]'
                : 'border-[#e3e0db] text-[#525252] hover:border-[#d4d0ca]'
            }`}
          >
            {t('memories.hybridSearch', 'Hybrid (evidence + memories)')}
          </button>
        </div>
      </div>

      {/* ── Loading / Error States ── */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#117dff]" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} />
          <span>{t('memories.failedToSearchEvidence', 'Failed to search evidence')}</span>
        </div>
      )}

      {/* ── Evidence Results ── */}
      {!loading && !error && results.length > 0 && (
        <div className="space-y-3">
          {results.map((item, idx) => (
            <EvidenceCard 
              key={`${item.segment_id || item.id}-${idx}`} 
              evidence={item}
              onViewDocument={(docId) => {
                setActiveTab('documents');
                // Fetch and select the document
                apiClient.getDocument(docId).then(data => {
                  setSelectedDocument(data.document || data);
                }).catch(() => {});
              }}
            />
          ))}
        </div>
      )}

      {/* ── Empty / Prompt State ── */}
      {!loading && !error && !debouncedQuery.trim() && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Database size={48} className="text-[#d4d0ca] mb-4" />
          <h3 className="text-[#525252] font-semibold mb-2">{t('memories.searchEvidenceTitle', 'Search evidence segments')}</h3>
          <p className="text-[#a3a3a3] text-sm max-w-md">
            {t('memories.searchEvidenceHint', 'Enter a query to search through uploaded document segments and find supporting evidence')}
          </p>
        </div>
      )}

      {!loading && !error && debouncedQuery.trim() && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Database size={48} className="text-[#d4d0ca] mb-4" />
          <h3 className="text-[#525252] font-semibold mb-2">{t('memories.noEvidenceFound', 'No evidence found')}</h3>
          <p className="text-[#a3a3a3] text-sm max-w-md">
            {t('memories.noEvidenceHint', 'Try a different query or switch search modes')}
          </p>
        </div>
      )}
    </>
  );
}

// ─── Document Card ─────────────────────────────────────────────────────────────

function DocumentCard({ document, index, onSelect, isSelected }) {
  const { t } = useTranslation('dashboard');
  const typeColor = document.documentType === 'pdf' ? '#ef4444' :
                   document.documentType === 'docx' ? '#3b82f6' :
                   document.documentType === 'xlsx' ? '#10b981' : '#6b7280';

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onSelect}
      className={`group relative w-full text-left bg-transparent border rounded-xl p-4 transition-all hover:shadow-md ${
        isSelected
          ? 'border-[#117dff] shadow-lg shadow-[#117dff]/10'
          : 'border-[#e3e0db] hover:border-[#d4d0ca]'
      }`}
    >
      {/* Type Badge */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
        >
          {document.documentType || 'document'}
        </div>
        {document.sourcePlatform && (
          <div className="flex items-center gap-1 text-[10px] text-[#a3a3a3] font-mono">
            <Monitor size={10} />
            {document.sourcePlatform}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[#0a0a0a] font-semibold text-sm mb-2 line-clamp-2 group-hover:text-[#117dff] transition-colors">
        {document.title}
      </h3>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-[10px] text-[#a3a3a3] font-mono mb-3">
        <span>{document.wordCount?.toLocaleString() || 0} {t('memories.words', 'words')}</span>
        <span>·</span>
        <span>{document.segmentCount || 0} {t('memories.segmentsLower', 'segments')}</span>
        <span>·</span>
        <span>{document.promotedCount || 0} {t('memories.promotedLower', 'promoted')}</span>
      </div>

      {/* Tags */}
      {document.tags && document.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {document.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-[#117dff]/5 text-[#117dff] rounded text-[10px] font-medium"
            >
              {tag}
            </span>
          ))}
          {document.tags.length > 3 && (
            <span className="text-[10px] text-[#a3a3a3]">+{document.tags.length - 3} more</span>
          )}
        </div>
      )}

      {/* Created date */}
      <div className="flex items-center gap-1 mt-3 text-[10px] text-[#d4d0ca] font-mono">
        <Clock size={10} />
        {(document.createdAt && !isNaN(new Date(document.createdAt)) ? new Date(document.createdAt).toLocaleDateString() : '—')}
      </div>
    </motion.button>
  );
}

// ─── Evidence Card ─────────────────────────────────────────────────────────────

function EvidenceCard({ evidence, onViewDocument }) {
  const { t } = useTranslation('dashboard');
  const hasDocument = evidence.document_id || evidence.documentId;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-transparent border border-[#e3e0db] rounded-xl p-4 hover:border-[#d4d0ca] hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-[#0a0a0a] text-sm line-clamp-3 mb-2">
            {evidence.content || evidence.text || evidence.excerpt}
          </p>
        </div>
        {evidence.score && (
          <div className="ml-3 px-2 py-1 bg-[#117dff]/10 text-[#117dff] rounded text-xs font-mono font-semibold">
            {(evidence.score * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-[#a3a3a3] font-mono flex-1">
          {evidence.document_title && (
            <>
              <FileText size={10} />
              <span className="line-clamp-1">{evidence.document_title}</span>
            </>
          )}
          {evidence.segment_index != null && (
            <>
              <span>·</span>
              <span>{t('memories.segment', 'Segment')} {evidence.segment_index + 1}</span>
            </>
          )}
          {evidence.type === 'memory' && (
            <>
              <span>·</span>
              <Brain size={10} />
              <span>{t('memories.canonicalMemory', 'Canonical memory')}</span>
            </>
          )}
        </div>
        
        {/* View Document Button */}
        {hasDocument && onViewDocument && (
          <button
            onClick={() => onViewDocument(evidence.document_id || evidence.documentId)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-[#117dff] hover:bg-[#117dff]/10 rounded transition-colors"
          >
            <ExternalLink size={10} />
            <span>{t('memories.viewDoc', 'View Doc')}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Document Detail Panel ─────────────────────────────────────────────────────

function DocumentDetailPanel({ document, onClose }) {
  const { t } = useTranslation('dashboard');
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (document) {
      setLoading(true);
      apiClient.getDocument(document.id)
        .then(data => {
          setDetailData(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [document]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#0a0a0a]/20 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-full max-w-3xl bg-[#faf9f4] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#0a0a0a] mb-1">{document.title}</h2>
              <div className="flex items-center gap-2 text-xs text-[#a3a3a3] font-mono">
                {document.documentType && (
                  <span className="px-2 py-0.5 bg-[#117dff]/10 text-[#117dff] rounded font-semibold uppercase">
                    {document.documentType}
                  </span>
                )}
                {document.sourcePlatform && (
                  <span>{document.sourcePlatform}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#a3a3a3] hover:text-[#525252] transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#117dff]" />
            </div>
          )}

          {/* Content */}
          {!loading && detailData && (
            <>
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#a3a3a3] text-xs font-mono uppercase">{t('memories.wordCount', 'Word Count')}</span>
                  <p className="text-[#0a0a0a] font-semibold">{document.wordCount?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <span className="text-[#a3a3a3] text-xs font-mono uppercase">{t('memories.segments', 'Segments')}</span>
                  <p className="text-[#0a0a0a] font-semibold">{detailData.segments?.length || 0}</p>
                </div>
                <div>
                  <span className="text-[#a3a3a3] text-xs font-mono uppercase">{t('memories.promoted', 'Promoted')}</span>
                  <p className="text-[#0a0a0a] font-semibold">{detailData.promotedMemories?.length || 0}</p>
                </div>
                <div>
                  <span className="text-[#a3a3a3] text-xs font-mono uppercase">{t('memories.created', 'Created')}</span>
                  <p className="text-[#0a0a0a] font-semibold">{(document.createdAt && !isNaN(new Date(document.createdAt)) ? new Date(document.createdAt).toLocaleDateString() : '—')}</p>
                </div>
              </div>

              {/* Promoted Memories */}
              {detailData.promotedMemories && detailData.promotedMemories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#0a0a0a] mb-3 flex items-center gap-2">
                    <Brain size={16} />
                    {t('memories.promotedMemories', 'Promoted Memories')} ({detailData.promotedMemories.length})
                  </h3>
                  <div className="space-y-2">
                    {detailData.promotedMemories.map(mem => (
                      <div key={mem.id} className="p-3 bg-[#117dff]/5 border border-[#117dff]/20 rounded-lg">
                        <p className="text-sm text-[#0a0a0a] font-medium mb-1">{mem.title}</p>
                        <p className="text-xs text-[#525252] line-clamp-2">{mem.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Segments */}
              {detailData.segments && detailData.segments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#0a0a0a] mb-3 flex items-center gap-2">
                    <FileText size={16} />
                    {t('memories.documentPreview', 'Document preview')}
                    <span className="text-xs font-normal text-[#a3a3a3]">({detailData.segments.length} {t('memories.segments', 'segments')})</span>
                  </h3>
                  {/* Clean rendered extraction: segments ordered by index and
                      rendered by type into a readable document — full content,
                      no truncation. */}
                  <div className="bg-white border border-[#e5e2dc] rounded-xl px-6 py-5 leading-relaxed">
                    {[...detailData.segments]
                      .sort((a, b) => (a.segmentIndex ?? 0) - (b.segmentIndex ?? 0))
                      .map((seg) => {
                        const text = seg.content || '';
                        const type = seg.segmentType || 'paragraph';
                        if (type === 'heading') {
                          return <h4 key={seg.id} className="text-base font-semibold text-[#0a0a0a] mt-5 mb-1.5 first:mt-0">{text}</h4>;
                        }
                        if (type === 'code_block') {
                          return <pre key={seg.id} className="text-xs font-mono bg-[#f5f3ee] text-[#404040] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap mb-3">{text}</pre>;
                        }
                        if (type === 'table') {
                          return <pre key={seg.id} className="text-xs font-mono bg-[#f5f3ee] text-[#404040] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap mb-3 border border-[#e5e2dc]">{text}</pre>;
                        }
                        return <p key={seg.id} className="text-sm text-[#404040] whitespace-pre-wrap mb-3 last:mb-0">{text}</p>;
                      })}
                  </div>
                </div>
              )}
              {detailData.document && (!detailData.segments || detailData.segments.length === 0) && (
                <div className="bg-white border border-[#e5e2dc] rounded-xl px-6 py-8 text-center">
                  <FileText size={20} className="mx-auto mb-2 text-[#d4d0ca]" />
                  <p className="text-sm text-[#a3a3a3]">
                    {detailData.document.parseStatus === 'failed'
                      ? t('memories.parseFailed', 'Extraction failed for this document.')
                      : detailData.document.parseStatus === 'pending'
                        ? t('memories.parsePending', 'Extraction still processing…')
                        : t('memories.noExtraction', 'No extracted content available.')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
