"use client";

/**
 * src/app/map/page.tsx
 *
 * Community Exchange Map page.
 *
 * This page is a client component so it can render ErrorBoundary
 * (a React class component) around ExchangeMap. The ErrorBoundary
 * fallback renders ExchangePointList in list-view mode when Leaflet
 * crashes (e.g. WebGL context lost, memory pressure on mobile).
 */

import ExchangeMap, { EXCHANGE_POINTS } from "@/components/map/ExchangeMap";
import { ExchangePointList } from "@/components/map/ExchangePoint";
import ErrorBoundary from "@/components/ErrorBoundary";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

function MapFallback() {
  return (
    <div role="alert">
      <div className="flex items-center gap-2 mb-3 px-1">
        <AlertCircle className="w-4 h-4 text-amber-400" aria-hidden="true" />
        <p className="text-xs font-semibold text-amber-400">
          Map unavailable — showing list view.
        </p>
      </div>
      <ExchangePointList points={EXCHANGE_POINTS} activeFilter="all" />
    </div>
  );
}

export default function MapPage() {
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[var(--card-border)]">
        <Link
          href="/"
          aria-label="Back to home"
          className="rounded-lg p-1.5 text-brand-500 hover:text-brand-300 hover:bg-brand-900/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-sm font-bold text-brand-100">
            Community Exchange Map
          </h1>
          <p className="text-[11px] text-brand-600">
            Bengaluru · 5 exchange locations
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <ErrorBoundary fallback={<MapFallback />}>
            <ExchangeMap />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
