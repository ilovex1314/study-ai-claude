import { describe, expect, it, beforeEach } from "vitest";
import { LocalStorageAdapter, createCurrentAttempt } from "./localStorageAdapter";

beforeEach(() => localStorage.clear());

it("uses a uniform key scheme with no per-day special case", () => {
  const a = new LocalStorageAdapter();
  a.saveCurrentAttempt("day01", createCurrentAttempt());
  expect(localStorage.getItem("study-ai-claude.day01.currentAttempt")).toBeTruthy();
});

it("persists and reads practice evidence", () => {
  const a = new LocalStorageAdapter();
  a.savePracticeEvidence("day07", { text: "我的产出", rubricChecks: ["r1"], updatedAt: "t" });
  expect(a.loadPracticeEvidence("day07")?.text).toBe("我的产出");
});

it("tolerates legacy attempts missing practiceEvidence field", () => {
  localStorage.setItem("study-ai-claude.day01.attemptHistory", JSON.stringify([{ id: "x", startedAt: "t", completedAt: "t", answers: {}, score: 10, total: 100, weakConcepts: [], recommendations: [] }]));
  const a = new LocalStorageAdapter();
  expect(a.loadHistory("day01")[0].score).toBe(10);
});
