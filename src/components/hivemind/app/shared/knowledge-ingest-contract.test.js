import {
  documentIngestMode,
  documentIngestState,
  evidenceCardTitle,
  exactLayerCount,
  hasIngestModeMismatch,
  isKnowledgeEvidenceRow,
  normalizeIngestMode,
  paginationTotal,
  responseIngestMode,
  sanitizeEvidenceMetadata,
  uploadQuotaMessage,
} from './knowledge-ingest-contract';

describe('knowledge ingest frontend contract', () => {
  test('keeps the selected ingest mode exact for every queued request', () => {
    expect(normalizeIngestMode('evidence')).toBe('evidence');
    expect(normalizeIngestMode('both')).toBe('both');
    expect(hasIngestModeMismatch('both', 'evidence')).toBe(true);
    expect(hasIngestModeMismatch('evidence', 'evidence')).toBe(false);
    expect(hasIngestModeMismatch('both', 'unexpected')).toBe(true);
    expect(hasIngestModeMismatch('both', null, { requireReturned: true })).toBe(true);
    expect(responseIngestMode({ metadata: { ingest_mode: 'evidence' } })).toBe('evidence');
  });

  test('uses deterministic document state labels', () => {
    expect(documentIngestState({ ingestMode: 'evidence' })).toBe('Evidence ready');
    expect(documentIngestState({ ingestMode: 'both' })).toBe('Memories + evidence ready');
    expect(documentIngestState({ ingestMode: 'both', memoryGenerationFailed: true })).toBe('Memory generation failed');
    expect(documentIngestState({ processing: true })).toBe('Processing');
    expect(documentIngestState({})).toBe('Processing');
    expect(documentIngestMode({ metadata: { ingest_mode: 'evidence' } })).toBe('evidence');
  });

  test('accepts only exact non-negative integer layer totals', () => {
    expect(exactLayerCount('12')).toBe(12);
    expect(exactLayerCount(0)).toBe(0);
    expect(exactLayerCount(1.5)).toBeNull();
    expect(exactLayerCount(undefined)).toBeNull();
    expect(paginationTotal({ pagination: { total: 12 } })).toBe(12);
    expect(paginationTotal({ total: 12 })).toBeNull();
  });

  test('uses structured quota data in a terminal upload row', () => {
    expect(uploadQuotaMessage({ response: { data: {
      error: 'quota_reached',
      metric: 'kb_pages',
      current: 100,
      limit: 100,
      remaining: 0,
      estimated_pages: 4,
      plan: 'starter',
    } } }))
      .toBe('Upload not started - 100/100 document pages used. 0 remaining. 4 pages requested. starter plan.');
  });

  test('keeps only evidence rows and never leaks credential metadata', () => {
    const evidence = {
      segment_id: 'segment-1',
      document: { title: 'Handbook' },
      metadata: {
        evidence_title: 'Security policy excerpt',
        source_title: 'Handbook',
        segment_ordinal: 7,
        api_key: 'hm_abcdefghijklmnop',
        api_key_id: 'key-record-1',
        nested: { authorization: 'Bearer abcdefghijklmnop' },
      },
    };
    expect(isKnowledgeEvidenceRow(evidence)).toBe(true);
    expect(isKnowledgeEvidenceRow({ id: 'memory-1', layer: 'memory' })).toBe(false);
    expect(isKnowledgeEvidenceRow({ id: 'unrelated-1', content: 'not a segment' })).toBe(false);
    expect(evidenceCardTitle(evidence)).toBe('Security policy excerpt');
    expect(evidenceCardTitle({
      document: { title: 'Fallback document' },
      metadata: { source_title: 'Handbook', segment_ordinal: 7 },
    })).toBe('Handbook : 7');
    expect(sanitizeEvidenceMetadata(evidence.metadata)).toEqual({
      evidence_title: 'Security policy excerpt',
      source_title: 'Handbook',
      segment_ordinal: 7,
      api_key: '[redacted]',
      api_key_id: 'key-record-1',
      nested: { authorization: '[redacted]' },
    });
  });
});
