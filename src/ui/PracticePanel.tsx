import { useState } from "react";
import type { Lesson } from "../content/schema";
import type { LearnerStateAdapter, PracticeEvidence } from "../learner-state/adapter";
import { RubricPanel } from "./RubricPanel";

export function PracticePanel({ lesson, adapter }: { lesson: Lesson; adapter: LearnerStateAdapter }) {
  const [evidence, setEvidence] = useState<PracticeEvidence>(
    () => adapter.loadPracticeEvidence(lesson.id) ?? { text: "", rubricChecks: [], updatedAt: "" }
  );

  const persist = (next: PracticeEvidence) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    setEvidence(stamped);
    adapter.savePracticeEvidence(lesson.id, stamped);
  };

  const toggleCheck = (id: string) => {
    const rubricChecks = evidence.rubricChecks.includes(id)
      ? evidence.rubricChecks.filter((c) => c !== id)
      : [...evidence.rubricChecks, id];
    persist({ ...evidence, rubricChecks });
  };

  return (
    <section className="practice-panel" aria-label="练习与自评">
      <h2>动手练习</h2>
      <p className="practice-prompt"><span className="tag">可验证产出</span>{lesson.verifiableOutput}</p>
      <label className="practice-label" htmlFor="practice-evidence">练习产出</label>
      <textarea
        id="practice-evidence"
        aria-label="练习产出"
        className="practice-textarea"
        value={evidence.text}
        onChange={(e) => setEvidence({ ...evidence, text: e.target.value })}
        onBlur={(e) => persist({ ...evidence, text: e.target.value })}
        placeholder="把今天的可验证产出写在这里……"
      />
      <RubricPanel criteria={lesson.rubric} checks={evidence.rubricChecks} onToggle={toggleCheck} />
    </section>
  );
}
