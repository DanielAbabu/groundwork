import { createFileRoute, Link } from "@tanstack/react-router";
import { scenarios } from "@/content/scenarios";
import { designScenarios } from "@/content/design";
import { DIFFICULTY_LABELS, TYPE_LABELS } from "@/lib/scenarios/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RawSkill — Real-World Engineering & Distributed System Design" },
      {
        name: "description",
        content:
          "Master tactical engineering under pressure. Debug real production codebases against a WebWorker test runner, and defend distributed system architectures stage by stage.",
      },
      {
        property: "og:title",
        content: "RawSkill — Real-World Engineering & Distributed System Design",
      },
      {
        property: "og:description",
        content:
          "Fix real broken code against a hidden Pyodide test harness, then defend a design: clarify, size, sketch, trade off.",
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
    title: "Get paged into broken code. Locate the root cause.",
    body: "You land in someone else's codebase with a one-line symptom and the exact failing output — a stack trace or a red test. Two to four real files, one root cause, no red herrings. A hidden harness grades behaviour, not style, and the postmortem tells you what actually broke.",
    bullets: [
      "16 single-cause scenarios: missing logic, bad queries, async mistakes, off-by-one",
      "Monaco editor with real files, signal panel beside it",
      "Hidden Pyodide WebWorker tests decide pass/fail; attempts tracked per scenario",
    ],
    to: "/incidents" as const,
    cta: "Launch Debugging Board",
  },
  {
    tag: "system design simulator",
    title: "Present the architecture. Survive the pushback.",
    body: "A virtual stakeholder wants a high-throughput system built under strict constraints. You work through four graded stages: pin down requirements, size load with real arithmetic, sketch the read/write path on a typed canvas, then defend one trade-off in prose.",
    bullets: [
      "Clarify → Capacity → Components → Trade-offs, each graded on its own rubric",
      "Diagrams are typed component graphs, so every node and edge is checked for SPOFs",
      "Per-rule feedback calculates your exact Hiring Signal score",
    ],
    to: "/design" as const,
    cta: "Launch Design Board",
  },
];

const STEPS = [
  {
    n: "01",
    title: "You get paged",
    body: "A real symptom, severity tier, and failing signal exactly as it landed on call.",
  },
  {
    n: "02",
    title: "You work the problem",
    body: "Real files in Monaco IDE, or interactive node graph canvas with latency heatmaps.",
  },
  {
    n: "03",
    title: "You get graded honestly",
    body: "Hidden test harness for code, topology verification for designs, and a senior debrief.",
  },
];

function Index() {
  const first = scenarios[0]!;
  const firstDesign = designScenarios[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Sticky Landing Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-[#14141f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="font-mono text-lg font-bold text-primary select-none drop-shadow-[0_0_10px_rgba(0,240,255,0.6)]">
                ⚡
              </span>
              <span className="font-mono text-sm font-bold uppercase tracking-[0.25em] text-foreground group-hover:text-primary transition-colors">
                RAW // SKILL
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/incidents"
              className="hidden sm:inline-block font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              Debugging
            </Link>
            <Link
              to="/design"
              className="hidden sm:inline-block font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              System Design
            </Link>
            <Link
              to="/dashboard"
              className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              Enter Workspace →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="grid-noise border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-primary">
              <span className="pager-pulse inline-block size-2 rounded-full bg-primary shadow-[0_0_8px_#00f0ff]" />
              tactical engineering workspace
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Prove your engineering mastery under real-world pressure.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {scenarios.length} single-cause scenarios graded by a hidden Pyodide test harness, and{" "}
              {designScenarios.length} stakeholder design review
              {designScenarios.length === 1 ? "" : "s"} graded stage by stage — clarify, size,
              sketch, trade off. Zero multiple-choice quizzes.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/incidents/$slug"
                params={{ slug: first.id }}
                className="inline-flex items-center rounded-md bg-primary px-6 py-3 font-mono text-sm font-bold text-primary-foreground transition-all hover:bg-[#33f3ff] shadow-[0_0_20px_rgba(0,240,255,0.3)]"
              >
                Start First Scenario →
              </Link>
              <Link
                to="/design/$slug"
                params={{ slug: firstDesign.id }}
                className="inline-flex items-center rounded-md border border-border bg-card px-6 py-3 font-mono text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:bg-secondary"
              >
                Start Design Review
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-md px-3 py-3 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                View Dashboard →
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
                  <dd className="mt-1 font-mono text-xl font-bold text-foreground">{stat.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
            two tracks, one workspace
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {TRACKS.map((track) => (
              <article
                key={track.tag}
                className="flex flex-col rounded-xl border border-border bg-card p-7 transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.08)]"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                  {track.tag}
                </p>
                <h3 className="mt-3 text-xl font-bold leading-snug text-foreground">
                  {track.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{track.body}</p>
                <ul className="mt-5 space-y-2.5">
                  {track.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground"
                    >
                      <span className="text-primary font-bold">▸</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
                <Link
                  to={track.to}
                  className="mt-7 inline-flex w-fit items-center rounded-md border border-border bg-secondary/50 px-4 py-2 font-mono text-xs uppercase tracking-widest text-foreground transition-all hover:border-primary/50 hover:bg-secondary hover:text-primary"
                >
                  {track.cta} →
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
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <article key={step.n} className="rounded-xl border border-border bg-card p-6">
                  <p className="font-mono text-xs font-bold text-primary">{step.n}</p>
                  <h3 className="mt-3 text-base font-bold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-8 font-mono text-xs text-muted-foreground">
              First up in rotation — {DIFFICULTY_LABELS[first.difficulty]} · {TYPE_LABELS[first.type]} ·{" "}
              <span className="text-foreground font-semibold">{first.title}</span>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
