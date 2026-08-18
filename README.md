# Groundwork 🚀

> **Production Incident Debugging Platform for Engineers**

Groundwork is an interactive engineering platform where developers get "paged" into real-world production incidents. Read broken stack traces, inspect service codebases in a browser-based Monaco editor, diagnose root causes, and run an isolated Web Worker test harness to verify your fixes.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TanStack Start](https://img.shields.io/badge/TanStack_Start-FF4154?style=for-the-badge&logo=tanstack&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Monaco Editor](https://img.shields.io/badge/Monaco_Editor-1E1E1E?style=for-the-badge&logo=visual-studio-code&logoColor=white)

---

## ✨ Features

- 🚨 **16 Real-World Incident Scenarios**: Hand-crafted incidents covering real production bug patterns across 4 distinct categories:
  - **Type A — Logic Gaps & Unhandled State**: Missing logic, unhandled edge cases, uninitialized returns.
  - **Type B — Broken Database Queries**: Faulty `WHERE` clauses, missing tenant isolation, column mismatches, operator precedence.
  - **Type C — Asynchronous & Race Conditions**: Unawaited promises, stale closures, missing locks, unbounded execution.
  - **Type D — Off-by-One & Boundary Errors**: Slice bounds, pagination mistakes, retry count overflow, date end-range exclusions.
- 💻 **Integrated Monaco Code Editor**: Browser-based multi-file code editor with syntax highlighting, dirty state indicators, read-only file context, and local storage state persistence.
- ⚡ **Web Worker Test Harness**: Ultra-fast, zero-backend test runner running inside an isolated Web Worker. Evaluates user code against hidden assertions with strict 3-second timeouts.
- 📊 **Progress & Analytics Tracking**: Real-time progress monitoring and scenario attempt tracking backed by Supabase.
- 🎨 **Modern Dark Glassmorphic Design**: Clean UI built with Tailwind CSS, Radix UI primitives, Lucide icons, and custom glassmorphism styling.

---

## 🏗️ Architecture Overview

```
                          ┌──────────────────────────┐
                          │    TanStack Router /     │
                          │      TanStack Start      │
                          └─────────────┬────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
   │  Incident Board  │       │  Monaco Editor   │       │ Progress Tracker │
   │  (16 Scenarios)  │       │  & Signal View   │       │   (Supabase DB)  │
   └──────────────────┘       └─────────┬────────┘       └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │    Web Worker    │
                              │ Test Execution   │
                              └──────────────────┘
```

---

## 📁 Repository Structure

```
groundwork/
├── public/                     # Static assets & favicons
├── src/
│   ├── components/             # Reusable UI & Monaco CodeEditor components
│   ├── content/                # Scenario definitions (typeA.ts, typeB.ts, typeC.ts, typeD.ts)
│   ├── integrations/           # Supabase client integration
│   ├── lib/
│   │   ├── sandbox/            # Web Worker test runner & sandboxing harness
│   │   ├── scenarios/          # Scenario types and helper functions
│   │   └── progress.functions  # TanStack Start server functions
│   ├── routes/                 # TanStack Router file-based application routes
│   │   ├── _authenticated/     # Incident board, incident room & profile
│   │   ├── index.tsx           # Hero landing page
│   │   └── __root.tsx          # App root wrapper & layout
│   ├── styles.css              # Global CSS & Tailwind configuration
│   └── start.ts                # TanStack Start server entry point
├── vite.config.ts              # Vite plugins & alias configuration
└── tsconfig.json               # TypeScript strict configuration
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/DanielAbabu/groundwork.git
   cd groundwork
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:

   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🧪 Verification & Type Safety

Run type checking and code verification:

```bash
# Type check TypeScript codebase
npx tsc --noEmit

# Format code with Prettier
npx prettier --write .
```

---

## 📄 License

Created and maintained by [DanielAbabu](https://github.com/DanielAbabu).
