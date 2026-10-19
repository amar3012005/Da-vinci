import React from 'react';
import { useLocation } from 'react-router-dom';
import ArtworkWelcome from './ArtworkWelcome';
import MeetingIntelligenceStory from './MeetingIntelligenceStory';
import { featureForBrainPath } from './brain-feature-artwork';

export default function BrainFeatureWelcome() {
  const { pathname } = useLocation();
  const feature = featureForBrainPath(pathname);
  // These two pages own their welcome so Uploads retains its native file-picker action.
  if (!feature || ['uploads', 'connectors'].includes(feature.id)) return null;
  if (feature.id === 'meeting-notes') return <ArtworkWelcome key={feature.id} artwork={feature} title="Meeting Intelligence"
    closeLabel="Close Meeting Intelligence introduction" actionLabel="Explore Meeting Intelligence" cardClassName="meeting-intelligence-welcome"><MeetingIntelligenceStory popup/></ArtworkWelcome>;
  return <ArtworkWelcome key={feature.id} artwork={feature} title={feature.title}
    closeLabel={`Close ${feature.title} introduction`} actionLabel="Explore page" />;
}
