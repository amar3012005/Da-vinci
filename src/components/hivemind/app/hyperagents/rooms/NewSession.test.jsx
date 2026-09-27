import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import NewSession from './NewSession';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('new session passes selected company task mode with prompt', () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(<NewSession onSubmit={onSubmit} />); });
  const button = (label) => [...host.querySelectorAll('button')].find((item) => item.textContent.includes(label));
  act(() => { Simulate.click(button('HyperAgents mode')); });
  act(() => { Simulate.click(button('Company task')); });
  act(() => { Simulate.change(host.querySelector('textarea'), { target: { value: 'Create a seed pitch deck' } }); });
  act(() => { Simulate.click(host.querySelector('button[aria-label="Send"]')); });
  expect(onSubmit).toHaveBeenCalledWith('Create a seed pitch deck', { mode: 'company' });
  act(() => { root.unmount(); });
  host.remove();
});
