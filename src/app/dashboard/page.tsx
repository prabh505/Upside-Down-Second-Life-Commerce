"use client";

/**
 * src/app/dashboard/page.tsx
 *
 * Seller Co-pilot Dashboard — MVP build for Prompt 7.
 * Client component: owns the mock data and renders all sub-components.
 *
 * Layout order (designed for 5-second comprehension):
 *   1. WeeklyDigest (headline numbers)
 *   2. IneligiblePanel (safety-critical: blocked items)
 *   3. RoutingLanes (distribution bar)
 *   4. DemandSparkline (7-day trend)
 *   5. InsightCallout (co-pilot recommendation)
 *   6. RoutingSimulator (interactive "what-if")
 *
 * Indian number formatting throughout.
 * Note: 'use client' pages cannot export `metadata`; title via layout.tsx.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import WeeklyDigest from "@/components/dashboard/WeeklyDigest";
import IneligiblePanel from "@/components/dashboard/IneligiblePanel";
import RoutingLanes from "@/components/dashboard/RoutingLanes";
import DemandSparkline from "@/components/dashboard/DemandSparkline";
import InsightCallout from "@/components/dashboard/InsightCallout";
import RoutingSimulator from "@/components/simulator/RoutingSimulator";

// ── Mock data (schema matches future API response shape) ──────────────────────

const weeklyData = {
  seller: { name: "Arjun Stores", weekEnding: "2025-01-19" },
  itemsGraded: 200,
  autoGraded: 180,
  routed: { relist: 160, refurbish: 12, humanReview: 8, expired_ineligible: 20 },
  recoveredValue: 284000,
  hoursAutoSaved: 18,
  topCategory: "Consumer Electronics",
  topDefect: "Cosmetic scratches",
  demandTrend: [42, 51, 49, 63, 58, 71, 68],
  ineligibleItems: [
    { name: "Baby Formula (Aptamil)", reason: "Expired 12 Jan 2025", category: "perishable" },
    { name: "Car Seat (Graco Extend2Fit)", reason: "No readable manufacture date", category: "safety_critical" },
    { name: "Sunscreen (Neutrogena SPF50)", reason: "Expired 3 Jan 2025", category: "perishable" },
    { name: "Prescription Medication", reason: "Non-resalable category", category: "non_resalable" },
  ],
};

// ── Date formatting ───────────────────────────────────────────────────────────

function formatWeekEnding(dateStr: string): string {
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

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const d = weeklyData;

  return (
    <div className="flex flex-col min-h-dvh">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[var(--card-border)]">
        <Link
          href="/"
          aria-label="Back to home"
          className="rounded-lg p-1.5 text-brand-500 hover:text-brand-300 hover:bg-brand-900/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-brand-100 truncate">
            Week of {formatWeekEnding(d.seller.weekEnding)} — {d.seller.name}
          </h1>
          <p className="text-[11px] text-brand-600">
            Seller Co-pilot · Weekly Digest
          </p>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-5">

          {/* ═══════ 1. WeeklyDigest — headline numbers ═══════ */}
          <WeeklyDigest
            recoveredValue={d.recoveredValue}
            autoGraded={d.autoGraded}
            itemsGraded={d.itemsGraded}
            hoursAutoSaved={d.hoursAutoSaved}
          />

          {/* ═══════ 2. IneligiblePanel — blocked items (safety-critical) ═══════ */}
          <IneligiblePanel items={d.ineligibleItems} />

          {/* ═══════ 3. RoutingLanes — distribution bar ═══════ */}
          <RoutingLanes routed={d.routed} total={d.itemsGraded} />

          {/* ═══════ 4. DemandSparkline — 7-day trend ═══════ */}
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-3">
              Local demand trend — last 7 days
            </h2>
            <DemandSparkline
              data={d.demandTrend}
              label="Daily demand score (higher = more buyers)"
            />
          </div>

          {/* ═══════ 5. InsightCallout — co-pilot recommendation ═══════ */}
          <InsightCallout
            topCategory={d.topCategory}
            topDefect={d.topDefect}
          />

          {/* ═══════ 6. Routing Simulator ═══════ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                Explore routing decisions
              </span>
              <div className="flex-1 h-px bg-brand-800" />
            </div>
            <RoutingSimulator
              initialGrade="C"
              initialDemand={60}
              initialDistance={50}
            />
          </div>

          {/* ── CTA: Grade a new item ── */}
          <Link
            href="/grade"
            id="grade-from-dashboard"
            className="block text-center rounded-xl bg-brand-500 text-brand-950 px-6 py-3
                       text-sm font-semibold hover:bg-brand-400 transition-all"
          >
            + Grade a new item
          </Link>

        </div>
      </main>
    </div>
  );
}
