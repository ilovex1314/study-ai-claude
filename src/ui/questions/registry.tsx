import type { Question } from "../../content/schema";
import type { AnswerValue, QuestionType } from "../../assessment/types";
import { SingleQuestion } from "./SingleQuestion";
import type { JSX } from "react";

export type QuestionRenderer = (props: { question: Question; answer: AnswerValue | undefined; onAnswer: (v: AnswerValue) => void }) => JSX.Element;

export const renderers: Partial<Record<QuestionType, QuestionRenderer>> = {
  single: ({ question, answer, onAnswer }) =>
    <SingleQuestion question={question as Extract<Question, { type: "single" }>} answer={answer as string | undefined} onAnswer={onAnswer} />
};

export function QuestionView({ question, answer, onAnswer }: { question: Question; answer: AnswerValue | undefined; onAnswer: (v: AnswerValue) => void }) {
  const renderer = renderers[question.type];
  if (!renderer) return <p className="missing-renderer">尚未支持的题型：{question.type}</p>;
  return renderer({ question, answer, onAnswer });
}
