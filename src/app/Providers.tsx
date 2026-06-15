"use client";

/**
 * src/app/Providers.tsx
 *
 * Client-component wrapper for all context providers.
 * Imported by layout.tsx (a Server Component) so that:
 *   1. layout.tsx stays a Server Component (can export metadata).
 *   2. All client-side providers are wrapped in a single boundary.
 *
 * Currently wraps: GradingContextProvider.
 * NS: add AuthProvider, ThemeProvider, etc.
 */

import { type ReactNode } from "react";
import { GradingContextProvider } from "@/context/GradingContext";

export default function Providers({ children }: { children: ReactNode }) {
  return <GradingContextProvider>{children}</GradingContextProvider>;
}
