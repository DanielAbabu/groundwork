import { type ReactNode } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { NudgePopover } from "@/components/NudgePopover";
import { handleSignOut } from "@/lib/auth";
import { listProgress, type ProgressRow } from "@/lib/progress.functions";
import { scenarios } from "@/content/scenarios";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const location = useLocation();
  const queryClient = useQueryClient();

  const fetchProgress = useServerFn(listProgress);
  const { data: progress } = useQuery<ProgressRow[]>({
    queryKey: ["progress"],
    queryFn: () => fetchProgress(),
  });

  const isIncidents = location.pathname.startsWith("/incidents");
  const isDesign = location.pathname.startsWith("/design");

  const resolved = (progress ?? []).filter((r) => r.status === "passed").length;

  // Compute streak: count consecutive calendar days (desc) with at least one run
  // We only have progress rows with first_passed_at, so use those dates
  const streak = (() => {
    const dates = (progress ?? [])
      .filter((r) => r.first_passed_at)
      .map((r) => new Date(r.first_passed_at!).toDateString());
    const unique = Array.from(new Set(dates)).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
    let count = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (const d of unique) {
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      const diff = Math.round((cursor.getTime() - day.getTime()) / 86400000);
      if (diff <= 1) {
        count++;
        cursor = day;
      } else {
        break;
      }
    }
    return count;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* ── Slim 44px Global Top Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-[#14141f]/90 backdrop-blur-md">
        <div className="flex h-11 items-center justify-between gap-4 px-4 sm:px-6">
          {/* Brand */}
          <Link to="/dashboard" className="flex items-center gap-2 group shrink-0">
            <span className="font-mono text-base font-bold text-primary select-none drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
              ⚡
            </span>
            <span className="hidden sm:block font-mono text-xs font-bold uppercase tracking-[0.25em] text-foreground group-hover:text-primary transition-colors">
              RAW // SKILL
            </span>
          </Link>

          {/* Track Navigation */}
          <nav className="hidden md:flex items-center gap-0 border-b border-border h-full">
            <Link
              to="/incidents"
              className={`flex h-full items-center px-4 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 ${
                isIncidents
                  ? "border-primary text-primary font-bold drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              Debugging Rotation
            </Link>
            <Link
              to="/design"
              className={`flex h-full items-center px-4 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 ${
                isDesign
                  ? "border-primary text-primary font-bold drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              System Design
            </Link>
          </nav>

          {/* Right zone */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Streak */}
            {streak > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary shadow-[0_0_10px_rgba(0,240,255,0.15)]">
                <span className={streak >= 7 ? "animate-pulse" : ""}>⚡</span>
                <span className="font-bold">{streak}d Streak</span>
              </span>
            )}

            {/* Solved count */}
            <span className="hidden sm:block font-mono text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">{resolved}</span>/{scenarios.length}{" "}
              solved
            </span>

            <NudgePopover />

            <Link
              to="/profile"
              className={`rounded border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition-colors ${
                location.pathname === "/profile"
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Profile
            </Link>

            <button
              onClick={() => handleSignOut(router, queryClient)}
              className="rounded border border-border bg-card px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-fail/40 hover:bg-fail/10 hover:text-fail"
            >
              Sign out
            </button>

            {/* Mobile hamburger — track nav */}
            <button
              id="mobile-nav-btn"
              className="md:hidden rounded border border-border bg-card p-1.5 text-muted-foreground"
              onClick={() => {
                const sheet = document.getElementById("mobile-nav-sheet");
                sheet?.classList.toggle("translate-y-full");
              }}
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom sheet nav */}
      <div
        id="mobile-nav-sheet"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 translate-y-full transition-transform duration-300 border-t border-border bg-[#161616] p-4"
      >
        <div className="flex flex-col gap-1">
          <Link
            to="/incidents"
            onClick={() =>
              document.getElementById("mobile-nav-sheet")?.classList.add("translate-y-full")
            }
            className={`rounded px-4 py-3 font-mono text-sm uppercase tracking-wider transition-colors ${
              isIncidents
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Debugging
          </Link>
          <Link
            to="/design"
            onClick={() =>
              document.getElementById("mobile-nav-sheet")?.classList.add("translate-y-full")
            }
            className={`rounded px-4 py-3 font-mono text-sm uppercase tracking-wider transition-colors ${
              isDesign
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Design Review
          </Link>
          <Link
            to="/dashboard"
            onClick={() =>
              document.getElementById("mobile-nav-sheet")?.classList.add("translate-y-full")
            }
            className="rounded px-4 py-3 font-mono text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default AppShell;
