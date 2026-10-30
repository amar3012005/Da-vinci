/**
 * Connect-state rules for the Apps drawer, kept free of React so they can be tested directly.
 */

/**
 * Text to show for a failed connect request. Prefers the server's user-safe message; a raw transport message
 * such as "Request failed with status code 400" is replaced by `fallback`.
 * @param {any} error - Axios or Error value.
 * @param {string} fallback - Localized generic message.
 * @returns {string}
 */
export function connectErrorMessage(error, fallback) {
  const served = error?.response?.data?.error;
  if (typeof served === "string" && served.trim()) return served;
  const message = typeof error?.message === "string" ? error.message : "";
  if (!message || /^Request failed with status code \d+$/.test(message) || /^(Network Error|timeout of \d+ms exceeded)$/i.test(message)) return fallback;
  return message;
}

/**
 * Why Sign in is unavailable for an app, from the Core toolkit row, or null when it can be offered.
 * Rows from an older Core carry no `connectable` field and stay connectable.
 * @param {{ connectable?: boolean, connectMode?: string } | null} toolkitMeta
 * @returns {"no_sign_in" | "unavailable" | null}
 */
export function connectBlock(toolkitMeta) {
  if (!toolkitMeta || toolkitMeta.connectable !== false) return null;
  return toolkitMeta.connectMode === "no_auth" ? "no_sign_in" : "unavailable";
}
