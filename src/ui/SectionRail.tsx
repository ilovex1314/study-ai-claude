import { NavLink } from "react-router-dom";

const SECTIONS: { key: string; label: string }[] = [
  { key: "series", label: "概览" },
  { key: "concepts", label: "概念" },
  { key: "decision", label: "决策" },
  { key: "practice", label: "测验" },
  { key: "review", label: "复盘" }
];

export function SectionRail({ dayId, active }: { dayId: string; active: string }) {
  return (
    <nav className="section-rail" aria-label="章节导航">
      {SECTIONS.map((s) => (
        <NavLink key={s.key} to={`/${dayId}/${s.key}`} className={s.key === active ? "active" : undefined}>
          {s.label}
        </NavLink>
      ))}
    </nav>
  );
}
