import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

test('Brain admission preserves requested native sessions and fences foreign destinations', () => {
  const source = fs.readFileSync(new URL('../src/components/hivemind/app/pages/HarnessChatSurface.jsx', import.meta.url), 'utf8');
  const functions = source.slice(source.indexOf('function canonicalHarnessDestination'), source.indexOf('async function navigateHarnessTicket'));
  const select = vm.runInNewContext(`${functions}; harnessAdmissionDestination`, {
    URL, window: { location: { origin: 'https://next.singulancelabs.com' } },
    HARNESS_OVERVIEW_PATH: '/hivemind/app/overview',
  });
  assert.equal(select('https://next.singulancelabs.com/hivemind/app/overview/session/session-b0f176ea?view=chat#turn-2'), '/hivemind/app/overview/session/session-b0f176ea?view=chat#turn-2');
  assert.equal(select('/hivemind/app/overview'), '/hivemind/app/overview/new');
  assert.equal(select('/hivemind/app/overview/new'), '/hivemind/app/overview/new');
  assert.equal(select('https://foreign.example/hivemind/app/overview/session/session-b0f176ea'), '/hivemind/app/overview/new');
  assert.equal(select('/hivemind/app/employee/harness'), '/hivemind/app/overview/new');
  assert.match(source, /destinationRef = useRef\(harnessAdmissionDestination\(window.location.href\)\)/);
  assert.match(source, /navigateHarnessTicket\(ticket, destinationRef.current, navigate\)/);
});
