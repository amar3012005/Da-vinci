import {
  getBitemporalInterval,
  getBitemporalVisibleIds,
  getRadialMemoryColor,
  getTemporalBounds,
  getTemporalCutoff,
  getTemporalTopDownPose,
} from "./MemoryGraphTemporal";

describe("Memory Graph bitemporal timeline", () => {
  const nodes = [
    { id: "known", validFrom: "2025-01-01T00:00:00Z", recordedAt: "2025-02-01T00:00:00Z" },
    { id: "backfilled", occurred_at: "2024-12-01T00:00:00Z", ingested_at: "2025-03-01T00:00:00Z" },
    { id: "superseded", valid_from: "2024-01-01T00:00:00Z", valid_to: "2025-01-01T00:00:00Z", created_at: "2024-01-01T00:00:00Z", superseded_at: "2025-01-10T00:00:00Z" },
    { id: "unknown-valid", createdAt: "2025-01-15T00:00:00Z" },
  ];

  test("keeps valid time distinct from when the system recorded a memory", () => {
    expect(getBitemporalInterval(nodes[1])).toEqual({
      validFrom: Date.parse("2024-12-01T00:00:00Z"),
      validTo: null,
      recordedFrom: Date.parse("2025-03-01T00:00:00Z"),
      recordedTo: null,
    });
    expect(getBitemporalInterval(nodes[3]).validFrom).toBeNull();
  });

  test("colors generic memory nodes from their actual memory type", () => {
    expect(getRadialMemoryColor({ kind: "memory", memory_type: "decision" })).toBe("#f0a21b");
    expect(getRadialMemoryColor({ kind: "memory", memoryType: "fact" })).toBe("#277be2");
    expect(getRadialMemoryColor({ kind: "document", type: "fact" })).toBe("#d18a08");
    expect(getRadialMemoryColor({ kind: "memory" })).toBe("#59718a");
  });

  test("filters as-of state across both independent clocks", () => {
    const validCutoff = Date.parse("2025-01-05T00:00:00Z");
    const recordedCutoff = Date.parse("2025-02-15T00:00:00Z");
    expect([...getBitemporalVisibleIds(nodes, validCutoff, recordedCutoff)].sort()).toEqual([
      "known", "unknown-valid",
    ]);
  });

  test("builds safe bounds and preserves an empty axis as unknown", () => {
    const bounds = getTemporalBounds(nodes, "validFrom");
    expect(bounds.min).toBe(Date.parse("2024-01-01T00:00:00Z"));
    expect(getTemporalCutoff(bounds, 1)).toBe(Date.parse("2025-01-01T00:00:00Z"));
    expect(getTemporalBounds([{ id: "x" }], "validFrom")).toBeNull();
    expect(getTemporalCutoff(null, 0.5)).toBeNull();
  });

  test("uses a stable pole-view camera pose centered over the selected target", () => {
    expect(getTemporalTopDownPose({ x: 12, y: -4, z: 8 }, 500)).toEqual({
      position: { x: 12, y: 1321, z: 8 },
      up: { x: 0, y: 0, z: -1 },
    });
  });
});
