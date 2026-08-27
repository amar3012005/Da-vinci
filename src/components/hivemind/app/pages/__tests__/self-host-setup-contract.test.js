import { buildInstallCommand, normalizeConnectionState } from '../SelfHostSetup';

describe('self-host setup contract', () => {
  test('builds one organization enrollment command without a general API key', () => {
    const command = buildInstallCommand("enroll_'org");
    expect(command).toContain('https://get.singulancelabs.com/memory-box');
    expect(command).toContain('sudo env HIVEMIND_ENROLLMENT_TOKEN=');
    expect(command).toContain('HIVEMIND_CENTRAL_URL=');
    expect(command).not.toContain('HIVEMIND_API_KEY=');
    expect(command).not.toContain('git clone');
  });

  test.each([
    [{ state: 'installing' }, 'INSTALLING'],
    [{ status: 'registered' }, 'CONNECTING'],
    [{ registered: true }, 'CONNECTING'],
    [{ reachable: true }, 'READY'],
    [{ state: 'degraded', reachable: false }, 'DEGRADED'],
    [{ state: 'offline' }, 'OFFLINE'],
    [{ state: 'update-required' }, 'UPDATE_REQUIRED'],
    [{}, 'WAITING'],
  ])('normalizes backend connection state %#', (payload, expected) => {
    expect(normalizeConnectionState(payload)).toBe(expected);
  });
});
