import React from 'react';
import { render, screen, act } from '@testing-library/react';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '', search: '' }) }));
import OpenDotEntry from '../OpenDotEntry';

const first = 'c14aaef5-24fb-46c2-806c-c3f6c1d88b07';
const second = '897b5ddc-9c1d-4877-ace8-d1cdeddb16bd';
const route = id => ({ pathname: `/hivemind/app/employee/dots/employee/${id}`, search: '' });
const origin = 'https://runtime-runner.singulancelabs.com';

test('switches the native router without replacing or reloading the employee document', () => {
  const view = render(<OpenDotEntry initialRoute={route(first)} route={route(first)} />);
  const frame = screen.getByTitle('Open Dot workspace');
  const post = jest.spyOn(frame.contentWindow, 'postMessage');
  const ready = id => act(() => window.dispatchEvent(new MessageEvent('message', {
    origin, source: frame.contentWindow, data: { type: 'hivemind.open-dot.ready', version: 1, employeeId: id },
  })));
  ready(first);
  expect(screen.queryByRole('status')).toBeNull();
  view.rerender(<OpenDotEntry initialRoute={route(first)} route={route(second)} />);
  expect(screen.getByTitle('Open Dot workspace')).toBe(frame);
  expect(frame.getAttribute('src')).toContain(`/employees/${first}`);
  expect(post).toHaveBeenCalledWith(expect.objectContaining({ employeeId: second, type: 'hivemind.open-dot.navigate' }), origin);
  expect(screen.getByRole('status')).toBeTruthy();
  ready(first);
  expect(screen.getByRole('status')).toBeTruthy();
  ready(second);
  expect(screen.queryByRole('status')).toBeNull();
  post.mockRestore();
});
