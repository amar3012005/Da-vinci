const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = React;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextEncoder = require('util').TextEncoder;
// CRA's Jest 27 resolver predates React Router 7 package exports.
const { MemoryRouter, useLocation, useNavigate } = require('../../../../../../node_modules/react-router/dist/development/index.js');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// Exercise the actual route selector without loading the unrelated legacy
// dashboard's WebGL, charts, onboarding and network dependencies.
const source = fs.readFileSync(path.join(__dirname, '..', 'Overview.jsx'), 'utf8');
const selector = source.slice(source.indexOf('export default function Overview()'), source.indexOf('\nfunction LegacyOverview()'));
const compiled = babel.transformSync(selector.replace('export default ', ''), {
  babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'],
}).code;
const Overview = new Function('React', 'useLocation', 'shouldUseMobileChat', 'MobileChatRedirect',
  'rememberHarnessSessionPath', 'HarnessSurface', 'cachedHarnessSessionPath', 'ResumeHarnessSession',
  'HarnessChatSurface', 'LegacyOverview', `${compiled}; return Overview;`)(
  React, useLocation, () => false, () => null, () => {},
  () => React.createElement('div', null, 'Native chat'), () => null, () => null,
  () => React.createElement('div', null, 'Admission'), () => null,
);

it('renders native chat after SPA admission and returns to admission on back navigation', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let navigate;
  function Controls() { navigate = useNavigate(); return null; }
  act(() => root.render(React.createElement(MemoryRouter, { initialEntries: ['/hivemind/app/overview'] },
    React.createElement(Controls), React.createElement(Overview))));
  expect(container.textContent).toBe('Admission');
  act(() => navigate('/hivemind/app/overview/new'));
  expect(container.textContent).toBe('Native chat');
  act(() => navigate(-1));
  expect(container.textContent).toBe('Admission');
  act(() => root.unmount());
  container.remove();
});
