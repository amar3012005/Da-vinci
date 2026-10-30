import React from 'react';
import { render, screen, act } from '@testing-library/react';
import OpenDotEntry from '../OpenDotEntry';
// Virtual: Jest 27 cannot resolve react-router 7's exports map; the entry only reads the route prop here.
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '', search: '' }) }), { virtual: true });

const route = { pathname: '/hivemind/app/employee/dots/employee/c14aaef5-24fb-46c2-806c-c3f6c1d88b07', search: '' };
const origin = 'https://runtime-runner.singulancelabs.com';

test('a removed employee reported by the active room frame reaches the sidebar; other senders and shapes are ignored', () => {
  const removed = jest.fn();
  window.addEventListener('hivemind:employee-removed', removed);
  render(<OpenDotEntry initialRoute={route} route={route} />);
  const frame = screen.getByTitle('HyperAgent workspace');
  const send = (source, data, from = origin) => act(() => window.dispatchEvent(new MessageEvent('message', { origin: from, source, data })));
  const message = { type: 'hivemind.open-dot.employee-removed', version: 1, employeeId: 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07' };
  send(frame.contentWindow, message, 'https://foreign.example');
  send(window, message);
  send(frame.contentWindow, { ...message, employeeId: 7 });
  expect(removed).not.toHaveBeenCalled();
  send(frame.contentWindow, message);
  expect(removed).toHaveBeenCalledTimes(1);
  expect(removed.mock.calls[0][0].detail).toEqual({ employeeId: message.employeeId });
  window.removeEventListener('hivemind:employee-removed', removed);
});
