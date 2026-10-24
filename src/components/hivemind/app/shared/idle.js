/**
 * Run a non-critical read after first paint. Uses requestIdleCallback when the
 * browser provides it, otherwise a short timer.
 * @param {() => void} callback - work to run once the page is idle.
 * @param {{ timeout?: number }} [options] - maximum wait before the callback runs anyway.
 * @returns {() => void} cancel function for an unrun callback.
 */
export function whenIdle(callback, { timeout = 1500 } = {}) {
  if (typeof window === 'undefined') return () => {};
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, 300);
  return () => window.clearTimeout(id);
}
