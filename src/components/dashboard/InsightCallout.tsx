/**
 * src/components/dashboard/InsightCallout.tsx
 *
 * Co-pilot insight callout — styled as a personalized recommendation,
 * not a generic info box. Left-accent border with a subtle tint.
 */

import { Lightbulb } from "lucide-react";

interface InsightCalloutProps {
  topCategory: string;
  topDefect: string;
}

export default function InsightCallout({
  topCategory,
  topDefect,
}: InsightCalloutProps) {
  return (
    <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-950/20 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-indigo-900/40 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-indigo-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1.5">
            Co-pilot insight
          </p>
          <p className="text-sm text-brand-300 leading-relaxed">
            Your top returned category this week was{" "}
            <strong className="text-brand-100">{topCategory}</strong>. The most
            common defect:{" "}
            <strong className="text-brand-100">{topDefect}</strong>. Consider
            updating your listing photos to highlight condition and reduce buyer
            surprises.
          </p>
        </div>
      </div>
    </div>
  );
}
