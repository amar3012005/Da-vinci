import { buildPersonaContractLike, PERSONA_CONTRACT_PRESETS } from '../../shared/persona-contract';

describe('DigitalEmployees persona contract helpers', () => {
  test('derive a structured skeptic contract from role archetype', () => {
    const contract = buildPersonaContractLike({
      name: 'Jonah Price',
      role_archetype: 'skeptic',
      scope: 'organization',
      peer_review_targets: ['coordinator', 'builder'],
    });

    expect(contract.lane).toBe('Skeptic');
    expect(contract.allowed_scope).toBe('organization');
    expect(contract.stance).toMatch(/challenge/i);
    expect(contract.challenge_targets).toEqual(['coordinator', 'builder']);
    expect(contract.quality_gate.length).toBeGreaterThan(0);
  });

  test('marketplace presets map to a contract structure', () => {
    const preset = PERSONA_CONTRACT_PRESETS.synthesizer;
    expect(preset.lane).toBe('Strategist');
    expect(preset.challenge_targets).toContain('skeptic');
    expect(preset.quality_gate[0]).toMatch(/evidence/i);
  });
});
