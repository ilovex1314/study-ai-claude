import { describe, expect, it } from "vitest";
import { buildLessons } from "./generate-content.mjs";

it("parses frontmatter day files into validated lessons sorted by id", async () => {
  const lessons = await buildLessons();
  expect(Array.isArray(lessons)).toBe(true);
  expect(lessons).toHaveLength(20);
  expect(lessons.some((l) => l.id === "day01")).toBe(true);
  const ids = lessons.map((l) => l.id);
  expect(ids).toEqual([...ids].sort());
});
