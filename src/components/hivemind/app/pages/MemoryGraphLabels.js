// Display wording only: persisted relationship types and direction are unchanged.
export function memoryRelationLabel(value) {
  const key = String(value || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (['update', 'updates'].includes(key)) return 'Updates';
  if (['extend', 'extends'].includes(key)) return 'Builds on';
  if (['derive', 'derives'].includes(key)) return 'Leads to';
  if (['derivedfrom'].includes(key)) return 'Derived from';
  if (['contradict', 'contradicts', 'contradiction', 'contradictions'].includes(key)) return 'Conflicts with';
  return String(value || 'Related').replace(/[_-]+/g, ' ');
}
