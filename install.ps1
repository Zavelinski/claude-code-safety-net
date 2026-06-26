# safety-net installer (Windows / PowerShell)
# Copies the skill + hook into ~/.claude and registers the PreToolUse hook in settings.json.

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$claude = Join-Path $env:USERPROFILE '.claude'
$skillDir = Join-Path $claude 'skills\safety-net'

New-Item -ItemType Directory -Force -Path (Join-Path $skillDir 'hooks') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $skillDir 'bin') | Out-Null

Copy-Item (Join-Path $repo 'SKILL.md') (Join-Path $skillDir 'SKILL.md') -Force
Copy-Item (Join-Path $repo 'hooks\safety-net-checkpoint.js') (Join-Path $skillDir 'hooks\safety-net-checkpoint.js') -Force
Copy-Item (Join-Path $repo 'bin\safety-net.js') (Join-Path $skillDir 'bin\safety-net.js') -Force

# Register the PreToolUse hook in settings.json (merge, do not clobber).
$settingsPath = Join-Path $claude 'settings.json'
if (Test-Path $settingsPath) {
  $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
} else {
  $settings = [PSCustomObject]@{}
}

$hookCmd = 'node "' + (Join-Path $skillDir 'hooks\safety-net-checkpoint.js') + '"'

if (-not $settings.PSObject.Properties['hooks']) {
  $settings | Add-Member -NotePropertyName 'hooks' -NotePropertyValue ([PSCustomObject]@{})
}
if (-not $settings.hooks.PSObject.Properties['PreToolUse']) {
  $settings.hooks | Add-Member -NotePropertyName 'PreToolUse' -NotePropertyValue @()
}

$already = $false
foreach ($group in $settings.hooks.PreToolUse) {
  foreach ($h in $group.hooks) {
    if ($h.command -eq $hookCmd) { $already = $true }
  }
}

if (-not $already) {
  $entry = [PSCustomObject]@{
    matcher = 'Edit|Write|MultiEdit|NotebookEdit'
    hooks   = @([PSCustomObject]@{ type = 'command'; command = $hookCmd })
  }
  $settings.hooks.PreToolUse = @($settings.hooks.PreToolUse) + $entry
  ($settings | ConvertTo-Json -Depth 20) | Out-File -FilePath $settingsPath -Encoding utf8
  Write-Host 'safety-net: hook registered in settings.json'
} else {
  Write-Host 'safety-net: hook already registered'
}

Write-Host ('safety-net: installed to ' + $skillDir)
Write-Host 'Restart Claude Code so the new hook is picked up.'
