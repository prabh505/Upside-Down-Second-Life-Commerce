"use client";

/**
 * src/app/grade/page.tsx
 *
 * FINAL FORM — Prompt 10 integration.
 *
 * State machine (exact — do not add or remove states):
 *   idle → step0_form → capturing_front → reviewing_front →
 *     [capturing_label → reviewing_label →] submitting → result | error | rePrompt
 *
 * Integration:
 *   - GradingContext: setResult() called on successful grading.
 *   - ErrorBoundary: wraps CameraView (camera fallback) and HealthCard (result fallback).
 *   - Spinner: full-screen overlay during 'submitting' state.
 *   - rePrompt: preserves frontFile; only labelFile is re-captured.
 */

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { DatedCategory, GradingResult } from "@/lib/types";
import { useGradingContext } from "@/context/GradingContext";
import CameraView from "@/components/capture/CameraView";
import PhotoPreview from "@/components/capture/PhotoPreview";
import StepIndicator from "@/components/capture/StepIndicator";
import HealthCard from "@/components/health-card/HealthCard";
import RoutingSimulator from "@/components/simulator/RoutingSimulator";
import SecondLifeScore from "@/components/score/SecondLifeScore";
import GreenCreditsWallet from "@/components/wallet/GreenCreditsWallet";
import ErrorBoundary from "@/components/ErrorBoundary";
import Spinner from "@/components/ui/Spinner";
import { ArrowLeft, ArrowRight, AlertCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";

// ── State machine type ────────────────────────────────────────────────────────

type MachineState =
  | "idle"
  | "step0_form"
  | "capturing_front"
  | "reviewing_front"
  | "capturing_label"
  | "reviewing_label"
  | "submitting"
  | "result"
  | "error"
  | "rePrompt";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_CATEGORIES: DatedCategory[] = [
  "none",
  "perishable",
  "non_resalable",
  "safety_critical",
];

function isValidCategory(val: string | null): val is DatedCategory {
  return VALID_CATEGORIES.includes(val as DatedCategory);
}

/** Returns true if the category requires a label photo. */
function requiresLabel(category: DatedCategory): boolean {
  return category === "perishable" || category === "safety_critical";
}

const CATEGORY_LABELS: Record<DatedCategory, string> = {
  none: "General item",
  perishable: "Food / cosmetics / supplements",
  non_resalable: "Non-resalable item",
  safety_critical: "Safety-critical item (car seat, helmet…)",
};

// ── Step indicator configuration ──────────────────────────────────────────────

function getStepConfig(
  category: DatedCategory,
  state: MachineState
): { totalSteps: number; currentStep: number; labels: string[] } {
  if (requiresLabel(category)) {
    // 3 steps: Details → Front photo → Label photo
    const labels = ["Details", "Front photo", "Label photo"];
    const currentStep =
      state === "step0_form"
        ? 0
        : state === "capturing_front" || state === "reviewing_front"
          ? 1
          : 2;
    return { totalSteps: 3, currentStep, labels };
  } else {
    // 2 steps: Details → Front photo
    const labels = ["Details", "Front photo"];
    const currentStep =
      state === "step0_form" ? 0 : 1;
    return { totalSteps: 2, currentStep, labels };
  }
}

// ── Error message map ──────────────────────────────────────────────────────────

function errorMessageForStatus(status: number): string {
  if (status === 400) return "We couldn't process your request. Check your inputs and try again.";
  if (status === 413) return "Your photo is too large. Please retake it.";
  if (status === 422) return "The grading model couldn't interpret the result. Please try again.";
  if (status === 503) return "Grading is temporarily unavailable. Please try again in a moment.";
  return "Something went wrong. Please try again.";
}

// ── Error boundary fallbacks ──────────────────────────────────────────────────

function CameraFallback() {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center flex-1 gap-4 py-12 px-4"
    >
      <AlertCircle className="w-10 h-10 text-red-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-brand-200">Camera unavailable. Please refresh the page.</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-brand-500 text-brand-950 px-5 py-2.5 text-sm font-semibold
                   hover:bg-brand-400 transition-all"
      >
        Refresh
      </button>
    </div>
  );
}

function HealthCardFallback() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- not a hook, this is a component
  const { result, clearResult } = useGradingContext();
  const router = useRouter();

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    } catch {
      // Fallback: open as data URL in new tab
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      window.open(URL.createObjectURL(blob));
    }
  };

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-8 px-4"
    >
      <AlertCircle className="w-10 h-10 text-red-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-brand-200">Unable to display grading result.</p>
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="rounded-xl border border-brand-700 bg-brand-950 px-4 py-2.5 text-xs font-semibold
                     text-brand-400 hover:text-brand-200 transition-all"
        >
          Copy raw result
        </button>
        <button
          onClick={() => {
            clearResult();
            router.push("/grade");
          }}
          className="rounded-xl bg-brand-500 text-brand-950 px-4 py-2.5 text-xs font-semibold
                     hover:bg-brand-400 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INNER PAGE COMPONENT (uses useSearchParams — must be inside Suspense)
// ═══════════════════════════════════════════════════════════════════════════════

function GradePageInner() {
  const searchParams = useSearchParams();
  const { setResult: setContextResult } = useGradingContext();

  // ── Read ?category param ────────────────────────────────────────────────────
  const paramCategory = searchParams.get("category");
  const urlCategory: DatedCategory | null = isValidCategory(paramCategory)
    ? paramCategory
    : null;

  // ── State machine ─────────────────────────────────────────────────────────
  const [machineState, setMachineState] = useState<MachineState>(
    urlCategory ? "capturing_front" : "step0_form"
  );

  // ── Form state ─────────────────────────────────────────────────────────────
  const [productName, setProductName] = useState("");
  const [formCategory, setFormCategory] = useState<DatedCategory>(
    urlCategory ?? "none"
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Effective category: URL param takes precedence over form selection
  const category: DatedCategory = urlCategory ?? formCategory;

  // ── Captured files ─────────────────────────────────────────────────────────
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [labelFile, setLabelFile] = useState<File | null>(null);

  // ── API result ─────────────────────────────────────────────────────────────
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // ── Sync URL param → form category ─────────────────────────────────────────
  useEffect(() => {
    if (urlCategory) {
      setFormCategory(urlCategory);
      // If we have a URL category, jump straight to capturing
      setMachineState("capturing_front");
    }
  }, [urlCategory]);

  // ── Transition helpers ──────────────────────────────────────────────────────

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!productName.trim()) {
        setFormError("Please enter a product name.");
        return;
      }
      setFormError(null);
      setMachineState("capturing_front");
    },
    [productName]
  );

  const handleFrontCapture = useCallback((file: File) => {
    setFrontFile(file);
    setMachineState("reviewing_front");
  }, []);

  const handleFrontAccepted = useCallback(() => {
    if (requiresLabel(category)) {
      setMachineState("capturing_label");
    } else {
      setMachineState("submitting");
    }
  }, [category]);

  const handleLabelCapture = useCallback((file: File) => {
    setLabelFile(file);
    setMachineState("reviewing_label");
  }, []);

  const handleLabelAccepted = useCallback(() => {
    setMachineState("submitting");
  }, []);

  const handleRetake = useCallback((step: "front" | "label") => {
    if (step === "front") {
      setFrontFile(null);
      setMachineState("capturing_front");
    } else {
      setLabelFile(null);
      setMachineState("capturing_label");
    }
  }, []);

  // ── POST to /api/assess ───────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!frontFile) return;

    setMachineState("submitting");

    const form = new FormData();
    form.append("frontImage", frontFile);
    form.append("category", category);
    form.append("productName", productName || "Unknown product");

    if (labelFile) {
      form.append("labelImage", labelFile);
    }

    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const status = response.status;
        setErrorStatus(status);
        setErrorMessage(errorMessageForStatus(status));
        setMachineState("error");
        return;
      }

      const data: GradingResult = await response.json();

      // rePrompt: model returned 200 but label was not readable
      if (requiresLabel(category) && labelFile && !data.label_readable) {
        setMachineState("rePrompt");
        return;
      }

      setGradingResult(data);
      // Store in context for cross-component access
      setContextResult(data, productName || "Unknown product");
      setMachineState("result");
    } catch {
      setErrorStatus(0);
      setErrorMessage("Grading is temporarily unavailable. Please try again in a moment.");
      setMachineState("error");
    }
  }, [frontFile, labelFile, category, productName, setContextResult]);

  // ── Auto-submit when state machine enters 'submitting' ───────────────────

  useEffect(() => {
    if (machineState === "submitting") {
      handleSubmit();
    }
    // handleSubmit changes identity when deps change; this is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineState]);

  // ── Step indicator config ─────────────────────────────────────────────────

  const showStepIndicator =
    machineState !== "idle" &&
    machineState !== "result" &&
    machineState !== "error";

  const stepConfig = getStepConfig(category, machineState);

  // ── Derive expiryStatus from EligibilityVerdict ──────────────────────────

  const deriveExpiryStatus = useCallback(
    (r: GradingResult): "expired" | "near_expiry" | "not_applicable" | "valid" => {
      if (
        r.eligibility_verdict === "recycle_only" ||
        r.eligibility_verdict === "recycle_or_dispose" ||
        r.eligibility_verdict === "dispose"
      ) {
        return "expired";
      }
      if (r.eligibility_verdict === "local_timebox_or_donate") {
        return "near_expiry";
      }
      if (r.expiry_date === null && category === "none") {
        return "not_applicable";
      }
      return "valid";
    },
    [category]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-dvh">
      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3 border-b border-[var(--card-border)]">
        <Link
          href="/"
          aria-label="Back to home"
          className="rounded-lg p-1.5 text-brand-500 hover:text-brand-300 hover:bg-brand-900/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Link>
        <h1 className="text-sm font-semibold text-brand-200 flex-1">
          {machineState === "step0_form"
            ? "What are you grading?"
            : machineState === "capturing_front" || machineState === "reviewing_front"
              ? "Front photo"
              : machineState === "capturing_label" || machineState === "reviewing_label" || machineState === "rePrompt"
                ? "Label photo"
                : machineState === "submitting"
                  ? "Grading…"
                  : machineState === "result"
                    ? "Your result"
                    : "Error"}
        </h1>
      </header>

      {/* ── Step indicator ── */}
      {showStepIndicator && (
        <div className="py-4 border-b border-[var(--card-border)]">
          <StepIndicator
            totalSteps={stepConfig.totalSteps}
            currentStep={stepConfig.currentStep}
            labels={stepConfig.labels}
          />
        </div>
      )}

      {/* ── Main content area ── */}
      <main className="flex-1 flex flex-col">

        {/* ═══════ STATE: idle ═══════ */}
        {machineState === "idle" && (
          <div className="flex flex-col items-center justify-center flex-1 px-4 gap-4 animate-fade-in">
            <p className="text-brand-400 text-sm">Initializing…</p>
          </div>
        )}

        {/* ═══════ STATE: step0_form ═══════ */}
        {machineState === "step0_form" && (
          <div className="flex flex-col flex-1 px-4 py-6 animate-fade-in">
            <form
              id="grade-item-form"
              onSubmit={handleFormSubmit}
              noValidate
              className="flex flex-col gap-5 max-w-md mx-auto w-full"
            >
              {/* Product name */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="product-name"
                  className="text-sm font-medium text-brand-300"
                >
                  Product name
                </label>
                <input
                  id="product-name"
                  type="text"
                  autoComplete="off"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Neutrogena SPF 50 sunscreen"
                  aria-required="true"
                  aria-invalid={formError ? "true" : undefined}
                  aria-describedby={formError ? "product-name-error" : undefined}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]
                             px-4 py-3 text-sm text-brand-100 placeholder-brand-700
                             focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50
                             transition-colors"
                />
                {formError && (
                  <p
                    id="product-name-error"
                    role="alert"
                    className="text-xs text-red-400 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    {formError}
                  </p>
                )}
              </div>

              {/* Category — only shown if no URL param */}
              {!urlCategory && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="item-category"
                    className="text-sm font-medium text-brand-300"
                  >
                    Category
                  </label>
                  <select
                    id="item-category"
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as DatedCategory)
                    }
                    className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]
                               px-4 py-3 text-sm text-brand-100
                               focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50
                               transition-colors appearance-none"
                  >
                    {VALID_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>

                  {/* Category explanation */}
                  <p className="text-xs text-brand-600 leading-relaxed">
                    {formCategory === "perishable" &&
                      "You'll photograph the expiry label after the front photo."}
                    {formCategory === "safety_critical" &&
                      "Safety-critical items require an expiry/manufacture label photo."}
                    {formCategory === "non_resalable" &&
                      "Non-resalable items can only be donated, not resold."}
                    {formCategory === "none" &&
                      "General items — no expiry label required."}
                  </p>
                </div>
              )}

              {/* Category locked by URL param */}
              {urlCategory && (
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 flex items-center gap-3">
                  <div className="text-xs text-brand-500 uppercase tracking-widest font-semibold shrink-0">
                    Category
                  </div>
                  <div className="text-sm text-brand-200 font-medium">
                    {CATEGORY_LABELS[urlCategory]}
                  </div>
                </div>
              )}

              <button
                type="submit"
                id="start-grading-btn"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 text-brand-950 px-6 py-4 text-base font-semibold
                           hover:bg-brand-400 active:scale-[0.98] transition-all duration-150
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                Start grading
                <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </form>
          </div>
        )}

        {/* ═══════ STATE: capturing_front ═══════ */}
        {machineState === "capturing_front" && (
          <div className="flex flex-col flex-1 animate-fade-in">
            <ErrorBoundary fallback={<CameraFallback />}>
              <CameraView step="front" onCapture={handleFrontCapture} />
            </ErrorBoundary>
          </div>
        )}

        {/* ═══════ STATE: reviewing_front ═══════ */}
        {machineState === "reviewing_front" && frontFile && (
          <div className="flex flex-col flex-1 pt-4 animate-fade-in">
            <PhotoPreview
              frontFile={frontFile}
              onRetake={handleRetake}
              onSubmit={handleFrontAccepted}
              isSubmitting={false}
            />
          </div>
        )}

        {/* ═══════ STATE: capturing_label ═══════ */}
        {machineState === "capturing_label" && (
          <div className="flex flex-col flex-1 animate-fade-in">
            <ErrorBoundary fallback={<CameraFallback />}>
              <CameraView step="label" onCapture={handleLabelCapture} />
            </ErrorBoundary>
          </div>
        )}

        {/* ═══════ STATE: reviewing_label ═══════ */}
        {machineState === "reviewing_label" && frontFile && labelFile && (
          <div className="flex flex-col flex-1 pt-4 animate-fade-in">
            <PhotoPreview
              frontFile={frontFile}
              labelFile={labelFile}
              onRetake={handleRetake}
              onSubmit={handleLabelAccepted}
              isSubmitting={false}
            />
          </div>
        )}

        {/* ═══════ STATE: submitting — FULL-SCREEN OVERLAY ═══════ */}
        {machineState === "submitting" && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex flex-col items-center justify-center gap-6"
            aria-live="polite"
            aria-label="Grading in progress"
          >
            <Spinner size="lg" />
            <div className="text-center space-y-2">
              <p className="text-base font-semibold text-white">
                Grading your item…
              </p>
              <p className="text-sm text-white/60">
                The AI is analyzing your photos. This may take up to 30 seconds.
              </p>
            </div>
          </div>
        )}

        {/* ═══════ STATE: result ═══════ */}
        {machineState === "result" && gradingResult && (
          <div className="flex flex-col flex-1 py-4 px-2 animate-fade-in gap-6">
            {/* ── Health Card (with ErrorBoundary) ── */}
            <ErrorBoundary fallback={<HealthCardFallback />}>
              <HealthCard result={gradingResult} productName={productName || "Unknown product"} category={category} />
            </ErrorBoundary>

            {/* ── Second Life Score ── */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-6">
              <SecondLifeScore
                grade={gradingResult.condition_grade}
                demandScore={60}
                ageMonths={6}
                shelfLifeMonths={24}
                expiryStatus={deriveExpiryStatus(gradingResult)}
              />
            </div>

            {/* ── Green Credits Wallet ── */}
            <GreenCreditsWallet
              category={category}
              grade={gradingResult.condition_grade}
              routing={{
                recommended_route: gradingResult.recommended_route,
                confidence: gradingResult.routing_confidence,
                logic_trace: gradingResult.routing_logic_trace,
                alternative_routes: gradingResult.alternative_routes,
              }}
              productName={productName || "Unknown product"}
            />

            {/* ── Routing Simulator: seeded with this item's grade ── */}
            <div className="px-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                  Explore &quot;what if&quot;
                </span>
                <div className="flex-1 h-px bg-brand-800" />
              </div>
              <RoutingSimulator
                initialGrade={gradingResult.condition_grade}
                initialDemand={60}
                initialDistance={50}
              />
            </div>

            <div className="flex justify-center pb-6">
              <Link
                href="/grade"
                id="grade-another-item"
                className="rounded-xl border border-brand-700 bg-brand-950 px-6 py-3 text-sm font-medium text-brand-200
                           hover:border-brand-500 hover:text-brand-100 transition-all"
              >
                Grade another item
              </Link>
            </div>
          </div>
        )}

        {/* ═══════ STATE: error ═══════ */}
        {machineState === "error" && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-800/40 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" aria-hidden="true" />
            </div>
            <div className="text-center space-y-2 max-w-xs">
              <h2 className="text-base font-semibold text-brand-50">
                {errorStatus === 503 ? "Service unavailable" : "Something went wrong"}
              </h2>
              <p className="text-sm text-brand-400 leading-relaxed">
                {errorMessage}
              </p>
              {errorStatus && errorStatus !== 0 && (
                <p className="text-xs text-brand-700">
                  Error {errorStatus}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              {/* Retry → go back to review */}
              <button
                onClick={() => {
                  setErrorStatus(null);
                  setErrorMessage("");
                  if (frontFile && labelFile) {
                    setMachineState("reviewing_label");
                  } else if (frontFile) {
                    setMachineState("reviewing_front");
                  } else {
                    setMachineState("step0_form");
                  }
                }}
                id="retry-from-error"
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 text-brand-950
                           px-6 py-3 text-sm font-semibold hover:bg-brand-400 transition-all"
              >
                <RefreshCcw className="w-4 h-4" aria-hidden="true" />
                Try again
              </button>

              <Link
                href="/grade"
                className="text-center rounded-xl border border-[var(--card-border)] bg-[var(--card)]
                           px-6 py-3 text-sm font-medium text-brand-400 hover:text-brand-200 transition-all"
              >
                Start over
              </Link>
            </div>
          </div>
        )}

        {/* ═══════ STATE: rePrompt ═══════ */}
        {machineState === "rePrompt" && frontFile && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-amber-950/40 border border-amber-800/40 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-amber-400" aria-hidden="true" />
            </div>
            <div className="text-center space-y-2 max-w-xs">
              <h2 className="text-base font-semibold text-brand-50">
                Label photo unclear
              </h2>
              <p className="text-sm text-brand-400 leading-relaxed">
                We couldn&rsquo;t read the label. Please retake just the label
                photo. Your front photo is saved — you don&rsquo;t need to
                retake it.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => {
                  // Preserve frontFile — only labelFile will be re-captured.
                  setLabelFile(null);
                  setMachineState("capturing_label");
                }}
                id="retake-label-from-reprompt"
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 text-brand-950
                           px-6 py-3 text-sm font-semibold hover:bg-brand-400 transition-all"
              >
                Retake label photo
              </button>

              <button
                onClick={() => {
                  setFrontFile(null);
                  setLabelFile(null);
                  setMachineState("step0_form");
                }}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]
                           px-6 py-3 text-sm font-medium text-brand-400 hover:text-brand-200 transition-all"
              >
                Start over
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE EXPORT — wraps inner component in Suspense (required for useSearchParams)
// ═══════════════════════════════════════════════════════════════════════════════

export default function GradePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-dvh">
          <Spinner size="lg" />
        </div>
      }
    >
      <GradePageInner />
    </Suspense>
  );
}
