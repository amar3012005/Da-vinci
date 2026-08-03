function normalizePart(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function collectMemoryText(memory) {
  const metadata = memory?.metadata || {};
  const sourceMetadata = memory?.source_metadata || metadata?.source_metadata || {};
  const tags = Array.isArray(memory?.tags) ? memory.tags : [];

  return [
    memory?.title,
    memory?.content,
    memory?.text,
    memory?.summary,
    memory?.project,
    memory?.project_name,
    memory?.projectName,
    metadata?.project,
    metadata?.project_name,
    metadata?.source_platform,
    sourceMetadata?.source_platform,
    sourceMetadata?.project,
    sourceMetadata?.project_name,
    ...tags,
  ].map(normalizePart).filter(Boolean).join(' ').toLowerCase();
}

export function isTaraTranscriptMemory(memory) {
  if (!memory) return false;

  const tags = Array.isArray(memory.tags)
    ? memory.tags.map((tag) => normalizePart(tag).toLowerCase()).filter(Boolean)
    : [];

  if (tags.some((tag) => (
    tag === 'tara-transcript'
    || tag === 'tara-memory'
    || tag === 'tara_memory'
    || tag.startsWith('sid:tara_')
  ))) {
    return true;
  }

  const text = collectMemoryText(memory);
  return (
    /\btara transcript\b/.test(text)
    || /\btara call transcript\b/.test(text)
    || /\btara[-_\s]?memory\b/.test(text)
  );
}

export function filterUserVisibleMemories(memories) {
  if (!Array.isArray(memories)) return [];
  return memories.filter((memory) => !isTaraTranscriptMemory(memory));
}
