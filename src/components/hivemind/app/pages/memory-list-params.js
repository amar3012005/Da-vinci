const DEFAULT_PAGE_SIZE = 20;

// Keep request-scope semantics pure and testable. The active TeamSwitcher project
// is only navigation context for the "All" view; a project id is sent only when
// the user has explicitly selected the Project-level filter.
export function buildMemoryListParams({
  activeType, activeTag, activeEntity, showSuperseded, hideNoise,
  activeProjectId, tierScope, tierProject, pageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  return {
    limit: pageSize,
    offset: 0,
    ...(activeType ? { memory_type: activeType } : {}),
    ...(activeTag || activeEntity
      ? { tags: [activeTag, activeEntity].filter(Boolean).join(',') }
      : {}),
    is_latest: showSuperseded ? 'false' : 'all',
    ...(hideNoise ? { hide_noise: 'true' } : {}),
    // “All memory” means all accessible memory. A globally selected project
    // is navigation context, not an implicit data filter; otherwise personal
    // uploads (projectId=null) disappear while Graph still shows them.
    ...(tierScope === 'tier:project'
      ? { project_id: tierProject || activeProjectId || undefined }
      : {}),
    ...(tierScope && tierScope !== 'visible' ? { scope: tierScope } : {}),
  };
}
