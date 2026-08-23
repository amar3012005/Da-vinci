import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Hexagon, KeyRound, Server, Terminal, Shield, BookOpen, ChevronRight, ChevronDown, Copy, Check,
  Zap, HardDrive, Github, Star, Rocket, Download, GitBranch, Layers, Brain, Lock, AlertTriangle,
  Wrench, ArrowRight, ArrowDown, Compass, ClipboardCheck, ShieldCheck, Sparkles, GitCommit, FolderGit2,
  Search,
} from 'lucide-react';
import { MEMORY_TOOLS, WEB_TOOLS, CODING_TOOLS, TEMPORAL_TOOLS } from './app/pages/McpServer';

const ICARUS_REPO = 'amar3012005/ICARUS';

function GithubStarBadge() {
  const [stars, setStars] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(`https://api.github.com/repos/${ICARUS_REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setStars(d.stargazers_count); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <a href={`https://github.com/${ICARUS_REPO}`} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-[8px] border border-[#e3e0db] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0a0a0a] no-underline hover:border-[#c9c5bc]">
      <Github size={14} />
      {ICARUS_REPO}
      <span className="flex items-center gap-1 rounded-[5px] bg-[#f3f1ec] px-1.5 py-0.5 text-[11px] font-mono text-[#525252]">
        <Star size={11} className="text-[#e0a100]" fill="#e0a100" />
        {stars === null ? '···' : stars.toLocaleString()}
      </span>
    </a>
  );
}

/**
 * /hivemind/docs — public technical documentation.
 * Sections: API key reference · MCP server setup · full tool reference.
 * Tool data is imported from McpServer.jsx so the docs can never drift
 * from the in-app catalog. SINGULANCE-branded navbar.
 */

const CORE = (process.env.REACT_APP_CORE_API_URL || 'https://core.singulancelabs.com').replace(/\/$/, '');
const MCP_URL = `${CORE}/api/mcp`;

function CodeBlock({ label, children }) {
  const [copied, setCopied] = useState(false);
  const text = typeof children === 'string' ? children : '';
  return (
    <div className="rounded-[10px] border border-[#e3e0db] bg-white overflow-hidden my-3">
      <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-[#e3e0db] bg-[#faf9f4]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 text-[10px] font-mono text-[#a3a3a3]">{label}</span>
        <button
          onClick={() => { try { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* noop */ } }}
          className="ml-auto flex items-center gap-1 text-[10px] font-mono text-[#a3a3a3] hover:text-[#0a0a0a]">
          {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}{copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="p-4 text-[12px] leading-relaxed font-mono text-[#0a0a0a] overflow-x-auto whitespace-pre">{text}</pre>
    </div>
  );
}

function Eyebrow({ children }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-2">
      <span className="text-[#a3a3a3]">〉</span> {children}
    </div>
  );
}

function H2({ id, children }) {
  return <h2 id={id} className="text-[22px] font-medium font-['Space_Grotesk'] text-[#0a0a0a] tracking-tight scroll-mt-24">{children}</h2>;
}
function H3({ id, children }) {
  return <h3 id={id} className="text-[15px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a] mt-8 mb-2 scroll-mt-24">{children}</h3>;
}
function P({ children }) {
  return <p className="text-[13.5px] leading-relaxed text-[#525252] my-2.5">{children}</p>;
}
function Mono({ children }) {
  return <code className="px-1.5 py-0.5 rounded-[4px] bg-[#f3f1ec] border border-[#e3e0db] text-[12px] font-mono text-[#0a0a0a]">{children}</code>;
}

function ToolCard({ tool }) {
  return (
    <div id={tool.name} className="rounded-[10px] border border-[#e3e0db] bg-white p-5 scroll-mt-24">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[13.5px] font-mono font-semibold text-[#0a0a0a]">{tool.name}</code>
        {tool.badge && <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-semibold uppercase tracking-wider ${tool.badgeClass}`}>{tool.badge}</span>}
        {tool.aliasOf && <span className="text-[10px] font-mono text-[#a3a3a3]">alias: {tool.aliasOf}</span>}
      </div>
      <p className="text-[12.5px] font-medium text-[#0a0a0a] mt-1.5">{tool.summary}</p>
      <p className="text-[12.5px] leading-relaxed text-[#525252] mt-1">{tool.description}</p>
      {tool.params?.length > 0 && (
        <table className="w-full mt-3 text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[#737373] border-b border-[#e3e0db]">
              <th className="py-1.5 pr-3 font-semibold">Parameter</th>
              <th className="py-1.5 pr-3 font-semibold w-16">Req.</th>
              <th className="py-1.5 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eae7e1]">
            {tool.params.map((p) => (
              <tr key={p.name}>
                <td className="py-1.5 pr-3 font-mono text-[#0a0a0a] whitespace-nowrap">{p.name}</td>
                <td className="py-1.5 pr-3">{p.required ? <span className="text-[#117dff] font-semibold">yes</span> : <span className="text-[#a3a3a3]">no</span>}</td>
                <td className="py-1.5 text-[#525252]">{p.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tool.example && <CodeBlock label="example">{tool.example}</CodeBlock>}
    </div>
  );
}

// Composio-style grouped sidebar: named product sections, each collapsible, each a real
// heading in the page — not a flat anchor dump. Two products, two sidebars — HIVEMIND (the
// hosted platform) and ICARUS (the open-source self-host engine), switched by the top-nav tab,
// exactly like Composio's own Docs/Examples/Toolkits/Reference tabs each own their content.
const HIVEMIND_GROUPS = [
  {
    title: 'Get started',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'api-keys', label: 'API key reference' },
      { id: 'auth-headers', label: 'Auth headers' },
      { id: 'key-lifecycle', label: 'Lifecycle & scopes' },
    ],
  },
  {
    title: 'MCP server',
    items: [
      { id: 'mcp-setup', label: 'Setting up the server' },
      { id: 'mcp-claude-code', label: 'Claude Code' },
      { id: 'mcp-claude-ai', label: 'Claude.ai / Desktop' },
      { id: 'mcp-cursor', label: 'Cursor & JSON clients' },
      { id: 'mcp-stdio', label: 'stdio bridge' },
      { id: 'mcp-verify', label: 'Verify the connection' },
    ],
  },
  {
    title: 'Agent integrations',
    items: [
      { id: 'agents', label: 'Overview' },
      { id: 'agent-openclaw', label: 'OpenClaw' },
      { id: 'agent-hermes', label: 'Hermes Agents' },
      { id: 'agent-langchain', label: 'LangChain / custom' },
      { id: 'agent-http', label: 'Any agent (raw HTTP)' },
    ],
  },
  {
    title: 'REST API',
    items: [
      { id: 'ingestion', label: 'Ingestion (uploads)' },
      { id: 'ingest-file', label: 'Upload a file' },
      { id: 'ingest-source', label: 'Text / URL / conversation' },
      { id: 'ingest-status', label: 'Poll status' },
      { id: 'ingest-types', label: 'Supported types' },
      { id: 'recall', label: 'Recall & search' },
      { id: 'recall-recall', label: 'Recall' },
      { id: 'recall-chat', label: 'Grounded chat' },
      { id: 'documents', label: 'Documents & memories' },
    ],
  },
  {
    title: 'MCP tool reference',
    items: [
      { id: 'tools-memory', label: 'Memory' },
      { id: 'tools-web', label: 'Web intelligence' },
      { id: 'tools-coding', label: 'Coding' },
      { id: 'tools-temporal', label: 'Time travel' },
    ],
  },
  {
    title: 'Reference',
    items: [{ id: 'best-practices', label: 'Best practices' }],
  },
];

const ICARUS_GROUPS = [
  {
    title: 'Get started',
    items: [
      { id: 'selfhost-icarus', label: 'The .amr engine' },
      { id: 'selfhost-install', label: 'Install' },
      { id: 'selfhost-quickstart', label: 'Quickstart' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { id: 'selfhost-bm25', label: 'Native BM25 search' },
      { id: 'selfhost-frameworks', label: 'LangChain / LlamaIndex' },
      { id: 'selfhost-scope', label: 'Engine vs. platform' },
    ],
  },
];

// ── ICARUS Harness — the coding-agent operating layer (its own top-nav tab, distinct from
// the .amr storage engine above). Content transcribed 1:1 from HARNESS_README.md.
const HARNESS_GROUPS = [
  {
    title: 'Overview',
    items: [
      { id: 'harness-what-is', label: 'What it is' },
      { id: 'harness-what-is-not', label: 'What it is not' },
      { id: 'harness-architecture', label: 'Architecture' },
    ],
  },
  {
    title: 'Get started',
    items: [
      { id: 'harness-install', label: 'Install and initialize' },
      { id: 'harness-agent-bridge', label: 'Install the agent bridge' },
      { id: 'harness-loop', label: 'The agent operating loop' },
    ],
  },
  {
    title: 'Tasks',
    items: [
      { id: 'harness-contract', label: 'Contract' },
      { id: 'harness-lifecycle', label: 'Legal lifecycle' },
    ],
  },
  {
    title: 'Context & graph',
    items: [
      { id: 'harness-context', label: 'Context-window optimization' },
      { id: 'harness-graph', label: 'Code graph' },
    ],
  },
  {
    title: 'Memory & learning',
    items: [
      { id: 'harness-memory', label: 'Local memory' },
      { id: 'harness-capture', label: 'Learning capture' },
      { id: 'harness-skills', label: 'Governed skills' },
    ],
  },
  {
    title: 'Integration',
    items: [
      { id: 'harness-mcp', label: 'MCP and agent integration' },
      { id: 'harness-verify', label: 'Verification, export & release evidence' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { id: 'harness-cli', label: 'CLI reference' },
      { id: 'harness-safety', label: 'Safety model & current limits' },
      { id: 'harness-troubleshooting', label: 'Troubleshooting' },
    ],
  },
];

// One persistent sidebar, three products — xAI-docs-style always-visible category tree instead
// of top-nav tab switching. Each category is a product; clicking it both switches which
// content renders in <main> and expands its own item tree.
const PRODUCT_CATS = [
  { id: 'hivemind', label: 'HIVEMIND', icon: Hexagon, groups: HIVEMIND_GROUPS },
  { id: 'icarus', label: 'ICARUS · Self-host', icon: HardDrive, groups: ICARUS_GROUPS },
  { id: 'harness', label: 'ICARUS Harness', icon: GitBranch, groups: HARNESS_GROUPS },
];

// Right-rail "On this page" — the major H2 sections of the active product, for quick jump.
const HIVEMIND_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'api-keys', label: 'API key reference' },
  { id: 'mcp-setup', label: 'MCP server' },
  { id: 'agents', label: 'Agent integrations' },
  { id: 'ingestion', label: 'Ingesting content' },
  { id: 'recall', label: 'Recall & search' },
  { id: 'documents', label: 'Documents & memories' },
  { id: 'tools-memory', label: 'Memory tools' },
  { id: 'tools-web', label: 'Web intelligence tools' },
  { id: 'tools-coding', label: 'Coding intelligence tools' },
  { id: 'tools-temporal', label: 'Time-travel tools' },
  { id: 'best-practices', label: 'Best practices' },
];
const ICARUS_TOC = [
  { id: 'selfhost-icarus', label: 'Overview' },
  { id: 'selfhost-install', label: 'Install' },
  { id: 'selfhost-quickstart', label: 'Quickstart' },
  { id: 'selfhost-bm25', label: 'Native BM25 search' },
  { id: 'selfhost-frameworks', label: 'LangChain / LlamaIndex' },
  { id: 'selfhost-scope', label: 'Engine vs. platform' },
];
const HARNESS_TOC = [
  { id: 'harness-what-is', label: 'What it is' },
  { id: 'harness-what-is-not', label: 'What it is not' },
  { id: 'harness-architecture', label: 'Architecture' },
  { id: 'harness-install', label: 'Install and initialize' },
  { id: 'harness-loop', label: 'The agent operating loop' },
  { id: 'harness-contract', label: 'Task contracts and lifecycle' },
  { id: 'harness-context', label: 'Context-window optimization' },
  { id: 'harness-graph', label: 'Code graph' },
  { id: 'harness-memory', label: 'Memory and learning' },
  { id: 'harness-mcp', label: 'MCP and agent integration' },
  { id: 'harness-verify', label: 'Verification & export' },
  { id: 'harness-cli', label: 'CLI reference' },
  { id: 'harness-safety', label: 'Safety model & limits' },
  { id: 'harness-troubleshooting', label: 'Troubleshooting' },
];

function GroupList({ groups }) {
  const [open, setOpen] = useState(() => Object.fromEntries(groups.map((g) => [g.title, true])));
  useEffect(() => {
    setOpen(Object.fromEntries(groups.map((g) => [g.title, true])));
  }, [groups]);
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.title}>
          <button
            onClick={() => setOpen((o) => ({ ...o, [g.title]: !o[g.title] }))}
            className="w-full flex items-center justify-between px-2 py-1 text-[10.5px] font-semibold text-[#a3a3a3] uppercase tracking-wide"
          >
            {g.title}
            {open[g.title] ? <ChevronDown size={11} className="text-[#c9c5bc]" /> : <ChevronRight size={11} className="text-[#c9c5bc]" />}
          </button>
          {open[g.title] && (
            <div className="mt-0.5 space-y-0.5">
              {g.items.map((n) => (
                <a key={n.id} href={`#${n.id}`}
                  className="block px-2 py-1 pl-4 rounded-[6px] text-[12px] no-underline text-[#525252] hover:bg-[#f3f1ec] hover:text-[#0a0a0a]">
                  {n.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Persistent left sidebar — every product category always visible, xAI-docs style, instead of
// top-nav tabs that hide the other two products entirely.
function ProductNav({ product, setProduct, expanded, setExpanded }) {
  return (
    <div className="sticky top-20 space-y-1">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-2 px-2">Documentation</div>
      {PRODUCT_CATS.map((c) => {
        const isActive = product === c.id;
        const isOpen = expanded === c.id;
        return (
          <div key={c.id}>
            <button
              onClick={() => { setProduct(c.id); setExpanded(c.id); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[12.5px] font-semibold font-['Space_Grotesk'] transition-colors ${isActive ? 'text-[#0a0a0a] bg-[#f3f1ec]' : 'text-[#525252] hover:bg-[#faf9f4] hover:text-[#0a0a0a]'}`}
            >
              <c.icon size={13} className={isActive ? 'text-[#117dff]' : 'text-[#a3a3a3]'} />
              <span className="flex-1 text-left">{c.label}</span>
              {isOpen ? <ChevronDown size={12} className="text-[#a3a3a3]" /> : <ChevronRight size={12} className="text-[#a3a3a3]" />}
            </button>
            {isOpen && (
              <div className="mt-1.5 mb-2 pl-3.5 ml-[13px] border-l border-[#e3e0db]">
                <GroupList groups={c.groups} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OnThisPage({ headings }) {
  return (
    <div className="sticky top-20 space-y-3">
      <div className="text-[11px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">On this page</div>
      <ul className="space-y-1.5 text-[12px] border-l border-[#e3e0db] pl-3">
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className="text-[#737373] hover:text-[#117dff] no-underline leading-snug">{h.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Framework-selector tabs — Composio's "pick your language" pattern.
function FrameworkTabs({ tabs }) {
  const [active, setActive] = useState(0);
  return (
    <div className="rounded-[10px] border border-[#e3e0db] bg-white overflow-hidden my-3">
      <div className="flex items-center gap-1 px-2 pt-2 border-b border-[#e3e0db] bg-[#faf9f4]">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 text-[11px] font-mono rounded-t-[6px] -mb-px border ${i === active ? 'bg-white border-[#e3e0db] border-b-white text-[#0a0a0a] font-semibold' : 'border-transparent text-[#a3a3a3] hover:text-[#525252]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <CodeBlock label={tabs[active].label}>{tabs[active].code}</CodeBlock>
    </div>
  );
}

// ── ICARUS — self-host product docs (its own top-nav tab, its own landing) ─────────────────
function IcarusDocs() {
  return (
    <>
      {/* Composio-style product hero: headline, subtitle, three jump cards, GitHub badge */}
      <Eyebrow>OPEN SOURCE · SELF-HOST</Eyebrow>
      <h1 className="text-[34px] leading-[1.08] font-medium font-['Space_Grotesk'] text-[#0a0a0a] tracking-tight">Start building with ICARUS.</h1>
      <P>
        A memory filesystem for AI agents: one memory-mapped <Mono>.amr</Mono> file per tenant, fusing semantic,
        entity, bi-temporal, and graph recall in a single read. Apache-2.0, Rust core, Node + Python bindings,
        drop-in for a Qdrant client — <strong className="text-[#0a0a0a]">run it yourself, on your own box.</strong>
      </P>
      <div className="mt-4"><GithubStarBadge /></div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <a href="#selfhost-quickstart" className="flex items-center gap-3 rounded-[10px] border border-[#e3e0db] bg-white p-4 no-underline hover:border-[#117dff] hover:shadow-sm">
          <Rocket size={18} className="text-[#117dff] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[#0a0a0a]">Quickstart</div>
            <div className="text-[11.5px] text-[#737373]">Node · Python · CLI in 5 lines</div>
          </div>
        </a>
        <a href="#selfhost-install" className="flex items-center gap-3 rounded-[10px] border border-[#e3e0db] bg-white p-4 no-underline hover:border-[#117dff] hover:shadow-sm">
          <Download size={18} className="text-[#117dff] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[#0a0a0a]">Install</div>
            <div className="text-[11.5px] text-[#737373]">One-liner or build from source</div>
          </div>
        </a>
        <a href={`https://github.com/${ICARUS_REPO}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-[10px] border border-[#e3e0db] bg-white p-4 no-underline hover:border-[#117dff] hover:shadow-sm">
          <Github size={18} className="text-[#117dff] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[#0a0a0a]">GitHub</div>
            <div className="text-[11.5px] text-[#737373]">Source, SPEC.md, THESIS.md, issues</div>
          </div>
        </a>
      </div>

      {/* ── The engine ── */}
      <section id="selfhost-icarus" className="mt-12">
        <Eyebrow>01 · OVERVIEW</Eyebrow>
        <H2 id="selfhost-icarus">ICARUS — the <Mono>.amr</Mono> memory engine</H2>
        <P>
          Every storage mode HIVEMIND runs (<Mono>hybrid</Mono>, <Mono>amr</Mono>, <Mono>byod</Mono>) shares one
          recall contract. <strong className="text-[#0a0a0a]">ICARUS</strong> is the open-source engine behind
          the <Mono>amr</Mono> mode: a per-tenant memory-mapped file (<Mono>.amr</Mono>) fusing semantic, entity,
          bi-temporal, and graph recall in one read — no server, no network hop.
        </P>
        <table className="w-full mt-3 text-[12.5px]">
          <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#737373] border-b border-[#e3e0db]"><th className="py-1.5 pr-3 font-semibold" /><th className="py-1.5 pr-3 font-semibold">ICARUS</th><th className="py-1.5 font-semibold">Qdrant (REST, same data)</th></tr></thead>
          <tbody className="divide-y divide-[#eae7e1]">
            {[
              ['recall@10 @ 1M vectors', '1.33 ms', '2.06 ms'],
              ['recall quality (recall@5 vs exact)', '1.00', '1.00'],
              ['storage per memory', '~600 B', '~4,500 B'],
              ['vector compression', '32× (PQ)', '4× (int8)'],
              ['infrastructure', 'one mmap’d file', 'cluster'],
            ].map(([m, a, b]) => (
              <tr key={m}><td className="py-1.5 pr-3 text-[#737373] whitespace-nowrap">{m}</td><td className="py-1.5 pr-3 font-mono font-semibold text-[#117dff]">{a}</td><td className="py-1.5 font-mono text-[#525252]">{b}</td></tr>
            ))}
          </tbody>
        </table>
        <P className="text-[12px]">Repo: <a className="text-[#117dff]" href={`https://github.com/${ICARUS_REPO}`} target="_blank" rel="noreferrer">github.com/{ICARUS_REPO}</a> · format RFC: <Mono>SPEC.md</Mono> · design + benchmarks: <Mono>THESIS.md</Mono>.</P>
      </section>

      {/* ── Install ── */}
      <section id="selfhost-install" className="mt-12">
        <Eyebrow>02 · INSTALL</Eyebrow>
        <H2 id="selfhost-install">Install</H2>
        <CodeBlock label="terminal · one-liner">{`curl -fsSL https://raw.githubusercontent.com/${ICARUS_REPO}/main/install.sh | bash`}</CodeBlock>
        <P>Installs the toolchain if missing, builds the native addon, installs the <Mono>mneme</Mono> CLI to <Mono>~/.mneme</Mono>. Manual build:</P>
        <CodeBlock label="terminal · manual">{`git clone https://github.com/${ICARUS_REPO}
cd ICARUS/crate/mneme-node && npm install && npx napi build --release`}</CodeBlock>
      </section>

      {/* ── Quickstart ── */}
      <section id="selfhost-quickstart" className="mt-12">
        <Eyebrow>03 · QUICKSTART</Eyebrow>
        <H2 id="selfhost-quickstart">Quickstart</H2>
        <P>One Rust core, two language bindings — same on-disk format, identical behavior. Pick one:</P>
        <FrameworkTabs tabs={[
          {
            label: 'Node',
            code: `const { MnemeVectorStore } = require('singulance-amr'); // drop-in for QdrantVectorStore

const store = new MnemeVectorStore({ dataRoot: '~/.mneme/data', dim: 1024 });
await store.upsert('org_acme', [
  { id: 'm1', vector: embed('user prefers dark mode'), payload: { kind: 'preference' } },
]);
const hits = await store.search('org_acme', embed('ui settings'), 5); // [{ id, score, payload }]`,
          },
          {
            label: 'Python',
            code: `pip install mneme-python
# then
from mneme_python import MnemeStore

store = MnemeStore("/path/to/data", "org_acme", dim=1024)
store.insert("user prefers dark mode", embed("user prefers dark mode"), valid_from=0)
hits = store.recall(embed("ui settings"), top_k=5)  # [MnemeHit(slot_id, score, text), ...]`,
          },
          {
            label: 'CLI',
            code: `mneme ingest <dir> --org acme     # extract + embed + store a folder of docs
mneme recall "your question" --org acme
mneme compact --org acme
mneme status`,
          },
        ]} />
      </section>

      {/* ── BM25 ── */}
      <section id="selfhost-bm25" className="mt-12">
        <Eyebrow>04 · GUIDES</Eyebrow>
        <H2 id="selfhost-bm25">Native BM25 lexical search</H2>
        <P>
          Real document-frequency/IDF statistics (Okapi BM25), not a substring heuristic. One shared crate
          (<Mono>mneme-bm25</Mono>) used identically by both bindings — the same corpus and query produce the
          same score in Node and Python, not just similar ones.
        </P>
        <FrameworkTabs tabs={[
          { label: 'Node', code: `const hits = store.bm25Search('warranty terms', 10);` },
          { label: 'Python', code: `hits = store.bm25_search("warranty terms", top_k=10)` },
        ]} />
        <P className="text-[12px]">Language-neutral tokenization (lowercase, Unicode-alphanumeric split — no stemming, no stopword list). <strong className="text-[#0a0a0a]">Known limitation:</strong> results are not currently layer-filterable (0=memory/1=evidence/2=cognitive).</P>
      </section>

      {/* ── Frameworks ── */}
      <section id="selfhost-frameworks" className="mt-12">
        <Eyebrow>05 · GUIDES</Eyebrow>
        <H2 id="selfhost-frameworks">LangChain / LlamaIndex</H2>
        <P>Optional, lazy-imported adapters over the Python binding — neither is a dependency of the core:</P>
        <CodeBlock label="terminal">{`pip install "mneme-python[langchain]"   # LangChain BaseRetriever
pip install "mneme-python[llamaindex]"  # LlamaIndex vector store`}</CodeBlock>
        <FrameworkTabs tabs={[
          {
            label: 'LangChain',
            code: `from mneme_python import MnemeStore
from mneme_integrations.langchain import MnemeRetriever

store = MnemeStore("/path/to/data", "my-org", dim=1024)
retriever = MnemeRetriever(store=store, embed_query=my_embedding_fn, top_k=5)
docs = retriever.invoke("what's our warranty policy?")`,
          },
          {
            label: 'LlamaIndex',
            code: `from mneme_python import MnemeStore
from mneme_integrations.llamaindex import MnemeVectorStore

store = MnemeVectorStore(mneme=MnemeStore("/path/to/data", "my-org", dim=1024))
store.add(nodes)
result = store.query(VectorStoreQuery(query_embedding=my_vec, similarity_top_k=5))`,
          },
        ]} />
      </section>

      {/* ── Engine vs. platform ── */}
      <section id="selfhost-scope" className="mt-12 mb-20">
        <Eyebrow>06 · GUIDES</Eyebrow>
        <H2 id="selfhost-scope">Engine vs. platform</H2>
        <P>
          ICARUS is the storage substrate, not the whole product — it is exactly what <Mono>amr</Mono> mode
          runs on inside HIVEMIND. The cognition layer on top — <strong className="text-[#0a0a0a]">typed
          relationship edges, entity co-mention, temporal synthesis, conflict resolution, dreaming/consolidation</strong> —
          already exists and runs live in HIVEMIND today, on every storage mode, ICARUS included. It is not a
          gap and not on a roadmap; it is the layer this open-source engine plugs into.
        </P>
        <ul className="space-y-2 text-[13px] text-[#525252] list-none">
          {[
            ['The open-source engine is', 'a per-org vector + temporal + graph-adjacency storage primitive. Drop-in for the Qdrant layer. Local, mmap’d, no server.'],
            ['PQC / BYOK', 'not yet in the open-source engine itself — planned, needs its own threat model before shipping there. HIVEMIND’s hosted signing (ML-DSA-65) is separate and already live in production.'],
          ].map(([tt, dd]) => (
            <li key={tt} className="flex gap-2.5">
              <HardDrive size={14} className="text-[#117dff] shrink-0 mt-0.5" />
              <span><strong className="text-[#0a0a0a]">{tt}.</strong> {dd}</span>
            </li>
          ))}
        </ul>
        <CodeBlock label="build / test from source">{`cd crate
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings

cd mneme-python
pip install maturin && maturin develop --release
pip install -e ".[test]" && pytest tests/ -v`}</CodeBlock>
      </section>
    </>
  );
}

// ── Harness visual primitives — diagrams instead of ASCII/text-in-boxes ────────────────────
function PipelineFlow({ nodes }) {
  return (
    <div className="mt-4 flex flex-col md:flex-row items-stretch gap-1.5">
      {nodes.map((n, i) => (
        <React.Fragment key={n.title}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className="flex-1 bg-white border border-[#e3e0db] rounded-[10px] p-3.5 min-w-0"
          >
            <div className="w-8 h-8 rounded-[8px] bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <n.icon size={15} className="text-[#117dff]" />
            </div>
            <div className="text-[11.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mt-2 leading-snug">{n.title}</div>
            {n.sub && <div className="text-[10px] text-[#a3a3a3] mt-0.5 font-mono">{n.sub}</div>}
          </motion.div>
          {i < nodes.length - 1 && (
            <div className="flex md:flex-col items-center justify-center shrink-0 px-0.5">
              <ArrowRight size={13} className="hidden md:block text-[#c9c5bc]" />
              <ArrowDown size={13} className="md:hidden text-[#c9c5bc]" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function JobCards({ jobs }) {
  return (
    <div className="mt-4 grid sm:grid-cols-2 gap-3">
      {jobs.map((j, i) => (
        <motion.div
          key={j.title}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="bg-white border border-[#e3e0db] rounded-[10px] p-4"
        >
          <div className="w-8 h-8 rounded-[8px] bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
            <j.icon size={15} className="text-[#117dff]" />
          </div>
          <div className="text-[12.5px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mt-2.5">{j.title}</div>
          <div className="text-[11.5px] text-[#737373] mt-1 leading-relaxed">{j.desc}</div>
        </motion.div>
      ))}
    </div>
  );
}

function WarningGrid({ items }) {
  return (
    <div className="mt-4 grid sm:grid-cols-2 gap-2.5">
      {items.map((d) => (
        <div key={d} className="flex gap-2 bg-[#fffaf0] border border-[#f5e6c8] rounded-[10px] p-3">
          <AlertTriangle size={13} className="text-[#d97706] shrink-0 mt-0.5" />
          <span className="text-[11.5px] text-[#525252] leading-relaxed">{d}</span>
        </div>
      ))}
    </div>
  );
}

function ArchLayers() {
  const layers = [
    { icon: Brain, title: 'Coding agent', items: ['reasoning', 'code changes', 'natural-language explanation', 'proposed learning drafts'] },
    { icon: Terminal, title: 'Node / Bun boundary', items: ['CLI · terminal UI', 'MCP transport', 'Tree-sitter graph extraction', 'SQL.js graph store'] },
    { icon: Lock, title: 'Rust authority', items: ['manifest · policy · contracts', 'lifecycle · event chain', 'context selection · verification', 'sealing · skill promotion'] },
  ];
  return (
    <div className="mt-4">
      {layers.map((l, i) => (
        <React.Fragment key={l.title}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="bg-white border border-[#e3e0db] rounded-[10px] p-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center shrink-0">
                <l.icon size={15} className="text-[#117dff]" />
              </div>
              <div className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{l.title}</div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {l.items.map((it) => (
                <span key={it} className="text-[10.5px] font-mono text-[#525252] bg-[#f3f1ec] border border-[#e3e0db] rounded-[5px] px-1.5 py-0.5">{it}</span>
              ))}
            </div>
          </motion.div>
          {i < layers.length - 1 && (
            <div className="flex items-center justify-center py-1">
              <ArrowDown size={14} className="text-[#c9c5bc]" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function TrackedVsRuntime() {
  const tracked = [
    ['.icarus/manifest.yaml', 'repository identity'],
    ['.icarus/policy.yaml', 'policy/schema'],
    ['.icarus/schemas/', 'contract schemas'],
    ['AGENTS.md / CLAUDE.md', 'agent bootstrap'],
  ];
  const runtime = [
    ['.icarus/runtime/tasks/', 'task snapshots'],
    ['.icarus/runtime/events/', 'event chain'],
    ['.icarus/runtime/graph/', 'graph data'],
    ['.icarus/data/<org>/', 'local AMR shard'],
  ];
  return (
    <div className="mt-4 grid sm:grid-cols-2 gap-3">
      <div className="bg-white border border-[#e3e0db] rounded-[10px] p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#10b981]"><GitCommit size={12} /> Tracked in git</div>
        <div className="mt-3 space-y-2">
          {tracked.map(([f, d]) => (
            <div key={f} className="flex items-center justify-between gap-2 text-[11.5px]">
              <code className="font-mono text-[#0a0a0a]">{f}</code>
              <span className="text-[#a3a3a3] text-[10.5px] shrink-0 text-right">{d}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-[10px] p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]"><FolderGit2 size={12} /> Ignored / runtime</div>
        <div className="mt-3 space-y-2">
          {runtime.map(([f, d]) => (
            <div key={f} className="flex items-center justify-between gap-2 text-[11.5px]">
              <code className="font-mono text-[#525252]">{f}</code>
              <span className="text-[#a3a3a3] text-[10.5px] shrink-0 text-right">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LifecycleStepper({ states }) {
  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <div className="flex items-start gap-0 min-w-[680px] md:min-w-0">
        {states.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center text-center w-[92px] shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold border ${i === states.length - 1 ? 'bg-[#117dff] border-[#117dff] text-white' : 'bg-white border-[#e3e0db] text-[#525252]'}`}>{i + 1}</div>
              <div className="text-[11px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mt-2">{s.id}</div>
              <div className="text-[9.5px] text-[#a3a3a3] mt-0.5 leading-snug">{s.desc}</div>
            </div>
            {i < states.length - 1 && (
              <div className="h-8 flex items-center flex-1 min-w-[14px]">
                <div className="w-full h-px bg-[#e3e0db]" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function VerticalTimeline({ steps }) {
  return (
    <div className="mt-4 relative pl-1">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#e3e0db]" />
      <div className="space-y-3">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className="relative flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-white border-2 border-[#117dff] text-[#117dff] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 z-10">{i + 1}</div>
            <div className="bg-white border border-[#e3e0db] rounded-[10px] px-3.5 py-2.5 flex-1 text-[12px] text-[#0a0a0a]">{s}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ChipSequence({ chips }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      {chips.map((c, i) => (
        <React.Fragment key={c}>
          <span className="text-[10.5px] font-mono text-[#117dff] bg-[#117dff]/10 border border-[#117dff]/20 rounded-full px-2.5 py-1">{c}</span>
          {i < chips.length - 1 && <ArrowRight size={11} className="text-[#c9c5bc] shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── ICARUS Harness — the coding-agent operating layer (its own top-nav tab, its own landing).
// A deterministic operating layer around a coding agent: bounded repository context, a governed
// task lifecycle, and receipts turned from claims into evidence. Distinct from the .amr storage
// engine documented above — the Harness is the layer that governs how an agent works, not where
// memory is stored. Content transcribed 1:1 from HARNESS_README.md.
function HarnessDocs() {
  return (
    <>
      <Eyebrow>OPEN SOURCE · CODING-AGENT OPERATING LAYER</Eyebrow>
      <h1 className="text-[34px] leading-[1.08] font-medium font-['Space_Grotesk'] text-[#0a0a0a] tracking-tight">ICARUS Harness.</h1>
      <P>
        A deterministic operating layer around a coding agent: it gives the agent bounded, traceable
        repository context; records the task state it is allowed to act within; and turns executed
        checks into durable evidence. It does <strong className="text-[#0a0a0a]">not</strong> provide
        an LLM, secretly inspect a cloud account, upload a repository, or convert an agent&rsquo;s
        prose into proof.
      </P>
      <P>
        ICARUS Harness is for repository-scale work where an agent needs more than a long prompt. It
        combines a local memory filesystem, a source graph, a governed task lifecycle, a context
        compiler, verification receipts, and a cautiously promoted skill system. The model remains
        replaceable &mdash; Claude Code, Codex, Cursor, or another MCP-capable coding agent can
        supply reasoning and tools; ICARUS supplies durable state and enforcement-oriented evidence.
      </P>
      <P className="text-[12px]">
        This is the dedicated guide to the Harness. For the AMR storage engine and language
        bindings, see the <strong className="text-[#0a0a0a]">ICARUS &middot; self-host</strong> tab above.
        For source-level specifications, see <Mono>docs/HARNESS_THREAT_MODEL.md</Mono>,{' '}
        <Mono>docs/ADAPTER_CERTIFICATION.md</Mono>, and <Mono>docs/PHASE_STATUS.md</Mono> in the repo.
      </P>
      <div className="mt-4"><GithubStarBadge /></div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <a href="#harness-install" className="flex items-center gap-3 rounded-[10px] border border-[#e3e0db] bg-white p-4 no-underline hover:border-[#117dff] hover:shadow-sm">
          <Rocket size={18} className="text-[#117dff] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[#0a0a0a]">Install & initialize</div>
            <div className="text-[11.5px] text-[#737373]">CLI one-liner, harness init</div>
          </div>
        </a>
        <a href="#harness-loop" className="flex items-center gap-3 rounded-[10px] border border-[#e3e0db] bg-white p-4 no-underline hover:border-[#117dff] hover:shadow-sm">
          <GitBranch size={18} className="text-[#117dff] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[#0a0a0a]">Operating loop</div>
            <div className="text-[11.5px] text-[#737373]">Contract → executing → sealed</div>
          </div>
        </a>
        <a href={`https://github.com/${ICARUS_REPO}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-[10px] border border-[#e3e0db] bg-white p-4 no-underline hover:border-[#117dff] hover:shadow-sm">
          <Github size={18} className="text-[#117dff] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[#0a0a0a]">GitHub</div>
            <div className="text-[11.5px] text-[#737373]">Source, threat model, phase status</div>
          </div>
        </a>
      </div>

      {/* ── What it is ── */}
      <section id="harness-what-is" className="mt-12">
        <Eyebrow>01 · OVERVIEW</Eyebrow>
        <H2 id="harness-what-is">What it is</H2>
        <P>Think of a coding task as a durable state machine instead of an unstructured chat.</P>
        <PipelineFlow nodes={[
          { icon: FolderGit2, title: 'Repo + policy + contract', sub: 'authority' },
          { icon: Layers, title: 'Context compiler', sub: 'deterministic' },
          { icon: Brain, title: 'Agent reasons / edits', sub: 'runs tools' },
          { icon: ClipboardCheck, title: 'Receipts + checkpoints', sub: 'scope checks' },
          { icon: ShieldCheck, title: 'Verification', sub: 'acceptance criteria' },
          { icon: Sparkles, title: 'Sealed → learning', sub: 'reusable candidate' },
        ]} />
        <P className="mt-6">The Harness has five practical jobs:</P>
        <JobCards jobs={[
          { icon: Compass, title: 'Orient an agent', desc: 'It initializes repository identity, loads approved local context, and exposes graph queries before broad code search.' },
          { icon: Lock, title: 'Bound a task', desc: 'A Rust-owned immutable contract says which paths, criteria, budgets, and external-write policy apply.' },
          { icon: Layers, title: 'Compress context structurally', desc: 'It selects traceable repository evidence under a stated budget instead of copying a whole codebase into every new session.' },
          { icon: ShieldCheck, title: 'Separate claims from evidence', desc: 'A model saying "tests pass" is not a receipt. ICARUS runs declared criteria and records their status, digests, and freshness.' },
          { icon: Sparkles, title: 'Learn without self-poisoning', desc: 'Sealed work can produce reviewed memory and proposed skills; proposals require replay evidence before becoming active future context.' },
        ]} />
      </section>

      {/* ── What it is not ── */}
      <section id="harness-what-is-not" className="mt-12">
        <Eyebrow>02 · OVERVIEW</Eyebrow>
        <H2 id="harness-what-is-not">What it is not</H2>
        <P>ICARUS is deliberately not an autonomous model platform.</P>
        <WarningGrid items={[
          'It does not select, host, or pay for an LLM.',
          'It does not infer external approval from local task authority.',
          'It does not grant a task permission because an agent asks confidently.',
          'It does not promise that every compatible client tool call is hard-intercepted.',
          'It does not claim a task is complete because an agent exits.',
          'It does not automatically promote model-authored skills.',
        ]} />
        <P className="mt-4">
          That boundary matters: memory, graph lookup, contracts, and evidence are local
          deterministic capabilities. Reasoning and user-facing decisions remain with the coding
          agent and human.
        </P>
      </section>

      {/* ── Architecture ── */}
      <section id="harness-architecture" className="mt-12">
        <Eyebrow>03 · OVERVIEW</Eyebrow>
        <H2 id="harness-architecture">Architecture</H2>
        <P>Three tiers, foundation up: a Rust authority owns every governance decision; a Node/Bun boundary speaks to the outside world; the coding agent reasons on top.</P>
        <ArchLayers />
        <P className="mt-6">The tracked files define reproducible governance. Runtime files hold task snapshots, receipts, event-chain state, graph data, and local memory; they are intentionally excluded from Git.</P>
        <TrackedVsRuntime />
      </section>

      {/* ── Install and initialize ── */}
      <section id="harness-install" className="mt-12">
        <Eyebrow>04 · GET STARTED</Eyebrow>
        <H2 id="harness-install">Install and initialize</H2>
        <H3 id="harness-install-cli">Install the CLI</H3>
        <CodeBlock label="terminal">{`curl -fsSL https://raw.githubusercontent.com/${ICARUS_REPO}/main/install.sh | bash
icarus --version`}</CodeBlock>
        <P>
          <Mono>icarus update</Mono> (or <Mono>/update</Mono> in the terminal UI) checks the
          published checksum before atomic replacement. It streams a byte-based progress bar
          during download and shows a SHA-256 verification phase before replacement.
        </P>
        <H3 id="harness-install-repo">Initialize a repository</H3>
        <P>Run this at the root of the repository the agent will change:</P>
        <CodeBlock label="terminal">{`cd /path/to/repository
icarus harness init --agent codex
icarus doctor
icarus graph build --repo .`}</CodeBlock>
        <P>
          Initialization is idempotent. It creates tracked harness configuration and ignored
          runtime directories, derives a repository identity, and safely copies legacy graph state
          when necessary. It does not rewrite AMR shards or call an LLM.
        </P>
        <H3 id="harness-agent-bridge">Install the agent bridge</H3>
        <CodeBlock label="terminal · from the repository root">{`# Choose the client actually used in this repository.
icarus mcp install codex
# or: icarus mcp install claude
# or: icarus mcp install cursor`}</CodeBlock>
        <P>
          This registers the MCP server and refreshes the marked project instruction block in{' '}
          <Mono>AGENTS.md</Mono>, <Mono>CLAUDE.md</Mono>, or a Cursor rule. Restart the agent after
          installation or after updating ICARUS: an existing MCP process continues running the
          binary it started with.
        </P>
        <P>The installed rule requires an agent, at the beginning of every new session, to:</P>
        <ul className="space-y-1.5 text-[13px] text-[#525252] list-decimal list-inside">
          <li>check whether <Mono>.icarus/manifest.yaml</Mono> exists;</li>
          <li>call <Mono>icarus_harness_init</Mono> if it does not;</li>
          <li>build a missing or stale graph;</li>
          <li>create/load a task and call <Mono>icarus_context_get</Mono> before planning;</li>
          <li>use graph queries for structural questions before whole-repository text search.</li>
        </ul>
      </section>

      {/* ── Agent operating loop ── */}
      <section id="harness-loop" className="mt-12">
        <Eyebrow>05 · GET STARTED</Eyebrow>
        <H2 id="harness-loop">The agent operating loop</H2>
        <P>This is the intended loop for a real coding task.</P>
        <VerticalTimeline steps={[
          'init / doctor / graph status',
          'create contract and task',
          'advance lifecycle to orienting',
          'retrieve deterministic context, inspect graph, plan',
          'advance to contracted → planned → executing',
          'make only contract-authorized changes; checkpoint meaningful state',
          'hand off to verification; run immutable acceptance criteria',
          'seal only with current successful receipts',
          'optionally capture reviewed memory and propose an evidence-backed skill',
        ]} />
        <P className="mt-6">
          Do not replace this with &ldquo;start task, resume task, then write.&rdquo;{' '}
          <Mono>resume</Mono> creates a linked execution attempt; it does{' '}
          <strong className="text-[#0a0a0a]">not</strong> move a task from <Mono>created</Mono> to{' '}
          <Mono>executing</Mono>.
        </P>
      </section>

      {/* ── Task contracts and lifecycle ── */}
      <section id="harness-contract" className="mt-12">
        <Eyebrow>06 · TASKS</Eyebrow>
        <H2 id="harness-contract">Task contracts and lifecycle</H2>
        <H3 id="harness-contract-body">Contract</H3>
        <P>The contract is the task&rsquo;s authority. It is reviewed input, not agent-generated decoration.</P>
        <CodeBlock label="contract.json">{`{
  "allowed_paths": ["core/src/**", "frontend/src/**", "docs/**"],
  "forbidden_paths": [".env", "**/*secret*", "infra/**"],
  "acceptance_criteria": [
    { "id": "unit", "type": "test", "command": "npm test", "required": true },
    { "id": "build", "type": "command", "command": "npm run build", "required": true }
  ],
  "risk": "medium",
  "budgets": { "wall_time_minutes": 45 },
  "authority": "User approved implementation and verification in the listed paths.",
  "external_write_policy": "approval_required",
  "decision_references": []
}`}</CodeBlock>
        <P>Create the task:</P>
        <CodeBlock label="terminal">{`icarus task start --objective "Add organization profiles" --contract contract.json --repo .`}</CodeBlock>
        <P>The command returns a <Mono>TASK-…</Mono> id and begins in <Mono>created</Mono>.</P>

        <H3 id="harness-lifecycle">Legal lifecycle</H3>
        <LifecycleStepper states={[
          { id: 'created', desc: 'task opened' },
          { id: 'orienting', desc: 'inspect context, graph, repo state' },
          { id: 'contracted', desc: 'confirm contract & scope' },
          { id: 'planned', desc: 'form implementation plan' },
          { id: 'executing', desc: 'managed writes authorized' },
          { id: 'verifying', desc: 'run acceptance criteria' },
          { id: 'sealed', desc: 'final immutable receipt' },
        ]} />
        <P className="mt-5">Advance one state at a time:</P>
        <CodeBlock label="terminal">{`icarus task transition TASK-… orienting --repo .
icarus context build --task TASK-… --budget 12000 --format markdown --repo .
icarus task transition TASK-… contracted --repo .
icarus task transition TASK-… planned --repo .
icarus task transition TASK-… executing --repo .`}</CodeBlock>
        <P>
          The lifecycle is not cosmetic. Managed writes require <Mono>executing</Mono>; an
          authorization denial must not be bypassed through another shell command. If the task
          scope changes, amend the contract with an attributable reason and required approval
          instead of silently editing outside the contract.
        </P>
        <P>Useful lifecycle commands:</P>
        <CodeBlock label="terminal">{`icarus task status TASK-… --repo .
icarus task resume TASK-… --repo .          # creates a linked execution, keeps lifecycle state
icarus task checkpoint TASK-… --phase implementation --input state.json --repo .
icarus task block TASK-… --reason "Waiting for product decision" --repo .
icarus task reconcile TASK-… --repo .       # reconcile managed workspace state
icarus task authorize TASK-… --kind write --path src/file.ts --repo .`}</CodeBlock>
      </section>

      {/* ── Context-window optimization ── */}
      <section id="harness-context" className="mt-12">
        <Eyebrow>07 · CONTEXT & GRAPH</Eyebrow>
        <H2 id="harness-context">Context-window optimization</H2>
        <P>The Harness reduces context structurally, not by pretending to measure a provider&rsquo;s bill.</P>
        <P>
          <Mono>icarus context build</Mono> compiles a bounded pack from durable task data, policy,
          graph freshness, checkpoints, selected memory, and changed-state evidence. Every included
          item has a source, reason, freshness signal, and digest. The agent gets the relevant
          slices rather than a transcript or complete repository dump.
        </P>
        <CodeBlock label="terminal">{`icarus context build --task TASK-… --budget 12000 --format markdown --repo .
icarus context inspect --task TASK-… --budget 12000 --format json --repo .`}</CodeBlock>
        <P>
          <Mono>--budget</Mono> is a conservative local token-unit budget, not a guarantee of
          tokens billed by a provider. If a mandatory policy/context item cannot fit, ICARUS
          returns <Mono>budget_unsatisfied</Mono> rather than silently dropping the required item.
          Increase the budget, reduce the task&rsquo;s mandatory context through a reviewed
          contract/policy change, or split the task; do not make the policy optional just to force
          a response.
        </P>
        <P>Build context again after:</P>
        <ul className="space-y-1.5 text-[13px] text-[#525252] list-disc list-inside">
          <li>a session compaction or resumed execution;</li>
          <li>a material repository change;</li>
          <li>a task amendment;</li>
          <li>a graph rebuild that changes relevant structural evidence.</li>
        </ul>
      </section>

      {/* ── Code graph ── */}
      <section id="harness-graph" className="mt-12">
        <Eyebrow>08 · CONTEXT & GRAPH</Eyebrow>
        <H2 id="harness-graph">Code graph</H2>
        <P>
          The graph is a local native symbol/call/import index used for structural questions such
          as &ldquo;who calls this?&rdquo; or &ldquo;where is this imported?&rdquo; It currently
          parses JavaScript, TypeScript, and Rust through Tree-sitter WASM and stores its local
          index in SQL.js-backed runtime state.
        </P>
        <CodeBlock label="terminal">{`icarus graph build --repo .
icarus graph status --repo .
icarus graph query --repo . --kind find --name authenticateUser
icarus graph query --repo . --kind callers_of --name authenticateUser
icarus graph query --repo . --kind callees_of --name authenticateUser
icarus graph query --repo . --kind imports_of --name auth`}</CodeBlock>
        <P>
          The graph has a source fingerprint and freshness receipt. Rebuild it after significant
          restructuring. Graph data is a navigational aid, not a proof of behavior or authorization.
        </P>
        <H3 id="harness-graph-binary">Packaged binary note</H3>
        <P>
          Release binaries embed Tree-sitter grammars, Tree-sitter&rsquo;s runtime WASM, and
          SQL.js&rsquo;s <Mono>sql-wasm.wasm</Mono>. CI hides SQL.js&rsquo;s source-copy WASM while
          exercising graph construction, so an accidentally retained CI path cannot pass release
          tests and then fail after installation.
        </P>
      </section>

      {/* ── Memory and learning ── */}
      <section id="harness-memory" className="mt-12">
        <Eyebrow>09 · MEMORY & LEARNING</Eyebrow>
        <H2 id="harness-memory">Memory and learning</H2>
        <H3 id="harness-memory-local">Local memory</H3>
        <P>
          Each repository can have an isolated org/shard. Raw recall remains local and
          deterministic; LLM-based synthesis is an explicit optional layer, never hidden behind
          recall.
        </P>
        <CodeBlock label="terminal">{`icarus ingest ./docs --org acme
icarus recall "Why was authentication scoped this way?" --org acme
icarus save "Decision: use per-org authorization." --org acme
icarus status`}</CodeBlock>
        <P>
          MCP exposes matching local-memory tools (<Mono>icarus_recall</Mono>,{' '}
          <Mono>icarus_save_memory</Mono>, <Mono>icarus_get_memory</Mono>,{' '}
          <Mono>icarus_list_memories</Mono>, <Mono>icarus_update_memory</Mono>,{' '}
          <Mono>icarus_delete_memory</Mono>, and <Mono>icarus_traverse_graph</Mono>) plus
          coding-oriented helpers such as <Mono>icarus_log_decision</Mono>,{' '}
          <Mono>icarus_recall_bugs</Mono>, <Mono>icarus_track_refactor</Mono>, and{' '}
          <Mono>icarus_why_code</Mono>.
        </P>

        <H3 id="harness-capture">Learning capture</H3>
        <P>After a task is sealed, ICARUS can create a provenance-bound capture candidate:</P>
        <CodeBlock label="terminal">{`icarus learn capture --task TASK-… --repo . > capture.json
# Human/agent reviews the capture and writes a factual memory draft.
icarus learn save-capture CAPTURE-… --digest <capture-digest> --file memory.json --org acme`}</CodeBlock>
        <P>
          The candidate is rejected if the task is unsealed, the final receipt changed, the digest
          does not match, the draft is blank, or a different draft is attempted for the same
          capture. This is meant to preserve decisions and lessons without persisting unreviewed
          model speculation.
        </P>

        <H3 id="harness-skills">Governed skills (self-evolution with brakes)</H3>
        <P>
          ICARUS does not use its own LLM to &ldquo;self-improve.&rdquo; A coding agent may draft a
          procedure from a Rust-derived evidence brief, but it remains a proposal until replay
          evaluation proves it useful.
        </P>
        <CodeBlock label="terminal">{`icarus learn brief --task TASK-… --repo .
# Give the returned evidence brief to the selected coding agent; it writes skill.json.
icarus learn propose --file skill.json --repo .
icarus learn evaluate <skill-id> --replay-task TASK-… --baseline-task TASK-… --repo .
icarus learn review --repo .
icarus learn promote <skill-id> --approval <approval-id> --repo .`}</CodeBlock>
        <P>
          Low-risk promotion requires distinct sealed source tasks and measurably improved
          policy-clean replays against separate baselines. High-risk skills additionally require an
          attributable owner approval. Active skills are reviewed and may be demoted or retired. A
          proposal is never presented as active merely because a model wrote it.
        </P>
      </section>

      {/* ── MCP and agent integration ── */}
      <section id="harness-mcp" className="mt-12">
        <Eyebrow>10 · INTEGRATION</Eyebrow>
        <H2 id="harness-mcp">MCP and agent integration</H2>
        <P>The MCP server exposes the Harness to agents without requiring them to scrape terminal text.</P>
        <table className="w-full mt-3 text-[12.5px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[#737373] border-b border-[#e3e0db]">
              <th className="py-1.5 pr-3 font-semibold w-28">Group</th>
              <th className="py-1.5 pr-3 font-semibold">Representative MCP tools</th>
              <th className="py-1.5 font-semibold">Use</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eae7e1]">
            {[
              ['Bootstrap', 'icarus_harness_init, icarus_harness_migrate, icarus_status', 'Create/check repository harness state.'],
              ['Task', 'icarus_task_start, icarus_task_status, icarus_task_transition, icarus_task_resume', 'Create and legally advance a governed task.'],
              ['Context', 'icarus_context_get, icarus_graph_build, icarus_graph_status, icarus_graph_query', 'Build bounded context and answer structural questions.'],
              ['Write boundary', 'icarus_action_check, icarus_checkpoint, icarus_task_amend_contract, icarus_task_block', 'Check scope and record durable state.'],
              ['Evidence', 'icarus_task_handoff, icarus_task_verify, icarus_task_attest, icarus_task_seal, icarus_task_export', 'Move from execution to evidence-backed completion.'],
              ['Learning', 'icarus_harness_learning_capture, icarus_harness_skill_authoring_brief, icarus_harness_skill_propose, icarus_harness_skill_evaluate, icarus_harness_skill_promote', 'Capture reviewed lessons and govern reusable procedures.'],
            ].map(([g, t, u]) => (
              <tr key={g}>
                <td className="py-2 pr-3 font-semibold text-[#0a0a0a] align-top whitespace-nowrap">{g}</td>
                <td className="py-2 pr-3 font-mono text-[11.5px] text-[#117dff] align-top">{t}</td>
                <td className="py-2 text-[#525252] align-top">{u}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <P>For a managed coding task, the minimal MCP sequence is:</P>
        <ChipSequence chips={[
          'harness_init', 'graph_build', 'task_start', 'transition(orienting)', 'context_get',
          'transition(contracted→planned→executing)', 'action_check', '… implementation …',
          'task_handoff', 'task_verify', 'task_seal',
        ]} />
      </section>

      {/* ── Verification, export, and release evidence ── */}
      <section id="harness-verify" className="mt-12">
        <Eyebrow>11 · INTEGRATION</Eyebrow>
        <H2 id="harness-verify">Verification, export, and release evidence</H2>
        <P>Handoff says implementation is ready for checks; it does not mean the task passed.</P>
        <CodeBlock label="terminal">{`icarus task handoff TASK-… --repo .
icarus task verify TASK-… --criterion unit --repo .
icarus task verify TASK-… --criterion build --repo .
icarus task seal TASK-… --repo .
icarus task export TASK-… --redact --repo .`}</CodeBlock>
        <P>
          Sealing requires current receipts for the immutable acceptance criteria, valid approvals
          where required, an intact event chain, and final scope reconciliation. A sealed export is
          a structured receipt, not a raw copy of <Mono>.icarus/runtime</Mono>.{' '}
          <Mono>--redact</Mono> preserves useful digests and statuses while removing objective
          text, paths, excerpts, and attestation identities.
        </P>
      </section>

      {/* ── CLI reference ── */}
      <section id="harness-cli" className="mt-12">
        <Eyebrow>12 · REFERENCE</Eyebrow>
        <H2 id="harness-cli">CLI reference</H2>
        <H3 id="harness-cli-repo">Repository and policy</H3>
        <CodeBlock label="cli">{`icarus harness init [--agent claude|codex|cursor|grok|all] [--repo DIR]
icarus migrate [--dry-run] [--agent …] [--repo DIR]
icarus doctor [--repo DIR]
icarus policy check [--repo DIR]
icarus policy explain DENIAL-ID [--repo DIR]
icarus mcp install [claude|codex|cursor]`}</CodeBlock>
        <H3 id="harness-cli-tasks">Tasks and context</H3>
        <CodeBlock label="cli">{`icarus task start --objective TEXT --contract contract.json [--repo DIR]
icarus task status TASK-ID [--repo DIR]
icarus task resume TASK-ID [--repo DIR]
icarus task transition TASK-ID STATE [--repo DIR]
icarus task reconcile TASK-ID [--repo DIR]
icarus task amend TASK-ID --contract contract.json --reason TEXT [--approval ID]
icarus task checkpoint TASK-ID --phase NAME [--input state.json]
icarus task block TASK-ID --reason TEXT [--repo DIR]
icarus task authorize TASK-ID --kind write --path relative/file.ts [--repo DIR]
icarus context build --task TASK-ID [--budget N] [--since-checkpoint N] [--format json|markdown]
icarus context inspect --task TASK-ID [--budget N] [--format json]`}</CodeBlock>
        <H3 id="harness-cli-graph">Graph, run, evidence, and learning</H3>
        <CodeBlock label="cli">{`icarus graph build|status [--repo DIR]
icarus graph query --kind callers_of|callees_of|imports_of|find --name SYMBOL [--repo DIR]
icarus run --task TASK-ID --agent claude|codex|cursor|grok [--workspace isolated|current]
icarus task handoff|verify|attest|seal|export …
icarus learn brief|capture|save-capture|propose|evaluate|outcome|review|promote|retire …`}</CodeBlock>
        <P className="text-[12px]">Run <Mono>icarus --help</Mono> for exact arguments on the installed version.</P>
      </section>

      {/* ── Safety model and current limits ── */}
      <section id="harness-safety" className="mt-12">
        <Eyebrow>13 · REFERENCE</Eyebrow>
        <H2 id="harness-safety">Safety model and current limits</H2>
        <H3 id="harness-safety-enforced">What is enforced by the native authority</H3>
        <ul className="space-y-2 text-[13px] text-[#525252] list-none">
          {[
            'Repository identity, tracked policy, contracts, legal lifecycle transitions, event-chain integrity, canonical path containment, context selection, verification receipts, sealing, and skill-promotion gates are Rust-owned.',
            'Managed isolated worktrees are the default. Current-workspace execution requires explicit acknowledgement and is not the safe default.',
            'Path traversal, symlink escape, nested Git/submodule write routes, and out-of-contract paths are refused by the managed boundary.',
            'A stale graph cannot be claimed current after relevant source changes.',
          ].map((d) => (
            <li key={d} className="flex gap-2.5">
              <Lock size={14} className="text-[#117dff] shrink-0 mt-0.5" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <H3 id="harness-safety-adapter">Adapter status</H3>
        <P>
          No public adapter is currently <strong className="text-[#0a0a0a]">certified</strong>.
          Claude Code and Codex are compatible; Codex&rsquo;s app-server bridge is explicitly
          experimental. Compatibility means an agent can use contracts, context, checkpoints,
          verification, and seal-time scope checks. It does{' '}
          <strong className="text-[#0a0a0a]">not</strong> mean every client-side write and external
          action is hard-intercepted. See the exact version-pinned evidence and missing
          certification gates in <Mono>docs/ADAPTER_CERTIFICATION.md</Mono>.
        </P>
        <H3 id="harness-safety-limits">Important limits</H3>
        <ul className="space-y-2 text-[13px] text-[#525252] list-none">
          {[
            'Local host compromise remains outside the local event-chain trust boundary.',
            'Graph support is currently JS/TS/Rust, not every programming language.',
            'Context-pack reduction is a structural measurement, not provider-billing proof.',
            'Optional HIVE-MIND authority sync is opt-in; its remote transport and live approval/revocation evidence remain release-candidate gates.',
            'v1.0 requires the remaining adapter certification and dogfood evidence gates; see docs/PHASE_STATUS.md.',
          ].map((d) => (
            <li key={d} className="flex gap-2.5">
              <AlertTriangle size={14} className="text-[#d97706] shrink-0 mt-0.5" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Troubleshooting ── */}
      <section id="harness-troubleshooting" className="mt-12 mb-20">
        <Eyebrow>14 · REFERENCE</Eyebrow>
        <H2 id="harness-troubleshooting">Troubleshooting</H2>

        <H3 id="harness-ts-budget"><Mono>budget_unsatisfied</Mono></H3>
        <P>
          A mandatory context/policy item needs more than the requested conservative budget.
          Increase <Mono>--budget</Mono>, split the task, or make a reviewed policy/contract
          change. Do not drop mandatory context to make the call appear successful.
        </P>

        <H3 id="harness-ts-executing"><Mono>managed writes require an executing task contract</Mono></H3>
        <P><Mono>task start</Mono> creates <Mono>created</Mono>; <Mono>task resume</Mono> does not advance it. Transition legally:</P>
        <CodeBlock label="terminal">{`icarus task transition TASK-… orienting --repo .
icarus task transition TASK-… contracted --repo .
icarus task transition TASK-… planned --repo .
icarus task transition TASK-… executing --repo .`}</CodeBlock>

        <H3 id="harness-ts-wasm"><Mono>graph build</Mono> reports a missing WASM file</H3>
        <P>First update, then restart the agent&rsquo;s MCP process and retry:</P>
        <CodeBlock label="terminal">{`icarus update
icarus graph build --repo .`}</CodeBlock>
        <P>
          Current release binaries embed the required Tree-sitter and SQL.js WASM files. If the
          error persists after confirming the version, include <Mono>icarus --version</Mono>,{' '}
          <Mono>icarus doctor</Mono>, and the full error in a bug report; do not patch paths inside
          the installed executable.
        </P>

        <H3 id="harness-ts-mcp">An MCP tool is missing after an update</H3>
        <P>MCP clients hold a running process. From the repository root, refresh the install block and restart the client:</P>
        <CodeBlock label="terminal">{`icarus mcp install codex`}</CodeBlock>

        <H3 id="harness-ts-denial">I need to inspect why an action was denied</H3>
        <P>Use the denial ID from the response:</P>
        <CodeBlock label="terminal">{`icarus policy explain DENIAL-… --repo .`}</CodeBlock>
        <P>
          Do not bypass a denial by moving the operation to an ungoverned shell command; either
          narrow the task, amend the reviewed contract, or obtain the required approval.
        </P>

        <div className="mt-8 flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">
          <span className="flex items-center gap-1.5"><Layers size={11} className="text-[#117dff]/60" /> Deterministic operating layer</span>
          <span className="flex items-center gap-1.5"><Brain size={11} className="text-[#117dff]/60" /> Evidence, not prose</span>
          <span className="flex items-center gap-1.5"><Wrench size={11} className="text-[#117dff]/60" /> MCP-integrated</span>
        </div>
      </section>
    </>
  );
}

export default function DocsPage() {
  const [product, setProduct] = useState('hivemind'); // 'hivemind' | 'icarus' | 'harness'
  const [expanded, setExpanded] = useState('hivemind'); // which sidebar category is open
  const toc = product === 'icarus' ? ICARUS_TOC : product === 'harness' ? HARNESS_TOC : HIVEMIND_TOC;
  const toolGroups = useMemo(() => ([
    { id: 'tools-memory', title: 'Memory tools', count: MEMORY_TOOLS.length, tools: MEMORY_TOOLS, blurb: 'The core read/write surface of the memory engine. Every durable fact, decision, and conversation flows through these.' },
    { id: 'tools-web', title: 'Web intelligence tools', count: WEB_TOOLS.length, tools: WEB_TOOLS, blurb: 'Live web search + crawl with an async job model: submit → poll → read results. Quota-metered per workspace.' },
    { id: 'tools-coding', title: 'Coding intelligence tools', count: CODING_TOOLS.length, tools: CODING_TOOLS, blurb: 'Purpose-built for AI coding assistants: version-chained code ingestion, bug recall, decision logging, refactor tracking, test coverage, and "why does this code exist".' },
    { id: 'tools-temporal', title: 'Time-travel tools', count: TEMPORAL_TOOLS.length, tools: TEMPORAL_TOOLS, blurb: 'Bi-temporal queries over the version ledger: point-in-time snapshots, diffs between dates, and full revision chains.' },
  ]), []);

  return (
    <div className="min-h-screen bg-[#faf9f4]">
      {/* ── SINGULANCE navbar — xAI-docs layout: brand, Docs label, search, auth actions ── */}
      <header className="sticky top-0 z-30 bg-[#faf9f4]/90 backdrop-blur-xl border-b border-[#e3e0db] px-5 md:px-8">
        <div className="h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <a href="https://singulancelabs.com" className="text-[12px] font-bold font-['Space_Grotesk'] tracking-[0.22em] text-[#0a0a0a] no-underline">SINGULANCE</a>
            <span className="text-[#d4d0ca]">/</span>
            <a href="/hivemind" className="flex items-center gap-1.5 no-underline">
              <Hexagon size={14} className="text-[#117dff]" />
              <span className="text-[12px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">HIVEMIND</span>
            </a>
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-[#525252]">
              Docs <ChevronDown size={11} className="text-[#a3a3a3]" />
            </span>
          </div>
          <div className="hidden md:flex flex-1 max-w-[360px] items-center gap-2 h-9 px-3 rounded-[8px] border border-[#e3e0db] bg-white text-[#a3a3a3]">
            <Search size={13} />
            <span className="text-[12px]">Search docs…</span>
            <span className="ml-auto text-[10px] font-mono border border-[#e3e0db] rounded-[4px] px-1.5 py-0.5 text-[#a3a3a3]">⌘K</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/hivemind/login" className="px-3 py-1.5 rounded-[6px] text-[12px] text-[#525252] hover:text-[#0a0a0a] no-underline">Sign in</a>
            <a href="/hivemind/app/mcp" className="px-3 py-1.5 rounded-[6px] bg-[#117dff] hover:bg-[#0066e0] text-white text-[12px] font-semibold no-underline">Open console</a>
          </div>
        </div>
        {/* Mobile-only product switcher — the persistent sidebar below is lg+ only */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1">
          {PRODUCT_CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => { setProduct(c.id); setExpanded(c.id); }}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium border ${product === c.id ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'bg-white text-[#525252] border-[#e3e0db]'}`}
            >
              <c.icon size={11} />
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-[1360px] mx-auto flex gap-8 px-5 md:px-8 py-10">
        {/* ── Left: persistent product sidebar (all three categories always visible) ── */}
        <nav className="hidden lg:block w-64 shrink-0">
          <ProductNav product={product} setProduct={setProduct} expanded={expanded} setExpanded={setExpanded} />
        </nav>

        {/* ── Content ── */}
        <main className="flex-1 min-w-0 max-w-[720px]">
          {product === 'icarus' ? <IcarusDocs /> : product === 'harness' ? <HarnessDocs /> : <>
          <Eyebrow>DEVELOPER DOCUMENTATION</Eyebrow>
          <h1 className="text-[34px] leading-[1.08] font-medium font-['Space_Grotesk'] text-[#0a0a0a] tracking-tight">HIVEMIND API & MCP reference</h1>
          <P>
            HIVEMIND is a sovereign memory engine. Everything runs off one <strong className="text-[#0a0a0a]">workspace API key</strong>.
            This page covers both integration surfaces: the <strong className="text-[#0a0a0a]">REST API</strong> —
            ingest documents/text/URLs, then recall or chat over them — and the{' '}
            <strong className="text-[#0a0a0a]">hosted MCP server</strong> that exposes {MEMORY_TOOLS.length + WEB_TOOLS.length + CODING_TOOLS.length + TEMPORAL_TOOLS.length} tools
            to any Model Context Protocol client (Claude Code, Claude.ai, Cursor, custom agents).
            Ingest is async (POST → <Mono>job_id</Mono> → poll); recall is one hybrid engine across every storage tier.
          </P>

          {/* ── Overview ── */}
          <section id="overview" className="mt-10">
            <Eyebrow>01 · OVERVIEW</Eyebrow>
            <H2 id="overview">Base URLs</H2>
            <table className="w-full mt-3 text-[12.5px]">
              <tbody className="divide-y divide-[#eae7e1]">
                <tr><td className="py-2 pr-4 text-[#737373] whitespace-nowrap">Core API</td><td className="py-2 font-mono text-[#0a0a0a] break-all">{CORE}</td></tr>
                <tr><td className="py-2 pr-4 text-[#737373] whitespace-nowrap">MCP endpoint</td><td className="py-2 font-mono text-[#0a0a0a] break-all">{MCP_URL}</td></tr>
                <tr><td className="py-2 pr-4 text-[#737373] whitespace-nowrap">Transport</td><td className="py-2 text-[#525252]">Streamable HTTP (MCP 2025-03-26) · stdio via <Mono>mcp-remote</Mono> bridge</td></tr>
                <tr><td className="py-2 pr-4 text-[#737373] whitespace-nowrap">Auth</td><td className="py-2 text-[#525252]">API key — <Mono>Authorization: Bearer</Mono> or <Mono>X-API-Key</Mono> header</td></tr>
                <tr><td className="py-2 pr-4 text-[#737373] whitespace-nowrap">Residency</td><td className="py-2 text-[#525252]">EU-hosted (Frankfurt) · self-host tier keeps all data on your own servers</td></tr>
              </tbody>
            </table>
          </section>

          {/* ── API keys ── */}
          <section id="api-keys" className="mt-12">
            <Eyebrow>02 · AUTHENTICATION</Eyebrow>
            <H2 id="api-keys">API key reference</H2>
            <P>
              Every request to HIVEMIND — MCP tool calls, CLI, REST — is authenticated with a workspace API key.
              Keys are minted in the console at <Mono>Settings → API Keys</Mono> (<a className="text-[#117dff]" href="/hivemind/app/keys">/hivemind/app/keys</a>) and shown once at creation. Store them like passwords.
            </P>

            <H3 id="auth-headers">Auth headers</H3>
            <P>Both header forms are accepted on every endpoint — use whichever your client supports:</P>
            <CodeBlock label="http · either header works">{`Authorization: Bearer hm_live_xxxxxxxxxxxxxxxxxxxx
# or
X-API-Key: hm_live_xxxxxxxxxxxxxxxxxxxx`}</CodeBlock>
            <CodeBlock label="curl · smoke-test your key (MCP tools/list)">{`curl -s ${MCP_URL} \\
  -H "Authorization: Bearer $HIVEMIND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# → JSON list of every tool your key can call`}</CodeBlock>

            <H3 id="key-lifecycle">Lifecycle, scoping & safety</H3>
            <ul className="space-y-2 text-[13px] text-[#525252] list-none">
              {[
                ['Workspace-scoped', 'A key belongs to one workspace (org). All memories it writes and reads are isolated to that tenant — there is no cross-org access.'],
                ['Shown once', 'The plaintext key appears only at creation. Rotate by minting a new key and revoking the old one; revocation is immediate.'],
                ['Per-key usage metering', 'Every LLM call and tool invocation is recorded against the calling key — see Usage in the console for used/remaining quota.'],
                ['Never embed in source', 'Load from an environment variable (HIVEMIND_API_KEY) or a secret manager. Keys in committed code should be treated as leaked and revoked.'],
                ['Transport security', 'All endpoints are TLS-only. Keys sent over plain HTTP are rejected.'],
              ].map(([tt, dd]) => (
                <li key={tt} className="flex gap-2.5">
                  <Shield size={14} className="text-[#117dff] shrink-0 mt-0.5" />
                  <span><strong className="text-[#0a0a0a]">{tt}.</strong> {dd}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── MCP setup ── */}
          <section id="mcp-setup" className="mt-12">
            <Eyebrow>03 · MCP SERVER</Eyebrow>
            <H2 id="mcp-setup">Setting up the MCP server</H2>
            <P>
              The hosted MCP server turns any MCP-capable AI into a client of your memory: it can save facts,
              recall context, search the web, and track code — all scoped to your workspace key. One endpoint,
              no local process to run.
            </P>

            <H3 id="mcp-claude-code">Claude Code (CLI)</H3>
            <CodeBlock label="terminal · one-liner (recommended)">{`curl -fsSL ${CORE}/install/cli.sh | bash`}</CodeBlock>
            <P>The installer opens a browser sign-in, mints a key, and registers the server. Manual equivalent:</P>
            <CodeBlock label="terminal · manual">{`claude mcp add --transport http hivemind ${MCP_URL} \\
  --header "Authorization: Bearer $HIVEMIND_API_KEY"`}</CodeBlock>

            <H3 id="mcp-claude-ai">Claude.ai & Claude Desktop</H3>
            <P>
              Settings → Connectors → <em>Add custom connector</em> → paste the MCP URL. Claude.ai runs the OAuth
              flow against your workspace; approve it once and all tools appear in every chat.
            </P>
            <CodeBlock label="connector url">{MCP_URL}</CodeBlock>

            <H3 id="mcp-cursor">Cursor / Windsurf / any JSON-config client</H3>
            <CodeBlock label="mcp.json">{`{
  "mcpServers": {
    "hivemind": {
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer hm_live_xxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}`}</CodeBlock>

            <H3 id="mcp-stdio">stdio bridge (older clients)</H3>
            <P>Clients without native HTTP transport can bridge through <Mono>mcp-remote</Mono>:</P>
            <CodeBlock label="mcp.json · stdio">{`{
  "mcpServers": {
    "hivemind": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${MCP_URL}",
               "--header", "Authorization: Bearer hm_live_xxxxxxxxxxxxxxxxxxxx"]
    }
  }
}`}</CodeBlock>

            <H3 id="mcp-verify">Verify the connection</H3>
            <CodeBlock label="in your AI client">{`# Ask your assistant:
"Save a memory: the HIVEMIND MCP connection works. Tag it test."
# then
"Recall: does the HIVEMIND MCP connection work?"
# The second answer must cite the memory saved by the first.`}</CodeBlock>
          </section>

          {/* ── Agent integrations ── */}
          <section id="agents" className="mt-12">
            <Eyebrow>04 · AGENT INTEGRATIONS</Eyebrow>
            <H2 id="agents">Connect autonomous agents</H2>
            <P>
              Any agent framework that speaks MCP — or plain HTTP — can use HIVEMIND as its long-term memory.
              The pattern is always the same: point the agent at <Mono>{MCP_URL}</Mono> with your workspace key,
              and the {MEMORY_TOOLS.length + WEB_TOOLS.length + CODING_TOOLS.length + TEMPORAL_TOOLS.length} tools
              below become part of its toolset. Give the agent one standing instruction — <em>recall before you act,
              save what’s durable</em> — and it starts working for you across sessions.
            </P>

            <H3 id="agent-openclaw">OpenClaw</H3>
            <P>OpenClaw reads MCP servers from its config file. Add HIVEMIND as a Streamable-HTTP server:</P>
            <CodeBlock label="~/.openclaw/mcp.json">{`{
  "mcpServers": {
    "hivemind": {
      "url": "${MCP_URL}",
      "headers": { "Authorization": "Bearer hm_live_xxxxxxxxxxxxxxxxxxxx" }
    }
  }
}`}</CodeBlock>
            <P>
              Then add a line to the agent’s system prompt so it uses the memory reflexively:
            </P>
            <CodeBlock label="agent system prompt">{`Before answering, call hivemind_recall with the user's request.
After any durable fact, decision, or result, call hivemind_save_memory.
You share one memory across every run — treat it as your own recall.`}</CodeBlock>

            <H3 id="agent-hermes">Hermes Agents</H3>
            <P>
              Hermes agents (the per-tenant agents inside HIVEMIND) attach MCP servers per profile. In the
              Hermes console, add an MCP server of type <Mono>http</Mono> with the URL and bearer header below,
              then enable it on the agent’s profile — every tool becomes callable inside that agent’s runs.
            </P>
            <CodeBlock label="hermes · add MCP server">{`Transport:  Streamable HTTP
URL:        ${MCP_URL}
Header:     Authorization: Bearer hm_live_xxxxxxxxxxxxxxxxxxxx
Scope:      enable on the agent profile that should remember`}</CodeBlock>
            <P>
              Because Hermes runs server-side, use a dedicated key for it so its usage is metered separately
              from interactive sessions. Revoke that key to instantly cut the agent’s access.
            </P>

            <H3 id="agent-langchain">LangChain / LlamaIndex / custom frameworks</H3>
            <P>Load the HIVEMIND MCP server through the framework’s MCP adapter and hand the tools to your agent:</P>
            <CodeBlock label="python · langchain-mcp-adapters">{`from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "hivemind": {
        "transport": "streamable_http",
        "url": "${MCP_URL}",
        "headers": {"Authorization": f"Bearer {HIVEMIND_API_KEY}"},
    }
})
tools = await client.get_tools()   # all HIVEMIND tools, ready for your agent
# agent = create_react_agent(model, tools)`}</CodeBlock>

            <H3 id="agent-http">Any agent — raw HTTP (no MCP SDK)</H3>
            <P>
              If your agent can’t speak MCP, call the JSON-RPC endpoint directly. Discover tools with
              <Mono>tools/list</Mono>, then invoke one with <Mono>tools/call</Mono>:
            </P>
            <CodeBlock label="curl · call a tool over JSON-RPC">{`curl -s ${MCP_URL} \\
  -H "Authorization: Bearer $HIVEMIND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0", "id": 1, "method": "tools/call",
    "params": {
      "name": "hivemind_recall",
      "arguments": { "query": "auth decisions", "mode": "quick", "limit": 5 }
    }
  }'`}</CodeBlock>
            <P>
              Wire that into your agent’s tool-execution loop, feed the results back into the model’s context,
              and it now shares the same memory as every other HIVEMIND client.
            </P>
          </section>

          {/* ── REST · Ingestion ── */}
          <section id="ingestion" className="mt-12">
            <Eyebrow>05 · REST API — INGESTION</Eyebrow>
            <H2 id="ingestion">Ingesting content</H2>
            <P>
              Send any content to HIVEMIND — documents, images, raw text, conversations — and the engine
              extracts memories, entities, and relationships automatically. Two front doors, both authenticated
              with your workspace key: a <strong className="text-[#0a0a0a]">multipart file upload</strong>, and a
              JSON <strong className="text-[#0a0a0a]">source envelope</strong> for already-extracted text or URLs.
              Ingestion is <strong className="text-[#0a0a0a]">asynchronous</strong>: the call returns a
              <Mono>job_id</Mono> in ~80&nbsp;ms; you poll status while the server parses, segments, embeds, and promotes.
            </P>

            <H3 id="ingest-file">Upload a file</H3>
            <P><Mono>POST /api/knowledge/upload</Mono> — <Mono>multipart/form-data</Mono>. Add <Mono>?async=true</Mono> (recommended): you get a job id immediately and poll for completion.</P>
            <CodeBlock label="curl · file upload">{`curl -X POST "${CORE}/api/knowledge/upload?async=true" \\
  -H "Authorization: Bearer $HIVEMIND_API_KEY" \\
  -F "file=@document.pdf" \\
  -F "targetScope=personal" \\
  -F "ingestMode=both" \\
  -F "tags=research,q3"`}</CodeBlock>
            <CodeBlock label="202 accepted">{`{
  "job_id": "294decd2-33f9-4bd3-b3d6-9c85abce5fa6",
  "status": "queued",
  "storage_mode": "amr_embedded",
  "ingest_mode": "both",
  "counts": { "pages": null, "segments": null, "candidates": null, "memories": null },
  "created_at": "2026-08-05T13:14:58Z"
}`}</CodeBlock>
            <table className="w-full mt-3 text-[12px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#737373] border-b border-[#e3e0db]"><th className="py-1.5 pr-3 font-semibold">Field</th><th className="py-1.5 pr-3 font-semibold w-16">Req.</th><th className="py-1.5 font-semibold">Description</th></tr></thead>
              <tbody className="divide-y divide-[#eae7e1]">
                {[
                  ['file', true, 'The document/image/audio to ingest. 50 MB max (document), 20 MB (image).'],
                  ['targetScope', false, 'personal | project | team | organization. Org scope requires owner/admin. Default personal.'],
                  ['projectId', false, 'Required when targetScope=project.'],
                  ['primaryTeamId', false, 'Required when targetScope=team.'],
                  ['ingestMode', false, 'both (default) = full memories + evidence · evidence = lexical + semantic evidence only, without memory/entity/relationship generation. Documents and audio only.'],
                  ['tags', false, 'Comma-separated tags stamped on every memory from this file.'],
                  ['force', false, 'Bypass the checksum dedup and re-ingest identical bytes.'],
                ].map(([n, r, d]) => (
                  <tr key={n}><td className="py-1.5 pr-3 font-mono text-[#0a0a0a] whitespace-nowrap">{n}</td><td className="py-1.5 pr-3">{r ? <span className="text-[#117dff] font-semibold">yes</span> : <span className="text-[#a3a3a3]">no</span>}</td><td className="py-1.5 text-[#525252]">{d}</td></tr>
                ))}
              </tbody>
            </table>

            <H3 id="ingest-source">Ingest text, a URL, or a conversation</H3>
            <P><Mono>POST /api/ingest/source</Mono> — a canonical envelope for content you already have as text (or a URL to extract). Pick a <Mono>mode</Mono> for how it&rsquo;s processed.</P>
            <CodeBlock label="curl · source envelope">{`curl -X POST "${CORE}/api/ingest/source" \\
  -H "Authorization: Bearer $HIVEMIND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": { "type": "note", "sourceId": "standup-2026-08-05" },
    "content": "Decided to ship Orion-X on 2 Feb 2028 at 4.2M EUR. Priya Nair owns avionics.",
    "mode": "document",
    "scope": "organization",
    "tags": ["planning","orion-x"]
  }'`}</CodeBlock>
            <table className="w-full mt-3 text-[12px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#737373] border-b border-[#e3e0db]"><th className="py-1.5 pr-3 font-semibold">Field</th><th className="py-1.5 font-semibold">Description</th></tr></thead>
              <tbody className="divide-y divide-[#eae7e1]">
                {[
                  ['source.type', 'Origin kind — note | kb | url | meeting | chat, etc. Used for provenance.'],
                  ['source.url', 'Canonical URL when ingesting a link (content is extracted server-side).'],
                  ['source.sourceId', 'Your stable id for this source — enables dedup + provenance.'],
                  ['content', 'Already-extracted text. Provide this OR file.buffer.'],
                  ['mode', 'document (multi-fact distill → many memories + entities + relationships) · atomic (one memory) · legacy evidence (one recall-excluded raw record). For chunked hybrid evidence-only files, use upload ingestMode=evidence.'],
                  ['scope / projectId', 'personal | project | team | organization + the project id when scoped.'],
                  ['tags', 'Extra tags stamped on the resulting memories.'],
                ].map(([n, d]) => (
                  <tr key={n}><td className="py-1.5 pr-3 font-mono text-[#0a0a0a] whitespace-nowrap align-top">{n}</td><td className="py-1.5 text-[#525252]">{d}</td></tr>
                ))}
              </tbody>
            </table>
            <P><strong className="text-[#0a0a0a]">Modes at a glance.</strong> <Mono>document</Mono> = full pipeline (facts + entities + relationships). <Mono>atomic</Mono> = a single memory through the engine gateway. Source-envelope <Mono>evidence</Mono> is a legacy one-record mode; it is distinct from file upload <Mono>ingestMode=evidence</Mono>, which creates page-aware hybrid-searchable segments.</P>

            <H3 id="ingest-status">Poll ingestion status</H3>
            <P><Mono>GET /api/knowledge/status?job_id=&lt;id&gt;</Mono> — poll until <Mono>ready</Mono> or <Mono>failed</Mono>.</P>
            <CodeBlock label="200 · ready">{`{
  "status": "ready",
  "progress": 100,
  "document_id": "85f0f480-8fb6-4e2e-8d05-2439e52f3b3c",
  "memory_ids": ["a22f0888-…", "8dfe5b8f-…"],
  "counts": { "pages": 1, "segments": 1, "candidates": 1, "memories": 5 }
}`}</CodeBlock>
            <P>Stages: <Mono>both</Mono> uses <Mono>queued → parsing → segmenting → embedding → promoting → ready</Mono>. <Mono>evidence</Mono> stops after embedding and becomes ready only after both semantic and lexical evidence lanes are complete.</P>

            <H3 id="ingest-types">Supported types &amp; limits</H3>
            <table className="w-full mt-3 text-[12px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#737373] border-b border-[#e3e0db]"><th className="py-1.5 pr-3 font-semibold">Type</th><th className="py-1.5 pr-3 font-semibold">Formats</th><th className="py-1.5 font-semibold">Processing</th></tr></thead>
              <tbody className="divide-y divide-[#eae7e1]">
                {[
                  ['Documents', 'pdf, docx, doc, xlsx, xls, pptx, ppt, txt, md, csv, tsv, html', 'Text extraction · OCR (vision) for scans · page-aware chunking'],
                  ['Images', 'png, jpg, jpeg, tiff, webp, gif', 'Vision OCR → one canonical memory'],
                  ['Audio', 'mp3, wav, m4a, flac, ogg', 'Whisper transcription'],
                ].map(([t, f, p]) => (
                  <tr key={t}><td className="py-1.5 pr-3 font-semibold text-[#0a0a0a] whitespace-nowrap align-top">{t}</td><td className="py-1.5 pr-3 font-mono text-[#525252] align-top">{f}</td><td className="py-1.5 text-[#525252]">{p}</td></tr>
                ))}
              </tbody>
            </table>
            <P className="text-[12px]">Limits: document 50&nbsp;MB · image 20&nbsp;MB. Query <Mono>GET /api/knowledge/upload-capabilities</Mono> instead of hardcoding. Duplicate detection is by content checksum (a repeat returns <Mono>409</Mono> with the existing job) — pass <Mono>force</Mono> to re-ingest.</P>

            <H3 id="ingest-pipeline">What happens after 202</H3>
            <CodeBlock label="pipeline">{`bytes → normalize (docx/html/md → markdown) → parse tier (fast-pdf | vision-OCR | docling | whisper)
      → segments (heading-path + page) → embeddings (bge-m3, 1024-d)
      → windowed extract (facts + entities in one call) → curator (dedup/merge) → memories
      → canonical entities (typed) + typed relationship edges → recallable`}</CodeBlock>
          </section>

          {/* ── REST · Recall ── */}
          <section id="recall" className="mt-12">
            <Eyebrow>06 · REST API — RECALL</Eyebrow>
            <H2 id="recall">Recall &amp; search</H2>
            <P>
              One hybrid engine answers every recall call — dense vector + lexical + entity + temporal + graph
              lanes, fused and reranked — routed to your workspace&rsquo;s storage engine automatically. The same
              contract serves hybrid, <Mono>.amr</Mono>, and BYOD tenants; you never pick a backend.
            </P>
            <H3 id="recall-recall">Recall</H3>
            <P><Mono>POST /api/recall</Mono> — grounded retrieval over memories + evidence.</P>
            <CodeBlock label="curl · recall">{`curl -X POST "${CORE}/api/recall" \\
  -H "Authorization: Bearer $HIVEMIND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "query": "when does Orion-X launch and at what price",
        "mode": "quick", "limit": 5 }'`}</CodeBlock>
            <CodeBlock label="200 · response (top-level keys)">{`{
  "memories": [ { "id": "…", "content": "…", "score": 0.82, "scope": "organization" } ],
  "evidence":  [ { "segmentId": "…", "snippet": "…", "score": 0.79 } ],
  "search_method": "hybrid", "mode_used": "quick", "timing_ms": 640
}`}</CodeBlock>
            <table className="w-full mt-3 text-[12px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#737373] border-b border-[#e3e0db]"><th className="py-1.5 pr-3 font-semibold">Field</th><th className="py-1.5 font-semibold">Description</th></tr></thead>
              <tbody className="divide-y divide-[#eae7e1]">
                {[
                  ['query', 'Required. Natural-language query (any language).'],
                  ['mode', 'quick | deep | insight. quick = low-latency single sweep; insight = synthesis-oriented.'],
                  ['limit', 'Max memories to return (default 10).'],
                  ['entities', 'Anchor the entity-hop lane on named entities.'],
                  ['scope / project_id', 'Narrow to a tier/project — narrows only, never widens.'],
                  ['valid_at / known_at', 'Bi-temporal snapshot — recall the graph as it was at a point in time.'],
                ].map(([n, d]) => (
                  <tr key={n}><td className="py-1.5 pr-3 font-mono text-[#0a0a0a] whitespace-nowrap align-top">{n}</td><td className="py-1.5 text-[#525252]">{d}</td></tr>
                ))}
              </tbody>
            </table>
            <H3 id="recall-chat">Grounded chat</H3>
            <P><Mono>POST /api/chat</Mono> — the full agent turn: intent → retrieval → grounded answer, with <Mono>sources</Mono>, <Mono>answer_mode</Mono> (counted | temporal | graph | sampled), and <Mono>scopes_found</Mono>. Set <Mono>stream:true</Mono> for SSE. A retrieval timeout is reported honestly (&ldquo;couldn&rsquo;t look&rdquo;), never as &ldquo;nothing found&rdquo;.</P>
            <H3 id="recall-other">Other search routes</H3>
            <table className="w-full mt-3 text-[12px]">
              <tbody className="divide-y divide-[#eae7e1]">
                {[
                  ['POST /api/search/quick', 'Low-latency single-lane search.'],
                  ['POST /api/search/insight', 'Synthesis-oriented recall.'],
                  ['POST /api/search/panorama', 'Broad multi-lane sweep.'],
                  ['POST /api/evidence/search', 'Verbatim evidence-segment search (lossless — part numbers, prices, spec values).'],
                  ['POST /api/evidence/hybrid', 'Memories + evidence in one ranked delivery.'],
                ].map(([n, d]) => (
                  <tr key={n}><td className="py-2 pr-4 font-mono text-[#0a0a0a] whitespace-nowrap align-top">{n}</td><td className="py-2 text-[#525252]">{d}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ── REST · Documents ── */}
          <section id="documents" className="mt-12">
            <Eyebrow>07 · REST API — DOCUMENTS &amp; MEMORIES</Eyebrow>
            <H2 id="documents">Managing what you ingested</H2>
            <table className="w-full mt-3 text-[12.5px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#737373] border-b border-[#e3e0db]"><th className="py-1.5 pr-3 font-semibold">Endpoint</th><th className="py-1.5 font-semibold">Description</th></tr></thead>
              <tbody className="divide-y divide-[#eae7e1]">
                {[
                  ['GET /api/memories', 'List memories — ?limit&offset&scope&project_id&memory_type&tags&is_latest. Returns {memories[], pagination}.'],
                  ['GET /api/memories/:id', 'Fetch one memory (full fields).'],
                  ['GET /api/knowledge/document?id=', 'A document + its evidence segments.'],
                  ['GET /api/documents', 'List ingested documents.'],
                  ['PATCH /api/memories/:id', 'Update a memory (content/tags/metadata).'],
                  ['DELETE /api/memories/:id?hard=true', 'Delete a memory (hard=true purges vectors too — GDPR erasure).'],
                  ['POST /api/memories/bulk-delete-by-tag', 'Delete every memory carrying a tag {tags:[…]}. Sweeps vectors.'],
                  ['POST | DELETE /api/memories/delete-all', 'Clear the whole workspace — memories AND evidence segments AND documents.'],
                  ['GET /api/memory/stats', 'Counts + storage_mode (hybrid | amr | byod). Branch on this to skip central-graph-only features.'],
                ].map(([n, d]) => (
                  <tr key={n}><td className="py-2 pr-4 font-mono text-[#0a0a0a] whitespace-nowrap align-top">{n}</td><td className="py-2 text-[#525252]">{d}</td></tr>
                ))}
              </tbody>
            </table>
            <P className="text-[12px] mt-3">
              <strong className="text-[#0a0a0a]">Storage modes.</strong> Every workspace runs one engine, chosen by plan/hosting:
              <Mono>hybrid</Mono> (central), <Mono>amr</Mono> (embedded sovereign shard), or <Mono>byod</Mono> (your own box). Ingestion + recall
              are identical across all three; only where the bytes live differs. Central-graph-only admin reads return
              <Mono>501 not_supported_for_amr_storage</Mono> for agent-backed tenants by design — gate on <Mono>storage_mode</Mono>.
            </P>
          </section>

          {/* ── Tool reference ── */}
          {toolGroups.map((g, gi) => (
            <section key={g.id} id={g.id} className="mt-12">
              <Eyebrow>{String(8 + gi).padStart(2, '0')} · MCP TOOL REFERENCE</Eyebrow>
              <H2 id={g.id}>{g.title} <span className="text-[#a3a3a3] font-mono text-[14px]">[{g.count}]</span></H2>
              <P>{g.blurb}</P>
              <div className="space-y-4 mt-4">
                {g.tools.map((tool) => <ToolCard key={tool.name} tool={tool} />)}
              </div>
            </section>
          ))}

          {/* ── Best practices ── */}
          <section id="best-practices" className="mt-12 mb-20">
            <Eyebrow>12 · BEST PRACTICES</Eyebrow>
            <H2 id="best-practices">Best practices</H2>
            <ul className="space-y-2.5 text-[13px] text-[#525252] list-none mt-3">
              {[
                ['Recall before you answer', 'Call hivemind_recall with the user’s question before responding — the workspace usually already knows names, decisions, and history your model doesn’t.'],
                ['Save what will matter later', 'Facts, preferences, decisions, and plans belong in memory. One durable claim per save, 2–5 specific tags (entity:<Name>, project:<x>, decision | preference | fact).'],
                ['Use the coding tools in order', 'recall_bugs → why_code before touching unfamiliar code; ingest_code after every meaningful edit; log_decision when you choose between options.'],
                ['Async web tools are two-step', 'web_search / web_crawl return a job receipt — poll web_job_status every 3–5s until succeeded. Check web_usage if jobs are rejected.'],
                ['Update, don’t duplicate', 'When a fact changes, save with relationship: "update" + related_to — the ledger keeps history and time-travel tools stay accurate.'],
              ].map(([tt, dd]) => (
                <li key={tt} className="flex gap-2.5">
                  <Zap size={14} className="text-[#117dff] shrink-0 mt-0.5" />
                  <span><strong className="text-[#0a0a0a]">{tt}.</strong> {dd}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3]">
              <span className="flex items-center gap-1.5"><BookOpen size={11} className="text-[#117dff]/60" /> SINGULANCE · HIVEMIND</span>
              <span className="flex items-center gap-1.5"><Server size={11} className="text-[#117dff]/60" /> EU Sovereign</span>
              <span className="flex items-center gap-1.5"><Terminal size={11} className="text-[#117dff]/60" /> MCP 2025-03-26</span>
              <span className="flex items-center gap-1.5"><KeyRound size={11} className="text-[#117dff]/60" /> <ChevronRight size={10} /> /hivemind/app/keys</span>
            </div>
          </section>
          </>}
        </main>

        {/* ── Right: on-this-page jump list ── */}
        <aside className="hidden xl:block w-52 shrink-0">
          <OnThisPage headings={toc} />
        </aside>
      </div>
    </div>
  );
}
