import { ADVANCED_SELFHOST_SCOPES, buildAdvancedInstallCommand, buildInstallCommand, normalizeConnectionState } from '../SelfHostSetup';

describe('self-host setup contract', () => {
  test('builds one organization enrollment command without a general API key', () => {
    const command = buildInstallCommand("enroll_'org");
    expect(command).toContain('https://get.singulancelabs.com/memory-box');
    expect(command).toContain('sudo env HIVEMIND_ENROLLMENT_TOKEN=');
    expect(command).toContain('HIVEMIND_CENTRAL_URL=');
    expect(command).toContain('--output "$installer"');
    expect(command).toContain("trap 'rm -f -- \"$installer\"' EXIT");
    expect(command).not.toContain('| sudo');
    expect(command).not.toContain('HIVEMIND_API_KEY=');
    expect(command).not.toContain('git clone');
  });

  test('canary enrollment is explicit in the command and never changes the stable default', () => {
    const command = buildInstallCommand('canary-token', 'canary');
    expect(command).toContain('HIVEMIND_MEMORY_BOX_CHANNEL=canary');
    expect(buildInstallCommand('stable-token')).not.toContain('HIVEMIND_MEMORY_BOX_CHANNEL=canary');
  });

  test('advanced setup uses the same signed installer instead of a mutable branch', () => {
    const command = buildAdvancedInstallCommand('hmk_live_test');
    expect(command).toContain('https://get.singulancelabs.com/memory-box');
    expect(command).toContain('sudo env HIVEMIND_API_KEY=');
    expect(command).toContain('--output "$installer"');
    expect(command).not.toContain('git clone');
    expect(command).not.toContain('| sudo');
    expect(ADVANCED_SELFHOST_SCOPES).toEqual(['selfhost:connect']);
    expect(ADVANCED_SELFHOST_SCOPES).not.toContain('memory:read');
    expect(ADVANCED_SELFHOST_SCOPES).not.toContain('memory:write');
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
