export const DEFAULT_GRAPH_LAYERS = {
  sources: true,
  claims: true,
  trails: true,
  observations: true,
  executionEvents: true,
  blueprints: true,
  csi: true,
};

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : Array.from(value);
}

function toSet(value) {
  return new Set(toArray(value));
}

export function mergeGraphLayers(layers) {
  return {
    ...DEFAULT_GRAPH_LAYERS,
    ...(layers || {}),
  };
}

export function getNodeId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return value.id || null;
}

function getLowerText(value) {
  return String(value || '').toLowerCase();
}

function matchesCollection(value, allowedValues) {
  if (!allowedValues || allowedValues.size === 0) return true;
  return allowedValues.has(String(value));
}

function matchesConfidence(node, minConfidence, maxConfidence) {
  if (node.confidence == null) return true;
  if (typeof minConfidence === 'number' && node.confidence < minConfidence) return false;
  if (typeof maxConfidence === 'number' && node.confidence > maxConfidence) return false;
  return true;
}

function matchesSearch(node, normalizedSearch) {
  if (!normalizedSearch) return true;

  const haystack = [
    node.id,
    node.title,
    node.summary,
    node.type,
    node.stage,
    node.runtime,
    node.domain,
    node.verdict,
    node.url,
    node.agent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedSearch);
}

function matchesNodeFilters(node, filters) {
  if (!filters) return true;

  const nodeTypes = toSet(filters.nodeTypes);
  const runtimes = toSet(filters.runtimes);
  const verdicts = toSet(filters.verdicts);
  const domains = toSet(filters.domains);
  const agents = toSet(filters.agents);
  const stages = toSet(filters.stages);

  if (!matchesCollection(node.type, nodeTypes)) return false;
  if (!matchesCollection(node.runtime, runtimes)) return false;
  if (!matchesCollection(node.verdict, verdicts)) return false;
  if (!matchesCollection(node.domain, domains)) return false;
  if (!matchesCollection(node.agent, agents)) return false;
  if (!matchesCollection(node.stage, stages)) return false;
  if (!matchesConfidence(node, filters.minConfidence, filters.maxConfidence)) return false;
  if (typeof filters.node === 'function' && !filters.node(node)) return false;

  return true;
}

function matchesLinkFilters(link, filters) {
  if (!filters) return true;

  const linkTypes = toSet(filters.linkTypes);
  if (!matchesCollection(link.type, linkTypes)) return false;
  if (typeof filters.link === 'function' && !filters.link(link)) return false;

  return true;
}

export function countActiveGraphFilters(filters, searchQuery) {
  let count = searchQuery ? 1 : 0;
  if (!filters) return count;

  [
    filters.nodeTypes,
    filters.runtimes,
    filters.verdicts,
    filters.domains,
    filters.agents,
    filters.stages,
    filters.linkTypes,
  ].forEach((value) => {
    if (toArray(value).length > 0) count += 1;
  });

  if (typeof filters.minConfidence === 'number' || typeof filters.maxConfidence === 'number') {
    count += 1;
  }

  if (typeof filters.node === 'function') count += 1;
  if (typeof filters.link === 'function') count += 1;

  return count;
}

export function buildGraphPresentation({
  data,
  searchQuery,
  filters,
  hoveredNodeId,
  selectedNodeId,
  highlightedNodeIds,
  highlightedLinkIds,
}) {
  const normalizedSearch = getLowerText(searchQuery).trim();
  const externalNodeHighlights = toSet(highlightedNodeIds);
  const externalLinkHighlights = toSet(highlightedLinkIds);
  const visibleNodes = (data?.nodes || []).filter((node) => matchesNodeFilters(node, filters));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const searchMatches = new Set(
    visibleNodes.filter((node) => matchesSearch(node, normalizedSearch)).map((node) => node.id)
  );

  const visibleLinks = (data?.links || []).filter((link) => {
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    return (
      sourceId &&
      targetId &&
      visibleNodeIds.has(sourceId) &&
      visibleNodeIds.has(targetId) &&
      matchesLinkFilters(link, filters)
    );
  });

  const adjacency = new Map();
  visibleLinks.forEach((link, index) => {
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    if (!sourceId || !targetId) return;

    if (!adjacency.has(sourceId)) adjacency.set(sourceId, new Set());
    if (!adjacency.has(targetId)) adjacency.set(targetId, new Set());
    adjacency.get(sourceId).add(targetId);
    adjacency.get(targetId).add(sourceId);

    if (!link.id) {
      link.id = `${sourceId}->${targetId}:${index}`;
    }
  });

  const focusNodeId = hoveredNodeId || selectedNodeId || null;
  const connectedNodeIds = new Set(focusNodeId ? adjacency.get(focusNodeId) || [] : []);

  const nodes = visibleNodes.map((node) => {
    const isSelected = node.id === selectedNodeId;
    const isHovered = node.id === hoveredNodeId;
    const isConnected = connectedNodeIds.has(node.id);
    const isHighlighted = externalNodeHighlights.has(node.id);
    const isSearchMatch = !normalizedSearch || searchMatches.has(node.id);
    const isDimmed =
      normalizedSearch &&
      !isSearchMatch &&
      !isSelected &&
      !isHovered &&
      !isConnected &&
      !isHighlighted;

    return {
      ...node,
      __graphState: {
        isSelected,
        isHovered,
        isConnected,
        isHighlighted,
        isSearchMatch,
        isDimmed,
      },
    };
  });

  const links = visibleLinks.map((link) => {
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    const linkId = link.id || `${sourceId}->${targetId}`;
    const isFocused = focusNodeId && (sourceId === focusNodeId || targetId === focusNodeId);
    const isHighlighted = externalLinkHighlights.has(linkId);
    const matchesFocusedSearch =
      !normalizedSearch || searchMatches.has(sourceId) || searchMatches.has(targetId);
    const isDimmed = normalizedSearch && !matchesFocusedSearch && !isFocused && !isHighlighted;

    return {
      ...link,
      id: linkId,
      __graphState: {
        isFocused,
        isHighlighted,
        isDimmed,
      },
    };
  });

  return {
    data: { nodes, links },
    stats: {
      visibleNodes: nodes.length,
      visibleLinks: links.length,
      matchedNodes: normalizedSearch ? searchMatches.size : nodes.length,
    },
  };
}

export function createGraphExportPayload({
  data,
  rendererMode,
  layers,
  filters,
  searchQuery,
  selectedNode,
  viewport,
}) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    rendererMode,
    layers: mergeGraphLayers(layers),
    filters: filters || null,
    searchQuery: searchQuery || '',
    selectedNodeId: selectedNode?.id || null,
    viewport: viewport || null,
    graph: {
      nodes: data?.nodes || [],
      links: (data?.links || []).map((link) => ({
        ...link,
        source: getNodeId(link.source),
        target: getNodeId(link.target),
      })),
    },
  };
}

export function createDownload(filename, content, mimeType) {
  if (typeof document === 'undefined') return null;

  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return objectUrl;
}
