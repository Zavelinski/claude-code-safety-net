# Remove the safety-net skill + hook from ~/.claude (or $env:CLAUDE_CONFIG_DIR).
# Per-repo checkpoints (refs/safety-net/* and <gitdir>/safety-net/) are left untouched;
# clear those per project with `node bin/safety-net.js keep`.
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$claudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }

try { node (Join-Path $repo 'install\merge-settings.js') remove } catch {}

Remove-Item -Recurse -Force (Join-Path $claudeDir 'skills\safety-net')           -ErrorAction SilentlyContinue
Remove-Item -Force          (Join-Path $claudeDir 'hooks\safety-net-checkpoint.js') -ErrorAction SilentlyContinue

Write-Host "safety-net uninstalled from $claudeDir (per-repo checkpoints left intact)."
