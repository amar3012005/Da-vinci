/** Keep the native chat canvas within the visible area when a phone keyboard opens. */
export function bindNativeChatViewport(browser, style) {
  const previous = style.getPropertyValue('--hm-app-viewport-height');
  const viewport = browser.visualViewport;
  const update = () => {
    // Pinch zoom is not a keyboard resize; preserve the layout viewport there.
    const height = viewport && viewport.scale === 1 ? viewport.height : browser.innerHeight;
    style.setProperty('--hm-app-viewport-height', `${Math.round(height)}px`);
  };
  update();
  viewport?.addEventListener('resize', update);
  browser.addEventListener('resize', update);
  return () => {
    viewport?.removeEventListener('resize', update);
    browser.removeEventListener('resize', update);
    if (previous) style.setProperty('--hm-app-viewport-height', previous);
    else style.removeProperty('--hm-app-viewport-height');
  };
}
