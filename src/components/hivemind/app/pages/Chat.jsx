import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Send,
  ChevronDown,
  Loader2,
  FileText,
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  Trash2,
  X,
} from 'lucide-react';
import apiClient from '../shared/api-client';

// ─── Persistence ──────────────────────────────────────────────────────────────
// Chat history survives browser close/reopen via localStorage. Keyed by the
// authenticated user id when available so multi-account browsers don't bleed.
// Cap at MAX_PERSIST messages to stay within the ~5MB localStorage quota.

const MAX_PERSIST = 200;

function getStorageUserId() {
  try {
    // Common auth-shape used elsewhere in da-vinci; fall back to 'anon'.
    const raw =
      localStorage.getItem('hivemind:user') ||
      localStorage.getItem('user') ||
      '';
    if (!raw) return 'anon';
    if (raw.startsWith('{')) {
      const u = JSON.parse(raw);
      return u?.id || u?.user_id || u?.email || 'anon';
    }
    return raw;
  } catch {
    return 'anon';
  }
}

function storageKey() {
  return `hivemind:talk-to-hive:messages:${getStorageUserId()}`;
}

function loadPersistedMessages() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePersistedMessages(msgs) {
  try {
    const trimmed = Array.isArray(msgs) ? msgs.slice(-MAX_PERSIST) : [];
    localStorage.setItem(storageKey(), JSON.stringify(trimmed));
  } catch {
    /* quota exceeded or storage disabled — skip silently */
  }
}

function clearPersistedMessages() {
  try {
    localStorage.removeItem(storageKey());
  } catch {
    /* ignore */
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', tag: 'Default', group: 'groq' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tag: 'Free', group: 'groq' },
  { id: 'gpt-oss-20b', label: 'GPT-OSS 20B', tag: 'Fast', group: 'groq' },
  { id: 'openai-custom', label: 'Custom (OpenAI)', disabled: true, group: 'custom' },
  { id: 'anthropic-custom', label: 'Custom (Anthropic)', disabled: true, group: 'custom' },
];

const MAX_CHARS = 2000;

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const messageVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } },
};

const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } },
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#a3a3a3]"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Sources Collapsible ──────────────────────────────────────────────────────

function Sources({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-[#e3e0db] pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-[#a3a3a3] hover:text-[#525252] transition-colors"
      >
        <FileText size={12} />
        <span className="font-mono uppercase tracking-[0.06em]">
          {sources.length} {sources.length === 1 ? 'source' : 'sources'} used
        </span>
        <ChevronRight
          size={12}
          className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2 } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {sources.map((src, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-[#faf9f4] border border-[#e3e0db]"
                >
                  <Brain size={11} className="text-[#117dff] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[#0a0a0a] font-medium truncate leading-tight">
                      {src.title || src.content?.slice(0, 60) || `Memory ${i + 1}`}
                    </p>
                    {src.score != null && (
                      <p className="text-[10px] text-[#a3a3a3] font-mono mt-0.5">
                        score {src.score.toFixed(3)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Token Usage Display ──────────────────────────────────────────────────────

function TokenUsage({ usage }) {
  if (!usage) return null;
  const { prompt_tokens, completion_tokens } = usage;
  const total = (prompt_tokens || 0) + (completion_tokens || 0);
  if (total === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-[#a3a3a3]">
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#117dff]/40" />
        {prompt_tokens || 0} prompt
      </span>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]/40" />
        {completion_tokens || 0} completion
      </span>
      <span className="text-[#c4c1bb]">· {total} total</span>
    </div>
  );
}

// ─── Slack pending-action sentinel ─────────────────────────────────────────
// Server appends `<<HIVEMIND:SLACK_PENDING>>{json}` to the assistant turn so
// the next user message can be matched as confirm/cancel against the staged
// action. UI strips this before rendering but keeps it in msg.content so the
// raw value gets sent back as history on the next /api/chat call.
const SLACK_PENDING_SENTINEL = '<<HIVEMIND:SLACK_PENDING>>';

function stripSlackPending(text) {
  if (!text) return text;
  const idx = text.indexOf(SLACK_PENDING_SENTINEL);
  return idx === -1 ? text : text.slice(0, idx).trimEnd();
}

function hasSlackPending(text) {
  return typeof text === 'string' && text.includes(SLACK_PENDING_SENTINEL);
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const displayContent = isUser ? msg.content : stripSlackPending(msg.content);
  const pendingSlack = !isUser && hasSlackPending(msg.content);

  if (isUser) {
    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        className="flex justify-end"
      >
        <div className="max-w-[72%]">
          <div className="bg-[#117dff] text-white rounded-2xl rounded-br-md px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
            {msg.content}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="flex justify-start"
    >
      <div className="max-w-[80%]">
        <div className="flex items-center gap-1.5 mb-1.5 px-1">
          <div className="w-5 h-5 rounded-full bg-[#117dff]/10 flex items-center justify-center">
            <Brain size={11} className="text-[#117dff]" />
          </div>
          <span className="text-[10px] font-mono text-[#a3a3a3] uppercase tracking-[0.06em]">HIVE</span>
          {msg.model && (
            <span className="text-[10px] font-mono text-[#c4c1bb] truncate">· {msg.model}</span>
          )}
        </div>
        <div className="bg-white border border-[#e3e0db] rounded-2xl rounded-bl-md px-4 py-3 text-[13px] leading-relaxed text-[#0a0a0a] whitespace-pre-wrap break-words shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {msg.error ? (
            <div className="flex items-start gap-2 text-[#dc2626]">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{displayContent}</span>
            </div>
          ) : (
            displayContent
          )}
          {pendingSlack && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-700">
              Slack action pending · reply confirm
            </div>
          )}
          <AgentSteps steps={msg.steps} />
          <Sources sources={msg.sources} />
          <TokenUsage usage={msg.usage} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Agent toolcall timeline ──────────────────────────────────────────────────
// ReAct agent emits steps[] = [{ tool, args, result_summary }] per /api/chat
// response. Render as a compact "Used N tools" pill that expands to show
// the per-step tool name + args summary + result. Mirrors the side-panel
// chrome extension treatment.
function AgentSteps({ steps }) {
  const [open, setOpen] = useState(false);
  if (!Array.isArray(steps) || steps.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-[#ece9e2]">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider text-[#117dff] hover:text-[#0a5fcc]"
        type="button"
      >
        <span>⚙</span>
        Used {steps.length} tool{steps.length === 1 ? '' : 's'}
        <span style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▸</span>
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {steps.map((s, i) => {
            const argStr = (() => {
              try { return JSON.stringify(s.args || {}).slice(0, 120); } catch { return ''; }
            })();
            return (
              <div key={i} className="text-[11px] leading-snug pl-2 border-l-2 border-[#117dff]/30">
                <div className="font-mono text-[#117dff]">{s.tool || '(unknown)'}</div>
                {argStr && <div className="text-[#525252] truncate" title={argStr}>args: {argStr}</div>}
                {s.result_summary && <div className="text-[#8a8a8a] truncate" title={s.result_summary}>→ {String(s.result_summary).slice(0, 140)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#117dff]/[0.07] border border-[#117dff]/10 flex items-center justify-center">
        <MessageSquare size={24} className="text-[#117dff]" />
      </div>
      <div>
        <p className="text-[#0a0a0a] text-base font-semibold font-['Space_Grotesk'] mb-1.5">
          Talk to HIVE
        </p>
        <p className="text-[#a3a3a3] text-[13px] leading-relaxed max-w-xs">
          Ask anything about your memories. HIVE answers like your second brain, not a search dump.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          'What have I been working on lately?',
          'Summarize my recent decisions',
          'What are my key preferences?',
        ].map((prompt) => (
          <span
            key={prompt}
            className="px-3 py-1.5 rounded-full text-[11px] text-[#525252] bg-white border border-[#e3e0db] font-mono cursor-default hover:border-[#117dff]/30 hover:text-[#117dff] transition-colors"
          >
            {prompt}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Model Selector ───────────────────────────────────────────────────────────

function ModelSelector({ selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = MODELS.find((m) => m.id === selectedId) || MODELS[0];

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const groqModels = MODELS.filter((m) => m.group === 'groq');
  const customModels = MODELS.filter((m) => m.group === 'custom');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e3e0db] bg-white hover:bg-[#faf9f4] transition-colors text-[12px] text-[#525252] font-['Space_Grotesk']"
      >
        <span className="truncate max-w-[120px]">{selected.label}</span>
        {selected.tag && (
          <span className="text-[9px] font-mono uppercase tracking-wider bg-[#117dff]/10 text-[#117dff] px-1.5 py-0.5 rounded">
            {selected.tag}
          </span>
        )}
        <ChevronDown size={13} className={`text-[#a3a3a3] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.1 } }}
            className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[#e3e0db] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-[60] overflow-hidden py-1"
          >
            <div className="px-3 py-1.5">
              <span className="text-[9px] font-mono text-[#a3a3a3] uppercase tracking-[0.08em]">Groq (Free)</span>
            </div>
            {groqModels.map((m) => (
              <button
                key={m.id}
                onClick={() => { onSelect(m.id); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-[12px] hover:bg-[#faf9f4] transition-colors ${
                  m.id === selectedId ? 'text-[#117dff] font-medium' : 'text-[#0a0a0a]'
                }`}
              >
                <span>{m.label}</span>
                {m.tag && (
                  <span className="text-[9px] font-mono uppercase tracking-wider bg-[#117dff]/10 text-[#117dff] px-1.5 py-0.5 rounded">
                    {m.tag}
                  </span>
                )}
              </button>
            ))}
            <div className="h-px bg-[#e3e0db] mx-3 my-1" />
            {customModels.map((m) => (
              <div
                key={m.id}
                className="relative group flex items-center justify-between px-3 py-2 text-[12px] text-[#c4c1bb] cursor-not-allowed"
              >
                <span>{m.label}</span>
                <span className="text-[9px] font-mono uppercase tracking-wider bg-[#f3f1ec] text-[#a3a3a3] px-1.5 py-0.5 rounded">
                  Soon
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Chat Panel (slide-out) ───────────────────────────────────────────────────

export function ChatPanel({ isOpen, onClose }) {
  // Hydrate from localStorage on mount so chat survives browser close/reopen.
  const [messages, setMessages] = useState(() => loadPersistedMessages());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-oss-120b');

  // Persist on every messages change (debounced via rAF to coalesce rapid bursts).
  useEffect(() => {
    const handle = requestAnimationFrame(() => savePersistedMessages(messages));
    return () => cancelAnimationFrame(handle);
  }, [messages]);

  const handleClear = useCallback(() => {
    setMessages([]);
    clearPersistedMessages();
  }, []);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  // UI language from the navbar selector — passed to /api/chat so the
  // ReAct agent replies in the user's chosen language end-to-end.
  const { i18n } = useTranslation();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyUp(e) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    document.addEventListener('keyup', handleKeyUp);
    return () => document.removeEventListener('keyup', handleKeyUp);
  }, [isOpen, onClose]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    // Build history BEFORE updating state (includes all previous messages + current user msg)
    const fullHistory = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let sources = [];
      let responseContent = '';
      let usage = null;
      let steps = [];

      try {
        const chatRes = await apiClient.controlPlane.post('/v1/proxy/chat', {
          message: trimmed,
          model: selectedModel,
          history: fullHistory,
          language: (i18n.language || 'en').slice(0, 2).toLowerCase(),
        });
        const chatData = chatRes.data;
        responseContent = chatData.response || '';
        sources = chatData.sources || [];
        usage = chatData.usage || null;
        // ReAct agent ships the tool-call timeline as steps[]. Each entry:
        //   { tool: 'hivemind_recall', args: {...}, result_summary: '9 memories' }
        // Render below the response as a collapsible "Used N tools" strip.
        steps = Array.isArray(chatData.steps) ? chatData.steps : [];
      } catch (chatErr) {
        console.warn('[Chat] chat failed:', chatErr?.message);
        responseContent = "I couldn't process your request right now. Please try again.";
      }

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseContent || "I couldn't find relevant information in your memories.",
        sources: sources.map(s => ({ ...s, title: s.title || (s.content || '').slice(0, 60) })),
        model: MODELS.find((m) => m.id === selectedModel)?.label || selectedModel,
        usage: usage,
        steps,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: errMsg,
          error: true,
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, selectedModel, messages, i18n.language]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const charCount = input.length;
  const overLimit = charCount > MAX_CHARS;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark overlay */}
          <motion.div
            key="chat-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Slide-out panel */}
          <motion.div
            key="chat-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 h-screen w-[420px] z-50 flex flex-col bg-[#faf9f4] shadow-[−8px_0_32px_rgba(0,0,0,0.12)] font-['Space_Grotesk']"
          >
            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#e3e0db] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#117dff]/[0.07] border border-[#117dff]/10 flex items-center justify-center">
                  <Brain size={16} className="text-[#117dff]" />
                </div>
                <div>
                  <h2 className="text-[#0a0a0a] text-[15px] font-semibold leading-tight">Talk to HIVE</h2>
                  <p className="text-[#a3a3a3] text-[10px] font-mono leading-tight">
                    Memory engine second brain
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ModelSelector selectedId={selectedModel} onSelect={setSelectedModel} />
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a3a3a3] hover:text-[#ef4444] hover:bg-[#f3f1ec] transition-colors"
                    aria-label="Clear chat history"
                    title="Clear chat history"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f3f1ec] transition-colors"
                  aria-label="Close chat"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
              {messages.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                  {loading && (
                    <motion.div
                      variants={messageVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex justify-start"
                    >
                      <div className="max-w-[80%]">
                        <div className="flex items-center gap-1.5 mb-1.5 px-1">
                          <div className="w-5 h-5 rounded-full bg-[#117dff]/10 flex items-center justify-center">
                            <Brain size={11} className="text-[#117dff]" />
                          </div>
                          <span className="text-[10px] font-mono text-[#a3a3a3] uppercase tracking-[0.06em]">HIVE</span>
                        </div>
                        <div className="bg-white border border-[#e3e0db] rounded-2xl rounded-bl-md shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                          <TypingDots />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Input Bar ── */}
            <div className="flex-shrink-0 px-4 py-4 bg-white border-t border-[#e3e0db]">
              <div
                className={`flex items-end gap-3 rounded-2xl border bg-[#faf9f4] px-4 py-3 transition-colors ${
                  overLimit
                    ? 'border-[#ef4444]/40 focus-within:border-[#ef4444]'
                    : 'border-[#e3e0db] focus-within:border-[#117dff]/40'
                }`}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask HIVE anything..."
                  rows={1}
                  className="flex-1 bg-transparent resize-none outline-none text-[13px] text-[#0a0a0a] placeholder-[#c4c1bb] leading-relaxed min-h-[22px] max-h-[160px] font-['Space_Grotesk']"
                />
                <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
                  {charCount > 0 && (
                    <span
                      className={`text-[10px] font-mono tabular-nums ${
                        overLimit ? 'text-[#ef4444]' : 'text-[#c4c1bb]'
                      }`}
                    >
                      {charCount}/{MAX_CHARS}
                    </span>
                  )}
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading || overLimit}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-[#117dff] text-white hover:bg-[#0066e0] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#117dff]"
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#c4c1bb] mt-2 text-center font-mono">
                Enter to send · Shift+Enter for newline · Esc to close
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Legacy default export (kept for any residual import) ─────────────────────

export default ChatPanel;
