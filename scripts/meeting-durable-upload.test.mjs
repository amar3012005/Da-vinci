import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createChunkUploader, createMemoryChunkStore, pendingChunks, waitForFinalization,
  shouldFallBackToBrowserTranscription, describeFinalizationFailure,
} from '../src/components/hivemind/app/shared/meetingDurableUpload.mjs';

const noSleep = async () => {};
const httpError = (status, error) => Object.assign(new Error(`http ${status}`), { response: { status, data: { error } } });
const blob = { type: 'audio/webm', size: 4096 };

test('a chunk is stored, uploaded with its timing, then removed from the store', async () => {
  const store = createMemoryChunkStore();
  const calls = [];
  const up = createChunkUploader({ sessionId: 'sid', store, sleep: noSleep, post: async (url, body, config) => { calls.push({ url, config }); return { status: 202 }; } });
  const outcome = await up.enqueue(0, blob, { startMs: 0, endMs: 60000 });
  assert.equal(outcome.ok, true);
  assert.equal(calls[0].url, '/api/meetings/sessions/sid/audio/0?start_ms=0&end_ms=60000');
  assert.equal(calls[0].config.headers['Content-Type'], 'audio/webm');
  assert.deepEqual(await pendingChunks(store), []);
});

test('transient failures are retried, then the chunk uploads', async () => {
  let n = 0;
  const up = createChunkUploader({ sessionId: 'sid', sleep: noSleep, post: async () => { n += 1; if (n < 3) throw httpError(503); return { status: 202 }; } });
  assert.equal((await up.enqueue(1, blob)).ok, true);
  assert.equal(n, 3);
});

test('a network outage that outlasts the retry budget keeps the chunk for the next page load', async () => {
  const store = createMemoryChunkStore();
  const up = createChunkUploader({ sessionId: 'sid', store, sleep: noSleep, post: async () => { throw new Error('offline'); } });
  const outcome = await up.enqueue(2, blob);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.retriesExhausted, true);
  assert.equal((await pendingChunks(store)).length, 1);
  assert.deepEqual((await up.settle()).failed, [2]);
});

test('a server that cannot store audio durably sends the chunk to browser transcription instead of failing', async () => {
  const up = createChunkUploader({ sessionId: 'sid', sleep: noSleep, post: async () => { throw httpError(503, 'meeting_audio_store_not_durable'); } });
  const outcome = await up.enqueue(0, blob);
  assert.equal(outcome.fallback, true);
  assert.equal(shouldFallBackToBrowserTranscription(httpError(413)), true);
  assert.equal(shouldFallBackToBrowserTranscription(httpError(500)), false);
});

test('a permanent rejection is not retried', async () => {
  let n = 0;
  const up = createChunkUploader({ sessionId: 'sid', sleep: noSleep, post: async () => { n += 1; throw httpError(409, 'audio_segment_conflict'); } });
  const outcome = await up.enqueue(0, blob);
  assert.equal(outcome.ok, false);
  assert.equal(n, 1);
});

test('finalization polling returns the meeting, a failure code, or a timeout', async () => {
  const seq = [
    { session: { status: 'queued' } },
    { session: { status: 'analyzing' } },
    { session: { status: 'ready', finalized_meeting_id: 'm1' } },
  ];
  const ready = await waitForFinalization({ sessionId: 's', sleep: noSleep, get: async () => ({ data: seq.shift() }) });
  assert.deepEqual(ready, { state: 'ready', meetingId: 'm1' });

  const failed = await waitForFinalization({ sessionId: 's', sleep: noSleep, get: async () => ({ data: { session: { status: 'failed', failure_code: 'transcript_too_thin', failure_detail: 'Only 1 word' } } }) });
  assert.deepEqual(failed, { state: 'failed', code: 'transcript_too_thin', detail: 'Only 1 word' });

  let t = 0;
  const realNow = Date.now;
  Date.now = () => (t += 600000);
  try {
    const timeout = await waitForFinalization({ sessionId: 's', sleep: noSleep, timeoutMs: 1000000, get: async () => ({ data: { session: { status: 'analyzing' } } }) });
    assert.equal(timeout.state, 'timeout');
  } finally { Date.now = realNow; }
});

test('polling survives a few failed requests', async () => {
  let n = 0;
  const result = await waitForFinalization({ sessionId: 's', sleep: noSleep, get: async () => { n += 1; if (n < 4) throw httpError(502); return { data: { session: { status: 'ready', finalized_meeting_id: 'm2' } } }; } });
  assert.equal(result.state, 'ready');
});

test('failure messages are specific for the thin-transcript case', () => {
  assert.match(describeFinalizationFailure({ code: 'transcript_too_thin', detail: '' }), /Almost no speech/);
  assert.match(describeFinalizationFailure({ code: 'transcription_failed' }), /Retry/);
});
