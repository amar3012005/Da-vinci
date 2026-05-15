#!/usr/bin/env bash
# HIVEMIND × Google Antigravity — one-shot installer
# Run: curl -fsSL https://hivemind.davinciai.eu/install/antigravity.sh | bash
#
# Antigravity uses Cursor-style mcp.json. Same shape, different path.

set -euo pipefail

INSTALLER_BASE="${INSTALLER_BASE:-https://hivemind.davinciai.eu/install}"
COMMON_LIB="${COMMON_LIB:-$INSTALLER_BASE/installer-common.sh}"

if [ -f "./installer-common.sh" ]; then
  source ./installer-common.sh
else
  source <(curl -fsSL "$COMMON_LIB")
fi

header "Google Antigravity"

step "Detecting OS..."
detect_os
ok "OS: $OS ($ARCH)"

check_prereqs

# ──────────────────────────────────────────────────────────────────────
# Locate Antigravity config (similar to Cursor: ~/.antigravity/mcp.json)
# ──────────────────────────────────────────────────────────────────────
step "Locating Antigravity config..."

case "$OS" in
  macos|linux|wsl)
    AG_CONFIG="${HOME}/.antigravity/mcp.json"
    # Fallback paths
    for alt in "${HOME}/.config/antigravity/mcp.json" "${HOME}/.gantigravity/mcp.json"; do
      if [ -f "$alt" ]; then AG_CONFIG="$alt"; break; fi
    done
    ;;
  windows)
    AG_CONFIG="${APPDATA:-$HOME/AppData/Roaming}/Antigravity/mcp.json"
    AG_CONFIG="$(echo "$AG_CONFIG" | sed 's#\\#/#g')"
    ;;
esac

ok "Config path: $AG_CONFIG"

prompt_for_key
validate_key

quit_app_before_write "Antigravity" "antigravity"
step "Patching Antigravity MCP config..."
ensure_json_file "$AG_CONFIG"

if jq -e '.mcpServers.hivemind' "$AG_CONFIG" >/dev/null 2>&1; then
  warn "Existing 'hivemind' entry found"
  if ! confirm "Overwrite?"; then abort "Aborted"; fi
fi

backup_file "$AG_CONFIG"

json_merge "$AG_CONFIG" \
  ".mcpServers = (.mcpServers // {}) | .mcpServers.hivemind = {
     \"transport\": \"http\",
     \"url\": \"$HIVEMIND_MCP_URL\",
     \"headers\": {
       \"Authorization\": \"Bearer $HIVEMIND_KEY\"
     }
   }"

ok "Wrote mcpServers.hivemind"

verify_connection
verify_mcp_loaded || true

if confirm "Restart Antigravity now?"; then
  restart_app "Antigravity" "antigravity" "antigravity"
  sleep 3
  verify_mcp_loaded || warn "Try again after Antigravity fully loads"
else
  warn "Restart Antigravity manually to activate"
fi

record_install "antigravity" "$AG_CONFIG"
print_success_footer "Antigravity"
