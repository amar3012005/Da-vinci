import React from 'react';
import { render, screen } from '@testing-library/react';
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LegacyArtifactsRedirect from '../LegacyArtifactsRedirect';
import { ARTIFACTS_PATH, LIBRARY_PATH } from '../../layout/sidebar-tools';

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname}{search}</p>;
}

const app = initial => <MemoryRouter initialEntries={[initial]}>
  <Routes>
    <Route path={ARTIFACTS_PATH} element={<LegacyArtifactsRedirect />} />
    <Route path={LIBRARY_PATH} element={<Where />} />
  </Routes>
</MemoryRouter>;

test('the former Artifacts path lands on the Library', () => {
  render(app(ARTIFACTS_PATH));
  expect(screen.getByTestId('where').textContent).toBe('/hivemind/app/employee/library');
});

test('a saved link keeps its folder, search and type', () => {
  render(app(`${ARTIFACTS_PATH}?folder=Reports&type=image`));
  expect(screen.getByTestId('where').textContent).toBe('/hivemind/app/employee/library?folder=Reports&type=image');
});
