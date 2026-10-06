/** Same-page identity for the native mobile Brain greeting, scoped to that surface. */
export function mobileBrainUserName(user, mobileBrain) {
  if (!mobileBrain) return undefined;
  const displayName = typeof user?.display_name === 'string' ? user.display_name.trim() : '';
  const name = typeof user?.name === 'string' ? user.name.trim() : '';
  return (displayName || name).slice(0, 120) || undefined;
}
