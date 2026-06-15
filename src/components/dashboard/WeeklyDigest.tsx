"use client";

/**
 * src/components/dashboard/WeeklyDigest.tsx
 *
 * Three gauge-style number cards — the first thing the seller reads.
 * Instrument-reading aesthetic: large numbers, single-line label beneath.
 *
 * Indian number formatting: 284000 → "₹2,84,000" (lakh-style grouping).
 */

interface WeeklyDigestProps {
  recoveredValue: number;
  autoGraded: number;
  itemsGraded: number;
  hoursAutoSaved: number;
}

function formatINR(value: number): string {
  return "₹" + value.toLocaleString("en-IN");
}

export default function WeeklyDigest({
  recoveredValue,
  autoGraded,
  itemsGraded,
  hoursAutoSaved,
}: WeeklyDigestProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {/* ── Recovered value ── */}
      <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-green-800/40 bg-green-950/30 px-5 py-6">
        <span className="text-4xl sm:text-5xl font-black text-green-400 tabular-nums tracking-tight leading-none">
          {formatINR(recoveredValue)}
        </span>
        <span className="text-xs font-semibold text-green-600 uppercase tracking-widest">
          Recovered this week
        </span>
      </div>

      {/* ── Auto-graded ratio ── */}
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-6">
        <span className="text-4xl font-black text-brand-100 tabular-nums tracking-tight leading-none">
          {autoGraded}<span className="text-2xl text-brand-600 font-bold">/{itemsGraded}</span>
        </span>
        <span className="text-xs font-semibold text-brand-600 uppercase tracking-widest">
          Items auto-graded
        </span>
      </div>

      {/* ── Hours saved ── */}
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-6">
        <span className="text-4xl font-black text-brand-100 tabular-nums tracking-tight leading-none">
          {hoursAutoSaved}<span className="text-xl text-brand-500 font-bold ml-1">hrs</span>
        </span>
        <span className="text-xs font-semibold text-brand-600 uppercase tracking-widest">
          Saved in manual review
        </span>
      </div>
    </div>
  );
}
