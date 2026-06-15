/**
 * src/lib/types.ts
 *
 * Canonical TypeScript type definitions for Second Life Commerce.
 * These types are the single source of truth — they mirror the API Contract
 * in context.md §7 exactly. Any change here must also update context.md.
 *
 * Rules:
 *  - No `any`. Strict mode required.
 *  - Every field name and TypeScript type matches the API Contract verbatim.
 *  - Server-only types (those referencing env vars) must NOT be imported in
 *    client components. Only import in src/app/api/** or server-only modules.
 */

// ── Primitive domain types ────────────────────────────────────────────────────

/**
 * Condition grade assigned by the AI grading model.
 * A = Like New  →  E = Poor
 */
export type Grade = "A" | "B" | "C" | "D" | "E";

/**
 * Human-readable tier label corresponding to each Grade.
 * Tier is the display string; Grade is the sortable code.
 */
export type Tier =
  | "Like New"
  | "Very Good"
  | "Good"
  | "Acceptable"
  | "Poor";

/**
 * Dated category classification for an item.
 *
 * - none            — no expiry date required.
 * - perishable      — food, supplements, cosmetics, sunscreen, baby_formula.
 * - non_resalable   — cannot be resold under any condition.
 * - safety_critical — car seats, helmets, fire extinguishers, tyres.
 *
 * Determines whether Photo 2 (expiry label) is required and which
 * eligibility rules apply.
 */
export type DatedCategory =
  | "none"
  | "perishable"
  | "non_resalable"
  | "safety_critical";

/**
 * Eligibility verdict returned by the eligibility gate.
 * The gate runs BEFORE condition routing.
 *
 * - eligible                — passes to full condition routing.
 * - donate_if_eligible      — non-resalable; may be donated.
 * - dispose                 — no secondary life possible.
 * - recycle_only            — safety-critical with expired or unreadable label.
 * - recycle_or_dispose      — perishable + expired.
 * - local_timebox_or_donate — perishable + near-expiry.
 */
export type EligibilityVerdict =
  | "eligible"
  | "donate_if_eligible"
  | "dispose"
  | "recycle_only"
  | "recycle_or_dispose"
  | "local_timebox_or_donate";

/**
 * Possible routing outcomes after the eligibility gate passes.
 */
export type RoutingOutcome =
  | "resell"
  | "refurbish"
  | "donate"
  | "recycle"
  | "exchange";

/**
 * How the expiry/manufacture date was determined.
 *
 * - label_ocr — extracted from the expiry label photo via OCR.
 * - estimated — estimated from shelf_life_days or category heuristics.
 * - none      — no date information available.
 */
export type DateSource = "label_ocr" | "estimated" | "none";

// ── Item category ─────────────────────────────────────────────────────────────

/**
 * Product category string — matches the string values in DATED_CATEGORIES
 * from constants.ts. Not a closed union because non-dated categories are
 * arbitrary strings (electronics, clothing, etc.).
 */
export type ItemCategory = string;

// ── API Request / Response types ──────────────────────────────────────────────

/**
 * Request body for POST /api/assess.
 *
 * Field names and types match context.md §7 API Contract exactly.
 */
export interface GradingRequest {
  /**
   * Base64-encoded front photo of the item. Required.
   * Client MUST resize to ~1024px on longest edge before encoding.
   */
  front_photo_base64: string;

  /**
   * Base64-encoded expiry label photo.
   * Required when dated_category !== "none".
   * Must be null when dated_category === "none".
   */
  label_photo_base64: string | null;

  /** Product category (e.g., "cosmetics", "electronics"). */
  category: string;

  /**
   * Dated category classification. Determines eligibility rules
   * and whether Photo 2 is required.
   */
  dated_category: DatedCategory;

  /**
   * Known shelf life in days. null if unknown.
   * Used to compute the near-expiry threshold (20% of shelf life, or 30 days).
   */
  shelf_life_days: number | null;

  /** User-provided product name. Optional. */
  product_name?: string;

  /**
   * Estimated resale value in ₹. Optional.
   * Simulated server-side if not provided.
   */
  estimated_value?: number;

  /**
   * Distance in km to nearest resale/refurbish center.
   * Default: 25. Used by the routing engine.
   */
  distance_km?: number;

  /**
   * Local demand signal 0.0–1.0. Default: 0.5.
   * Simulated in MVP — not real marketplace data.
   */
  local_demand?: number;
}

/**
 * Success response body from POST /api/assess (HTTP 200).
 *
 * Field names and types match context.md §7 API Contract exactly.
 */
export interface GradingResult {
  /** Unique assessment ID (UUID). */
  assessment_id: string;

  /** ISO 8601 timestamp of when the assessment was performed. */
  assessed_at: string;

  // ── Grading ──────────────────────────────────────────────────────────────

  /** Condition grade A–E from the AI model. */
  condition_grade: Grade;

  /** Human-readable label matching the grade. */
  condition_label: Tier;

  /** List of detected defects, e.g. ["scratch on screen", "dent on corner"]. */
  defects: string[];

  /** Completeness assessment, e.g. "All parts present", "Missing charger". */
  completeness: string;

  /** AI model confidence in the grading result. Range: 0.0–1.0. */
  model_confidence: number;

  // ── Expiry / Date info ────────────────────────────────────────────────────

  /** Extracted or estimated expiry date as ISO 8601 date string, or null. */
  expiry_date: string | null;

  /** Extracted manufacture date as ISO 8601 date string, or null. */
  manufacture_date: string | null;

  /** Extracted lot/batch code, or null. */
  lot_code: string | null;

  /** How the date information was determined. */
  date_source: DateSource;

  /** Whether the expiry label was readable in the photo. */
  label_readable: boolean;

  /** Whether all required photos were provided and captured correctly. */
  capture_complete: boolean;

  // ── Eligibility ───────────────────────────────────────────────────────────

  /** Verdict from the eligibility gate. */
  eligibility_verdict: EligibilityVerdict;

  /** Human-readable explanation of the eligibility decision. */
  eligibility_reason: string;

  /** true = item is blocked from condition routing. */
  eligibility_blocked: boolean;

  // ── Routing ───────────────────────────────────────────────────────────────

  /** Recommended routing outcome. */
  recommended_route: RoutingOutcome;

  /** Routing engine confidence. Range: 0.0–1.0. */
  routing_confidence: number;

  /** Step-by-step reasoning chain from the routing engine. */
  routing_logic_trace: string[];

  /** Alternative routes with explanatory rationale. */
  alternative_routes: Array<{ route: RoutingOutcome; reason: string }>;

  // ── Confidence gating ─────────────────────────────────────────────────────

  /** Whether this assessment was escalated to human review. */
  escalated_to_human: boolean;

  /** Reason for escalation if escalated_to_human is true, otherwise null. */
  escalation_reason: string | null;

  // ── Second Life Score ─────────────────────────────────────────────────────

  /** Composite score representing the item's second-life potential. Range: 0–100. */
  second_life_score: number;

  // ── Product Health Card extras ────────────────────────────────────────────

  /** QR code data string encoding assessment_id and key fields. */
  qr_data: string;
}

/**
 * Routing decision context — used internally by the routing engine
 * and surfaced in the RoutingSimulator UI.
 */
export interface RoutingDecision {
  /** Recommended routing outcome. */
  recommended_route: RoutingOutcome;

  /** Routing confidence. Range: 0.0–1.0. */
  confidence: number;

  /** Step-by-step reasoning trace. */
  logic_trace: string[];

  /** Alternative routes available for this item. */
  alternative_routes: Array<{ route: RoutingOutcome; reason: string }>;
}

/**
 * Error response body from POST /api/assess (HTTP 4xx / 5xx).
 *
 * Error codes match context.md §7 exactly:
 *   MISSING_FRONT_PHOTO | MISSING_LABEL_PHOTO | INVALID_DATED_CATEGORY |
 *   INVALID_IMAGE_DATA | IMAGE_TOO_LARGE | GRADING_PARSE_ERROR |
 *   BEDROCK_UNAVAILABLE | BEDROCK_AUTH_FAILED | INTERNAL_ERROR | FUNCTION_TIMEOUT
 */
export interface AssessErrorResponse {
  error: {
    /** Machine-readable error code (see context.md §7 error table). */
    code: string;
    /** Human-readable error description. */
    message: string;
  };
}

// ── Internal domain interfaces (not sent over the wire) ───────────────────────

/**
 * Input to the eligibility gate function (evaluateEligibility).
 * Mirrors context.md §5.2 EligibilityInput exactly.
 */
export interface EligibilityInput {
  dated_category: DatedCategory;
  expiry_date: Date | null;
  label_readable: boolean;
  today: Date;
  shelf_life_days: number | null;
}

/**
 * Output from the eligibility gate function.
 * Mirrors context.md §5.2 EligibilityResult exactly.
 */
export interface EligibilityResult {
  verdict: EligibilityVerdict;
  allowed_routes: RoutingOutcome[];
  reason: string;
  requires_photo2: boolean;
  /** true = item MUST NOT reach condition routing. */
  blocked: boolean;
}

/**
 * Input to the routing engine (evaluateRouting).
 * Mirrors context.md §5.3 RoutingInput exactly.
 */
export interface RoutingInput {
  grade: Grade;
  estimated_value: number;
  distance_km: number;
  local_demand: number;
  repair_cost_estimate: number;
  allowed_routes: RoutingOutcome[];
}

/**
 * Input to the confidence gate function (evaluateConfidenceGate).
 * Mirrors context.md §5.4 ConfidenceGateInput exactly.
 */
export interface ConfidenceGateInput {
  model_confidence: number;
  estimated_value: number;
  dated_category: DatedCategory;
}

/**
 * Output from the confidence gate function.
 * Mirrors context.md §5.4 ConfidenceGateResult exactly.
 */
export interface ConfidenceGateResult {
  escalate_to_human: boolean;
  reason: string | null;
}
