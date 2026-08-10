import React, { useMemo, useState, useEffect } from 'react';
import { Hexagon, KeyRound, Server, Terminal, Shield, BookOpen, ChevronRight, ChevronDown, Copy, Check, Zap, HardDrive, Github, Star, Rocket, Download } from 'lucide-react';
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

function Sidebar({ groups }) {
  const [open, setOpen] = useState(() => Object.fromEntries(groups.map((g) => [g.title, true])));
  useEffect(() => {
    setOpen(Object.fromEntries(groups.map((g) => [g.title, true])));
  }, [groups]);
  return (
    <div className="sticky top-20 space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-1">Documentation</div>
      {groups.map((g) => (
        <div key={g.title}>
          <button
            onClick={() => setOpen((o) => ({ ...o, [g.title]: !o[g.title] }))}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a] uppercase tracking-wide"
          >
            {g.title}
            {open[g.title] ? <ChevronDown size={12} className="text-[#a3a3a3]" /> : <ChevronRight size={12} className="text-[#a3a3a3]" />}
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

export default function DocsPage() {
  const [product, setProduct] = useState('hivemind'); // 'hivemind' | 'icarus'
  const toolGroups = useMemo(() => ([
    { id: 'tools-memory', title: 'Memory tools', count: MEMORY_TOOLS.length, tools: MEMORY_TOOLS, blurb: 'The core read/write surface of the memory engine. Every durable fact, decision, and conversation flows through these.' },
    { id: 'tools-web', title: 'Web intelligence tools', count: WEB_TOOLS.length, tools: WEB_TOOLS, blurb: 'Live web search + crawl with an async job model: submit → poll → read results. Quota-metered per workspace.' },
    { id: 'tools-coding', title: 'Coding intelligence tools', count: CODING_TOOLS.length, tools: CODING_TOOLS, blurb: 'Purpose-built for AI coding assistants: version-chained code ingestion, bug recall, decision logging, refactor tracking, test coverage, and "why does this code exist".' },
    { id: 'tools-temporal', title: 'Time-travel tools', count: TEMPORAL_TOOLS.length, tools: TEMPORAL_TOOLS, blurb: 'Bi-temporal queries over the version ledger: point-in-time snapshots, diffs between dates, and full revision chains.' },
  ]), []);

  return (
    <div className="min-h-screen bg-[#faf9f4]">
      {/* ── SINGULANCE navbar — top-level product tabs, Composio's Docs/Examples/Toolkits pattern ── */}
      <header className="sticky top-0 z-30 bg-[#faf9f4]/90 backdrop-blur-xl border-b border-[#e3e0db] px-5 md:px-8">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <a href="https://singulancelabs.com" className="text-[12px] font-bold font-['Space_Grotesk'] tracking-[0.22em] text-[#0a0a0a] no-underline">SINGULANCE</a>
            <span className="text-[#d4d0ca]">/</span>
            <a href="/hivemind" className="flex items-center gap-1.5 no-underline">
              <Hexagon size={14} className="text-[#117dff]" />
              <span className="text-[12px] font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">HIVEMIND</span>
            </a>
            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.2em] text-[#a3a3a3]">Docs</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/hivemind/login" className="px-3 py-1.5 rounded-[6px] text-[12px] text-[#525252] hover:text-[#0a0a0a] no-underline">Sign in</a>
            <a href="/hivemind/app/mcp" className="px-3 py-1.5 rounded-[6px] bg-[#117dff] hover:bg-[#0066e0] text-white text-[12px] font-semibold no-underline">Open console</a>
          </div>
        </div>
        <div className="flex items-center gap-6 h-10">
          {[
            { id: 'hivemind', label: 'HIVEMIND' },
            { id: 'icarus', label: 'ICARUS · self-host' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setProduct(t.id)}
              className={`h-full text-[12.5px] font-medium border-b-2 -mb-px ${product === t.id ? 'border-[#117dff] text-[#0a0a0a]' : 'border-transparent text-[#737373] hover:text-[#0a0a0a]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto flex gap-10 px-5 md:px-8 py-10">
        {/* ── TOC ── */}
        <nav className="hidden lg:block w-60 shrink-0">
          <Sidebar groups={product === 'hivemind' ? HIVEMIND_GROUPS : ICARUS_GROUPS} />
        </nav>

        {/* ── Content ── */}
        <main className="flex-1 min-w-0 max-w-[760px]">
          {product === 'icarus' ? <IcarusDocs /> : <>
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
      </div>
    </div>
  );
}
