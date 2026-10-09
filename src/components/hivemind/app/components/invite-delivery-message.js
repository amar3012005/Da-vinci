/** Saved invite and provider acceptance are separate from confirmed inbox delivery. */
export function inviteDeliveryMessage(dispatch, expiresAt) {
  const expiration = expiresAt ? ' Check the invitation expiry below.' : '';
  if (dispatch?.ok === true) return `Email accepted for delivery.${expiration}`;
  if (dispatch?.pending === true) return `Invitation saved; email is queued. Delivery is not confirmed.${expiration}`;
  if (dispatch?.attempted === true) return 'Invitation saved, but email delivery failed. You can copy the link or retry.';
  return 'Link ready to share; no email delivery is confirmed.';
}
