import { useMemo, useState } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { lessons } from "./content/lessons";
import { curriculum } from "./curriculum/curriculum";
import type { Review } from "./assessment/score";
import { LocalStorageAdapter } from "./learner-state/localStorageAdapter";
import { Hero } from "./ui/Hero";
import { CurriculumNav } from "./ui/CurriculumNav";
import { SectionRail } from "./ui/SectionRail";
import { ConceptsPanel } from "./ui/ConceptsPanel";
import { DecisionPanel } from "./ui/DecisionPanel";
import { ArchitectureDiagram } from "./ui/ArchitectureDiagram";
import { QuizPanel } from "./ui/QuizPanel";
import { ReviewPanel } from "./ui/ReviewPanel";

const adapter = new LocalStorageAdapter();

function LessonPage() {
  const { dayId, section = "series" } = useParams();
  const lesson = useMemo(() => lessons.find((l) => l.id === dayId), [dayId]);
  const [review, setReview] = useState<Review | null>(null);

  if (!lesson) return <main className="lesson-missing"><p>未找到课程：{dayId}</p></main>;

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <CurriculumNav />
      </aside>
      <main className="lesson-page">
        <SectionRail dayId={lesson.id} active={section} />
        <section id="series" aria-label="概览">
          <Hero lesson={lesson} />
          <ArchitectureDiagram architecture={lesson.architecture} />
        </section>
        <ConceptsPanel lesson={lesson} />
        <DecisionPanel lesson={lesson} />
        <QuizPanel lesson={lesson} adapter={adapter} onReview={setReview} />
        <ReviewPanel lesson={lesson} adapter={adapter} review={review} />
      </main>
    </div>
  );
}

export default function App() {
  const first = curriculum[0]?.path ?? "/day01";
  return (
    <Routes>
      <Route path="/" element={<Navigate to={first} replace />} />
      <Route path="/:dayId/:section?" element={<LessonPage />} />
    </Routes>
  );
}
