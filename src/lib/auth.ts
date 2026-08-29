import { supabase } from "@/integrations/supabase/client";
import type { AnyRouter } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

export async function handleSignOut(router: AnyRouter, queryClient?: QueryClient) {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Sign out error:", error);
  } finally {
    if (queryClient) {
      queryClient.clear();
    }
    await router.navigate({ to: "/" });
  }
}
