"use client";

/**
 * src/components/wallet/GreenCreditsWallet.tsx
 *
 * Green Credits Wallet — circular economy impact surface.
 *
 * IMPACT CALCULATIONS (useMemo):
 *   eWasteAvoided = eWasteCoefficients[category] ?? eWasteCoefficients.default
 *   CO2Saved      = parseFloat((eWasteAvoided × 3.2).toFixed(1))
 *                   // Ellen MacArthur Foundation lifecycle factor estimate (illustrative).
 *                   // NS: replace with verified, auditable lifecycle data per SKU.
 *   creditsEarned = Math.round(CO2Saved × 10)
 *
 * ELIGIBILITY:
 *   Ineligible if routing.recommended_route === 'recycle' (no resale, no exchange possible).
 *   All other routes (resell, refurbish, donate, exchange) earn credits.
 *
 * SHARE:
 *   navigator.clipboard.writeText with exact spec copy.
 *   Fallback: <textarea> pre-selected if clipboard API unavailable.
 *   "Copied! ✓" shown for exactly 2000ms then restored.
 */

import { useMemo, useState, useRef, useEffect } from "react";
import type { RoutingDecision } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GreenCreditsWalletProps {
  category: string;
  grade: string;
  routing: RoutingDecision;
  productName: string;
}

// ── E-waste coefficients (kg per item) ────────────────────────────────────────
// This const will expand to a full product taxonomy via config endpoint in NS.
// Source: illustrative estimates based on product mass and material composition.

const eWasteCoefficients: Record<string, number> = {
  electronics: 0.8,
  clothing:    0.3,
  cosmetics:   0.05,
  toys:        0.2,
  appliances:  0.6,
  furniture:   1.2,
  default:     0.2,
} as const;

// ── Ineligible routes ─────────────────────────────────────────────────────────
// Only 'recycle' is ineligible per spec. 'Dispose' is not in RoutingOutcome
// but included here as a forward-compatibility guard.

const INELIGIBLE_ROUTES = new Set(["recycle", "dispose"]);

// ─────────────────────────────────────────────────────────────────────────────

export default function GreenCreditsWallet({
  category,
  routing,
  productName,
}: GreenCreditsWalletProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "fallback">("idle");
  const [showFallback, setShowFallback] = useState(false);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ── Impact calculations ───────────────────────────────────────────────────
  const { eWasteAvoided, CO2Saved, creditsEarned, shareText } = useMemo(() => {
    const eWasteAvoided = eWasteCoefficients[category] ?? eWasteCoefficients.default;
    // Ellen MacArthur Foundation lifecycle factor estimate (illustrative).
    // The 3.2 multiplier represents kg CO₂-equivalent per kg of product kept in circulation.
    // NS: replace with verified, auditable lifecycle data per SKU.
    const CO2Saved = parseFloat((eWasteAvoided * 3.2).toFixed(1));
    const creditsEarned = Math.round(CO2Saved * 10);
    const shareText = `I just gave my ${productName} a second life, avoiding ${eWasteAvoided}kg of e-waste and saving ${CO2Saved}kg of CO₂ with @SecondLifeCommerce.`;
    return { eWasteAvoided, CO2Saved, creditsEarned, shareText };
  }, [category, productName]);

  // ── Eligibility ───────────────────────────────────────────────────────────
  const isEligible = !INELIGIBLE_ROUTES.has(routing.recommended_route);

  // ── Share handler ─────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyState("copied");
      copyTimerRef.current = setTimeout(() => {
        setCopyState("idle");
      }, 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS or denied permission)
      setShowFallback(true);
      setCopyState("fallback");
      // Select textarea text on next frame
      requestAnimationFrame(() => {
        fallbackRef.current?.select();
      });
    }
  };

  // ── Fallback textarea copy ────────────────────────────────────────────────
  useEffect(() => {
    if (showFallback && fallbackRef.current) {
      fallbackRef.current.select();
    }
  }, [showFallback]);

  // ── Shared timestamp ──────────────────────────────────────────────────────
  const timestamp = useMemo(
    () =>
      new Date().toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  // ─── INELIGIBLE STATE ────────────────────────────────────────────────────
  if (!isEligible) {
    return (
      <div
        className="rounded-xl px-5 py-5"
        style={{ backgroundColor: "#374151" }}
        role="region"
        aria-label="Green Credits Wallet — no credits earned"
      >
        <p className="text-sm text-white/90 leading-relaxed">
          No credits earned — this item is being responsibly disposed of.
          Choosing responsible disposal still matters.
        </p>
      </div>
    );
  }

  // ─── ELIGIBLE STATE ──────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl px-5 py-5 flex flex-col gap-4"
      style={{ backgroundColor: "#14532d" }}
      role="region"
      aria-label="Green Credits Wallet"
    >
      {/* ── Header ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">
          Green Credits Wallet
        </p>
        <p className="text-sm font-semibold text-white/90">
          Your circular economy impact
        </p>
      </div>

      {/* ── Three impact numbers ── */}
      <div className="grid grid-cols-3 gap-2">
        {/* e-waste avoided */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold text-white tabular-nums">
            {eWasteAvoided}
          </span>
          <span className="text-sm text-center text-white/80 leading-snug">
            kg e-waste
            <br />
            avoided
          </span>
        </div>

        {/* CO₂ saved */}
        <div className="flex flex-col items-center gap-1 border-x border-white/10 px-2">
          <span className="text-3xl font-bold text-white tabular-nums">
            {CO2Saved}
          </span>
          <span className="text-sm text-center text-white/80 leading-snug">
            kg CO₂
            <br />
            saved
          </span>
        </div>

        {/* Credits earned */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold text-white tabular-nums">
            {creditsEarned}
          </span>
          <span className="text-sm text-center text-white/80 leading-snug">
            Credits
            <br />
            earned
          </span>
        </div>
      </div>

      {/* ── Verified timestamp ── */}
      <p className="text-xs text-white/60">
        Your impact — verified at listing. {timestamp}
      </p>

      {/* ── Share button ── */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleShare}
          disabled={copyState === "copied"}
          aria-label="Share your impact"
          className="self-start rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold
                     text-white hover:bg-green-800/40 transition-colors
                     disabled:opacity-70
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
        >
          {copyState === "copied" ? "Copied to clipboard" : "Share impact"}
        </button>

        {/* Fallback textarea — shown only if clipboard API is unavailable */}
        {showFallback && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-white/50">
              Copy the text below to share:
            </p>
            <textarea
              ref={fallbackRef}
              readOnly
              value={shareText}
              rows={3}
              className="w-full rounded-lg bg-green-950/50 border border-green-700/50
                         text-xs text-white/80 px-3 py-2 resize-none focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
