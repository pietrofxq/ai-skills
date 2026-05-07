---
description: "Fetch GitHub Copilot's PR review comments and triage them"
argument-hint: "[PR# or branch — defaults to current branch]"
allowed-tools: ["Bash", "Read", "Edit", "Write", "Grep", "Glob"]
---

# Fetch Copilot PR Review

Pull GitHub Copilot's review-level summaries and inline comments for a PR, then help the user triage and address them.

**Argument:** "$ARGUMENTS" (optional — PR number, branch name, or empty for current branch)

## Steps

### 1. Resolve the target PR

Run this script verbatim — it resolves `$ARGUMENTS` into a PR number using `gh`:

```bash
ARG="$ARGUMENTS"
if [ -z "$ARG" ]; then
  # Default: current branch
  PR=$(gh pr view --json number --jq .number 2>/dev/null)
elif [[ "$ARG" =~ ^[0-9]+$ ]]; then
  # Numeric: PR number directly
  PR="$ARG"
else
  # Otherwise: treat as branch name
  PR=$(gh pr list --head "$ARG" --json number --jq '.[0].number' 2>/dev/null)
fi

if [ -z "$PR" ] || [ "$PR" = "null" ]; then
  echo "ERROR: Could not resolve a PR. Pass a PR number or branch with an open PR." >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "PR #$PR on $REPO"
```

If the script fails, stop and ask the user for a PR number.

### 2. Fetch Copilot's comments

Copilot posts under two logins: `copilot-pull-request-reviewer[bot]` (review-level summaries) and `Copilot` (inline). Filter case-insensitively to catch both:

```bash
# Review-level summaries (overall comments on the PR)
gh api "repos/$REPO/pulls/$PR/reviews" \
  --jq '[.[] | select(.user.login | test("copilot"; "i")) | {id, state, submitted_at, body}]'

# Inline comments (file:line specific)
gh api --paginate "repos/$REPO/pulls/$PR/comments" \
  --jq '[.[] | select(.user.login | test("copilot"; "i")) | {id, path, line, side, in_reply_to_id, body, html_url}]'
```

If both arrays are empty, tell the user Copilot hasn't reviewed this PR yet and stop.

### 3. Present the comments organized by file

Format the output for the user as a triage list:

```
# Copilot review for PR #<N> — <title>

## Summaries (<count>)
- <submitted_at> — <state>: first ~200 chars of body...

## Inline comments (<count>)
### <path>
- L<line>: <body>  ← <html_url>
```

Group inline comments by file path. Keep bodies brief in the list — full text is in the JSON if needed.

### 4. Triage and propose fixes

For each inline comment, classify it as:
- **Bug / correctness** — must address
- **Style / nit** — optional
- **False positive** — Copilot misread the code; explain why and skip

Read the referenced file:line for any non-trivial comment to confirm the diagnosis before proposing a fix. Do **not** apply edits automatically — show the user a short plan first (file, line, proposed change, one-sentence rationale) and wait for go-ahead.

### 5. After fixes (only if user asks)

If the user wants to acknowledge resolved threads on GitHub, the API for that is:
```bash
gh api -X POST "repos/$REPO/pulls/$PR/comments/<comment_id>/replies" -f body="<reply text>"
```
Don't post replies unless the user explicitly asks.

## Notes

- Works on any repo where `gh` is authenticated and the cwd is a git checkout of that repo.
- If the user passed a branch name that doesn't have an open PR, the script returns `null` — surface that clearly instead of guessing.
- Copilot's review state is usually `COMMENTED` (not `APPROVED`/`CHANGES_REQUESTED`); don't gate behavior on that.