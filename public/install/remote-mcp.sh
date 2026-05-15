#!/usr/bin/env bash
# HIVEMIND × Remote MCP (generic HTTP client) — config printer
# Run: curl -fsSL https://hivemind.davinciai.eu/install/remote-mcp.sh | bash
#
# For any MCP client that speaks HTTP MCP natively but isn't in our
# preset list. Prints the URL + Authorization header for manual paste.

set -euo pipefail

INSTALLER_BASE="${INSTALLER_BASE:-https://hivemind.davinciai.eu/install}"
COMMON_LIB="${COMMON_LIB:-$INSTALLER_BASE/installer-common.sh}"

if [ -f "./installer-common.sh" ]; then
  source ./installer-common.sh
else
  source <(curl -fsSL "$COMMON_LIB")
fi

header "Remote MCP (generic HTTP client)"

step "Detecting OS..."
detect_os
ok "OS: $OS ($ARCH)"

check_prereqs

prompt_for_key
validate_key

verify_connection

# ──────────────────────────────────────────────────────────────────────
# Print copy-paste config in multiple common schemas
# ──────────────────────────────────────────────────────────────────────
echo ""
echo "${C_BOLD}Paste into your MCP client config:${C_RESET}"
echo ""
echo "${C_DIM}─── Raw values ───${C_RESET}"
echo "  URL:    ${C_BOLD}${HIVEMIND_MCP_URL}${C_RESET}"
echo "  Header: ${C_BOLD}Authorization: Bearer ${HIVEMIND_KEY}${C_RESET}"
echo ""
echo "${C_DIM}─── JSON (mcpServers schema — Cursor/Antigravity/Windsurf style) ───${C_RESET}"
cat <<JSON
{
  "mcpServers": {
    "hivemind": {
      "url": "${HIVEMIND_MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${HIVEMIND_KEY}"
      }
    }
  }
}
JSON
echo ""
echo "${C_DIM}─── JSON (mcp.servers schema — VS Code style) ───${C_RESET}"
cat <<JSON
{
  "mcp": {
    "servers": {
      "hivemind": {
        "type": "http",
        "url": "${HIVEMIND_MCP_URL}",
        "headers": { "Authorization": "Bearer ${HIVEMIND_KEY}" }
      }
    }
  }
}
JSON
echo ""
echo "${C_DIM}─── stdio bridge (Claude Desktop / NotebookLM style) ───${C_RESET}"
cat <<JSON
{
  "command": "npx",
  "args": [
    "-y", "mcp-remote",
    "${HIVEMIND_MCP_URL}",
    "--header", "Authorization: Bearer ${HIVEMIND_KEY}"
  ]
}
JSON
echo ""
echo "${C_DIM}─── CLI (Claude Code style) ───${C_RESET}"
echo "  claude mcp add --transport http --scope user hivemind \\"
echo "    ${HIVEMIND_MCP_URL} \\"
echo "    --header \"Authorization: Bearer ${HIVEMIND_KEY}\""
echo ""

record_install "remote-mcp" "manual-config-printed"
print_success_footer "Remote MCP"

echo "  ${C_DIM}Restart your MCP client after pasting config.${C_RESET}"
