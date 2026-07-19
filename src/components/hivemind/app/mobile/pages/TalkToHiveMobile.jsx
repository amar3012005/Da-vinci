/**
 * TalkToHiveMobile — full-screen mobile chat surface.
 *
 * Mirrors the desktop Chat.jsx logic (same /v1/proxy/chat call, same model
 * dropdown, same step timeline + sources rendering, same localStorage
 * persistence) but laid out for one-handed phone use:
 *   • Sticky compact header w/ back arrow, title, model chip, kebab menu
 *   • Full-height scrollable thread (safe-area insets respected)
 *   • Sticky pill composer pinned to the keyboard, virtual-viewport aware
 *   • iOS-style tap targets (min 44px), no hover-only affordances
 *   • Reuses the same HIVEMIND visual palette so the brand carries over.
 *
 * Route: /hivemind/m/chat   (auto-redirected from /hivemind/app/overview on
 * viewports <= 768px — see HiveMindApp.jsx).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Loader2,
  Trash2,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  FileText,
  Plus,
  Paperclip,
  CheckCircle2,
  FileWarning,
  X,
  Download,
  Mic,
  Square,
  NotebookPen,
  Cable,
  MessageCircle,
  Settings,
  ArrowUpRight,
  Upload,
  FolderKanban,
  Users,
  Lock,
  AudioLines,
  Hexagon,
  Clock,
  ChevronRight,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Boxes,
  Building2,
  Globe,
} from 'lucide-react';
import apiClient from '../../shared/api-client';
import MobileShell from '../MobileShell';
import useDictation from '../../shared/useDictation';
import { useTeamContext } from '../../shared/team-context';
import { MeetingNotesPromo } from '../../shared/QuickRecorderProvider';
import PwaInstall from '../../shared/PwaInstall';
import { useAuth } from '../../auth/AuthProvider';

const MAX_CHARS = 2000;
const MAX_PERSIST = 200;

const LANG_OPTIONS = [
  { c: 'en', n: 'English' }, { c: 'de', n: 'Deutsch' },
  { c: 'es', n: 'Español' }, { c: 'fr', n: 'Français' },
  { c: 'it', n: 'Italiano' }, { c: 'pt', n: 'Português' },
  { c: 'nl', n: 'Nederlands' }, { c: 'pl', n: 'Polski' },
  { c: 'sv', n: 'Svenska' }, { c: 'ru', n: 'Русский' },
  { c: 'uk', n: 'Українська' }, { c: 'tr', n: 'Türkçe' },
  { c: 'ar', n: 'العربية' }, { c: 'he', n: 'עברית' },
  { c: 'hi', n: 'हिन्दी' }, { c: 'ja', n: '日本語' },
  { c: 'ko', n: '한국어' }, { c: 'zh', n: '中文' },
  { c: 'vi', n: 'Tiếng Việt' }, { c: 'th', n: 'ไทย' },
  { c: 'id', n: 'Indonesia' },
];

const MODELS = [
  { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', tag: 'Default' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tag: 'Free' },
  { id: 'gpt-oss-20b', label: 'GPT-OSS 20B', tag: 'Fast' },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadScopeModal({
  open,
  files,
  org,
  userRole,
  projects,
  loadingProjects,
  projectsError,
  onRetryProjects,
  selectedScope,
  onScopeChange,
  selectedProject,
  onProjectChange,
  onConfirm,
  onClose,
}) {
  const { t } = useTranslation('dashboard');
  if (!open) return null;

  const canUseTeamWorkspace = org?.plan === 'enterprise' || org?.plan === 'team';
  const isOrgAdmin = userRole === 'owner' || userRole === 'admin';
  const requiresProject = selectedScope === 'project';

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/35 px-3 pb-3 pt-16" onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="w-full max-w-lg rounded-[24px] border border-[#e3e0db] bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-[#0a0a0a] text-[16px] font-semibold font-['Space_Grotesk']">{t('knowledgebase.scopeModalTitle', 'Save uploaded memories to')}</h3>
              <p className="text-[#525252] text-[12px] mt-1">{t('knowledgebase.scopeModalSubtitle', 'Choose where these files should live before upload starts.')}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#a3a3a3]">
              <X size={16} />
            </button>
          </div>
          <div className="rounded-xl border border-[#ece8de] bg-[#faf9f4] px-3 py-2.5 mb-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#a3a3a3] mb-2">{t('knowledgebase.uploadBatch', 'Upload batch')}</p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="truncate text-[#0a0a0a]">{file.name}</span>
                  <span className="text-[#a3a3a3] text-[10px] font-mono shrink-0">{formatBytes(file.size)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            <button type="button" onClick={() => onScopeChange('personal')} className={`w-full rounded-xl border px-3 py-2.5 text-left ${selectedScope === 'personal' ? 'border-[#117dff]/30 bg-[#117dff]/8' : 'border-[#e3e0db] bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center"><Lock size={14} className="text-[#117dff]" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.scopePersonalLabel', 'My Space')}</p>
                  <p className="text-[11px] text-[#525252]">{t('knowledgebase.scopePersonalDesc', 'Private memories only visible in your personal workspace.')}</p>
                </div>
              </div>
            </button>
            <div role="button" tabIndex={canUseTeamWorkspace ? 0 : -1} aria-disabled={!canUseTeamWorkspace} onClick={() => canUseTeamWorkspace && onScopeChange('project')} className={`w-full rounded-xl border px-3 py-2.5 text-left ${selectedScope === 'project' ? 'border-[#117dff]/30 bg-[#117dff]/8' : 'border-[#e3e0db] bg-white'} ${!canUseTeamWorkspace ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center"><FolderKanban size={14} className="text-[#117dff]" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{t('knowledgebase.scopeProjectLabel', 'Project')}</p>
                  <p className="text-[11px] text-[#525252]">{t('knowledgebase.scopeProjectDesc', 'Shared with the members invited to that project.')}</p>
                </div>
              </div>
              {selectedScope === 'project' && (
                <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                  {loadingProjects ? <p className="text-[11px] text-[#a3a3a3]">{t('knowledgebase.loadingProjects', 'Loading projects...')}</p>
                    : projectsError ? <div className="flex items-center justify-between gap-2"><p className="text-[11px] text-[#dc2626]">{projectsError}</p><button type="button" onClick={onRetryProjects} className="rounded-md border border-[#e3e0db] px-2 py-1 text-[10px] font-semibold text-[#525252]">{t('knowledgebase.retry', 'Retry')}</button></div>
                      : projects.length > 0 ? <select value={selectedProject} onChange={(e) => onProjectChange(e.target.value)} className="w-full rounded-[8px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] text-[#0a0a0a]"><option value="">{t('knowledgebase.pickProject', 'Select a project…')}</option>{projects.map((p) => <option key={p.id} value={p.slug}>{p.name} ({p.slug})</option>)}</select>
                        : <p className="text-[11px] text-[#a3a3a3]">{t('knowledgebase.noAccessibleProjects', "You're not a member of any project yet. Ask an org admin to invite you, or choose another scope.")}</p>}
                </div>
              )}
            </div>
            <button type="button" disabled={!canUseTeamWorkspace || !isOrgAdmin} onClick={() => canUseTeamWorkspace && isOrgAdmin && onScopeChange('organization')} className={`w-full rounded-xl border px-3 py-2.5 text-left ${selectedScope === 'organization' ? 'border-[#117dff]/30 bg-[#117dff]/8' : 'border-[#e3e0db] bg-white'} ${(!canUseTeamWorkspace || !isOrgAdmin) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[#e3e0db] bg-white flex items-center justify-center"><Users size={14} className="text-[#117dff]" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{org?.name ? t('knowledgebase.scopeOrgLabelNamed', 'Entire organization: {{name}}', { name: org.name }) : t('knowledgebase.scopeOrgLabel', 'Entire organization')}</p>
                  <p className="text-[11px] text-[#525252]">{isOrgAdmin ? t('knowledgebase.scopeOrgDesc', 'Visible to every member of the org.') : t('knowledgebase.scopeOrgDescLocked', 'Org-wide uploads are reserved for organization admins.')}</p>
                </div>
              </div>
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-[#e3e0db] px-3 py-2 text-[13px] font-semibold text-[#525252]">{t('knowledgebase.cancel', 'Cancel')}</button>
            <button type="button" onClick={onConfirm} disabled={requiresProject && !selectedProject} className="inline-flex items-center gap-2 rounded-[10px] bg-[#117dff] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"><Upload size={14} />{t('knowledgebase.uploadFiles', 'Upload files')}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Persistence (matches desktop Chat.jsx key shape) ───────────────────────

function getStorageUserId() {
  try {
    const raw = localStorage.getItem('hivemind:user') || localStorage.getItem('user') || '';
    if (!raw) return 'anon';
    if (raw.startsWith('{')) {
      const u = JSON.parse(raw);
      return u?.id || u?.user_id || u?.email || 'anon';
    }
    return raw;
  } catch { return 'anon'; }
}
const storageKey = () => `hivemind:talk-to-hive:messages:${getStorageUserId()}`;
function loadMsgs() {
  try {
    const raw = localStorage.getItem(storageKey());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveMsgs(msgs) {
  try { localStorage.setItem(storageKey(), JSON.stringify((msgs || []).slice(-MAX_PERSIST))); } catch {}
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

// ─── Markdown-lite renderer ──────────────────────────────────────────────
// Same idea as HyperAgents.renderMarkdownLite but extended with:
//   • code fences (```)
//   • GitHub-style pipe tables (| a | b |\n|---|---|\n| c | d |)
//   • inline bold / italic / code / links
// Keeps the file dependency-free (no react-markdown).
function inlineMd(s, keyPrefix = 'i') {
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

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}
function isTableSep(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}
function parseTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function renderMarkdownMobile(raw) {
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
function UserBubble({ content }) {
  return (
    <div className="self-end max-w-[85%] px-4 py-2.5 rounded-[18px] bg-[#f0eee6] text-[#1a1a17] text-[15.5px] leading-relaxed break-words whitespace-pre-wrap">
      {content}
    </div>
  );
}

// Mobile draft-approval cards. Same backend contract as desktop:
// fetches pending_writes by id, surfaces Approve/Cancel buttons.
function MobileDraftCards({ draftIds }) {
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
function StepsDisclosure({ steps }) {
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
function AiBubble({ msg, onRetry }) {
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
      {hasSteps && <StepsDisclosure steps={msg.steps} />}

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

      <MobileDraftCards draftIds={msg.draft_ids} />

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
function MobileProjectChoice({ choice }) {
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
function _activityLabel(ev) {
  const n = String(ev?.name || ev?.tool || '').replace(/^hivemind_/, '').replace(/_/g, ' ');
  if (ev?.type === 'plan') return 'planning the approach';
  if (ev?.type === 'tool_result') return n ? `${n} — done` : 'step done';
  return n ? `running ${n}` : 'working';
}
function Thinking({ events = [] }) {
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

// SSE reader — mirrors desktop Overview.readChatStream frame-for-frame.
async function readChatStream(response, onEvent) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;
  const consume = (frame) => {
    const data = frame.split('\n').filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim()).join('\n');
    if (!data) return;
    try {
      const event = JSON.parse(data);
      if (event.type === 'done') result = event;
      else onEvent(event);
    } catch { /* malformed intermediary frame */ }
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';
    frames.forEach(consume);
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);
  return result;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TalkToHiveMobile() {
  const { t, i18n } = useTranslation('dashboard');
  const { activeProjectId, activeTeamId } = useTeamContext() || {};
  const { org, user } = useAuth() || {};
  const userRole = user?.role || user?.org_role || user?.membership_role || 'member';
  const [messages, setMessages] = useState(() => loadMsgs());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentEvents, setAgentEvents] = useState([]); // live tool_call/tool_result stream
  const [selectedModel, setSelectedModel] = useState('gpt-oss-120b');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  // Chat scope — org-wide (null) or one project; mirrors Overview.jsx. Follows
  // the global switcher, overridable per-conversation from the composer chip.
  const [chatScope, setChatScope] = useState(activeProjectId || null);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  useEffect(() => { setChatScope(activeProjectId || null); }, [activeProjectId]);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedScope, setSelectedScope] = useState('personal');
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  // Upload pipeline state — one row per file.
  // status: 'queued' | 'uploading' | 'extracting' | 'making' | 'saving' | 'done' | 'error'
  const [uploads, setUploads] = useState([]);
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchProjects = useCallback(async () => {
    if (!org?.id) {
      setProjects([]);
      setProjectsError(null);
      return;
    }
    setLoadingProjects(true);
    setProjectsError(null);
    try {
      const data = activeTeamId
        ? await apiClient.listTeamProjects(activeTeamId)
        : await apiClient.listAccessibleProjects();
      setProjects(data.projects || []);
    } catch (err) {
      setProjects([]);
      setProjectsError(err?.response?.status === 401
        ? 'Session expired — refresh the page to sign back in.'
        : (err?.response?.data?.error || err?.message || 'Failed to load projects'));
    } finally {
      setLoadingProjects(false);
    }
  }, [activeTeamId, org?.id]);

  useEffect(() => { if (scopeModalOpen) fetchProjects(); }, [scopeModalOpen, fetchProjects]);

  // Push-to-talk dictation — same Groq Whisper path as AI Meeting Notes.
  // Appends transcript to the composer; user can edit before sending.
  const dictation = useDictation((text) => {
    setInput((prev) => {
      const next = (prev ? prev.replace(/\s*$/, '') + ' ' : '') + text;
      return next.slice(0, MAX_CHARS);
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  });

  // Persist messages.
  useEffect(() => { saveMsgs(messages); }, [messages]);

  // Scroll to bottom on new messages / thinking.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages, loading]);

  // Auto-resize textarea (capped at 5 lines so it never eats the screen).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  const sendText = useCallback(async (overrideText) => {
    const fromInput = overrideText == null;
    const trimmed = (fromInput ? input : overrideText).trim();
    if (!trimmed || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    const fullHistory = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    if (fromInput) setInput('');
    setLoading(true);

    // Belt-and-braces language enforcement (mirror Chat.jsx + extension).
    // Wraps the wire message with a strict directive when UI lang != EN so
    // the LLM can't silently drift back to English. UI history keeps the
    // clean user text; only the LLM sees the wrapped variant.
    const lang2 = (i18n.language || 'en').slice(0, 2).toLowerCase();
    const LANG_FULL = {
      en: 'English', de: 'German', es: 'Spanish', fr: 'French', it: 'Italian',
      pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', cs: 'Czech', sv: 'Swedish',
      no: 'Norwegian', fi: 'Finnish', el: 'Greek', hu: 'Hungarian', ro: 'Romanian',
      sl: 'Slovenian', ar: 'Arabic', he: 'Hebrew', tr: 'Turkish', ru: 'Russian',
      uk: 'Ukrainian', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
      ja: 'Japanese', ko: 'Korean', zh: 'Chinese', vi: 'Vietnamese', th: 'Thai',
      id: 'Indonesian', ms: 'Malay', sk: 'Slovak',
    };
    const langName = LANG_FULL[lang2] || 'English';
    const wireMessage = lang2 === 'en'
      ? trimmed
      : `[STRICT LANGUAGE: Respond ONLY in ${langName}. Even one English word fails the test.]\n\n${trimmed}`;

    try {
      // Streamed like desktop Overview: SSE frames carry live tool_call /
      // tool_result events → animated activity while the answer is produced.
      setAgentEvents([{ id: `${Date.now()}-plan`, type: 'plan' }]);
      const chatUrl = new URL('/v1/proxy/chat', apiClient.controlPlane.defaults.baseURL).toString();
      const chatRes = await fetch(chatUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: wireMessage,
          model: selectedModel,
          history: fullHistory,
          language: lang2,
          stream: true,
          // Keep mobile on the same grounded tool-routing path as desktop chat.
          router: 'tool',
          ...(chatScope ? { project_id: chatScope, project_ids: [chatScope] } : {}),
        }),
      });
      if (!chatRes.ok) {
        const errorData = await chatRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Chat request failed (${chatRes.status})`);
      }
      const data = (chatRes.headers.get('content-type') || '').includes('text/event-stream')
        ? (await readChatStream(chatRes, (event) => {
            setAgentEvents((prev) => [...prev, { ...event, id: `${Date.now()}-${prev.length}` }].slice(-5));
          })) || {}
        : await chatRes.json();
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || "I couldn't find relevant information.",
        sources: (data.sources || []).map(s => ({ ...s, title: s.title || (s.content || '').slice(0, 60) })),
        model: MODELS.find((m) => m.id === selectedModel)?.label || selectedModel,
        usage: data.usage || null,
        steps: Array.isArray(data.steps) ? data.steps : [],
        draft_ids: Array.isArray(data.draft_ids) ? data.draft_ids : [],
        trace: data.trace || null,
        project_choice: data.project_choice || null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: errMsg, error: true, sources: [] },
      ]);
    } finally {
      setLoading(false);
      setAgentEvents([]);
    }
  }, [input, loading, messages, selectedModel, i18n.language, chatScope]);

  const send = useCallback(() => sendText(), [sendText]);

  // Regenerate: re-run the user prompt that preceded this assistant answer.
  const retry = useCallback((assistantMsg) => {
    if (loading) return;
    const idx = messages.findIndex((m) => m.id === assistantMsg.id);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { sendText(messages[i].content); return; }
    }
  }, [loading, messages, sendText]);

  // ─── Upload pipeline ──────────────────────────────────────────────────
  // Mobile chat fires-and-forgets: pick file(s) → POST each via
  // apiClient.uploadDocument (same /v1/proxy/knowledge/upload endpoint
  // KnowledgeBase.jsx uses → same canonical ingest pipeline → memories,
  // facts, edges, etc.). The status strip above the composer animates
  // through queued → uploading → extracting → making memories → saving →
  // done. The chat surface itself doesn't care — server handles
  // everything once the file lands.

  // Two-tier UX:
  //   • `received` — instant optimistic ack the moment the file is picked.
  //                  Shown as light-green ✓ "Sent to HIVE" so the user
  //                  feels the action landed without waiting for HTTP.
  //   • `processing` — background pipeline (extract → memories → save),
  //                    animates softly under the row.
  //   • `done` — confirmed by the server. Full green ✓ "Saved to memory".
  //   • `error` — flips red w/ retry hint.
  const STAGE_LABEL = {
    received: 'Sent to HIVE',
    processing: 'Processing in background',
    done: 'Saved to memory',
    error: 'Failed',
  };

  const handlePickFiles = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const queueFilesForUpload = useCallback((fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    setPendingFiles(files);
    setSelectedScope(org?.plan === 'enterprise' || org?.plan === 'team' ? 'project' : 'personal');
    setSelectedProject('');
    setScopeModalOpen(true);
  }, [org?.plan]);

  const updateUpload = (id, patch) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const removeUpload = (id) =>
    setUploads((prev) => prev.filter((u) => u.id !== id));

  const uploadOne = useCallback(async (row) => {
    // Row is already shown as "received" (optimistic ✓). After a quick
    // beat the row shifts to a soft "processing" state — server is doing
    // the real work but we don't gate the UI on it.
    setTimeout(() => updateUpload(row.id, { status: 'processing' }), 700);

    try {
      // Auto-route by MIME: image/* → Groq vision pipeline (uploadImage),
      // everything else → docling-backed /v1/proxy/knowledge/upload.
      const mime = (row.file.type || '').toLowerCase();
      const isImage = /^image\/(png|jpe?g|webp|gif)$/.test(mime);

      let result;
      if (isImage) {
        result = await apiClient.uploadImage(row.file, {
          ...(selectedScope === 'project' && selectedProject ? { projectId: selectedProject } : {}),
          ...(row.hint ? { hint: row.hint } : {}),
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            const pct = Math.round((evt.loaded / evt.total) * 100);
            updateUpload(row.id, { progress: pct });
          },
        });
      } else {
        const uploadOpts = selectedScope === 'project' && selectedProject
          ? { targetScope: 'organization', containerTag: `project:${selectedProject}` }
          : selectedScope === 'organization'
            ? { targetScope: 'organization' }
            : { targetScope: 'personal' };
        result = await apiClient.uploadDocument(row.file, {
          ...uploadOpts,
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            const pct = Math.round((evt.loaded / evt.total) * 100);
            updateUpload(row.id, { progress: pct });
          },
        });
      }

      const memId = result?.memory_id || result?.id || result?.memory?.id || null;
      const previewTitle = result?.title || (isImage ? (result?.classification?.suggested_title || 'Image saved') : 'Document saved');
      updateUpload(row.id, {
        status: 'done',
        progress: 100,
        memoryId: memId,
        previewTitle,
        kind: result?.classification?.kind || null,
      });
      // Auto-dismiss confirmed rows after 4s — quick, doesn't clutter chat.
      setTimeout(() => removeUpload(row.id), 4000);
    } catch (err) {
      updateUpload(row.id, {
        status: 'error',
        error: err?.response?.data?.detail || err?.message || 'Upload failed — tap to retry',
      });
    }
  }, [selectedProject, selectedScope]);

  const handleConfirmScope = useCallback(() => {
    const files = pendingFiles;
    setScopeModalOpen(false);
    setPendingFiles([]);
    if (!files.length) return;

    const rows = files.map((f, idx) => ({
      id: `up-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
      status: 'received',
      progress: 0,
      error: null,
      memoryId: null,
    }));
    setUploads((prev) => [...prev, ...rows]);
    rows.forEach((row) => uploadOne(row));
  }, [pendingFiles, uploadOne]);

  const handleCloseScope = useCallback(() => {
    setScopeModalOpen(false);
    setPendingFiles([]);
    setSelectedProject('');
    setSelectedScope('personal');
  }, []);

  const clearChat = () => {
    if (!messages.length) return;
    if (typeof window !== 'undefined' && !window.confirm('Clear all messages?')) return;
    setMessages([]);
    try { localStorage.removeItem(storageKey()); } catch {}
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  const chatDrawerActions = (
    <>
      <button onClick={() => setMessages([])} className="w-full h-11 px-3 rounded-[14px] flex items-center gap-3 text-[13.5px] font-semibold bg-[#0a0a0a] text-white mb-2">
        <Plus size={16} /> New chat
      </button>
      <button onClick={() => window.dispatchEvent(new Event('hive:install'))} className="w-full h-11 px-3 rounded-[14px] flex items-center gap-3 text-[13.5px] text-[#3d3d3a] active:bg-[#f1eee7]">
        <Download size={16} className="text-[#6b6b66]" /> Install app
      </button>
      <button onClick={clearChat} className="w-full h-11 px-3 rounded-[14px] flex items-center gap-3 text-[13.5px] text-[#dc2626] active:bg-red-50">
        <Trash2 size={16} /> Clear chat history
      </button>
    </>
  );
  return (
    <MobileShell noScroll bareHeader extraDrawerActions={chatDrawerActions}>
      {/* Floating top-right cluster — language + model (drop-downs). The chosen
          model drives the /chat synthesis; language sets the reply language. */}
      <div className="absolute right-2.5 z-40 flex items-center gap-1.5"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 9px)' }}>
        <div className="relative">
          {langMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setLangMenuOpen(false)} />}
          <button
            onClick={() => { setLangMenuOpen((v) => !v); setModelMenuOpen(false); setScopeMenuOpen(false); }}
            className="relative z-40 inline-flex items-center gap-1 h-9 px-2.5 rounded-full bg-[#faf9f4]/85 backdrop-blur-sm text-[11.5px] font-semibold text-[#3d3d3a] active:bg-[#ece9e2]"
            aria-label="Reply language"
          >
            <Globe size={13} className="text-[#117dff]" />
            <span>{((i18n.language || 'en').slice(0, 2)).toUpperCase()}</span>
            <ChevronDown size={11} className="text-[#a3a3a3]" />
          </button>
          {langMenuOpen && (
            <div className="absolute top-full mt-1.5 right-0 z-40 w-[180px] max-h-[300px] overflow-y-auto bg-white border border-[#e8e5de] rounded-xl shadow-lg py-1" onClick={() => setLangMenuOpen(false)}>
              {LANG_OPTIONS.map((l) => {
                const active = ((i18n.language || 'en').slice(0, 2)) === l.c;
                return (
                  <button key={l.c} onClick={() => { i18n.changeLanguage(l.c); setLangMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] ${active ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'} active:bg-[#f3f1ec]`}>
                    <span>{l.n}</span>
                    <span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{l.c}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="relative">
          {modelMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setModelMenuOpen(false)} />}
          <button
            onClick={() => { setModelMenuOpen((v) => !v); setLangMenuOpen(false); setScopeMenuOpen(false); }}
            className="relative z-40 inline-flex items-center gap-1 h-9 px-2.5 rounded-full bg-[#faf9f4]/85 backdrop-blur-sm text-[11.5px] font-semibold text-[#3d3d3a] active:bg-[#ece9e2]"
            aria-label="Model"
          >
            <Sparkles size={12} className="text-[#117dff]" />
            <span>{currentModel.label.replace('GPT-OSS ', '').replace('Llama ', 'L')}</span>
            <ChevronDown size={11} className="text-[#a3a3a3]" />
          </button>
          {modelMenuOpen && (
            <div className="absolute top-full mt-1.5 right-0 z-40 w-[200px] bg-white border border-[#e8e5de] rounded-xl shadow-lg py-1" onClick={() => setModelMenuOpen(false)}>
              {MODELS.map((m) => (
                <button key={m.id} onClick={() => { setSelectedModel(m.id); setModelMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-[13px] ${m.id === selectedModel ? 'text-[#117dff] font-semibold' : 'text-[#0a0a0a]'} active:bg-[#f3f1ec]`}>
                  <span>{m.label}</span>
                  <span className="text-[9.5px] font-mono uppercase tracking-wide text-[#a3a3a3]">{m.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* New-feature promo — top-right below the header; hides while recording */}
      <MeetingNotesPromo mobile />

      {/* ── Messages ───────────────────────────────── */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-col gap-4 px-4 pb-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center text-center gap-4 min-h-[46vh]">
              {/* Claude-style centered greeting: accent mark + large serif name line */}
              <Hexagon size={34} className="text-[#117dff]" strokeWidth={1.6} />
              <div className="text-[32px] leading-tight text-[#1a1a17]" style={{ fontFamily: 'Georgia, \'Times New Roman\', serif' }}>
                {(() => { const h = new Date().getHours(); const g = h < 12 ? t('overview.morning', 'Good morning') : h < 18 ? t('overview.afternoon', 'Good afternoon') : t('overview.evening', 'Good evening'); const n = (user?.name || user?.email || '').split(/[\s@]/)[0]; return n ? `${g}, ${n.charAt(0).toUpperCase()}${n.slice(1)}` : g; })()}
              </div>
              <div className="flex flex-col gap-2 mt-4 w-full">
                {[
                  t('overview.examples.recent', 'What have I been working on lately?'),
                  t('overview.examples.decisions', 'Summarize my recent decisions'),
                  t('overview.examples.prefs', 'What are my key preferences?'),
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => { setInput(p); requestAnimationFrame(() => inputRef.current?.focus()); }}
                    className="text-left px-4 py-2.5 rounded-full border border-[#ece9e2] text-[13px] text-[#525252] active:bg-[#f1eee7] bg-transparent"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user'
              ? <UserBubble key={m.id} content={m.content} />
              : <AiBubble key={m.id} msg={m} onRetry={retry} />
          )}
          {loading && <Thinking events={agentEvents} />}
        </div>
      </div>

      {/* ── Upload status strip (above composer, animated) ── */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 px-3 pt-2 overflow-hidden"
          >
            <div className="flex flex-col gap-1.5">
              {uploads.map((u) => {
                const isReceived = u.status === 'received';
                const isProcessing = u.status === 'processing';
                const isDone = u.status === 'done';
                const isErr = u.status === 'error';
                return (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[12px] overflow-hidden ${
                      isDone
                        ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                        : isErr
                          ? 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
                          : isProcessing
                            ? 'bg-[#fafff4] border-[#d4e8c4] text-[#365314]'
                            : 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                    }`}
                  >
                    {/* Soft shimmer while processing */}
                    {isProcessing && (
                      <motion.div
                        className="absolute inset-y-0 left-0 right-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(17,125,255,0.06) 50%, transparent 100%)',
                          backgroundSize: '200% 100%',
                        }}
                        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                    <div className="relative flex-shrink-0">
                      {isDone || isReceived ? (
                        <CheckCircle2 size={16} className={isDone ? 'text-[#16a34a]' : 'text-[#16a34a]'} />
                      ) : isErr ? (
                        <FileWarning size={16} className="text-[#dc2626]" />
                      ) : (
                        <Loader2 size={16} className="text-[#117dff] animate-spin" />
                      )}
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <div className="font-semibold truncate text-[12.5px] leading-tight">{u.name}</div>
                      <div className="text-[10.5px] mt-0.5 font-mono opacity-80">
                        {isErr ? u.error : (STAGE_LABEL[u.status] || u.status)}
                      </div>
                    </div>
                    {isErr ? (
                      <button
                        onClick={() => uploadOne(u)}
                        className="relative px-2 py-1 rounded-md text-[10.5px] font-semibold border border-[#fecaca] bg-white text-[#b91c1c] active:bg-[#fef2f2] flex-shrink-0"
                      >
                        Retry
                      </button>
                    ) : null}
                    <button
                      onClick={() => removeUpload(u.id)}
                      className="relative w-6 h-6 flex items-center justify-center rounded-md text-current opacity-60 active:opacity-100 active:bg-black/5 flex-shrink-0"
                      aria-label="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PWA install (Android one-tap / iOS Add-to-Home-Screen) ── */}
      <PwaInstall />

      {/* ── Composer ───────────────────────────────── */}
      <div className="flex-shrink-0 px-1.5 pt-2 bg-[#faf9f4]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}>
        {/* Claude-style floating input card: text row on top, action row below */}
        <div className="bg-white border border-[#e8e5de] rounded-[28px] shadow-[0_2px_14px_rgba(0,0,0,0.06)] px-4 pt-3 pb-2.5 focus-within:border-[#d5d1c8]">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              queueFilesForUpload(e.target.files);
              // Reset so picking the same file twice still fires onChange.
              if (e.target) e.target.value = '';
            }}
            accept="*/*"
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={t('overview.chatWith', 'Chat with HIVE…')}
            className="w-full resize-none border-none outline-none bg-transparent text-[16px] py-0.5 placeholder:text-[#a8a49c] max-h-[120px] leading-snug"
            style={{ fontFamily: 'inherit' }}
          />
          {/* Action row: + · scope chip · spacer · mic · black voice/send */}
          <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handlePickFiles}
            className="w-9 h-9 rounded-full border border-[#e8e5de] text-[#3d3d3a] flex items-center justify-center flex-shrink-0 active:bg-[#f1eee7]"
            aria-label="Attach files"
          >
            <Plus size={18} strokeWidth={2} />
          </button>
          {/* Scope drop-UP — org-wide vs one project (Overview.jsx behavior) */}
          <div className="relative">
            {scopeMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setScopeMenuOpen(false)} />}
            <button
              onClick={() => { setScopeMenuOpen((v) => !v); setModelMenuOpen(false); setLangMenuOpen(false); }}
              className={`relative z-40 inline-flex items-center gap-1 h-9 px-3 rounded-full text-[12px] font-medium max-w-[130px] ${chatScope ? 'bg-[#117dff]/[0.08] text-[#117dff]' : 'bg-[#f1eee7] text-[#3d3d3a]'}`}
              aria-label={t('overview.scope.hint', 'Answer scope: org-wide or one project')}
            >
              {chatScope ? <Boxes size={12} /> : <Building2 size={12} />}
              <span className="truncate">{chatScope ? (projects.find((pr) => pr.id === chatScope)?.name || t('overview.scope.project', 'Project')) : t('overview.scope.org', 'Org-wide')}</span>
            </button>
            {scopeMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-40 w-56 bg-white border border-[#e8e5de] rounded-xl shadow-lg p-1.5">
                <p className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[#a3a3a3]">{t('overview.scope.title', 'Answer scope')}</p>
                <button
                  onClick={() => { setChatScope(null); setScopeMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${!chatScope ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] active:bg-[#faf9f4]'}`}
                >
                  <Building2 size={12} /> {t('overview.scope.org', 'Org-wide')}
                </button>
                {(projects || []).map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => { setChatScope(pr.id); setScopeMenuOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] text-left ${chatScope === pr.id ? 'bg-[#117dff]/[0.08] text-[#117dff] font-semibold' : 'text-[#0a0a0a] active:bg-[#faf9f4]'}`}
                  >
                    <Boxes size={12} /> <span className="truncate">{pr.name}</span>
                  </button>
                ))}
                {(projects || []).length === 0 && (
                  <p className="px-2 py-1.5 text-[11px] text-[#a3a3a3]">{t('overview.scope.noProjects', 'No projects yet')}</p>
                )}
              </div>
            )}
          </div>
          <span className="flex-1" />
          {/* Push-to-talk mic — tap to record, tap to stop & transcribe */}
          <button
            onClick={dictation.toggle}
            disabled={dictation.state === 'transcribing' || loading}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-40 ${
              dictation.state === 'recording'
                ? 'bg-[#ef4444] text-white animate-pulse'
                : 'text-[#525252] active:bg-[#ece9e2]/60'
            }`}
            aria-label={dictation.state === 'recording' ? 'Stop recording' : 'Dictate'}
            title={dictation.error || (dictation.state === 'recording' ? 'Stop & transcribe' : 'Speak')}
          >
            {dictation.state === 'transcribing'
              ? <Loader2 size={18} className="animate-spin" />
              : dictation.state === 'recording'
                ? <Square size={16} />
                : <Mic size={18} />}
          </button>
          <button
            onClick={send}
            disabled={(!input.trim() && !loading) || loading}
            className="w-10 h-10 rounded-full bg-[#1a1a17] text-white flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform disabled:opacity-100"
            aria-label={input.trim() ? 'Send' : 'Voice'}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : input.trim() ? <Send size={16} /> : <AudioLines size={17} />}
          </button>
          </div>
        </div>
      </div>

      <UploadScopeModal
        open={scopeModalOpen}
        files={pendingFiles}
        org={org}
        userRole={userRole}
        projects={projects}
        loadingProjects={loadingProjects}
        projectsError={projectsError}
        onRetryProjects={fetchProjects}
        selectedScope={selectedScope}
        onScopeChange={setSelectedScope}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        onConfirm={handleConfirmScope}
        onClose={handleCloseScope}
      />
    </MobileShell>
  );
}
