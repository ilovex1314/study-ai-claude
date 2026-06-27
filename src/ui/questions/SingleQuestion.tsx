import type { Question } from "../../content/schema";
export function SingleQuestion({ question, answer, onAnswer }: { question: Extract<Question, { type: "single" }>; answer: string | undefined; onAnswer: (v: string) => void }) {
  return (
    <div className="option-list">
      {question.options.map((o) => {
        const revealed = Boolean(answer);
        const selected = answer === o.id;
        const cls = ["option-button", selected ? "selected" : "", revealed && o.correct ? "correct" : "", revealed && selected && !o.correct ? "wrong" : ""].join(" ");
        return <button key={o.id} type="button" className={cls} onClick={() => onAnswer(o.id)}>{o.label}</button>;
      })}
    </div>
  );
}
