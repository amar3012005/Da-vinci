import { buildRadialAtlasLayout } from "./MemoryGraphRadialAtlas";

describe("MemoryGraph radial time encoding", () => {
  test("places newer memories nearer the center and older memories farther out", () => {
    const { positions } = buildRadialAtlasLayout([
      { id: "old", kind: "fact", createdAt: "2025-01-01T00:00:00Z" },
      { id: "middle", kind: "decision", createdAt: "2025-02-01T00:00:00Z" },
      { id: "new", kind: "fact", createdAt: "2025-03-01T00:00:00Z" },
    ]);
    expect(positions.get("new").radius).toBeLessThan(positions.get("middle").radius);
    expect(positions.get("middle").radius).toBeLessThan(positions.get("old").radius);
  });

  test("changing a memory category changes its sector, not its time radius", () => {
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
    expect(changedCategory.angle).not.toBe(first.angle);
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
