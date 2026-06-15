/**
 * src/components/ui/Spinner.tsx
 *
 * Pure CSS spinner — no animation library.
 * Uses border + border-t trick with a CSS @keyframes spin animation.
 *
 * Sizes:
 *   sm = 20×20px (inline indicators)
 *   lg = 48×48px (full-screen loading overlay)
 */

interface SpinnerProps {
  size: "sm" | "lg";
}

const SIZE_CLASSES: Record<string, string> = {
  sm: "w-5 h-5 border-2",
  lg: "w-12 h-12 border-[3px]",
};

export default function Spinner({ size }: SpinnerProps) {
  return (
    <div
      className={`rounded-full border-brand-700 border-t-brand-400 animate-spin ${SIZE_CLASSES[size]}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}
