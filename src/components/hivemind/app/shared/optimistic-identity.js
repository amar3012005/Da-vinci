/**
 * Opt-in for revealing cached tenant identity before bootstrap confirms the session.
 *
 * `REACT_APP_OPTIMISTIC_IDENTITY` is read at build time by Create React App.
 * Unset, empty or `false` keeps identity hidden: the restoring frame paints neutral
 * skeleton blocks until bootstrap confirms the same organization and user. `true`
 * paints the cached organization name, roster and Runtime avatar immediately, for
 * single-user devices where that display is acceptable. Any other value fails at
 * render, so a misspelled build flag cannot silently pick a mode.
 */
export const OPTIMISTIC_IDENTITY_ENV = 'REACT_APP_OPTIMISTIC_IDENTITY';

/**
 * Parse the build flag into a boolean.
 * @param {string|undefined} value - raw value of `REACT_APP_OPTIMISTIC_IDENTITY`.
 * @returns {boolean} true only for the exact value `true`.
 * @throws {Error} when the value is anything other than unset, empty, `true` or `false`.
 */
export function parseOptimisticIdentityFlag(value) {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error(`${OPTIMISTIC_IDENTITY_ENV} must be "true" or "false", received "${value}".`);
}

/**
 * Whether the restoring frame may show cached identity before bootstrap confirms it.
 * @returns {boolean} the validated build flag.
 */
export function optimisticIdentityEnabled() {
  return parseOptimisticIdentityFlag(process.env.REACT_APP_OPTIMISTIC_IDENTITY);
}
