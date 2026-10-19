import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Keep the DOM poster exposed until a textured scene has rendered. Texture
// loading suspends this component too; an empty Canvas never covers the image.
export default function SceneVisibility({ onReady, onLost }) {
  const { gl } = useThree();
  const scheduled = useRef(false);
  const frame = useRef(null);
  useEffect(() => {
    const lost = () => onLost();
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', lost);
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      scheduled.current = false;
    };
  }, [gl, onLost]);
  useFrame(() => {
    if (scheduled.current) return;
    scheduled.current = true;
    frame.current = requestAnimationFrame(onReady);
  });
  return null;
}

// Stop decorative GPU work when its canvas is outside the viewport.
export function useMotionInView() {
  const host = useRef(null);
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(entries => setActive(entries.some(entry => entry.isIntersecting)));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return [host, active];
}
