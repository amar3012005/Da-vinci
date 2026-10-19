const fs = require('fs');
const path = require('path');
const vm = require('vm');

function worker(origin = 'https://example.test') {
  const handlers = {};
  const puts = [];
  const fetch = jest.fn(async () => response());
  const caches = { open: async () => ({ put: (...args) => puts.push(args) }), match: async () => undefined };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf8'), {
    self: { location: { origin }, addEventListener: (kind, handler) => { handlers[kind] = handler; } },
    URL, Response: class { constructor(body, options) { Object.assign(this, options); this.body = body; } }, fetch, caches,
  });
  return { fetch, puts, dispatch: async (pathname, mode = 'cors') => {
    let result;
    handlers.fetch({ request: { method: 'GET', url: `${origin}${pathname}`, mode }, respondWith: value => { result = value; } });
    const value = await result;
    await Promise.resolve();
    return value;
  } };
}
function response(type = 'application/javascript', policy = 'public, max-age=31536000, immutable', status = 200) {
  return { status, type: 'basic', headers: { get: key => key === 'content-type' ? type : policy }, clone() { return this; } };
}
const combo = '/plugins/??@deepseek-ai/dsh-client-modules/client.js&rev=c5ac06ee9d77';

test('revisioned native code honors HTTP cache without storing it in CacheStorage', async () => {
  const sw = worker();
  await sw.dispatch(combo);
  await sw.dispatch('/assets/harness-shell.js?rev=d75fb8502ef2');
  expect(sw.fetch.mock.calls.every(([, options]) => options.cache === 'default')).toBe(true);
  expect(sw.puts).toEqual([]);
});

test('private boot, APIs and live plugin events bypass the service worker', async () => {
  const sw = worker();
  for (const url of ['/api/history', '/v1/session', '/__hivemind/native/boot', '/plugins/events', '/plugins/??@deepseek-ai/a/client.js']) await sw.dispatch(url);
  expect(sw.fetch).not.toHaveBeenCalled();
  expect(sw.puts).toEqual([]);
});

test('unversioned code and navigation revalidate', async () => {
  const sw = worker();
  await sw.dispatch('/assets/harness-shell.js');
  await sw.dispatch('/hivemind/app/overview', 'navigate');
  expect(sw.fetch.mock.calls.every(([, options]) => options.cache === 'reload')).toBe(true);
});

test('HTML fallthrough cannot become executable code or enter CacheStorage', async () => {
  const sw = worker();
  sw.fetch.mockResolvedValue(response('text/html'));
  expect((await sw.dispatch(combo)).status).toBe(404);
  expect(sw.puts).toEqual([]);
});

test('Runtime recovers an HTML-poisoned native module cache once', async () => {
  const sw = worker('https://runtime-runner.singulancelabs.com');
  sw.fetch.mockResolvedValueOnce(response('text/html')).mockResolvedValueOnce(response());
  expect((await sw.dispatch(combo)).status).toBe(200);
  expect(sw.fetch.mock.calls.map(([, options]) => options.cache)).toEqual(['default', 'reload']);
  expect(sw.puts).toEqual([]);
});

test('Runtime still rejects HTML after revalidation and does not cache it', async () => {
  const sw = worker('https://runtime-runner.singulancelabs.com');
  sw.fetch.mockResolvedValue(response('text/html'));
  expect((await sw.dispatch(combo)).status).toBe(404);
  expect(sw.fetch).toHaveBeenCalledTimes(2);
  expect(sw.puts).toEqual([]);
});

test('Brain module cache behavior is unchanged', async () => {
  const sw = worker('https://next.singulancelabs.com');
  sw.fetch.mockResolvedValue(response('text/html'));
  expect((await sw.dispatch(combo)).status).toBe(404);
  expect(sw.fetch).toHaveBeenCalledTimes(1);
});

test('private responses, authorization denials and missing assets are never stored', async () => {
  const sw = worker();
  for (const value of [response('application/javascript', 'private'), response('application/javascript', 'no-store'), response('application/javascript', 'public', 401), response('application/javascript', 'public', 404)]) {
    sw.fetch.mockResolvedValue(value);
    await sw.dispatch('/static/js/main.00d00641.js');
  }
  expect(sw.puts).toEqual([]);
});


test('versioned webpack entry and lazy JS/CSS chunks use the immutable HTTP cache', async () => {
  const sw = worker('https://next.singulancelabs.com');
  for (const url of ['/static/js/main.afcd8239.js', '/static/js/6834.3d543aa0.chunk.js', '/static/css/1462.637a19a2.chunk.css']) {
    await sw.dispatch(url);
    expect(sw.fetch.mock.calls[sw.fetch.mock.calls.length - 1][1].cache).toBe('default');
  }
  await sw.dispatch('/static/js/unversioned.chunk.js');
  expect(sw.fetch.mock.calls[sw.fetch.mock.calls.length - 1][1].cache).toBe('reload');
});
