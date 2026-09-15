const reserved = new Set(['user_id', 'userid', 'org_id', 'connected_account_id', 'entity_id', 'session_id', 'metadata', '__proto__', 'constructor', 'prototype']);
const governedHarnesses = new Set(['progressive-v1', 'langgraph-native-v1']);

export function isGovernedHarness(value) {
  return governedHarnesses.has(String(value || ''));
}

export function progressiveDraftFields(draft) {
  const args = draft?.toolArgs || {};
  const schema = args._input_schema;
  if (!isGovernedHarness(args._harness_version) || !schema?.properties) return null;
  return Object.entries(schema.properties).filter(([key]) => !key.startsWith('_') && !reserved.has(key.toLowerCase())).map(([key, field]) => ({
    key, name: field.title || key.replace(/_/g, ' '),
    type: typeof field.type === 'string' ? field.type : 'json',
    description: typeof field.description === 'string' ? field.description : '',
    required: (schema.required || []).includes(key),
    value: args[key] === undefined ? '' : typeof args[key] === 'string' ? args[key] : JSON.stringify(args[key], null, 2),
  }));
}

export function parseProgressiveDraftFields(fields, values) {
  const args = {};
  for (const field of fields) {
    const text = String(values[field.key] ?? '');
    if (!text && field.type !== 'string') {
      if (field.required) throw new Error(`${field.name} is required.`);
      continue;
    }
    if (field.type === 'string') args[field.key] = text;
    else if (field.type === 'number' || field.type === 'integer') {
      const number = Number(text);
      if (!Number.isFinite(number) || (field.type === 'integer' && !Number.isInteger(number))) throw new Error(`${field.name} must be ${field.type === 'integer' ? 'an integer' : 'a number'}.`);
      args[field.key] = number;
    } else {
      try { args[field.key] = JSON.parse(text); } catch { throw new Error(`${field.name} must contain valid JSON.`); }
      if (field.type === 'boolean' && typeof args[field.key] !== 'boolean') throw new Error(`${field.name} must be true or false.`);
      if (field.type === 'array' && !Array.isArray(args[field.key])) throw new Error(`${field.name} must be a JSON array.`);
      if (field.type === 'object' && (!args[field.key] || Array.isArray(args[field.key]) || typeof args[field.key] !== 'object')) throw new Error(`${field.name} must be a JSON object.`);
    }
  }
  return args;
}
