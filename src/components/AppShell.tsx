import { type ReactNode } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { NudgePopover } from "@/components/NudgePopover";
import { BrandLogo } from "@/components/BrandLogo";
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
    <div className="min-h-screen bg-[#161412] text-[#F2ECE1] flex flex-col font-sans">
      {/* ── Slim 44px Global Top Header (Fieldnotes & Iron) ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#3A342C] bg-[#1D1A17]">
        <div className="flex h-11 items-center justify-between gap-4 px-4 sm:px-6">
          {/* Gauge Notch Brand Logo */}
          <BrandLogo href="/dashboard" />

          {/* Track Navigation (Inter font with static thin brass underline) */}
          <nav className="hidden md:flex items-center gap-1 h-full">
            <Link
              to="/incidents"
              className={`flex h-full items-center px-4 font-sans text-xs tracking-wide transition-colors border-b-2 ${
                isIncidents
                  ? "border-[#C8912B] text-[#F2ECE1] font-semibold"
                  : "border-transparent text-[#B8AE9C] hover:text-[#F2ECE1]"
              }`}
            >
              Debugging Rotation
            </Link>
            <Link
              to="/design"
              className={`flex h-full items-center px-4 font-sans text-xs tracking-wide transition-colors border-b-2 ${
                isDesign
                  ? "border-[#C8912B] text-[#F2ECE1] font-semibold"
                  : "border-transparent text-[#B8AE9C] hover:text-[#F2ECE1]"
              }`}
            >
              System Design
            </Link>
          </nav>

          {/* Right Zone */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Streak */}
            {streak > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 rounded border border-[#4E4638] bg-[#26221D] px-2.5 py-0.5 font-mono text-[11px] text-[#C8912B]">
                <span>⏱</span>
                <span className="font-semibold">{streak}d Streak</span>
              </span>
            )}

            {/* Solved Count */}
            <span className="hidden sm:block font-mono text-xs text-[#7C7364]">
              <span className="text-[#F2ECE1] font-semibold">{resolved}</span>/{scenarios.length}{" "}
              solved
            </span>

            <NudgePopover />

            <Link
              to="/profile"
              className={`rounded border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition-colors ${
                location.pathname === "/profile"
                  ? "border-[#C8912B] bg-[#26221D] text-[#C8912B]"
                  : "border-[#3A342C] bg-[#1D1A17] text-[#B8AE9C] hover:text-[#F2ECE1]"
              }`}
            >
              Profile
            </Link>

            <button
              onClick={() => handleSignOut(router, queryClient)}
              className="rounded border border-[#3A342C] bg-[#1D1A17] px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-[#7C7364] transition-colors hover:border-[#C4593F]/40 hover:bg-[#C4593F]/10 hover:text-[#C4593F]"
            >
              Sign out
            </button>

            {/* Mobile Nav Button */}
            <button
              id="mobile-nav-btn"
              className="md:hidden rounded border border-[#3A342C] bg-[#1D1A17] p-1.5 text-[#B8AE9C]"
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 translate-y-full transition-transform duration-300 border-t border-[#3A342C] bg-[#1D1A17] p-4"
      >
        <div className="flex flex-col gap-1">
          <Link
            to="/incidents"
            onClick={() =>
              document.getElementById("mobile-nav-sheet")?.classList.add("translate-y-full")
            }
            className={`rounded px-4 py-3 font-sans text-sm tracking-wide transition-colors ${
              isIncidents
                ? "bg-[#26221D] text-[#C8912B] font-semibold"
                : "text-[#B8AE9C] hover:text-[#F2ECE1]"
            }`}
          >
            Debugging Rotation
          </Link>
          <Link
            to="/design"
            onClick={() =>
              document.getElementById("mobile-nav-sheet")?.classList.add("translate-y-full")
            }
            className={`rounded px-4 py-3 font-sans text-sm tracking-wide transition-colors ${
              isDesign
                ? "bg-[#26221D] text-[#C8912B] font-semibold"
                : "text-[#B8AE9C] hover:text-[#F2ECE1]"
            }`}
          >
            System Design
          </Link>
          <Link
            to="/dashboard"
            onClick={() =>
              document.getElementById("mobile-nav-sheet")?.classList.add("translate-y-full")
            }
            className="rounded px-4 py-3 font-sans text-sm tracking-wide text-[#B8AE9C] hover:text-[#F2ECE1] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* ── Brand Footer ── */}
      <footer className="border-t border-[#3A342C] bg-[#1D1A17] py-6 px-6">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo showTagline href="/dashboard" />
          <span className="font-mono text-xs text-[#7C7364]">
            © {new Date().getFullYear()} RAW // SKILL. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;
