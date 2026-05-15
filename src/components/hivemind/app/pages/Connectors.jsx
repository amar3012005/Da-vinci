import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ExternalLink,
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
  // ── Google Workspace family ──
  // All grant via a single OAuth flow but each becomes a separate
  // platform_integration row so users can disconnect any one without
  // losing the others.
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Connect Gmail + Drive + Calendar + Docs + Sheets + more in one click',
    icon: Mail,
    category: 'workspace',
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
    category: 'workspace',
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
    category: 'workspace',
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
    category: 'workspace',
    status: 'available',
    color: '#3b82f6',
    priority: 1,
    oauthProvider: 'gmail',
    googleService: 'calendar',
  },
  {
    id: 'google-contacts',
    name: 'Google Contacts',
    description: 'Structured contact directory — no memory pollution',
    icon: Mail,
    category: 'workspace',
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
    category: 'workspace',
    status: 'available',
    color: '#10b981',
    priority: 2,
    oauthProvider: 'gmail',
    googleService: 'tasks',
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

const DIRECT_MCP_ENDPOINT = 'https://core.hivemind.davinciai.eu:8050/api/mcp';
const CLAUDE_INSTALLER_BASE = 'https://core.hivemind.davinciai.eu:8050/install';

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

function buildClaudeSetupCommand(os, apiKey) {
  const safeApiKey = apiKey || '';
  const encodedApiKey = encodeURIComponent(safeApiKey);
  if (os === 'windows') {
    return `irm "${CLAUDE_INSTALLER_BASE}/claude-mcp-windows.ps1?api_key=${encodedApiKey}" | iex`;
  }

  const platform = os === 'linux' ? 'linux' : 'macos';
  return `curl -fsSL "${CLAUDE_INSTALLER_BASE}/claude-mcp-${platform}.sh?api_key=${encodedApiKey}" | bash`;
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

  const jsonConfig = JSON.stringify({
    mcpServers: {
      hivemind: {
        transport: 'http',
        url: DIRECT_MCP_ENDPOINT,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    },
  }, null, 2);

  const claudeSetupCommand = !apiKeyReady
    ? 'Generating your HIVEMIND API key...'
    : buildClaudeSetupCommand(terminalOs, apiKey);

  const config = isClaudeTerminalSetup ? claudeSetupCommand : jsonConfig;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#f3f1ec]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${connector.color}10`, borderColor: `${connector.color}20` }}>
              <Icon size={20} style={{ color: connector.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a0a0a] font-['Space_Grotesk']">{connector.setupTitle || `Connect ${connector.name}`}</h2>
              <p className="text-xs text-[#a3a3a3] font-['Space_Grotesk']">
                {isClaudeTerminalSetup ? 'One-time setup — run the full Claude MCP installer script, let it configure and restart Claude, then verify before Step 2' : 'One-time setup — paste config into your tool'}
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)] xl:items-start">
            <div className="space-y-3">
              <div className="rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-4">
                <p className="text-[11px] font-semibold font-['Space_Grotesk'] uppercase tracking-[0.08em] text-[#a3a3a3] mb-3">Step 1</p>
                <p className="text-sm text-[#525252] font-['Space_Grotesk'] leading-relaxed mb-3">
                  {isClaudeDesktopSetup
                    ? 'Open Terminal with the shortcut for your OS, run the full Claude MCP setup script, let it install or update Claude, configure HIVEMIND, and restart Claude before moving to Step 2.'
                    : isClaudeCodeSetup
                      ? 'Open Claude Code terminal or your system terminal, run the full HIVEMIND setup script below, let it install Claude if needed, register the MCP server, and restart Claude before moving to Step 2.'
                    : 'Copy this schema into your AI client\'s MCP/server setup so it can connect immediately.'}
                </p>
                {isClaudeTerminalSetup && (
                  <div className="rounded-lg border border-[#e3e0db] bg-white p-3 mb-3">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.entries(CLAUDE_TERMINAL_OS).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => setTerminalOs(key)}
                          className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold font-['Space_Grotesk'] transition-all ${
                            terminalOs === key
                              ? 'border-[#117dff]/40 bg-[#117dff]/8 text-[#117dff]'
                              : 'border-[#e3e0db] bg-[#faf9f4] text-[#525252] hover:border-[#117dff]/20'
                          }`}
                        >
                          {value.label}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-lg border border-[#e3e0db] bg-[#faf9f4] p-3">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-[#a3a3a3] mb-1">Open Terminal</p>
                      <p className="text-[12px] font-semibold text-[#117dff] mb-1">{CLAUDE_TERMINAL_OS[terminalOs].shortcut}</p>
                      <p className="text-[12px] text-[#525252] leading-relaxed">
                        {isClaudeCodeSetup
                          ? 'Open the terminal inside Claude Code, or open your system terminal and run the setup script there.'
                          : CLAUDE_TERMINAL_OS[terminalOs].followup}
                      </p>
                    </div>
                  </div>
                )}

                {isClaudeDesktopSetup && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-amber-700 mb-1">Restart Claude</p>
                    <p className="text-[12px] text-amber-800 leading-relaxed">The setup script handles the restart step. If Claude is still open on the old session, quit and reopen it once before Step 2.</p>
                  </div>
                )}
              </div>

              {connector.configPath && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#faf9f4] border border-[#e3e0db]">
                  <FileText size={12} className="text-[#a3a3a3] shrink-0" />
                  <span className="text-[10px] font-mono text-[#737373] truncate">{connector.configPath}</span>
                </div>
              )}

              <div className="relative">
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={handleCopy}
                    disabled={isClaudeTerminalSetup && !apiKeyReady}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] transition-all ${
                      copied
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-white/90 text-[#525252] border border-[#e3e0db] hover:bg-[#f3f1ec]'
                    } disabled:opacity-50`}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : isClaudeTerminalSetup ? 'Copy Setup Script' : 'Copy Config'}
                  </button>
                </div>
                <pre className="bg-[#0a0a0a] text-[#e2e8f0] text-xs font-mono rounded-xl p-4 pr-28 overflow-x-auto leading-relaxed whitespace-pre-wrap break-words min-h-[220px]">
                  {config}
                </pre>
              </div>

              {!apiKeyReady && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 font-['Space_Grotesk']">
                    We are generating a dedicated API key for this setup now. If this does not populate in a moment, create one in <a href="/hivemind/app/keys" className="underline font-semibold">API Keys</a> and reopen this setup.
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-[#e3e0db] bg-white p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-[#a3a3a3]">Verify Connection</p>
                  {verificationState?.healthy ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                      <Check size={10} />
                      Connected
                    </span>
                  ) : verificationState?.error ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-600">
                      <AlertCircle size={10} />
                      Needs attention
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[#525252] font-['Space_Grotesk'] leading-relaxed mb-3">
                  {isClaudeDesktopSetup
                    ? 'After the setup script completes, click Verify Connection here. If it still errors, reopen Claude one more time, make sure the installer finished successfully, then verify again before Step 2.'
                    : isClaudeCodeSetup
                      ? 'After the setup script finishes, click Verify Connection here. If it still errors, run `claude mcp get hivemind` to confirm the server is registered, then verify again before Step 2.'
                    : 'After saving the config in your client, run verification here. We will inspect the direct HIVEMIND MCP endpoint and mark this connector as connected when it responds cleanly.'}
                </p>
                {verificationState?.error && (
                  <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600 font-['Space_Grotesk']">
                    {verificationState.error}
                  </p>
                )}
                {verificationState?.error && isClaudeDesktopSetup && (
                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 font-['Space_Grotesk']">
                    Fully quit Claude Desktop, open it again, then click Verify Connection once more before moving to Step 2.
                  </p>
                )}
                {verificationState?.error && isClaudeCodeSetup && (
                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 font-['Space_Grotesk']">
                    Run `claude mcp get hivemind` or `/mcp` in Claude Code to confirm the server is present, then click Verify Connection once more before moving to Step 2.
                  </p>
                )}
                <button
                  onClick={handleVerify}
                  disabled={verifying || !apiKeyReady}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#117dff]/20 bg-[#117dff]/10 px-4 py-2.5 text-sm font-semibold font-['Space_Grotesk'] text-[#117dff] hover:bg-[#117dff]/15 disabled:opacity-50"
                >
                  {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  {verificationState?.healthy ? 'Re-check Connection' : 'Verify Connection'}
                </button>
              </div>
            </div>

            <div className="space-y-4 xl:sticky xl:top-0">
              <div className="rounded-xl border border-[#dbe8ff] bg-[#f7fbff] p-4 min-h-[220px]">
                <p className="text-[11px] font-semibold font-['Space_Grotesk'] uppercase tracking-[0.08em] text-[#117dff] mb-2">Step 2</p>
                <p className="text-sm text-[#525252] font-['Space_Grotesk'] leading-relaxed mb-3">
                  Once Step 1 is connected, go to the MCP Server page for the HIVEMIND default prompt and the longer coding or agent prompt variants.
                </p>
                <button
                  onClick={goToPrompt}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#117dff] px-4 py-2.5 text-sm font-semibold font-['Space_Grotesk'] text-white hover:bg-[#0066e0] transition-all"
                >
                  <ExternalLink size={14} />
                  Continue to MCP Server Prompt
                </button>
              </div>

              {!isClaudeTerminalSetup && (
                <div className="space-y-3 rounded-xl border border-[#e3e0db] bg-white p-4">
                  {(connector.setupSteps || []).map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#117dff]/10 text-[#117dff] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                      <p className="text-sm text-[#525252] font-['Space_Grotesk'] leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
            {copied ? 'Copied!' : 'Copy Setup'}
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

  const handleOAuthConnect = useCallback(async (provider) => {
    setConnectingProvider(provider);
    try {
      const targetScope = targetScopes[provider] || 'personal';
      const teamId = targetScope === 'team' ? (selectedTeamIds[provider] || null) : null;

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
                    ? 'coming_soon'
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
              if (connector.oauthProvider) {
                handleOAuthConnect(connector.oauthProvider);
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
