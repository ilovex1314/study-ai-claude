import type { Question } from "../content/schema";
import type { AnswerValue } from "./types";
import { gradeQuestion } from "./graders";

export type ScoreResult = { score: number; total: number; autoScore: number; selfScore: number; missed: string[] };

export function scoreAttempt(questions: readonly Question[], answers: Record<string, AnswerValue>): ScoreResult {
  let score = 0, total = 0, autoScore = 0, selfScore = 0; const missed: string[] = [];
  for (const q of questions) {
    const r = gradeQuestion(q as Question, answers[q.id]);
    total += r.max; score += r.earned;
    if (r.selfGraded) selfScore += r.earned; else autoScore += r.earned;
    if (!r.correct) missed.push(q.id);
  }
  return { score, total, autoScore, selfScore, missed };
}

export type Review = ScoreResult & { weakConcepts: string[]; recommendations: string[] };

export function buildReview(questions: readonly Question[], answers: Record<string, AnswerValue>): Review {
  const result = scoreAttempt(questions, answers);
  const weakConcepts = [...new Set(result.missed.map((id) => questions.find((q) => q.id === id)?.concept).filter((c): c is string => Boolean(c)))];
  const recommendations = weakConcepts.length
    ? weakConcepts.map((c) => `复习「${c}」：回到概念卡，重写它解决的问题、系统边界、常见误区与一个生产验收方法。`)
    : ["本轮掌握很好。把 verifiableOutput 真正写出来，并用自评 rubric 逐条检查。"];
  return { ...result, weakConcepts, recommendations };
}
