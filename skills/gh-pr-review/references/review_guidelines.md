# Code Review Guidelines

When performing a code review for this project, adhere to the following standards:

## 1. Technical Accuracy
- Ensure logic is sound and handles edge cases (nil checks, empty arrays, etc.).
- Verify that performance implications are considered (N+1 queries, indexing).
- Check for security vulnerabilities (injection, auth bypass, data leakage).

## 2. Idiomatic Consistency
- Follow Ruby on Rails best practices.
- Use established project patterns (e.g., base controller helpers, shared concerns).
- Ensure variable naming and structure match existing code.

## 3. Communication Style
- Be professional, constructive, and concise.
- Provide "Why" for suggested changes.
- Use clear, actionable feedback.

## 4. GitHub PR Format
- Group comments into a single review summary when possible.
- Use inline comments for specific line-level feedback.
- Use the `COMMENT` event unless major changes are required.
