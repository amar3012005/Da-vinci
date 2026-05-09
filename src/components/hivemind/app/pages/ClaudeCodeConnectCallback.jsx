import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Copy, Terminal, AlertTriangle, ArrowLeft, Sparkles } from 'lucide-react';

/**
 * Claude Code one-click connect callback.
 *
 * Lands here after the user signs in via /auth/cli on the control plane.
 * URL contains: ?apikey=hm_...&user_id=...&org_id=...&client=...
 *
 * Renders a single ready-to-paste `claude mcp add` command that wires the
 * HIVEMIND MCP server into the user's local Claude Code installation. One
 * terminal command, no plugin install required.
 */
export default function ClaudeCodeConnectCallback() {
  const [search] = useSearchParams();
  const [copied, setCopied] = useState(false);

  const apiKey = search.get('apikey') || '';
  const userId = search.get('user_id') || search.get('userId') || '';
  const orgId = search.get('org_id') || search.get('orgId') || '';
  const error = search.get('error') || '';

  const mcpAddCommand = useMemo(() => {
    if (!apiKey || !userId) return '';
    // Single-line command for easy copy. Uses --scope user for global install.
    return [
      `claude mcp add hivemind --scope user`,
      `  -e HIVEMIND_API_KEY="${apiKey}"`,
      `  -e HIVEMIND_USER_ID="${userId}"`,
      orgId ? `  -e HIVEMIND_ORG_ID="${orgId}"` : null,
      `  --`,
      `  npx -y @amar_528/mcp-bridge hosted --url "https://core.hivemind.davinciai.eu:8050/api/mcp/servers/${userId}"`,
    ]
      .filter(Boolean)
      .join(' \\\n');
  }, [apiKey, userId, orgId]);

  const oneLinerInstall = useMemo(() => {
    if (!apiKey || !userId) return '';
    return `claude mcp add hivemind --scope user -e HIVEMIND_API_KEY="${apiKey}" -e HIVEMIND_USER_ID="${userId}"${orgId ? ` -e HIVEMIND_ORG_ID="${orgId}"` : ''} -- npx -y @amar_528/mcp-bridge hosted --url "https://core.hivemind.davinciai.eu:8050/api/mcp/servers/${userId}"`;
  }, [apiKey, userId, orgId]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  // Auto-copy on first render so power users can paste immediately.
  useEffect(() => {
    if (oneLinerInstall) {
      navigator.clipboard.writeText(oneLinerInstall).catch(() => {});
    }
  }, [oneLinerInstall]);

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
            <h1 className="text-lg font-bold text-[#0a0a0a] font-['Space_Grotesk']">Connection failed</h1>
          </div>
          <p className="text-sm text-[#525252] font-['Space_Grotesk'] mb-4">{error}</p>
          <Link
            to="/hivemind/app/connectors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#117dff] hover:underline"
          >
            <ArrowLeft size={14} /> Back to Connectors
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!apiKey || !userId) {
    return (
      <div className="min-h-screen bg-[#faf9f4] flex items-center justify-center p-6">
        <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-lg w-full">
          <h1 className="text-lg font-bold text-[#0a0a0a] mb-2 font-['Space_Grotesk']">Missing parameters</h1>
          <p className="text-sm text-[#525252] mb-4 font-['Space_Grotesk']">
            This page is only meaningful when reached from the OAuth callback.
            Start the flow from the Connectors page.
          </p>
          <Link
            to="/hivemind/app/connectors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#117dff] hover:underline"
          >
            <ArrowLeft size={14} /> Back to Connectors
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
              You're authenticated. One command left.
            </h1>
          </div>
          <p className="text-sm text-[#525252] font-['Space_Grotesk'] ml-[52px]">
            Paste this into any terminal where you run Claude Code. Then restart your Claude Code session — all 22 HIVEMIND tools become available.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-[#e3e0db] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden mb-5"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f3f1ec]">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[#525252]" />
              <p className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">
                Run this in your terminal
              </p>
              <span className="text-[10px] text-emerald-600 font-mono">
                {copied ? 'copied just now' : 'auto-copied to clipboard'}
              </span>
            </div>
            <button
              onClick={() => handleCopy(oneLinerInstall)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-['Space_Grotesk'] transition-all ${
                copied
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-white text-[#525252] border border-[#e3e0db] hover:bg-[#f3f1ec]'
              }`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="px-5 py-4 text-[12px] font-mono text-[#cdd6f4] bg-[#0a0a0a] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
            {mcpAddCommand}
          </pre>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[#e3e0db] rounded-2xl p-5 mb-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-[#117dff]" />
            <p className="text-xs font-semibold font-['Space_Grotesk'] text-[#0a0a0a]">
              What this command does
            </p>
          </div>
          <ul className="space-y-2 text-xs text-[#525252] font-['Space_Grotesk'] leading-relaxed">
            <li>
              <span className="text-[#117dff] font-mono">claude mcp add</span> — registers HIVEMIND with the Claude Code CLI at user scope (available to every Claude Code session on this machine).
            </li>
            <li>
              <span className="text-[#117dff] font-mono">-e HIVEMIND_*</span> — passes your tenant-scoped API key + user_id as environment variables to the MCP bridge.
            </li>
            <li>
              <span className="text-[#117dff] font-mono">npx -y @amar_528/mcp-bridge</span> — runs the official bridge that translates Claude Code MCP calls into HIVEMIND REST + WebSocket calls scoped to your account.
            </li>
            <li>
              On the next Claude Code session you can call <span className="text-[#117dff] font-mono">hivemind_recall</span>, <span className="text-[#117dff] font-mono">hivemind_ingest_code</span>, <span className="text-[#117dff] font-mono">hivemind_code_at</span>, and 19 others directly.
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 mb-5"
        >
          <Check className="text-emerald-600 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-xs font-semibold text-emerald-700 font-['Space_Grotesk'] mb-1">
              Verify after pasting
            </p>
            <pre className="text-[11px] font-mono text-emerald-800 bg-white/50 rounded px-2 py-1.5">
              claude mcp list | grep hivemind
            </pre>
          </div>
        </motion.div>

        <div className="flex items-center justify-between">
          <Link
            to="/hivemind/app/connectors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#525252] hover:text-[#117dff] font-['Space_Grotesk']"
          >
            <ArrowLeft size={14} /> Back to Connectors
          </Link>
          <Link
            to="/hivemind/app/mcp"
            className="text-sm font-semibold text-[#117dff] hover:underline font-['Space_Grotesk']"
          >
            View all 22 tools →
          </Link>
        </div>
      </div>
    </div>
  );
}
