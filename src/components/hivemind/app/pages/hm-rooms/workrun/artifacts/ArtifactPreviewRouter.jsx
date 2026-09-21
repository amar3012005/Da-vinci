import React from 'react';
import apiClient from '../../../../shared/api-client';

export default function ArtifactPreviewRouter({ artifact }) {
  if (!artifact) return null;
  const type = String(artifact.content_type || artifact.payload?.content_type || '');
  const title = artifact.title || artifact.payload?.label || 'Preview';
  const body = artifact.detail || artifact.result || artifact.payload?.detail || artifact.payload?.path || '';
  const workRunId = artifact.payload?.workrun_id;
  const artifactId = artifact.payload?.artifact_id;
  const downloadUrl = workRunId && artifactId ? apiClient.workRunArtifactUrl(workRunId, artifactId) : null;
  if (type.startsWith('image/')) {
    return <img alt="" src={body} className="max-w-full" />;
  }
  return (
    <div className="text-[13px] text-[#171717] whitespace-pre-wrap break-words">
      <div className="font-medium mb-1">{title}</div>
      {body}
      {downloadUrl ? <a className="mt-3 inline-flex text-[12px] font-medium text-[#117dff] hover:text-[#0066e0]" href={downloadUrl}>Download artifact</a> : null}
    </div>
  );
}
