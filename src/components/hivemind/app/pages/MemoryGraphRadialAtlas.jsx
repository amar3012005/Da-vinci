const INNER_RADIUS = 42;
const OUTER_RADIUS = 430;

function getTimestamp(node) {
  for (const value of [node.updatedAt, node.createdAt, node.timestamp, node.lastAccessedAt]) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.isFinite(node.daysSinceUpdate) ? Date.now() - node.daysSinceUpdate * 86400000 : null;
}

function hash(value) {
  let out = 2166136261;
  for (const char of String(value || "")) out = Math.imul(out ^ char.charCodeAt(0), 16777619);
  return out >>> 0;
}

/** Deterministic, static 3D atlas coordinates: age controls radius; identity controls angle. */
export function buildRadialAtlasLayout(nodes = []) {
  let oldest = Number.POSITIVE_INFINITY;
  let newest = Number.NEGATIVE_INFINITY;
  nodes.forEach((node) => {
    const time = getTimestamp(node);
    if (time == null) return;
    oldest = Math.min(oldest, time);
    newest = Math.max(newest, time);
  });
  if (!Number.isFinite(oldest)) oldest = null;
  if (!Number.isFinite(newest)) newest = null;
  const span = Math.max(1, (newest ?? 0) - (oldest ?? 0));
  const positions = new Map();

  nodes.forEach((node) => {
    const time = getTimestamp(node);
    const seed = hash(node.id);
    const u = (seed % 1000003) / 1000003;
    const v = ((seed >>> 10) % 1000033) / 1000033;
    const azimuth = 2 * Math.PI * u;
    const polar = Math.acos(1 - 2 * v);
    // Fresh memories grow away from the company core. Undated memories use a
    // separate outermost shell and remain explicitly distinguishable.
    const age = time == null ? 1.08 : (time - (oldest ?? time)) / span;
    const radius = time == null ? OUTER_RADIUS + 24 : INNER_RADIUS + age * (OUTER_RADIUS - INNER_RADIUS);
    const sinPolar = Math.sin(polar);
    positions.set(node.id, {
      x: Math.cos(azimuth) * sinPolar * radius,
      y: Math.cos(polar) * radius,
      z: Math.sin(azimuth) * sinPolar * radius,
      radius,
      azimuth,
      polar,
      time,
      undated: time == null,
    });
  });

  return { positions, oldest, newest, innerRadius: INNER_RADIUS, outerRadius: OUTER_RADIUS };
}
