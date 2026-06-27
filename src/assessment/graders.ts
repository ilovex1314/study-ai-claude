import type { AnswerValue, GradeResult, Grader, Question, QuestionType } from "./types";

const single: Grader = {
  type: "single",
  isComplete: (_q, a) => typeof a === "string" && a.length > 0,
  grade: (q, a) => {
    const max = q.weight;
    if (q.type !== "single") return { earned: 0, max, correct: false, complete: false, selfGraded: false };
    const complete = typeof a === "string" && a.length > 0;
    const correct = complete && q.options.some((o) => o.id === a && o.correct);
    return { earned: correct ? max : 0, max, correct, complete, selfGraded: false };
  }
};

export const graders: Partial<Record<QuestionType, Grader>> = { single };

export function gradeQuestion(q: Question, answer: AnswerValue | undefined): GradeResult {
  const grader = graders[q.type];
  if (!grader) throw new Error(`no grader registered for question type: ${q.type}`);
  return grader.grade(q, answer);
}
