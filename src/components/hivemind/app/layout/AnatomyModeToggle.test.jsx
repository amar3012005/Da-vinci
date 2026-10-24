import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnatomyModeToggle, { ANATOMY_ENDPOINT } from './AnatomyModeToggle';

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

test('stays hidden when Runtime does not serve Anatomy mode', async () => {
  const fetcher = jest.fn().mockResolvedValue(json(404, {}));
  const { container } = render(<AnatomyModeToggle fetcher={fetcher} />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith(ANATOMY_ENDPOINT, expect.anything()));
  expect(container.firstChild).toBeNull();
});

test('toggles with the revision it saw and adopts a newer value on conflict', async () => {
  const fetcher = jest.fn()
    .mockResolvedValueOnce(json(200, { ok: true, value: { enabled: false, revision: 2 } }))
    .mockResolvedValueOnce(json(409, { error: 'anatomy_conflict', value: { enabled: true, revision: 3 } }));
  render(<AnatomyModeToggle fetcher={fetcher} />);
  const toggle = await screen.findByRole('switch', { name: /Anatomy mode/ });
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ enabled: true, expectedRevision: 2 });
  expect(screen.getByRole('status').textContent).toContain('Changed on another device');
});
