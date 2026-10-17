import React from 'react';
import { useLocation } from 'react-router-dom';
import ArtworkWelcome from './ArtworkWelcome';
import { featureForBrainPath } from './brain-feature-artwork';

export default function BrainFeatureWelcome() {
  const { pathname } = useLocation();
  const feature = featureForBrainPath(pathname);
  // These two pages own their welcome so Uploads retains its native file-picker action.
  if (!feature || ['uploads', 'connectors'].includes(feature.id)) return null;
  return <ArtworkWelcome key={feature.id} artwork={feature} title={feature.title}
    closeLabel={`Close ${feature.title} introduction`} actionLabel="Explore page" />;
}
