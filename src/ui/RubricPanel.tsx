import type { RubricCriterion } from "../content/schema";
import { scoreRubric } from "../practice/rubric";

export function RubricPanel({ criteria, checks, onToggle }: { criteria: RubricCriterion[]; checks: string[]; onToggle: (id: string) => void }) {
  const { checked, total, ratio } = scoreRubric(criteria, checks);
  return (
    <div className="rubric-panel">
      <h3>自评 Rubric（{checked}/{total} · {Math.round(ratio * 100)}%）</h3>
      <ul className="rubric-list">
        {criteria.map((c) => (
          <li key={c.id}>
            <label>
              <input type="checkbox" checked={checks.includes(c.id)} onChange={() => onToggle(c.id)} />
              {c.criterion}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
