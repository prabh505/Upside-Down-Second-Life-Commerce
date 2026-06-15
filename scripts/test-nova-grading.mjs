/**
 * scripts/test-nova-grading.mjs
 *
 * Sends the EXACT grading system prompt the route uses to Nova, then runs the
 * route's exact cleanup+JSON.parse logic on the reply — so we can see whether
 * Nova returns valid grading JSON (200 path) or trips the route's 422.
 *
 * Run: node --env-file=.env.local scripts/test-nova-grading.mjs
 */

const region = process.env.BEDROCK_REGION;
const modelId = process.env.BEDROCK_MODEL_ID;
const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
if (!region || !modelId || !token) { console.error("Missing env; use --env-file=.env.local"); process.exit(1); }

const TINY_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof" +
  "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB" +
  "AAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==";

// Verbatim from src/app/api/assess/route.ts
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
}`;

const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;
const body = {
  system: [{ text: BEDROCK_SYSTEM_PROMPT }],
  messages: [{ role: "user", content: [
    { image: { format: "jpeg", source: { bytes: TINY_JPEG_B64 } } },
    { text: 'Product: "Test Mug". Category: none. IMAGE 1 is the front of the item. There is no label photo. Grade the condition. Set labelReadable to false and all date fields to null. Return ONLY valid JSON matching the schema in your instructions.' },
  ]}],
  inferenceConfig: { maxTokens: 1024, temperature: 0.1 },
};

const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
console.log("HTTP status:", res.status);
const json = await res.json();
const rawModelText = json.output?.message?.content?.[0]?.text ?? null;
console.log("\n── Raw model text ─────────────────────────────");
console.log(rawModelText);

// Route's exact parsing logic
console.log("\n── Route parse result ─────────────────────────");
try {
  const cleaned = rawModelText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  const validGrade = ["A","B","C","D","E"].includes(parsed.grade);
  console.log("JSON.parse: ✅ ok");
  console.log("grade:", parsed.grade, validGrade ? "✅ valid" : "❌ NOT in A–E → route returns 422");
  console.log(validGrade ? "\n✅ Route would return 200 with this model." : "\n❌ Route would 422 on grade validation.");
} catch (e) {
  console.log("JSON.parse: ❌ FAILED →", e.message);
  console.log("\n❌ Route would return 422 (MODEL_OUTPUT_INVALID). Nova wrapped the JSON in prose/markdown.");
}
