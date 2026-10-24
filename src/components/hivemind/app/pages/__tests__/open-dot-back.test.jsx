import React from 'react';
import { render, screen, act } from '@testing-library/react';
import OpenDotEntry from '../OpenDotEntry';
// Virtual: Jest 27 cannot resolve react-router 7's exports map; the entry only reads the route prop here.
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '', search: '' }) }), { virtual: true });

const route = { pathname: '/hivemind/app/employee/dots/employee/c14aaef5-24fb-46c2-806c-c3f6c1d88b07', search: '' };
const origin = 'https://runtime-runner.singulancelabs.com';

test('the phone room back button opens the team drawer only from the active room frame', () => {
  const opened = jest.fn();
  window.addEventListener('hivemind:open-dot-team', opened);
  const view = render(<OpenDotEntry initialRoute={route} route={route} />);
  const frame = screen.getByTitle('HyperAgent workspace');
  const send = (source, from = origin) => act(() => window.dispatchEvent(new MessageEvent('message', { origin: from, source, data: { type: 'hivemind.open-dot.back', version: 1 } })));
  send(frame.contentWindow, 'https://foreign.example');
  send(window);
  expect(opened).not.toHaveBeenCalled();
  send(frame.contentWindow);
  expect(opened).toHaveBeenCalledTimes(1);
  view.rerender(<OpenDotEntry initialRoute={route} route={route} active={false} />);
  send(frame.contentWindow);
  expect(opened).toHaveBeenCalledTimes(1);
  window.removeEventListener('hivemind:open-dot-team', opened);
});
