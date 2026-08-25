export function normalizeIngestMode(value) {
  return value === 'evidence' ? 'evidence' : 'both';
}

export function hasIngestModeMismatch(requestedMode, returnedMode) {
  if (returnedMode == null) return false;
  if (returnedMode !== 'both' && returnedMode !== 'evidence') return true;
  return returnedMode !== normalizeIngestMode(requestedMode);
}

export function documentIngestState({ ingestMode, evidenceOnly, memoryGenerationFailed, processing = false } = {}) {
  if (processing) return 'Processing';
  if (normalizeIngestMode(ingestMode) === 'evidence' || evidenceOnly === true) return 'Evidence ready';
  if (memoryGenerationFailed === true) return 'Memory generation failed';
  return 'Memories + evidence ready';
}

export function exactLayerCount(value) {
  const count = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isInteger(count) && count >= 0 ? count : null;
}

export function uploadQuotaMessage(error) {
  const data = error?.response?.data || {};
  const message = data.message || data.detail || data.error_description;
  if (message) return message;
  const resource = data.resource || 'this upload';
  const limit = exactLayerCount(data.limit);
  const current = exactLayerCount(data.current);
  if (limit != null && current != null) return `${resource} limit reached (${current}/${limit}).`;
  return 'Upload limit reached for this plan.';
}
