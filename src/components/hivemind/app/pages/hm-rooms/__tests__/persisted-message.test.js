import { persistedAssistantFailure } from '../persisted-message';

describe('persisted assistant failure projection', () => {
  it('shows a safe setup failure instead of an invisible empty assistant turn', () => {
    expect(persistedAssistantFailure({
      role: 'assistant',
      content: [],
      finished_reason: 'error',
      error: { type: 'setup', message: 'private provider detail' },
    })).toMatch(/failed during setup/);
    expect(persistedAssistantFailure({
      role: 'assistant',
      content: [],
      finished_reason: 'error',
      error: { type: 'setup', message: 'private provider detail' },
    })).not.toContain('private provider detail');
  });

  it('projects other terminal failures without exposing raw error details', () => {
    expect(persistedAssistantFailure({
      role: 'assistant', finished_reason: 'error', error: { message: 'secret' },
    })).toMatch(/did not complete/);
    expect(persistedAssistantFailure({
      role: 'assistant', finished_reason: 'completed', content: [{ type: 'text', text: 'ok' }],
    })).toBe('');
    expect(persistedAssistantFailure({ role: 'user', error: { type: 'setup' } })).toBe('');
  });
});
