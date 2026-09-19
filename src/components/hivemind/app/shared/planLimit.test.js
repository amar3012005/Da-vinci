import { extractPlanLimit, isPlanLimitError } from './planLimit';

describe('plan limit detection', () => {
  test('treats quota_reached as a terminal quota response', () => {
    expect(isPlanLimitError({
      response: { status: 402, data: { error: 'quota_reached' } },
    })).toBe(true);
  });

  test('recognizes exhausted referral credits and carries the founder action', () => {
    const error = { response: { status: 402, data: { code: 'credits_exhausted', referral_trial: true, commercial_action: 'talk_to_founder' } } };
    expect(isPlanLimitError(error)).toBe(true);
    expect(extractPlanLimit(error).referralTrial).toBe(true);
  });

  test('does not expose a machine quota code as modal copy', () => {
    expect(extractPlanLimit({
      response: { status: 402, data: { error: 'quota_reached', message: 'quota_reached' } },
    }).message).toBeNull();
  });
});
