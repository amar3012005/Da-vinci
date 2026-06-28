import React, { useMemo, useState, useCallback } from 'react';
import apiClient from './api-client';

/**
 * EntityText — wraps any org-level entity name present in `text` with a subtle
 * highlight. WIDE match (all org entities). CLICK → entity-level recall popover:
 * what HIVEMIND already knows about that entity from past meetings/docs. Hover
 * shows the canonical name; click opens recent mentions. Self-contained (does
 * its own fetch). Reusable across meetings/chat/KB.
 *
 * @param {{ text?: string, entities?: Array<{name:string,kind?:string}>, className?: string }} props
 */
export default function EntityText({ text, entities, className = '' }) {
  const [pop, setPop] = useState(null); // { name, x, y, loading, mentions }

  const openEntity = useCallback(async (name, ev) => {
    ev.stopPropagation();
    const r = ev.currentTarget.getBoundingClientRect();
    setPop({ name, x: Math.min(r.left, window.innerWidth - 360), y: r.bottom + 6, loading: true, mentions: [] });
    try {
      const { data } = await apiClient.core.get(`/api/meetings/entity-recall?name=${encodeURIComponent(name)}`);
      setPop((p) => (p && p.name === name ? { ...p, loading: false, mentions: data?.mentions || [] } : p));
    } catch {
      setPop((p) => (p && p.name === name ? { ...p, loading: false, mentions: [] } : p));
    }
  }, []);

  const parts = useMemo(() => {
    const s = String(text || '');
    if (!s) return null;
    const names = (Array.isArray(entities) ? entities : [])
      .map((e) => (typeof e === 'string' ? e : e?.name))
      .filter((n) => typeof n === 'string' && n.trim().length > 1)
      .sort((a, b) => b.length - a.length);
    if (!names.length) return null;
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let re;
    try { re = new RegExp(`\\b(${names.map(esc).join('|')})\\b`, 'gi'); } catch { return null; }
    const out = [];
    let last = 0; let m; let i = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) out.push(s.slice(last, m.index));
      const name = m[0];
      out.push(
        <span
          key={i++}
          title={`What HIVEMIND knows about ${name}`}
          onClick={(e) => openEntity(name, e)}
          className="bg-[#117dff]/[0.08] border-b border-[#117dff]/40 rounded-[3px] px-0.5 cursor-pointer hover:bg-[#117dff]/[0.16] transition-colors"
        >{name}</span>,
      );
      last = m.index + name.length;
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  }, [text, entities, openEntity]);

  return (
    <>
      {parts == null ? <>{text}</> : <span className={className}>{parts}</span>}
      {pop && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPop(null)} />
          <div
            className="fixed z-50 w-[340px] max-h-[360px] overflow-auto bg-white border border-[#e3e0db] rounded-[10px] shadow-lg p-3"
            style={{ left: pop.x, top: pop.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#0a0a0a] text-[13px] font-semibold font-['Space_Grotesk']">{pop.name}</span>
              <span className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider">HIVEMIND recall</span>
            </div>
            {pop.loading ? (
              <p className="text-[#a3a3a3] text-xs py-3 text-center">Recalling…</p>
            ) : pop.mentions.length === 0 ? (
              <p className="text-[#a3a3a3] text-xs py-3 text-center">No prior mentions in memory.</p>
            ) : (
              <ul className="space-y-2">
                {pop.mentions.map((mn) => (
                  <li key={mn.id} className="border-b border-[#f3f1ec] last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#0a0a0a] text-[12px] font-medium truncate">{mn.title || mn.memory_type}</span>
                      <span className="text-[#a3a3a3] text-[10px] font-mono shrink-0">{mn.date ? new Date(mn.date).toLocaleDateString() : ''}</span>
                    </div>
                    {mn.snippet && <p className="text-[#525252] text-[11px] mt-0.5 line-clamp-2">{mn.snippet}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
