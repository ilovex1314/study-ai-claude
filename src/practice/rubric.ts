import type { RubricCriterion } from "../content/schema";
export function scoreRubric(criteria: RubricCriterion[], checks: string[]) {
  const checked = criteria.filter((c) => checks.includes(c.id)).length;
  const total = criteria.length;
  return { checked, total, ratio: total === 0 ? 0 : checked / total };
}
