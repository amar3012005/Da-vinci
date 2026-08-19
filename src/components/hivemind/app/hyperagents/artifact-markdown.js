/**
 * Converts a Runtime artifact's raw JSON `data` into readable markdown for
 * RuntimeArtifactPopup — never a raw `JSON.stringify` dump. Two specialized
 * renderers for the shapes we know well (research_decision, the growth
 * operating plan), and a generic recursive fallback for everything else so
 * an unfamiliar artifact key still reads as prose/bullets, not braces.
 */

function humanizeKey(key) {
  return String(key).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Generic JSON → markdown fallback for any artifact shape we don't specialize. */
export function jsonToMarkdown(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) {
    if (!value.length) return '';
    return value.map((item) => (item && typeof item === 'object'
      ? `- ${jsonToMarkdown(item).replaceAll('\n', '\n  ')}`
      : `- ${item}`)).join('\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([key, v]) => {
        const label = humanizeKey(key);
        if (v && typeof v === 'object') return `**${label}:**\n${jsonToMarkdown(v)}`;
        return `**${label}:** ${v}`;
      }).join('\n\n');
  }
  return String(value);
}

/** research_decision (core/src/runtime-playbooks/artifact-schema.js): decision, evidence[{claim,source_ref,confidence}], unknowns[]. */
function renderResearchDecision(data) {
  const sections = [`### Decision\n${data?.decision || 'No decision recorded.'}`];
  const evidence = Array.isArray(data?.evidence) ? data.evidence : [];
  if (evidence.length) {
    sections.push(`### Evidence\n${evidence.map((e) => `- ${e?.claim || ''}${e?.confidence ? ` — ${e.confidence}` : ''}${e?.source_ref ? ` (source: ${e.source_ref})` : ''}`).join('\n')}`);
  }
  const unknowns = Array.isArray(data?.unknowns) ? data.unknowns : [];
  if (unknowns.length) sections.push(`### Unknowns\n${unknowns.map((u) => `- ${u}`).join('\n')}`);
  return sections.join('\n\n');
}

/** The growth operating plan artifact — {kind:'growth_operating_plan', plan:{goal,stage,duration_days,...}}. */
function renderGrowthPlan(data) {
  const plan = data?.plan || data;
  const goal = plan?.goal || {};
  const stage = plan?.stage || {};
  const sections = [];
  if (goal.title) sections.push(`### ${goal.title}`);
  if (goal.objective) sections.push(goal.objective);
  if (stage.name) sections.push(`### Current stage — ${stage.name}`);
  if (stage.objective) sections.push(stage.objective);
  const measurement = stage.measurement;
  if (measurement?.primary_signal || measurement?.decision_rule) {
    sections.push(`**Measured by:** ${measurement.primary_signal || measurement.decision_rule}`);
  }
  if (plan.duration_days) sections.push(`**Duration:** ${plan.duration_days} days`);
  return sections.length ? sections.join('\n\n') : jsonToMarkdown(data);
}

/**
 * @param {string} key   artifact key (e.g. 'research_decision', 'growth_plan')
 * @param {object} data  the artifact's raw JSON content
 * @returns {string} markdown
 */
export function renderArtifactMarkdown(key, data) {
  if (!data) return '';
  if (key === 'research_decision') return renderResearchDecision(data);
  if (key === 'growth_plan' || data?.kind === 'growth_operating_plan') return renderGrowthPlan(data);
  return jsonToMarkdown(data);
}
