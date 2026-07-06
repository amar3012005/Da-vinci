import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CSI hero — a stigmergic swarm. Nodes drift through a shared field and draw
 * trails to their near neighbours: coordination emerging from the environment,
 * not from messages. The whole swarm tilts toward the pointer.
 */
const COUNT = 90;

function Swarm({ pointer }) {
  const group = useRef();
  const pts = useRef();
  const lines = useRef();

  const data = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const vel = [];
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
      vel.push([(Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.2]);
    }
    return { pos, vel };
  }, []);

  const pointsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    return g;
  }, [data]);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * COUNT * 3), 3));
    return g;
  }, []);

  const pointsMat = useMemo(() => new THREE.PointsMaterial({ color: '#7fe9f2', size: 0.13, transparent: true, opacity: 0.9, sizeAttenuation: true, depthWrite: false }), []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#2f8e9c', transparent: true, opacity: 0.35 }), []);

  useFrame((state, delta) => {
    const p = data.pos;
    for (let i = 0; i < COUNT; i++) {
      for (let a = 0; a < 3; a++) {
        p[i * 3 + a] += data.vel[i][a] * delta;
        const lim = a === 0 ? 8 : a === 1 ? 4.5 : 2;
        if (p[i * 3 + a] > lim || p[i * 3 + a] < -lim) data.vel[i][a] *= -1;
      }
    }
    pointsGeo.attributes.position.needsUpdate = true;

    // trails between near neighbours
    const la = lineGeo.attributes.position.array;
    let n = 0;
    const thr = 2.4 * 2.4;
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = p[i * 3] - p[j * 3], dy = p[i * 3 + 1] - p[j * 3 + 1], dz = p[i * 3 + 2] - p[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < thr) {
          la[n++] = p[i * 3]; la[n++] = p[i * 3 + 1]; la[n++] = p[i * 3 + 2];
          la[n++] = p[j * 3]; la[n++] = p[j * 3 + 1]; la[n++] = p[j * 3 + 2];
        }
      }
    }
    lineGeo.setDrawRange(0, n / 3);
    lineGeo.attributes.position.needsUpdate = true;

    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.current.x * 0.4, 0.04);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.current.y * -0.3, 0.04);
    }
  });

  return (
    <group ref={group}>
      <lineSegments ref={lines} geometry={lineGeo} material={lineMat} />
      <points ref={pts} geometry={pointsGeo} material={pointsMat} />
    </group>
  );
}

export default function CsiHeroScene() {
  const pointer = useRef({ x: 0, y: 0 });
  const onMove = (e) => {
    pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  return (
    <div className="absolute inset-0" onPointerMove={onMove}>
      <Canvas dpr={[1, 1.8]} camera={{ position: [0, 0, 12], fov: 46 }} gl={{ antialias: true, alpha: true }}>
        <Swarm pointer={pointer} />
      </Canvas>
    </div>
  );
}
