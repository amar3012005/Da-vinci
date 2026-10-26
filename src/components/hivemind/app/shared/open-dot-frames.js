// Embedded OpenDot frames that receive host lifecycle messages. Each message
// targets the frame's own origin; the wildcard target is never used.

const frames = new Set();

/**
 * Register an embedded OpenDot frame for host lifecycle messages.
 * @param {{ src: string, isConnected?: boolean, contentWindow: { postMessage: Function } | null }} frame - iframe element or equivalent.
 * @returns {() => void} disposer that removes the registration.
 */
export function registerOpenDotFrame(frame) {
  frames.add(frame);
  return () => { frames.delete(frame); };
}

/**
 * Origin of a frame's document, read from its src attribute.
 * @param {{ src: string }} frame - registered frame.
 * @returns {string|null} exact origin, or null when the src is missing, invalid or opaque.
 */
function frameOrigin(frame) {
  try {
    const origin = new URL(frame.src).origin;
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
}

/**
 * Post the sign-out message to every connected, registered OpenDot frame. The
 * frame clears its tenant cache when it receives this message.
 * @returns {number} number of frames the message was posted to.
 */
export function postOpenDotSignOut() {
  let posted = 0;
  for (const frame of [...frames]) {
    if (frame.isConnected === false) { frames.delete(frame); continue; }
    const origin = frameOrigin(frame);
    const target = frame.contentWindow;
    if (!origin || !target) continue;
    try {
      target.postMessage({ type: 'hivemind.open-dot.sign-out' }, origin);
      posted += 1;
    } catch {
      // A frame that refuses the message keeps its cache until it reloads.
    }
  }
  return posted;
}

// Sign-out, account switch and organization switch all dispatch hm:tenant-changed.
if (typeof window !== 'undefined') {
  window.addEventListener('hm:tenant-changed', () => { postOpenDotSignOut(); });
}
