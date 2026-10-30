import React from 'react';
import { render, screen, act } from '@testing-library/react';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '', search: '' }) }), { virtual: true });
import OpenDotEntry from '../OpenDotEntry';

const first = 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07';
const second = '897b5ddc-9c1d-4877-ace8-d1cdeddb16bd';
const route = id => ({ pathname: `/hivemind/app/employee/dots/employee/${id}`, search: '' });
const origin = 'https://runtime-runner.singulancelabs.com';

test('switches the native router without replacing or reloading the employee document', () => {
  const view = render(<OpenDotEntry initialRoute={route(first)} route={route(first)} />);
  const frame = screen.getByTitle('HyperAgent workspace');
  const post = jest.spyOn(frame.contentWindow, 'postMessage');
  const ready = id => act(() => window.dispatchEvent(new MessageEvent('message', {
    origin, source: frame.contentWindow, data: { type: 'hivemind.open-dot.ready', version: 1, employeeId: id },
  })));
  ready(first);
  expect(screen.queryByRole('status')).toBeNull();
  view.rerender(<OpenDotEntry initialRoute={route(first)} route={route(second)} />);
  expect(screen.getByTitle('HyperAgent workspace')).toBe(frame);
  expect(frame.getAttribute('src')).toContain(`/employees/${first}`);
  expect(post).toHaveBeenCalledWith(expect.objectContaining({ employeeId: second, type: 'hivemind.open-dot.navigate' }), origin);
  expect(screen.getByRole('status')).toBeTruthy();
  ready(first);
  expect(screen.getByRole('status')).toBeTruthy();
  ready(second);
  expect(screen.queryByRole('status')).toBeNull();
  post.mockRestore();
});

describe('a newly created employee after another employee', () => {
  const created = '061604cc-0000-4000-8000-000000000001';
  const status = id => ({ type: 'hivemind.open-dot.room-status', version: 1, employeeId: id, rooms: [] });
  const send = (frame, data) => act(() => window.dispatchEvent(new MessageEvent('message', { origin, source: frame.contentWindow, data })));
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('lifts Connecting when the frame reports the new employee room', () => {
    const view = render(<OpenDotEntry initialRoute={route(first)} route={route(first)} />);
    const frame = screen.getByTitle('HyperAgent workspace');
    send(frame, { type: 'hivemind.open-dot.ready', version: 1, employeeId: first });
    view.rerender(<OpenDotEntry initialRoute={route(first)} route={route(created)} />);
    expect(screen.getByRole('status')).toBeTruthy();
    send(frame, status(first));
    expect(screen.getByRole('status')).toBeTruthy();
    send(frame, status(created));
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('swaps the frame to the new employee when the retained document never acknowledges the switch', () => {
    const view = render(<OpenDotEntry initialRoute={route(first)} route={route(first)} />);
    const frame = screen.getByTitle('HyperAgent workspace');
    send(frame, { type: 'hivemind.open-dot.ready', version: 1, employeeId: first });
    view.rerender(<OpenDotEntry initialRoute={route(first)} route={route(created)} />);
    expect(screen.getByTitle('HyperAgent workspace').getAttribute('src')).toContain(`/employees/${first}`);
    act(() => { jest.advanceTimersByTime(6500); });
    const next = screen.getByTitle('HyperAgent workspace');
    expect(next).not.toBe(frame);
    expect(next.getAttribute('src')).toContain(`/employees/${created}`);
    expect(screen.getByRole('status')).toBeTruthy();
    send(next, { type: 'hivemind.open-dot.ready', version: 1, employeeId: created });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
