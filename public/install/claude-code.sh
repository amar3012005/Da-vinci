#!/usr/bin/env bash
# HIVEMIND × Claude Code (CLI) — one-shot installer
# Run: curl -fsSL https://hivemind.davinciai.eu/install/claude-code.sh | bash
#
# Claude Code uses its own CLI to register MCP servers (no JSON file editing).
# We just need to invoke `claude mcp add` with the right args.

set -euo pipefail

INSTALLER_BASE="${INSTALLER_BASE:-https://hivemind.davinciai.eu/install}"
COMMON_LIB="${COMMON_LIB:-$INSTALLER_BASE/installer-common.sh}"

if [ -f "./installer-common.sh" ]; then
  source ./installer-common.sh
else
  source <(curl -fsSL "$COMMON_LIB")
fi

header "Claude Code (CLI)"

step "Detecting OS..."
detect_os
ok "OS: $OS ($ARCH)"

check_prereqs
require_cmd claude

# ──────────────────────────────────────────────────────────────────────
# Key
# ──────────────────────────────────────────────────────────────────────
prompt_for_key
validate_key

# ──────────────────────────────────────────────────────────────────────
# Register MCP server via Claude Code CLI
# ──────────────────────────────────────────────────────────────────────
step "Registering HIVEMIND with Claude Code..."

# Remove any existing 'hivemind' entry first (idempotent).
# Strip from all 3 scopes — a bare `mcp remove` errors when entry exists in
# multiple scopes, and a leftover project/local entry blocks the user-scope
# `mcp add` below with "already exists".
claude mcp remove hivemind -s user    2>/dev/null || true
claude mcp remove hivemind -s local   2>/dev/null || true
claude mcp remove hivemind -s project 2>/dev/null || true

# Add it (user scope = available across all sessions)
if claude mcp add --transport http --scope user hivemind \
  "$HIVEMIND_MCP_URL" \
  --header "Authorization: Bearer $HIVEMIND_KEY"; then
  ok "Registered: claude mcp list will show 'hivemind'"
else
  abort "claude mcp add failed"
fi

# ──────────────────────────────────────────────────────────────────────
# Verify
# ──────────────────────────────────────────────────────────────────────
step "Listing registered MCP servers..."
if claude mcp list 2>/dev/null | grep -q "hivemind"; then
  ok "Confirmed: hivemind is registered"
else
  warn "Could not confirm via 'claude mcp list' — try in a new Claude Code session"
fi

verify_connection

# Claude Code is a CLI — no restart needed. New sessions pick it up.
echo ""
ok "No restart needed — Claude Code picks up new MCP servers on next session"

record_install "claude-code" "claude-mcp-cli"
print_success_footer "Claude Code"

echo "  ${C_DIM}Tip: list servers with  claude mcp list${C_RESET}"
echo "  ${C_DIM}Tip: remove with        claude mcp remove --scope user hivemind${C_RESET}"
