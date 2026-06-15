/**
 * src/components/map/ExchangePoint.tsx
 *
 * List view of exchange points — mobile supplement and ErrorBoundary fallback.
 *
 * Exported as BOTH a named export AND a default export so that:
 *   - Default: used by ExchangeMap (and pages) without aliasing.
 *   - Named:   used by the ErrorBoundary fallback without import aliasing:
 *              import { ExchangePointList } from '@/components/map/ExchangePoint'
 *
 * Props:
 *   points       – array of ExchangePointData (pre-filtered by ExchangeMap)
 *   activeFilter – current filter value (for ARIA label context)
 *
 * Sort: ascending by distance (nearest first).
 * Filter: points are already filtered by the caller — no secondary filtering here.
 *         The activeFilter prop is used only for ARIA context.
 */

import type { ExchangePointData } from "./ExchangeMap";

// ── Type badge colours (CSS-safe inline style values) ────────────────────────

const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  NGO:        { bg: "#dcfce7", text: "#166534" }, // green-100 / green-800
  community:  { bg: "#dbeafe", text: "#1e40af" }, // blue-100  / blue-800
  recycling:  { bg: "#f3f4f6", text: "#374151" }, // gray-100  / gray-700
  repair:     { bg: "#fef3c7", text: "#92400e" }, // amber-100 / amber-800
};

// ── ExchangePointList ─────────────────────────────────────────────────────────

interface ExchangePointListProps {
  points: ExchangePointData[];
  activeFilter: string;
}

function ExchangePointList({ points, activeFilter }: ExchangePointListProps) {
  // Sort by distance ascending (nearest first)
  const sorted = [...points].sort((a, b) => a.distance - b.distance);

  if (sorted.length === 0) {
    return (
      <div className="text-xs text-brand-600 px-2 py-4 text-center">
        No exchange locations found
        {activeFilter !== "all" ? ` for type "${activeFilter}"` : ""}.
      </div>
    );
  }

  return (
    <ul
      className="flex flex-col gap-2"
      aria-label={`Exchange locations${activeFilter !== "all" ? ` — ${activeFilter}` : ""}`}
    >
      {sorted.map((point) => {
        const badge = BADGE_STYLES[point.type] ?? BADGE_STYLES.recycling;
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;

        return (
          <li
            key={point.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
          >
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brand-100 truncate">
                {point.name}
              </p>
              <p className="text-xs text-brand-500 mt-0.5">
                {point.distance} km away
              </p>
            </div>

            {/* Type badge */}
            <span
              className="shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {point.type}
            </span>

            {/* Get directions */}
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Get directions to ${point.name}`}
              className="shrink-0 text-[11px] font-semibold text-blue-500 hover:text-blue-400 transition-colors whitespace-nowrap"
            >
              Directions →
            </a>
          </li>
        );
      })}
    </ul>
  );
}

// Named export (for ErrorBoundary fallback — no import aliasing needed)
export { ExchangePointList };

// Default export (for ExchangeMap internal use)
export default ExchangePointList;
