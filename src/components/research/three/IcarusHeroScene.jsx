import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ICARUS hero — a drifting field of memory slots (the .amr byte layout, alive).
 * An instanced grid of tiles on the void; a moving wave of them glows ember/teal
 * as if recall is sweeping the shard. Mouse parallaxes the whole field.
 */
const COLS = 30;
const ROWS = 16;
const N = COLS * ROWS;

function Grid({ pointer }) {
  const mesh = useRef();
  const group = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const base = useMemo(() => new THREE.Color('#13203a'), []);
  const ember = useMemo(() => new THREE.Color('#ff6a2a'), []);
  const teal = useMemo(() => new THREE.Color('#39c2d6'), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!mesh.current) return;
    let i = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = (x - COLS / 2) * 0.62;
        const py = (y - ROWS / 2) * 0.62;
        // a diagonal sweep wave = "recall scanning the shard"
        const wave = Math.sin((x + y) * 0.45 - t * 1.6);
        const lit = Math.max(0, wave);
        dummy.position.set(px, py, lit * 0.6);
        const s = 0.5 + lit * 0.12;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.current.setMatrixAt(i, dummy.matrix);
        tmp.copy(base).lerp(((x + y) % 7 === 0) ? teal : ember, lit * lit);
        mesh.current.setColorAt(i, tmp);
        i++;
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.current.x * 0.25, 0.05);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.current.y * -0.2, 0.05);
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[null, null, N]}>
        <boxGeometry args={[0.5, 0.5, 0.18]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export default function IcarusHeroScene() {
  const pointer = useRef({ x: 0, y: 0 });
  const onMove = (e) => {
    pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  return (
    <div className="absolute inset-0" onPointerMove={onMove}>
      <Canvas dpr={[1, 1.8]} camera={{ position: [0, 0, 12], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <Grid pointer={pointer} />
      </Canvas>
    </div>
  );
}
