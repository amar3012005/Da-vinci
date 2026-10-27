const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '../../../../../index.css'), 'utf8');
const block = css.slice(css.lastIndexOf('@media (max-width: 600px)'));
test('phone chat rooms lock the document and keep the viewport-height variable', () => {
  expect(block).toContain('html:has([data-native-chat-shell], [data-dot-room-phone])');
  expect(block).toMatch(/overflow:\s*hidden;[\s\S]*overscroll-behavior:\s*none/);
  expect(block).toMatch(/height:\s*var\(--hm-app-viewport-height, 100dvh\)/);
});
test('the lock is scoped to phones so desktop layout is untouched', () => {
  expect(css.slice(0, css.lastIndexOf('@media (max-width: 600px)'))).not.toMatch(/html:has\(\[data-native-chat-shell\], \[data-dot-room-phone\]\)/);
});
