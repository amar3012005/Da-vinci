import { nextHealthObservation } from '../connectivity';

describe('background connectivity confirmation', () => {
  test('does not declare the application offline after transient failures', () => {
    expect(nextHealthObservation(0, false)).toEqual({ failures: 1, healthy: null });
    expect(nextHealthObservation(1, false)).toEqual({ failures: 2, healthy: null });
  });

  test('declares offline after three consecutive failures and recovers immediately', () => {
    expect(nextHealthObservation(2, false)).toEqual({ failures: 3, healthy: false });
    expect(nextHealthObservation(3, true)).toEqual({ failures: 0, healthy: true });
  });
});
