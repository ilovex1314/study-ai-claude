import type { Lesson } from "../content/schema";

export function DecisionPanel({ lesson }: { lesson: Lesson }) {
  return (
    <section className="decision-panel" aria-label="决策分层">
      <h2>决策分层</h2>
      {lesson.decisionLayers.map((layer) => (
        <div key={layer.id} className="decision-layer">
          <h3>{layer.name}</h3>
          <p className="decision-question">{layer.question}</p>
          <ul className="decision-choices">
            {layer.choices.map((c, i) => (
              <li key={i}>
                <strong>{c.name}</strong>：{c.description}
                <span className="choice-example">{c.example}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
