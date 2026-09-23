const VALID_FROM_FIELDS = [
  "validAt", "valid_at", "validFrom", "valid_from", "effectiveAt", "effective_at",
  "effectiveFrom", "effective_from", "occurredAt", "occurred_at", "eventAt", "event_at",
];
const VALID_TO_FIELDS = ["validTo", "valid_to", "effectiveTo", "effective_to"];
const RECORDED_FROM_FIELDS = [
  "recordedAt", "recorded_at", "ingestedAt", "ingested_at", "createdAt", "created_at",
  "timestamp", "updatedAt", "updated_at", "lastAccessedAt", "last_accessed_at",
];
const RECORDED_TO_FIELDS = ["recordedTo", "recorded_to", "supersededAt", "superseded_at"];
const RADIAL_MEMORY_COLORS = {
  fact: "#277be2", decision: "#f0a21b", preference: "#9265dc", lesson: "#12a38b",
  goal: "#e45b4d", event: "#647e9e", relationship: "#d64f91", document: "#d18a08",
  entity: "#596de0", summary: "#11a4b7", synthesis: "#a05de0",
};

export function getRadialMemoryColor(node) {
  const declaredKind = String(node?.kind || "").toLowerCase();
  const type = declaredKind === "document" || declaredKind === "entity"
    ? declaredKind
    : String(node?.memoryType || node?.memory_type || node?.type || (declaredKind !== "memory" ? declaredKind : ""))
      .toLowerCase()
      .replace(/[ -]/g, "_");
  return RADIAL_MEMORY_COLORS[type] || "#59718a";
}

function timestamp(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstTimestamp(node, fields) {
  for (const field of fields) {
    const parsed = timestamp(node?.[field]);
    if (parsed != null) return parsed;
  }
  return null;
}

/** Extract the two independent clocks without inventing valid-time evidence. */
export function getBitemporalInterval(node) {
  return {
    validFrom: firstTimestamp(node, VALID_FROM_FIELDS),
    validTo: firstTimestamp(node, VALID_TO_FIELDS),
    recordedFrom: firstTimestamp(node, RECORDED_FROM_FIELDS),
    recordedTo: firstTimestamp(node, RECORDED_TO_FIELDS),
  };
}

export function getTemporalBounds(nodes = [], field) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  nodes.forEach((node) => {
    const value = getBitemporalInterval(node)[field];
    if (value == null) return;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  return Number.isFinite(min) ? { min, max } : null;
}

export function getTemporalCutoff(bounds, progress) {
  if (!bounds) return null;
  return bounds.min + (bounds.max - bounds.min) * Math.max(0, Math.min(1, progress));
}

/** A bitemporal as-of view is the intersection of valid-time and recorded-time intervals. */
export function getBitemporalVisibleIds(nodes = [], validCutoff, recordedCutoff) {
  const visible = new Set();
  nodes.forEach((node) => {
    const { validFrom, validTo, recordedFrom, recordedTo } = getBitemporalInterval(node);
    const validAtCutoff = validCutoff == null || validFrom == null || (
      validFrom <= validCutoff && (validTo == null || validTo > validCutoff)
    );
    const recordedAtCutoff = recordedCutoff == null || recordedFrom == null || (
      recordedFrom <= recordedCutoff && (recordedTo == null || recordedTo > recordedCutoff)
    );
    if (validAtCutoff && recordedAtCutoff) visible.add(node.id);
  });
  return visible;
}
