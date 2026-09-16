import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'HarnessChatSurface.jsx'), 'utf8');

test('only a successful legacy rollout receipt can render the legacy surface', () => {
  expect(source).toContain("const [mode, setMode] = useState(null);");
  expect(source).toContain("mode === 'legacy' ? legacy : null");
  expect(source).not.toContain("const [mode, setMode] = useState('legacy');");
});
