/**
 * scripts/test-bedrock.mjs
 *
 * Standalone check for whether your Bedrock API key / region / model ID work.
 * Uses the EXACT same URL + auth + Converse payload shape as
 * src/app/api/assess/route.ts, but prints the real HTTP status and error body
 * (the production route hides these behind a generic 503).
 *
 * Usage:
 *   1. Put your credentials in .env.local (cp .env.example .env.local), OR
 *      export them in your shell, then:
 *   2. node --env-file=.env.local scripts/test-bedrock.mjs
 *      (Node 20+; if --env-file is unsupported, just `export` the 3 vars first
 *       and run `node scripts/test-bedrock.mjs`.)
 */

const region = process.env.BEDROCK_REGION;
const modelId = process.env.BEDROCK_MODEL_ID;
const token = process.env.AWS_BEARER_TOKEN_BEDROCK;

function mask(v) {
  if (!v) return "(missing)";
  if (v.length <= 8) return "****";
  return `${v.slice(0, 4)}…${v.slice(-4)} (len ${v.length})`;
}

console.log("── Config ─────────────────────────────────────");
console.log("BEDROCK_REGION         :", region || "(missing)");
console.log("BEDROCK_MODEL_ID       :", modelId || "(missing)");
console.log("AWS_BEARER_TOKEN_BEDROCK:", mask(token));
console.log("───────────────────────────────────────────────");

if (!region || !modelId || !token) {
  console.error(
    "\n❌ One or more variables are missing. Set all three before testing."
  );
  process.exit(1);
}

const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(
  modelId
)}/converse`;

const payload = {
  messages: [{ role: "user", content: [{ text: "Reply with the single word: OK" }] }],
  inferenceConfig: { maxTokens: 16, temperature: 0 },
};

console.log("\nPOST", url, "\n");

try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log("HTTP status:", res.status, res.statusText);

  if (res.ok) {
    console.log("\n✅ API key works. Model responded:");
    try {
      const json = JSON.parse(text);
      console.log("   ", json.output?.message?.content?.[0]?.text ?? text);
    } catch {
      console.log("   ", text);
    }
    process.exit(0);
  }

  console.log("\n❌ Bedrock rejected the request. Raw response body:\n");
  console.log(text);

  if (res.status === 401 || res.status === 403) {
    console.log(
      "\n👉 401/403 means the bearer token is invalid, expired, or lacks " +
        "bedrock:InvokeModel permission for this model in this region."
    );
  }
  if (res.status === 400) {
    console.log(
      "\n👉 400 is usually a bad model ID. Claude 4.x on Bedrock typically " +
        "needs a cross-region INFERENCE PROFILE id, not the bare foundation " +
        "model id. For ap-south-1 (APAC) try prefixing with 'apac.', e.g.\n" +
        "   BEDROCK_MODEL_ID=apac.anthropic.claude-sonnet-4-5-20251101-v1:0\n" +
        "   (us-east-1/us-west-2 use the 'us.' prefix.) Confirm the exact id " +
        "in the Bedrock console → Inference and assessment → Cross-region inference."
    );
  }
  process.exit(1);
} catch (err) {
  console.error("\n❌ Network/DNS error reaching Bedrock:", err.message);
  console.error(
    "   Check the region is a real Bedrock endpoint and you have connectivity."
  );
  process.exit(1);
}
