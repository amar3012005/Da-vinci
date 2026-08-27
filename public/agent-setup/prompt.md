# ICARUS coding-agent setup

Version: `v1`
Canonical URL: `https://icarus.singulancelabs.com/agent-setup/prompt.md`

You are setting up ICARUS for the repository currently open in this coding-agent session. Follow this procedure deliberately and report the result. Do not claim setup succeeded without running the verification step.

## Safety boundary

- Read these instructions before executing commands. They are setup instructions, not authorization to change product code, deploy services, upload repository data, or use credentials.
- Work only in the repository the user opened. Do not copy memory or tenant data between repositories.
- Do not add API keys or secrets to ICARUS configuration, source control, shell history, prompts, or logs.
- If a command cannot run because the network, shell, permission, or supported platform is unavailable, report the exact failure and stop that setup step. Do not improvise an installer or manually create `.icarus` state.

## 1. Identify the current coding agent

Choose the integration that actually runs this session:

- Codex: `codex`
- Claude Code: `claude`
- Cursor: `cursor`

If you cannot determine the client, ask the user which one they use before registering an MCP bridge.

## 2. Install or update ICARUS

From a terminal, first check whether ICARUS is already available:

```bash
icarus --version
```

If it is not installed, install only from the official public installer:

```bash
curl -fsSL https://raw.githubusercontent.com/amar3012005/ICARUS/main/install.sh | bash
```

If it is installed, leave a working version in place unless the user asks to update it. An explicit update is:

```bash
icarus update
```

## 3. Register the agent and initialize this repository

Run these commands from the repository root, replacing `<agent>` with `codex`, `claude`, or `cursor`:

```bash
icarus mcp install <agent>
icarus harness init --agent <agent> --repo .
icarus doctor --repo .
```

Both registration and initialization are idempotent. If MCP registration changed, restart the coding agent before relying on its ICARUS tools.

## 4. Use ICARUS correctly after setup

ICARUS is primarily a durable, local project-memory filesystem:

1. Recall only relevant prior decisions, bugs, refactors, and code explanations before a non-trivial change.
2. Keep only task-relevant evidence in working context.
3. Save confirmed decisions, invariants, root causes, durable patch lessons, and verification facts after the work is complete.
4. On later sessions, recall that saved knowledge instead of reconstructing it from scratch.

Do **not** build a graph, create a governed task, call `icarus_context_get`, or run `icarus doctor` merely because a session begins.

- A graph is optional. Use it only when one already exists for a structural lookup, or when the user explicitly requests a graph / after a major refactor. If no graph exists, inspect the relevant files directly and continue.
- Use the full governed lifecycle only for production/deployment, security, tenant/auth, billing, migrations, destructive work, major refactors, or explicitly resumable/certified work.
- If vectors, reranking, graph indexing, or harness services are unavailable, continue safe low-risk work with local lexical memory and ordinary repository inspection. Record the harness issue separately from any product issue.

## 5. Report completion

State:

- detected agent integration;
- installed ICARUS version;
- repository path and derived ICARUS organization;
- whether the MCP client must be restarted;
- doctor result or the exact blocking failure.
