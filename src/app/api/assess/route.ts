/**
 * src/app/api/assess/route.ts
 *
 * POST /api/assess — the single assessment endpoint for Second Life Commerce.
 *
 * Pipeline:
 *   1. Validate request (form fields + images)
 *   2. Call Amazon Bedrock (Claude Sonnet 4.6 via Converse API) for vision grading
 *   3. Parse model output (strict JSON)
 *   4. Run eligibility gate (pure function — computeEligibility)
 *   5. Run condition routing (pure function — computeRouting)
 *   6. Apply confidence gating (override to human_review if needed)
 *   7. Return GradingResult
 *
 * Security:
 *   - AWS_BEARER_TOKEN_BEDROCK accessed only via process.env inside this file.
 *   - Never exported, logged, or returned in any response.
 *   - rawModelOutput stripped in production builds.
 *   - File type validated before encoding.
 *
 * @see context.md §7 (API Contract) and §5 (Domain Rules)
 */

import { NextRequest, NextResponse } from "next/server";
import type {
  Grade,
  Tier,
  DatedCategory,
  DateSource,
  EligibilityVerdict,
  RoutingOutcome,
  GradingResult,
  RoutingDecision,
} from "@/lib/types";
import {
  NEAR_EXPIRY_THRESHOLD_DAYS,
  MAX_IMAGE_SIZE_BYTES,
  TIER_LABELS,
  DEFAULT_DISTANCE_KM,
  DEFAULT_LOCAL_DEMAND,
} from "@/lib/constants";

// ── Bedrock system prompt ─────────────────────────────────────────────────────
// Embedded here (never sent to client). This is the expert grader prompt.

const BEDROCK_SYSTEM_PROMPT = `You are an expert product condition grader and eligibility assessor for a circular economy resale platform.
You receive one or two photos and must return ONLY valid JSON — no markdown, no preamble, no explanation outside the JSON.

IMAGE 1 (always): front of the item.
IMAGE 2 (if present): close-up of the expiry or manufacture label.

Return this exact JSON schema:
{
  "grade": "A" | "B" | "C" | "D" | "E",
  "tier": "Like New" | "Very Good" | "Good" | "Acceptable" | "Poor",
  "confidence": number (0.0–1.0),
  "defects": string[],
  "completeness": string[],
  "resalePercentage": number (0–100),
  "captureComplete": boolean,
  "expiryDate": string | null,
  "manufactureDate": string | null,
  "lotCode": string | null,
  "labelReadable": boolean,
  "gradingNotes": string
}

GRADING RUBRIC:
A (Like New): no visible defects, original or equivalent packaging, 85–100% resale.
B (Very Good): minor cosmetic marks only, all accessories present, 70–84% resale.
C (Good): visible wear consistent with use, functional, no major damage, 50–69% resale.
D (Acceptable): significant wear, possible minor functional issues, 25–49% resale.
E (Poor): heavy damage, major defects, or safety concerns visible, 0–24% resale.

LABEL READING (IMAGE 2 only):
Extract expiry date, manufacture date, lot code. If blurry or absent, set labelReadable: false and all date fields to null. Never guess a date that is not clearly visible.`;

// ── Types internal to this file ───────────────────────────────────────────────

/** Shape of the JSON returned by the Bedrock model. */
interface BedrockModelOutput {
  grade: Grade;
  tier: Tier;
  confidence: number;
  defects: string[];
  completeness: string[];
  resalePercentage: number;
  captureComplete: boolean;
  expiryDate: string | null;
  manufactureDate: string | null;
  lotCode: string | null;
  labelReadable: boolean;
  gradingNotes: string;
}

/** Internal eligibility result from computeEligibility. */
interface EligibilityGateResult {
  verdict: "eligible" | "donate" | "recycle" | "local_only";
  reason: string;
  dateSource: DateSource;
  effectiveExpiryDate: string | null;
  blocked: boolean;
}

/** Internal routing result from computeRouting. */
interface RoutingGateResult {
  decision: RoutingOutcome | "human_review";
  logicTrace: string;
  localOnly: boolean;
}

// ── Accepted MIME types ───────────────────────────────────────────────────────

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

function isAcceptedImageType(type: string): type is AcceptedImageType {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

// ── Date helpers (pure, no side effects) ──────────────────────────────────────

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function isExpired(expiryDate: string | null, today: Date = new Date()): boolean {
  const d = parseDate(expiryDate);
  if (!d) return false; // no date → cannot be expired
  return d.getTime() <= today.getTime();
}

function isNearExpiry(
  expiryDate: string | null,
  thresholdDays: number,
  today: Date = new Date()
): boolean {
  const d = parseDate(expiryDate);
  if (!d) return false;
  const daysUntil = Math.floor((d.getTime() - today.getTime()) / (86400000));
  return daysUntil > 0 && daysUntil <= thresholdDays;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(dateA: Date, dateB: Date): number {
  return Math.abs(Math.floor((dateA.getTime() - dateB.getTime()) / 86400000));
}

// ── Generate a simple UUID v4 ─────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURE FUNCTION: computeEligibility
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Determines whether an item is eligible for resale, and if not, what
 * alternative outcome is appropriate.
 *
 * Rules are applied IN THIS ORDER (do not reorder):
 *   1. non_resalable → donate
 *   2. safety_critical + (expired OR !labelReadable) → recycle
 *   3. perishable + expired → recycle
 *   4. perishable + near-expiry → local_only
 *   5. otherwise → eligible
 *
 * Pure function: no side effects, no module-level state, fully testable.
 *
 * @see context.md §5.2 Eligibility Gate
 */
function computeEligibility(
  category: DatedCategory,
  modelOutput: {
    expiryDate: string | null;
    labelReadable: boolean;
    resalePercentage: number;
  },
  catalogShelfLifeDays?: number,
  purchaseDate?: string
): EligibilityGateResult {
  const today = new Date();
  let effectiveExpiryDate = modelOutput.expiryDate;
  let dateSource: DateSource = modelOutput.expiryDate ? "label_ocr" : "none";
  let labelReadable = modelOutput.labelReadable;

  // ── Implausible date check ────────────────────────────────────────────────
  // If expiryDate is more than (catalogShelfLifeDays × 2) days in the future,
  // the date is implausible — treat as unreadable.
  if (
    effectiveExpiryDate &&
    catalogShelfLifeDays !== undefined &&
    catalogShelfLifeDays > 0
  ) {
    const expiryParsed = parseDate(effectiveExpiryDate);
    if (expiryParsed) {
      const daysInFuture = daysBetween(expiryParsed, today);
      const maxPlausibleDays = catalogShelfLifeDays * 2;
      if (expiryParsed > today && daysInFuture > maxPlausibleDays) {
        // Flag as implausible — override to unreadable
        effectiveExpiryDate = null;
        labelReadable = false;
        dateSource = "none";
      }
    }
  }

  // ── Age-estimation fallback ───────────────────────────────────────────────
  // If the label was unreadable AND we have purchase date + catalog shelf life,
  // estimate the expiry date.
  if (
    !labelReadable &&
    effectiveExpiryDate === null &&
    purchaseDate &&
    catalogShelfLifeDays !== undefined &&
    catalogShelfLifeDays > 0
  ) {
    const purchaseParsed = parseDate(purchaseDate);
    if (purchaseParsed) {
      effectiveExpiryDate = addDays(purchaseDate, catalogShelfLifeDays);
      dateSource = "estimated";
    }
  }

  // ── Rule 1: non_resalable → donate ────────────────────────────────────────
  if (category === "non_resalable") {
    return {
      verdict: "donate",
      reason: "Category is non-resalable by policy.",
      dateSource,
      effectiveExpiryDate,
      blocked: true,
    };
  }

  // ── Rule 2: safety_critical + (expired OR !labelReadable) → recycle ───────
  if (category === "safety_critical") {
    if (!labelReadable || isExpired(effectiveExpiryDate, today)) {
      return {
        verdict: "recycle",
        reason:
          "Safety-critical item with expired or unverifiable date cannot be resold or donated.",
        dateSource,
        effectiveExpiryDate,
        blocked: true,
      };
    }
  }

  // ── Rule 3: perishable + expired → recycle ────────────────────────────────
  if (category === "perishable" && isExpired(effectiveExpiryDate, today)) {
    return {
      verdict: "recycle",
      reason: "Item has passed its expiry date.",
      dateSource,
      effectiveExpiryDate,
      blocked: true,
    };
  }

  // ── Rule 4: perishable + near-expiry → local_only ─────────────────────────
  if (
    category === "perishable" &&
    isNearExpiry(effectiveExpiryDate, NEAR_EXPIRY_THRESHOLD_DAYS, today)
  ) {
    return {
      verdict: "local_only",
      reason: "Item is near expiry — local resale only, time-boxed.",
      dateSource,
      effectiveExpiryDate,
      blocked: false,
    };
  }

  // ── Rule 5: eligible ──────────────────────────────────────────────────────
  return {
    verdict: "eligible",
    reason: "Item passes all eligibility checks.",
    dateSource,
    effectiveExpiryDate,
    blocked: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURE FUNCTION: computeRouting
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Determines the recommended routing for an item based on its condition grade,
 * eligibility verdict, distance, and demand.
 *
 * Pure function: no side effects, no module-level state, fully testable.
 *
 * @see context.md §5.3 Condition Routing
 */
function computeRouting(
  grade: Grade,
  eligibility: EligibilityGateResult,
  distanceKm: number = DEFAULT_DISTANCE_KM,
  demandScore: number = DEFAULT_LOCAL_DEMAND * 100 // convert 0-1 → 0-100
): RoutingGateResult {
  // ── Blocked verdicts bypass condition routing entirely ─────────────────────

  if (eligibility.verdict === "recycle") {
    return {
      decision: "recycle",
      logicTrace: eligibility.reason,
      localOnly: false,
    };
  }

  if (eligibility.verdict === "donate") {
    return {
      decision: "donate",
      logicTrace: eligibility.reason,
      localOnly: false,
    };
  }

  if (eligibility.verdict === "local_only") {
    return {
      decision: "resell",
      logicTrace: "Near-expiry item — local buyers only.",
      localOnly: true,
    };
  }

  // ── Eligible items → condition-based routing ──────────────────────────────

  // Grade E → Recycle
  if (grade === "E") {
    return {
      decision: "recycle",
      logicTrace: "Condition too poor for resale.",
      localOnly: false,
    };
  }

  // Grade D + low demand → Donate
  if (grade === "D" && demandScore < 30) {
    return {
      decision: "donate",
      logicTrace:
        "Low demand and low condition — donation is the best outcome.",
      localOnly: false,
    };
  }

  // Grade D + sufficient demand → Refurbish
  if (grade === "D" && demandScore >= 30) {
    return {
      decision: "refurbish",
      logicTrace:
        "Demand exists but condition needs work before resale.",
      localOnly: false,
    };
  }

  // Grade C + far distance + low demand → Refurbish
  if (grade === "C" && distanceKm > 200 && demandScore < 50) {
    return {
      decision: "refurbish",
      logicTrace:
        "Shipping cost would exceed resale value at this distance and demand level.",
      localOnly: false,
    };
  }

  // Grade C + reasonable distance or good demand → Resell
  if (grade === "C" && (distanceKm <= 200 || demandScore >= 50)) {
    return {
      decision: "resell",
      logicTrace: "Good condition with viable local demand.",
      localOnly: false,
    };
  }

  // Grade A or B → Resell
  if (grade === "A" || grade === "B") {
    return {
      decision: "resell",
      logicTrace: "High-quality item — strong resale candidate.",
      localOnly: false,
    };
  }

  // Fallback (should never reach here, but TypeScript exhaustiveness)
  return {
    decision: "recycle",
    logicTrace: "Unable to determine routing — defaulting to recycle.",
    localOnly: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURE FUNCTION: applyConfidenceGating
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Overrides the routing decision to 'human_review' when confidence is below
 * threshold for high-risk or high-value items.
 *
 * Rule: if confidence < 0.6 AND (category === 'safety_critical' OR resalePercentage > 70)
 *   → override to human_review.
 *
 * Pure function: no side effects.
 */
function applyConfidenceGating(
  routing: RoutingGateResult,
  confidence: number,
  category: DatedCategory,
  resalePercentage: number
): {
  routing: RoutingGateResult;
  escalated: boolean;
  escalationReason: string | null;
} {
  if (
    confidence < 0.6 &&
    (category === "safety_critical" || resalePercentage > 70)
  ) {
    return {
      routing: {
        decision: "human_review",
        logicTrace:
          "Confidence below threshold for this item's value/risk category — physical intake grading required before listing.",
        localOnly: routing.localOnly,
      },
      escalated: true,
      escalationReason:
        "Confidence below threshold for this item's value/risk category — physical intake grading required before listing.",
    };
  }

  return {
    routing,
    escalated: false,
    escalationReason: null,
  };
}

// ── Image encoding helper ─────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Map routing decision to RoutingOutcome type ───────────────────────────────
// The prompt spec uses 'human_review' which is not a RoutingOutcome.
// Map it to the closest valid type for the GradingResult response.
function toRoutingOutcome(decision: RoutingOutcome | "human_review"): RoutingOutcome {
  if (decision === "human_review") return "recycle"; // placeholder — item is held
  return decision;
}

// ── Map eligibility verdict to the EligibilityVerdict type ────────────────────
function toEligibilityVerdict(
  verdict: EligibilityGateResult["verdict"],
  category: DatedCategory
): EligibilityVerdict {
  switch (verdict) {
    case "donate":
      return "donate_if_eligible";
    case "recycle":
      return category === "perishable" ? "recycle_or_dispose" : "recycle_only";
    case "local_only":
      return "local_timebox_or_donate";
    case "eligible":
      return "eligible";
  }
}

// ── Compute Second Life Score ─────────────────────────────────────────────────
// Formula: 40% condition + 25% demand + 20% completeness + 15% time-to-expiry
function computeSecondLifeScore(
  resalePercentage: number,
  demandScore: number,
  completeness: string[],
  expiryDate: string | null,
  blocked: boolean
): number {
  if (blocked) return Math.min(resalePercentage * 0.2, 20); // capped for blocked items

  const conditionScore = resalePercentage; // 0-100
  const demandComponent = demandScore; // 0-100
  const completenessScore =
    completeness.length === 0
      ? 50 // no info → neutral
      : completeness.some((c) =>
            c.toLowerCase().includes("missing") ||
            c.toLowerCase().includes("incomplete")
          )
        ? 30
        : 90;

  let expiryScore = 80; // default for non-dated items
  if (expiryDate) {
    const d = parseDate(expiryDate);
    if (d) {
      const daysLeft = Math.floor(
        (d.getTime() - Date.now()) / 86400000
      );
      if (daysLeft <= 0) expiryScore = 0;
      else if (daysLeft <= 30) expiryScore = 20;
      else if (daysLeft <= 90) expiryScore = 50;
      else expiryScore = 90;
    }
  }

  const raw =
    conditionScore * 0.4 +
    demandComponent * 0.25 +
    completenessScore * 0.2 +
    expiryScore * 0.15;

  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ── Bedrock media type mapping ────────────────────────────────────────────────

function toBedrockMediaType(mimeType: string): "image/jpeg" | "image/png" {
  if (mimeType === "image/png") return "image/png";
  return "image/jpeg";
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER: POST /api/assess
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const requestId = generateId();
  const startTime = Date.now();

  try {
    // ── 1. Parse multipart/form-data ──────────────────────────────────────────

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          error: "MISSING_FIELDS",
          fieldErrors: ["Request body must be multipart/form-data."],
        },
        { status: 400 }
      );
    }

    // ── 2. Validate required fields ───────────────────────────────────────────

    const fieldErrors: string[] = [];
    const frontImage = formData.get("frontImage");
    const labelImage = formData.get("labelImage");
    const category = formData.get("category") as string | null;
    const productName = formData.get("productName") as string | null;
    const purchaseDateRaw = formData.get("purchaseDate") as string | null;
    const catalogShelfLifeDaysRaw = formData.get("catalogShelfLifeDays") as string | null;
    const distanceKmRaw = formData.get("distanceKm") as string | null;
    const demandScoreRaw = formData.get("demandScore") as string | null;

    if (!frontImage || !(frontImage instanceof File) || frontImage.size === 0) {
      fieldErrors.push("frontImage is required and must be a non-empty file.");
    }
    if (!category) {
      fieldErrors.push("category is required (none | perishable | non_resalable | safety_critical).");
    }
    if (!productName) {
      fieldErrors.push("productName is required.");
    }

    const validCategories: DatedCategory[] = [
      "none",
      "perishable",
      "non_resalable",
      "safety_critical",
    ];
    if (category && !validCategories.includes(category as DatedCategory)) {
      fieldErrors.push(
        `category must be one of: ${validCategories.join(", ")}. Got: "${category}".`
      );
    }

    if (fieldErrors.length > 0) {
      return NextResponse.json(
        { error: "MISSING_FIELDS", fieldErrors },
        { status: 400 }
      );
    }

    // At this point, we know these are valid.
    const frontFile = frontImage as File;
    const typedCategory = category as DatedCategory;
    const typedProductName = productName as string;
    const purchaseDate = purchaseDateRaw ?? undefined;
    const catalogShelfLifeDays = catalogShelfLifeDaysRaw
      ? parseInt(catalogShelfLifeDaysRaw, 10)
      : undefined;
    const distanceKm = distanceKmRaw
      ? parseFloat(distanceKmRaw)
      : DEFAULT_DISTANCE_KM;
    const demandScoreInput = demandScoreRaw
      ? parseFloat(demandScoreRaw)
      : DEFAULT_LOCAL_DEMAND * 100;

    // ── 3. Validate image types ───────────────────────────────────────────────

    if (!isAcceptedImageType(frontFile.type)) {
      return NextResponse.json(
        {
          error: "INVALID_IMAGE_TYPE",
          accepted: [...ACCEPTED_IMAGE_TYPES],
        },
        { status: 400 }
      );
    }

    if (frontFile.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "IMAGE_TOO_LARGE", maxBytes: MAX_IMAGE_SIZE_BYTES },
        { status: 413 }
      );
    }

    let labelFile: File | null = null;
    if (labelImage && labelImage instanceof File && labelImage.size > 0) {
      if (!isAcceptedImageType(labelImage.type)) {
        return NextResponse.json(
          {
            error: "INVALID_IMAGE_TYPE",
            accepted: [...ACCEPTED_IMAGE_TYPES],
          },
          { status: 400 }
        );
      }
      if (labelImage.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "IMAGE_TOO_LARGE", maxBytes: MAX_IMAGE_SIZE_BYTES },
          { status: 413 }
        );
      }
      labelFile = labelImage;
    }

    // ── 4. Encode images to base64 ────────────────────────────────────────────

    const frontBase64 = await fileToBase64(frontFile);

    let labelBase64: string | null = null;
    if (labelFile) {
      labelBase64 = await fileToBase64(labelFile);
    }

    // ── 5. Build Bedrock Converse API request ─────────────────────────────────

    // Construct the content blocks: text instruction + images
    const contentBlocks: Array<
      | { text: string }
      | {
          image: {
            format: "jpeg" | "png";
            source: { bytes: string };
          };
        }
    > = [];

    // Front image (always first)
    contentBlocks.push({
      image: {
        format: frontFile.type === "image/png" ? "png" : "jpeg",
        source: { bytes: frontBase64 },
      },
    });

    // Label image (second, if present)
    if (labelBase64 && labelFile) {
      contentBlocks.push({
        image: {
          format: labelFile.type === "image/png" ? "png" : "jpeg",
          source: { bytes: labelBase64 },
        },
      });
    }

    // Text instruction
    const labelInstruction = labelBase64
      ? "IMAGE 1 is the front of the item. IMAGE 2 is the expiry/manufacture label. Grade the condition from IMAGE 1 and extract dates from IMAGE 2."
      : "IMAGE 1 is the front of the item. There is no label photo. Grade the condition. Set labelReadable to false and all date fields to null.";

    contentBlocks.push({
      text: `Product: "${typedProductName}". Category: ${typedCategory}. ${labelInstruction} Return ONLY valid JSON matching the schema in your instructions.`,
    });

    const bedrockPayload = {
      modelId: process.env.BEDROCK_MODEL_ID,
      system: [{ text: BEDROCK_SYSTEM_PROMPT }],
      messages: [
        {
          role: "user",
          content: contentBlocks,
        },
      ],
      inferenceConfig: {
        maxTokens: 1024,
        temperature: 0.1,
      },
    };

    // ── 6. Call Bedrock ───────────────────────────────────────────────────────

    const bedrockRegion = process.env.BEDROCK_REGION;
    const bedrockModelId = process.env.BEDROCK_MODEL_ID;
    const bedrockToken = process.env.AWS_BEARER_TOKEN_BEDROCK;

    if (!bedrockRegion || !bedrockModelId || !bedrockToken) {
      return NextResponse.json(
        {
          error: "INTERNAL_ERROR",
          message: "Bedrock configuration is missing. Check server environment variables.",
        },
        { status: 500 }
      );
    }

    const bedrockUrl = `https://bedrock-runtime.${bedrockRegion}.amazonaws.com/model/${encodeURIComponent(bedrockModelId)}/converse`;

    let bedrockResponse: Response;
    try {
      bedrockResponse = await fetch(bedrockUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bedrockToken}`,
        },
        body: JSON.stringify(bedrockPayload),
      });
    } catch (fetchError) {
      return NextResponse.json(
        {
          error: "MODEL_UNAVAILABLE",
          retryable: true,
        },
        { status: 503 }
      );
    }

    if (!bedrockResponse.ok) {
      const statusCode = bedrockResponse.status;

      if (statusCode === 401 || statusCode === 403) {
        return NextResponse.json(
          {
            error: "MODEL_UNAVAILABLE",
            retryable: false,
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: "MODEL_UNAVAILABLE",
          retryable: statusCode >= 500,
        },
        { status: 503 }
      );
    }

    // ── 7. Parse Bedrock response ─────────────────────────────────────────────

    let bedrockBody: {
      output?: {
        message?: {
          content?: Array<{ text?: string }>;
        };
      };
      usage?: { inputTokens?: number; outputTokens?: number };
    };

    try {
      bedrockBody = await bedrockResponse.json();
    } catch {
      return NextResponse.json(
        {
          error: "MODEL_OUTPUT_INVALID",
          rawOutput: process.env.NODE_ENV === "production" ? undefined : "Response body was not JSON.",
        },
        { status: 422 }
      );
    }

    const inputTokens = bedrockBody.usage?.inputTokens ?? 0;
    const outputTokens = bedrockBody.usage?.outputTokens ?? 0;

    // Extract the text content from the model response
    const rawModelText =
      bedrockBody.output?.message?.content?.[0]?.text ?? null;

    if (!rawModelText) {
      return NextResponse.json(
        {
          error: "MODEL_OUTPUT_INVALID",
          rawOutput: process.env.NODE_ENV === "production" ? undefined : "No text content in model response.",
        },
        { status: 422 }
      );
    }

    // ── 8. Parse model JSON output ────────────────────────────────────────────

    let modelOutput: BedrockModelOutput;
    try {
      // Strip any accidental markdown code fences the model might add
      const cleanedText = rawModelText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      modelOutput = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        {
          error: "MODEL_OUTPUT_INVALID",
          rawOutput: process.env.NODE_ENV === "production" ? undefined : rawModelText,
        },
        { status: 422 }
      );
    }

    // Validate grade is in the expected set
    const validGrades: Grade[] = ["A", "B", "C", "D", "E"];
    if (!validGrades.includes(modelOutput.grade)) {
      return NextResponse.json(
        {
          error: "MODEL_OUTPUT_INVALID",
          rawOutput:
            process.env.NODE_ENV === "production"
              ? undefined
              : `Invalid grade: "${modelOutput.grade}"`,
        },
        { status: 422 }
      );
    }

    // ── 9. Run eligibility gate ───────────────────────────────────────────────

    const eligibility = computeEligibility(
      typedCategory,
      {
        expiryDate: modelOutput.expiryDate,
        labelReadable: modelOutput.labelReadable,
        resalePercentage: modelOutput.resalePercentage,
      },
      catalogShelfLifeDays,
      purchaseDate
    );

    // ── 10. Run condition routing ──────────────────────────────────────────────

    const routing = computeRouting(
      modelOutput.grade,
      eligibility,
      distanceKm,
      demandScoreInput
    );

    // ── 11. Apply confidence gating ────────────────────────────────────────────

    const { routing: finalRouting, escalated, escalationReason } =
      applyConfidenceGating(
        routing,
        modelOutput.confidence,
        typedCategory,
        modelOutput.resalePercentage
      );

    // ── 12. Compute Second Life Score ──────────────────────────────────────────

    const secondLifeScore = computeSecondLifeScore(
      modelOutput.resalePercentage,
      demandScoreInput,
      modelOutput.completeness,
      eligibility.effectiveExpiryDate,
      eligibility.blocked
    );

    // ── 13. Build response ─────────────────────────────────────────────────────

    const assessmentId = generateId();
    const assessedAt = new Date().toISOString();

    // Map to the canonical EligibilityVerdict type
    const eligibilityVerdict = toEligibilityVerdict(
      eligibility.verdict,
      typedCategory
    );

    // Build logic trace
    const logicTrace: string[] = [
      `Category: ${typedCategory}`,
      `Eligibility: ${eligibility.verdict} — ${eligibility.reason}`,
      `Condition grade: ${modelOutput.grade} (${TIER_LABELS[modelOutput.grade]})`,
      `Routing: ${finalRouting.decision} — ${finalRouting.logicTrace}`,
    ];

    if (escalated) {
      logicTrace.push(`Escalated to human review: ${escalationReason}`);
    }

    // Alternative routes based on routing decision
    const alternativeRoutes: Array<{
      route: RoutingOutcome;
      reason: string;
    }> = [];
    if (
      finalRouting.decision === "resell" &&
      !eligibility.blocked
    ) {
      alternativeRoutes.push({
        route: "exchange",
        reason: "Community exchange is also viable for this item.",
      });
    }
    if (finalRouting.decision === "refurbish") {
      alternativeRoutes.push({
        route: "donate",
        reason: "Donation is an alternative if refurbishment is not cost-effective.",
      });
    }

    // QR data: encode essential assessment fields
    const qrData = JSON.stringify({
      id: assessmentId,
      grade: modelOutput.grade,
      route: toRoutingOutcome(finalRouting.decision),
      score: secondLifeScore,
    });

    const result: GradingResult = {
      assessment_id: assessmentId,
      assessed_at: assessedAt,
      condition_grade: modelOutput.grade,
      condition_label: TIER_LABELS[modelOutput.grade],
      defects: modelOutput.defects ?? [],
      completeness:
        Array.isArray(modelOutput.completeness)
          ? modelOutput.completeness.join("; ")
          : String(modelOutput.completeness ?? "Unknown"),
      model_confidence: modelOutput.confidence,
      expiry_date: eligibility.effectiveExpiryDate,
      manufacture_date: modelOutput.manufactureDate,
      lot_code: modelOutput.lotCode,
      date_source: eligibility.dateSource,
      label_readable: modelOutput.labelReadable,
      capture_complete: modelOutput.captureComplete,
      eligibility_verdict: eligibilityVerdict,
      eligibility_reason: eligibility.reason,
      eligibility_blocked: eligibility.blocked,
      recommended_route: toRoutingOutcome(finalRouting.decision),
      routing_confidence: modelOutput.confidence,
      routing_logic_trace: logicTrace,
      alternative_routes: alternativeRoutes,
      escalated_to_human: escalated,
      escalation_reason: escalationReason,
      second_life_score: secondLifeScore,
      qr_data: qrData,
    };

    // ── 14. Structured logging ─────────────────────────────────────────────────
    const durationMs = Date.now() - startTime;

    console.log(
      JSON.stringify({
        requestId,
        category: typedCategory,
        productName: typedProductName,
        durationMs,
        inputTokens,
        outputTokens,
        grade: modelOutput.grade,
        confidence: modelOutput.confidence,
        eligibilityVerdict: eligibility.verdict,
        routingDecision: finalRouting.decision,
        escalated,
        secondLifeScore,
      })
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // ── Unhandled error — never expose stack trace in production ─────────────
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.log(
      JSON.stringify({
        requestId,
        error: "INTERNAL_ERROR",
        message: errorMessage,
        durationMs,
      })
    );

    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "An unexpected error occurred."
            : errorMessage,
      },
      { status: 500 }
    );
  }
}
