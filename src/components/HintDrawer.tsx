import { useState } from "react";
import type { ScenarioHint } from "@/lib/scenarios/types";
import { Button } from "@/components/ui/button";

interface HintDrawerProps {
  hints?: ScenarioHint[] | undefined;
}

export function HintDrawer({ hints }: HintDrawerProps) {
  const [unlockedTier, setUnlockedTier] = useState<number>(0);
  const [open, setOpen] = useState(false);

  if (!hints || hints.length === 0) return null;

  const availableHints = hints.filter((h) => h.tier <= unlockedTier);
  const hasMore = unlockedTier < hints.length;

  return (
    <div className="mt-4 border-t border-border pt-3">
      {!open ? (
        <button
          onClick={() => {
            setOpen(true);
            if (unlockedTier === 0) setUnlockedTier(1);
          }}
          className="flex items-center gap-1.5 font-mono text-xs text-amber-500 hover:text-amber-400 font-medium"
        >
          <span>💡 Need a hint?</span>
        </button>
      ) : (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <span className="font-mono text-xs font-bold text-amber-500 uppercase tracking-wider">
              Diagnostic Nudges
            </span>
            <button
              onClick={() => setOpen(false)}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {availableHints.map((hint) => (
              <div key={hint.tier} className="text-xs leading-relaxed text-foreground font-sans">
                <span className="font-mono text-[10px] uppercase font-bold text-amber-500 mr-2">
                  Tier {hint.tier}:
                </span>
                {hint.text}
              </div>
            ))}
          </div>

          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 font-mono text-[11px] h-7 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              onClick={() => setUnlockedTier((t) => t + 1)}
            >
              Unlock Tier {unlockedTier + 1} Hint →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
