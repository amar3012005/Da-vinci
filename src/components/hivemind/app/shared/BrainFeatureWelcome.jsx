import React from 'react';
import { useLocation } from 'react-router-dom';
import ArtworkWelcome from './ArtworkWelcome';
import { featureForBrainPath } from './brain-feature-artwork';
import { introDismissalKey } from './intro-dismissal';

// tenant and userId scope the dismissal of each introduction; without them the introduction reopens on every visit.
export default function BrainFeatureWelcome({ tenant, userId }) {
  const { pathname } = useLocation();
  const feature = featureForBrainPath(pathname);
  // These two pages own their welcome so Uploads retains its native file-picker action.
  if (!feature || ['uploads', 'connectors'].includes(feature.id)) return null;
  const dismissKey = introDismissalKey({ tenant, user: userId, step: feature.id });
  if (feature.id === 'meeting-notes') return <ArtworkWelcome key={feature.id} artwork={feature} title="Meeting Intelligence"
    closeLabel="Close Meeting Intelligence introduction" actionLabel="Explore Meeting Intelligence" cardClassName="meeting-intelligence-welcome" dismissKey={dismissKey}/>;
  return <ArtworkWelcome key={feature.id} artwork={feature} title={feature.title}
    closeLabel={`Close ${feature.title} introduction`} actionLabel="Explore page" dismissKey={dismissKey} />;
}
