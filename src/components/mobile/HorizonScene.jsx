import React from 'react';
import CinematicScrollScene from './CinematicScrollScene';

/**
 * HorizonScene — Act I "THE HORIZON". The opening cinematic, straight after the
 * cover slide. A shuttered window hanging in open sky swings open onto marble
 * columns and an alpine valley, then pulls back to one person working inside
 * that landscape.
 *
 * Story beat: before the pain (THE FALL, which now follows this scene) we show
 * the promise — an operating layer that opens onto your own ground and lets the
 * work happen inside it. Sovereign, European, yours.
 *
 * Same mechanic as FallScene: a pinned <canvas> scrubbed by scroll via the
 * shared CinematicScrollScene, with a right-side narration rail and a
 * reduced-motion / mobile fallback.
 */

// No narration rail here on purpose: this scene is the visual overture right
// after the cover slide. Overlaid script lines fought the columns and the
// valley, so the imagery carries it alone — the words start in THE FALL.
const STEPS = [];

// Three clips cut into one 164-frame film (every 3rd frame of each source):
//   1-46    window in the sky opens onto the colonnade      (act 1)
//   47-111  through the pillars → desk in the valley → RUN FROM ANYWHERE
//   112-164 the laptop morphs into a CRT and the walls of a
//           war-room close in around it → RUN EVERYTHING     (act 3)
//
// Frame-fraction landmarks: ~0.21 window open · 0.21-0.36 the pillars ·
// ~0.48 the figure reads · ~0.66 RUN FROM ANYWHERE · ~0.71 morph · 0.82+ room.
//
// Linear scrub rushed the pillar crossing, the most striking beat, so these
// keys hand frames 0.21→0.36 a 30% slice of the scroll instead of 15%.
const SCRUB_KEYS = [
  [0.00, 0.00],
  [0.14, 0.21],
  [0.44, 0.36],
  [1.00, 1.00],
];

const HorizonScene = () => (
  <CinematicScrollScene
    frameDir="horizon-frames"
    frameCount={164}
    scrubKeys={SCRUB_KEYS}
    steps={STEPS}
    // Centred over the closed window; vanishes outright the moment the window
    // opens (~0.19), then pops in as a vertical side marker. Clears completely
    // at 0.62-0.72, as the figure at the desk reads, so the human moment and
    // the end card stand alone.
    heroTitle={{
      text: 'The New Era',
      sub: 'Sovereign by design',
      from: 0.09, to: 0.145, outFrom: 0.46, outTo: 0.55,
    }}
    staticFrame={160}
    staticHeadline="Run everything, from anywhere."
    heightVh={980}
  />
);

export default HorizonScene;
