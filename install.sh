#!/usr/bin/env bash
# Install the safety-net skill + hook into ~/.claude (or $CLAUDE_CONFIG_DIR).
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
claude_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

command -v node >/dev/null 2>&1 || { echo "error: node is required (Claude Code hooks run on node)." >&2; exit 1; }

mkdir -p "$claude_dir/skills/safety-net/bin" "$claude_dir/hooks"

cp "$repo/skills/safety-net/SKILL.md"          "$claude_dir/skills/safety-net/SKILL.md"
cp "$repo/skills/safety-net/bin/safety-net.js" "$claude_dir/skills/safety-net/bin/safety-net.js"
cp "$repo/hooks/safety-net-checkpoint.js"      "$claude_dir/hooks/safety-net-checkpoint.js"

node "$repo/install/merge-settings.js" add

echo ""
echo "safety-net installed into $claude_dir"
echo "Restart Claude Code so the PreToolUse checkpoint hook is picked up."
echo "Then, inside any git repo, say 'undo' to roll back the last edit."
