// Tags the system adds for filing and lookup (source-id:…, scope-key:…, document-type:…).
// They are not for people, so document rows show only the tags a person typed.
const SYSTEM_TAG_PREFIX = /^(source|source[-_]id|platform|ts|doc[-_]hash|filename|scope|scope[-_]key|project|organization|org|user|document[-_]id|document[-_]type|file[-_]type|ingest[-_][a-z]+):/i;
const SYSTEM_TAGS = new Set(['knowledge-base', 'document', 'document-summary', 'schema-record', 'enterprise']);

/** True for tags the system added; false for tags a person typed. */
export const isSystemTag = (tag) => typeof tag !== 'string' || SYSTEM_TAGS.has(tag) || SYSTEM_TAG_PREFIX.test(tag);
