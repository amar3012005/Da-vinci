import { normalizeMemoryClaims } from './memory-claims';

describe('normalizeMemoryClaims', () => {
  it('normalizes the canonical Uwe claim and its evidence', () => {
    const result = normalizeMemoryClaims({
      claims: [{
        claim_id: 'claim-1',
        subject_entity: { canonical_name: 'Uwe Egly' },
        predicate: { name: 'teaches' },
        object_entity: { canonical_name: 'Deep Learning' },
        assertion_status: 'user_asserted',
        valid_from: '2026-08-31',
        evidence_links: [{ memory_id: '74fb72fc-08da-41cc-8c56-598eae67bfee' }],
      }],
      projection: { claims: 'complete' },
    });

    expect(result.claims).toEqual([expect.objectContaining({
      id: 'claim-1',
      subject: 'Uwe Egly',
      predicate: 'teaches',
      object: 'Deep Learning',
      assertionStatus: 'user_asserted',
      validFrom: '2026-08-31',
    })]);
    expect(result.claims[0].evidence).toHaveLength(1);
    expect(result.projection).toEqual({ claims: 'complete' });
  });

  it('accepts camelCase BYOD responses and empty claim lists', () => {
    expect(normalizeMemoryClaims({ data: { canonicalClaims: [] } }).claims).toEqual([]);
    expect(normalizeMemoryClaims({ items: [{
      claimKey: 'key',
      subjectEntity: { canonicalName: 'A' },
      predicateName: 'uses',
      objectLiteral: { value: 'B' },
    }] }).claims[0]).toEqual(expect.objectContaining({ subject: 'A', predicate: 'uses', object: 'B' }));
  });
});

