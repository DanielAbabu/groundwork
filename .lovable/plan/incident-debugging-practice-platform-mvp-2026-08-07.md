# Incident — Debugging Practice Platform (MVP)

Build the full core loop: scenario list → Incident Room (file tree + Monaco editor + signal panel) → Run Tests in a sandboxed worker → pass/fail results with explanation → progress saved per account. 16 hand-authored single-cause scenarios across types A–D.

## How execution works

Tests run in an in-browser Web Worker sandbox:

- The worker has no DOM, no network (fetch/XHR/WebSocket stripped), and is terminated after a 3s timeout.
- The user's edited files are linked together by a tiny in-worker module loader (a `require`-style resolver over the scenario's virtual file map), then the hidden test file runs against them.
- A minimal assertion runtime (`test()`, `expect().toEqual()` etc.) produces per-case pass/fail plus expected-vs-actual messages.
- Type B (database) scenarios use a small in-worker mock DB: a fixed seeded dataset plus a chainable query API (`db.table('users').where(...)`), reset before every test. Same behavior-based grading, no SQLite/WASM needed.

Trade-off you accepted: hidden test code is delivered to the browser to run, so a determined user could inspect it. Scenario metadata still keeps tests out of the visible file tree and editor. If this becomes a problem later, the same scenario bundles can be moved behind a server-side or containerized runner without changing the UI.

## Pages

- `/` — landing: incident framing, how it works, sign-in CTA. Public.
- `/auth` — email/password sign-up + sign-in, plus Google sign-in.
- `/incidents` — scenario board: cards with title, incident framing, type + difficulty tags, and per-user status (unattempted / attempted / resolved) with attempt counts. Signed-in.
- `/incidents/$slug` — the Incident Room. Signed-in.

## Incident Room layout

- Header: incident title, severity/difficulty tag, "Resolved" state, back to board.
- Left: file tree (2–4 files per scenario; hidden test file never listed).
- Center: Monaco editor with tabs, per-file dirty markers, "Reset files" action. Edits held in local state and mirrored to localStorage so a refresh doesn't lose work.
- Right (tabbed): **Signal** — pre-formatted stack trace / failing test output, monospace, colorized; **Results** — per-test pass/fail rows with assertion messages after a run.
- Footer bar: Run Tests button (with running state and elapsed timer), pass count summary.
- Postmortem panel: the short "what was actually wrong" explanation, revealed after the first successful run or after 2 failed attempts, as specified.

## Content: 16 scenarios

Four per type, each with starter files, a hidden test file (3–5 cases including one edge case), a reference solution, and metadata (title, framing copy, difficulty, signal text, postmortem).

- **Type A — missing/incomplete logic**: stubbed `calculateTotal`, missing tax/rounding helper, unimplemented cache key builder, incomplete permission resolver.
- **Type B — broken query**: filter on wrong field, missing WHERE, wrong join key, missing status filter returning archived rows.
- **Type C — async**: missing `await`, missing `return` in a `.then` chain, `Promise.all` over unmapped array, unhandled sequential dependency.
- **Type D — off-by-one / conditional**: pagination slice off by one, flipped discount comparison, inclusive/exclusive date range, `<=` vs `<` in a retry cap.

All single-cause, no red herrings, all graded on behavior only — never on whether a specific line was touched.

## Backend

Lovable Cloud (auth + database):

- `profiles` — id (FK to auth users), display_name, created_at. Auto-created on signup by trigger. RLS: read/update own row.
- `scenario_progress` — user_id, scenario_id (slug), status (`attempted` | `passed`), attempts, first_passed_at. Unique on (user_id, scenario_id). RLS scoped to `auth.uid()`.

Scenarios themselves stay as static TypeScript fixtures in the repo — no scenario table, per the spec. Progress is written through authenticated server functions on each run.

## Design direction

Terminal/on-call aesthetic: dark surface, monospace for signals and code, amber "paging" accent for active incidents, green/red only for test verdicts. Cards read like pager alerts (severity chip, timestamp, one-line symptom). No generic SaaS gradients.

## Technical notes

- `@monaco-editor/react` for the editor, loaded client-only (`<ClientOnly>` + lazy import) since Monaco touches `window` at import time.
- Sandbox worker created from a blob/worker module; per-run fresh worker, terminated on timeout or completion.
- Scenario fixtures live in `src/content/scenarios/*` with a typed schema; hidden tests are in the same bundle but excluded from the file-tree projection.
- Progress reads/writes via `createServerFn` with `requireSupabaseAuth`; protected routes under `_authenticated/`.
- Per-route `head()` metadata on landing, board, and each incident room.

## Build order

1. Cloud enable, auth pages, profiles + progress schema.
2. Scenario fixture schema + worker sandbox + assertion runtime, validated with one Type A scenario.
3. Incident Room UI (tree, editor, signal panel, run, results, postmortem).
4. Scenario board + progress tracking.
5. Author the remaining 15 scenarios, adding the mock DB for Type B.
6. Framing copy polish and landing page.
