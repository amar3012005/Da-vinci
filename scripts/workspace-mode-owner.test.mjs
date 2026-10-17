import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

test('workspace mode switches retain the outer application authority', () => {
  const source = fs.readFileSync(new URL('../src/components/hivemind/app/shared/workspace-mode.js', import.meta.url), 'utf8');
  const destination = vm.runInNewContext(`${source.replaceAll('export function', 'function')}; workspaceModeDestination`);
  const brain = 'https://next.singulancelabs.com';
  const runtime = 'https://runtime-runner.singulancelabs.com';
  const room = '/hivemind/app/employee/harness';
  assert.equal(destination(room, brain), room);
  assert.equal(destination(room, runtime), room);
  assert.equal(destination('/hivemind/app/overview/new', runtime), '/hivemind/app/overview/new');
  assert.equal(destination('/hivemind/app/overview/new', brain), '/hivemind/app/overview/new');
  assert.equal(destination('/hivemind/app/tara', runtime), `${brain}/hivemind/app/tara`);
  assert.equal(destination(room, 'http://localhost:3000'), room);
  const component = fs.readFileSync(new URL('../src/components/hivemind/app/layout/WorkspaceModeSwitcher.jsx', import.meta.url), 'utf8');
  assert.match(component, /window.location.assign\(destination\)/);
  assert.match(component, /onClick=\{\(\) => chooseMode\(mode.path, mode.selected\)\}/);
});
