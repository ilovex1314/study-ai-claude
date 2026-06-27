import type { Lesson } from "../content/schema";

export function Hero({ lesson }: { lesson: Lesson }) {
  return (
    <header className="hero">
      <p className="hero-eyebrow">{lesson.phase} · {lesson.stage}</p>
      <h1 className="hero-title">{lesson.title}</h1>
      <p className="hero-capability"><strong>能力目标：</strong>{lesson.capabilityGoal}</p>
      <p className="hero-summary">{lesson.summary}</p>
      <div className="hero-mental-model">
        <span className="tag">心智模型</span>
        <p>{lesson.mentalModel}</p>
      </div>
      <div className="hero-output">
        <span className="tag">可验证产出</span>
        <p>{lesson.verifiableOutput}</p>
      </div>
    </header>
  );
}
