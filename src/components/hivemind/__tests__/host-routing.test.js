import {
  HIVEMIND_PRIMARY_HOST,
  isHivemindHostName,
} from '../host-routing';

describe('public HIVE-MIND host routing', () => {
  test('uses the Singulance next hostname as the canonical redirect destination', () => {
    expect(HIVEMIND_PRIMARY_HOST).toBe('next.singulancelabs.com');
  });

  test('accepts both the new public host and the temporary legacy host', () => {
    expect(isHivemindHostName('next.singulancelabs.com')).toBe(true);
    expect(isHivemindHostName('hivemind.davinciai.eu')).toBe(true);
    expect(isHivemindHostName('singulancelabs.com')).toBe(false);
  });
});
