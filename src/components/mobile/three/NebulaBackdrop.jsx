import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * SINGULANCE sub-products backdrop — a slow animated FBM nebula.
 * One fullscreen shader plane (cheap) sitting behind the product cards to give
 * the section real moving depth. Void-black drifting into faint teal + ember.
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

  // hash + value noise + fbm
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
  }
  float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
    return v;
  }

  void main(){
    vec2 uv = vUv;
    vec2 p = uv * vec2(uRes.x/uRes.y, 1.0) * 2.2;
    float t = uTime * 0.05;
    float n = fbm(p + vec2(t, -t*0.6) + fbm(p*0.5 + t));
    float n2 = fbm(p*1.7 - vec2(t*0.8, t));

    vec3 voidc = vec3(0.012, 0.027, 0.059);   // #05070f-ish
    vec3 teal  = vec3(0.05, 0.30, 0.34);
    vec3 ember = vec3(0.55, 0.22, 0.06);

    vec3 col = voidc;
    col = mix(col, teal,  smoothstep(0.45, 0.95, n)  * 0.55);
    col = mix(col, ember, smoothstep(0.60, 1.05, n2) * 0.35);

    // vignette toward edges
    float vig = smoothstep(1.2, 0.2, length(uv-0.5)*1.6);
    col *= mix(0.55, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Plane() {
  const mat = useRef();
  const { size, viewport } = useThree();
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } }),
    []
  );
  useFrame((_, delta) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value += delta;
      mat.current.uniforms.uRes.value.set(size.width, size.height);
    }
  });
  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  );
}

export default function NebulaBackdrop() {
  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, 1.5]} gl={{ antialias: false, alpha: false }} camera={{ position: [0, 0, 1] }}>
        <Plane />
      </Canvas>
    </div>
  );
}
