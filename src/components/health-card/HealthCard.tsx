"use client";

/**
 * src/components/health-card/HealthCard.tsx
 *
 * The Product Health Card — central trust artifact of Second Life Commerce.
 *
 * Design brief: physical-tag / inspection-tag aesthetic.
 *   - CSS perforations top and bottom (repeating-linear-gradient)
 *   - Monospaced serial number and timestamps
 *   - Color-coded decision band at top
 *   - No rounded corners (sharp edges for institutional feel)
 *   - Single shadow-md, no other shadows
 *
 * Layout order (10 sections):
 *   1. GradeBand
 *   2. Item identity row (productName, serial, date graded)
 *   3. Defects list
 *   4. Completeness list
 *   5. ExpiryRow (only if dated category)
 *   6. RoutingDecision
 *   7. ResaleBar
 *   8. ChatAffordance
 *   9. QR placeholder
 *  10. Footer
 *
 * Print-safe: hides ChatAffordance and QR placeholder text.
 *
 * CSS perforations use inline style with repeating-linear-gradient because
 * this gradient has too many values for a clean arbitrary Tailwind class.
 * Justified: a 100+ char Tailwind arbitrary class would be unreadable.
 */

import type { GradingResult, DatedCategory } from "@/lib/types";
import GradeBand from "./GradeBand";
import ExpiryRow from "./ExpiryRow";
import RoutingDecision from "./RoutingDecision";
import ResaleBar from "./ResaleBar";
import ChatAffordance from "./ChatAffordance";

interface HealthCardProps {
  result: GradingResult;
  productName: string;
  category: DatedCategory;
}

// ── Serial number from assessment_id ──────────────────────────────────────────
function generateSerial(assessmentId: string): string {
  // Take first 8 chars of the UUID
  const hash = assessmentId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `SLC-${hash}`;
}

// ── Format ISO timestamp ──────────────────────────────────────────────────────
function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Perforation gradient style ────────────────────────────────────────────────
// repeating-linear-gradient of dots — same pattern top and bottom edges.
// Done as inline style because the gradient value is too complex for a clean
// Tailwind arbitrary class.
const PERFORATION_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to right, transparent 0px, transparent 8px, #e5e7eb 8px, #e5e7eb 12px)",
  height: "4px",
};

export default function HealthCard({ result, productName, category }: HealthCardProps) {
  const serial = generateSerial(result.assessment_id);
  const gradedDate = formatTimestamp(result.assessed_at);

  // Parse defects — the spec says defects is string[], but handle edge cases
  const defectsList = result.defects ?? [];
  const hasDefects = defectsList.length > 0;

  // Parse completeness — could be string or array depending on API response
  const completenessText = result.completeness ?? "All accessories present";

  // Resale percentage from second_life_score
  const resalePercentage = result.second_life_score;

  return (
    <article
      aria-label={`Product Health Card for ${productName}`}
      className="w-full max-w-[480px] mx-auto bg-white shadow-md overflow-hidden print:shadow-none print:max-w-none"
    >
      {/* ═══════ 1. Top perforation ═══════ */}
      <div
        aria-hidden="true"
        style={PERFORATION_STYLE}
        className="w-full"
      />

      {/* ═══════ 2. GradeBand ═══════ */}
      <GradeBand
        grade={result.condition_grade}
        tier={result.condition_label}
        confidence={result.model_confidence}
        captureComplete={result.capture_complete}
      />

      {/* ═══════ 3. Item identity row ═══════ */}
      <div className="px-5 py-4 border-t border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">
              {productName}
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Graded {gradedDate}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-mono text-xs font-bold text-gray-500 tracking-wider">
              {serial}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════ 4. Defects list ═══════ */}
      <div className="px-5 py-3 border-t border-gray-200">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          Observed Defects
        </h3>
        {hasDefects ? (
          <ul className="space-y-1" role="list">
            {defectsList.map((defect, i) => (
              <li
                key={i}
                className="text-sm text-gray-700 flex items-start gap-2"
              >
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"
                  aria-hidden="true"
                />
                {defect}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No defects observed.</p>
        )}
      </div>

      {/* ═══════ 5. Completeness list ═══════ */}
      <div className="px-5 py-3 border-t border-gray-200">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          What&apos;s Included
        </h3>
        <p className="text-sm text-gray-700">
          {completenessText || "All accessories present."}
        </p>
      </div>

      {/* ═══════ 6. ExpiryRow (only if dated category) ═══════ */}
      <ExpiryRow
        category={category}
        eligibilityVerdict={result.eligibility_verdict}
        eligibilityReason={result.eligibility_reason}
        expiryDate={result.expiry_date}
        dateSource={result.date_source}
      />

      {/* ═══════ 7. RoutingDecision ═══════ */}
      <RoutingDecision
        recommendedRoute={result.recommended_route}
        routingLogicTrace={result.routing_logic_trace}
        routingConfidence={result.routing_confidence}
        escalatedToHuman={result.escalated_to_human}
        escalationReason={result.escalation_reason}
        alternativeRoutes={result.alternative_routes}
      />

      {/* ═══════ 8. ResaleBar ═══════ */}
      <ResaleBar
        percentage={resalePercentage}
        grade={result.condition_grade}
      />

      {/* ═══════ 9. ChatAffordance ═══════ */}
      <ChatAffordance result={result} productName={productName} />

      {/* ═══════ 10. QR placeholder ═══════ */}
      <div className="px-5 py-4 border-t border-gray-200 print:hidden">
        <div className="flex items-center justify-center h-24 rounded border-2 border-dashed border-gray-300 bg-gray-50">
          <p className="text-xs text-gray-400 text-center font-mono">
            QR — Health Card URL available post-listing
          </p>
        </div>
      </div>

      {/* ═══════ 11. Footer ═══════ */}
      <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 print:bg-transparent">
        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          Graded by Second Life Commerce · Powered by Claude Sonnet 4.6 ·{" "}
          <span className="font-mono">{result.assessed_at}</span>
        </p>
      </div>

      {/* ═══════ Bottom perforation ═══════ */}
      <div
        aria-hidden="true"
        style={PERFORATION_STYLE}
        className="w-full"
      />
    </article>
  );
}
