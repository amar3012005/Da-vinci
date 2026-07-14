import React, { useEffect, useMemo, useState } from 'react';
import { API_DEFAULTS } from '../shared/theme';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Terminal, AlertTriangle, ArrowLeft, Sparkles, FileText } from 'lucide-react';

/**
 * Generalised MCP-client connect callback.
 *
 * Lands here after the user signs in via /auth/cli on the control plane.
 * URL contains: ?apikey=hm_...&user_id=...&org_id=...&client=<id>
 *
 * Renders platform-specific output for: claude-code (CLI), claude-desktop
 * (config JSON), vscode (config JSON), antigravity (config JSON),
 * cursor (config JSON), remote (HTTP endpoint).
 *
 * One copy-button. One paste. Done.
 */

const MCP_BRIDGE = (userId) =>
  `${API_DEFAULTS.coreApiBase}/api/mcp/servers/${userId}`;

const PLATFORMS = {
  'claude-code': {
    name: 'Claude Code',
    primary: 'cli',
    pasteTarget: 'any terminal where Claude Code runs',
    verifyCmd: 'claude mcp list | grep hivemind',
    cli: ({ apiKey, userId, orgId }) =>
      `claude mcp add hivemind --scope user -e HIVEMIND_API_KEY="${apiKey}" -e HIVEMIND_USER_ID="${userId}"${orgId ? ` -e HIVEMIND_ORG_ID="${orgId}"` : ''} -- npx -y @amar_528/mcp-bridge hosted --url "${MCP_BRIDGE(userId)}"`,
  },
  'claude_code': 'claude-code', // alias
  'claude_code_web': 'claude-code', // alias
  'claude-desktop': {
    name: 'Claude Desktop',
    primary: 'json',
    pasteTarget: '~/Library/Application Support/Claude/claude_desktop_config.json',
    pasteTargetWin: '%APPDATA%\\Claude\\claude_desktop_config.json',
    instructions: [
      'Open Claude Desktop → Settings → Developer → Edit Config',
      'Paste the JSON below into claude_desktop_config.json',
      'Restart Claude Desktop',
    ],
    json: ({ apiKey, userId }) => ({
      mcpServers: {
        hivemind: {
          command: 'npx',
          args: ['-y', '@amar_528/mcp-bridge', 'hosted', '--url', MCP_BRIDGE(userId)],
          env: { HIVEMIND_API_KEY: apiKey, HIVEMIND_USER_ID: userId },
        },
      },
    }),
  },
  'vscode': {
    name: 'VS Code',
    primary: 'json',
    pasteTarget: 'VS Code → Settings → settings.json → mcp.servers',
    instructions: [
      'Open VS Code → Settings (Cmd/Ctrl+,) → search "mcp"',
      'Click "Edit in settings.json"',
      'Add the JSON below under "mcp.servers"',
      'Reload VS Code window',
    ],
    json: ({ apiKey, userId }) => ({
      'mcp.servers': {
        hivemind: {
          command: 'npx',
          args: ['-y', '@amar_528/mcp-bridge', 'hosted', '--url', MCP_BRIDGE(userId)],
          env: { HIVEMIND_API_KEY: apiKey, HIVEMIND_USER_ID: userId },
        },
      },
    }),
  },
  'antigravity': {
    name: 'Antigravity',
    primary: 'json',
    pasteTarget: 'Antigravity → Integrations → MCP Servers',
    instructions: [
      'Open Antigravity settings',
      'Go to Integrations → MCP Servers → Add new server',
      'Paste the JSON below',
    ],
    json: ({ apiKey, userId }) => ({
      mcpServers: {
        hivemind: {
          command: 'npx',
          args: ['-y', '@amar_528/mcp-bridge', 'hosted', '--url', MCP_BRIDGE(userId)],
          env: { HIVEMIND_API_KEY: apiKey, HIVEMIND_USER_ID: userId },
        },
      },
    }),
  },
  'cursor': {
    name: 'Cursor',
    primary: 'json',
    pasteTarget: '~/.cursor/mcp.json',
    pasteTargetWin: '%USERPROFILE%\\.cursor\\mcp.json',
    instructions: [
      'Create the file ~/.cursor/mcp.json if it does not exist',
      'Paste the JSON below',
      'Restart Cursor (Cmd/Ctrl+Shift+P → "Reload Window")',
    ],
    json: ({ apiKey, userId }) => ({
      mcpServers: {
        hivemind: {
          command: 'npx',
          args: ['-y', '@amar_528/mcp-bridge', 'hosted', '--url', MCP_BRIDGE(userId)],
          env: { HIVEMIND_API_KEY: apiKey, HIVEMIND_USER_ID: userId },
        },
      },
    }),
  },
  'remote': {
    name: 'Remote MCP',
    primary: 'http',
    pasteTarget: 'Any client that speaks JSON-RPC over HTTP',
    instructions: [
      'POST to the endpoint with method=initialize / tools/list / tools/call',
      'Pass your API key as Authorization: Bearer header',
    ],
    http: ({ apiKey, userId }) =>
      [
        `Endpoint: POST ${API_DEFAULTS.coreApiBase}/api/mcp/rpc`,
        `Headers:`,
        `  Authorization: Bearer ${apiKey}`,
        `  X-User-Id: ${userId}`,
        `  Content-Type: application/json`,
        ``,
        `Sample body:`,
        `  {"method":"tools/list","params":{},"id":1}`,
      ].join('\n'),
  },
};

function resolvePlatform(client) {
  let p = PLATFORMS[client];
  if (typeof p === 'string') p = PLATFORMS[p];
  return p || PLATFORMS['claude-code'];
}

export default function McpConnectCallback() {
  const { t } = useTranslation('dashboard');
  const [search] = useSearchParams();
  const [copied, setCopied] = useState(false);

  const apiKey = search.get('apikey') || '';
  const userId = search.get('user_id') || search.get('userId') || '';
  const orgId = search.get('org_id') || search.get('orgId') || '';
  const error = search.get('error') || '';
  const clientParam = (search.get('client') || 'claude-code').toLowerCase();
  const platform = resolvePlatform(clientParam);

  const block = useMemo(() => {
    if (!apiKey || !userId) return '';
    if (platform.primary === 'cli') return platform.cli({ apiKey, userId, orgId });
    if (platform.primary === 'json') return JSON.stringify(platform.json({ apiKey, userId, orgId }), null, 2);
    if (platform.primary === 'http') return platform.http({ apiKey, userId });
    return '';
  }, [apiKey, userId, orgId, platform]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  // Auto-copy on first render — power users paste immediately.
  useEffect(() => {
    if (block) navigator.clipboard.writeText(block).catch(() => {});
  }, [block]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg w-full shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="text-red-500" size={20} />
            <h1 className="text-lg font-bold text-[#0a0a0a] font-['Space_Grotesk']">{t('mcpconnectcallback.connectionFailed', 'Connection failed')}</h1>
          </div>
          <p className="text-sm text-[#525252] font-['Space_Grotesk'] mb-4">{error}</p>
          <Link
            to="/hivemind/app/connectors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#117dff] hover:underline"
          >
            <ArrowLeft size={14} /> {t('mcpconnectcallback.backToConnectors', 'Back to Connectors')}
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!apiKey || !userId) {
    return (
      <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center p-6">
        <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-lg w-full">
          <h1 className="text-lg font-bold text-[#0a0a0a] mb-2 font-['Space_Grotesk']">{t('mcpconnectcallback.missingParams', 'Missing parameters')}</h1>
          <p className="text-sm text-[#525252] mb-4 font-['Space_Grotesk']">
            {t('mcpconnectcallback.missingParamsDesc', 'This page expects ?apikey= and ?user_id= from the OAuth callback. Start the flow from the Connectors page.')}
          </p>
          <Link
            to="/hivemind/app/connectors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#117dff] hover:underline"
          >
            <ArrowLeft size={14} /> {t('mcpconnectcallback.backToConnectors', 'Back to Connectors')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f4] p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Check className="text-emerald-600" size={20} />
            </div>
            <h1 className="text-2xl font-bold text-[#0a0a0a] font-['Space_Grotesk']">
              {t('mcpconnectcallback.connectedTitle', 'Connected to {{name}}. {{next}}', {
                name: platform.name,
                next: platform.primary === 'cli'
                  ? t('mcpconnectcallback.oneCommandLeft', 'One command left.')
                  : t('mcpconnectcallback.almostDone', 'Almost done.'),
              })}
            </h1>
          </div>
          <p className="text-sm text-[#525252] font-['Space_Grotesk'] ml-[52px]">
            {t('mcpconnectcallback.pasteInstruction', 'Paste the {{type}} below into', {
              type: platform.primary === 'cli'
                ? t('mcpconnectcallback.typeCommand', 'command')
                : platform.primary === 'json'
                  ? t('mcpconnectcallback.typeJson', 'JSON')
                  : t('mcpconnectcallback.typeConfig', 'config'),
            })}{' '}
            <span className="font-mono text-[#117dff] text-xs">{platform.pasteTarget}</span>
            {platform.pasteTargetWin && (
              <> ({t('mcpconnectcallback.windows', 'Windows')}: <span className="font-mono text-[#117dff] text-xs">{platform.pasteTargetWin}</span>)</>
            )}
            . {t('mcpconnectcallback.restartHint', 'Then restart {{name}} — all 22 HIVEMIND tools become available.', { name: platform.name })}
          </p>
        </motion.div>

        {Array.isArray(platform.instructions) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white border border-[#e3e0db] rounded-2xl p-5 mb-5"
          >
            <p className="text-[10px] font-mono text-[#a3a3a3] uppercase tracking-wider mb-3">{t('mcpconnectcallback.steps', 'Steps')}</p>
            <ol className="space-y-2">
              {platform.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#117dff]/10 text-[#117dff] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                  <p className="text-sm text-[#525252] font-['Space_Grotesk'] leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[#e3e0db] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden mb-5"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f3f1ec]">
            <div className="flex items-center gap-2">
              {platform.primary === 'cli' ? <Terminal size={14} className="text-[#525252]" /> : <FileText size={14} className="text-[#525252]" />}
              <p className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">
                {platform.primary === 'cli'
                  ? t('mcpconnectcallback.runCommand', 'Run this command')
                  : platform.primary === 'json'
                    ? t('mcpconnectcallback.pasteJson', 'Paste this JSON')
                    : t('mcpconnectcallback.useConfig', 'Use this config')}
              </p>
              <span className="text-[10px] text-emerald-600 font-mono">
                {copied
                  ? t('mcpconnectcallback.copiedJustNow', 'copied just now')
                  : t('mcpconnectcallback.autoCopied', 'auto-copied to clipboard')}
              </span>
            </div>
            <button
              onClick={() => handleCopy(block)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] transition-all ${
                copied
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-white text-[#525252] border border-[#e3e0db] hover:bg-[#f3f1ec]'
              }`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? t('mcpconnectcallback.copied', 'Copied') : t('mcpconnectcallback.copy', 'Copy')}
            </button>
          </div>
          <pre className="px-5 py-4 text-[12px] font-mono text-[#cdd6f4] bg-[#0a0a0a] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
            {block}
          </pre>
        </motion.div>

        {platform.verifyCmd && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 mb-5"
          >
            <Check className="text-emerald-600 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-semibold text-emerald-700 font-['Space_Grotesk'] mb-1">
                {t('mcpconnectcallback.verifyAfterPasting', 'Verify after pasting')}
              </p>
              <pre className="text-[11px] font-mono text-emerald-800 bg-white/50 rounded px-2 py-1.5">
                {platform.verifyCmd}
              </pre>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-[#e3e0db] rounded-2xl p-5 mb-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-[#117dff]" />
            <p className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">
              {t('mcpconnectcallback.toolsAvailable', "22 tools you'll have available")}
            </p>
          </div>
          <p className="text-xs text-[#525252] font-['Space_Grotesk'] leading-relaxed">
            <strong>Memory (9):</strong> save_memory, recall, get_memory, list_memories, update_memory, delete_memory, save_conversation, traverse_graph, query_with_ai.{' '}
            <strong>Web (4):</strong> web_search, web_crawl, web_job_status, web_usage.{' '}
            <strong>Coding (6):</strong> ingest_code, recall_bugs, log_decision, track_refactor, test_coverage, why_code.{' '}
            <strong>Time Travel (3):</strong> code_at, code_diff, code_timeline.
          </p>
        </motion.div>

        <div className="flex items-center justify-between">
          <Link
            to="/hivemind/app/connectors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#525252] hover:text-[#117dff] font-['Space_Grotesk']"
          >
            <ArrowLeft size={14} /> {t('mcpconnectcallback.backToConnectors', 'Back to Connectors')}
          </Link>
          <Link
            to="/hivemind/app/mcp"
            className="text-sm font-semibold text-[#117dff] hover:underline font-['Space_Grotesk']"
          >
            {t('mcpconnectcallback.viewAllTools', 'View all 22 tools →')}
          </Link>
        </div>
      </div>
    </div>
  );
}
