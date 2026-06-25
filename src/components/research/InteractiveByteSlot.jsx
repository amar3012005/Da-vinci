import React, { useState } from 'react';

/**
 * InteractiveByteSlot — the .amr 202-byte slot as a hoverable field strip.
 * Hover/click a field: it lights up and a detail card shows offset/size/purpose.
 * Light (paper) theme to match the research body.
 */
const EMBER = '#FF5229';
const BORDER = '#E4E3DE';

const FIELDS = [
  { name: 'id', off: 0, size: 4, color: '#9aa3b2', purpose: 'Stable slot id — never renumbered. Slot i lives at a computable offset; no index lookup to find a record.' },
  { name: 'flags', off: 4, size: 2, color: '#b2a99a', purpose: 'TOMBSTONE · PQ_TRAINED · TEXT_INLINE · GRAPH_DIRTY — one u16 of state per memory.' },
  { name: 'created_at', off: 6, size: 8, color: '#7fb5c8', purpose: 'Ingestion time — bi-temporal axis 1 (nanoseconds). When we learned it.' },
  { name: 'valid_from', off: 14, size: 8, color: '#6fa8bd', purpose: 'Fact validity — bi-temporal axis 2 (nanoseconds). When it was true.' },
  { name: 'text', off: 22, size: 12, color: '#a7b07f', purpose: 'text_ptr + LZ4 length + raw length — addresses the append-only compressed text region.' },
  { name: 'vector_pq', off: 34, size: 128, color: EMBER, purpose: '1024-dim embedding → 128 bytes via Product Quantization. 32× compression. The vector IS in the slot, not a foreign key.' },
  { name: 'entity_bitmap', off: 162, size: 8, color: '#c98a4b', purpose: '64 canonical entities, one bit each. An entity filter is a single bitwise AND — O(1), no posting list.' },
  { name: 'adjacency', off: 170, size: 32, color: '#8a7fc8', purpose: '8 graph-neighbour slot ids inline. A 2-hop traversal is pointer-following in the same mmap — never a join.' },
];

const InteractiveByteSlot = () => {
  const [active, setActive] = useState(5); // vector_pq by default
  const f = FIELDS[active];
  const total = 202;

  return (
    <div className="my-10">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8a8a82]">.amr slot — 202 bytes</span>
        <span className="font-mono text-[11px] text-[#a3a3a3]">hover a field</span>
      </div>

      {/* the strip — segment width ∝ byte size */}
      <div className="flex h-16 w-full overflow-hidden rounded-lg border" style={{ borderColor: BORDER }}>
        {FIELDS.map((fld, i) => (
          <button
            key={fld.name}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={fld.name}
            className="group relative h-full border-r transition-[filter,opacity] last:border-r-0"
            style={{
              width: `${(fld.size / total) * 100}%`,
              background: fld.color,
              borderColor: 'rgba(255,255,255,0.5)',
              opacity: active === i ? 1 : 0.55,
              minWidth: 6,
            }}
          >
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9px] font-semibold text-black/70 opacity-0 transition-opacity group-hover:opacity-100">
              {fld.size >= 8 ? fld.size : ''}
            </span>
          </button>
        ))}
      </div>

      {/* offset ruler */}
      <div className="mt-1 flex w-full font-mono text-[9px] text-[#b9b8b1]">
        {FIELDS.map((fld) => (
          <span key={fld.name} style={{ width: `${(fld.size / total) * 100}%`, minWidth: 6 }}>{fld.off}</span>
        ))}
      </div>

      {/* detail card */}
      <div className="mt-5 rounded-lg border p-5" style={{ borderColor: BORDER, background: '#fff' }}>
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded" style={{ background: f.color }} />
          <span className="font-['Space_Grotesk'] text-lg font-semibold text-[#0a0a0a]">{f.name}</span>
          <span className="font-mono text-[11px] text-[#8a8a82]">offset {f.off} · {f.size} B</span>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-[#525252]">{f.purpose}</p>
      </div>
    </div>
  );
};

export default InteractiveByteSlot;
