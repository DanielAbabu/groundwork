import type { AssertionDiff } from "@/lib/sandbox/worker";

interface DiffBlockProps {
  diff?: AssertionDiff | undefined;
  fallbackMessage?: string | undefined;
}

export function DiffBlock({ diff, fallbackMessage }: DiffBlockProps) {
  if (!diff) {
    return (
      <pre className="mt-2 text-[11px] text-muted-foreground whitespace-pre-wrap">
        {fallbackMessage}
      </pre>
    );
  }

  if (diff.kind === "value") {
    return (
      <div className="mt-2 rounded bg-background p-2 font-mono text-[11px] space-y-1">
        <div className="text-pass bg-pass/10 px-1.5 py-0.5 rounded">
          <span className="font-bold mr-1.5">- Expected:</span>
          {diff.expected}
        </div>
        <div className="text-sev1 bg-sev1/10 px-1.5 py-0.5 rounded">
          <span className="font-bold mr-1.5">+ Received:</span>
          {diff.received}
        </div>
      </div>
    );
  }

  if (diff.kind === "object") {
    return (
      <div className="mt-2 rounded bg-background p-2 font-mono text-[11px] space-y-0.5 overflow-x-auto">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          Object Difference
        </div>
        {diff.diff.map((line, idx) => {
          const isAdd = line.startsWith("+");
          const isSub = line.startsWith("-");
          return (
            <div
              key={idx}
              className={`px-1 rounded whitespace-pre ${
                isSub
                  ? "bg-pass/15 text-pass font-semibold"
                  : isAdd
                    ? "bg-sev1/15 text-sev1 font-semibold"
                    : "text-muted-foreground opacity-80"
              }`}
            >
              {line}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <pre className="mt-2 text-[11px] text-muted-foreground whitespace-pre-wrap">
      {diff.text || fallbackMessage}
    </pre>
  );
}
