import React, { useMemo, useState } from 'react';
import { Hexagon, KeyRound, Server, Terminal, Shield, BookOpen, ChevronRight, Copy, Check, Zap } from 'lucide-react';
import { MEMORY_TOOLS, WEB_TOOLS, CODING_TOOLS, TEMPORAL_TOOLS } from './app/pages/McpServer';

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

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'api-keys', label: 'API key reference' },
  { id: 'auth-headers', label: '— Auth headers' },
  { id: 'key-lifecycle', label: '— Lifecycle & scopes' },
  { id: 'mcp-setup', label: 'MCP server setup' },
  { id: 'mcp-claude-code', label: '— Claude Code' },
  { id: 'mcp-claude-ai', label: '— Claude.ai / Desktop' },
  { id: 'mcp-cursor', label: '— Cursor & JSON clients' },
  { id: 'mcp-stdio', label: '— stdio bridge' },
  { id: 'mcp-verify', label: '— Verify the connection' },
  { id: 'agents', label: 'Agent integrations' },
  { id: 'agent-openclaw', label: '— OpenClaw' },
  { id: 'agent-hermes', label: '— Hermes Agents' },
  { id: 'agent-langchain', label: '— LangChain / custom' },
  { id: 'agent-http', label: '— Any agent (raw HTTP)' },
  { id: 'ingestion', label: 'Ingestion (uploads)' },
  { id: 'ingest-file', label: '— Upload a file' },
  { id: 'ingest-source', label: '— Text / URL / conversation' },
  { id: 'ingest-status', label: '— Poll status' },
  { id: 'ingest-types', label: '— Supported types' },
  { id: 'recall', label: 'Recall & search' },
  { id: 'recall-recall', label: '— Recall' },
  { id: 'recall-chat', label: '— Grounded chat' },
  { id: 'documents', label: 'Documents & memories' },
  { id: 'tools-memory', label: 'Tools · Memory' },
  { id: 'tools-web', label: 'Tools · Web intelligence' },
  { id: 'tools-coding', label: 'Tools · Coding' },
  { id: 'tools-temporal', label: 'Tools · Time travel' },
  { id: 'best-practices', label: 'Best practices' },
];

export default function DocsPage() {
  const groups = useMemo(() => ([
    { id: 'tools-memory', title: 'Memory tools', count: MEMORY_TOOLS.length, tools: MEMORY_TOOLS, blurb: 'The core read/write surface of the memory engine. Every durable fact, decision, and conversation flows through these.' },
    { id: 'tools-web', title: 'Web intelligence tools', count: WEB_TOOLS.length, tools: WEB_TOOLS, blurb: 'Live web search + crawl with an async job model: submit → poll → read results. Quota-metered per workspace.' },
    { id: 'tools-coding', title: 'Coding intelligence tools', count: CODING_TOOLS.length, tools: CODING_TOOLS, blurb: 'Purpose-built for AI coding assistants: version-chained code ingestion, bug recall, decision logging, refactor tracking, test coverage, and "why does this code exist".' },
    { id: 'tools-temporal', title: 'Time-travel tools', count: TEMPORAL_TOOLS.length, tools: TEMPORAL_TOOLS, blurb: 'Bi-temporal queries over the version ledger: point-in-time snapshots, diffs between dates, and full revision chains.' },
  ]), []);

  return (
    <div className="min-h-screen bg-[#faf9f4]">
      {/* ── SINGULANCE navbar ── */}
      <header className="sticky top-0 z-30 h-14 bg-[#faf9f4]/90 backdrop-blur-xl border-b border-[#e3e0db] flex items-center justify-between px-5 md:px-8">
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
      </header>

      <div className="max-w-[1200px] mx-auto flex gap-10 px-5 md:px-8 py-10">
        {/* ── TOC ── */}
        <nav className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20 space-y-0.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#a3a3a3] mb-2">On this page</div>
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`}
                className={`block px-2 py-1 rounded-[6px] text-[12px] no-underline hover:bg-[#f3f1ec] hover:text-[#0a0a0a] ${n.label.startsWith('—') ? 'text-[#a3a3a3] pl-4' : 'text-[#525252] font-medium'}`}>
                {n.label.replace('— ', '')}
              </a>
            ))}
          </div>
        </nav>

        {/* ── Content ── */}
        <main className="flex-1 min-w-0 max-w-[760px]">
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
  -F "tags=research,q3"`}</CodeBlock>
            <CodeBlock label="202 accepted">{`{
  "job_id": "294decd2-33f9-4bd3-b3d6-9c85abce5fa6",
  "status": "queued",
  "storage_mode": "amr_embedded",
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
                  ['mode', 'document (multi-fact distill → many memories + entities + relationships) · atomic (one memory) · evidence (searchable verbatim, no distill — like SuperRAG).'],
                  ['scope / projectId', 'personal | project | team | organization + the project id when scoped.'],
                  ['tags', 'Extra tags stamped on the resulting memories.'],
                ].map(([n, d]) => (
                  <tr key={n}><td className="py-1.5 pr-3 font-mono text-[#0a0a0a] whitespace-nowrap align-top">{n}</td><td className="py-1.5 text-[#525252]">{d}</td></tr>
                ))}
              </tbody>
            </table>
            <P><strong className="text-[#0a0a0a]">Modes at a glance.</strong> <Mono>document</Mono> = full pipeline (facts + entities + relationships). <Mono>evidence</Mono> = chunk/embed/index only, kept verbatim and searchable but not distilled into memories — the cheaper &ldquo;make it searchable, don&rsquo;t remember it&rdquo; path. <Mono>atomic</Mono> = a single memory through the engine gateway.</P>

            <H3 id="ingest-status">Poll ingestion status</H3>
            <P><Mono>GET /api/knowledge/status?job_id=&lt;id&gt;</Mono> — poll until <Mono>ready</Mono> or <Mono>failed</Mono>.</P>
            <CodeBlock label="200 · ready">{`{
  "status": "ready",
  "progress": 100,
  "document_id": "85f0f480-8fb6-4e2e-8d05-2439e52f3b3c",
  "memory_ids": ["a22f0888-…", "8dfe5b8f-…"],
  "counts": { "pages": 1, "segments": 1, "candidates": 1, "memories": 5 }
}`}</CodeBlock>
            <P>Stages: <Mono>queued → parsing → segmenting → embedding → promoting → ready</Mono> (or <Mono>failed</Mono>). A document that parses but yields zero memories still succeeds as <em>evidence-only</em> — its verbatim segments remain fully searchable.</P>

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
          {groups.map((g, gi) => (
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
        </main>
      </div>
    </div>
  );
}
