import { useState } from "react";
import type { LogLine, SignalPanel as SignalPanelType, TraceSpan } from "@/lib/scenarios/types";

interface SignalPanelProps {
  signal: string | SignalPanelType;
}

const LEVEL_CLASSES: Record<LogLine["level"], string> = {
  ERROR: "bg-sev1/20 text-sev1 border-sev1/40",
  WARN: "bg-sev2/20 text-sev2 border-sev2/40",
  INFO: "bg-primary/10 text-primary border-primary/30",
  DEBUG: "bg-muted text-muted-foreground border-border",
};

export function SignalPanel({ signal }: SignalPanelProps) {
  const isStructured = typeof signal === "object";
  const stackTrace = isStructured ? signal.stackTrace : signal;
  const logs = isStructured ? (signal.logs ?? []) : [];
  const trace = isStructured ? signal.trace : undefined;

  const [subTab, setSubTab] = useState<"trace" | "logs" | "spans">("trace");

  return (
    <div className="flex flex-col h-full">
      {isStructured && (logs.length > 0 || trace) && (
        <div className="flex border-b border-border bg-background mb-3 rounded overflow-hidden text-[11px] font-mono">
          <button
            onClick={() => setSubTab("trace")}
            className={`flex-1 py-1.5 px-2 text-center transition-colors ${
              subTab === "trace"
                ? "bg-secondary text-foreground font-semibold border-b-2 border-amber-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Stack Trace
          </button>
          {logs.length > 0 && (
            <button
              onClick={() => setSubTab("logs")}
              className={`flex-1 py-1.5 px-2 text-center transition-colors ${
                subTab === "logs"
                  ? "bg-secondary text-foreground font-semibold border-b-2 border-amber-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Logs ({logs.length})
            </button>
          )}
          {trace && (
            <button
              onClick={() => setSubTab("spans")}
              className={`flex-1 py-1.5 px-2 text-center transition-colors ${
                subTab === "spans"
                  ? "bg-secondary text-foreground font-semibold border-b-2 border-amber-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Trace Span
            </button>
          )}
        </div>
      )}

      {subTab === "trace" && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            failing signal
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-3 font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {stackTrace}
          </pre>
        </div>
      )}

      {subTab === "logs" && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            recent log stream
          </p>
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {logs.map((log, i) => (
              <div
                key={i}
                className="rounded border border-border bg-background p-2 font-mono text-[11px]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{log.ts}</span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                      LEVEL_CLASSES[log.level]
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-foreground font-medium">{log.service}:</span>
                  <span className="text-muted-foreground">{log.msg}</span>
                </div>
                {log.fields && Object.keys(log.fields).length > 0 && (
                  <pre className="mt-1.5 rounded bg-surface p-1.5 text-[10px] text-muted-foreground overflow-x-auto">
                    {JSON.stringify(log.fields, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === "spans" && trace && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            distributed trace waterfall
          </p>
          <div className="mt-2 rounded border border-border bg-background p-3">
            <TraceNode span={trace} totalMs={trace.durationMs} depth={0} />
          </div>
        </div>
      )}
    </div>
  );
}

function TraceNode({ span, totalMs, depth }: { span: TraceSpan; totalMs: number; depth: number }) {
  const percent = Math.max(5, Math.min(100, (span.durationMs / (totalMs || 1)) * 100));
  const isError = span.status === "error" || span.status === "timeout";

  return (
    <div className="space-y-1 my-1" style={{ paddingLeft: depth * 12 }}>
      <div className="flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-1.5 truncate">
          <span
            className={`inline-block h-2 w-2 rounded-full ${isError ? "bg-sev1" : "bg-pass"}`}
          />
          <span className="font-medium text-foreground truncate">{span.name}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{span.durationMs}ms</span>
      </div>
      <div className="h-1.5 w-full rounded bg-surface overflow-hidden">
        <div
          className={`h-full rounded ${isError ? "bg-sev1" : "bg-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {span.children?.map((child, i) => (
        <TraceNode key={i} span={child} totalMs={totalMs} depth={depth + 1} />
      ))}
    </div>
  );
}
