import { createFileRoute, Link } from "@tanstack/react-router";
import { scenarios } from "@/content/scenarios";
import { DIFFICULTY_LABELS, TYPE_LABELS } from "@/lib/scenarios/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Incident — debug real broken code, not toy puzzles" },
      {
        name: "description",
        content:
          "Get paged into a small broken codebase, read the signal, fix the root cause, and run the hidden test harness. 16 single-cause incidents.",
      },
      { property: "og:title", content: "Incident — debug real broken code, not toy puzzles" },
      {
        property: "og:description",
        content:
          "Get paged into a small broken codebase, read the signal, fix the root cause, and run the hidden test harness.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    n: "01",
    title: "You get paged",
    body: "A one-line symptom, a difficulty, and the failing signal — a stack trace or test output, exactly as it landed.",
  },
  {
    n: "02",
    title: "You read the code",
    body: "Two to four real files in an editor. One cause, no red herrings, no rewrite required.",
  },
  {
    n: "03",
    title: "You run the harness",
    body: "Hidden tests grade behavior only. Green means resolved, and the postmortem tells you what actually broke.",
  },
];

function Index() {
  const first = scenarios[0]!;

  return (
    <main className="min-h-screen bg-background">
      <section className="grid-noise border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-primary">
            <span className="pager-pulse inline-block size-2 rounded-full bg-primary" />
            on-call training
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Practice debugging the way it actually happens: a page, a signal, and someone else&apos;s
            code.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            {scenarios.length} single-cause incidents across missing logic, broken queries, async
            mistakes and off-by-one errors. You fix the root cause; a hidden test harness decides
            whether the incident is resolved.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/incidents/$slug"
              params={{ slug: first.id }}
              className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 font-mono text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start first incident
            </Link>
            <Link
              to="/incidents"
              className="inline-flex items-center rounded-md border border-border bg-card px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Open incident board
            </Link>
          </div>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            First up — {DIFFICULTY_LABELS[first.difficulty]} · {TYPE_LABELS[first.type]} · {first.title}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          how it works
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className="rounded-lg border border-border bg-card p-5">
              <p className="font-mono text-xs text-primary">{step.n}</p>
              <h3 className="mt-3 text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
