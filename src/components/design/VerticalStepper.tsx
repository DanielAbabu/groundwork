import type { DesignStage } from "@/lib/design/types";

interface VerticalStepperProps {
  stages: DesignStage[];
  currentStageIndex: number;
  completedStageIds: Set<string>;
  onSelectStage: (index: number) => void;
}

export function VerticalStepper({
  stages,
  currentStageIndex,
  completedStageIds,
  onSelectStage,
}: VerticalStepperProps) {
  return (
    <div className="flex flex-col gap-0 py-2">
      {stages.map((stage, idx) => {
        const isDone = completedStageIds.has(stage.id);
        const isActive = idx === currentStageIndex;
        const isLocked =
          !isDone && !isActive && idx > 0 && !completedStageIds.has(stages[idx - 1]!.id);
        const isLast = idx === stages.length - 1;

        return (
          <div key={stage.id} className="relative flex items-start gap-3 px-4 py-2.5">
            {/* Connecting line */}
            {!isLast && (
              <span
                className={`absolute left-[27px] top-[32px] bottom-[-10px] w-0.5 ${
                  isDone ? "bg-pass/50" : "bg-border"
                }`}
              />
            )}

            {/* Stage indicator circle */}
            <button
              disabled={isLocked}
              onClick={() => onSelectStage(idx)}
              className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-all ${
                isDone
                  ? "bg-pass text-pass-foreground shadow-sm shadow-pass/20 hover:scale-105"
                  : isActive
                    ? "bg-primary text-white ring-4 ring-primary/20 animate-pulse"
                    : isLocked
                      ? "border border-border bg-card text-muted-foreground/40 cursor-not-allowed"
                      : "border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {isDone ? (
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                idx + 1
              )}
            </button>

            {/* Stage Text */}
            <button
              disabled={isLocked}
              onClick={() => onSelectStage(idx)}
              className={`flex-1 text-left transition-colors ${
                isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer group"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-xs font-bold tracking-wide uppercase ${
                    isActive
                      ? "text-primary"
                      : isDone
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {stage.title}
                </span>
                {isDone && (
                  <span className="font-mono text-[10px] font-semibold text-pass">✓ Passed</span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                {stage.prompt}
              </p>
            </button>
          </div>
        );
      })}
    </div>
  );
}
