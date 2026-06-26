# claude-code-safety-net

Automatic, reversible checkpoints around Claude Code's edits. Type `undo` to snap back. Recovery-first: every session becomes rollback-able by default, no discipline required.

## The problem it fixes

Claude edits across many files, breaks something, and you cannot cleanly roll back because you forgot to commit first. Nobody commits first. This makes every edit reversible automatically.

## How it works

A `PreToolUse` hook runs **before** each `Edit | Write | MultiEdit | NotebookEdit` and:

1. Captures the current git working tree as a stash commit (`git stash create`) without touching your working tree or index.
2. Anchors it under `refs/safety-net/<timestamp>` so `git gc` never collects it.
3. Records it in `<gitdir>/safety-net/ledger.jsonl`.

`undo` re-checkpoints the current state first (so undo is itself reversible), then restores tracked files to the chosen checkpoint. It **never deletes** files Claude newly created.

The hook is wrapped so it can **never block an edit**: on any error it exits 0 silently.

## Install

Windows (PowerShell):

```powershell
./install.ps1
```

macOS / Linux:

```bash
./install.sh
```

Then restart Claude Code so the hook is picked up. The installer copies the skill to `~/.claude/skills/safety-net` and registers the hook in `~/.claude/settings.json` (merged, not clobbered).

## Usage

Inside any git project:

```
node ~/.claude/skills/safety-net/bin/safety-net.js status   # how many checkpoints, latest
node ~/.claude/skills/safety-net/bin/safety-net.js list      # list all checkpoints (#1 = oldest)
node ~/.claude/skills/safety-net/bin/safety-net.js undo       # restore the latest checkpoint
node ~/.claude/skills/safety-net/bin/safety-net.js undo 3     # restore checkpoint #3
node ~/.claude/skills/safety-net/bin/safety-net.js keep       # clear checkpoints (net off)
```

Or just tell Claude "undo" / "desfazer" / "voltar atras" and the skill runs it for you.

## Limitations (v1)

- Requires a git repo with at least one commit. In a non-git directory the hook is a silent no-op (run `git init` + a first commit to enable it).
- `undo` restores modified and deleted tracked files. It does not delete files Claude newly created (safe by design) - remove those manually.
- Untracked files are not part of a checkpoint (a `git stash create` limitation).

## Uninstall

Remove the `safety-net` PreToolUse entry from `~/.claude/settings.json`, delete `~/.claude/skills/safety-net`, and (per repo, optional) clear refs with `node bin/safety-net.js keep`.

## License

MIT
