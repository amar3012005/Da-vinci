#!/usr/bin/env bash
# HIVEMIND × MCP Client — Shared installer library
# Sourced by every per-client installer (cursor.sh, claude-desktop.sh, etc.)
# https://hivemind.davinciai.eu/install/installer-common.sh
#
# Works on macOS / Linux / WSL / Git-Bash on Windows. Idempotent + safe.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────
# Defaults
# ──────────────────────────────────────────────────────────────────────
HIVEMIND_MCP_URL="${HIVEMIND_MCP_URL:-https://core.hivemind.davinciai.eu:8050/api/mcp}"
HIVEMIND_API_BASE="${HIVEMIND_API_BASE:-https://core.hivemind.davinciai.eu:8050}"
HIVEMIND_APP_URL="${HIVEMIND_APP_URL:-https://hivemind.davinciai.eu}"
HIVEMIND_KEY_PAGE="${HIVEMIND_APP_URL}/hivemind/app/settings/api-keys"
HIVEMIND_AUDIT_FILE="${HOME}/.hivemind/installed.json"

# Flags (can be set by caller before sourcing)
NON_INTERACTIVE="${NON_INTERACTIVE:-0}"
HIVEMIND_KEY="${HIVEMIND_KEY:-}"
ASSUME_YES="${ASSUME_YES:-0}"

# ──────────────────────────────────────────────────────────────────────
# ANSI colors
# ──────────────────────────────────────────────────────────────────────
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
  C_RESET="$(tput sgr0)"
  C_BOLD="$(tput bold)"
  C_DIM="$(tput dim 2>/dev/null || printf '')"
  C_GREEN="$(tput setaf 2)"
  C_RED="$(tput setaf 1)"
  C_YELLOW="$(tput setaf 3)"
  C_BLUE="$(tput setaf 4)"
  C_CYAN="$(tput setaf 6)"
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_GREEN=""; C_RED=""; C_YELLOW=""; C_BLUE=""; C_CYAN=""
fi

log()    { printf "%s %s\n" "${C_DIM}[hivemind]${C_RESET}" "$*"; }
step()   { printf "%s%s%s %s\n" "${C_BOLD}${C_BLUE}" "▸" "${C_RESET}" "$*"; }
ok()     { printf "  %s✓%s %s\n" "${C_GREEN}" "${C_RESET}" "$*"; }
warn()   { printf "  %s!%s %s\n" "${C_YELLOW}" "${C_RESET}" "$*"; }
fail()   { printf "  %s✗%s %s\n" "${C_RED}" "${C_RESET}" "$*" >&2; }
header() {
  printf "\n%s╔══════════════════════════════════════════════════════════╗%s\n" "${C_BOLD}${C_CYAN}" "${C_RESET}"
  printf "%s║%s   %sHIVEMIND × %s%s   %s║%s\n" "${C_BOLD}${C_CYAN}" "${C_RESET}" "${C_BOLD}" "$1" "${C_RESET}" "${C_BOLD}${C_CYAN}" "${C_RESET}"
  printf "%s╚══════════════════════════════════════════════════════════╝%s\n\n" "${C_BOLD}${C_CYAN}" "${C_RESET}"
}

abort() { fail "$1"; exit 1; }

# ──────────────────────────────────────────────────────────────────────
# OS detection
# ──────────────────────────────────────────────────────────────────────
detect_os() {
  case "$(uname -s)" in
    Darwin*)   OS="macos" ;;
    Linux*)
      if grep -qiE "(microsoft|wsl)" /proc/version 2>/dev/null; then
        OS="wsl"
      else
        OS="linux"
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
    *) OS="unknown" ;;
  esac
  ARCH="$(uname -m)"
  export OS ARCH
}

# ──────────────────────────────────────────────────────────────────────
# Prerequisites
# ──────────────────────────────────────────────────────────────────────
require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "Required command not found: $cmd"
    case "$cmd" in
      jq)
        case "$OS" in
          macos)   echo "    Install: brew install jq" ;;
          linux)   echo "    Install: sudo apt-get install -y jq  (Debian/Ubuntu)" ;;
          wsl)     echo "    Install: sudo apt-get install -y jq" ;;
          windows) echo "    Install: scoop install jq  OR  choco install jq" ;;
        esac
        ;;
      node|npx)
        echo "    Install: https://nodejs.org/  (LTS, 20.x or newer)"
        ;;
      curl)
        echo "    Install: usually pre-installed; macOS has it built-in"
        ;;
    esac
    abort "Install $cmd then re-run this script"
  fi
}

check_prereqs() {
  step "Checking prereqs..."
  require_cmd curl
  require_cmd jq
  ok "curl ✓  jq ✓"
}

# ──────────────────────────────────────────────────────────────────────
# API key acquisition
# ──────────────────────────────────────────────────────────────────────
prompt_for_key() {
  if [ -n "$HIVEMIND_KEY" ]; then
    return 0
  fi

  if [ "$NON_INTERACTIVE" = "1" ]; then
    abort "HIVEMIND_KEY env var required in non-interactive mode"
  fi

  step "HIVEMIND API key"
  echo "  You need a key from $HIVEMIND_KEY_PAGE"
  echo ""
  echo "  ${C_BOLD}1)${C_RESET} Paste an existing key (starts with hmk_live_)"
  echo "  ${C_BOLD}2)${C_RESET} Open the browser to create one"
  echo ""
  printf "  Choose [1/2]: "
  local choice; read -r choice

  case "$choice" in
    2)
      open_browser "$HIVEMIND_KEY_PAGE"
      log "Opened browser to $HIVEMIND_KEY_PAGE"
      log "Create a key, copy it, and paste below."
      ;;
    *) ;;
  esac

  printf "  Paste key: "
  read -rs HIVEMIND_KEY
  echo ""

  if [ -z "$HIVEMIND_KEY" ]; then
    abort "Empty key"
  fi
  if [[ ! "$HIVEMIND_KEY" =~ ^hmk_(live|test)_ ]]; then
    warn "Key doesn't look like 'hmk_live_*' — proceeding anyway"
  fi
}

validate_key() {
  step "Validating key..."
  local status
  status=$(curl -fsS -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $HIVEMIND_KEY" \
    "$HIVEMIND_API_BASE/api/health" 2>/dev/null || echo "000")

  if [ "$status" = "200" ]; then
    ok "Key valid (200 OK)"
  elif [ "$status" = "401" ] || [ "$status" = "403" ]; then
    abort "Key rejected by server ($status). Check it at $HIVEMIND_KEY_PAGE"
  else
    warn "Could not reach $HIVEMIND_API_BASE/api/health (status: $status). Proceeding anyway."
  fi
}

# ──────────────────────────────────────────────────────────────────────
# Browser open (OS-aware)
# ──────────────────────────────────────────────────────────────────────
open_browser() {
  local url="$1"
  case "$OS" in
    macos)    open "$url" 2>/dev/null || true ;;
    linux)    xdg-open "$url" 2>/dev/null || true ;;
    wsl)      cmd.exe /c start "$url" 2>/dev/null || true ;;
    windows)  start "$url" 2>/dev/null || true ;;
  esac
}

# ──────────────────────────────────────────────────────────────────────
# JSON file editing — backup + merge via jq
# ──────────────────────────────────────────────────────────────────────
backup_file() {
  local file="$1"
  if [ -f "$file" ]; then
    local ts; ts="$(date +%Y%m%d-%H%M%S)"
    cp "$file" "${file}.bak.${ts}"
    ok "Backed up: ${file}.bak.${ts}"
  fi
}

ensure_json_file() {
  local file="$1"
  local dir; dir="$(dirname "$file")"
  mkdir -p "$dir"
  if [ ! -f "$file" ]; then
    echo "{}" > "$file"
    ok "Created empty: $file"
  fi
  # Validate JSON
  if ! jq -e . "$file" >/dev/null 2>&1; then
    fail "Existing file is not valid JSON: $file"
    if [ "$ASSUME_YES" = "1" ]; then
      log "ASSUME_YES=1 → resetting to empty JSON"
      backup_file "$file"
      echo "{}" > "$file"
    else
      printf "  Reset to empty JSON? (y/N): "
      local ans; read -r ans
      case "$ans" in
        y|Y|yes)
          backup_file "$file"
          echo "{}" > "$file"
          ;;
        *) abort "Cannot proceed without valid JSON" ;;
      esac
    fi
  fi
}

json_merge() {
  # Usage: json_merge <file> <jq-filter>
  local file="$1"
  local filter="$2"
  local tmp; tmp="$(mktemp)"
  jq "$filter" "$file" > "$tmp" || { rm -f "$tmp"; abort "jq merge failed"; }
  mv "$tmp" "$file"
}

# ──────────────────────────────────────────────────────────────────────
# Confirm helper
# ──────────────────────────────────────────────────────────────────────
confirm() {
  local msg="$1"
  if [ "$ASSUME_YES" = "1" ]; then return 0; fi
  printf "  %s (Y/n): " "$msg"
  local ans; read -r ans
  case "$ans" in
    n|N|no) return 1 ;;
    *) return 0 ;;
  esac
}

# ──────────────────────────────────────────────────────────────────────
# Restart helpers (per app)
# ──────────────────────────────────────────────────────────────────────
restart_app_macos() {
  # Usage: restart_app_macos "Cursor"
  local app_name="$1"
  if osascript -e "tell application \"$app_name\" to quit" 2>/dev/null; then
    sleep 2
    open -a "$app_name" 2>/dev/null && ok "$app_name relaunched" || warn "Could not relaunch $app_name — open it manually"
  else
    warn "$app_name not running — start it manually to load HIVEMIND"
  fi
}

restart_app_linux() {
  local proc_pattern="$1"
  local launch_cmd="$2"
  pkill -f "$proc_pattern" 2>/dev/null && sleep 1 || true
  if [ -n "$launch_cmd" ]; then
    nohup $launch_cmd >/dev/null 2>&1 &
    ok "Relaunched: $launch_cmd"
  else
    warn "Restart $proc_pattern manually"
  fi
}

restart_app() {
  # Args: <macos-app-name> <linux-proc-pattern> <linux-launch-cmd>
  local mac_name="$1"
  local linux_proc="${2:-}"
  local linux_cmd="${3:-}"
  step "Restarting $mac_name..."
  case "$OS" in
    macos) restart_app_macos "$mac_name" ;;
    linux) restart_app_linux "$linux_proc" "$linux_cmd" ;;
    wsl)   warn "WSL detected — restart $mac_name manually in Windows" ;;
    windows) warn "Restart $mac_name manually" ;;
  esac
}

# ──────────────────────────────────────────────────────────────────────
# Audit log
# ──────────────────────────────────────────────────────────────────────
record_install() {
  local client="$1"
  local config_path="$2"
  mkdir -p "$(dirname "$HIVEMIND_AUDIT_FILE")"
  if [ ! -f "$HIVEMIND_AUDIT_FILE" ]; then
    echo "[]" > "$HIVEMIND_AUDIT_FILE"
  fi
  local key_prefix="${HIVEMIND_KEY:0:14}"
  local entry
  entry=$(jq -n \
    --arg client "$client" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg host "$(hostname 2>/dev/null || echo unknown)" \
    --arg config "$config_path" \
    --arg prefix "$key_prefix" \
    --arg os "$OS" \
    '{client: $client, installed_at: $ts, hostname: $host, config_path: $config, key_prefix: $prefix, os: $os, version: "1.0.0"}')
  local tmp; tmp="$(mktemp)"
  jq ". += [$entry]" "$HIVEMIND_AUDIT_FILE" > "$tmp" && mv "$tmp" "$HIVEMIND_AUDIT_FILE"
  ok "Audit: $HIVEMIND_AUDIT_FILE"
}

# ──────────────────────────────────────────────────────────────────────
# Verify connection (server-side check)
# ──────────────────────────────────────────────────────────────────────
verify_connection() {
  step "Verifying HIVEMIND can reach you..."
  local resp
  resp=$(curl -fsS -H "Authorization: Bearer $HIVEMIND_KEY" \
    "$HIVEMIND_API_BASE/api/health" 2>/dev/null || echo "")
  if echo "$resp" | grep -q '"status":"ok"\|"status":"healthy"'; then
    ok "HIVEMIND reachable from your machine"
  else
    warn "Could not verify health — restart the app and try a query"
  fi
}

# Hit MCP endpoint directly with bearer to confirm tools list responds.
# Stronger check than /api/health — actually exercises the MCP protocol.
# Returns 0 on success, 1 on failure (non-fatal — caller decides).
verify_mcp_loaded() {
  step "Verifying MCP endpoint responds with tools list..."
  local resp http_code
  resp=$(curl -sS -o /tmp/.hivemind-mcp-check -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $HIVEMIND_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
    "$HIVEMIND_MCP_URL" 2>/dev/null || echo "000")
  http_code="$resp"
  if [ "$http_code" = "200" ] && grep -q '"tools"\|"name"' /tmp/.hivemind-mcp-check 2>/dev/null; then
    local tool_count
    tool_count=$(grep -o '"name"' /tmp/.hivemind-mcp-check | wc -l | tr -d ' ')
    ok "MCP endpoint live — $tool_count tools available"
    rm -f /tmp/.hivemind-mcp-check
    return 0
  else
    warn "MCP endpoint check failed (HTTP $http_code) — restart the client app and retry"
    rm -f /tmp/.hivemind-mcp-check
    return 1
  fi
}

# ──────────────────────────────────────────────────────────────────────
# Footer with usage examples
# ──────────────────────────────────────────────────────────────────────
print_success_footer() {
  local client="$1"
  printf "\n%s🎉 %s installed.%s\n\n" "${C_BOLD}${C_GREEN}" "$client" "${C_RESET}"
  echo "  Try in $client:"
  echo "    \"What did I work on yesterday?\""
  echo "    \"Find my Q3 budget doc on Drive\""
  echo "    \"What meetings do I have this week?\""
  echo ""
  echo "  Manage keys:  $HIVEMIND_KEY_PAGE"
  echo "  Audit trail:  $HIVEMIND_AUDIT_FILE"
  echo "  Uninstall:    curl -fsSL $HIVEMIND_APP_URL/install/uninstall.sh | bash"
  echo ""
}
