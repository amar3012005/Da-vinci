import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'HarnessChatSurface.jsx'), 'utf8');
const overview = fs.readFileSync(path.resolve(__dirname, '..', 'Overview.jsx'), 'utf8');
const nativeSurface = fs.readFileSync(path.resolve(__dirname, '..', 'HarnessSurface.jsx'), 'utf8');

test('only a successful legacy rollout receipt can render the legacy surface', () => {
  expect(source).toContain("const [mode, setMode] = useState(null);");
  expect(source).toContain("mode === 'legacy' ? legacy : null");
  expect(source).not.toContain("const [mode, setMode] = useState('legacy');");
});

test('admission gates the whole legacy overview and transitions without a document reload', () => {
  expect(overview).toContain('return <HarnessChatSurface legacy={<LegacyOverview />} />;');
  expect(overview).toContain('<OverviewChat inputRef={chatInputRef} />');
  expect(source).toContain('navigate(target, { replace: true });');
  expect(source).toContain('navigateHarnessTicket(ticket, `${HARNESS_OVERVIEW_PATH}/new`, navigate)');
});

test('an admitted tab resumes its last native session before rendering legacy content', () => {
  expect(overview).toContain("const LAST_HARNESS_SESSION_KEY = 'hm.lastHarnessSession';");
  expect(overview).toContain('if (cachedSession) return <Navigate to={cachedSession} replace />;');
  expect(overview).toContain('rememberHarnessSessionPath(pathname);');
});

test('cached native remount waits for the prior app disposal', () => {
  expect(nativeSurface).toContain('const pendingDispose = window.__HIVE_HARNESS_DISPOSE_PROMISE__;');
  expect(nativeSurface).toContain('await pendingDispose;');
  expect(nativeSurface).toContain('window.__HIVE_HARNESS_DISPOSE_PROMISE__ = disposePromise;');
});
