"use client";

/**
 * src/context/GradingContext.tsx
 *
 * Cross-component state for the grading result.
 *
 * Eliminates prop drilling beyond 2 levels:
 *   grade/page.tsx → setResult()
 *   HealthCard, RoutingSimulator, SecondLifeScore, GreenCreditsWallet → useGradingContext()
 *
 * Integration notes:
 *   - Provider wraps the app in layout.tsx (via a client-component wrapper).
 *   - The context holds the most recent GradingResult + productName.
 *   - clearResult() resets to null (used by ErrorBoundary "Try again").
 *   - This is MVP scope — NS adds persistence, multi-item history, etc.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { GradingResult } from "@/lib/types";

// ── Context shape ─────────────────────────────────────────────────────────────

interface GradingContextValue {
  /** The most recent grading result, or null if no grading has been performed. */
  result: GradingResult | null;
  /** Product name entered by the user in the grading form. */
  productName: string;
  /** Set a new grading result + product name. */
  setResult: (result: GradingResult, name: string) => void;
  /** Clear the result (e.g. "Try again" from ErrorBoundary). */
  clearResult: () => void;
}

const GradingContext = createContext<GradingContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function GradingContextProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<GradingResult | null>(null);
  const [productName, setProductName] = useState("");

  const setResult = useCallback((r: GradingResult, name: string) => {
    setResultState(r);
    setProductName(name);
  }, []);

  const clearResult = useCallback(() => {
    setResultState(null);
    setProductName("");
  }, []);

  return (
    <GradingContext.Provider
      value={{ result, productName, setResult, clearResult }}
    >
      {children}
    </GradingContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGradingContext(): GradingContextValue {
  const ctx = useContext(GradingContext);
  if (ctx === undefined) {
    throw new Error(
      "useGradingContext must be used within a GradingContextProvider"
    );
  }
  return ctx;
}
