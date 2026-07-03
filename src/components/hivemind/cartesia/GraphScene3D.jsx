import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * GraphScene3D — the living HIVEMIND memory graph, real three.js.
 * A 3D knowledge constellation: node cloud + typed edges + recall pulses
 * travelling to a glowing core. Mouse parallax, slow orbit, additive glow.
 * DPR-capped, damped lerps only — steady 60fps.
 */

const BLUE = new THREE.Color('#117dff');
const TEAL = new THREE.Color('#22d3ee');

/* deterministic pseudo-random (stable graph across renders) */
const rand = (i, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const N = 46;

function buildGraph() {
  const nodes = [];
  for (let i = 0; i < N; i++) {
    // spherical shell distribution, slightly squashed for card aspect
    const t = rand(i, 1) * Math.PI * 2;
    const p = Math.acos(2 * rand(i, 2) - 1);
    const r = 2.1 + rand(i, 3) * 1.5;
    nodes.push(new THREE.Vector3(
      r * Math.sin(p) * Math.cos(t),
      (r * Math.sin(p) * Math.sin(t)) * 0.72,
      r * Math.cos(p),
    ));
  }
  const edges = [];
  // hub spokes
  for (let i = 0; i < N; i += 3) edges.push([new THREE.Vector3(0, 0, 0), nodes[i]]);
  // nearest-neighbour links
  for (let i = 0; i < N; i++) {
    let best = -1; let bd = Infinity;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const d = nodes[i].distanceToSquared(nodes[j]);
      if (d < bd) { bd = d; best = j; }
    }
    if (best > i) edges.push([nodes[i], nodes[best]]);
  }
  return { nodes, edges };
}

function Nodes({ nodes }) {
  const inst = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    nodes.forEach((p, i) => {
      const s = 1 + Math.sin(t * 1.4 + i * 1.7) * 0.18;
      dummy.position.copy(p);
      dummy.position.y += Math.sin(t * 0.6 + i) * 0.05;
      dummy.scale.setScalar(0.055 * s * (i % 5 === 0 ? 1.8 : 1));
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
    });
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, nodes.length]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color={BLUE} toneMapped={false} />
    </instancedMesh>
  );
}

function Halos({ nodes }) {
  const inst = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    nodes.forEach((p, i) => {
      dummy.position.copy(p);
      dummy.position.y += Math.sin(t * 0.6 + i) * 0.05;
      dummy.quaternion.copy(camera.quaternion);
      dummy.scale.setScalar(0.16 * (1 + Math.sin(t * 1.4 + i * 1.7) * 0.25));
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
    });
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, nodes.length]}>
      <circleGeometry args={[1, 20]} />
      <meshBasicMaterial color={BLUE} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function Edges({ edges }) {
  const geom = useMemo(() => {
    const pts = [];
    edges.forEach(([a, b]) => { pts.push(a.x, a.y, a.z, b.x, b.y, b.z); });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [edges]);
  const mat = useRef(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.16 + Math.sin(clock.elapsedTime * 0.8) * 0.05;
  });
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial ref={mat} color={BLUE} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}

/* recall pulses — points travelling along hub spokes into the core */
function Pulses({ nodes }) {
  const count = 14;
  const inst = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const meta = useMemo(() => Array.from({ length: count }, (_, i) => ({
    node: Math.floor(rand(i, 9) * N),
    speed: 0.35 + rand(i, 8) * 0.5,
    offset: rand(i, 7),
  })), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    meta.forEach((m, i) => {
      const k = ((t * m.speed + m.offset) % 1.4) / 1.4; // 0→1 travel, gap
      const p = nodes[m.node];
      dummy.position.set(p.x * (1 - k), p.y * (1 - k), p.z * (1 - k));
      const vis = k < 0.96 ? 1 : 0;
      dummy.scale.setScalar(0.035 * vis * (1 + Math.sin(k * Math.PI) * 0.8));
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
    });
    inst.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={TEAL} toneMapped={false} />
    </instancedMesh>
  );
}

function Core() {
  const glow = useRef(null);
  const core = useRef(null);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    if (glow.current) {
      glow.current.scale.setScalar(0.85 + Math.sin(t * 1.6) * 0.12);
      glow.current.quaternion.copy(camera.quaternion);
    }
    if (core.current) core.current.scale.setScalar(0.22 + Math.sin(t * 1.6) * 0.02);
  });
  return (
    <group>
      <mesh ref={core}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#e8f2ff" toneMapped={false} />
      </mesh>
      <mesh ref={glow}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color={BLUE} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Rig() {
  const { camera, pointer } = useThree();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const tx = Math.sin(t * 0.08) * 1.1 + pointer.x * 0.9;
    const ty = 0.45 + pointer.y * 0.6;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene() {
  const { nodes, edges } = useMemo(buildGraph, []);
  const group = useRef(null);
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * 0.05; });
  return (
    <group ref={group}>
      <Edges edges={edges} />
      <Halos nodes={nodes} />
      <Nodes nodes={nodes} />
      <Pulses nodes={nodes} />
      <Core />
    </group>
  );
}

export default function GraphScene3D({ height = 420 }) {
  return (
    <div style={{ height }} className="relative w-full bg-[#070a12]">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.5, 6.4], fov: 42 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ background: '#070a12' }}
      >
        <Scene />
        <Rig />
      </Canvas>
      {/* HUD chips */}
      <div className="pointer-events-none absolute bottom-4 left-5 rounded border border-white/15 bg-black/45 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/75 backdrop-blur">
        live · 46 nodes · recall pulses
      </div>
      <div className="pointer-events-none absolute right-5 top-4 rounded border border-white/15 bg-black/45 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#22d3ee] backdrop-blur">
        &lt;50ms
      </div>
    </div>
  );
}
