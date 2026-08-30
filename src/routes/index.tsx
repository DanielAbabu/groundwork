import { createFileRoute, Link } from "@tanstack/react-router";
import { scenarios } from "@/content/scenarios";
import { designScenarios } from "@/content/design";
import { TYPE_LABELS } from "@/lib/scenarios/types";
import { BrandLogo } from "@/components/BrandLogo";
import { ProductWorkbenchPreview } from "@/components/ProductWorkbenchPreview";
import {
  Terminal,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileCode,
  Network,
  Cpu,
  Layers,
  Sparkles,
  BarChart3,
  Activity,
  AlertTriangle,
} from "lucide-react";

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

export function Index() {
  const first = scenarios[0]!;
  const firstDesign = designScenarios[0]!;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#38BDF8] selection:text-[#0B0F19]">
      {/* ── Nordic Sticky Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-[#1E293B] bg-[#0F172A]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
          <BrandLogo href="/" />

          <div className="flex items-center gap-6">
            <Link
              to="/incidents"
              className="hidden sm:inline-flex items-center gap-1.5 font-mono text-xs text-[#94A3B8] hover:text-[#38BDF8] transition-colors"
            >
              <Terminal className="size-3.5 text-[#38BDF8]" />
              Debugging Docket
            </Link>
            <Link
              to="/design"
              className="hidden sm:inline-flex items-center gap-1.5 font-mono text-xs text-[#94A3B8] hover:text-[#38BDF8] transition-colors"
            >
              <Network className="size-3.5 text-[#38BDF8]" />
              System Blueprints
            </Link>
            <Link
              to="/dashboard"
              className="rounded-sm bg-[#38BDF8] px-4 py-1.5 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-sm flex items-center gap-1.5"
            >
              Enter Workspace <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-16 sm:space-y-20 lg:space-y-28 pb-20">
        {/* =========================================================================
            TIER 1: IMMEDIATE UNDERSTANDING (HERO)
            Goal: Make the product value proposition crystal clear in seconds.
            ========================================================================= */}
        <section className="relative pt-8 sm:pt-12 lg:pt-20 border-b border-[#1E293B]/80 bg-gradient-to-b from-[#0F172A]/40 to-[#0B0F19]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pb-16">
              {/* Left Asymmetric Narrative Block */}
              <div className="lg:col-span-8 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-sm border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-1 font-mono text-xs font-bold text-[#38BDF8]">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-[#38BDF8]"></span>
                  </span>
                  No copilot. No shortcuts. Just you and the incident.
                </div>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.06] tracking-tight text-[#F8FAFC]">
                  Prove your engineering mastery under{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#7DD3FC] to-[#F8FAFC]">
                    real-world pressure.
                  </span>
                </h1>

                <p className="font-sans text-base sm:text-lg leading-relaxed text-[#94A3B8] max-w-3xl">
                  Solve <strong className="text-[#F8FAFC] font-semibold">{scenarios.length} real incident scenarios</strong> in an integrated Monaco IDE graded by an in-browser Pyodide test harness, and defend <strong className="text-[#F8FAFC] font-semibold">{designScenarios.length} distributed system architecture blueprints</strong> stage by stage. Zero multiple-choice noise.
                </p>

                {/* Primary Actions Group */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    to="/incidents/$slug"
                    params={{ slug: first.id }}
                    className="inline-flex items-center gap-2 rounded-sm bg-[#38BDF8] px-6 py-3 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-md"
                  >
                    Start First Scenario <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    to="/design/$slug"
                    params={{ slug: firstDesign.id }}
                    className="inline-flex items-center gap-2 rounded-sm border border-[#334155] bg-[#0F172A] px-6 py-3 font-mono text-xs font-semibold text-[#F8FAFC] hover:border-[#38BDF8] hover:bg-[#1E293B] transition-all"
                  >
                    Start System Design
                  </Link>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-[#64748B] hover:text-[#38BDF8] transition-colors px-2 py-3"
                  >
                    View Engineer Dossier →
                  </Link>
                </div>
              </div>

              {/* Right Quick Telemetry Stat Stack */}
              <div className="lg:col-span-4 rounded-sm border border-[#1E293B] bg-[#0F172A] p-6 space-y-5 shadow-xl">
                <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#38BDF8] flex items-center justify-between border-b border-[#1E293B] pb-3">
                  <span>Engine Manifest</span>
                  <Activity className="size-4 text-[#38BDF8]" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[10px] text-[#64748B] uppercase">Debugging Docket</div>
                      <div className="font-display text-xl font-bold text-[#F8FAFC]">{scenarios.length} Real Incidents</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded-sm border border-[#10B981]/20">
                      LIVE
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#1E293B]/60 pt-3">
                    <div>
                      <div className="font-mono text-[10px] text-[#64748B] uppercase">Architecture Canvas</div>
                      <div className="font-display text-xl font-bold text-[#F8FAFC]">{designScenarios.length} System Blueprints</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-1 rounded-sm border border-[#38BDF8]/20">
                      GRADED
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#1E293B]/60 pt-3">
                    <div>
                      <div className="font-mono text-[10px] text-[#64748B] uppercase">Grading Harness</div>
                      <div className="font-display text-xl font-bold text-[#F8FAFC]">100% Pyodide + AST</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#6366F1] bg-[#6366F1]/10 px-2 py-1 rounded-sm border border-[#6366F1]/20">
                      CLIENT-SIDE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TIER 2: CONTEXT & PROBLEM STATEMENT
            Goal: Explain why RAW // SKILL exists naturally building from the hero.
            ========================================================================= */}
        <section className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Context Header & Editorial Narrative */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#38BDF8]">
                  The Problem & Reality
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-[#F8FAFC] leading-tight">
                  Synthetic LeetCode puzzles don't prepare you for production outages.
                </h2>
                <p className="mt-4 font-sans text-sm leading-relaxed text-[#94A3B8]">
                  In the real world, software engineering isn't writing a single isolated function from scratch or picking from 4 multiple-choice options. It's stepping into a 5,000-line codebase you didn't write, pinpointing a race condition under incident fire, or sizing a distributed cache cluster to prevent SPOF failure.
                </p>
              </div>

              <div className="border-l-2 border-[#38BDF8] pl-4 py-1">
                <p className="font-mono text-xs italic text-[#F8FAFC]">
                  "RAW // SKILL treats software engineering as an applied tactical discipline — evaluated by objective test suites and architectural rubrics."
                </p>
              </div>
            </div>

            {/* Editorial Contrast Comparison Layout */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Synthetic Prep (The Old Way) */}
              <div className="rounded-sm border border-[#1E293B] bg-[#0F172A]/40 p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#EF4444] font-mono text-xs font-bold uppercase">
                  <XCircle className="size-4" />
                  Synthetic Tech Prep
                </div>
                <ul className="space-y-3 font-sans text-xs text-[#94A3B8]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#EF4444] font-mono">✕</span>
                    Multiple-choice quiz questions easily memorized or guessed.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#EF4444] font-mono">✕</span>
                    Single algorithmic function stubs with zero real context.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#EF4444] font-mono">✕</span>
                    Abstract system design chats with no quantitative rubric or SPOF feedback.
                  </li>
                </ul>
              </div>

              {/* RAW // SKILL Reality (The New Way) */}
              <div className="rounded-sm border border-[#38BDF8]/40 bg-[#0F172A] p-6 space-y-4 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#38BDF8]/5 rounded-bl-full pointer-events-none" />
                <div className="flex items-center gap-2 text-[#38BDF8] font-mono text-xs font-bold uppercase">
                  <ShieldCheck className="size-4" />
                  RAW // SKILL Reality
                </div>
                <ul className="space-y-3 font-sans text-xs text-[#F8FAFC]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#38BDF8] font-mono">✓</span>
                    Real multi-file repositories with actual failing signals & stack traces.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#38BDF8] font-mono">✓</span>
                    In-browser Monaco Editor & WebWorker Pyodide execution harness.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#38BDF8] font-mono">✓</span>
                    Stage-by-stage design reviews: Clarify → Sizing → Typed Graph → Defense.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TIER 3: CORE EXPERIENCE (INTERACTIVE WORKBENCH VISUAL CENTER)
            Goal: Make the product workflow the visual center of the page.
            ========================================================================= */}
        <section className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#38BDF8]">
              The Applied Environment
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F8FAFC]">
              Experience the dual-track workbench before you begin.
            </h2>
            <p className="font-sans text-sm text-[#94A3B8]">
              Interact with the simulation below to explore the Monaco incident debugger and the interactive system design canvas.
            </p>
          </div>

          {/* Interactive Core Demonstration Component */}
          <ProductWorkbenchPreview />
        </section>

        {/* =========================================================================
            TIER 4: SUPPORTING INFORMATION (ASYMMETRIC TRACK BREAKDOWNS)
            Goal: Organize tracks by importance without repetitive card grids.
            ========================================================================= */}
        <section className="mx-auto max-w-7xl px-6 space-y-16">
          {/* Track 1: Debugging Docket Breakdown */}
          <div className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-8 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#38BDF8] uppercase tracking-widest">
                  <FileCode className="size-4" />
                  Track 01 // Debugging Docket
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
                  Get paged into broken code. Locate the root cause.
                </h3>
                <p className="font-sans text-sm leading-relaxed text-[#94A3B8]">
                  Land in someone else's codebase with a one-line symptom and failing signal. You get 2 to 4 real Python files, one single root cause, and no red herrings. A hidden harness grades behavior, not style.
                </p>

                {/* Scenario Types Teaser Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-3 text-xs">
                    <div className="font-mono text-[#38BDF8] font-bold">Race Conditions</div>
                    <div className="text-[#64748B] text-[11px] mt-0.5">Async locks & double spend</div>
                  </div>
                  <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-3 text-xs">
                    <div className="font-mono text-[#38BDF8] font-bold">Off-By-One & Logic</div>
                    <div className="text-[#64748B] text-[11px] mt-0.5">Boundary condition errors</div>
                  </div>
                  <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-3 text-xs">
                    <div className="font-mono text-[#38BDF8] font-bold">Cache Invalidation</div>
                    <div className="text-[#64748B] text-[11px] mt-0.5">Stale read & memory drift</div>
                  </div>
                  <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-3 text-xs">
                    <div className="font-mono text-[#38BDF8] font-bold">SQL Locks & Queries</div>
                    <div className="text-[#64748B] text-[11px] mt-0.5">N+1 & transaction deadlocks</div>
                  </div>
                </div>

                <div className="pt-3">
                  <Link
                    to="/incidents"
                    className="inline-flex items-center gap-2 rounded-sm border border-[#38BDF8] bg-[#38BDF8]/10 px-5 py-2.5 font-mono text-xs font-bold text-[#38BDF8] hover:bg-[#38BDF8] hover:text-[#0B0F19] transition-all"
                  >
                    Explore All {scenarios.length} Incidents <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>

              {/* Code Snippet Highlight */}
              <div className="lg:col-span-6 rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 text-[#64748B] text-[11px]">
                  <span>INCIDENT MANIFEST // STARTER DOCKET</span>
                  <span className="text-[#10B981]">16 SCENARIOS READY</span>
                </div>
                <div className="space-y-1.5 text-[#94A3B8]">
                  <div className="text-[#38BDF8] font-bold">def evaluate_incident_attempt(attempt_code, test_suite):</div>
                  <div className="pl-4 text-[#64748B]"># WebWorker spawns Pyodide runtime inside browser memory</div>
                  <div className="pl-4">pyodide = await load_pyodide_sandbox()</div>
                  <div className="pl-4 text-[#F472B6]">results = await pyodide.run_tests(attempt_code)</div>
                  <div className="pl-4"><span className="text-[#F472B6]">if</span> results.passed:</div>
                  <div className="pl-8 text-[#10B981]">return IncidentResolution(status="RESOLVED", debrief=UNLOCKED)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Track 2: System Design Pipeline Timeline */}
          <div className="rounded-sm border border-[#1E293B] bg-[#0F172A] p-8 lg:p-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1E293B] pb-6">
              <div>
                <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#38BDF8] uppercase tracking-widest">
                  <Network className="size-4" />
                  Track 02 // System Design Blueprints
                </div>
                <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#F8FAFC]">
                  Present the architecture. Survive the pushback.
                </h3>
              </div>
              <Link
                to="/design"
                className="inline-flex items-center gap-2 rounded-sm border border-[#334155] bg-[#1E293B] px-4 py-2 font-mono text-xs font-semibold text-[#F8FAFC] hover:border-[#38BDF8] hover:text-[#38BDF8] transition-all shrink-0"
              >
                View Design Reviews →
              </Link>
            </div>

            {/* Numbered 4-Stage Progressive Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 border-t-2 border-t-[#38BDF8] space-y-2">
                <span className="font-mono text-xs font-bold text-[#38BDF8]">01. CLARIFY</span>
                <h4 className="font-display text-base font-bold text-[#F8FAFC]">Requirements</h4>
                <p className="font-sans text-xs text-[#94A3B8] leading-relaxed">
                  Pin down functional constraints, SLA availability targets, and write/read traffic ratios.
                </p>
              </div>

              <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 border-t-2 border-t-[#38BDF8] space-y-2">
                <span className="font-mono text-xs font-bold text-[#38BDF8]">02. SIZING</span>
                <h4 className="font-display text-base font-bold text-[#F8FAFC]">Capacity Math</h4>
                <p className="font-sans text-xs text-[#94A3B8] leading-relaxed">
                  Calculate required QPS, bandwidth throughput, and cache RAM requirements with strict arithmetic.
                </p>
              </div>

              <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 border-t-2 border-t-[#38BDF8] space-y-2">
                <span className="font-mono text-xs font-bold text-[#38BDF8]">03. TOPOLOGY</span>
                <h4 className="font-display text-base font-bold text-[#F8FAFC]">Typed Canvas</h4>
                <p className="font-sans text-xs text-[#94A3B8] leading-relaxed">
                  Sketch component node graphs. Automated checks detect SPOFs, unbacked reads, or missing queues.
                </p>
              </div>

              <div className="rounded-sm border border-[#1E293B] bg-[#0B0F19] p-5 border-t-2 border-t-[#38BDF8] space-y-2">
                <span className="font-mono text-xs font-bold text-[#38BDF8]">04. DEFENSE</span>
                <h4 className="font-display text-base font-bold text-[#F8FAFC]">Rubric Scoring</h4>
                <p className="font-sans text-xs text-[#94A3B8] leading-relaxed">
                  Defend trade-offs in prose against virtual stakeholders and receive a detailed Hiring Signal breakdown.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TIER 5: PROOF & TELEMETRY (EVIDENCE MANIFEST)
            Goal: Woven evidence & real scenario preview that naturalizes credibility.
            ========================================================================= */}
        <section className="mx-auto max-w-7xl px-6">
          <div className="rounded-sm border border-[#1E293B] bg-[#0F172A]/80 p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#1E293B]">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#38BDF8]">
                  Proof & Telemetry
                </p>
                <h3 className="font-display text-2xl font-bold text-[#F8FAFC] mt-1">
                  First Scenario Ready for Execution
                </h3>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-[#64748B]">Harness: <strong className="text-[#F8FAFC]">Pyodide WebWorker</strong></span>
                <span className="text-[#64748B]">Grading: <strong className="text-[#10B981]">Automated</strong></span>
              </div>
            </div>

            {/* Featured Starter Scenario Manifest Teaser */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded-sm border border-[#38BDF8]/20">
                    STARTER SCENARIO
                  </span>
                  <span className="font-mono text-xs text-[#94A3B8]">
                    {first.service} · {TYPE_LABELS[first.type]}
                  </span>
                </div>
                <h4 className="font-display text-xl font-bold text-[#F8FAFC]">
                  {first.title}
                </h4>
                <p className="font-sans text-sm text-[#94A3B8] leading-relaxed">
                  {first.symptom}
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
                <Link
                  to="/incidents/$slug"
                  params={{ slug: first.id }}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#38BDF8] px-5 py-2.5 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-sm"
                >
                  Launch Incident #{first.id} <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-1 font-mono text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors py-1"
                >
                  View Full Scenarios List →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TIER 6: FINAL ACTION (NATURAL CULMINATION CTA)
            Goal: End with a clear next step that feels like a natural conclusion.
            ========================================================================= */}
        <section className="mx-auto max-w-7xl px-6">
          <div className="rounded-sm border border-[#38BDF8]/30 bg-gradient-to-br from-[#0F172A] via-[#0B0F19] to-[#0F172A] p-10 lg:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#38BDF8] uppercase tracking-widest">
              <Zap className="size-4" />
              Step Into The Workbench
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F8FAFC] max-w-3xl mx-auto leading-tight">
              Ready to test your raw engineering skills under real incident pressure?
            </h2>

            <p className="font-sans text-base text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
              No signups required to start. Jump straight into your first incident or sketch your first distributed system design blueprint.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/incidents/$slug"
                params={{ slug: first.id }}
                className="inline-flex items-center gap-2 rounded-sm bg-[#38BDF8] px-7 py-3.5 font-mono text-xs font-bold text-[#0B0F19] hover:bg-[#7DD3FC] transition-all shadow-lg text-sm"
              >
                Launch Starter Incident <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-sm border border-[#334155] bg-[#0F172A] px-7 py-3.5 font-mono text-xs font-semibold text-[#F8FAFC] hover:border-[#38BDF8] hover:bg-[#1E293B] transition-all text-sm"
              >
                Enter Engineer Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Brand Footer ── */}
      <footer className="border-t border-[#1E293B] bg-[#0F172A] py-8 px-6">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo showTagline href="/" />
          <div className="flex items-center gap-6 font-mono text-xs text-[#64748B]">
            <Link to="/incidents" className="hover:text-[#38BDF8] transition-colors">
              Incidents
            </Link>
            <Link to="/design" className="hover:text-[#38BDF8] transition-colors">
              System Design
            </Link>
            <Link to="/dashboard" className="hover:text-[#38BDF8] transition-colors">
              Dashboard
            </Link>
            <span>© {new Date().getFullYear()} RAW // SKILL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
