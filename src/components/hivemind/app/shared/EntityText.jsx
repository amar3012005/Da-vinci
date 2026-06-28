import React, { useMemo } from 'react';

/**
 * EntityText — wraps any org-level entity name present in `text` with a subtle
 * highlight so the reader sees what HIVEMIND already knows about. WIDE match
 * (all org entities), HIGHLIGHT-ONLY for now — hover shows the canonical name;
 * no click/recall yet (that's a later phase). Pure render, no network.
 *
 * @param {{ text?: string, entities?: Array<{name:string,kind?:string}>, className?: string }} props
 */
export default function EntityText({ text, entities, className = '' }) {
  const parts = useMemo(() => {
    const s = String(text || '');
    if (!s) return null;
    const names = (Array.isArray(entities) ? entities : [])
      .map((e) => (typeof e === 'string' ? e : e?.name))
      .filter((n) => typeof n === 'string' && n.trim().length > 1)
      .sort((a, b) => b.length - a.length); // longest-first so "Borealis Freight" beats "Borealis"
    if (!names.length) return null;
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let re;
    try { re = new RegExp(`\\b(${names.map(esc).join('|')})\\b`, 'gi'); } catch { return null; }
    const out = [];
    let last = 0; let m; let i = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) out.push(s.slice(last, m.index));
      out.push(
        <span
          key={i++}
          title={m[0]}
          className="bg-[#117dff]/[0.08] border-b border-[#117dff]/40 rounded-[3px] px-0.5 cursor-help"
        >{m[0]}</span>,
      );
      last = m.index + m[0].length;
      if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width loops
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  }, [text, entities]);

  if (parts == null) return <>{text}</>;
  return <span className={className}>{parts}</span>;
}
