#!/usr/bin/env node
// merge-settings.js — idempotently add/remove the safety-net PreToolUse hook in
// ~/.claude/settings.json. Shared by install.sh and install.ps1 so the JSON merge
// logic exists once, not twice, and so we never depend on PowerShell's ConvertTo-Json
// (which can silently unwrap single-element arrays). Node's JSON round-trip is faithful.
// Usage: node merge-settings.js [add|remove]
//   Honors $CLAUDE_CONFIG_DIR (defaults to ~/.claude). Never clobbers existing hooks.

const fs = require('fs');
const path = require('path');
const os = require('os');

const action = (process.argv[2] || 'add').toLowerCase();
const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');
const hookPath = path.join(claudeDir, 'hooks', 'safety-net-checkpoint.js');
const MARKER = 'safety-net-checkpoint.js';
const MATCHER = 'Edit|Write|MultiEdit|NotebookEdit';
// Use the exact node binary that ran this installer, so the hook command does not
// depend on `node` being on PATH inside the hook subprocess (matters on Windows).
const command = '"' + process.execPath + '" "' + hookPath + '"';

function load() {
  try { return JSON.parse(fs.readFileSync(settingsPath, 'utf8')); }
  catch (e) { return null; }
}
function save(obj) {
  fs.writeFileSync(settingsPath, JSON.stringify(obj, null, 2) + '\n');
}

if (action === 'remove') {
  const s = load();
  if (!s || !s.hooks || !Array.isArray(s.hooks.PreToolUse)) {
    console.log('no safety-net hook to remove');
    return;
  }
  for (const group of s.hooks.PreToolUse) {
    if (Array.isArray(group.hooks)) {
      group.hooks = group.hooks.filter(h => !(h && typeof h.command === 'string' && h.command.includes(MARKER)));
    }
  }
  s.hooks.PreToolUse = s.hooks.PreToolUse.filter(g => !Array.isArray(g.hooks) || g.hooks.length > 0);
  save(s);
  console.log('safety-net hook removed from ' + settingsPath);
  return;
}

// action === 'add'
const s = load() || {};
s.hooks = s.hooks || {};
s.hooks.PreToolUse = Array.isArray(s.hooks.PreToolUse) ? s.hooks.PreToolUse : [];
const pre = s.hooks.PreToolUse;

const present = pre.some(group =>
  Array.isArray(group.hooks) &&
  group.hooks.some(h => h && typeof h.command === 'string' && h.command.includes(MARKER)));

if (present) {
  console.log('safety-net hook already present in ' + settingsPath + ' (no change)');
} else {
  pre.push({ matcher: MATCHER, hooks: [{ type: 'command', command: command, timeout: 10 }] });
  save(s);
  console.log('safety-net hook added to ' + settingsPath);
}
