#!/usr/bin/env bash
# HIVEMIND × Claude Code — one-shot installer (writes ~/.claude.json directly)
# Run: curl -fsSL https://hivemind.davinciai.eu/install/claude-code.sh | bash
#
# Claude Code reads ~/.claude.json. We write the canonical HIVEMIND MCP
# schema directly so the install is consistent with Cursor/Antigravity
# and survives across CLI version bumps. CLI fallback used only when
# claude binary is present AND user prefers it.

set -euo pipefail

INSTALLER_BASE="${INSTALLER_BASE:-https://hivemind.davinciai.eu/install}"
COMMON_LIB="${COMMON_LIB:-$INSTALLER_BASE/installer-common.sh}"

if [ -f "./installer-common.sh" ]; then
  source ./installer-common.sh
else
  source <(curl -fsSL "$COMMON_LIB")
fi

header "Claude Code"

step "Detecting OS..."
detect_os
ok "OS: $OS ($ARCH)"

check_prereqs

# ──────────────────────────────────────────────────────────────────────
# Locate Claude Code config (~/.claude.json, all platforms)
# ──────────────────────────────────────────────────────────────────────
step "Locating Claude Code config..."
CC_CONFIG="${HOME}/.claude.json"
ok "Config path: $CC_CONFIG"

prompt_for_key
validate_key

# ──────────────────────────────────────────────────────────────────────
# Patch ~/.claude.json — set mcpServers.hivemind to canonical schema.
# If CLI ALSO has the entry (project/local scope), strip it so we don't
# end up with duplicates that error on next `claude mcp remove`.
# ──────────────────────────────────────────────────────────────────────
step "Patching Claude Code config..."
ensure_json_file "$CC_CONFIG"

if jq -e '.mcpServers.hivemind' "$CC_CONFIG" >/dev/null 2>&1; then
  warn "Existing 'hivemind' entry found in $CC_CONFIG"
  if ! confirm "Overwrite it?"; then abort "Aborted"; fi
fi

backup_file "$CC_CONFIG"

json_merge "$CC_CONFIG" \
  ".mcpServers = (.mcpServers // {}) | .mcpServers.hivemind = {
     \"transport\": \"http\",
     \"url\": \"$HIVEMIND_MCP_URL\",
     \"headers\": {
       \"Authorization\": \"Bearer $HIVEMIND_KEY\"
     }
   }"

ok "Wrote mcpServers.hivemind to $CC_CONFIG"

# Best-effort cleanup of stale project/local scope entries that would
# otherwise block `claude mcp` remove operations later.
if command -v claude >/dev/null 2>&1; then
  claude mcp remove hivemind -s local   >/dev/null 2>&1 || true
  claude mcp remove hivemind -s project >/dev/null 2>&1 || true
fi

# ──────────────────────────────────────────────────────────────────────
# Verify — CLI list check + server reachability
# ──────────────────────────────────────────────────────────────────────
step "Verifying Claude Code sees the entry..."
if command -v claude >/dev/null 2>&1; then
  if claude mcp list 2>/dev/null | grep -q "hivemind"; then
    ok "claude mcp list shows hivemind"
  else
    warn "claude mcp list did not show hivemind — restart Claude Code"
  fi
fi

verify_connection

echo ""
ok "Claude Code picks up MCP servers on next session — no restart of OS needed"

record_install "claude-code" "$CC_CONFIG"
print_success_footer "Claude Code"

echo "  ${C_DIM}Config: $CC_CONFIG${C_RESET}"
echo "  ${C_DIM}List:   claude mcp list${C_RESET}"
echo "  ${C_DIM}Remove: curl -fsSL $INSTALLER_BASE/uninstall.sh | bash -s claude-code${C_RESET}"
