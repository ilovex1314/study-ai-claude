import { describe, expect, it } from "vitest";
import { scoreAttempt, buildReview } from "./score";

const qs = [
  { id: "q1", type: "single", concept: "rag", weight: 60, prompt: "p", explanation: "e", options: [{ id: "a", label: "A", correct: true }, { id: "b", label: "B", correct: false }] },
  { id: "q2", type: "single", concept: "agent", weight: 40, prompt: "p", explanation: "e", options: [{ id: "a", label: "A", correct: true }, { id: "b", label: "B", correct: false }] }
] as const;

it("sums weighted earned points and total", () => {
  const r = scoreAttempt(qs, { q1: "a", q2: "b" });
  expect(r).toMatchObject({ score: 60, total: 100 });
  expect(r.missed).toEqual(["q2"]);
});

it("derives weak concepts from missed questions", () => {
  const review = buildReview(qs, { q1: "b", q2: "a" });
  expect(review.weakConcepts).toEqual(["rag"]);
  expect(review.recommendations.length).toBeGreaterThan(0);
});
