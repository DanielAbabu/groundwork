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
  /** extra right-side slot — e.g. Submit Stage button for design track */
  rightSlot?: React.ReactNode;
}

const SEV_CLASSES: Record<string, string> = {
  "SEV-1": "border-sev1/40 bg-sev1/10 text-sev1",
  "SEV-2": "border-sev2/40 bg-sev2/10 text-sev2",
  "SEV-3": "border-sev3/40 bg-sev3/10 text-sev3",
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
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-[#14141f] px-4">
      {/* Left: breadcrumb + badges + title */}
      <div className="flex min-w-0 items-center gap-2">
        <Link
          to={backTo}
          className="shrink-0 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {backLabel}
        </Link>

        <span className="text-border shrink-0 select-none">/</span>

        {severity && (
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${SEV_CLASSES[severity] ?? "border-border text-muted-foreground"}`}
          >
            {severity}
          </span>
        )}

        {difficulty && <DifficultyPill difficulty={difficulty} showDot={false} />}

        <span className="truncate font-sans text-sm font-medium text-foreground">{title}</span>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        {rightSlot}

        {onRun &&
          (passed ? (
            <span className="flex items-center gap-1.5 rounded border border-pass/40 bg-pass/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-pass">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Resolved
            </span>
          ) : (
            <button
              id="run-tests-btn"
              onClick={onRun}
              disabled={runDisabled || running}
              title="Run hidden tests (Ctrl+Enter)"
              className="run-btn flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
