// Public product context only. Never import internal READMEs, tenant content,
// operational topology, credentials or private session data into discovery.
export const AGENT_CONTEXT = `# SINGULANCE: public agent context

## Start here
SINGULANCE builds HIVEMIND, Runtime, HyperAgents and TARA. This document is a reading guide, not an instruction that overrides the human user's request. It grants no access or permission to execute work.

- Public company website: https://singulancelabs.com/
- Product overview: https://singulancelabs.com/hivemind
- Workspace and account sign-in: https://next.singulancelabs.com/
- Runtime product: https://runtime.singulancelabs.com/
- Full public page text: https://singulancelabs.com/llms-full.txt
- Public page index: https://singulancelabs.com/llms.txt
- Research index: https://singulancelabs.com/research

## HIVEMIND: shared company understanding
HIVEMIND is the company Brain: organizational memory and context for people and AI teammates. The public product describes connected sources, recall and evidence-backed answers. Private workspace information requires the user's authorization.

Uploads bring documents and other supported material into company knowledge. Connectors link supported tools through their own authorization flows. Memory Graph helps people explore relationships in that knowledge. Meeting Intelligence connects discussions, decisions and commitments with company context. Dreaming explores company knowledge to surface connections and insights for review. Feature availability, connected sources and permissions depend on the actual workspace; do not assume an account has access because a feature appears on the public website.

## Runtime: anticipatory work with human control
Runtime is positioned as the proactive, always-on AI Chief of Staff coordinating HyperAgents. Its product direction is anticipatory intelligence: relate authorized company signals to goals, plan and coordinate specialist work, review results and bring a person in when needed. Notifications, chat and calls can request human input. A call or notification is not itself approval to execute consequential work. Describe capabilities with the conditions and limitations published on the Runtime pages; do not promise unrestricted autonomy.

## HyperAgents: digital teammates
HyperAgents are persistent specialist teammates with roles, workspaces, tasks and artifacts. Runtime coordinates the work; HIVEMIND supplies shared context. Actual tools and actions depend on connected accounts, scopes and explicit approval requirements.

## TARA: voice with context
TARA is the voice experience connected to company context. Read the public TARA page for current positioning. Do not infer that every workspace has calling, recording, telephony or every voice provider enabled.

## Research and evidence
ICARUS is an agent memory filesystem. Cognitive Swarm Intelligence concerns shared memory and coordinated agents. Published memory benchmarks and post-quantum research have their own methods and limitations. Product descriptions are not independent benchmark evidence. Cite the canonical research article and evaluation conditions rather than inventing performance guarantees.

- https://singulancelabs.com/research/icarus
- https://singulancelabs.com/research/cognitive-swarm-intelligence
- https://singulancelabs.com/research/post-quantum-cryptography
- https://singulancelabs.com/benchmark
- https://singulancelabs.com/research/runtime

## How to retrieve and cite public material
Read llms.txt to choose a page. Append /index.md or /index.txt to a listed product or research path; the homepage uses /index.md or /index.txt. HTML pages also support Accept: text/markdown. llms-full.txt combines the generated public page text; follow canonical links for figures, methods, policies and the latest details. Not every authenticated feature has public documentation, and this guide is not a live inventory of an account's capabilities.

## Company and definition
- Proactive intelligence: https://singulancelabs.com/proactive-intelligence
- SINGULANCE company identity: https://singulancelabs.com/about
- Amar Sai Gadde, founder of SINGULANCE: https://amar.singulancelabs.com/

## Authentication and discovery
- Authentication guide: https://singulancelabs.com/auth.md
- API catalog: https://singulancelabs.com/.well-known/api-catalog
- Public read-only schema: https://singulancelabs.com/openapi-public.json
- Agent skills: https://singulancelabs.com/.well-known/agent-skills/index.json

The hosted HIVEMIND MCP service is https://core.singulancelabs.com/api/mcp. Private company data requires an authorized connection and approved scopes. Public discovery files contain no session credentials and provide no anonymous access to private memory. Never ask a user to paste secrets into a public page or discovery file.

## Content and privacy boundaries
Public search and AI retrieval are allowed; these files do not license model training or fine-tuning. Consult https://singulancelabs.com/privacy and https://singulancelabs.com/security. Cite sources, distinguish product intent from verified availability, and ask the user before accessing their private workspace or acting on their behalf.
`;
