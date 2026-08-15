import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(appRoot, 'pages', 'Memories.jsx'), 'utf8');

test('visible memory scope does not inherit the TeamSwitcher project filter', () => {
  expect(source).toContain('“All memory” means all accessible memory');
  expect(source).toContain("...(tierScope === 'tier:project'");
  expect(source).toContain('project_id: tierProject || activeProjectId || undefined');
  expect(source).not.toContain(': (activeProjectId ? { project_id: activeProjectId } : {})');
});

test('the parent page does not duplicate the MemoriesTab list request', () => {
  const parent = source.slice(source.indexOf('export default function Memories()'), source.indexOf('function MemoriesTab('));
  expect(parent).not.toContain('apiClient.listMemories(listParams)');
  const tab = source.slice(source.indexOf('function MemoriesTab('));
  expect(tab.match(/apiClient\.listMemories\(listParams\)/g)).toHaveLength(1);
});
