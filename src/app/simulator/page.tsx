/**
 * src/app/simulator/page.tsx
 *
 * Standalone Routing Simulator page.
 * Accessible directly at /simulator for developers and sellers
 * who want to explore routing logic without submitting a real item.
 */

import type { Metadata } from "next";
import Link from "next/link";
import RoutingSimulator from "@/components/simulator/RoutingSimulator";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Routing Simulator — Second Life Commerce",
  description:
    "Explore how condition, local demand, and buyer distance affect routing decisions. Adjust the sliders to see recovered value and routing logic in real time.",
};

export default function SimulatorPage() {
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
        <div>
          <h1 className="text-sm font-semibold text-brand-200">
            Routing Simulator
          </h1>
          <p className="text-[11px] text-brand-600">
            Pure client-side — no API call, instant feedback
          </p>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
        {/* Explainer banner */}
        <div className="w-full max-w-2xl rounded-xl border border-brand-800/60 bg-brand-950/40 px-5 py-4">
          <h2 className="text-sm font-semibold text-brand-200 mb-1">
            How does routing work?
          </h2>
          <p className="text-xs text-brand-500 leading-relaxed">
            Second Life Commerce routes items based on three signals: <strong className="text-brand-400">condition grade</strong> (A–E from AI grading),{" "}
            <strong className="text-brand-400">local demand</strong> (real-time marketplace signals), and{" "}
            <strong className="text-brand-400">buyer distance</strong> (shipping cost vs. recovered value).
            Adjust the controls below to see how each factor shifts the decision — and the ₹ recovered.
          </p>
        </div>

        {/* Simulator */}
        <RoutingSimulator
          initialGrade="C"
          initialDemand={60}
          initialDistance={50}
        />

        {/* Call to action */}
        <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/grade"
            id="go-grade-from-simulator"
            className="rounded-xl bg-brand-500 text-brand-950 px-6 py-3 text-sm font-semibold
                       hover:bg-brand-400 transition-all"
          >
            Grade a real item →
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-3 text-sm font-medium
                       text-brand-300 hover:text-brand-100 hover:border-brand-600 transition-all"
          >
            View dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
