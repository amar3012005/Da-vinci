import test from 'node:test';
import assert from 'node:assert/strict';
import { hedgedFetch } from './hedged-fetch.mjs';

const delayed = (ms, value, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => resolve(value), ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')); });
});

test('a fast first response wins without a second attempt', async () => {
  let calls = 0;
  const response = await hedgedFetch('https://x/', {}, 50, async () => { calls += 1; return new Response('one'); });
  assert.equal(await response.text(), 'one');
  assert.equal(calls, 1);
});

test('a stalled first attempt is hedged and the slower one is aborted', async () => {
  const signals = [];
  const response = await hedgedFetch('https://x/', {}, 20, (_url, init) => {
    signals.push(init.signal);
    return signals.length === 1 ? delayed(1000, new Response('slow'), init.signal) : delayed(5, new Response('fast'), init.signal);
  });
  assert.equal(await response.text(), 'fast');
  assert.equal(signals.length, 2);
  assert.equal(signals[0].aborted, true);
});

test('a failed first attempt retries at once; both failing rejects', async () => {
  let calls = 0;
  const ok = await hedgedFetch('https://x/', {}, 10000, async () => { calls += 1; if (calls === 1) throw new Error('reset'); return new Response('second'); });
  assert.equal(await ok.text(), 'second');
  await assert.rejects(hedgedFetch('https://x/', {}, 10000, async () => { throw new Error('down'); }), /down/);
});

test('a caller abort rejects without hedging', async () => {
  const caller = new AbortController();
  let calls = 0;
  const pending = hedgedFetch('https://x/', { signal: caller.signal }, 10000, (_url, init) => { calls += 1; return delayed(1000, new Response('late'), init.signal); });
  caller.abort();
  await assert.rejects(pending, /aborted/);
  assert.equal(calls, 1);
});
