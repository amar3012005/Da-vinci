const SETUP_FAILURE = 'This reply could not start because the agent session failed during setup. Try sending again or start a new WorkRun.';
const GENERIC_FAILURE = 'This reply did not complete. Try sending again or start a new WorkRun.';

// Persisted runner errors can include private provider/tool details. Keep the
// transcript useful without exposing raw internals or rendering an empty turn.
export function persistedAssistantFailure(message) {
  if (!message || message.role === 'user') return '';
  const errorType = String(message.error?.type || '').toLowerCase();
  const reason = String(message.finished_reason || '').toLowerCase();
  if (errorType === 'setup') return SETUP_FAILURE;
  if (message.error || ['error', 'failed'].includes(reason)) return GENERIC_FAILURE;
  return '';
}
