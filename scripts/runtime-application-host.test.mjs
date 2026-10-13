import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

test('actual app router admits Runtime authority without broadening marketing or foreign hosts', () => {
  const source = fs.readFileSync(new URL('../src/App.js', import.meta.url), 'utf8');
  const expression = source.match(/const isHivemindHost =([\s\S]*?);/)[1];
  const runtimeHost = source.match(/const RUNTIME_RUNNER_HOST = '([^']+)'/)[1];
  for (const [hostname, expected] of [
    ['runtime-runner.singulancelabs.com',true],['next.singulancelabs.com',true],
    ['next.preview.singulancelabs.com',true],['singulancelabs.com',false],['foreign.example',false],
  ]) {
    assert.equal(vm.runInNewContext(expression, {
      window:{location:{hostname,protocol:'https:'}},HIVEMIND_SITE_HOST:'next.singulancelabs.com',
      RUNTIME_RUNNER_HOST:runtimeHost,HIVEMIND_PREVIEW_HOSTS:new Set(['next.preview.singulancelabs.com']),
    }),expected);
  }
});
