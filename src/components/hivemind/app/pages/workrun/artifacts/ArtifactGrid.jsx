import React from 'react';
import ArtifactCard from './ArtifactCard';

export default function ArtifactGrid({ artifacts, onOpen }) {
  const list = Array.isArray(artifacts) ? artifacts : [];
  return (
    <div>
      {list.map((a) => (
        <ArtifactCard
          key={a.block_id}
          title={a.payload?.label}
          kind={a.kind}
          onOpen={() => onOpen && onOpen(a)}
        />
      ))}
    </div>
  );
}
