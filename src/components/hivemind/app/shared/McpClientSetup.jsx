import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, ExternalLink, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const HIVEMIND_MCP_URL = 'https://core.singulancelabs.com/api/mcp';
export const MCP_CLIENT_GUIDES = {
  chatgpt: {
    name: 'ChatGPT',
    docs: 'https://developers.openai.com/api/docs/guides/custom-mcp-server',
    steps: [
      'Open ChatGPT on the web. Go to Plugins, select +, then Add custom MCP server.',
      'Name it HIVE-MIND and paste the server URL below under Connection.',
      'Choose OAuth. Use automatic client registration (DCR); leave static client ID and secret blank.',
      'Review the permissions and create the plugin. Install it, sign in to HIVE-MIND when asked, and enable it in your conversation.',
    ],
    note: 'Workspace permissions can limit custom MCP servers. Some accounts still label this Apps or Connectors. This is a remote MCP connection, not a GPT Action; no OpenAPI import or API key paste is needed.',
  },
  claude: {
    name: 'Claude',
    docs: 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp',
    steps: [
      'Open Customize → Connectors → + Add → Add custom connector.',
      'Name it HIVE-MIND and paste the remote MCP server URL below.',
      'Choose Sign in now and Register automatically for the OAuth client. No fixed request headers or client secret are needed.',
      'Add the connector, sign in to HIVE-MIND, review its permissions, and enable it for your conversation.',
    ],
    note: 'For managed workspaces, an owner may need to add the connector first. Remote connectors work through your Claude account; local Desktop JSON configuration is a separate setup.',
  },
  vscode: {
    name: 'VS Code',
    docs: 'https://code.visualstudio.com/docs/agents/reference/mcp-configuration',
    steps: [
      'Run MCP: Add Server from the Command Palette and choose HTTP.',
      'Paste the server URL below, name the server hivemind, and choose where to save the configuration.',
      'Start the server and complete the browser OAuth sign-in when prompted.',
      'Review server trust and tool approvals before using HIVE-MIND in agent chat.',
    ],
    config: JSON.stringify({ servers: { hivemind: { type: 'http', url: HIVEMIND_MCP_URL } } }, null, 2),
    note: 'VS Code uses a servers object in mcp.json, rather than the mcpServers shape used by some other clients.',
  },
  codex: {
    name: 'Codex CLI',
    docs: 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli',
    steps: [
      'Add the remote server with the command below.',
      'Run codex mcp login hivemind and complete the HIVE-MIND browser sign-in.',
      'Run codex mcp list, then check the available tools in your Codex session.',
    ],
    config: `codex mcp add hivemind --url ${HIVEMIND_MCP_URL}\ncodex mcp login hivemind\ncodex mcp list`,
    note: 'OAuth login is a separate step. Adding the URL alone does not establish an authenticated connection.',
  },
};

export default function McpClientSetup({ client = 'chatgpt', selectable = false, onClose }) {
  const { t } = useTranslation('dashboard');
  const [selected, setSelected] = useState(client);
  const [copied, setCopied] = useState(false);
  const guide = MCP_CLIENT_GUIDES[selected] || MCP_CLIENT_GUIDES.chatgpt;
  const copy = async () => {
    try { await navigator.clipboard.writeText(HIVEMIND_MCP_URL); setCopied(true); }
    catch { setCopied(false); }
  };
  return <section className="rounded-2xl border border-[#e3e0db] bg-white p-5 text-[#0a0a0a]" aria-label={`${guide.name} MCP setup`}>
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-base font-semibold">{t('mcpSetup.title', 'Connect HIVE-MIND to {{client}}', { client: guide.name })}</h2>
      {onClose && <button onClick={onClose} aria-label={t('mcpSetup.close', 'Close setup')} className="p-2 rounded-lg hover:bg-[#f3f1ec]"><X size={18} /></button>}
    </div>
    {selectable && <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={t('mcpSetup.client', 'Choose your client')}>
      {Object.entries(MCP_CLIENT_GUIDES).map(([id, value]) => <button key={id} onClick={() => { setSelected(id); setCopied(false); }} aria-pressed={id === selected} className={`px-3 py-2 rounded-lg text-sm border ${id === selected ? 'border-[#117dff] bg-blue-50' : 'border-[#e3e0db]'}`}>{value.name}</button>)}
    </div>}
    <p className="text-sm text-[#525252] mb-3">{t('mcpSetup.signin', 'Use your HIVE-MIND account and approve only the access you need. Your company permissions still apply.')}</p>
    <div className="flex items-start gap-2 bg-[#fafaf6] border border-[#e3e0db] rounded-xl p-3 mb-4">
      <code className="text-xs break-all min-w-0 flex-1">{HIVEMIND_MCP_URL}</code>
      <button onClick={copy} className="shrink-0 p-1" aria-label={t('mcpSetup.copyUrl', 'Copy MCP server URL')} title={t('mcpSetup.copyUrl', 'Copy MCP server URL')}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
    </div>
    <ol className="list-decimal pl-5 space-y-3 text-sm leading-relaxed">
      {guide.steps.map((step, index) => <li key={`${selected}-${index}`}>{t(`mcpSetup.${selected}.step${index + 1}`, step)}</li>)}
    </ol>
    {guide.config && <pre className="mt-4 bg-[#fafaf6] rounded-xl p-3 text-xs whitespace-pre-wrap break-all">{guide.config}</pre>}
    <p className="mt-4 text-xs leading-relaxed text-[#737373]">{t(`mcpSetup.${selected}.note`, guide.note)}</p>
    <p className="mt-3 text-xs text-[#525252]">{t('mcpSetup.verify', 'After signing in, check that your client lists HIVE-MIND tools. These instructions do not confirm a connection or grant new access.')}</p>
    <a href={guide.docs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-4 text-sm text-[#117dff]">{t('mcpSetup.docs', 'Official setup guide')}<ExternalLink size={14} /></a>
  </section>;
}

export function McpClientSetupModal({ client, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.querySelector('button')?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(dialog.current?.querySelectorAll('button, a[href]') || []);
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus?.(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/50 backdrop-blur-sm" onClick={onClose}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="MCP connection setup" className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl" onClick={event => event.stopPropagation()}>
      <McpClientSetup client={client} onClose={onClose} />
    </div>
  </div>;
}
