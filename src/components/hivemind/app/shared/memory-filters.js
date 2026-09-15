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

export function isMemoryLayer(memory) {
  if (!memory) return false;
  const metadata = memory.metadata || {};
  const kind = String(
    memory.memory_type || memory.memoryType || memory.type || memory.kind
    || metadata.memory_type || metadata.memoryType || metadata.type || metadata.kind || ''
  ).toLowerCase();
  const layer = String(memory.layer || metadata.layer || '').toLowerCase();
  const tags = Array.isArray(memory.tags)
    ? memory.tags.map((tag) => normalizePart(tag).toLowerCase())
    : [];

  if (layer === 'evidence' || layer === 'document') return false;
  if (kind === 'evidence_segment' || kind === 'kb_document' || kind === 'knowledge_segment') return false;
  if (tags.some((tag) => tag === 'layer:evidence' || tag === 'layer:document')) return false;
  return true;
}

export function filterUserVisibleMemories(memories) {
  if (!Array.isArray(memories)) return [];
  return memories.filter((memory) => isMemoryLayer(memory) && !isTaraTranscriptMemory(memory));
}
