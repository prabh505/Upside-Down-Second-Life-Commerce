"use client";

/**
 * src/components/dashboard/IneligiblePanel.tsx
 *
 * Safety-critical panel showing items that were BLOCKED from listing.
 * Red left border + red-tinted background to signal danger/urgency.
 *
 * Each item card has an "Arrange Disposal" stub button that shows
 * a plain absolutely-positioned toast that fades out after 2 seconds.
 * No toast library — just a div with setTimeout.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { AlertOctagon, CircleCheck } from "lucide-react";

interface IneligibleItem {
  name: string;
  reason: string;
  category: string;
}

interface IneligiblePanelProps {
  items: IneligibleItem[];
}

// ── Category badge colors ─────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  perishable:      { bg: "bg-amber-100",  text: "text-amber-800",  label: "Perishable" },
  safety_critical: { bg: "bg-red-100",    text: "text-red-800",    label: "Safety Critical" },
  non_resalable:   { bg: "bg-gray-200",   text: "text-gray-700",   label: "Non-Resalable" },
  none:            { bg: "bg-gray-100",    text: "text-gray-500",   label: "General" },
};

function getCategoryBadge(category: string) {
  return CATEGORY_BADGE[category] ?? CATEGORY_BADGE.none;
}

export default function IneligiblePanel({ items }: IneligiblePanelProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [toastFading, setToastFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showToast = useCallback((itemName: string) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast(`Disposal workflow coming soon for "${itemName}"`);
    setToastFading(false);

    // Start fade after 1.5s, remove after 2s
    timerRef.current = setTimeout(() => {
      setToastFading(true);
      timerRef.current = setTimeout(() => {
        setToast(null);
        setToastFading(false);
      }, 500);
    }, 1500);
  }, []);

  // ── Empty state (all eligible) ──────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-l-4 border-green-500 bg-green-950/30 px-5 py-4">
        <p className="flex items-center gap-2 text-sm text-green-400 font-medium">
          <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          All items this week were eligible.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border-l-4 border-red-600 bg-red-50 dark:bg-red-950/20 px-5 py-4">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={[
            "absolute top-3 right-3 z-50 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-xs font-medium shadow-lg",
            "transition-opacity duration-500",
            toastFading ? "opacity-0" : "opacity-100",
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-1">
        <AlertOctagon className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
        <h2 className="text-base font-bold text-red-700 dark:text-red-400">
          Cannot Be Listed
        </h2>
      </div>
      <p className="text-xs text-red-600/80 dark:text-red-500/80 mb-4 leading-relaxed">
        These items have been blocked. No expired or restricted item can be listed on the platform.
      </p>

      {/* ── Item cards ── */}
      <div className="grid gap-2.5">
        {items.map((item, i) => {
          const badge = getCategoryBadge(item.category);
          return (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4
                         rounded-lg bg-white dark:bg-brand-950/60 border border-red-200 dark:border-red-900/40 px-4 py-3"
            >
              {/* Item info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-brand-100 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-brand-500 mt-0.5">
                  {item.reason}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Category badge */}
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </span>

                {/* Arrange Disposal button */}
                <button
                  onClick={() => showToast(item.name)}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800
                             rounded-lg px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-950/50
                             transition-colors shrink-0
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  Arrange Disposal
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
