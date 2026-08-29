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
    <div className="flex flex-col min-h-[calc(100vh-44px)] bg-[#161412] text-[#F2ECE1]">
      {/* ── Page Header: Case Docket Title ── */}
      <div className="border-b border-[#3A342C] bg-[#1D1A17] px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C8912B]">
                  FILE // DOCKET-INDEX
                </span>
                <span className="text-[#3A342C]">/</span>
                <span className="font-mono text-xs text-[#7C7364]">ACTIVE ROTATION BOARD</span>
              </div>
              <h1 className="font-serif text-2xl font-semibold text-[#F2ECE1]">
                Debugging Rotation
              </h1>
              <p className="mt-0.5 font-sans text-xs text-[#B8AE9C]">
                Read the signal · fix the root cause · verify against hidden tests
              </p>
            </div>
            <button
              onClick={randomUnsolved}
              className="flex items-center gap-1.5 rounded bg-[#C8912B] px-3.5 py-1.5 font-mono text-xs font-bold text-[#161412] hover:bg-[#E8B04A] transition-all brass-emboss"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Pick Random Scenario
            </button>
          </div>

          {/* Logbook Progress Bar */}
          <div className="mt-4 pt-3 border-t border-[#3A342C]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs text-[#7C7364]">
                Rotation Clearance: <span className="text-[#F2ECE1] font-semibold">{resolved}</span>{" "}
                / {scenarios.length} resolved
              </span>
              <span className="font-mono text-xs font-semibold text-[#C8912B]">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-[1px] bg-[#26221D] overflow-hidden border border-[#3A342C]">
              <div
                className="h-full bg-[#C8912B] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="border-b border-[#3A342C] bg-[#161412] px-6 py-3">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded border border-[#3A342C] bg-[#1D1A17] px-3 py-1.5">
            <svg
              className="size-3.5 shrink-0 text-[#7C7364]"
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
              placeholder="Search docket scenarios, services, concepts…"
              className="flex-1 bg-transparent font-mono text-xs text-[#F2ECE1] placeholder:text-[#7C7364] focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[#7C7364] hover:text-[#F2ECE1]">
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
            <span className="text-[#7C7364] text-[10px] uppercase tracking-wider">Diff:</span>
            {(["ALL", "starter", "routine", "tricky"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDiffFilter(d)}
                className={`rounded px-2 py-0.5 transition-colors ${
                  diffFilter === d
                    ? "bg-[#C8912B] text-[#161412] font-semibold"
                    : "text-[#7C7364] hover:text-[#F2ECE1]"
                }`}
              >
                {d === "ALL" ? "All" : DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-[#7C7364] text-[10px] uppercase tracking-wider">Status:</span>
            {(["ALL", "resolved", "attempted", "unattempted"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded px-2 py-0.5 capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-[#C8912B] text-[#161412] font-semibold"
                    : "text-[#7C7364] hover:text-[#F2ECE1]"
                }`}
              >
                {s === "ALL" ? "All" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Case Docket Index Table ── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3A342C] bg-[#26221D]">
                {(
                  [
                    { key: "index", label: "NO.", cls: "w-12 pl-4" },
                    { key: "title", label: "CASE TITLE / SERVICE", cls: "" },
                    { key: "type", label: "CATEGORY", cls: "w-36 hidden sm:table-cell" },
                    { key: "difficulty", label: "DIFFICULTY", cls: "w-28" },
                    { key: "status", label: "STATUS", cls: "w-36 pr-4" },
                  ] as { key: SortKey; label: string; cls: string }[]
                ).map(({ key, label, cls }) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`py-3 pr-4 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-[#7C7364] cursor-pointer select-none hover:text-[#F2ECE1] transition-colors ${cls}`}
                  >
                    {label}
                    <SortIcon col={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A342C]/60">
              {filtered.map((scenario) => {
                const row = byId.get(scenario.id);
                const status = scenario._status;
                return (
                  <tr
                    key={scenario.id}
                    onClick={() =>
                      navigate({ to: "/incidents/$slug", params: { slug: scenario.id } })
                    }
                    className="group cursor-pointer hover:bg-[#1D1A17] transition-colors"
                  >
                    {/* # */}
                    <td className="py-3.5 pr-4 pl-4 font-mono text-xs text-[#7C7364]">
                      {scenario._index < 10 ? `0${scenario._index}` : scenario._index}
                    </td>

                    {/* Title */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-block size-2 shrink-0 rounded-full ${SEV_DOT[scenario.severity] ?? "bg-[#3A342C]"}`}
                          title={scenario.severity}
                        />
                        <div>
                          <span className="font-sans text-sm font-semibold text-[#F2ECE1] group-hover:text-[#C8912B] transition-colors">
                            {scenario.title}
                          </span>
                          <p className="mt-0.5 font-mono text-[10px] text-[#7C7364] truncate max-w-sm">
                            {scenario.service} · {scenario.symptom}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 pr-4 hidden sm:table-cell">
                      <span className="rounded border border-[#3A342C] bg-[#1D1A17] px-2 py-0.5 font-mono text-[10px] text-[#B8AE9C]">
                        {scenario.type}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="py-3.5 pr-4">
                      <DifficultyPill difficulty={scenario.difficulty} />
                    </td>

                    {/* Fieldnotes Signal Ink Status */}
                    <td className="py-3.5 pr-4">
                      {status === "resolved" ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#7FB88A]">
                          <span className="size-1.5 rounded-full bg-[#7FB88A]" />
                          RESOLVED
                        </span>
                      ) : status === "attempted" ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#D99B26]">
                          <span className="size-1.5 rounded-full bg-[#D99B26]" />
                          IN PROGRESS ({row?.attempts ?? 1})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#7C7364]">
                          <span className="size-1.5 rounded-full border border-[#4E4638]" />
                          OPEN
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center border-t border-[#3A342C]">
              <p className="font-mono text-sm text-[#7C7364]">
                No docket cases match your search filter.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                  setDiffFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="mt-3 font-mono text-xs text-[#C8912B] hover:underline"
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
