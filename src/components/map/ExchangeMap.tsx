"use client";

/**
 * src/components/map/ExchangeMap.tsx
 *
 * Community Exchange Map — outer wrapper + filter state.
 *
 * SSR GUARD PATTERN:
 *   Leaflet and react-leaflet reference browser-only globals (window, document,
 *   navigator) at module load time. Server-side rendering will throw
 *   "ReferenceError: window is not defined" at build time.
 *   Solution: dynamic(import, { ssr: false }) ensures the entire Leaflet
 *   component tree is only instantiated in the browser.
 *
 *   The dynamic import is co-located HERE (not in the consuming page) so that:
 *   a) Any page that imports ExchangeMap automatically gets the SSR guard.
 *   b) The guard cannot be forgotten when the component is moved or reused.
 *
 * Filter logic:
 *   The activeFilter state lives here and controls which points are passed as
 *   props to MapInner. Conditional <Marker> rendering in MapInner is the
 *   react-leaflet equivalent of addLayer/removeLayer — no CSS visibility tricks.
 */

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import ExchangePointList from "./ExchangePoint";

// ── Data types ────────────────────────────────────────────────────────────────

export interface ExchangePointData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  acceptsCategories: string[];
  distance: number;
}

// ── Mock exchange points (Bengaluru) ──────────────────────────────────────────
// Schema matches future API response — swap import when backend is ready.

const EXCHANGE_POINTS: ExchangePointData[] = [
  {
    id: 1,
    name: "NGO Hub — Koramangala",
    lat: 12.9352,
    lng: 77.6245,
    type: "NGO",
    acceptsCategories: ["electronics", "clothing", "toys"],
    distance: 4.2,
  },
  {
    id: 2,
    name: "Community Shelf — Indiranagar",
    lat: 12.9784,
    lng: 77.6408,
    type: "community",
    acceptsCategories: ["books", "clothing", "kitchenware"],
    distance: 7.1,
  },
  {
    id: 3,
    name: "E-Waste Collection — HSR Layout",
    lat: 12.9116,
    lng: 77.6389,
    type: "recycling",
    acceptsCategories: ["electronics", "batteries"],
    distance: 9.8,
  },
  {
    id: 4,
    name: "Donate a Toy — Jayanagar",
    lat: 12.9244,
    lng: 77.5838,
    type: "NGO",
    acceptsCategories: ["toys", "childrenClothing"],
    distance: 5.3,
  },
  {
    id: 5,
    name: "Repair Café — Malleshwaram",
    lat: 13.0035,
    lng: 77.5703,
    type: "repair",
    acceptsCategories: ["electronics", "appliances"],
    distance: 11.2,
  },
];

// ── Filter definitions ────────────────────────────────────────────────────────

const FILTER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "All",        value: "all"       },
  { label: "NGO",        value: "NGO"       },
  { label: "Community",  value: "community" },
  { label: "Recycling",  value: "recycling" },
  { label: "Repair",     value: "repair"    },
];

// ── Dynamic import of MapInner (SSR disabled) ─────────────────────────────────
//
// ssr: false → Next.js will NOT attempt to render this during static generation
// or server-side rendering. MapInner imports leaflet/dist/leaflet.css and
// calls L.Icon.Default.mergeOptions(), both of which require browser globals.
// Without this guard, `next build` fails with "window is not defined".

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[280px] sm:h-[400px] w-full rounded-b-xl bg-brand-900/60 animate-pulse flex items-center justify-center"
      aria-label="Map loading…"
    >
      <span className="text-xs text-brand-600 font-medium">Loading map…</span>
    </div>
  ),
});

// ── ExchangeMap (main export) ─────────────────────────────────────────────────

interface ExchangeMapProps {
  /** Optional className applied to the outer container. */
  className?: string;
}

export default function ExchangeMap({ className }: ExchangeMapProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Filter points — "all" shows every point, otherwise match by type.
  const filteredPoints = useMemo<ExchangePointData[]>(() => {
    if (activeFilter === "all") return EXCHANGE_POINTS;
    return EXCHANGE_POINTS.filter(
      (p) => p.type.toLowerCase() === activeFilter.toLowerCase()
    );
  }, [activeFilter]);

  return (
    <div className={className}>
      {/* ── Filter bar ── */}
      <div
        className="flex flex-wrap gap-2 px-1 py-3"
        role="group"
        aria-label="Filter exchange points by type"
      >
        {FILTER_OPTIONS.map((opt) => {
          const isActive = activeFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              aria-pressed={isActive}
              className={[
                "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                isActive
                  ? "bg-brand-500 text-brand-950 border-brand-500"
                  : "bg-transparent text-brand-500 border-brand-700 hover:border-brand-500 hover:text-brand-300",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}

        {/* Result count */}
        <span className="ml-auto self-center text-[11px] text-brand-600">
          {filteredPoints.length} location{filteredPoints.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Map ── */}
      <div className="rounded-xl overflow-hidden border border-[var(--card-border)] h-[280px] sm:h-[400px]">
        <MapInner points={filteredPoints} />
      </div>

      {/* ── List view (mobile supplement — always visible) ── */}
      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-2 px-1">
          Nearby exchange locations
        </p>
        <ExchangePointList
          points={filteredPoints}
          activeFilter={activeFilter}
        />
      </div>
    </div>
  );
}

// Re-export the data type and mock data for use by ErrorBoundary fallback
export type { ExchangePointData as ExchangePoint };
export { EXCHANGE_POINTS };
