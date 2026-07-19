// AgentAvatar — the ONE avatar for every digital employee across the app.
// Renders a deterministic hand-drawn Humation SVG seeded from the agent's stable
// identity (id → slug → name), so the same agent always shows the same character
// — offline, no API, no persistence. A lane-colored ring keeps role identity
// (Strategist / Builder / Skeptic / Communicator …) visually distinct, and an
// `active` flag adds a soft pulsing ring for the live in-room speaker.
//
// Callers just pass the agent/employee object — this component normalizes the
// two field conventions (participants: `lane` + `avatarUrl`; employees:
// `hyper.lane`/`roleArchetype` + `avatar_url`) internally.
import React, { useMemo } from 'react';
import { Avatar } from '@humation/react';
import { humation1 } from '@humation/assets-humation-1';
import { LANE_META } from './rooms/shared';

function resolveLane(agent) {
  return (
    agent?.lane
    || agent?.hyper?.lane
    || agent?.roleArchetype
    || agent?.role_archetype
    || 'Communicator'
  );
}

function resolveSeed(agent) {
  return String(agent?.id || agent?.slug || agent?.name || 'agent');
}

function resolveName(agent) {
  return agent?.name || agent?.slug || '';
}

function resolveImg(agent) {
  const u = agent?.avatarUrl || agent?.avatar_url;
  return typeof u === 'string' && /^https?:\/\//.test(u) ? u : null;
}

/**
 * @param agent   the agent/employee object (any shape below is handled)
 * @param size    pixel size of the avatar (default 28)
 * @param shape   'circle' | 'square' (default 'circle')
 * @param ring    show the lane-colored ring/background (default true)
 * @param active  live speaker → soft pulsing ring (default false)
 */
export default function AgentAvatar({ agent, size = 28, shape = 'circle', ring = true, active = false, className = '' }) {
  const lane = resolveLane(agent);
  const meta = LANE_META[lane] || LANE_META.Communicator;
  const seed = resolveSeed(agent);
  const name = resolveName(agent);
  const img = resolveImg(agent);
  const radius = shape === 'square' ? Math.round(size * 0.28) : size;

  // Bias the avatar's palette by lane so role identity carries into the artwork
  // itself (deterministic — same lane always maps to the same accent).
  const colors = useMemo(() => ({ clothes: meta.color }), [meta.color]);

  const wrapStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    background: ring ? meta.bg : 'transparent',
    boxShadow: ring ? `0 0 0 1.5px ${meta.color}22` : 'none',
    overflow: 'hidden',
  };

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${active ? 'hm-agent-active' : ''} ${className}`}
      style={wrapStyle}
      title={name ? `${name} · ${lane}` : lane}
      data-lane={lane}
    >
      {img ? (
        <img src={img} alt="" className="w-full h-full object-cover" style={{ borderRadius: radius }} />
      ) : (
        <Avatar
          assets={humation1}
          seed={seed}
          size={size}
          colors={colors}
          background="transparent"
          title={name}
        />
      )}
      {active && (
        <span
          aria-hidden
          className="hm-agent-ring"
          style={{ borderRadius: radius, boxShadow: `0 0 0 2px ${meta.color}` }}
        />
      )}
    </span>
  );
}
