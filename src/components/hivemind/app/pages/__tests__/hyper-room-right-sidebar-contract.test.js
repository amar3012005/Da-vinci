import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../HyperAgents.jsx'), 'utf8');

describe('HyperAgents room chrome contract', () => {
  test('does not offset the full-screen room shell under the company navigation rail', () => {
    expect(source).toContain('flex h-full min-h-0 max-w-none');
    expect(source).not.toContain('min-h-[600px] -m-6');
  });

  test('shows a retryable room-load error instead of a misleading not-found state', () => {
    expect(source).toContain('role="alert"');
    expect(source).toContain("t('common.retry', 'Retry')");
    expect(source).toContain('onClick={() => load()}');
  });

  test('keeps room metadata and actions in the persistent right rail', () => {
    const railStart = source.indexOf('data-room-metadata-sidebar');
    const participantsStart = source.indexOf("hyperAgents.participants', 'Participants'", railStart);

    expect(railStart).toBeGreaterThan(-1);
    expect(participantsStart).toBeGreaterThan(railStart);

    const metadataRail = source.slice(railStart, participantsStart);
    expect(metadataRail).toContain("hyperAgents.callWithTara', 'Call with TARA'");
    expect(metadataRail).toContain("hyperAgents.totalLlmTokens', 'Total LLM tokens used in this room'");
    expect(metadataRail).toContain("hyperAgents.clearAll', 'Clear all'");
    expect(metadataRail).toContain("hyperAgents.goalLbl', 'Goal'");
    expect(metadataRail).toContain("hyperAgents.scopeOrg', 'Whole Org'");
  });

  test('renders the room goal as the first conversation message', () => {
    const goalMessage = source.indexOf('data-room-goal-message');
    const turnFeed = source.indexOf('turns.map(turn =>', goalMessage);

    expect(goalMessage).toBeGreaterThan(-1);
    expect(turnFeed).toBeGreaterThan(goalMessage);
    expect(source.slice(goalMessage, turnFeed)).toContain('room.goal.trim()');
  });

  test('does not reserve a fixed room header above the scrolling thread', () => {
    expect(source).not.toContain('Human rooms retain their room chrome');
    expect(source).toContain('mounted here without reserving a fixed header');
  });
});
