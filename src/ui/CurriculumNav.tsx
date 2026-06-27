import { NavLink } from "react-router-dom";
import { curriculum } from "../curriculum/curriculum";

export function CurriculumNav() {
  return (
    <nav className="curriculum-nav" aria-label="课程目录">
      <ol>
        {curriculum.map((day) => (
          <li key={day.id}>
            <NavLink to={day.path} className={({ isActive }) => (isActive ? "active" : undefined)}>
              <span className="nav-phase">{day.phase}</span>
              <span className="nav-capability">{day.capability}</span>
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
