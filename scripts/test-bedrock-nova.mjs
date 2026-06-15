/**
 * scripts/test-bedrock-nova.mjs
 *
 * Probes Amazon's first-party multimodal "Nova" models on Bedrock with the same
 * Converse request shape the route uses (system + image + text). Amazon models
 * don't require an AWS Marketplace subscription, so they often work even when
 * Anthropic returns INVALID_PAYMENT_INSTRUMENT.
 *
 * Run: node --env-file=.env.local scripts/test-bedrock-nova.mjs
 */

const region = process.env.BEDROCK_REGION;
const token = process.env.AWS_BEARER_TOKEN_BEDROCK;

if (!region || !token) {
  console.error("Missing BEDROCK_REGION / AWS_BEARER_TOKEN_BEDROCK. Use --env-file=.env.local");
  process.exit(1);
}

// 1x1 white JPEG (valid image bytes, base64).
const TINY_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof" +
  "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB" +
  "AAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==";

// Candidate multimodal models, best/cheapest first. Includes both the APAC
// cross-region profile (for Mumbai) and the bare in-region id as fallback.
const CANDIDATES = [
  "apac.amazon.nova-lite-v1:0",
  "amazon.nova-lite-v1:0",
  "apac.amazon.nova-pro-v1:0",
  "amazon.nova-pro-v1:0",
];

function buildBody() {
  return {
    system: [{ text: "You are a vision assistant. Reply with one short sentence." }],
    messages: [
      {
        role: "user",
        content: [
          { image: { format: "jpeg", source: { bytes: TINY_JPEG_B64 } } },
          { text: "Describe this image in one short sentence." },
        ],
      },
    ],
    inferenceConfig: { maxTokens: 64, temperature: 0.2 },
  };
}

const working = [];

for (const modelId of CANDIDATES) {
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(
    modelId
  )}/converse`;
  process.stdout.write(`\n→ ${modelId}\n`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(buildBody()),
    });
    const text = await res.text();
    if (res.ok) {
      let reply = "";
      try {
        reply = JSON.parse(text).output?.message?.content?.[0]?.text ?? "";
      } catch {}
      console.log(`   ✅ ${res.status} OK — model replied: ${reply.slice(0, 80)}`);
      working.push(modelId);
    } else {
      let msg = text;
      try {
        msg = JSON.parse(text).message ?? text;
      } catch {}
      console.log(`   ❌ ${res.status} — ${String(msg).slice(0, 140)}`);
    }
  } catch (e) {
    console.log(`   ❌ network error — ${e.message}`);
  }
}

console.log("\n── Verdict ─────────────────────────────────────");
if (working.length) {
  console.log("Use this as BEDROCK_MODEL_ID (no code change needed):");
  console.log("   " + working[0]);
} else {
  console.log("No Nova model worked from this account/region. Check Bedrock →");
  console.log("Model access (enable Amazon Nova), or try region us-east-1.");
}
