import { build } from 'esbuild';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

// Explicitly reviewed exclusions, not a delete-everything-unreferenced policy.
// Keep public source recoverable; these paths are omitted only from build/.
export const unusedPublicAssets = [
  { path: 'fall-frames', reason: 'Paused FallScene is outside the application import graph.' },
  ...[
    'Card.jpeg', 'background.jpeg', 'hivemind_bg.jpeg',
    'main_background.jpeg', 'main_background2.jpeg', 'main_background3.jpeg',
    'images/alpha.jpeg', 'images/beta.jpeg', 'images/gamma.jpeg',
    'images/delta.jpeg', 'images/pi.jpeg', 'images/technologies.jpeg',
    'images/technologies1.jpeg', 'images/valentine.png',
    'images/login_page.jpeg', 'images/davinci-logo.svg',
    'singulance-cover.webp', 'singulance-cover-900.avif',
  ].map(path => ({ path, reason: 'Legacy artwork has no reachable application or public-document reference.' })),
];

export function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

export function excludedReferences(documents, exclusions = unusedPublicAssets) {
  return exclusions.flatMap(asset => documents
    // Basenames catch relative URLs, CSS, srcsets and template-string paths.
    // Directory names catch dynamically constructed frame URLs as well.
    .filter(document => document.text.includes(basename(asset.path)))
    .map(document => ({ asset: asset.path, source: document.path })));
}

export async function auditPublicAssetExclusions(root = process.cwd()) {
  const graph = await build({
    absWorkingDir: root, entryPoints: ['src/index.js'], bundle: true,
    write: false, metafile: true, packages: 'external', logLevel: 'error',
    loader: {
      '.js': 'jsx', '.css': 'empty', '.svg': 'dataurl', '.png': 'dataurl',
      '.jpg': 'dataurl', '.jpeg': 'dataurl', '.webp': 'dataurl',
      '.avif': 'dataurl', '.mp3': 'dataurl',
    },
  });
  const reachable = Object.keys(graph.metafile.inputs).filter(path => /\.(?:js|jsx|ts|tsx|css)$/u.test(path));
  // esbuild's empty CSS loader does not follow @imports. Retain conservative
  // coverage of every source stylesheet rather than miss a nested asset URL.
  const styles = filesUnder(join(root, 'src')).filter(path => /\.css$/u.test(path));
  const servedDocuments = filesUnder(join(root, 'public')).filter(path => {
    const publicPath = relative(join(root, 'public'), path);
    return /\.(?:html|json|js|css|txt|xml|md|sh)$/u.test(path)
      && !unusedPublicAssets.some(asset => publicPath === asset.path || publicPath.startsWith(`${asset.path}/`));
  });
  const workerFiles = filesUnder(join(root, 'cloudflare')).filter(path => /\.(?:mjs|json)$/u.test(path));
  const paths = [...new Set([...reachable.map(path => join(root, path)), ...styles, ...servedDocuments, ...workerFiles])];
  const documents = paths.map(path => ({ path: relative(root, path), text: readFileSync(path, 'utf8') }));
  const references = excludedReferences(documents);
  if (references.length) {
    throw new Error(`Refusing to exclude referenced public assets:\n${references.map(ref => `${ref.asset} <- ${ref.source}`).join('\n')}`);
  }
  return { reachableSourceFiles: reachable.length, checkedDocuments: documents.length, exclusions: unusedPublicAssets };
}
