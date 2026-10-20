// Shared public positioning for the homepage catalogs, navigation and stories.
export const PRODUCT_CATALOG = [
  {
    name: 'HIVEMIND', role: 'Company understanding',
    title: 'Your proactive company Brain', symbol: '✳',
    text: 'Connect documents, workspaces and meeting knowledge to understand decisions, commitments and what needs attention.',
    href: '/hivemind', link: 'Explore HIVEMIND', img: '/sp-hivemind.webp',
  },
  {
    name: 'Runtime', role: 'Anticipation and coordination',
    title: 'Your proactive, always-on AI Chief of Staff', symbol: '↗',
    text: 'Anticipate what needs attention, plan the next steps, delegate to specialist HyperAgents and review their work. Runtime brings you in when your judgment or permission is needed.',
    href: '/runtime', link: 'Meet Runtime', img: '/assets/getruntime/company.webp',
  },
  {
    name: 'HyperAgents', role: 'Specialist execution',
    title: 'Your team of specialist AI employees', symbol: '⌘',
    text: 'Specialists for research, operations, marketing and more, working with company context. Each has a role, a persistent workspace and deliverables; Runtime coordinates their work.',
    href: '/hyperagents', link: 'Meet your HyperAgents', img: '/sp-hyperagents.webp', objectPosition: 'center bottom',
  },
  {
    name: 'ICARUS', role: 'Research and open source',
    title: 'The research behind the intelligence', symbol: '◎',
    text: 'Explore our research and open-source work in memory and agent execution, including the methods and limits behind published evaluations.',
    href: '/research/icarus', link: 'Explore the research', img: '/thesis-greekgod.webp',
  },
];
export const PRODUCT_ROLE_LINE = 'HIVEMIND understands your company. Runtime anticipates and coordinates. HyperAgents carry out specialist work. ICARUS advances the research behind it.';
