import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { scenarios } from "@/content/scenarios";
import {
  DIFFICULTY_CLASSES,
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  type ScenarioType,
  type Difficulty,
} from "@/lib/scenarios/types";
import { listProgress, type ProgressRow } from "@/lib/progress.functions";
import { ProgressSummary } from "@/components/ProgressSummary";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/incidents/")({
  head: () => ({
    meta: [
      { title: "Groundwork board — open pages and resolved scenarios" },
      {
        name: "description",
        content:
          "Every scenario in the rotation with difficulty, type, your attempts, and whether you resolved it.",
      },
      { property: "og:title", content: "Groundwork board — open pages and resolved scenarios" },
      {
        property: "og:description",
        content: "Every scenario in the rotation with difficulty, type and your progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Board,
});

const SEVERITY_BORDER: Record<string, string> = {
  "SEV-1": "border-l-4 border-l-sev1",
  "SEV-2": "border-l-4 border-l-sev2",
  "SEV-3": "border-l-4 border-l-sev3",
};

function Board() {
  const fetchProgress = useServerFn(listProgress);
  const { data: progress } = useQuery<ProgressRow[]>({
    queryKey: ["progress"],
    queryFn: () => fetchProgress(),
  });

  const [selectedType, setSelectedType] = useState<ScenarioType | "ALL">("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const byId = new Map((progress ?? []).map((row) => [row.scenario_id, row]));
  const resolved = (progress ?? []).filter((row) => row.status === "passed").length;
  const nextUp = scenarios.find((s) => byId.get(s.id)?.status !== "passed") ?? scenarios[0]!;

  const filteredScenarios = scenarios.filter((scenario) => {
    if (selectedType !== "ALL" && scenario.type !== selectedType) return false;
    if (selectedDifficulty !== "ALL" && scenario.difficulty !== selectedDifficulty) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = scenario.title.toLowerCase().includes(q);
      const matchSymptom = scenario.symptom.toLowerCase().includes(q);
      const matchService = scenario.service.toLowerCase().includes(q);
      const matchConcepts = (scenario.concepts ?? []).some((c) => c.toLowerCase().includes(q));
      return matchTitle || matchSymptom || matchService || matchConcepts;
    }
    return true;
  });

  return (
    <div className="pb-12">
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Debugging Rotation</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Each card is an incident page: read the signal, inspect the codebase, fix the root
              cause, and verify against hidden test harnesses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-amber-500 font-semibold">
              {resolved} of {scenarios.length} resolved
            </span>
            <Button
              asChild
              className="font-mono bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold"
            >
              <Link to="/incidents/$slug" params={{ slug: nextUp.id }}>
                {resolved === 0 ? "Start first scenario" : "Next scenario →"}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-8">
        <ProgressSummary progress={progress ?? []} />
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-6 space-y-3">
        <div className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border">
          <span className="font-mono text-xs text-muted-foreground">🔍 Search:</span>
          <input
            type="text"
            placeholder="Search by bug concept, service, or title (e.g. floating-point, null-pointer)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="text-muted-foreground mr-1 text-[11px] uppercase tracking-wider">
              Type:
            </span>
            <button
              onClick={() => setSelectedType("ALL")}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedType === "ALL"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({scenarios.length})
            </button>
            {(Object.keys(TYPE_LABELS) as ScenarioType[]).map((type) => {
              const count = scenarios.filter((s) => s.type === type).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    selectedType === type
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {TYPE_LABELS[type]} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-muted-foreground mr-1 text-[11px] uppercase tracking-wider">
              Level:
            </span>
            <button
              onClick={() => setSelectedDifficulty("ALL")}
              className={`px-2 py-1 rounded transition-colors ${
                selectedDifficulty === "ALL"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2 py-1 rounded transition-colors ${
                  selectedDifficulty === diff
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {DIFFICULTY_LABELS[diff]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-8 md:grid-cols-2 xl:grid-cols-3">
        {filteredScenarios.map((scenario) => {
          const row = byId.get(scenario.id);
          const status = row?.status === "passed" ? "resolved" : row ? "attempted" : "unattempted";
          const severityClass = SEVERITY_BORDER[scenario.severity] ?? "";
          return (
            <Link
              key={scenario.id}
              to="/incidents/$slug"
              params={{ slug: scenario.id }}
              className={`flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/40 ${severityClass}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${DIFFICULTY_CLASSES[scenario.difficulty]}`}
                  >
                    {DIFFICULTY_LABELS[scenario.difficulty]}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                    {scenario.severity}
                  </span>
                </div>

                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    status === "resolved"
                      ? "text-pass font-bold"
                      : status === "attempted"
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {status}
                </span>
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">{scenario.title}</h2>
              <p className="mt-2 line-clamp-3 font-mono text-xs leading-relaxed text-muted-foreground">
                {scenario.symptom}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="rounded bg-secondary px-2 py-0.5">{scenario.service}</span>
                <span className="rounded bg-secondary px-2 py-0.5">
                  {TYPE_LABELS[scenario.type]}
                </span>
              </div>

              <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                {row?.attempts
                  ? `${row.attempts} attempt${row.attempts === 1 ? "" : "s"}`
                  : "no attempts yet"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
