import React, { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

function PdfPage({ document, number }) {
  const canvas = useRef(null);
  const container = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return undefined;
    let cancelled = false;
    let render;
    (async () => {
      const page = await document.getPage(number);
      if (cancelled) return;
      const natural = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, width / natural.width) });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const element = canvas.current;
      element.width = Math.floor(viewport.width * pixelRatio);
      element.height = Math.floor(viewport.height * pixelRatio);
      element.style.width = `${viewport.width}px`;
      element.style.height = `${viewport.height}px`;
      render = page.render({ canvasContext: element.getContext("2d"), viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
      await render.promise;
    })().catch((error) => { if (!cancelled && error?.name !== "RenderingCancelledException") console.error("PDF page render failed", error); });
    return () => { cancelled = true; render?.cancel(); };
  }, [document, number, width]);

  return <div ref={container} className="w-full bg-white shadow-sm"><canvas ref={canvas} aria-label={`PDF page ${number}`} className="mx-auto block max-w-full" /></div>;
}

export default function PdfCanvasPreview({ body }) {
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setDocument(null);
    setError("");
    if (!body) return undefined;
    let cancelled = false;
    const bytes = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
    const loading = pdfjs.getDocument({ data: bytes });
    loading.promise.then((loaded) => { if (!cancelled) setDocument(loaded); }).catch((failure) => {
      if (!cancelled) setError(failure?.message || "PDF could not be opened.");
    });
    return () => { cancelled = true; loading.destroy(); };
  }, [body]);

  if (error) return <p role="alert" className="p-4 text-sm text-red-700">PDF preview failed: {error}</p>;
  if (!document) return <p className="p-4 text-sm text-[#737373]">Loading PDF…</p>;
  return <div className="space-y-3 bg-[#eeeeee] p-3">{Array.from({ length: document.numPages }, (_, index) => <PdfPage key={index + 1} document={document} number={index + 1} />)}</div>;
}
