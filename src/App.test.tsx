import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { lessons } from "./content/lessons";

beforeEach(() => localStorage.clear());
const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

it("renders the first lesson title and its production/counter example contrast", () => {
  renderAt(`/${lessons[0].id}/concepts`);
  expect(screen.getByRole("heading", { level: 1, name: lessons[0].title })).toBeInTheDocument();
  expect(screen.getAllByText("生产案例").length).toBeGreaterThan(0);
  expect(screen.getAllByText("反例").length).toBeGreaterThan(0);
});

it("shows each question's weight beside it", () => {
  renderAt(`/${lessons[0].id}/practice`);
  expect(screen.getAllByText(/本题 \d+ 分/).length).toBe(lessons[0].questions.length);
});

it("saves practice evidence text to the learner-state adapter", () => {
  renderAt(`/${lessons[0].id}/practice`);
  const box = screen.getByLabelText("练习产出");
  fireEvent.change(box, { target: { value: "我的边界判断" } });
  fireEvent.blur(box);
  expect(localStorage.getItem(`study-ai-claude.${lessons[0].id}.practiceEvidence`)).toMatch(/我的边界判断/);
});
