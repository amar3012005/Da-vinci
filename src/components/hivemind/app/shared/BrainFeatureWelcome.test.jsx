import React from 'react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import '@testing-library/jest-dom';
import BrainFeatureWelcome from './BrainFeatureWelcome';
import { brainFeatureArtwork, featureForBrainPath } from './brain-feature-artwork';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
test('every Brain slide resolves to its own page; Runtime and callbacks never receive a Brain popup', () => {
  for (const feature of brainFeatureArtwork) expect(featureForBrainPath(feature.href)?.id).toBe(feature.id);
  expect(featureForBrainPath('/hivemind/app/overview/session/saved')?.id).toBe('company-brain');
  expect(featureForBrainPath('/hivemind/app/graph-2d')?.id).toBe('memory-graph');
  for (const path of ['/hivemind/app/employee/harness', '/hivemind/app/employees', '/hivemind/app/connect/composio/callback']) expect(featureForBrainPath(path)).toBeNull();
});
test('one card dismisses, then changes artwork and reopens for the next feature', () => {
  function Subject() {
    const navigate = useNavigate();
    return <><button onClick={() => navigate('/hivemind/app/meeting-notes')}>Next page</button><BrainFeatureWelcome/></>;
  }
  render(<MemoryRouter initialEntries={['/hivemind/app/memories']}><Subject/></MemoryRouter>);
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByRole('img')).toHaveAttribute('src', '/images/feature-banners/memories.webp');
  fireEvent.click(screen.getByRole('button', { name: 'Explore page' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByRole('dialog', { name: 'Meeting Intelligence' })).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('src', '/images/feature-banners/meeting-intelligence-v2.webp');
  expect(screen.getByRole('img')).toHaveAccessibleName('Connect your team’s thinking to the company Brain. Turn conversations into decisions, commitments and shared understanding.');
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.click(screen.getByRole('button', { name: 'Explore Meeting Intelligence' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
});
test.each(['connectors', 'knowledge'])('%s keeps its own page modal without a duplicate shell dialog', page => {
  render(<MemoryRouter initialEntries={['/hivemind/app/' + page]}><BrainFeatureWelcome/></MemoryRouter>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
