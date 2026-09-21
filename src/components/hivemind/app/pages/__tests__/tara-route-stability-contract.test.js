import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = fs.readFileSync(path.resolve(dir, '../../HiveMindApp.jsx'), 'utf8');
const tara = fs.readFileSync(path.resolve(dir, '../TaraConfig.jsx'), 'utf8');

test('TARA is part of the loaded app bundle instead of a fragile late route chunk', () => {
  assert.match(app, /import TaraConfig from '\.\/pages\/TaraConfig';/);
  assert.doesNotMatch(app, /React\.lazy\(\(\) => import\('\.\/pages\/TaraConfig'\)\)/);
});

test('the provider control stays implemented but hidden from users', () => {
  assert.match(tara, /\['deepgram', 'grok'\]\.map/);
  assert.match(tara, /aria-hidden="true" className="hidden items-center/);
  assert.match(tara, /const switchProvider = async/);
});

test('the TARA page keeps Grok as the only enabled catalog and session provider', () => {
  assert.match(tara, /const voiceProvider = 'grok';/);
  assert.match(tara, /provider=\{voiceProvider\}/);
});
