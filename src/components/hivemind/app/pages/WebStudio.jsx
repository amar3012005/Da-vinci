import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Globe, Search, Link as LinkIcon, Send, Loader2, AlertTriangle, Lock, X,
  ChevronDown, ChevronUp, RefreshCw, Save, BookmarkPlus, CheckCircle2,
  RotateCcw, ExternalLink, Activity, Layers, TrendingUp, Zap, Info,
  ShieldAlert, ShieldCheck, Ban, FileText, Sparkles, Chrome, Eye,
  SlidersHorizontal, Code2, Copy, Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';
import WebResultModal from '../components/WebResultModal';

/* ─── Helpers ──────────────────────────────────────────────────────── */

const URL_RE = /^https?:\/\/\S+$/i;
const URL_LIKE_RE = /^[\w-]+\.[a-z]{2,}/i;

function looksLikeUrl(s) {
  const t = s.trim();
  return URL_RE.test(t) || URL_LIKE_RE.test(t);
}

function normalizeUrl(s) {
  const t = s.trim();
  if (URL_RE.test(t)) return t;
  return `https://${t}`;
}

function formatMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 1000) return 'now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function isFeatureLocked(err) {
  const msg = err?.response?.data?.error || err?.message || '';
  return /feature.*not.*enabled|upgrade|locked/i.test(msg)
    || err?.response?.data?.code === 'feature_not_enabled';
}

/* ─── Standalone report (new-tab) — premium rendered HTML ──────────── */

// Lightweight, dependency-free Markdown → HTML. Escapes first, then applies
// block + inline transforms. Good enough for Tavily research output.
function mdToHtml(md) {
  if (!md) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s)]+)(?=[\s).,]|$)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inUl = false, inOl = false, inCode = false, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const closeLists = () => { if (inUl) { out.push('</ul>'); inUl = false; } if (inOl) { out.push('</ol>'); inOl = false; } };
  // GFM pipe-table helpers. Separator row = pipes + dashes (+ optional `:` align).
  const isTableSep = (s) => /^[\s|:-]+$/.test(s) && s.includes('-') && s.includes('|');
  const splitRow = (r) => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) { flushPara(); closeLists(); if (!inCode) { out.push('<pre><code>'); inCode = true; } else { out.push('</code></pre>'); inCode = false; } continue; }
    if (inCode) { out.push(esc(line)); continue; }
    if (/^\s*$/.test(line)) { flushPara(); closeLists(); continue; }
    // GFM table: header row with a pipe + a separator row immediately after.
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara(); closeLists();
      const headers = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((c) => {
        const l = c.startsWith(':'), r = c.endsWith(':');
        return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
      });
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      i--; // step back; the for-loop will advance past the consumed block
      const sty = (ci) => (aligns[ci] ? ` style="text-align:${aligns[ci]}"` : '');
      const th = headers.map((hd, ci) => `<th${sty(ci)}>${inline(hd)}</th>`).join('');
      const trs = rows.map((r) => `<tr>${headers.map((_, ci) => `<td${sty(ci)}>${inline(r[ci] || '')}</td>`).join('')}</tr>`).join('');
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flushPara(); closeLists(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^\s*([-*+])\s+/.test(line)) { flushPara(); if (inOl) { out.push('</ol>'); inOl = false; } if (!inUl) { out.push('<ul>'); inUl = true; } out.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`); continue; }
    if (/^\s*\d+\.\s+/.test(line)) { flushPara(); if (inUl) { out.push('</ul>'); inUl = false; } if (!inOl) { out.push('<ol>'); inOl = true; } out.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`); continue; }
    if (/^\s*>\s?/.test(line)) { flushPara(); closeLists(); out.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`); continue; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { flushPara(); closeLists(); out.push('<hr/>'); continue; }
    para.push(line.trim());
  }
  flushPara(); closeLists(); if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

// In-app README-render stylesheet (per the render-readme skill): clean, bold,
// tabular — GitHub/Notion document look. Flat white, sharp corners, heavy
// grotesque headings, neutral sans body, real tables + verbatim code blocks.
const RESEARCH_DOC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Saira:ital,wght@1,800;1,900&display=swap');
/* SINGULANCE wordmark — heavy italic, slightly skewed, sharp speed-font feel */
.sgl-logo{font-family:'Saira','Bricolage Grotesque',system-ui,sans-serif;font-style:italic;font-weight:900;letter-spacing:-.01em;transform:skewX(-7deg);display:inline-block;line-height:1;color:#16181d;text-transform:uppercase}
.rm-doc{--ink:#16181d;--body:#33373f;--muted:#8a909c;--line:#e6e8ec;--code-bg:#f5f6f7;--accent:#117dff;font-family:'Hanken Grotesk',system-ui,sans-serif;font-size:16.5px;line-height:1.72;color:var(--body)}
.rm-doc h1,.rm-doc h2,.rm-doc h3,.rm-doc h4{font-family:'Bricolage Grotesque',system-ui,sans-serif;color:var(--ink);line-height:1.16;letter-spacing:-.015em}
.rm-doc h1{font-size:28px;font-weight:800;margin:1.3em 0 .45em}
.rm-doc h1:first-child,.rm-doc h2:first-child{margin-top:0;border-top:none;padding-top:0}
.rm-doc h2{font-size:23px;font-weight:700;margin:1.5em 0 .5em;padding-top:.7em;border-top:1px solid var(--line)}
.rm-doc h3{font-size:18px;font-weight:700;margin:1.25em 0 .35em}
.rm-doc h4{font-size:15px;font-weight:700;color:var(--muted);margin:1.15em 0 .3em}
.rm-doc p{margin:.85em 0}
.rm-doc ul,.rm-doc ol{margin:.7em 0;padding-left:1.5em}.rm-doc li{margin:.42em 0}
.rm-doc strong{color:var(--ink);font-weight:700}
.rm-doc a{color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(26,69,196,.28)}.rm-doc a:hover{border-bottom-color:var(--accent)}
.rm-doc code{font-family:'IBM Plex Mono',monospace;font-size:.86em;background:var(--code-bg);border:1px solid var(--line);border-radius:4px;padding:.1em .4em}
.rm-doc pre{background:var(--code-bg);border:1px solid var(--line);border-radius:8px;padding:18px 20px;overflow-x:auto;white-space:pre;font-family:'IBM Plex Mono',monospace;font-size:13px;line-height:1.6;color:var(--ink);margin:1.1em 0}.rm-doc pre code{background:none;border:none;padding:0;font-size:inherit}
.rm-doc blockquote{margin:1.1em 0;padding:.1em 0 .1em 1.1em;border-left:3px solid var(--ink);color:#52586a}.rm-doc blockquote p{margin:.3em 0}
.rm-doc hr{border:none;border-top:1px solid var(--line);margin:2em 0}
.rm-doc table{width:100%;border-collapse:collapse;margin:1.5em 0;font-size:14px;border:1px solid var(--line)}
.rm-doc th,.rm-doc td{border:1px solid var(--line);padding:10px 14px;text-align:left;vertical-align:top}
.rm-doc thead th{background:#f3f4f6;font-weight:700;color:var(--ink);font-size:11px;letter-spacing:.04em;text-transform:uppercase}
.rm-doc tbody td{color:var(--body)}
.rm-doc tbody tr:nth-child(even){background:#fafbfc}
`;

// Self-contained, visually-rich HTML doc for a research report, with an
// embedded "Save to HIVEMIND" + scope dropdown. On save it postMessages the
// opener (same-origin via window.open + document.write); the opener performs
// the authenticated, scoped save and posts the result back.
function buildResearchReportHtml(job, scopeOptions = []) {
  const result = Array.isArray(job.results) ? job.results[0] : null;
  const title = deriveJobTitle(job, job.results || []);
  const md = result ? (typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2)) : '';
  const sources = (result && Array.isArray(result.sources)) ? result.sources : [];
  const bodyHtml = mdToHtml(md);
  const model = job.params?.model || 'auto';
  const dur = job.duration_ms != null ? `${Math.round(job.duration_ms / 1000)}s` : '';
  const dateStr = new Date(job.createdAt || job.created_at || Date.now()).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const J = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
  const optionsHtml = scopeOptions.map((o) => `<option data-scope="${o.scope}" data-project="${o.projectId || ''}">${(o.label || '').replace(/</g, '&lt;')}</option>`).join('');
  const sourcesHtml = sources.map((s, i) => `
      <a class="src" href="${(s.url || '#').replace(/"/g, '&quot;')}" target="_blank" rel="noopener">
        <span class="src-n">${i + 1}</span>
        <span class="src-b"><span class="src-t">${(s.title || s.url || '').replace(/</g, '&lt;')}</span>
        <span class="src-u">${(s.url || '').replace(/</g, '&lt;')}</span></span></a>`).join('');

  const yr = new Date(job.createdAt || job.created_at || Date.now()).getFullYear();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title.replace(/</g, '&lt;')} — SINGULANCE Intelligence</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Saira:ital,wght@1,800;1,900&display=swap" rel="stylesheet">
<style>
  :root{--paper:#fff;--ink:#16181d;--body:#33373f;--sub:#6b7280;--muted:#8a909c;--line:#e6e8ec;--code-bg:#f5f6f7;--accent:#117dff}
  *{box-sizing:border-box}
  html,body{margin:0;background:#fff;color:var(--ink);font-family:'Hanken Grotesk',system-ui,sans-serif;line-height:1.72;-webkit-font-smoothing:antialiased}
  .mono{font-family:'IBM Plex Mono',monospace}
  /* top brand bar */
  .topbar{max-width:880px;margin:0 auto;padding:34px 32px 0;display:flex;align-items:center;justify-content:space-between}
  .brand{font-family:'Saira','Bricolage Grotesque',sans-serif;font-style:italic;font-weight:900;font-size:20px;letter-spacing:-.01em;text-transform:uppercase;transform:skewX(-7deg);display:inline-block;color:var(--ink)}
  .kicker{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}
  .rule{max-width:880px;margin:26px auto 0;border-top:1px solid var(--line)}
  /* hero */
  .hero{max-width:880px;margin:0 auto;padding:34px 32px 0}
  .hero .tag{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);display:flex;align-items:center;gap:9px;margin-bottom:18px}
  .hero .tag i{width:6px;height:6px;border-radius:50%;background:var(--accent);font-style:normal}
  h1.title{font-family:'Bricolage Grotesque';font-weight:800;font-size:clamp(32px,5vw,54px);line-height:1.06;letter-spacing:-.02em;margin:0 0 24px}
  .meta{display:flex;flex-wrap:wrap;gap:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0}
  .meta div{padding:0 24px;border-right:1px solid var(--line)}.meta div:first-child{padding-left:0}.meta div:last-child{border-right:none}
  .meta .k{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:3px}
  .meta .v{font-family:'Bricolage Grotesque';font-weight:700;font-size:15px;color:var(--ink)}
  /* document — flat, on the page, no card box */
  .wrap{max-width:880px;margin:0 auto;padding:36px 32px 140px}
  article{font-size:16.5px;color:var(--body)}
  article h1,article h2,article h3,article h4{font-family:'Bricolage Grotesque';color:var(--ink);line-height:1.16;letter-spacing:-.015em}
  article h1{font-size:28px;font-weight:800;margin:1.3em 0 .45em}
  article h2{font-size:23px;font-weight:700;margin:1.5em 0 .5em;padding-top:.7em;border-top:1px solid var(--line)}
  article h3{font-size:18px;font-weight:700;margin:1.25em 0 .35em}article h4{font-size:15px;color:var(--muted);margin:1.15em 0 .3em;font-weight:700}
  article p{margin:.85em 0}
  article ul,article ol{margin:.7em 0;padding-left:1.5em}article li{margin:.42em 0}
  article strong{color:var(--ink);font-weight:700}
  article a{color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(26,69,196,.28)}article a:hover{border-bottom-color:var(--accent)}
  article code{font-family:'IBM Plex Mono',monospace;font-size:.86em;background:var(--code-bg);border:1px solid var(--line);border-radius:4px;padding:.1em .4em}
  article pre{font-family:'IBM Plex Mono',monospace;background:var(--code-bg);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:18px 20px;overflow-x:auto;white-space:pre;font-size:13px;line-height:1.6;margin:1.1em 0}article pre code{background:none;border:none;padding:0;color:inherit}
  article blockquote{margin:1.1em 0;padding:.1em 0 .1em 1.1em;border-left:3px solid var(--ink);color:#52586a}article blockquote p{margin:.3em 0}
  article hr{border:none;border-top:1px solid var(--line);margin:2em 0}
  article table{width:100%;border-collapse:collapse;margin:1.5em 0;font-size:14px;border:1px solid var(--line)}
  article th,article td{border:1px solid var(--line);padding:10px 14px;text-align:left;vertical-align:top}
  article thead th{background:#f3f4f6;font-weight:700;color:var(--ink);font-size:11px;letter-spacing:.04em;text-transform:uppercase}
  article tbody td{color:var(--body)}
  article tbody tr:nth-child(even){background:#fafbfc}
  .sources{margin-top:40px;padding-top:28px;border-top:1px solid var(--line)}
  .sec-h{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin:0 0 18px}
  .src{display:flex;gap:14px;align-items:baseline;padding:13px 0;border-bottom:1px solid var(--line);text-decoration:none}
  .src:hover .src-t{color:var(--accent)}
  .src-n{flex:0 0 auto;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--accent);font-weight:500}
  .src-b{min-width:0}.src-t{display:block;font-family:'Bricolage Grotesque';font-weight:700;font-size:15px;color:var(--ink);transition:color .15s}
  .src-u{display:block;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
  /* footer */
  .foot{max-width:880px;margin:0 auto;padding:0 32px 56px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .foot .made{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.04em;color:var(--muted)}
  .foot .made b{color:var(--ink);font-weight:500}
  .foot .mk{font-family:'Saira','Bricolage Grotesque',sans-serif;font-style:italic;font-weight:900;font-size:15px;letter-spacing:-.01em;text-transform:uppercase;transform:skewX(-7deg);display:inline-block;color:#b5bac4}
  /* sticky action bar — flat, sharp */
  .toolbar{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:flex-end;gap:10px;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);border-top:1px solid var(--line);padding:12px 32px;z-index:50}
  .toolbar .tb-inner{width:100%;max-width:880px;display:flex;align-items:center;justify-content:flex-end;gap:10px}
  .toolbar select{font-family:'Hanken Grotesk',sans-serif;font-weight:600;font-size:12px;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:0;padding:9px 11px;outline:none;cursor:pointer}
  .btn{font-family:'Hanken Grotesk',sans-serif;font-size:12px;font-weight:700;border:none;border-radius:0;padding:10px 15px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:background .15s}
  .btn-save{background:#16181d;color:#fff}.btn-save:hover{background:#000}.btn-save:disabled{opacity:.55;cursor:default}
  .btn-print{background:#fff;color:#33373f;border:1px solid var(--line)}.btn-print:hover{border-color:#16181d}
  .toast{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#2e7d4f;max-width:240px;line-height:1.35;margin-right:auto}
  @media (max-width:640px){.wrap,.hero,.topbar,.foot{padding-left:20px;padding-right:20px}.meta div{padding:0 14px}}
  @media print{.toolbar{display:none}}
</style></head><body>
  <div class="topbar"><div class="brand">Singulance</div><div class="kicker">Intelligence Report · ${yr}</div></div>
  <div class="rule"></div>
  <div class="hero">
    <div class="tag"><i></i> Deep Research Dossier</div>
    <h1 class="title">${title.replace(/</g, '&lt;')}</h1>
    <div class="meta">
      <div><span class="k">Model</span><span class="v">${model}</span></div>
      ${dur ? `<div><span class="k">Compiled in</span><span class="v">${dur}</span></div>` : ''}
      <div><span class="k">Sources</span><span class="v">${sources.length}</span></div>
      <div><span class="k">Issued</span><span class="v">${dateStr}</span></div>
    </div>
  </div>
  <div class="wrap"><article>${bodyHtml}</article>
    ${sources.length ? `<div class="sources"><div class="sec-h">References · ${sources.length}</div>${sourcesHtml}</div>` : ''}
  </div>
  <div class="foot">
    <div class="made">Built with <b>HIVEMIND</b> · enterprise memory intelligence</div>
    <div class="mk">SINGULANCE</div>
  </div>
  <div class="toolbar"><div class="tb-inner">
    <span class="toast" id="hm-toast"></span>
    <select id="hm-scope" title="Where to save">${optionsHtml}</select>
    <button class="btn btn-print" onclick="window.print()">Print</button>
    <button class="btn btn-save" id="hm-save">Save to HIVEMIND</button>
  </div></div>
<script>
  (function(){
    var JOB=${J(job.id)};
    var btn=document.getElementById('hm-save'),sel=document.getElementById('hm-scope'),toast=document.getElementById('hm-toast');
    function setToast(m,ok){toast.textContent=m;toast.style.color=ok?'#2e7d4f':'#c0392b';}
    btn.addEventListener('click',function(){
      if(!window.opener){setToast('Open from HIVEMIND to enable saving',false);return;}
      btn.disabled=true;btn.textContent='Saving…';setToast('',true);
      var o=sel.options[sel.selectedIndex];
      window.opener.postMessage({type:'hm-save-research',jobId:JOB,scope:o.dataset.scope||'personal',projectId:o.dataset.project||null,scopeLabel:o.text},'*');
    });
    window.addEventListener('message',function(e){
      var d=e.data||{};if(d.type!=='hm-save-result'||d.jobId!==JOB)return;
      if(d.ok){btn.textContent='✓ Saved';setToast((d.memories||0)+' memory saved · '+(d.scopeLabel||''),true);}
      else{btn.disabled=false;btn.textContent='Save to HIVEMIND';setToast('Save failed: '+(d.error||'error'),false);}
    });
  })();
</script></body></html>`;
}

// Open the report in a new tab (same-origin via document.write so it can
// postMessage the opener for the authenticated save).
function openResearchReportTab(job, scopeOptions) {
  const w = window.open('', '_blank');
  if (!w) return false; // popup blocked
  w.document.open(); w.document.write(buildResearchReportHtml(job, scopeOptions)); w.document.close();
  return true;
}

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function WebStudio() {
  const { t } = useTranslation('dashboard');
  const [searchParams, setSearchParams] = useSearchParams();
  const initialHealthOpen = searchParams.get('view') === 'health';

  // Prompt + mode
  const [prompt, setPrompt] = useState('');
  const [forcedMode, setForcedMode] = useState(() => {
    const m = searchParams.get('mode');
    return ['research', 'search', 'crawl'].includes(m) ? m : null;
  }); // null | 'research' | 'search' | 'crawl'
  const [crawlDepth, setCrawlDepth] = useState(1);
  const [crawlPageLimit, setCrawlPageLimit] = useState(10);
  // Research knobs (depth-equivalent for Tavily).
  const [researchModel, setResearchModel] = useState('auto'); // 'mini' | 'pro' | 'auto'
  const [citationFormat, setCitationFormat] = useState('numbered'); // numbered | mla | apa | chicago
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Sync forcedMode from URL ?mode= when navigating via sidebar sub-links
  useEffect(() => {
    const m = searchParams.get('mode');
    if (['research', 'search', 'crawl'].includes(m)) {
      setForcedMode(m);
    }
  }, [searchParams]);

  // Domain policy (URL paste)
  const [domainPolicy, setDomainPolicy] = useState(null);
  const [checkingPolicy, setCheckingPolicy] = useState(false);

  // Polling
  const [pollingId, setPollingId] = useState(null);
  const pollingRef = useRef(null);

  // Single-expanded-job model so the detail view can grow tall and let
  // the page itself scroll, while the list above stays capped at 10 rows.
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Modal
  const [selectedResult, setSelectedResult] = useState(null);

  // Admin drawer
  const [healthOpen, setHealthOpen] = useState(initialHealthOpen);
  const [adminAccessible, setAdminAccessible] = useState(false);

  // Locked plan
  const [featureLocked, setFeatureLocked] = useState(false);

  // API queries
  const { data: usage, refetch: refetchUsage }       = useApiQuery(() => apiClient.getWebUsage().catch(() => null));
  const { data: monthly, refetch: refetchMonthly }   = useApiQuery(() => apiClient.getWebMonthlyUsage().catch(() => null));
  const { data: jobs, refetch: refetchJobs }         = useApiQuery(() => apiClient.listWebJobs({ limit: 30 }).catch(() => null));
  const { data: metrics, refetch: refetchMetrics }   = useApiQuery(() => apiClient.getWebAdminMetrics().catch(() => null));

  // Probe entitlement + admin once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const limits = await apiClient.getWebLimits();
        if (!cancelled && limits?.feature_not_enabled) setFeatureLocked(true);
      } catch (err) {
        if (!cancelled && isFeatureLocked(err)) setFeatureLocked(true);
      }
      try {
        await apiClient.getWebAdminMetrics();
        if (!cancelled) setAdminAccessible(true);
      } catch {
        if (!cancelled) setAdminAccessible(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const jobList = useMemo(() => {
    if (!jobs) return [];
    return Array.isArray(jobs) ? jobs : (jobs.jobs || []);
  }, [jobs]);

  // ─── Resolve effective mode ────────────────────────────────
  // Default text → research (Tavily comprehensive report). Slash overrides:
  //   /research <q>  · /search <q> (raw 10 results) · /crawl <url>
  // URL paste → crawl auto-detect.
  const detectedMode = useMemo(() => {
    if (forcedMode) return forcedMode;
    const p = prompt.trim();
    if (!p) return 'research';
    if (p.startsWith('/research')) return 'research';
    if (p.startsWith('/search')) return 'search';
    if (p.startsWith('/crawl')) return 'crawl';
    return looksLikeUrl(p.split(/\s+/)[0]) ? 'crawl' : 'research';
  }, [prompt, forcedMode]);

  // Strip slash prefix
  const effectiveInput = useMemo(() => {
    return prompt.replace(/^\/(research|search|crawl)\s+/i, '').trim();
  }, [prompt]);

  // ─── Domain policy probe (debounced on URL change) ─────────
  useEffect(() => {
    if (detectedMode !== 'crawl' || !effectiveInput) {
      setDomainPolicy(null);
      return;
    }
    const url = normalizeUrl(effectiveInput.split(/\s+/)[0]);
    if (!URL_RE.test(url)) {
      setDomainPolicy(null);
      return;
    }
    let cancelled = false;
    setCheckingPolicy(true);
    const t = setTimeout(async () => {
      try {
        const policy = await apiClient.checkDomainPolicy(url);
        if (!cancelled) setDomainPolicy(policy);
      } catch {
        if (!cancelled) setDomainPolicy(null);
      } finally {
        if (!cancelled) setCheckingPolicy(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [effectiveInput, detectedMode]);

  // ─── Poll a job ────────────────────────────────────────────
  // While running, also refetch the full job list every tick so the
  // progress[] stream on research jobs shows up live in the expanded
  // detail view (the list endpoint returns the same row shape).
  const startPolling = useCallback((jobId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPollingId(jobId);
    pollingRef.current = setInterval(async () => {
      try {
        const r = await apiClient.getWebJob(jobId);
        refetchJobs();
        if (r?.status === 'succeeded' || r?.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPollingId(null);
          refetchUsage(); refetchMonthly();
        }
      } catch {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setPollingId(null);
        refetchJobs();
      }
    }, 1500);
  }, [refetchJobs, refetchUsage, refetchMonthly]);

  // ─── Submit ────────────────────────────────────────────────
  async function handleSubmit() {
    const input = effectiveInput;
    if (!input || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (detectedMode === 'crawl') {
        const url = normalizeUrl(input.split(/\s+/)[0]);
        if (domainPolicy?.blocked) {
          setSubmitError(`Domain blocked: ${domainPolicy.reason || 'policy denial'}`);
          setSubmitting(false);
          return;
        }
        const r = await apiClient.submitWebCrawl({ urls: [url], depth: crawlDepth, page_limit: crawlPageLimit });
        const id = r?.job_id || r?.id;
        if (id) startPolling(id);
      } else if (detectedMode === 'research') {
        const r = await apiClient.submitWebResearch({ input, model: researchModel, citation_format: citationFormat });
        const id = r?.job_id || r?.id;
        if (id) {
          setExpandedJobId(id); // auto-open detail so user sees progress stream
          startPolling(id);
        }
      } else {
        const r = await apiClient.submitWebSearch({ query: input, limit: 10 });
        const id = r?.job_id || r?.id;
        if (id) startPolling(id);
      }
      setPrompt('');
      setForcedMode(null);
      setDomainPolicy(null);
      refetchJobs();
      refetchUsage();
    } catch (err) {
      if (isFeatureLocked(err)) {
        setFeatureLocked(true);
        setSubmitError(t('webstudio.featureLockedError', 'This capability is not enabled on your plan. Upgrade to unlock.'));
      } else {
        setSubmitError(err.response?.data?.error || err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function toggleHealth() {
    const next = !healthOpen;
    setHealthOpen(next);
    setSearchParams(prev => {
      const np = new URLSearchParams(prev);
      if (next) np.set('view', 'health'); else np.delete('view');
      return np;
    }, { replace: true });
  }

  // The currently running research job (if any) takes over the upper
  // area. Once it succeeds it falls back to the "past research" toggle.
  const activeResearchJob = useMemo(() => {
    if (!pollingId) return null;
    const j = jobList.find(j => j.id === pollingId);
    if (!j) return null;
    if (j.type !== 'research') return null;
    if (j.status === 'succeeded' || j.status === 'failed') return null;
    return j;
  }, [jobList, pollingId]);

  // Past research toggle (drop-down list above the chat bar).
  const [previewJob, setPreviewJob] = useState(null);

  // Persisted save snapshots so the graph-tree summary survives modal
  // close + page reload. Keyed by jobId. Hydrated from localStorage on
  // mount; mutations flush back synchronously.
  const SAVES_KEY = 'hivemind:web-research-saves:v1';
  const [savedByJob, setSavedByJob] = useState(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(window.localStorage.getItem(SAVES_KEY) || '{}'); }
    catch { return {}; }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(SAVES_KEY, JSON.stringify(savedByJob)); }
    catch { /* storage may be disabled in private mode */ }
  }, [savedByJob]);

  const recordSave = useCallback((jobId, snapshot) => {
    setSavedByJob(prev => ({
      ...prev,
      [jobId]: { ...snapshot, savedAt: snapshot.savedAt || Date.now() },
    }));
  }, []);

  // Projects for the report's "Save to HIVEMIND" scope dropdown.
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const data = await apiClient.listAccessibleProjects();
        const list = Array.isArray(data) ? data : (data?.projects || []);
        if (on) setProjects(list.filter(Boolean));
      } catch { /* non-fatal — dropdown just shows Personal + Organization */ }
    })();
    return () => { on = false; };
  }, []);

  const scopeOptions = useMemo(() => ([
    { label: '🔒 Personal', scope: 'personal', projectId: null },
    { label: '🏢 Organization', scope: 'organization', projectId: null },
    ...projects.map((p) => ({ label: `📁 ${p.name || p.slug || 'Project'}`, scope: 'project', projectId: p.id })),
  ]), [projects]);

  // Open the finished report as a premium standalone HTML page in a new tab.
  const openReport = useCallback((job) => {
    const ok = openResearchReportTab(job, scopeOptions);
    if (!ok) window.alert('Popup blocked — allow popups for HIVEMIND to open the report.');
  }, [scopeOptions]);

  // Bridge: the report tab postMessages a scoped save request; perform the
  // authenticated save here and post the result back to that tab.
  useEffect(() => {
    const handler = async (e) => {
      const d = e.data || {};
      if (d.type !== 'hm-save-research' || !d.jobId) return;
      const job = jobList.find(j => j.id === d.jobId);
      const result = job && Array.isArray(job.results) ? job.results[0] : null;
      const reply = (msg) => { try { e.source?.postMessage({ type: 'hm-save-result', jobId: d.jobId, scopeLabel: d.scopeLabel, ...msg }, '*'); } catch { /* tab closed */ } };
      if (!job || !result) { reply({ ok: false, error: 'report not found' }); return; }
      try {
        // Atomic save_memory path (canonical) — NOT KB evidence/segments.
        await apiClient.saveResearchAsMemory({
          title: deriveJobTitle(job, job.results || []),
          markdown: typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2),
          sources: result.sources || [],
          tags: [job.params?.model ? `tavily-${job.params.model}` : 'tavily'],
          jobId: job.id,
          targetScope: d.scope || 'personal',
          projectId: d.projectId || undefined,
        });
        recordSave(job.id, { memory: true, scope: d.scope, savedAt: Date.now(), scopeLabel: d.scopeLabel });
        reply({ ok: true, memories: 1 });
      } catch (err) {
        reply({ ok: false, error: err.response?.data?.error || err.message });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [jobList, recordSave]);

  const researchJobs = useMemo(
    () => jobList.filter(j => j.type === 'research' && (j.status === 'succeeded' || j.status === 'failed')),
    [jobList]
  );
  const nonResearchJobs = useMemo(
    () => jobList.filter(j => j.type !== 'research'),
    [jobList]
  );

  return (
    <div className="font-['Space_Grotesk'] max-w-[1100px] mx-auto pb-10">
      {/* Header — compact, always visible */}
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Globe size={16} className="text-[#117dff]" />
            <h1 className="text-[18px] font-semibold text-[#0a0a0a]">{t('webstudio.title', 'Web Studio')}</h1>
            <span className="text-[9px] font-mono bg-[#117dff]/10 text-[#117dff] px-2 py-0.5 rounded uppercase tracking-wider">{t('webstudio.addonBadge', 'Add-on')}</span>
            {featureLocked && (
              <span className="text-[9px] font-mono bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <Lock size={8} /> {t('webstudio.locked', 'Locked')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#737373]">
            {t('webstudio.subtitle', 'Ask the web. Live progress streams here. Saves to HIVEMIND through the same canonical pipeline as Knowledge Base uploads.')}
          </p>
        </div>
        <UsageRings usage={usage} monthly={monthly} />
      </header>

      {/* Playground — mode selector + input pinned at the top, results grow below */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12px] text-red-700"
          >
            <AlertTriangle size={13} />{submitError}
            <button onClick={() => setSubmitError(null)} className="ml-auto text-red-400 hover:text-red-700">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <PromptBar
        prompt={prompt} setPrompt={setPrompt}
        mode={detectedMode} forcedMode={forcedMode} setForcedMode={setForcedMode}
        submitting={submitting} onSubmit={handleSubmit} onKey={handleKey}
        depth={crawlDepth} setDepth={setCrawlDepth}
        pageLimit={crawlPageLimit} setPageLimit={setCrawlPageLimit}
        researchModel={researchModel} setResearchModel={setResearchModel}
        citationFormat={citationFormat} setCitationFormat={setCitationFormat}
        domainPolicy={domainPolicy} checkingPolicy={checkingPolicy}
        locked={featureLocked}
      />

      {/* Results — grows below the playground, page itself scrolls (AppShell main).
          • Running research → live progress + streaming content
          • No active run → Past research toggle + (optional) drop-down list
          • Non-research jobs always show in their own compact list */}
      <div className="mt-6">
        {activeResearchJob ? (
          <LiveResearchPanel job={activeResearchJob} />
        ) : (
          <PastResearchPanel
            jobs={researchJobs}
            onPick={setPreviewJob}
            onOpenReport={openReport}
            locked={featureLocked}
            savedByJob={savedByJob}
            onExample={(m, p) => { setForcedMode(m); setPrompt(p); }}
          />
        )}

        {/* Non-research jobs (search/crawl) — always rendered below.       */}
        {nonResearchJobs.length > 0 && (
          <section className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">{t('webstudio.searchCrawlRuns', 'Search & Crawl runs')}</h3>
              <button onClick={refetchJobs} className="text-[10px] text-[#a3a3a3] hover:text-[#0a0a0a] flex items-center gap-1">
                <RefreshCw size={11} /> {t('webstudio.refresh', 'Refresh')}
              </button>
            </div>
            <div className="border border-[#e3e0db] rounded-xl bg-white divide-y divide-[#f3f1ec] max-h-[420px] overflow-y-auto">
              {nonResearchJobs.map(job => (
                <JobRow
                  key={job.id}
                  job={job}
                  active={job.id === expandedJobId}
                  isPolling={job.id === pollingId}
                  onClick={() => setExpandedJobId(prev => prev === job.id ? null : job.id)}
                />
              ))}
            </div>
            <AnimatePresence>
              {expandedJobId && (() => {
                const job = nonResearchJobs.find(j => j.id === expandedJobId);
                if (!job) return null;
                return (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
                    <ExpandedJobView
                      job={job}
                      onClose={() => setExpandedJobId(null)}
                      onResultClick={setSelectedResult}
                      onMutate={() => { refetchJobs(); refetchUsage(); refetchMonthly(); }}
                    />
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </section>
        )}

        {/* System health (admin only) */}
        {adminAccessible && (
          <section className="mt-6 pt-4 border-t border-[#e3e0db]">
            <button onClick={toggleHealth} className="w-full flex items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Activity size={13} className="text-[#525252]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">{t('webstudio.systemHealth', 'System Health')}</span>
              </div>
              {healthOpen ? <ChevronUp size={13} className="text-[#a3a3a3]" /> : <ChevronDown size={13} className="text-[#a3a3a3]" />}
            </button>
            <AnimatePresence>
              {healthOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <HealthPanel metrics={metrics} onRefresh={refetchMetrics} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>

      {/* Detail modal — for non-research result drilldown */}
      <AnimatePresence>
        {selectedResult && (
          <WebResultModal
            isOpen={!!selectedResult}
            result={selectedResult.result}
            type={selectedResult.type}
            jobId={selectedResult.jobId}
            index={selectedResult.index}
            runtime={selectedResult.runtime}
            fallback={selectedResult.fallback}
            onClose={() => setSelectedResult(null)}
          />
        )}
      </AnimatePresence>

      {/* Past-research preview popup with one-click save to HIVEMIND */}
      <AnimatePresence>
        {previewJob && (
          <ResearchPreviewModal
            job={previewJob}
            savedSnapshot={savedByJob[previewJob.id] || null}
            onSaved={(snap) => recordSave(previewJob.id, snap)}
            onOpenReport={() => openReport(previewJob)}
            onClose={() => setPreviewJob(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Live research panel (running) ──────────────────────────────── */

function LiveResearchPanel({ job }) {
  const { t } = useTranslation('dashboard');
  const ref = useRef(null);
  // Auto-scroll the panel as new content streams in.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [job.partial_content, job.progress?.length]);

  return (
    <div ref={ref} className="h-full overflow-y-auto">
      <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden">
        <header className="px-4 py-2.5 border-b border-[#e3e0db] bg-[#faf9f4] flex items-center gap-2">
          <Sparkles size={14} className="text-blue-500" />
          <span className="text-[12px] font-semibold text-[#0a0a0a]">{job.params?.input || 'Research'}</span>
          <span className="text-[10px] font-mono text-[#a3a3a3] ml-auto">{t('webstudio.streaming', 'streaming')} · {job.params?.model || 'auto'}</span>
          <Loader2 size={12} className="text-blue-500 animate-spin" />
        </header>
        <div className="p-4">
          <ResearchLiveView job={job} />
        </div>
      </div>
    </div>
  );
}

/* ─── Past research toggle + list ────────────────────────────────── */

/* ─── Guided start — what can I do here? ──────────────────────────
   Shown when there are no research reports yet: three mode cards, each
   with a plain-language description and tap-to-try examples that drop
   straight into the prompt bar with the right mode forced. */
function GuideCards({ onExample }) {
  const { t } = useTranslation('dashboard');
  const CARDS = [
    {
      mode: 'research', icon: Sparkles, color: '#117dff', bg: 'bg-blue-50',
      title: t('webstudio.guide.researchTitle', 'Deep Research'),
      desc: t('webstudio.guide.researchDesc', 'Multi-source report with citations. Ask a question, get a compiled answer in 1–3 minutes.'),
      examples: [
        t('webstudio.guide.researchEx1', 'Compare vector databases for a 1M-document RAG system'),
        t('webstudio.guide.researchEx2', 'EU AI Act obligations for SaaS companies in 2026'),
      ],
    },
    {
      mode: 'search', icon: Search, color: '#117dff', bg: 'bg-blue-50',
      title: t('webstudio.guide.searchTitle', 'Quick Search'),
      desc: t('webstudio.guide.searchDesc', 'Raw top-10 live results in seconds — when you just need links, not a report.'),
      examples: [
        t('webstudio.guide.searchEx1', 'Qdrant latest release notes'),
        t('webstudio.guide.searchEx2', 'Slack Socket Mode rate limits'),
      ],
    },
    {
      mode: 'crawl', icon: LinkIcon, color: '#f59e0b', bg: 'bg-amber-50',
      title: t('webstudio.guide.crawlTitle', 'Crawl a Site'),
      desc: t('webstudio.guide.crawlDesc', 'Paste a URL — HIVEMIND reads the pages and can save them to your Knowledge Base.'),
      examples: [
        'docs.stripe.com/api',
        'qdrant.tech/documentation',
      ],
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.mode} className="bg-white border border-[#e3e0db] rounded-xl p-4 hover:border-[#d4d0ca] transition-colors flex flex-col">
            <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
              <Icon size={15} style={{ color: c.color }} />
            </div>
            <p className="text-[13px] font-semibold text-[#0a0a0a]">{c.title}</p>
            <p className="text-[11px] text-[#737373] mt-1 leading-relaxed flex-1">{c.desc}</p>
            <div className="mt-3 space-y-1.5">
              {c.examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => onExample(c.mode, ex)}
                  className="w-full text-left text-[11px] text-[#525252] hover:text-[#0a0a0a] bg-[#faf9f4] hover:bg-[#f3f1ec] border border-[#eae7e1] rounded-lg px-2.5 py-1.5 truncate transition-colors"
                  title={ex}
                >
                  → {ex}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PastResearchPanel({ jobs, onPick, onOpenReport, locked, savedByJob = {}, onExample }) {
  const { t } = useTranslation('dashboard');
  if (locked) return <EmptyState locked={true} />;

  return (
    <div className="h-full">
      {/* Guided start when there's nothing to show yet; otherwise the
          reports list is ALWAYS visible — no hidden dropdown to discover. */}
      {jobs.length > 0 ? (
        <div className="flex items-center gap-2 px-1 pb-2">
          <Sparkles size={14} className="text-blue-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">{t('webstudio.pastResearch', 'Research reports')}</span>
          <span className="text-[10px] font-mono text-[#a3a3a3]">{t('webstudio.reportCount', '{{count}} report', { count: jobs.length })}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-1 pb-2">
          <Sparkles size={14} className="text-blue-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">{t('webstudio.tryAnExample', 'Try an example')}</span>
        </div>
      )}

      <AnimatePresence>
        <motion.div
          key="research-list"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
        >
            {jobs.length === 0 ? (
              <GuideCards onExample={onExample} />
            ) : (
              <div className="border border-[#e3e0db] rounded-xl bg-white divide-y divide-[#f3f1ec] max-h-[460px] overflow-y-auto">
                {jobs.map(job => {
                  const results = Array.isArray(job.results) ? job.results : [];
                  const title = deriveJobTitle(job, results);
                  const sourceCount = results[0]?.sources?.length || 0;
                  const saved = savedByJob[job.id];
                  const done = job.status === 'succeeded';
                  return (
                    <div
                      key={job.id}
                      className="w-full px-4 py-2.5 hover:bg-[#faf9f4] transition-colors flex items-center gap-3"
                    >
                      <Sparkles size={13} className="text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-[#0a0a0a] truncate">{title}</span>
                          {saved && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              <CheckCircle2 size={8} /> {t('webstudio.saved', 'saved')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[#a3a3a3]">
                          <StatusBadge status={job.status} polling={false} />
                          <span>·</span>
                          <span>{relTime(job.createdAt || job.created_at)}</span>
                          {sourceCount > 0 && <><span>·</span><span>{sourceCount} sources</span></>}
                          {job.duration_ms != null && <><span>·</span><span>{formatMs(job.duration_ms)}</span></>}
                          {saved && <><span>·</span><span>{saved.scopeLabel || 'saved'}</span></>}
                        </div>
                      </div>
                      {/* Two actions per report: View (in-app modal) + View in Chrome (polished new tab) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onPick(job)}
                          title={t('webstudio.view', 'View')}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#525252] hover:text-[#0a0a0a] bg-white hover:bg-[#f3f1ec] border border-[#e3e0db] rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                          <Eye size={12} /> {t('webstudio.view', 'View')}
                        </button>
                        <button
                          onClick={() => onOpenReport?.(job)}
                          disabled={!done}
                          title={t('webstudio.viewInChrome', 'Open rendered report in a new tab')}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                          <Chrome size={12} /> {t('webstudio.viewInChrome', 'View in Chrome')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Past research preview modal (with one-click save) ──────────── */

function ResearchPreviewModal({ job, onClose, savedSnapshot = null, onSaved, onOpenReport }) {
  const { t } = useTranslation('dashboard');
  const result = Array.isArray(job.results) ? job.results[0] : null;
  const title = deriveJobTitle(job, job.results || []);

  const [saving, setSaving] = useState(false);
  // Hydrate from persisted snapshot (memory-save: { memory, scope, scopeLabel }).
  const [saved, setSaved] = useState(savedSnapshot?.memory ? savedSnapshot : null);
  const [saveErr, setSaveErr] = useState(null);

  // Re-sync if the parent's snapshot changes while the modal stays open.
  useEffect(() => {
    if (savedSnapshot?.memory) setSaved(savedSnapshot);
  }, [savedSnapshot]);

  async function handleSaveToHivemind() {
    if (!result || saved) return;
    setSaving(true); setSaveErr(null);
    try {
      // Atomic save_memory path (canonical) — NOT KB evidence/segments.
      await apiClient.saveResearchAsMemory({
        title,
        markdown: typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2),
        sources: result.sources || [],
        tags: [job.params?.model ? `tavily-${job.params.model}` : 'tavily'],
        jobId: job.id,
        targetScope: 'personal',
      });
      const snap = { memory: true, scope: 'personal', scopeLabel: '🔒 Personal' };
      setSaved(snap);
      onSaved?.({ ...snap, savedAt: Date.now() });
    } catch (e) {
      setSaveErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!job) return null;

  const model = job.params?.model || 'auto';
  const dur = job.duration_ms != null ? formatMs(job.duration_ms) : '';
  const srcCount = Array.isArray(result?.sources) ? result.sources.length : 0;
  const issued = new Date(job.createdAt || job.created_at || Date.now())
    .toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const yr = new Date(job.createdAt || job.created_at || Date.now()).getFullYear();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#16181d]/45 z-50 flex items-start justify-center overflow-y-auto py-6 sm:py-10 px-4"
      onClick={onClose}
    >
      <style>{RESEARCH_DOC_CSS}</style>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 14 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[900px] bg-white border border-[#e6e8ec] shadow-[0_24px_70px_-30px_rgba(22,24,29,0.5)]"
        onClick={e => e.stopPropagation()}
      >
        {/* close — sharp, top-right */}
        <button
          onClick={onClose}
          title={t('common.close', 'Close')}
          className="absolute top-5 right-5 z-20 w-8 h-8 grid place-items-center border border-[#e6e8ec] text-[#8a909c] hover:text-[#16181d] hover:border-[#c4c9d2] transition-colors"
        >
          <X size={15} />
        </button>

        {/* brand bar */}
        <div className="px-9 sm:px-14 pt-9 flex items-center justify-between">
          <span className="sgl-logo text-[16px]">Singulance</span>
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[#8a909c] mr-10">Intelligence Report · {yr}</span>
        </div>
        <div className="mx-9 sm:mx-14 mt-7 border-t border-[#e6e8ec]" />

        {/* hero */}
        <div className="px-9 sm:px-14 pt-8">
          <div className="flex items-center gap-2 mb-4 font-mono text-[10.5px] tracking-[0.2em] uppercase text-[#117dff]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#117dff]" />
            Deep Research Dossier
          </div>
          <h2 className="font-['Bricolage_Grotesque'] font-extrabold text-[#16181d] leading-[1.06] tracking-[-0.02em] text-[clamp(28px,4.5vw,46px)]">
            {title}
          </h2>
          <div className="mt-7 flex flex-wrap border-t border-b border-[#e6e8ec] divide-x divide-[#e6e8ec]">
            {[['Model', model], dur && ['Compiled in', dur], ['Sources', String(srcCount)], ['Issued', issued]]
              .filter(Boolean)
              .map(([k, v], i) => (
                <div key={i} className={`py-3.5 ${i === 0 ? 'pr-6' : 'px-6'}`}>
                  <span className="block font-mono text-[9px] tracking-[0.18em] uppercase text-[#8a909c] mb-1">{k}</span>
                  <span className="block font-['Bricolage_Grotesque'] font-bold text-[14px] text-[#16181d]">{v}</span>
                </div>
              ))}
          </div>
        </div>

        {/* document body — rendered directly on the paper, no nested card */}
        <div className="px-9 sm:px-14 pt-8 pb-28">
          {saveErr && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700">
              <AlertTriangle size={12} /> {saveErr}
            </div>
          )}
          {saved && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <div className="text-[13px] text-[#16181d]">
                <span className="font-semibold">{t('webstudio.savedAsMemory', 'Saved to HIVEMIND as a memory')}</span>
                <span className="text-[#8a909c]"> · {saved.scopeLabel || saved.scope || 'personal'}</span>
              </div>
            </div>
          )}

          {result && <ResearchReport result={result} fallbackProgress={job.progress} />}
          {!result && (
            <div className="text-[12px] text-[#a3a3a3]">{t('webstudio.noReportContent', 'No report content available.')}</div>
          )}

          <div className="mt-10 pt-5 border-t border-[#e6e8ec] flex items-center justify-between gap-4">
            <span className="font-mono text-[10.5px] text-[#8a909c]">Built with <span className="text-[#16181d] font-medium">HIVEMIND</span> · enterprise memory intelligence</span>
            <span className="sgl-logo text-[13px] text-[#b5bac4]">Singulance</span>
          </div>
        </div>

        {/* sticky action bar — flat, sharp */}
        <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2.5 bg-white/95 backdrop-blur border-t border-[#e6e8ec] px-9 sm:px-14 py-3.5">
          <button
            onClick={onOpenReport}
            disabled={!result}
            title={t('webstudio.openReportHint', 'Open the full rendered report in a new tab')}
            className="flex items-center gap-1.5 bg-white border border-[#d6dbe6] hover:border-[#16181d] disabled:opacity-50 text-[#33373f] text-[12px] font-semibold px-3.5 py-2 transition-colors"
          >
            <Chrome size={13} /> {t('webstudio.viewInChrome', 'Open in Chrome')}
          </button>
          <button
            onClick={handleSaveToHivemind}
            disabled={saving || !!saved || !result}
            className="flex items-center gap-1.5 bg-[#16181d] hover:bg-[#000] text-white text-[12px] font-bold px-4 py-2 disabled:opacity-55 transition-colors"
          >
            {saving ? <Loader2 size={13} className="animate-spin" />
              : saved ? <CheckCircle2 size={13} />
              : <Save size={13} />}
            {saving ? t('webstudio.saving', 'Saving') : saved ? t('webstudio.savedBtn', 'Saved') : t('webstudio.saveToHivemind', 'Save to HIVEMIND')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Playground selector + prompt bar (Firecrawl-style, HIVEMIND brand) ── */

// Category-grouped mode pills — one shared light-grey track, each pill wears
// its own category label above it (DISCOVER / RESEARCH / CRAWL), the active
// pill lifts to white with a thin border. Mirrors Firecrawl's Search/Scrape/
// Parse/Map/Crawl selector, mapped onto HIVEMIND's three real web-intel
// backends instead of inventing UI for endpoints that don't exist.
const MODE_GROUPS = [
  { id: 'search',   category: 'Discover', label: 'Search',   icon: Search },
  { id: 'research', category: 'Research', label: 'Research', icon: Sparkles },
  { id: 'crawl',    category: 'Crawl',    label: 'Crawl',    icon: LinkIcon },
];

// Honest "Get code" — the exact endpoint + payload PromptBar's own onSubmit
// sends for the current mode, not a fabricated public API. Callers with API
// keys can already hit /v1/proxy/web/* directly; this just shows them how.
function buildCodeSnippet(mode, input, opts) {
  const body = mode === 'crawl'
    ? { urls: [input ? normalizeUrl(input) : 'https://example.com'], depth: opts.depth, page_limit: opts.pageLimit }
    : mode === 'research'
      ? { input: input || 'compare vector DBs for 1M-row RAG', model: opts.researchModel, citation_format: opts.citationFormat }
      : { query: input || 'milvus vs qdrant benchmarks', limit: 10 };
  const path = mode === 'crawl' ? '/v1/proxy/web/crawl/jobs' : mode === 'research' ? '/v1/proxy/web/research/jobs' : '/v1/proxy/web/search/jobs';
  return `curl -X POST https://api.singulancelabs.com${path} \\
  -H "Authorization: Bearer $HIVEMIND_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body, null, 2).replace(/\n/g, '\n  ')}'`;
}

function PromptBar({
  prompt, setPrompt, mode, forcedMode, setForcedMode,
  submitting, onSubmit, onKey,
  depth, setDepth, pageLimit, setPageLimit,
  researchModel, setResearchModel, citationFormat, setCitationFormat,
  domainPolicy, checkingPolicy, locked,
}) {
  const { t } = useTranslation('dashboard');
  const [knobsOpen, setKnobsOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = MODE_GROUPS.find((g) => g.id === mode) || MODE_GROUPS[0];
  const PrefixIcon = active.icon;
  const placeholder = mode === 'crawl'
    ? t('webstudio.placeholder.crawl', 'https://example.com')
    : mode === 'research'
      ? t('webstudio.placeholder.research', 'Research the web…  e.g. "compare vector DBs for 1M-row RAG"')
      : t('webstudio.placeholder.search', 'Search the web…  e.g. "milvus vs qdrant benchmarks"');
  const startLabel = mode === 'crawl' ? t('webstudio.startCrawl', 'Start crawling')
    : mode === 'research' ? t('webstudio.startResearch', 'Start research')
    : t('webstudio.startSearch', 'Start searching');

  const snippet = useMemo(
    () => buildCodeSnippet(mode, prompt.replace(/^\/(research|search|crawl)\s+/i, '').trim(), { depth, pageLimit, researchModel, citationFormat }),
    [mode, prompt, depth, pageLimit, researchModel, citationFormat],
  );
  const copySnippet = () => {
    navigator.clipboard?.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div>
      {/* Category-grouped mode selector */}
      <div className="flex items-center gap-3 mb-3">
        <div className="inline-flex items-stretch gap-1 bg-[#f3f1ec] border border-[#e3e0db] rounded-2xl p-1.5">
          {MODE_GROUPS.map((g) => {
            const isActive = mode === g.id;
            const GIcon = g.icon;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setForcedMode(g.id)}
                className="flex flex-col items-start px-2"
              >
                <span className={`text-[9px] font-mono uppercase tracking-wider mb-1 px-1 ${isActive ? 'text-[#117dff]' : 'text-[#a3a3a3]'}`}>{g.category}</span>
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-white text-[#0a0a0a] shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#e3e0db]' : 'text-[#6b7280] hover:text-[#0a0a0a]'
                }`}>
                  <GIcon size={14} className={isActive ? 'text-[#117dff]' : 'text-[#a3a3a3]'} /> {g.label}
                </span>
              </button>
            );
          })}
        </div>
        {forcedMode && (
          <button
            onClick={() => setForcedMode(null)}
            title={t('webstudio.clearForcedMode', 'Back to auto-detect (URL → crawl, text → research)')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#e3e0db] bg-white text-[10.5px] font-medium text-[#737373] hover:text-[#0a0a0a] hover:border-[#d4d0ca] transition-colors self-center"
          >
            <RotateCcw size={10} /> {t('webstudio.backToAutoDetect', 'Auto-detect')}
          </button>
        )}
      </div>

      {/* Input card */}
      <div className={`relative bg-white border ${locked ? 'border-red-200' : 'border-[#e3e0db]'} rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden`}>
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e3e0db] bg-[#faf9f4] text-[12px] font-mono text-[#a3a3a3] flex-shrink-0">
            <PrefixIcon size={13} className="text-[#117dff]" />
            {mode === 'crawl' ? 'https://' : mode.slice(0, 1).toUpperCase() + mode.slice(1)}
          </span>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            disabled={locked}
            className="flex-1 min-w-0 text-[15px] text-[#0a0a0a] placeholder:text-[#a3a3a3] bg-transparent border-0 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Advanced knobs — disclosed by the sliders icon, not always-on chrome */}
        <AnimatePresence>
          {knobsOpen && mode === 'research' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[#f3f1ec]">
              <div className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-[11px] text-[#525252]">
                <span className="font-mono uppercase tracking-wider text-[10px] text-[#a3a3a3]">{t('webstudio.depth', 'depth')}</span>
                <div className="flex items-center gap-0.5 bg-[#faf9f4] border border-[#e3e0db] rounded-md p-0.5">
                  {['mini', 'auto', 'pro'].map((opt) => (
                    <button key={opt} type="button" onClick={() => setResearchModel(opt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase transition-colors ${researchModel === opt ? 'bg-[#117dff] text-white' : 'text-[#525252] hover:bg-white'}`}
                      title={opt === 'mini' ? t('webstudio.modelMiniTitle', 'Targeted, fast (single-angle)') : opt === 'pro' ? t('webstudio.modelProTitle', 'Comprehensive, multi-subtopic') : t('webstudio.modelAutoTitle', 'Auto-pick best for query')}>
                      {opt}
                    </button>
                  ))}
                </div>
                <span className="font-mono uppercase tracking-wider text-[10px] text-[#a3a3a3] ml-2">{t('webstudio.cite', 'cite')}</span>
                <select value={citationFormat} onChange={(e) => setCitationFormat(e.target.value)} className="bg-[#faf9f4] border border-[#e3e0db] rounded px-2 py-0.5 text-[10px] font-mono">
                  <option value="numbered">numbered</option>
                  <option value="apa">apa</option>
                  <option value="mla">mla</option>
                  <option value="chicago">chicago</option>
                </select>
                <span className="ml-auto text-[10px] text-[#a3a3a3] font-mono">
                  {researchModel === 'pro' ? t('webstudio.proTiming', '~60-180s · multi-subtopic') : researchModel === 'mini' ? t('webstudio.miniTiming', '~15-40s · targeted') : t('webstudio.autoPicked', 'auto-picked')}
                </span>
              </div>
            </motion.div>
          )}
          {knobsOpen && mode === 'crawl' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[#f3f1ec]">
              <div className="px-4 py-2.5 flex items-center gap-3 text-[11px] text-[#525252]">
                <span className="font-mono uppercase tracking-wider text-[10px] text-[#a3a3a3]">{t('webstudio.depth', 'depth')}</span>
                <input type="number" min={1} max={3} value={depth} onChange={(e) => setDepth(Math.max(1, Math.min(3, Number(e.target.value))))}
                  className="w-12 px-1.5 py-0.5 bg-[#faf9f4] border border-[#e3e0db] rounded text-center font-mono" />
                <span className="font-mono uppercase tracking-wider text-[10px] text-[#a3a3a3] ml-2">{t('webstudio.pages', 'pages')}</span>
                <input type="number" min={1} max={50} value={pageLimit} onChange={(e) => setPageLimit(Math.max(1, Math.min(50, Number(e.target.value))))}
                  className="w-14 px-1.5 py-0.5 bg-[#faf9f4] border border-[#e3e0db] rounded text-center font-mono" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar */}
        <div className="px-3 py-2 bg-[#faf9f4] border-t border-[#f3f1ec] flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setKnobsOpen((v) => !v)}
            className={`p-1.5 rounded-lg transition-colors ${knobsOpen ? 'bg-[#117dff]/10 text-[#117dff]' : 'text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f3f1ec]'}`}
            title={t('webstudio.advancedOptions', 'Advanced options')}
          >
            <SlidersHorizontal size={14} />
          </button>

          {mode === 'crawl' && (
            checkingPolicy ? (
              <span className="text-[10px] text-[#a3a3a3] flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {t('webstudio.checkingDomain', 'checking domain…')}</span>
            ) : domainPolicy?.blocked ? (
              <span className="text-[10px] text-red-600 flex items-center gap-1"><Ban size={10} /> {t('webstudio.blocked', 'blocked: {{reason}}', { reason: domainPolicy.reason || t('webstudio.policyDenial', 'policy denial') })}</span>
            ) : domainPolicy ? (
              <span className="text-[10px] text-emerald-600 flex items-center gap-1"><ShieldCheck size={10} /> {t('webstudio.allowed', 'allowed')}</span>
            ) : null
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative">
              <button type="button" onClick={() => setCodeOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e3e0db] bg-white text-[#525252] text-[11.5px] font-medium hover:border-[#d4d0ca] transition-colors">
                <Code2 size={13} /> {t('webstudio.getCode', 'Get code')}
              </button>
              <AnimatePresence>
                {codeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    className="absolute right-0 bottom-[calc(100%+8px)] w-[380px] bg-[#0a0a0a] border border-[#262626] rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.3)] p-3.5 z-20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8a8a8a]">{t('webstudio.curlExample', 'cURL — same endpoint this button calls')}</span>
                      <button onClick={copySnippet} className="flex items-center gap-1 text-[10px] text-[#a3a3a3] hover:text-white">
                        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />} {copied ? t('webstudio.copied', 'Copied') : t('webstudio.copy', 'Copy')}
                      </button>
                    </div>
                    <pre className="text-[10.5px] leading-relaxed text-[#d4d4d4] font-mono whitespace-pre-wrap break-all max-h-[220px] overflow-y-auto">{snippet}</pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={onSubmit}
              disabled={!prompt.trim() || submitting || locked || (mode === 'crawl' && domainPolicy?.blocked)}
              className="flex items-center gap-1.5 bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12.5px] font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {submitting ? t('webstudio.submitting', 'Submitting…') : startLabel}
            </button>
          </div>
        </div>

        {locked && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] flex items-center justify-center">
            <div className="text-center px-4">
              <Lock size={22} className="text-red-500 mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-[#0a0a0a]">{t('webstudio.notEnabled', 'Web intelligence is not enabled')}</p>
              <p className="text-[11px] text-[#737373] mt-1">{t('webstudio.upgradeHint', 'Upgrade your plan to enable web search + crawl.')}</p>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-[10px] text-[#a3a3a3]">{t('webstudio.playgroundHint', 'Enter to run · results save to HIVEMIND memory')}</p>
    </div>
  );
}

/* ─── Usage rings (top right) ─────────────────────────────────────── */

function UsageRings({ usage, monthly }) {
  const dailySearch = usage?.search_used ?? 0;
  const dailySearchLimit = usage?.search_limit ?? 0;
  const dailyCrawl = usage?.crawl_used ?? 0;
  const dailyCrawlLimit = usage?.crawl_limit ?? 0;
  const monthlySearch = monthly?.search_used ?? 0;
  const monthlySearchLimit = monthly?.search_limit ?? 0;

  return (
    <div className="flex items-center gap-3 shrink-0">
      <UsagePill icon={Search} label="search · day" used={dailySearch} limit={dailySearchLimit} />
      <UsagePill icon={LinkIcon} label="crawl · day" used={dailyCrawl} limit={dailyCrawlLimit} />
      <UsagePill icon={TrendingUp} label="search · month" used={monthlySearch} limit={monthlySearchLimit} muted />
    </div>
  );
}

function UsagePill({ icon: Icon, label, used, limit, muted }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct >= 90 ? '#dc2626' : pct >= 70 ? '#f59e0b' : '#16a34a';
  return (
    <div className={`bg-white border border-[#e3e0db] rounded-lg px-2.5 py-1.5 flex items-center gap-2 ${muted ? 'opacity-70' : ''}`}>
      <Icon size={12} className="text-[#525252]" />
      <div className="leading-none">
        <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wider font-mono">{label}</div>
        <div className="text-[11px] font-semibold tabular-nums" style={{ color }}>
          {used.toLocaleString()}<span className="text-[#a3a3a3] font-normal"> / {limit > 0 ? limit.toLocaleString() : '∞'}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Job row (compact, in list) ─────────────────────────────────── */

// Pick the best title for a job: research → report title; search/crawl →
// query or first URL. Falls back to the bare query/URL params.
function deriveJobTitle(job, results) {
  if (job.type === 'research' && results?.[0]?.title) return results[0].title;
  if (job.params?.input)  return job.params.input;
  if (job.params?.query)  return job.params.query;
  if (job.params?.urls?.[0]) return job.params.urls[0];
  if (job.query)          return job.query;
  if (job.urls?.[0])      return job.urls[0];
  return 'Untitled run';
}

function jobIcon(type) {
  if (type === 'crawl')    return LinkIcon;
  if (type === 'research') return Sparkles;
  return Search;
}

function jobColor(type) {
  if (type === 'crawl')    return 'text-amber-500';
  if (type === 'research') return 'text-blue-500';
  return 'text-[#117dff]';
}

function JobRow({ job, active, isPolling, onClick }) {
  const jobType = job.type || (job.urls ? 'crawl' : 'search');
  const Icon = jobIcon(jobType);
  const status = job.status || 'queued';
  const results = Array.isArray(job.results) ? job.results : (job.results?.results || job.results?.items || []);
  const title = deriveJobTitle(job, results);

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
        active ? 'bg-[#faf9f4]' : 'hover:bg-[#faf9f4]'
      }`}
    >
      <Icon size={14} className={`shrink-0 ${jobColor(jobType)}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[#0a0a0a] truncate">{title}</div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[#a3a3a3]">
          <span className="uppercase tracking-wider">{jobType}</span>
          <span>·</span>
          <StatusBadge status={status} polling={isPolling} />
          <span>·</span>
          <span>{relTime(job.createdAt || job.created_at)}</span>
          {job.duration_ms != null && <><span>·</span><span>{formatMs(job.duration_ms)}</span></>}
          {jobType === 'research' && results[0]?.sources?.length > 0 && (
            <><span>·</span><span>{results[0].sources.length} sources</span></>
          )}
          {jobType !== 'research' && results.length > 0 && (
            <><span>·</span><span>{results.length} result{results.length !== 1 ? 's' : ''}</span></>
          )}
        </div>
      </div>
      {active
        ? <ChevronUp size={13} className="text-[#a3a3a3] shrink-0" />
        : <ChevronDown size={13} className="text-[#a3a3a3] shrink-0" />}
    </button>
  );
}

/* ─── Expanded job detail (no height cap; page scrolls) ──────────── */

function ExpandedJobView({ job, onClose, onResultClick, onMutate }) {
  const { t } = useTranslation('dashboard');
  const jobType = job.type || (job.urls ? 'crawl' : 'search');
  const status = job.status || 'queued';
  const results = Array.isArray(job.results) ? job.results : (job.results?.results || job.results?.items || []);
  const title = deriveJobTitle(job, results);
  const Icon = jobIcon(jobType);

  const [retrying, setRetrying] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try { await apiClient.retryWebJob(job.id); onMutate(); } catch { /* silent */ } finally { setRetrying(false); }
  }
  async function handleSaveAll() {
    setSavingAll(true);
    try {
      await apiClient.saveWebResultToMemory(job.id, {
        title,
        tags: [jobType === 'crawl' ? 'web-crawl' : jobType === 'research' ? 'web-research' : 'web-search'],
      });
      setSaved(true);
      onMutate();
    } catch { /* silent */ } finally { setSavingAll(false); }
  }

  return (
    <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {/* Detail header */}
      <header className="px-5 py-3 border-b border-[#e3e0db] flex items-start justify-between gap-3 bg-[#faf9f4]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon size={14} className={jobColor(jobType)} />
            <span className="text-[10px] uppercase tracking-wider font-mono text-[#737373]">{jobType}</span>
            <StatusBadge status={status} polling={false} />
            {job.duration_ms != null && (
              <span className="text-[10px] font-mono text-[#a3a3a3]">{formatMs(job.duration_ms)}</span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold text-[#0a0a0a] leading-tight">{title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {status === 'failed' && (
            <button onClick={handleRetry} disabled={retrying} className="p-1.5 text-[#525252] hover:text-[#117dff] rounded hover:bg-white" title={t('webstudio.retry', 'Retry')}>
              {retrying ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            </button>
          )}
          {status === 'succeeded' && results.length > 0 && (
            <button onClick={handleSaveAll} disabled={savingAll || saved} className={`p-1.5 rounded hover:bg-white ${saved ? 'text-emerald-600' : 'text-[#525252] hover:text-emerald-600'}`} title={t('webstudio.saveReportToMemory', 'Save report to memory')}>
              {savingAll ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-[#a3a3a3] hover:text-[#0a0a0a] rounded hover:bg-white" title={t('webstudio.collapse', 'Collapse')}>
            <X size={13} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="px-5 py-4">
        {status === 'failed' && (
          <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {job.error || 'Job failed'}
          </div>
        )}
        {(status === 'queued' || status === 'running') && jobType !== 'research' && (
          <div className="text-[12px] text-[#737373] flex items-center gap-2 py-3">
            <Loader2 size={13} className="animate-spin" />
            {t('webstudio.waitingForResults', 'Waiting for results…')}
          </div>
        )}

        {/* Research: show live progress timeline + streamed content even
            while running. Once succeeded, render final report + sources. */}
        {jobType === 'research' && (status === 'running' || status === 'queued') && (
          <ResearchLiveView job={job} />
        )}
        {status === 'succeeded' && jobType === 'research' && (
          <ResearchReport result={results[0]} fallbackProgress={job.progress} />
        )}
        {status === 'succeeded' && jobType !== 'research' && (
          <RawResultList
            results={results}
            jobId={job.id}
            jobType={jobType}
            runtime={job.runtime}
            fallback={job.fallback}
            onResultClick={onResultClick}
            onSaved={onMutate}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Research live view (during streaming) ─────────────────────── */

function ResearchLiveView({ job }) {
  const { t } = useTranslation('dashboard');
  const partialContent = job.partial_content || '';
  const partialSources = Array.isArray(job.partial_sources) ? job.partial_sources : [];

  // Group by tool execution: each tool_call pairs with its tool_response.
  // Reach into job.progress inside the memo so the lint rule for stable
  // dep arrays is satisfied.
  const steps = useMemo(() => {
    const progress = Array.isArray(job.progress) ? job.progress : [];
    const byId = new Map();
    const order = [];
    for (const p of progress) {
      const key = p.id || `${p.tool}-${p.ts}`;
      if (!byId.has(key)) {
        byId.set(key, { tool: p.tool, id: p.id, queries: p.queries, sources: p.sources, call: null, response: null });
        order.push(key);
      }
      const slot = byId.get(key);
      if (p.kind === 'tool_call') slot.call = p;
      if (p.kind === 'tool_response') slot.response = p;
      if (p.queries) slot.queries = p.queries;
      if (p.sources) slot.sources = [...(slot.sources || []), ...p.sources];
    }
    return order.map(k => byId.get(k));
  }, [job.progress]);

  const hasAny = steps.length > 0 || partialContent || partialSources.length > 0;

  return (
    <div className="space-y-4">
      {/* Step timeline */}
      {steps.length > 0 && (
        <ol className="space-y-1.5">
          {steps.map((s, i) => (
            <ResearchStep key={s.id || i} step={s} />
          ))}
        </ol>
      )}

      {/* Streamed content (markdown so far) */}
      {partialContent && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-mono text-[#737373] mb-1.5 flex items-center gap-1.5">
            <Sparkles size={11} className="text-blue-500" />
            {t('webstudio.reportStreaming', 'Report — streaming')}
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          </div>
          <pre className="whitespace-pre-wrap font-['Space_Grotesk'] text-[13px] text-[#0a0a0a] leading-[1.65] m-0 bg-transparent p-0">
{partialContent}
          </pre>
        </div>
      )}

      {!hasAny && (
        <div className="text-[12px] text-[#737373] flex items-center gap-2 py-3">
          <Loader2 size={13} className="animate-spin" />
          {t('webstudio.researchStarting', 'Tavily Research starting…')}
        </div>
      )}
    </div>
  );
}

function ResearchStep({ step }) {
  const TOOL_META = {
    Planning:         { color: 'text-[#525252]', emoji: '🧭', label: 'Planning' },
    WebSearch:        { color: 'text-[#117dff]', emoji: '🔎', label: 'Web search' },
    ResearchSubtopic: { color: 'text-blue-600', emoji: '🧪', label: 'Subtopic research' },
    Generating:       { color: 'text-emerald-600', emoji: '✍️', label: 'Generating report' },
  };
  const meta = TOOL_META[step.tool] || { color: 'text-[#737373]', emoji: '•', label: step.tool || 'step' };
  const done = !!step.response;
  const queries = step.queries || step.call?.queries || [];
  const sources = step.sources || step.response?.sources || [];

  return (
    <li className="border border-[#e3e0db] rounded-lg px-3 py-2 bg-white">
      <div className="flex items-center gap-2">
        <span className="text-[14px]">{meta.emoji}</span>
        <span className={`text-[12px] font-semibold ${meta.color}`}>{meta.label}</span>
        {!done && <Loader2 size={11} className="text-[#a3a3a3] animate-spin" />}
        {done && <CheckCircle2 size={11} className="text-emerald-500" />}
        <span className="text-[10px] text-[#a3a3a3] font-mono ml-auto truncate">
          {step.call?.arguments || step.response?.arguments || ''}
        </span>
      </div>

      {queries.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {queries.slice(0, 8).map((q, i) => (
            <span key={i} className="text-[10px] bg-[#117dff]/5 text-[#117dff] border border-[#117dff]/20 px-1.5 py-0.5 rounded font-mono">
              {q.length > 60 ? q.slice(0, 57) + '…' : q}
            </span>
          ))}
          {queries.length > 8 && <span className="text-[10px] text-[#a3a3a3]">+{queries.length - 8} more</span>}
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sources.slice(0, 6).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] bg-[#faf9f4] text-[#525252] border border-[#e3e0db] hover:border-[#117dff] hover:text-[#117dff] px-1.5 py-0.5 rounded inline-flex items-center gap-1 max-w-[260px]"
              title={s.url}
            >
              {s.favicon && <img src={s.favicon} alt="" className="w-3 h-3" onError={e => { e.target.style.display = 'none'; }} />}
              <span className="truncate">{s.title || s.url}</span>
            </a>
          ))}
          {sources.length > 6 && <span className="text-[10px] text-[#a3a3a3]">+{sources.length - 6} more</span>}
        </div>
      )}
    </li>
  );
}

/* ─── Research report renderer ───────────────────────────────────── */

function ResearchReport({ result, fallbackProgress }) {
  const { t } = useTranslation('dashboard');
  if (!result) return null;
  const text = typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2);
  const sources = Array.isArray(result.sources) ? result.sources : [];
  // Build collapsible step timeline from saved progress[] when present.
  const progress = Array.isArray(fallbackProgress) ? fallbackProgress : [];
  // Render markdown (headings, bold, lists, blockquotes, GFM tables) to the
  // same editorial look as the standalone report. mdToHtml escapes all HTML
  // before emitting only its own known tags, so dangerouslySetInnerHTML here
  // cannot inject markup from the (already-trusted) research output.
  return (
    <div>
      <style>{RESEARCH_DOC_CSS}</style>
      {progress.length > 0 && (
        <CollapsibleProgress progress={progress} />
      )}

      <article className="rm-doc" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />

      {sources.length > 0 && (
        <section className="mt-6 pt-4 border-t border-[#e3e0db]">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2 flex items-center gap-1.5">
            <FileText size={11} /> {t('webstudio.sources', 'Sources ({{count}})', { count: sources.length })}
          </h4>
          <ol className="space-y-1.5 list-decimal pl-5 text-[12px]">
            {sources.map((s, i) => (
              <li key={i} className="text-[#525252]">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#117dff] hover:underline font-medium inline-flex items-center gap-1"
                >
                  {s.title || s.url}
                  <ExternalLink size={9} />
                </a>
                {s.title && s.url && (
                  <div className="text-[10px] text-[#a3a3a3] font-mono truncate">{s.url}</div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function RawResultList({ results, jobId, jobType, runtime, fallback, onResultClick, onSaved }) {
  const { t } = useTranslation('dashboard');
  if (results.length === 0) return <div className="text-[12px] text-[#a3a3a3] py-2">{t('webstudio.noResults', 'No results returned.')}</div>;
  return (
    <div className="space-y-1">
      {results.map((r, i) => (
        <ResultLine
          key={i}
          result={r}
          type={jobType}
          jobId={jobId}
          index={i}
          runtime={runtime}
          fallback={fallback}
          onClick={() => onResultClick({ result: r, type: jobType, jobId, index: i, runtime, fallback })}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status, polling }) {
  if (polling || status === 'running') {
    return <span className="inline-flex items-center gap-1 text-blue-600"><Loader2 size={9} className="animate-spin" />running</span>;
  }
  const map = {
    queued:    { c: 'text-amber-600',   l: 'queued' },
    succeeded: { c: 'text-emerald-600', l: 'done' },
    failed:    { c: 'text-red-600',     l: 'failed' },
  };
  const m = map[status] || { c: 'text-[#a3a3a3]', l: status };
  return <span className={m.c}>{m.l}</span>;
}

function ResultLine({ result, type, jobId, index, runtime, fallback, onClick, onSaved }) {
  const { t } = useTranslation('dashboard');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await apiClient.saveWebResultToMemory(jobId, {
        resultIndex: index,
        title: result.title || result.url,
        tags: [type === 'crawl' ? 'web-crawl' : 'web-search'],
      });
      setSaved(true);
      onSaved?.();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[#faf9f4] cursor-pointer group"
    >
      {type === 'crawl'
        ? <FileText size={11} className="text-[#a3a3a3] mt-0.5 shrink-0" />
        : <Search size={11} className="text-[#a3a3a3] mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-semibold text-[#117dff] truncate">{result.title || result.url}</span>
          <ExternalLink size={9} className="text-[#a3a3a3] shrink-0" />
        </div>
        <div className="text-[10px] text-[#a3a3a3] font-mono truncate">{result.url}</div>
        {result.snippet && (
          <div className="text-[11px] text-[#525252] mt-0.5 line-clamp-2">{result.snippet}</div>
        )}
      </div>
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`p-1 ${saved ? 'text-emerald-500' : 'text-[#a3a3a3] hover:text-[#117dff]'} transition-colors`}
        title={saved ? t('webstudio.savedTitle', 'Saved') : t('webstudio.saveToMemory', 'Save to memory')}
      >
        {saving ? <Loader2 size={11} className="animate-spin" /> : saved ? <CheckCircle2 size={11} /> : <BookmarkPlus size={11} />}
      </button>
    </div>
  );
}

/* ─── Empty state ──────────────────────────────────────────────────── */

function EmptyState({ locked }) {
  const { t } = useTranslation('dashboard');
  if (locked) return null;
  return (
    <div className="bg-white border border-[#e3e0db] rounded-xl p-8 text-center">
      <Sparkles size={20} className="text-[#117dff] mx-auto mb-2" />
      <p className="text-[13px] text-[#0a0a0a] font-semibold">{t('webstudio.noRunsYetTitle', 'No runs yet')}</p>
      <p className="text-[11px] text-[#737373] mt-1">{t('webstudio.noRunsHint', 'Try')} <code className="font-mono bg-[#f3f1ec] px-1 rounded">best vector DBs for RAG</code> {t('webstudio.orPasteUrl', 'or paste a URL.')}</p>
    </div>
  );
}

/* ─── Health panel (collapsible) ──────────────────────────────────── */

function HealthPanel({ metrics, onRefresh }) {
  const { t } = useTranslation('dashboard');
  const m = metrics || {};
  const totalJobs = m.total_jobs ?? 0;
  const succeeded = m.succeeded ?? 0;
  const queued = m.queued ?? 0;
  const running = m.running ?? 0;
  const successRate = totalJobs > 0 ? (succeeded / totalJobs) * 100 : 0;
  const runtimeDist = m.runtime_distribution || {};
  const lightpanda = runtimeDist.lightpanda ?? 0;
  const fetchN = runtimeDist.fetch ?? 0;
  const runtimeTotal = lightpanda + fetchN;
  const telemetry = m.runtime_telemetry || {};
  const topErrors = m.top_errors || [];

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#737373]">{t('webstudio.autoRefresh', 'Auto-refresh every 30s')}</span>
        <button onClick={onRefresh} className="text-[11px] text-[#525252] hover:text-[#0a0a0a] flex items-center gap-1">
          <RefreshCw size={11} /> {t('webstudio.refresh', 'Refresh')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Metric label={t('webstudio.metric.totalJobs', 'Total jobs')}    value={totalJobs.toLocaleString()}                                          Icon={Layers} />
        <Metric label={t('webstudio.metric.successRate', 'Success rate')}  value={`${successRate.toFixed(1)}%`} color={successRate >= 90 ? '#16a34a' : successRate >= 70 ? '#f59e0b' : '#dc2626'} Icon={CheckCircle2} />
        <Metric label={t('webstudio.metric.avgDuration', 'Avg duration')}  value={formatMs(m.avg_duration_ms)}                                        Icon={Activity} />
        <Metric label={t('webstudio.metric.p95Duration', 'P95 duration')}  value={formatMs(m.p95_duration_ms)}                                        Icon={TrendingUp} />
        <Metric label={t('webstudio.metric.queueDepth', 'Queue depth')}   value={(queued + running).toLocaleString()}                                Icon={Activity} color={(queued + running) > 50 ? '#f59e0b' : '#0a0a0a'} />
        <Metric label={t('webstudio.metric.jobs24h', 'Jobs · 24h')}    value={(m.jobs_last_24h ?? 0).toLocaleString()}                            Icon={Zap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-[#e3e0db] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={12} className="text-[#525252]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">{t('webstudio.runtimeDistribution', 'Runtime distribution')}</span>
          </div>
          {runtimeTotal === 0 ? (
            <p className="text-[10px] text-[#a3a3a3] text-center py-2 font-mono">{t('webstudio.noData', 'No data')}</p>
          ) : (
            <div className="space-y-2">
              <RuntimeBar label={t('webstudio.lightpanda', 'Lightpanda')} count={lightpanda} total={runtimeTotal} color="#117dff" />
              <RuntimeBar label={t('webstudio.fetchFallback', 'Fetch fallback')} count={fetchN} total={runtimeTotal} color="#f59e0b" />
            </div>
          )}
        </div>

        <div className="bg-white border border-[#e3e0db] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={12} className="text-[#525252]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">{t('webstudio.telemetry', 'Telemetry')}</span>
          </div>
          {Object.keys(telemetry).length === 0 ? (
            <p className="text-[10px] text-[#a3a3a3] text-center py-2 font-mono">{t('webstudio.noTelemetry', 'No telemetry')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 text-[11px]">
              <TelemetryRow label={t('webstudio.lightpandaOk', 'Lightpanda OK')} value={telemetry.lightpanda_success ?? 0} />
              <TelemetryRow label={t('webstudio.lightpandaFail', 'Lightpanda fail')} value={telemetry.lightpanda_failure ?? 0} warn={(telemetry.lightpanda_failure ?? 0) > 0} />
              <TelemetryRow label={t('webstudio.fetchFallback', 'Fetch fallback')} value={telemetry.fetch_fallback ?? 0} />
              <TelemetryRow label={t('webstudio.domainBlocks', 'Domain blocks')} value={telemetry.domain_blocks ?? 0} warn={(telemetry.domain_blocks ?? 0) > 0} />
            </div>
          )}
        </div>
      </div>

      {topErrors.length > 0 && (
        <div className="bg-white border border-[#e3e0db] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={12} className="text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">{t('webstudio.topErrors', 'Top errors')}</span>
          </div>
          <ul className="space-y-1 text-[11px] text-[#525252]">
            {topErrors.slice(0, 5).map((e, i) => (
              <li key={i} className="flex items-center justify-between font-mono">
                <span className="truncate">{e.error_type || e.type || 'error'}</span>
                <span className="text-[#a3a3a3]">{e.count?.toLocaleString?.() || 0}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, Icon, color }) {
  return (
    <div className="bg-white border border-[#e3e0db] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={11} className="text-[#a3a3a3]" />}
        <span className="text-[9px] uppercase tracking-wider text-[#a3a3a3] font-mono">{label}</span>
      </div>
      <div className="text-[18px] font-semibold tabular-nums leading-none" style={{ color: color || '#0a0a0a' }}>
        {value}
      </div>
    </div>
  );
}

function RuntimeBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-[10px] text-[#525252] font-mono">
        <span>{label}</span>
        <span>{count.toLocaleString()} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="h-1.5 bg-[#f3f1ec] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Collapsible progress timeline (completed runs) ────────────── */

function CollapsibleProgress({ progress }) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => {
    const byId = new Map();
    const order = [];
    for (const p of progress) {
      const key = p.id || `${p.tool}-${p.ts}`;
      if (!byId.has(key)) {
        byId.set(key, { tool: p.tool, id: p.id, queries: p.queries, sources: p.sources, call: null, response: null });
        order.push(key);
      }
      const slot = byId.get(key);
      if (p.kind === 'tool_call') slot.call = p;
      if (p.kind === 'tool_response') slot.response = p;
      if (p.queries) slot.queries = p.queries;
      if (p.sources) slot.sources = [...(slot.sources || []), ...p.sources];
    }
    return order.map(k => byId.get(k));
  }, [progress]);
  if (steps.length === 0) return null;
  return (
    <div className="mb-4 border border-[#e3e0db] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-3 py-2 flex items-center gap-2 bg-[#faf9f4] hover:bg-[#f3f1ec] text-left"
      >
        {open ? <ChevronUp size={12} className="text-[#a3a3a3]" /> : <ChevronDown size={12} className="text-[#a3a3a3]" />}
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
          {t('webstudio.researchProcess', 'Research process ({{count}} step)', { count: steps.length })}
        </span>
      </button>
      {open && (
        <ol className="p-3 space-y-1.5 border-t border-[#e3e0db]">
          {steps.map((s, i) => <ResearchStep key={s.id || i} step={s} />)}
        </ol>
      )}
    </div>
  );
}

function TelemetryRow({ label, value, warn }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[#737373]">{label}</span>
      <span className={`font-mono tabular-nums ${warn ? 'text-amber-600' : 'text-[#0a0a0a]'}`}>{value.toLocaleString()}</span>
    </div>
  );
}
