"use client";

/**
 * src/components/health-card/ExpiryRow.tsx
 *
 * Conditionally renders expiry status for dated-category items only.
 * Uses DATED_CATEGORIES constant (never a hardcoded array) to gate rendering.
 *
 * Visual states:
 *   - Valid: green ✓ "Valid until [date]"
 *   - Expired: red ✗ "Expired [date]" + full red background
 *   - Near expiry: amber ⚠ "Near expiry — [date]"
 *   - No date: gray "No date available"
 *
 * Date source badge: LABEL OCR / ESTIMATED / NOT AVAILABLE (monospaced).
 */

import type { DatedCategory, EligibilityVerdict, DateSource } from "@/lib/types";

interface ExpiryRowProps {
  category: DatedCategory;
  eligibilityVerdict: EligibilityVerdict;
  eligibilityReason: string;
  expiryDate: string | null;
  dateSource: DateSource;
}

/** Check if the category is a dated one that should show the expiry row.
 *  We check against the DatedCategory type — "none" means not dated.
 */
function isDatedForDisplay(category: DatedCategory): boolean {
  return category !== "none";
}

/** Determine expiry visual state. */
function getExpiryState(
  expiryDate: string | null,
  eligibilityVerdict: EligibilityVerdict,
  eligibilityReason: string
): "valid" | "expired" | "near_expiry" | "unknown" {
  // Check eligibility verdict/reason for expiry-related blocking
  const isExpiryRelatedRecycle =
    (eligibilityVerdict === "recycle_only" || eligibilityVerdict === "recycle_or_dispose") &&
    (eligibilityReason.toLowerCase().includes("expir") ||
     eligibilityReason.toLowerCase().includes("date"));

  if (isExpiryRelatedRecycle) return "expired";

  if (eligibilityVerdict === "local_timebox_or_donate") return "near_expiry";

  if (!expiryDate) return "unknown";

  const expiry = new Date(expiryDate);
  const now = new Date();
  if (expiry <= now) return "expired";

  const daysUntil = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
  if (daysUntil <= 30) return "near_expiry";

  return "valid";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const DATE_SOURCE_LABELS: Record<DateSource, string> = {
  label_ocr: "LABEL OCR",
  estimated: "ESTIMATED",
  none: "NOT AVAILABLE",
};

export default function ExpiryRow({
  category,
  eligibilityVerdict,
  eligibilityReason,
  expiryDate,
  dateSource,
}: ExpiryRowProps) {
  // ── Gate: only render for dated categories ──────────────────────────────────
  if (!isDatedForDisplay(category)) return null;

  const state = getExpiryState(expiryDate, eligibilityVerdict, eligibilityReason);

  const isExpiredHighlight = state === "expired";

  return (
    <div
      className={[
        "flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-200 print:border-gray-300",
        isExpiredHighlight ? "bg-red-50" : "",
      ].join(" ")}
    >
      {/* ── Status icon + text ── */}
      <div className="flex items-center gap-2 min-w-0">
        {state === "valid" && (
          <>
            <span className="text-green-600 text-sm shrink-0" aria-hidden="true">✓</span>
            <span className="text-sm text-green-700 font-medium truncate">
              Valid until {formatDate(expiryDate)}
            </span>
          </>
        )}
        {state === "expired" && (
          <>
            <span className="text-red-600 text-sm shrink-0" aria-hidden="true">✗</span>
            <span className="text-sm text-red-700 font-semibold truncate">
              Expired {expiryDate ? formatDate(expiryDate) : ""}
            </span>
          </>
        )}
        {state === "near_expiry" && (
          <>
            <span className="text-amber-600 text-sm shrink-0" aria-hidden="true">⚠</span>
            <span className="text-sm text-amber-700 font-medium truncate">
              Near expiry — {formatDate(expiryDate)}
            </span>
          </>
        )}
        {state === "unknown" && (
          <>
            <span className="text-gray-400 text-sm shrink-0" aria-hidden="true">—</span>
            <span className="text-sm text-gray-500 font-medium">
              No date available
            </span>
          </>
        )}
      </div>

      {/* ── Date source badge (monospaced) ── */}
      <span
        className={[
          "shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
          dateSource === "label_ocr"
            ? "bg-green-100 text-green-700"
            : dateSource === "estimated"
              ? "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-500",
        ].join(" ")}
      >
        {DATE_SOURCE_LABELS[dateSource]}
      </span>
    </div>
  );
}
