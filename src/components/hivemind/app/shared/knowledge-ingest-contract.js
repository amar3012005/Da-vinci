export const KNOWLEDGE_CHANGED_EVENT = 'hm:knowledge-changed';

export function normalizeIngestMode(value) {
  return value === 'evidence' ? 'evidence' : 'both';
}

export function responseIngestMode(response) {
  const metadata = response?.metadata || {};
  return response?.ingestMode
    ?? response?.ingest_mode
    ?? metadata.ingestMode
    ?? metadata.ingest_mode
    ?? null;
}

export function documentIngestMode(document) {
  return document?.ingestMode
    ?? document?.ingest_mode
    ?? document?.metadata?.ingest_mode
    ?? document?.metadata?.ingestMode
    ?? null;
}

export function hasIngestModeMismatch(requestedMode, returnedMode, { requireReturned = false } = {}) {
  if (returnedMode == null) return requireReturned;
  if (returnedMode !== 'both' && returnedMode !== 'evidence') return true;
  return returnedMode !== normalizeIngestMode(requestedMode);
}

export function hasMemoryGenerationFailure(response) {
  return response?.memoryGenerationFailed === true
    || response?.memory_generation_failed === true
    || response?.promotionFailed === true
    || response?.promotion_failed === true
    || response?.evidenceOnlyReason === 'promotion_failed'
    || response?.evidence_only_reason === 'promotion_failed';
}

export function ingestFailureDetails(response) {
  const value = response?.error;
  return {
    message: typeof value === 'string'
      ? value
      : value?.message || response?.error_message || 'Ingestion failed',
    code: value?.code || 'INGEST_FAILED',
  };
}

export function documentIngestState({ ingestMode, evidenceOnly, memoryGenerationFailed, processing = false } = {}) {
  if (processing) return 'Processing';
  if (memoryGenerationFailed === true) return 'Memory generation failed';
  if (ingestMode === 'evidence' || evidenceOnly === true) return 'Evidence ready';
  if (ingestMode === 'both') return 'Memories + evidence ready';
  // A completed-looking record without the durable mode is ambiguous. Do not
  // invent a successful both-mode result from absent metadata.
  return 'Processing';
}

export function exactLayerCount(value) {
  const count = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isInteger(count) && count >= 0 ? count : null;
}

export function paginationTotal(response) {
  return exactLayerCount(response?.pagination?.total);
}

export function emitKnowledgeChanged() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(KNOWLEDGE_CHANGED_EVENT));
  } catch {
    // The mutation has already completed; a best-effort UI refresh cannot undo it.
  }
}

function quotaMetricLabel(value) {
  const raw = String(value || 'document pages').trim();
  if (!raw) return 'document pages';
  if (/^(kb[_ -]?pages?|document[_ -]?pages?|pages?)$/i.test(raw)) return 'document pages';
  return raw.replace(/[_-]+/g, ' ');
}

function isMachineQuotaMessage(value) {
  return /^(?:quota_reached|plan_limit_exceeded|limit_reached)$/i.test(String(value || '').trim());
}

export function uploadQuotaMessage(error) {
  const data = error?.response?.data || {};
  const metric = quotaMetricLabel(data.metric ?? data.resource);
  const current = exactLayerCount(data.current ?? data.current_usage ?? data.currentUsage ?? data.used ?? data.usage);
  const limit = exactLayerCount(data.limit ?? data.page_limit ?? data.pageLimit);
  const remaining = exactLayerCount(data.remaining ?? data.remaining_capacity ?? data.remainingCapacity)
    ?? (current != null && limit != null ? Math.max(0, limit - current) : null);
  const estimatedPages = exactLayerCount(data.estimated_pages ?? data.estimatedPages ?? data.requested_pages);
  const plan = data.plan ?? data.plan_name ?? data.tier ?? null;
  const details = [];

  if (current != null && limit != null) details.push(`${current}/${limit} ${metric} used`);
  else if (limit != null) details.push(`${metric} limit is ${limit}`);
  if (remaining != null) details.push(`${remaining} remaining`);
  if (estimatedPages != null) details.push(`${estimatedPages} page${estimatedPages === 1 ? '' : 's'} requested`);
  if (plan) details.push(`${plan} plan`);

  if (details.length) return `Upload not started - ${details.join('. ')}.`;

  const message = data.message || data.detail || data.error_description;
  if (message && !isMachineQuotaMessage(message)) return `Upload not started - ${message}`;
  return 'Upload not started - document page limit reached for this plan.';
}

export function evidenceCardTitle(evidence, fallbackTitle = 'Evidence') {
  const metadata = evidence?.metadata || {};
  const sourceTitle = metadata.source_title || evidence?.document?.title || fallbackTitle;
  const segmentOrdinal = metadata.segment_ordinal
    ?? metadata.segmentIndex
    ?? metadata.segment_index
    ?? evidence?.segment_ordinal
    ?? evidence?.segmentIndex
    ?? evidence?.segment_index
    ?? 'segment';
  return metadata.evidence_title || `${sourceTitle} : ${segmentOrdinal}`;
}

export function isKnowledgeEvidenceRow(evidence) {
  const metadata = evidence?.metadata || {};
  const segmentId = evidence?.segmentId || evidence?.segment_id || evidence?.id;
  const hasSegmentId = Boolean(evidence?.segmentId || evidence?.segment_id);
  const layer = String(evidence?.layer || metadata.layer || '').toLowerCase();
  const type = String(evidence?.type || evidence?.kind || evidence?.record_type || metadata.type || metadata.kind || '').toLowerCase();
  const hasEvidenceMarker = layer === 'evidence'
    || ['evidence_segment', 'knowledge_segment'].includes(type);
  const hasSegmentContent = [evidence?.content, evidence?.text, evidence?.excerpt, evidence?.snippet]
    .some((value) => value != null);
  const hasSegmentProvenance = metadata.segment_ordinal != null || metadata.evidence_title != null;
  return Boolean(segmentId) && (hasSegmentId || hasEvidenceMarker)
    && (hasSegmentContent || hasSegmentProvenance)
    && !['memory', 'cognitive', 'document'].includes(layer)
    && !['memory', 'cognitive', 'document'].includes(type);
}

const SENSITIVE_METADATA_KEY = /(?:^|[_-])(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|secret|password|credential|token)(?:$|[_-])/i;
const SAFE_API_KEY_REFERENCE = /^(?:api[_-]?key|key)[_-]?(?:id|record[_-]?id|fingerprint|prefix)$/i;

function sanitizeMetadataString(value) {
  return value
    .replace(/\b(?:sk|pk|rk|hm)_[A-Za-z0-9_-]{12,}\b/g, '[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._-]{12,}\b/gi, 'Bearer [redacted]')
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]');
}

export function sanitizeEvidenceMetadata(value, key = '') {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return SENSITIVE_METADATA_KEY.test(key) && !SAFE_API_KEY_REFERENCE.test(key)
    ? '[redacted]'
    : sanitizeMetadataString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeEvidenceMetadata(item, key));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      SENSITIVE_METADATA_KEY.test(childKey) && !SAFE_API_KEY_REFERENCE.test(childKey)
        ? '[redacted]'
        : sanitizeEvidenceMetadata(childValue, childKey),
    ]));
  }
  return String(value);
}
