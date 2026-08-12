import { buildToolkitSuggestions, composeToolkitPrompt, findMentionedToolkits, removeToolkitMentions } from './connector-aware-chat';

const catalog = [
  { slug: 'gmail', name: 'Gmail', connected: true, toolsCount: 12 },
  { slug: 'google_docs', name: 'Google Docs', connected: false, toolsCount: 5 },
];

test('recognizes catalog apps without intent keyword rules', () => {
  expect(findMentionedToolkits('Search Gmail, then create a Google Docs summary', catalog).map((t) => t.slug))
    .toEqual(['gmail', 'google_docs']);
});

test('renders detected names as chips while preserving a planner-ready prompt', () => {
  const mentioned = findMentionedToolkits('Search Gmail for invoices', catalog);
  expect(removeToolkitMentions('Search Gmail for invoices', mentioned)).toBe('Search for invoices');
  expect(composeToolkitPrompt('Search for invoices', mentioned)).toBe('Use Gmail. Search for invoices');
});

test('prefers connected toolkit suggestions and falls back to available catalog', () => {
  expect(buildToolkitSuggestions(catalog)[0].toolkit.slug).toBe('gmail');
  expect(buildToolkitSuggestions(catalog.map((t) => ({ ...t, connected: false })))).toHaveLength(2);
});
