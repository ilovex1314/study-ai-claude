import { NavLink } from "react-router-dom";
import { curriculum } from "../curriculum/curriculum";

export function CurriculumNav({ onPick }: { onPick?: () => void }) {
  return (
    <nav className="curriculum-nav" aria-label="课程目录">
      <ol>
        {curriculum.map((day, i) => (
          <li key={day.id}>
            <NavLink to={day.path} onClick={onPick} className={({ isActive }) => (isActive ? "active" : undefined)}>
              <span className="nav-index">{String(i + 1).padStart(2, "0")}</span>
              <span className="nav-text">
                <span className="nav-phase">{day.phase}</span>
                <span className="nav-capability">{day.capability}</span>
              </span>
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
