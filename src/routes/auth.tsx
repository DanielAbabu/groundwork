import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Groundwork" },
      {
        name: "description",
        content:
          "Sign in to Groundwork to get paged into broken codebases and track resolved challenges.",
      },
      { property: "og:title", content: "Sign in — Groundwork" },
      {
        property: "og:description",
        content:
          "Sign in to Groundwork to get paged into broken codebases and track resolved challenges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/incidents` },
        });
        if (error) throw error;
        toast.success("Account created — you're on call.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/incidents" });
      else toast.info("Check your inbox to confirm your email, then sign in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid-noise flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-7">
        <Link to="/" className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          groundwork
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          {mode === "signin" ? "Sign in to the rotation" : "Join the rotation"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your attempts and resolved scenarios are saved to your account.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono text-xs uppercase tracking-widest">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-mono text-xs uppercase tracking-widest">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full font-mono">
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "No account yet? Create one" : "Already on the rotation? Sign in"}
        </button>
      </div>
    </main>
  );
}
