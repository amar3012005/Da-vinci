import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import ForceGraph3D from '3d-force-graph';

/**
 * ForceGraph3D - React wrapper for 3d-force-graph with CSI verdict visualization
 * Renders an interactive 3D force-directed graph using Three.js
 */
const Graph3D = React.forwardRef(
  (
    {
      graphData,
      getCsiNodeColor,
      getCsiNodeSize,
      onNodeClick,
      onNodeHover,
      onNodeContextMenu,
      width,
      height,
    },
    ref
  ) => {
    const containerRef = useRef(null);
    const graphInstanceRef = useRef(null);

    useEffect(() => {
      if (!containerRef.current || !graphData?.nodes?.length) return;

      try {
        // Initialize 3D Force Graph
        const graph = ForceGraph3D()(containerRef.current);

        graph
          .graphData(graphData)
          .width(width)
          .height(height)
          .backgroundColor('#faf9f4')
          .nodeRelSize(6)
          .nodeVal((node) => getCsiNodeSize(node) / 3)
          .nodeColor((node) => getCsiNodeColor(node))
          .nodeThreeObject((node) => {
            const color = getCsiNodeColor(node);
            const size = getCsiNodeSize(node) / 8;

            // Create sphere geometry
            const geometry = new THREE.SphereGeometry(size, 32, 32);
            const material = new THREE.MeshPhongMaterial({
              color: color,
              emissive: color,
              emissiveIntensity: 0.3,
              shininess: 100,
            });
            const mesh = new THREE.Mesh(geometry, material);

            // Add glow effect for CSI verdict nodes
            if (node.type === 'csi-verdict') {
              const glowGeometry = new THREE.SphereGeometry(size * 1.3, 32, 32);
              const glowMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.15,
                sideOpcity: THREE.BackSide,
              });
              const glow = new THREE.Mesh(glowGeometry, glowMaterial);
              mesh.add(glow);
            }

            return mesh;
          })
          .linkColor((link) => link.color || '#aaa')
          .linkOpacity(0.5)
          .linkDirectionalParticles((link) => (link.type === 'sequence' ? 2 : 0))
          .linkDirectionalParticleWidth(1.5)
          .linkDirectionalParticleSpeed(0.003)
          .onNodeClick((node) => {
            if (onNodeClick) onNodeClick(node);
          })
          .onNodeHover((node) => {
            if (onNodeHover) onNodeHover(node);
          })
          .onNodeRightClick((node) => {
            if (onNodeContextMenu) {
              const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: width / 2,
                clientY: height / 2,
              });
              onNodeContextMenu(node, event);
            }
          })
          .enableNodeDrag(true)
          .enableNavigationControls(true)
          .showNavInfo(true)
          // Lighting
          .lights([
            new THREE.DirectionalLight('#ffffff', 1),
            new THREE.AmbientLight('#ffffff', 0.5),
          ]);

        // Set camera position
        graph.cameraPosition({ x: 0, y: 0, z: 400 });

        graphInstanceRef.current = graph;

        // Expose ref for external control
        if (ref) {
          ref.current = {
            resetCamera: (duration = 300) => {
              graph.cameraPosition({ x: 0, y: 0, z: 400 }, { x: 0, y: 0, z: 0 }, duration);
            },
            canvas: graph.canvas?.() || null,
          };
        }

        // Handle resize
        const handleResize = () => {
          graph.width(width).height(height);
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          // Clean up Three.js resources
          if (graphInstanceRef.current) {
            try {
              const scene = graphInstanceRef.current.scene?.();
              const renderer = graphInstanceRef.current.renderer?.();
              if (scene) {
                scene.traverse((obj) => {
                  if (obj.geometry) obj.geometry.dispose();
                  if (obj.material) {
                    if (Array.isArray(obj.material)) {
                      obj.material.forEach((m) => m.dispose());
                    } else {
                      obj.material.dispose();
                    }
                  }
                });
              }
              if (renderer) renderer.dispose();
            } catch (e) {
              console.warn('[ForceGraph3D] Cleanup error:', e);
            }
          }
        };
      } catch (error) {
        console.error('[ForceGraph3D] Failed to initialize:', error);
      }
    }, [graphData, getCsiNodeColor, getCsiNodeSize, onNodeClick, onNodeHover, onNodeContextMenu, width, height, ref]);

    return (
      <div
        ref={containerRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: '#faf9f4',
        }}
      />
    );
  }
);

Graph3D.displayName = 'ForceGraph3D';

export default Graph3D;
