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
  AlertTriangle, CheckCircle2, Loader2, ChevronDown, Brain, Sparkles,
} from 'lucide-react';
import apiClient from './api-client';
import { BRAND_LOGOS } from './connectors-catalog';

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

export function OrchestrationReasoning({ events = [], steps = [], sealed = true }) {
  const [open, setOpen] = useState(true);
  const rows = reasoningRows(events, steps);
  if (!rows.length) return null;
  return (
    <div className="max-w-4xl py-2 pr-2">
      <button type="button" onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 text-left text-[#8b877f] hover:text-[#5f5b54] transition-colors" aria-expanded={open}>
        {sealed ? <Clock size={15} /> : <Loader2 size={15} className="animate-spin text-[#117dff]" />}
        <span className="text-[13px] font-medium">Reasoning</span>
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
  const request = continuation?.requests?.[0];
  if (!request?.options?.length || !onContinue) return null;
  return (
    <div className="mt-3 rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-3">
      <div className="text-[12px] font-medium text-[#5f5b54]">{request.prompt || 'Choose one to continue'}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {request.options.map((option) => (
          <button key={option.id} type="button" disabled={selected != null}
            onClick={() => { setSelected(option.id); onContinue(continuation, request, option); }}
            className="rounded-full border border-[#d8d4cc] bg-white px-3 py-1.5 text-[12px] font-medium text-[#30302d] hover:border-[#117dff] hover:text-[#0066e0] disabled:opacity-50">
            {option.label}
          </button>
        ))}
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

// Mobile draft-approval cards. Same backend contract as desktop:
// fetches pending_writes by id, surfaces Approve/Cancel buttons.
export function MobileDraftCards({ draftIds }) {
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    if (!Array.isArray(draftIds) || draftIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.controlPlane.get('/v1/proxy/pending-writes?limit=10').catch(() => ({ data: null }));
        const matched = (data?.drafts || []).filter(d => draftIds.includes(d.id));
        if (!cancelled) setDrafts(matched);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [draftIds]);
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
    <div className="mt-3 space-y-2">
      {drafts.map(d => {
        const sent = d.status === 'sent';
        const cancelled = d.status === 'cancelled';
        const failed = d.status === 'failed';
        const pending = d.status === 'draft' || d.status === 'approved';
        const tone = sent ? 'border-emerald-200 bg-emerald-50' :
                     cancelled ? 'border-[#e3e0db] bg-[#fafaf6] opacity-70' :
                     failed ? 'border-red-200 bg-red-50' :
                     'border-amber-200 bg-amber-50';
        return (
          <div key={d.id} className={`rounded-xl border ${tone} p-3 text-[12.5px]`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#525252]">{d.provider}/{d.toolName}</span>
              <span className={`text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                sent ? 'bg-emerald-500/15 text-emerald-700' :
                cancelled ? 'bg-[#a3a3a3]/15 text-[#525252]' :
                failed ? 'bg-red-500/15 text-red-700' :
                'bg-amber-500/15 text-amber-700'
              }`}>{d.status}</span>
            </div>
            <div className="text-[#525252] leading-snug break-words">{d.preview || JSON.stringify(d.toolArgs)}</div>
            {failed && d.errorMsg && (
              <div className="mt-1.5 text-[11.5px] text-red-700">Error: {d.errorMsg}</div>
            )}
            {pending && (
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => act(d.id, 'approve')} disabled={busy === d.id}
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-[#0a0a0a] text-white active:bg-[#262626] disabled:opacity-50">
                  {busy === d.id ? 'Sending…' : 'Approve & Send'}
                </button>
                <button onClick={() => act(d.id, 'cancel')} disabled={busy === d.id}
                  className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-[#e3e0db] text-[#525252] active:bg-[#f3f1ec] disabled:opacity-50">
                  Cancel
                </button>
              </div>
            )}
            {sent && <div className="mt-1 text-[11.5px] text-emerald-700">✓ Sent successfully.</div>}
          </div>
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
export function AiBubble({ msg, onRetry, onContinue }) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState(null);
  const hasSteps = Array.isArray(msg.steps) && msg.steps.length > 0;
  const hasSources = Array.isArray(msg.sources) && msg.sources.length > 0;

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

      <MobileDraftCards draftIds={msg.draft_ids} />
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

      {msg.project_choice && <MobileProjectChoice choice={msg.project_choice} />}
    </div>
  );
}

// Project picker (mobile) — Org-wide + each project; click → silent scoped save.
export function MobileProjectChoice({ choice }) {
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const projects = choice?.projects || [];
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
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  if (saved) return <div className="mt-2 text-[12px] font-medium text-emerald-700">✓ Saved to {saved}</div>;
  const btn = 'px-3 py-1.5 text-[12px] rounded-full border border-[#e3e0db] active:border-[#117dff] active:text-[#117dff] disabled:opacity-50';
  return (
    <div className="mt-2">
      <div className="text-[12px] text-[#737373] mb-1.5">Save this to:</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => save('Org-wide', { scope: 'organization' })} disabled={busy} className={btn}>🌐 Org-wide</button>
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
export function Thinking({ events = [] }) {
  const hasOrchestration = events.some((event) => event?.type === 'orchestration_step');
  if (hasOrchestration) return <OrchestrationReasoning events={events} sealed={false} />;
  const visible = (events || []).slice(-4);
  return (
    <div className="self-start flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[#8a8577]">
        <Clock size={14} className="animate-pulse" />
        <span className="text-[14px]">Thinking…</span>
      </div>
      {visible.map((ev) => {
        const complete = ev?.type === 'tool_result';
        return (
          <motion.div key={ev?.id || `${ev?.type}-${ev?.name}`}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: complete ? 0.55 : 1, x: 0 }}
            className="flex items-center gap-2 pl-5 text-[12px] text-[#6b6b66]">
            {complete
              ? <CheckCircle2 size={12} className="text-[#16a34a]" />
              : <Loader2 size={12} className="animate-spin text-[#117dff]" />}
            <span className="font-mono text-[11px]">{_activityLabel(ev)}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
