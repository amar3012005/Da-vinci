import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  GripHorizontal,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useTeamContext } from '../shared/team-context';

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

const STATUS_STYLES = {
  draft:     { bg: 'bg-[#f3f1ec]',         text: 'text-[#525252]', dot: 'bg-[#a3a3a3]', label: 'Draft' },
  deploying: { bg: 'bg-blue-500/10',       text: 'text-blue-700',  dot: 'bg-blue-500 animate-pulse', label: 'Deploying' },
  running:   { bg: 'bg-emerald-500/10',    text: 'text-[#16a34a]', dot: 'bg-[#16a34a]', label: 'Running' },
  paused:    { bg: 'bg-amber-500/10',      text: 'text-amber-700', dot: 'bg-amber-500', label: 'Paused' },
  error:     { bg: 'bg-red-500/10',        text: 'text-[#dc2626]', dot: 'bg-[#dc2626]', label: 'Error' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.bg} ${s.text}`}>
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
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      <Sparkles size={10} />
      {hyper.state_label || 'Baseline'}
    </span>
  );
}

function EmployeeCard({ employee, onPause, onResume, onArchive, onOpen, selectable, selected, onToggleSelect }) {
  const isRunning = employee.status === 'running';
  const isPaused = employee.status === 'paused';
  const msgs = employee.metricsLast24h?.messages || 0;
  const tokens = employee.metricsLast24h?.tokens || 0;
  const hyper = employee.hyper;
  const versionLabel = employee.active_prompt_version?.version_label || hyper?.active_prompt_version?.version_label || 'v0';
  const evalCount = hyper?.evaluation_count || 0;
  const threshold = hyper?.tuning_threshold || 20;

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
      className={`bg-white border rounded-[10px] p-4 transition-all cursor-pointer flex flex-col ${
        selected
          ? 'border-[#117dff] ring-2 ring-[#117dff]/20 shadow-[0_0_0_4px_rgba(17,125,255,0.08)]'
          : 'border-[#e3e0db] hover:border-[#d4d0ca]'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${
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

      <div className="mb-3 rounded-[10px] border border-[#ece8e1] bg-[#fbfaf7] p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8b857c]">Hyper Agent</p>
            <p className="mt-1 text-[12px] font-semibold text-[#0a0a0a]">{versionLabel} active prompt</p>
          </div>
          <HyperStateBadge hyper={hyper} />
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-[#737373] font-mono">
          <span>{evalCount}/{threshold} evals</span>
          <span>{hyper?.source === 'prompt_tune' ? 'tuned prompt live' : 'seed prompt live'}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-[#ece8e1] overflow-hidden">
          <div
            className={`h-full rounded-full ${hyper?.state === 'optimized' ? 'bg-emerald-500' : hyper?.state === 'ready_for_tuning' ? 'bg-violet-500' : 'bg-amber-400'}`}
            style={{ width: `${hyper?.state === 'optimized' ? 100 : (hyper?.progress_pct || 0)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[#a3a3a3] font-mono mt-auto pt-2 border-t border-[#eae7e1]">
        <span className="flex items-center gap-1"><Activity size={10} /> {msgs} msgs</span>
        <span>·</span>
        <span>{tokens} tok</span>
        <span>·</span>
        <span>{employee.model.split('-').slice(0, 2).join('-')}</span>
      </div>

      {!selectable && (
        <div className="flex items-center gap-1 mt-3">
          {isRunning && (
            <button onClick={(e) => { e.stopPropagation(); onPause(employee); }}
              className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-amber-700 hover:bg-amber-500/10">
              <Pause size={11} /> Pause
            </button>
          )}
          {isPaused && (
            <button onClick={(e) => { e.stopPropagation(); onResume(employee); }}
              className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-[#16a34a] hover:bg-emerald-500/10">
              <Play size={11} /> Resume
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onOpen(employee); }}
            className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-[#525252] hover:bg-[#f3f1ec] ml-auto">
            Details <ChevronRight size={11} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onArchive(employee); }}
            className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[10px] text-[#dc2626]/60 hover:text-[#dc2626] hover:bg-red-50"
            title="Archive">
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// WorkspaceToggle removed per UX cleanup. Surface state still tracked
// internally (employee | workspace) — toggled by the topbar Workspace
// button. Re-introduce if multi-surface segmenting comes back.

function PreviewWindow({ title, subtitle, onClose, children }) {
  const windowRef = useRef(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 500, y: 140 });
  const dragStateRef = useRef(null);

  useEffect(() => {
    const handleMove = (event) => {
      if (!dragStateRef.current) return;
      const nextX = dragStateRef.current.startX + (event.clientX - dragStateRef.current.originX);
      const nextY = dragStateRef.current.startY + (event.clientY - dragStateRef.current.originY);
      setPosition({
        x: Math.max(24, Math.min(nextX, window.innerWidth - 460)),
        y: Math.max(96, Math.min(nextY, window.innerHeight - 180)),
      });
    };
    const handleUp = () => {
      dragStateRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const startDrag = (event) => {
    dragStateRef.current = {
      originX: event.clientX,
      originY: event.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  return (
    <div
      ref={windowRef}
      className="fixed z-[120] w-[440px] overflow-hidden rounded-2xl border border-[#e3e0db] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b border-[#e3e0db] bg-[#faf9f4] px-3 py-2 cursor-move"
        onMouseDown={startDrag}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#0a0a0a]">{title}</p>
          <p className="truncate text-[10px] text-[#737373]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <GripHorizontal size={12} className="text-[#a3a3a3]" />
          <button onClick={onClose} className="rounded p-1.5 text-[#525252] hover:bg-[#e3e0db]/60">
            <X size={12} />
          </button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto bg-white">{children}</div>
    </div>
  );
}

function EmployeeChatPreview({ employee, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => `emp-${employee.id}`);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages(prev => [...prev, { id: `${Date.now()}-u`, role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const data = await apiClient.chatWithEmployee(employee.slug, {
        text,
        conversation_id: conversationId,
      });
      setConversationId(data.conversation_id || conversationId);
      setMessages(prev => [...prev, { id: `${Date.now()}-a`, role: 'assistant', content: data.reply || 'No response.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: `${Date.now()}-e`, role: 'assistant', content: e.response?.data?.detail || e.response?.data?.error || e.message, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PreviewWindow title={`${employee.name} DM`} subtitle={`1-on-1 employee chat · ${employee.slug}`} onClose={onClose}>
      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3 text-[11px] text-[#525252]">
          Chat directly with this employee using its current prompt version {employee.active_prompt_version?.version_label || employee.hyper?.active_prompt_version?.version_label || 'v0'}, tools, and in-sidecar conversation memory.
        </div>
        <div className="space-y-2 min-h-[280px]">
          {messages.length === 0 ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-[#e3e0db] bg-[#faf9f4] px-8 text-center text-[12px] text-[#a3a3a3]">
              Send a message to start a persistent employee conversation.
            </div>
          ) : messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${msg.role === 'user' ? 'bg-[#117dff] text-white' : msg.error ? 'border border-red-200 bg-red-50 text-[#dc2626]' : 'border border-[#e3e0db] bg-[#faf9f4] text-[#0a0a0a]'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-[11px] text-[#a3a3a3]">Employee is thinking...</div>}
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-[#e3e0db] bg-[#faf9f4] p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={2}
            placeholder={`Message ${employee.name}...`}
            className="min-h-[44px] flex-1 resize-none bg-transparent text-[12px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3]"
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#117dff] text-white hover:bg-[#0066e0] disabled:opacity-50">
            <Send size={14} />
          </button>
        </div>
      </div>
    </PreviewWindow>
  );
}

function WorkspaceSlidePanel({ employees, onClose, initialTaskId, onTaskActivity }) {
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
            <p className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">New Workspace Run</p>
            <p className="text-[11px] text-[#737373]">Select agents and describe the task</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[#525252] hover:bg-[#e3e0db]/60">
            <X size={16} />
          </button>
        </div>

        {/* Agent Selection */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-3">
              Select Agents <span className="text-[#117dff]">({selectedSlugs.length} selected)</span>
            </p>
            <div className="space-y-2">
              {runningEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => toggleSlug(emp.slug)}
                  className={`w-full text-left rounded-[12px] border p-3 transition-all ${
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
                      <span className="rounded-full bg-[#117dff] px-2 py-1 text-[10px] font-semibold text-white">selected</span>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-2">Task Brief</p>
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
              placeholder="Describe what the team should investigate, debate, and decide..."
              className="w-full resize-none rounded-xl border border-[#e3e0db] bg-[#faf9f4] px-3 py-2.5 text-[12px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#eae7e1] px-5 py-4 bg-[#faf9f4]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#a3a3a3]">
              {selectedSlugs.length < 2 ? 'Select at least 2 agents' : `${selectedSlugs.length} agents ready`}
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
              <><RefreshCw size={14} className="animate-spin" /> Starting...</>
            ) : (
              <><Zap size={14} /> Run Task</>
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
            {isRunning ? `${selectedSlugs.length} agents collaborating...` : isCompleted ? 'Task completed' : taskStatus?.status || 'preparing...'}
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
              <p className="text-[13px] text-[#667781]">Task is starting. Messages will appear here as the team works through it.</p>
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
              read_memory: 'Checked memory',
              search_context: 'Searched context',
              read_history: 'Read transcript',
              post_update: 'Shared update',
              write_memory: 'Saved memory',
            }[metadata.action_label] || msg.content;
            return (
              <div key={msg.msg_id || `${msg.ts}-${msg.sender_name}`} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setThinkingMessage({ senderName, label: 'Tool activity', detail: msg.content })}
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
            <span className="text-[11px] text-[#667781] italic">Team is thinking through the next move...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {taskStatus?.final_answer && (
        <div className="mx-5 mb-3 rounded-[22px] border border-[#dbe8ff] bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-[#117dff]" />
            <span className="text-[11px] font-semibold text-[#117dff]">Team Decision</span>
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
            placeholder={isRunning ? 'Team is working...' : isCompleted ? 'Ask the team a follow-up...' : 'What should the team work on next?'}
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
        {task.final_answer || 'Open this session to review the transcript and continue the conversation.'}
      </p>
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#117dff]">
        Resume session <ChevronRight size={12} />
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
            <h2 className="text-[16px] font-semibold text-[#0a0a0a]">Create Digital Employee</h2>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">Describe them in one line — we build the persona.</p>
          </div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#525252]"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[11px] text-[#525252] font-medium">Name</span>
            <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Maya Ortiz"
              className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] focus:outline-none focus:border-[#117dff]" />
          </label>

          <label className="block">
            <span className="text-[11px] text-[#525252] font-medium">Brief / what should they do?</span>
            <textarea value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })}
              rows={3}
              placeholder="e.g. Calm operations lead who turns chaos into clear plans and keeps the team honest about owners and blockers."
              className="w-full px-3 py-2 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] resize-y focus:outline-none focus:border-[#117dff]" />
            <span className="text-[10px] text-[#a3a3a3]">One sentence is enough — we expand this into a full persona.</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">Role</span>
              <select value={form.role_archetype} onChange={e => setForm({ ...form, role_archetype: e.target.value })}
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                {ROLE_ARCHETYPES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">Team</span>
              <select value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                <option value="">— select team —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">Age</span>
              <input type="number" min={18} max={99} value={form.age}
                onChange={e => setForm({ ...form, age: e.target.value })}
                placeholder="32"
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]" />
            </label>
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">Gender</span>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                <option value="">—</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="unspecified">Unspecified</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] text-[#525252] font-medium">Experience (yrs)</span>
              <input type="number" min={0} max={60} value={form.experience_years}
                onChange={e => setForm({ ...form, experience_years: e.target.value })}
                className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]" />
            </label>
          </div>

          {/* Persona preview block: LLM expansion of the brief. Optional. */}
          <div className="rounded-[8px] border border-[#eae7e1] bg-[#faf9f4] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#737373] font-semibold">
                Generated persona
              </span>
              <button onClick={optimize}
                disabled={!form.brief.trim() || optimizing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-[6px] bg-white border border-[#e3e0db] hover:border-[#117dff] hover:text-[#117dff] disabled:opacity-40">
                {optimizing ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {persona ? 'Regenerate' : 'Preview'}
              </button>
            </div>
            {persona ? (
              <p className="mt-2 text-[12px] leading-relaxed text-[#0a0a0a] whitespace-pre-wrap">{persona}</p>
            ) : (
              <p className="mt-2 text-[11px] text-[#a3a3a3] italic">Optional. Auto-generated on create if you skip preview.</p>
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
            Cancel
          </button>
          <button onClick={submit} disabled={submitting || !canSubmit}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] bg-[#117dff] text-white rounded hover:bg-[#0066e0] disabled:opacity-50">
            {submitting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DigitalEmployees() {
  const { teams } = useTeamContext();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [surface, setSurface] = useState('employee');
  const [chatEmployee, setChatEmployee] = useState(null);
  const [slidePanelOpen, setSlidePanelOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
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
      await loadRecentTasks();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [loadRecentTasks]);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleCreate(payload) {
    await apiClient.createEmployee(payload);
    await fetch();
  }
  async function handlePause(emp)   { await apiClient.pauseEmployee(emp.id); await fetch(); }
  async function handleResume(emp)  { await apiClient.resumeEmployee(emp.id); await fetch(); }
  async function handleArchive(emp) {
    if (!window.confirm(`Archive "${emp.name}"? Container will be stopped.`)) return;
    await apiClient.archiveEmployee(emp.id);
    await fetch();
  }
  async function handleSeedPersonas() {
    const existingSlugs = new Set(employees.map((emp) => emp.slug));
    const pending = PERSONA_PRESETS.filter((preset) => !existingSlugs.has(slugifyName(preset.name)));
    if (!pending.length) {
      setError('All sample personas already exist.');
      return;
    }
    setSeeding(true);
    setError(null);
    try {
      for (const preset of pending) {
        await apiClient.createEmployee({
          name: preset.name,
          persona: preset.persona,
          model: preset.model,
          llm_provider: preset.llm_provider,
          scope: 'team',
          team_id: '',
          slack_team_id: null,
          slack_channels_allowed: [],
          tools: preset.tools,
          role_archetype: preset.role_archetype,
          peer_review_targets: preset.peer_review_targets,
          policy_rules: { rate_limit_per_min: 30 },
        });
      }
      await fetch();
      setSurface('workspace');
      setSlidePanelOpen(true);
      setActiveWorkspaceTaskId(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSeeding(false);
    }
  }
  function handleOpen(emp) {
    setSurface('employee');
    setChatEmployee(emp);
  }

  function handleResumeTask(task) {
    setSurface('workspace');
    setChatEmployee(null);
    setSlidePanelOpen(true);
    setActiveWorkspaceTaskId(task.task_id);
  }

  const running = employees.filter(e => e.status === 'running').length;
  const paused = employees.filter(e => e.status === 'paused').length;
  const draft = employees.filter(e => e.status === 'draft').length;
  const optimized = employees.filter((e) => e.hyper?.state === 'optimized').length;
  const readyForTuning = employees.filter((e) => e.hyper?.state === 'ready_for_tuning').length;

  const isWorkspaceMode = surface === 'workspace';
  const dockedWorkspaceWidth = slidePanelOpen ? 'min(50vw, 720px)' : '0px';

  return (
    <div className="max-w-7xl mx-auto space-y-4 transition-[padding-right] duration-300" style={isWorkspaceMode && slidePanelOpen ? { paddingRight: dockedWorkspaceWidth } : undefined}>
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
            Digital Employees
          </h1>
          <p className="text-[12px] text-[#a3a3a3] mt-1">
            Autonomous AI agents with HIVEMIND memory + Slack access. {employees.length} total · {running} running · {paused} paused · {draft} draft.
          </p>
          <p className="text-[11px] text-[#737373] mt-1">
            Hyper status: {optimized} optimized · {readyForTuning} ready for tuning.
          </p>
        </div>
        {/* Employee/Workspace toggle removed per UX cleanup —
            workspace panel still reachable via the topbar button below. */}
        <div />

        <div className="flex justify-end gap-2">
          {isWorkspaceMode && (
            <button onClick={() => setSlidePanelOpen(true)} className="flex items-center gap-1.5 rounded-[6px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] hover:bg-[#faf9f4]">
              <Users size={13} />
              {slidePanelOpen ? 'Workspace open' : 'Workspace panel'}
            </button>
          )}
          <button onClick={fetch} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#f3f1ec] border border-[#e3e0db] text-[12px] hover:bg-[#eae7e1]">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={handleSeedPersonas} disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-[#e3e0db] bg-white text-[12px] hover:bg-[#faf9f4] disabled:opacity-50">
            <Users size={13} />
            {seeding ? 'Seeding...' : 'Seed Human Team'}
          </button>
          {isWorkspaceMode ? (
            <button
              onClick={() => {
                setActiveWorkspaceTaskId(null);
                setSlidePanelOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]"
            >
              <Zap size={13} />
              Run Task
            </button>
          ) : (
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]">
              <Plus size={13} />
              New Employee
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[8px] text-[12px] text-[#dc2626]">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {employees.length === 0 && !loading ? (
        <div className="bg-white border border-dashed border-[#e3e0db] rounded-[10px] p-12 text-center">
          <Bot size={32} className="text-[#a3a3a3] mx-auto mb-3" />
          <h2 className="text-[#0a0a0a] font-semibold mb-1">No Digital Employees yet</h2>
          <p className="text-[12px] text-[#a3a3a3] mb-4">
            Create your first AI agent — give it a persona, connect Slack, define what tools it can use.
          </p>
          <button onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]">
            <Plus size={13} /> Create your first employee
          </button>
        </div>
      ) : (
        <>
          {surface === 'workspace' && !slidePanelOpen && (
            <section className="rounded-[16px] border border-[#e3e0db] bg-[#fbfaf7] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Workspace Tasks</h2>
                  <p className="mt-1 text-[12px] text-[#737373]">Run and resume team sessions here. Agent selection happens inside the workspace panel.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={loadRecentTasks} className="rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#525252] hover:bg-[#faf9f4]">
                    {tasksLoading ? 'Loading...' : 'Refresh tasks'}
                  </button>
                  <button onClick={() => setSlidePanelOpen(true)} className="rounded-[8px] bg-[#117dff] px-3 py-2 text-[12px] text-white hover:bg-[#0066e0]">
                    Open workspace
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {recentTasks.length > 0 ? recentTasks.map((task) => (
                  <TaskHistoryCard key={task.task_id} task={task} onResume={handleResumeTask} />
                )) : (
                  <div className="rounded-[12px] border border-dashed border-[#ddd6c9] bg-white px-4 py-8 text-center text-[12px] text-[#8a8a8a]">
                    {tasksLoading ? 'Loading workspace tasks...' : 'No workspace sessions yet. Run a task from Workspace mode and it will appear here.'}
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

      {chatEmployee && surface === 'employee' && (
        <EmployeeChatPreview employee={chatEmployee} onClose={() => setChatEmployee(null)} />
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
