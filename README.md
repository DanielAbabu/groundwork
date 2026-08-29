# Groundwork

> Practice debugging under pressure and present system designs to stakeholders who push back.

Groundwork is a platform for practicing software engineering skills under realistic operational constraints:

1. **Debugging Rotation**: Get paged into broken codebases, read the signal, fix root causes in Monaco Editor, and verify against hidden pytest test harnesses.
2. **Design Review Track**: Present system design proposals across 4 stages — Clarify, Capacity, Component Canvas, and Trade-Off Defense.

---

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) / React 19
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Styling**: Tailwind CSS & Paper-Ink Design System
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
git clone https://github.com/your-org/groundwork.git
cd groundwork

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

---

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md): System architecture, Web Worker sandbox, and security model.
- [DESIGN.md](./DESIGN.md): Paper-Ink design system tokens, color palettes, and typography rules.
- [AGENTS.md](./AGENTS.md): Repository guidelines for AI pair programmers and contributors.
