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

test('shared approval card prints exact email fields and exposes one-click send', () => {
  const source = read('shared/claude-chat.jsx');
  expect(source).toContain("['to', 'recipient_email', 'recipient', 'to_email', 'recipients']");
  expect(source).toContain("['subject', 'email_subject', 'title']");
  expect(source).toContain("['body', 'message_body', 'email_body', 'message', 'text', 'content']");
  expect(source).toContain("presentation.sends ? 'Send email' : 'Approve action'");
  expect(source).toContain('pendingActions={msg.pending_actions}');
});
