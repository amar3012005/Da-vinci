// Room report element library — the predefined UI/UX for EVERY rich element a
// room's final report can carry, across ALL room kinds (outreach, research,
// strategy, content, general). One visual system: the SINGULANCE brochure —
// warm cream, Newsreader serif numerals/heads, Hanken Grotesk body, hairline
// "ledger" rules. Renderers consume these via FENCE_ELEMENTS / CALLOUT.
//
// Fenced blocks the synthesis can emit → component:
//   ```timeline   one "label — event" per line          → TimelineBlock
//   ```chart      {"type":"bar|line|donut","title","data":[{label,value}]} → ChartBlock
//   ```stats      [{"label","value","delta"?}]           → StatRow (serif numerals)
//   ```steps      one "Title — detail" per line          → Steps (sequence cards)
//   ```mermaid    mermaid source                         → MermaidDiagram
//   > [!important|insight|risk|note] …                   → Callout
import React, { useEffect, useRef, useState } from 'react';

export const TOKENS = {
  ground: '#F5F0E8', panel: 'rgba(255,255,255,0.55)', ink: '#1C1A16',
  muted: '#6A6154', faint: '#8A8073', rule: 'rgba(28,26,22,0.12)',
  serif: "'Newsreader', Georgia, 'Times New Roman', serif",
  sans: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  accents: ['#B0836A', '#3E8E5B', '#7FB2E6', '#4A3550', '#F4B14D', '#EE9A6B', '#B39BE6', '#8A8073'],
};

/* ── Callout — one thing that matters, brochure margin-note style ────────── */
const _CALLOUT = {
  important: { bar: '#B0836A', label: 'Important' },
  insight: { bar: '#3E8E5B', label: 'Insight' },
  risk: { bar: '#F4B14D', label: 'Risk' },
  note: { bar: '#8A8073', label: 'Note' },
};
export function Callout({ kind, text, inline }) {
  const s = _CALLOUT[kind] || _CALLOUT.note;
  return (
    <aside className="my-4 pl-4 py-1" style={{ borderLeft: `3px solid ${s.bar}` }}>
      <div style={{ fontFamily: TOKENS.sans, fontWeight: 700, fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: s.bar }}>{s.label}</div>
      <div className="mt-1" style={{ fontFamily: TOKENS.serif, fontSize: 17, lineHeight: 1.5, color: TOKENS.ink }}>
        {inline ? inline(text) : text}
      </div>
    </aside>
  );
}

/* ── TimelineBlock — dated cadence as a ledger spine ─────────────────────── */
export function TimelineBlock({ raw }) {
  const rows = String(raw).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .map(l => { const m = l.match(/^(.*?)\s+[—\-–:]\s+(.+)$/); return m ? { when: m[1], what: m[2] } : { when: '', what: l }; });
  if (!rows.length) return null;
  return (
    <div className="my-5">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-4 py-2.5" style={{ gridTemplateColumns: '130px 1fr', borderTop: i ? `1px solid ${TOKENS.rule}` : 'none' }}>
          <div style={{ fontFamily: TOKENS.sans, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B0836A', paddingTop: 2 }}>{r.when || '·'}</div>
          <div style={{ fontFamily: TOKENS.sans, fontSize: 14.5, lineHeight: 1.55, color: TOKENS.ink }}>{r.what}</div>
        </div>
      ))}
    </div>
  );
}

/* ── StatRow — the report's numbers, serif numerals like a printed annual ── */
export function StatRow({ raw }) {
  let data; try { data = JSON.parse(raw); } catch { return null; }
  const stats = (Array.isArray(data) ? data : data?.data || []).filter(s => s && s.label != null).slice(0, 6);
  if (!stats.length) return null;
  return (
    <div className="my-5 grid gap-x-8 gap-y-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`, borderTop: `1px solid ${TOKENS.rule}`, borderBottom: `1px solid ${TOKENS.rule}`, padding: '18px 0' }}>
      {stats.map((s, i) => (
        <div key={i}>
          <div style={{ fontFamily: TOKENS.serif, fontWeight: 500, fontSize: 32, lineHeight: 1, color: TOKENS.ink }}>
            {String(s.value)}
            {s.delta != null && (
              <span style={{ fontFamily: TOKENS.sans, fontSize: 12, fontWeight: 600, marginLeft: 6, color: String(s.delta).trim().startsWith('-') ? '#B0836A' : '#3E8E5B' }}>{s.delta}</span>
            )}
          </div>
          <div className="mt-1.5" style={{ fontFamily: TOKENS.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: TOKENS.faint }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Steps — a real sequence (touch cadence, rollout), numbered because order matters ── */
export function Steps({ raw }) {
  const rows = String(raw).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .map(l => { const m = l.match(/^(?:\d+[.)]\s*)?(.*?)\s+[—\-–:]\s+(.+)$/); return m ? { t: m[1], d: m[2] } : { t: l, d: '' }; });
  if (!rows.length) return null;
  return (
    <div className="my-5">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-4 py-3" style={{ borderTop: i ? `1px solid ${TOKENS.rule}` : 'none' }}>
          <div style={{ fontFamily: TOKENS.serif, fontSize: 22, fontWeight: 500, color: '#B0836A', minWidth: 34, lineHeight: 1.1 }}>{String(i + 1).padStart(2, '0')}</div>
          <div className="min-w-0">
            <div style={{ fontFamily: TOKENS.sans, fontWeight: 700, fontSize: 14, color: TOKENS.ink }}>{r.t}</div>
            {r.d && <div className="mt-0.5" style={{ fontFamily: TOKENS.sans, fontSize: 13.5, lineHeight: 1.55, color: TOKENS.muted }}>{r.d}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── ChartBlock — bar / line / donut, inline SVG in the brochure palette ─── */
export function ChartBlock({ raw }) {
  let spec; try { spec = JSON.parse(raw); } catch { return null; }
  const data = (Array.isArray(spec?.data) ? spec.data : []).filter(d => d && d.label != null).slice(0, 12);
  if (!data.length) return null;
  const type = String(spec.type || 'bar').toLowerCase();
  const max = Math.max(...data.map(d => Number(d.value) || 0), 1);
  const PAL = TOKENS.accents;
  const title = spec.title && (
    <div className="mb-3" style={{ fontFamily: TOKENS.sans, fontWeight: 600, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: TOKENS.faint }}>{spec.title}</div>
  );
  if (type === 'donut') {
    const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0) || 1;
    let acc = 0; const R = 44, C = 2 * Math.PI * R;
    return (
      <div className="my-5" style={{ borderTop: `1px solid ${TOKENS.rule}`, borderBottom: `1px solid ${TOKENS.rule}`, padding: '18px 0' }}>
        {title}
        <div className="flex items-center gap-6 flex-wrap">
          <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={spec.title || 'chart'}>
            {data.map((d, i) => {
              const frac = (Number(d.value) || 0) / total; const dash = frac * C;
              const el = <circle key={i} cx="56" cy="56" r={R} fill="none" stroke={PAL[i % PAL.length]} strokeWidth="15" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc * C} transform="rotate(-90 56 56)" />;
              acc += frac; return el;
            })}
          </svg>
          <div className="space-y-1.5">
            {data.map((d, i) => (
              <div key={i} className="flex items-baseline gap-2" style={{ fontFamily: TOKENS.sans, fontSize: 13 }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0 self-center" style={{ background: PAL[i % PAL.length] }} />
                <span style={{ color: TOKENS.ink }}>{d.label}</span>
                <span style={{ fontFamily: TOKENS.serif, fontSize: 15, color: TOKENS.ink }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (type === 'line') {
    const W = 560, H = 120, step = data.length > 1 ? W / (data.length - 1) : W;
    const pts = data.map((d, i) => `${i * step},${H - (Number(d.value) || 0) / max * (H - 10) - 5}`).join(' ');
    return (
      <div className="my-5" style={{ borderTop: `1px solid ${TOKENS.rule}`, borderBottom: `1px solid ${TOKENS.rule}`, padding: '18px 0' }}>
        {title}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }} preserveAspectRatio="none" role="img">
          <polyline points={pts} fill="none" stroke="#B0836A" strokeWidth="2.5" />
          {data.map((d, i) => <circle key={i} cx={i * step} cy={H - (Number(d.value) || 0) / max * (H - 10) - 5} r="3.5" fill="#B0836A" />)}
        </svg>
        <div className="flex justify-between mt-1" style={{ fontFamily: TOKENS.sans, fontSize: 10.5, color: TOKENS.faint }}>
          {data.map((d, i) => <span key={i}>{d.label}</span>)}
        </div>
      </div>
    );
  }
  return (
    <div className="my-5" style={{ borderTop: `1px solid ${TOKENS.rule}`, borderBottom: `1px solid ${TOKENS.rule}`, padding: '18px 0' }}>
      {title}
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="grid items-center gap-3" style={{ gridTemplateColumns: '150px 1fr 56px' }}>
            <span className="truncate text-right" style={{ fontFamily: TOKENS.sans, fontSize: 12.5, color: TOKENS.muted }}>{d.label}</span>
            <div className="h-4 rounded-sm" style={{ width: `${Math.max(2, (Number(d.value) || 0) / max * 100)}%`, background: PAL[i % PAL.length] }} />
            <span style={{ fontFamily: TOKENS.serif, fontSize: 15, color: TOKENS.ink }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mermaid — flows/sequences (lazy CDN loader, brochure-neutral theme) ─── */
export function sanitizeMermaid(code) {
  return String(code || '').replace(/<script[\s\S]*?<\/script>/gi, '').trim();
}
export function MermaidDiagram({ code }) {
  const ref = useRef(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        if (!window.mermaid) {
          await new Promise((ok, no) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
            s.onload = ok; s.onerror = no; document.head.appendChild(s);
          });
          window.mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
        }
        const { svg } = await window.mermaid.render(`mmd-${Math.random().toString(36).slice(2, 8)}`, sanitizeMermaid(code));
        if (!dead && ref.current) ref.current.innerHTML = svg;
      } catch { if (!dead) setErr(true); }
    })();
    return () => { dead = true; };
  }, [code]);
  if (err) {
    return <pre className="my-4 overflow-x-auto text-[11px] p-3" style={{ fontFamily: 'monospace', border: `1px solid ${TOKENS.rule}`, borderRadius: 8, color: TOKENS.muted }}>{code}</pre>;
  }
  return <div ref={ref} className="my-5 overflow-x-auto" style={{ maxWidth: '100%' }} />;
}

/* ── Fence registry — renderers dispatch on the fence language ───────────── */
export const FENCE_ELEMENTS = {
  timeline: TimelineBlock,
  chart: ChartBlock,
  stats: StatRow,
  steps: Steps,
  mermaid: MermaidDiagram,
};

/* ── EmailElement — the drafted email as a letter artifact, typed live ────── */
// A brochure letter card that TYPES the email body when it enters view (the
// "agent writing" script moment), then rests as a clean formatted letter.
// Reduced-motion or long bodies → instant. Envelope rows parsed from markdown.
export function EmailElement({ raw, inline }) {
  const text = String(raw || '').replace(/\r/g, '');
  const subjM = text.match(/^\s*\*{0,2}Subject:?\*{0,2}\s*(.+)$/im);
  const toM = text.match(/^\s*\*{0,2}To:?\*{0,2}\s*(.+)$/im);
  const body = text
    .replace(subjM ? subjM[0] : '', '')
    .replace(toM ? toM[0] : '', '')
    .replace(/^\s*[-–—]{3,}\s*$/gm, '')
    .trim();
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = ref.current;
    if (!el) return undefined;
    const start = () => {
      if (started.current) return; started.current = true;
      if (reduced || body.length > 2400) { setShown(body); setDone(true); return; }
      const step = Math.max(2, Math.ceil(body.length / 220)); // ~2.2s total
      let i = 0;
      const id = setInterval(() => {
        i += step;
        if (i >= body.length) { setShown(body); setDone(true); clearInterval(id); }
        else setShown(body.slice(0, i));
      }, 10);
    };
    const io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) { start(); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [body]);
  return (
    <figure ref={ref} className="my-5 rounded-xl overflow-hidden"
      style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.rule}` }}>
      <figcaption className="flex items-center justify-between px-5 pt-4"
        style={{ fontFamily: TOKENS.sans, fontWeight: 700, fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B0836A' }}>
        <span>Draft email — ready to send</span>
        {!done && <span className="normal-case tracking-normal" style={{ color: TOKENS.faint, fontWeight: 500 }}>agent writing…</span>}
      </figcaption>
      <div className="px-5 pt-3">
        {toM && (
          <div className="flex gap-3 py-1.5" style={{ borderBottom: `1px solid ${TOKENS.rule}`, fontFamily: TOKENS.sans, fontSize: 13 }}>
            <span style={{ color: TOKENS.faint, minWidth: 56 }}>To</span>
            <span style={{ color: TOKENS.ink }}>{toM[1].replace(/\*/g, '').trim()}</span>
          </div>
        )}
        {subjM && (
          <div className="flex gap-3 py-1.5" style={{ borderBottom: `1px solid ${TOKENS.rule}`, fontFamily: TOKENS.sans, fontSize: 13 }}>
            <span style={{ color: TOKENS.faint, minWidth: 56 }}>Subject</span>
            <span style={{ fontFamily: TOKENS.serif, fontSize: 15.5, color: TOKENS.ink }}>{subjM[1].replace(/\*/g, '').trim()}</span>
          </div>
        )}
      </div>
      <div className="px-5 py-4" style={{ fontFamily: TOKENS.sans, fontSize: 14.5, lineHeight: 1.7, color: TOKENS.ink, whiteSpace: 'pre-wrap' }}>
        {done && inline ? inline(shown) : shown}
        {!done && <span className="inline-block align-text-bottom ml-0.5" style={{ width: 7, height: 15, background: '#B0836A', animation: 'pulse 1s infinite' }} />}
      </div>
    </figure>
  );
}
