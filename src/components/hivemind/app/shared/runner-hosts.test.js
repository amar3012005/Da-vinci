import { isRunnerHost } from './runner-hosts';
import apiClient from './api-client';

test('Runtime and the Company Brain page use the same-origin session endpoints; other hosts do not', () => {
  for (const host of ['runtime-runner.singulancelabs.com', 'brain-runner.singulancelabs.com']) expect(isRunnerHost(host)).toBe(true);
  for (const host of ['next.singulancelabs.com', 'dots.singulancelabs.com', 'brain-runner.singulancelabs.com.evil.test', '']) expect(isRunnerHost(host)).toBe(false);
});

describe('bootstrap on the Company Brain page', () => {
  const original = window.location;
  afterEach(() => { Object.defineProperty(window, 'location', { configurable: true, value: original }); });
  const bootstrapOn = async hostname => {
    Object.defineProperty(window, 'location', { configurable: true, value: { hostname, origin: `https://${hostname}`, pathname: '/', search: '' } });
    const get = jest.spyOn(apiClient.controlPlane, 'get').mockResolvedValue({ data: { authenticated: true, user: { id: 'u' }, organization: { id: 'o' } } });
    try { await apiClient.bootstrap(); return get.mock.calls[0]; } finally { get.mockRestore(); }
  };
  test('asks the Worker on its own origin, so the session is recognised', async () => {
    const [url, options] = await bootstrapOn('brain-runner.singulancelabs.com');
    expect(url).toBe('/__hivemind/bootstrap');
    expect(options.baseURL).toBe('https://brain-runner.singulancelabs.com');
  });
  test('Runtime keeps the same path and the Brain host still uses the control plane', async () => {
    expect((await bootstrapOn('runtime-runner.singulancelabs.com'))[0]).toBe('/__hivemind/bootstrap');
    expect((await bootstrapOn('next.singulancelabs.com'))[0]).toBe('/v1/bootstrap');
  });
});
