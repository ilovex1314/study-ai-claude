import { describe, expect, it } from "vitest";
import { scoreRubric } from "./rubric";
import { buildCapabilityArchive } from "./archive";

it("scores rubric completion ratio", () => {
  const criteria = [{ id: "r1", criterion: "a" }, { id: "r2", criterion: "b" }];
  expect(scoreRubric(criteria, ["r1"])).toMatchObject({ checked: 1, total: 2, ratio: 0.5 });
});

it("marks a capability complete only with quiz + evidence + rubric", () => {
  const lessons = [{ id: "day01", capability: "判断模型边界", rubric: [{ id: "r1", criterion: "a" }], questions: [] }];
  const adapter = {
    loadHistory: () => [{ score: 80, total: 100 }],
    loadPracticeEvidence: () => ({ text: "x", rubricChecks: ["r1"], updatedAt: "t" })
  } as any;
  const rows = buildCapabilityArchive(lessons as any, adapter);
  expect(rows[0]).toMatchObject({ capability: "判断模型边界", status: "可独立交付" });
});
