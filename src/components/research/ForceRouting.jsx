import React, { useState } from 'react';

/**
 * ForceRouting — interactive view of CSI's force-based action selection.
 * Toggle each attractive / repulsive force; a live bar shows the resulting
 * "pull" on the candidate trail (softmax-style), so you feel how the swarm
 * chooses a path. Light theme.
 */
const BORDER = '#E4E3DE';
const GREEN = '#2f9e6b';
const RED = '#d2553a';

const ATTRACT = [
  ['Goal attraction', 'advances the current goal', 0.9],
  ['Affordance', 'executable right now', 0.7],
  ['Blueprint prior', 'a proven procedure exists', 0.8],
  ['Social', 'trusted agents succeeded here', 0.6],
  ['Momentum', 'continues a productive path', 0.5],
];
const REPEL = [
  ['Conflict', 'conflicts with known outcomes', 0.8],
  ['Congestion', 'too many agents already here', 0.6],
  ['Cost', 'too expensive / inefficient', 0.7],
];

const ForceRouting = () => {
  const [on, setOn] = useState(() => {
    const s = {}; [...ATTRACT, ...REPEL].forEach(([n]) => (s[n] = true)); return s;
  });
  const toggle = (n) => setOn((p) => ({ ...p, [n]: !p[n] }));

  const pull = Math.max(
    0,
    ATTRACT.reduce((a, [n, , w]) => a + (on[n] ? w : 0), 0) -
    REPEL.reduce((a, [n, , w]) => a + (on[n] ? w : 0), 0)
  );
  const pct = Math.min(100, (pull / 3.5) * 100);

  const Row = ([n, d, w], type) => (
    <button key={n} onClick={() => toggle(n)}
      className="flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors"
      style={{ borderColor: BORDER, background: on[n] ? (type === 'a' ? '#eafaf2' : '#fdeee9') : '#fff' }}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: on[n] ? (type === 'a' ? GREEN : RED) : '#cfcfc8' }} />
      <span className="flex-1">
        <span className="text-[14px] font-medium text-[#0a0a0a]">{n}</span>
        <span className="ml-2 text-[12px] text-[#8a8a82]">{d}</span>
      </span>
      <span className="font-mono text-[11px]" style={{ color: type === 'a' ? GREEN : RED }}>{type === 'a' ? '+' : '−'}{w}</span>
    </button>
  );

  return (
    <div className="my-10 rounded-xl border p-6" style={{ borderColor: BORDER, background: '#faf9f4' }}>
      <p className="font-mono text-[11px] uppercase tracking-wider text-[#8a8a82]">Force-based routing — toggle the forces</p>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: GREEN }}>Attractive</p>
          {ATTRACT.map((r) => Row(r, 'a'))}
        </div>
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: RED }}>Repulsive</p>
          {REPEL.map((r) => Row(r, 'r'))}
        </div>
      </div>

      {/* resulting pull */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-[#0a0a0a]">Net pull on this trail</span>
          <span className="font-mono text-[13px] text-[#0a0a0a]">{pull.toFixed(1)}</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#e7e4dd]">
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GREEN}, #8fd14f)` }} />
        </div>
        <p className="mt-2 text-[12px] text-[#8a8a82]">{pct > 55 ? 'Strong pull — the swarm exploits this path.' : pct > 20 ? 'Moderate — explored, not committed.' : 'Weak — the swarm routes elsewhere.'}</p>
      </div>
    </div>
  );
};

export default ForceRouting;
