# Install the safety-net skill + hook into ~/.claude (or $env:CLAUDE_CONFIG_DIR).
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$claudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "node is required (Claude Code hooks run on node)."
}

New-Item -ItemType Directory -Force -Path (Join-Path $claudeDir 'skills\safety-net\bin') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $claudeDir 'hooks')               | Out-Null

Copy-Item (Join-Path $repo 'skills\safety-net\SKILL.md')        (Join-Path $claudeDir 'skills\safety-net\SKILL.md')        -Force
Copy-Item (Join-Path $repo 'skills\safety-net\bin\safety-net.js') (Join-Path $claudeDir 'skills\safety-net\bin\safety-net.js') -Force
Copy-Item (Join-Path $repo 'hooks\safety-net-checkpoint.js')    (Join-Path $claudeDir 'hooks\safety-net-checkpoint.js')    -Force

node (Join-Path $repo 'install\merge-settings.js') add

Write-Host ""
Write-Host "safety-net installed into $claudeDir"
Write-Host "Restart Claude Code so the PreToolUse checkpoint hook is picked up."
Write-Host "Then, inside any git repo, say 'undo' to roll back the last edit."
