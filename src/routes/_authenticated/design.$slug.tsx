import { createFileRoute, Link, notFound } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
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

  const wide = stage.kind === "components" && !showSummary;
  const shellWidth = wide ? "max-w-[1700px]" : "max-w-5xl";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/60">
        <div
          className={`mx-auto flex ${shellWidth} flex-wrap items-center justify-between gap-4 px-6 py-5`}
        >
          <div>
            <Link
              to="/design"
              className="font-mono text-xs uppercase tracking-[0.3em] text-primary"
            >
              ← design review
            </Link>
            <h1 className="mt-2 text-lg font-semibold text-foreground">
              Design Review — {scenario.system}, presenting to {scenario.stakeholder}
            </h1>
            <p className="font-mono text-xs text-muted-foreground">
              {scenario.stakeholder} · {scenario.stakeholderRole}
            </p>
          </div>
          <span className="rounded border border-primary/40 px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary">
            Stage {index + 1} of {scenario.stages.length}
          </span>
        </div>
      </header>

      <div className={`mx-auto ${shellWidth} px-6 py-8`}>
        {!wide && (
          <p className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            {scenario.framing}
          </p>
        )}

        <ol className="mt-2 flex flex-wrap gap-2">
          {scenario.stages.map((item, i) => {
            const cleared = grades[item.id]?.passed ?? savedPassed.has(item.id);
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setIndex(i);
                    setShowSummary(false);
                  }}
                  className={`rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    i === index && !showSummary
                      ? "border-primary text-primary"
                      : cleared
                        ? "border-pass/40 text-pass"
                        : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {i + 1}. {STAGE_KIND_LABELS[item.kind]}
                  {cleared ? " ✓" : ""}
                </button>
              </li>
            );
          })}
        </ol>

        {showSummary ? (
          <Summary
            grades={grades}
            savedPassed={savedPassed}
            onJump={(i) => {
              setIndex(i);
              setShowSummary(false);
            }}
            scenarioId={scenario.id}
          />
        ) : (
          <section className="mt-6 rounded-lg border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">{stage.title}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              {stage.prompt}
            </p>

            <div className="mt-6">
              {stage.kind === "clarify" && (
                <ClarifyStage
                  stage={stage}
                  answer={answers[stage.id] as ClarifyAnswer}
                  onChange={setAnswer}
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
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
              <Button onClick={onSubmit} disabled={submitting} className="font-mono">
                {submitting ? "Grading…" : "Submit stage"}
              </Button>
              {index > 0 && (
                <Button variant="outline" className="font-mono" onClick={() => setIndex(index - 1)}>
                  Back
                </Button>
              )}
              {index < scenario.stages.length - 1 ? (
                <Button variant="outline" className="font-mono" onClick={() => setIndex(index + 1)}>
                  Next stage
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="font-mono"
                  onClick={() => setShowSummary(true)}
                >
                  See review summary
                </Button>
              )}
              {grade && (
                <span
                  className={`ml-auto font-mono text-xs uppercase tracking-widest ${grade.passed ? "text-pass" : "text-fail"}`}
                >
                  {grade.advisory ? "advisory · " : ""}
                  {Math.round(grade.score * 100)}% · {grade.passed ? "cleared" : "not yet"}
                </span>
              )}
            </div>

            {grade && <FeedbackList grade={grade} />}
          </section>
        )}
      </div>
    </main>
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
    <div className="mt-6 space-y-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {passing.length} of {grade.feedback.length} rules satisfied
      </p>
      {[...failing, ...passing].map((item, i) => (
        <div
          key={i}
          className={`rounded-lg border p-4 ${
            item.ok === true
              ? "border-pass/25 bg-pass/5"
              : item.ok === "partial"
                ? "border-primary/30 bg-primary/5"
                : "border-fail/30 bg-fail/5"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${
                item.ok === true
                  ? "bg-pass/15 text-pass"
                  : item.ok === "partial"
                    ? "bg-primary/15 text-primary"
                    : "bg-fail/15 text-fail"
              }`}
            >
              {item.ok === true ? "pass" : item.ok === "partial" ? "partial" : "fail"}
            </span>
            {item.rule && (
              <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {RULE_LABELS[item.rule] ?? item.rule}
              </span>
            )}
            <span className="text-sm font-medium text-foreground">{item.label}</span>
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
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
          {item.fix && (
            <p className="mt-2 border-l-2 border-primary/50 pl-3 font-mono text-[11px] leading-relaxed text-primary">
              fix: {item.fix}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ClarifyStage({
  stage,
  answer,
  onChange,
}: {
  stage: Extract<DesignStage, { kind: "clarify" }>;
  answer: ClarifyAnswer;
  onChange: (next: ClarifyAnswer) => void;
}) {
  return (
    <div className="space-y-6">
      {stage.questions.map((question) => {
        const selectedId = answer[question.id];
        const selectedOption = question.options.find((opt) => opt.id === selectedId);

        return (
          <div key={question.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 font-mono text-xs font-bold">
                💬
              </div>
              <p className="text-sm leading-relaxed text-foreground font-medium pt-0.5">
                {question.text}
              </p>
            </div>

            <div className="pl-10 space-y-2">
              {question.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded border p-3 text-sm transition-all ${
                    selectedId === option.id
                      ? "border-primary bg-primary/10 text-foreground font-medium shadow-sm"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-1 accent-primary"
                    name={question.id}
                    checked={selectedId === option.id}
                    onChange={() => onChange({ ...answer, [question.id]: option.id })}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            {selectedOption?.followUp && (
              <div className="ml-10 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-amber-500">
                    Stakeholder Reaction
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-foreground italic">
                  "{selectedOption.followUp}"
                </p>
              </div>
            )}
          </div>
        );
      })}
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
          <div key={field.id} className="rounded-lg border border-border bg-background p-4 space-y-2">
            <label className="text-sm font-semibold text-foreground block" htmlFor={field.id}>
              {field.label}
            </label>
            {field.formula ? (
              <p className="font-mono text-[11px] text-primary/80 bg-primary/5 px-2 py-1 rounded border border-primary/20">
                Formula: <span className="text-primary font-bold">{field.formula}</span>
              </p>
            ) : field.hint ? (
              <p className="font-mono text-[11px] text-muted-foreground">hint: {field.hint}</p>
            ) : null}

            <div className="flex items-center gap-2 pt-1">
              <Input
                id={field.id}
                type="text"
                className="font-mono text-sm"
                placeholder="e.g. 50,000,000 / 86,400"
                value={rawText}
                onChange={(event) => handleInputChange(field.id, event.target.value)}
              />
              <span className="font-mono text-xs text-muted-foreground shrink-0">{field.unit}</span>
            </div>

            {rawText && evalResult.isFormula && evalResult.value != null && (
              <div className="flex items-center justify-between font-mono text-xs px-2 py-1 rounded bg-secondary/40 text-foreground">
                <span className="text-muted-foreground text-[11px]">Calculated:</span>
                <span className="font-semibold text-primary">
                  {evalResult.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} {field.unit}
                </span>
              </div>
            )}

            {hasValue && !invalid && (
              <div className="pt-1">
                {evalResult.value! >= field.accept.min && evalResult.value! <= field.accept.max ? (
                  <span className="font-mono text-[10px] font-bold text-pass border border-pass/30 bg-pass/10 px-2 py-0.5 rounded block">
                    ✓ Within target range
                  </span>
                ) : evalResult.value! >= field.magnitude.min && evalResult.value! <= field.magnitude.max ? (
                  <span className="font-mono text-[10px] font-bold text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded block">
                    ⚠️ Acceptable order of magnitude (slightly off target)
                  </span>
                ) : (
                  <span className="font-mono text-[10px] font-bold text-fail border border-fail/30 bg-fail/10 px-2 py-0.5 rounded block">
                    ⚡ Order of magnitude error — check units or math
                  </span>
                )}
              </div>
            )}

            {invalid && (
              <p className="font-mono text-[11px] text-fail">
                {evalResult.error ?? "Enter a valid positive calculation."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ComponentsStage({
  stage,
  answer,
  onChange,
}: {
  stage: Extract<DesignStage, { kind: "components" }>;
  answer: ComponentsAnswer;
  onChange: (next: ComponentsAnswer) => void;
}) {
  const spofs = useMemo(() => detectSpofs(answer), [answer]);
  const latencyEstimate = useMemo(() => estimateGraphLatency(answer), [answer]);

  return (
    <div className="space-y-4">
      <ComponentCanvas
        palette={stage.spec.palette}
        value={answer}
        onChange={(graph) => onChange(graph)}
      />

      <LatencyBar estimate={latencyEstimate} />

      {spofs.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-500">
              ⚠️ Architecture Resilience Warning — Single Point of Failure
            </span>
          </div>
          <ul className="space-y-1 pl-2">
            {spofs.map((spof, idx) => (
              <li key={idx} className="font-mono text-xs text-foreground flex items-center gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{spof.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
      <p className="rounded border border-primary/30 bg-primary/5 p-3 font-mono text-[11px] text-primary">
        Advisory stage: prose gets rubric-based feedback, not a precise score.
      </p>
      <Textarea
        rows={8}
        value={answer.text}
        onChange={(event) => onChange({ text: event.target.value })}
        placeholder="Explain the trade-off you're accepting and how you'd handle it…"
        className="font-mono text-sm"
      />
      {grade && (
        <details className="rounded border border-border bg-background p-4">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-primary">
            what a strong answer looked like
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{stage.ideal}</p>
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
          ? { label: "BORDERLINE", color: "text-amber-500 border-amber-500/40 bg-amber-500/10" }
          : { label: "NO HIRE", color: "text-fail border-fail/40 bg-fail/10" };

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
            System Design Review Scorecard
          </span>
          <h2 className="text-xl font-bold text-foreground mt-1">
            {scenario.title}
          </h2>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            Stakeholder: {scenario.stakeholder} ({scenario.stakeholderRole})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="font-mono text-xs text-muted-foreground block">Overall Score</span>
            <span className="font-mono text-lg font-bold text-foreground">{pct}%</span>
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
              <li key={stage.id} className="rounded-lg border border-border bg-background p-4 space-y-2">
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
                        <span className="font-semibold text-foreground">{field.label}:</span> Target range {field.accept.min}–{field.accept.max} {field.unit} — {field.rationale}
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
                  💡 Things a Senior Engineer Raises Unprompted:
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
