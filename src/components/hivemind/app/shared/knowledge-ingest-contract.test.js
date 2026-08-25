import {
  documentIngestState,
  exactLayerCount,
  hasIngestModeMismatch,
  normalizeIngestMode,
  uploadQuotaMessage,
} from './knowledge-ingest-contract';

describe('knowledge ingest frontend contract', () => {
  test('keeps the selected ingest mode exact for every queued request', () => {
    expect(normalizeIngestMode('evidence')).toBe('evidence');
    expect(normalizeIngestMode('both')).toBe('both');
    expect(hasIngestModeMismatch('both', 'evidence')).toBe(true);
    expect(hasIngestModeMismatch('evidence', 'evidence')).toBe(false);
    expect(hasIngestModeMismatch('both', 'unexpected')).toBe(true);
  });

  test('uses deterministic document state labels', () => {
    expect(documentIngestState({ ingestMode: 'evidence' })).toBe('Evidence ready');
    expect(documentIngestState({ ingestMode: 'both' })).toBe('Memories + evidence ready');
    expect(documentIngestState({ ingestMode: 'both', memoryGenerationFailed: true })).toBe('Memory generation failed');
    expect(documentIngestState({ processing: true })).toBe('Processing');
  });

  test('accepts only exact non-negative integer layer totals', () => {
    expect(exactLayerCount('12')).toBe(12);
    expect(exactLayerCount(0)).toBe(0);
    expect(exactLayerCount(1.5)).toBeNull();
    expect(exactLayerCount(undefined)).toBeNull();
  });

  test('uses the server quota response in the terminal upload row', () => {
    expect(uploadQuotaMessage({ response: { data: { message: 'Monthly document page limit reached.' } } }))
      .toBe('Monthly document page limit reached.');
  });
});
