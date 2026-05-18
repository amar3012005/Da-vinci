import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CONNECTOR_BY_ID, CONNECTOR_MODES } from '../shared/connectors-catalog';
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
  ExternalLink,
  X,
  Filter,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useCopyToClipboard } from '../shared/hooks';
import ApiKeyPrompt from '../shared/ApiKeyPrompt';
import { useAuth } from '../auth/AuthProvider';
import { useTeamContext } from '../shared/team-context';
import WhatsAppQRModal from './WhatsAppQRModal';

// ─── Connector Provider Definitions (Supermemory-style) ────────────────────

const CONNECTOR_CATEGORIES = [
  {
    key: 'google_workspace',
    label: 'Google Workspace',
    description: 'Gmail, Drive, Calendar, Docs, Sheets, Contacts, Tasks',
  },
  {
    key: 'mcp_clients',
    label: 'MCP Clients',
    description: 'AI assistants connected via MCP protocol',
  },
  {
    key: 'workspace',
    label: 'Workspace Apps',
    description: 'Slack, Notion, Confluence, Linear',
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
    description: 'Add HIVEMIND with the direct one-line HTTP MCP setup and keep it enabled by default',
    icon: Terminal,
    category: 'mcp_clients',
    status: 'available',
    color: '#117dff',
    configKey: 'claude-code',
    mcpEndpointName: 'claude-code',
    isMcpClient: true,
    setupTitle: 'Set up Claude Code MCP',
    setupSteps: [
      'Copy the direct HTTP MCP setup below into Claude Code',
      'Enable HIVEMIND as a default MCP server for your sessions',
      'Run the verify step here after saving the config to confirm the direct endpoint is reachable',
    ],
    configPath: 'Claude Code MCP setup',
  },
  {
    id: 'claude',
    name: 'Claude Desktop',
    description: 'Run one terminal setup command, restart Claude Desktop, then paste the HIVEMIND AI prompt',
    icon: Terminal,
    category: 'mcp_clients',
    status: 'available',
    color: '#117dff',
    configKey: 'claude',
    mcpEndpointName: 'claude',
    isMcpClient: true,
    setupTitle: 'Set up Claude Desktop MCP',
    setupSteps: [
      'Open Terminal with the shortcut shown for your OS',
      'Run one setup command to install Claude if needed and add HIVEMIND MCP',
      'Quit and reopen Claude Desktop before you continue to the AI prompt step',
    ],
    configPath: 'Claude Desktop terminal setup',
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
    description: 'Jira issues + Confluence pages via Nango OAuth bridge',
    icon: BookOpen,
    category: 'knowledge',
    status: 'available',
    color: '#0052cc',
    priority: 1,
    oauthProvider: 'atlassian',
    nangoProvider: 'jira',
    setupHint: 'OAuth credentials managed by Nango. Configure in Nango admin UI.',
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
  // ── Google Workspace family ──
  // Master tile + per-service tiles. All share oauthProvider='gmail'.
  // Each granted scope creates its own platform_integration row so
  // services can be disconnected independently.
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Connect Gmail + Drive + Calendar + Docs + Sheets + more in one click',
    icon: Mail,
    category: 'google_workspace',
    status: 'available',
    color: '#4285F4',
    priority: 0,
    oauthProvider: 'gmail',
    googleService: 'all',
    isMaster: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Email threads as searchable event memories',
    icon: Mail,
    category: 'google_workspace',
    status: 'available',
    color: '#ef4444',
    priority: 1,
    oauthProvider: 'gmail',
    googleService: 'gmail',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Index Docs, Sheets, Slides — live search for files',
    icon: HardDrive,
    category: 'google_workspace',
    status: 'available',
    color: '#f59e0b',
    priority: 1,
    oauthProvider: 'gmail',
    googleService: 'drive,docs,sheets,slides',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Past events as memory, future events live on demand',
    icon: Calendar,
    category: 'google_workspace',
    status: 'available',
    color: '#3b82f6',
    priority: 1,
    oauthProvider: 'gmail',
    googleService: 'calendar',
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    description: 'Doc bodies chunked + ingested like KB uploads',
    icon: FileText,
    category: 'google_workspace',
    status: 'available',
    color: '#0891b2',
    priority: 1,
    oauthProvider: 'gmail',
    googleService: 'docs',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Live cell + range read on demand',
    icon: HardDrive,
    category: 'google_workspace',
    status: 'available',
    color: '#16a34a',
    priority: 2,
    oauthProvider: 'gmail',
    googleService: 'sheets',
  },
  {
    id: 'google-slides',
    name: 'Google Slides',
    description: 'Presentation text + structure',
    icon: FileText,
    category: 'google_workspace',
    status: 'available',
    color: '#d97706',
    priority: 2,
    oauthProvider: 'gmail',
    googleService: 'slides',
  },
  {
    id: 'google-contacts',
    name: 'Google Contacts',
    description: 'Structured contact directory — no memory pollution',
    icon: Mail,
    category: 'google_workspace',
    status: 'available',
    color: '#9333ea',
    priority: 2,
    oauthProvider: 'gmail',
    googleService: 'contacts',
  },
  {
    id: 'google-tasks',
    name: 'Google Tasks',
    description: 'Live task lookup — fetched when AI needs them',
    icon: Calendar,
    category: 'google_workspace',
    status: 'available',
    color: '#10b981',
    priority: 2,
    oauthProvider: 'gmail',
    googleService: 'tasks',
  },
  {
    id: 'google-chat',
    name: 'Google Chat',
    description: 'Spaces, messages — live query',
    icon: Mail,
    category: 'google_workspace',
    status: 'available',
    color: '#0d9488',
    priority: 3,
    oauthProvider: 'gmail',
    googleService: 'chat',
  },
  {
    id: 'google-forms',
    name: 'Google Forms',
    description: 'Form responses — live query',
    icon: FileText,
    category: 'google_workspace',
    status: 'available',
    color: '#7c3aed',
    priority: 3,
    oauthProvider: 'gmail',
    googleService: 'forms',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Channel messages, threads, files. Both batch sync + live query.',
    icon: MessageSquare,
    category: 'workspace',
    status: 'available',
    color: '#e11d48',
    priority: 2,
    nangoProvider: 'slack',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Pair a WhatsApp account with QR code for dedicated bot or personal testing use',
    icon: MessageSquare,
    category: 'workspace',
    status: 'available',
    color: '#25d366',
    priority: 2,
    isQrSetup: true,
    qrProvider: 'whatsapp',
    setupTitle: 'Pair WhatsApp with QR Code',
    setupSteps: [
      'Click "Connect WhatsApp"',
      'Use a dedicated bot number for production, or your own account for testing',
      'Open WhatsApp → Linked Devices → Link a device',
      'Scan the QR code and confirm pairing on your phone',
      'HIVEMIND can then reply on WhatsApp as that paired account',
    ],
    estimatedTime: '30 seconds',
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
    nangoProvider: 'notion',
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Import team documentation and spaces',
    icon: Layers,
    category: 'knowledge',
    status: 'available',
    color: '#3b82f6',
    priority: 6,
    oauthProvider: 'confluence',
    nangoProvider: 'confluence',
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
    nangoProvider: 'github',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Sync issues, projects, and roadmaps',
    icon: FileText,
    category: 'code',
    status: 'available',
    color: '#5e6ad2',
    priority: 4,
    nangoProvider: 'linear',
  },
];

const DIRECT_MCP_ENDPOINT = 'https://core.hivemind.davinciai.eu:8050/api/mcp';

const CLAUDE_TERMINAL_OS = {
  macos: {
    label: 'macOS',
    shortcut: 'Cmd + Space',
    followup: 'Type Terminal, then press Enter.',
  },
  windows: {
    label: 'Windows',
    shortcut: 'Win + R',
    followup: 'Type powershell, then press Enter.',
  },
  linux: {
    label: 'Linux',
    shortcut: 'Ctrl + Alt + T',
    followup: 'If that does not work, open Terminal from your app menu.',
  },
};

function detectTerminalOs() {
  if (typeof navigator === 'undefined') return 'macos';
  const value = `${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
  if (value.includes('win')) return 'windows';
  if (value.includes('linux') || value.includes('x11')) return 'linux';
  return 'macos';
}

function isLegacyMcpEndpointUrl(url) {
  return typeof url === 'string' && (url.includes('/api/mcp/servers/') || url.includes('/api/mcp/rpc'));
}

function isDirectMcpEndpointUrl(url) {
  return typeof url === 'string' && (url === DIRECT_MCP_ENDPOINT || url.startsWith(`${DIRECT_MCP_ENDPOINT}?`));
}

function getEndpointUpdatedAt(endpoint) {
  const value = endpoint?.updated_at || endpoint?.last_seen_at || endpoint?.created_at || 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function pickPreferredMcpEndpoint(endpointList, preferredName) {
  if (!Array.isArray(endpointList) || endpointList.length === 0) return null;

  const score = (endpoint) => {
    let total = 0;
    if (endpoint?.name === preferredName) total += 40;
    if (isDirectMcpEndpointUrl(endpoint?.url)) total += 30;
    if (endpoint?.healthy) total += 20;
    if (isLegacyMcpEndpointUrl(endpoint?.url)) total -= 10;
    return total;
  };

  return [...endpointList].sort((left, right) => {
    const scoreDelta = score(right) - score(left);
    if (scoreDelta !== 0) return scoreDelta;
    return getEndpointUpdatedAt(right) - getEndpointUpdatedAt(left);
  })[0] || null;
}

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

function ConnectorCard({ connector, config, onConnect, onDisconnect, onResync, onChangeScope, connecting, targetScope, selectedTeamId, onTargetScopeChange, onTeamChange, allowTeamScope, teams }) {
  const [expanded, setExpanded] = useState(false);
  const [changeScopeOpen, setChangeScopeOpen] = useState(false);
  const [pendingScope, setPendingScope] = useState(targetScope);
  const [pendingTeamId, setPendingTeamId] = useState(selectedTeamId || null);
  const [scopeSaving, setScopeSaving] = useState(false);
  const Icon = connector.icon;
  const isActive = connector.status === 'connected' || connector.status === 'syncing';
  const isComingSoon = connector.status === 'coming_soon';
  const hasConfig = config && connector.configKey;
  const isSetupOnly = connector.setupOnly === true;
  const canShowConfig = hasConfig && (isActive || isSetupOnly);
  const configStr = hasConfig ? JSON.stringify(config, null, 2) : null;

  const handleScopeChange = async () => {
    setScopeSaving(true);
    try {
      await onChangeScope(pendingScope, pendingTeamId);
      setChangeScopeOpen(false);
    } finally {
      setScopeSaving(false);
    }
  };

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
              {/* Mode chips (ingestion / live) sourced from canonical
                  connectors-catalog. Resolution: oauthProvider first, then id.
                  Alias map handles legacy provider naming (outlook→microsoft365). */}
              {(() => {
                const PROVIDER_ALIAS = {
                  outlook: 'microsoft365',
                  ms365: 'microsoft365',
                  msoffice: 'microsoft365',
                  jira: 'atlassian',
                  confluence: 'atlassian',
                  drive: 'google-drive',
                  docs: 'google-docs',
                  sheets: 'google-sheets',
                  slides: 'google-slides',
                  contacts: 'google-contacts',
                  tasks: 'google-tasks',
                  chat: 'google-chat',
                  calendar: 'google-calendar',
                };
                const rawId = connector.oauthProvider || connector.id;
                const catalogId = PROVIDER_ALIAS[rawId] || rawId;
                const cat = CONNECTOR_BY_ID[catalogId];
                if (!cat || !Array.isArray(cat.mode)) return null;
                return (
                  <div className="flex items-center gap-1 mt-1">
                    {cat.mode.map(m => (
                      <span
                        key={m}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          m === 'ingestion'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-violet-50 text-violet-700 border border-violet-200'
                        }`}
                        title={CONNECTOR_MODES[m]?.description || m}
                      >
                        {CONNECTOR_MODES[m]?.label || m}
                      </span>
                    ))}
                  </div>
                );
              })()}
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
          <div className="mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3]">Sync to</span>
              {[
                { key: 'personal', label: 'My Space', disabled: false },
                { key: 'team', label: 'Team', disabled: !allowTeamScope || !teams?.length },
                { key: 'organization', label: 'Org-wide', disabled: !allowTeamScope },
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
              {/* Show current scope badge for connected connectors + change link */}
              {isActive && (
                <button
                  type="button"
                  onClick={() => { setPendingScope(targetScope); setPendingTeamId(selectedTeamId || null); setChangeScopeOpen(true); }}
                  className="ml-auto text-[10px] font-mono text-[#117dff] hover:underline"
                >
                  Change scope
                </button>
              )}
            </div>
            {/* Team picker shown when scope=team and not yet connected */}
            {targetScope === 'team' && !isActive && teams && teams.length > 0 && (
              <div className="mt-2">
                <select
                  value={selectedTeamId || ''}
                  onChange={e => onTeamChange?.(e.target.value || null)}
                  className="w-full text-[11px] font-mono border border-[#e3e0db] rounded-lg px-2.5 py-1.5 bg-[#faf9f4] text-[#525252] focus:outline-none focus:border-[#117dff]"
                >
                  <option value="">Select team...</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Change Scope Modal */}
        {changeScopeOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setChangeScopeOpen(false)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-[#0a0a0a] text-sm font-bold font-['Space_Grotesk'] mb-4">Change sync scope</h3>
              <div className="space-y-2 mb-4">
                {[
                  { key: 'personal', label: 'My Space', desc: 'Only you can access these memories' },
                  { key: 'team', label: 'Team', desc: 'All members of the selected team', disabled: !allowTeamScope || !teams?.length },
                  { key: 'organization', label: 'Org-wide', desc: 'Every org member can recall these memories', disabled: !allowTeamScope },
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && setPendingScope(opt.key)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-[12px] font-['Space_Grotesk'] transition-all ${
                      pendingScope === opt.key
                        ? 'border-[#117dff]/40 bg-[#117dff]/8 text-[#117dff]'
                        : 'border-[#e3e0db] text-[#525252]'
                    } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#117dff]/20'}`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {pendingScope === 'team' && teams && teams.length > 0 && (
                <div className="mb-4">
                  <select
                    value={pendingTeamId || ''}
                    onChange={e => setPendingTeamId(e.target.value || null)}
                    className="w-full text-[11px] font-mono border border-[#e3e0db] rounded-lg px-2.5 py-1.5 bg-[#faf9f4] text-[#525252] focus:outline-none focus:border-[#117dff]"
                  >
                    <option value="">Select team...</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setChangeScopeOpen(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScopeChange}
                  disabled={scopeSaving || (pendingScope === 'team' && !pendingTeamId)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#117dff] text-white hover:bg-[#0066e0] disabled:opacity-50 transition-all"
                >
                  {scopeSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
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

          {connector.status === 'needs_reauth' && connector.oauthProvider && (
            <>
              <button
                onClick={onConnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
              >
                <RefreshCw size={12} />
                Reconnect
              </button>
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium font-['Space_Grotesk'] text-[#dc2626]/60 hover:text-[#dc2626] hover:bg-red-50 transition-all"
              >
                Disconnect
              </button>
            </>
          )}

          {connector.status === 'error' && connector.oauthProvider && (
            <>
              <button
                onClick={onResync}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] bg-red-500/10 text-[#dc2626] border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                <RefreshCw size={12} />
                Retry
              </button>
              <button
                onClick={onConnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium font-['Space_Grotesk'] bg-[#f3f1ec] border border-[#e3e0db] text-[#525252] hover:bg-[#eae7e1] transition-all"
              >
                <RefreshCw size={12} />
                Reconnect
              </button>
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium font-['Space_Grotesk'] text-[#dc2626]/60 hover:text-[#dc2626] hover:bg-red-50 transition-all"
              >
                Disconnect
              </button>
            </>
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
  const [excludeCategories, setExcludeCategories] = useState(['promotions', 'social', 'updates', 'forums']);
  const [maxEmails, setMaxEmails] = useState(50);
  const [syncing, setSyncing] = useState(false);
  // Preview/approval flow state
  const [step, setStep] = useState('config'); // config | preview | flushing
  const [previews, setPreviews] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewing, setPreviewing] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [flushed, setFlushed] = useState(null);

  const toggleFolder = (f) => setFolders(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const toggleExclude = (c) => setExcludeCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const toggleSelected = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  // Pure auto-sync (legacy) — bypass preview, push everything matching filters
  const handleStart = async () => {
    setSyncing(true);
    try {
      await onSync({ date_range: dateRange, folders, exclude_categories: excludeCategories, max_emails: maxEmails });
    } finally {
      setSyncing(false);
    }
  };

  // Preview-then-approve flow — fetches list, user picks, ingest only selected
  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const data = await apiClient.gmailPreview({
        date_range: dateRange,
        folders,
        exclude_categories: excludeCategories,
        max_emails: maxEmails,
      });
      setPreviews(data.previews || []);
      // Default: all selected so user can quick-approve
      setSelectedIds(new Set((data.previews || []).map(p => p.thread_id)));
      setStep('preview');
    } catch (e) {
      console.error('[gmail-preview] failed:', e);
      alert(e?.response?.data?.error || e.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleIngestSelected = async () => {
    if (selectedIds.size === 0) return;
    setIngesting(true);
    try {
      const res = await apiClient.gmailIngestSelected([...selectedIds], 'thread');
      alert(`Ingested ${res.ingested} thread${res.ingested === 1 ? '' : 's'}. ${res.failed > 0 ? `${res.failed} failed.` : ''}`);
      onClose();
    } catch (e) {
      console.error('[gmail-ingest-selected] failed:', e);
      alert(e?.response?.data?.error || e.message || 'Ingest failed');
    } finally {
      setIngesting(false);
    }
  };

  const handleFlush = async () => {
    if (!window.confirm('Soft-delete ALL Gmail memories for this account? Recoverable via DB for ~30 days.')) return;
    setStep('flushing');
    try {
      const res = await apiClient.gmailFlush();
      setFlushed(res.deleted || 0);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Flush failed');
      setStep('config');
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

        {/* Preview list (shown after Preview pressed) */}
        {step === 'preview' && (
          <div className="mb-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4] overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between border-b border-[#e3e0db]">
              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#525252]">
                Approve threads ({selectedIds.size} / {previews.length})
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedIds(new Set(previews.map(p => p.thread_id)))}
                  className="text-[10px] font-mono text-[#117dff] hover:underline"
                >
                  All
                </button>
                <span className="text-[10px] text-[#a3a3a3]">·</span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[10px] font-mono text-[#737373] hover:underline"
                >
                  None
                </button>
              </div>
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              {previews.map(p => {
                const sel = selectedIds.has(p.thread_id);
                return (
                  <button
                    key={p.thread_id}
                    onClick={() => toggleSelected(p.thread_id)}
                    className={`w-full text-left px-3 py-2 border-b border-[#f3f1ec] last:border-b-0 transition-colors ${
                      sel ? 'bg-[#117dff]/[0.04]' : 'hover:bg-[#f3f1ec]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        sel ? 'border-[#117dff] bg-[#117dff]' : 'border-[#c4c1bb]'
                      }`}>
                        {sel && <Check size={9} className="text-white" strokeWidth={3} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate">
                          {p.subject || '(no subject)'}
                        </p>
                        <p className="text-[10.5px] text-[#737373] font-mono truncate">
                          {p.from} {p.message_count > 1 ? `· ${p.message_count} msgs` : ''} · {p.date || ''}
                        </p>
                        {p.snippet && (
                          <p className="text-[10.5px] text-[#a3a3a3] line-clamp-1 mt-0.5">{p.snippet}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {previews.length === 0 && (
                <div className="px-3 py-6 text-center text-[11px] text-[#a3a3a3] font-mono">
                  No threads matched the filter.
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'flushing' && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[12px] font-semibold text-amber-800 font-['Space_Grotesk']">
              {flushed === null ? 'Flushing Gmail memories…' : `Soft-deleted ${flushed} Gmail memor${flushed === 1 ? 'y' : 'ies'}.`}
            </p>
            <p className="text-[10.5px] text-amber-700 mt-1">
              Next sync starts from a clean slate. Recovery window: ~30 days.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {step === 'config' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={previewing || folders.length === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-white border border-[#117dff] text-[#117dff] hover:bg-[#117dff]/5 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {previewing ? (
                  <div className="w-4 h-4 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Filter size={14} />
                    Preview & Approve
                  </>
                )}
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
                    Sync All
                  </>
                )}
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('config')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1] transition-all"
              >
                Back
              </button>
              <button
                onClick={handleIngestSelected}
                disabled={ingesting || selectedIds.size === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {ingesting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={14} />
                    Ingest {selectedIds.size}
                  </>
                )}
              </button>
            </>
          )}
          {step === 'flushing' && flushed !== null && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#0a0a0a] text-white hover:bg-[#262626] transition-all"
            >
              Done
            </button>
          )}
        </div>

        {/* Danger zone */}
        {step === 'config' && (
          <div className="mt-4 pt-3 border-t border-[#f3f1ec] flex items-center justify-between">
            <p className="text-[10.5px] text-[#a3a3a3] font-mono">
              Memory graph polluted? Start fresh.
            </p>
            <button
              onClick={handleFlush}
              className="text-[10.5px] font-mono text-[#dc2626] hover:text-[#b91c1c] hover:underline transition-colors"
            >
              Flush all Gmail memories
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Google Workspace Intro Modal (one-time, before master OAuth) ──────────

function GoogleWorkspaceIntroModal({ onProceed, onCancel }) {
  const services = [
    { key: 'gmail',    name: 'Gmail',    desc: 'Email threads → event memories', color: '#ef4444' },
    { key: 'drive',    name: 'Drive',    desc: 'Docs/Sheets/Slides as searchable KB', color: '#f59e0b' },
    { key: 'calendar', name: 'Calendar', desc: 'Past events as memory, future live', color: '#3b82f6' },
    { key: 'contacts', name: 'Contacts', desc: 'Structured directory, no pollution', color: '#9333ea' },
    { key: 'tasks',    name: 'Tasks',    desc: 'Live lookup on demand', color: '#10b981' },
    { key: 'docs',     name: 'Docs+',    desc: 'Sheets, Slides, Forms — auto-detected', color: '#0891b2' },
  ];
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#4285F4]/10 flex items-center justify-center">
            <Mail size={20} className="text-[#4285F4]" />
          </div>
          <div>
            <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">Connect Google Workspace</h3>
            <p className="text-[#525252] text-xs">One consent → all services. Disconnect any one anytime.</p>
          </div>
        </div>

        <div className="mb-5 p-3 rounded-xl bg-[#fef3c7] border border-[#fde68a]">
          <p className="text-[11px] font-mono text-[#92400e] leading-relaxed">
            <span className="font-bold">⓵ One-time consent.</span> Google shows a single approval screen listing all 10 services below.
            You can revoke any individual service later from this page without affecting the others.
          </p>
        </div>

        <div className="space-y-2 mb-5">
          {services.map(s => (
            <div key={s.key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#faf9f4] border border-[#eae7e1]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a] w-20">{s.name}</span>
              <span className="text-[11px] text-[#525252] flex-1">{s.desc}</span>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-[#a3a3a3] font-mono mb-5">
          After approval, we&apos;ll walk you through sync settings for each connected service.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1]"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#4285F4] text-white hover:bg-[#3367d6] flex items-center justify-center gap-2"
          >
            <Zap size={14} />
            Continue to Google
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Per-service Sync Config Schemas ──────────────────────────────────────────

const SERVICE_CONFIG_SCHEMAS = {
  google_drive: {
    title: 'Configure Drive Sync',
    icon: { component: HardDrive, color: '#f59e0b', bg: 'bg-amber-50' },
    fields: [
      {
        key: 'mime_types',
        label: 'File types',
        type: 'multi',
        options: [
          { value: 'document', label: 'Docs' },
          { value: 'spreadsheet', label: 'Sheets' },
          { value: 'presentation', label: 'Slides' },
          { value: 'pdf', label: 'PDFs' },
        ],
        default: ['document', 'spreadsheet', 'presentation'],
      },
      {
        key: 'date_range',
        label: 'Modified within',
        type: 'single',
        options: [
          { value: '7d', label: 'Last 7 days' },
          { value: '30d', label: 'Last 30 days' },
          { value: '90d', label: 'Last 90 days' },
          { value: '365d', label: 'Last year' },
          { value: 'all', label: 'All time' },
        ],
        default: '90d',
      },
      {
        key: 'max_files',
        label: 'Max files',
        type: 'slider',
        min: 50, max: 5000, step: 50, default: 500,
      },
    ],
  },
  google_calendar: {
    title: 'Configure Calendar Sync',
    icon: { component: Calendar, color: '#3b82f6', bg: 'bg-blue-50' },
    fields: [
      {
        key: 'date_range',
        label: 'Backfill window',
        type: 'single',
        options: [
          { value: '90d', label: 'Last 90 days' },
          { value: '365d', label: 'Last year' },
          { value: '730d', label: 'Last 2 years' },
        ],
        default: '365d',
      },
      {
        key: 'future_mode',
        label: 'Upcoming events',
        type: 'single',
        options: [
          { value: 'live', label: 'Live-query only (no pre-ingest)' },
          { value: 'sync_30', label: 'Pre-ingest next 30 days' },
          { value: 'sync_90', label: 'Pre-ingest next 90 days' },
        ],
        default: 'live',
      },
      {
        key: 'calendars',
        label: 'Calendars',
        type: 'multi',
        options: [
          { value: 'primary', label: 'Primary' },
          { value: 'shared', label: 'Shared with me' },
          { value: 'team', label: 'Team calendars' },
        ],
        default: ['primary'],
      },
    ],
  },
  google_contacts: {
    title: 'Configure Contacts Sync',
    icon: { component: Mail, color: '#9333ea', bg: 'bg-violet-50' },
    fields: [
      {
        key: 'groups',
        label: 'Contact groups',
        type: 'multi',
        options: [
          { value: 'mycontacts', label: 'My Contacts' },
          { value: 'starred', label: 'Starred' },
          { value: 'other', label: 'Other contacts' },
        ],
        default: ['mycontacts'],
      },
      {
        key: 'max_contacts',
        label: 'Max contacts',
        type: 'slider',
        min: 100, max: 5000, step: 100, default: 1000,
      },
    ],
  },
  google_tasks: {
    title: 'Configure Tasks',
    icon: { component: Calendar, color: '#10b981', bg: 'bg-emerald-50' },
    fields: [
      {
        key: 'mode',
        label: 'Sync mode',
        type: 'single',
        options: [
          { value: 'live', label: 'Live-query only' },
          { value: 'sync', label: 'Pre-ingest task lists' },
        ],
        default: 'live',
      },
    ],
  },
  google_docs: {
    title: 'Configure Docs Sync',
    icon: { component: HardDrive, color: '#0891b2', bg: 'bg-cyan-50' },
    fields: [
      {
        key: 'chunk_size',
        label: 'Chunk size',
        type: 'single',
        options: [
          { value: 'small', label: 'Small (400 chars)' },
          { value: 'medium', label: 'Medium (800 chars)' },
          { value: 'large', label: 'Large (1200 chars)' },
        ],
        default: 'medium',
      },
      {
        key: 'date_range',
        label: 'Modified within',
        type: 'single',
        options: [
          { value: '30d', label: 'Last 30 days' },
          { value: '90d', label: 'Last 90 days' },
          { value: '365d', label: 'Last year' },
          { value: 'all', label: 'All time' },
        ],
        default: '90d',
      },
    ],
  },
};

// ─── Generic Service Sync Config Modal ────────────────────────────────────────

function GoogleServiceSyncConfig({ provider, email, onSave, onSkip, onClose, stepLabel }) {
  const schema = SERVICE_CONFIG_SCHEMAS[provider];
  const initial = {};
  if (schema) {
    for (const f of schema.fields) initial[f.key] = f.default;
  }
  const [config, setConfig] = useState(initial);
  const [saving, setSaving] = useState(false);

  if (!schema) {
    // No schema → auto-save defaults and advance
    return null;
  }

  const Icon = schema.icon.component;

  const toggleMulti = (key, value) => {
    setConfig(c => {
      const cur = c[key] || [];
      return { ...c, [key]: cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${schema.icon.bg} flex items-center justify-center`}>
              <Icon size={18} style={{ color: schema.icon.color }} />
            </div>
            <div>
              <h3 className="text-[#0a0a0a] text-base font-bold font-['Space_Grotesk']">{schema.title}</h3>
              {email && <p className="text-[#a3a3a3] text-xs font-mono">{email}</p>}
            </div>
          </div>
          {stepLabel && (
            <span className="text-[10px] font-mono text-[#a3a3a3] bg-[#f3f1ec] px-2 py-1 rounded">
              {stepLabel}
            </span>
          )}
        </div>

        {schema.fields.map(field => (
          <div key={field.key} className="mb-4">
            <label className="text-[#525252] text-xs font-semibold font-['Space_Grotesk'] block mb-2">
              {field.label}
              {field.type === 'slider' && (
                <span className="text-[#117dff] ml-2">{config[field.key]}</span>
              )}
            </label>

            {(field.type === 'single' || field.type === 'multi') && (
              <div className="flex flex-wrap gap-2">
                {field.options.map(opt => {
                  const isActive = field.type === 'multi'
                    ? (config[field.key] || []).includes(opt.value)
                    : config[field.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => field.type === 'multi'
                        ? toggleMulti(field.key, opt.value)
                        : setConfig(c => ({ ...c, [field.key]: opt.value }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        isActive
                          ? field.type === 'multi'
                            ? 'bg-[#22c55e]/10 text-[#16a34a] border border-[#bbf7d0]'
                            : 'bg-[#117dff] text-white'
                          : 'bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1] border border-transparent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {field.type === 'slider' && (
              <>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={config[field.key]}
                  onChange={e => setConfig(c => ({ ...c, [field.key]: Number(e.target.value) }))}
                  className="w-full accent-[#117dff]"
                />
                <div className="flex justify-between text-[10px] text-[#a3a3a3] font-mono mt-1">
                  <span>{field.min}</span><span>{field.max}</span>
                </div>
              </>
            )}
          </div>
        ))}

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#f3f1ec] text-[#525252] hover:bg-[#eae7e1]"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-['Space_Grotesk'] bg-[#117dff] text-white hover:bg-[#0066e0] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap size={14} />
                Save &amp; Continue
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── MCP Setup Modal ─────────────────────────────────────────────────────────

function McpSetupModal({ connector, onClose, user, apiKeys, onVerified, existingEndpointStatus }) {
  const [copied, setCopied] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationState, setVerificationState] = useState(existingEndpointStatus || null);
  const [terminalOs, setTerminalOs] = useState(detectTerminalOs());
  const navigate = useNavigate();
  const userId = user?.id || user?.userId || 'YOUR_USER_ID';
  const apiKey = generatedKey || apiKeys?.[0]?.key || apiKeys?.[0]?.api_key || 'YOUR_API_KEY';
  const apiKeyReady = apiKey !== 'YOUR_API_KEY';
  const isClaudeDesktopSetup = connector?.id === 'claude';
  const isClaudeCodeSetup = connector?.id === 'claude-code';
  const isClaudeTerminalSetup = isClaudeDesktopSetup || isClaudeCodeSetup;

  useEffect(() => {
    let active = true;
    const ensureKey = async () => {
      if (generatedKey || apiKeys?.[0]?.key || apiKeys?.[0]?.api_key) return;
      if (!user?.id && !user?.userId) return;
      try {
        const created = await apiClient.createApiKey(`mcp-${connector?.id || 'client'}-${new Date().toISOString().slice(0, 10)}`, {
          description: `Generated from connector setup for ${connector?.name || 'MCP client'}`,
          scopes: ['memory:read', 'memory:write', 'mcp', 'coding', 'web_search', 'web_crawl'],
          rate_limit_per_minute: 120,
        });
        if (active) {
          setGeneratedKey(created.api_key || '');
        }
      } catch {
        if (active) {
          setGeneratedKey('');
        }
      }
    };
    ensureKey();
    return () => {
      active = false;
    };
  }, [apiKeys, connector?.id, connector?.name, generatedKey, user?.id, user?.userId]);

  // ── Mode tab: install / uninstall ──
  // Drives which command block + CTA the modal renders.
  const [modalMode, setModalMode] = useState('install');

  // Map connector.id → install script slug served from /install/<slug>.sh
  const INSTALLER_BASE_URL = 'https://hivemind.davinciai.eu/install';
  const installerSlugMap = {
    'cursor':         'cursor',
    'antigravity':    'antigravity',
    'vscode':         'vscode',
    'claude':         'claude-desktop',
    'claude-code':    'claude-code',
    'notebooklm':     'notebooklm',
  };
  const installerSlug = installerSlugMap[connector?.id] || 'remote-mcp';

  // One-liner install + uninstall commands (work on macOS/Linux/WSL).
  // FE installer flow: writes JSON config, restarts app, verifies MCP load.
  const oneLinerInstall = apiKeyReady
    ? `curl -fsSL "${INSTALLER_BASE_URL}/${installerSlug}.sh" | HIVEMIND_KEY="${apiKey}" bash`
    : 'Generating your HIVEMIND API key...';
  const oneLinerUninstall = `curl -fsSL "${INSTALLER_BASE_URL}/uninstall.sh" | bash -s ${installerSlug}`;

  // Always show the install one-liner (curl|bash) — never raw JSON.
  // Script writes config file, restarts app, runs verify_mcp_loaded.
  const config = modalMode === 'uninstall' ? oneLinerUninstall : oneLinerInstall;

  const promptVariant = ['cursor', 'vscode', 'claude-code'].includes(connector?.id) ? 'coding' : 'agent';

  const endpointName = `${connector?.mcpEndpointName || connector?.id || 'hivemind'}-${userId}`;

  useEffect(() => {
    setVerificationState(existingEndpointStatus || null);
  }, [existingEndpointStatus]);

  const goToPrompt = () => {
    navigate(`/hivemind/app/mcp?prompt=${promptVariant}&source=connectors&connector=${encodeURIComponent(connector?.id || 'mcp')}`);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(config).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleVerify = async () => {
    if (!connector || apiKey === 'YOUR_API_KEY') return;
    setVerifying(true);
    try {
      await apiClient.registerMcpEndpoint({
        name: endpointName,
        transport: 'streamable-http',
        url: DIRECT_MCP_ENDPOINT,
        bearer_token: apiKey,
        adapter_type: connector.id,
        default_tags: ['hivemind', connector.id],
      });
      const status = await apiClient.getConnectorStatus();
      const next = pickPreferredMcpEndpoint(
        (status?.statuses || []).filter((item) => item.name === endpointName || item.adapter_type === connector.id),
        endpointName,
      );
      setVerificationState(next);
      onVerified?.(next);
    } catch (error) {
      setVerificationState({
        healthy: false,
        error: error?.response?.data?.error || error.message || 'Verification failed',
        name: endpointName,
      });
    } finally {
      setVerifying(false);
    }
  };

  if (!connector) return null;

  const Icon = connector.icon;

  const statusPill = verificationState?.healthy ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
      <Check size={10} />
      Connected
    </span>
  ) : verificationState?.error ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-600">
      <AlertCircle size={10} />
      Needs attention
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#e3e0db] bg-[#faf9f4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#737373]">
      Not verified
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header — compact, single row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#f3f1ec] shrink-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
            style={{ backgroundColor: `${connector.color}10`, borderColor: `${connector.color}25` }}
          >
            <Icon size={18} style={{ color: connector.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-[#0a0a0a] font-['Space_Grotesk'] leading-tight truncate">
              {connector.setupTitle || `Connect ${connector.name}`}
            </h2>
            <p className="text-[11px] text-[#a3a3a3] font-['Space_Grotesk'] leading-snug truncate">
              {isClaudeTerminalSetup
                ? 'Run installer script · restart Claude · verify'
                : 'Paste config into your client · save · verify'}
            </p>
          </div>
          {statusPill}
          <button
            onClick={onClose}
            className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-[#737373] hover:bg-[#f3f1ec] transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Mode tabs — Install / Uninstall */}
        <div className="px-5 pt-3 flex items-center gap-1.5 shrink-0 border-b border-[#f3f1ec]">
          {[
            { id: 'install',   label: 'Install',   icon: '▶' },
            { id: 'uninstall', label: 'Disconnect', icon: '✕' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setModalMode(tab.id)}
              className={`px-3 py-1.5 rounded-t-lg text-[11px] font-semibold font-['Space_Grotesk'] transition-colors border-b-2 ${
                modalMode === tab.id
                  ? 'text-[#117dff] border-[#117dff]'
                  : 'text-[#737373] border-transparent hover:text-[#0a0a0a]'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body — two columns, no outer scroll */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.95fr)]">
          {/* LEFT — Step 1: config + verify */}
          <div className="p-5 flex flex-col gap-3 min-h-0 border-r border-[#f3f1ec]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
                  modalMode === 'uninstall' ? 'bg-red-500' : 'bg-[#0a0a0a]'
                }`}>1</span>
                <p className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">
                  {modalMode === 'uninstall' ? 'Run uninstall command' : 'Run install command in terminal'}
                </p>
              </div>
              {connector.configPath && (
                <span className="text-[10px] font-mono text-[#a3a3a3] truncate max-w-[200px]">
                  {connector.configPath}
                </span>
              )}
            </div>

            {/* OS selector (Claude only) — compact inline tabs */}
            {isClaudeTerminalSetup && (
              <div className="flex flex-wrap items-center gap-1.5">
                {Object.entries(CLAUDE_TERMINAL_OS).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setTerminalOs(key)}
                    className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold font-['Space_Grotesk'] transition-all ${
                      terminalOs === key
                        ? 'border-[#117dff]/40 bg-[#117dff]/8 text-[#117dff]'
                        : 'border-[#e3e0db] bg-white text-[#737373] hover:border-[#117dff]/30'
                    }`}
                  >
                    {value.label}
                  </button>
                ))}
                <span className="text-[10px] text-[#a3a3a3] font-['Space_Grotesk'] ml-1 truncate">
                  Open: <span className="text-[#117dff] font-semibold">{CLAUDE_TERMINAL_OS[terminalOs].shortcut}</span>
                </span>
              </div>
            )}

            {/* Code block — flex-1 with internal scroll only */}
            <div className="relative flex-1 min-h-0">
              <button
                onClick={handleCopy}
                disabled={isClaudeTerminalSetup && !apiKeyReady}
                className={`absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold font-['Space_Grotesk'] transition-all ${
                  copied
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/10 text-white border border-white/15 hover:bg-white/20'
                } disabled:opacity-50`}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <pre className="h-full max-h-[42vh] bg-[#0a0a0a] text-[#e2e8f0] text-[11.5px] font-mono rounded-lg p-3 pr-20 overflow-auto leading-relaxed whitespace-pre">
                {config}
              </pre>
            </div>

            {!apiKeyReady && (
              <div className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-200">
                <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 font-['Space_Grotesk'] leading-snug">
                  Generating API key… if it doesn't appear, create one in <a href="/hivemind/app/keys" className="underline font-semibold">API Keys</a>.
                </p>
              </div>
            )}

            {verificationState?.error && (
              <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-[11px] text-red-600 font-['Space_Grotesk'] border border-red-100">
                {verificationState.error}
              </p>
            )}

            <button
              onClick={handleVerify}
              disabled={verifying || !apiKeyReady}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#117dff]/25 bg-[#117dff]/10 px-3 py-2 text-[12px] font-semibold font-['Space_Grotesk'] text-[#117dff] hover:bg-[#117dff]/15 disabled:opacity-50 transition-colors"
            >
              {verifying ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
              {verificationState?.healthy ? 'Re-check Connection' : 'Verify Connection'}
            </button>
          </div>

          {/* RIGHT — Step 2 + setup steps */}
          <div className="p-5 flex flex-col gap-3 bg-[#fafaf7] min-h-0 overflow-y-auto">
            {modalMode === 'uninstall' ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                  <p className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Restart {connector.name}</p>
                </div>
                <p className="text-[11.5px] text-[#525252] font-['Space_Grotesk'] leading-relaxed">
                  After the one-liner finishes, quit + reopen {connector.name} so the MCP entry clears from memory. Reinstall any time using the Install tab.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-[#dbe8ff] bg-[#f7fbff] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#117dff] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                  <p className="text-[12px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Activate MCP prompt</p>
                </div>
                <p className="text-[11.5px] text-[#525252] font-['Space_Grotesk'] leading-relaxed mb-2.5">
                  After Step 1 verifies, load the HIVEMIND prompt variants ({promptVariant === 'coding' ? 'coding' : 'agent'}) into your client.
                </p>
                <button
                  onClick={goToPrompt}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#117dff] px-3 py-2 text-[12px] font-semibold font-['Space_Grotesk'] text-white hover:bg-[#0066e0] transition-colors"
                >
                  <ExternalLink size={12} />
                  Continue to Prompt
                </button>
              </div>
            )}

            {/* Inline setup steps (non-Claude) */}
            {!isClaudeTerminalSetup && (connector.setupSteps || []).length > 0 && (
              <div className="rounded-lg border border-[#e3e0db] bg-white p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#a3a3a3] font-['Space_Grotesk'] mb-1">In your client</p>
                {(connector.setupSteps || []).map((step, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#117dff]/10 text-[#117dff] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-[11.5px] text-[#525252] font-['Space_Grotesk'] leading-snug">{step}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Claude-specific tips */}
            {isClaudeDesktopSetup && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.08em] text-amber-700 mb-1 font-semibold">Restart Claude</p>
                <p className="text-[11.5px] text-amber-800 font-['Space_Grotesk'] leading-snug">Installer handles restart. If Claude stays on old session, quit + reopen once before Step 2.</p>
              </div>
            )}
            {isClaudeCodeSetup && (
              <div className="rounded-lg border border-[#e3e0db] bg-white p-3">
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#a3a3a3] mb-1 font-semibold">Confirm</p>
                <p className="text-[11.5px] text-[#525252] font-['Space_Grotesk'] leading-snug">
                  Run <code className="px-1 py-0.5 rounded bg-[#f3f1ec] text-[#0a0a0a] text-[10.5px]">claude mcp get hivemind</code> to confirm registration.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer — single done button */}
        <div className="px-5 py-3 border-t border-[#f3f1ec] flex items-center justify-between shrink-0 bg-white">
          <p className="text-[10.5px] text-[#a3a3a3] font-['Space_Grotesk']">
            Endpoint: <span className="font-mono text-[#525252]">{endpointName}</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[12px] font-semibold font-['Space_Grotesk'] bg-[#0a0a0a] text-white hover:bg-[#262626] transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Connectors() {
  const { org, user } = useAuth();
  const { teams } = useTeamContext();
  const [activeCategory, setActiveCategory] = useState(null);
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [gmailSettingsOpen, setGmailSettingsOpen] = useState(false);
  const [gmailEmail, setGmailEmail] = useState(null);
  // Google Workspace multi-service intro + wizard
  const [workspaceIntroOpen, setWorkspaceIntroOpen] = useState(false);
  const [pendingWorkspaceConnect, setPendingWorkspaceConnect] = useState(null); // { services, targetScope }
  const [workspaceWizardQueue, setWorkspaceWizardQueue] = useState([]); // services to walk through
  const [workspaceWizardIdx, setWorkspaceWizardIdx] = useState(0);
  const [workspaceWizardEmail, setWorkspaceWizardEmail] = useState(null);
  // Per-service standalone config modal (when user clicks Configure/Sync Now
  // on an individual Google service tile, OUTSIDE the post-OAuth wizard)
  const [standaloneConfigProvider, setStandaloneConfigProvider] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [toastMessage, setToastMessage] = useState(null);
  const [targetScopes, setTargetScopes] = useState({});
  // Per-provider selected team ID (only relevant when targetScope='team')
  const [selectedTeamIds, setSelectedTeamIds] = useState({});
  const [mcpSetupConnector, setMcpSetupConnector] = useState(null);
  const [whatsappQRConnector, setWhatsappQRConnector] = useState(false);
  const [verifiedMcpEndpoints, setVerifiedMcpEndpoints] = useState({});

  // Detect org admin: user is org admin if their role is 'owner' or 'admin'
  // The bootstrap / AuthProvider exposes org membership role via `org.role` or `user.orgRole`.
  const userOrgRole = org?.role || user?.orgRole || 'member';
  const isOrgAdmin = userOrgRole === 'owner' || userOrgRole === 'admin';
  // Allow scope selection if user is org admin OR a team lead (has teams)
  const allowTeamScope = isOrgAdmin || (Array.isArray(teams) && teams.length > 0);

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

  const endpoints = useMemo(() => connectorStatus?.statuses || [], [connectorStatus]);
  const jobList = useMemo(() => (Array.isArray(jobs) ? jobs : jobs?.jobs || []), [jobs]);
  const oauthList = useMemo(() => oauthConnectors?.connectors || [], [oauthConnectors]);

  // Check for OAuth callback params
  useEffect(() => {
    const success = searchParams.get('connector_success');
    const error = searchParams.get('connector_error');
    const connected = searchParams.get('connected');
    const needsConfig = searchParams.get('needs_config');
    const email = searchParams.get('email');

    if (connected === 'gmail' && needsConfig === 'true') {
      // Gmail connected — check if multiple Google services were granted.
      // If yes → start wizard chain. If just Gmail → open single Gmail settings.
      (async () => {
        try {
          const status = await apiClient.googleWorkspaceStatus();
          const connectedSvcs = (status.services || [])
            .filter(s => s.connected)
            .map(s => s.provider);
          setWorkspaceWizardEmail(email || status.google_account || null);

          // If multiple services granted (more than just gmail) → wizard chain
          if (connectedSvcs.length > 1) {
            // Order: gmail first (already has dedicated modal), then drive/calendar/etc
            const wizardOrder = [
              'gmail', 'google_drive', 'google_calendar', 'google_docs',
              'google_sheets', 'google_slides', 'google_contacts', 'google_tasks',
            ];
            const queue = wizardOrder.filter(s => connectedSvcs.includes(s));
            setWorkspaceWizardQueue(queue);
            setWorkspaceWizardIdx(0);
            // First step uses dedicated Gmail modal if gmail is first
            if (queue[0] === 'gmail') {
              setGmailEmail(email || null);
              setGmailSettingsOpen(true);
            }
          } else {
            // Single Gmail connection — use existing modal
            setGmailEmail(email || null);
            setGmailSettingsOpen(true);
          }
        } catch (_e) {
          // Fallback to Gmail-only flow
          setGmailEmail(email || null);
          setGmailSettingsOpen(true);
        }
      })();

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

  useEffect(() => {
    const mapped = {};
    for (const connector of CONNECTORS.filter((item) => item.mcpEndpointName)) {
      const preferredName = `${connector.mcpEndpointName}-${user?.id || user?.userId}`;
      const matches = endpoints.filter((endpoint) => (
        endpoint?.adapter_type === connector.id
        || endpoint?.name === connector.mcpEndpointName
        || endpoint?.name === preferredName
      ));
      const bestMatch = pickPreferredMcpEndpoint(matches, preferredName);
      if (bestMatch) {
        mapped[connector.id] = bestMatch;
      }
    }
    setVerifiedMcpEndpoints(mapped);
  }, [endpoints, user?.id, user?.userId]);

  // ── Nango Connect (OAuth bridge) ──────────────────────────────────
  // Used for connectors whose nangoProvider field is set (slack, notion,
  // github, linear, jira, confluence, etc). Flow:
  //   1. Backend gives short-lived connect session token
  //   2. @nangohq/frontend opens Nango popup against self-hosted
  //      api.hivemind.davinciai.eu:8042 (Nango admin/host), runs OAuth dance
  //   3. We persist (provider_key, connection_id) so backend can fetch
  //      fresh access tokens via Nango on every MCP call.
  const handleNangoConnect = useCallback(async (connector) => {
    const providerKey = connector.nangoProvider;
    setConnectingProvider(connector.oauthProvider || connector.id);
    try {
      const { connect_session_token } = await apiClient.getNangoConnectSession(connector.id);
      const NangoMod = await import('@nangohq/frontend');
      const NangoCtor = NangoMod.default || NangoMod.Nango || NangoMod;
      const nango = new NangoCtor();
      const connectUiBase =
        process.env.REACT_APP_NANGO_CONNECT_URL ||
        'https://api.hivemind.davinciai.eu:8043';
      const nangoApiUrl =
        process.env.REACT_APP_NANGO_HOST ||
        'https://api.hivemind.davinciai.eu:8042';
      await new Promise((resolve, reject) => {
        const ui = nango.openConnectUI({
          sessionToken: connect_session_token,
          baseURL: connectUiBase,
          apiURL: nangoApiUrl,
          onEvent: async (event) => {
            try {
              if (event?.type === 'connect') {
                const payload = event.payload || {};
                const pKey = payload.providerConfigKey || payload.provider_config_key || providerKey;
                const connectionId = payload.connectionId || payload.connection_id;
                if (!connectionId) throw new Error('Nango did not return a connection id');
                await apiClient.finalizeNangoConnection(pKey, connectionId);
                setToastMessage({ type: 'success', text: `${connector.name} connected via Nango` });
                if (typeof refetchOAuth === 'function') refetchOAuth();
                resolve();
              } else if (event?.type === 'close') {
                resolve();
              } else if (event?.type === 'error') {
                reject(new Error(event?.payload?.error || 'Nango connect error'));
              }
            } catch (e) {
              reject(e);
            }
          },
        });
        if (ui && typeof ui.setSessionToken === 'function') {
          ui.setSessionToken(connect_session_token);
        }
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err?.response?.data?.error || err?.message || 'Nango connect failed',
      });
    } finally {
      setConnectingProvider(null);
    }
  }, [refetchOAuth]);

  const handleOAuthConnect = useCallback(async (provider, opts = {}) => {
    setConnectingProvider(provider);
    try {
      const targetScope = targetScopes[provider] || 'personal';
      const teamId = targetScope === 'team' ? (selectedTeamIds[provider] || null) : null;

      // Google Workspace (any service) routes through gmailConnect with services param
      // opts.services: 'all' (master tile), or specific list like 'gmail,drive,calendar'
      const isGoogleService = provider === 'gmail'
        || provider.startsWith('google-')
        || opts.services
        || opts.googleService;

      if (isGoogleService) {
        const services = opts.services || opts.googleService || provider.replace(/^google-/, '');
        // Master tile (services='all') → show intro modal FIRST (one-time explanation)
        if (opts.isMaster) {
          const seen = window.localStorage.getItem('hm_workspace_intro_seen');
          if (!seen) {
            setConnectingProvider(null);
            setPendingWorkspaceConnect({ services, targetScope });
            setWorkspaceIntroOpen(true);
            return;
          }
        }
        const data = await apiClient.gmailConnect(targetScope, services);
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
        { target_scope: targetScope, team_id: teamId },
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
  }, [targetScopes, selectedTeamIds]);

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

  const handleChangeScope = useCallback(async (provider, newScope, teamId) => {
    try {
      await apiClient.changeConnectorScope(provider, { target_scope: newScope, team_id: teamId });
      setTargetScopes(prev => ({ ...prev, [provider]: newScope }));
      if (teamId) setSelectedTeamIds(prev => ({ ...prev, [provider]: teamId }));
      setToastMessage({ type: 'success', text: `${provider} scope updated to ${newScope}` });
      refetchOAuth();
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  }, [refetchOAuth]);

  // Advance the multi-service wizard to the next step, or close if done
  const advanceWorkspaceWizard = useCallback(() => {
    const nextIdx = workspaceWizardIdx + 1;
    if (nextIdx >= workspaceWizardQueue.length) {
      // Wizard complete
      setWorkspaceWizardQueue([]);
      setWorkspaceWizardIdx(0);
      setWorkspaceWizardEmail(null);
      setToastMessage({ type: 'success', text: 'All Google services configured. Sync running in background.' });
      refetchOAuth();
    } else {
      setWorkspaceWizardIdx(nextIdx);
      // If next is gmail, open Gmail modal; else generic config modal shows
      if (workspaceWizardQueue[nextIdx] === 'gmail') {
        setGmailSettingsOpen(true);
      }
    }
  }, [workspaceWizardIdx, workspaceWizardQueue, refetchOAuth]);

  const handleGmailSync = useCallback(async (settings) => {
    try {
      await apiClient.gmailSync({ ...settings, target_scope: targetScopes.gmail || 'personal' });
      setToastMessage({ type: 'success', text: 'Gmail sync started! Check status for progress.' });
      setGmailSettingsOpen(false);
      refetchOAuth();
      // If wizard is active and we just configured gmail, advance to next
      if (workspaceWizardQueue.length > 0 && workspaceWizardQueue[workspaceWizardIdx] === 'gmail') {
        advanceWorkspaceWizard();
      }
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  }, [refetchOAuth, targetScopes.gmail, workspaceWizardQueue, workspaceWizardIdx, advanceWorkspaceWizard]);

  // Save per-service config to backend + trigger sync via dedicated endpoint
  const handleServiceConfigSave = useCallback(async (provider, config) => {
    try {
      const result = await apiClient.googleServiceSync(provider, config);
      const note = result?.mode === 'live-only'
        ? `${provider}: configured (live-only, no background sync).`
        : `${provider}: configured + initial sync started.`;
      setToastMessage({ type: 'success', text: note });
    } catch (err) {
      console.warn('[wizard] save config failed:', err.message);
      setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
    advanceWorkspaceWizard();
  }, [advanceWorkspaceWizard]);

  const handleWhatsAppDisconnect = useCallback(async () => {
    try {
      await apiClient.whatsappDisconnect();
      setToastMessage({ type: 'success', text: 'WhatsApp disconnected' });
      refetchOAuth();
    } catch (err) {
      setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
    }
  }, [refetchOAuth]);

  const npxCommand = 'claude mcp add --transport http --scope user hivemind "https://core.hivemind.davinciai.eu:8050/api/mcp" --header "Authorization: Bearer YOUR_API_KEY"';

  // Required scopes per provider — when a connected token is missing any of
  // these, surface as needs_reauth so the user can reconnect to unlock the
  // newer features (e.g. Slack live search + posting).
  const REQUIRED_SCOPES = {
    slack: ['search:read', 'chat:write'],
  };

  // Merge static CONNECTORS with live OAuth status
  const mergedConnectors = CONNECTORS.map((c) => {
    // Nango-bridged connectors: backend /v1/connectors overlays nango_connections
    // keyed by registry id. We match against the registry id (== c.id usually,
    // or fall back to c.nangoProvider).
    if (c.nangoProvider && !c.oauthProvider) {
      const live = oauthList.find(
        (o) => o.provider === c.id || o.provider === c.nangoProvider
      );
      if (live && live.status === 'connected') {
        return {
          ...c,
          status: 'connected',
          accountRef: live.account_ref || null,
          lastSyncAt: live.last_sync_at || null,
        };
      }
      return c;
    }
    if (c.oauthProvider) {
      const live = oauthList.find((o) => o.provider === c.oauthProvider);
      if (live) {
        const liveScopes = Array.isArray(live.scopes)
          ? live.scopes
          : typeof live.scopes === 'string'
            ? live.scopes.split(/[\s,]+/).filter(Boolean)
            : [];
        const required = REQUIRED_SCOPES[c.oauthProvider] || [];
        const missingScopes = required.filter((s) => !liveScopes.includes(s));
        const scopesOutdated = missingScopes.length > 0;

        let derivedStatus = live.status === 'connected'
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
                    // Nango-bridged connectors don't need legacy CLIENT_ID env
                    // on the control plane — Nango holds the OAuth app creds
                    // centrally (admin sets ONCE for the whole instance).
                    // Keep 'available' so any tenant user clicks Connect →
                    // Nango popup → done. Legacy non-Nango stays coming_soon.
                    ? (c.nangoProvider ? 'available' : 'coming_soon')
                    : c.status;

        // Promote to needs_reauth when connected token lacks new scopes
        if (derivedStatus === 'connected' && scopesOutdated) {
          derivedStatus = 'needs_reauth';
        }

        const reauthHint = scopesOutdated
          ? `Reconnect to enable live search (${missingScopes.join(', ')})`
          : null;

        return {
          ...c,
          status: derivedStatus,
          target_scope: live.target_scope || 'personal',
          accountRef: live.account_ref,
          lastSyncAt: live.last_sync_at,
          lastError: live.last_error,
          scopesOutdated,
          missingScopes,
          description: reauthHint
            ? `${c.description} — ${reauthHint}`
            : live.configured === false && live.disabled_reason
              ? `${c.description} (${live.disabled_reason})`
              : c.description,
        };
      }
    } else if (c.mcpEndpointName) {
      // MCP Client connectors (Claude, VS Code, Antigravity)
      const live = verifiedMcpEndpoints[c.id];

      if (live) {
        const legacyNeedsRefresh = !live.healthy && isLegacyMcpEndpointUrl(live.url);
        return {
          ...c,
          status: legacyNeedsRefresh ? 'available' : live.healthy ? 'connected' : 'error',
          accountRef: isDirectMcpEndpointUrl(live.url) ? 'Direct HTTP MCP' : (live.url || 'Hosted HIVEMIND MCP'),
          lastSyncAt: live.updated_at,
          lastError: legacyNeedsRefresh ? null : live.error,
          description: legacyNeedsRefresh
            ? `${c.description} — rerun setup to switch this client to the direct HTTP MCP endpoint.`
            : c.description,
        };
      }
    }
    return c;
  });

  // Sort order:
  //   1. Connection state (connected first, then available, then coming_soon, then disabled/missing config last)
  //   2. priority asc (master tiles first, then primary, then secondary)
  //   3. alphabetical by name
  const STATE_RANK = {
    connected: 0,
    available: 1,
    needs_config: 1,
    error: 2,
    coming_soon: 3,
    unavailable: 4,
    disabled: 5,
  };
  const stateOf = (c) => {
    if (c.connected || c.status === 'connected') return 'connected';
    if (c.status === 'available') return 'available';
    if (c.status === 'coming_soon') return 'coming_soon';
    if (c.unavailable || c.requiresConfig || c.missingCredentials) return 'unavailable';
    return c.status || 'available';
  };

  const sortConnectors = (list) => [...list].sort((a, b) => {
    const ra = STATE_RANK[stateOf(a)] ?? 99;
    const rb = STATE_RANK[stateOf(b)] ?? 99;
    if (ra !== rb) return ra - rb;
    const pa = a.priority ?? 99;
    const pb = b.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.name || '').localeCompare(b.name || '');
  });

  const filteredConnectors = sortConnectors(
    activeCategory
      ? mergedConnectors.filter((c) => c.category === activeCategory)
      : mergedConnectors
  );

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
              Add the direct HIVEMIND HTTP MCP server in one command
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
            selectedTeamId={selectedTeamIds[connector.oauthProvider] || null}
            onTargetScopeChange={(scope) => connector.oauthProvider && setTargetScopes((prev) => ({ ...prev, [connector.oauthProvider]: scope }))}
            onTeamChange={(teamId) => connector.oauthProvider && setSelectedTeamIds((prev) => ({ ...prev, [connector.oauthProvider]: teamId }))}
            onChangeScope={(newScope, teamId) => connector.oauthProvider && handleChangeScope(connector.oauthProvider, newScope, teamId)}
            allowTeamScope={allowTeamScope && (isOrgAdmin || targetScopes[connector.oauthProvider] !== 'organization')}
            teams={teams}
            onConnect={() => {
              if (connector.isMcpClient) {
                setMcpSetupConnector(connector);
                return;
              }
              if (connector.isQrSetup) {
                setWhatsappQRConnector(true);
                return;
              }
              const controlPlane =
                process.env.REACT_APP_CONTROL_PLANE_URL ||
                'https://api.hivemind.davinciai.eu:8040';
              if (connector.isOauthConnect) {
                const callback = `${window.location.origin}/hivemind/app/connect/mcp/callback`;
                const clientId = connector.oauthClientId || connector.id;
                window.location.href = `${controlPlane}/auth/cli?callback=${encodeURIComponent(callback)}&client=${encodeURIComponent(clientId)}`;
                return;
              }
              // Nango-bridged connectors (slack, notion, github, linear, jira,
              // confluence, etc.) — opens Nango popup instead of legacy OAuth.
              if (connector.nangoProvider) {
                handleNangoConnect(connector);
                return;
              }
              if (connector.oauthProvider) {
                // Google service tiles pass their `googleService` to scope OAuth
                // to only the selected services. master "Google Workspace" tile
                // passes 'all' which means default = every available service.
                handleOAuthConnect(connector.oauthProvider, {
                  services: connector.googleService,
                  isMaster: connector.isMaster,
                });
              }
            }}
            onDisconnect={() => {
              if (connector.isQrSetup) {
                handleWhatsAppDisconnect();
              } else if (connector.oauthProvider) {
                handleDisconnect(connector.oauthProvider);
              }
            }}
            onResync={() => {
              // Google service tile → open per-service config modal with
              // the right schema (Drive shows Drive options, Calendar shows
              // Calendar options, etc.) — NOT the generic Gmail one.
              const isGoogleSvc = connector.category === 'google_workspace'
                && connector.id !== 'google-workspace';
              if (isGoogleSvc) {
                // Map FE service id → backend platformType
                const providerMap = {
                  'gmail':            'gmail',
                  'google-drive':     'google_drive',
                  'google-calendar':  'google_calendar',
                  'google-docs':      'google_docs',
                  'google-sheets':    'google_sheets',
                  'google-slides':    'google_slides',
                  'google-contacts':  'google_contacts',
                  'google-chat':      'google_chat',
                  'google-tasks':     'google_tasks',
                  'google-forms':     'google_forms',
                };
                const backendProvider = providerMap[connector.id];
                if (backendProvider === 'gmail') {
                  // Gmail has its own dedicated modal w/ exclude_categories etc.
                  setGmailEmail(connector.accountRef || null);
                  setGmailSettingsOpen(true);
                } else if (backendProvider) {
                  setStandaloneConfigProvider(backendProvider);
                }
                return;
              }
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

      {/* Google Workspace Intro Modal (one-time, before master OAuth) */}
      <AnimatePresence>
        {workspaceIntroOpen && (
          <GoogleWorkspaceIntroModal
            onProceed={async () => {
              window.localStorage.setItem('hm_workspace_intro_seen', '1');
              setWorkspaceIntroOpen(false);
              const cfg = pendingWorkspaceConnect;
              setPendingWorkspaceConnect(null);
              if (cfg) {
                try {
                  const data = await apiClient.gmailConnect(cfg.targetScope, cfg.services);
                  if (data.url) window.location.href = data.url;
                } catch (err) {
                  setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
                }
              }
            }}
            onCancel={() => {
              setWorkspaceIntroOpen(false);
              setPendingWorkspaceConnect(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Gmail Sync Settings Modal — also used as step 1 of wizard when gmail granted */}
      <AnimatePresence>
        {gmailSettingsOpen && (
          <GmailSyncSettings
            email={gmailEmail}
            onSync={handleGmailSync}
            onClose={() => {
              setGmailSettingsOpen(false);
              // If wizard active and user closed gmail step, advance anyway
              if (workspaceWizardQueue.length > 0 && workspaceWizardQueue[workspaceWizardIdx] === 'gmail') {
                advanceWorkspaceWizard();
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Multi-service wizard — shown for non-gmail services in queue */}
      <AnimatePresence>
        {workspaceWizardQueue.length > 0
          && workspaceWizardQueue[workspaceWizardIdx]
          && workspaceWizardQueue[workspaceWizardIdx] !== 'gmail'
          && !gmailSettingsOpen
          && (() => {
            const currentProvider = workspaceWizardQueue[workspaceWizardIdx];
            const stepLabel = `Step ${workspaceWizardIdx + 1} of ${workspaceWizardQueue.length}`;
            return (
              <GoogleServiceSyncConfig
                provider={currentProvider}
                email={workspaceWizardEmail}
                stepLabel={stepLabel}
                onSave={(cfg) => handleServiceConfigSave(currentProvider, cfg)}
                onSkip={advanceWorkspaceWizard}
                onClose={advanceWorkspaceWizard}
              />
            );
          })()}
      </AnimatePresence>

      {/* Standalone per-service config modal — opened when user clicks
          Reconfigure/Sync Now on a single Google service tile (OUTSIDE the
          wizard chain). Each service gets its own schema-driven popup. */}
      <AnimatePresence>
        {standaloneConfigProvider && (
          <GoogleServiceSyncConfig
            provider={standaloneConfigProvider}
            email={null}
            stepLabel="Per-service sync"
            onSave={async (cfg) => {
              try {
                await apiClient.googleServiceSync(standaloneConfigProvider, cfg);
                setToastMessage({ type: 'success', text: `${standaloneConfigProvider}: config saved + sync started.` });
              } catch (err) {
                setToastMessage({ type: 'error', text: err.response?.data?.error || err.message });
              }
              setStandaloneConfigProvider(null);
            }}
            onSkip={() => setStandaloneConfigProvider(null)}
            onClose={() => setStandaloneConfigProvider(null)}
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
            existingEndpointStatus={verifiedMcpEndpoints[mcpSetupConnector.id] || null}
            onVerified={(status) => {
              if (status?.healthy) {
                setToastMessage({ type: 'success', text: `${mcpSetupConnector.name} verified and marked connected` });
              } else if (status?.error) {
                setToastMessage({ type: 'error', text: status.error });
              }
              refetchStatus();
            }}
          />
        )}
      </AnimatePresence>

      {/* WhatsApp QR Modal */}
      <AnimatePresence>
        {whatsappQRConnector && (
          <WhatsAppQRModal
            onClose={() => setWhatsappQRConnector(false)}
            onSuccess={(info) => {
              setWhatsappQRConnector(false);
              setToastMessage({ type: 'success', text: `WhatsApp paired — +${info.phoneNumber}` });
              refetchOAuth();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
