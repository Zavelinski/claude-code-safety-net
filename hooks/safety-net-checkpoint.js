#!/usr/bin/env node
/*
 * safety-net checkpoint hook (Claude Code PreToolUse: Edit|Write|MultiEdit|NotebookEdit)
 *
 * Captures a pre-edit snapshot of the git working tree as a stash commit,
 * anchors it under refs/safety-net/<timestamp> (survives gc), and records it
 * in <gitdir>/safety-net/ledger.jsonl.
 *
 * HARD RULE: this hook must NEVER block an edit. Any error -> exit 0 silently.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

try {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (_) {}
  const input = raw ? JSON.parse(raw) : {};
  const ti = input.tool_input || {};

  let fp = ti.file_path || ti.notebook_path;
  if (fp && !path.isAbsolute(fp)) fp = path.resolve(input.cwd || process.cwd(), fp);

  // Candidate dirs to resolve the git root from, most-specific first.
  const candidates = [];
  if (fp) {
    try { candidates.push((fs.existsSync(fp) && fs.statSync(fp).isFile()) ? path.dirname(fp) : fp); }
    catch (_) { candidates.push(path.dirname(fp)); }
  }
  if (input.cwd) candidates.push(input.cwd);
  candidates.push(process.cwd());

  // Resolve git root; no-op if not a repo.
  let root = null;
  for (const c of candidates) {
    try { root = git(['rev-parse', '--show-toplevel'], c); break; } catch (_) {}
  }
  if (!root) process.exit(0);

  // Snapshot the working tree without touching it. Empty output => clean tree.
  let stashSha;
  try { stashSha = git(['stash', 'create', 'safety-net'], root); }
  catch (_) { process.exit(0); }
  if (!stashSha) process.exit(0);

  let tree;
  try { tree = git(['rev-parse', stashSha + '^{tree}'], root); }
  catch (_) { tree = ''; }

  const gitDir = git(['rev-parse', '--absolute-git-dir'], root);
  const dir = path.join(gitDir, 'safety-net');
  fs.mkdirSync(dir, { recursive: true });
  const ledger = path.join(dir, 'ledger.jsonl');

  // Dedupe: skip if the previous checkpoint has the same tree.
  if (tree && fs.existsSync(ledger)) {
    const lines = fs.readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length) {
      try {
        const last = JSON.parse(lines[lines.length - 1]);
        if (last.tree === tree) process.exit(0);
      } catch (_) {}
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ref = 'refs/safety-net/' + stamp;
  try { git(['update-ref', ref, stashSha], root); } catch (_) {}

  const entry = {
    ts: new Date().toISOString(),
    ref,
    sha: stashSha,
    tree,
    tool: input.tool_name || '',
    file: fp || ''
  };
  fs.appendFileSync(ledger, JSON.stringify(entry) + '\n');
} catch (_) {
  // Never block the edit.
}
process.exit(0);
