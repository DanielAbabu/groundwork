import { type ReactNode } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { NudgePopover } from "@/components/NudgePopover";
import { handleSignOut } from "@/lib/auth";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isIncidents = location.pathname.startsWith("/incidents");
  const isDesign = location.pathname.startsWith("/design");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Sticky Global Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Brand Logo & On-Call Pulse */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 group-hover:border-amber-500/60 transition-colors">
                <svg
                  className="size-4 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-foreground">
                GROUNDWORK
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              <span className="pager-pulse inline-block size-1.5 rounded-full bg-amber-500" />
              <span>ON-CALL</span>
            </div>
          </div>

          {/* Track Switcher Navigation */}
          <nav className="hidden md:flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1">
            <Link
              to="/incidents"
              className={`rounded-md px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors ${
                isIncidents
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Debugging
            </Link>
            <Link
              to="/design"
              className={`rounded-md px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors ${
                isDesign
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Design Review
            </Link>
          </nav>

          {/* Actions & Profile */}
          <div className="flex items-center gap-3">
            <NudgePopover />

            <Link
              to="/profile"
              className={`rounded-md border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                location.pathname === "/profile"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                  : "bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              Profile
            </Link>

            <button
              onClick={() => handleSignOut(router, queryClient)}
              className="rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-fail/40 hover:bg-fail/10 hover:text-fail"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default AppShell;
