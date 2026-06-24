import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Plus,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  AlertCircle,
  Activity,
  Sparkles,
  ChevronRight,
  X,
  Send,
  Users,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Zap,
  GraduationCap,
  Brain,
  Target,
  Shield,
  Cpu,
  Quote,
  Rocket,
  KeyRound,
  Info,
  Store,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useTeamContext } from '../shared/team-context';
import { useAuth } from '../auth/AuthProvider';
import {
  buildPersonaContractLike,
  contractPills,
} from '../shared/persona-contract';
import { FIELDS, professionsForField, NAME_SUGGESTIONS } from '../shared/field-catalog';

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

const PERSONA_PRESETS = [
  {
    id: 'operator',
    name: 'Maya Ortiz',
    summary: 'Operations lead who keeps teams aligned under pressure and turns chaos into checklists.',
    role_archetype: 'coordinator',
    peer_review_targets: ['skeptic', 'investigator'],
    llm_provider: 'groq',
    model: DEFAULT_GROQ_MODEL,
    tools: ['hivemind_recall', 'hivemind_save_memory', 'hivemind_slack_post', 'hivemind_slack_react'],
    persona: 'You are Maya Ortiz, a calm operations lead. You speak like a capable human teammate: direct, warm, practical, and time-aware. You convert vague requests into plans, summarize moving parts clearly, and keep the team honest about status, owners, blockers, and next steps. Use reactions sparingly as social signals of agreement, urgency, or caution.',
  },
  {
    id: 'skeptic',
    name: 'Jonah Price',
    summary: 'Product skeptic who challenges weak assumptions and pushes for evidence before commitment.',
    role_archetype: 'skeptic',
    peer_review_targets: ['coordinator', 'generalist'],
    llm_provider: 'groq',
    model: DEFAULT_GROQ_MODEL,
    tools: ['hivemind_recall', 'hivemind_slack_search', 'hivemind_slack_history'],
    persona: 'You are Jonah Price, a thoughtful but sharp product skeptic. You sound human, opinionated, and evidence-driven. You politely challenge plans that rely on wishful thinking, vague language, or missing user impact. Ask what could break, what the team is assuming, and what signal would change the decision.',
  },
  {
    id: 'researcher',
    name: 'Lina Park',
    summary: 'Research-oriented strategist who pulls prior context together and explains what it means.',
    role_archetype: 'investigator',
    peer_review_targets: ['coordinator', 'synthesizer'],
    llm_provider: 'groq',
    model: DEFAULT_GROQ_MODEL,
    tools: ['hivemind_recall', 'hivemind_save_memory', 'hivemind_slack_search', 'hivemind_slack_history'],
    persona: 'You are Lina Park, a research-minded strategist. You sound like a smart human analyst who reads the room and brings in just enough evidence to move the conversation forward. You connect prior notes, conversation history, and decisions, then explain what they imply in plain language.',
  },
  {
    id: 'builder',
    name: 'Eli Mercer',
    summary: 'Hands-on builder who turns ideas into concrete deliverables, tradeoffs, and implementation steps.',
    role_archetype: 'generalist',
    peer_review_targets: ['investigator', 'skeptic'],
    llm_provider: 'groq',
    model: DEFAULT_GROQ_MODEL,
    tools: ['hivemind_recall', 'hivemind_save_memory', 'hivemind_slack_post'],
    persona: 'You are Eli Mercer, a senior builder who thinks in systems and execution. You sound human, practical, and slightly impatient with fluff. You break work into steps, explain tradeoffs, and keep pushing toward something the team can actually ship or test today.',
  },
];

// Legacy flat presets removed — the marketplace is now field → profession (see field-catalog.js +
// AgentMarketplaceModal). PERSONA_PRESETS (above) is still the seeded-employee set.

const TASK_TEMPLATES = [
  'Simulate a launch review for a feature that has one severe bug, one confused customer signal, and a hard deadline tomorrow. Debate options, react to strong points, and end with a recommendation plus next actions.',
  'Run an incident-room simulation for a broken connector rollout. Investigate likely causes, search prior context, react to useful ideas, and synthesize a response plan for the workspace.',
  'Act like a human strategy team deciding whether to expand a pilot program. Use memory, prior conversations, and reactions to show agreement or concern before drafting a final decision.',
];

const SEEDED_PERSONA_SLUGS = PERSONA_PRESETS.map((preset) => slugifyName(preset.name));

// TOOL_COPY removed — was used by the 6-step wizard's tools picker which
// was collapsed into the single-step create form. Kept as a comment for
// future reference if we re-introduce tool selection in the UI.

const REACTION_EMOJI = {
  eyes: '👀',
  thumbs_up: '👍',
  thumbsup: '👍',
  warning: '⚠️',
  white_check_mark: '✅',
  check: '✅',
  fire: '🔥',
  rocket: '🚀',
  thinking_face: '🤔',
  question: '❓',
  x: '❌',
};

function slugifyName(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }
  return {};
}

function PersonaContractRow({ contract }) {
  const pills = contractPills(contract);
  if (!pills || pills.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {pills.map((pill) => (
        <span
          key={pill}
          className="inline-flex max-w-full items-center rounded border border-[#e3e0db] bg-[#faf9f4] px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[#525252] truncate"
          title={pill}
        >
          {pill}
        </span>
      ))}
    </div>
  );
}

function formatReactionEmoji(value) {
  if (!value) return '✨';
  const normalized = String(value).replace(/^:+|:+$/g, '');
  return REACTION_EMOJI[normalized] || normalized;
}

function cleanPreviewText(content) {
  return String(content || '')
    .replace(/\*\*/g, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractMessagePresentation(msg) {
  const raw = String(msg?.content || '').trim();
  if (!raw) {
    return { preview: '', detail: '', thoughtLabel: null };
  }

  const claimMatch = raw.match(/(?:REVISED_)?CLAIM:\s*([\s\S]*?)(?:\n[A-Z_]+:|$)/);
  if (claimMatch) {
    return {
      preview: cleanPreviewText(claimMatch[1]),
      detail: raw,
      thoughtLabel: raw.startsWith('REVISED_CLAIM:') ? 'Revision notes' : 'Claim details',
    };
  }

  const critiqueMatch = raw.match(/CRITIQUE:\s*([\s\S]*?)(?:\n[A-Z_]+:|$)/);
  if (critiqueMatch) {
    return {
      preview: cleanPreviewText(critiqueMatch[1].split(/\n\n|\n-/)[0]),
      detail: raw,
      thoughtLabel: 'Review notes',
    };
  }

  const changesMatch = raw.match(/CHANGES:\s*([\s\S]*?)(?:\n[A-Z_]+:|$)/);
  if (changesMatch) {
    return {
      preview: cleanPreviewText(changesMatch[1].split(/\n\n|\n-/)[0]),
      detail: raw,
      thoughtLabel: 'Revision notes',
    };
  }

  const trimmed = raw.split(/\n\nReferences:/i)[0].trim();
  const preview = cleanPreviewText(trimmed).split('\n\n')[0];
  const condensed = preview.length > 220 ? `${preview.slice(0, 217).trim()}...` : preview;
  const detail = cleanPreviewText(raw);
  const thoughtLabel = detail !== condensed || /References:|Source:|\*\*/.test(raw) ? 'Thinking trace' : null;

  return { preview: condensed, detail, thoughtLabel };
}

function formatTaskTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function nameBadgeCopy(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'TM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function deliveryModeForMessage(msg) {
  if (!msg) return 'typing';
  if (msg.kind === 'action') return 'thinking';
  if (msg.kind === 'claim' || msg.kind === 'review' || msg.kind === 'revision') return 'thinking';
  return 'typing';
}

function TypingDots({ tone = 'default' }) {
  const dotClass = tone === 'accent' ? 'bg-white/80' : 'bg-[#7a8798]';
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass} animate-bounce`}
          style={{ animationDelay: `${index * 120}ms`, animationDuration: '1s' }}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }) {
  const { t } = useTranslation('dashboard');
  const STATUS_STYLES_I18N = {
    draft:     { bg: 'bg-[#f3f1ec]',         text: 'text-[#525252]', dot: 'bg-[#a3a3a3]', label: t('digitalemployees.statusDraft', 'Draft') },
    deploying: { bg: 'bg-blue-500/10',       text: 'text-blue-700',  dot: 'bg-blue-500 animate-pulse', label: t('digitalemployees.statusDeploying', 'Deploying') },
    running:   { bg: 'bg-emerald-500/10',    text: 'text-[#16a34a]', dot: 'bg-[#16a34a]', label: t('digitalemployees.statusRunning', 'Running') },
    paused:    { bg: 'bg-amber-500/10',      text: 'text-amber-700', dot: 'bg-amber-500', label: t('digitalemployees.statusPaused', 'Paused') },
    error:     { bg: 'bg-red-500/10',        text: 'text-[#dc2626]', dot: 'bg-[#dc2626]', label: t('digitalemployees.statusError', 'Error') },
  };
  const s = STATUS_STYLES_I18N[status] || STATUS_STYLES_I18N.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const HYPER_STATE_STYLES = {
  baseline: 'bg-[#f3f1ec] text-[#737373] border-[#e3e0db]',
  collecting_feedback: 'bg-amber-50 text-amber-700 border-amber-200',
  ready_for_tuning: 'bg-violet-50 text-violet-700 border-violet-200',
  optimized: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function HyperStateBadge({ hyper }) {
  if (!hyper) return null;
  const cls = HYPER_STATE_STYLES[hyper.state] || HYPER_STATE_STYLES.baseline;
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      <Sparkles size={10} />
      {hyper.state_label || 'Baseline'}
    </span>
  );
}

function EmployeeCard({ employee, onPause, onResume, onArchive, onOpen, onDeploy, onTune, selectable, selected, onToggleSelect }) {
  const { t } = useTranslation('dashboard');
  const [tuning, setTuning] = useState(false);
  const isRunning = employee.status === 'running';
  const isPaused = employee.status === 'paused';
  const isDraft = employee.status === 'draft';
  const isError = employee.status === 'error';
  const isDeploying = employee.status === 'deploying';
  const msgs = employee.metricsLast24h?.messages || 0;
  const tokens = employee.metricsLast24h?.tokens || 0;
  const hyper = employee.hyper;
  const contract = hyper?.persona_contract || buildPersonaContractLike(employee);
  const versionLabel = employee.active_prompt_version?.version_label || hyper?.active_prompt_version?.version_label || 'v0';
  const evalCount = hyper?.evaluation_count || 0;
  const threshold = hyper?.tuning_threshold || 20;
  const isReadyForTuning = hyper?.state === 'ready_for_tuning';
  const isOptimized = hyper?.state === 'optimized';

  const handleTune = async (e) => {
    e.stopPropagation();
    if (tuning || !onTune) return;
    setTuning(true);
    try {
      await onTune(employee);
    } finally {
      setTuning(false);
    }
  };

  const handleClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect(employee);
    } else if (onOpen) {
      onOpen(employee);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white border rounded-lg p-4 transition-all cursor-pointer flex flex-col ${
        selected
          ? 'border-[#117dff] ring-1 ring-[#117dff]/20'
          : 'border-[#e3e0db] hover:border-[#117dff]/40'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${
            selected ? 'bg-[#117dff] border-[#117dff]' : 'bg-[#117dff]/10 border-[#117dff]/20'
          }`}>
            <Bot size={16} className={selected ? 'text-white' : 'text-[#117dff]'} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-[#0a0a0a] truncate">{employee.name}</h3>
            <p className="text-[10px] text-[#a3a3a3] font-mono">{employee.slug}</p>
          </div>
        </div>
        <StatusBadge status={employee.status} />
      </div>

      {employee.persona && (
        <p className="text-[11px] text-[#525252] line-clamp-2 mb-3">{employee.persona}</p>
      )}
      <PersonaContractRow contract={contract} />

      <div className="mb-3 rounded-md border border-[#ece8e1] bg-[#fbfaf7] p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8b857c]">{t('digitalemployees.hyperAgent', 'Hyper Agent')}</p>
            <p className="mt-1 text-[12px] font-semibold text-[#0a0a0a]">{t('digitalemployees.activePrompt', '{{version}} active prompt', { version: versionLabel })}</p>
          </div>
          <HyperStateBadge hyper={hyper} />
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-[#737373] font-mono">
          <span>{t('digitalemployees.evals', '{{count}}/{{threshold}} evals', { count: evalCount, threshold })}</span>
          <span>{hyper?.source === 'prompt_tune' ? t('digitalemployees.tunedPromptLive', 'tuned prompt live') : t('digitalemployees.seedPromptLive', 'seed prompt live')}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-[#ece8e1] overflow-hidden">
          <div
            className={`h-full rounded-full ${hyper?.state === 'optimized' ? 'bg-emerald-500' : hyper?.state === 'ready_for_tuning' ? 'bg-violet-500' : 'bg-amber-400'}`}
            style={{ width: `${hyper?.state === 'optimized' ? 100 : (hyper?.progress_pct || 0)}%` }}
          />
        </div>
        {isReadyForTuning && (
          <button
            onClick={handleTune}
            disabled={tuning}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-[6px] bg-violet-600 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {tuning ? (
              <><RefreshCw size={11} className="animate-spin" /> {t('digitalemployees.tuning', 'Tuning…')}</>
            ) : (
              <><Sparkles size={11} /> {t('digitalemployees.tuneNow', 'Tune now')}</>
            )}
          </button>
        )}
        {isOptimized && (
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              <Sparkles size={10} /> {t('digitalemployees.optimizedBadge', 'Optimized {{version}}', { version: versionLabel })}
            </span>
          </div>
        )}
      </div>

      {/* action row */}
      {!selectable && (
        <div className="flex items-center gap-1 mt-auto pt-3">
          {(isDraft || isError) && (
            <button onClick={(e) => { e.stopPropagation(); onDeploy && onDeploy(employee); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium text-white bg-[#117dff] hover:bg-[#0066e0]">
              <Rocket size={11} /> {isError ? t('digitalemployees.retryDeploy', 'Retry') : t('digitalemployees.deploy', 'Deploy')}
            </button>
          )}
          {isDeploying && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] text-blue-700">
              <RefreshCw size={11} className="animate-spin" /> {t('digitalemployees.deploying', 'Deploying')}
            </span>
          )}
          {isRunning && (
            <button onClick={(e) => { e.stopPropagation(); onPause(employee); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium text-amber-700 hover:bg-amber-500/10">
              <Pause size={11} /> {t('digitalemployees.pause', 'Pause')}
            </button>
          )}
          {isPaused && (
            <button onClick={(e) => { e.stopPropagation(); onResume(employee); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium text-[#16a34a] hover:bg-emerald-500/10">
              <Play size={11} /> {t('digitalemployees.resume', 'Resume')}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onArchive(employee); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#dc2626]/50 hover:text-[#dc2626] hover:bg-red-50 ml-auto"
            title={t('digitalemployees.archive', 'Archive')}>
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* full-bleed 2-cell footer (carousel style): meta | model → */}
      <div className="-mx-4 -mb-4 mt-3 grid grid-cols-2 border-t border-[#eae7e1] text-[10px] font-mono text-[#a3a3a3]">
        <div className="flex items-center gap-1.5 truncate border-r border-[#eae7e1] px-4 py-2.5">
          <Activity size={10} /> {msgs} msgs · {tokens} tok
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(employee); }}
          className="flex items-center justify-between px-4 py-2.5 text-[#737373] transition-colors hover:bg-[#faf9f4]"
        >
          <span className="truncate">{(employee.model || '').split('-').slice(0, 2).join('-')}</span>
          <ChevronRight size={12} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}

// WorkspaceToggle removed per UX cleanup. Surface state still tracked
// internally (employee | workspace) — toggled by the topbar Workspace
// button. Re-introduce if multi-surface segmenting comes back.

// PreviewWindow + EmployeeChatPreview removed — superseded by the
// MiroFish-style AgentDetailOverlay (qualifications popup) + ExpertChatDrawer
// (right slide-in chat) defined below.

function WorkspaceSlidePanel({ employees, onClose, initialTaskId, onTaskActivity }) {
  const { t } = useTranslation('dashboard');
  const runningEmployees = useMemo(() => employees.filter(emp => emp.status === 'running'), [employees]);
  const preferredRoster = useMemo(() => {
    const seeded = runningEmployees.filter((emp) => SEEDED_PERSONA_SLUGS.includes(emp.slug));
    return (seeded.length >= 2 ? seeded : runningEmployees).slice(0, 4);
  }, [runningEmployees]);

  // ── Phase 1: Agent Picker ──────────────────────────────────
  const [phase, setPhase] = useState('picker'); // 'picker' | 'chat'
  const [selectedSlugs, setSelectedSlugs] = useState(() => preferredRoster.slice(0, 2).map(emp => emp.slug));
  const [brief, setBrief] = useState('');

  // ── Phase 2: WhatsApp Chat ─────────────────────────────────
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [thinkingMessage, setThinkingMessage] = useState(null);
  const [pendingDelivery, setPendingDelivery] = useState(null);
  const messagesEndRef = useRef(null);
  const deliveredIdsRef = useRef(new Set());
  const queueRef = useRef([]);
  const deliveryTimerRef = useRef(null);

  useEffect(() => {
    if (!initialTaskId) return;
    setPhase('chat');
    setTaskId(initialTaskId);
  }, [initialTaskId]);

  useEffect(() => {
    setSelectedSlugs((prev) => {
      const available = new Set(runningEmployees.map((emp) => emp.slug));
      const kept = prev.filter((slug) => available.has(slug));
      if (kept.length >= 2) return kept;
      const fallback = preferredRoster.slice(0, 2).map((emp) => emp.slug);
      return fallback.length >= 2 ? fallback : kept;
    });
  }, [preferredRoster, runningEmployees]);

  // Poll transcript when task is running
  useEffect(() => {
    if (!taskId) return;
    let active = true;
    const poll = async () => {
      try {
        const [statusData, transcriptData] = await Promise.all([
          apiClient.getTeamTask(taskId),
          apiClient.getTeamTaskTranscript(taskId, { limit: 200 }),
        ]);
        if (!active) return;
        setTaskStatus(statusData);
        setMessages(transcriptData.messages || []);
        onTaskActivity?.();
        if (statusData.status === 'running') {
          window.setTimeout(poll, 2500);
        }
      } catch (e) {
        if (active) {
          setTaskStatus({ status: 'failed', error: e.response?.data?.error || e.message });
        }
      }
    };
    poll();
    return () => { active = false; };
  }, [onTaskActivity, taskId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages, pendingDelivery]);

  useEffect(() => {
    const pending = (messages || []).filter((msg) => !deliveredIdsRef.current.has(msg.msg_id));
    if (!pending.length) return undefined;
    queueRef.current = [...queueRef.current, ...pending];

    const pump = () => {
      if (deliveryTimerRef.current || queueRef.current.length === 0) return;
      const nextMessage = queueRef.current.shift();
      if (!nextMessage) return;
      const senderName = nextMessage.sender_name || 'TeamRoom';
      const senderRole = nextMessage.sender_role || 'generalist';
      const alignRight = senderRole === 'coordinator' || senderRole === 'synthesizer';
      const metadata = normalizeMetadata(nextMessage.metadata);

      if (nextMessage.kind === 'action' && metadata.action_label === 'react') {
        deliveredIdsRef.current.add(nextMessage.msg_id);
        setDisplayedMessages((prev) => [...prev, nextMessage]);
        pump();
        return;
      }

      const mode = deliveryModeForMessage(nextMessage);
      setPendingDelivery({
        senderName,
        senderBadge: nameBadgeCopy(senderName),
        alignRight,
        mode,
      });

      const delay = nextMessage.kind === 'system' ? 220 : mode === 'thinking' ? 900 : 650;
      deliveryTimerRef.current = window.setTimeout(() => {
        deliveredIdsRef.current.add(nextMessage.msg_id);
        setDisplayedMessages((prev) => [...prev, nextMessage]);
        setPendingDelivery(null);
        deliveryTimerRef.current = null;
        pump();
      }, delay);
    };

    pump();

    return () => undefined;
  }, [messages]);

  const toggleSlug = (slug) => {
    setSelectedSlugs(prev => prev.includes(slug) ? prev.filter(item => item !== slug) : [...prev, slug]);
  };

  const runTask = async () => {
    const nextBrief = brief.trim();
    if (!nextBrief || selectedSlugs.length < 2 || loading) return;
    setLoading(true);
    setTaskStatus(null);
    setMessages([]);
    setDisplayedMessages([]);
    setPendingDelivery(null);
    deliveredIdsRef.current = new Set();
    queueRef.current = [];
    if (deliveryTimerRef.current) {
      window.clearTimeout(deliveryTimerRef.current);
      deliveryTimerRef.current = null;
    }
    try {
      const data = await apiClient.createTeamTask({
        brief: nextBrief,
        roster_slugs: selectedSlugs,
        max_rounds: 2,
      });
      setTaskId(data.task_id);
      setTaskStatus({ status: data.status, roster: data.roster });
      setPhase('chat');
      onTaskActivity?.();
    } catch (e) {
      setTaskStatus({ status: 'failed', error: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployees = useMemo(
    () => runningEmployees.filter(emp => selectedSlugs.includes(emp.slug)),
    [runningEmployees, selectedSlugs],
  );

  const reactionMap = useMemo(() => {
    const map = new Map();
    displayedMessages.forEach((msg) => {
      if (msg.kind !== 'action') return;
      const metadata = normalizeMetadata(msg.metadata);
      if (metadata.action_label !== 'react' || !metadata.target_message_id) return;
      const bucket = map.get(metadata.target_message_id) || [];
      bucket.push({
        emoji: formatReactionEmoji(metadata.emoji),
        sender: msg.sender_name,
      });
      map.set(metadata.target_message_id, bucket);
    });
    return map;
  }, [displayedMessages]);

  useEffect(() => () => {
    if (deliveryTimerRef.current) {
      window.clearTimeout(deliveryTimerRef.current);
    }
  }, []);

  const isRunning = taskStatus?.status === 'running';
  const isCompleted = taskStatus?.status === 'completed';

  // ── Render: Agent Picker Phase ─────────────────────────────
  if (phase === 'picker') {
    return (
      <div className="fixed inset-y-0 right-0 z-[120] w-[min(50vw,720px)] min-w-[420px] bg-white border-l border-[#e3e0db] shadow-[-16px_0_48px_rgba(15,23,42,0.08)] flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eae7e1] bg-[#faf9f4]">
          <div>
            <p className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('digitalemployees.newWorkspaceRun', 'New Workspace Run')}</p>
            <p className="text-[11px] text-[#737373]">{t('digitalemployees.selectAgentsDesc', 'Select agents and describe the task')}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[#525252] hover:bg-[#e3e0db]/60">
            <X size={16} />
          </button>
        </div>

        {/* Agent Selection */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-3">
              {t('digitalemployees.selectAgents', 'Select Agents')} <span className="text-[#117dff]">({t('digitalemployees.selectedCount', '{{count}} selected', { count: selectedSlugs.length })})</span>
            </p>
            <div className="space-y-2">
              {runningEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => toggleSlug(emp.slug)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    selectedSlugs.includes(emp.slug)
                      ? 'border-[#117dff] ring-2 ring-[#117dff]/20 bg-[#f5f9ff]'
                      : 'border-[#e3e0db] bg-white hover:border-[#d4d0ca]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedSlugs.includes(emp.slug) ? 'bg-[#117dff]' : 'bg-[#117dff]/10'
                    }`}>
                      <Bot size={13} className={selectedSlugs.includes(emp.slug) ? 'text-white' : 'text-[#117dff]'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[#0a0a0a] truncate">{emp.name}</p>
                      <p className="text-[10px] text-[#a3a3a3]">{emp.role_archetype || 'generalist'}</p>
                    </div>
                    {selectedSlugs.includes(emp.slug) && (
                      <span className="rounded-full bg-[#117dff] px-2 py-1 text-[10px] font-semibold text-white">{t('digitalemployees.selected', 'selected')}</span>
                    )}
                  </div>
                  {SEEDED_PERSONA_SLUGS.includes(emp.slug) && (
                    <span className="inline-block mt-1 rounded-full bg-[#f0eadc] px-2 py-0.5 text-[9px] text-[#8a6b2f]">human</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Task Brief */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-2">{t('digitalemployees.taskBrief', 'Task Brief')}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {TASK_TEMPLATES.map((template, i) => (
                <button
                  key={i}
                  onClick={() => setBrief(template)}
                  className="rounded-full border border-[#e3e0db] bg-white px-2.5 py-1 text-left text-[10px] text-[#525252] hover:border-[#117dff] hover:text-[#117dff]"
                >
                  {template.slice(0, 70)}...
                </button>
              ))}
            </div>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              placeholder={t('digitalemployees.briefPlaceholder', 'Describe what the team should investigate, debate, and decide...')}
              className="w-full resize-none rounded-xl border border-[#e3e0db] bg-[#faf9f4] px-3 py-2.5 text-[12px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#eae7e1] px-5 py-4 bg-[#faf9f4]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#a3a3a3]">
              {selectedSlugs.length < 2 ? t('digitalemployees.selectAtLeast2', 'Select at least 2 agents') : t('digitalemployees.agentsReady', '{{count}} agents ready', { count: selectedSlugs.length })}
            </p>
            {selectedSlugs.length >= 2 && (
              <p className="text-[10px] text-[#737373]">
                {selectedEmployees.map(e => e.name).join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={runTask}
            disabled={loading || selectedSlugs.length < 2 || !brief.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#117dff] px-4 py-3 text-[13px] font-semibold text-white hover:bg-[#0066e0] disabled:opacity-50 transition-all"
          >
            {loading ? (
              <><RefreshCw size={14} className="animate-spin" /> {t('digitalemployees.starting', 'Starting...')}</>
            ) : (
              <><Zap size={14} /> {t('digitalemployees.runTask', 'Run Task')}</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Themed Group Chat Phase ───────────────────────
  const groupName = selectedEmployees.map(e => e.name).join(', ');
  const headerTitle = groupName || taskStatus?.brief || 'Workspace session';

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-[120] w-[min(50vw,720px)] min-w-[420px] bg-[#fbfaf7] shadow-[-16px_0_48px_rgba(15,23,42,0.08)] flex flex-col animate-slideInRight border-l border-[#e3e0db]">
      <div className="flex items-center gap-3 px-5 py-4 bg-white/92 border-b border-[#e7e2d8] backdrop-blur-sm">
        <button onClick={() => setPhase('picker')} className="rounded-lg p-1.5 text-[#54656f] hover:bg-[#e2e2e2]">
          <ArrowRight size={18} className="rotate-180" />
        </button>
        <div className="flex flex-wrap gap-1.5 max-w-[220px]">
          {selectedEmployees.slice(0, 3).map((emp) => (
            <span key={emp.id} className="inline-flex items-center rounded-[10px] bg-[#eaf2ff] px-2.5 py-1 text-[10px] font-semibold text-[#117dff] border border-[#cfe0ff]">
              {emp.name}
            </span>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#111b21] truncate font-['Space_Grotesk']">{headerTitle}</p>
          <p className="text-[11px] text-[#667781]">
            {isRunning ? t('digitalemployees.agentsCollaborating', '{{count}} agents collaborating...', { count: selectedSlugs.length }) : isCompleted ? t('digitalemployees.taskCompleted', 'Task completed') : taskStatus?.status || t('digitalemployees.preparing', 'preparing...')}
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-[#525252] hover:bg-[#f3f1ec]">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[radial-gradient(circle_at_top,_rgba(17,125,255,0.07),_transparent_35%),linear-gradient(180deg,_#fbfaf7_0%,_#f5f2ea_100%)]">
        {taskStatus?.error && (
          <div className="rounded-xl bg-[#fce4e4] px-4 py-3 text-[12px] text-[#dc2626] text-center">{taskStatus.error}</div>
        )}

        {displayedMessages.length === 0 && !pendingDelivery && !isRunning && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[#117dff]/10 mx-auto mb-3 flex items-center justify-center">
                <MessageCircle size={28} className="text-[#117dff]" />
              </div>
              <p className="text-[13px] text-[#667781]">{t('digitalemployees.taskStarting', 'Task is starting. Messages will appear here as the team works through it.')}</p>
            </div>
          </div>
        )}

        {displayedMessages.map((msg) => {
          const isAction = msg.kind === 'action';
          const isSystem = msg.kind === 'system';
          const senderName = msg.sender_name || 'TeamRoom';
          const senderRole = msg.sender_role || 'generalist';
          const senderBadge = nameBadgeCopy(senderName);
          const metadata = normalizeMetadata(msg.metadata);
          const presentation = extractMessagePresentation(msg);
          const bubbleReactions = reactionMap.get(msg.msg_id) || [];
          const alignRight = senderRole === 'coordinator' || senderRole === 'synthesizer';

          if (isSystem) {
            return (
              <div key={msg.msg_id || `${msg.ts}-${msg.sender_name}`} className="flex justify-center">
                <span className="rounded-full border border-[#dbe8ff] bg-white/90 px-3 py-1 text-[10px] text-[#4f5f79] shadow-sm">{msg.content}</span>
              </div>
            );
          }

          if (isAction) {
            if (metadata.action_label === 'react') {
              return null;
            }
            const actionLabel = {
              read_memory: t('digitalemployees.actionReadMemory', 'Checked memory'),
              search_context: t('digitalemployees.actionSearchContext', 'Searched context'),
              read_history: t('digitalemployees.actionReadHistory', 'Read transcript'),
              post_update: t('digitalemployees.actionPostUpdate', 'Shared update'),
              write_memory: t('digitalemployees.actionWriteMemory', 'Saved memory'),
            }[metadata.action_label] || msg.content;
            return (
              <div key={msg.msg_id || `${msg.ts}-${msg.sender_name}`} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setThinkingMessage({ senderName, label: t('digitalemployees.toolActivity', 'Tool activity'), detail: msg.content })}
                  className="rounded-full border border-[#d6e3ff] bg-white/90 px-3 py-1 text-[10px] text-[#2457a6] italic hover:border-[#117dff]"
                >
                  {senderName} · {actionLabel}
                </button>
              </div>
            );
          }

          return (
            <div key={msg.msg_id || `${msg.ts}-${msg.sender_name}`} className={`flex items-end gap-2 ${alignRight ? 'justify-end' : 'justify-start'}`}>
              {!alignRight && (
                <div className="h-8 min-w-[42px] rounded-[10px] bg-[#eef2f7] border border-[#d8dfe8] flex items-center justify-center flex-shrink-0 px-2 text-[10px] font-semibold text-[#4f5f79] shadow-sm">
                  <span>{senderBadge}</span>
                </div>
              )}
              <div className={`max-w-[78%] ${alignRight ? 'items-end' : 'items-start'} flex flex-col`}>
                <p className={`text-[11px] font-semibold mb-1 ${alignRight ? 'text-[#117dff]' : 'text-[#5b6472]'}`}>{senderName}</p>
                <div className={`rounded-[20px] px-3.5 py-2.5 shadow-sm border ${alignRight ? 'rounded-br-[6px] bg-[#117dff] text-white border-[#117dff]' : 'rounded-bl-[6px] bg-white text-[#1f2937] border-[#e4ddd0]'}`}>
                  <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{presentation.preview}</p>
                  {presentation.thoughtLabel && (
                    <button
                      type="button"
                      onClick={() => setThinkingMessage({ senderName, label: presentation.thoughtLabel, detail: presentation.detail })}
                      className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${alignRight ? 'bg-white/18 text-white hover:bg-white/24' : 'bg-[#f3f1ec] text-[#556070] hover:bg-[#ebe7df]'}`}
                    >
                      <Sparkles size={11} /> {presentation.thoughtLabel}
                    </button>
                  )}
                  <span className={`mt-1 block text-right text-[9px] ${alignRight ? 'text-white/70' : 'text-[#8b95a5]'}`}>
                    {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {bubbleReactions.length > 0 && (
                  <div className={`mt-1 flex flex-wrap gap-1 ${alignRight ? 'justify-end' : 'justify-start'}`}>
                    {bubbleReactions.map((reaction, index) => (
                      <span key={`${reaction.sender}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-[#e4ddd0] bg-white px-2 py-0.5 text-[10px] text-[#525252] shadow-sm">
                        <span>{reaction.emoji}</span>
                        <span className="truncate max-w-[110px]">{reaction.sender}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {alignRight && (
                <div className="h-8 min-w-[42px] rounded-[10px] bg-[#dbe8ff] border border-[#b7d2ff] flex items-center justify-center flex-shrink-0 px-2 text-[10px] font-semibold text-[#117dff] shadow-sm">
                  <span>{senderBadge}</span>
                </div>
              )}
            </div>
          );
        })}

        {pendingDelivery && (
          <div className={`flex items-end gap-2 ${pendingDelivery.alignRight ? 'justify-end' : 'justify-start'}`}>
            {!pendingDelivery.alignRight && (
              <div className="h-8 min-w-[42px] rounded-[10px] bg-[#eef2f7] border border-[#d8dfe8] flex items-center justify-center flex-shrink-0 px-2 text-[10px] font-semibold text-[#4f5f79] shadow-sm">
                <span>{pendingDelivery.senderBadge}</span>
              </div>
            )}
            <div className={`max-w-[72%] ${pendingDelivery.alignRight ? 'items-end' : 'items-start'} flex flex-col`}>
              <p className={`text-[11px] font-semibold mb-1 ${pendingDelivery.alignRight ? 'text-[#117dff]' : 'text-[#5b6472]'}`}>
                {pendingDelivery.senderName}
              </p>
              <div className={`rounded-[20px] px-3.5 py-3 shadow-sm border inline-flex items-center gap-2 ${pendingDelivery.alignRight ? 'rounded-br-[6px] bg-[#117dff] text-white border-[#117dff]' : 'rounded-bl-[6px] bg-white text-[#1f2937] border-[#e4ddd0]'}`}>
                <span className={`text-[11px] ${pendingDelivery.alignRight ? 'text-white/90' : 'text-[#6b7280]'}`}>
                  {pendingDelivery.mode === 'thinking' ? 'thinking' : 'typing'}
                </span>
                <TypingDots tone={pendingDelivery.alignRight ? 'accent' : 'default'} />
              </div>
            </div>
            {pendingDelivery.alignRight && (
              <div className="h-8 min-w-[42px] rounded-[10px] bg-[#dbe8ff] border border-[#b7d2ff] flex items-center justify-center flex-shrink-0 px-2 text-[10px] font-semibold text-[#117dff] shadow-sm">
                <span>{pendingDelivery.senderBadge}</span>
              </div>
            )}
          </div>
        )}

        {isRunning && !pendingDelivery && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#e4ddd0] bg-white/80 px-3 py-2 w-fit shadow-sm">
            <div className="w-7 h-7 rounded-full bg-[#f3f1ec] flex items-center justify-center">
              <span className="text-[10px] text-[#667781]">✨</span>
            </div>
            <span className="text-[11px] text-[#667781] italic">{t('digitalemployees.teamThinking', 'Team is thinking through the next move...')}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {taskStatus?.final_answer && (
        <div className="mx-5 mb-3 rounded-[22px] border border-[#dbe8ff] bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-[#117dff]" />
            <span className="text-[11px] font-semibold text-[#117dff]">{t('digitalemployees.teamDecision', 'Team Decision')}</span>
          </div>
          <p className="text-[12px] leading-relaxed text-[#253041]">{taskStatus.final_answer}</p>
        </div>
      )}

      <div className="flex items-end gap-2 px-5 py-4 bg-white border-t border-[#e7e2d8]">
        <div className="flex-1 rounded-[20px] border border-[#e3e0db] bg-[#faf9f4] px-4 py-2.5">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim() && !isRunning) {
                  // Re-run with new brief
                  setBrief(chatInput.trim());
                  setChatInput('');
                  runTask();
                }
              }
            }}
            rows={1}
            placeholder={isRunning ? t('digitalemployees.teamWorking', 'Team is working...') : isCompleted ? t('digitalemployees.askFollowUp', 'Ask the team a follow-up...') : t('digitalemployees.teamNextTask', 'What should the team work on next?')}
            disabled={isRunning}
            className="w-full resize-none bg-transparent text-[13px] text-[#111b21] outline-none placeholder:text-[#8a8f98] disabled:opacity-50"
          />
        </div>
        <button
          onClick={() => {
            if (chatInput.trim() && !isRunning) {
              setBrief(chatInput.trim());
              setChatInput('');
              runTask();
            }
          }}
          disabled={isRunning || !chatInput.trim()}
          className="rounded-full p-2.5 text-white bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
      </div>

      {thinkingMessage && (
        <div className="fixed inset-0 z-[130] bg-[#111827]/35 backdrop-blur-[2px] flex items-center justify-center px-6" onClick={() => setThinkingMessage(null)}>
          <div className="w-full max-w-2xl rounded-[24px] border border-[#e3e0db] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#ece7de] px-5 py-4">
              <div>
                <p className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{thinkingMessage.senderName}</p>
                <p className="text-[11px] text-[#7a7a7a]">{thinkingMessage.label}</p>
              </div>
              <button onClick={() => setThinkingMessage(null)} className="rounded-lg p-2 text-[#525252] hover:bg-[#f3f1ec]">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[#334155]">{thinkingMessage.detail}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TaskHistoryCard({ task, onResume }) {
  const { t } = useTranslation('dashboard');
  const isActive = task.status === 'running';
  return (
    <button
      type="button"
      onClick={() => onResume(task)}
      className="w-full rounded-[14px] border border-[#e3e0db] bg-white p-4 text-left transition-all hover:border-[#117dff] hover:shadow-[0_12px_32px_rgba(17,125,255,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[#0a0a0a] line-clamp-2">{task.brief}</p>
          <p className="mt-1 text-[11px] text-[#8a8a8a]">
            {formatTaskTime(task.started_at || task.completed_at)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isActive ? 'bg-[#eaf4ff] text-[#117dff]' : 'bg-[#f3f1ec] text-[#6b7280]'}`}>
          {task.status}
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[#5d6674] line-clamp-2">
        {task.final_answer || t('digitalemployees.openSessionHint', 'Open this session to review the transcript and continue the conversation.')}
      </p>
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#117dff]">
        {t('digitalemployees.resumeSession', 'Resume session')} <ChevronRight size={12} />
      </div>
    </button>
  );
}

// Single-step create form. We only ask for what matters: name, role, team,
// short brief, and demographics. The brief is expanded by the server into a
// full persona system-prompt via LLM, so users no longer hand-write prompts.
// Model + max_tokens are NOT exposed — they default to the platform's tuned
// values and can be adjusted from the employee detail view later.
function CreateWizard({ open, onClose, onCreate, teams }) {
  const { t } = useTranslation('dashboard');
  const ROLE_ARCHETYPES = [
    { id: 'generalist',   label: 'Generalist' },
    { id: 'coordinator',  label: 'Coordinator' },
    { id: 'investigator', label: 'Investigator' },
    { id: 'skeptic',      label: 'Skeptic' },
    { id: 'synthesizer',  label: 'Synthesizer' },
    { id: 'advocate',     label: 'Advocate' },
    { id: 'fact_checker', label: 'Fact-checker' },
    { id: 'challenger',   label: 'Challenger' },
  ];

  const [form, setForm] = useState({
    name: '',
    brief: '',
    role_archetype: 'generalist',
    team_id: '',
    age: '',
    gender: '',
    experience_years: 0,
  });
  const [persona, setPersona] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: '', brief: '', role_archetype: 'generalist', team_id: '', age: '', gender: '', experience_years: 0 });
      setPersona('');
      setError(null);
      setSubmitting(false);
      setOptimizing(false);
    }
  }, [open]);

  if (!open) return null;

  async function optimize() {
    setError(null);
    setOptimizing(true);
    try {
      const teamName = teams.find(t => t.id === form.team_id)?.name || '';
      const { persona: p } = await apiClient.optimizeEmployeePersona({
        brief: form.brief.trim(),
        name: form.name.trim(),
        role: form.role_archetype,
        team: teamName,
        age: form.age || null,
        gender: form.gender || null,
        experience_years: Number(form.experience_years) || 0,
      });
      setPersona(p);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setOptimizing(false);
    }
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      // Auto-optimize persona on submit if user didn't preview it.
      let finalPersona = persona;
      if (!finalPersona) {
        const teamName = teams.find(t => t.id === form.team_id)?.name || '';
        const { persona: p } = await apiClient.optimizeEmployeePersona({
          brief: form.brief.trim(),
          name: form.name.trim(),
          role: form.role_archetype,
          team: teamName,
          age: form.age || null,
          gender: form.gender || null,
          experience_years: Number(form.experience_years) || 0,
        });
        finalPersona = p;
      }
      const payload = {
        name: form.name.trim(),
        persona: finalPersona,
        scope: form.team_id ? 'team' : 'personal',
        team_id: form.team_id || null,
        role_archetype: form.role_archetype,
        policy_rules: {
          rate_limit_per_min: 30,
          age: form.age || null,
          gender: form.gender || null,
          experience_years: Number(form.experience_years) || 0,
          persona_contract: buildPersonaContractLike({
            name: form.name.trim(),
            role_archetype: form.role_archetype,
            scope: form.team_id ? 'team' : 'personal',
          }),
        },
      };
      await onCreate(payload);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = form.name.trim() && form.brief.trim() && form.role_archetype && form.team_id;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-[12px] w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-[#eae7e1] flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0a0a0a]">{t('digitalemployees.createTitle', 'Create Digital Employee')}</h2>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">{t('digitalemployees.createSubtitle', 'Describe them in one line — we build the persona.')}</p>
          </div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#525252]"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[11px] text-[#525252] font-medium">{t('digitalemployees.fieldName', 'Name')}</span>
            <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={t('digitalemployees.namePlaceholder', 'e.g. Maya Ortiz')}
              className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] focus:outline-none focus:border-[#117dff]" />
          </label>

          <label className="block">
            <span className="text-[11px] text-[#525252] font-medium">{t('digitalemployees.fieldBrief', 'Brief / what should they do?')}</span>
            <textarea value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })}
              rows={3}
              placeholder={t('digitalemployees.briefLongPlaceholder', 'e.g. Calm operations lead who turns chaos into clear plans and keeps the team honest about owners and blockers.')}
              className="w-full px-3 py-2 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] resize-y focus:outline-none focus:border-[#117dff]" />
            <span className="text-[10px] text-[#a3a3a3]">{t('digitalemployees.briefHint', 'One sentence is enough — we expand this into a full persona.')}</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">{t('digitalemployees.fieldRole', 'Role')}</span>
              <select value={form.role_archetype} onChange={e => setForm({ ...form, role_archetype: e.target.value })}
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                {ROLE_ARCHETYPES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">{t('digitalemployees.fieldTeam', 'Team')}</span>
              <select value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                <option value="">— select team —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">{t('digitalemployees.fieldAge', 'Age')}</span>
              <input type="number" min={18} max={99} value={form.age}
                onChange={e => setForm({ ...form, age: e.target.value })}
                placeholder="32"
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]" />
            </label>
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">{t('digitalemployees.fieldGender', 'Gender')}</span>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                <option value="">—</option>
                <option value="female">{t('digitalemployees.genderFemale', 'Female')}</option>
                <option value="male">{t('digitalemployees.genderMale', 'Male')}</option>
                <option value="non-binary">{t('digitalemployees.genderNonBinary', 'Non-binary')}</option>
                <option value="unspecified">{t('digitalemployees.genderUnspecified', 'Unspecified')}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">{t('digitalemployees.fieldExperience', 'Experience (yrs)')}</span>
              <input type="number" min={0} max={60} value={form.experience_years}
                onChange={e => setForm({ ...form, experience_years: e.target.value })}
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]" />
            </label>
          </div>

          {/* Persona preview block: LLM expansion of the brief. Optional. */}
          <div className="rounded-[8px] border border-[#eae7e1] bg-[#faf9f4] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#737373] font-semibold">
                {t('digitalemployees.generatedPersona', 'Generated persona')}
              </span>
              <button onClick={optimize}
                disabled={!form.brief.trim() || optimizing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-[6px] bg-white border border-[#e3e0db] hover:border-[#117dff] hover:text-[#117dff] disabled:opacity-40">
                {optimizing ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {persona ? t('digitalemployees.regenerate', 'Regenerate') : t('digitalemployees.preview', 'Preview')}
              </button>
            </div>
            {persona ? (
              <p className="mt-2 text-[12px] leading-relaxed text-[#0a0a0a] whitespace-pre-wrap">{persona}</p>
            ) : (
              <p className="mt-2 text-[11px] text-[#a3a3a3] italic">{t('digitalemployees.personaHint', 'Optional. Auto-generated on create if you skip preview.')}</p>
            )}
          </div>


          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-[11px] text-[#dc2626]">
              <AlertCircle size={12} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#eae7e1] flex items-center justify-end gap-2">
          <button onClick={onClose}
            className="px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec] rounded">
            {t('digitalemployees.cancel', 'Cancel')}
          </button>
          <button onClick={submit} disabled={submitting || !canSubmit}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] bg-[#117dff] text-white rounded hover:bg-[#0066e0] disabled:opacity-50">
            {submitting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {t('digitalemployees.create', 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Human-style qualification profiles, derived from role_archetype ──────
// HIVEMIND employees carry persona + role + model + hyper eval state, not a CV.
// Map the role to a recognisable "job profile" (title, lane, skills, evidence
// bias, comm style) so the detail popup reads like a real teammate's resume —
// without fabricating credentials.
const ROLE_PROFILES = {
  coordinator: {
    title: 'Operations Lead', lane: 'Operations', icon: Target,
    specialties: ['Planning', 'Status tracking', 'Coordination'],
    skills: ['Project planning', 'Stakeholder comms', 'Prioritisation', 'Risk surfacing', 'Owner/blocker tracking'],
    evidence: 'process, owners & next steps',
    comm: 'Direct, warm, practical, time-aware.',
  },
  skeptic: {
    title: 'Product Skeptic', lane: 'Critique', icon: Shield,
    specialties: ['Risk analysis', 'Assumption testing'],
    skills: ['Critical analysis', 'User-impact reasoning', 'Evidence demands', "Devil's advocacy", 'Failure-mode hunting'],
    evidence: 'what could break & what signal changes the call',
    comm: 'Polite, opinionated, evidence-driven.',
  },
  investigator: {
    title: 'Research Strategist', lane: 'Research', icon: Brain,
    specialties: ['Source synthesis', 'Pattern finding'],
    skills: ['Memory recall', 'Context linking', 'Evidence synthesis', 'Plain-language framing', 'Prior-decision lookup'],
    evidence: 'prior notes, history & data',
    comm: 'Analytical, reads the room, plain-language.',
  },
  generalist: {
    title: 'Senior Builder', lane: 'Execution', icon: Cpu,
    specialties: ['Systems thinking', 'Shipping'],
    skills: ['Decomposition', 'Tradeoff analysis', 'Systems design', 'Pragmatic execution', 'Bias to ship'],
    evidence: "what's buildable & testable today",
    comm: 'Practical, human, impatient with fluff.',
  },
};

function deriveProfile(employee) {
  const role = String(employee.role_archetype || 'generalist').toLowerCase();
  const base = ROLE_PROFILES[role] || ROLE_PROFILES.generalist;
  const hyper = employee.hyper || {};
  const evalCount = hyper.evaluation_count || 0;
  const threshold = hyper.tuning_threshold || 20;
  let qualPct;
  if (hyper.state === 'optimized') qualPct = 0.95;
  else if (hyper.state === 'ready_for_tuning') qualPct = 0.8;
  else qualPct = Math.min(0.5 + (evalCount / Math.max(threshold, 1)) * 0.3, 0.72);
  return {
    ...base,
    role,
    qualPct,
    qualState: hyper.state === 'optimized' ? 'Optimised' : hyper.state === 'ready_for_tuning' ? 'Ready for tuning' : 'Baseline',
    evalCount,
    threshold,
    versionLabel: employee.active_prompt_version?.version_label || hyper.active_prompt_version?.version_label || 'v0',
    model: (employee.model || '').split('-').slice(0, 3).join('-'),
    tools: employee.tools || [],
    msgs: employee.metricsLast24h?.messages || 0,
    tokens: employee.metricsLast24h?.tokens || 0,
  };
}

function initialsOf(name) {
  return String(name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function qualColor(pct) {
  if (pct > 0.85) return '#16a34a';
  if (pct > 0.65) return '#f59e0b';
  return '#117dff';
}

// ─── Qualifications popup (MiroFish CSI AgentDetailOverlay, HIVEMIND light) ─
function AgentDetailOverlay({ employee, onClose, onChat, onRemint, isAdmin }) {
  const { t } = useTranslation('dashboard');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!employee) return null;
  const p = deriveProfile(employee);
  const RoleIcon = p.icon || Bot;
  const firstName = (employee.name || '').split(' ')[0];
  const hyper = employee.hyper || {};
  const apv = employee.active_prompt_version || hyper.active_prompt_version || {};
  const tuneMetrics = apv.metrics || {};
  const showTuning = hyper.state === 'optimized';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0a0a0a]/30 backdrop-blur-md p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[480px] max-h-[86vh] overflow-y-auto rounded-3xl border border-[#e3e0db] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <button onClick={onClose} className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f1ec] text-[#737373] hover:bg-[#e3e0db] hover:text-[#0a0a0a]">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center px-8 pt-9 pb-5 border-b border-[#eae7e1]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#117dff]/10 border border-[#117dff]/20 mb-3">
            <span className="text-[24px] font-bold text-[#117dff] font-mono">{initialsOf(employee.name)}</span>
          </div>
          <h2 className="text-[20px] font-semibold text-[#0a0a0a]">{employee.name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#117dff]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#117dff]">
              <RoleIcon size={11} /> {p.title}
            </span>
            <span className="text-[11px] text-[#a3a3a3] font-mono">{p.lane} lane</span>
          </div>
          {/* Qualification bar */}
          <div className="mt-4 w-[180px]">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ece8e1]">
              <div className="h-full rounded-full transition-all" style={{ width: `${(p.qualPct * 100).toFixed(0)}%`, background: qualColor(p.qualPct) }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-mono text-[#a3a3a3]">
              <span>{(p.qualPct * 100).toFixed(0)}% qualified</span>
              <span>{p.qualState}</span>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 space-y-5">
          {/* Specialties */}
          <Section label={t('digitalemployees.specialties', 'Specialties')}>
            <div className="flex flex-wrap gap-1.5">
              {p.specialties.map(s => <Chip key={s} tone="solid">{s}</Chip>)}
            </div>
          </Section>

          {/* Skills */}
          <Section label={t('digitalemployees.skills', 'Skills')}>
            <div className="flex flex-wrap gap-1.5">
              {p.skills.map(s => <Chip key={s}>{s}</Chip>)}
            </div>
          </Section>

          {/* Communication style */}
          <Section label={t('digitalemployees.commStyle', 'Communication style')}>
            <p className="text-[13px] text-[#525252] leading-relaxed">{p.comm}</p>
          </Section>

          {/* Evidence priority */}
          <Section label={t('digitalemployees.evidencePriority', 'Evidence priority')}>
            <p className="text-[13px] text-[#525252] leading-relaxed flex items-start gap-1.5">
              <Quote size={13} className="mt-0.5 flex-shrink-0 text-[#a3a3a3]" /> {p.evidence}
            </p>
          </Section>

          {/* Persona / bio */}
          {employee.persona && (
            <Section label={t('digitalemployees.persona', 'Persona')}>
              <p className="text-[13px] text-[#525252] leading-relaxed">{employee.persona}</p>
            </Section>
          )}

          {/* Tuning — only once the agent has been optimized */}
          {showTuning && (
            <Section label={t('digitalemployees.tuning', 'Tuning')}>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { key: 'baseline', label: t('digitalemployees.tuneBaseline', 'Baseline'), value: tuneMetrics.baseline },
                  { key: 'variant', label: t('digitalemployees.tuneVariant', 'Variant'), value: tuneMetrics.variant },
                  { key: 'delta', label: t('digitalemployees.tuneDelta', 'Delta'), value: tuneMetrics.delta },
                ].map(({ key, label, value }) => (
                  <div key={key} className="rounded-[8px] border border-[#eae7e1] bg-[#fbfaf7] px-2.5 py-2 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#a3a3a3]">{label}</p>
                    <p className={`mt-1 text-[14px] font-semibold ${key === 'delta' && Number(value) > 0 ? 'text-emerald-600' : 'text-[#0a0a0a]'}`}>
                      {typeof value === 'number' ? (key === 'delta' && value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2)) : '—'}
                    </p>
                  </div>
                ))}
              </div>
              {apv.initial_prompt && (
                <details className="mb-2 rounded-[8px] border border-[#eae7e1] bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-[#525252] hover:bg-[#faf9f4]">
                    {t('digitalemployees.tuneInitialPrompt', 'Initial prompt')}
                  </summary>
                  <p className="border-t border-[#eae7e1] px-3 py-2 text-[12px] leading-relaxed text-[#525252] whitespace-pre-wrap">{apv.initial_prompt}</p>
                </details>
              )}
              {apv.optimized_prompt && (
                <details className="rounded-[8px] border border-emerald-200 bg-emerald-50/40">
                  <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
                    {t('digitalemployees.tuneOptimizedPrompt', 'Optimized prompt')}
                  </summary>
                  <p className="border-t border-emerald-200 px-3 py-2 text-[12px] leading-relaxed text-[#525252] whitespace-pre-wrap">{apv.optimized_prompt}</p>
                </details>
              )}
            </Section>
          )}

          {/* Tools */}
          {p.tools.length > 0 && (
            <Section label={t('digitalemployees.tools', 'Tools')}>
              <div className="flex flex-wrap gap-1.5">
                {p.tools.map(tool => <Chip key={tool} tone="action">{tool}</Chip>)}
              </div>
            </Section>
          )}

          {/* Footer stats */}
          <div className="flex items-center gap-3 pt-1 text-[10px] text-[#a3a3a3] font-mono">
            <span className="flex items-center gap-1"><GraduationCap size={11} /> {p.versionLabel} prompt</span>
            <span>·</span>
            <span>{p.evalCount}/{p.threshold} evals</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Cpu size={11} /> {p.model}</span>
          </div>
        </div>

        {/* Talk CTA */}
        <div className="sticky bottom-0 border-t border-[#eae7e1] bg-white/95 backdrop-blur px-8 py-4 flex gap-2">
          <button
            onClick={() => onChat(employee)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#117dff] py-2.5 text-[13px] font-medium text-white hover:bg-[#0066e0]"
          >
            <MessageCircle size={15} /> {t('digitalemployees.talkTo', 'Talk to {{name}}', { name: firstName })}
          </button>
          {isAdmin && onRemint && (
            <button
              onClick={() => onRemint(employee)}
              title={t('digitalemployees.remintKey', 'Re-mint HIVEMIND key')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#e3e0db] px-3 py-2.5 text-[12px] font-medium text-[#525252] hover:bg-[#f3f1ec]"
            >
              <KeyRound size={14} /> {t('digitalemployees.remintKeyShort', 'Re-mint key')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a3a3a3] mb-2">{label}</span>
      {children}
    </div>
  );
}

function Chip({ children, tone }) {
  const cls = tone === 'solid'
    ? 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20'
    : tone === 'action'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]';
  return <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

// Compact markdown → React (no new dep, no dangerouslySetInnerHTML).
// Handles fenced code, headings, bullets, and inline bold/italic/code/links.
function renderInline(s, k0) {
  const parts = []; let rem = String(s); let k = k0;
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/;
  let m;
  while ((m = rem.match(re))) {
    if (m.index > 0) parts.push(rem.slice(0, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) parts.push(<code key={k++} className="rounded bg-black/5 px-1 py-0.5 font-mono text-[12px]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('[')) { const lm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/); if (lm && /^https?:/i.test(lm[2])) parts.push(<a key={k++} href={lm[2]} target="_blank" rel="noreferrer" className="text-[#117dff] underline">{lm[1]}</a>); else parts.push(<span key={k++}>{tok}</span>); }
    else parts.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    rem = rem.slice(m.index + tok.length);
  }
  if (rem) parts.push(rem);
  return parts;
}
function renderMarkdownLite(text) {
  const lines = String(text || '').split('\n');
  const out = []; let list = null; let code = null; let k = 0;
  const flushList = () => { if (list) { out.push(<ul key={`u${k++}`} className="list-disc pl-5 my-1 space-y-0.5">{list}</ul>); list = null; } };
  for (const ln of lines) {
    if (ln.trim().startsWith('```')) {
      if (code === null) { flushList(); code = []; }
      else { out.push(<pre key={`c${k++}`} className="my-1.5 overflow-x-auto rounded-lg bg-[#0a0a0a]/90 p-2.5 text-[11.5px] text-[#e6edf3] font-mono whitespace-pre">{code.join('\n')}</pre>); code = null; }
      continue;
    }
    if (code !== null) { code.push(ln); continue; }
    const h = ln.match(/^(#{1,3})\s+(.*)/);
    const b = ln.match(/^\s*[-*]\s+(.*)/);
    if (b) { (list = list || []).push(<li key={`l${k++}`}>{renderInline(b[1], k += 100)}</li>); continue; }
    flushList();
    if (h) { out.push(<div key={`h${k++}`} className="font-semibold mt-1.5 mb-0.5">{renderInline(h[2], k += 100)}</div>); continue; }
    if (ln.trim() === '') { out.push(<div key={`s${k++}`} className="h-1.5" />); continue; }
    out.push(<p key={`p${k++}`} className="my-0.5">{renderInline(ln, k += 100)}</p>);
  }
  flushList();
  if (code !== null && code.length) out.push(<pre key={`c${k++}`} className="my-1.5 overflow-x-auto rounded-lg bg-[#0a0a0a]/90 p-2.5 text-[11.5px] text-[#e6edf3] font-mono whitespace-pre">{code.join('\n')}</pre>);
  return out;
}

// ─── Talk-to-Expert chat drawer (MiroFish ExpertChatPanel, HIVEMIND light) ─
function ExpertChatDrawer({ employee, onClose }) {
  const { t } = useTranslation('dashboard');
  const p = deriveProfile(employee);
  const firstName = (employee.name || '').split(' ')[0];
  // Stable per-employee conversation id (NOT Date.now) so the sidecar keeps
  // memory across turns + sessions; persisted in localStorage.
  const convId = useMemo(() => `emp-dm:${employee.slug || employee.id}`, [employee.slug, employee.id]);
  const storageKey = `hm-empchat:${employee.id}`;
  const conversationId = useRef(convId);
  const intro = useMemo(() => ({
    id: 'intro', role: 'assistant',
    content: t('digitalemployees.chatIntro',
      "Hi, I'm {{name}} — your {{title}}. I work the {{lane}} lane. Ask me anything from my point of view.",
      { name: employee.name, title: p.title, lane: p.lane }),
  }), [employee.name, p.title, p.lane, t]);
  const [messages, setMessages] = useState(() => {
    try { const raw = localStorage.getItem(storageKey); const arr = raw ? JSON.parse(raw) : null; return Array.isArray(arr) && arr.length ? arr : [intro]; }
    catch { return [intro]; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);

  // Persist transcript so reopening the drawer resumes the conversation.
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50))); } catch { /* quota — ignore */ }
  }, [messages, storageKey]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, loading]);

  const clearHistory = () => {
    if (!window.confirm(t('digitalemployees.clearChat', 'Clear this conversation?'))) return;
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    conversationId.current = convId;
    setMessages([intro]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages(prev => [...prev, { id: `${prev.length}-u`, role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const data = await apiClient.chatWithEmployee(employee.slug, { text, conversation_id: conversationId.current });
      if (data.conversation_id) conversationId.current = data.conversation_id;
      setMessages(prev => [...prev, { id: `${prev.length}-a`, role: 'assistant', content: data.reply || 'No response.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: `${prev.length}-e`, role: 'assistant', error: true, content: e.response?.data?.detail || e.response?.data?.error || e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-[#0a0a0a]/20 backdrop-blur-[2px]" />
      <div className="absolute right-0 top-0 bottom-0 flex w-full max-w-[480px] flex-col bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.12)] animate-[slideIn_0.28s_ease]">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-[#eae7e1] bg-[#faf9f4] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#117dff]/10 border border-[#117dff]/20 flex-shrink-0">
            <span className="text-[13px] font-bold text-[#117dff] font-mono">{initialsOf(employee.name)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-[#0a0a0a] truncate">{employee.name}</div>
            <div className="text-[11px] text-[#737373] truncate">{p.title} · {p.lane} · {p.versionLabel}</div>
          </div>
          <button onClick={clearHistory} title={t('digitalemployees.clearChat', 'Clear this conversation?')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#737373] hover:bg-[#e3e0db]/60">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#737373] hover:bg-[#e3e0db]/60">
            <X size={16} />
          </button>
        </header>

        {/* Log */}
        <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#117dff]/10 text-[10px] font-bold text-[#117dff] font-mono">
                  {initialsOf(employee.name)}
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                msg.role === 'user' ? 'bg-[#117dff] text-white whitespace-pre-wrap' : msg.error ? 'border border-red-200 bg-red-50 text-[#dc2626] whitespace-pre-wrap' : 'bg-[#f3f1ec] text-[#0a0a0a]'
              }`}>
                {msg.role === 'assistant' && !msg.error ? renderMarkdownLite(msg.content) : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#117dff]/10 text-[10px] font-bold text-[#117dff] font-mono">{initialsOf(employee.name)}</div>
              <div className="rounded-2xl bg-[#f3f1ec] px-4 py-3"><TypingDots /></div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-[#eae7e1] bg-[#faf9f4] px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t('digitalemployees.askPlaceholder', 'Ask {{name}} a question…', { name: firstName })}
            disabled={loading}
            className="flex-1 rounded-full border border-[#d1d5db] bg-white px-4 py-2 text-[13px] outline-none focus:border-[#117dff]"
          />
          <button onClick={send} disabled={loading || !input.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#117dff] text-white hover:bg-[#0066e0] disabled:opacity-50">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Per-field accent (day mode): each field gets its own identity — the bar's left edge + the
// profession card's header block. Day-mode tints, HIVEMIND blue as the neutral fallback.
const FIELD_TINT = {
  Marketing: { from: '#f59e0b', to: '#d97706' },
  Fintech: { from: '#10b981', to: '#059669' },
  Legal: { from: '#6366f1', to: '#4f46e5' },
  Product: { from: '#8b5cf6', to: '#7c3aed' },
  Operations: { from: '#0ea5e9', to: '#0369a1' },
};
const tintFor = (field) => FIELD_TINT[field] || { from: '#117dff', to: '#0a5fd0' };

function AgentMarketplaceModal({ open, onClose, onHireProfession, hiringProf, isAdmin }) {
  const { t } = useTranslation('dashboard');
  const [selField, setSelField] = useState(null);
  const [rankByField, setRankByField] = useState({});   // field → { ranked:[{title,why_fits}], org_grounded }
  const [rankingField, setRankingField] = useState(null);
  const [naming, setNaming] = useState(null);   // { prof, field } → open the name-entry popup
  const [nameDraft, setNameDraft] = useState('');
  const [infoProf, setInfoProf] = useState(null);   // { prof, field, why } → open the details popup
  useEffect(() => {
    if (!open || !selField || rankByField[selField]) return;
    let cancelled = false;
    setRankingField(selField);
    apiClient
      .rankProfessions(selField, professionsForField(selField).map((p) => ({ title: p.title, blurb: p.blurb })))
      .then((res) => { if (!cancelled) setRankByField((m) => ({ ...m, [selField]: res || { ranked: [] } })); })
      .catch(() => { if (!cancelled) setRankByField((m) => ({ ...m, [selField]: { ranked: [] } })); })
      .finally(() => { if (!cancelled) setRankingField(null); });
    return () => { cancelled = true; };
  }, [open, selField, rankByField]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1917]/35 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[1040px] max-h-[88vh] overflow-hidden rounded-[20px] border border-[#e3e0db] bg-[#faf9f4] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.32)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-[#e3e0db] bg-white px-6 py-5">
          {selField && (
            <button
              type="button"
              onClick={() => setSelField(null)}
              aria-label={t('digitalemployees.back', 'Back to fields')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e3e0db] pb-0.5 text-[20px] leading-none text-[#525252] transition-colors hover:border-[#117dff]/40 hover:text-[#117dff]"
            >
              ‹
            </button>
          )}
          <div className="min-w-0">
            <h2 className="font-['Space_Grotesk'] text-[22px] font-bold leading-none tracking-tight text-[#0a0a0a]">
              <span className="text-[#117dff]">@</span>Marketplace
              {selField && <span className="font-medium text-[#a3a3a3]">{'  ·  '}{selField}</span>}
            </h2>
            <p className="mt-1.5 text-[12px] text-[#737373]">
              {selField
                ? t('digitalemployees.fieldSub', 'Hire the closest specialist — named and tuned to your org.')
                : t('digitalemployees.fieldsSub', 'Pick a field. Hire a real specialist for your team.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#a3a3a3] transition-colors hover:bg-[#faf9f4] hover:text-[#0a0a0a]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        {/* Blueprint: @Marketplace heading → long horizontal field bars → click → profession cards. */}
        <div className="max-h-[calc(88vh-96px)] overflow-y-auto px-6 py-5">
          {!selField ? (
            <div className="space-y-2.5">
              {FIELDS.map((f) => {
                const c = tintFor(f.field);
                return (
                  <button
                    key={f.field}
                    type="button"
                    onClick={() => setSelField(f.field)}
                    style={{ borderLeftColor: c.from }}
                    className="group flex w-full items-center gap-4 rounded-xl border border-[#e3e0db] border-l-[5px] bg-white px-5 py-4 text-left transition-all hover:-translate-y-px hover:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.28)]"
                  >
                    <span className="text-[24px] leading-none">{f.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-['Space_Grotesk'] text-[17px] font-semibold leading-tight text-[#0a0a0a]">{f.field}</div>
                      <div className="mt-0.5 text-[11.5px] text-[#737373]">{f.blurb}</div>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[#a3a3a3]">{t('digitalemployees.roleCount', '{{n}} roles', { n: f.count })}</span>
                    <span className="shrink-0 text-[20px] leading-none text-[#cbd5e1] transition-all group-hover:translate-x-0.5 group-hover:text-[#117dff]">›</span>
                  </button>
                );
              })}
            </div>
          ) : (() => {
            const rank = rankByField[selField];
            const whyMap = {};
            (rank?.ranked || []).forEach((x) => { if (x?.title) whyMap[x.title] = x.why_fits; });
            const base = professionsForField(selField);
            const ordered = (rank?.ranked?.length)
              ? rank.ranked.map((x) => base.find((p) => p.title === x.title)).filter(Boolean)
              : base;
            const c = tintFor(selField);
            return (
              <>
                <div className="mb-3 flex h-4 items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
                  {rankingField === selField
                    ? <span className="flex items-center gap-1.5 text-[#a3a3a3]"><RefreshCw size={10} className="animate-spin" />{t('digitalemployees.ranking', 'ranking for your org…')}</span>
                    : rank?.org_grounded
                      ? <span className="text-[#117dff]">{t('digitalemployees.rankedForOrg', '✨ closest to your business first')}</span>
                      : <span className="text-[#a3a3a3]">{t('digitalemployees.pickRole', 'pick a role to hire')}</span>}
                </div>
                <div className="flex snap-x gap-3 overflow-x-auto pb-3">
                  {ordered.map((prof) => {
                    const busy = hiringProf === prof.title;
                    const why = whyMap[prof.title];
                    return (
                      <article key={prof.title} className="flex w-[270px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[#e3e0db] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                        <div className="flex h-[116px] items-end p-4" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
                          <h3 className="font-['Space_Grotesk'] text-[18px] font-bold leading-[1.1] text-white">{prof.title}</h3>
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <span className="self-start rounded-full border border-[#e3e0db] bg-[#faf9f4] px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[#737373]">{prof.role_archetype}</span>
                          <p className="mt-2 text-[11.5px] leading-relaxed text-[#525252]">{prof.blurb}</p>
                          {why && <p className="mt-1.5 text-[10.5px] italic leading-snug text-[#117dff]">→ {why}</p>}
                          <div className="flex-1" />
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!isAdmin || busy}
                              onClick={() => { setNameDraft(''); setNaming({ prof, field: selField }); }}
                              title={!isAdmin ? t('digitalemployees.adminOnlyInstall', 'Only org admins can install agents.') : undefined}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#0a0a0a] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#117dff] disabled:bg-[#cbd5e1]"
                            >
                              {busy ? <><RefreshCw size={13} className="animate-spin" />{t('digitalemployees.hiring', 'Hiring…')}</> : <>{t('digitalemployees.hireProfession', 'Hire')} ›</>}
                            </button>
                            <button
                              type="button"
                              onClick={() => setInfoProf({ prof, field: selField, why })}
                              title={t('digitalemployees.viewDetails', 'View details')}
                              aria-label={t('digitalemployees.viewDetails', 'View details')}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#e3e0db] text-[#525252] transition-colors hover:border-[#117dff]/50 hover:text-[#117dff]"
                            >
                              <Info size={15} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </div>
      {naming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={(e) => { e.stopPropagation(); setNaming(null); }}>
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-[#e3e0db] bg-[#faf9f4] px-4 py-3">
              <span className="text-[14px]">🪪</span>
              <span className="text-[13px] font-semibold text-[#0a0a0a]">{t('digitalemployees.nameTitle', 'Name your {{role}}', { role: naming.prof.title })}</span>
              <button type="button" onClick={() => setNaming(null)} className="ml-auto text-[#a3a3a3] transition-colors hover:text-[#0a0a0a]"><X size={16} /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-[11px] leading-snug text-[#737373]">{t('digitalemployees.nameBlurb', 'Pick a name (tap a suggestion) or type your own. The persona is tuned to your org either way.')}</p>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && nameDraft.trim()) { onHireProfession(naming.prof, naming.field, nameDraft.trim()); setNaming(null); } }}
                placeholder={t('digitalemployees.namePlaceholder', 'Give them a name…')}
                className="w-full rounded-lg border border-[#e3e0db] px-3 py-2 text-[13px] outline-none focus:border-[#117dff] focus:ring-2 focus:ring-[#117dff]/15"
              />
              <div className="flex flex-wrap gap-1.5">
                {[naming.prof.title, ...NAME_SUGGESTIONS].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNameDraft(n)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${nameDraft === n ? 'border-[#117dff] bg-[#117dff]/10 text-[#117dff]' : 'border-[#e3e0db] bg-[#faf9f4] text-[#404040] hover:border-[#117dff]/50 hover:text-[#117dff]'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!nameDraft.trim()}
                onClick={() => { onHireProfession(naming.prof, naming.field, nameDraft.trim()); setNaming(null); }}
                className="w-full rounded-lg bg-[#117dff] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#0066e0] disabled:bg-[#cbd5e1]"
              >
                {t('digitalemployees.nameProceed', 'Hire {{name}}', { name: nameDraft.trim() || naming.prof.title })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent detail popup — opened by the Info button beside Hire */}
      {infoProf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={(e) => { e.stopPropagation(); setInfoProf(null); }}>
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* gradient header */}
            <div className="relative flex h-[120px] items-end p-5" style={{ background: `linear-gradient(135deg, ${tintFor(infoProf.field).from}, ${tintFor(infoProf.field).to})` }}>
              <button type="button" onClick={() => setInfoProf(null)} className="absolute right-3 top-3 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"><X size={16} /></button>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/70">{infoProf.field}</p>
                <h3 className="font-['Space_Grotesk'] mt-1 text-2xl font-bold leading-tight text-white">{infoProf.prof.title}</h3>
              </div>
            </div>
            {/* body */}
            <div className="space-y-4 px-5 py-5">
              <span className="inline-block rounded border border-[#e3e0db] bg-[#faf9f4] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#737373]">{infoProf.prof.role_archetype}</span>
              <p className="text-[14px] font-medium text-[#0a0a0a]">{infoProf.prof.blurb}</p>
              {infoProf.prof.brief && (
                <div>
                  <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('digitalemployees.whatTheyDo', 'What they do')}</p>
                  <p className="text-[13px] leading-relaxed text-[#525252]">{infoProf.prof.brief}</p>
                </div>
              )}
              {infoProf.why && (
                <div>
                  <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('digitalemployees.whyForYourOrg', 'Why for your org')}</p>
                  <p className="text-[13px] italic leading-relaxed text-[#117dff]">{infoProf.why}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#e3e0db] bg-[#e3e0db] text-[12px]">
                <div className="bg-white px-4 py-2.5"><span className="text-[#a3a3a3]">{t('digitalemployees.field', 'Field')}</span><div className="mt-0.5 font-medium text-[#0a0a0a]">{infoProf.field}</div></div>
                <div className="bg-white px-4 py-2.5"><span className="text-[#a3a3a3]">{t('digitalemployees.archetype', 'Archetype')}</span><div className="mt-0.5 font-medium text-[#0a0a0a]">{infoProf.prof.role_archetype}</div></div>
              </div>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => { const p = infoProf; setInfoProf(null); setNameDraft(''); setNaming({ prof: p.prof, field: p.field }); }}
                className="w-full rounded-lg bg-[#0a0a0a] px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#117dff] disabled:bg-[#cbd5e1]"
              >
                {t('digitalemployees.hireProfession', 'Hire')} {infoProf.prof.title} ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DigitalEmployees() {
  const { t } = useTranslation('dashboard');
  const { teams } = useTeamContext();
  const { org, user } = useAuth();
  const isOrgAdmin = ['admin', 'owner'].includes(user?.role);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [surface, setSurface] = useState('employee');
  const [chatEmployee, setChatEmployee] = useState(null);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [slidePanelOpen, setSlidePanelOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [reminting, setReminting] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [installingMarketplaceId, setInstallingMarketplaceId] = useState(null);
  const [hiringProf, setHiringProf] = useState(null);
  const flash = useCallback((msg) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); }, []);

  // Collapse the sidebar to a rail while on the Hyper Agents area (roster).
  // Sidebar's own ChevronRight is the re-open arrow. Restore on unmount.
  useEffect(() => {
    window.dispatchEvent(new Event('hivemind:close-sidebar'));
    return () => window.dispatchEvent(new Event('hivemind:open-sidebar'));
  }, []);
  const [recentTasks, setRecentTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [activeWorkspaceTaskId, setActiveWorkspaceTaskId] = useState(null);

  const loadRecentTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const data = await apiClient.listTeamTasks(8);
      setRecentTasks(data.tasks || []);
    } catch (e) {
      setRecentTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { employees: list } = await apiClient.listEmployees();
      setEmployees(list || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (surface === 'workspace') loadRecentTasks();
  }, [surface, loadRecentTasks]);

  async function handleCreate(payload) {
    await apiClient.createEmployee(payload);
    await fetch();
  }
  async function handlePause(emp)   { await apiClient.pauseEmployee(emp.id); await fetch(); }
  async function handleResume(emp)  { await apiClient.resumeEmployee(emp.id); await fetch(); }
  async function handleArchive(emp) {
    if (!window.confirm(t('digitalemployees.archiveConfirm', 'Delete "{{name}}"? The agent is archived and its container stopped. This cannot be undone.', { name: emp.name }))) return;
    try {
      await apiClient.archiveEmployee(emp.id);
      flash(t('digitalemployees.archived', '{{name}} deleted.', { name: emp.name }));
    } catch (e) {
      // Was silently swallowed before — surface it so a failed delete is visible.
      setError(e.response?.data?.error || e.message || 'Delete failed.');
    } finally {
      await fetch();
    }
  }
  // Bulk "Seed Human Team" removed — agents are installed individually from the
  // Marketplace now (handleInstallMarketplaceAgent). The persona presets live on
  // as the Marketplace catalog (MARKETPLACE_AGENT_PRESETS).
  async function handleInstallMarketplaceAgent(preset) {
    if (!isOrgAdmin) {
      setError(t('digitalemployees.adminOnlyInstall', 'Only org admins can install agents.'));
      return;
    }
    setInstallingMarketplaceId(preset.id);
    setError(null);
    try {
      await apiClient.createEmployee({
        name: preset.name,
        persona: preset.persona,
        model: preset.model,
        llm_provider: preset.llm_provider,
        scope: 'organization',
        team_id: null,
        slack_team_id: null,
        slack_channels_allowed: [],
        tools: preset.tools,
        role_archetype: preset.role_archetype,
        peer_review_targets: preset.peer_review_targets,
        policy_rules: {
          rate_limit_per_min: 30,
          marketplace_template_id: preset.id,
          marketplace_category: preset.category || 'Core',
          persona_contract: buildPersonaContractLike(preset),
        },
      });
      await fetch();
      flash(t('digitalemployees.agentInstalled', '{{name}} installed into your organization.', { name: preset.name }));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setInstallingMarketplaceId(null);
    }
  }
  // Hire a marketplace PROFESSION (field → profession). Generates an org-tuned persona from the
  // profession brief (optimize-persona with ground_org → grounded in THIS company), then creates it.
  async function handleHireProfession(prof, field, chosenName) {
    if (!isOrgAdmin) {
      setError(t('digitalemployees.adminOnlyInstall', 'Only org admins can install agents.'));
      return;
    }
    const empName = (chosenName || '').trim() || prof.title;
    setHiringProf(prof.title);
    setError(null);
    try {
      let persona = prof.brief;
      try {
        const { persona: p } = await apiClient.optimizeEmployeePersona({
          brief: prof.brief, name: empName, role: prof.role_archetype, ground_org: true,
        });
        if (p) persona = p;
      } catch { /* fall back to the brief as the persona */ }
      await apiClient.createEmployee({
        name: empName, persona, scope: 'organization', team_id: null,
        slack_team_id: null, slack_channels_allowed: [], tools: [],
        role_archetype: prof.role_archetype,
        policy_rules: { rate_limit_per_min: 30, marketplace_category: field, marketplace_profession: prof.title },
      });
      await fetch();
      flash(t('digitalemployees.professionHired', '{{name}} hired into your organization.', { name: empName }));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setHiringProf(null);
    }
  }
  function handleOpen(emp) {
    setSurface('employee');
    setDetailEmployee(emp);
  }
  async function handleDeploy(emp) {
    try {
      await apiClient.deployEmployee(emp.id);
      flash(t('digitalemployees.deployStarted', 'Deploying {{name}}…', { name: emp.name }));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      await fetch();
      // reconcile flips deploying→running within ~30s; refetch shortly after.
      setTimeout(() => { fetch().catch(() => {}); }, 6000);
    }
  }
  async function handleRemintKey(emp) {
    if (!window.confirm(t('digitalemployees.remintConfirm', 'Re-mint HIVEMIND key for "{{name}}"? The current key is revoked and a new one issued.', { name: emp.name }))) return;
    try {
      await apiClient.remintEmployeeKey(emp.id);
      flash(t('digitalemployees.remintOk', 'Key re-minted for {{name}}.', { name: emp.name }));
      await fetch();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }
  async function handleRemintAll() {
    const orgId = org?.id;
    if (!orgId) { setError('No active org'); return; }
    if (!window.confirm(t('digitalemployees.remintAllConfirm', 'Backfill HIVEMIND keys for all employees in this org missing one?'))) return;
    setReminting(true);
    try {
      const r = await apiClient.remintAllEmployeeKeys(orgId);
      flash(t('digitalemployees.remintAllOk', 'Re-mint complete{{n}}.', { n: r?.results ? ` (${r.results.filter(x => x.ok).length} keys)` : '' }));
      await fetch();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setReminting(false);
    }
  }

  async function handleTune(emp) {
    try {
      await apiClient.tuneEmployee(emp.id);
      flash(t('digitalemployees.tuneStarted', 'Tuning {{name}}…', { name: emp.name }));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      // The tune runs server-side (Groq teacher loop) and flips state to
      // 'optimized'. Poll a few times so the new prompt version + badge land.
      await fetch();
      setTimeout(() => { fetch().catch(() => {}); }, 5000);
      setTimeout(() => { fetch().catch(() => {}); }, 12000);
    }
  }

  function handleResumeTask(task) {
    setSurface('workspace');
    setChatEmployee(null);
    setSlidePanelOpen(true);
    setActiveWorkspaceTaskId(task.task_id);
  }

  const running = employees.filter(e => e.status === 'running').length;
  const optimized = employees.filter((e) => e.hyper?.state === 'optimized').length;

  const isWorkspaceMode = surface === 'workspace';
  const dockedWorkspaceWidth = slidePanelOpen ? 'min(50vw, 720px)' : '0px';

  return (
    <div className="max-w-7xl mx-auto space-y-4 transition-[padding-right] duration-300" style={isWorkspaceMode && slidePanelOpen ? { paddingRight: dockedWorkspaceWidth } : undefined}>
      {/* Gradient hero band — mirrors the New Room popup header
          flat operator-console theme (matches MCP Server page — no gradient/glow). */}
      <header className="rounded-2xl border border-[#e3e0db] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center text-[#117dff] shrink-0">
              <Bot size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold text-[#0a0a0a] leading-tight font-['Space_Grotesk'] tracking-tight">
                {t('digitalemployees.pageTitle', 'Digital Employees')}
              </h1>
              <p className="text-[12px] text-[#a3a3a3] leading-tight font-['Space_Grotesk'] mt-0.5">
                {t('digitalemployees.pageSubtitleShort', 'Autonomous AI agents with HIVEMIND memory + Slack access')}
              </p>
            </div>
          </div>

          {/* flat stat chips */}
          <div className="flex items-center gap-2">
            {[
              [t('digitalemployees.statTotal', 'Total'), employees.length, '#0a0a0a'],
              [t('digitalemployees.statRunning', 'Running'), running, '#16a34a'],
              [t('digitalemployees.statOptimized', 'Optimized'), optimized, '#117dff'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl border border-[#e3e0db] bg-[#faf9f4] px-3.5 py-2 text-center min-w-[66px]">
                <div className="text-[18px] font-bold font-['Space_Grotesk'] tabular-nums leading-none" style={{ color }}>{value}</div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-[#a3a3a3] mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* action bar */}
        <div className="mt-4 pt-4 border-t border-[#e3e0db] flex flex-wrap items-center justify-end gap-2">
          {isWorkspaceMode && (
            <button onClick={() => setSlidePanelOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#525252] hover:border-[#117dff]/30 hover:text-[#117dff] transition-colors">
              <Users size={13} />
              {slidePanelOpen ? t('digitalemployees.workspaceOpen', 'Workspace open') : t('digitalemployees.workspacePanel', 'Workspace panel')}
            </button>
          )}
          <button onClick={fetch} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[12px] text-[#525252] hover:border-[#117dff]/30 hover:text-[#117dff] transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {t('digitalemployees.refresh', 'Refresh')}
          </button>
          <button onClick={() => setMarketplaceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#dbeafe] bg-[#eff6ff] text-[12px] text-[#117dff] hover:bg-[#dbeafe] transition-colors">
            <Store size={13} />
            {t('digitalemployees.marketplace', 'Marketplace')}
          </button>
          {isOrgAdmin && (
            <button onClick={handleRemintAll} disabled={reminting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[12px] text-[#525252] hover:border-[#117dff]/30 hover:text-[#117dff] transition-colors disabled:opacity-50"
              title={t('digitalemployees.remintAllKeys', 'Re-mint missing HIVEMIND keys')}>
              <KeyRound size={13} className={reminting ? 'animate-pulse' : ''} />
              {reminting ? t('digitalemployees.reminting', 'Re-minting...') : t('digitalemployees.remintAllKeys', 'Re-mint keys')}
            </button>
          )}
          {isWorkspaceMode ? (
            <button
              onClick={() => { setActiveWorkspaceTaskId(null); setSlidePanelOpen(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#117dff] text-white text-[12px] font-semibold hover:bg-[#0066e0] transition-colors"
            >
              <Zap size={13} />
              {t('digitalemployees.runTask', 'Run Task')}
            </button>
          ) : (
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#117dff] text-white text-[12px] font-semibold hover:bg-[#0066e0] transition-colors">
              <Plus size={13} />
              {t('digitalemployees.newEmployee', 'New Employee')}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[8px] text-[12px] text-[#dc2626]">
          <AlertCircle size={13} /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-[8px] text-[12px] text-[#16a34a]">
          <CheckCircle2 size={13} /> {notice}
        </div>
      )}

      {employees.length === 0 && !loading ? (
        <div className="bg-white border border-dashed border-[#e3e0db] rounded-[10px] p-12 text-center">
          <Bot size={32} className="text-[#a3a3a3] mx-auto mb-3" />
          <h2 className="text-[#0a0a0a] font-semibold mb-1">{t('digitalemployees.emptyTitle', 'No Digital Employees yet')}</h2>
          <p className="text-[12px] text-[#a3a3a3] mb-4">
            {t('digitalemployees.emptyHint', 'Create your first AI agent — give it a persona, connect Slack, define what tools it can use.')}
          </p>
          <button onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]">
            <Plus size={13} /> {t('digitalemployees.createFirst', 'Create your first employee')}
          </button>
        </div>
      ) : (
        <>
          {surface === 'workspace' && !slidePanelOpen && (
            <section className="rounded-[16px] border border-[#e3e0db] bg-[#fbfaf7] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('digitalemployees.workspaceTasks', 'Workspace Tasks')}</h2>
                  <p className="mt-1 text-[12px] text-[#737373]">{t('digitalemployees.workspaceTasksHint', 'Run and resume team sessions here. Agent selection happens inside the workspace panel.')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={loadRecentTasks} className="rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#525252] hover:bg-[#faf9f4]">
                    {tasksLoading ? t('digitalemployees.loading', 'Loading...') : t('digitalemployees.refreshTasks', 'Refresh tasks')}
                  </button>
                  <button onClick={() => setSlidePanelOpen(true)} className="rounded-[8px] bg-[#117dff] px-3 py-2 text-[12px] text-white hover:bg-[#0066e0]">
                    {t('digitalemployees.openWorkspace', 'Open workspace')}
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {recentTasks.length > 0 ? recentTasks.map((task) => (
                  <TaskHistoryCard key={task.task_id} task={task} onResume={handleResumeTask} />
                )) : (
                  <div className="rounded-[12px] border border-dashed border-[#ddd6c9] bg-white px-4 py-8 text-center text-[12px] text-[#8a8a8a]">
                    {tasksLoading ? t('digitalemployees.loadingTasks', 'Loading workspace tasks...') : t('digitalemployees.noWorkspaceSessions', 'No workspace sessions yet. Run a task from Workspace mode and it will appear here.')}
                  </div>
                )}
              </div>
            </section>
          )}

          {surface === 'employee' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {employees.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onPause={handlePause}
                  onResume={handleResume}
                  onArchive={handleArchive}
                  onOpen={handleOpen}
                  onDeploy={handleDeploy}
                  onTune={handleTune}
                  selectable={false}
                  selected={false}
                  onToggleSelect={undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreateWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        teams={teams || []}
      />

      <AgentMarketplaceModal
        open={marketplaceOpen}
        onClose={() => setMarketplaceOpen(false)}
        employees={employees}
        installingId={installingMarketplaceId}
        onInstall={handleInstallMarketplaceAgent}
        onHireProfession={handleHireProfession}
        hiringProf={hiringProf}
        isAdmin={isOrgAdmin}
      />

      {detailEmployee && (
        <AgentDetailOverlay
          employee={detailEmployee}
          onClose={() => setDetailEmployee(null)}
          onChat={(emp) => { setDetailEmployee(null); setChatEmployee(emp); }}
          isAdmin={isOrgAdmin}
          onRemint={(emp) => { setDetailEmployee(null); handleRemintKey(emp); }}
        />
      )}

      {chatEmployee && (
        <ExpertChatDrawer employee={chatEmployee} onClose={() => setChatEmployee(null)} />
      )}

      {slidePanelOpen && (
        <WorkspaceSlidePanel
          employees={employees}
          initialTaskId={activeWorkspaceTaskId}
          onTaskActivity={loadRecentTasks}
          onClose={() => {
            setSlidePanelOpen(false);
            setActiveWorkspaceTaskId(null);
          }}
        />
      )}
    </div>
  );
}
