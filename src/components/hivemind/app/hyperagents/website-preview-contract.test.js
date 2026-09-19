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

test('workspace entry waits for a validated homepage capture and exposes explicit retry', () => {
  const source = fs.readFileSync(path.join(componentDir, 'HyperOnboarding.jsx'), 'utf8');
  expect(source).toContain('result?.screenshot_pending !== false');
  expect(source).toContain("done && result?.screenshot &&");
  expect(source).toContain('retryHyperOnboardingScreenshot');
  expect(source).toContain('Retry capture');
  expect(source).not.toContain("result?.screenshot_pending === false && !result?.website_visual_source");
});
