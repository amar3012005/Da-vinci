import { extractPlanLimit, isPlanLimitError } from './planLimit';

describe('plan limit detection', () => {
  test('treats quota_reached as a terminal quota response', () => {
    expect(isPlanLimitError({
      response: { status: 402, data: { error: 'quota_reached' } },
    })).toBe(true);
  });

  test('does not expose a machine quota code as modal copy', () => {
    expect(extractPlanLimit({
      response: { status: 402, data: { error: 'quota_reached', message: 'quota_reached' } },
    }).message).toBeNull();
  });
});
