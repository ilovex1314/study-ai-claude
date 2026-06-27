import { useState } from "react";
import { NavLink } from "react-router-dom";
import { curriculum } from "../curriculum/curriculum";

/** Mobile-only floating day carousel at the bottom of the viewport, with a
 *  collapse chevron. Hidden on desktop (the left sidebar takes over there). */
export function MobileDayNav() {
  const [open, setOpen] = useState(true);
  return (
    <nav className={`mobile-day-nav${open ? " open" : ""}`} aria-label="课程目录">
      <button
        type="button"
        className="mday-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "收起课程目录" : "展开课程目录"}
      >
        <span aria-hidden="true">{open ? "‹" : "›"}</span>
      </button>
      <div className="mday-track">
        {curriculum.map((day) => (
          <NavLink key={day.id} to={day.path} className={({ isActive }) => (isActive ? "mday-chip active" : "mday-chip")}>
            <span className="mday-phase">{day.phase}</span>
            <span className="mday-title">{day.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
