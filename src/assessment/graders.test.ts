import { describe, expect, it } from "vitest";
import { gradeQuestion } from "./graders";

const q = { id: "q1", type: "single", concept: "c", weight: 30, prompt: "p", explanation: "e",
  options: [{ id: "a", label: "A", correct: true }, { id: "b", label: "B", correct: false }] } as const;

it("awards full weight for the correct single answer", () => {
  expect(gradeQuestion(q, "a")).toMatchObject({ earned: 30, max: 30, correct: true });
});
it("awards zero for a wrong single answer", () => {
  expect(gradeQuestion(q, "b")).toMatchObject({ earned: 0, max: 30, correct: false });
});
it("treats no answer as incomplete and zero", () => {
  expect(gradeQuestion(q, undefined)).toMatchObject({ earned: 0, complete: false });
});
