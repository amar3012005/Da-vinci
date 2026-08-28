import { ADVANCED_SELFHOST_SCOPES, buildAdvancedInstallCommand, buildInstallCommand, canUseCanaryFallback, connectionPollDelay, connectionProgress, enrollmentErrorMessage, normalizeConnectionState } from '../SelfHostSetup';

describe('self-host setup contract', () => {
  test('builds one organization enrollment command without a general API key', () => {
    const command = buildInstallCommand("enroll_'org");
    expect(command).toContain('https://get.singulancelabs.com/memory-box');
    expect(command).toContain('sudo env HIVEMIND_ENROLLMENT_TOKEN=');
    expect(command).toContain('HIVEMIND_CENTRAL_URL=');
    expect(command).toContain('curl -fsSL');
    expect(command).toContain('| sudo env');
    expect(command).not.toContain('HIVEMIND_API_KEY=');
    expect(command).not.toContain('git clone');
  });

  test('canary enrollment is explicit in the command and never changes the stable default', () => {
    const command = buildInstallCommand('canary-token', 'canary');
    expect(command).toContain('HIVEMIND_MEMORY_BOX_CHANNEL=canary');
    expect(buildInstallCommand('stable-token')).not.toContain('HIVEMIND_MEMORY_BOX_CHANNEL=canary');
  });

  test('canary fallback requires an explicit server eligibility signal', () => {
    expect(canUseCanaryFallback({ response: { data: { code: 'memory_box_automatic_setup_unavailable' } } })).toBe(false);
    expect(canUseCanaryFallback({ response: { data: { canary_eligible: true } } })).toBe(true);
  });

  test('ordinary users see actionable enrollment errors without canary policy details', () => {
    expect(enrollmentErrorMessage({ response: { status: 503, data: { code: 'memory_box_automatic_setup_unavailable', error: 'canary_not_allowlisted' } } }))
      .toBe('Automatic setup is temporarily unavailable. You can retry shortly or use the advanced connection option below.');
    expect(enrollmentErrorMessage({ response: { status: 403, data: { error: 'canary policy denied' } } }))
      .toBe('Organization administrator access is required to create a Memory Box connection.');
  });

  test('advanced setup uses the same signed installer instead of a mutable branch', () => {
    const command = buildAdvancedInstallCommand('hmk_live_test');
    expect(command).toContain('https://get.singulancelabs.com/memory-box');
    expect(command).toContain('sudo env HIVEMIND_API_KEY=');
    expect(command).toContain('curl -fsSL');
    expect(command).not.toContain('git clone');
    expect(command).toContain('| sudo env');
    expect(ADVANCED_SELFHOST_SCOPES).toEqual(['selfhost:connect']);
    expect(ADVANCED_SELFHOST_SCOPES).not.toContain('memory:read');
    expect(ADVANCED_SELFHOST_SCOPES).not.toContain('memory:write');
  });

  test.each([
    [{ state: 'installing' }, 'INSTALLING'],
    [{ status: 'registered' }, 'CONNECTING'],
    [{ registered: true }, 'CONNECTING'],
    [{ registered: true, reachable: true }, 'READY'],
    [{ state: 'ready', registered: true, reachable: null, stale: true }, 'CONNECTING'],
    [{ state: 'ready', registered: true, reachable: false }, 'CONNECTING'],
    [{ state: 'ready', registered: false, reachable: true }, 'CONNECTING'],
    [{ state: 'degraded', reachable: false }, 'DEGRADED'],
    [{ state: 'offline' }, 'OFFLINE'],
    [{ state: 'update-required' }, 'UPDATE_REQUIRED'],
    [{}, 'WAITING'],
  ])('normalizes backend connection state %#', (payload, expected) => {
    expect(normalizeConnectionState(payload)).toBe(expected);
  });

  test('uses rapid non-overlapping polling while installation is active and stops when ready', () => {
    expect(connectionPollDelay('WAITING', false)).toBe(5000);
    expect(connectionPollDelay('WAITING', true)).toBe(2000);
    expect(connectionPollDelay('INSTALLING', false)).toBe(2000);
    expect(connectionPollDelay('CONNECTING', false)).toBe(2000);
    expect(connectionPollDelay('READY', true, false)).toBe(1000);
    expect(connectionPollDelay('READY', true, true)).toBeNull();
  });

  test('maps durable backend states to monotonic setup progress', () => {
    expect(connectionProgress('WAITING')).toBeLessThan(connectionProgress('INSTALLING'));
    expect(connectionProgress('INSTALLING')).toBeLessThan(connectionProgress('CONNECTING'));
    expect(connectionProgress('CONNECTING')).toBeLessThan(connectionProgress('READY'));
    expect(connectionProgress('READY')).toBe(100);
  });
});
