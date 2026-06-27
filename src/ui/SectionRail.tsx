export type SectionKey = "series" | "concepts" | "decision" | "practice" | "review";

export const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "series", label: "概览" },
  { key: "concepts", label: "概念" },
  { key: "decision", label: "决策" },
  { key: "practice", label: "测验" },
  { key: "review", label: "复盘" }
];

export function SectionRail({ active, onNavigate }: { active: string; onNavigate: (key: SectionKey) => void }) {
  return (
    <nav className="section-rail" aria-label="章节导航">
      {SECTIONS.map((s) => (
        <button
          key={s.key}
          type="button"
          className={s.key === active ? "active" : undefined}
          aria-current={s.key === active ? "true" : undefined}
          onClick={() => onNavigate(s.key)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
