import type { Question } from "../content/schema";
export type { Question };
export type QuestionType = Question["type"];
export type AnswerValue =
  | string                                   // single: optionId
  | string[]                                 // multi: optionIds (F1)
  | Record<string, string>                   // fill-blank (F2)
  | { text: string; rubricChecks: string[] }; // short-answer (F3)
export type GradeResult = { earned: number; max: number; correct: boolean; complete: boolean; selfGraded: boolean };
export interface Grader<Q = Question, A = AnswerValue> {
  type: QuestionType;
  isComplete(q: Q, answer: A | undefined): boolean;
  grade(q: Q, answer: A | undefined): GradeResult;
}
