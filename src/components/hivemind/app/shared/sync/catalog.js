/**
 * Entities of the local-first screens. Each keeps a bounded, display-only copy of what the screen last showed.
 * `maxBytes` caps one stored key, `maxKeys` caps the keys of the entity (least recently written evicted), and
 * `staleAfterMs` is the age after which a cached paint is marked stale-looking until the server answers.
 */
const MINUTE = 60_000;
export const LOCAL_FIRST = Object.freeze({
  calendar: { entity: 'lf-calendar', maxBytes: 200_000, maxKeys: 6, staleAfterMs: 5 * MINUTE },
  crm: { entity: 'lf-crm', maxBytes: 250_000, maxKeys: 8, staleAfterMs: 5 * MINUTE },
  autonomy: { entity: 'lf-autonomy', maxBytes: 8_000, maxKeys: 40, staleAfterMs: 10 * MINUTE },
  usage: { entity: 'lf-usage', maxBytes: 40_000, maxKeys: 4, staleAfterMs: 10 * MINUTE },
  brainRecents: { entity: 'lf-brain-recents', maxBytes: 120_000, maxKeys: 2, staleAfterMs: 5 * MINUTE },
  brainConversation: { entity: 'lf-brain-conversation', maxBytes: 200_000, maxKeys: 1, staleAfterMs: 5 * MINUTE },
  runtimeRecents: { entity: 'lf-runtime-recents', maxBytes: 120_000, maxKeys: 2, staleAfterMs: 5 * MINUTE },
  connectors: { entity: 'lf-connectors', maxBytes: 150_000, maxKeys: 8, staleAfterMs: 10 * MINUTE },
  memories: { entity: 'lf-memories', maxBytes: 250_000, maxKeys: 4, staleAfterMs: 5 * MINUTE },
  uploads: { entity: 'lf-uploads', maxBytes: 250_000, maxKeys: 4, staleAfterMs: 5 * MINUTE },
});

/** Entity names read into memory when a scope is adopted, so the first render can use them. */
export const PRELOAD_ENTITIES = Object.freeze(Object.values(LOCAL_FIRST).map((spec) => spec.entity));
