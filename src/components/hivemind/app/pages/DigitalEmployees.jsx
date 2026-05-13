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

const TOOL_COPY = {
  hivemind_recall: 'Read memory and prior knowledge',
  hivemind_save_memory: 'Write memory back into the workspace',
  hivemind_slack_post: 'Post updates into the simulation or connected Slack',
  hivemind_slack_react: 'React with emoji to signal agreement, urgency, or caution',
  hivemind_slack_search: 'Search earlier conversations and shared context',
  hivemind_slack_history: 'Read channel or thread history as simulation context',
  hivemind_web_search: 'Search the web',
  hivemind_web_crawl: 'Crawl and summarize web pages',
};

function slugifyName(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function EmployeeCard({ employee, onPause, onResume, onArchive, onOpen }) {
  const isRunning = employee.status === 'running';
  const isPaused = employee.status === 'paused';
  const msgs = employee.metricsLast24h?.messages || 0;
  const tokens = employee.metricsLast24h?.tokens || 0;
  return (
    <div className="bg-white border border-[#e3e0db] rounded-[10px] p-4 hover:border-[#d4d0ca] transition-all cursor-pointer flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center flex-shrink-0">
            <Bot size={16} className="text-[#117dff]" />
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

      <div className="flex items-center gap-3 text-[10px] text-[#a3a3a3] font-mono mt-auto pt-2 border-t border-[#eae7e1]">
        <span className="flex items-center gap-1"><Activity size={10} /> {msgs} msgs</span>
        <span>·</span>
        <span>{tokens} tok</span>
        <span>·</span>
        <span>{employee.model.split('-').slice(0, 2).join('-')}</span>
      </div>

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
    </div>
  );
}

function WorkspaceToggle({ value, onChange }) {
  return (
    <div className="inline-flex items-center rounded-full border border-[#e3e0db] bg-white p-1 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
      {[
        { id: 'employee', label: 'Employee' },
        { id: 'workspace', label: 'Workspace' },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-4 py-1.5 rounded-full text-[12px] font-semibold font-['Space_Grotesk'] transition-all ${
            value === item.id
              ? 'bg-[#117dff] text-white shadow-[0_8px_18px_rgba(17,125,255,0.24)]'
              : 'text-[#737373] hover:text-[#0a0a0a]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

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
          Chat directly with this employee using its current persona, tools, and in-sidecar conversation memory.
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

function WorkspacePreview({ employees, onClose }) {
  const runningEmployees = employees.filter(emp => emp.status === 'running');
  const preferredRoster = useMemo(() => {
    const seeded = runningEmployees.filter((emp) => SEEDED_PERSONA_SLUGS.includes(emp.slug));
    return (seeded.length >= 2 ? seeded : runningEmployees).slice(0, 4);
  }, [runningEmployees]);
  const [selectedSlugs, setSelectedSlugs] = useState(() => preferredRoster.slice(0, 2).map(emp => emp.slug));
  const [brief, setBrief] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedSlugs((prev) => {
      const available = new Set(runningEmployees.map((emp) => emp.slug));
      const kept = prev.filter((slug) => available.has(slug));
      if (kept.length >= 2) {
        return kept;
      }
      const fallback = preferredRoster.slice(0, 2).map((emp) => emp.slug);
      return fallback.length >= 2 ? fallback : kept;
    });
  }, [preferredRoster, runningEmployees]);

  useEffect(() => {
    if (!taskId) return;
    let active = true;
    const poll = async () => {
      try {
        const [statusData, transcriptData] = await Promise.all([
          apiClient.getTeamTask(taskId),
          apiClient.getTeamTaskTranscript(taskId, { limit: 100 }),
        ]);
        if (!active) return;
        setTaskStatus(statusData);
        setMessages(transcriptData.messages || []);
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
    return () => {
      active = false;
    };
  }, [taskId]);

  const toggleSlug = (slug) => {
    setSelectedSlugs(prev => prev.includes(slug) ? prev.filter(item => item !== slug) : [...prev, slug]);
  };

  const runTask = async () => {
    const nextBrief = brief.trim();
    if (!nextBrief || selectedSlugs.length < 2 || loading) return;
    setLoading(true);
    setTaskStatus(null);
    setMessages([]);
    try {
      const data = await apiClient.createTeamTask({
        brief: nextBrief,
        roster_slugs: selectedSlugs,
        max_rounds: 2,
      });
      setTaskId(data.task_id);
      setTaskStatus({ status: data.status, roster: data.roster });
    } catch (e) {
      setTaskStatus({ status: 'failed', error: e.response?.data?.error || e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PreviewWindow title="Workspace Preview" subtitle="Group session and team transcript" onClose={onClose}>
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3 text-[11px] text-[#525252]">
          Pick 2 or more running employees, write a brief, and watch the workspace transcript stream in here. Simulation actions like posting updates, reading context, and reacting with emoji are part of the same workspace behavior, not a separate Slack-only mode.
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3]">Simulation Task Ideas</p>
          <div className="flex flex-wrap gap-2">
            {TASK_TEMPLATES.map((template) => (
              <button
                key={template}
                onClick={() => setBrief(template)}
                className="rounded-full border border-[#e3e0db] bg-white px-3 py-1.5 text-left text-[11px] text-[#525252] hover:border-[#117dff] hover:text-[#117dff]"
              >
                {template}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3]">Roster</p>
          <div className="flex flex-wrap gap-2">
            {runningEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => toggleSlug(emp.slug)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${selectedSlugs.includes(emp.slug) ? 'border-[#117dff] bg-[#117dff] text-white' : 'border-[#e3e0db] bg-white text-[#525252]'}`}
              >
                <span>{emp.name}</span>
                {SEEDED_PERSONA_SLUGS.includes(emp.slug) && <span className="ml-1 opacity-80">human</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#e3e0db] bg-white p-3">
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            placeholder="Ask the team to investigate, debate, and synthesize..."
            className="w-full resize-none bg-transparent text-[12px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3]"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-[#a3a3a3]">Minimum 2 running employees required.</p>
            <button onClick={runTask} disabled={loading || selectedSlugs.length < 2 || !brief.trim()} className="rounded-xl bg-[#117dff] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0066e0] disabled:opacity-50">
              {loading ? 'Starting...' : 'Run workspace'}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-[#e3e0db] bg-[#faf9f4] p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#0a0a0a]">Transcript</p>
              <p className="text-[10px] text-[#a3a3a3]">Live workspace phase stream</p>
            </div>
            {taskStatus?.status && (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${taskStatus.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : taskStatus.status === 'failed' ? 'bg-red-100 text-[#dc2626]' : 'bg-blue-100 text-blue-700'}`}>
                {taskStatus.status}
              </span>
            )}
          </div>
          {taskStatus?.error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-[#dc2626]">{taskStatus.error}</div>
          )}
          <div className="max-h-[320px] space-y-2 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#e3e0db] bg-white px-4 py-8 text-center text-[12px] text-[#a3a3a3]">
                No transcript yet. Start a workspace run to stream the team conversation.
              </div>
            ) : messages.map((msg) => {
              const isAction = msg.kind === 'action';
              const isSystem = msg.kind === 'system';
              const cardClass = isAction
                ? 'border-[#d7e7ff] bg-[#f5f9ff]'
                : isSystem
                  ? 'border-[#ece7da] bg-[#faf9f4]'
                  : 'border-[#e3e0db] bg-white';
              const bodyClass = isAction ? 'text-[#2457a6]' : 'text-[#525252]';
              return (
              <div key={msg.msg_id || `${msg.ts}-${msg.sender_name}`} className={`rounded-xl border px-3 py-2 ${cardClass}`}>
                <div className="mb-1 flex items-center gap-2 text-[10px] text-[#a3a3a3]">
                  <span className="font-semibold text-[#0a0a0a]">{msg.sender_name || 'TeamRoom'}</span>
                  <span className={`rounded-full px-1.5 py-0.5 ${isAction ? 'bg-[#dbeafe] text-[#2457a6]' : isSystem ? 'bg-[#f0eadc] text-[#8a6b2f]' : 'bg-[#f3f1ec] text-[#737373]'}`}>{msg.kind}</span>
                  <span>{msg.round_num ? `r${msg.round_num}` : ''}</span>
                </div>
                <div className={`text-[12px] leading-relaxed ${bodyClass}`}>{msg.content}</div>
              </div>
            )})}
          </div>
          {taskStatus?.final_answer && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">
              <CheckCircle2 size={14} className="mt-0.5" />
              <div>
                <p className="font-semibold">Final team answer</p>
                <p className="mt-1 leading-relaxed">{taskStatus.final_answer}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PreviewWindow>
  );
}

function CreateWizard({ open, onClose, onCreate, teams }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    persona: PERSONA_PRESETS[0].persona,
    model: DEFAULT_GROQ_MODEL,
    llm_provider: 'groq',
    scope: 'team',
    team_id: '',
    slack_team_id: '',
    slack_channels_allowed: '',
    // Per-message Slack identity (one-app, many-personas pattern).
    slack_display_name: '',
    slack_avatar_emoji: ':robot_face:',
    // Multi-employee team-task collaboration metadata.
    tools: PERSONA_PRESETS[0].tools,
    rate_limit_per_min: 30,
    role_archetype: PERSONA_PRESETS[0].role_archetype,
    peer_review_targets: PERSONA_PRESETS[0].peer_review_targets,
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const toggleTool = (t) => setForm(f => ({
    ...f,
    tools: f.tools.includes(t) ? f.tools.filter(x => x !== t) : [...f.tools, t],
  }));

  const togglePeerReviewTarget = (role) => setForm(f => ({
    ...f,
    peer_review_targets: f.peer_review_targets.includes(role)
      ? f.peer_review_targets.filter(x => x !== role)
      : [...f.peer_review_targets, role],
  }));

  // Archetype options shared between the role dropdown and the
  // peer-review-targets multi-select on the Collaboration step.
  const ROLE_ARCHETYPES = [
    { id: '',             label: 'Generalist (no specialty)' },
    { id: 'explorer',     label: 'Explorer — gathers + proposes' },
    { id: 'advocate',     label: 'Advocate — argues a position' },
    { id: 'fact_checker', label: 'Fact-checker — verifies evidence' },
    { id: 'legal',        label: 'Legal/Compliance — risk + policy' },
    { id: 'challenger',   label: 'Challenger — adversarial reviewer' },
    { id: 'synthesizer',  label: 'Synthesizer — consolidates team output' },
  ];

  const applyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      name: preset.name,
      persona: preset.persona,
      model: preset.model,
      llm_provider: preset.llm_provider,
      tools: preset.tools,
      role_archetype: preset.role_archetype,
      peer_review_targets: preset.peer_review_targets,
    }));
  };

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        persona: form.persona,
        model: form.model,
        llm_provider: form.llm_provider,
        scope: form.scope,
        team_id: form.scope === 'team' && form.team_id ? form.team_id : null,
        slack_team_id: form.slack_team_id || null,
        slack_channels_allowed: form.slack_channels_allowed
          ? form.slack_channels_allowed.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        slack_display_name: form.slack_display_name?.trim() || null,
        slack_avatar_emoji: form.slack_avatar_emoji?.trim() || null,
        tools: form.tools,
        role_archetype: form.role_archetype,
        peer_review_targets: form.peer_review_targets,
        policy_rules: {
          rate_limit_per_min: Number(form.rate_limit_per_min) || 30,
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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-[12px] w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-[#eae7e1] flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0a0a0a]">Create Digital Employee</h2>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">Step {step} of 6</p>
          </div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#525252]"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <span className="text-[11px] text-[#525252] font-medium">Human-like Persona Presets</span>
                <div className="mt-2 grid gap-2">
                  {PERSONA_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2 text-left hover:border-[#117dff] hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-semibold text-[#0a0a0a]">{preset.name}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#737373]">{preset.role_archetype}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#525252]">{preset.summary}</p>
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Name</span>
                <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Sarah the QA Specialist"
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] focus:outline-none focus:border-[#117dff]" />
              </label>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Persona / System Prompt</span>
                <textarea value={form.persona} onChange={e => setForm({ ...form, persona: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] resize-y focus:outline-none focus:border-[#117dff]" />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">LLM Provider</span>
                <select value={form.llm_provider} onChange={e => setForm({ ...form, llm_provider: e.target.value })}
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="openai">OpenAI</option>
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Model</span>
                <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                  placeholder={DEFAULT_GROQ_MODEL}
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]" />
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Slack Team ID (workspace)</span>
                <input value={form.slack_team_id} onChange={e => setForm({ ...form, slack_team_id: e.target.value })}
                  placeholder="T0AF7AU1B6D"
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] font-mono" />
                <span className="text-[10px] text-[#a3a3a3]">From your connected Slack workspace</span>
              </label>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Channels Allowed</span>
                <input value={form.slack_channels_allowed}
                  onChange={e => setForm({ ...form, slack_channels_allowed: e.target.value })}
                  placeholder="C01ABC123,C02DEF456 (comma-separated)"
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] font-mono" />
                <span className="text-[10px] text-[#a3a3a3]">Empty = all channels owner can access</span>
              </label>
              {/* Per-message Slack identity. One DAVINCI AI app posts as N
                  personas via chat:write.customize — this controls how
                  THIS employee shows up inside that one app. */}
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <label className="block">
                  <span className="text-[11px] text-[#525252] font-medium">Slack display name</span>
                  <input value={form.slack_display_name}
                    onChange={e => setForm({ ...form, slack_display_name: e.target.value })}
                    placeholder={form.name || 'Helpdesk Bot'}
                    className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]" />
                  <span className="text-[10px] text-[#a3a3a3]">Falls back to employee name if blank</span>
                </label>
                <label className="block">
                  <span className="text-[11px] text-[#525252] font-medium">Avatar emoji</span>
                  <input value={form.slack_avatar_emoji}
                    onChange={e => setForm({ ...form, slack_avatar_emoji: e.target.value })}
                    placeholder=":robot_face:"
                    className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px] font-mono" />
                </label>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Scope</span>
                <select value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                  <option value="personal">Personal (creator only)</option>
                  <option value="team">Team</option>
                  <option value="organization">Organization-wide</option>
                </select>
              </label>
              {form.scope === 'team' && (
                <label className="block">
                  <span className="text-[11px] text-[#525252] font-medium">Team</span>
                  <select value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}
                    className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                    <option value="">— select team —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Rate Limit (msgs/min)</span>
                <input type="number" value={form.rate_limit_per_min}
                  onChange={e => setForm({ ...form, rate_limit_per_min: e.target.value })}
                  min={1} max={300}
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]" />
              </label>
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Team Role</span>
                <select value={form.role_archetype} onChange={e => setForm({ ...form, role_archetype: e.target.value })}
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                  <option value="generalist">Generalist</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="investigator">Investigator</option>
                  <option value="skeptic">Skeptic</option>
                  <option value="synthesizer">Synthesizer</option>
                </select>
              </label>
            </>
          )}
          {step === 5 && (
            <>
              {/* Collaboration: role archetype + adversarial review targets.
                  Drives reviewer / synthesizer selection in the multi-agent
                  TeamRoom (Python sidecar, AgentScope-backed). */}
              <label className="block">
                <span className="text-[11px] text-[#525252] font-medium">Role archetype</span>
                <select value={form.role_archetype}
                  onChange={e => setForm({ ...form, role_archetype: e.target.value })}
                  className="w-full h-9 px-3 mt-1 text-[13px] border border-[#e3e0db] rounded-[6px]">
                  {ROLE_ARCHETYPES.map(r => (
                    <option key={r.id || 'generalist'} value={r.id}>{r.label}</option>
                  ))}
                </select>
                <span className="text-[10px] text-[#a3a3a3]">
                  Decides how this employee is picked as proposer / reviewer / synthesizer in team tasks.
                </span>
              </label>
              <div>
                <span className="text-[11px] text-[#525252] font-medium block mb-1">
                  Likes to challenge (adversarial reviewer)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {ROLE_ARCHETYPES.filter(r => r.id).map(r => (
                    <label key={r.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-[#f3f1ec] rounded cursor-pointer">
                      <input type="checkbox"
                        checked={form.peer_review_targets.includes(r.id)}
                        onChange={() => togglePeerReviewTarget(r.id)} />
                      <span className="text-[12px] text-[#525252]">{r.label.split(' — ')[0]}</span>
                    </label>
                  ))}
                </div>
                <span className="text-[10px] text-[#a3a3a3] block mt-1">
                  When another team-mate with one of these roles proposes a claim, this employee gets picked as a reviewer.
                </span>
              </div>
            </>
          )}
          {step === 6 && (
            <>
              <span className="text-[11px] text-[#525252] font-medium block mb-2">Enabled Simulation Actions</span>
            </>
          )}
          {step === 6 && (
            <>
              <span className="text-[11px] text-[#525252] font-medium block mb-2">Enabled Simulation Actions</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'hivemind_recall',
                  'hivemind_save_memory',
                  'hivemind_slack_post',
                  'hivemind_slack_react',
                  'hivemind_slack_search',
                  'hivemind_slack_history',
                  'hivemind_web_search',
                  'hivemind_web_crawl',
                ].map(t => (
                  <label key={t} className="flex items-center gap-2 p-1.5 hover:bg-[#f3f1ec] rounded cursor-pointer">
                    <input type="checkbox" checked={form.tools.includes(t)}
                      onChange={() => toggleTool(t)} />
                    <span className="text-[12px] text-[#525252]">{TOOL_COPY[t] || t}</span>
                  </label>
                ))}
              </div>
              <div className="p-3 bg-[#faf9f4] rounded-[6px] mt-3 border border-[#eae7e1]">
                <span className="text-[10px] uppercase text-[#a3a3a3] font-semibold tracking-wide">Summary</span>
                <div className="text-[12px] text-[#525252] mt-1">
                  <strong>{form.name || '(no name)'}</strong> · {form.model} · scope: {form.scope} · role: {form.role_archetype}
                  {form.slack_team_id && <> · slack: <span className="font-mono">{form.slack_team_id}</span></>}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-[11px] text-[#dc2626]">
              <AlertCircle size={12} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#eae7e1] flex items-center justify-between">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}
            className="px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec] rounded disabled:opacity-30">
            Back
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-3 py-2 text-[12px] text-[#525252] hover:bg-[#f3f1ec] rounded">
              Cancel
            </button>
            {step < 6 ? (
              <button onClick={() => setStep(step + 1)}
                disabled={step === 1 && !form.name.trim()}
                className="px-4 py-2 text-[12px] bg-[#117dff] text-white rounded hover:bg-[#0066e0] disabled:opacity-50">
                Next
              </button>
            ) : (
              <button onClick={submit} disabled={submitting || !form.name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] bg-[#117dff] text-white rounded hover:bg-[#0066e0] disabled:opacity-50">
                {submitting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Create
              </button>
            )}
          </div>
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
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

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
      setWorkspaceOpen(true);
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

  const running = employees.filter(e => e.status === 'running').length;
  const paused = employees.filter(e => e.status === 'paused').length;
  const draft = employees.filter(e => e.status === 'draft').length;

  const runningEmployees = useMemo(() => employees.filter(e => e.status === 'running'), [employees]);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
            Digital Employees
          </h1>
          <p className="text-[12px] text-[#a3a3a3] mt-1">
            Autonomous AI agents with HIVEMIND memory + Slack access. {employees.length} total · {running} running · {paused} paused · {draft} draft.
          </p>
        </div>
        <div className="flex justify-center">
          <WorkspaceToggle value={surface} onChange={(next) => {
            setSurface(next);
            if (next === 'workspace') {
              setWorkspaceOpen(true);
              setChatEmployee(null);
            }
          }} />
        </div>
        <div className="flex justify-end gap-2">
          {surface === 'workspace' && (
            <button onClick={() => setWorkspaceOpen(true)} className="flex items-center gap-1.5 rounded-[6px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] hover:bg-[#faf9f4]">
              <Users size={13} />
              Workspace panel
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
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#117dff] text-white text-[12px] hover:bg-[#0066e0]">
            <Plus size={13} />
            New Employee
          </button>
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
          {surface === 'workspace' && (
            <div className="rounded-[10px] border border-[#e3e0db] bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Workspace mode</h2>
                  <p className="mt-1 text-[12px] text-[#737373]">Use the right-side preview window to run a team task across 2 or more running employees and watch the transcript stream in place.</p>
                </div>
                <button onClick={() => setWorkspaceOpen(true)} className="rounded-[6px] bg-[#117dff] px-3 py-2 text-[12px] text-white hover:bg-[#0066e0]">
                  Open workspace
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {runningEmployees.map(emp => (
                  <span key={emp.id} className="rounded-full border border-[#e3e0db] bg-[#faf9f4] px-3 py-1.5 text-[11px] text-[#525252]">
                    {emp.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {employees.map(emp => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                onPause={handlePause}
                onResume={handleResume}
                onArchive={handleArchive}
                onOpen={handleOpen}
              />
            ))}
          </div>
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

      {workspaceOpen && (
        <WorkspacePreview employees={employees} onClose={() => setWorkspaceOpen(false)} />
      )}
    </div>
  );
}
