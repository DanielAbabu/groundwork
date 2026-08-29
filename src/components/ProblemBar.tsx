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
  "SEV-1": "border-[#C4593F]/40 bg-[#C4593F]/10 text-[#C4593F]",
  "SEV-2": "border-[#D99B26]/40 bg-[#D99B26]/10 text-[#D99B26]",
  "SEV-3": "border-[#7A93A6]/40 bg-[#7A93A6]/10 text-[#7A93A6]",
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
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[#3A342C] bg-[#1D1A17] px-4">
      {/* Left: Window Dots + Breadcrumb + Badges + Title */}
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Small Engraved Brass Dot Accents */}
        <div className="flex items-center gap-1.5 mr-1 select-none">
          <span className="size-2 rounded-full bg-[#3A342C] border border-[#4E4638]" />
          <span className="size-2 rounded-full bg-[#3A342C] border border-[#4E4638]" />
          <span className="size-2 rounded-full bg-[#C8912B] brass-emboss" />
        </div>

        <Link
          to={backTo}
          className="shrink-0 font-mono text-xs text-[#7C7364] hover:text-[#F2ECE1] transition-colors"
        >
          ← {backLabel}
        </Link>

        <span className="text-[#3A342C] shrink-0 select-none">/</span>

        {severity && (
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${SEV_CLASSES[severity] ?? "border-[#3A342C] text-[#7C7364]"}`}
          >
            {severity}
          </span>
        )}

        {difficulty && <DifficultyPill difficulty={difficulty} showDot={false} />}

        <span className="truncate font-serif text-sm font-semibold text-[#F2ECE1]">{title}</span>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        {rightSlot}

        {onRun &&
          (passed ? (
            <span className="flex items-center gap-1.5 rounded border border-[#7FB88A]/40 bg-[#7FB88A]/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#7FB88A]">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <button
              id="run-tests-btn"
              onClick={onRun}
              disabled={runDisabled || running}
              title="Run hidden tests (Ctrl+Enter)"
              className="flex items-center gap-1.5 rounded bg-[#C8912B] px-3.5 py-1.5 font-mono text-xs font-bold text-[#161412] hover:bg-[#E8B04A] transition-all brass-emboss disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <>
                  <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Run Tests
                </>
              )}
            </button>
          ))}
      </div>
    </div>
  );
}
