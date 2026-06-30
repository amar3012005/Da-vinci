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
 * SINGULANCE hero — three.js graphic effects over the painted cover.
 * No particles. The cover is a shader plane with an animated noise warp +
 * a mouse-driven ripple (heat-shimmer / living-painting feel), composited
 * through a post-processing stack: bloom, chromatic aberration, vignette,
 * film grain. Subtle camera + plate parallax keeps real depth.
 */

const COVER_SRC = '/singulance-cover.webp';

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTime;
  uniform vec2  uMouse;   // in 0..1 uv space
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // flowing low-frequency noise warp (very subtle, cinematic drift)
    float n =
      sin(uv.x * 7.0 + uTime * 0.35) * 0.5 +
      sin(uv.y * 5.0 - uTime * 0.28) * 0.5 +
      sin((uv.x + uv.y) * 9.0 + uTime * 0.2) * 0.25;
    vec2 warp = vec2(n) * 0.0016;

    // mouse ripple — subtle, snappy reaction
    float d = distance(uv, uMouse);
    vec2 dir = normalize(uv - uMouse + 1e-5);
    warp += dir * 0.009 * sin(d * 30.0 - uTime * 4.0) * exp(-d * 4.0);

    vec3 col = texture2D(uTex, uv + warp).rgb;

    // gentle ember-toward-teal grade pulse to make it feel alive
    float pulse = 0.5 + 0.5 * sin(uTime * 0.4);
    col += col * vec3(0.04, 0.015, 0.0) * pulse;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function CoverPlane({ pointer }) {
  const mesh = useRef();
  const mat = useRef();
  const tex = useTexture(COVER_SRC);
  const { viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      uTex: { value: tex },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    [tex]
  );

  // fill-width: the wordmark is baked horizontally across the poster, so always
  // fill the full viewport width (never crop the sides) and let the height
  // overflow / crop top+bottom. bleed 1.0; parallax shift kept tiny so no edge.
  const scale = useMemo(() => {
    const img = tex.image;
    const imgAspect = img ? img.width / img.height : 1.6;
    return [viewport.width, viewport.width / imgAspect, 1];
  }, [tex, viewport.width]);

  useFrame((_, delta) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value += delta;
      const mx = pointer.current.x * 0.5 + 0.5;
      const my = pointer.current.y * 0.5 + 0.5;
      const u = mat.current.uniforms.uMouse.value;
      // snappier tracking → the water reacts immediately to the cursor
      u.x = THREE.MathUtils.lerp(u.x, mx, 0.22);
      u.y = THREE.MathUtils.lerp(u.y, my, 0.22);
    }
    // no plate parallax/tilt — the plate stays locked, only the water moves
  });

  return (
    <mesh ref={mesh} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        toneMapped={false}
      />
    </mesh>
  );
}

function Rig() {
  // camera tilt/parallax disabled — locked, no movement
  return null;
}

export default function HeroScene() {
  const pointer = useRef({ x: 0, y: 0 });

  const onPointerMove = (e) => {
    pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  return (
    <div className="absolute inset-0" onPointerMove={onPointerMove}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#05070f' }}
      >
        <React.Suspense fallback={null}>
          <CoverPlane pointer={pointer} />
          <Rig />
        </React.Suspense>
        <EffectComposer>
          <Bloom intensity={0.55} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0009, 0.0009]} />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
