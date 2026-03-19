import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cable,
  Copy,
  Check,
  Terminal,
  Code2,
  Globe,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useCopyToClipboard } from '../shared/hooks';

// ─── JSON Syntax Highlighter ────────────────────────────────────────────────

function JsonBlock({ data }) {
  const raw = JSON.stringify(data, null, 2);
  const lines = raw.split('\n');

  return (
    <pre className="bg-[#0a0a0a] rounded-xl p-4 overflow-x-auto text-sm leading-relaxed font-['JetBrains_Mono','Fira_Code',monospace]">
      {lines.map((line, i) => (
        <div key={i}>{colorize(line)}</div>
      ))}
    </pre>
  );
}

function colorize(line) {
  // Match key-value pairs: "key": "value" or "key": non-string
  const kvMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)("(?:[^"\\]|\\.)*")(,?)$/);
  if (kvMatch) {
    const [, indent, key, colon, value, comma] = kvMatch;
    return (
      <>
        <span className="text-white/40">{indent}"</span>
        <span className="text-[#bdf213]">{key}</span>
        <span className="text-white/40">"</span>
        <span className="text-white/40">{colon}</span>
        <span className="text-emerald-400">{value}</span>
        <span className="text-white/40">{comma}</span>
      </>
    );
  }

  // Match key with non-string value (number, boolean, null, object, array)
  const kvOther = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.+?)(,?)$/);
  if (kvOther) {
    const [, indent, key, colon, value, comma] = kvOther;
    return (
      <>
        <span className="text-white/40">{indent}"</span>
        <span className="text-[#bdf213]">{key}</span>
        <span className="text-white/40">"</span>
        <span className="text-white/40">{colon}</span>
        <span className="text-orange-300">{value}</span>
        <span className="text-white/40">{comma}</span>
      </>
    );
  }

  // Standalone string (in arrays)
  const strMatch = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(,?)$/);
  if (strMatch) {
    const [, indent, value, comma] = strMatch;
    return (
      <>
        <span className="text-white/40">{indent}</span>
        <span className="text-emerald-400">{value}</span>
        <span className="text-white/40">{comma}</span>
      </>
    );
  }

  // Brackets and punctuation
  return <span className="text-white/40">{line}</span>;
}

// ─── Copy Button ────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy Config' }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      onClick={() => copy(text)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all font-['Space_Grotesk']"
      style={{
        backgroundColor: copied ? 'rgba(189,242,19,0.15)' : 'rgba(189,242,19,1)',
        color: copied ? '#bdf213' : '#0a0a0a',
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ─── Client Config Cards ────────────────────────────────────────────────────

const CLIENT_META = {
  claude: {
    name: 'Claude Desktop',
    icon: Terminal,
    instruction: 'Paste into ~/Library/Application Support/Claude/claude_desktop_config.json',
  },
  vscode: {
    name: 'VS Code',
    icon: Code2,
    instruction: 'Add to your VS Code settings.json under "mcp.servers"',
  },
  antigravity: {
    name: 'Antigravity',
    icon: Cable,
    instruction: 'Save as mcp_config.json in your project root',
  },
  remote: {
    name: 'Remote MCP',
    icon: Globe,
    instruction: 'Use this HTTP endpoint for custom MCP integrations',
  },
};

const CLIENT_ORDER = ['claude', 'vscode', 'antigravity', 'remote'];

function ClientCard({ clientKey, config, index }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CLIENT_META[clientKey] || {
    name: clientKey,
    icon: Cable,
    instruction: '',
  };
  const Icon = meta.icon;
  const configStr = JSON.stringify(config, null, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.4 }}
      className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden"
    >
      {/* Card Header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-[#bdf213]" />
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold font-['Space_Grotesk']">
              {meta.name}
            </h3>
            <p className="text-white/40 text-xs mt-0.5 font-['Space_Grotesk']">
              {meta.instruction}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={configStr} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors text-white/40 hover:text-white/70"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable Config */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="px-5 pb-5"
        >
          <JsonBlock data={config} />
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    healthy: { color: 'bg-emerald-400', label: 'Healthy' },
    unhealthy: { color: 'bg-red-400', label: 'Unhealthy' },
    unknown: { color: 'bg-amber-400', label: 'Unknown' },
  };
  const s = map[status] || map.unknown;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-['Space_Grotesk']">
      <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
      <span className="text-white/60">{s.label}</span>
    </span>
  );
}

function JobStatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    running: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    failed: 'bg-red-500/15 text-red-400 border-red-500/20',
  };
  const cls = map[status] || map.pending;

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${cls}`}
    >
      {status}
    </span>
  );
}

// ─── Connectors Page ────────────────────────────────────────────────────────

export default function Connectors() {
  const {
    data: descriptors,
    loading: descLoading,
    error: descError,
  } = useApiQuery(() => apiClient.getDescriptors(), []);

  const {
    data: connectorStatus,
    loading: statusLoading,
    refetch: refetchStatus,
  } = useApiQuery(() => apiClient.getConnectorStatus(), []);

  const {
    data: jobs,
    loading: jobsLoading,
    refetch: refetchJobs,
  } = useApiQuery(() => apiClient.listConnectorJobs(), []);

  const npxCommand = 'npx -y @amar_528/mcp-bridge hosted';

  const endpoints = connectorStatus?.endpoints || [];
  const jobList = Array.isArray(jobs) ? jobs : jobs?.jobs || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <Cable size={22} className="text-[#bdf213]" />
            <h1 className="text-white text-2xl font-bold font-['Space_Grotesk']">
              Connectors
            </h1>
          </div>
          <p className="text-white/40 text-sm font-['Space_Grotesk'] ml-[34px]">
            Connect your AI clients to HIVEMIND via MCP
          </p>
        </motion.div>

        {/* Quick Install */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="bg-[#111]/80 backdrop-blur-xl border border-[#bdf213]/20 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center">
                <Terminal size={18} className="text-[#bdf213]" />
              </div>
              <div>
                <h2 className="text-white text-sm font-semibold font-['Space_Grotesk']">
                  Quick Install
                </h2>
                <p className="text-white/40 text-xs font-['Space_Grotesk']">
                  Run this single command to start the MCP bridge
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <code className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-[#bdf213] font-['JetBrains_Mono','Fira_Code',monospace] select-all">
                {npxCommand}
              </code>
              <CopyButton text={npxCommand} label="Copy" />
            </div>
          </div>
        </motion.div>

        {/* Client Config Cards */}
        <section>
          <h2 className="text-white/60 text-xs font-mono uppercase tracking-wider mb-4">
            Client Configurations
          </h2>

          {descLoading && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={20} className="text-[#bdf213] animate-spin" />
            </div>
          )}

          {descError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm font-mono">
              Failed to load client configs: {descError}
            </div>
          )}

          {descriptors && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CLIENT_ORDER.filter((k) => descriptors[k]).map((key, i) => (
                <ClientCard
                  key={key}
                  clientKey={key}
                  config={descriptors[key]}
                  index={i}
                />
              ))}
            </div>
          )}
        </section>

        {/* Connector Status */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white/60 text-xs font-mono uppercase tracking-wider">
              Connector Status
            </h2>
            <button
              onClick={refetchStatus}
              className="flex items-center gap-1.5 text-white/40 hover:text-[#bdf213] text-xs font-['Space_Grotesk'] transition-colors"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>

          <div className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
            {statusLoading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={18} className="text-[#bdf213] animate-spin" />
              </div>
            )}

            {!statusLoading && endpoints.length === 0 && (
              <div className="py-12 text-center">
                <WifiOff size={24} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/30 text-sm font-['Space_Grotesk']">
                  No connectors registered yet
                </p>
              </div>
            )}

            {!statusLoading && endpoints.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-white/30 text-xs font-mono uppercase tracking-wider px-5 py-3">
                      Endpoint
                    </th>
                    <th className="text-left text-white/30 text-xs font-mono uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                    <th className="text-left text-white/30 text-xs font-mono uppercase tracking-wider px-5 py-3">
                      Tools
                    </th>
                    <th className="text-left text-white/30 text-xs font-mono uppercase tracking-wider px-5 py-3">
                      Resources
                    </th>
                    <th className="text-left text-white/30 text-xs font-mono uppercase tracking-wider px-5 py-3">
                      Last Checked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((ep, i) => (
                    <tr
                      key={ep.url || i}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Wifi size={13} className="text-white/20 flex-shrink-0" />
                          <span className="text-white/70 font-mono text-xs truncate max-w-[260px]">
                            {ep.url}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={ep.status || ep.health} />
                      </td>
                      <td className="px-5 py-3 text-white/50 font-mono text-xs">
                        {ep.toolCount ?? ep.tool_count ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-white/50 font-mono text-xs">
                        {ep.resourceCount ?? ep.resource_count ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-white/40 font-mono text-[11px]">
                        {ep.lastChecked || ep.last_checked
                          ? new Date(ep.lastChecked || ep.last_checked).toLocaleString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Connector Jobs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white/60 text-xs font-mono uppercase tracking-wider">
              Recent Jobs
            </h2>
            <button
              onClick={refetchJobs}
              className="flex items-center gap-1.5 text-white/40 hover:text-[#bdf213] text-xs font-['Space_Grotesk'] transition-colors"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>

          <div className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
            {jobsLoading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={18} className="text-[#bdf213] animate-spin" />
              </div>
            )}

            {!jobsLoading && jobList.length === 0 && (
              <div className="py-12 text-center">
                <Terminal size={24} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/30 text-sm font-['Space_Grotesk']">
                  No orchestration jobs yet
                </p>
              </div>
            )}

            {!jobsLoading && jobList.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-white/30 text-xs font-mono uppercase tracking-wider px-5 py-3">
                      Job ID
                    </th>
                    <th className="text-left text-white/30 text-xs font-mono uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                    <th className="text-left text-white/30 text-xs font-mono uppercase tracking-wider px-5 py-3">
                      Endpoint
                    </th>
                    <th className="text-left text-white/30 text-xs font-mono uppercase tracking-wider px-5 py-3">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobList.map((job, i) => (
                    <tr
                      key={job.id || i}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3 text-white/60 font-mono text-xs">
                        {(job.id || '').slice(0, 12)}
                      </td>
                      <td className="px-5 py-3">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-5 py-3 text-white/50 font-mono text-xs truncate max-w-[200px]">
                        {job.endpoint || job.url || '-'}
                      </td>
                      <td className="px-5 py-3 text-white/40 font-mono text-[11px]">
                        {job.timestamp || job.created_at
                          ? new Date(job.timestamp || job.created_at).toLocaleString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
