import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NudgePopover } from "@/components/NudgePopover";

export function Navbar() {
  const router = useRouter();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const navLinks = [
    { name: "Debugging", to: "/incidents", active: currentPath.startsWith("/incidents") },
    { name: "Design", to: "/design", active: currentPath.startsWith("/design") },
    { name: "Profile", to: "/profile", active: currentPath === "/profile" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        {/* Brand Logo with Orange Pulse Dot */}
        <Link to="/" className="flex items-center gap-2.5 font-mono text-sm font-bold tracking-wider text-foreground hover:opacity-90 transition-opacity">
          <span className="pager-pulse inline-block size-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.7)]" />
          Groundwork
        </Link>

        {/* Navigation Links & Actions */}
        <nav className="flex items-center gap-5 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative py-1 transition-colors ${
                link.active
                  ? "text-amber-500 font-semibold border-b-2 border-amber-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.name}
            </Link>
          ))}

          {isLoggedIn && <NudgePopover />}

          {isLoggedIn ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.navigate({ to: "/" });
              }}
              className="ml-1 rounded-md border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-amber-500/50 hover:text-foreground"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="ml-1 rounded-md bg-amber-500 px-3.5 py-1 font-mono text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400"
            >
              Sign in →
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
