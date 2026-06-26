# safety-net for Claude Code

[![License: MIT](https://img.shields.io/github/license/Zavelinski/claude-code-safety-net)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Zavelinski/claude-code-safety-net?style=flat)](https://github.com/Zavelinski/claude-code-safety-net/stargazers)
[![Last commit](https://img.shields.io/github/last-commit/Zavelinski/claude-code-safety-net)](https://github.com/Zavelinski/claude-code-safety-net/commits)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-8A2BE2)](https://claude.com/claude-code)

Automatic, **reversible** checkpoints around [Claude Code](https://claude.com/claude-code)'s edits. Before every `Edit`/`Write`/`MultiEdit`, a `PreToolUse` hook snapshots your git working tree. Claude breaks something across five files? Say **`undo`** and snap back. Recovery-first: every session is rollback-able by default, with no discipline required from you.

## The problem it fixes

Claude edits across many files, breaks something, and you cannot cleanly roll back because you forgot to commit first. Nobody commits first. This makes every edit reversible automatically, so you can let the agent work without fear.

## How it works

A `PreToolUse` hook runs **before** each `Edit | Write | MultiEdit | NotebookEdit` and:

1. Captures the current git working tree as a stash commit (`git stash create`) **without touching** your working tree or index.
2. Anchors it under `refs/safety-net/<timestamp>` so `git gc` never collects it.
3. Records it in `<gitdir>/safety-net/ledger.jsonl`.

`undo` re-checkpoints the current state first (so undo is itself reversible), then restores tracked files to the chosen checkpoint. It **never deletes** files Claude newly created. The hook is wrapped so it can **never block an edit**: on any error it exits 0 silently.

## What you get

| File | Installed to | Purpose |
|------|--------------|---------|
| `skills/safety-net/SKILL.md` | `~/.claude/skills/safety-net/` | The ritual Claude reads when you say `undo`. |
| `skills/safety-net/bin/safety-net.js` | `~/.claude/skills/safety-net/bin/` | The CLI: `undo` / `list` / `keep` / `status`. |
| `hooks/safety-net-checkpoint.js` | `~/.claude/hooks/` (script) or plugin root (plugin) | Snapshots the working tree before each edit. |
| `hooks/hooks.json` | registered on `/plugin install` | Wires the hook into Claude Code through the plugin's official hook mechanism (no `settings.json` edit). |
| `settings.json` entry | `~/.claude/settings.json` (script install only) | Registers the hook under `PreToolUse` (merged in, never clobbered). |

## Install

### Option 1 — as a plugin (recommended)

Install through Claude Code's own plugin flow, so you explicitly consent to the hook:

```bash
/plugin marketplace add Zavelinski/claude-code-skills
/plugin install safety-net@claude-code-skills
```

Restart Claude Code. This installs the skill **and** registers the `PreToolUse` hook through Claude Code's official, opt-in plugin mechanism, no manual `settings.json` editing.

### Option 2 — script installer

Clone and run the installer for your OS:

```bash
git clone https://github.com/Zavelinski/claude-code-safety-net.git
cd claude-code-safety-net
bash install.sh        # macOS / Linux
.\install.ps1          # Windows (PowerShell)
```

> **Run this yourself, in an interactive shell.** The installer registers a `PreToolUse` hook and merges an entry into your `~/.claude/settings.json`. If you ask an AI agent to run it, Claude Code's auto-mode may (correctly) block it. Read the code, then run it yourself, or use Option 1.

> Requires Node.js. The installer uses the same node binary that runs it, so the hook works even if `node` is not on PATH inside hook subprocesses (a common Windows gotcha). The JSON merge is done in Node (faithful round-trip), not PowerShell `ConvertTo-Json`.

Then **restart Claude Code** so it picks up the new skill and hook.

## Use

Inside any git project, just tell Claude `undo` / `desfazer` / `voltar atras` and the skill runs it. Or call the CLI directly:

```
node ~/.claude/skills/safety-net/bin/safety-net.js status   # how many checkpoints, latest
node ~/.claude/skills/safety-net/bin/safety-net.js list      # list all checkpoints (#1 = oldest)
node ~/.claude/skills/safety-net/bin/safety-net.js undo       # restore the latest checkpoint
node ~/.claude/skills/safety-net/bin/safety-net.js undo 3     # restore checkpoint #3
node ~/.claude/skills/safety-net/bin/safety-net.js keep       # clear checkpoints (net off)
```

## Limitations (v1)

- Requires a git repo with at least one commit. In a non-git directory the hook is a silent no-op (run `git init` + a first commit to enable it).
- `undo` restores modified and deleted tracked files. It does **not** delete files Claude newly created (safe by design) - remove those manually.
- Untracked files are not part of a checkpoint (a `git stash create` limitation).

## Uninstall

```bash
bash uninstall.sh      # macOS / Linux
```
```powershell
.\uninstall.ps1        # Windows
```

This removes the skill, the hook, and the `settings.json` entry. Per-repo checkpoints (`refs/safety-net/*` and `<gitdir>/safety-net/`) are left intact; clear them per project with `node bin/safety-net.js keep`.

## How it works (security note)

The hook is ~70 lines of Node. Before each edit it: reads the tool input, finds the git root, runs `git stash create` to snapshot the working tree, anchors a ref, and appends one ledger line. It makes **no network calls**, touches only your repo's `.git` (refs + a ledger file), and fails silently so it can never break your edit. Read [`hooks/safety-net-checkpoint.js`](hooks/safety-net-checkpoint.js) before installing (you should, for any hook).

## License

MIT. See [LICENSE](LICENSE).

---

Part of the **[claude-code-skills](https://github.com/Zavelinski/claude-code-skills)** collection: a suite of focused, original Claude Code skills.
