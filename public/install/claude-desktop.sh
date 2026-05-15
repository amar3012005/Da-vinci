#!/usr/bin/env bash
# HIVEMIND × Claude Desktop — one-shot installer
# Run: curl -fsSL https://hivemind.davinciai.eu/install/claude-desktop.sh | bash

set -euo pipefail

INSTALLER_BASE="${INSTALLER_BASE:-https://hivemind.davinciai.eu/install}"
COMMON_LIB="${COMMON_LIB:-$INSTALLER_BASE/installer-common.sh}"

if [ -f "./installer-common.sh" ]; then
  source ./installer-common.sh
else
  source <(curl -fsSL "$COMMON_LIB")
fi

header "Claude Desktop"

# ──────────────────────────────────────────────────────────────────────
# Step 1: OS + prereqs
# ──────────────────────────────────────────────────────────────────────
step "Detecting OS..."
detect_os
ok "OS: $OS ($ARCH)"

check_prereqs
require_cmd node
require_cmd npx

# ──────────────────────────────────────────────────────────────────────
# Step 2: Locate Claude Desktop config (per OS)
# ──────────────────────────────────────────────────────────────────────
step "Locating Claude Desktop config..."

case "$OS" in
  macos)
    CD_CONFIG="${HOME}/Library/Application Support/Claude/claude_desktop_config.json"
    ;;
  linux)
    CD_CONFIG="${HOME}/.config/Claude/claude_desktop_config.json"
    ;;
  wsl)
    # On WSL, Claude Desktop runs on Windows side
    WIN_HOME="$(cmd.exe /c 'echo %APPDATA%' 2>/dev/null | tr -d '\r' || echo '')"
    if [ -n "$WIN_HOME" ]; then
      WIN_HOME_UNIX="$(wslpath "$WIN_HOME" 2>/dev/null || echo '')"
      if [ -n "$WIN_HOME_UNIX" ]; then
        CD_CONFIG="${WIN_HOME_UNIX}/Claude/claude_desktop_config.json"
      else
        abort "Could not resolve Windows APPDATA path from WSL"
      fi
    else
      abort "Could not resolve Windows APPDATA path"
    fi
    ;;
  windows)
    CD_CONFIG="${APPDATA:-$HOME/AppData/Roaming}/Claude/claude_desktop_config.json"
    CD_CONFIG="$(echo "$CD_CONFIG" | sed 's#\\#/#g')"
    ;;
  *)
    abort "Unsupported OS: $OS"
    ;;
esac

ok "Config path: $CD_CONFIG"

# ──────────────────────────────────────────────────────────────────────
# Step 3: HIVEMIND key
# ──────────────────────────────────────────────────────────────────────
prompt_for_key
validate_key

# ──────────────────────────────────────────────────────────────────────
# Step 4: Patch config
# ──────────────────────────────────────────────────────────────────────
step "Patching Claude Desktop config..."
ensure_json_file "$CD_CONFIG"

if jq -e '.mcpServers.hivemind' "$CD_CONFIG" >/dev/null 2>&1; then
  warn "An existing 'hivemind' entry was found"
  if ! confirm "Overwrite it?"; then
    abort "Aborted by user"
  fi
fi

backup_file "$CD_CONFIG"

# Claude Desktop 0.7+ supports HTTP MCP transport directly. Older versions
# need an mcp-remote stdio bridge. Default = HTTP transport (canonical
# schema). Set USE_BRIDGE=1 to force the legacy stdio bridge.
if [ "${USE_BRIDGE:-0}" = "1" ]; then
  json_merge "$CD_CONFIG" \
    ".mcpServers = (.mcpServers // {}) | .mcpServers.hivemind = {
       \"command\": \"npx\",
       \"args\": [
         \"-y\",
         \"mcp-remote\",
         \"$HIVEMIND_MCP_URL\",
         \"--header\",
         \"Authorization: Bearer $HIVEMIND_KEY\"
       ]
     }"
  ok "Wrote mcpServers.hivemind (stdio bridge — legacy Desktop)"
else
  # Claude Desktop schema (matches Claude Code per code.claude.com):
  # mcpServers.<name>.type = "http" — NOT "transport"
  json_merge "$CD_CONFIG" \
    ".mcpServers = (.mcpServers // {}) | .mcpServers.hivemind = {
       \"type\": \"http\",
       \"url\": \"$HIVEMIND_MCP_URL\",
       \"headers\": {
         \"Authorization\": \"Bearer $HIVEMIND_KEY\"
       }
     }"
  ok "Wrote mcpServers.hivemind (HTTP transport — Desktop 0.7+)"
  log "If Claude Desktop < 0.7, re-run with USE_BRIDGE=1 to use stdio bridge"
fi

# ──────────────────────────────────────────────────────────────────────
# Step 5: Verify + restart
# ──────────────────────────────────────────────────────────────────────
verify_connection
verify_mcp_loaded || true

if confirm "Restart Claude Desktop now?"; then
  case "$OS" in
    macos)
      restart_app "Claude" "claude" ""
      ;;
    linux)
      pkill -f "claude" 2>/dev/null || true
      warn "Linux: restart Claude Desktop manually"
      ;;
    wsl|windows)
      warn "Restart Claude Desktop on Windows manually (Quit from system tray, then relaunch)"
      ;;
  esac
else
  warn "Claude Desktop not restarted — quit and relaunch it manually to activate"
fi

# ──────────────────────────────────────────────────────────────────────
# Step 6: Audit log
# ──────────────────────────────────────────────────────────────────────
record_install "claude-desktop" "$CD_CONFIG"

print_success_footer "Claude Desktop"

echo "  ${C_DIM}Note: First launch will download mcp-remote npm package (~5MB).${C_RESET}"
echo "  ${C_DIM}If you see 'mcp-remote not found', run: npm i -g mcp-remote${C_RESET}"
