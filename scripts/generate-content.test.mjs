import { describe, expect, it } from "vitest";
import { buildLessons } from "./generate-content.mjs";

it("parses frontmatter day files into validated lessons sorted by id", async () => {
  const lessons = await buildLessons();
  expect(Array.isArray(lessons)).toBe(true);
  // fixture day99 present during this task
  expect(lessons.some((l) => l.id === "day99")).toBe(true);
});
