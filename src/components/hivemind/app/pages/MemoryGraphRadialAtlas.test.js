import { buildRadialAtlasLayout, formatRadialShellDate } from "./MemoryGraphRadialAtlas";

describe("MemoryGraph radial time encoding", () => {
  test("grows radially outward over time, with older memories near the core", () => {
    const { positions } = buildRadialAtlasLayout([
      { id: "old", kind: "fact", createdAt: "2025-01-01T00:00:00Z" },
      { id: "middle", kind: "decision", createdAt: "2025-02-01T00:00:00Z" },
      { id: "new", kind: "fact", createdAt: "2025-03-01T00:00:00Z" },
    ]);
    expect(positions.get("old").radius).toBeLessThan(positions.get("middle").radius);
    expect(positions.get("middle").radius).toBeLessThan(positions.get("new").radius);
    expect(positions.get("old").radius).toBeGreaterThan(0);
    expect(positions.get("new").radius).toBeCloseTo(Math.hypot(positions.get("new").x, positions.get("new").y, positions.get("new").z));
  });

  test("positions memories in 3D while category does not alter temporal radius", () => {
    const date = "2025-02-01T00:00:00Z";
    const first = buildRadialAtlasLayout([
      { id: "a", kind: "fact", createdAt: date },
      { id: "b", kind: "fact", createdAt: "2025-03-01T00:00:00Z" },
    ]).positions.get("a");
    const changedCategory = buildRadialAtlasLayout([
      { id: "a", kind: "decision", createdAt: date },
      { id: "b", kind: "fact", createdAt: "2025-03-01T00:00:00Z" },
    ]).positions.get("a");
    expect(changedCategory.radius).toBe(first.radius);
    expect(Math.abs(first.z) + Math.abs(first.y)).toBeGreaterThan(0);
    expect(Math.hypot(first.x, first.y, first.z)).toBeCloseTo(first.radius);
  });

  test("is stable across renders for unchanged memory data", () => {
    const nodes = [
      { id: "alpha", kind: "event", createdAt: "2025-01-01T00:00:00Z" },
      { id: "beta", kind: "document", createdAt: "2025-02-01T00:00:00Z" },
    ];
    const first = buildRadialAtlasLayout(nodes).positions;
    const next = buildRadialAtlasLayout(nodes).positions;
    expect(next.get("alpha")).toEqual(first.get("alpha"));
    expect(next.get("beta")).toEqual(first.get("beta"));
  });

  test("exposes three dated shell ticks and marks the outer shell as latest", () => {
    const { shellDates } = buildRadialAtlasLayout([
      { id: "old", kind: "fact", createdAt: "2025-01-01T00:00:00Z" },
      { id: "new", kind: "fact", createdAt: "2025-03-01T00:00:00Z" },
    ]);
    expect(shellDates).toHaveLength(3);
    expect(shellDates.map(({ radius }) => radius)).toEqual([140, 270, 430]);
    expect(shellDates[0].timestamp).toBeLessThan(shellDates[1].timestamp);
    expect(shellDates[1].timestamp).toBeLessThan(shellDates[2].timestamp);
    expect(shellDates[2]).toMatchObject({ timestamp: Date.parse("2025-03-01T00:00:00Z"), latest: true });
    expect(formatRadialShellDate(shellDates[2].timestamp)).toBe("01.03.2025");
  });

  test("keeps shell dates explicitly undated when there is no temporal evidence", () => {
    const { shellDates } = buildRadialAtlasLayout([{ id: "undated", kind: "fact" }]);
    expect(shellDates.every(({ timestamp }) => timestamp == null)).toBe(true);
    expect(formatRadialShellDate(null)).toBe("UNDATED");
  });
});
