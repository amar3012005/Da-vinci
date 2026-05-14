import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";

const DEFAULT_BG = "rgba(0,0,0,0)";
const GRAPH_THEME = {
  mutedNode: "#8f8a82",
  mutedLink: "#cfc8be",
  accent: "#5f86c9",
  accentHover: "#d49a4a",
};

function getNodeRadius(node) {
  let radius = Math.min(5.8, Math.sqrt(node.val || 4) * 0.98);

  if (node.clusterId === "_orphan") radius = Math.max(radius * 0.48, 1);
  else if (node.clusterRole === "hub") radius = Math.min(7.2, radius * 1.18);
  else if (node.clusterRole === "bridge") radius = Math.max(radius * 0.82, 1.6);

  if (node.nodeLayer === "fact") radius = Math.max(radius * 0.85, 2.1);
  if (node.nodeLayer === "promoted") radius = Math.min(6.1, radius * 1.02);
  if (node.nodeLayer === "tara") radius = Math.min(6.1, radius * 1.02);
  if (node.nodeLayer === "tara-insight") radius *= 1.04;

  return radius;
}

const MemoryGraph3D = forwardRef(function MemoryGraph3D(
  {
    graphData,
    selectedNode,
    highlightNodes,
    filteredNodes,
    layerFilter,
    clusterFilter,
    scope,
    userColorMap,
    clusterCentroids,
    clusters,
    onNodeClick,
    onNodeHover,
    onBackgroundClick,
    onViewStateChange,
    width,
    height,
    backgroundColor = DEFAULT_BG,
  },
  ref,
) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const highlightedNodesRef = useRef(new Set());
  const highlightedLinksRef = useRef(new Set());
  const animationFrameRef = useRef(null);
  const graphDataRef = useRef(graphData);
  const nodeMapRef = useRef(new Map());
  const neighborMapRef = useRef(new Map());
  const clusterCentroidsRef = useRef(clusterCentroids);
  const clustersRef = useRef(clusters);
  const selectedNodeRef = useRef(selectedNode);
  const highlightNodesRef = useRef(highlightNodes);
  const filteredNodesRef = useRef(filteredNodes);
  const layerFilterRef = useRef(layerFilter);
  const clusterFilterRef = useRef(clusterFilter);
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeHoverRef = useRef(onNodeHover);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  const onViewStateChangeRef = useRef(onViewStateChange);
  const emitViewStateRef = useRef(null);
  const backgroundColorRef = useRef(backgroundColor);
  const isNodeVisibleRef = useRef(null);
  const isLinkVisibleRef = useRef(null);
  const getNodeColorRef = useRef(null);
  const getNodeLabelRef = useRef(null);
  const refreshHighlightRef = useRef(null);
  const viewStateRef = useRef({
    distance: 1100,
    inFrameNodeIds: new Set(),
    labelMode: "hidden",
    linkMode: "sparse",
  });

  const neighborMap = useMemo(() => {
    const neighbors = new Map();
    (graphData.links || []).forEach((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;

      if (!neighbors.has(sourceId)) neighbors.set(sourceId, new Set());
      if (!neighbors.has(targetId)) neighbors.set(targetId, new Set());
      neighbors.get(sourceId).add(targetId);
      neighbors.get(targetId).add(sourceId);
    });
    return neighbors;
  }, [graphData.links]);

  const nodeMap = useMemo(
    () => new Map((graphData.nodes || []).map((node) => [node.id, node])),
    [graphData.nodes],
  );

  useEffect(() => {
    graphDataRef.current = graphData;
    nodeMapRef.current = nodeMap;
    neighborMapRef.current = neighborMap;
    clusterCentroidsRef.current = clusterCentroids;
    clustersRef.current = clusters;
    selectedNodeRef.current = selectedNode;
    highlightNodesRef.current = highlightNodes;
    filteredNodesRef.current = filteredNodes;
    layerFilterRef.current = layerFilter;
    clusterFilterRef.current = clusterFilter;
    onNodeClickRef.current = onNodeClick;
    onNodeHoverRef.current = onNodeHover;
    onBackgroundClickRef.current = onBackgroundClick;
    onViewStateChangeRef.current = onViewStateChange;
  }, [
    clusterCentroids,
    clusterFilter,
    clusters,
    filteredNodes,
    graphData,
    highlightNodes,
    layerFilter,
    neighborMap,
    nodeMap,
    onBackgroundClick,
    onNodeClick,
    onNodeHover,
    onViewStateChange,
    selectedNode,
  ]);

  const isNodeVisible = useCallback((node) => {
      if (layerFilterRef.current !== "all" && !filteredNodesRef.current.has(node.id)) return false;
      if (clusterFilterRef.current && node.clusterId !== clusterFilterRef.current && node.clusterRole !== "bridge") return false;
      const inFrameNodeIds = viewStateRef.current.inFrameNodeIds;
      if (inFrameNodeIds.size > 0 && Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z)) {
        if (!inFrameNodeIds.has(node.id) && !highlightNodesRef.current.has(node.id) && selectedNodeRef.current?.id !== node.id) {
          return false;
        }
      }
      return true;
    },
    [],
  );

  const isLinkVisible = useCallback((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;
      const sourceNode = nodeMapRef.current.get(sourceId);
      const targetNode = nodeMapRef.current.get(targetId);
      if (!sourceNode || !targetNode) return false;
      if (!isNodeVisible(sourceNode) || !isNodeVisible(targetNode)) return false;

      const highlightedLinks = highlightedLinksRef.current;
      if (highlightedLinks.has(link)) return true;

      const linkMode = viewStateRef.current.linkMode;
      const sourceImportant = selectedNodeRef.current?.id === sourceId || highlightNodesRef.current.has(sourceId);
      const targetImportant = selectedNodeRef.current?.id === targetId || highlightNodesRef.current.has(targetId);

      if (linkMode === "sparse") {
        return sourceImportant || targetImportant || sourceNode.clusterRole === "hub" || targetNode.clusterRole === "hub";
      }

      if (linkMode === "focus") {
        return sourceImportant || targetImportant || sourceNode.clusterId === targetNode.clusterId;
      }

      return true;
    },
    [isNodeVisible],
  );

  const getNodeLabel = useCallback((node) => {
      const labelMode = viewStateRef.current.labelMode;
      const isImportant = selectedNodeRef.current?.id === node.id || highlightNodesRef.current.has(node.id) || highlightedNodesRef.current.has(node.id);
      if (labelMode === "hidden" && !isImportant) return "";
      if (labelMode === "focus" && !isImportant && node.clusterRole !== "hub") return "";
      return `<div class="node-label">${node.title || "Untitled"}</div>`;
    },
    [],
  );

  const refreshHighlight = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg
      .nodeColor(fg.nodeColor())
      .linkColor(fg.linkColor())
      .linkDirectionalParticles(fg.linkDirectionalParticles())
      .linkWidth(fg.linkWidth());
  }, []);

  const getNodeColor = useCallback((node) => {
      const highlightedNodes = highlightedNodesRef.current;
      if (highlightedNodes.has(node.id)) {
        return selectedNodeRef.current?.id === node.id ? GRAPH_THEME.accent : GRAPH_THEME.accentHover;
      }

      if (highlightNodesRef.current.size > 0 && !highlightNodesRef.current.has(node.id)) {
        return "rgba(143,138,130,0.18)";
      }

      return GRAPH_THEME.mutedNode;
    },
    [],
  );

  useEffect(() => {
    graphDataRef.current = graphData;
    neighborMapRef.current = neighborMap;
    onNodeClickRef.current = onNodeClick;
    onNodeHoverRef.current = onNodeHover;
    onBackgroundClickRef.current = onBackgroundClick;
    onViewStateChangeRef.current = onViewStateChange;
    backgroundColorRef.current = backgroundColor;
    isNodeVisibleRef.current = isNodeVisible;
    isLinkVisibleRef.current = isLinkVisible;
    getNodeColorRef.current = getNodeColor;
    getNodeLabelRef.current = getNodeLabel;
    refreshHighlightRef.current = refreshHighlight;
  }, [
    backgroundColor,
    getNodeColor,
    getNodeLabel,
    graphData,
    isLinkVisible,
    isNodeVisible,
    neighborMap,
    onBackgroundClick,
    onNodeClick,
    onNodeHover,
    onViewStateChange,
    refreshHighlight,
  ]);

  const focusNode = useCallback((node, duration = 900, distanceMultiplier = 4.5) => {
    const fg = fgRef.current;
    if (!fg || !node) return;

    const distance = Math.max(110, getNodeRadius(node) * 24 * distanceMultiplier);
    const position = new THREE.Vector3(node.x || 0, node.y || 0, node.z || 0);
    const direction = position.clone().normalize();
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);
    const cameraPosition = position.clone().add(direction.multiplyScalar(distance));
    fg.cameraPosition(cameraPosition, position, duration);
  }, []);

  const focusPoint = useCallback((point, duration = 900) => {
    const fg = fgRef.current;
    if (!fg || !point) return;
    const target = new THREE.Vector3(point.x || 0, point.y || 0, point.z || 0);
    const camera = fg.camera();
    const current = camera.position.clone();
    const controls = fg.controls?.();
    const lookAt = controls?.target?.clone?.() || new THREE.Vector3();
    const offset = current.sub(lookAt);
    const next = target.clone().add(offset.lengthSq() === 0 ? new THREE.Vector3(0, 0, 180) : offset);
    fg.cameraPosition(next, target, duration);
  }, []);

  const zoomBy = useCallback((factor, duration = 300) => {
    const fg = fgRef.current;
    if (!fg) return;
    const camera = fg.camera();
    const controls = fg.controls?.();
    const target = controls?.target?.clone?.() || new THREE.Vector3();
    const offset = camera.position.clone().sub(target);
    const next = target.clone().add(offset.multiplyScalar(1 / factor));
    fg.cameraPosition(next, target, duration);
  }, []);

  const fitView = useCallback((duration = 500) => {
    fgRef.current?.zoomToFit?.(duration, 50);
  }, []);

  useImperativeHandle(ref, () => ({
    d3Force: (...args) => fgRef.current?.d3Force?.(...args),
    d3ReheatSimulation: () => fgRef.current?.d3ReheatSimulation?.(),
    focusNode,
    focusPoint,
    zoomBy,
    fitView,
  }), [fitView, focusNode, focusPoint, zoomBy]);

  useEffect(() => {
    if (!containerRef.current || fgRef.current) return;

    const fg = ForceGraph3D({ controlType: "orbit" })(containerRef.current)
      .graphData(graphDataRef.current)
      .backgroundColor(backgroundColorRef.current)
      .showNavInfo(false)
      .nodeResolution(12)
      .nodeRelSize(1.65)
      .nodeOpacity(0.9)
      .nodeColor((node) => getNodeColorRef.current(node))
      .nodeVal((node) => getNodeRadius(node))
      .nodeVisibility((node) => isNodeVisibleRef.current(node))
      .linkOpacity(0.28)
      .linkDirectionalParticleWidth(1.1)
      .linkDirectionalParticles((link) => (highlightedLinksRef.current.has(link) ? 2 : 0))
      .linkWidth((link) => (highlightedLinksRef.current.has(link) ? 1.15 : 0.35))
      .linkVisibility((link) => isLinkVisibleRef.current(link))
      .linkColor((link) => (highlightedLinksRef.current.has(link) ? GRAPH_THEME.accent : GRAPH_THEME.mutedLink))
      .nodeLabel((node) => getNodeLabelRef.current(node))
      .onNodeClick((node) => onNodeClickRef.current?.(node))
      .onNodeHover((node) => {
        const highlightedNodes = highlightedNodesRef.current;
        const highlightedLinks = highlightedLinksRef.current;

        if ((!node && highlightedNodes.size === 0) || (node && highlightedNodes.has(node.id) && highlightedNodes.size > 1)) {
          onNodeHoverRef.current?.(node);
          return;
        }

        highlightedNodes.clear();
        highlightedLinks.clear();

        if (node) {
          highlightedNodes.add(node.id);
          (neighborMapRef.current.get(node.id) || new Set()).forEach((neighborId) => highlightedNodes.add(neighborId));

          (graphDataRef.current.links || []).forEach((link) => {
            const sourceId = typeof link.source === "object" ? link.source.id : link.source;
            const targetId = typeof link.target === "object" ? link.target.id : link.target;
            if (sourceId === node.id || targetId === node.id) {
              highlightedLinks.add(link);
            }
          });
        }

        onNodeHoverRef.current?.(node);
        refreshHighlightRef.current();
      })
      .onLinkHover((link) => {
        const highlightedNodes = highlightedNodesRef.current;
        const highlightedLinks = highlightedLinksRef.current;
        highlightedNodes.clear();
        highlightedLinks.clear();

        if (link) {
          const sourceId = typeof link.source === "object" ? link.source.id : link.source;
          const targetId = typeof link.target === "object" ? link.target.id : link.target;
          highlightedLinks.add(link);
          highlightedNodes.add(sourceId);
          highlightedNodes.add(targetId);
        }

        refreshHighlightRef.current();
      })
      .onBackgroundClick(() => onBackgroundClickRef.current?.())
      .nodeThreeObject(null)
      .nodeThreeObjectExtend(false);

    fgRef.current = fg;

    const scene = fg.scene?.();
    if (scene) {
      scene.background = null;
      scene.fog = null;
    }

    const camera = fg.camera?.();
    if (camera) {
      camera.far = 6000;
      camera.updateProjectionMatrix?.();
      camera.position.set(0, 40, 300);
    }

    const controls = fg.controls?.();
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 0.5;
      controls.zoomSpeed = 0.72;
      controls.panSpeed = 0.62;
      controls.minDistance = 24;
      controls.maxDistance = 3000;

      const emitViewState = () => {
        if (animationFrameRef.current != null) return;
        animationFrameRef.current = window.requestAnimationFrame(() => {
          animationFrameRef.current = null;
          const cameraNow = fg.camera?.();
          const targetNow = controls.target?.clone?.() || new THREE.Vector3();
          if (!cameraNow) return;

          cameraNow.updateMatrix?.();
          cameraNow.updateMatrixWorld?.();
          cameraNow.updateProjectionMatrix?.();

          const frustum = new THREE.Frustum();
          const projectionMatrix = new THREE.Matrix4().multiplyMatrices(
            cameraNow.projectionMatrix,
            cameraNow.matrixWorldInverse,
          );
          frustum.setFromProjectionMatrix(projectionMatrix);

          const inFrameNodeIds = new Set();
          (graphDataRef.current.nodes || []).forEach((node) => {
            if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) return;
            const radius = getNodeRadius(node) * 1.8;
            const sphere = new THREE.Sphere(new THREE.Vector3(node.x, node.y, node.z), radius);
            if (frustum.intersectsSphere(sphere)) inFrameNodeIds.add(node.id);
          });

          const distance = cameraNow.position.distanceTo(targetNow);
          const labelMode = distance > 520 ? "hidden" : distance > 240 ? "focus" : "all";
          const linkMode = distance > 900 ? "sparse" : distance > 420 ? "focus" : "all";

          viewStateRef.current = {
            distance,
            inFrameNodeIds,
            labelMode,
            linkMode,
          };

          refreshHighlightRef.current();
          onViewStateChangeRef.current?.({
            distance,
            target: { x: targetNow.x, y: targetNow.y, z: targetNow.z },
            camera: {
              x: cameraNow.position.x,
              y: cameraNow.position.y,
              z: cameraNow.position.z,
            },
            inFrameNodeIds: [...inFrameNodeIds],
            labelMode,
            linkMode,
          });
        });
      };

      emitViewStateRef.current = emitViewState;
      controls.addEventListener?.("change", emitViewState);
      emitViewState();
    }

    const ambientLight = new THREE.AmbientLight("#ffffff", 1.2);
    const keyLight = new THREE.DirectionalLight("#ffffff", 0.55);
    keyLight.position.set(0, 120, 180);
    scene?.add?.(ambientLight);
    scene?.add?.(keyLight);

    resizeObserverRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      fg.width(entry.contentRect.width);
      fg.height(entry.contentRect.height);
    });
    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      const activeControls = fg.controls?.();
      if (activeControls && emitViewStateRef.current) {
        activeControls.removeEventListener?.("change", emitViewStateRef.current);
      }
      emitViewStateRef.current = null;
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      resizeObserverRef.current?.disconnect?.();
      resizeObserverRef.current = null;
      try {
        fg.pauseAnimation?.();
      } catch (_error) {
        // noop
      }
      fg._destructor?.();
      fgRef.current = null;
    };
  // The graph instance must be created once; live React values are read from refs above.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg
      .backgroundColor(backgroundColor)
      .nodeColor((node) => getNodeColor(node))
      .nodeVisibility((node) => isNodeVisible(node))
      .linkVisibility((link) => isLinkVisible(link))
      .linkColor((link) => (highlightedLinksRef.current.has(link) ? GRAPH_THEME.accent : GRAPH_THEME.mutedLink))
      .nodeLabel((node) => getNodeLabel(node));
    refreshHighlight();
  }, [backgroundColor, getNodeColor, getNodeLabel, isLinkVisible, isNodeVisible, refreshHighlight]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.width(width);
    fg.height(height);
  }, [height, width]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.graphData(graphData);
    refreshHighlight();
  }, [graphData, refreshHighlight]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    const charge = fg.d3Force("charge");
    if (charge?.strength) {
      charge.strength((node) => {
        if (node.clusterId === "_orphan") return -28;
        return -78 - (node.val || 1) * 11;
      });
      charge.theta?.(0.9);
      charge.distanceMax?.(650);
    }

    const link = fg.d3Force("link");
    if (link?.distance) {
      link.distance((edge) => {
        const src = edge.source;
        const tgt = edge.target;
        const sameCluster = src?.clusterId && src.clusterId === tgt?.clusterId;
        return sameCluster ? 48 : 138;
      });
      link.strength((edge) => {
        const src = edge.source;
        const tgt = edge.target;
        const sameCluster = src?.clusterId && src.clusterId === tgt?.clusterId;
        return sameCluster ? 0.46 : 0.075;
      });
    }

    if (clustersRef.current.length > 1) {
      fg.d3Force("clusterBias", (alpha) => {
        const pull = 0.015;
        const centroids = clusterCentroidsRef.current || {};
        for (const node of graphDataRef.current.nodes || []) {
          if (node.clusterId === "_orphan") continue;
          const centroid = centroids[node.clusterId];
          if (!centroid) continue;
          node.vx = (node.vx || 0) + (centroid.x - (node.x || 0)) * pull * alpha;
          node.vy = (node.vy || 0) + (centroid.y - (node.y || 0)) * pull * alpha;
        }
      });
    } else {
      try {
        fg.d3Force("clusterBias", null);
      } catch (_error) {
        // noop
      }
    }

    fg.d3ReheatSimulation();
  }, [clusterCentroids, clusters.length, graphData.nodes]);

  useEffect(() => {
    refreshHighlight();
  }, [highlightNodes, selectedNode, refreshHighlight]);

  useEffect(() => {
    if (selectedNode) focusNode(selectedNode, 700, 4.2);
  }, [focusNode, selectedNode]);

  const empty = useMemo(() => !graphData?.nodes?.length, [graphData]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ opacity: empty ? 0 : 1 }}
    />
  );
});

export default MemoryGraph3D;
