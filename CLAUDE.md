# Fatoora Lite Pro — Working Agreement

**Read `handoff.md` (repo root) first, every session.** It's the authoritative
session-to-session progress tracker — what's done, what's next, notes for
whoever picks this up. `docs/12-master-roadmap.md` is the vision/priority
document behind it.

## Two-agent workflow (planning vs. implementation)

This project splits roles by model on purpose, to keep token spend on
implementation low while keeping planning quality high:

- **Architect (Claude Fable 5)** — the `architect` subagent
  (`.claude/agents/architect.md`). Plans, breaks work into concrete tasks,
  reviews progress against the roadmap, makes architectural calls, hands back
  file-level implementation instructions. Read-only tools (`Read`/`Grep`/
  `Glob`) — it cannot edit files or run commands, by design.
- **Implementer (Claude Sonnet)** — the main thread (pinned via
  `.claude/settings.json`). Writes the code, runs tests, wires things up,
  commits.

**Convention:** before starting a new roadmap phase, a non-trivial feature, or
any decision with real ambiguity (schema shape, migration strategy, a
breaking change), invoke the `architect` subagent first and implement from its
plan. For small, unambiguous, mechanical tasks (a typo, a one-line fix,
continuing a task the architect already scoped), skip straight to
implementing — don't over-consult it.

There's no way to force this split via a hook — Claude Code hooks fire on
tool/file events, not on semantic "is this a planning task," so this is a
convention the main thread follows deliberately, not a mechanical gate.

## Progress tracking (mandatory)

`handoff.md` must stay current. Whenever a task from `docs/12-master-roadmap.md`
is completed:
1. Mark it done in `handoff.md` (checkbox + brief note on what/where).
2. Record anything the next session needs to know (gotchas, decisions made,
   what deliberately wasn't done and why).
3. Update the "next session should start at" pointer.

This is what lets a different AI session — or a different underlying model —
pick up exactly where the previous one stopped instead of re-deriving
context or redoing finished work.
