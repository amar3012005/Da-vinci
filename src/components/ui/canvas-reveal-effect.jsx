"use client";
import { cn } from "../../lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

export const CanvasRevealEffect = ({
  animationSpeed = 0.4,
  opacities = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
  colors = [[0, 0, 0]],
  containerClassName,
  dotSize,
  showGradient = true,
}) => {
  const { size } = useThree();
  const ref = useRef();

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_opacities: { value: opacities },
    u_colors: { value: colors.map((color) => [color[0] / 255, color[1] / 255, color[2] / 255]) },
    u_total_size: { value: dotSize || 2 },
    u_dot_size: { value: (dotSize || 2) * 0.5 },
    u_resolution: { value: [size.width * 2, size.height * 2] },
  }), [colors, opacities, dotSize, size.width, size.height]);

  const vertexShader = `
    precision mediump float;
    attribute vec3 position;
    attribute vec2 coordinates;
    uniform vec2 u_resolution;
    varying vec2 fragCoord;
    void main(){
      float x = position.x;
      float y = position.y;
      gl_Position = vec4(x, y, 0.0, 1.0);
      fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
      fragCoord.y = u_resolution.y - fragCoord.y;
    }
  `;

  const fragmentShader = `
    precision mediump float;
    uniform float u_time;
    uniform float u_opacities[10];
    uniform vec3 u_colors[6];
    uniform float u_total_size;
    uniform float u_dot_size;
    uniform vec2 u_resolution;
    in vec2 fragCoord;
    out vec4 fragColor;

    float PHI = 1.61803398874989484820459;
    float random(vec2 xy) {
        return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
    }
    float map(float value, float min1, float max1, float min2, float max2) {
        return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
    }
    void main() {
      vec2 st = fragCoord.xy;
      st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
      st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));
      float opacity = step(0.0, st.x);
      opacity *= step(0.0, st.y);
      vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
      float frequency = 5.0;
      float show_offset = random(st2);
      float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency) + 1.0);
      opacity *= u_opacities[int(rand * 10.0)];
      opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
      opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));
      vec3 color = u_colors[int(rand * 6.0)];
      fragColor = vec4(color, opacity);
    }
  `;

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
    });
  }, [uniforms, vertexShader, fragmentShader]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const timestamp = clock.getElapsedTime();
    const material = ref.current.material;
    const timeLocation = material.uniforms.u_time;
    timeLocation.value = timestamp;
  });

  return (
    <Canvas className={cn("h-full w-full", containerClassName)}>
      <mesh ref={ref}>
        <planeGeometry args={[2, 2]} />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>
    </Canvas>
  );
};