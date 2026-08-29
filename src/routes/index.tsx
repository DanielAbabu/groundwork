import { createFileRoute, Link } from "@tanstack/react-router";
import { scenarios } from "@/content/scenarios";
import { designScenarios } from "@/content/design";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RAW // SKILL — Real-World Engineering & Distributed System Design" },
      {
        name: "description",
        content:
          "No copilot. No shortcuts. Just you and the incident. Master tactical engineering under pressure.",
      },
      {
        property: "og:title",
        content: "RAW // SKILL — Real-World Engineering & Distributed System Design",
      },
      {
        property: "og:description",
        content:
          "No copilot. No shortcuts. Just you and the incident. Fix real broken code against a hidden Pyodide test harness.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TRACKS = [
  {
    fileNo: "FILE // DEBUG-ROTATION",
    title: "Get paged into broken code. Locate the root cause.",
    body: "You land in someone else's codebase with a one-line symptom and the exact failing output — a stack trace or a red test. Two to four real files, one root cause, no red herrings. A hidden harness grades behaviour, not style, and the postmortem tells you what actually broke.",
    bullets: [
      "16 single-cause scenarios: missing logic, bad queries, async mistakes, off-by-one",
      "Monaco editor with real files, signal panel beside it",
      "Hidden Pyodide WebWorker tests decide pass/fail; attempts tracked per scenario",
    ],
    to: "/incidents" as const,
    cta: "Open Debugging Docket",
  },
  {
    fileNo: "FILE // SYSTEM-DESIGN",
    title: "Present the architecture. Survive the pushback.",
    body: "A virtual stakeholder wants a high-throughput system built under strict constraints. You work through four graded stages: pin down requirements, size load with real arithmetic, sketch the read/write path on a typed canvas, then defend one trade-off in prose.",
    bullets: [
      "Clarify → Capacity → Components → Trade-offs, each graded on its own rubric",
      "Diagrams are typed component graphs, so every node and edge is checked for SPOFs",
      "Per-rule feedback calculates your exact Hiring Signal score",
    ],
    to: "/design" as const,
    cta: "Open Design Blueprints",
  },
];

function Index() {
  const first = scenarios[0]!;
  const firstDesign = designScenarios[0]!;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] flex flex-col font-sans">
      {/* ── Nordic Sticky Landing Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#1E293B] bg-[#0F172A]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <BrandLogo href="/" />

          <div className="flex items-center gap-5">
            <Link
              to="/incidents"
              className="hidden sm:inline-block font-sans text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              Debugging Rotation
            </Link>
            <Link
              to="/design"
              className="hidden sm:inline-block font-sans text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              System Design
            </Link>
            <Link
              to="/dashboard"
              className="rounded-sm bg-[#38BDF8] px-3.5 py-1.5 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-sm"
            >
              Enter Workspace →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero Section ── */}
        <section className="border-b border-[#1E293B] bg-[#0B0F19]">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
            <div className="inline-flex items-center gap-2 rounded-sm border border-[#334155] bg-[#0F172A] px-3 py-1 font-mono text-xs text-[#38BDF8]">
              <span className="inline-block size-1.5 rounded-full bg-[#38BDF8]" />
              No copilot. No shortcuts. Just you and the incident.
            </div>

            <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-[#F8FAFC] sm:text-5xl lg:text-6xl">
              Prove your engineering mastery under real-world pressure.
            </h1>

            <p className="mt-5 max-w-2xl font-sans text-base leading-relaxed text-[#94A3B8]">
              {scenarios.length} single-cause scenarios graded by a hidden Pyodide test harness, and{" "}
              {designScenarios.length} stakeholder design review
              {designScenarios.length === 1 ? "" : "s"} graded stage by stage — clarify, size,
              sketch, trade off. Zero multiple-choice quizzes.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/incidents/$slug"
                params={{ slug: first.id }}
                className="inline-flex items-center rounded-sm bg-[#38BDF8] px-5 py-2.5 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-sm"
              >
                Start First Scenario →
              </Link>
              <Link
                to="/design/$slug"
                params={{ slug: firstDesign.id }}
                className="inline-flex items-center rounded-sm border border-[#1E293B] bg-[#0F172A] px-5 py-2.5 font-mono text-xs font-semibold text-[#F8FAFC] hover:border-[#334155] hover:bg-[#1E293B] transition-all"
              >
                Start Design Review
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-sm px-3 py-2.5 font-mono text-xs text-[#64748B] hover:text-[#38BDF8] transition-colors"
              >
                View Dashboard →
              </Link>
            </div>

            {/* ── Instrument Cluster Dial Counters ── */}
            <div className="mt-14 pt-8 border-t border-[#1E293B]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#64748B] mb-4">
                Telemetry Instrument Cluster
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                <div className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                    Total Debugging Scenarios
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
                    {scenarios.length}{" "}
                    <span className="text-xs text-[#10B981] font-medium">Active</span>
                  </div>
                </div>
                <div className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                    Design Reviews
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
                    {designScenarios.length}{" "}
                    <span className="text-xs text-[#38BDF8] font-medium">Graded</span>
                  </div>
                </div>
                <div className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                    Hidden Harnesses
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
                    100% <span className="text-xs text-[#6366F1] font-medium">Pyodide</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dual Track Showcase Case Files ── */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#38BDF8]">
            Two Tracks, One Platform
          </p>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {TRACKS.map((track) => (
              <article
                key={track.fileNo}
                className="flex flex-col rounded-sm border border-[#1E293B] bg-[#0F172A] overflow-hidden shadow-sm"
              >
                {/* Folder Tab Header */}
                <div className="border-b border-[#1E293B] bg-[#1E293B]/50 px-5 py-2.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#38BDF8]">
                    {track.fileNo}
                  </span>
                  <span className="font-mono text-[10px] text-[#64748B]">HANDLED BY HAND</span>
                </div>

                <div className="p-7 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-bold leading-tight text-[#F8FAFC]">
                      {track.title}
                    </h3>
                    <p className="mt-3 font-sans text-sm leading-relaxed text-[#94A3B8]">
                      {track.body}
                    </p>

                    <ul className="mt-6 space-y-2.5">
                      {track.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex gap-2.5 font-sans text-xs leading-relaxed text-[#94A3B8]"
                        >
                          <span className="text-[#38BDF8]">▸</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-5 border-t border-[#1E293B]">
                    <Link
                      to={track.to}
                      className="inline-flex items-center rounded-sm border border-[#334155] bg-[#1E293B] px-4 py-2 font-mono text-xs font-semibold text-[#F8FAFC] hover:border-[#38BDF8] hover:text-[#38BDF8] transition-all"
                    >
                      {track.cta} →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="border-t border-[#1E293B] bg-[#0F172A]/50 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#64748B]">
              Workflow Execution
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-[#F8FAFC]">
              How RAW // SKILL works
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <article className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-6 border-l-2 border-l-[#38BDF8]">
                <p className="font-mono text-xs font-bold text-[#38BDF8]">01</p>
                <h3 className="mt-3 font-display text-lg font-bold text-[#F8FAFC]">
                  You get paged
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-[#94A3B8]">
                  A real symptom, severity tier, and failing signal exactly as it landed on call.
                </p>
              </article>
              <article className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-6 border-l-2 border-l-[#38BDF8]">
                <p className="font-mono text-xs font-bold text-[#38BDF8]">02</p>
                <h3 className="mt-3 font-display text-lg font-bold text-[#F8FAFC]">
                  You work the problem
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-[#94A3B8]">
                  Real files in Monaco IDE, or interactive node graph canvas with latency heatmaps.
                </p>
              </article>
              <article className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-6 border-l-2 border-l-[#38BDF8]">
                <p className="font-mono text-xs font-bold text-[#38BDF8]">03</p>
                <h3 className="mt-3 font-display text-lg font-bold text-[#F8FAFC]">
                  You get graded honestly
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-[#94A3B8]">
                  Hidden test harness for code, topology verification for designs, and a senior
                  debrief.
                </p>
              </article>
            </div>
            <p className="mt-8 font-mono text-xs text-[#64748B]">
              First scenario in rotation — Starter · Debugging ·{" "}
              <span className="text-[#F8FAFC] font-medium">{first.title}</span>
            </p>
          </div>
        </section>
      </main>

      {/* ── Brand Footer ── */}
      <footer className="border-t border-[#1E293B] bg-[#0F172A] py-8 px-6">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo showTagline href="/" />
          <span className="font-mono text-xs text-[#64748B]">
            © {new Date().getFullYear()} RAW // SKILL. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
