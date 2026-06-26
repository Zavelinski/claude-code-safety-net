#!/usr/bin/env bash
# Remove the safety-net skill + hook from ~/.claude (or $CLAUDE_CONFIG_DIR).
# Per-repo checkpoints (refs/safety-net/* and <gitdir>/safety-net/) are left untouched;
# clear those per project with `node bin/safety-net.js keep`.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
claude_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

node "$repo/install/merge-settings.js" remove || true

rm -rf "$claude_dir/skills/safety-net"
rm -f  "$claude_dir/hooks/safety-net-checkpoint.js"

echo "safety-net uninstalled from $claude_dir (per-repo checkpoints left intact)."
