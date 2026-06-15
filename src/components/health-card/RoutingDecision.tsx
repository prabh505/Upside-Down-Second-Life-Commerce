"use client";

/**
 * src/components/health-card/RoutingDecision.tsx
 *
 * Displays the routing recommendation with color-coded label and
 * a collapsible "Why?" section using native <details><summary>.
 *
 * Decision colors:
 *   Resell → green, Refurbish → amber, Donate → blue,
 *   Recycle → gray, Exchange → teal
 *
 * If the routing traces mention "local" / localOnly, shows a
 * local-buyers-only banner.
 */

import { Store, Wrench, HandHeart, Recycle, RefreshCw, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RoutingOutcome } from "@/lib/types";
import { ROUTING_OPTIONS, NEAR_EXPIRY_THRESHOLD_DAYS } from "@/lib/constants";

interface RoutingDecisionProps {
  recommendedRoute: RoutingOutcome;
  routingLogicTrace: string[];
  routingConfidence: number;
  escalatedToHuman: boolean;
  escalationReason: string | null;
  alternativeRoutes: Array<{ route: RoutingOutcome; reason: string }>;
}

/** Color mapping for routing outcomes. */
const ROUTE_COLORS: Record<RoutingOutcome | "human_review", { bg: string; text: string; border: string }> = {
  resell:    { bg: "bg-green-50",  text: "text-green-800",  border: "border-green-200" },
  refurbish: { bg: "bg-amber-50",  text: "text-amber-800",  border: "border-amber-200" },
  donate:    { bg: "bg-blue-50",   text: "text-blue-800",   border: "border-blue-200" },
  recycle:   { bg: "bg-gray-100",  text: "text-gray-700",   border: "border-gray-300" },
  exchange:  { bg: "bg-teal-50",   text: "text-teal-800",   border: "border-teal-200" },
  human_review: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
};

/** Icon mapping for routing outcomes. */
const ROUTE_ICONS: Record<RoutingOutcome | "human_review", LucideIcon> = {
  resell: Store,
  refurbish: Wrench,
  donate: HandHeart,
  recycle: Recycle,
  exchange: RefreshCw,
  human_review: Search,
};

export default function RoutingDecision({
  recommendedRoute,
  routingLogicTrace,
  routingConfidence,
  escalatedToHuman,
  escalationReason,
  alternativeRoutes,
}: RoutingDecisionProps) {
  const effectiveRoute: RoutingOutcome | "human_review" = escalatedToHuman
    ? "human_review"
    : recommendedRoute;

  const colorSet = ROUTE_COLORS[effectiveRoute];
  const RouteIcon = ROUTE_ICONS[effectiveRoute];
  const routeInfo = escalatedToHuman
    ? { label: "Human Review", description: "Requires physical intake grading" }
    : ROUTING_OPTIONS[recommendedRoute];

  // Check for localOnly in the logic trace
  const isLocalOnly = routingLogicTrace.some(
    (line) => line.toLowerCase().includes("local") && line.toLowerCase().includes("only")
  );

  const confidencePercent = Math.round(routingConfidence * 100);

  return (
    <div className="border-t border-gray-200 print:border-gray-300">
      {/* ── Decision label ── */}
      <div className={`px-5 py-4 ${colorSet.bg}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`shrink-0 ${colorSet.text}`} aria-hidden="true">
              <RouteIcon className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <span className={`text-xl font-bold ${colorSet.text}`}>
                {routeInfo.label}
              </span>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">
                {routeInfo.description}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-gray-400 shrink-0">
            {confidencePercent}%
          </span>
        </div>

        {/* ── Local-only banner ── */}
        {isLocalOnly && (
          <div className="mt-3 rounded bg-amber-100 border border-amber-300 px-3 py-2">
            <p className="text-xs font-semibold text-amber-800">
              Local buyers only — item must be collected within {NEAR_EXPIRY_THRESHOLD_DAYS} days.
            </p>
          </div>
        )}

        {/* ── Escalation notice ── */}
        {escalatedToHuman && escalationReason && (
          <div className="mt-3 rounded bg-purple-100 border border-purple-300 px-3 py-2">
            <p className="text-xs text-purple-800">
              {escalationReason}
            </p>
          </div>
        )}
      </div>

      {/* ── "Why?" collapsible — native details/summary, no JS toggle ── */}
      <details className="border-t border-gray-200 group">
        <summary className="px-5 py-3 text-sm font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900 hover:bg-gray-50 transition-colors list-none flex items-center gap-2">
          <span
            aria-hidden="true"
            className="text-xs transition-transform duration-200 group-open:rotate-90"
          >
            ▸
          </span>
          Why this recommendation?
        </summary>
        <div className="px-5 pb-4 space-y-2">
          {/* Logic trace — from the routing engine */}
          <ul className="space-y-1.5" role="list">
            {routingLogicTrace.map((line, i) => (
              <li
                key={i}
                className="text-xs text-gray-600 leading-relaxed flex items-start gap-2"
              >
                <span
                  className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0"
                  aria-hidden="true"
                />
                {line}
              </li>
            ))}
          </ul>

          {/* Alternative routes */}
          {alternativeRoutes.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                Alternatives considered
              </p>
              {alternativeRoutes.map((alt, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-500 mb-1">
                  <span className="font-medium capitalize shrink-0">
                    {ROUTING_OPTIONS[alt.route]?.label ?? alt.route}:
                  </span>
                  <span>{alt.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
