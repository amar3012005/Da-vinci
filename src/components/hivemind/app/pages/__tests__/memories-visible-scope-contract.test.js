import fs from 'node:fs';
import path from 'node:path';
import { buildMemoryListParams } from '../memory-list-params';

const appRoot = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(appRoot, 'pages', 'Memories.jsx'), 'utf8');
const paramsSource = fs.readFileSync(path.join(appRoot, 'pages', 'memory-list-params.js'), 'utf8');

test('visible memory scope does not inherit the TeamSwitcher project filter', () => {
  expect(paramsSource).toContain('“All memory” means all accessible memory');
  expect(paramsSource).toContain("...(tierScope === 'tier:project'");
  expect(paramsSource).toContain('project_id: tierProject || activeProjectId || undefined');
  expect(paramsSource).not.toContain(': (activeProjectId ? { project_id: activeProjectId } : {})');
});

test('personal uploads remain in All memory while Project level is an explicit narrow', () => {
  const base = { activeProjectId: 'active-project', hideNoise: true, tierScope: 'visible' };
  expect(buildMemoryListParams(base)).toMatchObject({ is_latest: 'all', hide_noise: 'true' });
  expect(buildMemoryListParams(base)).not.toHaveProperty('project_id');
  expect(buildMemoryListParams({ ...base, tierScope: 'tier:project' }))
    .toMatchObject({ project_id: 'active-project', scope: 'tier:project' });
  expect(buildMemoryListParams({ ...base, tierScope: 'tier:project', tierProject: 'chosen-project' }))
    .toMatchObject({ project_id: 'chosen-project', scope: 'tier:project' });
});

test('the parent page does not duplicate the MemoriesTab list request', () => {
  const parent = source.slice(source.indexOf('export default function Memories()'), source.indexOf('function MemoriesTab('));
  expect(parent).not.toContain('apiClient.listMemories(listParams)');
  const tab = source.slice(source.indexOf('function MemoriesTab('));
  expect(tab.match(/apiClient\.listMemories\(listParams\)/g)).toHaveLength(1);
});

test('tab totals use the ACL list pagination contract and refresh after mutations', () => {
  const parent = source.slice(source.indexOf('export default function Memories()'), source.indexOf('function MemoriesTab('));
  expect(parent).toContain('apiClient.listMemories({ limit: 1 })');
  expect(parent).toContain('apiClient.listDocuments({ limit: 1 })');
  expect(parent).toContain('apiClient.listEvidence({ limit: 1 })');
  expect(parent).toContain('paginationTotal(results[0].value)');
  expect(parent).toContain('paginationTotal(results[1].value)');
  expect(parent).toContain('paginationTotal(results[2].value)');
  expect(parent).toContain('window.addEventListener(KNOWLEDGE_CHANGED_EVENT, refresh)');
});
