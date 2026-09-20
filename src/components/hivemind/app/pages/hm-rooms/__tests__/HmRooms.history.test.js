import { transcriptText } from '../hm-rooms-dsh/workrun-view';

describe('persisted WorkRun history normalization', () => {
  it('unwraps a nested AgentScope text envelope before rendering', () => {
    const envelope = {
      type: 'text',
      text: 'Recovered reply',
      id: 'message-1',
      created_at: '2026-09-20T12:00:00Z',
      finished_at: '2026-09-20T12:00:01Z',
    };

    expect(transcriptText(envelope)).toBe('Recovered reply');
  });
});
