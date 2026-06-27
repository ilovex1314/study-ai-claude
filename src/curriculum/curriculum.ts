import { lessons } from "../content/lessons";
export type CurriculumDay = { id: string; path: string; phase: string; stage: string; capability: string; title: string };
export const curriculum: CurriculumDay[] = [...lessons]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((l) => ({ id: l.id, path: `/${l.id}`, phase: l.phase, stage: l.stage, capability: l.capability, title: l.title }));
