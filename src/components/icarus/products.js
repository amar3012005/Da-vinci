// The open-source ICARUS family, shared by /research and dev.singulancelabs.com.
export const EMBER = '#FF5229';
export const GITHUB = 'https://github.com/amar3012005';
export const ICARUS_INSTALL = 'curl -fsSL https://raw.githubusercontent.com/amar3012005/ICARUS/main/install.sh | bash';
// The Agent Bus source is still private; flip this when the repository is published.
export const AGENT_BUS_PUBLIC = false;

/** The open-source ICARUS family, all under one SINGULANCE developer account. */
export const PRODUCTS = [
  {
    name: 'Memory',
    status: 'Stable',
    line: 'The .amr memory filesystem for agents. Save and recall locally, with no account, server or API key.',
    command: `${ICARUS_INSTALL}\nicarus save "Release notes live in docs/release.md" --org demo\nicarus recall "release notes" --org demo`,
    docs: '/research/icarus',
    repo: `${GITHUB}/ICARUS`,
  },
  {
    name: 'Harness',
    status: 'Opt-in',
    line: 'The deterministic layer around a coding agent: task contracts, context packs, verification receipts and a seal gate for high-risk work.',
    command: 'icarus harness init --agent claude\nicarus doctor',
    docs: `${GITHUB}/ICARUS/blob/main/docs/HARNESS_QUICKSTART.md`,
    repo: `${GITHUB}/ICARUS/tree/main/crate/icarus-harness`,
  },
  {
    name: 'Agent Bus',
    status: AGENT_BUS_PUBLIC ? 'New' : 'Early access',
    line: 'A durable mailbox between any two coding agents, laptop or cloud. Jobs, progress and receipts arrive by push, and nothing is lost while one sleeps.',
    command: AGENT_BUS_PUBLIC
      ? 'curl -fsSL https://raw.githubusercontent.com/amar3012005/SINGULANCE-agent-bus/main/install.sh | bash\nicarus-bus setup'
      : null,
    docs: AGENT_BUS_PUBLIC ? `${GITHUB}/SINGULANCE-agent-bus#readme` : null,
    repo: AGENT_BUS_PUBLIC ? `${GITHUB}/SINGULANCE-agent-bus` : null,
  },
  {
    name: 'Computer Use',
    status: 'Experimental',
    line: 'Computer control for agents that follows a plan the caller supplies, evaluated separately from the memory core.',
    command: null,
    docs: `${GITHUB}/HIVEMIND-Computer-use#readme`,
    repo: `${GITHUB}/HIVEMIND-Computer-use`,
  },
];

export const ACCOUNT_STEPS = [
  { n: '01', title: 'Install ICARUS', body: 'One binary for macOS, Linux and Windows. Local memory works straight away.' },
  { n: '02', title: 'Run icarus connect', body: 'Your browser opens. Create the account or sign in with email or Google.' },
  { n: '03', title: 'Use every tool', body: 'The same developer identity covers Memory, Harness, Agent Bus and Computer Use.' },
];
