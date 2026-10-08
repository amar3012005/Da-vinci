import { parse } from 'es-module-lexer/js';
import { trustedHarnessUrl } from './native-harness-transport';
import { bytesToBase64 } from './native-body';

/** URL rewriting is limited to the authenticated, release-owned DSH module graph. */
export function createNativeHarnessLoader(fetchRunner) {
  const modules = new Map(); const classic = new Map(); const styles = new Map();
  const importModule = async (specifier, base = 'https://next.singulancelabs.com/') => {
    const url = trustedHarnessUrl(new URL(specifier, base));
    return import(/* webpackIgnore: true */ await moduleUrl(url));
  };
  window.__HIVEMIND_NATIVE_IMPORT__ = importModule;
  async function source(url) {
    const response = await fetchRunner(url);
    if (!response.ok) throw new Error(`Native Harness resource failed: HTTP ${response.status}`);
    return response.text();
  }
  async function moduleUrl(url, ancestors = new Set()) {
    if (ancestors.has(url)) throw new Error('Native Harness cyclic static module graph is not supported');
    if (modules.has(url)) return modules.get(url);
    const pending = (async () => {
      let text = await source(url); const replacements = [];
      const [imports] = parse(text, url); const chain = new Set([...ancestors, url]);
      for (const item of imports) {
        if (item.d === -2 && imports.some(parent => parent.d >= 0 && parent.s <= item.s && parent.e >= item.e)) continue;
        if (item.d === -2) { replacements.push({ start: item.s, end: item.e, value: `({url:${JSON.stringify(url)}})` }); continue; }
        if (item.d >= 0) {
          let expression = text.slice(item.s, item.e);
          for (const meta of imports.filter(child => child.d === -2 && child.s >= item.s && child.e <= item.e).sort((a, b) => b.s - a.s)) expression = expression.slice(0, meta.s - item.s) + `({url:${JSON.stringify(url)}})` + expression.slice(meta.e - item.s);
          replacements.push({ start: item.ss, end: item.se, value: `window.__HIVEMIND_NATIVE_IMPORT__(${expression},${JSON.stringify(url)})` });
        } else if (item.n) {
          const child = trustedHarnessUrl(new URL(item.n, url));
          replacements.push({ start: item.s, end: item.e, value: await moduleUrl(child, chain) });
        } else throw new Error('Native Harness module import could not be resolved');
      }
      for (const replacement of replacements.sort((a, b) => b.start - a.start)) text = text.slice(0, replacement.start) + replacement.value + text.slice(replacement.end);
      // Authenticated styles are installed before mounting. Browser modulepreload
      // would otherwise bypass the OS cookie jar; the import seam owns loading.
      text = text.replace(/__vite__mapDeps\((\[[\d,\s]*\])\)/g, '[]');
      return URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    })();
    modules.set(url, pending);
    try { return await pending; } catch (error) { modules.delete(url); throw error; }
  }
  async function loadBundle(input) {
    const url = trustedHarnessUrl(input);
    if (classic.has(url)) return classic.get(url);
    const pending = (async () => {
      const text = await source(url);
      const blob = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
      try { await script(blob); } finally { URL.revokeObjectURL(blob); }
    })();
    classic.set(url, pending);
    try { return await pending; } catch (error) { classic.delete(url); throw error; }
  }
  async function loadStyle(input) {
    const url = trustedHarnessUrl(input);
    if (styles.has(url)) return styles.get(url);
    const pending = (async () => {
      let text = await source(url);
      const references = [...text.matchAll(/url\(\s*(['"]?)([^'"()]+)\1\s*\)/g)];
      for (const match of references.reverse()) {
        if (match[2].startsWith('data:') || match[2].startsWith('#')) continue;
        const asset = await fetchRunner(trustedHarnessUrl(new URL(match[2], url)));
        if (!asset.ok) throw new Error('Native Harness stylesheet asset could not be loaded');
        const data = bytesToBase64(new Uint8Array(await asset.arrayBuffer()));
        const value = `url("data:${asset.headers.get('content-type') || 'application/octet-stream'};base64,${data}")`;
        text = text.slice(0, match.index) + value + text.slice(match.index + match[0].length);
      }
      const style = document.createElement('style'); style.dataset.dshNativeStyle = url; style.textContent = text; document.head.append(style);
      return style;
    })();
    styles.set(url, pending);
    try { return await pending; } catch (error) { styles.delete(url); throw error; }
  }
  return { importModule, loadBundle, loadStyle, prepareModule: input => moduleUrl(trustedHarnessUrl(input)) };
}

function script(src) {
  return new Promise((resolve, reject) => {
    const element = document.createElement('script'); element.src = src; element.async = false;
    element.onload = () => { element.remove(); resolve(); };
    element.onerror = () => { element.remove(); reject(new Error('Native Harness bundle could not execute')); };
    document.head.append(element);
  });
}
