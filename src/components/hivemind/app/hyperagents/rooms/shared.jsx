// Shared room-render components — extracted from HyperAgents.jsx (P1 de-bloat).
// Pure render/report pieces used across every room kind: final report card,
// swarm rounds, agent bubbles, evidence + artifact modals, markdown/mermaid.
// Zero behavior change — moved verbatim, only `export` added.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Plus, Sparkles, Send, Users, Hash, X, Archive, Globe, FolderOpen, ChevronDown,
  AlertTriangle, Loader2, Trash2, Eraser, RotateCcw,
  Network, Shield, Crown, Lightbulb, MessageCircle, Check,
  Clock, LayoutGrid, Zap, CheckCheck,
  Swords, Gavel, Scale, Coffee, History, ClipboardCheck, ListChecks, Search, Layers,
  UserPlus, LogOut, ExternalLink, Brain, Tag, FileText, Boxes, Paperclip,
  ArrowLeft, ArrowRight, ArrowUpRight, Target, Eye, Pencil, PhoneCall,
  User, Gauge, CreditCard, Settings, Building2, Megaphone, Rocket, MapPin, Mail,
} from 'lucide-react';
import apiClient from '../../shared/api-client';
import { BRAND_LOGOS } from '../../shared/connectors-catalog';
import { FENCE_ELEMENTS, Callout, TimelineBlock, ChartBlock, StatRow, Steps } from './elements';
export { Callout, TimelineBlock, ChartBlock, StatRow, Steps };

export const LANE_META = {
  Strategist:   { icon: Crown,      color: '#a855f7', bg: 'rgba(168,85,247,0.10)', label: 'Strategist' },
  Builder:      { icon: Network,    color: '#117dff', bg: 'rgba(17,125,255,0.10)', label: 'Builder' },
  Skeptic:      { icon: Shield,     color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Skeptic' },
  Researcher:   { icon: Lightbulb,  color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Researcher' },
  Communicator: { icon: MessageCircle, color: '#ec4899', bg: 'rgba(236,72,153,0.10)', label: 'Communicator' },
};
export const AGREEMENT_META = {
  agree:     { emoji: '👍', label: 'agree',     color: '#117dff', bg: 'rgba(17,125,255,0.08)' },
  extend:    { emoji: '➕', label: 'extend',    color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  challenge: { emoji: '⚠️', label: 'challenge', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
};

export function FinalReportCard({ report, webSources = [], onOpenMemory }) {
  const { t } = useTranslation('dashboard');
  if (!report?.content) return null;
  const verdict = String(report.verdict || report.status || '').toUpperCase();
  const goalProgress = report.goal_progress && typeof report.goal_progress === 'object' ? report.goal_progress : null;
  const evidence = Array.isArray(report.evidence) ? report.evidence.filter(e => e?.id) : [];
  const sources = [
    ...(Array.isArray(report.sources) ? report.sources : []),
    ...(Array.isArray(webSources) ? webSources : []),
  ].filter((src, index, arr) => {
    const key = src?.url || src?.title || index;
    return key && arr.findIndex(s => (s?.url || s?.title) === key) === index;
  }).slice(0, 8);
  const tone = verdict.includes('AGREED') || verdict.includes('RESOLVED') || verdict.includes('COMPLETE')
    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700'
    : verdict.includes('CONDITIONAL') || verdict.includes('ESCALATED')
      ? 'border-amber-200 bg-amber-50/50 text-amber-700'
      : 'border-[#e3e0db] bg-white text-[#525252]';
  return (
    <div className="mx-2 my-3 rounded-lg border border-[#d7d2ca] bg-white shadow-sm overflow-hidden">
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${tone}`}>
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardCheck size={14} className="shrink-0" />
          <span className="text-[10px] font-mono uppercase tracking-wider truncate">
            {t('hyperAgents.finalReport', 'Final report')}
          </span>
        </div>
        {verdict && (
          <span className="text-[9px] font-mono uppercase tracking-wider shrink-0">
            {verdict}{report.weighted_score != null ? ` · ${report.weighted_score}` : ''}
          </span>
        )}
      </div>
      <div className="px-3 py-3 text-[12px] leading-relaxed text-[#0a0a0a]">
        {goalProgress && (
          <div className="mb-3 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#117dff]">
                  {t('hyperAgents.goalProgress', 'Goal progress')}
                </div>
                <div className="mt-0.5 text-[12px] font-semibold text-[#0f172a] truncate">
                  {goalProgress.label || goalProgress.status || t('hyperAgents.goalProgressStatus', 'Progress')}
                </div>
              </div>
              {goalProgress.score != null && (
                <div className="shrink-0 text-[18px] font-bold text-[#117dff] font-['Space_Grotesk']">
                  {goalProgress.score}<span className="text-[10px] text-[#64748b]">/100</span>
                </div>
              )}
            </div>
            {goalProgress.summary && (
              <div className="mt-1.5 text-[10.5px] text-[#475569] leading-snug">
                {goalProgress.summary}
              </div>
            )}
          </div>
        )}
        {renderMarkdownLite(report.content)}
        {(evidence.length > 0 || sources.length > 0) && (
          <div className="mt-3 space-y-3 border-t border-[#e3e0db] pt-3">
            {evidence.length > 0 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#737373] mb-1.5">
                  {t('hyperAgents.reportMemories', 'Memory evidence')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {evidence.map((mem) => (
                    <button
                      key={mem.id}
                      type="button"
                      onClick={() => onOpenMemory?.(mem.id)}
                      className="max-w-full inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 text-[10.5px] font-medium transition-colors"
                      title={mem.snippet || mem.title || t('hyperAgents.openMemoryEvidence', 'Open memory evidence')}
                    >
                      <Brain size={11} className="shrink-0" />
                      <span className="truncate max-w-[220px]">{mem.title || t('hyperAgents.memoryEvidence', 'Memory evidence')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sources.length > 0 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#737373] mb-1.5">
                  {t('hyperAgents.reportSources', 'Web sources')}
                </div>
                <div className="grid gap-1.5">
                  {sources.map((src, i) => {
                    const href = src.url || '';
                    const body = (
                      <>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Globe size={11} className="text-[#117dff] shrink-0" />
                          <span className="truncate font-semibold">{src.title || href || t('hyperAgents.webSource', 'Web source')}</span>
                          {href && <ExternalLink size={10} className="text-[#a3a3a3] shrink-0" />}
                        </div>
                        {src.snippet && <div className="mt-0.5 text-[10px] text-[#737373] line-clamp-2">{src.snippet}</div>}
                      </>
                    );
                    return href ? (
                      <a
                        key={`${href}-${i}`}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-2.5 py-2 text-[11px] text-[#0f172a] hover:border-[#117dff]/40 transition-colors"
                      >
                        {body}
                      </a>
                    ) : (
                      <div key={`source-${i}`} className="rounded-lg border border-[#e3e0db] bg-[#faf9f4] px-2.5 py-2 text-[11px] text-[#0f172a]">
                        {body}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Mermaid diagram (lazy, sandboxed, fail-safe) ─────────────────────
 * Renders a ```mermaid block in the synthesis as a real diagram. mermaid is
 * lazy-imported (own chunk — no main-bundle bloat) and rendered with
 * securityLevel:'strict' (mermaid sanitizes its own SVG, so the
 * dangerouslySetInnerHTML is safe). ANY parse/render failure falls back to the
 * raw code in a <pre> — a malformed diagram never breaks the report.
 */
// Repair the common invalid-mermaid the LLM emits so a near-valid diagram still renders.
// gantt is the frequent offender: `parallel <id>` is not a mermaid keyword, and a task line
// needs a SPACE before its `:id,` metadata (`check:d3` → `check :d3`). Conservative — only
// touches task lines, leaves valid diagrams unchanged.
export function sanitizeMermaid(code) {
  let s = String(code || '').trim();
  const lines = s.split('\n');
  if (!/^\s*gantt\b/.test(lines[0] || '')) return s;
  return lines.map((ln) => {
    if (/^\s*(gantt|dateFormat|title|section|excludes|axisFormat|todayMarker|tickInterval|weekday)\b/.test(ln)) return ln;
    let l = ln;
    l = l.replace(/([^\s:]):([A-Za-z][\w-]*\s*,)/, '$1 :$2');   // ensure space before metadata colon
    l = l.replace(/\bparallel\s+([A-Za-z][\w-]*)/g, 'after $1'); // `parallel X` (invalid) → `after X`
    return l;
  }).join('\n');
}

export function MermaidDiagram({ code }) {
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'inherit' });
      const raw = String(code || '').trim();
      // Try the raw diagram first, then a sanitized repair — only fall back to <pre> if both fail.
      for (const candidate of [raw, sanitizeMermaid(raw)]) {
        const id = 'mmd-' + Math.random().toString(36).slice(2, 10);
        try {
          const { svg: out } = await mermaid.render(id, candidate);
          if (alive) setSvg(out);
          return;
        } catch (e) {
          // mermaid v10 leaves a temp/error node ("Syntax error in text") in the DOM on failure — purge it.
          [id, 'd' + id].forEach((x) => document.getElementById(x)?.remove());
        }
      }
      if (alive) setFailed(true);
    })();
    return () => { alive = false; };
  }, [code]);
  if (failed) {
    return (
      <pre className="my-2 overflow-x-auto rounded-md border border-[#e3e0db] bg-[#faf9f4] p-2 text-[11px] font-mono text-[#525252] whitespace-pre">
        {code}
      </pre>
    );
  }
  if (!svg) {
    return <div className="my-2 text-[11px] text-[#a3a3a3] italic">rendering diagram…</div>;
  }
  // eslint-disable-next-line react/no-danger -- svg sanitized by mermaid securityLevel:'strict'
  return <div className="mermaid-diagram my-2 overflow-x-auto rounded-md border border-[#e3e0db] bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/* ─── Mermaid → PNG (base64, no data: prefix) for email attachments ─────
 * Client-side render (same mermaid the room uses) → SVG → canvas → PNG.
 * Returns null on any failure — a diagram must never block a send. */
async function mermaidPngB64(code) {
  try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'inherit' });
    let svg = null;
    for (const candidate of [String(code || '').trim(), sanitizeMermaid(String(code || '').trim())]) {
      const id = 'mmdx-' + Math.random().toString(36).slice(2, 10);
      try { ({ svg } = await mermaid.render(id, candidate)); break; }
      catch { [id, 'd' + id].forEach((x) => document.getElementById(x)?.remove()); }
    }
    if (!svg) return null;
    const vb = svg.match(/viewBox="([\d.\s-]+)"/);
    const p = vb ? vb[1].trim().split(/\s+/).map(Number) : [];
    const w0 = p[2] || 900; const h0 = p[3] || 500;
    const w = Math.min(1600, Math.max(480, Math.ceil(w0)));
    const h = Math.max(120, Math.ceil(h0 * (w / w0)));
    const img = new Image();
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = w * 2; canvas.height = h * 2;
    const c2 = canvas.getContext('2d');
    c2.fillStyle = '#ffffff'; c2.fillRect(0, 0, canvas.width, canvas.height);
    c2.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1] || null;
  } catch { return null; }
}

/* ─── In-app artifact preview popup (hivemind-popup style: sharp corners) ───
 * Previews ANY textual artifact (email draft / doc / notion body) rendered as
 * the room renders it — without redirecting to Google. Email drafts get a
 * pencil edit toggle + a one-click Send (mermaid blocks are client-rendered
 * to PNG and attached; the send itself is the human approval). */
export function ArtifactPreviewModal({ preview, roomId, onClose }) {
  const { t } = useTranslation('dashboard');
  const isEmail = preview?.kind === 'email';
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(preview?.body_md || '');
  const [to, setTo] = useState(preview?.to || '');
  const [subject, setSubject] = useState(preview?.subject || preview?.title || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  if (!preview) return null;
  const logo = BRAND_LOGOS[preview.connector] || BRAND_LOGOS.gmail;
  const canSend = isEmail && to.trim() && subject.trim() && body.trim() && !sending && !sent;

  const doSend = async () => {
    if (!canSend) return;
    setSending(true); setError('');
    try {
      // Client-render every mermaid block → PNG attachment (bounded 6, same as backend).
      const codes = [...body.matchAll(/```mermaid\n?([\s\S]*?)```/g)].map((m) => m[1]).slice(0, 6);
      const attachments = [];
      for (let i = 0; i < codes.length; i++) {
        const b64 = await mermaidPngB64(codes[i]);
        if (b64) attachments.push({ filename: `diagram-${i + 1}.png`, mime: 'image/png', data_b64: b64 });
      }
      await apiClient.sendHyperRoomEmail(roomId, {
        to: to.trim(), subject: subject.trim(), bodyMd: body,
        attachments, approvalId: preview.approval_id || null,
      });
      setSent(true);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'send failed');
    } finally { setSending(false); }
  };

  return (
    <AnimatePresence>
      <motion.div key="apm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#1a1814]/45 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="bg-white rounded-none w-full max-w-[880px] max-h-[88vh] flex flex-col border border-[#e3e0db] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          {/* header */}
          <div className="px-6 py-4 flex items-center gap-3 border-b border-[#e3e0db]">
            <div className="w-10 h-10 rounded-none flex items-center justify-center bg-[#117dff]/10 border border-[#117dff]/20 shrink-0">
              {logo ? <img src={logo} alt="" className="w-5 h-5" /> : <FileText size={18} className="text-[#117dff]" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#737373]">
                {isEmail ? t('hyperAgents.previewEmail', 'Email draft — preview') : t('hyperAgents.previewArtifact', 'Artifact — preview')}
              </div>
              <div className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] truncate">
                {subject || preview.title || 'Draft'}
              </div>
            </div>
            {isEmail && !sent && (
              <button type="button" onClick={() => setEditing((v) => !v)}
                title={t('hyperAgents.previewEdit', 'Edit the draft')}
                className={`w-9 h-9 rounded-none flex items-center justify-center border transition-colors ${editing ? 'bg-[#117dff] border-[#117dff] text-white' : 'border-[#e3e0db] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#faf9f4]'}`}>
                <Pencil size={14} />
              </button>
            )}
            <button type="button" onClick={onClose}
              className="w-9 h-9 rounded-none flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#faf9f4]">
              <X size={16} />
            </button>
          </div>
          {/* email meta */}
          {isEmail && (
            <div className="px-6 py-2.5 border-b border-[#e3e0db] bg-[#faf9f4] grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 items-center">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#737373]">{t('hyperAgents.previewTo', 'To')}</span>
              {editing
                ? <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com"
                    className="h-8 px-2.5 text-[12.5px] bg-white border border-[#e3e0db] rounded-none focus:outline-none focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/15" />
                : <span className={`text-[12.5px] ${to ? 'text-[#0a0a0a]' : 'text-amber-600'}`}>{to || t('hyperAgents.previewNoRecipient', 'no recipient yet — click the pencil to add one')}</span>}
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#737373]">{t('hyperAgents.previewSubject', 'Subject')}</span>
              {editing
                ? <input value={subject} onChange={(e) => setSubject(e.target.value)}
                    className="h-8 px-2.5 text-[12.5px] bg-white border border-[#e3e0db] rounded-none focus:outline-none focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/15" />
                : <span className="text-[12.5px] text-[#0a0a0a] truncate">{subject}</span>}
            </div>
          )}
          {/* body */}
          <div className="px-6 py-4 overflow-y-auto min-h-0 flex-1">
            {editing
              ? <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16}
                  className="w-full text-[12.5px] font-mono leading-relaxed px-3 py-2.5 bg-[#faf9f4] border border-[#e3e0db] rounded-none focus:outline-none focus:bg-white focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/15 resize-y" />
              : <div className="text-[13px] text-[#262626] leading-relaxed">{renderMarkdownLite(body)}</div>}
          </div>
          {/* footer */}
          <div className="px-6 py-3.5 border-t border-[#e3e0db] flex items-center justify-between gap-3">
            <div className="text-[11px] text-[#737373] min-w-0 truncate">
              {error ? <span className="text-red-600">{error}</span>
                : sent ? <span className="text-emerald-600 font-medium">{t('hyperAgents.previewSent', 'Sent ✓ — delivered via Gmail')}</span>
                : isEmail ? t('hyperAgents.previewSendHint', 'Sending is the approval — diagrams are attached as images, the body is delivered as polished HTML.')
                : (preview.url ? t('hyperAgents.previewOpenHint', 'Read-only preview of the produced artifact.') : '')}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {preview.url && (
                <a href={preview.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-none border border-[#e3e0db] text-[12px] text-[#525252] hover:text-[#0a0a0a] hover:bg-[#faf9f4]">
                  <ExternalLink size={13} /> {t('hyperAgents.previewOpen', 'Open')}
                </a>
              )}
              {isEmail && (
                <button type="button" onClick={doSend} disabled={!canSend}
                  title={!to.trim() ? t('hyperAgents.previewNeedTo', 'Add a recipient first (pencil)') : ''}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-none bg-[#117dff] text-white text-[12.5px] font-['Space_Grotesk'] font-semibold shadow-[0_4px_14px_rgba(17,125,255,0.32)] hover:bg-[#0066e0] active:scale-95 disabled:opacity-40 disabled:shadow-none transition-all">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : sent ? <CheckCheck size={14} /> : <Send size={14} />}
                  {sent ? t('hyperAgents.previewSentBtn', 'Sent') : t('hyperAgents.previewSend', 'Send')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Markdown-lite renderer ───────────────────────────────────────────
 * Just enough to make lead reports look like a clean Slack message.
 * Headers, lists, bold, inline code, tables, and ```mermaid diagrams. No full markdown engine.
 */
export function renderMarkdownLite(raw) {
  if (!raw) return null;
  const text = String(raw).replace(/^\s+|\s+$/g, '');
  const blocks = [];
  const lines = text.split(/\r?\n/);
  let i = 0;
  let key = 0;

  const fmt = (seg, out, kp) => {
    let rest = seg;
    let mIdx = 0;
    while (rest.length) {
      const b = rest.match(/\*\*([^*]+)\*\*/);
      const it = rest.match(/`([^`]+)`/);
      const first = [b, it].filter(Boolean).sort((a, c) => a.index - c.index)[0];
      if (!first) { out.push(rest); break; }
      if (first.index > 0) out.push(rest.slice(0, first.index));
      if (first === b) out.push(<strong key={`${kp}b-${mIdx++}`}>{b[1]}</strong>);
      else out.push(<code key={`${kp}c-${mIdx++}`} className="px-1 py-0.5 rounded bg-black/5 text-[12px] font-mono">{it[1]}</code>);
      rest = rest.slice(first.index + first[0].length);
    }
  };
  // inline: handle **bold**, `code`, and <br> (LLMs emit literal <br> inside table cells)
  const inline = (s) => {
    const segs = String(s == null ? '' : s).split(/<br\s*\/?>/i);
    const out = [];
    segs.forEach((seg, si) => {
      if (si > 0) out.push(<br key={`br-${si}`} />);
      fmt(seg, out, `s${si}-`);
    });
    return out;
  };
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l || '');
  const isTableSep = (l) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l || '') && (l || '').includes('-');
  const splitRow = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }
    // Fenced code block ```lang … ``` — render ```mermaid as a real diagram, else a <pre>.
    const fence = trimmed.match(/^`{3,}\s*([a-zA-Z0-9_-]*)\s*$/);
    if (fence) {
      const lang = (fence[1] || '').toLowerCase();
      i++;
      const buf = [];
      while (i < lines.length && !/^`{3,}\s*$/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      if (i < lines.length) i++;  // consume closing fence
      const code = buf.join('\n');
      if (lang === 'mermaid') {
        blocks.push(<MermaidDiagram key={key++} code={code} />);
      } else if (FENCE_ELEMENTS[lang]) {
        const El = FENCE_ELEMENTS[lang];
        blocks.push(<El key={key++} raw={code} />);
      } else {
        blocks.push(
          <pre key={key++} className="my-2 overflow-x-auto rounded-md border border-[#e3e0db] bg-[#faf9f4] p-2 text-[11px] font-mono text-[#262626] whitespace-pre">{code}</pre>,
        );
      }
      continue;
    }
    // Callout — `> [!important] text` (+ continuation `>` lines) → styled block.
    const co = trimmed.match(/^>\s*\[!(important|insight|risk|note)\]\s*(.*)$/i);
    if (co) {
      const kind = co[1].toLowerCase();
      const buf = [co[2] || ''];
      i++;
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      blocks.push(<Callout key={key++} kind={kind} text={buf.join('\n').trim()} inline={inline} />);
      continue;
    }
    // Heading
    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? 'text-[14px] font-bold mt-2 mb-1'
                : level === 2 ? 'text-[13px] font-bold mt-2 mb-1'
                : 'text-[12px] font-semibold uppercase tracking-wider text-[#525252] mt-1.5 mb-0.5';
      blocks.push(<div key={key++} className={cls}>{inline(h[2])}</div>);
      i++;
      continue;
    }
    // Table — a "| a | b |" row followed by a "|---|---|" separator → real <table>.
    if (isTableRow(line) && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2; // consume header + separator
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      blocks.push(
        <div key={key++} className="my-2 overflow-x-auto rounded-md border border-[#e3e0db]">
          <table className="w-full text-[11.5px] border-collapse">
            <thead>
              <tr>{header.map((hc, hi) => (
                <th key={hi} className="text-left font-semibold text-[#0a0a0a] bg-[#f3f1ec] border-b border-[#e3e0db] px-2.5 py-1.5 align-top">{inline(hc)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((cells, ri) => (
                <tr key={ri} className={ri % 2 ? 'bg-[#faf9f4]' : 'bg-white'}>
                  {cells.map((c, ci) => (
                    <td key={ci} className="border-t border-[#ece9e3] px-2.5 py-1.5 align-top text-[#262626] leading-relaxed">{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    // Bullet list
    if (/^\s*[*-]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[*-]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[*-]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-0.5 my-1">
          {items.map((it, ix) => <li key={ix}>{inline(it)}</li>)}
        </ul>,
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
      blocks.push(
        <ol key={key++} className="list-decimal pl-5 space-y-0.5 my-1">
          {items.map((it, ix) => <li key={ix}>{inline(it)}</li>)}
        </ol>,
      );
      continue;
    }
    // Paragraph
    const para = [];
    while (i < lines.length && lines[i].trim()
           && !/^(#{1,3}\s|\s*[*-]\s+|\s*\d+\.\s+)/.test(lines[i])
           && !isTableRow(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push(<p key={key++} className="my-1 leading-relaxed">{inline(para.join(' '))}</p>);
  }
  return blocks;
}

/* ─── Swarm R1-R5 renderer (Phase 4) ──────────────────────────────────── */

export function EvidenceChip({ id, onClick }) {
  const { t } = useTranslation('dashboard');
  if (!id) return null;
  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f3f1ec] text-[#525252] hover:bg-violet-100 hover:text-violet-700 transition-colors cursor-pointer"
      title={t('hyperAgents.openMemory', 'Open memory {{id}}', { id })}
    >
      m·{String(id).slice(0, 8)}
    </button>
  );
}

export function EvidenceModal({ memoryId, onClose }) {
  const { t } = useTranslation('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null); setData(null);
    apiClient.getMemory(memoryId)
      .then((res) => { if (!cancelled) setData(res?.memory || res); })
      .catch((e) => { if (!cancelled) setErr(e?.response?.data?.error || e?.message || 'load failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memoryId]);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm lg:hidden" />
      <div
        className="absolute inset-y-0 right-0 w-full max-w-lg bg-[#faf9f4] border-l border-[#e3e0db] shadow-2xl flex flex-col animate-slideInRight"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-[#e3e0db] flex items-center justify-between bg-[#faf9f4]">
          <div className="flex items-center gap-2 min-w-0">
            <Brain size={16} className="text-[#117dff] shrink-0" />
            <span className="text-[14px] font-bold text-[#0a0a0a] font-['Space_Grotesk'] truncate">
              {t('hyperAgents.memoryPreview', 'Memory preview')}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f1ec] text-[#525252] hover:text-[#0a0a0a]">
            <X size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-[12px] text-[#a3a3a3]">
              <Loader2 size={13} className="animate-spin" /> {t('hyperAgents.loading', 'Loading...')}
            </div>
          )}
          {err && <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
          {data && (
            <>
              <h3 className="text-[18px] font-bold text-[#0a0a0a] font-['Space_Grotesk'] leading-snug">
                {data.title || t('hyperAgents.untitledMemory', 'Untitled memory')}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {data.memory_type && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
                    <FileText size={10} /> {data.memory_type}
                  </span>
                )}
                {(data.source || data.source_platform || data.source_metadata?.source_platform) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200">
                    <Globe size={10} /> {data.source || data.source_platform || data.source_metadata?.source_platform}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                  {t('hyperAgents.content', 'Content')}
                </label>
                <div className="bg-white border border-[#e3e0db] rounded-xl p-4 text-[#525252] text-sm leading-relaxed whitespace-pre-wrap">
                  {data.content || t('hyperAgents.noContent', 'No content')}
                </div>
              </div>
              {(data.tags || []).length > 0 && (
                <div>
                  <label className="block text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1.5">
                    {t('hyperAgents.tags', 'Tags')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(data.tags || []).slice(0, 30).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#e3e0db] text-[10px] text-[#525252]">
                        <Tag size={9} /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DeepSimulationPanel({
  ontology,
  workforceAssessment,
  flybyProposal,
  flybyDecision,
  flybyJoined,
  flybySkipped,
  simulationPhases,
  simulationClaims,
  peerReviews = [],
  participants,
  onFlybyDecision,
  busy,
  archived,
}) {
  const { t } = useTranslation('dashboard');
  const requiredRoles = ontology?.required_roles || [];
  const missingRoles = workforceAssessment?.missing_roles || flybyProposal?.missing_roles || [];
  const coverage = workforceAssessment?.coverage || {};
  const spec = flybyProposal?.spec;
  const resolved = !!flybyDecision || !!flybyJoined || !!flybySkipped;

  return (
    <div className="ml-2 mr-2 space-y-2 border-l-2 border-blue-200 pl-3">
      {(ontology || workforceAssessment) && (
        <div className="rounded-md border border-[#e3e0db] bg-white px-3 py-2">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-blue-700">
            <Search size={11} /> {t('hyperAgents.deepSimAssess', 'Simulation assessment')}
          </div>
          {requiredRoles.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {requiredRoles.map(role => {
                const covered = (coverage[role] || []).length > 0;
                return (
                  <span
                    key={role}
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-mono ${
                      covered ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                    title={(coverage[role] || []).join(', ') || t('hyperAgents.noCoverage', 'No current employee covers this lens')}
                  >
                    {role}{covered ? ` · ${(coverage[role] || []).join(', ')}` : ' · gap'}
                  </span>
                );
              })}
            </div>
          )}
          {missingRoles.length > 0 && (
            <div className="mt-1 text-[10px] text-[#737373]">
              {t('hyperAgents.missingRoles', 'Missing lens: {{roles}}', { roles: missingRoles.join(', ') })}
            </div>
          )}
        </div>
      )}

      {flybyProposal && spec && (
        <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-white text-blue-700 flex items-center justify-center shrink-0">
              <UserPlus size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[#0a0a0a]">
                {spec.name || spec.slug}
                <span className="ml-1 text-[9px] font-mono uppercase tracking-wider text-blue-700">
                  {spec.role || 'flyby'}
                </span>
              </div>
              <div className="text-[11px] text-[#525252] mt-0.5">{flybyProposal.reason || spec.reason}</div>
              {!archived && !resolved && (
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onFlybyDecision?.('agree', spec)}
                    className="h-7 px-2.5 rounded bg-[#0a0a0a] text-white text-[10px] font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    {t('hyperAgents.agreeFlyby', 'Agree')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onFlybyDecision?.('disagree', spec)}
                    className="h-7 px-2.5 rounded border border-[#d4d0ca] bg-white text-[#525252] text-[10px] font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <X size={11} /> {t('hyperAgents.disagreeFlyby', 'Disagree')}
                  </button>
                </div>
              )}
              {resolved && (
                <div className="mt-1 text-[10px] font-mono text-blue-700">
                  {flybyJoined ? t('hyperAgents.flybyJoined', 'flyby joined') : t('hyperAgents.flybySkipped', 'flyby skipped')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(simulationPhases.length > 0 || simulationClaims.length > 0) && (
        <div className="space-y-1">
          {simulationPhases.slice(-3).map((p, i) => (
            <div key={`${p.phase}-${i}`} className="text-[9px] font-mono uppercase tracking-wider text-[#737373] pl-1">
              {p.label || p.phase}
            </div>
          ))}
          {simulationClaims.map((claim, i) => {
            const agent = participants[claim.agent] || { slug: claim.agent, lane: claim.lane || 'Communicator' };
            const meta = LANE_META[agent.lane || claim.lane] || LANE_META.Communicator;
            const Icon = meta.icon;
            return (
              <div key={`${claim.id}-${i}`} className="rounded-md border border-[#e3e0db] bg-white px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-[#0a0a0a]">{agent.name || claim.agent}</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: meta.bg, color: meta.color }}>
                    <Icon size={9} /> {claim.stance || meta.label}
                  </span>
                  {Number.isFinite(claim.confidence) && (
                    <span className="text-[9px] font-mono text-[#a3a3a3] ml-auto">{Math.round(claim.confidence * 100)}%</span>
                  )}
                </div>
                <div className="text-[12px] text-[#0a0a0a] leading-relaxed">{claim.content || claim.claim}</div>
                {claim.risk && <div className="mt-1 text-[10px] text-amber-700">Risk: {claim.risk}</div>}
              </div>
            );
          })}
        </div>
      )}

      {peerReviews.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#737373] pl-1">
            {t('hyperAgents.peerReview', 'Peer review')}
          </div>
          {peerReviews.map((review, i) => {
            const reviewer = participants[review.reviewer] || { slug: review.reviewer, lane: 'Skeptic' };
            const meta = LANE_META[reviewer.lane] || LANE_META.Skeptic;
            const Icon = meta.icon;
            const agreementTone =
              review.agreement === 'challenge' ? 'text-amber-700 bg-amber-50' :
              review.agreement === 'agree' ? 'text-emerald-700 bg-emerald-50' :
              'text-blue-700 bg-blue-50';
            return (
              <div key={`${review.reviewer || 'review'}-${review.target_hypothesis_id || i}-${review.ts || i}`} className="rounded-md border border-[#e3e0db] bg-white px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-[#0a0a0a]">{reviewer.name || review.reviewer}</span>
                  <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${agreementTone}`}>
                    <Icon size={9} /> {review.agreement || 'review'}
                  </span>
                  {Number.isFinite(review.confidence) && (
                    <span className="text-[9px] font-mono text-[#a3a3a3] ml-auto">{Math.round(review.confidence * 100)}%</span>
                  )}
                </div>
                <div className="text-[12px] text-[#525252] leading-relaxed">{review.content}</div>
                {review.condition && <div className="mt-1 text-[10px] text-blue-700">{review.condition}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SwarmRounds({ participants, hypotheses, peerReviews, chains, skepticChallenge, votes, swarmVerdict, roundStarts, costCapHit, deadlineHit, roomWarnings = [], onOpenEvidence }) {
  const { t } = useTranslation('dashboard');
  const reviewsByTarget = useMemo(() => {
    const out = {};
    for (const r of peerReviews || []) {
      const k = r.target_hypothesis_id;
      if (!k) continue;
      (out[k] = out[k] || []).push(r);
    }
    return out;
  }, [peerReviews]);
  const chainByAgent = useMemo(() => {
    const out = {};
    for (const c of chains || []) out[c.id || c.agent] = c;
    return out;
  }, [chains]);

  const roundHeader = (round, label) => (
    <div className="flex items-center gap-2 pt-3 pb-1 pl-2">
      <span className="text-[9px] uppercase tracking-wider font-mono text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
        R{round}
      </span>
      <span className="text-[11px] text-[#525252] font-mono">{label}</span>
    </div>
  );

  return (
    <div className="space-y-1">
      {/* R1 — Independent Hypotheses */}
      {hypotheses.length > 0 && (
        <>
          {roundHeader(1, t('hyperAgents.independentHypotheses', 'Independent Hypotheses'))}
          {hypotheses.map((h) => {
            const agent = participants[h.agent] || { slug: h.agent, lane: h.lane || 'Communicator' };
            const childReviews = reviewsByTarget[h.id] || [];
            const refined = chainByAgent[h.id];
            return (
              <div key={h.id} className="ml-2 border-l-2 border-violet-200 pl-3">
                <AgentBubble agent={agent} content={h.content} kind="hypothesis" confidence={h.confidence} ts={eventDisplayTs(h)} />
                {(h.evidence_memory_ids || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-1">
                    {h.evidence_memory_ids.map((mid) => (
                      <EvidenceChip key={mid} id={mid} onClick={onOpenEvidence} />
                    ))}
                  </div>
                )}
                {/* R2 — peer reviews for this hypothesis */}
                {childReviews.length > 0 && (
                  <div className="ml-3 mt-2 space-y-1 border-l border-dashed border-[#d4d0ca] pl-2">
                    <div className="text-[9px] uppercase tracking-wider font-mono text-[#737373]">{t('hyperAgents.r2PeerReview', 'R2 · Peer review')}</div>
                    {childReviews.map((r, i) => {
                      const reviewerAgent = participants[r.reviewer] || { slug: r.reviewer, lane: 'Communicator' };
                      const agreeColor =
                        (r.agreement === 'agree' || r.agreement === 'support') ? 'text-emerald-700' :
                        r.agreement === 'challenge' ? 'text-amber-700' : 'text-blue-700';
                      return (
                        <div key={i} className="text-[12px]">
                          <span className={`text-[10px] font-mono ${agreeColor}`}>[{r.agreement}]</span>{' '}
                          <span className="font-semibold text-[#0a0a0a]">{reviewerAgent.name || r.reviewer}:</span>{' '}
                          <span className="text-[#525252]">{r.content}</span>
                          {(r.evidence_memory_ids || []).length > 0 && (
                            <span className="ml-1 inline-flex flex-wrap gap-1">
                              {r.evidence_memory_ids.map((m) => (
                                <EvidenceChip key={m} id={m} onClick={onOpenEvidence} />
                              ))}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* R3 — refined hypothesis + chain of thought */}
                {refined && (
                  <details className="ml-3 mt-2 text-[12px]">
                    <summary className="cursor-pointer text-[9px] uppercase tracking-wider font-mono text-emerald-700">
                      {t('hyperAgents.r3Refined', 'R3 · Refined hypothesis + {{n}} chain-of-thought steps', { n: (refined.steps || []).length })}
                    </summary>
                    <div className="mt-1 pl-2 border-l border-emerald-200 space-y-1">
                      <div className="text-[12px] text-[#0a0a0a]">{refined.refined_hypothesis}</div>
                      {(refined.steps || []).map((s, i) => (
                        <div key={i} className="text-[10px] font-mono text-[#737373]">→ {s}</div>
                      ))}
                      {refined.lane_specific_finding && (
                        <div className="text-[11px] italic text-violet-700 mt-1">
                          {refined.lane_specific_finding}
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* R4 — Skeptic challenge */}
      {skepticChallenge && (
        <>
          {roundHeader(4, t('hyperAgents.r4Skeptic', 'Skeptic — unorthodox + hidden assumptions'))}
          <div className="ml-2 border-l-2 border-red-400 pl-3 bg-red-50/30 rounded-r-md py-2">
            <div className="text-[10px] font-mono text-red-700 mb-1">
              {skepticChallenge.agent} (permanent Skeptic)
            </div>
            {(skepticChallenge.challenges || []).map((c, i) => (
              <div key={`c-${i}`} className="text-[12px] mb-1">
                <span className="text-[9px] font-mono text-amber-700 mr-1">[challenges {c.target_hypothesis_id}]</span>
                {c.challenge}
                {(c.evidence_memory_ids || []).length > 0 && (
                  <span className="ml-1 inline-flex flex-wrap gap-1">
                    {c.evidence_memory_ids.map((m) => (
                      <EvidenceChip key={m} id={m} onClick={onOpenEvidence} />
                    ))}
                  </span>
                )}
              </div>
            ))}
            {(skepticChallenge.unorthodox_alternatives || []).map((u, i) => (
              <div key={`u-${i}`} className="text-[12px] mb-1">
                <span className="text-[9px] font-mono text-violet-700 mr-1">[unorthodox-{i + 1}]</span>
                {u.angle}
              </div>
            ))}
            {(skepticChallenge.hidden_assumptions || []).length > 0 && (
              <div className="text-[11px] italic text-[#525252] mt-1">
                {t('hyperAgents.hiddenAssumptions', 'Hidden assumptions: {{list}}', { list: skepticChallenge.hidden_assumptions.join(' · ') })}
              </div>
            )}
          </div>
        </>
      )}

      {/* R5 — Vote grid */}
      {votes.length > 0 && (
        <>
          {roundHeader(5, t('hyperAgents.r5ConvergenceVote', 'Convergence vote'))}
          <div className="ml-2 overflow-x-auto">
            <table className="text-[11px] min-w-full">
              <thead>
                <tr className="text-[#737373] border-b border-[#e3e0db]">
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.voter', 'Voter')}</th>
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.for', 'For')}</th>
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.score', 'Score')}</th>
                  <th className="text-left pr-3 py-1 font-mono uppercase text-[9px]">{t('hyperAgents.conditions', 'Conditions')}</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((v, i) => (
                  <tr key={i} className="border-b border-[#f3f1ec]">
                    <td className="pr-3 py-1 font-semibold">{v.voter}</td>
                    <td className="pr-3 py-1 font-mono text-[10px]">{v.vote_for_hypothesis_id}</td>
                    <td className="pr-3 py-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        v.score >= 4 ? 'bg-emerald-100 text-emerald-700' :
                        v.score >= 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{v.score}</span>
                    </td>
                    <td className="pr-3 py-1 text-[10px] text-[#525252]">
                      {(v.conditions || []).join('; ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Prod hardening notices — truncation + role warnings (never silent) */}
      {(costCapHit || deadlineHit || roomWarnings.length > 0) && (
        <div className="mx-2 mt-3 space-y-1">
          {costCapHit && (
            <div className="p-2 rounded-md border border-amber-300 bg-amber-50 text-[11px] text-amber-800">
              {t('hyperAgents.costCapHit', '⚠ Turn truncated at the tool-call budget — synthesis ran on the rounds completed so far.')}
            </div>
          )}
          {deadlineHit && (
            <div className="p-2 rounded-md border border-amber-300 bg-amber-50 text-[11px] text-amber-800">
              {t('hyperAgents.deadlineHit', '⏱ Turn hit the time limit ({{cap}}s) — sealed early from round {{round}}.', { cap: deadlineHit.cap_s || '—', round: deadlineHit.skipped_from_round || '?' })}
            </div>
          )}
          {roomWarnings.map((w, i) => (
            <div key={i} className="p-2 rounded-md border border-blue-200 bg-blue-50 text-[11px] text-blue-800">
              {w.code === 'configured_skeptic_absent'
                ? t('hyperAgents.skepticAbsent', 'ℹ Configured Skeptic absent this turn — a stand-in{{standin}} challenged instead.', { standin: w.stand_in_skeptic ? ` (${w.stand_in_skeptic})` : '' })
                : w.code === 'lead_skeptic_collision'
                ? t('hyperAgents.leadSkepticCollision', 'ℹ Lead and Skeptic resolved to the same agent{{slug}} — Skeptic dropped for this turn.', { slug: w.slug ? ` (${w.slug})` : '' })
                : `ℹ ${w.code || t('hyperAgents.notice', 'notice')}`}
            </div>
          ))}
          {peerReviews.map((review, i) => (
            <div key={`deep-review-${i}`} className="ml-3 rounded-md border border-[#e3e0db] bg-[#faf9f4] px-3 py-2">
              <div className="text-[10px] font-mono text-[#737373] mb-0.5">
                {review.reviewer} {review.agreement || 'review'} {review.target_author || review.target_hypothesis_id}
              </div>
              <div className="text-[12px] text-[#525252] leading-relaxed">{review.content}</div>
              {review.condition && <div className="mt-1 text-[10px] text-blue-700">Condition: {review.condition}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Swarm verdict banner */}
      {swarmVerdict && (
        <div className={`mx-2 mt-3 p-3 rounded-md border ${
          swarmVerdict.verdict === 'AGREED' ? 'border-emerald-300 bg-emerald-50' :
          swarmVerdict.verdict === 'CONDITIONAL' ? 'border-amber-300 bg-amber-50' :
          'border-red-300 bg-red-50'
        }`}>
          <div className="text-[10px] uppercase font-mono mb-1 tracking-wider">
            ⛬ Verdict · <span className="font-bold">{swarmVerdict.verdict}</span>
            <span className="ml-2 text-[#737373]">
              weighted {swarmVerdict.weighted_score} · {swarmVerdict.vote_count} votes
            </span>
          </div>
          <div className="text-[12px] text-[#0a0a0a]">
            {t('hyperAgents.winner', 'Winner:')} <span className="font-mono">{swarmVerdict.winning_hypothesis_id || t('hyperAgents.none', 'none')}</span>
          </div>
          {(swarmVerdict.action_items || []).length > 0 && (
            <div className="mt-1.5 text-[11px]">
              <div className="text-[9px] uppercase font-mono text-[#737373]">{t('hyperAgents.actionItems', 'Action items')}</div>
              <ul className="list-disc list-inside text-[#525252]">
                {swarmVerdict.action_items.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Bubble ─────────────────────────────────────────────────────────── */

// Defensive: the engine sometimes emits a raw reactor-decision JSON as the line
// content (e.g. {"react":true,"agreement":"extend","line":"..."} or
// {"react":false}). Render the prose `.line`; hide silent {"react":false}.
export function coerceLine(raw) {
  if (typeof raw !== 'string') return raw;
  const s = raw.trim();
  if (!(s.startsWith('{') && s.includes('"react"'))) return raw;
  try {
    const o = JSON.parse(s);
    if (o && typeof o === 'object' && ('react' in o || 'line' in o)) {
      if (o.line && String(o.line).trim()) return String(o.line);
      if (o.react === false) return null; // silent reactor — don't render
    }
  } catch { /* not JSON — render as-is */ }
  return raw;
}

export function AgentBubble({ agent, content: rawContent, kind, agreement, confidence, ts }) {
  const content = coerceLine(rawContent);
  if (content == null) return null; // silent {"react":false}
  const lane = agent?.lane || 'Communicator';
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const Icon = meta.icon;
  const contract = getPersonaContract(agent);
  const indent = kind === 'react' || kind === 'validate';
  const agMeta = agreement ? AGREEMENT_META[agreement] : null;
  const isShort = (content || '').length < 280 && !/\n.*\n/.test(content || '');

  return (
    <div className={`flex gap-2 ${indent ? 'ml-6' : ''}`}>
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold"
        style={{ background: meta.bg, color: meta.color }}
        title={`${agent?.name || agent?.slug} · ${lane}`}
      >
        {agent?.avatarUrl
          ? <img src={agent.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          : (agent?.name?.[0] || agent?.slug?.[0] || '?').toUpperCase()}
      </div>
      <div className="min-w-0 max-w-[78%]">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[11px] font-semibold text-[#0a0a0a]">{agent?.name || agent?.slug}</span>
          <span
            className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
            style={{ background: meta.bg, color: meta.color }}
          >
            <Icon size={9} /> {meta.label}
          </span>
          {contract?.stance && (
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#faf9f4] text-[#525252] border border-[#e3e0db]">
              {contract.stance}
            </span>
          )}
          {agMeta && (
            <span
              className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: agMeta.bg, color: agMeta.color }}
            >
              {agMeta.emoji} {agMeta.label}
              {Number.isFinite(confidence) && ` ${Math.round(confidence * 100)}%`}
            </span>
          )}
          {ts ? <span className="text-[9px] font-mono text-[#a3a3a3] ml-auto">{fmtTs(ts)}</span> : null}
        </div>
        <div
          className="border border-[#e3e0db] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-[#0a0a0a] leading-relaxed break-words overflow-hidden"
          style={{ background: kind === 'lead' ? '#ffffff' : '#faf9f4' }}
        >
          {isShort
            ? <span className="whitespace-pre-wrap">{content || '…'}</span>
            : <div className="space-y-0.5">{renderMarkdownLite(content)}</div>}
        </div>
      </div>
    </div>
  );
}

/* ─── Participant chip in right rail ─────────────────────────────────── */


export function fmtTs(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ''; }
}

export function eventDisplayTs(event) {
  return event?.received_ts || event?.ts || null;
}

export function getPersonaContract(agent) {
  return agent?.hyper?.persona_contract || agent?.persona_contract || null;
}

export function contractSnippet(contract) {
  if (!contract) return '';
  const parts = [];
  if (contract.stance) parts.push(contract.stance);
  if (contract.context_home) parts.push(`home:${contract.context_home}`);
  return parts.join(' · ');
}

export function SwarmSpinningUp() {
  const { t } = useTranslation('dashboard');
  const stages = [
    t('hyperAgents.spin1', 'Spinning up the room…'),
    t('hyperAgents.spin2', 'Spawning the agents…'),
    t('hyperAgents.spin3', 'Assigning lead + reactors…'),
    t('hyperAgents.spin4', 'Pulling relevant memories…'),
    t('hyperAgents.spin5', 'Agents thinking…'),
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => Math.min(p + 1, stages.length - 1)), 1200);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex items-center gap-2 pl-2 py-2 text-[12px] text-[#737373]">
      <Loader2 size={13} className="animate-spin text-violet-500 shrink-0" />
      <span className="font-mono">{stages[i]}</span>
      <span className="flex items-center gap-0.5 ml-1">
        {stages.map((_, ix) => (
          <span key={ix} className={`w-1 h-1 rounded-full transition-colors ${ix <= i ? 'bg-violet-400' : 'bg-[#d4d0ca]'}`} />
        ))}
      </span>
    </div>
  );
}

// ─── Population-sim dialogue theater ────────────────────────────────────────
// The sim's 10-100 synthetic voices used to hide behind a flat "open" button.
// This renders them as a LIVE dialogue replay: posts land one-by-one in a feed,
// the sentiment bar fills and the voice counter ticks as each lands — the crowd
// visibly "happens" in the room. Real data only (the posts the backend simulated);
// the animation is a replay of that real burst. Skippable; settles into a summary.
export function SimTheater({ simReport, onOpenFull }) {
  const { t } = useTranslation('dashboard');
  const posts = useMemo(() => (Array.isArray(simReport?.posts) ? simReport.posts : []), [simReport]);
  const [shown, setShown] = useState(0);          // how many posts have landed
  const [playing, setPlaying] = useState(true);
  const feedRef = useRef(null);
  const done = shown >= posts.length;
  // Stagger so the whole replay fits ~18s regardless of crowd size.
  const stepMs = Math.max(120, Math.min(450, Math.floor(18000 / Math.max(1, posts.length))));

  useEffect(() => {
    if (!playing || done || !posts.length) return undefined;
    const id = setInterval(() => setShown(s => Math.min(posts.length, s + 1)), stepMs);
    return () => clearInterval(id);
  }, [playing, done, posts.length, stepMs]);
  useEffect(() => {   // follow the feed as voices land
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [shown]);

  if (!posts.length) return null;
  const visible = posts.slice(0, shown);
  const S = { positive: 0, neutral: 0, negative: 0 };
  visible.forEach(p => { const s = (p.sentiment === 'positive' || p.sentiment === 'negative') ? p.sentiment : 'neutral'; S[s]++; });
  const total = Math.max(1, visible.length);
  const ring = s => s === 'positive' ? 'ring-green-400 bg-green-50 text-green-700'
    : s === 'negative' ? 'ring-red-400 bg-red-50 text-red-700' : 'ring-[#d4d0ca] bg-[#faf9f4] text-[#737373]';

  return (
    <div className="rounded-xl border border-violet-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3.5 py-2 border-b border-violet-100 bg-violet-50/60">
        <span className="relative flex h-2.5 w-2.5">
          {!done && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${done ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </span>
        <span className="text-[11px] font-semibold text-violet-800 uppercase tracking-wider font-mono">
          {done ? t('hyperAgents.simDone', 'Population simulation') : t('hyperAgents.simLive', 'Population simulation — replaying')}
        </span>
        <span className="text-[10px] text-violet-500 font-mono tabular-nums">
          {shown}/{posts.length} {t('hyperAgents.simVoices', 'voices')}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {!done && (
            <button type="button" onClick={() => setPlaying(p => !p)}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-violet-600 hover:bg-violet-100">
              {playing ? t('hyperAgents.simPause', 'pause') : t('hyperAgents.simPlay', 'play')}
            </button>
          )}
          {!done && (
            <button type="button" onClick={() => setShown(posts.length)}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-violet-600 hover:bg-violet-100">
              {t('hyperAgents.simSkip', 'skip ▸')}
            </button>
          )}
          <button type="button" onClick={onOpenFull}
            className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-violet-600 hover:bg-violet-100">
            {t('hyperAgents.simFull', 'full report')}
          </button>
        </div>
      </div>
      {/* live sentiment bar — fills as voices land */}
      <div className="px-3.5 pt-2">
        <div className="flex h-2 rounded overflow-hidden border border-[#ece9e3]">
          <div style={{ width: `${(S.positive / total) * 100}%` }} className="bg-green-500 transition-all duration-300" />
          <div style={{ width: `${(S.neutral / total) * 100}%` }} className="bg-[#d4d0ca] transition-all duration-300" />
          <div style={{ width: `${(S.negative / total) * 100}%` }} className="bg-red-500 transition-all duration-300" />
        </div>
        <div className="flex gap-3 mt-1 text-[9px] text-[#737373] font-mono tabular-nums">
          <span>▲ {S.positive}</span><span>— {S.neutral}</span><span>▼ {S.negative}</span>
        </div>
      </div>
      {/* the dialogue feed */}
      <div ref={feedRef} className="max-h-64 overflow-y-auto px-3.5 py-2 space-y-1.5 scroll-smooth">
        {visible.map((p, i) => (
          <div key={i} className="flex items-start gap-2" style={{ animation: 'simpop .25s ease-out' }}>
            <span className={`h-5 w-5 grid place-items-center rounded-full ring-1 text-[9px] font-semibold shrink-0 mt-0.5 ${ring(p.sentiment)}`}>
              {(p.name || '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-[#0a0a0a]">{p.name}</span>
              <span className="text-[9px] text-[#a3a3a3] ml-1.5">{p.role}</span>
              <div className="text-[11px] text-[#525252] leading-snug">{p.text}</div>
            </div>
          </div>
        ))}
        {!done && playing && (
          <div className="text-[10px] text-violet-400 font-mono animate-pulse pl-7">…</div>
        )}
      </div>
      <style>{'@keyframes simpop { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: none;} }'}</style>
    </div>
  );
}

// HQ control-room report bubble — a room-run reported to HQ as a BIG chat
// bubble, as if the lead agent walked into HQ and briefed the owner: agent
// heading (avatar + name + role), source room + time, the outcome digest, and
// the FULL run report (collapsed to a preview, expandable). summary format from
// the backend: "<digest line>\n\n<full report body>".
export function HqReportBubble({ report: a, onOpenRoom }) {
  const [open, setOpen] = useState(false);
  // Routing card — a work request HQ dispatched to a kind room. Compact, not a
  // full report bubble; the run's report lands as its own bubble when it seals.
  if (a.status === 'routed') {
    return (
      <button onClick={onOpenRoom}
        className="w-full text-left flex items-center gap-2.5 rounded-xl border border-[#117dff]/25 bg-[#117dff]/5 px-3.5 py-2 hover:bg-[#117dff]/10 transition-colors group">
        <ArrowRight size={13} className="text-[#117dff] shrink-0" />
        <span className="text-[11.5px] text-[#0a0a0a]">{a.headline}</span>
        <span className="text-[10.5px] font-mono text-[#525252] truncate">— {a.summary}</span>
        <ExternalLink size={12} className="ml-auto text-[#a3a3a3] group-hover:text-[#117dff] shrink-0" />
      </button>
    );
  }
  const raw = String(a.summary || '');
  const cut = raw.indexOf('\n\n');
  const digest = (cut > 0 ? raw.slice(0, cut) : raw).trim();
  const body = (cut > 0 ? raw.slice(cut + 2) : '').trim();
  const who = a.agent_name || `${a.source_room_name || 'Team'}`;
  const ts = a.created_at
    ? new Date(a.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
  return (
    <div className="flex items-start gap-3">
      {/* Agent avatar — big, like a real chat participant */}
      <span className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-700 flex items-center justify-center text-[15px] font-bold shrink-0 mt-1 font-['Space_Grotesk']">
        {(who || '?')[0].toUpperCase()}
      </span>
      {/* The bubble */}
      <div className="min-w-0 flex-1 max-w-[720px] rounded-2xl rounded-tl-md border border-[#e3e0db] bg-white shadow-sm overflow-hidden">
        {/* Agent heading */}
        <div className="px-4 pt-3 flex items-baseline gap-2 flex-wrap">
          <span className="text-[13.5px] font-bold text-[#0a0a0a] font-['Space_Grotesk']">{who}</span>
          {a.agent_role && <span className="text-[10.5px] font-mono uppercase tracking-wider text-violet-600">{a.agent_role}</span>}
          <button onClick={onOpenRoom}
            className="text-[10.5px] font-mono text-[#a3a3a3] hover:text-violet-600 hover:underline flex items-center gap-1">
            <Hash size={10} /> {a.source_room_name || 'room'}
          </button>
          <span className="ml-auto text-[9.5px] font-mono text-[#a3a3a3]">{ts}</span>
        </div>
        {/* Headline — what the run accomplished */}
        <div className="px-4 pt-1.5 text-[13px] text-[#0a0a0a] leading-snug">{a.headline}</div>
        {/* Outcome digest chips */}
        {digest && (
          <div className="px-4 pt-2 flex items-center gap-1.5 flex-wrap">
            {digest.split(' · ').map((bit, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#f4f2ec] text-[#525252]">
                {bit}
              </span>
            ))}
          </div>
        )}
        {/* Full run report — everything that happened, expandable. Collapsed =
            plain 4-line teaser; expanded = the SAME brochure element system the
            room report uses (serif, tables, callouts, stats/steps/charts/email)
            so an HQ bubble reads exactly like opening the room's report. */}
        {body && (
          <div className="px-4 pt-2 pb-1">
            {open ? (
              <div className="hyper-brochure rounded-xl overflow-hidden my-1"
                style={{ background: '#F5F0E8', color: '#1C1A16', padding: '18px 20px' }}>
                <div className="hyper-markdown" style={{ fontSize: 13, lineHeight: 1.65,
                  fontFamily: "'Hanken Grotesk', -apple-system, sans-serif" }}>
                  {renderMarkdownLite(body)}
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-[#3f3d39] leading-relaxed whitespace-pre-wrap line-clamp-4">
                {body}
              </div>
            )}
            <button onClick={() => setOpen(o => !o)}
              className="mt-1 mb-1 flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-wider text-violet-600 hover:underline">
              <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              {open ? 'Collapse report' : 'Read full run report'}
            </button>
          </div>
        )}
        {/* Footer — jump to the source room */}
        <button onClick={onOpenRoom}
          className="w-full px-4 py-2 border-t border-[#f0ede7] flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-wider text-[#a3a3a3] hover:text-violet-600 hover:bg-[#faf9f4] transition-colors">
          <ArrowUpRight size={11} /> Open room run
        </button>
      </div>
    </div>
  );
}

// Outreach prospect stack. Renders every firm the room found via Google Places as a
// stacked card with all its info (phone / website / address). Firms we resolved a real
// email for (Impressum scrape) get a green "email verified" badge and sort first — ONLY
// those are the ones the room will actually email. Pure render over the `prospects` event.
export function ProspectStack({ ev }) {
  const [open, setOpen] = useState(true);
  const rows = Array.isArray(ev?.prospects) ? ev.prospects : [];
  if (!rows.length) return null;
  const verified = rows.filter(r => r.email);
  const ordered = [...rows].sort((a, b) => (b.email ? 1 : 0) - (a.email ? 1 : 0));
  return (
    <div className="pl-2">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#525252] hover:text-[#0a0a0a] transition-colors">
        <MapPin size={12} className="text-[#117dff]" />
        <span>{rows.length} prospects</span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 normal-case tracking-normal">
          <CheckCheck size={10} /> {verified.length} email verified
        </span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {ev?.query && (
        <div className="mt-0.5 text-[10px] text-[#a3a3a3] font-mono truncate">“{ev.query}”</div>
      )}
      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {ordered.map((r, i) => {
            const has = !!r.email;
            return (
              <div key={i}
                className={`rounded-lg border px-3 py-2 ${has ? 'border-emerald-200 bg-emerald-50/40' : 'border-[#e3e0db] bg-white'}`}>
                <div className="flex items-center gap-2">
                  <Building2 size={13} className="text-[#525252] shrink-0" />
                  <span className="text-[12px] font-semibold text-[#0a0a0a] truncate">{r.company}</span>
                  {has ? (
                    <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-emerald-100 text-emerald-700 shrink-0"
                      title="Email found via the firm's Impressum — this prospect is outreach-ready and will be emailed.">
                      <CheckCheck size={10} /> email verified
                    </span>
                  ) : (
                    <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-[#f4f2ec] text-[#a3a3a3] shrink-0"
                      title="No public email found — not emailed (call/website only).">
                      no email
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-[#525252]">
                  {has && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={11} className="text-emerald-600 shrink-0" />
                      <span className="font-mono text-emerald-700 truncate">{r.email}</span>
                    </div>
                  )}
                  {r.phone && (
                    <div className="flex items-center gap-1.5">
                      <PhoneCall size={11} className="text-[#a3a3a3] shrink-0" />
                      <span className="font-mono truncate">{r.phone}</span>
                    </div>
                  )}
                  {r.website && (
                    <div className="flex items-center gap-1.5">
                      <Globe size={11} className="text-[#a3a3a3] shrink-0" />
                      <a href={r.website} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[#117dff] hover:underline truncate">{r.website.replace(/^https?:\/\//, '')}</a>
                    </div>
                  )}
                  {r.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-[#a3a3a3] shrink-0" />
                      <span className="truncate">{r.address}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Claude-style tool-activity timeline. Reshapes the turn's gather/tool/connector/web
// events into a collapsible vertical trail ("Used N tools" → step rows → Done) so the
// user sees exactly what fired after their message (recall, connector reads, web search).
// Pure render over events that already stream in — no new data, calm HIVEMIND-light theme.
export function ToolTimeline({ gathers, webIntels, prospectHunts, skillUses, sealed }) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(true);

  const recalls = (gathers || []).filter(g => !g.tool);
  const connectorReads = (gathers || []).filter(g => g.tool);
  const steps = [];
  // Room METHOD skills the turn loaded (progressive disclosure) — credibility
  // chips: "the team worked under competitor-teardown", not background magic.
  (skillUses || []).forEach((s, i) => {
    if (!s.skill) return;
    steps.push({
      key: `skill-${i}`, ts: s.ts || 0, kind: 'skill',
      label: t('hyperAgents.tlSkill', 'Method: {{name}}', { name: s.skill }),
      chip: s.room_kind || null,
    });
  });
  if (recalls.length) {
    const facts = recalls.reduce((n, g) => n + (g.memory_hits || 0), 0);
    steps.push({
      key: 'recall', ts: recalls[0].ts || 0, kind: 'recall',
      label: t('hyperAgents.tlRecall', 'Recalled the company brain'),
      chip: facts > 0 ? t('hyperAgents.tlFacts', '{{n}} facts', { n: facts })
        : (recalls.length > 1 ? `${recalls.length}×` : null),
    });
  }
  connectorReads.forEach((g, i) => {
    steps.push({
      key: `conn-${i}`, ts: g.ts || 0, kind: 'connector',
      connector: (g.sources || [])[0] || 'connector', label: (g.sources || [])[0] || 'connector',
      mono: g.tool, detail: g.query || null,
    });
  });
  (webIntels || []).forEach((w, i) => {
    steps.push({
      key: `web-${i}`, ts: w.ts || 0, kind: 'web',
      label: t('hyperAgents.webSearch', 'Web search'), detail: w.query || null,
      sources: (w.sources || []).slice(0, 4),
    });
  });
  (prospectHunts || []).forEach((p, i) => {
    steps.push({
      key: `places-${i}`, ts: p.ts || 0, kind: 'places',
      label: t('hyperAgents.tlPlaces', 'Using Maps'), detail: p.query || null,
      chip: (p.count != null) ? t('hyperAgents.tlFirms', '{{n}} firms', { n: p.count }) : null,
    });
  });
  steps.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (!steps.length) return null;

  const iconFor = (s) => {
    if (s.kind === 'recall') return <Brain size={12} className="text-[#117dff]" />;
    if (s.kind === 'web') return <Globe size={12} className="text-[#117dff]" />;
    if (s.kind === 'places') return <MapPin size={12} className="text-[#34a853]" />;
    if (s.kind === 'skill') return <Sparkles size={12} className="text-[#117dff]" />;
    const logo = BRAND_LOGOS[s.connector] || BRAND_LOGOS[String(s.connector || '').replace(/_/g, '-')]
      || BRAND_LOGOS[String(s.connector || '').replace(/-/g, '_')];
    if (logo) return <img src={logo} alt="" className="w-3 h-3" onError={e => { e.currentTarget.style.display = 'none'; }} />;
    return <Zap size={12} className="text-[#117dff]" />;
  };

  return (
    <div className="rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 w-full text-left">
        {sealed
          ? <CheckCheck size={13} className="text-emerald-600 shrink-0" />
          : <Loader2 size={13} className="text-[#117dff] animate-spin shrink-0" />}
        <span className="text-[11px] font-medium text-[#525252]">
          {sealed
            ? t('hyperAgents.tlUsedTools', 'Used {{n}} tools', { n: steps.length })
            : t('hyperAgents.tlWorking', 'Working… {{n}} tools', { n: steps.length })}
        </span>
        <ChevronDown size={13} className={`ml-auto text-[#a3a3a3] transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mt-2">
          {steps.map((s, i) => (
            <div key={s.key} className="relative flex gap-2.5 pl-5 pb-2">
              {i < steps.length - 1 && <span className="absolute left-[5.5px] top-3.5 bottom-0 w-px bg-[#e3e0db]" />}
              <span className="absolute left-0 top-0.5 flex h-3 w-3 items-center justify-center">{iconFor(s)}</span>
              <div className="min-w-0 text-[11px] text-[#525252] leading-snug">
                <span className="font-medium">{s.label}</span>
                {s.mono && <span className="font-mono text-[10px] text-[#117dff] ml-1">· {s.mono}</span>}
                {s.chip && <span className="ml-1.5 rounded-full bg-white border border-[#e3e0db] px-1.5 py-0.5 text-[9px] text-[#737373]">{s.chip}</span>}
                {s.detail && <span className="text-[#737373]"> · “{s.detail}”</span>}
                {Array.isArray(s.sources) && s.sources.length > 0 && (
                  <span className="flex flex-wrap gap-1 mt-0.5">
                    {s.sources.map((src, j) => (
                      <a key={j} href={src.url} target="_blank" rel="noopener noreferrer"
                         className="rounded-[6px] bg-white border border-[#e3e0db] px-1.5 py-0.5 text-[9px] text-[#117dff] hover:bg-[#f3f1ec] truncate max-w-[180px]"
                         title={src.url}>{src.title || src.url}</a>
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="relative flex items-center gap-2.5 pl-5">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 flex h-3 w-3 items-center justify-center">
              {sealed ? <CheckCheck size={12} className="text-emerald-600" /> : <Loader2 size={11} className="text-[#117dff] animate-spin" />}
            </span>
            <span className="text-[11px] font-medium text-[#0a0a0a]">
              {sealed ? t('hyperAgents.tlDone', 'Done') : t('hyperAgents.tlRunning', 'Running…')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


/* ─── Pure helpers (moved from HyperAgents.jsx — right home) ─────────── */
export function relTime(ts) {
  if (!ts) return '';
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return '';
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 45) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}

const SECTION_ICONS = {
  market:   [[/landscape/i, Layers], [/win/i, Crown], [/threat|gap/i, AlertTriangle], [/move|recommend/i, Rocket]],
  content:  [[/pillar/i, Boxes], [/calendar/i, Clock], [/hook|angle/i, Lightbulb], [/distribution/i, Network]],
  outreach: [[/profile|icp/i, Target], [/prospect/i, Users], [/sequence/i, ListChecks], [/metric|signal/i, Gauge]],
  business: [[/economic/i, Gauge], [/pricing|positioning/i, Tag], [/risk/i, AlertTriangle], [/kills/i, Swords]],
  strategy: [[/decision/i, Gavel], [/option/i, Scale], [/rationale/i, Brain], [/tripwire/i, AlertTriangle]],
};
export function sectionIconFor(kind, title) {
  for (const [re, Icon] of (SECTION_ICONS[kind] || [])) if (re.test(title || '')) return Icon;
  return null;
}

export function splitSynthesisSections(content) {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const sections = [];
  let current = { title: 'Executive summary', body: [] };
  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (heading) {
      if (current.body.length || current.title !== 'Executive summary') sections.push(current);
      current = { title: heading[1], body: [] };
    } else current.body.push(line);
  }
  if (current.body.length || !sections.length) sections.push(current);
  return sections.filter((section) => section.body.join('').trim());
}

export function hyperEventKey(event, index) {
  if (!event) return `empty:${index}`;
  if (event.id) return `id:${event.id}`;
  return [
    event.t || 'line',
    event.ts || '',
    event.agent || event.reviewer || event.voter || '',
    event.kind || event.phase || event.round || '',
    event.id || event.target_hypothesis_id || '',
  ].join('|') || `idx:${index}`;
}
