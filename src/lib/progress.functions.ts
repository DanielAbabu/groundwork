import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProgressRow = {
  scenario_id: string;
  status: string;
  attempts: number;
  first_passed_at: string | null;
};

export const listProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgressRow[]> => {
    const { data, error } = await context.supabase
      .from("scenario_progress")
      .select("scenario_id, status, attempts, first_passed_at")
      .eq("user_id", context.userId)
      .eq("track", "debugging");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const recordRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ scenarioId: z.string().min(1), passed: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ProgressRow> => {
    await context.supabase
      .from("scenario_runs")
      .insert({ user_id: context.userId, scenario_id: data.scenarioId, passed: data.passed, track: "debugging" });

    const { data: existing } = await context.supabase
      .from("scenario_progress")
      .select("scenario_id, status, attempts, first_passed_at")
      .eq("user_id", context.userId)
      .eq("scenario_id", data.scenarioId)
      .maybeSingle();


    const attempts = (existing?.attempts ?? 0) + 1;
    const alreadyPassed = existing?.status === "passed";
    const row = {
      user_id: context.userId,
      scenario_id: data.scenarioId,
      track: "debugging",
      status: data.passed || alreadyPassed ? "passed" : "attempted",
      attempts,
      first_passed_at:
        existing?.first_passed_at ?? (data.passed ? new Date().toISOString() : null),
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await context.supabase
      .from("scenario_progress")
      .upsert(row, { onConflict: "user_id,scenario_id" })
      .select("scenario_id, status, attempts, first_passed_at")
      .single();
    if (error) throw new Error(error.message);
    return saved;
  });
