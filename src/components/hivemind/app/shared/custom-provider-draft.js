/** Form model and client validation for custom model providers. The Runtime runner remains the authority for every rule. */
import { fillCopy } from '../layout/sidebar-copy';

/** Copy lookup used when the caller passes none: the English text. Components pass `useCopy('outerApp.customProviders')`. */
const englishCopy = (key, defaultValue, vars) => fillCopy(defaultValue, vars);

export const PROTOCOLS = [
  { value: 'openai-chat-completions', label: 'OpenAI Chat Completions' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
];

/** Levels the form offers; `off` is the API spelling of "None". */
export const REASONING_OPTIONS = [
  { effort: 'off', label: 'None' },
  { effort: 'low', label: 'Low' },
  { effort: 'medium', label: 'Medium' },
  { effort: 'high', label: 'High' },
];

const OFFERED = REASONING_OPTIONS.map(option => option.effort);
const EFFORT_ORDER = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const ANTHROPIC_BUDGETS = { low: 1024, medium: 4096, high: 16384 };
const MODEL_FIELDS = ['id', 'reasoningEfforts', 'defaultReasoningEffort'];
const KEY_PATTERN = /^[\x21-\x7e]{8,4096}$/;

const ERROR_TEXT = {
  provider_name_taken: 'A provider with this name already exists.',
  provider_limit_reached: 'This workspace has reached its custom provider limit.',
  provider_not_found: 'This provider no longer exists. Refresh the list.',
  base_url_invalid: 'The base URL is not allowed. Use a public https:// address.',
  api_key_required: 'Enter the API key.',
  key_unreadable: 'The saved key can no longer be read. Enter the API key again.',
  rate_limited: 'Too many connection tests. Wait a minute and try again.',
  invalid_request: 'The provider details are not valid.',
  request_too_large: 'The provider details are too large.',
};

const ENDPOINT_TEXT = {
  endpoint_blocked: 'The endpoint resolves to a non-public address.',
  endpoint_redirect: 'The endpoint redirected. Use its final base URL.',
  endpoint_unreachable: 'The endpoint could not be reached.',
  endpoint_status: 'The endpoint returned an error.',
  endpoint_response_invalid: 'The endpoint did not return a model list.',
  endpoint_too_large: 'The endpoint response was too large.',
};

let modelKeys = 0;
const nextKey = () => `model-${++modelKeys}`;

export function emptyModel(id = '') {
  return { key: nextKey(), id, levels: Object.fromEntries(OFFERED.map(effort => [effort, false])), extraEfforts: {}, passthrough: {}, defaultReasoningEffort: null };
}

export function newDraft() {
  return { id: null, name: '', baseUrl: '', protocol: PROTOCOLS[0].value, apiKey: '', keyConfigured: false, models: [emptyModel()] };
}

/** Builds an editable draft from a stored provider. The API key is never copied: the field starts blank. */
export function draftFromProvider(provider) {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    protocol: provider.protocol,
    apiKey: '',
    keyConfigured: provider.keyConfigured === true,
    models: (provider.models || []).map(model => {
      const efforts = model.reasoningEfforts || {};
      return {
        key: nextKey(),
        id: model.id,
        levels: Object.fromEntries(OFFERED.map(effort => [effort, Object.prototype.hasOwnProperty.call(efforts, effort)])),
        extraEfforts: Object.fromEntries(Object.entries(efforts).filter(([effort]) => !OFFERED.includes(effort))),
        passthrough: Object.fromEntries(Object.entries(model).filter(([field]) => !MODEL_FIELDS.includes(field))),
        defaultReasoningEffort: model.defaultReasoningEffort ?? null,
      };
    }),
  };
}

export function hostOf(baseUrl, tx = englishCopy) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return tx('invalidUrl', 'Invalid URL');
  }
}

export function protocolLabel(value) {
  return PROTOCOLS.find(protocol => protocol.value === value)?.label || value;
}

/** Syntactic checks only; the runner repeats them and also refuses private or redirecting hosts. */
export function validateBaseUrl(value, tx = englishCopy) {
  const text = value.trim();
  let url;
  try {
    url = new URL(text);
  } catch {
    return tx('urlFull', 'Enter a full base URL that starts with https://.');
  }
  if (url.protocol !== 'https:') return tx('urlHttps', 'The base URL must use https://.');
  if (url.username || url.password) return tx('urlCredentials', 'Remove the username and password from the base URL.');
  if (url.search || url.hash) return tx('urlQuery', 'The base URL must not include a query string or fragment.');
  if (!url.hostname.includes('.')) return tx('urlPublic', 'Use a public domain name in the base URL.');
  return '';
}

/** Returns field-keyed messages; an empty object means the draft may be sent. */
export function validateDraft(draft, { creating, existingNames = [], tx = englishCopy }) {
  const errors = {};
  const name = draft.name.trim();
  if (!name) errors.name = tx('nameRequired', 'Enter a display name.');
  else if (creating && existingNames.some(existing => existing.toLowerCase() === name.toLowerCase())) errors.name = tx('nameTaken', 'A provider with this name already exists. Edit it instead.');
  const urlError = validateBaseUrl(draft.baseUrl, tx);
  if (urlError) errors.baseUrl = urlError;
  if (!PROTOCOLS.some(protocol => protocol.value === draft.protocol)) errors.protocol = tx('protocolRequired', 'Choose a protocol.');
  if (creating && !draft.apiKey) errors.apiKey = tx('keyRequired', 'Enter the API key.');
  else if (draft.apiKey && !KEY_PATTERN.test(draft.apiKey)) errors.apiKey = tx('keyFormat', 'Use 8 to 4096 printable characters with no spaces.');
  const ids = draft.models.map(model => model.id.trim());
  if (ids.length === 0 || ids.every(id => !id)) errors.models = tx('modelsRequired', 'Add at least one model.');
  else if (ids.some(id => !id)) errors.models = tx('modelIdRequired', 'Each model needs an id. Remove empty rows.');
  else {
    const repeated = ids.find((id, index) => ids.indexOf(id) !== index);
    if (repeated) errors.models = tx('modelRepeated', 'The model "{{id}}" is listed more than once.', { id: repeated });
  }
  return errors;
}

function wireValue(protocol, effort) {
  return protocol === 'anthropic-messages' ? ANTHROPIC_BUDGETS[effort] : effort;
}

function buildModel(model, protocol) {
  const payload = { ...model.passthrough, id: model.id.trim() };
  const efforts = { ...model.extraEfforts };
  for (const effort of OFFERED) {
    if (model.levels[effort]) efforts[effort] = effort === 'off' ? null : wireValue(protocol, effort);
  }
  const names = Object.keys(efforts);
  if (names.length === 0) return payload;
  names.sort((a, b) => EFFORT_ORDER.indexOf(a) - EFFORT_ORDER.indexOf(b));
  const chosen = model.defaultReasoningEffort && Object.prototype.hasOwnProperty.call(efforts, model.defaultReasoningEffort)
    ? model.defaultReasoningEffort
    : names[0];
  return { ...payload, reasoningEfforts: efforts, defaultReasoningEffort: chosen };
}

/** Request body for PUT /api/hivemind/custom-providers. The key is included only when typed. */
export function buildPayload(draft) {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    baseUrl: draft.baseUrl.trim(),
    protocol: draft.protocol,
    models: draft.models.map(model => buildModel(model, draft.protocol)),
    ...(draft.apiKey ? { apiKey: draft.apiKey } : {}),
  };
}

/** Request body for a draft connection test. */
export function draftTestBody(draft) {
  return { baseUrl: draft.baseUrl.trim(), protocol: draft.protocol, apiKey: draft.apiKey };
}

export function testResultText(result, tx = englishCopy, formatCount = String) {
  if (result.ok) {
    const count = result.models?.length || 0;
    if (count === 1) return tx('testConnectedOne', 'Connected. {{count}} model listed.', { count: formatCount(count) });
    return count ? tx('testConnectedMany', 'Connected. {{count}} models listed.', { count: formatCount(count) }) : tx('testConnected', 'Connected.');
  }
  const known = ENDPOINT_TEXT[result.error];
  const base = known ? tx(`endpoint.${result.error}`, known) : tx('testFailed', 'The connection test failed.');
  return result.status ? tx('httpStatus', '{{base}} HTTP {{status}}.', { base, status: result.status }) : base;
}

/** Prefers the runner's `message`, then a fixed text for its error code. Never includes a key. */
export function errorMessage(error, fallback = 'The custom provider request failed. Nothing changed.', tx = englishCopy) {
  const status = error?.response?.status;
  if (status === 401) return tx('errSignIn', 'Sign in to your workspace again.');
  const data = error?.response?.data;
  if (typeof data?.message === 'string' && data.message) return data.message;
  const known = ERROR_TEXT[data?.error];
  return known ? tx(`err.${data.error}`, known) : fallback;
}

/** True when the feature flag is off: the runner route is absent or the service is unavailable. */
export function isFeatureOff(error) {
  const status = error?.response?.status;
  if (status === 503) return true;
  return status === 404 && error.response.data?.error !== 'provider_not_found';
}
