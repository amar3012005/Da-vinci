import {
  clearConversationRecords,
  listConversationRecords,
  loadConversationRecord,
  saveConversationRecord,
  selectConversationRecord,
  startConversationRecord,
  titleForConversation,
} from '../chat-session-records';

function storage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

describe('mobile user-facing conversation records', () => {
  const key = 'hivemind:talk-to-hive:messages:user-1';

  test('migrates the existing active transcript without using graph checkpoints', () => {
    const store = storage();
    store.setItem(key, JSON.stringify([{ id: 1, role: 'user', content: 'What did we decide?' }]));
    store.setItem(`${key}:thread-id`, 'existing-thread');

    expect(loadConversationRecord(store, key)).toEqual({
      conversationId: 'existing-thread',
      messages: [{ id: 1, role: 'user', content: 'What did we decide?' }],
    });
  });

  test('lists, selects, and clears user-facing chat records', () => {
    const store = storage();
    const first = startConversationRecord(store, key);
    saveConversationRecord(store, key, first.conversationId, [{ id: 1, role: 'user', content: 'Review the launch checklist' }]);
    const second = startConversationRecord(store, key);
    saveConversationRecord(store, key, second.conversationId, [{ id: 2, role: 'user', content: 'Summarize my recent decisions' }]);

    expect(listConversationRecords(store, key).map((record) => record.title)).toEqual([
      'Summarize my recent decisions',
      'Review the launch checklist',
    ]);
    expect(selectConversationRecord(store, key, first.conversationId)).toEqual([{ id: 1, role: 'user', content: 'Review the launch checklist' }]);
    clearConversationRecords(store, key);
    expect(listConversationRecords(store, key)).toEqual([]);
  });

  test('creates compact readable titles', () => {
    expect(titleForConversation([{ role: 'assistant', content: 'Ignored' }])).toBe('New conversation');
    expect(titleForConversation([{ role: 'user', content: '  Find   the   latest   project update ' }])).toBe('Find the latest project update');
  });
});
