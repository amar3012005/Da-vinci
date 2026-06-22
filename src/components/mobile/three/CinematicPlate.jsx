import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

/**
 * CinematicPlate — the SINGULANCE high-level graphic treatment, reusable.
 * A painted image rendered as a shader plane with an animated noise warp +
 * mouse ripple, cover-fit with bleed, mouse/camera parallax for depth, and a
 * post stack (bloom, chromatic aberration, vignette, film grain). Drop any
 * painted plate in and it reads like the cover hero.
 *
 * Props:
 *   src       texture url
 *   zoom      extra scale multiplier (default 1) — push in for drama
 *   tint      [r,g,b] multiply grade added on the alive-pulse (default ember)
 *   warp      warp strength multiplier (default 1)
 *   bloom     bloom intensity (default 0.5)
 */

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uWarp;
  uniform vec3  uTint;
  varying vec2 vUv;
  void main(){
    vec2 uv = vUv;
    float n =
      sin(uv.x * 7.0 + uTime * 0.35) * 0.5 +
      sin(uv.y * 5.0 - uTime * 0.28) * 0.5 +
      sin((uv.x + uv.y) * 9.0 + uTime * 0.2) * 0.25;
    vec2 warp = vec2(n) * 0.0035 * uWarp;
    float d = distance(uv, uMouse);
    vec2 dir = normalize(uv - uMouse + 1e-5);
    warp += dir * 0.010 * uWarp * sin(d * 28.0 - uTime * 3.0) * exp(-d * 5.0);
    vec3 col = texture2D(uTex, uv + warp).rgb;
    float pulse = 0.5 + 0.5 * sin(uTime * 0.4);
    col += col * uTint * pulse;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Plate({ src, zoom, tint, warp, pointer }) {
  const mesh = useRef();
  const mat = useRef();
  const tex = useTexture(src);
  const { viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      uTex: { value: tex },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uWarp: { value: warp },
      uTint: { value: new THREE.Color(tint[0], tint[1], tint[2]) },
    }),
    [tex, warp, tint]
  );

  const scale = useMemo(() => {
    const img = tex.image;
    const imgAspect = img ? img.width / img.height : 1.6;
    const vpAspect = viewport.width / viewport.height;
    const bleed = 1.08 * zoom;
    if (vpAspect > imgAspect) return [viewport.width * bleed, (viewport.width / imgAspect) * bleed, 1];
    return [viewport.height * imgAspect * bleed, viewport.height * bleed, 1];
  }, [tex, viewport.width, viewport.height, zoom]);

  useFrame((_, delta) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value += delta;
      const u = mat.current.uniforms.uMouse.value;
      u.x = THREE.MathUtils.lerp(u.x, pointer.current.x * 0.5 + 0.5, 0.08);
      u.y = THREE.MathUtils.lerp(u.y, pointer.current.y * 0.5 + 0.5, 0.08);
    }
    if (mesh.current) {
      mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, pointer.current.x * -0.2, 0.05);
      mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, pointer.current.y * -0.2, 0.05);
    }
  });

  return (
    <mesh ref={mesh} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} toneMapped={false} />
    </mesh>
  );
}

function Rig({ pointer }) {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, pointer.current.x * 0.35, 0.04);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, pointer.current.y * 0.35, 0.04);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function CinematicPlate({
  src,
  zoom = 1,
  tint = [0.04, 0.015, 0.0],
  warp = 1,
  bloom = 0.5,
}) {
  const pointer = useRef({ x: 0, y: 0 });
  const onPointerMove = (e) => {
    pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  return (
    <div className="absolute inset-0" onPointerMove={onPointerMove}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 45 }} gl={{ antialias: true, alpha: false }} style={{ background: '#05070f' }}>
        <React.Suspense fallback={null}>
          <Plate src={src} zoom={zoom} tint={tint} warp={warp} pointer={pointer} />
          <Rig pointer={pointer} />
        </React.Suspense>
        <EffectComposer>
          <Bloom intensity={bloom} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0009, 0.0009]} />
          <Vignette eskil={false} offset={0.3} darkness={0.95} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.16} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
