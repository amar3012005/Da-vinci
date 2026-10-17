import { brainFeatureArtwork } from '../shared/brain-feature-artwork';
// One banner-only carousel, with destination and art supplied by the page catalog.
export const brainSidebarBanner = brainFeatureArtwork.map(({ title, ...slide }) => slide);
