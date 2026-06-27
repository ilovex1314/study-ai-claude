import { describe, expect, it } from "vitest";
import { curriculum } from "./curriculum";
import { lessons } from "../content/lessons";

it("derives one route entry per lesson, ordered and path-aligned", () => {
  expect(curriculum.length).toBe(lessons.length);
  expect(curriculum.map((d) => d.id)).toEqual([...lessons].map((l) => l.id).sort());
  expect(curriculum.every((d) => d.path === `/${d.id}`)).toBe(true);
});
