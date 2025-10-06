import React from "react";
import { useTheme } from "../context/ThemeContext";

/**
 * Responsive progress ring.
 * - Scales with CSS (no fixed px math).
 * - No clipping inside cards.
 */
export default function ProgressRing({
  value = 0,
  target = 100,
  label = "",
  unit = "",
  className = "",
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pct = Math.max(
    0,
    Math.min(100, target > 0 ? (value / target) * 100 : 0)
  );

  // normalized geometry (0..100)
  const stroke = 10;
  const r = 50 - stroke / 2; // 45
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const track = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.14)";
  const accent = "#3b6dff";

  return (
    <div className={`card p-5 flex items-center gap-4 ${className}`}>
      {/* SVG scales with CSS width/height; no clipping */}
      <svg
        viewBox="0 0 100 100"
        className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>

      <div className="min-w-0">
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-2xl font-semibold text-gray-900 dark:text-white truncate">
          {Math.round(value)} / {Math.round(target)} {unit}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {Math.round(pct)}% of goal
        </div>
      </div>
    </div>
  );
}
