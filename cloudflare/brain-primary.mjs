// Which Brain is primary: the Company Brain OpenDot employee ("company", default) or the retired-slowly DSH Brain chat
// runner ("harness"). One Cloudflare Flagship string flag decides, so a flip in the dashboard takes effect within the
// cache window without a deploy. Every failure resolves to "company", so the old runner is never required.
export const BRAIN_PRIMARY_FLAG_KEY = 'brain-primary';
export const BRAIN_PRIMARY_PATH = '/__hivemind/feature-flags/brain-primary';
const TTL_MS = 15_000;
const FAILURE_TTL_MS = 5_000;
let cached = null;

/** @param {unknown} value - raw flag value. @returns {'company'|'harness'} only the exact string "harness" selects the old runner. */
export function normalizeBrainPrimary(value) {
  return value === 'harness' ? 'harness' : 'company';
}

/** Clears the per-isolate cache (tests). */
export function resetBrainPrimaryCache() { cached = null; }

/**
 * Reads the flag through the Flagship binding with a short per-isolate cache.
 * @param {{ FLAGS?: { getStringValue: Function }, ENVIRONMENT?: string }} env - Worker bindings.
 * @param {() => number} [now] - clock in ms.
 * @returns {Promise<'company'|'harness'>} the primary Brain; "company" when the flag is missing or unreadable.
 */
export async function readBrainPrimary(env, now = Date.now) {
  const time = now();
  if (cached && cached.until > time) return cached.value;
  let value = 'company', ttl = FAILURE_TTL_MS;
  try {
    if (env?.FLAGS) {
      value = normalizeBrainPrimary(await env.FLAGS.getStringValue(BRAIN_PRIMARY_FLAG_KEY, 'company', {
        environment: env.ENVIRONMENT || 'production', surface: 'hivemind-web',
      }));
      ttl = TTL_MS;
    }
  } catch { /* An unreadable flag keeps the Company Brain primary. */ }
  cached = { value, until: time + ttl };
  return value;
}

/** @param {{ FLAGS?: object, ENVIRONMENT?: string }} env - Worker bindings. @returns {Promise<Response>} public, non-sensitive `{ primary }` JSON. */
export async function brainPrimaryResponse(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET', 'access-control-max-age': '600' } });
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { allow: 'GET, OPTIONS' } });
  return Response.json({ primary: await readBrainPrimary(env) }, {
    headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'x-robots-tag': 'noindex' },
  });
}
