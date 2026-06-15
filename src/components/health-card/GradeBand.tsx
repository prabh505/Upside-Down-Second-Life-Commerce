"use client";

/**
 * src/components/health-card/GradeBand.tsx
 *
 * Full-width color band at the top of the Health Card.
 * Background color from GRADE_COLORS[grade]. Contains:
 *   - Grade letter (very large, white, font-black)
 *   - Tier name (medium, white)
 *   - Confidence percentage (small, right-aligned)
 *   - Certification badge: SECOND LIFE CERTIFIED or FRONT-VIEW / PROVISIONAL
 */

import { Check, TriangleAlert } from "lucide-react";
import type { Grade, Tier } from "@/lib/types";
import { GRADE_COLORS } from "@/lib/constants";

interface GradeBandProps {
  grade: Grade;
  tier: Tier;
  confidence: number;
  captureComplete: boolean;
}

export default function GradeBand({
  grade,
  tier,
  confidence,
  captureComplete,
}: GradeBandProps) {
  const bgColor = GRADE_COLORS[grade];
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div
      className="relative w-full px-5 py-6 print:py-4"
      style={{ backgroundColor: bgColor }}
    >
      {/* ── Grade + Tier (left) ── */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-end gap-3">
          {/* Grade letter — authoritative weight */}
          <span
            className="text-7xl leading-none font-black text-white tracking-tighter select-none print:text-5xl"
            aria-label={`Grade ${grade}`}
          >
            {grade}
          </span>
          <div className="flex flex-col gap-0.5 pb-1">
            <span className="text-lg font-bold text-white/95 leading-tight">
              {tier}
            </span>
            {/* ── Certification badge ── */}
            {captureComplete ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/90 bg-white/20 rounded px-1.5 py-0.5 w-fit">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> Second Life Certified
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-amber-900/60 text-amber-100 rounded px-1.5 py-0.5 w-fit"
                title="Grade covers visible front-of-item condition only. Physical intake grading applies for high-value and safety-critical items."
              >
                <TriangleAlert className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" /> Front-view / Provisional
              </span>
            )}
          </div>
        </div>

        {/* ── Confidence (right) ── */}
        <div className="flex flex-col items-end pb-1 shrink-0">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">
            Confidence
          </span>
          <span className="text-xl font-bold text-white tabular-nums">
            {confidencePercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
