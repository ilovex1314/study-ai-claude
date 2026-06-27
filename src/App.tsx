import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { lessons } from "./content/lessons";
import { curriculum } from "./curriculum/curriculum";
import type { Review } from "./assessment/score";
import { LocalStorageAdapter } from "./learner-state/localStorageAdapter";
import { Hero } from "./ui/Hero";
import { CurriculumNav } from "./ui/CurriculumNav";
import { SectionRail, SECTIONS } from "./ui/SectionRail";
import type { SectionKey } from "./ui/SectionRail";
import { ConceptsPanel } from "./ui/ConceptsPanel";
import { DecisionPanel } from "./ui/DecisionPanel";
import { ArchitectureDiagram } from "./ui/ArchitectureDiagram";
import { QuizPanel } from "./ui/QuizPanel";
import { ReviewPanel } from "./ui/ReviewPanel";
import { PracticePanel } from "./ui/PracticePanel";
import { CapabilityArchive } from "./ui/CapabilityArchive";

const adapter = new LocalStorageAdapter();
const SECTION_IDS = SECTIONS.map((s) => s.key);
const canUseDom = typeof IntersectionObserver !== "undefined";

function LessonPage() {
  const { dayId, section } = useParams();
  const navigate = useNavigate();
  const lesson = useMemo(() => lessons.find((l) => l.id === dayId), [dayId]);
  const [review, setReview] = useState<Review | null>(null);
  const [active, setActive] = useState<string>(section ?? "series");
  const [navOpen, setNavOpen] = useState(false);

  // On day change, jump to the requested section (or top), without smooth animation.
  useEffect(() => {
    if (!lesson || !canUseDom) return;
    const target = section && SECTION_IDS.includes(section as SectionKey) ? section : null;
    if (target) {
      document.getElementById(target)?.scrollIntoView({ block: "start" });
      setActive(target);
    } else {
      window.scrollTo(0, 0);
      setActive("series");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  // Scroll-spy: highlight the section crossing the upper-middle band.
  useEffect(() => {
    if (!lesson || !canUseDom) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [dayId, lesson]);

  const goToSection = (key: SectionKey) => {
    setActive(key);
    navigate(`/${lesson?.id}/${key}`, { replace: true });
    if (canUseDom) document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!lesson) return <main className="lesson-missing"><p>未找到课程：{dayId}</p></main>;

  return (
    <div className="app-shell">
      <aside className={`app-sidebar${navOpen ? " open" : ""}`}>
        <button type="button" className="nav-toggle" onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen}>
          课程目录 · {lesson.phase}
        </button>
        <div className="app-sidebar-scroll">
          <CurriculumNav onPick={() => setNavOpen(false)} />
        </div>
      </aside>
      <main className="lesson-page">
        <SectionRail active={active} onNavigate={goToSection} />
        <section id="series" aria-label="概览" className="lesson-section">
          <Hero lesson={lesson} />
          <ArchitectureDiagram architecture={lesson.architecture} />
        </section>
        <section id="concepts" aria-label="核心概念" className="lesson-section">
          <ConceptsPanel lesson={lesson} />
        </section>
        <section id="decision" aria-label="决策分层" className="lesson-section">
          <DecisionPanel lesson={lesson} />
        </section>
        <section id="practice" aria-label="加权测验" className="lesson-section">
          <QuizPanel lesson={lesson} adapter={adapter} onReview={setReview} />
          <PracticePanel lesson={lesson} adapter={adapter} />
        </section>
        <section id="review" aria-label="复盘与能力档案" className="lesson-section">
          <ReviewPanel lesson={lesson} adapter={adapter} review={review} />
          <CapabilityArchive adapter={adapter} />
        </section>
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
