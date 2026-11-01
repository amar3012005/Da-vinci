import apiClient from './api-client';
import { proxyReadsBlocked } from './runner-hosts';
import { fetchUsage } from './useUsage';
import { probeWebAdmin, resetWebAdminProbe } from './web-admin-probe';

const original = window.location;
const on = hostname => Object.defineProperty(window, 'location', { configurable: true, value: { hostname, origin: `https://${hostname}`, pathname: '/', search: '' } });
afterEach(() => { Object.defineProperty(window, 'location', { configurable: true, value: original }); jest.restoreAllMocks(); resetWebAdminProbe(); });

test('only the Company Brain runner host skips control-plane proxy reads', () => {
  expect(proxyReadsBlocked('brain-runner.singulancelabs.com')).toBe(true);
  for (const host of ['next.singulancelabs.com', 'runtime-runner.singulancelabs.com', 'brain-runner.singulancelabs.com.evil.test']) expect(proxyReadsBlocked(host)).toBe(false);
});

describe('on brain-runner', () => {
  beforeEach(() => on('brain-runner.singulancelabs.com'));
  test('usage and admin metrics make no cross-origin request', async () => {
    const get = jest.spyOn(apiClient.controlPlane, 'get').mockResolvedValue({ data: {} });
    expect(await apiClient.getUsage()).toBeNull();
    await expect(apiClient.getWebAdminMetrics()).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });
  test('the admin probe answers false without a request', async () => {
    const get = jest.spyOn(apiClient.controlPlane, 'get').mockResolvedValue({ data: {} });
    expect(await probeWebAdmin()).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });
});

describe('on the main app', () => {
  beforeEach(() => on('next.singulancelabs.com'));
  test('usage and admin metrics still call the control plane', async () => {
    const get = jest.spyOn(apiClient.controlPlane, 'get').mockResolvedValue({ data: { ok: 1 } });
    expect(await apiClient.getUsage()).toEqual({ ok: 1 });
    await apiClient.getWebAdminMetrics();
    expect(get.mock.calls.map(c => c[0])).toEqual(['/v1/proxy/billing/usage', '/v1/proxy/web/admin/metrics']);
  });
  test('a failing admin probe is shared by remounts and retried only after a pause', async () => {
    const metrics = jest.spyOn(apiClient, 'getWebAdminMetrics').mockRejectedValue(new Error('cors'));
    await Promise.all([probeWebAdmin(), probeWebAdmin(), probeWebAdmin()]);
    await probeWebAdmin(); await probeWebAdmin();
    expect(metrics).toHaveBeenCalledTimes(1);
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 301000);
    await probeWebAdmin();
    expect(metrics).toHaveBeenCalledTimes(2);
  });
  test('failed usage reads back off instead of retrying on every trigger', async () => {
    const get = jest.spyOn(apiClient, 'getUsage').mockRejectedValue(new Error('cors'));
    await fetchUsage(true); await fetchUsage(true); await fetchUsage(true);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
