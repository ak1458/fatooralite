# Fatoora Lite Pro — Working Agreement

**Read `START-HERE.md` (repo root) first, every session.** It is the single
entry point: current state, what is left in priority order, what is blocked on
the owner, and the invariants that must not be "fixed". It is short by design.

Then, only as needed:

- `docs/16-launch-plan.md` — the phase plan and full write-ups of what each
  phase delivered.
- `handoff.md` — the chronological diary (~1500 lines). **Search it, don't read
  it end to end.** It's the authoritative record of what happened and why, but
  `START-HERE.md` is what tells you where to begin.
- `docs/12-master-roadmap.md` — the product vision behind the plan.

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

## No tool attribution in the repository (mandatory)

Fatoora Lite Pro is presented as professionally engineered software. Assistant
attribution in the repository misrepresents that and puts AI accounts in
GitHub's contributor graph.

**Never** add to a commit message, PR body, changelog entry, code comment, or
generated file:

- `Co-Authored-By:` trailers naming an assistant or `noreply@anthropic.com`
- "Generated with …" / "Created by …" footers naming a tool
- robot emoji sign-offs, or links to assistant product pages

Write commits as the human author would. The `commit-msg` hook in `.githooks/`
rejects the common forms; enable it once per clone with
`git config core.hooksPath .githooks`. The hook is a backstop, not the rule —
do not work around it.

Naming a model is fine in *technical* content where it is the subject, e.g.
`lib/ai/providers/anthropic.ts` or `docs/10-ai-architecture.md`.

## Progress tracking (mandatory)

Three files, each with one job. Whenever a piece of work is finished:

1. **`START-HERE.md`** — update *Current state* and *What is left*. This is the
   file the next session reads first, so it must never describe work that is
   already done. Keep it short; it is an index, not a record.
2. **`docs/16-launch-plan.md`** — mark the phase, and write up what was
   actually delivered versus what was planned.
3. **`handoff.md`** — append a dated entry: what you did, what you deliberately
   did *not* do and why, and anything that cost you time. This is the diary;
   it is append-only in spirit, so don't rewrite history in it.

Also add any new **invariant** to `START-HERE.md` — something that looks like a
bug and is deliberate. Those are the things a later session breaks by "fixing".

This is what lets a different AI session — or a different underlying model —
pick up exactly where the previous one stopped instead of re-deriving
context or redoing finished work.
