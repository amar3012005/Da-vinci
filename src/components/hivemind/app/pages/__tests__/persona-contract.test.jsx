import { buildPersonaContractLike, contractPills } from '../../shared/persona-contract';

describe('persona contract helpers', () => {
  test('marketplace-style agents resolve to an employee-like contract', () => {
    const contract = buildPersonaContractLike({
      name: 'Victor Shah',
      role_archetype: 'security',
      scope: 'organization',
      peer_review_targets: ['builder', 'coordinator'],
    });

    expect(contract.lane).toBe('Skeptic');
    expect(contract.allowed_scope).toBe('organization');
    expect(contract.context_home).toBe('org');
    expect(contract.challenge_targets).toContain('builder');
    expect(contract.stance).toMatch(/Protects|Challenges/);
    expect(contractPills(contract)).toEqual(
      expect.arrayContaining([expect.stringContaining('home:org')]),
    );
  });

  test('custom hires keep their scope and challenge defaults', () => {
    const contract = buildPersonaContractLike({
      name: 'Maya Ortiz',
      role_archetype: 'coordinator',
      scope: 'team',
      challenge_targets: ['skeptic'],
    });

    expect(contract.lane).toBe('Strategist');
    expect(contract.allowed_scope).toBe('team');
    expect(contract.context_home).toBe('team');
    expect(contract.challenge_targets).toContain('skeptic');
    expect(contract.quality_gate[0]).toMatch(/Needs/);
  });
});
