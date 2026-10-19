import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import RuntimeAvatar, { RuntimeAppearanceProvider, RUNTIME_APPEARANCE_EVENT } from '../RuntimeAvatar';
import api from '../api-client';
import { useAuth } from '../../auth/AuthProvider';
jest.mock('../api-client', () => ({ __esModule: true, default: { getRuntimeAppearance: jest.fn() } }));
jest.mock('../../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); useAuth.mockReturnValue({ user: { id: 'a' }, org: { id: 'org-a' } }); });
test('saved Runtime refreshes all avatar consumers from the authoritative endpoint', async () => {
 api.getRuntimeAppearance.mockResolvedValue({ appearance: { character: 'orbit' } });
 render(<RuntimeAppearanceProvider><RuntimeAvatar size={40}/><RuntimeAvatar size={80}/></RuntimeAppearanceProvider>);
 await waitFor(() => expect(api.getRuntimeAppearance).toHaveBeenCalledTimes(1));
 api.getRuntimeAppearance.mockResolvedValue({ appearance: { character: 'spark' } });
 act(() => window.dispatchEvent(new Event(RUNTIME_APPEARANCE_EVENT)));
 await waitFor(() => screen.getAllByAltText('Runtime').forEach(image => expect(image.src).toContain('spark-ready.webp')));
});
test('account switch hides the previous identity and ignores an old in-flight response', async () => {
 let resolveOld; api.getRuntimeAppearance.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
 const view = render(<RuntimeAppearanceProvider><RuntimeAvatar/></RuntimeAppearanceProvider>);
 useAuth.mockReturnValue({ user: { id: 'b' }, org: { id: 'org-b' } });
 api.getRuntimeAppearance.mockResolvedValue({ appearance: { character: 'pebble' } });
 view.rerender(<RuntimeAppearanceProvider><RuntimeAvatar/></RuntimeAppearanceProvider>);
 await waitFor(() => expect(screen.getByAltText('Runtime').src).toContain('pebble-ready.webp'));
 await act(async () => resolveOld({ appearance: { character: 'fold' } }));
 expect(screen.getByAltText('Runtime').src).toContain('pebble-ready.webp');
});
