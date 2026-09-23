import fs from 'node:fs';
import path from 'node:path';

const shell = fs.readFileSync(path.resolve(__dirname, '../workrun/WorkRunShell.jsx'), 'utf8');
const stream = fs.readFileSync(path.resolve(__dirname, '../workrun/WorkRunStream.jsx'), 'utf8');

describe('WorkRun shell layout contract', () => {
  test('keeps a compact run card while the preview is closed or at most 40% wide', () => {
    expect(shell).toContain("useState('closed')");
    expect(shell).toContain("railMode !== 'open' || railWidth <= Math.floor(window.innerWidth * 0.4)");
    expect(shell).toContain('aria-label="WorkRun status"');
    expect(shell).toContain("aria-label={railMode === 'open' ? 'Close preview' : 'Open preview'}");
  });

  test('adds transcript clearance so the compact run card cannot cover the first message', () => {
    expect(shell).toContain('topPadding={showRunStatus ? 112 : 32}');
    expect(stream).toContain('paddingTop: topPadding');
  });
});
