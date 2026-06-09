---
name: gh-pr-review
description: Performs a comprehensive code review of the current branch and posts comments to the associated GitHub Pull Request. Use when requested to "review this branch on GitHub" or "post review comments to my PR".
---

# GitHub PR Review Skill

## Overview
This skill automates the process of reviewing code changes in the current branch and syncing those findings as official code review comments on the GitHub Pull Request.

## GitHub App Setup (Bot Identity)
To have comments posted on behalf of a GitHub App:
1.  **Register a GitHub App** in your account/org.
2.  **Permissions**: Give it `Pull requests: Read & Write` and `Metadata: Read-only`.
3.  **Install the App** on your repository.
4.  **Gather Credentials**:
    - `GH_APP_ID`: Found on the App settings page.
    - `GH_INSTALLATION_ID`: Found in the URL when viewing the App's installation on your repo (e.g., `.../installations/12345`).
    - `GH_PRIVATE_KEY_PATH`: Path to the `.pem` file you generated.
5.  **Set Environment Variables**:
    ```bash
    export GH_APP_ID=12345
    export GH_INSTALLATION_ID=67890
    export GH_PRIVATE_KEY_PATH=/path/to/key.pem
    ```
    The skill will automatically use these to authenticate as the App.

## Workflow

1.  **Identify PR**: Use `gh pr view --json number,baseRefName,headRefName,repository` to get the PR details.
2.  **Get Diff**: Run `git diff main..HEAD` (or the identified base branch) to analyze changes.
3.  **Perform Review**: Read the changed files and identify logic, security, or style issues. Refer to `references/review_guidelines.md` for project-specific standards.
4.  **Prepare Comments**: Create a JSON file with the following structure:
    ```json
    {
      "body": "Summary of the review...",
      "event": "COMMENT",
      "comments": [
        {
          "path": "app/models/user.rb",
          "line": 45,
          "body": "Suggested change and why..."
        }
      ]
    }
    ```
    *Note: Use the actual line number from the file, not the diff position.*
5.  **Post Review**: Run the provided script to sync findings:
    ```bash
    node gh-pr-review/scripts/gh_api_review.cjs <owner/repo> <pr_number> <temp_json_file_path>
    ```

## Guidelines
- **Be Surgical**: Only comment on changes introduced in the branch.
- **Line Accuracy**: Double-check line numbers by reading the file content before finalizing the JSON.
- **One Review**: Prefer batching all comments into a single review submission rather than multiple independent comments.
- **Safety**: Do not post sensitive information or credentials.
