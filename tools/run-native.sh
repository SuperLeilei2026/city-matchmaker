#!/usr/bin/env bash
# Run the submitted script app in the official reference host. No Web server.
set -euo pipefail
repo_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
workspace_dir=$(dirname -- "$repo_dir")
card_host=${OCTO_CARD_HOST:-"$workspace_dir/runtime/target/release/card-host"}
hub_bin=${OCTO_HUB:-"$workspace_dir/runtime/target/release/hub"}
state_dir=${CITY_NATIVE_STATE:-"$repo_dir/.local-state/native"}

if [[ ! -x "$card_host" || ! -x "$hub_bin" ]]; then
  printf '%s\n' 'Set OCTO_CARD_HOST and OCTO_HUB to your installed OctoSense tools.' 'Setup: docs/octosense.md and the official App Design Flow QUICKSTART.' >&2
  exit 1
fi
# Checking does not regenerate or restamp the captured submission candidate.
"$hub_bin" check "$repo_dir/bundle" --allow-unsigned
mkdir -p -- "$state_dir"
chmod 700 "$state_dir"
unset MAKEPAD_REMOTE MAKEPAD_HIDE_WINDOWS
if [[ -n "${CITY_NATIVE_PORT:-}" ]]; then
  export MAKEPAD_REMOTE="$CITY_NATIVE_PORT"
fi
if [[ "${CITY_NATIVE_HIDDEN:-0}" == 1 ]]; then
  export MAKEPAD_HIDE_WINDOWS=1
fi
printf '%s\n' 'Opening Joy City in card-host. The local matching flow needs no API key.'
exec "$card_host" --bundle "$repo_dir/bundle" --app-data "$state_dir" --allow-unsigned --size 460x820 "$@"
