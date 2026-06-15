"use client";

/**
 * src/components/score/SecondLifeScore.tsx
 *
 * SVG circular arc gauge showing the Second Life Score (0–100, 1 decimal).
 *
 * FORMULA (computed via useMemo — deterministic from props):
 *   gradeScore        = { A:100, B:80, C:60, D:40, E:20 }[grade]
 *   depreciationScore = Math.max(0, 100 − Math.round((ageMonths/shelfLifeMonths)×100))
 *   shelfLifeScore    = expired→0 | near_expiry→40 | valid|not_applicable→100
 *   secondLifeScore   = (gradeScore×0.4) + (demandScore×0.3)
 *                       + (depreciationScore×0.2) + (shelfLifeScore×0.1)
 *   Rounded to 1 decimal place.
 *
 * ANIMATION:
 *   strokeDashoffset animates from full circumference → final value.
 *   800ms ease-out. prefers-reduced-motion: skip to final state immediately.
 *
 * DRILL-DOWN:
 *   "What affects this score?" button → useState-controlled table (not <details>
 *   because the table layout requires controlled rendering of column widths).
 */

import { useState, useMemo, useEffect, useRef } from "react";
import type { Grade } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type ExpiryStatus = "valid" | "near_expiry" | "expired" | "not_applicable";

interface SecondLifeScoreProps {
  grade: Grade;
  demandScore: number;
  ageMonths: number;
  shelfLifeMonths: number;
  expiryStatus: ExpiryStatus;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADE_SCORES: Record<Grade, number> = {
  A: 100,
  B: 80,
  C: 60,
  D: 40,
  E: 20,
};

const SHELF_LIFE_SCORES: Record<ExpiryStatus, number> = {
  valid:          100,
  not_applicable: 100,
  near_expiry:    40,
  expired:        0,
};

// SVG gauge geometry
const CX = 100;
const CY = 100;
const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 502.655

/** Color zone by score value — spec-mandated hex codes. */
function arcColor(score: number): string {
  if (score <= 30) return "#dc2626"; // red
  if (score <= 60) return "#ca8a04"; // yellow
  if (score <= 80) return "#16a34a"; // green-600
  return "#15803d";                  // green-700 (81–100)
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SecondLifeScore({
  grade,
  demandScore,
  ageMonths,
  shelfLifeMonths,
  expiryStatus,
}: SecondLifeScoreProps) {
  const [expanded, setExpanded] = useState(false);
  const [animated, setAnimated] = useState(false);

  // ── Score computation ─────────────────────────────────────────────────────
  const {
    gradeScore,
    depreciationScore,
    shelfLifeScore,
    secondLifeScore,
  } = useMemo(() => {
    const gradeScore = GRADE_SCORES[grade];
    const depreciationScore = Math.max(
      0,
      100 - Math.round((ageMonths / shelfLifeMonths) * 100)
    );
    const shelfLifeScore = SHELF_LIFE_SCORES[expiryStatus];
    const raw =
      gradeScore * 0.4 +
      demandScore * 0.3 +
      depreciationScore * 0.2 +
      shelfLifeScore * 0.1;
    const secondLifeScore = parseFloat(raw.toFixed(1));
    return { gradeScore, depreciationScore, shelfLifeScore, secondLifeScore };
  }, [grade, demandScore, ageMonths, shelfLifeMonths, expiryStatus]);

  // ── Arc geometry ──────────────────────────────────────────────────────────
  const finalOffset = CIRCUMFERENCE * (1 - secondLifeScore / 100);
  const color = arcColor(secondLifeScore);

  // Check prefers-reduced-motion (SSR-safe)
  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Trigger animation on mount (next frame so CSS transition fires)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimated(true));
    });
  }, []);

  // Drill-down row data
  const rows = [
    {
      label: "Condition",
      score: gradeScore,
      weight: "40%",
      contribution: gradeScore * 0.4,
    },
    {
      label: "Demand",
      score: demandScore,
      weight: "30%",
      contribution: demandScore * 0.3,
    },
    {
      label: "Depreciation",
      score: depreciationScore,
      weight: "20%",
      contribution: depreciationScore * 0.2,
    },
    {
      label: "Shelf Life",
      score: shelfLifeScore,
      weight: "10%",
      contribution: shelfLifeScore * 0.1,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ── Scoped animation CSS ── */}
      <style jsx>{`
        .arc-track {
          /* Start at top (−90°) */
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
        }
        .arc-fill {
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
          stroke-dasharray: ${CIRCUMFERENCE};
          stroke-dashoffset: ${CIRCUMFERENCE}; /* initial: empty */
          transition: stroke-dashoffset 800ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .arc-fill {
            transition: none;
          }
        }
      `}</style>

      {/* ── SVG gauge ── */}
      <div className="relative w-full max-w-[200px]" aria-label={`Second Life Score: ${secondLifeScore} out of 100`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-auto"
          role="img"
          aria-hidden="true"
        >
          {/* Track (background circle) */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="#1f2937"
            strokeWidth="14"
            className="arc-track"
          />

          {/* Filled arc */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={animated ? finalOffset : CIRCUMFERENCE}
            className="arc-fill"
            style={{
              // Immediately set final state when reduced motion is active
              strokeDashoffset: reducedMotion.current ? finalOffset : undefined,
            }}
          />

          {/* Score number */}
          <text
            x={CX}
            y={CY - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="40"
            fontWeight="700"
            fill="#f9fafb"
          >
            {secondLifeScore}
          </text>

          {/* Label */}
          <text
            x={CX}
            y={CY + 22}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fill="#6b7280"
          >
            Second Life Score
          </text>
        </svg>
      </div>

      {/* ── Drill-down toggle ── */}
      <button
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
        className="text-xs font-semibold text-brand-400 hover:text-brand-200 transition-colors
                   flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
      >
        What affects this score?
        <span
          aria-hidden="true"
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {/* ── Drill-down table ── */}
      {expanded && (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-brand-800">
                <th className="text-left py-1.5 px-2 text-brand-600 font-semibold uppercase tracking-widest">
                  Component
                </th>
                <th className="text-right py-1.5 px-2 text-brand-600 font-semibold uppercase tracking-widest">
                  Score
                </th>
                <th className="text-right py-1.5 px-2 text-brand-600 font-semibold uppercase tracking-widest">
                  Weight
                </th>
                <th className="text-right py-1.5 px-2 text-brand-600 font-semibold uppercase tracking-widest">
                  Contribution
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-brand-900/60">
                  <td className="py-1.5 px-2 text-brand-300">{row.label}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-brand-300">
                    {row.score.toFixed(1)}
                  </td>
                  <td className="py-1.5 px-2 text-right text-brand-500">
                    {row.weight}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-brand-300">
                    {row.contribution.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-brand-700">
                <td
                  colSpan={3}
                  className="py-1.5 px-2 font-bold text-brand-200"
                >
                  Total
                </td>
                <td
                  className="py-1.5 px-2 text-right tabular-nums font-bold"
                  style={{ color }}
                >
                  {secondLifeScore.toFixed(1)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
