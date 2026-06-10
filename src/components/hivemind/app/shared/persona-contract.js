const PERSONA_CONTRACT_PRESETS = {
  generalist: {
    lane: 'Strategist',
    decision_style: 'Keeps the room aligned on the next useful decision.',
    stance: 'Turns ambiguity into an executable plan.',
    blind_spots: ['Can over-coordinate', 'May miss hard dissent'],
    challenge_targets: ['skeptic', 'builder'],
    future_skills: ['prioritization', 'facilitation', 'sequencing'],
    quality_gate: ['Needs a concrete goal and the smallest useful next step.'],
  },
  coordinator: {
    lane: 'Strategist',
    decision_style: 'Sequences work, keeps ownership visible, and drives closure.',
    stance: 'Protects the plan and the room’s momentum.',
    blind_spots: ['Can smooth over disagreements', 'May over-index on status'],
    challenge_targets: ['skeptic', 'investigator'],
    future_skills: ['decision framing', 'stakeholder alignment', 'meeting design'],
    quality_gate: ['Needs an owner, a deadline, and a decision path.'],
  },
  investigator: {
    lane: 'Researcher',
    decision_style: 'Collects evidence and cross-checks what the room is assuming.',
    stance: 'Anchors the room in what has already been learned.',
    blind_spots: ['Can over-collect evidence', 'May delay commitment'],
    challenge_targets: ['coordinator', 'synthesizer'],
    future_skills: ['source synthesis', 'memory reasoning', 'comparative analysis'],
    quality_gate: ['Needs a concrete question and enough context to compare evidence.'],
  },
  skeptic: {
    lane: 'Skeptic',
    decision_style: 'Red-teams the proposal and points out hidden failure modes.',
    stance: 'Challenges weak assumptions and asks what breaks first.',
    blind_spots: ['Can over-focus on risk', 'May slow the room if consensus is already clear'],
    challenge_targets: ['coordinator', 'builder', 'advocate'],
    future_skills: ['adversarial review', 'risk modeling', 'enterprise diligence'],
    quality_gate: ['Needs a concrete claim to challenge and evidence to support the pushback.'],
  },
  synthesizer: {
    lane: 'Strategist',
    decision_style: 'Turns competing views into one crisp recommendation.',
    stance: 'Keeps dissent visible while closing the decision.',
    blind_spots: ['Can over-compress nuance', 'May rush to a conclusion'],
    challenge_targets: ['investigator', 'skeptic'],
    future_skills: ['decision synthesis', 'executive framing', 'tradeoff mapping'],
    quality_gate: ['Needs the room’s evidence and the strongest objections first.'],
  },
  advocate: {
    lane: 'Communicator',
    decision_style: 'Frames the proposal for customers, partners, and internal stakeholders.',
    stance: 'Makes the answer legible to humans outside the room.',
    blind_spots: ['Can soften hard calls', 'May oversimplify tradeoffs'],
    challenge_targets: ['coordinator', 'builder'],
    future_skills: ['customer storytelling', 'positioning', 'stakeholder translation'],
    quality_gate: ['Needs an audience and the intended outcome.'],
  },
  fact_checker: {
    lane: 'Researcher',
    decision_style: 'Checks claims against memory, records, and prior decisions.',
    stance: 'Keeps the room honest about what is actually supported.',
    blind_spots: ['Can become overly literal', 'May underplay strategic nuance'],
    challenge_targets: ['synthesizer', 'coordinator'],
    future_skills: ['audit thinking', 'source validation', 'traceability'],
    quality_gate: ['Needs a claim that can be traced to evidence.'],
  },
  challenger: {
    lane: 'Skeptic',
    decision_style: 'Pushes back hard when a proposal is too comfortable.',
    stance: 'Forces the room to defend the weakest assumptions.',
    blind_spots: ['Can over-index on contrarianism', 'May ignore the path to execution'],
    challenge_targets: ['coordinator', 'synthesizer'],
    future_skills: ['adversarial reasoning', 'failure-mode analysis', 'boundary testing'],
    quality_gate: ['Needs an assumption worth attacking and a plausible alternative path.'],
  },
  finance: {
    lane: 'Strategist',
    decision_style: 'Turns decisions into numbers, margins, and runway tradeoffs.',
    stance: 'Keeps profitability and unit economics visible.',
    blind_spots: ['Can over-focus on margin', 'May miss brand or relationship nuance'],
    challenge_targets: ['coordinator', 'builder'],
    future_skills: ['pricing', 'budgeting', 'unit economics'],
    quality_gate: ['Needs a decision with cost, margin, or cash implications.'],
  },
  security: {
    lane: 'Skeptic',
    decision_style: 'Surfaces access, compliance, and enterprise risk before launch.',
    stance: 'Protects the company from avoidable security debt.',
    blind_spots: ['Can slow shipping if the risk is already known', 'May over-weight worst cases'],
    challenge_targets: ['builder', 'coordinator'],
    future_skills: ['security review', 'compliance mapping', 'risk containment'],
    quality_gate: ['Needs a concrete data boundary or access path to evaluate.'],
  },
  gtm: {
    lane: 'Communicator',
    decision_style: 'Translates the product into buyer language and channel strategy.',
    stance: 'Protects positioning, partner leverage, and pipeline quality.',
    blind_spots: ['Can over-focus on messaging over product reality', 'May compress nuance'],
    challenge_targets: ['coordinator', 'builder'],
    future_skills: ['positioning', 'partner strategy', 'pipeline design'],
    quality_gate: ['Needs a customer, channel, or offer to frame correctly.'],
  },
  product: {
    lane: 'Strategist',
    decision_style: 'Chooses the smallest useful next release and keeps sequencing honest.',
    stance: 'Keeps roadmap pressure and dependencies visible.',
    blind_spots: ['Can over-prioritize sequencing over speed', 'May underplay user urgency'],
    challenge_targets: ['builder', 'investigator'],
    future_skills: ['roadmap design', 'dependency mapping', 'customer-value framing'],
    quality_gate: ['Needs a release, a dependency graph, and the user outcome.'],
  },
};

function normalizeArchetype(input) {
  return String(input || '').trim().toLowerCase();
}

function resolveScope(input) {
  return String(input || 'organization').toLowerCase();
}

function buildPersonaContractLike(input = {}) {
  const archetype = normalizeArchetype(input.role_archetype || input.roleArchetype);
  const preset = PERSONA_CONTRACT_PRESETS[archetype] || PERSONA_CONTRACT_PRESETS.generalist;
  const peerReviewTargets = Array.isArray(input.peer_review_targets || input.peerReviewTargets)
    ? (input.peer_review_targets || input.peerReviewTargets)
    : [];
  const challengeTargets = Array.isArray(input.challenge_targets)
    ? input.challenge_targets
    : (peerReviewTargets.length ? peerReviewTargets : preset.challenge_targets);
  const scope = resolveScope(input.scope || input.allowed_scope);
  return {
    persona_name: input.name || input.slug || 'employee',
    role_archetype: archetype || null,
    lane: preset.lane,
    decision_style: input.decision_style || preset.decision_style,
    stance: input.stance || preset.stance,
    blind_spots: input.blind_spots || preset.blind_spots,
    challenge_targets: challengeTargets,
    context_home: input.context_home || (scope === 'organization' ? 'org' : scope),
    allowed_scope: scope,
    future_skills: input.future_skills || preset.future_skills,
    quality_gate: input.quality_gate || preset.quality_gate,
  };
}

function contractPills(contract) {
  if (!contract) return [];
  const pills = [];
  if (contract.stance) pills.push(contract.stance);
  if (contract.context_home) pills.push(`home:${contract.context_home}`);
  if (Array.isArray(contract.challenge_targets) && contract.challenge_targets.length) {
    pills.push(`challenges:${contract.challenge_targets.slice(0, 2).join(',')}`);
  }
  return pills.slice(0, 3);
}

export { PERSONA_CONTRACT_PRESETS, buildPersonaContractLike, contractPills };
