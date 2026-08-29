import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { designScenarios } from "@/content/design";
import { STAGE_KIND_LABELS } from "@/lib/design/types";
import { listDesignResults, type DesignStageRow } from "@/lib/design.functions";
import { DIFFICULTY_CLASSES, DIFFICULTY_LABELS } from "@/lib/scenarios/types";

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

  const tiers = [
    {
      id: "tier-1",
      title: "Tier 1 — Core Web Architecture",
      subtitle: "Fundamental stateless scaling, caching, and database read/write separation.",
    },
    {
      id: "tier-2",
      title: "Tier 2 — High-Scale & Async Pipelines",
      subtitle: "Fan-out push queues, high-throughput workers, and timeline Redis caching.",
    },
    {
      id: "tier-3",
      title: "Tier 3 — Advanced Distributed Infrastructure",
      subtitle: "Sub-millisecond rate limiters, presigned S3 chunked uploads, and deduplication.",
    },
  ];

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-4">
        <div className="border-b border-border pb-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              Interactive Design Room
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mt-2">
            System Design Interview Simulator
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Step into 30-minute staff-level design interviews. Scrutinize requirements with interactive stakeholders, calculate capacity with real arithmetic, sketch resiliency on a typed canvas with single-point-of-failure detection, and defend trade-offs.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 space-y-10 pt-6">
        {tiers.map((tierGroup) => {
          const matchingScenarios = designScenarios.filter(
            (s) => (s.tier ?? "tier-1") === tierGroup.id,
          );
          if (matchingScenarios.length === 0) return null;

          return (
            <div key={tierGroup.id} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{tierGroup.title}</h2>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">
                  {tierGroup.subtitle}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {matchingScenarios.map((scenario) => {
                  const passed = passedByScenario.get(scenario.id) ?? new Set<string>();
                  const done = scenario.stages.filter((stage) => passed.has(stage.id)).length;
                  const isComplete = done === scenario.stages.length;

                  return (
                    <Link
                      key={scenario.id}
                      to="/design/$slug"
                      params={{ slug: scenario.id }}
                      className="group flex flex-col justify-between rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-accent/30 shadow-sm hover:shadow"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase font-bold tracking-widest ${DIFFICULTY_CLASSES[scenario.difficulty]}`}
                          >
                            {DIFFICULTY_LABELS[scenario.difficulty]}
                          </span>
                          <span
                            className={`font-mono text-[11px] font-bold uppercase tracking-widest ${
                              isComplete
                                ? "text-pass"
                                : done > 0
                                  ? "text-primary"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {isComplete ? "Cleared ✓" : `${done}/${scenario.stages.length} stages`}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {scenario.title}
                          </h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                            {scenario.summary}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-border/60 space-y-3">
                        <div className="flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          <span className="rounded bg-secondary px-2 py-0.5 font-semibold text-foreground">
                            {scenario.system}
                          </span>
                          {scenario.stages.map((stage) => (
                            <span
                              key={stage.id}
                              className={`rounded px-2 py-0.5 ${
                                passed.has(stage.id)
                                  ? "bg-pass/15 text-pass font-bold"
                                  : "bg-secondary/60 text-muted-foreground"
                              }`}
                            >
                              {STAGE_KIND_LABELS[stage.kind]}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span>
                            Stakeholder: <strong className="text-foreground">{scenario.stakeholder}</strong> ({scenario.stakeholderRole})
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
