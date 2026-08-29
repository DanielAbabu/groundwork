import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RAW // SKILL" },
      {
        name: "description",
        content:
          "Sign in to RAW // SKILL to get paged into broken codebases and track resolved challenges.",
      },
      { property: "og:title", content: "Sign in — RAW // SKILL" },
      {
        property: "og:description",
        content:
          "Sign in to RAW // SKILL to get paged into broken codebases and track resolved challenges.",
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
  const [busyProvider, setBusyProvider] = useState<"google" | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
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
      console.error("[Auth Error] Email authentication failed:", {
        mode,
        email,
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleOAuthLogin = async (provider: "google") => {
    setBusyProvider(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/incidents`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to authenticate with ${provider}`,
      );
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <main className="paper-grain flex min-h-screen items-center justify-center bg-[#161412] px-6">
      {/* Stamped ID Card / Workshop Badge Card */}
      <div className="w-full max-w-sm rounded border border-[#4E4638] bg-[#1D1A17] p-7 brass-emboss">
        <div className="flex items-center justify-between border-b border-[#3A342C] pb-4 mb-5">
          <BrandLogo href="/" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#7C7364]">
            ID // CREDENTIAL
          </span>
        </div>

        {/* Mode Toggle Underline Switch */}
        <div className="flex border-b border-[#3A342C] mb-5">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 pb-2 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 ${
              mode === "signin"
                ? "border-[#C8912B] text-[#F2ECE1] font-semibold"
                : "border-transparent text-[#7C7364] hover:text-[#B8AE9C]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 pb-2 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 ${
              mode === "signup"
                ? "border-[#C8912B] text-[#F2ECE1] font-semibold"
                : "border-transparent text-[#7C7364] hover:text-[#B8AE9C]"
            }`}
          >
            Create Account
          </button>
        </div>

        <h1 className="font-serif text-xl font-semibold text-[#F2ECE1]">
          {mode === "signin" ? "Sign in to the rotation" : "Join the rotation"}
        </h1>
        <p className="mt-1 font-sans text-xs text-[#B8AE9C]">
          Your attempts and resolved scenarios are saved to your account.
        </p>

        {/* ── OAuth Providers ── */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            disabled={busyProvider !== null || busy}
            onClick={() => handleOAuthLogin("google")}
            className="flex w-full items-center justify-center gap-2.5 rounded border border-[#4E4638] bg-[#26221D] px-4 py-2.5 font-mono text-xs text-[#F2ECE1] transition-all hover:bg-[#312C25] hover:border-[#C8912B] active:scale-[0.98] disabled:opacity-50"
          >
            {busyProvider === "google" ? (
              <span className="text-[#C8912B]">Connecting to Google…</span>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="w-full border-t border-[#3A342C]" />
          <span className="absolute bg-[#1D1A17] px-2.5 font-sans text-[10px] uppercase tracking-widest text-[#7C7364]">
            or continue with
          </span>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="font-mono text-xs uppercase tracking-wider text-[#B8AE9C]"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#26221D] border-[#3A342C] text-[#F2ECE1] focus:border-[#C8912B]"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="font-mono text-xs uppercase tracking-wider text-[#B8AE9C]"
            >
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
              className="bg-[#26221D] border-[#3A342C] text-[#F2ECE1] focus:border-[#C8912B]"
            />
          </div>
          <Button
            type="submit"
            disabled={busy || busyProvider !== null}
            className="w-full font-mono text-xs font-bold uppercase tracking-wider bg-[#C8912B] text-[#161412] hover:bg-[#E8B04A] brass-emboss"
          >
            {busy
              ? "Working…"
              : mode === "signin"
                ? "Sign in with Email"
                : "Create Account with Email"}
          </Button>
        </form>
      </div>
    </main>
  );
}
