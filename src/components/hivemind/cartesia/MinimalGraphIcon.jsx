import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const BLUE = '#117dff';

/**
 * MinimalGraphIcon — the clean minimal node/edge figure (open circles orbiting
 * a solid filled center, thin connecting lines) used consistently for
 * "memory engine" / "memory graph" visuals across the page.
 */
const NODES = [
  { x: 40, y: 30 }, { x: 118, y: 22 }, { x: 150, y: 78 },
  { x: 96, y: 118 }, { x: 30, y: 98 },
];
const CENTER = { x: 84, y: 68 };

const MinimalGraphIcon = ({ height = 160 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <div ref={ref} className="flex items-center justify-center" style={{ height }}>
      <svg viewBox="0 0 168 136" width="100%" height="100%" style={{ maxWidth: 220 }}>
        {NODES.map((n, i) => (
          <motion.line key={i} x1={CENTER.x} y1={CENTER.y} x2={n.x} y2={n.y}
            stroke={BLUE} strokeWidth="1" strokeOpacity="0.45"
            initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: 'easeOut' }} />
        ))}
        {[[0, 1], [1, 2], [3, 4]].map(([a, b], i) => (
          <motion.line key={`e${i}`} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
            stroke={BLUE} strokeWidth="1" strokeOpacity="0.3"
            initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.4 + i * 0.08, ease: 'easeOut' }} />
        ))}
        {NODES.map((n, i) => (
          <motion.circle key={`n${i}`} cx={n.x} cy={n.y} r="6" fill="white" stroke={BLUE} strokeWidth="1.6"
            initial={{ scale: 0, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }} />
        ))}
        <motion.circle cx={CENTER.x} cy={CENTER.y} r="16" fill={BLUE} fillOpacity="0.14"
          animate={{ r: [14, 18, 14] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.circle cx={CENTER.x} cy={CENTER.y} r="8" fill={BLUE}
          initial={{ scale: 0 }} animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }} />
      </svg>
    </div>
  );
};

export default MinimalGraphIcon;
