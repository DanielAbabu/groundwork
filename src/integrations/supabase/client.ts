import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  // Check all possible client and server environment variable names
  const SUPABASE_URL =
    (typeof process !== "undefined" && process.env?.["VITE_SUPABASE_URL"]) ||
    (typeof process !== "undefined" && process.env?.["SUPABASE_URL"]) ||
    import.meta.env["VITE_SUPABASE_URL"] ||
    "https://placeholder.supabase.co";

  const SUPABASE_KEY =
    (typeof process !== "undefined" && process.env?.["VITE_SUPABASE_ANON_KEY"]) ||
    (typeof process !== "undefined" && process.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"]) ||
    (typeof process !== "undefined" && process.env?.["SUPABASE_ANON_KEY"]) ||
    (typeof process !== "undefined" && process.env?.["SUPABASE_PUBLISHABLE_KEY"]) ||
    import.meta.env["VITE_SUPABASE_ANON_KEY"] ||
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    "placeholder-key";

  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_KEY),
    },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: typeof window !== "undefined",
      autoRefreshToken: typeof window !== "undefined",
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
