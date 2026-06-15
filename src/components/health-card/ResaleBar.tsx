"use client";

/**
 * src/components/health-card/ResaleBar.tsx
 *
 * Horizontal progress bar showing estimated resale value percentage.
 * - Fill color matches the grade color.
 * - Animates from 0% to actual width on mount (800ms ease-out).
 * - Respects prefers-reduced-motion: shows final state immediately.
 * - Full accessibility: role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax.
 */

import type { Grade } from "@/lib/types";
import { GRADE_COLORS } from "@/lib/constants";

interface ResaleBarProps {
  percentage: number;
  grade: Grade;
}

export default function ResaleBar({ percentage, grade }: ResaleBarProps) {
  const clampedPct = Math.max(0, Math.min(100, Math.round(percentage)));
  const fillColor = GRADE_COLORS[grade];

  return (
    <div className="px-5 py-4 border-t border-gray-200 print:border-gray-300">
      {/* ── Label ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Estimated resale value
        </span>
        <span className="text-sm font-bold text-gray-700 tabular-nums">
          {clampedPct}%
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div
        role="progressbar"
        aria-valuenow={clampedPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clampedPct}% estimated resale value`}
        className="w-full h-3 rounded-full bg-gray-100 overflow-hidden"
      >
        <div
          className="h-full rounded-full resale-bar-fill"
          style={
            {
              "--resale-fill-width": `${clampedPct}%`,
              "--resale-fill-color": fillColor,
              backgroundColor: fillColor,
            } as React.CSSProperties
          }
        />
      </div>

      {/* ── Animation CSS ──
        CSS-in-JS embedded as <style> for this component.
        - Default: animate from 0% to actual width (800ms ease-out).
        - prefers-reduced-motion: no animation, show final state immediately.
      */}
      <style jsx>{`
        .resale-bar-fill {
          width: var(--resale-fill-width);
          animation: resaleGrow 800ms ease-out forwards;
        }
        @keyframes resaleGrow {
          from { width: 0%; }
          to { width: var(--resale-fill-width); }
        }
        @media (prefers-reduced-motion: reduce) {
          .resale-bar-fill {
            animation: none;
            width: var(--resale-fill-width);
          }
        }
      `}</style>
    </div>
  );
}
