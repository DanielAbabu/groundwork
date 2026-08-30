import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { scenarios } from "@/content/scenarios";
import {
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  type ScenarioType,
  type Difficulty,
} from "@/lib/scenarios/types";
import { listProgress, type ProgressRow } from "@/lib/progress.functions";
import { DifficultyPill } from "@/components/DifficultyPill";
import {
  Terminal,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Shuffle,
  ShieldCheck,
  FileCode,
  SlidersHorizontal,
  Clock,
  Sparkles,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/incidents/")({
  head: () => ({
    meta: [
      { title: "Debugging Rotation — RawSkill" },
      {
        name: "description",
        content:
          "Every scenario in the rotation with difficulty, type, your attempts, and whether you resolved it.",
      },
      { property: "og:title", content: "Debugging Rotation — RawSkill" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Board,
});

type SortKey = "index" | "title" | "type" | "difficulty" | "status";
type SortDir = "asc" | "desc";

const DIFFICULTY_ORDER: Record<Difficulty, number> = { starter: 0, routine: 1, tricky: 2 };
const STATUS_ORDER: Record<string, number> = { resolved: 0, attempted: 1, unattempted: 2 };

const SEV_BADGE: Record<string, string> = {
  "SEV-1": "bg-[#EF4444] text-[#FFFFFF]",
  "SEV-2": "bg-[#F59E0B] text-[#0B0F19]",
  "SEV-3": "bg-[#10B981] text-[#0B0F19]",
};

export function Board() {
  const navigate = useNavigate();
  const fetchProgress = useServerFn(listProgress);
  const { data: progress } = useQuery<ProgressRow[]>({
    queryKey: ["progress"],
    queryFn: () => fetchProgress(),
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ScenarioType | "ALL">("ALL");
  const [diffFilter, setDiffFilter] = useState<Difficulty | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "resolved" | "attempted" | "unattempted"
  >("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("index");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const byId = new Map((progress ?? []).map((r) => [r.scenario_id, r]));
  const resolved = (progress ?? []).filter((r) => r.status === "passed").length;

  const pct = Math.round((resolved / scenarios.length) * 100);

  const getStatus = (id: string) => {
    const row = byId.get(id);
    if (!row) return "unattempted";
    return row.status === "passed" ? "resolved" : "attempted";
  };

  const randomUnsolved = () => {
    const unsolved = scenarios.filter((s) => getStatus(s.id) !== "resolved");
    const pick = unsolved[Math.floor(Math.random() * unsolved.length)] ?? scenarios[0]!;
    navigate({ to: "/incidents/$slug", params: { slug: pick.id } });
  };

  const launchNextUnsolved = () => {
    const next = scenarios.find((s) => getStatus(s.id) !== "resolved") ?? scenarios[0]!;
    navigate({ to: "/incidents/$slug", params: { slug: next.id } });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scenarios
      .map((s, i) => ({ ...s, _index: i + 1, _status: getStatus(s.id) }))
      .filter((s) => {
        if (typeFilter !== "ALL" && s.type !== typeFilter) return false;
        if (diffFilter !== "ALL" && s.difficulty !== diffFilter) return false;
        if (statusFilter !== "ALL" && s._status !== statusFilter) return false;
        if (q) {
          return (
            s.title.toLowerCase().includes(q) ||
            s.symptom.toLowerCase().includes(q) ||
            s.service.toLowerCase().includes(q) ||
            (s.concepts ?? []).some((c) => c.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "index") cmp = a._index - b._index;
        if (sortKey === "title") cmp = a.title.localeCompare(b.title);
        if (sortKey === "type") cmp = a.type.localeCompare(b.type);
        if (sortKey === "difficulty")
          cmp = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        if (sortKey === "status")
          cmp = (STATUS_ORDER[a._status] ?? 2) - (STATUS_ORDER[b._status] ?? 2);
        return sortDir === "asc" ? cmp : -cmp;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, diffFilter, statusFilter, sortKey, sortDir, progress]);

  // Featured scenario: First unsolved or default first
  const featuredScenario = useMemo(() => {
    return scenarios.find((s) => getStatus(s.id) !== "resolved") ?? scenarios[0]!;
  }, [progress]);

  const featuredStatus = getStatus(featuredScenario.id);

  const CATEGORY_LIST: { type: ScenarioType; label: string }[] = [
    { type: "A", label: TYPE_LABELS["A"] },
    { type: "B", label: TYPE_LABELS["B"] },
    { type: "C", label: TYPE_LABELS["C"] },
    { type: "D", label: TYPE_LABELS["D"] },
    { type: "E", label: TYPE_LABELS["E"] },
    { type: "F", label: TYPE_LABELS["F"] },
    { type: "G", label: TYPE_LABELS["G"] },
    { type: "H", label: TYPE_LABELS["H"] },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F19] text-[#F8FAFC] font-sans selection:bg-[#38BDF8] selection:text-[#0B0F19] pb-16">
      {/* =========================================================================
          TIER 1: IMMEDIATE UNDERSTANDING & TELEMETRY HEADER
          ========================================================================= */}
      <div className="border-b border-[#1E293B] bg-[#0F172A]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Header Title & Value Prop */}
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
                <Terminal className="size-4 text-[#38BDF8]" />
                FILE // DOCKET-INDEX · TACTICAL DEBUGGING ROTATION
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F8FAFC]">
                Incident Debugging Docket
              </h1>
              <p className="font-sans text-sm text-[#94A3B8] leading-relaxed">
                Step directly into real broken codebases with single-cause bugs. No red herrings, no multiple-choice noise — evaluated live by in-browser Pyodide test harnesses.
              </p>
            </div>

            {/* Top Command Action Triggers */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={launchNextUnsolved}
                className="inline-flex items-center gap-2 rounded-sm bg-[#38BDF8] px-4 py-2.5 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-md"
              >
                <Zap className="size-3.5" />
                Launch Next Unsolved →
              </button>
              <button
                onClick={randomUnsolved}
                className="inline-flex items-center gap-2 rounded-sm border border-[#334155] bg-[#1E293B] px-4 py-2.5 font-mono text-xs font-semibold text-[#F8FAFC] hover:border-[#38BDF8] hover:text-[#38BDF8] transition-all"
              >
                <Shuffle className="size-3.5 text-[#38BDF8]" />
                Pick Random Case
              </button>
            </div>
          </div>

          {/* Telemetry Progress Band */}
          <div className="mt-8 pt-5 border-t border-[#1E293B] grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            <div className="sm:col-span-8 space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#64748B] uppercase tracking-wider flex items-center gap-2">
                  <Activity className="size-3.5 text-[#38BDF8]" />
                  Rotation Clearance Progress
                </span>
                <span className="font-bold text-[#38BDF8]">{pct}% Clearance</span>
              </div>
              <div className="h-2 w-full rounded-none bg-[#0B0F19] overflow-hidden border border-[#1E293B]">
                <div
                  className="h-full bg-gradient-to-r from-[#38BDF8] to-[#10B981] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="sm:col-span-4 flex items-center justify-between sm:justify-end gap-6 font-mono text-xs border-t sm:border-t-0 border-[#1E293B] pt-3 sm:pt-0">
              <div>
                <div className="text-[10px] text-[#64748B] uppercase">Resolved</div>
                <div className="font-bold text-[#10B981] text-base">{resolved}</div>
              </div>
              <div className="border-r border-[#1E293B] h-6" />
              <div>
                <div className="text-[10px] text-[#64748B] uppercase">Open Docket</div>
                <div className="font-bold text-[#F8FAFC] text-base">
                  {scenarios.length - resolved}
                </div>
              </div>
              <div className="border-r border-[#1E293B] h-6" />
              <div>
                <div className="text-[10px] text-[#64748B] uppercase">Total Incidents</div>
                <div className="font-bold text-[#38BDF8] text-base">{scenarios.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">
        {/* =========================================================================
            TIER 2: FEATURED INCIDENT SPOTLIGHT CARD
            ========================================================================= */}
        <section className="rounded-sm border border-[#38BDF8]/40 bg-gradient-to-r from-[#0F172A] via-[#0B0F19] to-[#0F172A] p-6 lg:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#38BDF8]/5 rounded-bl-full pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info Column */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-[#38BDF8] bg-[#38BDF8]/10 px-2.5 py-1 rounded-sm border border-[#38BDF8]/30 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  Recommended Next Incident
                </span>
                <span className="font-mono text-xs text-[#64748B]">
                  FILE // INC-0{scenarios.findIndex((s) => s.id === featuredScenario.id) + 1}
                </span>
                <span className="font-mono text-xs text-[#94A3B8]">
                  Service: <strong className="text-[#F8FAFC]">{featuredScenario.service}</strong>
                </span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
                {featuredScenario.title}
              </h2>

              <p className="font-sans text-sm text-[#94A3B8] leading-relaxed max-w-3xl">
                {featuredScenario.symptom}
              </p>

              {/* Concept tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <DifficultyPill difficulty={featuredScenario.difficulty} />
                <span className="rounded-sm border border-[#1E293B] bg-[#0F172A] px-2 py-0.5 font-mono text-[11px] text-[#94A3B8]">
                  {TYPE_LABELS[featuredScenario.type]}
                </span>
                {(featuredScenario.concepts ?? []).map((concept) => (
                  <span
                    key={concept}
                    className="font-mono text-[10px] text-[#38BDF8] bg-[#38BDF8]/5 px-2 py-0.5 rounded-sm border border-[#38BDF8]/20"
                  >
                    #{concept}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Action Column */}
            <div className="lg:col-span-4 rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-2">
                <div className="font-mono text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  Incident Manifest Specs
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Repository Files:</span>
                    <span className="text-[#F8FAFC] font-semibold">{featuredScenario.files.length} Python files</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Grading Engine:</span>
                    <span className="text-[#10B981] font-semibold">Pyodide Sandbox</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Status:</span>
                    <span className="capitalize font-bold text-[#38BDF8]">{featuredStatus}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  navigate({
                    to: "/incidents/$slug",
                    params: { slug: featuredScenario.id },
                  })
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-sm bg-[#38BDF8] px-5 py-3 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-md"
              >
                Launch Incident Room <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TIER 3: CATEGORY & COMMAND FILTER BAR
            ========================================================================= */}
        <section className="space-y-4">
          {/* Category Filter Pills Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="font-mono text-xs font-bold text-[#64748B] uppercase shrink-0 mr-2 flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5 text-[#38BDF8]" />
              Category:
            </span>
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1 font-mono text-xs rounded-sm border whitespace-nowrap transition-all ${
                typeFilter === "ALL"
                  ? "border-[#38BDF8] bg-[#38BDF8] font-bold text-[#0B0F19]"
                  : "border-[#1E293B] bg-[#0F172A] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#334155]"
              }`}
            >
              All Categories ({scenarios.length})
            </button>

            {CATEGORY_LIST.map((cat) => (
              <button
                key={cat.type}
                onClick={() => setTypeFilter(cat.type)}
                className={`px-3 py-1 font-mono text-xs rounded-sm border whitespace-nowrap transition-all ${
                  typeFilter === cat.type
                    ? "border-[#38BDF8] bg-[#38BDF8] font-bold text-[#0B0F19]"
                    : "border-[#1E293B] bg-[#0F172A] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#334155]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Secondary Filter Controls */}
          <div className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex min-w-[280px] flex-1 items-center gap-2.5 rounded-sm border border-[#1E293B] bg-[#0B0F19] px-3.5 py-2">
              <Search className="size-4 text-[#64748B] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search incident titles, services, symptoms, concept tags..."
                className="flex-1 bg-transparent font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-[#64748B] hover:text-[#F8FAFC]">
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Difficulty Filter Tabs */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-[#64748B] text-[10px] uppercase font-bold mr-1">Difficulty:</span>
              {(["ALL", "starter", "routine", "tricky"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDiffFilter(d)}
                  className={`rounded-sm px-2.5 py-1 transition-all ${
                    diffFilter === d
                      ? "bg-[#38BDF8] text-[#0B0F19] font-bold"
                      : "text-[#64748B] hover:text-[#F8FAFC]"
                  }`}
                >
                  {d === "ALL" ? "All" : DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-[#64748B] text-[10px] uppercase font-bold mr-1">Status:</span>
              {(["ALL", "resolved", "attempted", "unattempted"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-sm px-2.5 py-1 capitalize transition-all ${
                    statusFilter === s
                      ? "bg-[#38BDF8] text-[#0B0F19] font-bold"
                      : "text-[#64748B] hover:text-[#F8FAFC]"
                  }`}
                >
                  {s === "ALL" ? "All" : s}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            TIER 4: ENHANCED CASE DOCKET LIST
            ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-[#64748B] px-1">
            <span>
              Showing <strong className="text-[#F8FAFC]">{filtered.length}</strong> of {scenarios.length} docket cases
            </span>
            <div className="flex items-center gap-4">
              <span>Sort by:</span>
              <button
                onClick={() => toggleSort("index")}
                className={`hover:text-[#F8FAFC] ${sortKey === "index" ? "text-[#38BDF8] font-bold" : ""}`}
              >
                No. {sortKey === "index" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => toggleSort("title")}
                className={`hover:text-[#F8FAFC] ${sortKey === "title" ? "text-[#38BDF8] font-bold" : ""}`}
              >
                Title {sortKey === "title" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => toggleSort("difficulty")}
                className={`hover:text-[#F8FAFC] ${sortKey === "difficulty" ? "text-[#38BDF8] font-bold" : ""}`}
              >
                Difficulty {sortKey === "difficulty" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => toggleSort("status")}
                className={`hover:text-[#F8FAFC] ${sortKey === "status" ? "text-[#38BDF8] font-bold" : ""}`}
              >
                Status {sortKey === "status" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {filtered.map((scenario) => {
              const row = byId.get(scenario.id);
              const status = scenario._status;
              return (
                <article
                  key={scenario.id}
                  onClick={() =>
                    navigate({ to: "/incidents/$slug", params: { slug: scenario.id } })
                  }
                  className="group rounded-sm border border-[#1E293B] bg-[#0F172A] p-6 sm:p-7 hover:border-[#38BDF8] hover:bg-[#0F172A]/90 transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                >
                  {/* Left Metadata & Title Block */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-display text-xs font-bold text-[#38BDF8]">
                        INC-{scenario._index < 10 ? `0${scenario._index}` : scenario._index}
                      </span>
                      <span className="font-display text-xs text-[#64748B]">/</span>
                      <span className="font-display text-xs font-semibold text-[#F8FAFC]">
                        {scenario.service}
                      </span>
                      <span className="font-display text-xs text-[#64748B]">·</span>
                      <span className="font-display text-xs text-[#94A3B8]">
                        {TYPE_LABELS[scenario.type]}
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-bold text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors leading-snug">
                      {scenario.title}
                    </h3>

                    <p className="font-display text-sm text-[#CBD5E1] leading-relaxed line-clamp-2">
                      {scenario.symptom}
                    </p>

                    {/* Concept tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {(scenario.concepts ?? []).map((concept) => (
                        <span
                          key={concept}
                          className="font-display text-xs text-[#94A3B8] bg-[#0B0F19] px-2.5 py-1 rounded-sm border border-[#1E293B]"
                        >
                          #{concept}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right Status & Action Block */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-4 border-t sm:border-t-0 border-[#1E293B] pt-4 sm:pt-0">
                    <div className="flex items-center gap-2.5">
                      <DifficultyPill difficulty={scenario.difficulty} />

                      {status === "resolved" ? (
                        <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-sm border border-[#10B981]/30">
                          <CheckCircle2 className="size-4 text-[#10B981]" />
                          RESOLVED
                        </span>
                      ) : status === "attempted" ? (
                        <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-3 py-1 rounded-sm border border-[#F59E0B]/30">
                          <AlertTriangle className="size-4 text-[#F59E0B]" />
                          IN PROGRESS ({row?.attempts ?? 1})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-display text-xs text-[#64748B] bg-[#0B0F19] px-3 py-1 rounded-sm border border-[#1E293B]">
                          OPEN DOCKET
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-[#38BDF8] group-hover:translate-x-1 transition-transform">
                      Launch Scenario <ArrowRight className="size-4" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center rounded-sm border border-[#1E293B] bg-[#0F172A]">
              <p className="font-mono text-sm text-[#64748B]">
                No incident docket cases match your search filter.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                  setDiffFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="mt-3 font-mono text-xs font-bold text-[#38BDF8] hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
