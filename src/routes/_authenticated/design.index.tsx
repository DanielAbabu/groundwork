import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { designScenarios } from "@/content/design";
import { listDesignResults, type DesignStageRow } from "@/lib/design.functions";
import {
  DialGlyph,
  CornerBrackets,
  TopologyIcon,
  StampedTag,
} from "@/components/design/PhaseGlyphs";
import { Input } from "@/components/ui/input";
import {
  Network,
  Zap,
  ArrowRight,
  CheckCircle2,
  Search,
  X,
  Shuffle,
  Sparkles,
  Activity,
  Layers,
  Cpu,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/design/")({
  head: () => ({
    meta: [
      { title: "System Design Review Simulator — RAW // SKILL" },
      {
        name: "description",
        content:
          "Walk a stakeholder review stage by stage: clarify requirements, calculate capacity, sketch canvas resiliency, and defend trade-offs.",
      },
      { property: "og:title", content: "System Design Review Simulator — RAW // SKILL" },
      {
        property: "og:description",
        content: "Clarify, size, sketch and defend — staff-level system design reviews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DesignBoard,
});

export function DesignBoard() {
  const navigate = useNavigate();
  const fetchResults = useServerFn(listDesignResults);
  const { data: results } = useQuery<DesignStageRow[]>({
    queryKey: ["design-results"],
    queryFn: () => fetchResults(),
  });

  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  const passedByScenario = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of results ?? []) {
      if (!row.passed) continue;
      const set = map.get(row.scenario_id) ?? new Set<string>();
      set.add(row.stage_id);
      map.set(row.scenario_id, set);
    }
    return map;
  }, [results]);

  // Overall telemetry stats
  const totalBlueprints = designScenarios.length;
  const totalStages = designScenarios.reduce((acc, s) => acc + s.stages.length, 0);

  let totalClearedStages = 0;
  let clearedBlueprintsCount = 0;

  for (const scenario of designScenarios) {
    const passedSet = passedByScenario.get(scenario.id) ?? new Set<string>();
    const passedCount = scenario.stages.filter((s) => passedSet.has(s.id)).length;
    totalClearedStages += passedCount;
    if (passedCount === scenario.stages.length) {
      clearedBlueprintsCount++;
    }
  }

  const overallPct = Math.round((totalClearedStages / totalStages) * 100);

  // Recommended next scenario: first incomplete blueprint
  const featuredScenario = useMemo(() => {
    return (
      designScenarios.find((s) => {
        const passedSet = passedByScenario.get(s.id) ?? new Set<string>();
        return s.stages.some((st) => !passedSet.has(st.id));
      }) ?? designScenarios[0]!
    );
  }, [passedByScenario]);

  const featuredPassed = passedByScenario.get(featuredScenario.id) ?? new Set<string>();
  const featuredClearedCount = featuredScenario.stages.filter((st) =>
    featuredPassed.has(st.id),
  ).length;

  const launchNextBlueprint = () => {
    navigate({ to: "/design/$slug", params: { slug: featuredScenario.id } });
  };

  const launchRandomBlueprint = () => {
    const pick =
      designScenarios[Math.floor(Math.random() * designScenarios.length)] ?? designScenarios[0]!;
    navigate({ to: "/design/$slug", params: { slug: pick.id } });
  };

  const tiers = [
    {
      id: "tier-1",
      num: "1",
      title: "Core Web Architecture",
      subtitle: "Stateless scaling, distributed caching, and database read/write separation.",
    },
    {
      id: "tier-2",
      num: "2",
      title: "High-Scale & Async Pipelines",
      subtitle: "Fan-out push queues, high-throughput workers, and timeline Redis caching.",
    },
    {
      id: "tier-3",
      num: "3",
      title: "Advanced Distributed Infrastructure",
      subtitle: "Sub-millisecond rate limiters, presigned S3 chunked uploads, and deduplication.",
    },
  ];

  const difficultyToneMap: Record<string, "slate" | "amber" | "rust"> = {
    easy: "slate",
    medium: "amber",
    hard: "rust",
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F19] text-[#F8FAFC] font-sans selection:bg-[#38BDF8] selection:text-[#0B0F19] pb-16">
      {/* =========================================================================
          TIER 1: IMMEDIATE UNDERSTANDING & TELEMETRY HEADER
          ========================================================================= */}
      <div className="border-b border-[#1E293B] bg-[#0F172A]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Header Title & Value Proposition */}
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
                <Network className="size-4 text-[#38BDF8]" />
                FILE // SYSTEM-DESIGN-TRACK · ARCHITECTURE SIMULATOR
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F8FAFC]">
                System Design Review Simulator
              </h1>
              <p className="font-sans text-sm text-[#94A3B8] leading-relaxed">
                Step into staff-level design reviews across four dedicated stages: clarify requirements, calculate capacity ledgers, sketch component topologies, and defend trade-offs against automated rubrics.
              </p>
            </div>

            {/* Top Action Triggers */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={launchNextBlueprint}
                className="inline-flex items-center gap-2 rounded-sm bg-[#38BDF8] px-4 py-2.5 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-md"
              >
                <Zap className="size-3.5" />
                Enter Next Blueprint →
              </button>
              <button
                onClick={launchRandomBlueprint}
                className="inline-flex items-center gap-2 rounded-sm border border-[#334155] bg-[#1E293B] px-4 py-2.5 font-mono text-xs font-semibold text-[#F8FAFC] hover:border-[#38BDF8] hover:text-[#38BDF8] transition-all"
              >
                <Shuffle className="size-3.5 text-[#38BDF8]" />
                Random Blueprint
              </button>
            </div>
          </div>

          {/* Telemetry Progress Band */}
          <div className="mt-8 pt-5 border-t border-[#1E293B] grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            <div className="sm:col-span-8 space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <Activity className="size-3.5 text-[#38BDF8]" />
                  Total Architecture Clearance
                </span>
                <span className="font-bold text-[#38BDF8]">{overallPct}% Stage Clearance</span>
              </div>
              <div className="h-2 w-full rounded-none bg-[#0B0F19] overflow-hidden border border-[#1E293B]">
                <div
                  className="h-full bg-gradient-to-r from-[#38BDF8] to-[#10B981] transition-all duration-500"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>

            <div className="sm:col-span-4 flex items-center justify-between sm:justify-end gap-6 font-mono text-xs border-t sm:border-t-0 border-[#1E293B] pt-3 sm:pt-0">
              <div>
                <div className="text-[10px] text-[#64748B] uppercase">Cleared Blueprints</div>
                <div className="font-bold text-[#10B981] text-base">
                  {clearedBlueprintsCount}/{totalBlueprints}
                </div>
              </div>
              <div className="border-r border-[#1E293B] h-6" />
              <div>
                <div className="text-[10px] text-[#64748B] uppercase">Stages Completed</div>
                <div className="font-bold text-[#38BDF8] text-base">
                  {totalClearedStages}/{totalStages}
                </div>
              </div>
              <div className="border-r border-[#1E293B] h-6" />
              <div>
                <div className="text-[10px] text-[#64748B] uppercase">SPOF Check</div>
                <div className="font-bold text-[#6366F1] text-base">Automated</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* =========================================================================
            TIER 2: FEATURED SYSTEM BLUEPRINT SPOTLIGHT
            ========================================================================= */}
        <section className="rounded-sm border border-[#38BDF8]/40 bg-gradient-to-r from-[#0F172A] via-[#0B0F19] to-[#0F172A] p-6 lg:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#38BDF8]/5 rounded-bl-full pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info Column */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-[#38BDF8] bg-[#38BDF8]/10 px-2.5 py-1 rounded-sm border border-[#38BDF8]/30 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  Recommended System Review
                </span>
                <span className="font-mono text-xs text-[#64748B]">
                  SYSTEM // {featuredScenario.system.toUpperCase()}
                </span>
                <StampedTag
                  label={featuredScenario.difficulty.toUpperCase()}
                  tone={difficultyToneMap[featuredScenario.difficulty] ?? "slate"}
                />
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
                {featuredScenario.title}
              </h2>

              <p className="font-sans text-sm text-[#94A3B8] leading-relaxed max-w-3xl">
                {featuredScenario.summary}
              </p>

              {/* Stage Dial Indicators */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2 font-mono text-xs text-[#64748B]">
                  <span>Stages Cleared:</span>
                  <strong className="text-[#38BDF8]">
                    {featuredClearedCount} / {featuredScenario.stages.length}
                  </strong>
                </div>
                <DialGlyph
                  completedCount={featuredClearedCount}
                  totalStages={featuredScenario.stages.length}
                  size={26}
                />
              </div>
            </div>

            {/* Right Action Column */}
            <div className="lg:col-span-4 rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-3">
                <div className="font-mono text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  4-Stage Evaluation Pipeline
                </div>
                <div className="space-y-2 font-mono text-xs">
                  {featuredScenario.stages.map((st, idx) => {
                    const isPassed = featuredPassed.has(st.id);
                    return (
                      <div
                        key={st.id}
                        className="flex items-center justify-between text-[#94A3B8] border-b border-[#1E293B]/60 pb-1.5"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-[#38BDF8] font-bold">0{idx + 1}.</span>
                          {st.title}
                        </span>
                        {isPassed ? (
                          <span className="text-[#10B981] font-bold">PASSED ✓</span>
                        ) : (
                          <span className="text-[#64748B]">OPEN</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Link
                to="/design/$slug"
                params={{ slug: featuredScenario.id }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-sm bg-[#38BDF8] px-5 py-3 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-md"
              >
                Launch Design Review <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TIER 3: 4-STAGE PROGRESSIVE WORKFLOW GUIDE
            ========================================================================= */}
        <section className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-8 space-y-6">
          <div className="border-b border-[#1E293B] pb-4">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#38BDF8]">
              Review Methodology
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
              How Staff System Design Reviews Are Graded
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 border-t-2 border-t-[#38BDF8] space-y-2">
              <span className="font-mono text-xs font-bold text-[#38BDF8]">01. CLARIFY</span>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">Requirements</h3>
              <p className="font-sans text-xs text-[#94A3B8] leading-relaxed">
                Pin down SLA targets, read/write QPS ratios, and latency budgets before sketching.
              </p>
            </div>

            <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 border-t-2 border-t-[#38BDF8] space-y-2">
              <span className="font-mono text-xs font-bold text-[#38BDF8]">02. SIZING</span>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">Capacity Math</h3>
              <p className="font-sans text-xs text-[#94A3B8] leading-relaxed">
                Calculate required RAM cache sizes, storage bandwidth, and CPU node counts.
              </p>
            </div>

            <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 border-t-2 border-t-[#38BDF8] space-y-2">
              <span className="font-mono text-xs font-bold text-[#38BDF8]">03. TOPOLOGY</span>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">Typed Canvas</h3>
              <p className="font-sans text-xs text-[#94A3B8] leading-relaxed">
                Sketch component connections on a typed graph canvas evaluated for SPOF resiliency.
              </p>
            </div>

            <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 border-t-2 border-t-[#38BDF8] space-y-2">
              <span className="font-mono text-xs font-bold text-[#38BDF8]">04. DEFENSE</span>
              <h3 className="font-display text-base font-bold text-[#F8FAFC]">Rubric Scoring</h3>
              <p className="font-sans text-xs text-[#94A3B8] leading-relaxed">
                Defend architectural trade-offs in prose against an automated hiring rubric.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TIER 4: ARCHITECTURAL TIER BLUEPRINT CATALOG
            ========================================================================= */}
        <section className="space-y-8">
          {/* Toolbar: Search + Difficulty Filters */}
          <div className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex min-w-[280px] flex-1 items-center gap-2.5 rounded-sm border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2">
              <Search className="size-4 text-[#64748B] shrink-0" />
              <input
                type="text"
                placeholder="Search system blueprints by title, system tag, or summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-[#64748B] hover:text-[#F8FAFC]">
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#64748B] uppercase font-bold">Difficulty:</span>
              {["all", "easy", "medium", "hard"].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`rounded-sm border px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                    difficultyFilter === diff
                      ? "border-[#38BDF8] bg-[#38BDF8] text-[#0B0F19]"
                      : "border-[#1E293B] bg-[#0B0F19] text-[#64748B] hover:text-[#F8FAFC]"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Tier Groups */}
          <div className="space-y-12">
            {tiers.map((tierGroup) => {
              let matchingScenarios = designScenarios.filter(
                (s) => (s.tier ?? "tier-1") === tierGroup.id,
              );

              if (search.trim()) {
                const query = search.toLowerCase();
                matchingScenarios = matchingScenarios.filter(
                  (s) =>
                    s.title.toLowerCase().includes(query) ||
                    s.system.toLowerCase().includes(query) ||
                    s.summary.toLowerCase().includes(query),
                );
              }

              if (difficultyFilter !== "all") {
                matchingScenarios = matchingScenarios.filter(
                  (s) => s.difficulty === difficultyFilter,
                );
              }

              if (matchingScenarios.length === 0) return null;

              const totalScenariosInTier = matchingScenarios.length;
              const clearedScenariosInTier = matchingScenarios.filter((scenario) => {
                const passed = passedByScenario.get(scenario.id) ?? new Set<string>();
                return scenario.stages.every((stage) => passed.has(stage.id));
              }).length;

              return (
                <div key={tierGroup.id} className="space-y-6">
                  {/* Header Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-sm border border-[#38BDF8]/40 bg-[#38BDF8]/10 font-display text-xl font-bold text-[#38BDF8] flex items-center justify-center select-none">
                        {tierGroup.num}
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-[#F8FAFC]">
                          Tier {tierGroup.num} — {tierGroup.title}
                        </h2>
                        <p className="font-mono text-xs text-[#64748B] mt-0.5">{tierGroup.subtitle}</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="font-mono text-xs font-bold text-[#38BDF8] block">
                        {clearedScenariosInTier}/{totalScenariosInTier} BLUEPRINTS CLEARED
                      </span>
                      <div className="flex items-center gap-1 mt-1.5 justify-start sm:justify-end">
                        {matchingScenarios.map((scenario) => {
                          const passed = passedByScenario.get(scenario.id) ?? new Set<string>();
                          const isComplete = scenario.stages.every((s) => passed.has(s.id));
                          return (
                            <span
                              key={scenario.id}
                              title={scenario.title}
                              className={`h-1.5 w-6 rounded-none transition-colors ${
                                isComplete ? "bg-[#38BDF8]" : "bg-[#0B0F19] border border-[#1E293B]"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 3-Column Blueprint Cards Grid */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {matchingScenarios.map((scenario) => {
                      const passed = passedByScenario.get(scenario.id) ?? new Set<string>();
                      const done = scenario.stages.filter((stage) => passed.has(stage.id)).length;
                      const isComplete = done === scenario.stages.length;

                      return (
                        <Link
                          key={scenario.id}
                          to="/design/$slug"
                          params={{ slug: scenario.id }}
                          className="group relative flex flex-col justify-between rounded-sm border border-[#1E293B] bg-[#0F172A] p-7 transition-all hover:border-[#38BDF8]/50 hover:bg-[#1E293B]/60 min-h-[250px] shadow-sm"
                        >
                          <CornerBrackets className="opacity-40 group-hover:opacity-100 transition-opacity text-[#38BDF8]" />

                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3 border-b border-[#1E293B]/80 pb-4">
                              <StampedTag
                                label={scenario.difficulty.toUpperCase()}
                                tone={difficultyToneMap[scenario.difficulty] ?? "slate"}
                              />

                              <div className="flex items-center gap-2">
                                <span className="font-display text-xs font-semibold text-[#64748B]">
                                  {done}/{scenario.stages.length}
                                </span>
                                <DialGlyph
                                  completedCount={done}
                                  totalStages={scenario.stages.length}
                                  size={24}
                                />
                              </div>
                            </div>

                            <div className="relative pt-1 pr-8">
                              <TopologyIcon className="absolute top-0 right-0" />
                              <h3 className="font-display text-xl font-bold text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors leading-snug">
                                {scenario.title}
                              </h3>
                              <p className="mt-2.5 font-display text-sm leading-relaxed text-[#CBD5E1] line-clamp-2">
                                {scenario.summary}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between">
                            <span className="font-display text-xs uppercase tracking-wider text-[#64748B] bg-[#0B0F19] px-3 py-1 rounded-sm border border-[#1E293B]">
                              {scenario.system}
                            </span>

                            <span className="font-display text-xs font-bold text-[#38BDF8] group-hover:translate-x-1 transition-transform flex items-center gap-1.5">
                              {isComplete ? (
                                <span className="text-[#10B981]">REVIEW ✓</span>
                              ) : (
                                <>ENTER REVIEW →</>
                              )}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
