import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import apiClient from '../shared/api-client';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tag: 'Free', group: 'groq' },
  { id: 'deepseek-r1-distill-llama-70b', label: 'GPT-OSS 120B', tag: 'Reasoning', group: 'groq' },
  { id: 'deepseek-r1-distill-qwen-7b', label: 'GPT-OSS 20B', tag: 'Fast', group: 'groq' },
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

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

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
              <span>{msg.content}</span>
            </div>
          ) : (
            msg.content
          )}
          <Sources sources={msg.sources} />
        </div>
      </div>
    </motion.div>
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
          Ask anything about your memories. HIVE has access to your entire knowledge graph.
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
        <span className="truncate max-w-[140px]">{selected.label}</span>
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
            className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[#e3e0db] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-50 overflow-hidden py-1"
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

// ─── Main Chat Page ───────────────────────────────────────────────────────────

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

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

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Step 1: Recall memories
      let sources = [];
      let injectionText = '';

      try {
        const recallRes = await apiClient.controlPlane.post('/v1/proxy/recall', {
          query_context: trimmed,
          max_memories: 5,
        });
        const recallData = recallRes.data;
        sources = recallData.memories || recallData.results || [];
        injectionText = recallData.injection_text || recallData.context || '';
      } catch (recallErr) {
        // Recall failure is non-fatal — continue with empty context
        console.warn('[Chat] recall failed:', recallErr?.message);
      }

      // Step 2: Format the assistant response from recall data
      let responseContent = '';

      if (injectionText) {
        responseContent = injectionText;
      } else if (sources.length > 0) {
        const lines = sources.map((s, i) => {
          const title = s.title || s.content?.slice(0, 80) || `Memory ${i + 1}`;
          return `${i + 1}. ${title}`;
        });
        responseContent = `Here are the most relevant memories I found:\n\n${lines.join('\n')}`;
      } else {
        responseContent =
          "I searched your memory graph but couldn't find anything directly relevant to your query. Try rephrasing or adding more memories.";
      }

      // Append notice about full LLM chat
      const modelLabel = MODELS.find((m) => m.id === selectedModel)?.label || selectedModel;
      const notice =
        sources.length > 0
          ? `\n\n_Full LLM generation with ${modelLabel} requires model API key configuration (coming soon)._`
          : '';

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseContent + notice,
        sources,
        model: modelLabel,
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
  }, [input, loading, selectedModel]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const charCount = input.length;
  const overLimit = charCount > MAX_CHARS;

  return (
    <div className="flex flex-col h-full bg-[#faf9f4] font-['Space_Grotesk']">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 bg-white border-b border-[#e3e0db] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#117dff]/[0.07] border border-[#117dff]/10 flex items-center justify-center">
            <Brain size={16} className="text-[#117dff]" />
          </div>
          <div>
            <h1 className="text-[#0a0a0a] text-[15px] font-semibold leading-tight">Talk to HIVE</h1>
            <p className="text-[#a3a3a3] text-[10px] font-mono leading-tight">
              Memory-augmented AI assistant
            </p>
          </div>
        </div>
        <ModelSelector selectedId={selectedModel} onSelect={setSelectedModel} />
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4">
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
      <div className="flex-shrink-0 px-4 sm:px-8 py-4 bg-white border-t border-[#e3e0db]">
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
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
