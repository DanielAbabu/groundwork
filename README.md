# Incident Room

Incident — MVP Product Spec

1. One-line pitch

A debugging practice platform where users get "paged" into small, broken codebases and have to find and fix the real root cause — starting with dead-simple, single-cause bugs across a few common scenario types (missing logic, broken DB query, bad async handling).

2. MVP goal

Prove the core loop end-to-end: user opens a broken mini-codebase → reads a realistic signal (stack trace / failing test / error log) → edits code → runs a hidden test harness → gets pass/fail with real feedback. No red herrings, no multi-cause bugs, no load simulation yet. Everything is single bug, single root cause, deterministic grading.

3. Core loop (what the user experiences)

Land on a scenario card: title, short "incident" framing, difficulty tag.

Enter the Incident Room: file tree (2-4 files), code editor, and a signal panel (stack trace or failing test output).

Explore the files, find the broken/missing logic.

Edit code in the browser.

Click "Run Tests" — hidden test harness executes against their code.

See pass/fail per test case, plus a short explanation of what was actually wrong (shown only after first run or after 2 failed attempts).

Mark scenario complete, move to next.

4. Scenario types in MVP (all single-cause, no red herrings)

Type A — Missing/incomplete logic

Example: calculateTotal() is stubbed out or missing, called from a route handler, causing a TypeError.

Files: route handler, service file with the gap, one supporting model file (working, for context).

Signal: real stack trace pointing to exact file/line.

Task: implement the missing function correctly.

Grading: hidden tests POST/call the function with several inputs, check exact expected outputs (not just "no crash").

Type B — Broken database query

Example: a query filters on the wrong field, or is missing a WHERE clause, so it returns all users instead of one, or returns nothing.

Files: route/controller, a data-access file with the bad query, a schema/model file for context.

Signal: a failing test output showing expected vs. actual returned rows (e.g., "expected 1 user, got 50").

Task: fix the query.

Grading: hidden test seeds a small fixed dataset, runs the query function, asserts on exact returned rows.

Tech note: use an in-memory or embedded DB (e.g. SQLite in-memory, or a JSON-file mock DB) so grading is fast and fully sandboxed — no real DB infra needed for MVP.

Type C — Broken async / promise handling

Example: a function forgets to await a call, so it proceeds with undefined data, or a .then() chain is missing a return, silently dropping data.

Files: one async service file, one caller file.

Signal: stack trace or a test showing the returned value is undefined/wrong shape when it shouldn't be.

Task: fix the async chain.

Grading: hidden test calls the function and asserts on the resolved value.

Type D — Off-by-one / bad conditional

Example: pagination logic returns one extra/missing item, or a discount is applied when it shouldn't be due to a flipped comparison.

Files: single file, maybe two.

Signal: failing test showing exact input/expected/actual.

Task: fix the logic.

Grading: same pattern — deterministic input/output assertions.

MVP content target: 3-4 scenarios per type = 12-16 total scenarios. Enough to validate the format and give a real free-tier experience without over-investing in content before the loop is validated.

5. What's explicitly OUT of MVP scope

No multi-cause / cascading bugs

No red herrings or decoy files

No live/simulated production traffic or load graphs

No memory leak or race-condition scenarios (these need more infra to grade reliably — later milestone)

No user accounts beyond basic auth (can stub with local storage or a single test account first)

No content authoring tool/generator — all scenarios hand-authored as static fixtures

No B2B/interview-mode features

6. Technical architecture

Frontend

Web app, Monaco editor embedded for the code view (gives real IDE feel — syntax highlighting, multi-file tabs — cheaply).

File tree component reading from a scenario's file bundle.

Signal panel: just renders pre-formatted log/stack-trace text for MVP (no live streaming needed yet).

Execution/grading

Each scenario is a small Node.js project bundle (files + hidden test file) stored server-side.

On "Run Tests," the user's edited files + the hidden test file are executed in a sandboxed container (or a fast ephemeral serverless sandbox — e.g. a locked-down Node VM/container with no network access, short timeout).

Test runner (Jest or plain assertions) produces pass/fail + assertion messages, returned to the frontend.

This sandboxing is the main infra investment in the MVP — isolate execution per-request, strict timeouts (2-3s), no network/filesystem access beyond the scenario's own files.

Data

Scenarios stored as static bundles (folder per scenario: starter files + solution + hidden tests + metadata like title/framing/difficulty). No need for a scenario database yet — filesystem or a simple content repo is enough.

User progress: simple table — user_id, scenario_id, status (attempted/passed), attempts count.

Stack suggestion

Frontend: React + Monaco.

Backend: Node/Express (or similar) exposing /scenarios, /scenarios/:id, /scenarios/:id/run.

Sandbox: containerized execution (Docker) or a managed code-execution sandbox service if you don't want to run your own container orchestration for MVP — worth evaluating build-vs-buy here since safe code execution is a real security surface.

DB scenarios use SQLite in-memory to avoid needing real database infra in the sandbox.

7. Grading philosophy (important, keep consistent across all scenario types)

Every hidden test asserts on behavior/output, never on "did they touch line X." This is what stops users from gaming a scenario (e.g., wrapping in try/catch to silence an error) and is what makes a "pass" mean something. Each scenario should have 3-5 test cases covering the main case plus at least one edge case.

8. Success metrics for the MVP

% of users who complete at least one full scenario (validates the core loop isn't confusing)

% of users who attempt a second scenario (validates the hook/framing works)

Average attempts-to-pass per scenario (too low = too easy, too high = unclear signal/instructions)

Qualitative: does the "paged into an incident" framing actually land, or does it read as gimmicky? Worth a few direct user interviews after the first 10 scenarios are built.

9. Suggested build order

Sandbox execution pipeline with one hardcoded scenario (Type A) end-to-end — this de-risks the hardest technical piece first.

Frontend Incident Room UI (file tree, editor, signal panel, run button, results panel).

Author 3-4 more Type A scenarios to confirm the content format is repeatable.

Add Type B (DB) — validates the in-memory DB sandboxing pattern.

Add Type C and D — these reuse existing infra, mostly content work.

Basic progress tracking + scenario list/dashboard page.

Polish the "incident" framing copy (titles, urgency language) once the mechanics are solid.


## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
