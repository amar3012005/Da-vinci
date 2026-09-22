import React from 'react';
import ArtifactCard from './ArtifactCard';
import { artifactDisplayName } from '../../hm-rooms-dsh/workrun-view';

export default function ArtifactGrid({ artifacts, onOpen }) {
  const list = Array.isArray(artifacts) ? artifacts : [];
  return (
    <div>
      {list.map((a) => (
        <ArtifactCard
          key={a.block_id}
          title={artifactDisplayName(a)}
          kind={a.kind}
          onOpen={() => onOpen && onOpen(a)}
        />
      ))}
    </div>
  );
}
