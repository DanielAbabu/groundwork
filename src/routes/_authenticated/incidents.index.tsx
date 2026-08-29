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

export const Route = createFileRoute("/_authenticated/incidents/")({
  head: () => ({
    meta: [
      { title: "Debugging Rotation — Groundwork" },
      {
        name: "description",
        content:
          "Every scenario in the rotation with difficulty, type, your attempts, and whether you resolved it.",
      },
      { property: "og:title", content: "Debugging Rotation — Groundwork" },
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

function Board() {
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

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? (
      <span className="text-border ml-1">↕</span>
    ) : sortDir === "asc" ? (
      <span className="text-primary ml-1">↑</span>
    ) : (
      <span className="text-primary ml-1">↓</span>
    );

  const SEV_DOT: Record<string, string> = {
    "SEV-1": "bg-sev1",
    "SEV-2": "bg-sev2",
    "SEV-3": "bg-sev3",
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-44px)]">
      {/* ── Page header ── */}
      <div className="border-b border-border bg-[#161616] px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Debugging Rotation</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Read the signal · fix the root cause · verify against hidden tests
              </p>
            </div>
            <button onClick={randomUnsolved} className="run-btn flex items-center gap-1.5">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Pick random
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs text-muted-foreground">
                {resolved} / {scenarios.length} resolved
              </span>
              <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded border border-border bg-card px-3 py-1.5">
            <svg
              className="size-3.5 shrink-0 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenarios, concepts, services…"
              className="flex-1 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Difficulty filter */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
              Diff:
            </span>
            {(["ALL", "starter", "routine", "tricky"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDiffFilter(d)}
                className={`rounded px-2 py-1 transition-colors ${
                  diffFilter === d
                    ? "bg-primary text-white font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d === "ALL" ? "All" : DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
              Status:
            </span>
            {(["ALL", "resolved", "attempted", "unattempted"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded px-2 py-1 capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-white font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "ALL" ? "All" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {(
                  [
                    { key: "index", label: "#", cls: "w-12" },
                    { key: "title", label: "Title", cls: "" },
                    { key: "type", label: "Type", cls: "w-36 hidden sm:table-cell" },
                    { key: "difficulty", label: "Difficulty", cls: "w-28" },
                    { key: "status", label: "Status", cls: "w-32" },
                  ] as { key: SortKey; label: string; cls: string }[]
                ).map(({ key, label, cls }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`py-2.5 pr-4 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${cls}`}
                  >
                    {label}
                    <SortIcon col={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((scenario) => {
                const row = byId.get(scenario.id);
                const status = scenario._status;
                return (
                  <tr
                    key={scenario.id}
                    onClick={() =>
                      navigate({ to: "/incidents/$slug", params: { slug: scenario.id } })
                    }
                    className="group cursor-pointer border-b border-border/50 hover:bg-[#1c1c1c] transition-colors"
                  >
                    {/* # */}
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {scenario._index}
                    </td>

                    {/* Title */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block size-1.5 shrink-0 rounded-full ${SEV_DOT[scenario.severity] ?? "bg-border"}`}
                          title={scenario.severity}
                        />
                        <div>
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {scenario.title}
                          </span>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground truncate max-w-xs">
                            {scenario.service}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 pr-4 hidden sm:table-cell">
                      <span className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {scenario.type}:{" "}
                        {TYPE_LABELS[scenario.type as ScenarioType]?.split(":")[0] ?? scenario.type}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="py-3 pr-4">
                      <DifficultyPill difficulty={scenario.difficulty} />
                    </td>

                    {/* Status */}
                    <td className="py-3">
                      {status === "resolved" ? (
                        <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-pass">
                          <svg
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Solved
                        </span>
                      ) : status === "attempted" ? (
                        <span className="flex items-center gap-1.5 font-mono text-xs text-medium">
                          <span className="inline-block size-3.5 rounded-full border-2 border-medium relative">
                            <span className="absolute left-0 top-0 h-full w-1/2 bg-medium rounded-l-full" />
                          </span>
                          {row?.attempts ?? 1} attempt{(row?.attempts ?? 1) !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                No scenarios match your filters.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                  setDiffFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="mt-3 font-mono text-xs text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
