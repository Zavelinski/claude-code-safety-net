#!/usr/bin/env bash
# safety-net installer (macOS / Linux)
# Copies the skill + hook into ~/.claude and registers the PreToolUse hook in settings.json.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
claude="$HOME/.claude"
skill="$claude/skills/safety-net"

mkdir -p "$skill/hooks" "$skill/bin"
cp "$repo/SKILL.md" "$skill/SKILL.md"
cp "$repo/hooks/safety-net-checkpoint.js" "$skill/hooks/safety-net-checkpoint.js"
cp "$repo/bin/safety-net.js" "$skill/bin/safety-net.js"

settings="$claude/settings.json"
hookcmd="node \"$skill/hooks/safety-net-checkpoint.js\""

if command -v node >/dev/null 2>&1; then
  SETTINGS="$settings" HOOKCMD="$hookcmd" node - <<'EOF'
const fs = require('fs');
const p = process.env.SETTINGS;
const cmd = process.env.HOOKCMD;
let s = {};
if (fs.existsSync(p)) { try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { s = {}; } }
s.hooks = s.hooks || {};
s.hooks.PreToolUse = s.hooks.PreToolUse || [];
const exists = s.hooks.PreToolUse.some(g => (g.hooks || []).some(h => h.command === cmd));
if (!exists) {
  s.hooks.PreToolUse.push({ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: cmd }] });
  fs.writeFileSync(p, JSON.stringify(s, null, 2));
  console.log('safety-net: hook registered in settings.json');
} else {
  console.log('safety-net: hook already registered');
}
EOF
else
  echo 'safety-net: node not found; install node, then re-run.' >&2
  exit 1
fi

echo "safety-net: installed to $skill"
echo 'Restart Claude Code so the new hook is picked up.'
