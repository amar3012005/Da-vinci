import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(__dirname, '..', '..');
const read = (relative) => fs.readFileSync(path.join(appRoot, relative), 'utf8');

test('all chat surfaces retain structured pending actions', () => {
  for (const relative of [
    'pages/Overview.jsx',
    'pages/Chat.jsx',
    'mobile/pages/TalkToHiveMobile.jsx',
  ]) {
    expect(read(relative)).toContain('pending_actions');
  }
});

test('shared inline interaction prints exact fields and exposes governed actions', () => {
  const source = read('shared/claude-chat.jsx');
  expect(source).toContain("['to', 'recipient_email', 'recipient', 'to_email', 'recipients']");
  expect(source).toContain("['subject', 'email_subject', 'title']");
  expect(source).toContain("['body', 'message_body', 'email_body', 'message', 'text', 'content']");
  expect(source).toContain("return 'Approve and continue'");
  expect(source).toContain("return 'Send email'");
  expect(source).toContain('Nothing has been executed yet. Review the exact details below');
  expect(source).toContain('pendingActions={msg.pending_actions}');
});

test('choices, arbitrary fields, and save scope use inline rectangular controls', () => {
  const shared = read('shared/claude-chat.jsx');
  const overview = read('pages/Overview.jsx');
  expect(shared).toContain('const fields = Array.isArray(request?.fields)');
  expect(shared).toContain("rounded-[4px] border border-[#bdb8b0] bg-transparent");
  expect(shared).toContain('Choose where to save this memory');
  expect(overview).toContain("rounded-[4px] border border-[#bdb8b0] bg-transparent");
});

test('mobile keyboard path defers connector catalog recognition and layout measurement', () => {
  const mobile = read('mobile/pages/TalkToHiveMobile.jsx');
  expect(mobile).toContain('useDeferredValue(input)');
  expect(mobile).toContain('resolvePromptToolkits(deferredInput, selectedToolkits, toolkits)');
  expect(mobile).toContain('const absorbToolkitMentions = useCallback((nextText) => {\n    setInput(nextText.slice(0, MAX_CHARS));');
  expect(mobile).toContain('const frame = requestAnimationFrame(() => {');
  expect(mobile).toContain('return () => cancelAnimationFrame(frame);');
});
