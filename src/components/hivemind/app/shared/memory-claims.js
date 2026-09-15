function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function entityName(entity) {
  if (!entity) return null;
  if (typeof entity === 'string') return entity;
  return firstDefined(entity.canonical_name, entity.canonicalName, entity.name, entity.label);
}

function predicateName(predicate) {
  if (!predicate) return null;
  if (typeof predicate === 'string') return predicate;
  return firstDefined(predicate.name, predicate.canonical_name, predicate.canonicalName, predicate.key, predicate.slug);
}

/**
 * Normalize the additive claims API without coupling the UI to one storage
 * adapter's casing. Central, embedded, and BYOD responses can therefore share
 * the same detail panel during the feature-flag rollout.
 */
export function normalizeMemoryClaims(payload) {
  const envelope = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const rawClaims = Array.isArray(envelope)
    ? envelope
    : firstDefined(envelope?.claims, envelope?.canonical_claims, envelope?.canonicalClaims, envelope?.items, []);
  const claims = (Array.isArray(rawClaims) ? rawClaims : []).map((claim) => {
    const subject = firstDefined(
      entityName(claim.subject),
      entityName(claim.subject_entity),
      entityName(claim.subjectEntity),
      claim.subject_name,
      claim.subjectName,
    );
    const object = firstDefined(
      entityName(claim.object),
      entityName(claim.object_entity),
      entityName(claim.objectEntity),
      claim.object_literal?.value,
      claim.objectLiteral?.value,
      claim.object_value,
      claim.objectValue,
    );
    const evidence = firstDefined(claim.evidence_links, claim.evidenceLinks, claim.evidence, []);
    return {
      id: firstDefined(claim.id, claim.claim_id, claim.claimId, claim.claim_key, claim.claimKey),
      subject: subject || 'Unresolved subject',
      predicate: predicateName(firstDefined(claim.predicate, claim.predicate_name, claim.predicateName)) || 'related to',
      object: object || 'Unresolved object',
      assertionStatus: firstDefined(claim.assertion_status, claim.assertionStatus, claim.assertion, 'user_asserted'),
      validFrom: firstDefined(claim.valid_from, claim.validFrom),
      validTo: firstDefined(claim.valid_to, claim.validTo),
      confidence: typeof claim.confidence === 'number' ? claim.confidence : null,
      evidence: Array.isArray(evidence) ? evidence : [],
    };
  });

  return {
    claims,
    projection: firstDefined(envelope?.projection, envelope?.projection_state, envelope?.projectionState, null),
  };
}

