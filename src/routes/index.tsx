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
    <div className="min-h-screen bg-[#161412] text-[#F2ECE1] flex flex-col font-sans">
      {/* ── Fieldnotes Sticky Landing Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#3A342C] bg-[#1D1A17]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <BrandLogo href="/" />

          <div className="flex items-center gap-5">
            <Link
              to="/incidents"
              className="hidden sm:inline-block font-sans text-xs text-[#B8AE9C] hover:text-[#F2ECE1] transition-colors"
            >
              Debugging Rotation
            </Link>
            <Link
              to="/design"
              className="hidden sm:inline-block font-sans text-xs text-[#B8AE9C] hover:text-[#F2ECE1] transition-colors"
            >
              System Design
            </Link>
            <Link
              to="/dashboard"
              className="rounded bg-[#C8912B] px-3.5 py-1.5 font-mono text-xs font-bold text-[#161412] hover:bg-[#E8B04A] transition-all brass-emboss"
            >
              Enter Workspace →
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero Section with Paper Grain Texture ── */}
        <section className="paper-grain border-b border-[#3A342C] bg-[#161412]">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
            <div className="inline-flex items-center gap-2 rounded border border-[#4E4638] bg-[#1D1A17] px-3 py-1 font-mono text-xs text-[#C8912B] brass-emboss">
              <span className="inline-block size-1.5 rounded-full bg-[#C8912B]" />
              No copilot. No shortcuts. Just you and the incident.
            </div>

            <h1 className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-[#F2ECE1] sm:text-5xl lg:text-6xl">
              Prove your engineering mastery under real-world pressure.
            </h1>

            <p className="mt-5 max-w-2xl font-sans text-base leading-relaxed text-[#B8AE9C]">
              {scenarios.length} single-cause scenarios graded by a hidden Pyodide test harness, and{" "}
              {designScenarios.length} stakeholder design review
              {designScenarios.length === 1 ? "" : "s"} graded stage by stage — clarify, size,
              sketch, trade off. Zero multiple-choice quizzes.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/incidents/$slug"
                params={{ slug: first.id }}
                className="inline-flex items-center rounded bg-[#C8912B] px-5 py-2.5 font-mono text-xs font-bold text-[#161412] hover:bg-[#E8B04A] transition-all brass-emboss"
              >
                Start First Scenario →
              </Link>
              <Link
                to="/design/$slug"
                params={{ slug: firstDesign.id }}
                className="inline-flex items-center rounded border border-[#3A342C] bg-[#1D1A17] px-5 py-2.5 font-mono text-xs font-medium text-[#F2ECE1] hover:border-[#4E4638] hover:bg-[#26221D] transition-all"
              >
                Start Design Review
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded px-3 py-2.5 font-mono text-xs text-[#7C7364] hover:text-[#C8912B] transition-colors"
              >
                View Dashboard →
              </Link>
            </div>

            {/* ── Instrument Cluster Dial Counters ── */}
            <div className="mt-14 pt-8 border-t border-[#3A342C]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7C7364] mb-4">
                Telemetry Instrument Cluster
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                <div className="rounded border border-[#4E4638] bg-[#1D1A17] p-4 brass-emboss">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#7C7364]">
                    Total Debugging Scenarios
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#F2ECE1]">
                    {scenarios.length}{" "}
                    <span className="text-xs text-[#7FB88A] font-normal">Active</span>
                  </div>
                </div>
                <div className="rounded border border-[#4E4638] bg-[#1D1A17] p-4 brass-emboss">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#7C7364]">
                    Design Reviews
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#F2ECE1]">
                    {designScenarios.length}{" "}
                    <span className="text-xs text-[#C8912B] font-normal">Graded</span>
                  </div>
                </div>
                <div className="rounded border border-[#4E4638] bg-[#1D1A17] p-4 brass-emboss">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#7C7364]">
                    Hidden Harnesses
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#F2ECE1]">
                    100% <span className="text-xs text-[#7A93A6] font-normal">Pyodide</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dual Track Showcase Case Files ── */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#C8912B]">
            Two Tracks, One Workshop
          </p>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {TRACKS.map((track) => (
              <article
                key={track.fileNo}
                className="flex flex-col rounded border border-[#3A342C] bg-[#1D1A17] overflow-hidden"
              >
                {/* Folder Tab Header */}
                <div className="border-b border-[#3A342C] bg-[#26221D] px-5 py-2.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#C8912B]">
                    {track.fileNo}
                  </span>
                  <span className="font-mono text-[10px] text-[#7C7364]">HANDLED BY HAND</span>
                </div>

                <div className="p-7 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-2xl font-semibold leading-tight text-[#F2ECE1]">
                      {track.title}
                    </h3>
                    <p className="mt-3 font-sans text-sm leading-relaxed text-[#B8AE9C]">
                      {track.body}
                    </p>

                    <ul className="mt-6 space-y-2.5">
                      {track.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex gap-2.5 font-sans text-xs leading-relaxed text-[#B8AE9C]"
                        >
                          <span className="text-[#C8912B]">▸</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-5 border-t border-[#3A342C]">
                    <Link
                      to={track.to}
                      className="inline-flex items-center rounded border border-[#4E4638] bg-[#26221D] px-4 py-2 font-mono text-xs font-medium text-[#F2ECE1] hover:border-[#C8912B] hover:text-[#C8912B] transition-all"
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
        <section className="border-t border-[#3A342C] bg-[#1D1A17]/60 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#7C7364]">
              Workflow Execution
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#F2ECE1]">
              How RAW // SKILL works
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <article className="rounded border border-[#3A342C] bg-[#1D1A17] p-6 border-l-2 border-l-[#C8912B]">
                <p className="font-mono text-xs font-bold text-[#C8912B]">01</p>
                <h3 className="mt-3 font-serif text-lg font-semibold text-[#F2ECE1]">
                  You get paged
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-[#B8AE9C]">
                  A real symptom, severity tier, and failing signal exactly as it landed on call.
                </p>
              </article>
              <article className="rounded border border-[#3A342C] bg-[#1D1A17] p-6 border-l-2 border-l-[#C8912B]">
                <p className="font-mono text-xs font-bold text-[#C8912B]">02</p>
                <h3 className="mt-3 font-serif text-lg font-semibold text-[#F2ECE1]">
                  You work the problem
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-[#B8AE9C]">
                  Real files in Monaco IDE, or interactive node graph canvas with latency heatmaps.
                </p>
              </article>
              <article className="rounded border border-[#3A342C] bg-[#1D1A17] p-6 border-l-2 border-l-[#C8912B]">
                <p className="font-mono text-xs font-bold text-[#C8912B]">03</p>
                <h3 className="mt-3 font-serif text-lg font-semibold text-[#F2ECE1]">
                  You get graded honestly
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-[#B8AE9C]">
                  Hidden test harness for code, topology verification for designs, and a senior
                  debrief.
                </p>
              </article>
            </div>
            <p className="mt-8 font-mono text-xs text-[#7C7364]">
              First scenario in rotation — Starter · Debugging ·{" "}
              <span className="text-[#F2ECE1] font-medium">{first.title}</span>
            </p>
          </div>
        </section>
      </main>

      {/* ── Brand Footer ── */}
      <footer className="border-t border-[#3A342C] bg-[#1D1A17] py-8 px-6">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo showTagline href="/" />
          <span className="font-mono text-xs text-[#7C7364]">
            © {new Date().getFullYear()} RAW // SKILL. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
