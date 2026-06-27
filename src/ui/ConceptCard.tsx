import type { Architecture, ConceptModule } from "../content/schema";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

export function ConceptCard({ module }: { module: ConceptModule }) {
  return (
    <article className="concept-card">
      <h3 className="concept-title">{module.title}</h3>
      <p className="concept-idea">{module.idea}</p>
      <p className="concept-why"><span className="tag">为什么重要</span>{module.whyItMatters}</p>
      <p className="concept-lens"><span className="tag">工程师视角</span>{module.engineerLens}</p>

      <div className="example-contrast">
        <div className="example good">
          <h4>生产案例</h4>
          <p className="example-context">{module.productionExample.context}</p>
          <p>{module.productionExample.whatTheyDid}</p>
          <p className="example-outcome">结果：{module.productionExample.outcome}</p>
        </div>
        <div className="example bad">
          <h4>反例</h4>
          <p className="example-context">{module.counterExample.context}</p>
          <p>{module.counterExample.antiPattern}</p>
          <p className="example-outcome">后果：{module.counterExample.consequence}</p>
        </div>
      </div>

      <ul className="pitfall-list">
        {module.pitfalls.map((p, i) => (
          <li key={i} className="pitfall">
            <span className="pitfall-symptom"><span className="tag">误区</span>{p.symptom}</span>
            <span className="pitfall-fix"><span className="tag">修复</span>{p.fix}</span>
          </li>
        ))}
      </ul>

      {module.diagram ? <ArchitectureDiagram architecture={{ summary: module.title, ...module.diagram } as Architecture} /> : null}
    </article>
  );
}
