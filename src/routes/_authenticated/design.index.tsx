import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { designScenarios } from "@/content/design";
import { STAGE_KIND_LABELS } from "@/lib/design/types";
import { listDesignResults, type DesignStageRow } from "@/lib/design.functions";
import { DIFFICULTY_CLASSES, DIFFICULTY_LABELS } from "@/lib/scenarios/types";
import { TrackTabs } from "@/components/TrackTabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/design/")({
  head: () => ({
    meta: [
      { title: "Design Review board — system design scenarios, graded" },
      {
        name: "description",
        content:
          "Walk a stakeholder review stage by stage: clarify the ask, size the system, sketch the components, defend one trade-off.",
      },
      { property: "og:title", content: "Design Review board — system design scenarios, graded" },
      {
        property: "og:description",
        content: "Clarify, size, sketch and defend — system design reviews with real grading.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DesignBoard,
});

function DesignBoard() {
  const fetchResults = useServerFn(listDesignResults);
  const { data: results } = useQuery<DesignStageRow[]>({
    queryKey: ["design-results"],
    queryFn: () => fetchResults(),
  });

  const passedByScenario = new Map<string, Set<string>>();
  for (const row of results ?? []) {
    if (!row.passed) continue;
    const set = passedByScenario.get(row.scenario_id) ?? new Set<string>();
    set.add(row.stage_id);
    passedByScenario.set(row.scenario_id, set);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <Link to="/dashboard" className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              incident
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-foreground">Design Review</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Four graded stages per review: pin the requirements that change the design, size the
              load with real arithmetic, sketch the path on a typed canvas, then defend one
              trade-off out loud.
            </p>

          </div>
          <div className="flex items-center gap-2">
            <TrackTabs active="design" />
            <Button asChild variant="outline" className="font-mono">
              <Link to="/profile">Profile</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-10 md:grid-cols-2">
        {designScenarios.map((scenario) => {
          const passed = passedByScenario.get(scenario.id) ?? new Set<string>();
          const done = scenario.stages.filter((stage) => passed.has(stage.id)).length;
          return (
            <Link
              key={scenario.id}
              to="/design/$slug"
              params={{ slug: scenario.id }}
              className="flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${DIFFICULTY_CLASSES[scenario.difficulty]}`}
                >
                  {DIFFICULTY_LABELS[scenario.difficulty]}
                </span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    done === scenario.stages.length
                      ? "text-pass"
                      : done > 0
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {done}/{scenario.stages.length} stages
                </span>
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">{scenario.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{scenario.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="rounded bg-secondary px-2 py-0.5">{scenario.system}</span>
                {scenario.stages.map((stage) => (
                  <span
                    key={stage.id}
                    className={`rounded px-2 py-0.5 ${passed.has(stage.id) ? "bg-pass/15 text-pass" : "bg-secondary"}`}
                  >
                    {STAGE_KIND_LABELS[stage.kind]}
                  </span>
                ))}
              </div>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                Presenting to {scenario.stakeholder}, {scenario.stakeholderRole}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
