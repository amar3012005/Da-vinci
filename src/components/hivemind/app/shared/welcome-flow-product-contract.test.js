import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(dir, 'WelcomeFlow.jsx'), 'utf8');

test('first-run deck presents the complete HIVEMIND operating system in five chapters', () => {
  for (const eyebrow of ['HIVEMIND OPERATING SYSTEM', 'MEMORY ENGINE', 'OPERATING SYSTEM', 'HYPERAGENTS', 'VOICE']) {
    assert.match(source, new RegExp(`eyebrow: '${eyebrow}'`));
  }
  assert.equal((source.match(/eyebrow:/g) || []).length, 5);
  assert.match(source, /SINGULANCE <span className="mx-1 text-\[#a3a3a3\]">\|<\/span> HIVEMIND/);
  assert.match(source, /visual: 'system'/);
  assert.match(source, /visual: 'operating'/);
});
