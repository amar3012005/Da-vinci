import React from 'react';
import ArtifactCard from './ArtifactCard';

export default function ArtifactGrid({ artifacts, onOpen }) {
  const list = Array.isArray(artifacts) ? artifacts : [];
  return (
    <div className="space-y-2">
      {list.map((a) => (
        <ArtifactCard
          key={a.block_id}
          title={a.payload?.label || a.payload?.path || a.payload?.artifact_id}
          kind={a.kind}
          onOpen={() => onOpen && onOpen(a)}
        />
      ))}
    </div>
  );
}
