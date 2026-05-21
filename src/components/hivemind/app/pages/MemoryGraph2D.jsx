/**
 * MemoryGraph2D — re-uses the full MemoryGraph wrapper (topbar, legend,
 * filters, right-side memory drawer, sidebar-aware sizing) and swaps the
 * inner canvas to a force-directed 2D ForceGraph2D renderer that mirrors
 * the 3D visual theme (same node colors, edge palette, sprite labels).
 *
 * Everything outside the canvas is identical to /hivemind/app/graph.
 */

import MemoryGraph from './MemoryGraph';

export default function MemoryGraph2D() {
  return <MemoryGraph dimension="2d" />;
}
