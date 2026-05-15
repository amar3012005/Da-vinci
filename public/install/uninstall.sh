#!/usr/bin/env bash
# HIVEMIND — universal uninstaller
# Usage:
#   curl -fsSL https://hivemind.davinciai.eu/install/uninstall.sh | bash -s <client>
#   curl -fsSL https://hivemind.davinciai.eu/install/uninstall.sh | bash -s all
#
# Clients: cursor | antigravity | vscode | claude-desktop | claude-code | notebooklm | all

set -euo pipefail

INSTALLER_BASE="${INSTALLER_BASE:-https://hivemind.davinciai.eu/install}"
COMMON_LIB="${COMMON_LIB:-$INSTALLER_BASE/installer-common.sh}"

if [ -f "./installer-common.sh" ]; then
  source ./installer-common.sh
else
  source <(curl -fsSL "$COMMON_LIB")
fi

CLIENT="${1:-}"
if [ -z "$CLIENT" ]; then
  echo "Usage: bash -s <client>"
  echo "Clients: cursor | antigravity | vscode | claude-desktop | claude-code | notebooklm | all"
  exit 1
fi

header "HIVEMIND Uninstaller — $CLIENT"

step "Detecting OS..."
detect_os
ok "OS: $OS"

# ──────────────────────────────────────────────────────────────────────
# Per-client config path resolver
# ──────────────────────────────────────────────────────────────────────
resolve_config() {
  local client="$1"
  case "$client" in
    cursor)         echo "${HOME}/.cursor/mcp.json" ;;
    antigravity)    echo "${HOME}/.antigravity/mcp.json" ;;
    claude-code)    echo "${HOME}/.claude.json" ;;
    notebooklm)     echo "${HOME}/.hivemind/notebooklm-bridge.sh" ;;
    claude-desktop)
      case "$OS" in
        macos) echo "${HOME}/Library/Application Support/Claude/claude_desktop_config.json" ;;
        linux) echo "${HOME}/.config/Claude/claude_desktop_config.json" ;;
        wsl)
          WIN_HOME="$(cmd.exe /c 'echo %APPDATA%' 2>/dev/null | tr -d '\r' || echo '')"
          [ -n "$WIN_HOME" ] && wslpath "$WIN_HOME" 2>/dev/null | sed 's|$|/Claude/claude_desktop_config.json|' || echo ""
          ;;
        windows) echo "${APPDATA:-$HOME/AppData/Roaming}/Claude/claude_desktop_config.json" ;;
      esac
      ;;
    vscode)
      case "$OS" in
        macos) echo "${HOME}/Library/Application Support/Code/User/settings.json" ;;
        linux|wsl) echo "${HOME}/.config/Code/User/settings.json" ;;
        windows) echo "${APPDATA:-$HOME/AppData/Roaming}/Code/User/settings.json" ;;
      esac
      ;;
    *) echo "" ;;
  esac
}

# ──────────────────────────────────────────────────────────────────────
# Strip hivemind entry from a JSON config (preserves rest of file)
# ──────────────────────────────────────────────────────────────────────
strip_entry() {
  local client="$1"
  local config="$2"
  if [ ! -f "$config" ]; then
    warn "No config at $config — nothing to remove"
    return 0
  fi
  backup_file "$config"
  case "$client" in
    vscode)
      json_merge "$config" 'if .mcp.servers? then .mcp.servers |= del(.hivemind) else . end' || true
      ;;
    notebooklm)
      rm -f "$config" && ok "Removed bridge script: $config" || warn "Could not remove $config"
      return 0
      ;;
    *)
      json_merge "$config" 'if .mcpServers? then .mcpServers |= del(.hivemind) else . end' || true
      ;;
  esac
  ok "Stripped hivemind from $config"
}

# ──────────────────────────────────────────────────────────────────────
# Run uninstall per client
# ──────────────────────────────────────────────────────────────────────
uninstall_one() {
  local client="$1"
  step "Uninstalling: $client"

  # Claude Code: also strip via CLI scopes
  if [ "$client" = "claude-code" ] && command -v claude >/dev/null 2>&1; then
    claude mcp remove hivemind -s user    2>/dev/null || true
    claude mcp remove hivemind -s local   2>/dev/null || true
    claude mcp remove hivemind -s project 2>/dev/null || true
    ok "Stripped via claude CLI (all scopes)"
  fi

  local config
  config="$(resolve_config "$client")"
  if [ -z "$config" ]; then
    warn "Unknown client: $client"
    return 1
  fi
  strip_entry "$client" "$config"
}

case "$CLIENT" in
  all)
    for c in cursor antigravity vscode claude-desktop claude-code notebooklm; do
      uninstall_one "$c" || true
    done
    ;;
  cursor|antigravity|vscode|claude-desktop|claude-code|notebooklm)
    uninstall_one "$CLIENT"
    ;;
  *)
    abort "Unknown client: $CLIENT"
    ;;
esac

printf "\n%s✅ Uninstall complete.%s\n" "${C_BOLD}${C_GREEN}" "${C_RESET}"
echo "  Restart the affected app(s) to clear MCP state."
echo "  Reinstall:  curl -fsSL $INSTALLER_BASE/<client>.sh | bash"
