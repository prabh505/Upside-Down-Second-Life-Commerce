"use client";

/**
 * src/components/ErrorBoundary.tsx
 *
 * React class component error boundary — hooks cannot catch render errors.
 *
 * Usage:
 *   <ErrorBoundary fallback={<MyFallback />} onError={logToService}>
 *     <ComponentThatMightFail />
 *   </ErrorBoundary>
 *
 * Known fallback patterns in this codebase:
 *   - CameraView: "Camera unavailable" + Refresh button
 *   - HealthCard: "Unable to display grading result" + Copy raw + Try again
 *   - ExchangeMap: ExchangePointList (list fallback)
 */

import React, { type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI rendered when an error is caught. */
  fallback?: ReactNode;
  /** Optional callback invoked when an error is caught — for logging. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // If the parent provided a custom fallback, render it.
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Generic fallback (should not be reached in practice — all usages
      // in this codebase pass an explicit fallback prop).
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 py-8 px-4"
        >
          <p className="text-sm font-semibold text-red-400">
            Something went wrong.
          </p>
          <p className="text-xs text-brand-500">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-semibold text-brand-400 underline"
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
