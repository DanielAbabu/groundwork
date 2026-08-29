import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

export type NudgeRow = {
  id: string;
  message: string;
  created_at: string;
  from_user_id: string;
  to_user_id: string;
  counterpart: PublicProfile | null;
  direction: "received" | "sent";
};

export type ActivityDay = { day: string; runs: number; passes: number };

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PublicProfile> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { id: context.userId, username: null, display_name: null };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        username: z
          .string()
          .min(3)
          .max(24)
          .regex(/^[a-zA-Z0-9_]+$/, "letters, numbers and underscore only"),
        displayName: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PublicProfile> => {
    const { data: saved, error } = await context.supabase
      .from("profiles")
      .update({
        username: data.username.toLowerCase(),
        ...(data.displayName !== undefined ? { display_name: data.displayName } : {}),
      })
      .eq("id", context.userId)
      .select("id, username, display_name")
      .single();
    if (error) {
      throw new Error(
        error.code === "23505" || error.message.includes("duplicate")
          ? "That username is taken."
          : error.message,
      );
    }
    return saved;
  });

export const searchUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ query: z.string() }).parse(input))
  .handler(async ({ data, context }): Promise<PublicProfile[]> => {
    const term = data.query.trim();
    if (term.length < 2) return [];
    const { data: rows, error } = await context.supabase
      .from("profiles")
      .select("id, username, display_name")
      .ilike("username", `%${term}%`)
      .neq("id", context.userId)
      .limit(10);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const sendNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ toUserId: z.string().uuid(), message: z.string().max(140).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("nudges").insert({
      from_user_id: context.userId,
      to_user_id: data.toUserId,
      message: data.message?.trim() || "Your pager is ringing — get back on call!",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listNudges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NudgeRow[]> => {
    const { data, error } = await context.supabase
      .from("nudges")
      .select("id, message, created_at, from_user_id, to_user_id")
      .or(`from_user_id.eq.${context.userId},to_user_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const ids = Array.from(
      new Set(
        rows.map((row) =>
          row.from_user_id === context.userId ? row.to_user_id : row.from_user_id,
        ),
      ),
    );
    let profiles: PublicProfile[] = [];
    if (ids.length > 0) {
      const { data: people } = await context.supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", ids);
      profiles = people ?? [];
    }
    const byId = new Map(profiles.map((p) => [p.id, p]));
    return rows.map((row) => {
      const sent = row.from_user_id === context.userId;
      return {
        ...row,
        direction: sent ? ("sent" as const) : ("received" as const),
        counterpart: byId.get(sent ? row.to_user_id : row.from_user_id) ?? null,
      };
    });
  });

export const dismissNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("nudges").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityDay[]> => {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 364).toISOString();
    const { data, error } = await context.supabase
      .from("scenario_runs")
      .select("passed, created_at")
      .eq("user_id", context.userId)
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    const byDay = new Map<string, ActivityDay>();
    for (const row of data ?? []) {
      const day = row.created_at.slice(0, 10);
      const entry = byDay.get(day) ?? { day, runs: 0, passes: 0 };
      entry.runs += 1;
      if (row.passed) entry.passes += 1;
      byDay.set(day, entry);
    }
    return Array.from(byDay.values());
  });
