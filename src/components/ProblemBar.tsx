import { Link } from "@tanstack/react-router";
import { DifficultyPill } from "@/components/DifficultyPill";
import type { Scenario } from "@/lib/scenarios/types";

interface ProblemBarProps {
  title: string;
  backTo: string;
  backLabel: string;
  severity?: string;
  difficulty?: Scenario["difficulty"];
  passed?: boolean;
  running?: boolean;
  onRun?: () => void;
  runDisabled?: boolean;
  rightSlot?: React.ReactNode;
}

const SEV_CLASSES: Record<string, string> = {
  "SEV-1": "border-[#F43F5E]/40 bg-[#F43F5E]/10 text-[#F43F5E]",
  "SEV-2": "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]",
  "SEV-3": "border-[#6366F1]/40 bg-[#6366F1]/10 text-[#6366F1]",
};

export function ProblemBar({
  title,
  backTo,
  backLabel,
  severity,
  difficulty,
  passed,
  running,
  onRun,
  runDisabled,
  rightSlot,
}: ProblemBarProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#171717] bg-[#0A0A0A] px-6">
      {/* Left: Window Dots + Breadcrumb + Badges + Title */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Small Emerald Dot Accent */}
        <div className="flex items-center gap-1.5 mr-1 select-none">
          <span className="size-2.5 rounded-full bg-[#171717] border border-[#262626]" />
          <span className="size-2.5 rounded-full bg-[#171717] border border-[#262626]" />
          <span className="size-2.5 rounded-full bg-[#10B981]" />
        </div>

        <Link
          to={backTo}
          className="shrink-0 font-display text-xs font-semibold text-[#64748B] hover:text-[#F8FAFC] transition-colors"
        >
          ← {backLabel}
        </Link>

        <span className="text-[#171717] shrink-0 select-none">/</span>

        {severity && (
          <span
            className={`shrink-0 rounded-sm border px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider ${SEV_CLASSES[severity] ?? "border-[#171717] text-[#64748B]"}`}
          >
            {severity}
          </span>
        )}

        {difficulty && <DifficultyPill difficulty={difficulty} showDot={false} />}

        <span className="truncate font-display text-base font-bold text-[#F8FAFC]">{title}</span>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-3">
        {rightSlot}

        {onRun &&
          (passed ? (
            <span className="flex items-center gap-2 rounded-sm border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#2DD4BF]">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              VERDICT: PASSED
            </span>
          ) : (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline font-display text-xs text-[#64748B] bg-[#000000] px-2.5 py-1 rounded-sm border border-[#171717]">
                Ctrl + ↵
              </span>
              <button
                id="run-tests-btn"
                onClick={onRun}
                disabled={runDisabled || running}
                title="Run hidden tests (Ctrl+Enter)"
                className="flex items-center gap-2 rounded-sm bg-[#10B981] px-4 py-2 font-display text-xs font-bold text-[#000000] hover:bg-[#34D399] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {running ? (
                  <>
                    <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Running…
                  </>
                ) : (
                  <>
                    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Run Tests
                  </>
                )}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
