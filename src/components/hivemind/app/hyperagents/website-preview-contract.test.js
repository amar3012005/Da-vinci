import fs from 'node:fs';
import path from 'node:path';

const componentDir = path.dirname(__filename);

test('website screenshots are fetched eagerly for the visible My Company card', () => {
  const source = fs.readFileSync(path.join(componentDir, 'WebsitePreview.jsx'), 'utf8');
  expect(source).toContain('loading="eager"');
  expect(source).toContain('fetchPriority="high"');
});

test('architecture copy is offset below the wordmark embedded in the awakening artwork', () => {
  const source = fs.readFileSync(path.join(componentDir, 'HyperOnboarding.jsx'), 'utf8');
  expect(source).toContain('className="relative top-10 w-full max-w-[1080px] text-center sm:top-12"');
});
