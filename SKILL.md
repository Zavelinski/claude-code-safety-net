---
name: safety-net
description: Use when the user wants to undo or roll back changes Claude made to files, recover a previous state, or turn on an automatic edit checkpoint net. Triggers - "undo", "desfazer", "voltar atras", "reverter as mudancas do Claude", "rollback", "restaurar", "safety net", "rede de seguranca", "checkpoint", "/safety-net". Restores tracked files to the snapshot taken right before the last edit, without deleting anything.
---

# safety-net

Automatic, reversible checkpoints around Claude's edits. Recovery-first: every multi-file session becomes rollback-able by default, with no discipline required from the user.

## How it works (mechanism)

A `PreToolUse` hook (matches `Edit|Write|MultiEdit|NotebookEdit`) runs BEFORE each edit and:

1. Captures the current git working tree as a stash commit via `git stash create` (does NOT touch the working tree or index).
2. Anchors it under `refs/safety-net/<timestamp>` so git gc never collects it.
3. Appends a line to a ledger at `<gitdir>/safety-net/ledger.jsonl`.

Duplicate snapshots (same tree as the previous checkpoint) are skipped. The hook NEVER blocks an edit: any error exits 0 silently.

`undo` restores tracked files to a checkpoint. It first re-checkpoints the current state, so undo is itself reversible. It never deletes files Claude newly created (safe by design).

## Commands

Run the CLI from inside the project (git repo):

```
node <skill-dir>/bin/safety-net.js status        # how many checkpoints, latest
node <skill-dir>/bin/safety-net.js list          # list all checkpoints (#1 = oldest)
node <skill-dir>/bin/safety-net.js undo           # restore the latest checkpoint
node <skill-dir>/bin/safety-net.js undo <n>       # restore checkpoint #n from list
node <skill-dir>/bin/safety-net.js keep           # clear checkpoints (turn the net off)
```

`<skill-dir>` after install is `~/.claude/skills/safety-net` (Windows: `%USERPROFILE%\.claude\skills\safety-net`).

## What to do when the user asks

- User says "undo" / "desfazer" / "voltar atras" / "reverter o que voce fez": run `undo`. Report the restored checkpoint SHA + timestamp, and the pre-undo SHA (so they know undo is reversible).
- User asks "what checkpoints exist" / "what can I roll back to": run `list`.
- User says "I'm done, drop the net" / "limpar checkpoints": run `keep`.
- User asks for status: run `status`.

Always show the user the SHA and timestamp you acted on. If a restore conflicts, do not force it: report the SHA and tell the user the manual command `git checkout <sha> -- <file>`.

## Limitations (v1, be honest about these)

- Requires a git repository with at least one commit. In a non-git dir, the hook is a silent no-op (document: run `git init` + first commit to enable checkpoints).
- `undo` restores modified and deleted tracked files. It does NOT delete files Claude newly created (safe, never destructive). Remove unwanted new files manually.
- Untracked files are not part of a checkpoint (git stash create limitation).
