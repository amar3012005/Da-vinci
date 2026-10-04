import { PUBLIC_PAGES, SITE } from '../src/seo/public-pages.mjs';

export const CORE = 'https://core.singulancelabs.com';
export const SKILL_PATH = '/.well-known/agent-skills/public-research/SKILL.md';
export const SKILL = `---\nname: singulance-public-research\ndescription: Find and cite public SINGULANCE research with canonical sources and limitations.\n---\n\n# Explore public SINGULANCE research\n\nRead ${SITE}/llms.txt to choose a public page. Request its URL with Accept: text/markdown, or append /index.md. These Markdown resources are concise overviews; follow the canonical HTML link for the complete article, evidence and methodology. Distinguish published findings from product claims. Cite the canonical page.\n\nOpen the product workspace at https://next.singulancelabs.com/. For authorized MCP setup, use https://next.singulancelabs.com/hivemind/app/mcp. Public content requires no account. Private company memory and agent rooms require explicit user authorization through the existing HIVEMIND OAuth or API-key flow; see ${SITE}/auth.md. This skill grants no access and performs no writes.\n`;
export const DISCOVERY_LINKS = `<${SITE}/sitemap.xml>; rel="sitemap", <${SITE}/llms.txt>; rel="describedby"; type="text/plain", <${SITE}/.well-known/api-catalog>; rel="api-catalog", <${SITE}/.well-known/ai-catalog.json>; rel="ai-catalog", <${SITE}/.well-known/mcp/server-card.json>; rel="mcp-server-card", <${SITE}/.well-known/agent-skills/index.json>; rel="agent-skills"`;
export const isAgentDiscovery = (path) => path.startsWith('/.well-known/') || path === '/auth.md' || path === '/openapi-public.json' || path === '/index.md' || path.endsWith('/index.md');
export const markdownFor = (path) => {
  const page = PUBLIC_PAGES[path];
  return `# ${page.heading}\n\n${page.description}\n\n## Overview\n\n${page.summary}\n\nThis is a concise overview, not the complete article or policy. Read [the full page](${SITE}${path}) for the complete content, evidence and limitations.\n\n## Open your workspace\n\n[Open HIVEMIND](https://next.singulancelabs.com/) to use Brain, HyperAgents and Tara. This is an authenticated workspace; request user authorization before accessing company information.\n\n## Related public pages\n\n${Object.entries(PUBLIC_PAGES).filter(([key]) => key !== path).map(([key,p])=>`- [${p.heading}](${SITE}${key}): ${p.description}`).join('\n')}\n`;
};
export function prefersMarkdown(accept = '') {
  const types = String(accept || '').toLowerCase().split(',').map(part => {
    const [type,...params] = part.trim().split(';');
    const q = params.find(p => p.trim().startsWith('q='));
    const value = q ? Number(q.trim().slice(2)) : 1;
    return {type, q: Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0};
  });
  const md = Math.max(0,...types.filter(t=>t.type === 'text/markdown').map(t=>t.q));
  const html = Math.max(0,...types.filter(t=>t.type === 'text/html').map(t=>t.q));
  return md > 0 && md >= html;
}
function response(request, body, type='application/json', extra={}) {
  return new Response(request.method === 'HEAD' ? null : typeof body === 'string' ? body : JSON.stringify(body), {headers:{'content-type':`${type}; charset=utf-8`,'cache-control':'public, max-age=300','x-content-type-options':'nosniff','access-control-allow-origin':'*',link:DISCOVERY_LINKS,...extra}});
}
export function markdownResponse(request,path) {
  return response(request,markdownFor(path),'text/markdown',{'vary':'Accept','content-location':`${SITE}${path}`,link:`<${SITE}${path}>; rel="canonical", ${DISCOVERY_LINKS}`});
}
export async function agentDiscoveryResponse(request,path) {
  if (!['GET','HEAD'].includes(request.method)) return null;
  if (path === '/.well-known/oauth-authorization-server') return Response.redirect(`${CORE}${path}`,302);
  if (path === '/.well-known/oauth-protected-resource') return Response.redirect(`${CORE}/.well-known/oauth-protected-resource/api/mcp`,302);
  if (path === '/auth.md') return response(request,`# SINGULANCE auth.md\n\nPublic research and Markdown overviews require no authentication. HIVEMIND company memory is a separate protected resource: ${CORE}/api/mcp.\n\n## Open the workspace\n\nSign in at https://next.singulancelabs.com/ and open https://next.singulancelabs.com/hivemind/app/mcp for your account connection settings. Never share the browser session or copy account credentials into discovery files.\n\n## Existing OAuth flow\n\n- [Authorization server metadata](${CORE}/.well-known/oauth-authorization-server)\n- [Protected resource metadata](${CORE}/.well-known/oauth-protected-resource/api/mcp)\n- Authorization endpoint: ${CORE}/oauth/authorize\n- Token endpoint: ${CORE}/oauth/token\n- Authorization code flow with PKCE S256 and explicit user consent. Use only the scopes the user approves. Never place credentials in URLs.\n- Existing account API keys are accepted in the Authorization: Bearer header.\n\nThere is no anonymous access to private memory. This page does not issue credentials or claim support for new agent registration protocols.\n`,'text/markdown');
  if (path === SKILL_PATH) return response(request,SKILL,'text/markdown');
  if (path === '/.well-known/agent-skills/index.json') {
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(SKILL))),n=>n.toString(16).padStart(2,'0')).join('');
    return response(request,{$schema:'https://schemas.agentskills.io/discovery/0.2.0/schema.json',skills:[{name:'singulance-public-research',type:'skill-md',description:'Find and cite public research; distinguish overviews from full evidence.',url:`${SITE}${SKILL_PATH}`,digest:`sha256:${digest}`} ]});
  }
  if (path === '/.well-known/mcp/server-card.json') return response(request,{
    version:'1.0',protocolVersion:'2024-11-05',serverInfo:{name:'hivemind-hosted-mcp',version:'2.0.0',title:'HIVEMIND'},
    description:'Existing authenticated HIVEMIND MCP service. Available tools depend on the account and granted scopes; connect and list tools after authorization.',
    transport:{type:'streamable-http',endpoint:`${CORE}/api/mcp`},authentication:{required:true},
    capabilities:{tools:{},resources:{},prompts:{}},documentationUrl:`${SITE}/auth.md`
  });
  if (path === '/.well-known/api-catalog') return response(request,{linkset:[{anchor:SITE,'service-desc':[{href:`${SITE}/openapi-public.json`,type:'application/vnd.oai.openapi+json'}],'service-doc':[{href:`${SITE}/llms.txt`,type:'text/plain'}]},{anchor:`${CORE}/api/mcp`,'service-doc':[{href:`${SITE}/auth.md`,type:'text/markdown'}]}]},'application/linkset+json');
  if (path === '/openapi-public.json') return response(request,{openapi:'3.1.0',info:{title:'SINGULANCE public page overviews',version:'1.0.0',description:'Read-only public overviews. Canonical HTML pages contain the complete articles and policies.'},servers:[{url:SITE}],paths:Object.fromEntries(Object.entries(PUBLIC_PAGES).map(([key,page])=>[key==='/'?'/index.md':`${key}/index.md`,{get:{summary:page.heading,responses:{200:{description:'Public Markdown overview',content:{'text/markdown':{schema:{type:'string'}}}}}}}]))});
  if (path === '/.well-known/ai-catalog.json') return response(request,{specVersion:'1.0',host:{displayName:'SINGULANCE',identifier:'did:web:singulancelabs.com'},entries:[{identifier:'urn:air:singulancelabs.com:server:hivemind',displayName:'Authenticated HIVEMIND MCP',type:'application/mcp-server-card+json',url:`${SITE}/.well-known/mcp/server-card.json`,representativeQueries:['How do I connect my authorized HIVEMIND workspace?','Where is the HIVEMIND MCP authentication documentation?']},{identifier:'urn:air:singulancelabs.com:skill:public-research',displayName:'Explore public research',type:'text/markdown',url:`${SITE}${SKILL_PATH}`,representativeQueries:['Find the ICARUS research and evaluation limitations','Find published memory benchmark methodology']} ]});
  if (path === '/index.md' || path.endsWith('/index.md')) {
    const canonical=path === '/index.md' ? '/' : path.slice(0,-9);
    if (PUBLIC_PAGES[canonical]) return markdownResponse(request,canonical);
  }
  return null;
}
