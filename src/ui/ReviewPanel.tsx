import type { Lesson } from "../content/schema";
import type { Review } from "../assessment/score";
import type { LearnerStateAdapter } from "../learner-state/adapter";

export function ReviewPanel({ lesson, adapter, review }: { lesson: Lesson; adapter: LearnerStateAdapter; review: Review | null }) {
  const history = adapter.loadHistory(lesson.id);

  return (
    <section className="review-panel" aria-label="复盘">
      <h2>复盘</h2>
      {review ? (
        <div className="review-result">
          <p className="review-score"><strong>{review.score}</strong> / {review.total}</p>
          {review.weakConcepts.length > 0 ? (
            <div className="weak-concepts">
              <h3>需要加强的概念</h3>
              <ul>{review.weakConcepts.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          ) : null}
          <div className="recommendations">
            <h3>下一步建议</h3>
            <ul>{review.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        </div>
      ) : (
        <p className="review-empty">完成测验后这里会显示得分、薄弱概念与建议。</p>
      )}

      {history.length > 0 ? (
        <div className="attempt-history">
          <h3>历史记录</h3>
          <ul>
            {history.map((a) => (
              <li key={a.id}>{new Date(a.completedAt).toLocaleString()} — {a.score}/{a.total}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
