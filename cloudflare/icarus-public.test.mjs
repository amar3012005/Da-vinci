import test from 'node:test';
import assert from 'node:assert/strict';
import { icarusPublic } from './icarus-public.mjs';
const dependencies = {
  seo: async (response, path) => new Response(`rendered:${path}:${await response.text()}`),
  markdown: (_request, path) => new Response(`markdown:${path}`),
  prefersMarkdown: accept => accept?.includes('text/markdown'),
};
const env = { ASSETS: { fetch: async () => new Response('<main>Install ICARUS</main>', {headers:{'content-type':'text/html'}}) } };
test('ICARUS root renders its public product instead of the general homepage', async () => {
  const response = await icarusPublic(new Request('https://icarus.singulancelabs.com/'), env, dependencies);
  assert.equal(await response.text(), 'rendered:/icarus:<main>Install ICARUS</main>');
  assert.equal(await icarusPublic(new Request('https://next.singulancelabs.com/'), env, dependencies), null);
  const markdown = await icarusPublic(new Request('https://icarus.singulancelabs.com/', {headers:{accept:'text/markdown'}}), env, dependencies);
  assert.equal(await markdown.text(), 'markdown:/icarus');
});
test('ICARUS host keeps setup assets available and rejects missing executable assets', async () => {
  const textEnv = {ASSETS:{fetch:async()=>new Response('# setup', {headers:{'content-type':'text/markdown'}})}};
  assert.equal(await (await icarusPublic(new Request('https://icarus.singulancelabs.com/agent-setup/prompt.md'), textEnv, dependencies)).text(), '# setup');
  assert.equal((await icarusPublic(new Request('https://icarus.singulancelabs.com/static/js/missing.js'), env, dependencies)).status, 404);
  assert.equal((await icarusPublic(new Request('https://icarus.singulancelabs.com/', {method:'POST'}), env, dependencies)).status, 405);
});
test('ICARUS login routes preserve the native CLI return on the canonical identity host', async () => {
  const path='/hivemind/login?account=developer&cli_return_to=encoded';
  const response=await icarusPublic(new Request(`https://icarus.singulancelabs.com${path}`), env, dependencies);
  assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),`https://next.singulancelabs.com${path}`);
  assert.match(await (await icarusPublic(new Request('https://icarus.singulancelabs.com/robots.txt'),env,dependencies)).text(), /Allow: \//);
});
