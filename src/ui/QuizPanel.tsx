import { useState } from "react";
import type { Lesson } from "../content/schema";
import type { AnswerValue } from "../assessment/types";
import { buildReview } from "../assessment/score";
import type { Review } from "../assessment/score";
import type { LearnerStateAdapter } from "../learner-state/adapter";
import { createCurrentAttempt } from "../learner-state/localStorageAdapter";
import { QuestionView } from "./questions/registry";

export function QuizPanel({ lesson, adapter, onReview }: { lesson: Lesson; adapter: LearnerStateAdapter; onReview: (review: Review) => void }) {
  const [attempt, setAttempt] = useState(() => adapter.loadCurrentAttempt(lesson.id) ?? createCurrentAttempt());

  const setAnswer = (questionId: string, value: AnswerValue) => {
    const next = { ...attempt, answers: { ...attempt.answers, [questionId]: value } };
    setAttempt(next);
    adapter.saveCurrentAttempt(lesson.id, next);
  };

  const submit = () => {
    const review = buildReview(lesson.questions, attempt.answers);
    adapter.appendHistory(lesson.id, {
      ...attempt,
      completedAt: new Date().toISOString(),
      score: review.score,
      total: review.total,
      weakConcepts: review.weakConcepts,
      recommendations: review.recommendations
    });
    setAttempt(createCurrentAttempt());
    onReview(review);
  };

  const answered = lesson.questions.filter((q) => attempt.answers[q.id] !== undefined).length;

  return (
    <section className="quiz-panel" aria-label="加权测验">
      <h2>加权测验（满分 100）</h2>
      <ol className="question-list">
        {lesson.questions.map((q, i) => (
          <li key={q.id} className="question-item">
            <div className="question-head">
              <span className="question-index">第 {i + 1} 题</span>
              <span className="question-weight">本题 {q.weight} 分</span>
            </div>
            <p className="question-prompt">{q.prompt}</p>
            {q.scenario ? <p className="question-scenario">{q.scenario}</p> : null}
            <QuestionView question={q} answer={attempt.answers[q.id]} onAnswer={(v) => setAnswer(q.id, v)} />
            {attempt.answers[q.id] !== undefined ? <p className="question-explanation">{q.explanation}</p> : null}
          </li>
        ))}
      </ol>
      <button type="button" className="submit-quiz" disabled={answered === 0} onClick={submit}>
        提交测验（已答 {answered}/{lesson.questions.length}）
      </button>
    </section>
  );
}
