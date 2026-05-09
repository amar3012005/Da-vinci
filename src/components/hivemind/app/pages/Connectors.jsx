import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cable,
  Copy,
  Check,
  Terminal,
  Code2,
  Globe,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Mail,
  MessageSquare,
  Github,
  FileText,
  Calendar,
  HardDrive,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Zap,
  Plus,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useCopyToClipboard } from '../shared/hooks';
import ApiKeyPrompt from '../shared/ApiKeyPrompt';
import { useAuth } from '../auth/AuthProvider';

// ─── Connector Provider Definitions (Supermemory-style) ────────────────────

const CONNECTOR_CATEGORIES = [
  {
    key: 'mcp_clients',
    label: 'MCP Clients',
    description: 'AI assistants connected via MCP protocol',
  },
  {
    key: 'workspace',
    label: 'Workspace Apps',
    description: 'Email, calendar, and communication tools',
  },
  {
    key: 'knowledge',
    label: 'Knowledge Sources',
    description: 'Documentation and knowledge bases',
  },
  {
    key: 'code',
    label: 'Code Tools',
    description: 'Source code and development platforms',
  },
];

const CONNECTORS = [
  // MCP Clients (already working)
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'One-click install via official plugin marketplace + browser OAuth',
    icon: Terminal,
    category: 'mcp_clients',
    status: 'available',
    color: '#117dff',
    configKey: 'claude-code',
    mcpEndpointName: 'claude-code',
    isMcpClient: true,
    isPluginInstall: true,
    setupTitle: 'Install the Claude Code plugin',
    setupSteps: [
      'Run the three commands below inside any Claude Code session',
      'A browser tab opens for sign-in (Zitadel SSO or Google)',
      'Plugin auto-loads HIVEMIND MCP — all 22 tools become available',
    ],
    pluginCommands: [
      '/plugin marketplace add amar3012005/claude-hivemind',
      '/plugin install claude-hivemind',
      '/hivemind:connect',
    ],
    configPath: '~/.hivemind-claude/credentials.json (auto-managed by plugin)',
  },
  {
    id: 'claude',
    name: 'Claude Desktop',
    description: 'Anthropic Claude — one-click OAuth, paste pre-filled JSON config',
    icon: Terminal,
    category: 'mcp_clients',
    status: 'available',
    color: '#117dff',
    configKey: 'claude',
    mcpEndpointName: 'claude',
    isMcpClient: true,
    isOauthConnect: true,
    oauthClientId: 'claude-desktop',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Cursor IDE — one-click OAuth, paste pre-filled mcp.json',
    icon: Code2,
    category: 'mcp_clients',
    status: 'available',
    color: '#7c3aed',
    configKey: 'cursor',
    mcpEndpointName: 'cursor',
    isMcpClient: true,
    isOauthConnect: true,
    oauthClientId: 'cursor',
  },
  {
    id: 'vscode',
    name: 'VS Code',
    description: 'Visual Studio Code — one-click OAuth, paste pre-filled settings.json',
    icon: Code2,
    category: 'mcp_clients',
    status: 'available',
    color: '#3b82f6',
    configKey: 'vscode',
    mcpEndpointName: 'vscode',
    isMcpClient: true,
    isOauthConnect: true,
    oauthClientId: 'vscode',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    description: 'Google Antigravity — one-click OAuth, paste pre-filled MCP server config',
    icon: Cable,
    category: 'mcp_clients',
    status: 'available',
    color: '#a855f7',
    configKey: 'antigravity',
    mcpEndpointName: 'antigravity',
    isMcpClient: true,
    isOauthConnect: true,
    oauthClientId: 'antigravity',
  },
  {
    id: 'remote',
    name: 'Remote MCP',
    description: 'HTTP JSON-RPC endpoint for custom clients',
    icon: Globe,
    category: 'mcp_clients',
    status: 'available',
    color: '#22c55e',
    configKey: 'remote-mcp',
  },
  {
    id: 'notebooklm',
    name: 'NotebookLM',
    description: 'NotebookLM via a local MCP bridge on your machine',
    icon: BookOpen,
    category: 'mcp_clients',
    status: 'available',
    color: '#117dff',
    configKey: 'notebooklm',
    setupOnly: true,
  },
  // Enterprise stack (Microsoft + Atlassian + Salesforce — top-of-stack ARR)
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Outlook mail + Calendar + Teams chat + SharePoint via single Azure AD OAuth',
    icon: Mail,
    category: 'workspace',
    status: 'needs_oauth_setup',
    color: '#0078d4',
    priority: 1,
    oauthProvider: 'outlook',
    setupHint: 'Set MICROSOFT_CLIENT_ID + MICROSOFT_CLIENT_SECRET on the control plane',
  },
  {
    id: 'atlassian',
    name: 'Atlassian (Jira + Confluence)',
    description: 'Jira issues + Confluence pages via single Atlassian OAuth 2.0 (3LO)',
    icon: BookOpen,
    category: 'knowledge',
    status: 'needs_oauth_setup',
    color: '#0052cc',
    priority: 1,
    oauthProvider: 'atlassian',
    setupHint: 'Set ATLASSIAN_CLIENT_ID + ATLASSIAN_CLIENT_SECRET on the control plane',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Accounts, Opportunities, Cases, Contacts via Salesforce Connected App',
    icon: Cable,
    category: 'workspace',
    status: 'needs_oauth_setup',
    color: '#00a1e0',
    priority: 1,
    oauthProvider: 'salesforce',
    setupHint: 'Set SALESFORCE_CLIENT_ID + SALESFORCE_CLIENT_SECRET on the control plane',
  },
  // Workspace (coming soon)
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Import emails and conversations as memories',
    icon: Mail,
    category: 'workspace',
    status: 'available',
    color: '#ef4444',
    priority: 1,
    oauthProvider: 'gmail',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync events, meetings, and agendas',
    icon: Calendar,
    category: 'workspace',
    status: 'coming_soon',
    color: '#3b82f6',
    priority: 1,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Index documents, sheets, and presentations',
    icon: HardDrive,
    category: 'workspace',
    status: 'available',
    color: '#f59e0b',
    priority: 1,
    oauthProvider: 'gdrive',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Capture conversations and shared knowledge',
    icon: MessageSquare,
    category: 'workspace',
    status: 'available',
    color: '#e11d48',
    priority: 2,
    oauthProvider: 'slack',
  },
  // Knowledge
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync pages, databases, and wikis',
    icon: BookOpen,
    category: 'knowledge',
    status: 'available',
    color: '#f5f5f5',
    priority: 5,
    oauthProvider: 'notion',
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Import team documentation and spaces',
    icon: Layers,
    category: 'knowledge',
    status: 'coming_soon',
    color: '#3b82f6',
    priority: 6,
  },
  // Code
  {
    id: 'github',
    name: 'GitHub',
    description: 'Index repos, issues, PRs, and discussions',
    icon: Github,
    category: 'code',
    status: 'available',
    color: '#f5f5f5',
    priority: 3,
    oauthProvider: 'github',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Sync issues, projects, and roadmaps',
    icon: FileText,
    category: 'code',
    status: 'coming_soon',
    color: '#5e6ad2',
    priority: 4,
  },
];

// ─── Status Components ──────────────────────────────────────────────────────

function ConnectorStatusBadge({ status }) {
  const styles = {
    connected: {
      bg: 'bg-emerald-500/10',
      text: 'text-[#16a34a]',
      border: 'border-emerald-500/20',
      label: 'Connected',
      dot: 'bg-[#16a34a]',
    },
    syncing: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      label: 'Syncing',
      dot: 'bg-blue-400 animate-pulse',
    },
    error: {
      bg: 'bg-red-500/10',
      text: 'text-[#dc2626]',
      border: 'border-red-500/20',
      label: 'Error',
      dot: 'bg-[#dc2626]',
    },
    available: {
      bg: 'bg-[#f3f1ec]',
      text: 'text-[#525252]',
      border: 'border-[#e3e0db]',
      label: 'Available',
      dot: 'bg-[#a3a3a3]',
    },
    coming_soon: {
      bg: 'bg-white',
      text: 'text-[#a3a3a3]',
      border: 'border-[#e3e0db]',
      label: 'Coming Soon',
      dot: 'bg-[#e3e0db]',
    },
    needs_reauth: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      label: 'Needs Reauth',
      dot: 'bg-amber-400',
    },
    needs_oauth_setup: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200',
      label: 'Needs OAuth Setup',
      dot: 'bg-amber-500',
    },
  };

  const s = styles[status] || styles.available;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium font-['Space_Grotesk'] border ${s.bg} ${s.text} ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── JSON Block ──────────────────────────────────────────────────────────────

function JsonBlock({ data }) {
  const raw = JSON.stringify(data, null, 2);
  const lines = raw.split('\n');

  return (
    <pre className="bg-[#faf9f4] rounded-xl p-4 overflow-x-auto text-[12px] leading-relaxed font-['JetBrains_Mono','Fira_Code',monospace] border border-[#eae7e1]">
      {lines.map((line, i) => (
        <div key={i}>{colorize(line)}</div>
      ))}
    </pre>
  );
}

function colorize(line) {
  const kvMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)("(?:[^"\\]|\\.)*")(,?)$/);
  if (kvMatch) {
    const [, indent, key, colon, value, comma] = kvMatch;
    return (
      <>
        <span className="text-[#d4d0ca]">{indent}"</span>
        <span className="text-[#117dff]">{key}</span>
        <span className="text-[#d4d0ca]">"</span>
        <span className="text-[#d4d0ca]">{colon}</span>
        <span className="text-[#16a34a]">{value}</span>
        <span className="text-[#d4d0ca]">{comma}</span>
      </>
    );
  }

  const kvOther = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.+?)(,?)$/);
  if (kvOther) {
    const [, indent, key, colon, value, comma] = kvOther;
    return (
      <>
        <span className="text-[#d4d0ca]">{indent}"</span>
        <span className="text-[#117dff]">{key}</span>
        <span className="text-[#d4d0ca]">"</span>
        <span className="text-[#d4d0ca]">{colon}</span>
        <span className="text-orange-300">{value}</span>
        <span className="text-[#d4d0ca]">{comma}</span>
      </>
    );
  }

  const strMatch = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(,?)$/);
  if (strMatch) {
    const [, indent, value, comma] = strMatch;
    return (
      <>
        <span className="text-[#d4d0ca]">{indent}</span>
        <span className="text-[#16a34a]">{value}</span>
        <span className="text-[#d4d0ca]">{comma}</span>
      </>
    );
  }

  return <span className="text-[#d4d0ca]">{line}</span>;
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      onClick={() => copy(text)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all font-['Space_Grotesk'] border ${
        copied
          ? 'bg-emerald-500/10 text-[#16a34a] border-emerald-500/20'
          : 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db] hover:bg-[#eae7e1] hover:text-[#525252]'
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ─── Connector Card (Supermemory-style) ──────────────────────────────────────

function ConnectorCard({ connector, config, onConnect, onDisconnect, onResync, connecting, targetScope, onTargetScopeChange, allowTeamScope }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = connector.icon;
  const isActive = connector.status === 'connected' || connector.status === 'syncing';
  const isComingSoon = connector.status === 'coming_soon';
  const hasConfig = config && connector.configKey;
  const isSetupOnly = connector.setupOnly === true;
  const canShowConfig = hasConfig && (isActive || isSetupOnly);
  const configStr = hasConfig ? JSON.stringify(config, null, 2) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group rounded-xl border transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        isActive
          ? 'bg-white border-[#e3e0db] hover:border-[#d4d0ca]'
          : isComingSoon
          ? 'bg-white border-[#eae7e1] opacity-60'
          : 'bg-white border-[#e3e0db] hover:border-[#d4d0ca]'
      }`}
    >
      <div className="p-4">
        {/* Top Row: Icon + Name + Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
              style={{
                backgroundColor: `${connector.color}10`,
                borderColor: `${connector.color}20`,
              }}
            >
              <Icon
                size={20}
                style={{ color: connector.color }}
                strokeWidth={1.75}
              />
            </div>
            <div>
              <h3 className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] leading-tight">
                {connector.name}
              </h3>
              <p className="text-[#a3a3a3] text-[12px] font-['Space_Grotesk'] mt-0.5 leading-snug">
                {connector.accountRef ? connector.accountRef : connector.description}
              </p>
              {connector.lastSyncAt && (
                <p className="text-[#d4d0ca] text-[10px] font-mono mt-0.5">
                  Last sync: {new Date(connector.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <ConnectorStatusBadge status={connector.status} />
        </div>

        {connector.oauthProvider && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3]">Sync to</span>
            {[
              { key: 'personal', label: 'My Space', disabled: false },
              { key: 'organization', label: 'Team Workspace', disabled: !allowTeamScope },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                disabled={option.disabled}
                onClick={() => !option.disabled && onTargetScopeChange?.(option.key)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.08em] ${
                  targetScope === option.key
                    ? 'border-[#117dff]/30 bg-[#117dff]/10 text-[#117dff]'
                    : 'border-[#e3e0db] bg-[#faf9f4] text-[#737373]'
                } ${option.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canShowConfig && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium font-['Space_Grotesk'] bg-[#f3f1ec] border border-[#e3e0db] text-[#525252] hover:bg-[#eae7e1] hover:text-[#525252] transition-all"
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Config
              </button>
              <CopyButton text={configStr} label="Copy Config" />
            </>
          )}

          {connector.status === 'available' && !isSetupOnly && (
            <button
              onClick={onConnect}
              disabled={connecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] bg-[#117dff] text-white hover:bg-[#0066e0] disabled:opacity-50 transition-all"
            >
              {connecting ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Plus size={12} />
              )}
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          )}

          {connector.status === 'available' && isSetupOnly && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] bg-[#117dff] text-white hover:bg-[#0066e0] transition-all"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {expanded ? 'Hide Setup' : 'Setup'}
            </button>
          )}

          {isActive && connector.oauthProvider && (
            <>
              <button
                onClick={onResync}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium font-['Space_Grotesk'] bg-[#f3f1ec] border border-[#e3e0db] text-[#525252] hover:bg-[#eae7e1] hover:text-[#525252] transition-all"
              >
                <RefreshCw size={12} />
                Sync Now
              </button>
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium font-['Space_Grotesk'] text-[#dc2626]/60 hover:text-[#dc2626] hover:bg-red-50 transition-all"
              >
                Disconnect
              </button>
            </>
          )}

          {isComingSoon && (
            <span className="text-[#d4d0ca] text-[11px] font-['Space_Grotesk'] flex items-center gap-1.5">
              <Clock size={12} />
              Coming soon
            </span>
          )}

          {connector.status === 'needs_reauth' && (
            <button
              onClick={onConnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
            >
              <RefreshCw size={12} />
              Reconnect
            </button>
          )}

          {connector.status === 'error' && (
            <button
              onClick={onResync}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] bg-red-500/10 text-[#dc2626] border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Expanded Config */}
      <AnimatePresence>
        {expanded && hasConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#eae7e1]"
          >
            <div className="p-4">
              {isSetupOnly && (
                <div className="mb-4 rounded-xl border border-[#117dff]/15 bg-[#117dff]/[0.05] p-4">
                  <h4 className="text-[#0a0a0a] text-xs font-semibold font-['Space_Grotesk'] mb-2">
                    NotebookLM Setup
                  </h4>
                  <ol className="space-y-1.5 text-[12px] leading-relaxed text-[#525252] font-['Space_Grotesk'] list-decimal pl-4">
                    <li>Install <code className="text-[#117dff] font-mono">pip install \"notebooklm-py[browser]\"</code></li>
                    <li>Install Chromium for Playwright with <code className="text-[#117dff] font-mono">playwright install chromium</code></li>
                    <li>Run <code className="text-[#117dff] font-mono">notebooklm login</code> on your machine</li>
                    <li>Copy the config below into your MCP client and replace the placeholder paths</li>
                  </ol>
                </div>
              )}
              <JsonBlock data={config} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Stats Row ───────────────────────────────────────────────────────────────

function StatsRow({ connectors, endpoints }) {
  const connected = connectors.filter(c => c.status === 'connected').length;
  const available = connectors.filter(c => c.status === 'available').length;
  const coming = connectors.filter(c => c.status === 'coming_soon').length;

  const stats = [
    { label: 'Connected', value: connected, icon: CheckCircle2, color: 'text-[#16a34a]' },
    { label: 'Available', value: available, icon: Zap, color: 'text-blue-400' },
    { label: 'Coming Soon', value: coming, icon: Clock, color: 'text-[#525252]' },
    { label: 'MCP Endpoints', value: endpoints?.length || 0, icon: Globe, color: 'text-[#117dff]' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white border border-[#e3e0db] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon size={14} className={stat.color} />
            <span className="text-[#a3a3a3] text-[11px] font-['Space_Grotesk'] uppercase tracking-wider">
              {stat.label}
            </span>
          </div>
          <p className="text-[#0a0a0a] text-xl font-semibold font-mono">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Endpoint Status Table ───────────────────────────────────────────────────

function EndpointTable({ endpoints, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <RefreshCw size={16} className="text-[#117dff] animate-spin" />
      </div>
    );
  }

  if (!endpoints || endpoints.length === 0) {
    return (
      <div className="py-10 text-center">
        <WifiOff size={20} className="text-[#e3e0db] mx-auto mb-2" />
        <p className="text-[#d4d0ca] text-sm font-['Space_Grotesk']">
          No MCP endpoints registered
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e3e0db]">
            {['Endpoint', 'Health', 'Tools', 'Resources', 'Last Checked'].map((h) => (
              <th key={h} className="text-left text-[#d4d0ca] text-[10px] font-mono uppercase tracking-wider px-4 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {endpoints.map((ep, i) => (
            <tr key={ep.url || ep.name || i} className="border-b border-[#eae7e1] hover:bg-[#faf9f4] transition-colors">
              <td className="px-4 py-2.5">
                <span className="text-[#525252] font-mono text-[11px] truncate block max-w-[280px]">
                  {ep.url || ep.name}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <ConnectorStatusBadge status={ep.healthy ? 'connected' : 'error'} />
              </td>
              <td className="px-4 py-2.5 text-[#525252] font-mono text-[11px]">
                {ep.tool_count ?? ep.toolCount ?? '-'}
              </td>
              <td className="px-4 py-2.5 text-[#525252] font-mono text-[11px]">
                {ep.resource_count ?? ep.resourceCount ?? '-'}
              </td>
              <td className="px-4 py-2.5 text-[#d4d0ca] font-mono text-[10px]">
                {ep.updated_at || ep.last_job_at
                  ? new Date(ep.updated_at || ep.last_job_at).toLocaleString()
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

// ─── Gmail Sync Settings Modal ──────────────────────────────────────────────

function GmailSyncSettings({ email, onSync, onClose }) {
  const [dateRange, setDateRange] = useState('30d');
  const [folders, setFolders] = useState(['INBOX', 'SENT']);
  const [excludeCategories, setExcludeCategories] = useState(['promotions', 'social']);
  const [maxEmails, setMaxEmails] = useState(500);
  const [syncing, setSyncing] = useState(false);

  const toggleFolder = (f) => setFolders(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const toggleExclude = (c) => setExcludeCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleStart = async () => {
    setSyncing(true);
    try {
      await onSync({ date_range: dateRange, folders, exclude_categories: excludeCategories, max_emails: maxEmails });
    } finally {
      setSyncing(false);
    }
  };

  const dateOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '365d', label: 'Last year' },
    { value: 'all', label: 'All time' },
  ];

  const folderOptions = ['INBOX', 'SENT', 'STARRED', 'IMPORTANT', 'DRAFT'];
  const categoryOptions = ['promotions', 'social', 'updates', 'forums'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Mail size={18} className="text-[#ef4444]" />
          </div>
          <div>
            <h3 className="text-[#0a0a0a] text-base font-bold font-['Space_Grotesk']">Configure Gmail Sync</h3>
            {email && <p className="text-[#a3a3a3] text-xs font-mono">{email}</p>}
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-4">
          <label className="text-[#525252] text-xs font-semibold font-['Space_Grotesk'] block mb-2">Date Range</label>
          <div className="flex flex-wrap gap-2">
            {dateOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  dateRange === opt.value
                    ? 'bg-[#117dff] text-white'
                    : 'bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Folders */}
        <div className="mb-4">
          <label className="text-[#525252] text-xs font-semibold font-['Space_Grotesk'] block mb-2">Folders to Sync</label>
          <div className="flex flex-wrap gap-2">
            {folderOptions.map(f => (
              <button
                key={f}
                onClick={() => toggleFolder(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  folders.includes(f)
                    ? 'bg-[#22c55e]/10 text-[#16a34a] border border-[#bbf7d0]'
                    : 'bg-[#f3f1ec] text-[#a3a3a3] border border-[#e3e0db]'
                }`}
              >
                {f.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Exclude Categories */}
        <div className="mb-4">
          <label className="text-[#525252] text-xs font-semibold font-['Space_Grotesk'] block mb-2">Exclude Categories</label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map(c => (
              <button
                key={c}
                onClick={() => toggleExclude(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  excludeCategories.includes(c)
                    ? 'bg-[#ef4444]/10 text-[#dc2626] border border-[#fecaca]'
                    : 'bg-[#f3f1ec] text-[#a3a3a3] border border-[#e3e0db]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Max Emails */}
        <div className="mb-6">
          <label className="text-[#525252] text-xs font-semibold font-['Space_Grotesk'] block mb-2">
            Max Emails: <span className="text-[#117dff]">{maxEmails}</span>
          </label>
          <input
            type="range"
            min={50}
            max={2000}
            step={50}
            value={maxEmails}
            onChange={e => setMaxEmails(Number(e.target.value))}
            className="w-full accent-[#117dff]"
          />
          <div className="flex justify-between text-[10px] text-[#a3a3a3] font-mono mt-1">
            <span>50</span><span>500</span><span>1000</span><span>2000</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={syncing || folders.length === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#117dff] text-white hover:bg-[#0066e0] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {syncing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap size={14} />
                Start Sync
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── MCP Setup Modal ─────────────────────────────────────────────────────────

function McpSetupModal({ connector, onClose, user, apiKeys }) {
  const [copied, setCopied] = useState(false);
  const userId = user?.id || user?.userId || 'YOUR_USER_ID';
  const apiKey = apiKeys?.[0]?.key || apiKeys?.[0]?.api_key || 'YOUR_API_KEY';

  const isPluginInstall = connector?.isPluginInstall;
  const pluginBlock = isPluginInstall && Array.isArray(connector.pluginCommands)
    ? connector.pluginCommands.join('\n')
    : null;

  const jsonConfig = JSON.stringify({
    mcpServers: {
      hivemind: {
        command: 'npx',
        args: ['-y', '@amar_528/mcp-bridge', 'hosted', '--url', `https://core.hivemind.davinciai.eu:8050/api/mcp/servers/${userId}`],
        env: { HIVEMIND_API_KEY: apiKey },
      },
    },
  }, null, 2);

  // For Claude Code plugin tile, primary block is the 3 commands. JSON config is shown
  // as fallback for users who prefer manual MCP config.
  const config = pluginBlock || jsonConfig;

  const handleCopy = () => {
    navigator.clipboard.writeText(config).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!connector) return null;

  const Icon = connector.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#f3f1ec]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${connector.color}10`, borderColor: `${connector.color}20` }}>
              <Icon size={20} style={{ color: connector.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a0a0a] font-['Space_Grotesk']">{connector.setupTitle || `Connect ${connector.name}`}</h2>
              <p className="text-xs text-[#a3a3a3] font-['Space_Grotesk']">One-time setup — paste config into your tool</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-4">
          <div className="space-y-3 mb-5">
            {(connector.setupSteps || []).map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#117dff]/10 text-[#117dff] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-sm text-[#525252] font-['Space_Grotesk'] leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* Config path hint */}
          {connector.configPath && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[#faf9f4] border border-[#e3e0db]">
              <FileText size={12} className="text-[#a3a3a3] shrink-0" />
              <span className="text-[10px] font-mono text-[#737373] truncate">{connector.configPath}</span>
            </div>
          )}

          {/* Config / commands block */}
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] transition-all ${
                  copied
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-white/90 text-[#525252] border border-[#e3e0db] hover:bg-[#f3f1ec]'
                }`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : isPluginInstall ? 'Copy Commands' : 'Copy Config'}
              </button>
            </div>
            <pre className="bg-[#0a0a0a] text-[#e2e8f0] text-xs font-mono rounded-xl p-4 pr-28 overflow-x-auto leading-relaxed whitespace-pre">
              {config}
            </pre>
          </div>

          {/* Plugin install — friendly note on what happens */}
          {isPluginInstall && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 font-['Space_Grotesk'] leading-relaxed">
                <strong>One-click install.</strong> The plugin bundles the MCP config + a /hivemind:connect command that opens your browser for OAuth (Zitadel SSO or Google). No manual JSON editing, no API key copy-paste.
              </p>
            </div>
          )}

          {/* API Key warning — only for manual JSON paths */}
          {!isPluginInstall && apiKey === 'YOUR_API_KEY' && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-['Space_Grotesk']">
                Create an API key first in <a href="/hivemind/app/keys" className="underline font-semibold">API Keys</a>, then replace YOUR_API_KEY in the config.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1] transition-all"
          >
            Done
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#117dff] text-white hover:bg-[#0066e0] transition-all flex items-center justify-center gap-2"
          >
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy & Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Connectors() {
  const { org, user } = useAuth();
  const [activeCategory, setActiveCategory] = useState(null);
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [gmailSettingsOpen, setGmailSettingsOpen] = useState(false);
  const [gmailEmail, setGmailEmail] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [toastMessage, setToastMessage] = useState(null);
  const [targetScopes, setTargetScopes] = useState({});
  const [mcpSetupConnector, setMcpSetupConnector] = useState(null);

  // Fetch API keys for MCP config auto-fill
  const { data: apiKeysData } = useApiQuery(() => apiClient.listApiKeys().catch(() => null), []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  const {
    data: descriptors,
  } = useApiQuery(() => apiClient.getDescriptors(), []);

  const {
    data: connectorStatus,
    loading: statusLoading,
    refetch: refetchStatus,
  } = useApiQuery(() => apiClient.getConnectorStatus(), []);

  const {
    data: jobs,
    refetch: refetchJobs,
  } = useApiQuery(() => apiClient.listConnectorJobs(), []);

  // Fetch live OAuth connector statuses from control plane
  const {
    data: oauthConnectors,
    refetch: refetchOAuth,
  } = useApiQuery(() => apiClient.listOAuthConnectors().catch(() => null), []);

  // Check for OAuth callback params
  useEffect(() => {
    const success = searchParams.get('connector_success');
    const error = searchParams.get('connector_error');
    const connected = searchParams.get('connected');
    const needsConfig = searchParams.get('needs_config');
    const email = searchParams.get('email');

    if (connected === 'gmail' && needsConfig === 'true') {
      // Gmail connected — open settings modal before syncing
      setGmailEmail(email || null);
      setGmailSettingsOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('connected');
      nextParams.delete('needs_config');
      nextParams.delete('email');
      setSearchParams(nextParams, { replace: true });
      refetchOAuth();
    } else if (success) {
      setToastMessage({ type: 'success', text: `${success} connected successfully!` });
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('connector_success');
      setSearchParams(nextParams, { replace: true });
      refetchOAuth();
    } else if (error) {
      setToastMessage({ type: 'error', text: `Connection failed: ${error}` });
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('connector_error');
      setSearchParams(nextParams, { replace: true });
    }
  }, [refetchOAuth, searchParams, setSearchParams]);

  // Poll for status after connect
  useEffect(() => {
    if (searchParams.get('connector_success')) return;
    const interval = setInterval(() => {
      refetchOAuth();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchOAuth, searchParams]);

  useEffect(() => {
    if (!oauthConnectors?.connectors) return;
    setTargetScopes((prev) => {
      const next = { ...prev };
      for (const connector of oauthConnectors.connectors) {
        if (!(connector.provider in next)) {
          next[connector.provider] = connector.target_scope || 'personal';
        }
      }
      return next;
    });
  }, [oauthConnectors]);

  const handleOAuthConnect = useCallback(async (provider) => {
    setConnectingProvider(provider);
    try {
      const targetScope = targetScopes[provider] || 'personal';
      // Use direct Gmail API for Gmail, control plane for others
      if (provider === 'gmail') {
        const data = await apiClient.gmailConnect(targetScope);
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No auth URL returned');
        }
        return;
      }

      const { auth_url } = await apiClient.startConnectorOAuth(
        provider,
        window.location.pathname,
        targetScope,
      );
      if (auth_url) {
        window.location.href = auth_url;
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
      setConnectingProvider(null);
    }
  }, [targetScopes]);

  const handleDisconnect = useCallback(async (provider) => {
    try {
      if (provider === 'gmail') {
        await apiClient.gmailDisconnect();
      } else {
        await apiClient.disconnectConnector(provider);
      }
      setToastMessage({ type: 'success', text: `${provider} disconnected` });
      refetchOAuth();
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  }, [refetchOAuth]);

  const handleResync = useCallback(async (provider) => {
    try {
      if (provider === 'gmail') {
        setGmailSettingsOpen(true);
        return;
      }
      await apiClient.resyncConnector(provider, { targetScope: targetScopes[provider] || 'personal' });
      setToastMessage({ type: 'success', text: `${provider} sync started` });
      refetchOAuth();
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  }, [refetchOAuth, targetScopes]);

  const handleGmailSync = useCallback(async (settings) => {
    try {
      await apiClient.gmailSync({ ...settings, target_scope: targetScopes.gmail || 'personal' });
      setToastMessage({ type: 'success', text: 'Gmail sync started! Check status for progress.' });
      setGmailSettingsOpen(false);
      refetchOAuth();
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  }, [refetchOAuth, targetScopes.gmail]);

  const npxCommand = 'npx -y @amar_528/mcp-bridge hosted';
  const endpoints = connectorStatus?.statuses || [];
  const jobList = Array.isArray(jobs) ? jobs : jobs?.jobs || [];
  const oauthList = oauthConnectors?.connectors || [];

  // Merge static CONNECTORS with live OAuth status
  const mergedConnectors = CONNECTORS.map((c) => {
    if (c.oauthProvider) {
      const live = oauthList.find((o) => o.provider === c.oauthProvider);
      if (live) {
        const derivedStatus = live.status === 'connected'
          ? 'connected'
          : live.status === 'syncing'
            ? 'syncing'
            : live.status === 'error'
              ? 'error'
              : live.status === 'reauth_required'
                ? 'needs_reauth'
                : live.status === 'degraded'
                  ? 'error'
                  : live.status === 'not_configured'
                    ? 'coming_soon'
                    : c.status;
        return {
          ...c,
          status: derivedStatus,
          target_scope: live.target_scope || 'personal',
          accountRef: live.account_ref,
          lastSyncAt: live.last_sync_at,
          lastError: live.last_error,
          description: live.configured === false && live.disabled_reason
            ? `${c.description} (${live.disabled_reason})`
            : c.description,
        };
      }
    } else if (c.mcpEndpointName) {
      // MCP Client connectors (Claude, VS Code, Antigravity)
      // These are client-side configs - show as connected if user has the config
      // Check both endpoints list and oauth connectors for hivemind connection
      const live = endpoints.find((ep) => ep.name === c.mcpEndpointName);
      const isMcpClientConnected = oauthList.some((o) =>
        o.provider === 'hivemind' && o.status === 'connected'
      );

      if (live) {
        return {
          ...c,
          status: live.healthy ? 'connected' : 'needs_attention',
          accountRef: live.url || 'Local MCP bridge',
          lastSyncAt: live.updated_at,
          lastError: live.error,
        };
      } else if (isMcpClientConnected) {
        // User has hivemind MCP connected via any client
        return {
          ...c,
          status: 'connected',
          accountRef: 'MCP Client configured',
          description: `${c.description} — HIVE MCP connected`,
        };
      }
    }
    return c;
  });

  const filteredConnectors = activeCategory
    ? mergedConnectors.filter((c) => c.category === activeCategory)
    : mergedConnectors;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-sm font-['Space_Grotesk'] shadow-lg ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-[#16a34a]'
                : 'bg-red-500/10 border-red-500/20 text-[#dc2626]'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {toastMessage.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Key prompt — shown only if user has no key yet */}
      <ApiKeyPrompt feature="connecting external clients" />

      {/* Quick Install Banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#117dff]/[0.06] to-transparent border border-[#117dff]/15 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
            <Terminal size={16} className="text-[#117dff]" />
          </div>
          <div>
            <h2 className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk']">
              Quick Install
            </h2>
            <p className="text-[#a3a3a3] text-[11px] font-['Space_Grotesk']">
              Start the MCP bridge in one command
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <code className="bg-[#faf9f4] border border-[#e3e0db] rounded-lg px-3.5 py-2 text-[12px] text-[#117dff] font-mono select-all">
            {npxCommand}
          </code>
          <CopyButton text={npxCommand} label="Copy" />
        </div>
      </motion.div>

      {/* Stats */}
      <StatsRow connectors={mergedConnectors} endpoints={endpoints} />

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium font-['Space_Grotesk'] transition-all whitespace-nowrap ${
            !activeCategory
              ? 'bg-[#f3f1ec] text-[#0a0a0a] border border-[#d4d0ca]'
              : 'text-[#525252] hover:text-[#525252] border border-transparent'
          }`}
        >
          All Connectors
        </button>
        {CONNECTOR_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium font-['Space_Grotesk'] transition-all whitespace-nowrap ${
              activeCategory === cat.key
                ? 'bg-[#f3f1ec] text-[#0a0a0a] border border-[#d4d0ca]'
                : 'text-[#525252] hover:text-[#525252] border border-transparent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Connector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredConnectors.map((connector) => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            config={descriptors?.[connector.configKey]}
            targetScope={targetScopes[connector.oauthProvider] || connector.target_scope || 'personal'}
            onTargetScopeChange={(scope) => connector.oauthProvider && setTargetScopes((prev) => ({ ...prev, [connector.oauthProvider]: scope }))}
            allowTeamScope={org?.plan === 'enterprise'}
            onConnect={() => {
              // One-click OAuth path for any MCP-client tile flagged with
              // isPluginInstall (Claude Code → claude mcp add CLI) or
              // isOauthConnect (Claude Desktop / Cursor / VS Code / Antigravity
              // → pre-filled JSON config). Both go through /auth/cli; the
              // callback page renders platform-specific output.
              const controlPlane =
                process.env.REACT_APP_CONTROL_PLANE_URL ||
                'https://api.hivemind.davinciai.eu:8040';
              if (connector.isPluginInstall && connector.id === 'claude-code') {
                const callback = `${window.location.origin}/hivemind/app/connect/claude-code/callback`;
                window.location.href = `${controlPlane}/auth/cli?callback=${encodeURIComponent(callback)}&client=claude_code_web`;
                return;
              }
              if (connector.isOauthConnect) {
                const callback = `${window.location.origin}/hivemind/app/connect/mcp/callback`;
                const clientId = connector.oauthClientId || connector.id;
                window.location.href = `${controlPlane}/auth/cli?callback=${encodeURIComponent(callback)}&client=${encodeURIComponent(clientId)}`;
                return;
              }
              if (connector.isMcpClient) {
                setMcpSetupConnector(connector);
              } else if (connector.oauthProvider) {
                handleOAuthConnect(connector.oauthProvider);
              }
            }}
            onDisconnect={() => {
              if (connector.oauthProvider) {
                handleDisconnect(connector.oauthProvider);
              }
            }}
            onResync={() => {
              if (connector.oauthProvider) {
                handleResync(connector.oauthProvider);
              }
            }}
            connecting={connectingProvider === connector.oauthProvider || connectingProvider === connector.id}
          />
        ))}
      </div>

      {/* MCP Endpoints */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#525252] text-[11px] font-mono uppercase tracking-wider">
            Live MCP Endpoints
          </h2>
          <button
            onClick={refetchStatus}
            className="flex items-center gap-1.5 text-[#a3a3a3] hover:text-[#117dff] text-[11px] font-['Space_Grotesk'] transition-colors"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
        <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <EndpointTable endpoints={endpoints} loading={statusLoading} onRefresh={refetchStatus} />
        </div>
      </div>

      {/* Recent Jobs */}
      {jobList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#525252] text-[11px] font-mono uppercase tracking-wider">
              Recent Jobs
            </h2>
            <button
              onClick={refetchJobs}
              className="flex items-center gap-1.5 text-[#a3a3a3] hover:text-[#117dff] text-[11px] font-['Space_Grotesk'] transition-colors"
            >
              <RefreshCw size={11} />
              Refresh
            </button>
          </div>
          <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e3e0db]">
                  {['Job ID', 'Status', 'Endpoint', 'Time'].map((h) => (
                    <th key={h} className="text-left text-[#d4d0ca] text-[10px] font-mono uppercase tracking-wider px-4 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobList.slice(0, 10).map((job, i) => (
                  <tr key={job.id || i} className="border-b border-[#eae7e1] hover:bg-[#faf9f4] transition-colors">
                    <td className="px-4 py-2.5 text-[#525252] font-mono text-[11px]">
                      {(job.id || '').slice(0, 12)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${
                          {
                            pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                            running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                            completed: 'bg-emerald-500/10 text-[#16a34a] border-emerald-500/20',
                            failed: 'bg-red-500/10 text-[#dc2626] border-red-500/20',
                          }[job.status] || 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#525252] font-mono text-[11px] truncate max-w-[200px]">
                      {job.endpoint || job.url || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-[#d4d0ca] font-mono text-[10px]">
                      {job.timestamp || job.created_at
                        ? new Date(job.timestamp || job.created_at).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gmail Sync Settings Modal */}
      <AnimatePresence>
        {gmailSettingsOpen && (
          <GmailSyncSettings
            email={gmailEmail}
            onSync={handleGmailSync}
            onClose={() => setGmailSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* MCP Setup Modal */}
      <AnimatePresence>
        {mcpSetupConnector && (
          <McpSetupModal
            connector={mcpSetupConnector}
            onClose={() => setMcpSetupConnector(null)}
            user={user}
            apiKeys={apiKeysData?.keys || []}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
