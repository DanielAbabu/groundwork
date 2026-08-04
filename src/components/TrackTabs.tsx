import { Link } from "@tanstack/react-router";

const TABS = [
  { to: "/incidents", label: "Debugging" },
  { to: "/design", label: "Design Review" },
] as const;

export function TrackTabs({ active }: { active: "debugging" | "design" }) {
  return (
    <nav className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
      {TABS.map((tab) => {
        const isActive =
          (tab.to === "/incidents" && active === "debugging") ||
          (tab.to === "/design" && active === "design");
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`rounded px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
