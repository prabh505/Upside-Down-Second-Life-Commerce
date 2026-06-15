/**
 * src/components/map/MapInner.tsx
 *
 * The actual Leaflet/react-leaflet component tree.
 * THIS FILE IS ONLY EVER IMPORTED VIA next/dynamic WITH ssr:false.
 * See ExchangeMap.tsx for the dynamic import and the explanation of why.
 *
 * Key constraints:
 *  1. Leaflet CSS must be imported here (inside the dynamic boundary) so it
 *     is only bundled for the browser, not injected during SSR.
 *  2. The default marker icon fix must live in a useEffect with [].
 *  3. DivIcons are used for all markers — they are pure CSS and require no
 *     webpack asset resolution (unlike Leaflet's default PNG icons).
 */

import { useEffect, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { ExchangePointData } from "./ExchangeMap";

// ── Marker colors by type ─────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  NGO:        "#22c55e", // green-500
  community:  "#3b82f6", // blue-500
  recycling:  "#6b7280", // gray-500
  repair:     "#f59e0b", // amber-500
};

function createDivIcon(type: string): L.DivIcon {
  const color = TYPE_COLORS[type] ?? "#6b7280";
  return L.divIcon({
    // className must be empty string — otherwise Leaflet adds its own
    // white-box default-icon CSS class which overrides our styling.
    className: "",
    html: `<div style="
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${color};
      border: 2.5px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.45);
    "></div>`,
    iconSize:    [18, 18],
    iconAnchor:  [9, 9],
    popupAnchor: [0, -12],
  });
}

// ── MapInner ──────────────────────────────────────────────────────────────────

interface MapInnerProps {
  points: ExchangePointData[];
}

export default function MapInner({ points }: MapInnerProps) {
  useEffect(() => {
    /**
     * Leaflet's default icon uses webpack asset hashing which Next.js breaks —
     * this manually sets the paths.
     *
     * Even though we use DivIcons for our own markers, this fix prevents console
     * errors if any third-party react-leaflet plugin falls back to default icons.
     */
    L.Icon.Default.mergeOptions({
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      iconUrl:       require("leaflet/dist/images/marker-icon.png") as string,
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png") as string,
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      shadowUrl:     require("leaflet/dist/images/marker-shadow.png") as string,
    });
  }, []); // [] → runs once on mount, never on re-render

  const getDirectionsUrl = useCallback(
    (lat: number, lng: number) =>
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    []
  );

  return (
    <MapContainer
      center={[12.9716, 77.5946]} // Bengaluru city centre
      zoom={12}
      className="h-full w-full rounded-b-xl z-0"
      // scrollWheelZoom only on desktop — prevents accidental scroll capture
      scrollWheelZoom
    >
      {/* OpenStreetMap tile layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      />

      {/*
        Conditional rendering of <Marker> = react-leaflet equivalent of
        addLayer / removeLayer. When a <Marker> unmounts, react-leaflet calls
        layer.remove() internally, keeping the DOM clean.
        No CSS display:none — the layer is fully removed from the map.
      */}
      {points.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={createDivIcon(point.type)}
        >
          <Popup className="slc-popup">
            <div className="min-w-[200px] p-1">
              {/* Name */}
              <p className="font-bold text-sm text-gray-900 mb-1">
                {point.name}
              </p>

              {/* Type badge */}
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mb-2"
                style={{
                  backgroundColor: (TYPE_COLORS[point.type] ?? "#6b7280") + "22",
                  color: TYPE_COLORS[point.type] ?? "#6b7280",
                }}
              >
                {point.type}
              </span>

              {/* Distance */}
              <p className="text-xs text-gray-500 mb-1.5">
                {point.distance} km away
              </p>

              {/* Accepts categories */}
              <div className="flex flex-wrap gap-1 mb-2.5">
                {point.acceptsCategories.map((cat) => (
                  <span
                    key={cat}
                    className="text-[9px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Get directions link */}
              <a
                href={getDirectionsUrl(point.lat, point.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Get directions →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
