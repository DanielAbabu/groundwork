import { Link } from "@tanstack/react-router";

interface BrandLogoProps {
  href?: string;
  showTagline?: boolean;
  className?: string;
}

export function GaugeNotchIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 text-[#10B981] ${className}`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.5" stroke="#171717" strokeWidth="1.2" />
      <path d="M5.5 14.5 A 6.5 6.5 0 1 1 14.5 14.5" stroke="#262626" strokeWidth="1.5" />
      <line x1="10" y1="10" x2="13.5" y2="6.5" stroke="#10B981" strokeWidth="1.75" />
      <circle cx="10" cy="10" r="1.25" fill="#10B981" stroke="none" />
      <line x1="5.5" y1="13.5" x2="6.5" y2="12.5" stroke="#10B981" strokeWidth="1.25" />
    </svg>
  );
}

export function BrandLogo({
  href = "/dashboard",
  showTagline = false,
  className = "",
}: BrandLogoProps) {
  const logoContent = (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2 group select-none">
        <GaugeNotchIcon className="size-4.5 transition-transform group-hover:scale-105" />

        <span className="flex items-baseline gap-1 text-sm tracking-tight">
          <span className="font-display font-extrabold tracking-tight text-[#F8FAFC]">RAW</span>
          <span className="font-mono text-xs font-semibold text-[#10B981]">//</span>
          <span className="font-mono text-xs font-bold tracking-widest text-[#F8FAFC]">SKILL</span>
        </span>
      </div>
      {showTagline && (
        <p className="mt-1 font-mono text-[11px] text-[#94A3B8]">
          No copilot. No shortcuts. Just you and the incident.
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link to={href}>{logoContent}</Link>;
  }

  return logoContent;
}

export default BrandLogo;
