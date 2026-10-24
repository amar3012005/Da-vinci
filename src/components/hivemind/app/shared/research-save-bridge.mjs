/**
 * Window registry for the research report tabs opened by `openResearchReportTab`.
 * The `hm-save-research` listeners perform an authenticated save, so they accept
 * a message only from a report tab this document opened, on this document's origin.
 */
const reportWindows = new WeakSet();

/**
 * Records a report tab opened by this document.
 * @param {object} reportWindow WindowProxy returned by `window.open`.
 */
export function registerReportWindow(reportWindow) {
  if (reportWindow) reportWindows.add(reportWindow);
}

/**
 * True when a `message` event came from a registered report tab on the expected origin.
 * @param {{origin?: string, source?: object | null}} event Received `MessageEvent`.
 * @param {string} expectedOrigin Origin of the document that opened the report tab.
 * @returns {boolean} Whether the save request may be performed.
 */
export function isTrustedReportMessage(event, expectedOrigin) {
  return Boolean(event && event.origin === expectedOrigin && event.source && reportWindows.has(event.source));
}
