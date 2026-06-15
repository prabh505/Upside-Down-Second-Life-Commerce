/**
 * src/lib/constants.ts
 *
 * Single source of truth for all magic strings, lookup tables, and threshold
 * values used across the Second Life Commerce codebase.
 *
 * Rules:
 *  - No magic strings anywhere in the codebase — import from here instead.
 *  - All arrays that drive type guards must be `as const` readonly tuples.
 *  - No env var access here — constants only.
 */

import type { Grade, Tier, DatedCategory, RoutingOutcome } from "./types";

// ── Dated category membership ─────────────────────────────────────────────────

/**
 * Sub-categories of "perishable" dated items.
 * These items require Photo 2 (expiry label) during capture.
 */
export const PERISHABLE_SUB_CATEGORIES = [
  "food",
  "supplements",
  "cosmetics",
  "sunscreen",
  "baby_formula",
] as const;

export type PerishableSubCategory = (typeof PERISHABLE_SUB_CATEGORIES)[number];

/**
 * Sub-categories of "safety_critical" dated items.
 * These items require Photo 2 AND always escalate to human review.
 */
export const SAFETY_CRITICAL_SUB_CATEGORIES = [
  "car_seats",
  "helmets",
  "fire_extinguishers",
  "tyres",
] as const;

export type SafetyCriticalSubCategory =
  (typeof SAFETY_CRITICAL_SUB_CATEGORIES)[number];

/**
 * Sub-categories of "batteries" dated items.
 */
export const BATTERY_SUB_CATEGORIES = ["batteries"] as const;

export type BatterySubCategory = (typeof BATTERY_SUB_CATEGORIES)[number];

/**
 * All dated sub-categories (union of perishable + safety_critical + batteries).
 * Items whose category matches any value in this array require Photo 2.
 *
 * Exported as `as const` so it can be used in type guards:
 *   DATED_CATEGORIES.includes(category as DatedSubCategory)
 */
export const DATED_CATEGORIES = [
  ...PERISHABLE_SUB_CATEGORIES,
  ...SAFETY_CRITICAL_SUB_CATEGORIES,
  ...BATTERY_SUB_CATEGORIES,
] as const;

export type DatedSubCategory = (typeof DATED_CATEGORIES)[number];

/**
 * Type guard: returns true if `category` is a dated sub-category
 * that requires Photo 2 capture.
 */
export function isDatedCategory(category: string): category is DatedSubCategory {
  return (DATED_CATEGORIES as readonly string[]).includes(category);
}

/**
 * Maps a product sub-category string to its DatedCategory classification.
 * Returns "none" for non-dated categories.
 */
export function getDatedCategory(category: string): DatedCategory {
  if ((PERISHABLE_SUB_CATEGORIES as readonly string[]).includes(category)) {
    return "perishable";
  }
  if ((SAFETY_CRITICAL_SUB_CATEGORIES as readonly string[]).includes(category)) {
    return "safety_critical";
  }
  return "none";
}

// ── Grade / Tier labels ───────────────────────────────────────────────────────

/**
 * Ordered array of all valid condition grades (best → worst).
 */
export const GRADES = ["A", "B", "C", "D", "E"] as const;

/**
 * Maps each Grade to its human-readable Tier label.
 * Single source of truth — do not duplicate this mapping anywhere.
 */
export const TIER_LABELS: Record<Grade, Tier> = {
  A: "Like New",
  B: "Very Good",
  C: "Good",
  D: "Acceptable",
  E: "Poor",
} as const;

/**
 * Maps each Grade to a hex color for UI display.
 * Colors are chosen for accessibility (WCAG AA on dark backgrounds)
 * and match the Tailwind `grade` palette in tailwind.config.ts.
 */
export const GRADE_COLORS: Record<Grade, string> = {
  A: "#22c55e", // green-500  — Like New
  B: "#84cc16", // lime-400   — Very Good
  C: "#eab308", // yellow-500 — Good
  D: "#f97316", // orange-500 — Acceptable
  E: "#ef4444", // red-500    — Poor
} as const;

/**
 * Maps each Grade to a background color (lighter tint) for cards/badges.
 */
export const GRADE_BG_COLORS: Record<Grade, string> = {
  A: "#052e16", // green-950
  B: "#1a2e05", // lime-950
  C: "#422006", // yellow-950
  D: "#431407", // orange-950
  E: "#450a0a", // red-950
} as const;

// ── Routing options ───────────────────────────────────────────────────────────

/**
 * All valid routing outcomes with display metadata.
 * Used to render routing cards, simulator labels, and audit traces.
 */
export const ROUTING_OPTIONS: Record<
  RoutingOutcome,
  { label: string; icon: string; description: string; color: string }
> = {
  resell: {
    label: "Resell",
    icon: "🏪",
    description: "List on marketplace at fair market value",
    color: "#22c55e",
  },
  refurbish: {
    label: "Refurbish",
    icon: "🔧",
    description: "Repair and restore before reselling",
    color: "#3b82f6",
  },
  donate: {
    label: "Donate",
    icon: "🤝",
    description: "Donate to local charity or community",
    color: "#a855f7",
  },
  recycle: {
    label: "Recycle",
    icon: "♻️",
    description: "Route to certified recycling facility",
    color: "#f59e0b",
  },
  exchange: {
    label: "Exchange",
    icon: "🔄",
    description: "Swap via community exchange map",
    color: "#06b6d4",
  },
} as const;

// ── Thresholds ────────────────────────────────────────────────────────────────

/**
 * Near-expiry threshold in days — used when shelf_life_days is unknown.
 * If an item has fewer than this many days until expiry and shelf_life_days
 * is null, it is treated as near-expiry.
 *
 * When shelf_life_days IS known, near-expiry = 20% of shelf_life_days.
 * See evaluateEligibility() in src/lib/eligibility.ts.
 *
 * Open question: should this be configurable per sub-category?
 * See context.md Open Questions §9 item 1.
 */
export const NEAR_EXPIRY_THRESHOLD_DAYS = 30 as const;

/**
 * Near-expiry fraction of shelf life (0.0–1.0).
 * Applied when shelf_life_days is known.
 */
export const NEAR_EXPIRY_SHELF_LIFE_FRACTION = 0.2 as const;

/**
 * Minimum AI model confidence required to auto-list (no human escalation).
 * Below this value → escalate to human-in-loop.
 * Source: context.md §5.4.
 */
export const CONFIDENCE_THRESHOLD = 0.70 as const;

/**
 * Maximum item value (₹) that can be auto-processed without human review.
 * Above this value → escalate to human-in-loop.
 * Source: context.md §5.4.
 */
export const VALUE_THRESHOLD_INR = 5000 as const;

/**
 * Default distance in km applied when the client does not provide distance_km.
 * Used by the routing engine and Routing Simulator UI.
 */
export const DEFAULT_DISTANCE_KM = 25 as const;

/**
 * Default local demand signal applied when the client does not provide local_demand.
 * Range: 0.0–1.0. Simulated in MVP.
 */
export const DEFAULT_LOCAL_DEMAND = 0.5 as const;

/**
 * Maximum image size in bytes after base64 decode (5 MB per image).
 * Enforced in /api/assess before forwarding to Bedrock.
 */
export const MAX_IMAGE_SIZE_BYTES = 5242880 as const; // 5 * 1024 * 1024 = 5 MB

/**
 * Target longest-edge pixel dimension for client-side image resize.
 * Enforced client-side before encoding. Matches context.md §3 image pipeline.
 */
export const IMAGE_RESIZE_PX = 1024 as const;

// ── Routing simulator defaults ────────────────────────────────────────────────

/**
 * Routing simulator slider ranges — used in the Routing Simulator UI (Prompt 5).
 */
export const SIMULATOR_RANGES = {
  distance_km: { min: 0, max: 200, step: 5, default: DEFAULT_DISTANCE_KM },
  local_demand: { min: 0, max: 1, step: 0.05, default: DEFAULT_LOCAL_DEMAND },
  repair_cost_fraction: { min: 0, max: 1, step: 0.05, default: 0.2 },
} as const;

// ── API error codes ───────────────────────────────────────────────────────────

/**
 * Machine-readable error codes from POST /api/assess.
 * Mirrors the error table in context.md §7 exactly.
 */
export const API_ERROR_CODES = {
  MISSING_FRONT_PHOTO: "MISSING_FRONT_PHOTO",
  MISSING_LABEL_PHOTO: "MISSING_LABEL_PHOTO",
  INVALID_DATED_CATEGORY: "INVALID_DATED_CATEGORY",
  INVALID_IMAGE_DATA: "INVALID_IMAGE_DATA",
  IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
  GRADING_PARSE_ERROR: "GRADING_PARSE_ERROR",
  BEDROCK_UNAVAILABLE: "BEDROCK_UNAVAILABLE",
  BEDROCK_AUTH_FAILED: "BEDROCK_AUTH_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  FUNCTION_TIMEOUT: "FUNCTION_TIMEOUT",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
