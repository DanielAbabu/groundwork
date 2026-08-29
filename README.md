# ⚡ RAW // SKILL

> Practice tactical debugging under pressure and present distributed system designs to stakeholders who push back.

**RawSkill** is an elite engineering platform for practicing software engineering skills under realistic operational constraints:

1. **Debugging Rotation**: Get paged into broken codebases, read the signal, fix root causes in Monaco Editor, and verify against hidden pytest test harnesses.
2. **Design Review Track**: Present system design proposals across 4 stages — Clarify, Capacity, Component Canvas, and Trade-Off Defense.

---

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) / React 19
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Styling**: Tailwind CSS & RawSkill Deep Obsidian Design System
- **Code Editor**: Monaco Code Editor
- **Execution Sandbox**: Pyodide Python Runner in Web Workers
- **Database & Auth**: Supabase Postgres with RLS & TanStack Server Functions
- **Testing**: Vitest & GitHub Actions CI

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/rawskill.git
cd rawskill

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Verification & Testing

```bash
# Run typechecking
npx tsc --noEmit

# Run linter
npm run lint

# Run unit tests
npm run test

# Build production bundle
npm run build
```
