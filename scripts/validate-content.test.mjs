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
