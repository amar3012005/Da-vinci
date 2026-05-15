#!/usr/bin/env bash
# HIVEMIND × Cursor — one-shot installer
# Run: curl -fsSL https://hivemind.davinciai.eu/install/cursor.sh | bash
# Or:  bash <(curl -fsSL https://hivemind.davinciai.eu/install/cursor.sh)  (for TTY)

set -euo pipefail

INSTALLER_BASE="${INSTALLER_BASE:-https://hivemind.davinciai.eu/install}"
COMMON_LIB="${COMMON_LIB:-$INSTALLER_BASE/installer-common.sh}"

# Source common lib (download to memory if not local)
if [ -f "./installer-common.sh" ]; then
  # shellcheck disable=SC1091
  source ./installer-common.sh
else
  # shellcheck disable=SC1090
  source <(curl -fsSL "$COMMON_LIB")
fi

header "Cursor"

# ──────────────────────────────────────────────────────────────────────
# Step 1: OS detection + prereqs
# ──────────────────────────────────────────────────────────────────────
step "Detecting OS..."
detect_os
ok "OS: $OS ($ARCH)"

check_prereqs

# ──────────────────────────────────────────────────────────────────────
# Step 2: Locate Cursor config file
# ──────────────────────────────────────────────────────────────────────
step "Locating Cursor config..."

case "$OS" in
  macos)
    CURSOR_CONFIG="${HOME}/.cursor/mcp.json"
    ;;
  linux|wsl)
    CURSOR_CONFIG="${HOME}/.cursor/mcp.json"
    ;;
  windows)
    # Git Bash on Windows
    CURSOR_CONFIG="${USERPROFILE:-$HOME}/.cursor/mcp.json"
    CURSOR_CONFIG="$(echo "$CURSOR_CONFIG" | sed 's#\\#/#g')"
    ;;
  *)
    abort "Unsupported OS: $OS"
    ;;
esac

ok "Config path: $CURSOR_CONFIG"

# ──────────────────────────────────────────────────────────────────────
# Step 3: HIVEMIND key
# ──────────────────────────────────────────────────────────────────────
prompt_for_key
validate_key

# ──────────────────────────────────────────────────────────────────────
# Step 4: Patch config
# ──────────────────────────────────────────────────────────────────────
step "Patching Cursor MCP config..."
ensure_json_file "$CURSOR_CONFIG"

# Check if hivemind entry already exists
if jq -e '.mcpServers.hivemind' "$CURSOR_CONFIG" >/dev/null 2>&1; then
  warn "An existing 'hivemind' entry was found"
  if ! confirm "Overwrite it?"; then
    abort "Aborted by user"
  fi
fi

backup_file "$CURSOR_CONFIG"

# Merge: set mcpServers.hivemind = {url, headers}
json_merge "$CURSOR_CONFIG" \
  ".mcpServers = (.mcpServers // {}) | .mcpServers.hivemind = {
     \"url\": \"$HIVEMIND_MCP_URL\",
     \"headers\": {
       \"Authorization\": \"Bearer $HIVEMIND_KEY\"
     }
   }"

ok "Wrote mcpServers.hivemind"

# ──────────────────────────────────────────────────────────────────────
# Step 5: Verify + restart
# ──────────────────────────────────────────────────────────────────────
verify_connection

if confirm "Restart Cursor now?"; then
  restart_app "Cursor" "cursor" "cursor"
else
  warn "Cursor not restarted — quit and relaunch it manually to activate"
fi

# ──────────────────────────────────────────────────────────────────────
# Step 6: Audit log
# ──────────────────────────────────────────────────────────────────────
record_install "cursor" "$CURSOR_CONFIG"

print_success_footer "Cursor"
