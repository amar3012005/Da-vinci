import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * SINGULANCE thesis backdrop — "the horizon is a doorway."
 * A single fullscreen shader: a perspective grid floor receding into a soft
 * teal→ember horizon glow, with a faint star field above. Slow forward drift.
 * Elegant, dark, premium — not synthwave neon. One plane, cheap.
 */

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

  void main(){
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;
    vec2 p = (uv - 0.5);
    p.x *= aspect;

    vec3 voidc = vec3(0.012, 0.024, 0.05);
    vec3 col = voidc;

    float horizon = 0.06; // slightly above center

    // ---- star field (above horizon) ----
    if (p.y > horizon) {
      vec2 sp = floor((uv) * vec2(140.0, 90.0));
      float s = hash(sp);
      float star = step(0.992, s);
      float tw = 0.6 + 0.4 * sin(uTime * 2.0 + s * 30.0);
      float fade = smoothstep(horizon, 0.5, p.y);
      col += vec3(0.7, 0.8, 1.0) * star * tw * fade * 0.9;
    }

    // ---- perspective grid floor (below horizon) ----
    if (p.y < horizon) {
      float depth = horizon - p.y;            // 0 at horizon -> grows downward
      float persp = 1.0 / (depth + 0.04);     // perspective scale
      float scroll = uTime * 0.35;
      // lines running into the distance
      float gx = abs(fract(p.x * persp * 0.5) - 0.5);
      float gz = abs(fract((depth * persp * 0.6) + scroll) - 0.5);
      float line = smoothstep(0.46, 0.5, max(1.0 - gx*2.0, 1.0 - gz*2.0));
      float fadeFloor = smoothstep(0.0, 0.18, depth) * smoothstep(0.9, 0.1, depth);
      vec3 grid = mix(vec3(0.05, 0.32, 0.36), vec3(0.5, 0.22, 0.07), smoothstep(0.0, 0.35, depth));
      col += grid * line * fadeFloor * 0.5;
    }

    // ---- horizon glow band (the doorway) ----
    float band = exp(-abs(p.y - horizon) * 26.0);
    vec3 glow = mix(vec3(0.10, 0.45, 0.5), vec3(0.6, 0.25, 0.08), 0.5 + 0.5*sin(uTime*0.2));
    col += glow * band * 0.9;

    // center bloom of the doorway
    float doorway = exp(-length(vec2(p.x*1.4, (p.y-horizon)*3.0)) * 3.0);
    col += vec3(0.5, 0.7, 0.85) * doorway * 0.35;

    // vignette
    col *= smoothstep(1.3, 0.3, length(p) * 1.4);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Plane() {
  const mat = useRef();
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } }),
    []
  );
  useFrame((state, delta) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value += delta;
      mat.current.uniforms.uRes.value.set(state.size.width, state.size.height);
    }
  });
  return (
    <mesh scale={[2, 2, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  );
}

export default function HorizonField() {
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, 1.5]} gl={{ antialias: false, alpha: false }} camera={{ position: [0, 0, 1] }}>
        <Plane />
      </Canvas>
    </div>
  );
}
