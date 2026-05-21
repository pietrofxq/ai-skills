# ai-skills

A collection of skills for AI coding agents (Claude Code, etc.). Each file in [`skills/`](./skills) is a self-contained skill definition with frontmatter (`description`, `argument-hint`, `allowed-tools`) and a markdown body.

## Instructions for AI agents

If you are an AI agent reading this repo on behalf of a user, your job is to **install every skill in `skills/` into the user's global commands directory** so the skills become available across all of their projects.

> **Note on naming:** Each file here uses Claude Code's slash-command format (frontmatter with `description`, `argument-hint`, `allowed-tools`; body references `$ARGUMENTS`). Claude Code's true "skill" format is a `SKILL.md` inside a per-skill directory under `~/.claude/skills/` with different frontmatter. The harness surfaces slash commands in the available-skills list, so these still appear as skills to the agent — but they must be installed under `~/.claude/commands/`, not `~/.claude/skills/`.

### Steps

1. **Resolve the global commands directory.** For Claude Code this is `~/.claude/commands/` (expand `~` to the user's home). Create it if it does not exist.
2. **List every file in `./skills/`** of this repo (top-level `.md` files; recurse into subdirectories if any exist — preserve the subdirectory structure when copying).
3. **Copy each file** into the global commands directory, preserving filenames and any subdirectory structure.
   - If a file with the same name already exists at the destination, **ask the user before overwriting**. Show a short diff or note that the existing file will be replaced.
   - Do not delete files in the destination that are not in this repo.
4. **Confirm** to the user which skills were installed (filenames) and where they were copied to.

### Reference command

```bash
mkdir -p ~/.claude/commands
cp -i -R skills/. ~/.claude/commands/
```

`-i` prompts before overwriting existing files; `-R` recurses into subdirectories. Run this from the repo root.

### Verifying installation

After copying, the user can restart their AI agent session (or run `/help` in Claude Code) and the new skills should appear in the available-skills list. Each skill is invoked as a slash command by its filename without the `.md` extension (e.g. `copilot-review.md` → `/copilot-review`).

## Adding a new skill

Drop a new `.md` file into `skills/` with frontmatter at the top:

```markdown
---
description: "One-line summary shown in the skill list"
argument-hint: "[optional — describe expected arguments]"
allowed-tools: ["Bash", "Read", "Edit", "Write", "Grep", "Glob"]
---

# Skill title

Body of the skill — instructions the agent follows when this skill is invoked.
```

Commit and push; users re-running the install step above will pick up the new skill.
