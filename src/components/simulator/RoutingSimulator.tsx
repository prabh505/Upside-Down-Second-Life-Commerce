"use client";

/**
 * src/components/simulator/RoutingSimulator.tsx
 *
 * Routing Simulator — pure client-side, zero API calls.
 * All output recalculates via useMemo on every control change (<50ms).
 *
 * Exports:
 *   - default export:  RoutingSimulator (React component)
 *   - named export:    simulateRouting  (pure function — no external refs)
 *
 * Range-track/thumb styling approach:
 *   Tailwind does not expose range track/thumb pseudo-elements out of the box.
 *   We use a CSS-in-JSX <style> block with standard pseudo-selectors
 *   (::-webkit-slider-thumb, ::-webkit-slider-runnable-track, ::-moz-range-thumb)
 *   applied via a scoped class name (.slc-range).  This avoids a global CSS
 *   file modification and keeps all simulator code in one file.
 */

import { useState, useMemo, useCallback } from "react";
import type { Grade } from "@/lib/types";
import { GRADE_COLORS } from "@/lib/constants";

// ── Types ────────────────────────────────────────────────────────────────────

type SimDecision =
  | "Resell"
  | "Refurbish"
  | "Donate"
  | "Recycle"
  | "Exchange";

interface SimResult {
  decision: SimDecision;
  trace: string;
}

// ── Decision display colors (spec-mandated, outside GRADE_COLORS) ─────────────

const DECISION_COLORS: Record<SimDecision, string> = {
  Resell:    "#22c55e", // green-500
  Refurbish: "#d97706", // amber-600
  Donate:    "#2563eb", // blue-600
  Recycle:   "#6b7280", // gray-500
  Exchange:  "#0d9488", // teal-600
};

const DECISION_BG: Record<SimDecision, string> = {
  Resell:    "rgba(34,197,94,0.08)",
  Refurbish: "rgba(217,119,6,0.08)",
  Donate:    "rgba(37,99,235,0.08)",
  Recycle:   "rgba(107,114,128,0.08)",
  Exchange:  "rgba(13,148,136,0.08)",
};

const DECISION_ICONS: Record<SimDecision, string> = {
  Resell:    "🏪",
  Refurbish: "🔧",
  Donate:    "🤝",
  Recycle:   "♻️",
  Exchange:  "🔄",
};

const GRADES: Grade[] = ["A", "B", "C", "D", "E"];

// ── Grade value % ─────────────────────────────────────────────────────────────

const GRADE_PERCENT: Record<Grade, number> = {
  A: 100,
  B: 85,
  C: 65,
  D: 40,
  E: 15,
};

// ─────────────────────────────────────────────────────────────────────────────
// simulateRouting — pure function (named export for unit testing)
//
// IMPORTANT: This function references NO external module-level state.
// All inputs come via parameters. Same inputs → same output, always.
// Branches implemented in EXACT spec order — do not reorder.
// ─────────────────────────────────────────────────────────────────────────────

export function simulateRouting(
  grade: Grade,
  distanceKm: number,
  demandScore: number
): SimResult {
  // ── Override: demandScore === 0 (applies to ALL grades) ──────────────────
  // Checked FIRST so it overrides every grade-based branch below.
  if (demandScore === 0) {
    return {
      decision: "Exchange",
      trace:
        "No buyers found — community exchange or give-away is the best outcome.",
    };
  }

  // ── grade E ──────────────────────────────────────────────────────────────
  if (grade === "E") {
    return {
      decision: "Recycle",
      trace: "Condition is too poor for any resale or refurbishment.",
    };
  }

  // ── grade D ──────────────────────────────────────────────────────────────
  if (grade === "D") {
    if (demandScore < 30) {
      return {
        decision: "Donate",
        trace:
          "Low demand and low condition — donation is the best outcome.",
      };
    }
    return {
      decision: "Refurbish",
      trace:
        "Demand exists but the item needs work before it can be listed.",
    };
  }

  // ── grade C ──────────────────────────────────────────────────────────────
  if (grade === "C") {
    if (distanceKm > 200 && demandScore < 50) {
      return {
        decision: "Refurbish",
        trace:
          "At this distance and demand level, shipping cost would exceed resale value.",
      };
    }
    return {
      decision: "Resell",
      trace:
        "Good condition with viable local demand and acceptable distance.",
    };
  }

  // ── grade B or A ─────────────────────────────────────────────────────────
  return {
    decision: "Resell",
    trace:
      distanceKm > 300
        ? "Strong item — consider national listing if no local buyer within 7 days."
        : "High-quality item and strong local demand — resell immediately.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// computeRecoveredValue — pure helper
// ─────────────────────────────────────────────────────────────────────────────

function computeRecoveredValue(
  grade: Grade,
  distanceKm: number,
  demandScore: number
): number {
  const gradePercent = GRADE_PERCENT[grade];
  const baseValue = (gradePercent / 100) * 5000;
  const demandMultiplier = 0.8 + (demandScore / 100) * 0.4;
  const distancePenalty = Math.min(distanceKm / 500, 0.4);
  return Math.max(
    0,
    Math.round(baseValue * demandMultiplier * (1 - distancePenalty))
  );
}

// ── Indian number formatter ───────────────────────────────────────────────────

function formatINR(value: number): string {
  return "₹" + value.toLocaleString("en-IN");
}

// ─────────────────────────────────────────────────────────────────────────────
// RoutingSimulator component
// ─────────────────────────────────────────────────────────────────────────────

interface RoutingSimulatorProps {
  /** Initial grade from the assessed item (e.g. from GradingResult). */
  initialGrade?: Grade;
  /** Initial demand score 0–100. */
  initialDemand?: number;
  /** Initial buyer distance in km. */
  initialDistance?: number;
}

export default function RoutingSimulator({
  initialGrade = "C",
  initialDemand = 60,
  initialDistance = 50,
}: RoutingSimulatorProps) {
  // ── Control state ─────────────────────────────────────────────────────────
  const [grade, setGrade] = useState<Grade>(initialGrade);
  const [distanceKm, setDistanceKm] = useState<number>(initialDistance);
  const [demandScore, setDemandScore] = useState<number>(initialDemand);

  // ── Derived: are we already at initial values? ────────────────────────────
  const isAtInitial =
    grade === initialGrade &&
    distanceKm === initialDistance &&
    demandScore === initialDemand;

  // ── Reset handler ─────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setGrade(initialGrade);
    setDistanceKm(initialDistance);
    setDemandScore(initialDemand);
  }, [initialGrade, initialDistance, initialDemand]);

  // ── Computed outputs — useMemo, recalculates on every dep change ──────────
  const simResult = useMemo(
    () => simulateRouting(grade, distanceKm, demandScore),
    [grade, distanceKm, demandScore]
  );

  const recoveredValue = useMemo(
    () => computeRecoveredValue(grade, distanceKm, demandScore),
    [grade, distanceKm, demandScore]
  );

  // Baseline = ₹0 (warehouse return)
  const vsBaseline = recoveredValue;

  // Colors for this decision
  const decisionColor = DECISION_COLORS[simResult.decision];
  const decisionBg = DECISION_BG[simResult.decision];
  const decisionIcon = DECISION_ICONS[simResult.decision];

  // ── Track fill color for range inputs — CSS variable trick ───────────────
  // We pass a CSS custom property for the filled portion.
  const distanceFill = `${(distanceKm / 500) * 100}%`;
  const demandFill = `${(demandScore / 100) * 100}%`;

  return (
    <>
      {/* ── Scoped CSS for range track/thumb + transition + motion ── */}
      <style jsx>{`
        .slc-range {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          background: transparent;
          cursor: pointer;
          outline: none;
        }
        .slc-range::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 9999px;
          background: #374151; /* gray-700 */
        }
        .slc-range::-moz-range-track {
          height: 6px;
          border-radius: 9999px;
          background: #374151;
        }
        .slc-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #f9fafb;
          border: 2px solid #6b7280;
          margin-top: -7px;
          cursor: grab;
          transition: border-color 120ms ease, transform 120ms ease;
        }
        .slc-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: #f9fafb;
          border: 2px solid #6b7280;
          cursor: grab;
        }
        .slc-range:focus-visible::-webkit-slider-thumb {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96,165,250,0.4);
        }
        .slc-range:focus-visible::-moz-range-thumb {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96,165,250,0.4);
        }
        .slc-range:active::-webkit-slider-thumb {
          transform: scale(1.15);
        }

        /* Decision output: color transition */
        .decision-panel {
          transition: background-color 150ms ease, border-color 150ms ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .decision-panel {
            transition: none;
          }
        }
      `}</style>

      <section
        aria-label="Routing Simulator"
        className="w-full max-w-2xl mx-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-[var(--card-border)] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-brand-100">
              Routing Simulator
            </h2>
            <p className="text-xs text-brand-500 mt-0.5">
              Adjust the sliders to explore how condition, demand, and distance affect routing.
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={isAtInitial}
            aria-label="Reset to my item's values"
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border
                       border-brand-700 text-brand-400 bg-transparent
                       hover:border-brand-500 hover:text-brand-200
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Reset to my item
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {/* ═══════════════════════════════════════════════════
              LEFT COLUMN — Controls
          ═══════════════════════════════════════════════════ */}
          <div className="px-6 py-5 flex flex-col gap-6 border-b sm:border-b-0 sm:border-r border-[var(--card-border)]">

            {/* ── 1. Distance slider ── */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="sim-distance"
                  className="text-sm font-semibold text-brand-200"
                >
                  Buyer distance (km)
                </label>
                <span
                  className="text-sm font-bold font-mono text-brand-300 tabular-nums min-w-[3.5rem] text-right"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {distanceKm} km
                </span>
              </div>

              {/* Range track: filled portion shown via inline background gradient */}
              <div className="relative w-full">
                <input
                  id="sim-distance"
                  type="range"
                  min={0}
                  max={500}
                  step={5}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  aria-valuemin={0}
                  aria-valuemax={500}
                  aria-valuenow={distanceKm}
                  aria-label="Buyer distance in kilometres"
                  className="slc-range w-full"
                  style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${distanceFill}, #374151 ${distanceFill}, #374151 100%)`,
                    borderRadius: "9999px",
                    height: "6px",
                  }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-brand-700 font-mono">
                <span>0 km</span>
                <span>250</span>
                <span>500 km</span>
              </div>
            </div>

            {/* ── 2. Demand slider ── */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="sim-demand"
                  className="text-sm font-semibold text-brand-200"
                >
                  Local demand score
                </label>
                <span
                  className="text-sm font-bold font-mono text-brand-300 tabular-nums min-w-[3.5rem] text-right"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {demandScore}/100
                </span>
              </div>

              <div className="relative w-full">
                <input
                  id="sim-demand"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={demandScore}
                  onChange={(e) => setDemandScore(Number(e.target.value))}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={demandScore}
                  aria-label="Local demand score out of 100"
                  className="slc-range w-full"
                  style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${demandFill}, #374151 ${demandFill}, #374151 100%)`,
                    borderRadius: "9999px",
                    height: "6px",
                  }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-brand-700 font-mono">
                <span>No demand</span>
                <span>50</span>
                <span>High demand</span>
              </div>
            </div>

            {/* ── 3. Condition toggle ── */}
            <div className="flex flex-col gap-2.5">
              <div
                id="sim-condition-label"
                className="text-sm font-semibold text-brand-200"
              >
                Condition grade
              </div>

              <div
                role="group"
                aria-labelledby="sim-condition-label"
                className="flex gap-1.5"
              >
                {GRADES.map((g) => {
                  const isSelected = grade === g;
                  const gradeColor = GRADE_COLORS[g];
                  return (
                    <button
                      key={g}
                      onClick={() => setGrade(g)}
                      aria-pressed={isSelected}
                      aria-label={`Condition grade ${g}`}
                      className="flex-1 h-10 rounded-lg text-sm font-extrabold tracking-wide
                                 border-2 transition-all duration-150
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                      style={
                        isSelected
                          ? {
                              backgroundColor: gradeColor,
                              borderColor: gradeColor,
                              color: "#111827",
                            }
                          : {
                              backgroundColor: "transparent",
                              borderColor: "#374151",
                              color: "#9ca3af",
                            }
                      }
                    >
                      {g}
                    </button>
                  );
                })}
              </div>

              {/* Grade description */}
              <div className="text-[11px] text-brand-600 leading-relaxed">
                {grade === "A" && "Like New — minimal signs of use"}
                {grade === "B" && "Very Good — minor cosmetic wear"}
                {grade === "C" && "Good — visible wear, fully functional"}
                {grade === "D" && "Acceptable — heavy wear or minor damage"}
                {grade === "E" && "Poor — significant damage or malfunction"}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              RIGHT COLUMN — Live output panel
          ═══════════════════════════════════════════════════ */}
          <div className="px-6 py-5 flex flex-col gap-5">

            {/* ── Decision output ── */}
            <div
              className="decision-panel rounded-xl border px-5 py-4 flex items-center gap-3"
              style={{
                backgroundColor: decisionBg,
                borderColor: decisionColor + "40",
              }}
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Routing decision: ${simResult.decision}`}
            >
              <span className="text-3xl select-none" aria-hidden="true">
                {decisionIcon}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5"
                   style={{ color: decisionColor + "cc" }}>
                  Recommended route
                </p>
                <p
                  className="text-2xl font-extrabold leading-tight"
                  style={{ color: decisionColor }}
                >
                  {simResult.decision}
                </p>
              </div>
            </div>

            {/* ── Recovered value ── */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                Recovered value
              </p>
              <p
                className="text-3xl font-black tabular-nums text-brand-100 tracking-tight"
                aria-live="polite"
                aria-atomic="true"
                aria-label={`Recovered value: ${formatINR(recoveredValue)}`}
              >
                {formatINR(recoveredValue)}
              </p>
              <p className="text-xs text-brand-500">
                {vsBaseline > 0
                  ? <>{formatINR(vsBaseline)} <span className="text-green-500 font-semibold">more</span> than returning to warehouse</>
                  : "Same as returning to warehouse (₹0)"}
              </p>
            </div>

            {/* ── Logic trace ── */}
            <div className="rounded-lg bg-brand-950/40 border border-brand-800/40 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-1.5">
                Why this route?
              </p>
              <p
                className="text-sm text-brand-300 leading-relaxed"
                aria-live="polite"
                aria-atomic="true"
              >
                {simResult.trace}
              </p>
            </div>

            {/* ── Mini formula breakdown ── */}
            <details className="group">
              <summary className="text-xs text-brand-600 cursor-pointer hover:text-brand-400 transition-colors list-none flex items-center gap-1.5 select-none">
                <span
                  aria-hidden="true"
                  className="transition-transform duration-150 group-open:rotate-90 text-[10px]"
                >
                  ▸
                </span>
                Show value calculation
              </summary>
              <div className="mt-2 space-y-1 font-mono text-[11px] text-brand-600 bg-brand-950/50 rounded-lg px-3 py-2.5">
                <div className="flex justify-between gap-3">
                  <span>Base value ({GRADE_PERCENT[grade]}%)</span>
                  <span className="text-brand-400">
                    {formatINR(Math.round((GRADE_PERCENT[grade] / 100) * 5000))}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Demand multiplier</span>
                  <span className="text-brand-400">
                    ×{(0.8 + (demandScore / 100) * 0.4).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Distance penalty</span>
                  <span className="text-brand-400">
                    −{(Math.min(distanceKm / 500, 0.4) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-brand-800 pt-1.5 mt-1.5">
                  <span className="font-bold text-brand-300">Result</span>
                  <span className="font-bold text-brand-200">{formatINR(recoveredValue)}</span>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}
