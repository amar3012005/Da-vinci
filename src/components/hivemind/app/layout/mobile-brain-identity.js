/** Same-page identity for the native mobile Brain greeting, scoped to that surface. */
export function mobileBrainUserName(user, mobileBrain) {
  if (!mobileBrain) return undefined;
  const displayName = typeof user?.display_name === 'string' ? user.display_name.trim() : '';
  const name = typeof user?.name === 'string' ? user.name.trim() : '';
  return (displayName || name).slice(0, 120) || undefined;
}


/** Uses the same time-of-day translation keys as legacy mobile chat. */
export function mobileBrainGreeting(user, mobileBrain, t, hour = new Date().getHours()) {
  if (!mobileBrain) return undefined;
  const greeting = hour < 12 ? t('overview.morning', 'Good morning')
    : hour < 18 ? t('overview.afternoon', 'Good afternoon') : t('overview.evening', 'Good evening');
  const name = mobileBrainUserName(user, mobileBrain)?.split(/\s+/)[0];
  return name ? `${greeting}, ${name}` : greeting;
}
