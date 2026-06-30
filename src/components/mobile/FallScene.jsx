import React from 'react';
import CinematicScrollScene from './CinematicScrollScene';

/**
 * FallScene — Act I "The Fall". Scroll-scrubbed cinematic of the figure falling.
 * The Fall is about THE PAIN — and the pain is told in the visitor's own
 * language: the narration adapts to the category they picked in the FieldPicker.
 * No pick → the universal pain story.
 */

const FIELD_LABEL = {
  legal: 'Legal',
  finance: 'Finance',
  planning: 'Planning',
  marketing: 'Marketing',
  public: 'Public Sector',
  health: 'Healthcare',
};

const DEFAULT_STEPS = [
  { at: 0.10, label: 'Intelligence that forgets isn’t intelligence.' },
  { at: 0.30, label: 'It’s amnesia with good PR.' },
  { at: 0.50, label: 'Every day, your org starts from zero.' },
  { at: 0.70, label: 'Knowledge walks out the door.' },
  { at: 0.90, label: 'The horizon isn’t a wall.', sub: '世界的に', accent: true },
];

/* Per-field PAIN narratives — the fall, in their language. */
const PAIN = {
  legal: [
    { at: 0.10, label: 'Every matter starts from a blank page.' },
    { at: 0.30, label: 'Precedent buried in someone’s inbox.' },
    { at: 0.50, label: 'The associate who knew it all just left.' },
    { at: 0.70, label: 'Billable hours lost to re-reading.' },
    { at: 0.90, label: 'Memory shouldn’t be this expensive.', accent: true },
  ],
  finance: [
    { at: 0.10, label: 'Last quarter’s reasoning — gone.' },
    { at: 0.30, label: 'Every model rebuilt from scratch.' },
    { at: 0.50, label: 'Compliance asks “why” — no one remembers.' },
    { at: 0.70, label: 'Risk hides in what you forgot.' },
    { at: 0.90, label: 'Decisions deserve a memory.', accent: true },
  ],
  planning: [
    { at: 0.10, label: 'Every plan forgets the last one.' },
    { at: 0.30, label: 'Lessons learned, then lost.' },
    { at: 0.50, label: 'Context resets with every cycle.' },
    { at: 0.70, label: 'You re-solve solved problems.' },
    { at: 0.90, label: 'Strategy needs continuity.', accent: true },
  ],
  marketing: [
    { at: 0.10, label: 'Every campaign reinvents the wheel.' },
    { at: 0.30, label: 'Brand voice drifts — no one notices.' },
    { at: 0.50, label: 'What worked last time? Nobody knows.' },
    { at: 0.70, label: 'Insights die in old decks.' },
    { at: 0.90, label: 'Memory is your edge.', accent: true },
  ],
  public: [
    { at: 0.10, label: 'Citizens repeat themselves at every desk.' },
    { at: 0.30, label: 'Case history scattered across systems.' },
    { at: 0.50, label: 'Turnover erases institutional memory.' },
    { at: 0.70, label: 'The same question, asked forever.' },
    { at: 0.90, label: 'The state should remember.', accent: true },
  ],
  health: [
    { at: 0.10, label: 'Every handoff loses the story.' },
    { at: 0.30, label: 'Patient history fragmented, again.' },
    { at: 0.50, label: 'Knowledge trapped in one clinician’s head.' },
    { at: 0.70, label: 'Care restarts at every shift.' },
    { at: 0.90, label: 'Memory saves lives.', accent: true },
  ],
};

const FallScene = ({ field }) => {
  const steps = (field && PAIN[field]) || DEFAULT_STEPS;
  const subtitle = field && FIELD_LABEL[field] ? `The pain · ${FIELD_LABEL[field]}` : 'The pain';
  return (
    <CinematicScrollScene
      key={field || 'default'}
      frameDir="fall-frames"
      frameCount={193}
      steps={steps}
      title="THE FALL"
      subtitle={subtitle}
      staticFrame={150}
      staticHeadline="It falls — into memory."
      heightVh={440}
    />
  );
};

export default FallScene;
