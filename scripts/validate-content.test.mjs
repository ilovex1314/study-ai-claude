import { describe, expect, it } from "vitest";
import { validateLessons } from "./validate-content.mjs";

const base = (over = {}) => ({ id: "day01", questions: [{ weight: 100 }], references: [{ note: "x" }, { note: "y" }], architecture: { type: "feedback", edges: [{ relation: "feedback" }], groups: [] }, ...over });

it("flags weights not summing to 100", () => {
  const r = validateLessons([base({ questions: [{ weight: 50 }] })]);
  expect(r.ok).toBe(false);
  expect(r.errors.join()).toMatch(/100/);
});

it("flags feedback architecture without a feedback edge", () => {
  const r = validateLessons([base({ architecture: { type: "feedback", edges: [{ relation: "primary" }], groups: [] } })]);
  expect(r.ok).toBe(false);
});

it("passes a well-formed lesson set", () => {
  expect(validateLessons([base()]).ok).toBe(true);
});

it("flags a curriculum that is not exactly the required day count", () => {
  const nineteen = Array.from({ length: 19 }, (_, i) => base({ id: `day${String(i + 1).padStart(2, "0")}` }));
  const r = validateLessons(nineteen, { requireDays: 20 });
  expect(r.ok).toBe(false);
  expect(r.errors.join()).toMatch(/20/);
});
