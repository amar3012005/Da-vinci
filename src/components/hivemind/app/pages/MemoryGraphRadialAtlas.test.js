import { buildRadialAtlasLayout } from "./MemoryGraphRadialAtlas";

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
});
