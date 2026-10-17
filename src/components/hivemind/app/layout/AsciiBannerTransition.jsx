import React, { useEffect, useRef } from 'react';

const DURATION = 1500;
const GLYPHS = ' .,:;-+=*abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';
function crop(context, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height) * 1.45;
  context.drawImage(image, (width - image.width * scale) / 2, (height - image.height * scale) / 2, image.width * scale, image.height * scale);
}
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image); image.onerror = reject; image.src = source;
  });
}
function sample(image, columns, rows, width, height) {
  const canvas = document.createElement('canvas'); canvas.width = columns; canvas.height = rows;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas unavailable');
  context.scale(columns / width, rows / height);
  crop(context, image, width, height);
  return context.getImageData(0, 0, columns, rows).data;
}

// A short image → character field → next image diffusion, sampled from the
// actual artwork. No video, WebGL, library or permanent rendering loop.
export default function AsciiBannerTransition({ from, to, onFinish }) {
  const canvas = useRef(null);
  useEffect(() => {
    let cancelled = false, frame, started, lastDraw = -100;
    const element = canvas.current;
    const context = element.getContext('2d');
    const finish = () => { if (!cancelled) onFinish(); };
    // Image failures must never strand the carousel behind a blank overlay.
    const deadline = window.setTimeout(finish, 5000);
    if (!context) { finish(); return () => window.clearTimeout(deadline); }
    Promise.all([loadImage(from), loadImage(to)]).then(([before, after]) => {
      if (cancelled) return;
      const bounds = element.getBoundingClientRect();
      const width = bounds.width || 268, height = bounds.height || 151;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      context.scale(ratio, ratio);
      const cellWidth = 5, cellHeight = 7;
      const columns = Math.ceil(width / cellWidth), rows = Math.ceil(height / cellHeight);
      const a = sample(before, columns, rows, width, height), b = sample(after, columns, rows, width, height);
      const draw = timestamp => {
        if (cancelled) return;
        started ??= timestamp;
        const elapsed = timestamp - started, progress = Math.min(elapsed / DURATION, 1);
        if (elapsed - lastDraw >= 32 || progress === 1) {
          lastDraw = elapsed;
          const strength = Math.sin(Math.PI * progress);
          context.globalAlpha = 1; context.fillStyle = '#141414'; context.fillRect(0, 0, width, height);
          context.globalAlpha = 1 - strength;
          crop(context, progress < 0.5 ? before : after, width, height);
          context.globalAlpha = strength; context.font = '7px ui-monospace, SFMono-Regular, monospace'; context.textBaseline = 'top';
          for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
            const cell = y * columns + x, offset = cell * 4;
            const noise = ((cell * 16807 + 17) % 2147) / 2147;
            const mix = Math.max(0, Math.min(1, (progress - noise * 0.6) / 0.4));
            const r = a[offset] * (1 - mix) + b[offset] * mix;
            const g = a[offset + 1] * (1 - mix) + b[offset + 1] * mix;
            const blue = a[offset + 2] * (1 - mix) + b[offset + 2] * mix;
            const luminance = (r * 0.2126 + g * 0.7152 + blue * 0.0722) / 255;
            const shift = Math.floor(elapsed / 75);
            const character = GLYPHS[(Math.floor(luminance * (GLYPHS.length - 1)) + cell + shift) % GLYPHS.length];
            context.fillStyle = `rgb(${Math.min(235, r * 1.4 + 20)},${Math.min(235, g * 1.4 + 22)},${Math.min(235, blue * 1.4 + 22)})`;
            context.fillText(character, x * cellWidth, y * cellHeight);
          }
          context.globalAlpha = 1;
        }
        if (progress < 1) frame = requestAnimationFrame(draw); else finish();
      };
      frame = requestAnimationFrame(draw);
    }).catch(finish);
    return () => { cancelled = true; cancelAnimationFrame(frame); window.clearTimeout(deadline); };
  }, [from, to, onFinish]);
  return <canvas ref={canvas} className="brain-banner-ascii" aria-hidden="true" data-ascii-diffusion="true"/>;
}
