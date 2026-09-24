import {
  buildRadialAtlasLayout,
  buildRadialAtlasShellTicks,
  formatRadialShellDate,
  getRadialShellDatePosition,
  getRadialShellTickCount,
  getRadialShellVisibleIndices,
} from "./MemoryGraphRadialAtlas";

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

  test("reveals more timestamp shells as camera distance decreases", () => {
    expect(getRadialShellTickCount(1400)).toBe(3);
    expect(getRadialShellTickCount(950)).toBe(5);
    expect(getRadialShellTickCount(650)).toBe(8);
    expect(getRadialShellVisibleIndices(3)).toEqual(new Set([1, 3, 7]));
    expect(getRadialShellVisibleIndices(5)).toEqual(new Set([0, 2, 3, 5, 7]));
    expect(getRadialShellVisibleIndices(8).size).toBe(8);
  });

  test("spreads date labels around the shell surface in orbit and pole views", () => {
    const count = 8;
    const orbitLabels = Array.from({ length: count }, (_, index) =>
      getRadialShellDatePosition(270, index, count)
    );
    const poleLabels = Array.from({ length: count }, (_, index) =>
      getRadialShellDatePosition(270, index, count, true)
    );

    expect(new Set(orbitLabels.map(({ x, y, z }) => `${x.toFixed(2)}:${y.toFixed(2)}:${z.toFixed(2)}`)).size).toBe(count);
    expect(new Set(poleLabels.map(({ x, y, z }) => `${x.toFixed(2)}:${z.toFixed(2)}`)).size).toBe(count);
    orbitLabels.forEach(({ x, y, z }) => {
      expect(Math.hypot(x, y, z)).toBeCloseTo(284);
      expect(y).toBeGreaterThan(0);
      expect(z).toBeGreaterThan(0);
    });
    poleLabels.forEach(({ x, y, z }) => {
      expect(Math.hypot(x, z)).toBeCloseTo(284);
      expect(y).toBe(0);
    });
    expect(poleLabels.at(-1).z).toBeLessThan(0);
    expect(Math.abs(poleLabels.at(-1).x)).toBeCloseTo(0);
  });

  test("reflows only visible dates and anchors the newest label at the visual center", () => {
    const overview = [1, 3, 7];
    const older = getRadialShellDatePosition(140, 1, 8, false, 14, overview);
    const middle = getRadialShellDatePosition(270, 3, 8, false, 14, overview);
    const latest = getRadialShellDatePosition(430, 7, 8, false, 14, overview);
    const latestPole = getRadialShellDatePosition(430, 7, 8, true, 14, overview);

    expect(older.x).toBeGreaterThan(0);
    expect(middle.x).toBeLessThan(0);
    expect(latest.x).toBeCloseTo(0);
    expect(latest.z).toBeGreaterThan(0);
    expect(latestPole.x).toBeCloseTo(0);
    expect(latestPole.z).toBeLessThan(0);
  });

  test("adds dated shells between overview rings while keeping the latest at the surface", () => {
    const ticks = buildRadialAtlasShellTicks([
      { id: "old", kind: "fact", createdAt: "2025-01-01T00:00:00Z" },
      { id: "new", kind: "fact", createdAt: "2025-03-01T00:00:00Z" },
    ], 8);
    expect(ticks).toHaveLength(8);
    expect(ticks.map(({ radius }) => radius)).toEqual([80, 140, 205, 270, 320, 365, 400, 430]);
    expect(ticks.every((tick, index) => index === 0 || tick.timestamp > ticks[index - 1].timestamp)).toBe(true);
    expect(ticks.at(-1)).toMatchObject({ timestamp: Date.parse("2025-03-01T00:00:00Z"), latest: true });
  });
});
