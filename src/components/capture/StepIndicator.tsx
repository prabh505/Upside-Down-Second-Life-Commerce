"use client";

/**
 * src/components/capture/StepIndicator.tsx
 *
 * Visual step progress indicator — circles connected by a line.
 * Past steps show a check mark, current step is filled, future steps are empty.
 * Not a numbered list — visual circles only, with aria labels for accessibility.
 */

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number; // 0-indexed
  labels: string[];
}

// ── Check icon (inline SVG — no external dependency) ─────────────────────────
function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 6l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StepIndicator({
  totalSteps,
  currentStep,
  labels,
}: StepIndicatorProps) {
  return (
    <nav
      aria-label="Progress"
      className="flex items-center justify-center w-full px-4"
    >
      <ol className="flex items-center gap-0 w-full max-w-xs">
        {Array.from({ length: totalSteps }, (_, i) => {
          const isPast = i < currentStep;
          const isCurrent = i === currentStep;
          const isFuture = i > currentStep;
          const label = labels[i] ?? `Step ${i + 1}`;

          return (
            <li
              key={i}
              className="flex items-center flex-1 last:flex-none"
              aria-current={isCurrent ? "step" : undefined}
            >
              {/* ── Circle ── */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={[
                    "flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300",
                    isPast
                      ? "bg-brand-500 border-brand-500 text-brand-950"
                      : isCurrent
                        ? "bg-brand-500 border-brand-500 text-brand-950 ring-4 ring-brand-500/20"
                        : "bg-transparent border-brand-800 text-brand-700",
                  ].join(" ")}
                  aria-label={
                    isPast
                      ? `${label} — completed`
                      : isCurrent
                        ? `${label} — current step`
                        : `${label} — not yet started`
                  }
                >
                  {isPast ? (
                    <CheckIcon />
                  ) : isCurrent ? (
                    <span
                      className="block w-2.5 h-2.5 rounded-full bg-brand-950"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="block w-2 h-2 rounded-full bg-brand-800"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* ── Label ── */}
                <span
                  className={[
                    "text-[10px] font-medium leading-none text-center whitespace-nowrap",
                    isCurrent
                      ? "text-brand-300"
                      : isPast
                        ? "text-brand-500"
                        : "text-brand-700",
                  ].join(" ")}
                >
                  {label}
                </span>
              </div>

              {/* ── Connector line (not after last step) ── */}
              {i < totalSteps - 1 && (
                <div
                  aria-hidden="true"
                  className={[
                    "flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all duration-500",
                    isPast ? "bg-brand-500" : "bg-brand-800",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
