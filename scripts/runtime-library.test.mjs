import assert from 'node:assert/strict';
import test from 'node:test';
import { artifactUrl, folderLabel, libraryUrl } from '../src/components/hivemind/app/shared/runtime-library.js';

test('labels folders by name, never by id', () => {
  assert.equal(folderLabel(''), 'All files');
  assert.equal(folderLabel('Reports'), 'Reports');
  assert.equal(folderLabel('Workspaces/Launch'), 'Workspaces · Launch');
});

test('builds list and artifact URLs on the library API', () => {
  assert.equal(libraryUrl({}), '/api/hivemind/artifacts');
  assert.equal(libraryUrl({ folder: 'Reports', query: 'plan', cursor: 'c2' }), '/api/hivemind/artifacts?folder=Reports&query=plan&cursor=c2');
  assert.equal(artifactUrl({ artifactId: 'a/1', latestVersion: 3 }), '/api/hivemind/artifacts/a%2F1?version=3');
  assert.equal(artifactUrl({ artifactId: 'a1', latestVersion: 2 }, true), '/api/hivemind/artifacts/a1?version=2&download=1');
});

test('builds a share link on the HIVEMIND origin and never shows a task id', async () => {
  const { artifactShareUrl, taskLabel } = await import('../src/components/hivemind/app/shared/runtime-library.js');
  assert.equal(artifactShareUrl({ artifactId: 'art_1' }, 'https://runtime-runner.singulancelabs.com'), 'https://runtime-runner.singulancelabs.com/api/hivemind/artifacts/art_1');
  assert.equal(taskLabel({ taskId: 'task-9' }), 'Linked to a task');
  assert.equal(taskLabel({}), null);
});
