// Durable capture for AI Meeting Notes.
//
// Each recorded chunk is written to IndexedDB, then uploaded to the server's
// durable audio route (POST /api/meetings/sessions/:sid/audio/:idx). The server
// stores the bytes, transcribes them in a leased worker, and finalizes the meeting
// on its own, so closing the tab or losing the network after a chunk is uploaded
// does not lose it, and a chunk that could not be uploaded is retried from
// IndexedDB the next time the page opens.
//
// Pure of browser globals at import time: `post`, `get`, `sleep` and the chunk
// `store` are injected so the retry and polling rules are testable under node.

export const DURABLE_SEGMENT_MS = 60 * 1000;

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 30000];
const PERMANENT_STATUSES = new Set([400, 401, 403, 404, 409, 413, 415]);

/** HTTP status of an axios-style error, or 0 for a network error. */
function statusOf(error) {
  return Number(error?.response?.status || 0);
}

/**
 * True when the server cannot take this chunk now or ever (store not durable,
 * unsupported type, too large). The page then transcribes that chunk in the
 * browser as before, so the recording is not lost.
 */
export function shouldFallBackToBrowserTranscription(error) {
  const status = statusOf(error);
  const code = String(error?.response?.data?.error || '');
  return status === 413 || status === 415 || code === 'meeting_audio_store_not_durable' || code === 'audio_unsupported';
}

/** IndexedDB-backed chunk store; every method resolves instead of throwing. */
export function createIndexedDbChunkStore(indexedDBImpl = globalThis.indexedDB) {
  const DB = 'hm-meeting-chunks';
  const STORE = 'chunks';
  let dbPromise = null;
  const open = () => {
    if (!indexedDBImpl) return Promise.resolve(null);
    if (!dbPromise) {
      dbPromise = new Promise((resolve) => {
        try {
          const request = indexedDBImpl.open(DB, 1);
          request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null); // storage blocked (private window): uploads still work, only crash recovery is lost
        } catch { resolve(null); }
      });
    }
    return dbPromise;
  };
  const run = async (mode, work, fallback) => {
    const db = await open();
    if (!db) return fallback;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, mode);
        const result = work(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(result && 'result' in result ? result.result : fallback);
        tx.onerror = () => resolve(fallback);
        tx.onabort = () => resolve(fallback);
      } catch { resolve(fallback); }
    });
  };
  return {
    put: (record) => run('readwrite', (store) => { store.put({ ...record, key: `${record.sessionId}:${record.idx}` }); }, undefined),
    remove: (sessionId, idx) => run('readwrite', (store) => { store.delete(`${sessionId}:${idx}`); }, undefined),
    list: () => run('readonly', (store) => store.getAll(), []),
  };
}

/** In-memory chunk store for tests and when IndexedDB is unavailable. */
export function createMemoryChunkStore() {
  const rows = new Map();
  return {
    put: async (record) => { rows.set(`${record.sessionId}:${record.idx}`, record); },
    remove: async (sessionId, idx) => { rows.delete(`${sessionId}:${idx}`); },
    list: async () => [...rows.values()],
  };
}

/**
 * Upload queue for one meeting session.
 * @param {{post: Function, sessionId: string, store?: object, sleep?: Function}} deps
 *   `post(url, body, config)` has axios semantics (rejects with error.response.status).
 */
export function createChunkUploader({ post, sessionId, store = createMemoryChunkStore(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const inFlight = new Set();
  const results = new Map(); // idx -> { ok: true } | { ok: false, error, fallback }

  async function uploadWithRetry(idx, blob, meta) {
    let lastError = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        await post(
          `/api/meetings/sessions/${sessionId}/audio/${idx}?start_ms=${Math.max(0, Math.round(meta.startMs || 0))}&end_ms=${Math.max(0, Math.round(meta.endMs || 0))}`,
          blob,
          { headers: { 'Content-Type': meta.contentType || blob.type || 'audio/webm' }, timeout: 120000 },
        );
        return { ok: true };
      } catch (error) {
        lastError = error;
        if (shouldFallBackToBrowserTranscription(error)) return { ok: false, error, fallback: true };
        if (PERMANENT_STATUSES.has(statusOf(error))) return { ok: false, error, fallback: false };
        if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
    return { ok: false, error: lastError, fallback: false, retriesExhausted: true };
  }

  return {
    /**
     * Persist then upload one chunk. Resolves with the outcome; it never rejects.
     * The chunk stays in the store until the server accepted it, so an exhausted
     * retry budget (offline) is picked up by resume() on the next page load.
     */
    enqueue(idx, blob, meta = {}) {
      const task = (async () => {
        await store.put({ sessionId, idx, blob, ...meta });
        const outcome = await uploadWithRetry(idx, blob, meta);
        if (outcome.ok || outcome.fallback) await store.remove(sessionId, idx);
        results.set(idx, outcome);
        return outcome;
      })();
      inFlight.add(task);
      task.finally(() => inFlight.delete(task));
      return task;
    },
    /** Resolves when every chunk queued so far has settled. */
    async settle() {
      while (inFlight.size) await Promise.allSettled([...inFlight]);
      const failed = [...results.entries()].filter(([, r]) => !r.ok && !r.fallback).map(([idx]) => idx);
      return { uploaded: [...results.values()].filter((r) => r.ok).length, failed };
    },
    results,
    store,
  };
}

/** Chunks left in the store by an earlier page load (tab crash, offline). */
export async function pendingChunks(store) {
  const rows = await store.list();
  return (rows || []).filter((row) => row && row.blob && typeof row.idx === 'number');
}

/**
 * Poll the session until the server finalized the meeting or gave up.
 * @returns {Promise<{state:'ready',meetingId:string}|{state:'failed',code:string,detail:string}|{state:'timeout'}>}
 */
export async function waitForFinalization({ get, sessionId, intervalMs = 3000, timeoutMs = 20 * 60 * 1000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), onStatus = () => {} }) {
  const started = Date.now();
  let consecutiveErrors = 0;
  while (Date.now() - started < timeoutMs) {
    try {
      const { data } = await get(`/api/meetings/sessions/${sessionId}`);
      consecutiveErrors = 0;
      const session = data?.session || {};
      onStatus(session, data?.segments || {});
      if (session.finalized_meeting_id && session.status === 'ready') return { state: 'ready', meetingId: session.finalized_meeting_id };
      if (session.status === 'failed') {
        return { state: 'failed', code: session.failure_code || 'finalization_failed', detail: session.failure_detail || '' };
      }
    } catch (error) {
      consecutiveErrors += 1;
      if (statusOf(error) === 404) return { state: 'failed', code: 'not_found', detail: 'The meeting session no longer exists.' };
      if (consecutiveErrors > 20) return { state: 'timeout' };
    }
    await sleep(intervalMs);
  }
  return { state: 'timeout' };
}

/** Plain-language text for a server failure code. */
export function describeFinalizationFailure({ code, detail }) {
  if (code === 'transcript_too_thin') return detail || 'Almost no speech was captured. Check that the meeting audio and your microphone are shared, then record again.';
  if (code === 'transcription_failed') return 'The recording could not be transcribed after several tries. Press Retry to try again; the audio is still saved.';
  if (code === 'credits_exhausted') return 'Your monthly meeting allowance is used up.';
  return detail || 'The meeting could not be finished. Press Retry to try again.';
}
