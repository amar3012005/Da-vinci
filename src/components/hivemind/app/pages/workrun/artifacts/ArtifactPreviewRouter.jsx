import React, { useEffect, useState } from 'react';
import apiClient from '../../../shared/api-client';

export default function ArtifactPreviewRouter({ artifact }) {
  const [loaded, setLoaded] = useState(null);
  const [loadError, setLoadError] = useState('');
  const payload = artifact?.payload || {};
  const path = artifact?.path || payload.path;
  useEffect(() => {
    let active = true;
    setLoaded(null);
    setLoadError('');
    if (typeof path === 'string' && path.startsWith('/v1/hyper-artifacts/')) {
      apiClient.getHyperArtifact(path).then((value) => { if (active) setLoaded(value); }).catch((error) => {
        if (active) setLoadError(error?.response?.data?.error || 'Artifact preview could not be loaded.');
      });
    }
    return () => { active = false; };
  }, [path]);
  if (!artifact) return null;
  const type = String(artifact.content_type || payload.content_type || '');
  const title = artifact.title || payload.label || payload.name || 'Preview';
  const body = artifact.detail || artifact.result || payload.content || payload.text || loaded || '';
  if (type.startsWith('image/')) {
    const src = artifact.url || payload.url || apiClient.hyperArtifactAssetUrl(path) || body;
    return <img alt={title} src={src} className="max-w-full rounded-[8px] border border-[#e3e0db]" />;
  }
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e3e0db] bg-white text-[12px] text-[#171717]">
      <div className="truncate border-b border-[#eae7e1] bg-[#faf9f4] px-3 py-2 font-medium" title={title}>{title}</div>
      <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-5">{body || (loadError ? loadError : (path ? 'Loading artifact…' : 'No preview content available.'))}</pre>
    </div>
  );
}
