import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getDesignScenario } from "@/content/design";
import { STAGE_KIND_LABELS } from "@/lib/design/types";
import type {
  CapacityAnswer,
  ClarifyAnswer,
  ComponentsAnswer,
  DesignStage,
  StageAnswer,
  StageGrade,
} from "@/lib/design/types";
import { listDesignResults, submitDesignStage, type DesignStageRow } from "@/lib/design.functions";
import { evaluateFormula } from "@/lib/design/formula-eval";
import { detectSpofs, estimateGraphLatency } from "@/lib/design/graph-grading";
import { LatencyBar } from "@/components/design/LatencyBar";
import { ComponentCanvas } from "@/components/design/ComponentCanvas";
import { ProblemBar } from "@/components/ProblemBar";
import { VerticalStepper } from "@/components/design/VerticalStepper";
import { StakeholderChat } from "@/components/design/StakeholderChat";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/design/$slug")({
  loader: ({ params }) => {
    const scenario = getDesignScenario(params.slug);
    if (!scenario) throw notFound();
    return { scenarioId: scenario.id, title: scenario.title, summary: scenario.summary };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const title = `Design Review — ${loaderData.title}`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.summary },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DesignRoom,
});

function emptyAnswer(stage: DesignStage): StageAnswer {
  switch (stage.kind) {
    case "clarify":
      return {} as ClarifyAnswer;
    case "capacity":
      return Object.fromEntries(stage.fields.map((f) => [f.id, null])) as CapacityAnswer;
    case "components":
      return { nodes: [], edges: [] } as ComponentsAnswer;
    case "tradeoff":
      return { text: "" };
  }
}

function DesignRoom() {
  const { scenarioId } = Route.useLoaderData();
  const scenario = getDesignScenario(scenarioId)!;
  const queryClient = useQueryClient();
  const fetchResults = useServerFn(listDesignResults);
  const submit = useServerFn(submitDesignStage);

  const { data: results } = useQuery<DesignStageRow[]>({
    queryKey: ["design-results"],
    queryFn: () => fetchResults(),
  });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StageAnswer>>(() =>
    Object.fromEntries(scenario.stages.map((stage) => [stage.id, emptyAnswer(stage)])),
  );
  const [grades, setGrades] = useState<Record<string, StageGrade>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const stage = scenario.stages[index]!;
  const grade = grades[stage.id];

  const savedPassed = useMemo(() => {
    const set = new Set<string>();
    for (const row of results ?? []) {
      if (row.scenario_id === scenario.id && row.passed) set.add(row.stage_id);
    }
    return set;
  }, [results, scenario.id]);

  const setAnswer = (next: StageAnswer) => setAnswers((prev) => ({ ...prev, [stage.id]: next }));

  async function onSubmit() {
    setSubmitting(true);
    try {
      const result = await submit({
        data: { scenarioId: scenario.id, stageId: stage.id, answer: answers[stage.id] },
      });
      setGrades((prev) => ({ ...prev, [stage.id]: result }));
      queryClient.invalidateQueries({ queryKey: ["design-results"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      toast[result.passed ? "success" : "error"](
        result.passed
          ? `${STAGE_KIND_LABELS[stage.kind]} stage cleared`
          : `${STAGE_KIND_LABELS[stage.kind]} stage needs another pass`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not grade that submission");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col bg-background overflow-hidden">
      {/* ── Problem Bar ── */}
      <ProblemBar
        title={scenario.title}
        backTo="/design"
        backLabel="Design Reviews"
        difficulty={scenario.difficulty}
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSummary((v) => !v)}
              className={`rounded border px-3 py-1 font-mono text-xs transition-colors ${
                showSummary
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {showSummary ? "← Back to Stage" : "Review Scorecard"}
            </button>
            {!showSummary && (
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="submit-btn flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? "Grading…" : "Submit Stage"}
              </button>
            )}
          </div>
        }
      />

      {showSummary ? (
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="mx-auto max-w-4xl">
            <Summary
              grades={grades}
              savedPassed={savedPassed}
              onJump={(i) => {
                setIndex(i);
                setShowSummary(false);
              }}
              scenarioId={scenario.id}
            />
          </div>
        </div>
      ) : (
        /* ── Full-Viewport 2-Panel Workspace ── */
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left Panel: Pipeline Stepper & Prompt (340px) ── */}
          <aside className="w-85 shrink-0 flex flex-col border-r border-border bg-[#161616] overflow-hidden">
            {/* Header info */}
            <div className="p-4 border-b border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {scenario.system}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Step {index + 1} of {scenario.stages.length}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                Stakeholder:{" "}
                <span className="text-foreground font-semibold">{scenario.stakeholder}</span> (
                {scenario.stakeholderRole})
              </p>
            </div>

            {/* Vertical Stepper */}
            <div className="border-b border-border bg-[#121212]">
              <VerticalStepper
                stages={scenario.stages}
                currentStageIndex={index}
                completedStageIds={savedPassed}
                onSelectStage={(idx) => {
                  setIndex(idx);
                  setShowSummary(false);
                }}
              />
            </div>

            {/* Stage Prompt & Context */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  Stage Goal
                </p>
                <h3 className="text-sm font-semibold text-foreground">{stage.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {stage.prompt}
                </p>
              </div>

              <div className="rounded border border-border bg-card p-3 space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  System Context
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{scenario.framing}</p>
              </div>

              {grade && (
                <div
                  className={`rounded border p-3 font-mono text-xs space-y-1 ${
                    grade.passed
                      ? "border-pass/40 bg-pass/10 text-pass"
                      : "border-fail/40 bg-fail/10 text-fail"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Stage Status</span>
                    <span>{Math.round(grade.score * 100)}%</span>
                  </div>
                  <p className="text-[11px] font-normal">
                    {grade.passed ? "✓ Stage cleared!" : "Needs adjustment before advancing."}
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* ── Right Panel: Stage Workspace Canvas / Interactive UI ── */}
          <section className="flex flex-1 flex-col overflow-hidden bg-background">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {stage.kind === "clarify" && (
                <StakeholderChat
                  questions={stage.questions}
                  answers={answers[stage.id] as ClarifyAnswer}
                  onAnswerChange={(qId, cId) =>
                    setAnswer({ ...(answers[stage.id] as ClarifyAnswer), [qId]: cId })
                  }
                  stakeholderName={scenario.stakeholder}
                  stakeholderRole={scenario.stakeholderRole}
                />
              )}

              {stage.kind === "capacity" && (
                <CapacityStage
                  stage={stage}
                  answer={answers[stage.id] as CapacityAnswer}
                  onChange={setAnswer}
                />
              )}

              {stage.kind === "components" && (
                <ComponentsStage
                  stage={stage}
                  answer={answers[stage.id] as ComponentsAnswer}
                  onChange={setAnswer}
                />
              )}

              {stage.kind === "tradeoff" && (
                <TradeoffStage
                  stage={stage}
                  answer={answers[stage.id] as { text: string }}
                  onChange={setAnswer}
                  grade={grade}
                />
              )}

              {/* Feedback rules list */}
              {grade && <FeedbackList grade={grade} />}
            </div>

            {/* Bottom navigation bar */}
            <div className="flex shrink-0 items-center justify-between border-t border-border bg-[#161616] px-6 py-3">
              <div className="flex items-center gap-2">
                <button
                  disabled={index === 0}
                  onClick={() => setIndex((i) => i - 1)}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous Stage
                </button>
              </div>

              <div className="flex items-center gap-3">
                {index < scenario.stages.length - 1 ? (
                  <button
                    onClick={() => setIndex((i) => i + 1)}
                    className="font-mono text-xs text-foreground hover:text-primary transition-colors"
                  >
                    Next Stage →
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSummary(true)}
                    className="font-mono text-xs font-bold text-pass hover:underline"
                  >
                    See Final Scorecard 🏆
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const RULE_LABELS: Record<string, string> = {
  schema: "type system",
  "required-node": "required component",
  "required-edge": "required connection",
  instances: "instance count",
  "forbidden-node": "anti-pattern component",
  "forbidden-edge": "anti-pattern connection",
  answer: "answer",
};

function FeedbackList({ grade }: { grade: StageGrade }) {
  const failing = grade.feedback.filter((item) => item.ok !== true);
  const passing = grade.feedback.filter((item) => item.ok === true);

  return (
    <div className="mt-6 space-y-3 border-t border-border pt-6">
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Grading Feedback ({passing.length}/{grade.feedback.length} rules passed)
      </p>
      <div className="space-y-2.5">
        {[...failing, ...passing].map((item, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3.5 ${
              item.ok === true
                ? "border-pass/25 bg-pass/5"
                : item.ok === "partial"
                  ? "border-primary/30 bg-primary/5"
                  : "border-fail/30 bg-fail/5"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  item.ok === true
                    ? "bg-pass/15 text-pass"
                    : item.ok === "partial"
                      ? "bg-primary/15 text-primary"
                      : "bg-fail/15 text-fail"
                }`}
              >
                {item.ok === true ? "PASS" : item.ok === "partial" ? "PARTIAL" : "FAIL"}
              </span>
              {item.rule && (
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {RULE_LABELS[item.rule] ?? item.rule}
                </span>
              )}
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </div>
            {item.targets && item.targets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.targets.map((target) => (
                  <span
                    key={target}
                    className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    {target}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
            {item.fix && (
              <p className="mt-1.5 border-l-2 border-primary/50 pl-2.5 font-mono text-[11px] text-primary">
                Fix: {item.fix}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CapacityStage({
  stage,
  answer,
  onChange,
}: {
  stage: Extract<DesignStage, { kind: "capacity" }>;
  answer: CapacityAnswer;
  onChange: (next: CapacityAnswer) => void;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of stage.fields) {
      const val = answer[field.id];
      initial[field.id] = val != null ? String(val) : "";
    }
    return initial;
  });

  const handleInputChange = (fieldId: string, rawText: string) => {
    setInputs((prev) => ({ ...prev, [fieldId]: rawText }));
    const evalResult = evaluateFormula(rawText);
    onChange({
      ...answer,
      [fieldId]: evalResult.value,
    });
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {stage.fields.map((field) => {
        const rawText = inputs[field.id] ?? "";
        const evalResult = evaluateFormula(rawText);
        const hasValue = evalResult.value != null;
        const invalid = evalResult.error != null || (hasValue && evalResult.value! < 0);

        return (
          <div key={field.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <label className="text-sm font-semibold text-foreground block" htmlFor={field.id}>
              {field.label}
            </label>
            {field.formula ? (
              <p className="font-mono text-[11px] text-primary/80 bg-primary/5 px-2.5 py-1 rounded border border-primary/20">
                Formula: <span className="text-primary font-bold">{field.formula}</span>
              </p>
            ) : field.unit ? (
              <p className="font-mono text-[11px] text-muted-foreground">Unit: {field.unit}</p>
            ) : null}

            <Input
              id={field.id}
              type="text"
              placeholder={field.formula ? "e.g. 500 * 86400 or 1000/2" : `e.g. 100`}
              value={rawText}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className="font-mono text-xs"
            />

            {invalid && rawText.trim() !== "" && (
              <p className="font-mono text-[10px] text-fail">Invalid formula expression</p>
            )}

            {hasValue && !invalid && (
              <div className="flex items-center justify-between rounded bg-background px-3 py-1.5 border border-border">
                <span className="font-mono text-[10px] text-muted-foreground">Computed:</span>
                <span className="font-mono text-xs font-bold text-pass">
                  {evalResult.value!.toLocaleString()} {field.unit ?? ""}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ComponentsStage({
  stage: _stage,
  answer,
  onChange,
}: {
  stage: Extract<DesignStage, { kind: "components" }>;
  answer: ComponentsAnswer;
  onChange: (next: ComponentsAnswer) => void;
}) {
  const spofs = useMemo(
    () => detectSpofs({ nodes: answer.nodes, edges: answer.edges }),
    [answer.nodes, answer.edges],
  );
  const latency = useMemo(
    () => estimateGraphLatency({ nodes: answer.nodes, edges: answer.edges }),
    [answer.nodes, answer.edges],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
        <div>
          <h4 className="font-semibold text-foreground text-sm">
            System Resilience & Latency Analysis
          </h4>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            {spofs.length === 0 ? (
              <span className="text-pass font-semibold">✓ No Single Points of Failure</span>
            ) : (
              <span className="text-fail font-semibold">
                ⚠️ {spofs.length} Single Point(s) of Failure detected
              </span>
            )}
          </p>
        </div>

        {latency.hops.length > 0 && (
          <div className="w-64">
            <LatencyBar estimate={latency} />
          </div>
        )}
      </div>

      <div className="h-[520px] rounded-lg border border-border overflow-hidden">
        <ComponentCanvas
          nodes={answer.nodes}
          edges={answer.edges}
          onChange={(next) => onChange(next)}
        />
      </div>
    </div>
  );
}

function TradeoffStage({
  stage,
  answer,
  onChange,
  grade,
}: {
  stage: Extract<DesignStage, { kind: "tradeoff" }>;
  answer: { text: string };
  onChange: (next: { text: string }) => void;
  grade: StageGrade | undefined;
}) {
  return (
    <div className="space-y-4">
      <p className="rounded border border-primary/30 bg-primary/5 p-3 font-mono text-xs text-primary">
        Advisory Stage: Defend one architectural trade-off accepted in your canvas design.
      </p>
      <Textarea
        rows={9}
        value={answer.text}
        onChange={(event) => onChange({ text: event.target.value })}
        placeholder="Explain the trade-off you are accepting (e.g. eventual consistency over strong consistency) and how you mitigate the risks..."
        className="font-mono text-xs"
      />
      {grade && (
        <details className="rounded border border-border bg-card p-4">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-primary font-bold">
            💡 What a Staff-Level Answer Covers
          </summary>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{stage.ideal}</p>
        </details>
      )}
    </div>
  );
}

function Summary({
  grades,
  savedPassed,
  onJump,
  scenarioId,
}: {
  grades: Record<string, StageGrade>;
  savedPassed: Set<string>;
  onJump: (index: number) => void;
  scenarioId: string;
}) {
  const scenario = getDesignScenario(scenarioId)!;
  const cleared = scenario.stages.filter(
    (stage) => grades[stage.id]?.passed ?? savedPassed.has(stage.id),
  ).length;

  const pct = Math.round((cleared / scenario.stages.length) * 100);
  const hiringSignal =
    pct >= 85
      ? { label: "STRONG HIRE", color: "text-pass border-pass/40 bg-pass/10" }
      : pct >= 70
        ? { label: "HIRE", color: "text-primary border-primary/40 bg-primary/10" }
        : pct >= 50
          ? { label: "BORDERLINE", color: "text-medium border-medium/40 bg-medium/10" }
          : { label: "NO HIRE", color: "text-fail border-fail/40 bg-fail/10" };

  return (
    <section className="rounded-lg border border-border bg-card p-6 space-y-6 slide-up">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
            Submission Summary
          </span>
          <h2 className="text-xl font-bold text-foreground mt-1">{scenario.title}</h2>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            Stakeholder: {scenario.stakeholder} ({scenario.stakeholderRole})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="font-mono text-xs text-muted-foreground block">Overall Score</span>
            <span className="font-mono text-2xl font-extrabold text-foreground">{pct}%</span>
          </div>
          <span
            className={`rounded border px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest ${hiringSignal.color}`}
          >
            {hiringSignal.label}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Stage Performance Breakdown
        </h3>

        <ul className="space-y-3">
          {scenario.stages.map((stage, i) => {
            const grade = grades[stage.id];
            const passed = grade?.passed ?? savedPassed.has(stage.id);
            return (
              <li
                key={stage.id}
                className="rounded-lg border border-border bg-background p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {i + 1}. {stage.title} ({STAGE_KIND_LABELS[stage.kind]})
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${
                      passed
                        ? "border-pass/30 bg-pass/10 text-pass"
                        : grade
                          ? "border-fail/30 bg-fail/10 text-fail"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {passed ? "Cleared ✓" : grade ? "Needs Pass" : "Not Submitted"}
                  </span>
                </div>

                {stage.kind === "tradeoff" && grade && (
                  <p className="text-xs leading-relaxed text-muted-foreground border-l-2 border-primary/40 pl-2 mt-2">
                    Ideal Answer Strategy: {stage.ideal}
                  </p>
                )}

                {stage.kind === "capacity" && grade && (
                  <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground bg-card p-2.5 rounded border border-border">
                    {stage.fields.map((field) => (
                      <li key={field.id}>
                        <span className="font-semibold text-foreground">{field.label}:</span> Target
                        range {field.accept.min}–{field.accept.max} {field.unit} — {field.rationale}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="pt-1">
                  <button
                    onClick={() => onJump(i)}
                    className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline font-semibold"
                  >
                    ← Revisit Stage {i + 1}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {scenario.debrief && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-primary/20 pb-3">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
              🧠 Staff Engineer Narrative Debrief
            </span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-foreground">
            <p className="font-medium text-muted-foreground">{scenario.debrief.narrative}</p>

            {scenario.debrief.seniorInsights.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-pass block">
                  💡 Senior Engineering Trade-offs Raised Unprompted:
                </span>
                <ul className="space-y-1 font-mono text-[11px] text-muted-foreground pl-2">
                  {scenario.debrief.seniorInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-pass font-bold">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {scenario.debrief.commonMistakes.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-fail block">
                  ⚠️ Common Candidate Pitfalls:
                </span>
                <ul className="space-y-1 font-mono text-[11px] text-muted-foreground pl-2">
                  {scenario.debrief.commonMistakes.map((mistake, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-fail font-bold">•</span>
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
