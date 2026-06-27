import { buildLessons } from "./generate-content.mjs";

export function validateLessons(lessons, { requireDays } = {}) {
  const errors = [];
  if (requireDays != null && lessons.length !== requireDays) {
    errors.push(`expected exactly ${requireDays} day lessons, found ${lessons.length}`);
  }
  for (const l of lessons) {
    const sum = (l.questions ?? []).reduce((s, q) => s + (q.weight ?? 0), 0);
    if (sum !== 100) errors.push(`${l.id}: question weights sum to ${sum}, expected 100`);
    if ((l.references ?? []).some((r) => !r.note)) errors.push(`${l.id}: every reference needs a note`);
    const a = l.architecture;
    if (a && a.renderMode !== "none") {
      const rel = new Set((a.edges ?? []).map((e) => e.relation));
      const kinds = new Set((a.groups ?? []).map((g) => g.kind));
      if (["feedback", "flywheel"].includes(a.type) && !rel.has("feedback")) errors.push(`${l.id}: ${a.type} needs a feedback edge`);
      if (["gate", "state"].includes(a.type) && ![...rel].some((r) => r === "branch" || r === "guard")) errors.push(`${l.id}: ${a.type} needs a branch/guard edge`);
      if (a.type === "layered" && !(kinds.has("layer") || kinds.has("lane"))) errors.push(`${l.id}: layered needs a layer/lane group`);
    }
  }
  return { ok: errors.length === 0, errors };
}

async function main() {
  const lessons = await buildLessons();
  const realDays = lessons.filter((l) => /^day\d{2}$/.test(l.id) && l.id !== "day99");
  const hasFixture = lessons.some((l) => l.id === "day99");
  // Enforce the 20-day count only once the fixture is removed (real curriculum present).
  const result = validateLessons(lessons, hasFixture ? {} : { requireDays: 20 });
  if (!result.ok) { console.error("validate-content FAILED:\n" + result.errors.join("\n")); process.exit(1); }
  console.log(`validate-content: ${realDays.length} lessons OK`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
