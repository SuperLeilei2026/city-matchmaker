#!/usr/bin/env bash
# Launch a separately scoped OctoSense Shell. Never put API keys in this file.
set -euo pipefail

repo_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
workspace_dir=$(dirname -- "$repo_dir")
shell_bin=${OCTOSENSE_BIN:-"$workspace_dir/runtime/shell-target/release/octosense"}
octos_bin=${OCTOS_BIN:-"$workspace_dir/runtime/octos-target/release/octos"}
state_dir=${CITY_SHELL_HOME:-"$repo_dir/.local-state/shell"}
start_app=${CITY_START_APP:-ai-providers}

if [[ ! -x "$shell_bin" || ! -x "$octos_bin" ]]; then
  printf '%s\n' 'Set OCTOSENSE_BIN and OCTOS_BIN to the two executable paths.' >&2
  exit 1
fi
mkdir -p -- "$state_dir"
chmod 700 "$state_dir"
state_dir=$(CDPATH= cd -- "$state_dir" && pwd)

# Do not inherit a different test profile or the historical shared-core override.
unset OCTOS_APP_CORE_DIR MAKEOS_HOME MAKEPAD_HIDE_WINDOWS
export OCTOSENSE_HOME="$state_dir"
export OCTOSENSE_APP_DATA="$state_dir/apps"
export OCTOS_APP_CORE_BIN="$octos_bin"
export OCTOSENSE_CONTAINED_APPS=1
export MAKEPAD_WM_TEST_APP="$start_app"

# A local signed catalog is optional and never means public App Hub approval.
if [[ -n "${CITY_HUB_PATH:-}" ]]; then
  : "${CITY_HUB_ANCHOR:?Set CITY_HUB_ANCHOR for the local signed catalog}"
  export OCTOSENSE_HUB="$CITY_HUB_PATH"
  export OCTOSENSE_HUB_ANCHOR="$CITY_HUB_ANCHOR"
else
  unset OCTOSENSE_HUB OCTOSENSE_HUB_ANCHOR
fi

# Remote control is opt-in. The normal credential-entry launch is visible.
if [[ -n "${CITY_REMOTE_PORT:-}" ]]; then
  export MAKEPAD_REMOTE="$CITY_REMOTE_PORT"
else
  unset MAKEPAD_REMOTE
fi
if [[ "${CITY_HIDE_WINDOWS:-0}" == 1 ]]; then
  export MAKEPAD_HIDE_WINDOWS=1
fi

printf 'City test Shell state: %s\nStarting app: %s\n' "$state_dir" "$start_app"
exec "$shell_bin" "$@"
