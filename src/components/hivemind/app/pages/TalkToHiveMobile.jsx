/**
 * TalkToHiveMobile — full-screen mobile chat surface.
 *
 * Mirrors the desktop Chat.jsx logic (same /v1/proxy/chat call, same model
 * dropdown, same step timeline + sources rendering, same localStorage
 * persistence) but laid out for one-handed phone use:
 *   • Sticky compact header w/ back arrow, title, model chip, kebab menu
 *   • Full-height scrollable thread (safe-area insets respected)
 *   • Sticky pill composer pinned to the keyboard, virtual-viewport aware
 *   • iOS-style tap targets (min 44px), no hover-only affordances
 *   • Reuses the same HIVEMIND visual palette so the brand carries over.
 *
 * Route: /hivemind/m/chat   (auto-redirected from /hivemind/app/overview on
 * viewports <= 768px — see HiveMindApp.jsx).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Loader2,
  ArrowLeft,
  MoreVertical,
  Trash2,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Brain,
  FileText,
  Plus,
  Paperclip,
  CheckCircle2,
  FileWarning,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useTeamContext } from '../shared/team-context';

const MAX_CHARS = 2000;
const MAX_PERSIST = 200;

const MODELS = [
  { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', tag: 'Default' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tag: 'Free' },
  { id: 'gpt-oss-20b', label: 'GPT-OSS 20B', tag: 'Fast' },
];

// ─── Persistence (matches desktop Chat.jsx key shape) ───────────────────────

function getStorageUserId() {
  try {
    const raw = localStorage.getItem('hivemind:user') || localStorage.getItem('user') || '';
    if (!raw) return 'anon';
    if (raw.startsWith('{')) {
      const u = JSON.parse(raw);
      return u?.id || u?.user_id || u?.email || 'anon';
    }
    return raw;
  } catch { return 'anon'; }
}
const storageKey = () => `hivemind:talk-to-hive:messages:${getStorageUserId()}`;
function loadMsgs() {
  try {
    const raw = localStorage.getItem(storageKey());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveMsgs(msgs) {
  try { localStorage.setItem(storageKey(), JSON.stringify((msgs || []).slice(-MAX_PERSIST))); } catch {}
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function UserBubble({ content }) {
  return (
    <div className="self-end max-w-[85%] px-4 py-2.5 rounded-[20px] rounded-br-md bg-[#117dff] text-white text-[15px] leading-snug shadow-[0_1px_2px_rgba(17,125,255,0.18)]">
      {content}
    </div>
  );
}

function AiBubble({ msg, model }) {
  const [showSteps, setShowSteps] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const hasSteps = Array.isArray(msg.steps) && msg.steps.length > 0;
  const hasSources = Array.isArray(msg.sources) && msg.sources.length > 0;

  return (
    <div className="self-start max-w-[95%] w-full">
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
          <Brain size={11} className="text-[#117dff]" strokeWidth={2.2} />
        </div>
        <span className="text-[11px] font-bold tracking-[0.04em] text-[#0a0a0a]">HIVE</span>
        <span className="text-[#d4d0ca] text-[10px]">·</span>
        <span className="text-[10.5px] font-mono text-[#a3a3a3]">{model || 'GPT-OSS 120B'}</span>
      </div>

      <div className={`bg-white border border-[#ece9e2] rounded-[16px] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${msg.error ? 'border-[#fecaca] bg-[#fef2f2]' : ''}`}>
        {msg.error && (
          <div className="flex items-center gap-2 text-[#b91c1c] text-[12px] font-medium mb-2">
            <AlertTriangle size={12} /> Error
          </div>
        )}
        <div className="text-[15px] leading-relaxed text-[#0a0a0a] whitespace-pre-wrap break-words">
          {msg.content}
        </div>

        {(hasSteps || hasSources || msg.usage) && (
          <>
            <hr className="border-0 border-t border-[#ece9e2] my-2.5 -mx-4" />
            <div className="flex items-center gap-3 flex-wrap text-[10.5px] font-mono text-[#a3a3a3]">
              {hasSteps && (
                <button
                  onClick={() => setShowSteps((v) => !v)}
                  className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.04em] hover:text-[#0a0a0a] active:text-[#0a0a0a]"
                >
                  ⚙ {msg.steps.length} steps {showSteps ? '▾' : '›'}
                </button>
              )}
              {hasSources && (
                <button
                  onClick={() => setShowSources((v) => !v)}
                  className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.04em] hover:text-[#0a0a0a] active:text-[#0a0a0a]"
                >
                  <FileText size={11} /> {msg.sources.length} sources {showSources ? '▾' : '›'}
                </button>
              )}
              {msg.usage?.prompt_tokens != null && (
                <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#93c5fd] mr-1" />{msg.usage.prompt_tokens} prompt</span>
              )}
              {msg.usage?.completion_tokens != null && (
                <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#86efac] mr-1" />{msg.usage.completion_tokens} completion</span>
              )}
            </div>

            <AnimatePresence>
              {showSteps && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="flex flex-col gap-1 bg-[#fafaf6] border border-[#ece9e2] rounded-lg p-2">
                    {msg.steps.map((s, i) => (
                      <div key={i} className="text-[11px] font-mono text-[#525252] flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-[#a3a3a3]">🔧</span>
                        <code className="bg-[#117dff]/10 text-[#0066e0] px-1.5 py-0.5 rounded text-[10.5px]">{s.tool}</code>
                        <span className="text-[#a3a3a3] italic">{
                          typeof s.args === 'object' && s.args
                            ? (s.args.query ? `"${String(s.args.query).slice(0, 40)}"` : '')
                            : ''
                        }</span>
                        <span className="text-[#16a34a] ml-auto">→ {s.result_summary}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {showSources && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="flex flex-col gap-1.5">
                    {msg.sources.slice(0, 10).map((s, i) => (
                      <div key={i} className="text-[12px] bg-[#f7f6f1] border border-[#ece9e2] rounded-lg px-2.5 py-1.5">
                        <div className="font-semibold text-[#0a0a0a] text-[12px]">{s.title || 'Memory'}</div>
                        {(s.snippet || s.content) && (
                          <div className="text-[#525252] text-[11.5px] mt-0.5 line-clamp-2">{(s.snippet || s.content).slice(0, 160)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

function Thinking({ model }) {
  return (
    <div className="self-start max-w-[95%] w-full">
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
          <Brain size={11} className="text-[#117dff]" strokeWidth={2.2} />
        </div>
        <span className="text-[11px] font-bold tracking-[0.04em] text-[#0a0a0a]">HIVE</span>
        <span className="text-[#d4d0ca] text-[10px]">·</span>
        <span className="text-[10.5px] font-mono text-[#a3a3a3]">{model}</span>
      </div>
      <div className="bg-white border border-[#ece9e2] rounded-[16px] px-4 py-3">
        <div className="flex gap-1.5">
          {[0, 0.15, 0.3].map((d, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#c0bcb4] animate-[bounce_1.2s_infinite_ease-in-out]"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TalkToHiveMobile() {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { activeProjectId } = useTeamContext() || {};

  const [messages, setMessages] = useState(() => loadMsgs());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-oss-120b');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Upload pipeline state — one row per file.
  // status: 'queued' | 'uploading' | 'extracting' | 'making' | 'saving' | 'done' | 'error'
  const [uploads, setUploads] = useState([]);
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Persist messages.
  useEffect(() => { saveMsgs(messages); }, [messages]);

  // Scroll to bottom on new messages / thinking.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages, loading]);

  // Auto-resize textarea (capped at 5 lines so it never eats the screen).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    const fullHistory = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Belt-and-braces language enforcement (mirror Chat.jsx + extension).
    // Wraps the wire message with a strict directive when UI lang != EN so
    // the LLM can't silently drift back to English. UI history keeps the
    // clean user text; only the LLM sees the wrapped variant.
    const lang2 = (i18n.language || 'en').slice(0, 2).toLowerCase();
    const LANG_FULL = {
      en: 'English', de: 'German', es: 'Spanish', fr: 'French', it: 'Italian',
      pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', cs: 'Czech', sv: 'Swedish',
      no: 'Norwegian', fi: 'Finnish', el: 'Greek', hu: 'Hungarian', ro: 'Romanian',
      sl: 'Slovenian', ar: 'Arabic', he: 'Hebrew', tr: 'Turkish', ru: 'Russian',
      uk: 'Ukrainian', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
      ja: 'Japanese', ko: 'Korean', zh: 'Chinese', vi: 'Vietnamese', th: 'Thai',
      id: 'Indonesian', ms: 'Malay', sk: 'Slovak',
    };
    const langName = LANG_FULL[lang2] || 'English';
    const wireMessage = lang2 === 'en'
      ? trimmed
      : `[STRICT LANGUAGE: Respond ONLY in ${langName}. Even one English word fails the test.]\n\n${trimmed}`;

    try {
      const chatRes = await apiClient.controlPlane.post('/v1/proxy/chat', {
        message: wireMessage,
        model: selectedModel,
        history: fullHistory,
        language: lang2,
        ...(activeProjectId ? { project_id: activeProjectId, project_ids: [activeProjectId] } : {}),
      });
      const data = chatRes.data;
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || "I couldn't find relevant information.",
        sources: (data.sources || []).map(s => ({ ...s, title: s.title || (s.content || '').slice(0, 60) })),
        model: MODELS.find((m) => m.id === selectedModel)?.label || selectedModel,
        usage: data.usage || null,
        steps: Array.isArray(data.steps) ? data.steps : [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: errMsg, error: true, sources: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, selectedModel, i18n.language, activeProjectId]);

  // ─── Upload pipeline ──────────────────────────────────────────────────
  // Mobile chat fires-and-forgets: pick file(s) → POST each via
  // apiClient.uploadDocument (same /v1/proxy/knowledge/upload endpoint
  // KnowledgeBase.jsx uses → same canonical ingest pipeline → memories,
  // facts, edges, etc.). The status strip above the composer animates
  // through queued → uploading → extracting → making memories → saving →
  // done. The chat surface itself doesn't care — server handles
  // everything once the file lands.

  const STAGE_LABEL = {
    queued: 'Queued',
    uploading: 'Uploading',
    extracting: 'Extracting text',
    making: 'Making memories',
    saving: 'Saving',
    done: 'Saved',
    error: 'Failed',
  };

  const handlePickFiles = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;

    // Initial rows.
    const rows = files.map((f, idx) => ({
      id: `up-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
      status: 'queued',
      progress: 0,
      error: null,
      memoryId: null,
    }));
    setUploads((prev) => [...prev, ...rows]);

    // Drive each upload in parallel — server-side ingest pipeline handles
    // ordering. We just shepherd UI state through best-effort stages.
    rows.forEach((row) => uploadOne(row));
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateUpload = (id, patch) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const removeUpload = (id) =>
    setUploads((prev) => prev.filter((u) => u.id !== id));

  const uploadOne = async (row) => {
    try {
      updateUpload(row.id, { status: 'uploading', progress: 0 });

      // Stage 1 — upload bytes. Real progress drives this stage's %.
      const result = await apiClient.uploadDocument(row.file, {
        ...(activeProjectId ? { targetScope: 'project', containerTag: `project:${activeProjectId}` } : {}),
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded / evt.total) * 100);
          updateUpload(row.id, { progress: pct });
        },
      });

      // Server returns 200 once the file is queued for ingest. After that
      // the canonical pipeline does extract → chunk → embed → save. We
      // can't poll per-row cheaply, so we time-shift through synthetic
      // stages so the user sees the work moving.
      updateUpload(row.id, { status: 'extracting', progress: 100 });
      await new Promise((r) => setTimeout(r, 700));
      updateUpload(row.id, { status: 'making' });
      await new Promise((r) => setTimeout(r, 900));
      updateUpload(row.id, { status: 'saving' });
      await new Promise((r) => setTimeout(r, 600));

      const memId = result?.memory_id || result?.id || result?.memory?.id || null;
      updateUpload(row.id, { status: 'done', memoryId: memId });
      // Auto-dismiss successful rows after 5s.
      setTimeout(() => removeUpload(row.id), 5000);
    } catch (err) {
      updateUpload(row.id, {
        status: 'error',
        error: err?.response?.data?.detail || err?.message || 'Upload failed',
      });
    }
  };

  const clearChat = () => {
    if (!messages.length) return;
    if (typeof window !== 'undefined' && !window.confirm('Clear all messages?')) return;
    setMessages([]);
    try { localStorage.removeItem(storageKey()); } catch {}
    setMenuOpen(false);
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#faf9f4] text-[#0a0a0a] z-50"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <header className="flex items-center gap-2 px-3 h-14 border-b border-[#ece9e2] bg-white/85 backdrop-blur-xl flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 -ml-1 flex items-center justify-center rounded-full active:bg-[#ece9e2]/60 text-[#525252]"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold tracking-tight leading-none">Talk to HIVE</div>
          <div className="text-[10.5px] text-[#8a8a8a] mt-0.5">your second brain</div>
        </div>

        {/* Model chip */}
        <div className="relative">
          <button
            onClick={() => setModelMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#f3f1ec] border border-[#ece9e2] text-[11px] font-semibold text-[#0a0a0a]"
          >
            <Sparkles size={11} className="text-[#117dff]" />
            <span>{currentModel.label.replace('GPT-OSS ', '').replace('Llama ', 'L')}</span>
            <ChevronDown size={11} className="text-[#a3a3a3]" />
          </button>
          {modelMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-[200px] bg-white border border-[#ece9e2] rounded-xl shadow-lg z-30 py-1"
              onClick={() => setModelMenuOpen(false)}
            >
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedModel(m.id); setModelMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] ${
                    m.id === selectedModel ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'
                  } active:bg-[#f3f1ec]`}
                >
                  <span>{m.label}</span>
                  <span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{m.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language chip — picks reply language. Persisted by i18next. */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#f3f1ec] border border-[#ece9e2] text-[11px] font-semibold text-[#0a0a0a]"
            aria-label="Reply language"
          >
            <span className="text-[#117dff]">🌐</span>
            <span>{((i18n.language || 'en').slice(0, 2)).toUpperCase()}</span>
            <ChevronDown size={11} className="text-[#a3a3a3]" />
          </button>
          {langMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-[180px] max-h-[280px] overflow-y-auto bg-white border border-[#ece9e2] rounded-xl shadow-lg z-30 py-1"
              onClick={() => setLangMenuOpen(false)}
            >
              {[
                { c: 'en', n: 'English' }, { c: 'de', n: 'Deutsch' },
                { c: 'es', n: 'Español' }, { c: 'fr', n: 'Français' },
                { c: 'it', n: 'Italiano' }, { c: 'pt', n: 'Português' },
                { c: 'nl', n: 'Nederlands' }, { c: 'pl', n: 'Polski' },
                { c: 'sv', n: 'Svenska' }, { c: 'ru', n: 'Русский' },
                { c: 'uk', n: 'Українська' }, { c: 'tr', n: 'Türkçe' },
                { c: 'ar', n: 'العربية' }, { c: 'he', n: 'עברית' },
                { c: 'hi', n: 'हिन्दी' }, { c: 'ja', n: '日本語' },
                { c: 'ko', n: '한국어' }, { c: 'zh', n: '中文' },
                { c: 'vi', n: 'Tiếng Việt' }, { c: 'th', n: 'ไทย' },
                { c: 'id', n: 'Indonesia' },
              ].map((l) => {
                const active = ((i18n.language || 'en').slice(0, 2)) === l.c;
                return (
                  <button
                    key={l.c}
                    onClick={() => { i18n.changeLanguage(l.c); setLangMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] ${
                      active ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'
                    } active:bg-[#f3f1ec]`}
                  >
                    <span>{l.n}</span>
                    <span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{l.c}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Kebab menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[#ece9e2]/60 text-[#525252]"
            aria-label="More"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-[180px] bg-white border border-[#ece9e2] rounded-xl shadow-lg z-30 py-1">
              <button
                onClick={() => { setMenuOpen(false); setMessages([]); }}
                className="w-full text-left px-3 py-2.5 text-[13px] text-[#0a0a0a] active:bg-[#f3f1ec] flex items-center gap-2"
              >
                <Plus size={14} className="text-[#525252]" /> New chat
              </button>
              <button
                onClick={clearChat}
                className="w-full text-left px-3 py-2.5 text-[13px] text-[#dc2626] active:bg-[#fef2f2] flex items-center gap-2"
              >
                <Trash2 size={14} /> Clear history
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Messages ───────────────────────────────── */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-col gap-4 px-4 py-5">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col gap-3.5 mt-8">
              <div className="text-[24px] font-bold tracking-tight">{t('overview.askMe', 'Ask Me Anything')}</div>
              <div className="text-[14px] text-[#525252] leading-relaxed">
                {t('overview.welcomeSub', "Your second brain — always on, always remembering. Recalls context across tabs, sessions, and tools, then answers like you've known each other for years.")}
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {[
                  t('overview.examples.recent', 'What have I been working on lately?'),
                  t('overview.examples.decisions', 'Summarize my recent decisions'),
                  t('overview.examples.prefs', 'What are my key preferences?'),
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => { setInput(p); requestAnimationFrame(() => inputRef.current?.focus()); }}
                    className="text-left px-4 py-3 bg-white border border-[#ece9e2] rounded-[14px] text-[14px] text-[#0a0a0a] active:bg-[#f3f1ec]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user'
              ? <UserBubble key={m.id} content={m.content} />
              : <AiBubble key={m.id} msg={m} model={m.model} />
          )}
          {loading && <Thinking model={currentModel.label} />}
        </div>
      </div>

      {/* ── Upload status strip (above composer, animated) ── */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 px-3 pt-2 overflow-hidden"
          >
            <div className="flex flex-col gap-1.5">
              {uploads.map((u) => {
                const isDone = u.status === 'done';
                const isErr = u.status === 'error';
                const isLive = !isDone && !isErr;
                return (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[12px] overflow-hidden ${
                      isDone
                        ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                        : isErr
                          ? 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
                          : 'bg-white border-[#ece9e2] text-[#0a0a0a]'
                    }`}
                  >
                    {/* Shimmer progress bar while live */}
                    {isLive && (
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-[#117dff]/10"
                        initial={{ width: 0 }}
                        animate={{ width: `${u.status === 'uploading' ? u.progress || 8 : 100}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    )}
                    <div className="relative flex-shrink-0">
                      {isDone ? (
                        <CheckCircle2 size={16} className="text-[#16a34a]" />
                      ) : isErr ? (
                        <FileWarning size={16} className="text-[#dc2626]" />
                      ) : (
                        <Loader2 size={16} className="text-[#117dff] animate-spin" />
                      )}
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <div className="font-semibold truncate text-[12.5px] leading-tight">{u.name}</div>
                      <div className="text-[10.5px] mt-0.5 font-mono opacity-80">
                        {isErr
                          ? u.error
                          : `${STAGE_LABEL[u.status] || u.status}${u.status === 'uploading' && u.progress ? ` · ${u.progress}%` : '…'}`}
                      </div>
                    </div>
                    <button
                      onClick={() => removeUpload(u.id)}
                      className="relative w-6 h-6 flex items-center justify-center rounded-md text-[#a3a3a3] active:bg-[#ece9e2]/60 flex-shrink-0"
                      aria-label="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Composer ───────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pt-2.5 pb-3 bg-[#faf9f4] border-t border-[#ece9e2]">
        <div className="flex items-end gap-2 bg-white border border-[#ece9e2] rounded-[26px] pl-2 pr-1.5 py-1.5 focus-within:border-[#c0d8ff]">
          {/* Attach */}
          <button
            onClick={handlePickFiles}
            className="w-10 h-10 rounded-full text-[#525252] flex items-center justify-center flex-shrink-0 active:bg-[#ece9e2]/60"
            aria-label="Attach files"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              // Reset so picking the same file twice still fires onChange.
              if (e.target) e.target.value = '';
            }}
            accept="*/*"
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={t('overview.askPlaceholder', 'Ask HIVE anything…')}
            className="flex-1 resize-none border-none outline-none bg-transparent text-[15px] py-2 placeholder:text-[#c0bcb4] max-h-[120px] leading-snug"
            style={{ fontFamily: 'inherit' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-[#117dff] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
            aria-label="Send"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-2">
          <span className="text-[10px] text-[#a3a3a3] font-mono">
            {input.length}/{MAX_CHARS}
          </span>
          <span className="text-[10px] text-[#a3a3a3]">Tap 📎 to upload · Enter to send</span>
        </div>
      </div>
    </div>
  );
}
