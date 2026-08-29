import { createFileRoute, Link } from "@tanstack/react-router";
import { scenarios } from "@/content/scenarios";
import { designScenarios } from "@/content/design";
import { DIFFICULTY_LABELS, TYPE_LABELS } from "@/lib/scenarios/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Groundwork — practice debugging and system design under pressure" },
      {
        name: "description",
        content:
          "Two rotations in one workspace: get paged into broken codebases and fix the root cause, or present a system design stage by stage to a stakeholder who pushes back.",
      },
      {
        property: "og:title",
        content: "Groundwork — practice debugging and system design under pressure",
      },
      {
        property: "og:description",
        content:
          "Fix real broken code against a hidden test harness, then defend a design: clarify, size, sketch, trade off.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TRACKS = [
  {
    tag: "debugging rotation",
    title: "Get paged. Read the signal. Fix the cause.",
    body: "You land in someone else's codebase with a one-line symptom and the exact failing output — a stack trace or a red test. Two to four real files, one root cause, no red herrings. A hidden harness grades behaviour, not style, and the postmortem tells you what actually broke.",
    bullets: [
      "16 single-cause scenarios: missing logic, bad queries, async mistakes, off-by-one",
      "Monaco editor with the real files, signal panel beside it",
      "Hidden tests decide pass/fail; attempts are tracked per scenario",
    ],
    to: "/incidents" as const,
    cta: "Open the Groundwork board",
  },
  {
    tag: "design review track",
    title: "Present the design. Survive the pushback.",
    body: "A stakeholder wants a system built and has thirty minutes. You work through four graded stages: pin down the requirements that change the design, size the load with real arithmetic, sketch the read path on a typed canvas, then defend one trade-off in prose.",
    bullets: [
      "Clarify → Capacity → Components → Trade-offs, each graded on its own rubric",
      "Diagrams are typed component graphs, so every node and edge is checked",
      "Per-rule feedback points at the exact component or connection you missed",
    ],
    to: "/design" as const,
    cta: "Open the design board",
  },
];

const STEPS = [
  {
    n: "01",
    title: "You get paged",
    body: "A symptom, a difficulty, and the failing signal exactly as it landed — no cleaned-up puzzle statement.",
  },
  {
    n: "02",
    title: "You work the problem",
    body: "Real files in an editor, or a real canvas and rubric. Same constraints you get in the room.",
  },
  {
    n: "03",
    title: "You get graded honestly",
    body: "Hidden tests for code, per-rule grading for designs, and a written explanation of what the right answer was.",
  },
];

function Index() {
  const first = scenarios[0]!;
  const firstDesign = designScenarios[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Sticky Landing Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 group-hover:border-amber-500/60 transition-colors">
                <svg
                  className="size-4 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-foreground">
                GROUNDWORK
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/incidents"
              className="hidden sm:inline-block font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Debugging
            </Link>
            <Link
              to="/design"
              className="hidden sm:inline-block font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Design Reviews
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg bg-amber-500 px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-amber-400 transition-all shadow-xs"
            >
              Enter App →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="grid-noise border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-primary">
              <span className="pager-pulse inline-block size-2 rounded-full bg-primary" />
              on-call training
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Practice the two things interviews and on-call actually test: someone else&apos;s
              broken code, and a design you have to defend.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {scenarios.length} single-cause scenarios graded by a hidden test harness, and{" "}
              {designScenarios.length} stakeholder design review
              {designScenarios.length === 1 ? "" : "s"} graded stage by stage — clarify, size,
              sketch, trade off. No multiple-choice quizzes, no toy puzzles.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/incidents/$slug"
                params={{ slug: first.id }}
                className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 font-mono text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start first scenario
              </Link>
              <Link
                to="/design/$slug"
                params={{ slug: firstDesign.id }}
                className="inline-flex items-center rounded-md border border-border bg-card px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Start a design review
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-md px-2 py-2.5 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                See my progress →
              </Link>
            </div>
            <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-6 border-t border-border pt-8 sm:grid-cols-4">
              {[
                { k: "scenarios", v: String(scenarios.length) },
                { k: "design reviews", v: String(designScenarios.length) },
                { k: "graded stages", v: "4 per review" },
                { k: "hidden tests", v: "every scenario" },
              ].map((stat) => (
                <div key={stat.k}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {stat.k}
                  </dt>
                  <dd className="mt-1 font-mono text-lg text-foreground">{stat.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            two tracks, one workspace
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {TRACKS.map((track) => (
              <article
                key={track.tag}
                className="flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                  {track.tag}
                </p>
                <h3 className="mt-3 text-xl font-semibold leading-snug text-foreground">
                  {track.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{track.body}</p>
                <ul className="mt-4 space-y-2">
                  {track.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-2 font-mono text-[11px] leading-relaxed text-muted-foreground"
                    >
                      <span className="text-primary">▸</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
                <Link
                  to={track.to}
                  className="mt-6 inline-flex w-fit items-center rounded-md border border-border bg-background px-4 py-2 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:bg-accent"
                >
                  {track.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              how a session runs
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <article key={step.n} className="rounded-lg border border-border bg-card p-5">
                  <p className="font-mono text-xs text-primary">{step.n}</p>
                  <h3 className="mt-3 text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-8 font-mono text-xs text-muted-foreground">
              First up — {DIFFICULTY_LABELS[first.difficulty]} · {TYPE_LABELS[first.type]} ·{" "}
              {first.title}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
