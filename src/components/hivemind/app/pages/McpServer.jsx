import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
function CopyButton({ text, label = 'Copy' }) {
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
      {copied ? <><Check size={12} className="text-[#16a34a]" /> Copied</> : <><Copy size={12} /> {label}</>}
    </button>
  );
}

/* ─── Tool card ──────────────────────────────────────────────────── */
function ToolCard({ tool }) {
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
                  <p className="text-[10px] text-[#a3a3a3] font-mono uppercase tracking-wider mb-1.5">Parameters</p>
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
                  <p className="text-[10px] text-[#a3a3a3] font-mono uppercase tracking-wider mb-1.5">Example</p>
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
const MEMORY_TOOLS = [
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

const WEB_TOOLS = [
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
const CODING_TOOLS = [
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

/* ─── Time Travel Tools (bi-temporal — coding-scope gated) ─────────── */
const TEMPORAL_TOOLS = [
  {
    name: 'hivemind_code_at',
    icon: Clock,
    colorClass: 'bg-[#8b5cf6]/10 text-[#8b5cf6]',
    badge: 'bi-temporal',
    badgeClass: 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20',
    summary: 'What did the codebase look like on date X?',
    description: 'Bi-temporal as-of snapshot. transaction_time = when system learned the fact. valid_time = when fact was true in the world. Pass either or both.',
    params: [
      { name: 'transaction_time', required: false, desc: 'ISO timestamp — when system learned (required if valid_time omitted)' },
      { name: 'valid_time', required: false, desc: 'ISO timestamp — when fact was true (required if transaction_time omitted)' },
      { name: 'file_path', required: false, desc: 'Optional file path filter' },
      { name: 'project', required: false, desc: 'Optional project filter' },
    ],
    example: `hivemind_code_at({
  transaction_time: "2026-05-01T00:00:00Z",
  file_path: "core/src/mcp/hosted-service.js"
})`,
  },
  {
    name: 'hivemind_code_diff',
    icon: GitCommit,
    colorClass: 'bg-[#16a34a]/10 text-[#16a34a]',
    badge: 'bi-temporal',
    badgeClass: 'bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/20',
    summary: 'What changed between two timestamps?',
    description: 'Returns added / removed / modified memories between time_a and time_b, each with tags + documentDate. AND-intersect with file_path tag and any extra tags.',
    params: [
      { name: 'time_a', required: true, desc: 'Earlier ISO timestamp' },
      { name: 'time_b', required: true, desc: 'Later ISO timestamp' },
      { name: 'file_path', required: false, desc: 'Filter — translated to tag file:<path>' },
      { name: 'tags', required: false, desc: 'Additional AND-intersected tags (e.g. ["fn:foo", "decision"])' },
    ],
    example: `hivemind_code_diff({
  time_a: "2026-05-08T00:00:00Z",
  time_b: "2026-05-09T00:00:00Z",
  file_path: "core/src/mcp/hosted-service.js"
})`,
  },
  {
    name: 'hivemind_code_timeline',
    icon: History,
    colorClass: 'bg-[#d97706]/10 text-[#d97706]',
    badge: 'version chain',
    badgeClass: 'bg-[#d97706]/10 text-[#d97706] border-[#d97706]/20',
    summary: 'Full version chain for a file or memory',
    description: 'Walks the MemoryVersion ledger — every revision, supersession, and reason. Resolve by memory_id (preferred) or by file_path (resolves to latest memory tagged file:<path>).',
    params: [
      { name: 'memory_id', required: false, desc: 'Memory UUID to fetch timeline for' },
      { name: 'file_path', required: false, desc: 'Alternative — resolves to latest memory tagged file:<path>' },
    ],
    example: `hivemind_code_timeline({
  file_path: "core/src/mcp/hosted-service.js"
})`,
  },
];

/* ─── System prompt text ─────────────────────────────────────────── */
const SYSTEM_PROMPT_AGENT = `You are connected to HIVEMIND — the persistent, bi-temporal memory engine
that turns you from a stateless chatbot into a context-aware assistant
with perfect recall across every session, machine, and conversation.

═══════════════════════════════════════════════════════════════════
WHAT HIVEMIND IS
═══════════════════════════════════════════════════════════════════

A queryable knowledge graph of everything the user has ever told you.
Each "memory" is an atomic fact, decision, preference, conversation,
note, event, or extracted insight. Memories link via typed relationships
(Updates / Extends / Derives / Contradicts / Supports / References) and
carry timestamps so you can time-travel. Stored memories are vector-
indexed for semantic recall and tag-indexed for surgical filtering.

Your job: use HIVEMIND aggressively. The user pays for personalisation;
deliver it. The smarter the recall, the smarter you appear.

═══════════════════════════════════════════════════════════════════
THE THREE REFLEXES (DO THESE WITHOUT BEING ASKED)
═══════════════════════════════════════════════════════════════════

REFLEX 1 — RECALL FIRST. Before answering anything that could touch
prior context (preferences, projects, people, history, opinions), call
hivemind_recall. If the user has been talking to you for more than one
session, assume context exists.

REFLEX 2 — SAVE AS YOU GO. After any exchange where the user reveals
something durable (a fact, preference, decision, goal, person, place,
deadline, opinion, identity), call hivemind_save_memory in the
background while you reply.

REFLEX 3 — UPDATE ON CONTRADICTION. If new information contradicts
something you recalled, call hivemind_update_memory with the new value
and a brief note explaining why it changed. Never silently overwrite.

If you do all three on every turn, the user will feel like you've known
them their whole life. If you skip any of them, you waste the system.

═══════════════════════════════════════════════════════════════════
TOOL CATALOG — KNOW BY HEART
═══════════════════════════════════════════════════════════════════

## Memory Core

hivemind_recall({ query, mode, limit, tags?, source_type? })
  • mode: "quick" — token-cheap vector lookup. Use 90% of the time.
  • mode: "panorama" — adds temporal ordering. Use for "what did I
    work on last week", "when did I decide X", "show me a timeline".
  • mode: "insight" — runs an LLM over the matched memories and
    returns synthesized prose. Use for "summarise X", "what do I
    think about X", "trace the evolution of Y".
  Example: hivemind_recall({ query: "user's design taste", mode: "quick", limit: 5 })

hivemind_save_memory({ title, content, tags, memory_type?, source_platform? })
  • title: 3–8 words. Searchable.
  • content: the fact. One claim per memory when possible.
  • tags: array of strings. ALWAYS tag. See TAGGING below.
  • memory_type: "fact" | "preference" | "decision" | "goal" |
    "event" | "lesson" | "relationship" | "note"
  Example: hivemind_save_memory({
    title: "Prefers dark IDE themes",
    content: "User uses dark themes everywhere — VS Code Dracula,
              terminal Solarized Dark.",
    tags: ["preference", "ide", "ui"],
    memory_type: "preference",
  })

hivemind_get_memory({ id })
  Full record for a known memory id. Use after recall when you need
  the full content beyond the snippet.

hivemind_list_memories({ tags?, memory_type?, limit?, since? })
  Explicit "show me my memories about X" UX. Returns paged list.

hivemind_update_memory({ id, content?, title?, tags?, reason? })
  Use when a fact changes (job title, location, preference flip).
  The engine emits an Updates edge so the version chain stays intact.

hivemind_delete_memory({ id })
  User explicitly says "forget X". Confirm before calling on anything
  consequential.

hivemind_save_conversation({ title, messages, tags, platform })
  End of a meaningful conversation. Snapshot the reasoning trail so
  the next agent can pick up where this one stopped.

hivemind_traverse_graph({ memory_id, depth?, relationship? })
  "What's related to X?" — walks edges outward. depth: 1–3 typical.
  relationship: "all" | "Updates" | "Extends" | "Derives" | etc.

hivemind_query_with_ai({ query, scope?, mode? })
  Complex synthesis over many memories: "summarise everything you
  know about my Q3 plans", "compare what I've said about Stripe vs
  Lemon Squeezy". Heavier than recall — use sparingly.

## Web Intelligence

hivemind_web_search({ query, freshness? })  → returns job_id
hivemind_web_crawl({ url, depth? })          → returns job_id
hivemind_web_job_status({ job_id })          → poll until ok or failed
hivemind_web_usage()                          → check quota first

Standard flow:
  1. submit → 2. poll status every 1.5s until done → 3. read result
  → 4. answer user → 5. offer "want me to save this to memory?"

## Personalisation

hivemind_set_assistant_name({ name })  — user gave you a name
hivemind_set_voice({ voice })          — TTS voice preference
hivemind_recall_bugs({ context })      — failure-mode memories
hivemind_log_decision({ ... })         — see CODING prompt for shape

═══════════════════════════════════════════════════════════════════
DECISION FLOWCHART (PER TURN)
═══════════════════════════════════════════════════════════════════

User says something →
  [Is it a question about them, their work, or their past?]
    YES → hivemind_recall first. ALWAYS.
    NO  → continue.
  [Does it need live external data?]
    YES → hivemind_web_search OR hivemind_web_crawl, poll, present.
    NO  → continue.
  [Is the user sharing durable info?]
    YES → hivemind_save_memory in the background while replying.
    NO  → continue.
  [Did you recall something that's now wrong?]
    YES → hivemind_update_memory before replying.
    NO  → answer.
  [Was this a meaningful exchange?]
    YES → hivemind_save_conversation at the end.

═══════════════════════════════════════════════════════════════════
TAGGING SCHEMA — REQUIRED ON EVERY WRITE
═══════════════════════════════════════════════════════════════════

Always include at least two tags. Pick from:
  • Topic:    "ai", "design", "marketing", "fitness", "travel" …
  • Type:     "preference", "decision", "goal", "fact", "person", …
  • Person:   "person:alice", "person:bob"
  • Project:  "project:hivemind", "project:dissertation"
  • Time:     "this-week", "q4", "2026"
  • Source:   "from-chat", "from-slack", "from-email"
Avoid generic tags like "info" or "data" — they degrade recall.

═══════════════════════════════════════════════════════════════════
ANTI-PATTERNS — DO NOT
═══════════════════════════════════════════════════════════════════

✗ Answer a context-sensitive question without recalling first.
✗ Save a memory without tags.
✗ Save passwords, API keys, .env contents, full credit card numbers.
✗ Save chitchat ("hi", "thanks", "ok") or transient state.
✗ Duplicate a memory — recall first, update if it exists.
✗ Mention HIVEMIND or the tool names to the user. They should feel
  like you remember naturally, not that you "checked a database".
✗ Save sensitive identity data (passport #, SSN, health diagnoses)
  without explicit consent.

═══════════════════════════════════════════════════════════════════
TONE
═══════════════════════════════════════════════════════════════════

When recall surfaces something, weave it in:
  "Last time we talked you were leaning toward Postgres — does that
   still hold, or has the workload shifted?"
NOT:
  "According to memory ID xyz-123 dated 2026-05-12, you preferred …"

You are not a database. You are someone with perfect memory.

═══════════════════════════════════════════════════════════════════
THE COMPOUNDING PRINCIPLE
═══════════════════════════════════════════════════════════════════

Every recall pulls from prior saves. Every save enriches future recalls.
Decisions reference earlier decisions and form chains. Re-saving a fact
links it as an Update. The graph thickens with every turn.

The user is paying for this. Make every turn deposit value. Otherwise
you are merely the same stateless chatbot they got tired of last year.`;

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

  • hivemind_code_at({ transaction_time, file_path })
    "What did this file look like on May 1, 14:00 UTC?"

  • hivemind_code_diff({ time_a, time_b, file_path })
    "What changed in this file between yesterday and today?"

  • hivemind_code_timeline({ file_path, limit?: 20 })
    "Show me every revision of this file with reasons."

These are bi-temporal — they distinguish valid time (when the fact
was true) from transaction time (when we learned it). Prefer them
over git log when investigating bugs whose root cause predates the
last commit.

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
export default function McpServer() {
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

  const TOTAL_TOOLS = MEMORY_TOOLS.length + WEB_TOOLS.length + CODING_TOOLS.length + TEMPORAL_TOOLS.length;
  const activePrompt = promptVariant === 'coding' ? SYSTEM_PROMPT_CODING : SYSTEM_PROMPT_AGENT;

  const TAB_DATA = {
    tools: MEMORY_TOOLS,
    web: WEB_TOOLS,
    coding: CODING_TOOLS,
    temporal: TEMPORAL_TOOLS,
  };

  return (
    <div className="min-h-screen bg-[#faf9f4] p-6 md:p-10">
      {isGuidedWalkthrough && (
        <div className="fixed inset-0 z-10 bg-[#0a0a0a]/35 backdrop-blur-[2px] pointer-events-none" />
      )}
      <div className="max-w-4xl mx-auto">
        <ApiKeyPrompt feature="MCP server connections" />

        {isGuidedWalkthrough && (
          <motion.div {...fadeUp} className="relative z-20 mb-6 rounded-2xl border border-[#117dff]/20 bg-[#f7fbff] p-5 shadow-[0_10px_30px_rgba(17,125,255,0.12)]">
            <div className="flex items-center gap-3 mb-2">
              <span className="rounded-full bg-[#117dff]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#117dff]">Step 2 of 2</span>
              <span className="text-xs text-[#525252] font-['Space_Grotesk']">Pick the recommended prompt, copy it, then paste it into your client instructions.</span>
            </div>
            <p className="text-sm text-[#525252] font-['Space_Grotesk'] leading-relaxed">
              {connector === 'claude-code'
                ? 'For Claude Code, use the AI Coding Assistant prompt below. After copying it, paste it into your Claude Code session instructions so HIVEMIND is used by default.'
                : 'Choose the prompt that matches your client, copy it, then paste it into the client instructions before you return to verify the connection.'}
            </p>
          </motion.div>
        )}

        {/* Header */}
        <motion.div {...fadeUp} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <Server size={20} className="text-[#117dff]" />
            </div>
            <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk']">MCP Server</h1>
          </div>
          <p className="text-[#525252] text-sm font-['Space_Grotesk'] ml-[52px]">
            HIVEMIND exposes {TOTAL_TOOLS} MCP tools — persistent memory, semantic search, knowledge-graph traversal, live web intelligence, coding intelligence, and bi-temporal time-travel queries.
          </p>
        </motion.div>

        {/* System Prompt Card */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="mb-8">
          <div className={`bg-white border border-[#e3e0db] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden ${isGuidedWalkthrough ? 'relative z-20' : ''}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e3e0db]/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#d97706]/10 flex items-center justify-center">
                  <Clipboard size={14} className="text-[#d97706]" />
                </div>
                <div>
                  <p className="text-sm font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">System Prompt</p>
                  <p className="text-[11px] text-[#a3a3a3] font-['Space_Grotesk']">Copy and paste into your AI platform's system instructions</p>
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
                  {promptCopied ? <><Check size={12} className="text-[#16a34a]" /> Copied</> : <><Copy size={12} /> Copy Prompt</>}
                </button>
                {isGuidedWalkthrough && !promptCopied && (
                  <div className="absolute left-1/2 top-[calc(100%+12px)] z-30 w-56 -translate-x-1/2 rounded-2xl border border-[#117dff]/20 bg-[#117dff] px-3 py-2 text-xs font-semibold text-white shadow-[0_16px_36px_rgba(17,125,255,0.28)]">
                    <div className="absolute left-1/2 top-[-6px] h-3 w-3 -translate-x-1/2 rotate-45 bg-[#117dff]" />
                    Copy this prompt first.
                  </div>
                )}
              </div>
            </div>

            {/* Variant selector */}
            <div className="px-5 pt-3 pb-2 border-b border-[#e3e0db]/50 flex gap-1.5">
              {[
                { id: 'coding', label: 'AI Coding Assistant', desc: 'Cursor / Claude Code / Copilot' },
                { id: 'agent', label: 'AI Agent', desc: 'Claude / ChatGPT / general agents' },
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
                      Recommended
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
                  Prompt copied. Now paste it into your {connector === 'claude-code' ? 'Claude Code session instructions' : 'Claude Code or co-worker AI instructions'} and keep HIVEMIND on by default. Then return to the Connectors page and run Verify Connection.
                </p>
              </div>
            )}

            <div className="relative max-h-[360px] overflow-y-auto">
              <pre className="px-5 py-4 text-[11px] font-mono text-[#525252] leading-relaxed whitespace-pre-wrap">{activePrompt}</pre>
            </div>
          </div>
        </motion.div>

        {/* Quick Setup Cards */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="mb-8">
          <h2 className="text-[#525252] text-xs font-mono uppercase tracking-wider mb-3">Quick Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                title: 'Claude Desktop / Claude Code',
                icon: Terminal,
                config: `claude mcp add --transport http hivemind \
  "https://core.hivemind.davinciai.eu:8050/api/mcp" \
  --scope user \
  --header "Authorization: Bearer YOUR_API_KEY"`,
              },
              {
                title: 'Cursor / VS Code',
                icon: Terminal,
                config: `{
  "mcpServers": {
    "hivemind": {
      "transport": "http",
      "url": "https://core.hivemind.davinciai.eu:8050/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`,
              },
              {
                title: 'REST API (Direct)',
                icon: Globe,
                config: `curl -X POST https://core.hivemind.davinciai.eu:8050/api/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"method":"tools/list","params":{},"id":1}'`,
              },
              {
                title: 'HTTP (Any Client)',
                icon: Link2,
                config: `Endpoint: POST /api/mcp
Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: application/json
Body:
  {"method":"tools/call","params":{"name":"hivemind_recall","arguments":{"query":"..."}},"id":1}`,
              },
            ].map((setup) => {
              const Icon = setup.icon;
              return (
                <div key={setup.title} className="bg-white border border-[#e3e0db] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e0db]/50">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-[#a3a3a3]" />
                      <p className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">{setup.title}</p>
                    </div>
                    <CopyButton text={setup.config} label="" />
                  </div>
                  <pre className="px-4 py-3 text-[10px] font-mono text-[#525252] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[160px] overflow-y-auto bg-[#faf9f4]">
                    {setup.config}
                  </pre>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 bg-white border border-[#e3e0db] rounded-xl p-1 w-fit flex-wrap">
          {[
            { id: 'tools', label: 'Memory', count: MEMORY_TOOLS.length },
            { id: 'web', label: 'Web Intelligence', count: WEB_TOOLS.length },
            { id: 'coding', label: 'Coding Intelligence', count: CODING_TOOLS.length },
            { id: 'temporal', label: 'Time Travel', count: TEMPORAL_TOOLS.length },
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
        <motion.div variants={stagger} initial="initial" animate="animate" key={activeTab} className="space-y-2">
          {(TAB_DATA[activeTab] || MEMORY_TOOLS).map(tool => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </motion.div>

        {/* Decision flowchart */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="mt-8">
          <div className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold font-['Space_Grotesk'] text-[#0a0a0a] mb-4 flex items-center gap-2">
              <Zap size={14} className="text-[#d97706]" /> Decision Flowchart
            </h3>
            <div className="space-y-3 text-xs font-['Space_Grotesk'] text-[#525252]">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#117dff]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#117dff]">1</div>
                <div><span className="font-semibold text-[#0a0a0a]">User asks a question</span> → Call <code className="text-[#117dff] bg-[#117dff]/5 px-1 rounded">hivemind_recall</code> first to check stored knowledge</div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#16a34a]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#16a34a]">2</div>
                <div><span className="font-semibold text-[#0a0a0a]">Needs live data?</span> → <code className="text-[#16a34a] bg-[#16a34a]/5 px-1 rounded">hivemind_web_search</code> or <code className="text-[#16a34a] bg-[#16a34a]/5 px-1 rounded">hivemind_web_crawl</code></div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#d97706]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#d97706]">3</div>
                <div><span className="font-semibold text-[#0a0a0a]">Complex synthesis?</span> → <code className="text-[#d97706] bg-[#d97706]/5 px-1 rounded">hivemind_query_with_ai</code></div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#8b5cf6]">4</div>
                <div><span className="font-semibold text-[#0a0a0a]">Worth remembering?</span> → <code className="text-[#8b5cf6] bg-[#8b5cf6]/5 px-1 rounded">hivemind_save_memory</code> after responding</div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#16a34a]/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#16a34a]">5</div>
                <div><span className="font-semibold text-[#0a0a0a]">Web results useful?</span> → Offer to save to memory with source URL tags</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
