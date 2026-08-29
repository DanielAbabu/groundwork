import React from "react";

/**
 * 4-Notch Dial Glyph
 * Renders a quarter-circle arc with 4 ticks.
 * Ticks filled with brass (#C8912B) per completed stage, ink (#3A342C) for open stages.
 */
export function DialGlyph({
  completedCount = 0,
  totalStages = 4,
  size = 20,
}: {
  completedCount?: number;
  totalStages?: number;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 select-none"
    >
      <circle cx="12" cy="12" r="9" stroke="#3A342C" strokeWidth="1.5" />
      {Array.from({ length: totalStages }).map((_, idx) => {
        // Angles from 210 deg to 330 deg for 4 ticks
        const angle = -120 + idx * 30;
        const rad = (angle * Math.PI) / 180;
        const x1 = 12 + 6 * Math.cos(rad);
        const y1 = 12 + 6 * Math.sin(rad);
        const x2 = 12 + 8.5 * Math.cos(rad);
        const y2 = 12 + 8.5 * Math.sin(rad);
        const isFilled = idx < completedCount;

        return (
          <line
            key={idx}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isFilled ? "#C8912B" : "#3A342C"}
            strokeWidth={isFilled ? "2" : "1.5"}
            strokeLinecap="round"
          />
        );
      })}
      {/* Center Rest Dot */}
      <circle cx="12" cy="12" r="1.5" fill="#C8912B" />
    </svg>
  );
}

/**
 * Corner Brackets (L-shaped blueprint crop marks at all four corners)
 */
export function CornerBrackets({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* Top-Left */}
      <span className="absolute top-0 left-0 size-2 border-t-2 border-l-2 border-[#C8912B]" />
      {/* Top-Right */}
      <span className="absolute top-0 right-0 size-2 border-t-2 border-r-2 border-[#C8912B]" />
      {/* Bottom-Left */}
      <span className="absolute bottom-0 left-0 size-2 border-b-2 border-l-2 border-[#C8912B]" />
      {/* Bottom-Right */}
      <span className="absolute bottom-0 right-0 size-2 border-b-2 border-r-2 border-[#C8912B]" />
    </div>
  );
}

/**
 * Abstract Topology Icon (3-node blueprint line art)
 */
export function TopologyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="32"
      height="18"
      viewBox="0 0 32 18"
      fill="none"
      className={`shrink-0 opacity-60 ${className}`}
    >
      <rect x="1" y="4" width="7" height="10" rx="1" stroke="#7C7364" strokeWidth="1.2" />
      <line x1="8" y1="9" x2="13" y2="9" stroke="#4E4638" strokeWidth="1" strokeDasharray="2 2" />
      <rect x="13" y="2" width="8" height="14" rx="1" stroke="#C8912B" strokeWidth="1.2" />
      <line x1="21" y1="9" x2="26" y2="9" stroke="#4E4638" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="28.5" cy="9" r="3.5" stroke="#7C7364" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * Stamped Rectangular Tag (Sharp corners, 1px border, signal-ink palette)
 */
export function StampedTag({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "amber" | "rust" | "sage";
}) {
  const toneStyles = {
    slate: "border-[#7A93A6]/40 bg-[#7A93A6]/10 text-[#7A93A6]",
    amber: "border-[#D6A24A]/40 bg-[#D6A24A]/10 text-[#D6A24A]",
    rust: "border-[#C4593F]/40 bg-[#C4593F]/10 text-[#C4593F]",
    sage: "border-[#7FB88A]/40 bg-[#7FB88A]/10 text-[#7FB88A]",
  };

  return (
    <span
      className={`inline-block rounded-none border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${toneStyles[tone]}`}
    >
      {label}
    </span>
  );
}
