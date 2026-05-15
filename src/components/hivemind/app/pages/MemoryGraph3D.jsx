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
  shell: "#f8f6f1",
  halo: "#efe9de",
};

const TYPE_COLORS = {
  fact: "#117dff",
  decision: "#dc2626",
  preference: "#d97706",
  goal: "#8b5cf6",
  lesson: "#16a34a",
  event: "#0891b2",
  relationship: "#db2777",
  default: "#6b665f",
};

const RELATION_STYLES = {
  Updates: { color: "#117dff", width: 0.62, particles: 0, opacity: 0.42 },
  Extends: { color: "#16a34a", width: 0.56, particles: 0, opacity: 0.38 },
  Derives: { color: "#8b5cf6", width: 0.52, particles: 1, opacity: 0.34 },
  Contradicts: { color: "#dc2626", width: 0.7, particles: 2, opacity: 0.46 },
  Supports: { color: "#0891b2", width: 0.54, particles: 0, opacity: 0.36 },
  References: { color: "#a8a095", width: 0.34, particles: 0, opacity: 0.24 },
  default: { color: "#cfc8be", width: 0.35, particles: 0, opacity: 0.26 },
};

const LABEL_LIMITS = {
  hidden: 0,
  focus: 18,
  all: 42,
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

function getNodeType(node) {
  return (node.memoryType || node.type || "").toLowerCase() || "default";
}

function getRelationStyle(link) {
  return RELATION_STYLES[link?.type] || RELATION_STYLES.default;
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return { r: 143, g: 138, b: 130 };
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function makeMaterial(color, opacity = 0.96) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    roughness: 0.42,
    metalness: 0.06,
  });
}

function makeNodeShape(node, color, clusterTint) {
  const radius = getNodeRadius(node);
  const type = getNodeType(node);
  const group = new THREE.Group();
  const primaryMaterial = makeMaterial(color, 0.96);
  const haloMaterial = makeMaterial(clusterTint || GRAPH_THEME.halo, clusterTint ? 0.22 : 0.1);
  let mesh;

  switch (type) {
    case "decision":
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 1.02, 0), primaryMaterial);
      break;
    case "preference":
      mesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.7, radius * 1.28, radius * 1.05), primaryMaterial);
      break;
    case "goal":
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.98, radius * 0.98, radius * 1.45, 6), primaryMaterial);
      mesh.rotation.z = Math.PI / 2;
      break;
    case "lesson":
      mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(radius * 1.18, 0), primaryMaterial);
      break;
    case "event":
      mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.68, radius * 1.28, 4, 8), primaryMaterial);
      mesh.rotation.z = Math.PI / 2;
      break;
    case "relationship": {
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.88, Math.max(radius * 0.16, 0.24), 12, 28),
        primaryMaterial,
      );
      torus.rotation.x = Math.PI / 2;
      mesh = torus;
      break;
    }
    case "fact":
    default:
      mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 14), primaryMaterial);
      break;
  }

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * (clusterTint ? 1.95 : 1.55), 12, 12),
    haloMaterial,
  );
  group.add(halo);
  group.add(mesh);
  group.userData = { primaryMaterial, haloMaterial };
  return group;
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
  const resumeFrameRef = useRef(null);
  const backgroundColorRef = useRef(backgroundColor);
  const isNodeVisibleRef = useRef(null);
  const isLinkVisibleRef = useRef(null);
  const getNodeColorRef = useRef(null);
  const getNodeLabelRef = useRef(null);
  const refreshHighlightRef = useRef(null);
  const viewStateRef = useRef({
    distance: 1100,
    inFrameNodeIds: new Set(),
    labelNodeIds: new Set(),
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
      if (!viewStateRef.current.labelNodeIds.has(node.id) && !isImportant) return "";
      return `<div class="node-label">${node.title || "Untitled"}</div>`;
    },
    [],
  );

  const refreshHighlight = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg
      .nodeColor(fg.nodeColor())
      .nodeThreeObject(fg.nodeThreeObject())
      .linkColor(fg.linkColor())
      .linkDirectionalParticles(fg.linkDirectionalParticles())
      .linkWidth(fg.linkWidth());
  }, []);

  const withPausedAnimation = useCallback((mutate) => {
    const fg = fgRef.current;
    if (!fg) return;

    try {
      fg.pauseAnimation?.();
    } catch (_error) {
      // noop
    }

    try {
      mutate(fg);
    } finally {
      if (resumeFrameRef.current != null) {
        window.cancelAnimationFrame(resumeFrameRef.current);
      }
      resumeFrameRef.current = window.requestAnimationFrame(() => {
        resumeFrameRef.current = null;
        if (fgRef.current !== fg) return;
        try {
          fg.resumeAnimation?.();
        } catch (_error) {
          // noop
        }
      });
    }
  }, []);

  const getNodeColor = useCallback((node) => {
      const highlightedNodes = highlightedNodesRef.current;
      const baseColor = TYPE_COLORS[getNodeType(node)] || TYPE_COLORS.default;
      if (highlightedNodes.has(node.id)) {
        return selectedNodeRef.current?.id === node.id ? GRAPH_THEME.accent : GRAPH_THEME.accentHover;
      }

      if (highlightNodesRef.current.size > 0 && !highlightNodesRef.current.has(node.id)) {
        const rgb = hexToRgb(baseColor);
        return `rgba(${rgb.r},${rgb.g},${rgb.b},0.14)`;
      }

      return baseColor;
    },
    [],
  );

  const getClusterHaloColor = useCallback((node) => {
    const activeCluster = clusterFilterRef.current;
    if (activeCluster && node.clusterId === activeCluster) return GRAPH_THEME.accent;
    if (selectedNodeRef.current?.clusterId && node.clusterId === selectedNodeRef.current.clusterId) return GRAPH_THEME.accent;
    if (highlightNodesRef.current.has(node.id)) return GRAPH_THEME.accentHover;
    return null;
  }, []);

  const getLinkColor = useCallback((link) => {
    if (highlightedLinksRef.current.has(link)) return GRAPH_THEME.accent;
    return getRelationStyle(link).color;
  }, []);

  const getLinkWidth = useCallback((link) => {
    const style = getRelationStyle(link);
    return highlightedLinksRef.current.has(link) ? Math.max(style.width + 0.55, 1.1) : style.width;
  }, []);

  const getLinkParticles = useCallback((link) => {
    const style = getRelationStyle(link);
    return highlightedLinksRef.current.has(link) ? Math.max(style.particles, 2) : style.particles;
  }, []);

  const updateNodeObjectAppearance = useCallback((node, object3d) => {
    if (!object3d?.userData?.primaryMaterial) return;
    const color = getNodeColorRef.current(node);
    const haloColor = getClusterHaloColor(node);
    object3d.userData.primaryMaterial.color.set(color);
    object3d.userData.haloMaterial.color.set(haloColor || GRAPH_THEME.halo);
    object3d.userData.haloMaterial.opacity = haloColor ? 0.24 : 0.08;
  }, [getClusterHaloColor]);

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
      .nodeThreeObject((node) => {
        const clusterTint = getClusterHaloColor(node);
        return makeNodeShape(node, getNodeColorRef.current(node), clusterTint);
      })
      .nodeThreeObjectExtend(false)
      .nodeVisibility((node) => isNodeVisibleRef.current(node))
      .linkOpacity((link) => getRelationStyle(link).opacity)
      .linkDirectionalParticleWidth(1.1)
      .linkDirectionalParticles((link) => getLinkParticles(link))
      .linkWidth((link) => getLinkWidth(link))
      .linkVisibility((link) => isLinkVisibleRef.current(link))
      .linkColor((link) => getLinkColor(link))
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
          const labelBudget = LABEL_LIMITS[labelMode] ?? 0;
          const rankedVisibleNodes = [...inFrameNodeIds]
            .map((id) => nodeMapRef.current.get(id))
            .filter(Boolean)
            .sort((a, b) => {
              const score = (node) => {
                let value = (node.importanceScore || 0) * 10 + (node.val || 0) + (node.hubScore || 0) * 4;
                if (selectedNodeRef.current?.id === node.id) value += 1000;
                if (highlightNodesRef.current.has(node.id)) value += 500;
                if (highlightedNodesRef.current.has(node.id)) value += 250;
                if (node.clusterRole === "hub") value += 30;
                return value;
              };
              return score(b) - score(a);
            });
          const labelNodeIds = new Set(
            labelBudget > 0 ? rankedVisibleNodes.slice(0, labelBudget).map((node) => node.id) : [],
          );
          if (selectedNodeRef.current?.id) labelNodeIds.add(selectedNodeRef.current.id);
          highlightNodesRef.current.forEach((id) => labelNodeIds.add(id));

          viewStateRef.current = {
            distance,
            inFrameNodeIds,
            labelNodeIds,
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
            labelNodeIds: [...labelNodeIds],
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
      if (resumeFrameRef.current != null) {
        window.cancelAnimationFrame(resumeFrameRef.current);
        resumeFrameRef.current = null;
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
      .nodeThreeObject((node) => {
        const clusterTint = getClusterHaloColor(node);
        const object3d = makeNodeShape(node, getNodeColor(node), clusterTint);
        updateNodeObjectAppearance(node, object3d);
        return object3d;
      })
      .nodeVisibility((node) => isNodeVisible(node))
      .linkVisibility((link) => isLinkVisible(link))
      .linkColor((link) => getLinkColor(link))
      .linkWidth((link) => getLinkWidth(link))
      .linkDirectionalParticles((link) => getLinkParticles(link))
      .linkOpacity((link) => getRelationStyle(link).opacity)
      .nodeLabel((node) => getNodeLabel(node));
    refreshHighlight();
  }, [
    backgroundColor,
    getClusterHaloColor,
    getLinkColor,
    getLinkParticles,
    getLinkWidth,
    getNodeColor,
    getNodeLabel,
    isLinkVisible,
    isNodeVisible,
    refreshHighlight,
    updateNodeObjectAppearance,
  ]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.width(width);
    fg.height(height);
  }, [height, width]);

  useEffect(() => {
    withPausedAnimation((fg) => {
      fg.graphData(graphData);
      refreshHighlight();
    });
  }, [graphData, refreshHighlight, withPausedAnimation]);

  useEffect(() => {
    withPausedAnimation((fg) => {
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
    });
  }, [clusterCentroids, clusters.length, graphData.nodes, withPausedAnimation]);

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
