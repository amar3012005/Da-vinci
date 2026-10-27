import { getDocumentMemberCounts, getNodeSourceGlyph, getSourceChipOpacity } from "./MemoryGraphSourceGlyph";

describe("MemoryGraph source glyphs", () => {
  test("detects file type from the filename tag", () => {
    expect(getNodeSourceGlyph({ tags: ["filename:Plan.PDF"] })).toMatchObject({ key: "pdf", kind: "file", label: "PDF" });
    expect(getNodeSourceGlyph({ tags: ["filename:budget.xlsx"] })).toMatchObject({ key: "sheet" });
  });

  test("document nodes use the title extension and are flagged as hubs", () => {
    expect(getNodeSourceGlyph({ kind: "document", title: "deck.pptx" })).toMatchObject({ key: "slide", isDocument: true });
    expect(getNodeSourceGlyph({ kind: "document", title: "untitled" })).toMatchObject({ key: "file", isDocument: true });
  });

  test("detects the connected app from platform tags", () => {
    expect(getNodeSourceGlyph({ tags: ["platform:mcp", "source:mcp"] })).toMatchObject({ key: "mcp", kind: "app" });
    expect(getNodeSourceGlyph({ sourcePlatform: "gmail" })).toMatchObject({ key: "gmail" });
  });

  test("entities and unknown sources get no chip", () => {
    expect(getNodeSourceGlyph({ kind: "entity", tags: ["filename:a.pdf"] })).toBeNull();
    expect(getNodeSourceGlyph({ tags: ["misc"] })).toBeNull();
  });

  test("memory chips fade in with proximity while document hubs stay visible", () => {
    expect(getSourceChipOpacity(1200, false)).toBe(0);
    expect(getSourceChipOpacity(700, false)).toBeGreaterThan(0);
    expect(getSourceChipOpacity(300, false)).toBe(1);
    expect(getSourceChipOpacity(1800, true)).toBeGreaterThan(0.7);
  });

  test("counts document members from edges (ids or node objects) and filename tags", () => {
    const nodes = [
      { id: "d1", kind: "document", title: "Plan.pdf" },
      { id: "a", kind: "memory", tags: [] },
      { id: "b", kind: "memory", tags: ["filename:plan.PDF"] },
      { id: "c", kind: "memory", tags: [] },
    ];
    const links = [
      { source: "d1", target: "a" },
      { source: { id: "b" }, target: { id: "d1" } },
      { source: "a", target: "c" },
    ];
    expect([...getDocumentMemberCounts(nodes, links)]).toEqual([["d1", 2]]);
    expect(getDocumentMemberCounts([{ id: "x", kind: "memory" }], []).size).toBe(0);
  });
});
