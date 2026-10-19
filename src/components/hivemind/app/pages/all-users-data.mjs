export function activeUserOrganizations(user) {
  const unique = new Map();
  for (const membership of user.organizations || []) if (membership.isActive && membership.org?.id) unique.set(membership.org.id, membership.org);
  return [...unique.values()];
}
export function userUsageFromAccount(detail, userId) {
  const rows = detail?.attribution?.by_user;
  if (!Array.isArray(rows)) return null;
  const row = rows.find(item => item.user_id === userId);
  return row || { calls: '0', prompt_tokens: '0', completion_tokens: '0', total_cost_micros: '0' };
}
export function creditAllowancePatch(settings, orgId, allowance, reason) {
  if (!settings || settings.organization?.id !== orgId || !Number.isSafeInteger(settings.revision)) throw new Error('Reload this organization before saving.');
  const value = String(allowance).trim();
  const amount = value === '' ? null : Number(value);
  if (value !== '' && (!/^-?\d+$/.test(value) || !Number.isSafeInteger(amount) || amount < -1)) throw new Error('Use a whole number, -1 for unlimited, or leave blank to follow the plan.');
  if (reason.trim().length < 3 || reason.trim().length > 500) throw new Error('Provide a reason between 3 and 500 characters.');
  return { revision: settings.revision, limits: { monthlyCredits: amount }, reason: reason.trim() };
}
