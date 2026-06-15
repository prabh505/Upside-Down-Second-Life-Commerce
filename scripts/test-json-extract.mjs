/**
 * scripts/test-json-extract.mjs
 * Mirrors extractJsonObject() in src/app/api/assess/route.ts and checks it
 * against the messy shapes a non-Claude model (e.g. Nova) might return.
 */
function extractJsonObject(raw) {
  const text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1].trim() : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first !== -1 && last > first) return JSON.parse(candidate.slice(first, last + 1));
    throw new Error("No JSON object found in model output");
  }
}

const OBJ = '{"grade":"B","tier":"Very Good"}';
const cases = [
  ["clean JSON", OBJ],
  ["markdown fenced", "```json\n" + OBJ + "\n```"],
  ["prose before", "Here is the assessment:\n" + OBJ],
  ["prose before + after", "Sure! " + OBJ + "\nLet me know if you need more."],
  ["fence + prose", "Result:\n```\n" + OBJ + "\n```\nDone."],
];

let pass = 0;
for (const [name, input] of cases) {
  try {
    const out = extractJsonObject(input);
    const ok = out.grade === "B";
    console.log(`${ok ? "✅" : "❌"} ${name.padEnd(22)} → grade=${out.grade}`);
    if (ok) pass++;
  } catch (e) {
    console.log(`❌ ${name.padEnd(22)} → threw: ${e.message}`);
  }
}
console.log(`\n${pass}/${cases.length} passed`);
process.exit(pass === cases.length ? 0 : 1);
