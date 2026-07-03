import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ApiKeyPrompt from '../shared/ApiKeyPrompt';
import {
  Server, Copy, Check, ChevronDown, ChevronRight,
  Brain, Search, Globe, Trash2, RefreshCw, BookOpen,
  Zap, Link2, MessageSquare, FileText, Network,
  HelpCircle, Terminal, Clipboard,
  Code, Bug, GitBranch, FlaskConical, History, Clock, GitCommit, HelpingHand,
} from 'lucide-react';

/* ─── Animation ──────────────────────────────────────────────────── */
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.04 } } };

/* ─── Copy button ────────────────────────────────────────────────── */
function CopyButton({ text, label }) {
  const { t } = useTranslation('dashboard');
  const defaultLabel = t('mcpserver.copy', 'Copy');
  const displayLabel = label !== undefined ? label : defaultLabel;
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Space_Grotesk'] font-medium transition-all border border-[#e3e0db] hover:border-[#117dff]/30 bg-white text-[#525252] hover:text-[#117dff]"
    >
      {copied ? <><Check size={12} className="text-[#16a34a]" /> {t('mcpserver.copied', 'Copied')}</> : <><Copy size={12} /> {displayLabel}</>}
    </button>
  );
}

/* ─── Tool card ──────────────────────────────────────────────────── */
function ToolCard({ tool }) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const Icon = tool.icon;
  return (
    <motion.div variants={fadeUp} className="bg-white border border-[#e3e0db] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#faf9f4]/50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tool.colorClass}`}>
          <Icon size={14} className="text-current" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-['Space_Grotesk'] text-[#0a0a0a] truncate">
            {tool.name}
          </p>
          <p className="text-[11px] text-[#a3a3a3] font-['Space_Grotesk'] truncate">{tool.summary}</p>
        </div>
        {tool.badge && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase tracking-wider border ${tool.badgeClass}`}>
            {tool.badge}
          </span>
        )}
        {open ? <ChevronDown size={14} className="text-[#a3a3a3] shrink-0" /> : <ChevronRight size={14} className="text-[#a3a3a3] shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[#e3e0db]/50">
              <p className="text-xs text-[#525252] font-['Space_Grotesk'] mt-3 leading-relaxed">{tool.description}</p>
              {tool.params && (
                <div className="mt-3">
                  <p className="text-[10px] text-[#a3a3a3] font-mono uppercase tracking-wider mb-1.5">{t('mcpserver.parameters', 'Parameters')}</p>
                  <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg p-3 space-y-1.5">
                    {tool.params.map(p => (
                      <div key={p.name} className="flex items-start gap-2">
                        <code className="text-[11px] font-mono text-[#117dff] shrink-0">{p.name}</code>
                        {p.required && <span className="text-[9px] text-[#dc2626] font-mono mt-0.5">*</span>}
                        <span className="text-[11px] text-[#525252] font-['Space_Grotesk']">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tool.example && (
                <div className="mt-3">
                  <p className="text-[10px] text-[#a3a3a3] font-mono uppercase tracking-wider mb-1.5">{t('mcpserver.example', 'Example')}</p>
                  <div className="relative">
                    <pre className="bg-[#1e1e2e] text-[#cdd6f4] text-[11px] font-mono rounded-lg p-3 overflow-x-auto leading-relaxed">
                      {tool.example}
                    </pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={tool.example} label="" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Tool data ──────────────────────────────────────────────────── */
export const MEMORY_TOOLS = [
  {
    name: 'hivemind_save_memory',
    icon: Brain,
    colorClass: 'bg-[#117dff]/10 text-[#117dff]',
    summary: 'Save facts, code, decisions to persistent memory',
    description: 'Use when the user shares a fact, preference, decision, code snippet, or anything worth remembering across sessions. Always tag memories for precise future retrieval.',
    params: [
      { name: 'title', required: true, desc: 'Short descriptive title' },
      { name: 'content', required: true, desc: 'The content to remember' },
      { name: 'tags', required: false, desc: 'Array of topic tags (e.g. ["react", "api-design"])' },
      { name: 'source_type', required: false, desc: 'text | code | conversation | documentation | decision' },
      { name: 'project', required: false, desc: 'Project this belongs to' },
      { name: 'relationship', required: false, desc: 'update | extend | derive — relation to existing memory' },
      { name: 'related_to', required: false, desc: 'Memory ID this relates to' },
    ],
    example: `hivemind_save_memory({
  title: "Prefers Tailwind over CSS modules",
  content: "User confirmed they use Tailwind CSS for all projects. Avoid suggesting CSS modules.",
  tags: ["preference", "css", "tailwind"],
  source_type: "decision"
})`,
  },
  {
    name: 'hivemind_recall',
    icon: Search,
    colorClass: 'bg-[#16a34a]/10 text-[#16a34a]',
    summary: 'Search memories — call FIRST before answering questions',
    description: 'Use to find previously stored information. Call this FIRST if the user references past conversations, preferences, or stored knowledge. Supports three search modes.',
    params: [
      { name: 'query', required: true, desc: 'Describe what you\'re looking for' },
      { name: 'mode', required: false, desc: 'quick (fast) | panorama (temporal) | insight (AI-powered)' },
      { name: 'limit', required: false, desc: 'Max results (1-20, default 5)' },
      { name: 'tags', required: false, desc: 'Filter by tags' },
      { name: 'project', required: false, desc: 'Filter by project' },
    ],
    example: `hivemind_recall({
  query: "user's preferred tech stack",
  mode: "quick",
  limit: 5
})`,
  },
  {
    name: 'hivemind_get_memory',
    icon: FileText,
    colorClass: 'bg-[#117dff]/10 text-[#117dff]',
    summary: 'Get full memory by ID',
    description: 'Use when you have a memory ID and need the complete content.',
    params: [{ name: 'memory_id', required: true, desc: 'The unique memory ID' }],
    example: `hivemind_get_memory({ memory_id: "abc-123" })`,
  },
  {
    name: 'hivemind_list_memories',
    icon: BookOpen,
    colorClass: 'bg-[#117dff]/10 text-[#117dff]',
    summary: 'Browse memories with filters and pagination',
    description: 'Use when the user asks "show me my memories about X" or wants to browse.',
    params: [
      { name: 'tags', required: false, desc: 'Filter by tags' },
      { name: 'project', required: false, desc: 'Filter by project' },
      { name: 'limit', required: false, desc: 'Max results (1-100)' },
      { name: 'page', required: false, desc: 'Page number' },
    ],
    example: `hivemind_list_memories({ tags: ["react"], limit: 10 })`,
  },
  {
    name: 'hivemind_update_memory',
    icon: RefreshCw,
    colorClass: 'bg-[#d97706]/10 text-[#d97706]',
    summary: 'Correct or modify a stored memory',
    description: 'Use when a stored fact is outdated and needs correction.',
    params: [
      { name: 'memory_id', required: true, desc: 'Memory ID to update' },
      { name: 'title', required: false, desc: 'New title' },
      { name: 'content', required: false, desc: 'New content' },
      { name: 'tags', required: false, desc: 'New tags (replaces existing)' },
    ],
    example: `hivemind_update_memory({ memory_id: "abc-123", content: "Updated fact" })`,
  },
  {
    name: 'hivemind_delete_memory',
    icon: Trash2,
    colorClass: 'bg-[#dc2626]/10 text-[#dc2626]',
    summary: 'Permanently delete a memory',
    description: 'Use only when the user explicitly asks to forget something. Deletion is permanent.',
    params: [
      { name: 'memory_id', required: true, desc: 'Memory ID to delete' },
      { name: 'reason', required: false, desc: 'Reason for deletion (audit log)' },
    ],
    example: `hivemind_delete_memory({ memory_id: "abc-123", reason: "user requested" })`,
  },
  {
    name: 'hivemind_save_conversation',
    icon: MessageSquare,
    colorClass: 'bg-[#117dff]/10 text-[#117dff]',
    summary: 'Save a conversation summary to memory',
    description: 'Use at the end of meaningful conversations. Summarise — don\'t dump raw transcripts.',
    params: [
      { name: 'title', required: true, desc: 'Conversation topic' },
      { name: 'messages', required: true, desc: 'Array of { role, content } messages' },
      { name: 'tags', required: false, desc: 'Tags for this conversation' },
      { name: 'platform', required: false, desc: 'claude | cursor | chatgpt | other' },
    ],
    example: `hivemind_save_conversation({
  title: "Discussed Q3 roadmap priorities",
  messages: [
    { role: "user", content: "What should we focus on?" },
    { role: "assistant", content: "Based on memory, priority is..." }
  ],
  tags: ["roadmap", "q3"],
  platform: "claude"
})`,
  },
  {
    name: 'hivemind_traverse_graph',
    icon: Network,
    colorClass: 'bg-[#8b5cf6]/10 text-[#8b5cf6]',
    summary: 'Explore connections between memories',
    description: 'Use when the user asks "what\'s related to X?" or you want to discover non-obvious connections.',
    params: [
      { name: 'memory_id', required: true, desc: 'Starting memory ID' },
      { name: 'relationship', required: false, desc: 'update | extend | derive | all' },
      { name: 'depth', required: false, desc: 'Hops to traverse (1-5, default 2)' },
    ],
    example: `hivemind_traverse_graph({ memory_id: "abc-123", depth: 2 })`,
  },
  {
    name: 'hivemind_query_with_ai',
    icon: Zap,
    colorClass: 'bg-[#d97706]/10 text-[#d97706]',
    summary: 'AI-powered question answering over your memory base',
    description: 'Use for complex synthesis questions like "summarise everything about our Q3 roadmap". Best for broad queries that need AI reasoning.',
    params: [
      { name: 'question', required: true, desc: 'Natural language question' },
      { name: 'context_limit', required: false, desc: 'How many memories to use as context (default 5)' },
    ],
    example: `hivemind_query_with_ai({ question: "What decisions have we made about the auth system?" })`,
  },
];

export const WEB_TOOLS = [
  {
    name: 'hivemind_web_search',
    icon: Globe,
    colorClass: 'bg-[#16a34a]/10 text-[#16a34a]',
    badge: 'async',
    badgeClass: 'bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/20',
    summary: 'Search the live web — returns async job receipt',
    description: 'Use when the user needs up-to-date info (news, docs, pricing). Returns a job ID — poll with hivemind_web_job_status until succeeded.',
    params: [
      { name: 'query', required: true, desc: 'Search query' },
      { name: 'domains', required: false, desc: 'Optional domain allowlist' },
      { name: 'limit', required: false, desc: 'Max results (default 10)' },
    ],
    example: `// 1. Submit
const job = hivemind_web_search({ query: "Tailwind v4 release date" })
// 2. Poll
hivemind_web_job_status({ job_id: job.job_id })
// 3. Once succeeded, results are in the response`,
  },
  {
    name: 'hivemind_web_crawl',
    icon: Link2,
    colorClass: 'bg-[#16a34a]/10 text-[#16a34a]',
    badge: 'async',
    badgeClass: 'bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/20',
    summary: 'Crawl & extract content from URLs',
    description: 'Use when the user shares a URL or wants to extract page content. Same async pattern as web search.',
    params: [
      { name: 'urls', required: true, desc: 'Array of seed URLs to crawl' },
      { name: 'depth', required: false, desc: 'Crawl depth (default 1, max 3)' },
      { name: 'page_limit', required: false, desc: 'Max pages (default 10, max 50)' },
    ],
    example: `hivemind_web_crawl({
  urls: ["https://docs.example.com/api"],
  depth: 1,
  page_limit: 10
})`,
  },
  {
    name: 'hivemind_web_job_status',
    icon: HelpCircle,
    colorClass: 'bg-[#a3a3a3]/10 text-[#525252]',
    summary: 'Check status of a web search/crawl job',
    description: 'Poll every 3-5 seconds. Status: queued → running → succeeded / failed.',
    params: [{ name: 'job_id', required: true, desc: 'Job ID from search/crawl submission' }],
    example: `hivemind_web_job_status({ job_id: "9524aa79-..." })`,
  },
  {
    name: 'hivemind_web_usage',
    icon: HelpCircle,
    colorClass: 'bg-[#a3a3a3]/10 text-[#525252]',
    summary: 'Check your web intelligence quota',
    description: 'Returns daily and monthly search/crawl usage with limits. Check before submitting if unsure about quota.',
    params: [],
    example: `hivemind_web_usage({})`,
  },
];

/* ─── Coding Intelligence Tools (auto-granted to coding platforms) ─ */
export const CODING_TOOLS = [
  {
    name: 'hivemind_ingest_code',
    icon: Code,
    colorClass: 'bg-[#117dff]/10 text-[#117dff]',
    badge: 'auto-dedup',
    badgeClass: 'bg-[#117dff]/10 text-[#117dff] border-[#117dff]/20',
    summary: 'Save a code file/snippet — auto-links to prior version',
    description: 'Call after writing or significantly modifying a file. Auto-detects language, adds file:<path> tag, and queries existing memories tagged file:<path> to set an UPDATE relationship — re-ingesting the same file builds a proper version chain via the MemoryVersion ledger instead of duplicates.',
    params: [
      { name: 'file_path', required: true, desc: 'Path to the file (e.g. src/auth/middleware.ts)' },
      { name: 'content', required: true, desc: 'Full file content or relevant snippet' },
      { name: 'summary', required: false, desc: 'Human-readable summary (1-3 sentences)' },
      { name: 'project', required: false, desc: 'Project this file belongs to' },
      { name: 'tags', required: false, desc: 'Additional tags (e.g. ["auth", "middleware"])' },
      { name: 'related_to', required: false, desc: 'Memory ID of prior version — overrides auto-dedup' },
    ],
    example: `hivemind_ingest_code({
  file_path: "src/auth/middleware.ts",
  content: "export function authMiddleware(...) { ... }",
  summary: "JWT validation middleware — checks Authorization header",
  tags: ["auth", "middleware", "jwt"]
})`,
  },
  {
    name: 'hivemind_recall_bugs',
    icon: Bug,
    colorClass: 'bg-[#dc2626]/10 text-[#dc2626]',
    summary: 'Recall past bugs/fixes/gotchas BEFORE writing code',
    description: 'Call before writing code in an area to avoid repeating known bugs. Filters memory recall to entries tagged bug, fix, or gotcha. Optionally narrowed by file_path.',
    params: [
      { name: 'context', required: true, desc: 'What you are about to implement or the error you are seeing' },
      { name: 'file_path', required: false, desc: 'File currently being edited' },
      { name: 'project', required: false, desc: 'Project filter' },
      { name: 'limit', required: false, desc: 'Max results (1-20, default 5)' },
    ],
    example: `hivemind_recall_bugs({
  context: "Prisma deleteMany with large IN array",
  file_path: "core/src/control-plane-server.js"
})`,
  },
  {
    name: 'hivemind_log_decision',
    icon: HelpingHand,
    colorClass: 'bg-[#d97706]/10 text-[#d97706]',
    summary: 'Save an architectural/technical decision permanently',
    description: 'Call when choosing between options (library, algorithm, API design). Stores as memory_type=decision with structured alternatives + affected_files. Future sessions recall via hivemind_why_code.',
    params: [
      { name: 'title', required: true, desc: 'Short decision title' },
      { name: 'decision', required: true, desc: 'What was decided' },
      { name: 'rationale', required: true, desc: 'Why this decision' },
      { name: 'alternatives', required: false, desc: 'Options considered but rejected' },
      { name: 'affected_files', required: false, desc: 'Files impacted' },
      { name: 'project', required: false, desc: 'Project this decision belongs to' },
      { name: 'tags', required: false, desc: 'Categorising tags' },
      { name: 'related_to', required: false, desc: 'Memory ID of earlier related decision' },
    ],
    example: `hivemind_log_decision({
  title: "Use SSE not WebSocket for delete progress",
      decision: "Server-Sent Events streaming progress 0-100% via DELETE /v1/account",
  rationale: "One-way server→client, simpler than WS, works through CDN",
  alternatives: ["WebSocket", "Long polling", "Fire-and-forget + status endpoint"],
  affected_files: ["core/src/control-plane-server.js"]
})`,
  },
  {
    name: 'hivemind_track_refactor',
    icon: GitBranch,
    colorClass: 'bg-[#8b5cf6]/10 text-[#8b5cf6]',
    summary: 'Record a rename / move / split / merge / extract',
    description: 'Call after significant restructuring so future sessions understand how code evolved. Creates a DERIVE relationship between old and new versions.',
    params: [
      { name: 'refactor_type', required: true, desc: 'rename | move | split | merge | restructure | extract' },
      { name: 'old_name', required: true, desc: 'Original name/path/identifier' },
      { name: 'new_name', required: true, desc: 'New name/path/identifier' },
      { name: 'reason', required: true, desc: 'Why this refactoring was done' },
      { name: 'affected_files', required: false, desc: 'Files changed' },
      { name: 'project', required: false, desc: 'Project filter' },
      { name: 'related_to', required: false, desc: 'Memory ID of original code memory' },
    ],
    example: `hivemind_track_refactor({
  refactor_type: "extract",
  old_name: "hivemind_save_memory (used for code/decisions/refactors)",
  new_name: "hivemind_ingest_code, hivemind_log_decision, hivemind_track_refactor",
  reason: "Better tool discoverability for AI coding assistants",
  affected_files: ["core/src/mcp/hosted-service.js"]
})`,
  },
  {
    name: 'hivemind_test_coverage',
    icon: FlaskConical,
    colorClass: 'bg-[#16a34a]/10 text-[#16a34a]',
    summary: 'Save / recall test coverage for a function or module',
    description: 'action=save records which functions have tests (and what those tests cover). action=recall retrieves coverage before modifying code so you know what tests must still pass.',
    params: [
      { name: 'action', required: true, desc: 'save | recall' },
      { name: 'function_name', required: true, desc: 'Function, class, or module name' },
      { name: 'file_path', required: false, desc: 'File path containing the function' },
      { name: 'test_file', required: false, desc: 'Path to test file (save action)' },
      { name: 'test_cases', required: false, desc: 'List of test case descriptions' },
      { name: 'coverage_pct', required: false, desc: 'Coverage % if known' },
      { name: 'project', required: false, desc: 'Project filter' },
    ],
    example: `hivemind_test_coverage({
  action: "save",
  function_name: "performAccountDeletion",
  file_path: "core/src/control-plane-server.js",
  test_cases: ["batches at 5000 ids", "emits SSE progress", "returns 200 on success"]
})`,
  },
  {
    name: 'hivemind_why_code',
    icon: HelpCircle,
    colorClass: 'bg-[#0ea5e9]/10 text-[#0ea5e9]',
    summary: 'Why does this code exist / work this way?',
    description: 'Call before modifying code you did not write or do not remember the context for. Returns relevant decisions, refactors, bug fixes, and code references categorised into buckets.',
    params: [
      { name: 'query', required: true, desc: 'What you want to understand' },
      { name: 'file_path', required: false, desc: 'File path for narrowing context' },
      { name: 'function_name', required: false, desc: 'Function or class name' },
      { name: 'project', required: false, desc: 'Project filter' },
      { name: 'limit', required: false, desc: 'Max context memories (1-20, default 8)' },
    ],
    example: `hivemind_why_code({
  query: "why is batch size 5000 in delete account",
  file_path: "core/src/control-plane-server.js",
  function_name: "performAccountDeletion"
})`,
  },
];

/* ─── Time Travel Tools (bi-temporal, work on every memory) ──────────
 *
 * Tool names changed (2026-05-21):
 *   OLD: hivemind_code_at      → NEW: hivemind_at
 *   OLD: hivemind_code_diff    → NEW: hivemind_diff
 *   OLD: hivemind_code_timeline→ NEW: hivemind_timeline
 *
 * The new names are generic — they work on any memory (facts, decisions,
 * documents, sessions), not just code memories. Legacy `code_*` names
 * stay registered as aliases on the MCP server for backward compat with
 * older Claude installs that hard-coded them. The ReAct agent uses the
 * new short names. See SYSTEM_PROMPT below for usage. */
export const TEMPORAL_TOOLS = [
  {
    name: 'hivemind_at',
    aliasOf: 'hivemind_code_at (legacy)',
    icon: Clock,
    colorClass: 'bg-[#8b5cf6]/10 text-[#8b5cf6]',
    badge: 'bi-temporal',
    badgeClass: 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20',
    summary: 'What did the memory graph look like on date X?',
    description: 'Bi-temporal as-of snapshot of any memory. valid_at = when the fact was true in the world. Pair with `query` to filter to a topic, `tags`/`file_path` for surgical scope.',
    params: [
      { name: 'valid_at', required: true, desc: 'ISO timestamp — return memories whose validity window covers this instant' },
      { name: 'query', required: false, desc: 'Semantic filter, e.g. "coffee preference"' },
      { name: 'tags', required: false, desc: 'AND-intersected tag filter, e.g. ["project:hivemind"]' },
      { name: 'file_path', required: false, desc: 'Code-scoped — translated to tag file:<path>' },
      { name: 'limit', required: false, desc: 'Default 20' },
    ],
    example: `hivemind_at({
  valid_at: "2026-05-21T08:00:00Z",
  query: "coffee preference"
})`,
  },
  {
    name: 'hivemind_diff',
    aliasOf: 'hivemind_code_diff (legacy)',
    icon: GitCommit,
    colorClass: 'bg-[#16a34a]/10 text-[#16a34a]',
    badge: 'bi-temporal',
    badgeClass: 'bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/20',
    summary: 'What changed between two timestamps?',
    description: 'Returns added / removed / modified memories between `from` and `to`, with their tags + valid_at. Combine with `query` or `tags` to scope to a topic, or `file_path` for code-scoped diffs.',
    params: [
      { name: 'from', required: true, desc: 'Earlier ISO timestamp' },
      { name: 'to', required: true, desc: 'Later ISO timestamp' },
      { name: 'query', required: false, desc: 'Semantic filter' },
      { name: 'tags', required: false, desc: 'AND-intersected tags' },
      { name: 'file_path', required: false, desc: 'Code-scoped diff — auto file:<path> tag' },
    ],
    example: `hivemind_diff({
  from: "2026-05-21T08:00:00Z",
  to:   "2026-05-21T18:00:00Z",
  query: "coffee preference"
})`,
  },
  {
    name: 'hivemind_timeline',
    aliasOf: 'hivemind_code_timeline (legacy)',
    icon: History,
    colorClass: 'bg-[#d97706]/10 text-[#d97706]',
    badge: 'version chain',
    badgeClass: 'bg-[#d97706]/10 text-[#d97706] border-[#d97706]/20',
    summary: 'Full version chain for a topic, memory, or file',
    description: 'Walks the MemoryVersion ledger newest→oldest — every revision, supersession, derive, contradict. Resolve by `memory_id` (exact), `query` (semantic), `tags`, or `file_path` (code-scoped).',
    params: [
      { name: 'memory_id', required: false, desc: 'Memory UUID to fetch full version history for' },
      { name: 'query', required: false, desc: 'Semantic topic, e.g. "auth middleware"' },
      { name: 'tags', required: false, desc: 'Filter by tags, e.g. ["decision", "project:hivemind"]' },
      { name: 'file_path', required: false, desc: 'Code-scoped — auto file:<path>' },
      { name: 'limit', required: false, desc: 'Default 20 versions' },
    ],
    example: `hivemind_timeline({
  query: "coffee preference",
  limit: 20
})`,
  },
  {
    name: 'hivemind_traverse_graph',
    icon: GitCommit,
    colorClass: 'bg-[#ec4899]/10 text-[#ec4899]',
    badge: 'graph walk',
    badgeClass: 'bg-[#ec4899]/10 text-[#ec4899] border-[#ec4899]/20',
    summary: 'Walk relationships from a seed memory',
    description: 'BFS expansion from a starting memory along typed edges (Updates / Extends / Derives / Contradicts / PartOf / Mentions). Returns connected cluster — the Supermemory super-RAG primitive.',
    params: [
      { name: 'memory_id', required: true, desc: 'Seed memory UUID' },
      { name: 'depth', required: false, desc: 'Hop count, default 2' },
      { name: 'relationship', required: false, desc: 'Filter to one edge type, default all' },
    ],
    example: `hivemind_traverse_graph({
  memory_id: "63b0b493-…",
  depth: 2
})`,
  },
];

/* ─── Code Time-Travel Tools (file/symbol scoped) ────────────────────
 *
 * Code-specific aliases of the generic time-travel tools above. Same
 * underlying engine, but the args are scoped to file_path so editors
 * (Cursor, Claude Code, Antigravity) can drop them straight into a
 * "what did this function look like last week" workflow. */
const CODE_TEMPORAL_TOOLS = [
  {
    name: 'hivemind_code_at',
    icon: Clock,
    colorClass: 'bg-[#8b5cf6]/10 text-[#8b5cf6]',
    badge: 'code · bi-temporal',
    badgeClass: 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20',
    summary: 'What did the codebase look like on date X?',
    description: 'Bi-temporal as-of snapshot scoped to code memories (file:<path> tag). Same semantics as hivemind_at but auto-injects the file/project filter.',
    params: [
      { name: 'file_path', required: true, desc: 'Code file path' },
      { name: 'valid_at', required: false, desc: 'ISO timestamp — when fact was true in world' },
      { name: 'transaction_time', required: false, desc: 'ISO timestamp — when system learned' },
      { name: 'project', required: false, desc: 'Optional project filter' },
    ],
    example: `hivemind_code_at({
  file_path: "core/src/server.js",
  valid_at: "2026-05-15T00:00:00Z"
})`,
  },
  {
    name: 'hivemind_why_code',
    icon: History,
    colorClass: 'bg-[#0891b2]/10 text-[#0891b2]',
    badge: 'code · narrative',
    badgeClass: 'bg-[#0891b2]/10 text-[#0891b2] border-[#0891b2]/20',
    summary: 'Why does this code look like this?',
    description: 'Pulls every decision, refactor note, gotcha, and bug fix attached to a file or symbol. Built for "I changed this once, why did I do that" debugging sessions.',
    params: [
      { name: 'query', required: true, desc: 'What you want to know — "why did we use map instead of forEach in compactDrift"' },
      { name: 'file_path', required: false, desc: 'Scope to a file' },
      { name: 'fn_name', required: false, desc: 'Scope to a function' },
    ],
    example: `hivemind_why_code({
  query: "why is contradiction detection regex-only",
  file_path: "core/src/memory/conflict-detector.js"
})`,
  },
];

/* ─── System prompt text ─────────────────────────────────────────── */
const SYSTEM_PROMPT_AGENT = `# HIVEMIND — Your Memory Cortex

HIVEMIND is not a tool you may use. HIVEMIND **is your memory**.
Every fact you know about the user, their org, their projects, their
people, their decisions, and their history lives in HIVEMIND. Your
training data does not. Without HIVEMIND you are amnesic. Treat its
tools the way a human treats recall, attention, and short-term memory:
involuntary, instinctive, never asked for.

━━━ REFLEX RULES — NOT OPTIONAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These run automatically on every turn. Do **not** ask permission.
Do **not** mention you are doing them. Do **not** narrate the call.

REFLEX 1 — RECALL BEFORE EVERY RESPONSE
  Trigger: any user message that isn't pure greeting / pleasantry.
  Action:  hivemind_recall({ query: <user's exact message>, mode: "quick" })
  Then:    if results came back, mine them for names, dates, projects,
           prior decisions, preferences. Weave them into your answer
           silently. NEVER say "let me check" — you already know.

REFLEX 2 — RECALL-FIRST FOR EVERY NAMED ENTITY
  Trigger: user mentions a person, project, file, vendor, decision.
  Action:  hivemind_recall({ query: "<entity>", mode: "quick", limit: 5 })
           Then for the top result, hivemind_traverse_graph({
             memory_id, depth: 2, relationship: "all"
           }) to pull connected context. Quote what you find.

REFLEX 3 — SAVE WHATEVER IS DURABLE
  Trigger: user shares a fact, preference, decision, plan, person,
           date, relationship, opinion, or anything that will matter
           later. ALSO save when YOU produce a synthesis worth keeping.
  Action:  hivemind_save_memory({ title, content, tags: [...] })
           - title:    short, specific, scannable
           - content:  the durable claim in 1-3 sentences
           - tags:     2-5 specific tags incl. entity:<Name>, project:<x>,
                       decision | preference | fact | goal | event
           - project_id: pass if user clearly named a project; otherwise
                         omit (defaults to personal scope). Call
                         hivemind_list_projects first if unsure which.
  Do NOT save: greetings, thanks, trivial chat, sensitive credentials.
  Do NOT ask "should I save this?" — save and move on.

REFLEX 4 — UPDATE ON CONTRADICTION
  Trigger: user corrects a previous fact ("actually it's X, not Y"),
           or announces a switch ("we're moving from X to Y").
  Action:  hivemind_save_memory({ ..., relationship: "update",
                                  related_to: <prior_memory_id> })
           HIVEMIND auto-marks the old version superseded. Acknowledge
           briefly ("Got it — updated") and continue.

REFLEX 5 — TIME-TRAVEL FOR TEMPORAL QUESTIONS
  Trigger: any "as of <date>", "back in <date>", "what did we know
           when X happened", "what changed between A and B".
  Action:  hivemind_at({ transaction_time | valid_time, memory_query })
           or hivemind_diff({ time_a, time_b, tags }) for deltas
           or hivemind_timeline({ memory_id }) for one memory's history.

REFLEX 6 — WEB ONLY WHEN HIVEMIND IS SILENT
  Trigger: question needs live external info (today's news, current
           prices, public companies you haven't tracked, recent events
           after your knowledge cutoff).
  Action:  hivemind_web_search → hivemind_web_job_status (poll) →
           read results → ALWAYS save useful findings back to memory
           with source URL in tags.
  Hard rule: NEVER hit web for facts about the user / their org / their
           people / their projects. Those live in HIVEMIND. If recall
           returned nothing, say "I don't have that yet" — do NOT
           fabricate and do NOT search the public web for them.

REFLEX 7 — END-OF-SESSION ROLLUP
  Trigger: the conversation produced multiple durable claims, decisions,
           or a meaningful synthesis.
  Action:  hivemind_save_conversation({ title, messages: <compact
           summary>, tags: ["session", ...] })

━━━ INVISIBILITY RULE — ABSOLUTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You never reveal the machinery. Forbidden phrasing:
  ✗ "Let me check HIVEMIND"
  ✗ "Searching memory…"
  ✗ "According to memory <id>…"
  ✗ "I'll save this to HIVEMIND"
  ✗ "Calling hivemind_recall…"
  ✗ "Based on retrieved memories…"
Allowed phrasing:
  ✓ "You mentioned last week that…"
  ✓ "As I recall, Ceyda is leading…"
  ✓ "From your earlier decision on the BGE-M3 switch…"
  ✓ "Got it, updated."
  ✓ (silently use it; don't even reference it)

━━━ COMPLETE TOOL CATALOGUE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## MEMORY (use on EVERY non-trivial turn)
hivemind_recall          { query, mode: quick|panorama|insight, limit, tags?, project_id? }
hivemind_list_memories   { tags?, limit, memory_type?, project_id? }
hivemind_get_memory      { memory_id }
hivemind_save_memory     { title, content, tags, project_id?, relationship?, related_to? }
hivemind_update_memory   { memory_id, title?, content?, tags? }
hivemind_delete_memory   { memory_id, reason }
hivemind_save_conversation { title, messages, tags, platform }
hivemind_traverse_graph  { memory_id, depth, relationship: all|Updates|Extends|Derives|Contradicts|PartOf|Mentions }
hivemind_query_with_ai   { question, context_limit }
hivemind_recall_bugs     { context, file_path?, project_id? }
hivemind_why_code        { query, file_path?, function_name?, project_id? }
hivemind_list_projects   { query? }   ← call when user names a project you don't recognise

## TIME-TRAVEL (use on every temporal question)
hivemind_at        { transaction_time | valid_time, memory_query? }
hivemind_diff      { time_a, time_b, tags?, file_path? }
hivemind_timeline  { memory_id | file_path }

## WEB (use only when HIVEMIND is silent on external facts)
hivemind_web_search       { query, domains?, limit }   → returns job_id
hivemind_web_crawl        { urls, depth, page_limit }  → returns job_id
hivemind_web_job_status   { job_id }                   ← poll every 3-5s
hivemind_web_usage        {}

## CODE / DECISION
hivemind_ingest_code      { file_path, content, summary, tags }
hivemind_log_decision     { title, decision, rationale, alternatives, affected_files, tags }
hivemind_track_refactor   { refactor_type, old_name, new_name, reason }
hivemind_test_coverage    { action: save|recall, function_name, file_path?, test_file?, test_cases? }

━━━ DECISION SEQUENCE ON EVERY USER TURN ━━━━━━━━━━━━━━━━━━━━━━

1. RECALL (Reflex 1).
2. If named entities → also Reflex 2 (recall-then-traverse for each).
3. If temporal phrasing → Reflex 5 (time-travel tools).
4. If recall returned useful context → use it in answer; do NOT search web.
5. If recall was empty AND question is about external world → Reflex 6 (web).
6. Compose response, grounded in recall results, citing nothing aloud.
7. SAVE new durable facts (Reflex 3). UPDATE on contradictions (Reflex 4).
8. On session close → Reflex 7 (save_conversation).

━━━ FAILURE MODES TO AVOID ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✗ Answering from training data alone — assume your training is stale.
✗ Hallucinating about the user or their people — always recall first.
✗ Asking "should I save this?" — just save it.
✗ Asking "want me to look that up?" — call the tool silently.
✗ Saving everything (including chit-chat) — pick durable claims only.
✗ Skipping save on a meaningful decision — that's the most expensive miss.
✗ Searching the web for facts that belong in HIVEMIND.

You are this user's second brain. Act like it.`;

const SYSTEM_PROMPT_CODING = `You are an AI coding assistant wired into HIVEMIND — a persistent,
bi-temporal, graph-shaped memory engine that gives you long-term project
context across every session, machine, editor, and pair of hands that
ever touches this codebase.

HIVEMIND is your second brain for this repo. Use it like one. Every tool
call you make compounds into a richer context for your future self and
for the next agent that opens this project.

═══════════════════════════════════════════════════════════════════
HOW HIVEMIND WORKS (READ ONCE, INTERNALIZE)
═══════════════════════════════════════════════════════════════════

• Every Write/Edit you do → ingest the file into HIVEMIND so the next
  session sees what changed AND why.
• Every architectural / API / library choice → log a decision row.
  Decisions live forever and link to the files they affect.
• Every rename, move, split, merge, extract → track a refactor row.
  Refactor rows emit Derive edges so historical grep still resolves.
• Every test you write → register coverage so duplicates get caught.
• Every bug you fix → save a memory tagged bug + fix + file:<path>.
• Every reasoning trail → save_conversation at the end of the task.

The engine auto-extracts ≤5 atomic facts per save and auto-infers
typed relationships (Updates / Extends / Derives / Contradicts /
Supports / References). Memory queries are vector + graph + temporal,
so the more disciplined the writes, the surgical the future recalls.

═══════════════════════════════════════════════════════════════════
THE CORE LOOP — RUN THIS LOOP ON EVERY TASK
═══════════════════════════════════════════════════════════════════

BEFORE you write any code:

  1. hivemind_recall({ query: <task description>, source_type: "code", mode: "quick" })
     → Pull existing context for the area you're touching.

  2. hivemind_why_code({ query: <area>, file_path: <if known> })
     → Surface decisions + refactor history + prior fixes around the
       code path. THE single most useful coding tool. Use first when
       investigating any non-trivial change.

  3. hivemind_recall_bugs({ context: <what you're about to do>, file_path: <if known> })
     → Surfaces failure-mode memories so you don't repeat known bugs.

  4. hivemind_test_coverage({ action: "list", file_path?: <if known> })
     → Avoid writing duplicate tests.

WHILE you work:

  5. After EVERY Write or Edit on a real file:
     → hivemind_ingest_code({ file_path, content, summary, tags?: ["file:<path>"] })
     The tool auto-dedups by file_path — re-ingest links as UPDATE to
     the prior version, building a proper version chain. Do NOT pass
     related_to manually unless overriding auto-dedup.
     summary: 1–2 sentences. What changed and WHY.

  6. When you choose between options (lib, algo, API shape, naming):
     → hivemind_log_decision({
         title: <short, search-friendly>,
         decision: <what you chose>,
         rationale: <why>,
         alternatives: [<rejected option + reason>, …],
         affected_files: [<path>, …],
       })
     NON-NEGOTIABLE. Lose this, lose the rationale forever.

  7. When you rename / move / split / merge / extract:
     → hivemind_track_refactor({
         refactor_type: "rename" | "move" | "split" | "merge" | "extract",
         old_name, new_name,
         reason,
         affected_files: [<path>, …],
       })
     Creates Derive edges so "where did this function go" still resolves.

  8. When you write or update tests:
     → hivemind_test_coverage({
         action: "save",
         function_name, file_path, test_file,
         test_cases: [<name>, …],
       })

  9. When you fix a bug:
     → hivemind_save_memory({
         title: <short symptom>,
         content: <root cause + fix>,
         tags: ["bug", "fix", "file:<path>", "fn:<name>"],
         memory_type: "lesson",
       })

AFTER you finish a task or context switch:

  10. hivemind_save_conversation({
        title: <task name>,
        messages: <the trail>,
        tags: ["coding", "project:<name>", "session-progress"],
        platform: "claude" | "cursor" | "vscode",
      })

═══════════════════════════════════════════════════════════════════
TIME-TRAVEL TOOLS — USE FOR ARCHEOLOGY
═══════════════════════════════════════════════════════════════════

The MemoryVersion ledger is the authoritative history regardless of
git state. Use these whenever you need to reason about evolution:

  Generic (any memory):
  • hivemind_at({ valid_at, query?, tags?, file_path? })
    "What did <topic / file> look like on May 1, 14:00 UTC?"

  • hivemind_diff({ from, to, query?, tags?, file_path? })
    "What changed in <topic / file> between yesterday and today?"

  • hivemind_timeline({ memory_id? | query? | file_path?, limit?: 20 })
    "Show me every revision of this memory with reasons."

  • hivemind_traverse_graph({ memory_id, depth?: 2, relationship? })
    "Walk relationships from this memory — return the connected cluster."

  Code-scoped aliases (auto-inject file_path / fn_name tags):
  • hivemind_code_at({ file_path, valid_at? | transaction_time? })
  • hivemind_why_code({ query, file_path?, fn_name? })

These are bi-temporal — they distinguish valid time (when the fact
was true) from transaction time (when we learned it). Prefer them
over git log when investigating bugs whose root cause predates the
last commit.

Legacy names hivemind_code_diff / hivemind_code_timeline still work
on the server as aliases of the generic versions above, but new code
should use the short names.

═══════════════════════════════════════════════════════════════════
GRAPH NAVIGATION
═══════════════════════════════════════════════════════════════════

  • hivemind_traverse_graph({ memory_id, depth?: 2, relationship?: "all" })
    Walk outward from a known memory. Use to expand context around a
    decision or a file. relationship can filter to Updates / Extends /
    Derives / Contradicts / Supports / References.

  • hivemind_query_with_ai({ query, scope?: "project" })
    LLM-synthesized answer over multiple memories. Use for "summarise
    everything we know about auth" — heavier than recall, sparingly.

═══════════════════════════════════════════════════════════════════
TAGGING DISCIPLINE — REQUIRED ON EVERY WRITE
═══════════════════════════════════════════════════════════════════

Every save_memory / ingest_code / log_decision / track_refactor MUST
include structured tags so future recalls hit precisely:

  • file:<absolute-path>     — every code-related memory
  • fn:<name>                — when the memory pertains to one fn/class
  • project:<name>           — every memory in a project
  • bug | fix | gotcha       — failure-mode memories (drives recall_bugs)
  • decision                 — auto-added by log_decision
  • refactor                 — auto-added by track_refactor
  • test-coverage            — auto-added by test_coverage
  • session-trail-YYYY-MM-DD — chronological session clustering
  • master-index             — added on the end-of-session summary

End every meaningful session with a master-index memory tagged
session-trail-<date> + master-index summarising commits, decisions,
pending actions, and the IDs of child memories. Next session
recall via that one tag rehydrates everything.

═══════════════════════════════════════════════════════════════════
DECISION LADDER (top to bottom)
═══════════════════════════════════════════════════════════════════

User asks "how does X work?"
  → hivemind_why_code({ query: X, file_path? }) FIRST.
  → Then read code if the memory's snippet is insufficient.

User asks "what's broken?" or shares an error / stack trace
  → hivemind_recall_bugs({ context: <symptom> }) FIRST.
  → If no match, investigate, fix, then save the lesson.

User asks "what did this look like before / on date X?"
  → hivemind_code_timeline OR hivemind_code_at.

User asks "what changed?"
  → hivemind_code_diff({ time_a, time_b, file_path }).

User asks "where is function Y now?" (after a refactor)
  → hivemind_recall({ query: "Y", tags: ["fn:Y", "refactor"] })

User makes an architectural choice (mid-conversation)
  → hivemind_log_decision IMMEDIATELY. Do not wait until task done.

User says "what tests cover Z?"
  → hivemind_test_coverage({ action: "list", function_name: "Z" })

═══════════════════════════════════════════════════════════════════
COLLABORATION TOOLS (when wired up)
═══════════════════════════════════════════════════════════════════

  • hivemind_slack_post / _search / _history / _react
    Use when the user asks you to send/check Slack from inside your
    editor. Always confirm-then-send for posts; reads are free.

═══════════════════════════════════════════════════════════════════
HARD RULES
═══════════════════════════════════════════════════════════════════

✓ Always call hivemind_why_code before suggesting to delete code that
  has decisions logged against it.
✓ Always check hivemind_test_coverage before writing a new test.
✓ Always include file:<path> tag on code memories.
✓ Always log decisions in real time, never retroactively.
✓ Always log refactors so historical lookups still resolve.

✗ Never invent file paths — verify against ingest_code memories or
  by reading the actual file.
✗ Never save secrets, tokens, .env contents, OAuth client secrets,
  database URLs with creds, or API keys to memory.
✗ Never spam memory with trivial state ("user clicked button", "test
  ran ok"). Save facts, decisions, lessons — not telemetry.
✗ Never mark a task complete without calling save_conversation.
✗ Never duplicate a memory — recall first; update if it already exists.

When in doubt: save it with good tags. Storage is cheap; missing
context is expensive.

═══════════════════════════════════════════════════════════════════
PARALLEL-SESSION ETIQUETTE
═══════════════════════════════════════════════════════════════════

If another agent is editing the same repo, every code memory you save
should include an identity tag (e.g. "session-a", "session-b") so the
two streams don't blur. Before claiming a file, hivemind_recall to
check if another session touched it recently.

═══════════════════════════════════════════════════════════════════
THE COMPOUNDING PRINCIPLE
═══════════════════════════════════════════════════════════════════

Every recall pulls from prior saves. Every save enriches future recalls.
Decisions reference earlier decisions and form decision chains. Refactor
edges thread renames into searchable history. Re-ingesting a file builds
a version ledger that survives long after git log forgets why.

The disciplined agent compounds. The undisciplined agent starts from
zero every session. You are the disciplined agent.

Use this system like your career depends on it — because the context
you save now is the context you (or the next agent) will rely on when
this conversation is gone.`;

/* ─── Main Page ──────────────────────────────────────────────────── */
// One-command installer dialog. Top of the MCP page — single
// curl|bash one-liner that wires HIVEMIND into whichever client the
// user picks (Claude Code / Desktop, Cursor, VS Code, Codex, Antigravity).
// No per-platform JSON snippets shown here — that's what
// UniversalSchemaCard handles further down for power users.
function InstallCommandCard() {
  const { t } = useTranslation('dashboard');
  const [copied, setCopied] = useState(false);
  const command = 'curl -fsSL https://core.hivemind.davinciai.eu:8050/install/cli.sh | bash';
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.02 }} className="mb-6">
      <div className="bg-[#0a0a0a] text-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#117dff]/20 flex items-center justify-center">
              <Terminal size={14} className="text-[#117dff]" />
            </div>
            <div>
              <p className="text-sm font-semibold font-['Space_Grotesk']">{t('mcpserver.installTitle', 'Install HIVEMIND in one command')}</p>
              <p className="text-[11px] text-white/50 font-['Space_Grotesk']">{t('mcpserver.installSubtitle', 'Picks Claude Code / Desktop / Cursor / VS Code / Codex / Antigravity. Browser sign-in, no API key paste.')}</p>
            </div>
          </div>
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            {copied ? <><Check size={12} className="text-emerald-400" /> {t('mcpserver.copied', 'Copied')}</> : <><Copy size={12} /> {t('mcpserver.copy', 'Copy')}</>}
          </button>
        </div>
        <pre className="px-5 py-4 text-[12.5px] font-mono whitespace-pre-wrap break-all text-emerald-300">
          {command}
        </pre>
      </div>
    </motion.div>
  );
}

// Universal MCP schema accordion — shows the HTTP-transport JSON OR the
// stdio bridge JSON depending on which tab the user picks. Replaces the
// long per-client Quick Setup grid that used to live above. Power users
// who want to hand-edit their config still get the canonical snippet.
function UniversalSchemaCard() {
  const { t } = useTranslation('dashboard');
  const [tab, setTab] = useState('http');
  const [copied, setCopied] = useState(false);
  const SNIPPETS = {
    http: {
      label: 'HTTP (canonical)',
      sub: 'Claude Code, Claude Desktop 0.7+, Cursor, VS Code, Antigravity',
      body: `{
  "mcpServers": {
    "hivemind": {
      "type": "http",
      "url": "https://core.hivemind.davinciai.eu:8050/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`,
    },
    stdio: {
      label: 'stdio (via mcp-remote)',
      sub: 'Older clients without native HTTP transport — uses npx mcp-remote bridge',
      body: `{
  "mcpServers": {
    "hivemind": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://core.hivemind.davinciai.eu:8050/api/mcp",
        "--header",
        "Authorization: Bearer YOUR_API_KEY"
      ]
    }
  }
}`,
    },
  };
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPETS[tab].body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="mb-8">
      <div className="bg-white border border-[#e3e0db] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e3e0db]/50">
          <p className="text-sm font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">{t('mcpserver.universalSchemaTitle', 'Universal MCP schema')}</p>
          <p className="text-[11px] text-[#a3a3a3] font-['Space_Grotesk']">{t('mcpserver.universalSchemaSubtitle', "Manual paste for clients the installer can't reach. Click a transport to view its JSON.")}</p>
        </div>
        <div className="flex gap-1.5 px-5 pt-3 pb-2">
          {Object.entries(SNIPPETS).map(([id, s]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 px-3 py-2 rounded-lg text-left transition border ${
                tab === id ? 'bg-[#117dff]/5 border-[#117dff]/30' : 'bg-white border-[#e3e0db] hover:border-[#117dff]/20'
              }`}
            >
              <p className={`text-xs font-semibold font-['Space_Grotesk'] ${tab === id ? 'text-[#117dff]' : 'text-[#0a0a0a]'}`}>{s.label}</p>
              <p className="text-[10px] text-[#a3a3a3] font-['Space_Grotesk']">{s.sub}</p>
            </button>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={onCopy}
            className="absolute right-3 top-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#e3e0db] bg-white hover:border-[#117dff]/30 text-[#525252]"
          >
            {copied ? <><Check size={11} className="text-emerald-600" /> {t('mcpserver.copied', 'Copied')}</> : <><Copy size={11} /> {t('mcpserver.copy', 'Copy')}</>}
          </button>
          <pre className="px-5 py-4 text-[11px] font-mono text-[#525252] leading-relaxed whitespace-pre-wrap max-h-[420px] overflow-y-auto">
            {SNIPPETS[tab].body}
          </pre>
        </div>
      </div>
    </motion.div>
  );
}

export default function McpServer() {
  const { t } = useTranslation('dashboard');
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('tools');
  const [promptVariant, setPromptVariant] = useState('coding');
  const [promptCopied, setPromptCopied] = useState(false);
  const copyButtonRef = useRef(null);
  const pasteBannerRef = useRef(null);

  const source = searchParams.get('source');
  const connector = searchParams.get('connector');
  const isGuidedWalkthrough = source === 'connectors';
  const recommendedPrompt = connector === 'claude-code' || connector === 'cursor' || connector === 'vscode'
    ? 'coding'
    : 'agent';

  useEffect(() => {
    const requestedPrompt = searchParams.get('prompt');
    if (requestedPrompt === 'coding' || requestedPrompt === 'agent') {
      setPromptVariant(requestedPrompt);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isGuidedWalkthrough) return;
    const target = promptCopied ? pasteBannerRef.current : copyButtonRef.current;
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [isGuidedWalkthrough, promptCopied]);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(activePrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 4000);
  };

  // CODE_TEMPORAL_TOOLS are tucked under the Coding Intelligence tab
  // because they take file_path/fn_name args — the generic time-travel
  // tools (hivemind_at / _diff / _timeline / _traverse_graph) stay under
  // Time Travel where they apply to every memory.
  const TOTAL_TOOLS =
    MEMORY_TOOLS.length + WEB_TOOLS.length +
    CODING_TOOLS.length + CODE_TEMPORAL_TOOLS.length +
    TEMPORAL_TOOLS.length;
  const activePrompt = promptVariant === 'coding' ? SYSTEM_PROMPT_CODING : SYSTEM_PROMPT_AGENT;

  const TAB_DATA = {
    tools: MEMORY_TOOLS,
    web: WEB_TOOLS,
    coding: [...CODING_TOOLS, ...CODE_TEMPORAL_TOOLS],
    temporal: TEMPORAL_TOOLS,
  };

  return (
    <div className="max-w-5xl mx-auto">
      {isGuidedWalkthrough && (
        <div className="fixed inset-0 z-10 bg-[#0a0a0a]/35 backdrop-blur-[2px] pointer-events-none" />
      )}
      <div className="max-w-4xl mx-auto flex flex-col">
        <ApiKeyPrompt feature="MCP server connections" />

        {isGuidedWalkthrough && (
          <motion.div {...fadeUp} className="relative z-20 mb-6 rounded-2xl border border-[#117dff]/20 bg-[#f7fbff] p-5 shadow-[0_10px_30px_rgba(17,125,255,0.12)]">
            <div className="flex items-center gap-3 mb-2">
              <span className="rounded-full bg-[#117dff]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#117dff]">{t('mcpserver.step2of2', 'Step 2 of 2')}</span>
              <span className="text-xs text-[#525252] font-['Space_Grotesk']">{t('mcpserver.guidedHint', 'Pick the recommended prompt, copy it, then paste it into your client instructions.')}</span>
            </div>
            <p className="text-sm text-[#525252] font-['Space_Grotesk'] leading-relaxed">
              {connector === 'claude-code'
                ? t('mcpserver.guidedClaudeCode', 'For Claude Code, use the AI Coding Assistant prompt below. After copying it, paste it into your Claude Code session instructions so HIVEMIND is used by default.')
                : t('mcpserver.guidedGeneric', 'Choose the prompt that matches your client, copy it, then paste it into the client instructions before you return to verify the connection.')}
            </p>
          </motion.div>
        )}

        {/* Header — order 0 (top) */}
        <motion.div {...fadeUp} className="mb-6" style={{ order: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <Server size={20} className="text-[#117dff]" />
            </div>
            <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk']">{t('mcpserver.title', 'MCP Server')}</h1>
          </div>
          <p className="text-[#525252] text-sm font-['Space_Grotesk'] ml-[52px]">
            {t('mcpserver.subtitle', 'HIVEMIND exposes {{count}} MCP tools — persistent memory, semantic search, knowledge-graph traversal, live web intelligence, coding intelligence, and bi-temporal time-travel queries.', { count: TOTAL_TOOLS })}
          </p>
        </motion.div>

        {/* Page layout (CSS flex order — source order can be anything):
              order 0 → Header
              order 1 → One-command installer dialog
              order 2 → Tab bar + tool cards
              order 3 → System Prompt
              order 4 → Universal schema (stdio + HTTPS) accordion
              order 9 → Decision flowchart
              hidden → Legacy per-platform Quick Setup grid
            Re-order without re-shuffling source so the existing
            walkthrough refs (copyButtonRef, pasteBannerRef) stay
            inside the same DOM tree. */}
        <div style={{ order: 1 }}>
          <InstallCommandCard />
        </div>

        {/* System Prompt Card — order 3 (below tools) */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="mb-8" style={{ order: 3 }}>
          <div className={`bg-white border border-[#e3e0db] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden ${isGuidedWalkthrough ? 'relative z-20' : ''}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e3e0db]/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#d97706]/10 flex items-center justify-center">
                  <Clipboard size={14} className="text-[#d97706]" />
                </div>
                <div>
                  <p className="text-sm font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">{t('mcpserver.systemPrompt', 'System Prompt')}</p>
                  <p className="text-[11px] text-[#a3a3a3] font-['Space_Grotesk']">{t('mcpserver.systemPromptHint', "Copy and paste into your AI platform's system instructions")}</p>
                </div>
              </div>
              <div className="relative">
                <button
                  ref={copyButtonRef}
                  onClick={handleCopyPrompt}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Space_Grotesk'] font-medium transition-all border bg-white text-[#525252] hover:text-[#117dff] ${
                    isGuidedWalkthrough && !promptCopied
                      ? 'relative z-30 border-[#117dff] ring-4 ring-[#117dff]/20 shadow-[0_12px_30px_rgba(17,125,255,0.18)]'
                      : 'border-[#e3e0db] hover:border-[#117dff]/30'
                  }`}
                >
                  {promptCopied ? <><Check size={12} className="text-[#16a34a]" /> {t('mcpserver.copied', 'Copied')}</> : <><Copy size={12} /> {t('mcpserver.copyPrompt', 'Copy Prompt')}</>}
                </button>
                {isGuidedWalkthrough && !promptCopied && (
                  <div className="absolute left-1/2 top-[calc(100%+12px)] z-30 w-56 -translate-x-1/2 rounded-2xl border border-[#117dff]/20 bg-[#117dff] px-3 py-2 text-xs font-semibold text-white shadow-[0_16px_36px_rgba(17,125,255,0.28)]">
                    <div className="absolute left-1/2 top-[-6px] h-3 w-3 -translate-x-1/2 rotate-45 bg-[#117dff]" />
                    {t('mcpserver.copyPromptFirst', 'Copy this prompt first.')}
                  </div>
                )}
              </div>
            </div>

            {/* Variant selector */}
            <div className="px-5 pt-3 pb-2 border-b border-[#e3e0db]/50 flex gap-1.5">
              {[
                { id: 'coding', label: t('mcpserver.promptCoding', 'AI Coding Assistant'), desc: t('mcpserver.promptCodingDesc', 'Cursor / Claude Code / Copilot') },
                { id: 'agent', label: t('mcpserver.promptAgent', 'AI Agent'), desc: t('mcpserver.promptAgentDesc', 'Claude / ChatGPT / general agents') },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setPromptVariant(opt.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-left transition-all border ${
                    promptVariant === opt.id
                      ? 'bg-[#117dff]/5 border-[#117dff]/30'
                      : 'bg-white border-[#e3e0db] hover:border-[#117dff]/20'
                  } ${isGuidedWalkthrough && recommendedPrompt === opt.id ? 'relative z-20 ring-2 ring-[#117dff]/20' : ''}`}
                >
                  <p className={`text-xs font-semibold font-['Space_Grotesk'] ${promptVariant === opt.id ? 'text-[#117dff]' : 'text-[#0a0a0a]'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-[#a3a3a3] font-['Space_Grotesk']">{opt.desc}</p>
                  {isGuidedWalkthrough && recommendedPrompt === opt.id && (
                    <span className="mt-1 inline-flex rounded-full bg-[#117dff]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#117dff]">
                      {t('mcpserver.recommended', 'Recommended')}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {promptCopied && isGuidedWalkthrough && (
              <div ref={pasteBannerRef} className="relative z-30 mx-5 mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-[0_14px_32px_rgba(22,163,74,0.16)] ring-4 ring-emerald-200/60">
                <div className="absolute -left-3 top-4 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white shadow-lg">
                  Next
                </div>
                <p className="text-sm text-emerald-700 font-['Space_Grotesk'] leading-relaxed">
                  {connector === 'claude-code'
                    ? t('mcpserver.promptCopiedClaudeCode', 'Prompt copied. Now paste it into your Claude Code session instructions and keep HIVEMIND on by default. Then return to the Connectors page and run Verify Connection.')
                    : t('mcpserver.promptCopiedGeneric', 'Prompt copied. Now paste it into your Claude Code or co-worker AI instructions and keep HIVEMIND on by default. Then return to the Connectors page and run Verify Connection.')}
                </p>
              </div>
            )}

            <div className="relative max-h-[360px] overflow-y-auto">
              <pre className="px-5 py-4 text-[11px] font-mono text-[#525252] leading-relaxed whitespace-pre-wrap">{activePrompt}</pre>
            </div>
          </div>
        </motion.div>


        {/* Tools group (Tab bar + cards) — order 2 (right after install) */}
        <div style={{ order: 2 }}>
        <div className="flex gap-1 mb-4 bg-white border border-[#e3e0db] rounded-xl p-1 w-fit flex-wrap">
          {[
            { id: 'tools', label: t('mcpserver.tabMemory', 'Memory'), count: MEMORY_TOOLS.length },
            { id: 'web', label: t('mcpserver.tabWeb', 'Web Intelligence'), count: WEB_TOOLS.length },
            { id: 'coding', label: t('mcpserver.tabCoding', 'Coding Intelligence'), count: CODING_TOOLS.length + CODE_TEMPORAL_TOOLS.length },
            { id: 'temporal', label: t('mcpserver.tabTemporal', 'Time Travel'), count: TEMPORAL_TOOLS.length },
            { id: 'chatgpt', label: t('mcpserver.tabChatgpt', 'ChatGPT'), count: 5 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-['Space_Grotesk'] font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#117dff]/10 text-[#117dff]'
                  : 'text-[#a3a3a3] hover:text-[#525252]'
              }`}
            >
              {tab.label} <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Tool cards */}
        {activeTab === 'chatgpt' ? (
          <motion.div variants={stagger} initial="initial" animate="animate" key="chatgpt" className="space-y-3">
            <div className="rounded-2xl border border-[#117dff]/20 bg-gradient-to-br from-[#117dff]/[0.04] to-white p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center text-lg">🤖</div>
                <div>
                  <h3 className="text-[#0a0a0a] text-base font-bold font-['Space_Grotesk']">{t('mcpserver.chatgptTitle', 'ChatGPT One-Click Connector')}</h3>
                  <p className="text-[#525252] text-xs font-['Space_Grotesk'] mt-1">
                    {t('mcpserver.chatgptDesc', 'Custom GPT & ChatGPT plugin connector. OAuth 2.0 + 5 narrow tools mapped from your MCP surface.')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-[#e3e0db] bg-white p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-1">OpenAPI spec</div>
                  <code className="text-[11px] text-[#0a0a0a] break-all">https://hivemind.davinciai.eu/v1/chatgpt/openapi.yaml</code>
                </div>
                <div className="rounded-xl border border-[#e3e0db] bg-white p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-1">Authorization URL</div>
                  <code className="text-[11px] text-[#0a0a0a] break-all">https://hivemind.davinciai.eu/oauth/authorize</code>
                </div>
                <div className="rounded-xl border border-[#e3e0db] bg-white p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-1">Token URL</div>
                  <code className="text-[11px] text-[#0a0a0a] break-all">https://hivemind.davinciai.eu/oauth/token</code>
                </div>
                <div className="rounded-xl border border-[#e3e0db] bg-white p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-1">Scopes</div>
                  <code className="text-[11px] text-[#0a0a0a]">memory:read · memory:write · web:search</code>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-[#e3e0db] bg-[#fafaf6] p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-2">{t('mcpserver.chatgptSetupTitle', 'Setup in OpenAI dev dashboard')}</div>
                <ol className="text-[12px] text-[#525252] font-['Space_Grotesk'] space-y-1 list-decimal pl-4">
                  <li>{t('mcpserver.chatgptStep1', 'Create a new GPT → Configure → Actions → Import from URL')}</li>
                  <li>{t('mcpserver.chatgptStep2', 'Paste the OpenAPI spec URL above')}</li>
                  <li>{t('mcpserver.chatgptStep3', 'Set Authentication → OAuth → paste Authorization + Token URLs + scopes')}</li>
                  <li>{t('mcpserver.chatgptStep4', 'OpenAI gives you a redirect URI → register it in HIVEMIND admin (POST /oauth/clients)')}</li>
                  <li>{t('mcpserver.chatgptStep5', 'Publish & click "Connect to HIVEMIND" in any chat')}</li>
                </ol>
              </div>
              <a
                href="https://hivemind.davinciai.eu/v1/chatgpt/openapi.yaml"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 mt-4 px-3 py-2 rounded-lg bg-[#117dff] text-white text-[12px] font-semibold hover:bg-[#0066e0] transition-colors"
              >
                {t('mcpserver.viewOpenApiSpec', 'View OpenAPI spec ↗')}
              </a>
            </div>

            <div className="rounded-xl border border-[#e3e0db] bg-white p-4">
              <div className="text-[12px] font-semibold text-[#0a0a0a] mb-2">{t('mcpserver.exposedOps', 'Exposed Operations (5)')}</div>
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="text-[#a3a3a3] uppercase tracking-wider text-[10px]">
                    <th className="text-left py-1.5 pr-3">{t('mcpserver.colOperationId', 'operationId')}</th>
                    <th className="text-left py-1.5 pr-3">{t('mcpserver.colMethod', 'Method')}</th>
                    <th className="text-left py-1.5 pr-3">{t('mcpserver.colPath', 'Path')}</th>
                    <th className="text-left py-1.5">{t('mcpserver.colMapsTo', 'Maps to')}</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {[
                    ['searchMemory',       'POST', '/v1/chatgpt/memory/search', 'hivemind_recall'],
                    ['saveMemory',         'POST', '/v1/chatgpt/memory/save',   'hivemind_save_memory'],
                    ['listMemories',       'GET',  '/v1/chatgpt/memory/list',   'hivemind_list_memories'],
                    ['queryMemoryWithAI',  'POST', '/v1/chatgpt/memory/query',  'hivemind_query_with_ai'],
                    ['webSearch',          'POST', '/v1/chatgpt/web/search',    'hivemind_web_search'],
                  ].map(([opId, m, p, maps]) => (
                    <tr key={opId} className="border-t border-[#f3f1ec]">
                      <td className="py-1.5 pr-3 text-[#117dff]">{opId}</td>
                      <td className="py-1.5 pr-3 text-[#525252]">{m}</td>
                      <td className="py-1.5 pr-3 text-[#0a0a0a] break-all">{p}</td>
                      <td className="py-1.5 text-[#525252]">{maps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={stagger} initial="initial" animate="animate" key={activeTab} className="space-y-2">
            {(TAB_DATA[activeTab] || MEMORY_TOOLS).map(tool => (
              <ToolCard key={tool.name} tool={tool} />
            ))}
          </motion.div>
        )}
        </div>

        {/* Universal MCP schema — order 4 (below system prompt) */}
        <div style={{ order: 4 }}>
          <UniversalSchemaCard />
        </div>

        {/* Decision flowchart — order 9 (at the very bottom) */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="mt-8" style={{ order: 9 }}>
          <div className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold font-['Space_Grotesk'] text-[#0a0a0a] mb-4 flex items-center gap-2">
              <Zap size={14} className="text-[#d97706]" /> {t('mcpserver.decisionFlowchart', 'Decision Flowchart')}
            </h3>
            <div className="space-y-3 text-xs font-['Space_Grotesk'] text-[#525252]">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#117dff]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#117dff]">1</div>
                <div><span className="font-semibold text-[#0a0a0a]">{t('mcpserver.flowStep1Label', 'User asks a question')}</span> → {t('mcpserver.flowStep1Body', 'Call')} <code className="text-[#117dff] bg-[#117dff]/5 px-1 rounded">hivemind_recall</code> {t('mcpserver.flowStep1Trail', 'first to check stored knowledge')}</div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#16a34a]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#16a34a]">2</div>
                <div><span className="font-semibold text-[#0a0a0a]">{t('mcpserver.flowStep2Label', 'Needs live data?')}</span> → <code className="text-[#16a34a] bg-[#16a34a]/5 px-1 rounded">hivemind_web_search</code> {t('mcpserver.or', 'or')} <code className="text-[#16a34a] bg-[#16a34a]/5 px-1 rounded">hivemind_web_crawl</code></div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#d97706]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#d97706]">3</div>
                <div><span className="font-semibold text-[#0a0a0a]">{t('mcpserver.flowStep3Label', 'Complex synthesis?')}</span> → <code className="text-[#d97706] bg-[#d97706]/5 px-1 rounded">hivemind_query_with_ai</code></div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#8b5cf6]">4</div>
                <div><span className="font-semibold text-[#0a0a0a]">{t('mcpserver.flowStep4Label', 'Worth remembering?')}</span> → <code className="text-[#8b5cf6] bg-[#8b5cf6]/5 px-1 rounded">hivemind_save_memory</code> {t('mcpserver.flowStep4Trail', 'after responding')}</div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#16a34a]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#16a34a]">5</div>
                <div><span className="font-semibold text-[#0a0a0a]">{t('mcpserver.flowStep5Label', 'Web results useful?')}</span> → {t('mcpserver.flowStep5Body', 'Offer to save to memory with source URL tags')}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
