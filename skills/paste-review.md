---
description: "Triage a pasted code review (from Copilot, ChatGPT, a colleague, anywhere) and address its comments"
argument-hint: "[paste the review text, or invoke empty and paste in chat]"
allowed-tools: ["Bash", "Read", "Edit", "Write", "Grep", "Glob"]
---

# Triage a Pasted Review

The user has a code review from somewhere outside the GitHub Copilot flow — another reviewer, an LLM, a Slack message, a screenshot they transcribed — and wants to triage and address its comments without re-typing them as instructions.

**Argument:** `$ARGUMENTS`

The argument **is** the review text. It may be:
- A long multi-line paste (most common).
- Empty — in which case prompt the user *once* with: "Paste the review text and send it as your next message; I'll triage from there." Then wait. **Do not invent comments.**
- A short note pointing at a file you can read (e.g. `see /tmp/review.txt`) — read that file and treat its contents as the review.

## Steps

### 1. Parse the review into discrete comments

Read the text and extract every distinct actionable item. Reviews come in many shapes — be flexible:

- **Structured** (file path + line number per comment) → use those anchors.
- **Loose prose** with quoted code snippets → grep the snippet to locate the file:line yourself.
- **Numbered/bulleted lists** without paths → number them sequentially as `#1`, `#2`, … and resolve the file:line during triage.
- **Mixed praise and critique** → ignore pure praise; only triage items that ask for or imply a change.

For each comment capture: a stable local id (`#1`, `#2`, …), the file:line if known (or "unresolved" if not yet), and the verbatim text of the comment. **Preserve the original wording** — do not paraphrase before showing the user, because the user needs to recognize each item against their paste.

If the text contains zero actionable items, say so and stop.

### 2. Present the parsed comments organized by file

Format the output as a triage list:

```
# Pasted review — <N> actionable items

## <path/to/file.ext> (<count>)
- #1 L<line>: <verbatim comment, truncated to ~200 chars>
- #2 L<line>: <verbatim comment>

## <another/file.ext> (<count>)
- #3 L<line>: <verbatim comment>

## Unresolved (no file:line yet) (<count>)
- #4: <verbatim comment>
```

Group by file path when paths are known. Items without a path go under "Unresolved" — you'll locate them in step 3.

### 3. Triage and propose fixes

For each item, classify it as:
- **Bug / correctness** — must address
- **Style / nit** — optional
- **False positive** — reviewer misread the code; explain why and skip
- **Out of scope** — legitimate but belongs in a separate change; skip with a note

For any "Unresolved" item, locate the relevant file:line first (grep for the snippet or symbol the reviewer mentioned). If you genuinely can't find it, mark the item `LOCATION UNCLEAR` and ask the user to point you at the file before triaging.

Read the referenced file:line for any non-trivial comment to confirm the diagnosis before proposing a fix. Do **not** apply edits automatically — show the user a short plan first (id, file, line, proposed change, one-sentence rationale) and wait for go-ahead.

**Track the local id (`#1`, `#2`, …) for each item in the plan.** The id → planned action mapping is the load-bearing artifact of this step; you'll need it in step 5 to produce the final summary.

### 4. Apply the fixes

Once the user approves the plan: apply edits, run tests + typecheck if the project has them, then commit. Capture the commit hash:

```bash
COMMIT=$(git rev-parse --short HEAD)
```

If multiple commits land, capture each and remember which fix went where.

If the project isn't a git repo or the user hasn't asked for a commit, skip the commit step — but still report the changes per item in step 5.

### 5. Produce a paste-back summary

Output a tight, copy-pasteable summary the user can drop back into wherever the review came from (PR comment, Slack reply, email, etc.). One line per item:

```
## Review triage summary

- #1 (path/to/file.ext:42) — Fixed in <short_sha>: <one-line summary>.
- #2 (path/to/file.ext:88) — Skipped — <one-line reason>.
- #3 (other/file.ext:12)   — Partially fixed in <short_sha>: <what was done>. Leaving <what remains> because <reason>.
- #4 (unresolved)           — Location unclear; awaiting pointer from reviewer.
```

Use the same reply styles as `copilot-review`:
- **Fix**: `Fixed in <sha>: <what changed>.`
- **Skip**: `Skipped — <reason>.`
- **Partial**: `Partially fixed in <sha>: <done>. Leaving <remains> because <reason>.`

Keep each line short. If rationale needs more, the commit message is the right place — not the summary line.

After printing the summary, tell the user: any items that couldn't be applied (failing tests, blocked by an unrelated bug, etc.) so they can decide whether to retry or defer.

## Notes

- Works on any repo or even non-repo directories. No `gh` or GitHub auth needed.
- If the user pastes a screenshot transcription with garbled file paths, prefer grepping the project for the quoted code over trusting the path verbatim.
- For very large pastes (more than ~30 items), confirm with the user before bulk-applying — they may want to handle in batches.
- If the same comment is repeated across several places (the reviewer flagged the same bug from multiple angles), still triage each instance separately so the summary lines up one-to-one with the paste.
