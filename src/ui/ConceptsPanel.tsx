import type { Lesson } from "../content/schema";
import { ConceptCard } from "./ConceptCard";

export function ConceptsPanel({ lesson }: { lesson: Lesson }) {
  return (
    <section className="concepts-panel" aria-label="核心概念">
      <h2>核心概念</h2>
      {lesson.modules.map((m) => (
        <ConceptCard key={m.id} module={m} />
      ))}
    </section>
  );
}
