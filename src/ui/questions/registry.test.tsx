import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionView } from "./registry";

const q = { id: "q1", type: "single", concept: "c", weight: 100, prompt: "选择正确项", explanation: "e",
  options: [{ id: "a", label: "对", correct: true }, { id: "b", label: "错", correct: false }] };

it("renders single-choice options and reports the chosen id", () => {
  const onAnswer = vi.fn();
  render(<QuestionView question={q as any} answer={undefined} onAnswer={onAnswer} />);
  fireEvent.click(screen.getByRole("button", { name: "对" }));
  expect(onAnswer).toHaveBeenCalledWith("a");
});
