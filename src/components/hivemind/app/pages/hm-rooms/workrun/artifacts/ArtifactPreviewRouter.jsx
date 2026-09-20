import React from 'react';

export default function ArtifactPreviewRouter({ artifact }) {
  if (!artifact) return null;
  const type = String(artifact.content_type || artifact.payload?.content_type || '');
  const title = artifact.title || artifact.payload?.label || 'Preview';
  const body = artifact.detail || artifact.result || artifact.payload?.path || '';
  if (type.startsWith('image/')) {
    return <img alt="" src={body} className="max-w-full" />;
  }
  return (
    <div className="text-[13px] text-[#171717] whitespace-pre-wrap break-words">
      <div className="font-medium mb-1">{title}</div>
      {body}
    </div>
  );
}
