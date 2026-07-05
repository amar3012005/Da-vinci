import React, { useCallback, useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';

const defaultMarkers = [
  { id: 'cdn-iad', location: [38.95, -77.45] },
  { id: 'cdn-sfo', location: [37.62, -122.38] },
  { id: 'cdn-cdg', location: [49.01, 2.55] },
  { id: 'cdn-hnd', location: [35.55, 139.78] },
  { id: 'cdn-syd', location: [-33.95, 151.18] },
  { id: 'cdn-gru', location: [-23.43, -46.47] },
  { id: 'cdn-sin', location: [1.36, 103.99] },
  { id: 'cdn-arn', location: [59.65, 17.93] },
  { id: 'cdn-dub', location: [53.43, -6.25] },
  { id: 'cdn-bom', location: [19.09, 72.87] },
];

const defaultArcs = [
  { id: 'cdn-arc-1', from: [38.95, -77.45], to: [49.01, 2.55] },
  { id: 'cdn-arc-2', from: [37.62, -122.38], to: [35.55, 139.78] },
  { id: 'cdn-arc-3', from: [49.01, 2.55], to: [1.36, 103.99] },
  { id: 'cdn-arc-4', from: [38.95, -77.45], to: [-23.43, -46.47] },
  { id: 'cdn-arc-5', from: [35.55, 139.78], to: [-33.95, 151.18] },
  { id: 'cdn-arc-6', from: [49.01, 2.55], to: [19.09, 72.87] },
];

export function GlobeCdn({
  markers = defaultMarkers,
  arcs = defaultArcs,
  className = '',
  speed = 0.003,
}) {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const handlePointerDown = useCallback((event) => {
    pointerInteracting.current = { x: event.clientX, y: event.clientY };
    isPausedRef.current = true;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    isPausedRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!pointerInteracting.current) return;
      dragOffset.current = {
        phi: (event.clientX - pointerInteracting.current.x) / 300,
        theta: (event.clientY - pointerInteracting.current.y) / 1000,
      };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let globe = null;
    let animationId = 0;
    let phi = 0;

    const init = () => {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark: 0,
        diffuse: 1.45,
        mapSamples: 16000,
        mapBrightness: 8,
        baseColor: [0.95, 0.94, 0.92],
        markerColor: [0.09, 0.09, 0.09],
        glowColor: [0.78, 0.77, 0.74],
        markerElevation: 0.02,
        markers: markers.map((marker) => ({
          location: marker.location,
          size: 0.012,
          id: marker.id,
        })),
        arcs: arcs.map((arc) => ({
          from: arc.from,
          to: arc.to,
          id: arc.id,
        })),
        arcColor: [0.09, 0.09, 0.09],
        arcWidth: 0.45,
        arcHeight: 0.25,
        opacity: 0.8,
      });

      const animate = () => {
        if (!isPausedRef.current) phi += speed;
        globe?.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        });
        animationId = window.requestAnimationFrame(animate);
      };

      animate();
      setIsReady(true);
    };

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const observer = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          observer.disconnect();
          init();
        }
      });
      observer.observe(canvas);

      return () => {
        observer.disconnect();
        if (animationId) cancelAnimationFrame(animationId);
        globe?.destroy();
      };
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      globe?.destroy();
    };
  }, [arcs, markers, speed]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: isReady ? 1 : 0,
          transition: 'opacity 900ms ease',
          borderRadius: '50%',
          touchAction: 'none',
        }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-full border border-black/10" />
      <div className="pointer-events-none absolute inset-[10%] rounded-full border border-black/5" />
    </div>
  );
}

export default GlobeCdn;
