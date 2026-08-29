import { Link } from "@tanstack/react-router";

interface BrandLogoProps {
  href?: string;
  showTagline?: boolean;
  className?: string;
}

export function GaugeNotchIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 text-[#C8912B] ${className}`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Outer instrument dial arc / bezel notch */}
      <circle cx="10" cy="10" r="7.5" stroke="#3A342C" strokeWidth="1" />
      <path d="M5.5 14.5 A 6.5 6.5 0 1 1 14.5 14.5" stroke="#4E4638" strokeWidth="1.25" />
      {/* Gauge tick mark / needle rest notch */}
      <line x1="10" y1="10" x2="13.5" y2="6.5" stroke="#C8912B" strokeWidth="1.75" />
      <circle cx="10" cy="10" r="1.25" fill="#C8912B" stroke="none" />
      {/* Zero rest tick */}
      <line x1="5.5" y1="13.5" x2="6.5" y2="12.5" stroke="#C8912B" strokeWidth="1.25" />
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
        {/* Gauge Notch Mark */}
        <GaugeNotchIcon className="size-4.5 transition-transform group-hover:scale-105" />

        {/* Dual-Typography Wordmark: RAW (Serif 600) // (Mono Brass) SKILL (Mono 500) */}
        <span className="flex items-baseline gap-1 text-sm tracking-tight">
          <span className="font-serif font-semibold text-[#F2ECE1]">RAW</span>
          <span className="font-mono text-xs font-normal text-[#C8912B] opacity-80">//</span>
          <span className="font-mono text-xs font-medium tracking-wider text-[#F2ECE1]">SKILL</span>
        </span>
      </div>
      {showTagline && (
        <p className="mt-1 font-mono text-[11px] text-[#7C7364]">
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
