/**
 * scripts/test-bedrock-route.mjs
 *
 * Reproduces the EXACT request shape that src/app/api/assess/route.ts sends to
 * Bedrock (system prompt + image block + the extra `modelId` field in the body),
 * so we can see which part Bedrock rejects. The minimal test (test-bedrock.mjs)
 * already proved the token/region/model id work, so any failure here is in the
 * payload the route builds.
 *
 * Run: node --env-file=.env.local scripts/test-bedrock-route.mjs
 */

const region = process.env.BEDROCK_REGION;
const modelId = process.env.BEDROCK_MODEL_ID;
const token = process.env.AWS_BEARER_TOKEN_BEDROCK;

if (!region || !modelId || !token) {
  console.error("Missing env. Run with --env-file=.env.local");
  process.exit(1);
}

const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(
  modelId
)}/converse`;

// 1x1 white JPEG (valid image bytes, base64).
const TINY_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof" +
  "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB" +
  "AAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==";

const SYSTEM_PROMPT =
  "You are an expert product condition grader. Return ONLY valid JSON.";

function buildContent() {
  return [
    { image: { format: "jpeg", source: { bytes: TINY_JPEG_B64 } } },
    { text: 'Product: "Test". Category: none. Return ONLY valid JSON.' },
  ];
}

async function send(label, payload) {
  console.log(`\n=== ${label} ===`);
  console.log("body keys:", Object.keys(payload).join(", "));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log("HTTP status:", res.status, res.statusText);
  if (res.ok) {
    console.log("✅ accepted");
  } else {
    console.log("❌ rejected — raw body:");
    console.log(text);
  }
  return res.status;
}

const base = {
  system: [{ text: SYSTEM_PROMPT }],
  messages: [{ role: "user", content: buildContent() }],
  inferenceConfig: { maxTokens: 1024, temperature: 0.1 },
};

// A) Exactly what the route sends today (modelId duplicated into the body).
const withModelId = { modelId, ...base };
const statusA = await send("A) route-faithful (modelId IN body)", withModelId);

// B) Correct Converse shape (modelId only in the URL path).
const statusB = await send("B) corrected (modelId NOT in body)", base);

console.log("\n── Verdict ─────────────────────────────────────");
if (statusA !== 200 && statusB === 200) {
  console.log("The extra `modelId` field in the request body is the bug.");
  console.log("Fix: remove `modelId` from bedrockPayload in route.ts.");
} else if (statusA === 200) {
  console.log("Route payload is accepted by Bedrock. The 503 is NOT the payload —");
  console.log("it's the Vercel env vars (stale BEDROCK_MODEL_ID / not redeployed).");
} else {
  console.log("Both failed — inspect the raw body above for the real reason.");
}
