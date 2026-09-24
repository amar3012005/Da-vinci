const INNER_RADIUS = 42;
const OUTER_RADIUS = 430;
const TEMPORAL_SHELL_RADII = [140, 270, OUTER_RADIUS];
const DETAILED_SHELL_RADII = [80, 140, 205, 270, 320, 365, 400, OUTER_RADIUS];

/** Add date ticks as the camera moves closer; retain three clear ticks at overview scale. */
export function getRadialShellTickCount(cameraDistance) {
  if (!Number.isFinite(cameraDistance) || cameraDistance > 1100) return 3;
  if (cameraDistance > 820) return 5;
  return DETAILED_SHELL_RADII.length;
}

export function getRadialShellVisibleIndices(count) {
  const total = DETAILED_SHELL_RADII.length;
  const visibleCount = Math.max(1, Math.min(total, Number.isFinite(count) ? count : 3));
  if (visibleCount === total) return new Set(DETAILED_SHELL_RADII.map((_, index) => index));
  if (visibleCount === 3) return new Set([1, 3, total - 1]);
  if (visibleCount === 5) return new Set([0, 2, 3, 5, total - 1]);
  return new Set(Array.from({ length: visibleCount }, (_, index) =>
    Math.round(index * (total - 1) / (visibleCount - 1))
  ));
}

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

  const shellDates = buildRadialAtlasShellTicks(nodes, 3);
  return { positions, oldest, newest, innerRadius: INNER_RADIUS, outerRadius: OUTER_RADIUS, shellDates };
}

/** Dated concentric shells used for zoom-dependent radial time labels. */
export function buildRadialAtlasShellTicks(nodes = [], count = 3) {
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
  const selectedRadii = count >= DETAILED_SHELL_RADII.length
    ? DETAILED_SHELL_RADII
    : count <= 3
      ? TEMPORAL_SHELL_RADII
      : [80, 205, 270, 365, OUTER_RADIUS];
  return selectedRadii.map((radius) => {
    if (newest == null) return { radius, timestamp: null, latest: radius === OUTER_RADIUS };
    const progress = Math.max(0, Math.min(1, (radius - INNER_RADIUS) / (OUTER_RADIUS - INNER_RADIUS)));
    return {
      radius,
      timestamp: oldest == null ? newest : oldest + (newest - oldest) * progress,
      latest: radius === OUTER_RADIUS,
    };
  });
}

/** Format the atlas' shell ticks as stable DD.MM.YYYY labels. */
export function formatRadialShellDate(timestamp) {
  if (!Number.isFinite(timestamp)) return "UNDATED";
  const date = new Date(timestamp);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getUTCFullYear()}`;
}
