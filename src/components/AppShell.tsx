import { useState, type ReactNode } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Menu, X, LayoutDashboard, Terminal, Compass, User, LogOut } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] flex flex-col font-sans">
      {/* ── 56px Global Top Header (Nordic Precision Studio) ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#1E293B] bg-[#0F172A]/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-6 px-6 sm:px-8">
          {/* Gauge Notch Brand Logo */}
          <BrandLogo href="/dashboard" />

          {/* Track Navigation */}
          <nav className="hidden md:flex items-center gap-2 h-full">
            <Link
              to="/incidents"
              className={`flex h-full items-center px-5 font-display text-sm font-medium tracking-wide transition-colors border-b-2 ${
                isIncidents
                  ? "border-[#38BDF8] text-[#F8FAFC] font-semibold"
                  : "border-transparent text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              Debugging Rotation
            </Link>
            <Link
              to="/design"
              className={`flex h-full items-center px-5 font-display text-sm font-medium tracking-wide transition-colors border-b-2 ${
                isDesign
                  ? "border-[#38BDF8] text-[#F8FAFC] font-semibold"
                  : "border-transparent text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              System Design
            </Link>
          </nav>

          {/* Right Zone */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Streak */}
            {streak > 0 && (
              <span className="hidden sm:flex items-center gap-2 rounded-sm border border-[#334155] bg-[#1E293B] px-3 py-1 font-display text-xs text-[#38BDF8]">
                <span>⚡</span>
                <span className="font-bold">{streak}d Streak</span>
              </span>
            )}

            {/* Solved Count */}
            <span className="hidden sm:block font-display text-xs text-[#64748B]">
              <span className="text-[#F8FAFC] font-bold">{resolved}</span>/{scenarios.length}{" "}
              solved
            </span>

            <NudgePopover />

            <Link
              to="/profile"
              className={`rounded-sm border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider transition-colors ${
                location.pathname === "/profile"
                  ? "border-[#38BDF8] bg-[#1E293B] text-[#38BDF8]"
                  : "border-[#1E293B] bg-[#0F172A] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#334155]"
              }`}
            >
              Profile
            </Link>

            <button
              onClick={() => handleSignOut(router, queryClient)}
              className="rounded-sm border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-[#64748B] transition-colors hover:border-[#F43F5E]/40 hover:bg-[#F43F5E]/10 hover:text-[#F43F5E]"
            >
              Sign out
            </button>

            {/* Mobile Nav Toggle */}
            <button
              id="mobile-nav-btn"
              className="md:hidden rounded-sm border border-[#1E293B] bg-[#0F172A] p-2 text-[#94A3B8] hover:text-[#F8FAFC]"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-[#0B0F19]/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex h-11 items-center justify-between border-b border-[#1E293B] px-4">
            <BrandLogo href="/dashboard" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-sm border border-[#1E293B] p-1.5 text-[#94A3B8]"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-sm p-3 font-sans text-sm font-semibold transition-colors ${
                location.pathname === "/dashboard"
                  ? "bg-[#1E293B] text-[#38BDF8]"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <LayoutDashboard className="size-4 text-[#38BDF8]" />
              Dashboard
            </Link>
            <Link
              to="/incidents"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-sm p-3 font-sans text-sm font-semibold transition-colors ${
                isIncidents
                  ? "bg-[#1E293B] text-[#38BDF8]"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <Terminal className="size-4 text-[#38BDF8]" />
              Debugging Rotation
            </Link>
            <Link
              to="/design"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-sm p-3 font-sans text-sm font-semibold transition-colors ${
                isDesign
                  ? "bg-[#1E293B] text-[#38BDF8]"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <Compass className="size-4 text-[#38BDF8]" />
              System Design Track
            </Link>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-sm p-3 font-sans text-sm font-semibold transition-colors ${
                location.pathname === "/profile"
                  ? "bg-[#1E293B] text-[#38BDF8]"
                  : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <User className="size-4 text-[#38BDF8]" />
              Profile Dossier
            </Link>
          </div>
          <div className="border-t border-[#1E293B] p-4 bg-[#0F172A]">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut(router, queryClient);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-sm border border-[#F43F5E]/40 bg-[#F43F5E]/10 py-2.5 font-mono text-xs font-bold text-[#F43F5E]"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* ── Brand Footer ── */}
      <footer className="border-t border-[#1E293B] bg-[#0F172A] py-6 px-6">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo showTagline href="/dashboard" />
          <span className="font-mono text-xs text-[#64748B]">
            © {new Date().getFullYear()} RAW // SKILL. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;
