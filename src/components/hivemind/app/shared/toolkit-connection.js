/**
 * Connection state of one toolkit card, from the Core listing fields
 * (`connection_status`: connected | reconnect | available, `connection_origin`:
 * personal | workspace). Core applies one rule for every surface: the ACTIVE
 * account, personal first and newest when both exist; expired-only is
 * reconnect. An older Core response without the fields falls back to
 * `connected`.
 * @param {object} toolkit item from GET /v1/connectors/composio/toolkits
 * @param {'connected'|'disconnected'|undefined} override result of an action taken on this page
 * @returns {'connected'|'reconnect'|'available'}
 */
export function toolkitConnectionState(toolkit, override) {
  if (override === 'disconnected') return 'available';
  if (override === 'connected') return 'connected';
  if (toolkit?.connection_status === 'connected' || toolkit?.connection_status === 'reconnect') return toolkit.connection_status;
  return toolkit?.connected ? 'connected' : 'available';
}

/** Short label for where the chosen account lives, or '' when unknown. */
export function toolkitOriginLabel(toolkit) {
  return toolkit?.connection_origin === 'workspace' ? 'Workspace' : toolkit?.connection_origin === 'personal' ? 'Personal' : '';
}
