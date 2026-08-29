import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { designScenarios } from "@/content/design";
import { listDesignResults, type DesignStageRow } from "@/lib/design.functions";
import { DifficultyPill } from "@/components/DifficultyPill";

export const Route = createFileRoute("/_authenticated/design/")({
  head: () => ({
    meta: [
      { title: "System Design Review Simulator — RawSkill" },
      {
        name: "description",
        content:
          "Walk a stakeholder review stage by stage: clarify the ask, size the system, sketch the components, defend one trade-off.",
      },
      { property: "og:title", content: "System Design Review Simulator — RawSkill" },
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
      borderAccent: "border-l-[#C8912B]",
    },
    {
      id: "tier-2",
      title: "Tier 2 — High-Scale & Async Pipelines",
      subtitle: "Fan-out push queues, high-throughput workers, and timeline Redis caching.",
      borderAccent: "border-l-[#D99B26]",
    },
    {
      id: "tier-3",
      title: "Tier 3 — Advanced Distributed Infrastructure",
      subtitle: "Sub-millisecond rate limiters, presigned S3 chunked uploads, and deduplication.",
      borderAccent: "border-l-[#C4593F]",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-44px)] bg-[#161412] text-[#F2ECE1] pb-16">
      {/* Header */}
      <div className="border-b border-[#3A342C] bg-[#1D1A17] px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C8912B]">
              FILE // SYSTEM-DESIGN-TRACK
            </span>
            <span className="text-[#3A342C]">/</span>
            <span className="font-mono text-xs text-[#7C7364]">DESIGN REVIEW SIMULATOR</span>
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#F2ECE1]">
            System Design Interview Simulator
          </h1>
          <p className="mt-1 max-w-3xl font-sans text-sm leading-relaxed text-[#B8AE9C]">
            Step into staff-level design reviews: clarify requirements with interactive
            stakeholders, calculate capacity, sketch canvas resiliency, and defend architectural
            trade-offs.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 space-y-10 pt-8">
        {tiers.map((tierGroup) => {
          const matchingScenarios = designScenarios.filter(
            (s) => (s.tier ?? "tier-1") === tierGroup.id,
          );
          if (matchingScenarios.length === 0) return null;

          return (
            <div key={tierGroup.id} className="space-y-4">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#F2ECE1]">
                  {tierGroup.title}
                </h2>
                <p className="font-mono text-xs text-[#7C7364] mt-0.5">{tierGroup.subtitle}</p>
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
                      className={`group flex flex-col justify-between rounded border border-[#3A342C] border-l-4 ${tierGroup.borderAccent} bg-[#1D1A17] p-5 transition-all hover:border-[#C8912B] hover:bg-[#26221D]/60`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <DifficultyPill difficulty={scenario.difficulty} />
                          <span
                            className={`font-mono text-xs font-semibold uppercase tracking-wider ${
                              isComplete
                                ? "text-[#7FB88A]"
                                : done > 0
                                  ? "text-[#C8912B]"
                                  : "text-[#7C7364]"
                            }`}
                          >
                            {isComplete ? "CLEARED ✓" : `${done}/${scenario.stages.length} STAGES`}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-serif text-lg font-semibold text-[#F2ECE1] group-hover:text-[#C8912B] transition-colors">
                            {scenario.title}
                          </h3>
                          <p className="mt-1.5 font-sans text-xs leading-relaxed text-[#B8AE9C] line-clamp-2">
                            {scenario.summary}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#3A342C] flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#7C7364] bg-[#161412] px-2 py-0.5 rounded border border-[#3A342C]">
                          {scenario.system}
                        </span>

                        {/* Stage dots */}
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          {scenario.stages.map((stage, idx) => (
                            <span
                              key={stage.id}
                              title={stage.title}
                              className={`size-2 rounded-full ${
                                passed.has(stage.id)
                                  ? "bg-[#7FB88A]"
                                  : idx === done
                                    ? "bg-[#C8912B]"
                                    : "bg-[#26221D] border border-[#4E4638]"
                              }`}
                            />
                          ))}
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
