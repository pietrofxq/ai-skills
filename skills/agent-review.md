---
name: agent-review
description: Provide a thorough, practical code review of a PR/branch/diff. Focus on correctness, security, maintainability, performance, tests, and user impact. Apply tech-stack best practices when the stack is known; otherwise keep guidance general and actionable.
---

## Agent Review

Use this as a repeatable checklist for reviewing code changes (PRs, branch diffs, staged/unstaged changes). The goal is to help the author ship safely and quickly: identify true risks, validate the approach, and suggest improvements with high signal-to-noise.

### Step 1 — Resolve the review target

Inspect $ARGUMENTS (the text the user typed after /agent-review):

- PR number (e.g. `/agent-review 42`): use `gh pr view 42` + `gh pr diff 42`.
- Branch name or `staged` / `unstaged`: scope the diff accordingly (e.g. `git diff <branch>...HEAD`, `git diff --staged`, `git diff`).
- No argument (default): review the current branch diff against the repo default branch.
  - Detect default: `git symbolic-ref refs/remotes/origin/HEAD` → strip `refs/remotes/origin/`. Fall back to `main`, then `master`.
  - Diff: `git diff <default>...HEAD` plus `git status -s` for untracked files.

If there is nothing to review (empty diff, no relevant changes), say so and stop.

### Step 2 — Gather context before judging the code

Collect the minimal context that improves review quality:

- **Intent**: what should this change do? (PR title/body, ticket link, commit messages: `git log <default>..HEAD --format='%s%n%b'`).
- **Scope**: what changed and how much? (`git diff --stat <default>...HEAD`).
- **Constraints**: performance/security constraints, compatibility targets, rollout plan, data migrations, third-party APIs, SLAs.
- **Project conventions**: any rules from `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, linters/formatters, error handling patterns, logging/metrics standards.

Avoid requesting or producing a “style-only” review unless that’s explicitly what the user wants.

### Step 3 — Review the diff (high-signal pass)

Use this order to reduce false positives:

- **Read for intent first**: skim filenames, PR description, and `--stat` to predict what “should” change.
- **Look for correctness risks**:
  - edge cases (null/empty, off-by-one, timezone/locale, retries, partial failures)
  - concurrency (races, idempotency, double-submit, reentrancy)
  - backward compatibility (API contracts, persisted data formats, feature flags)
  - error handling (what happens on timeout, 4xx/5xx, parse errors, missing permissions)
- **Look for security/privacy risks**:
  - authz checks (server-side enforcement, not UI-only)
  - injection paths (SQL/NoSQL, shell, template, path traversal)
  - secrets/PII in logs, telemetry, exceptions, analytics payloads
  - SSRF/file upload handling, unsafe redirects, untrusted deserialization
- **Look for maintainability**:
  - clear ownership boundaries (modules/services), minimal coupling
  - naming and API shape match domain language
  - avoids “clever” code when simple is safer
  - deletes dead code; avoids duplicated logic without abstraction-for-abstraction’s-sake
- **Look for performance footguns** (only when meaningful):
  - accidental \(N+1\) queries, unbounded loops, repeated serialization/deserialization
  - heavy work on hot paths; missing caching/streaming/batching when required
  - large payloads, missing pagination, missing indexes (DB)
- **Look for user impact**:
  - UX regressions, error messages, empty states, loading states
  - accessibility basics (keyboard, focus, labels, contrast) for UI work

Keep feedback **actionable**: propose a concrete change or a question that would unblock the author.

### Step 4 — Validate with evidence (run/verify when possible)

Prefer reviews backed by checks you can run:

- **Build/lint/typecheck**: ensure the change passes the repo’s standard checks.
- **Tests**: run relevant unit/integration/e2e tests; verify new tests fail before fix and pass after.
- **Manual smoke**: for UI/API changes, validate the simplest happy path and one failure path.
- **Observability**: confirm logs/metrics/traces help debug failures without leaking sensitive data.

If you can’t run code, state that explicitly and focus on static risks.

### Step 5 — Write the review response (format + tone)

Use a structured, prioritized response:

- **Verdict**: ship / don’t ship yet (and why in one sentence).
- **Blockers (must fix)**: numbered list; include file-level pointers when possible.
- **Suggestions (nice-to-have)**: improvements, refactors, follow-ups.
- **Questions**: only when the diff lacks critical context.
- **Praise (sparingly)**: call out one genuinely good decision if it helps reinforce the pattern.

Avoid:

- style nitpicks unless they hide bugs or violate repo standards
- “rewrite everything” suggestions without a clear payoff
- vague statements (“this seems wrong”) without explaining impact and a fix

### Tech stack best-practice prompts (apply when relevant)

Use these targeted checks only when the change touches the area.

- **TypeScript/JavaScript**
  - types reflect reality (no `any` escapes unless justified); runtime validation at trust boundaries
  - avoids mixing `null`/`undefined` semantics inconsistently
  - async correctness (missing `await`, swallowed promises, unhandled rejections)
  - stable public APIs; avoids breaking changes without migration notes
- **React**
  - correct hook dependencies; avoids stale closures and unnecessary re-renders
  - accessibility: labels, focus management, keyboard navigation, semantic HTML
  - avoids data fetching in render; handles loading/error/empty states
- **Node/Backend services**
  - input validation and authz enforced server-side
  - timeouts + retries are bounded; idempotency for write endpoints
  - structured logging; no PII/secrets; correlation IDs if standard in repo
- **Databases**
  - indexes/migrations are safe; backfills are bounded; rollback story exists
  - avoids \(N+1\); uses transactions where invariants require them
  - schema changes are backwards compatible if deployed independently
- **Python**
  - type hints align with runtime; avoids mutable default args
  - clear exception boundaries; uses context managers for resources
  - tests cover edge cases; deterministic time/randomness where needed
- **Ruby / Rails**
  - avoids \(N+1\) queries; uses eager loading intentionally (`includes`/`preload`/`eager_load`) and verifies it doesn’t change semantics
  - strong params / input validation are present; authn/authz checks are enforced server-side (policy/ability checks are covered by tests)
  - avoids callbacks for non-trivial domain logic; prefers explicit service objects/transactions when invariants span multiple writes
  - handles nil safely; avoids surprising monkey patches; keeps metaprogramming readable and well-tested
  - migrations are safe on large tables (avoid long locks; add indexes concurrently where supported; provide backfill strategy/rollback story)
- **Security-sensitive code**
  - threat model is explicit; permissions and audit trails are validated
  - constant-time comparisons for secrets when appropriate; secure defaults

If the stack is unknown, ask one targeted question (“Is this TypeScript/React?”) or keep feedback stack-neutral.