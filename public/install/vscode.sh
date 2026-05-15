#!/usr/bin/env bash
# HIVEMIND × VS Code — one-shot installer
# Run: curl -fsSL https://hivemind.davinciai.eu/install/vscode.sh | bash

set -euo pipefail

INSTALLER_BASE="${INSTALLER_BASE:-https://hivemind.davinciai.eu/install}"
COMMON_LIB="${COMMON_LIB:-$INSTALLER_BASE/installer-common.sh}"

if [ -f "./installer-common.sh" ]; then
  source ./installer-common.sh
else
  source <(curl -fsSL "$COMMON_LIB")
fi

header "VS Code"

step "Detecting OS..."
detect_os
ok "OS: $OS ($ARCH)"

check_prereqs

# ──────────────────────────────────────────────────────────────────────
# Locate VS Code user settings (per OS) — MCP lives in user settings.json
# ──────────────────────────────────────────────────────────────────────
step "Locating VS Code settings.json..."

case "$OS" in
  macos)
    VSCODE_CONFIG="${HOME}/Library/Application Support/Code/User/settings.json"
    ;;
  linux)
    VSCODE_CONFIG="${HOME}/.config/Code/User/settings.json"
    ;;
  wsl)
    # VS Code on WSL — uses Linux path
    VSCODE_CONFIG="${HOME}/.config/Code/User/settings.json"
    if [ ! -f "$VSCODE_CONFIG" ]; then
      # Try VS Code on Windows side
      WIN_APPDATA="$(cmd.exe /c 'echo %APPDATA%' 2>/dev/null | tr -d '\r' || echo '')"
      if [ -n "$WIN_APPDATA" ]; then
        WIN_PATH="$(wslpath "$WIN_APPDATA" 2>/dev/null)/Code/User/settings.json"
        if [ -f "$WIN_PATH" ]; then
          VSCODE_CONFIG="$WIN_PATH"
          ok "Using Windows-side VS Code"
        fi
      fi
    fi
    ;;
  windows)
    VSCODE_CONFIG="${APPDATA:-$HOME/AppData/Roaming}/Code/User/settings.json"
    VSCODE_CONFIG="$(echo "$VSCODE_CONFIG" | sed 's#\\#/#g')"
    ;;
  *)
    abort "Unsupported OS: $OS"
    ;;
esac

ok "Config path: $VSCODE_CONFIG"

# ──────────────────────────────────────────────────────────────────────
# Key
# ──────────────────────────────────────────────────────────────────────
prompt_for_key
validate_key

# ──────────────────────────────────────────────────────────────────────
# Patch settings.json — VS Code settings allows comments + trailing commas
# (JSONC). We use jq which requires pure JSON, so strip comments first
# into a temp file, edit, then restore via best-effort write.
# ──────────────────────────────────────────────────────────────────────
step "Patching VS Code settings..."
mkdir -p "$(dirname "$VSCODE_CONFIG")"
if [ ! -f "$VSCODE_CONFIG" ]; then
  echo "{}" > "$VSCODE_CONFIG"
  ok "Created empty: $VSCODE_CONFIG"
fi

# Strip // and /* */ comments using node (more reliable than sed for JSONC)
TMP_CLEAN="$(mktemp)"
node -e "
const fs = require('fs');
let s = fs.readFileSync('$VSCODE_CONFIG', 'utf-8');
// Strip // comments (but not inside strings — naive but works for most)
s = s.replace(/^\s*\/\/.*$/gm, '');
s = s.replace(/\/\*[\s\S]*?\*\//g, '');
// Remove trailing commas
s = s.replace(/,(\s*[}\]])/g, '\$1');
try { JSON.parse(s); } catch (e) { console.error('parse fail:', e.message); process.exit(1); }
fs.writeFileSync('$TMP_CLEAN', s);
" || abort "Could not parse VS Code settings.json"

if jq -e '.mcp.servers.hivemind' "$TMP_CLEAN" >/dev/null 2>&1; then
  warn "Existing mcp.servers.hivemind found"
  if ! confirm "Overwrite it?"; then
    rm -f "$TMP_CLEAN"
    abort "Aborted by user"
  fi
fi

backup_file "$VSCODE_CONFIG"

# Use jq to merge into temp, then write back
jq ".mcp = (.mcp // {}) | .mcp.servers = (.mcp.servers // {}) | .mcp.servers.hivemind = {
   \"type\": \"http\",
   \"url\": \"$HIVEMIND_MCP_URL\",
   \"headers\": {
     \"Authorization\": \"Bearer $HIVEMIND_KEY\"
   }
 }" "$TMP_CLEAN" > "$VSCODE_CONFIG.new"

mv "$VSCODE_CONFIG.new" "$VSCODE_CONFIG"
rm -f "$TMP_CLEAN"

ok "Wrote mcp.servers.hivemind"

# ──────────────────────────────────────────────────────────────────────
# Verify + restart
# ──────────────────────────────────────────────────────────────────────
verify_connection

if confirm "Reload VS Code window now? (use Command Palette → Developer: Reload Window)"; then
  case "$OS" in
    macos)
      osascript -e 'tell application "System Events" to keystroke "p" using {command down, shift down}' 2>/dev/null || true
      ok "Triggered Command Palette — type 'Developer: Reload Window' + Enter"
      ;;
    *)
      log "Press Ctrl+Shift+P → 'Developer: Reload Window' to reload"
      ;;
  esac
else
  warn "Reload VS Code window manually (Ctrl+Shift+P → Developer: Reload Window)"
fi

record_install "vscode" "$VSCODE_CONFIG"
print_success_footer "VS Code"
