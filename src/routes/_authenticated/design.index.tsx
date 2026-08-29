import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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

function DesignBoard() {
  const fetchResults = useServerFn(listDesignResults);
  const { data: results } = useQuery<DesignStageRow[]>({
    queryKey: ["design-results"],
    queryFn: () => fetchResults(),
  });

  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

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
      num: "1",
      title: "Core Web Architecture",
      subtitle: "Fundamental stateless scaling, caching, and database read/write separation.",
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
    <div className="min-h-[calc(100vh-44px)] bg-[#0B0F19] text-[#F8FAFC] pb-16">
      {/* ── Page Header ── */}
      <div className="border-b border-[#1E293B] bg-[#0F172A] px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
              FILE // SYSTEM-DESIGN-TRACK
            </span>
            <span className="text-[#1E293B]">/</span>
            <span className="font-mono text-xs text-[#64748B]">DESIGN REVIEW SIMULATOR</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-[#F8FAFC]">
            System Design Interview Simulator
          </h1>
          <p className="mt-1 max-w-3xl font-sans text-sm leading-relaxed text-[#94A3B8]">
            Step into staff-level design reviews across four dedicated stages: clarify requirements,
            calculate capacity ledgers, sketch component topologies, and defend trade-offs.
          </p>

          {/* Search & Filter Toolbar */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-[#1E293B]">
            <Input
              type="text"
              placeholder="Search design cases by title or system tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md font-mono text-xs bg-[#0B0F19] border-[#1E293B] text-[#F8FAFC] placeholder:text-[#64748B]"
            />

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#64748B]">Difficulty:</span>
              {["all", "easy", "medium", "hard"].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`rounded-sm border px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                    difficultyFilter === diff
                      ? "border-[#38BDF8] bg-[#38BDF8]/10 text-[#38BDF8]"
                      : "border-[#1E293B] bg-[#0B0F19] text-[#64748B] hover:text-[#F8FAFC]"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Case Tiers & Blueprint Tiles Grid ── */}
      <div className="mx-auto max-w-6xl px-6 space-y-12 pt-8">
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
            matchingScenarios = matchingScenarios.filter((s) => s.difficulty === difficultyFilter);
          }

          if (matchingScenarios.length === 0) return null;

          // Calculate tier progress ledger
          const totalScenariosInTier = matchingScenarios.length;
          const clearedScenariosInTier = matchingScenarios.filter((scenario) => {
            const passed = passedByScenario.get(scenario.id) ?? new Set<string>();
            return scenario.stages.every((stage) => passed.has(stage.id));
          }).length;

          return (
            <div key={tierGroup.id} className="space-y-6">
              {/* 2.1 "Case Tiers" Ledger Header Strip */}
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

                {/* Compact Fraction + Ledger Bar */}
                <div className="text-left sm:text-right">
                  <span className="font-mono text-xs font-bold text-[#38BDF8] block">
                    {clearedScenariosInTier}/{totalScenariosInTier} CLEARED
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

              {/* 2.2 & 2.3 Strict 3-Column Grid with Blueprint Tiles */}
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {matchingScenarios.map((scenario) => {
                  const passed = passedByScenario.get(scenario.id) ?? new Set<string>();
                  const done = scenario.stages.filter((stage) => passed.has(stage.id)).length;
                  const isComplete = done === scenario.stages.length;

                  return (
                    <Link
                      key={scenario.id}
                      to="/design/$slug"
                      params={{ slug: scenario.id }}
                      className="group relative flex flex-col justify-between rounded-sm border border-[#1E293B] bg-[#0F172A] p-5 transition-all hover:border-[#38BDF8]/50 hover:bg-[#1E293B]/60 min-h-[220px] shadow-sm"
                    >
                      {/* Corner Brackets Crop Marks */}
                      <CornerBrackets className="opacity-40 group-hover:opacity-100 transition-opacity text-[#38BDF8]" />

                      <div className="space-y-3">
                        {/* Zone 1: Header Strip */}
                        <div className="flex items-center justify-between gap-2 border-b border-[#1E293B]/80 pb-3">
                          <StampedTag
                            label={scenario.difficulty.toUpperCase()}
                            tone={difficultyToneMap[scenario.difficulty] ?? "slate"}
                          />

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-[#64748B]">
                              {done}/{scenario.stages.length}
                            </span>
                            <DialGlyph
                              completedCount={done}
                              totalStages={scenario.stages.length}
                              size={22}
                            />
                          </div>
                        </div>

                        {/* Zone 2: Body with Title, Brief & Topology Icon */}
                        <div className="relative pt-1 pr-8">
                          <TopologyIcon className="absolute top-0 right-0" />
                          <h3 className="font-display text-lg font-bold text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors leading-tight">
                            {scenario.title}
                          </h3>
                          <p className="mt-2 font-sans text-xs leading-relaxed text-[#94A3B8] line-clamp-2">
                            {scenario.summary}
                          </p>
                        </div>
                      </div>

                      {/* Zone 3: Footer Strip */}
                      <div className="mt-5 pt-3 border-t border-[#1E293B] flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] bg-[#0B0F19] px-2.5 py-1 rounded-sm border border-[#1E293B]">
                          {scenario.system}
                        </span>

                        <span className="font-mono text-xs font-bold text-[#38BDF8] group-hover:translate-x-0.5 transition-transform">
                          {isComplete ? "REVIEW ✓" : "ENTER REVIEW →"}
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
    </div>
  );
}
