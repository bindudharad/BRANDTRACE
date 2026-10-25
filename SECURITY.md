# Security Policy

## Scope

BRANDTRACE is a **demonstration application** intended for local development and hackathon evaluation. It does not implement production-grade authentication, encryption at rest, or network-level security controls. This document describes the actual security posture, known boundaries, and safe development practices.

---

## What is implemented

### Input validation

- File uploads are validated for MIME type and byte size server-side (`MAX_UPLOAD_BYTES`, default 10 MB).
- Text content submitted to the review API is stored as plain text; no SQL injection risk from content because SQLAlchemy parameterised queries are used throughout.
- DOMPurify is used on the frontend for any content rendered as HTML.

### Secret handling

- The `GEMINI_API_KEY` is server-side only — it is read from environment variables and never returned in API responses or included in frontend bundles.
- No `VITE_` prefixed variables expose secrets to the browser.
- `.env` files are gitignored. `.env.example` contains only placeholder values.

### Audit records

- Audit events are append-only. There is no delete or overwrite endpoint for audit records in the current implementation.
- Every action (submission, disposition, approval, version restore) creates an immutable timestamped record.

### Disposition integrity

- The backend rejects replacement text that equals the disposition reason string (cross-contamination guard).
- Replacements starting with known QA metadata prefixes (`"Manual QA:"`, `"Reason:"`, etc.) are rejected server-side.

---

## Known security boundaries (demo mode)

### Role simulation

The demo uses an `X-Demo-Role` HTTP header for role simulation. This is **not real authentication**. Any HTTP client can set any role header. This is explicitly labelled in the UI ("DEMO MODE").

Role enforcement is correct within the application logic: the server checks the header and returns HTTP 403 for underprivileged operations. It is not resistant to a malicious client spoofing a header.

### No session management

There are no sessions, tokens, JWTs, or cookies. Every request is stateless from an authentication perspective.

### SQLite in development

The local SQLite database has no encryption. Do not store sensitive personal data in the development database.

### CORS

Default CORS allows `http://localhost:3000`. In production, configure `CORS_ORIGINS` to your actual frontend domain only.

---

## Reporting a security issue

This is a demonstration project with no public deployment. If you discover a security issue relevant to the application design or data handling:

1. Do not open a public GitHub issue for sensitive security concerns.
2. Contact the project author directly using the contact information in the project README or repository profile.
3. Describe the issue clearly: affected component, steps to reproduce, potential impact.

There is no formal bug bounty program for this project.

---

## Safe development practices

1. **Never commit `.env` files.** Use `.env.example` for templates.
2. **Never commit the local database.** `*.db` files are gitignored.
3. **Never commit API keys.** Verify with `git diff --staged` before every commit.
4. **Use isolated test databases.** Each test file creates its own temporary SQLite DB.
5. **Review uploads directory.** If `uploads/` contains real user files, exclude it from commits.

---

## Dependencies

Dependencies are managed via `package.json` and `backend/requirements.txt`. Review dependency updates before merging. Known CVEs in pinned dependencies should be investigated and updated before production use.
