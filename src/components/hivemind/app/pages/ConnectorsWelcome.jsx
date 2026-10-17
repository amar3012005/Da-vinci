import React from 'react';
import ArtworkWelcome from '../shared/ArtworkWelcome';
import { proactiveIntelligenceArtwork } from '../shared/proactive-intelligence';

export default function ConnectorsWelcome() {
  return <ArtworkWelcome artwork={proactiveIntelligenceArtwork} title="Connectors" closeLabel="Close connectors introduction" actionLabel="Connect apps"/>;
}
