#!/usr/bin/env node
/*
 * safety-net CLI: status | list | undo [n] | keep [--all]
 * Operates on the git repo containing the current working directory.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function git(args, cwd, allowFail) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    if (allowFail) return null;
    throw e;
  }
}

const cwd = process.cwd();
let root;
try { root = git(['rev-parse', '--show-toplevel'], cwd); }
catch (_) { console.error('safety-net: not inside a git repository.'); process.exit(1); }

const gitDir = git(['rev-parse', '--absolute-git-dir'], root);
const ledgerPath = path.join(gitDir, 'safety-net', 'ledger.jsonl');

function readLedger() {
  if (!fs.existsSync(ledgerPath)) return [];
  return fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch (_) { return null; } })
    .filter(Boolean);
}

const cmd = process.argv[2] || 'status';
const arg = process.argv[3];

if (cmd === 'status') {
  const L = readLedger();
  console.log('safety-net: ' + L.length + ' checkpoint(s) in ' + root);
  if (L.length) {
    const e = L[L.length - 1];
    console.log('latest: ' + e.ts + '  ' + e.sha.slice(0, 10) + '  (' + path.basename(e.file || '') + ')');
  }
  console.log('commands: undo [n] | list | keep [--all] | status');
  process.exit(0);
}

if (cmd === 'list') {
  const L = readLedger();
  if (!L.length) { console.log('safety-net: no checkpoints yet.'); process.exit(0); }
  // #1 = oldest, #L.length = latest
  L.forEach((e, i) => {
    console.log('#' + (i + 1) + '  ' + e.ts + '  ' + (e.tool || '') + '  ' + path.basename(e.file || '') + '  ' + e.sha.slice(0, 10));
  });
  process.exit(0);
}

if (cmd === 'keep') {
  const refs = git(['for-each-ref', '--format=%(refname)', 'refs/safety-net'], root, true) || '';
  refs.split('\n').filter(Boolean).forEach(r => git(['update-ref', '-d', r], root, true));
  if (fs.existsSync(ledgerPath)) fs.unlinkSync(ledgerPath);
  console.log('safety-net: checkpoints cleared. net is off for current snapshots.');
  process.exit(0);
}

if (cmd === 'undo') {
  const L = readLedger();
  if (!L.length) { console.log('safety-net: nothing to undo.'); process.exit(0); }

  const n = arg ? parseInt(arg, 10) : L.length;
  const idx = (n >= 1 && n <= L.length) ? (n - 1) : (L.length - 1);
  const target = L[idx];

  // 1) Re-checkpoint current state so undo is itself reversible.
  const pre = git(['stash', 'create', 'safety-net pre-undo'], root, true);
  let preLine = '';
  if (pre) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ref = 'refs/safety-net/' + stamp + '-preundo';
    git(['update-ref', ref, pre], root, true);
    const tree = git(['rev-parse', pre + '^{tree}'], root, true);
    fs.appendFileSync(ledgerPath, JSON.stringify({
      ts: new Date().toISOString(), ref, sha: pre, tree, tool: 'undo', file: '(pre-undo snapshot)'
    }) + '\n');
    preLine = 'current state saved as ' + pre.slice(0, 10) + ' (reversible).';
  }

  // 2) Restore tracked files to the checkpoint. Never deletes newly-created files.
  try {
    git(['checkout', target.sha, '--', '.'], root);
  } catch (e) {
    console.error('safety-net: restore hit a conflict. Manual: git checkout ' + target.sha + ' -- <file>');
    process.exit(1);
  }

  console.log('safety-net: restored to checkpoint ' + target.sha.slice(0, 10) + ' (' + target.ts + ').');
  if (preLine) console.log(preLine);
  console.log('note: newly-created files are not removed by undo (safe). Delete them manually if unwanted.');
  process.exit(0);
}

console.error('safety-net: unknown command "' + cmd + '". Use undo|list|keep|status.');
process.exit(1);
