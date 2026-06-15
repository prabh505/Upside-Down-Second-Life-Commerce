"use client";

/**
 * src/components/dashboard/RoutingLanes.tsx
 *
 * A horizontal bar divided into proportional colored lanes.
 * Widths are exact percentages of total (no rounding errors).
 *
 * The Expired/Ineligible lane is visually separated (margin-left: 4px)
 * and outlined in red to signal "these items were blocked."
 */

interface RoutingLanesProps {
  routed: {
    relist: number;
    refurbish: number;
    humanReview: number;
    expired_ineligible: number;
  };
  total: number;
}

interface Lane {
  key: string;
  label: string;
  count: number;
  color: string;
  textColor: string;
  isIneligible?: boolean;
}

export default function RoutingLanes({ routed, total }: RoutingLanesProps) {
  const lanes: Lane[] = [
    {
      key: "relist",
      label: "Relist",
      count: routed.relist,
      color: "#22c55e",      // green-500
      textColor: "#052e16",  // green-950
    },
    {
      key: "refurbish",
      label: "Refurbish",
      count: routed.refurbish,
      color: "#f59e0b",      // amber-500
      textColor: "#451a03",  // amber-950
    },
    {
      key: "humanReview",
      label: "Review",
      count: routed.humanReview,
      color: "#3b82f6",      // blue-500
      textColor: "#172554",  // blue-950
    },
    {
      key: "expired",
      label: "Blocked",
      count: routed.expired_ineligible,
      color: "#ef4444",      // red-500
      textColor: "#450a0a",  // red-950
      isIneligible: true,
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-3">
        Routing breakdown — {total} items
      </h2>

      {/* ── Lane bar ── */}
      <div className="flex items-stretch h-10 rounded-lg overflow-visible" role="img" aria-label="Routing distribution bar">
        {lanes.map((lane) => {
          const widthPct = (lane.count / total) * 100;
          const showLabel = widthPct >= 8; // Only show inline label if lane is wide enough

          return (
            <div
              key={lane.key}
              className={[
                "relative flex items-center justify-center transition-all duration-200",
                lane.isIneligible
                  ? "ml-1 rounded-r-lg border-2 border-red-500"
                  : "first:rounded-l-lg",
              ].join(" ")}
              style={{
                width: `${widthPct}%`,
                backgroundColor: lane.color,
                minWidth: "24px",
              }}
              role="img"
              aria-label={`${lane.label}: ${lane.count} items (${widthPct.toFixed(1)}%)`}
            >
              {showLabel && (
                <span
                  className="text-[10px] font-bold truncate px-1"
                  style={{ color: lane.textColor }}
                >
                  {lane.count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
        {lanes.map((lane) => {
          const widthPct = (lane.count / total) * 100;
          return (
            <div key={lane.key} className="flex items-center gap-1.5">
              <span
                className={[
                  "w-2.5 h-2.5 rounded-sm shrink-0",
                  lane.isIneligible ? "ring-1 ring-red-400" : "",
                ].join(" ")}
                style={{ backgroundColor: lane.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-brand-400">
                <span className="font-semibold">{lane.label}</span>{" "}
                <span className="text-brand-600">
                  {lane.count} ({widthPct.toFixed(1)}%)
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
