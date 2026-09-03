// Claude-exact chat turn presentation — ONE source of truth for every chat
// surface (mobile Talk-to-HIVE, desktop Overview chat, Talk-to-HIVE sidebar):
// bubbleless serif assistant answers on the warm canvas, collapsed reasoning
// pill (StepsDisclosure), sources pill, copy/retry/vote action row, draft
// approval cards, project-choice saver, and the live Thinking tool animation.
// Extracted from mobile TalkToHiveMobile (the reference implementation).
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, ChevronRight, FileText, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown,
  AlertTriangle, Loader2, ChevronDown, Brain, Sparkles, CornerDownRight,
} from 'lucide-react';
import apiClient from './api-client';
import { BRAND_LOGOS } from './connectors-catalog';
import {
  COMPOSIO_CONNECT_CHANNEL,
  composioCallbackUrl,
  connectBanner,
  connectToolkitOf,
  httpConnectUrl,
  isComposioConnectSuccess,
  isConnectOpenOption,
} from './connect-continuation';

function connectorKey(event) {
  const raw = String(event?.tool_groups?.[0] || event?.tool || event?.name || '').toLowerCase();
  if (raw.includes('gmail')) return 'gmail';
  if (raw.includes('google') && raw.includes('doc')) return 'google-docs';
  if (raw.includes('sheet')) return 'google-sheets';
  if (raw.includes('slack')) return 'slack';
  if (raw.includes('github')) return 'github';
  if (raw.includes('linear')) return 'linear';
  if (raw.includes('notion')) return 'notion';
  return null;
}

function reasoningRows(events = [], fallbackSteps = []) {
  const canonical = events.filter((event) => event?.type === 'orchestration_step');
  if (canonical.length) {
    const byStep = new Map();
    canonical.forEach((event) => byStep.set(event.step_id || event.index, event));
    return [...byStep.values()].sort((a, b) => Number(a.index) - Number(b.index));
  }
  return (fallbackSteps || []).map((step, index) => ({
    ...step, index, phase: step.status || 'completed', label: step.operation || step.tool || 'Step',
    detail: step.summary || step.result_summary || '',
  }));
}

function normalizedArguments(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value)); } catch { return value.trim(); }
  }
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function liveReasoningRows(events = []) {
  const rows = new Map();
  for (const event of events || []) {
    const type = event?.type;
    if (type === 'orchestration_step') {
      const key = `step:${event.step_id ?? event.index}`;
      rows.set(key, event);
      continue;
    }
    const tool = event?.tool || event?.name;
    if (tool && ['tool_selected', 'tool_started', 'tool_call', 'tool_completed', 'tool_result'].includes(type)) {
      const args = normalizedArguments(event?.arguments);
      const existingKey = [...rows.keys()].reverse().find((key) => key.startsWith(`tool:${tool}:`));
      const key = args ? `tool:${tool}:${args.slice(0, 180)}` : (existingKey || `tool:${tool}:default`);
      const previous = rows.get(key) || {};
      const completed = type === 'tool_completed' || type === 'tool_result';
      rows.set(key, {
        ...previous,
        ...event,
        tool,
        phase: completed ? 'completed' : 'started',
        detail: completed
          ? (event?.result_summary || event?.detail || 'Completed')
          : (event?.detail || 'Working…'),
      });
      continue;
    }
    if (type === 'recall_window_revealed') {
      const from = Number(event.from_rank) || 1;
      const to = Number(event.to_rank) || from;
      rows.set(`hop:${event.recall_id || 'recall'}:${from}:${to}`, {
        ...event,
        tool: from === 1 ? 'evidence_rank' : 'next_evidence_hop',
        phase: 'completed',
        detail: `Ranks ${from}–${to} of ${event.candidate_count || to}`,
      });
    }
  }
  return [...rows.values()];
}

export function OrchestrationReasoning({ events = [], steps = [], sealed = true, label = 'Reasoning', defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const rows = reasoningRows(events, steps);
  if (!rows.length) return null;
  return (
    <div className="max-w-4xl py-2 pr-2">
      <button type="button" onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 text-left text-[#8b877f] hover:text-[#5f5b54] transition-colors" aria-expanded={open}>
        {sealed ? <Clock size={15} /> : <Loader2 size={15} className="animate-spin text-[#117dff]" />}
        <span className="text-[13px] font-medium">{label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mt-2.5 ml-[7px] border-l border-[#e5dfd6] pl-4 space-y-1.5">
          {rows.map((row) => {
            const connector = connectorKey(row);
            const isNative = String(row.tool || '').startsWith('hivemind_') || (row.tool_groups || []).some((group) => String(group).startsWith('hivemind'));
            const toolkitSlug = !isNative ? String(row.tool_groups?.[0] || '').trim().toLowerCase() : '';
            const logo = connector ? BRAND_LOGOS[connector]
              : toolkitSlug ? `https://logos.composio.dev/api/${encodeURIComponent(toolkitSlug)}` : null;
            const complete = ['completed', 'draft_created'].includes(row.phase);
            return (
              <div key={row.step_id || row.index} className="flex min-w-0 items-start gap-2.5 text-[12px] leading-5">
                <span className="mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  {logo ? <img src={logo} alt="" className="h-3.5 w-3.5" />
                    : isNative ? <Brain size={13} className="text-[#117dff]" />
                      : row.phase === 'started' ? <Loader2 size={12} className="animate-spin text-[#117dff]" />
                        : <Sparkles size={12} className="text-[#117dff]" />}
                </span>
                <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <code className="max-w-full break-all rounded-[4px] bg-[#e8f0ff] px-1.5 py-0.5 font-mono text-[11.5px] text-[#1764d8]">
                    {row.tool || row.label || row.operation || 'Working'}
                  </code>
                  <span className={row.phase === 'needs_input' ? 'text-[#a16207]' : complete ? 'text-[#329044]' : 'text-[#77736c]'}>
                    → {row.detail || (row.phase === 'started' ? 'Working…' : String(row.phase || '').replace(/_/g, ' '))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContinuationChoices({ continuation, onContinue }) {
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [connectError, setConnectError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const request = continuation?.requests?.[0];
  const options = Array.isArray(request?.options) ? request.options : [];
  const fields = Array.isArray(request?.fields) ? request.fields : [];
  const banner = request?.kind === 'connect_account' ? connectBanner(request, BRAND_LOGOS) : null;
  useEffect(() => {
    const toolkit = banner?.toolkit;
    const onPayload = (payload) => {
      if (isComposioConnectSuccess(payload, toolkit)) setConnected(true);
    };
    const onWindow = (event) => {
      if (event.origin !== window.location.origin) return;
      onPayload(event.data);
    };
    window.addEventListener('message', onWindow);
    let channel;
    try {
      channel = new BroadcastChannel(COMPOSIO_CONNECT_CHANNEL);
      channel.onmessage = (event) => onPayload(event.data);
    } catch { /* ignore */ }
    return () => {
      window.removeEventListener('message', onWindow);
      try { channel?.close(); } catch { /* ignore */ }
    };
  }, [banner?.toolkit]);
  if ((!options.length && !fields.length) || !onContinue) return null;
  const fieldsComplete = fields.every((field) => !field.required || String(values[field.name] || '').trim());
  const openConnect = async (option) => {
    const toolkit = connectToolkitOf(request, option);
    setConnectError('');
    setConnecting(true);
    const authWindow = window.open('about:blank', '_blank');
    try {
      if (!toolkit) throw new Error('No app to connect');
      const data = await apiClient.createComposioConnectLink(toolkit, {
        callbackUrl: composioCallbackUrl(window.location.origin, toolkit),
        toolkitMeta: { composioManagedAuthSchemes: ['OAUTH2'], noAuth: false },
      });
      const url = httpConnectUrl(data?.redirect_url || data?.redirectUrl);
      if (!url) throw new Error('No OAuth URL returned for this app');
      if (authWindow && !authWindow.closed) {
        authWindow.location.replace(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      if (authWindow && !authWindow.closed) authWindow.close();
      setConnectError(error?.response?.data?.error || error?.message || 'Could not open Gmail connection');
    } finally {
      setConnecting(false);
    }
  };
  return (
    <div className="mt-5">
      {banner ? (
        <div className="mb-3 flex items-center gap-3 border border-[#e5dfd6] bg-[#faf8f4] px-3 py-2.5">
          {banner.logo ? <img src={banner.logo} alt="" className="h-8 w-8 shrink-0" /> : null}
          <div>
            <div className="text-[13px] font-semibold text-[#1a1a17]">
                {connected ? `${banner.name} connected` : `Connect ${banner.name}`}
              </div>
            <div className="text-[12px] text-[#5f5b54]">
                {connected
                  ? 'Connected. Continue this request from the paused step.'
                  : 'Authorize in a new tab. You will return here when it succeeds.'}
              </div>
          </div>
        </div>
      ) : null}
      <div className="text-[14px] font-semibold text-[#1a1a17]">I need your input to continue</div>
      <div className="mt-1 text-[13px] leading-relaxed text-[#5f5b54]">{request.prompt || 'Choose one of the options below. I will continue from the paused step without repeating completed work.'}</div>
      {connectError ? <div className="mt-2 text-[12px] text-[#b42318]">{connectError}</div> : null}
      {fields.length > 0 && (
        <div className="mt-3 space-y-3">
          {fields.map((field) => (
            <label key={field.id || field.name} className="block">
              <span className="text-[12px] font-semibold text-[#1a1a17]">{field.label || field.name}</span>
              <input
                type={field.type === 'email' ? 'email' : 'text'}
                value={values[field.name] || ''}
                onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                disabled={selected != null}
                className="mt-1 block w-full max-w-xl border-0 border-b border-[#bdb8b0] bg-transparent px-0 py-2 text-[13px] text-[#1a1a17] outline-none focus:border-[#117dff] disabled:opacity-50"
              />
            </label>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.id} type="button" disabled={selected != null || connecting}
            onClick={() => {
              if (isConnectOpenOption(option)) {
                openConnect(option);
                return;
              }
              setSelected(option.id);
              onContinue(continuation, request, option);
            }}
            className="inline-flex items-center gap-2 rounded-[4px] border border-[#bdb8b0] bg-transparent px-3.5 py-2 text-[12px] font-medium text-[#30302d] hover:border-[#117dff] hover:text-[#0066e0] disabled:opacity-50">
            {isConnectOpenOption(option) && banner?.logo ? <img src={banner.logo} alt="" className="h-4 w-4" /> : null}
            {option.label}
          </button>
        ))}
        {fields.length > 0 && (
          <button type="button" disabled={selected != null || !fieldsComplete}
            onClick={() => {
              setSelected('field-input');
              onContinue(continuation, request, { id: 'field-input', label: 'Continue', values });
            }}
            className="rounded-[4px] border border-[#0a0a0a] bg-[#0a0a0a] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#262626] disabled:opacity-40">
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Markdown-lite renderer ──────────────────────────────────────────────
// Same idea as HyperAgents.renderMarkdownLite but extended with:
//   • code fences (```)
//   • GitHub-style pipe tables (| a | b |\n|---|---|\n| c | d |)
//   • inline bold / italic / code / links
// Keeps the file dependency-free (no react-markdown).
export function inlineMd(s, keyPrefix = 'i') {
  if (!s) return null;
  const out = [];
  let rest = String(s);
  let k = 0;
  while (rest.length) {
    const patterns = [
      { re: /\*\*([^*]+)\*\*/, tag: 'b' },
      { re: /(?<!\*)\*([^*\n]+)\*(?!\*)/, tag: 'i' },
      { re: /`([^`]+)`/, tag: 'code' },
      { re: /\[([^\]]+)\]\(([^)]+)\)/, tag: 'a' },
    ];
    let first = null;
    for (const p of patterns) {
      const m = rest.match(p.re);
      if (m && (first === null || m.index < first.match.index)) first = { ...p, match: m };
    }
    if (!first) { out.push(rest); break; }
    if (first.match.index > 0) out.push(rest.slice(0, first.match.index));
    const v = first.match;
    if (first.tag === 'b') out.push(<strong key={`${keyPrefix}-b-${k++}`}>{v[1]}</strong>);
    else if (first.tag === 'i') out.push(<em key={`${keyPrefix}-i-${k++}`}>{v[1]}</em>);
    else if (first.tag === 'code') out.push(<code key={`${keyPrefix}-c-${k++}`} className="px-1 py-0.5 rounded bg-black/5 text-[13px] font-mono">{v[1]}</code>);
    else if (first.tag === 'a') out.push(
      <a key={`${keyPrefix}-a-${k++}`} href={v[2]} target="_blank" rel="noreferrer noopener"
         className="text-[#117dff] underline underline-offset-2 break-all">{v[1]}</a>
    );
    rest = rest.slice(v.index + v[0].length);
  }
  return out;
}

export function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}
export function isTableSep(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}
export function parseTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

export function renderMarkdownMobile(raw) {
  if (!raw) return null;
  const text = String(raw).replace(/^\s+|\s+$/g, '');
  const blocks = [];
  const lines = text.split(/\r?\n/);
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code fence
    if (/^```/.test(trimmed)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing fence
      blocks.push(
        <pre key={key++} className="my-2 p-2.5 rounded-lg bg-[#0a0a0a] text-[#e5e5e5] text-[12px] font-mono leading-relaxed overflow-x-auto">
          {buf.join('\n')}
        </pre>
      );
      continue;
    }

    if (!trimmed) { i++; continue; }

    // Table (header + separator + rows)
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = parseTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-2 -mx-1 overflow-x-auto">
          <table className="min-w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#f3f1ec]">
                {header.map((h, hx) => (
                  <th key={hx} className="text-left font-semibold px-2.5 py-1.5 border border-[#e3e0db]">{inlineMd(h, `th-${hx}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rx) => (
                <tr key={rx} className={rx % 2 ? 'bg-white' : 'bg-[#fafaf6]'}>
                  {r.map((c, cx) => (
                    <td key={cx} className="px-2.5 py-1.5 border border-[#e3e0db] align-top">{inlineMd(c, `td-${rx}-${cx}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Heading
    const h = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? 'text-[17px] font-bold mt-2 mb-1'
                : level === 2 ? 'text-[15px] font-bold mt-2 mb-1'
                : level === 3 ? 'text-[14px] font-semibold mt-1.5 mb-0.5'
                : 'text-[13px] font-semibold uppercase tracking-wider text-[#525252] mt-1 mb-0.5';
      blocks.push(<div key={key++} className={cls}>{inlineMd(h[2], `h-${key}`)}</div>);
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[*-]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[*-]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[*-]\s+/, ''));
        i++;
      }
      const myKey = key++;
      blocks.push(
        <ul key={myKey} className="list-disc pl-5 space-y-0.5 my-1">
          {items.map((it, ix) => <li key={ix}>{inlineMd(it, `li-${myKey}-${ix}`)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      const myKey = key++;
      blocks.push(
        <ol key={myKey} className="list-decimal pl-5 space-y-0.5 my-1">
          {items.map((it, ix) => <li key={ix}>{inlineMd(it, `ol-${myKey}-${ix}`)}</li>)}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="my-1.5 border-l-2 border-[#117dff]/40 pl-3 text-[#525252] italic">
          {inlineMd(buf.join(' '), `bq-${key}`)}
        </blockquote>
      );
      continue;
    }

    // Paragraph
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|\s*[*-]\s+|\s*\d+\.\s+|```|>\s?)/.test(lines[i]) &&
      !(isTableRow(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) blocks.push(<p key={key++} className="my-1 leading-relaxed">{inlineMd(para.join(' '), `p-${key}`)}</p>);
  }
  return blocks;
}

// Claude-style user turn: warm-grey rounded bubble, right-aligned, ink text.
export function UserBubble({ content }) {
  return (
    <div className="self-end max-w-[85%] px-4 py-2.5 rounded-[18px] bg-[#f0eee6] text-[#1a1a17] text-[15.5px] leading-relaxed break-words whitespace-pre-wrap">
      {content}
    </div>
  );
}

function pendingActionToDraft(action) {
  return {
    id: action?.id,
    provider: action?.provider,
    toolName: action?.toolName || action?.tool_name,
    toolArgs: action?.toolArgs || action?.tool_args || {},
    status: action?.status || 'draft',
    preview: action?.preview || null,
  };
}

const EMPTY_PENDING_ACTIONS = Object.freeze([]);

function firstDraftArg(args, names) {
  for (const name of names) {
    const value = args?.[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length) return value.join(', ');
  }
  return '';
}

export function draftPresentation(draft) {
  const args = draft?.toolArgs || {};
  const tool = String(draft?.toolName || '').toLowerCase();
  const email = tool.includes('gmail') || tool.includes('email');
  if (!email) return {
    kind: 'generic',
    fields: Object.entries(args)
      .filter(([name]) => name !== '_composio_slug')
      .map(([name, value]) => ({
        name: String(name).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      })),
  };
  return {
    kind: 'email',
    to: firstDraftArg(args, ['to', 'recipient_email', 'recipient', 'to_email', 'recipients']),
    subject: firstDraftArg(args, ['subject', 'email_subject', 'title']),
    body: firstDraftArg(args, ['body', 'message_body', 'email_body', 'message', 'text', 'content']),
    sends: tool.includes('send'),
  };
}

function actionHeading(presentation) {
  if (presentation.kind === 'email' && presentation.sends) return 'Email ready to send';
  if (presentation.kind === 'email') return 'Email ready for approval';
  return 'Action ready for your approval';
}

function actionButtonLabel(presentation) {
  if (presentation.kind === 'email' && presentation.sends) return 'Send email';
  return 'Approve and continue';
}

function actionSuccessLabel(presentation) {
  if (presentation.kind === 'email' && presentation.sends) return 'Email sent successfully.';
  if (presentation.kind === 'email') return 'Email draft created successfully.';
  return 'Action completed successfully.';
}

// One governed approval card shared by desktop and mobile. The chat response
// supplies exact immutable arguments immediately; the list request refreshes
// authoritative status when available.
export function MobileDraftCards({ draftIds, pendingActions }) {
  const suppliedActions = Array.isArray(pendingActions) ? pendingActions : EMPTY_PENDING_ACTIONS;
  const [drafts, setDrafts] = useState(() => suppliedActions.map(pendingActionToDraft));
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    const ids = Array.isArray(draftIds) && draftIds.length
      ? draftIds : suppliedActions.map((action) => action.id).filter(Boolean);
    if (!ids.length) return;
    setDrafts(suppliedActions.map(pendingActionToDraft));
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.controlPlane.get('/v1/proxy/pending-writes?limit=10').catch(() => ({ data: null }));
        const matched = (data?.drafts || []).filter(d => ids.includes(d.id));
        if (!cancelled && matched.length) setDrafts(matched);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [draftIds, suppliedActions]);
  const act = async (id, action) => {
    setBusy(id);
    try {
      const { data } = await apiClient.controlPlane.post(`/v1/proxy/pending-writes/${id}/${action}`, {});
      setDrafts(prev => prev.map(d => d.id === id ? (data?.draft || { ...d, status: data?.status || d.status }) : d));
    } catch (err) {
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'failed', errorMsg: err?.message } : d));
    } finally { setBusy(null); }
  };
  if (drafts.length === 0) return null;
  return (
    <div className="mt-5 space-y-7">
      {drafts.map(d => {
        const presentation = draftPresentation(d);
        const sent = d.status === 'sent';
        const cancelled = d.status === 'cancelled';
        const failed = d.status === 'failed';
        const pending = d.status === 'draft';
        const executing = d.status === 'approved';
        return (
          <section key={d.id} className={`text-[13px] ${cancelled ? 'opacity-60' : ''}`}>
            <h3 className="text-[15px] font-semibold text-[#1a1a17]">{actionHeading(presentation)}</h3>
            {pending && <p className="mt-1 text-[12.5px] leading-relaxed text-[#73706a]">Nothing has been executed yet. Review the exact details below, then approve or cancel.</p>}
            {presentation.kind === 'email' ? (
              <div className="mt-4 space-y-3 text-[#353535]">
                <div><strong className="font-semibold text-[#1a1a17]">To:</strong> <span className="break-all">{presentation.to || 'Not provided'}</span></div>
                <div><strong className="font-semibold text-[#1a1a17]">Subject:</strong> {presentation.subject || 'No subject'}</div>
                <div>
                  <div className="font-semibold text-[#1a1a17]">Message</div>
                  <div className="mt-1 max-h-96 overflow-y-auto whitespace-pre-wrap break-words text-[13.5px] leading-[1.65]">{presentation.body || 'No message body provided.'}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-[#353535]">
                {presentation.fields.map((field) => (
                  <div key={field.name}>
                    <div className="font-semibold text-[#1a1a17]">{field.name}</div>
                    <div className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">{field.value}</div>
                  </div>
                ))}
              </div>
            )}
            {failed && d.errorMsg && (
              <div className="mt-1.5 text-[11.5px] text-red-700">Error: {d.errorMsg}</div>
            )}
            {pending && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => act(d.id, 'approve')} disabled={busy === d.id}
                  className="rounded-[4px] border border-[#0a0a0a] bg-[#0a0a0a] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#262626] disabled:opacity-50">
                  {busy === d.id ? 'Working…' : actionButtonLabel(presentation)}
                </button>
                <button onClick={() => act(d.id, 'cancel')} disabled={busy === d.id}
                  className="rounded-[4px] border border-[#bdb8b0] bg-transparent px-4 py-2 text-[12px] font-medium text-[#525252] hover:border-[#77716a] disabled:opacity-50">
                  Cancel
                </button>
              </div>
            )}
            {executing && <div className="mt-2 text-[11.5px] text-amber-700">Executing the approved action…</div>}
            {sent && <div className="mt-2 text-[11.5px] text-emerald-700">✓ {actionSuccessLabel(presentation)}</div>}
            {cancelled && <div className="mt-2 text-[11.5px] text-[#737373]">Cancelled. Nothing was executed.</div>}
          </section>
        );
      })}
    </div>
  );
}

// Collapsed reasoning trace — Claude's clock-pill above the answer. Shows the
// last step's summary; taps open the full tool timeline.
export function StepsDisclosure({ steps }) {
  const [open, setOpen] = useState(false);
  const last = steps[steps.length - 1];
  const summary = (last && (last.result_summary || last.tool))
    ? String(last.result_summary || last.tool)
    : `Worked through ${steps.length} step${steps.length > 1 ? 's' : ''}`;
  return (
    <div className="mb-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 max-w-full text-[#8a8577] active:text-[#5f5c55]"
      >
        <Clock size={14} className="flex-shrink-0" />
        <span className="text-[14px] truncate">{open ? 'Reasoning' : summary}</span>
        <ChevronRight size={15} className={`flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2"
          >
            <div className="flex flex-col gap-1 border-l-2 border-[#ece9e2] pl-3">
              {steps.map((s, i) => (
                <div key={i} className="text-[12px] text-[#7b766e] flex items-baseline gap-1.5 flex-wrap">
                  <code className="bg-[#117dff]/10 text-[#0066e0] px-1.5 py-0.5 rounded text-[10.5px] font-mono">{s.tool}</code>
                  <span className="text-[#a3a3a3] italic">{
                    typeof s.args === 'object' && s.args && s.args.query
                      ? `"${String(s.args.query).slice(0, 44)}"`
                      : ''
                  }</span>
                  {s.result_summary && <span className="text-[#16a34a]">→ {s.result_summary}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Claude-style assistant turn: NO bubble. Reasoning pill → serif answer on the
// canvas → Sources pill → copy / retry / thumbs action row.
export function AiBubble({ msg, onRetry, onContinue, onProjectChoiceSaved, onFollowUp }) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState(null);
  const hasSteps = Array.isArray(msg.steps) && msg.steps.length > 0;
  const hasSources = Array.isArray(msg.sources) && msg.sources.length > 0;
  const followUps = [...new Set((Array.isArray(msg.follow_ups) ? msg.follow_ups : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))].slice(0, 3);

  const copy = async () => {
    try { await navigator.clipboard.writeText(msg.content || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard blocked */ }
  };

  return (
    <div className="self-start w-full max-w-full">
      {(msg.orchestration_events?.length || hasSteps) && (
        <OrchestrationReasoning events={msg.orchestration_events || []} steps={msg.steps || []} sealed />
      )}

      {msg.error && (
        <div className="flex items-center gap-2 text-[#b91c1c] text-[13px] font-medium mb-2">
          <AlertTriangle size={13} /> Error
        </div>
      )}

      <div
        className={`text-[16.5px] leading-[1.7] break-words space-y-2 ${msg.error ? 'text-[#b91c1c]' : 'text-[#1a1a17]'}`}
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {renderMarkdownMobile(msg.content)}
      </div>

      {Array.isArray(msg.scopes_found) && msg.scopes_found.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8a8577]">
          <span className="italic">Memory found in</span>
          {msg.scopes_found.map((sc, i) => {
            const isProject = typeof sc === 'string' && sc.startsWith('project:');
            const projName = isProject ? sc.slice(8).trim() : '';
            const label = sc === 'personal' ? 'My Space'
              : sc === 'organization' ? 'Org-wide'
                : sc === 'team' ? 'Team'
                  : sc === 'project' ? 'Project'
                    : isProject ? (projName ? `Project: ${projName}` : 'Project')
                      : sc;
            return (
              <span key={i} className="inline-flex items-center rounded-full border border-[#e3e0db] bg-[#f7f6f1] px-2 py-0.5 text-[10.5px] font-medium text-[#5f5c55]">
                {label}
              </span>
            );
          })}
        </div>
      )}

      <MobileDraftCards draftIds={msg.draft_ids} pendingActions={msg.pending_actions} />
      <ContinuationChoices continuation={msg.continuation} onContinue={onContinue} />

      {hasSources && (
        <div className="mt-3">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-[#e3e0db] bg-white px-3 py-1.5 text-[13px] text-[#3d3d3a] active:bg-[#f3f1ec]"
          >
            <FileText size={13} className="text-[#8a8577]" />
            Sources
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#f0eee6] text-[11px] font-medium text-[#5f5c55]">{msg.sources.length}</span>
            <ChevronRight size={14} className={`text-[#a3a3a3] transition-transform ${showSources ? 'rotate-90' : ''}`} />
          </button>
          <AnimatePresence>
            {showSources && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="flex flex-col gap-1.5">
                  {msg.sources.slice(0, 10).map((s, i) => (
                    <div key={i} className="text-[12px] bg-[#f7f6f1] border border-[#ece9e2] rounded-lg px-2.5 py-1.5">
                      <div className="font-semibold text-[#0a0a0a] text-[12px]">{s.title || 'Memory'}</div>
                      {(s.snippet || s.content) && (
                        <div className="text-[#525252] text-[11.5px] mt-0.5 line-clamp-2">{(s.snippet || s.content).slice(0, 160)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!msg.error && (
        <div className="mt-2.5 flex items-center gap-0.5 text-[#b3ada2]">
          <button onClick={copy} className="w-8 h-8 grid place-items-center rounded-full active:bg-[#f0eee6] active:text-[#5f5c55]" aria-label="Copy">
            {copied ? <Check size={16} className="text-[#16a34a]" /> : <Copy size={15} />}
          </button>
          <button onClick={() => onRetry && onRetry(msg)} className="w-8 h-8 grid place-items-center rounded-full active:bg-[#f0eee6] active:text-[#5f5c55]" aria-label="Retry">
            <RotateCcw size={15} />
          </button>
          <button onClick={() => setVote((v) => (v === 'up' ? null : 'up'))} className={`w-8 h-8 grid place-items-center rounded-full active:bg-[#f0eee6] ${vote === 'up' ? 'text-[#117dff]' : 'active:text-[#5f5c55]'}`} aria-label="Good response">
            <ThumbsUp size={15} />
          </button>
          <button onClick={() => setVote((v) => (v === 'down' ? null : 'down'))} className={`w-8 h-8 grid place-items-center rounded-full active:bg-[#f0eee6] ${vote === 'down' ? 'text-[#b91c1c]' : 'active:text-[#5f5c55]'}`} aria-label="Bad response">
            <ThumbsDown size={15} />
          </button>
        </div>
      )}

      {!msg.error && followUps.length > 0 && (
        <div className="mt-3 border-t border-[#e3e0db]" aria-label="Suggested follow-up questions">
          {followUps.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onFollowUp?.(question)}
              className="group flex w-full items-start gap-3 border-b border-[#ece9e2] px-1 py-3 text-left text-[13.5px] leading-5 text-[#3d3d3a] transition-colors hover:bg-[#faf9f4] active:bg-[#f3f1ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#117dff]/40"
            >
              <CornerDownRight size={16} className="mt-0.5 shrink-0 text-[#8a8577] transition-colors group-hover:text-[#117dff]" />
              <span>{question}</span>
            </button>
          ))}
        </div>
      )}

      {msg.project_choice && (
        <MobileProjectChoice
          choice={msg.project_choice}
          savedScope={msg.project_choice?.saved_scope}
          onSaved={(label) => onProjectChoiceSaved?.(msg.id, label)}
        />
      )}
    </div>
  );
}

// Scope picker (mobile) — the server returns a prepared canonical memory plus
// explicit destinations. A click completes that prepared save directly; it does
// not re-send the original statement and risk a second ambiguous planner turn.
//
// `savedScope`/`onSaved` persist the choice onto the message object itself
// (via the caller's messages state, not just local component state) — this
// component previously kept "saved" as local state only, so anything that
// re-rendered the surrounding message from scratch (streaming continuing,
// a page reload restoring chat from localStorage, etc.) lost the confirmed
// state and the option buttons reappeared as if nothing had been chosen.
export function MobileProjectChoice({ choice, savedScope, onSaved }) {
  const [saved, setSaved] = useState(savedScope || null);
  useEffect(() => { if (savedScope && savedScope !== saved) setSaved(savedScope); }, [savedScope]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const projects = choice?.projects || [];
  const scopeOptions = Array.isArray(choice?.scope_options) && choice.scope_options.length
    ? choice.scope_options
    : [{ scope: 'personal', label: 'Personal' }, { scope: 'organization', label: 'Organization' }];
  const draft = choice?.draft || null;
  if (!draft) return null;
  const save = async (label, extra) => {
    if (busy || saved) return;
    setBusy(true); setErr(null);
    try {
      await apiClient.createMemory({
        title: draft.title, content: draft.content, tags: draft.tags || [],
        memory_type: draft.memory_type || 'fact', ...extra,
      });
      setSaved(label);
      onSaved?.(label);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  if (saved) return <div className="mt-2 text-[12px] font-medium text-emerald-700">✓ Saved to {saved}</div>;
  const btn = 'px-3.5 py-2 text-[12px] rounded-[4px] border border-[#bdb8b0] bg-transparent active:border-[#117dff] active:text-[#117dff] disabled:opacity-50';
  return (
    <div className="mt-5">
      <div className="text-[14px] font-semibold text-[#1a1a17]">Choose where to save this memory</div>
      <div className="mt-1 text-[12.5px] leading-relaxed text-[#737373]">The memory is prepared but has not been saved. Choose its scope to finish.</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {scopeOptions.map((option) => (
          <button key={option.scope} type="button" onClick={() => save(option.label || option.scope, { scope: option.scope })} disabled={busy} className={btn}>
            {option.label || option.scope}
          </button>
        ))}
        {projects.map((p) => (
          <button key={p.id} type="button" onClick={() => save(p.name, { project_id: p.id })} disabled={busy} className={btn}>{p.name}</button>
        ))}
      </div>
      {err && <div className="text-[11px] text-red-600 mt-1">{err}</div>}
    </div>
  );
}

// Loading state — pulsing reasoning line + the LIVE tool calls the chat
// orchestration is running (streamed as SSE tool_call/tool_result events),
// animated in place like the desktop AgentActivity, but unboxed.
export function _activityLabel(ev) {
  const n = String(ev?.name || ev?.tool || '').replace(/^hivemind_/, '').replace(/_/g, ' ');
  if (ev?.type === 'plan') return 'planning the approach';
  if (ev?.type === 'tool_result') return n ? `${n} — done` : 'step done';
  return n ? `running ${n}` : 'working';
}

const PATIENCE_COPY = [
  'I’m tracing this through what we know',
  'I’m connecting the strongest pieces',
  'I’m checking the details before I answer',
  'I’m making sure the evidence tells one coherent story',
  'I’m turning what I found into a useful answer',
];

export function Thinking({ events = [] }) {
  const [elapsedStep, setElapsedStep] = useState(0);
  const [typed, setTyped] = useState('');
  useEffect(() => {
    const timer = window.setInterval(() => setElapsedStep((value) => value + 1), 3200);
    return () => window.clearInterval(timer);
  }, []);
  const rows = liveReasoningRows(events);
  const thought = PATIENCE_COPY[elapsedStep % PATIENCE_COPY.length];
  useEffect(() => {
    setTyped('');
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(thought.slice(0, index));
      if (index >= thought.length) window.clearInterval(timer);
    }, 24);
    return () => window.clearInterval(timer);
  }, [thought]);
  return (
    <div className="self-start w-full max-w-4xl">
      {rows.length > 0
        ? <OrchestrationReasoning events={rows.map((row, index) => ({ ...row, type: 'orchestration_step', step_id: row.step_id || `live-${index}`, index }))}
            sealed={false} label="Reasoning" defaultOpen />
        : <div className="inline-flex items-center gap-2 text-[#8b877f]">
            <Loader2 size={15} className="animate-spin text-[#117dff]" />
            <span className="text-[13px] font-medium">Reasoning</span>
          </div>}
      <motion.div key={thought} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="ml-6 mt-1 min-h-[20px] text-[12.5px] italic text-[#737373]" aria-live="polite">
        {typed}<span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-[#a3a3a3] animate-pulse" />
      </motion.div>
    </div>
  );
}
