import type { Lesson } from "../content/schema";
import type { LearnerStateAdapter } from "../learner-state/adapter";
import { scoreRubric } from "./rubric";

export type CapabilityRow = { lessonId: string; capability: string; quizBest: number; hasEvidence: boolean; rubricRatio: number; status: "未开始" | "理解" | "练习" | "可独立交付" };

export function buildCapabilityArchive(lessons: Lesson[], adapter: Pick<LearnerStateAdapter, "loadHistory" | "loadPracticeEvidence">): CapabilityRow[] {
  return lessons.map((l) => {
    const history = adapter.loadHistory(l.id);
    const quizBest = history.reduce((m, a) => Math.max(m, a.total ? Math.round((a.score / a.total) * 100) : 0), 0);
    const evidence = adapter.loadPracticeEvidence(l.id);
    const rubricRatio = evidence ? scoreRubric(l.rubric, evidence.rubricChecks).ratio : 0;
    const hasEvidence = Boolean(evidence && evidence.text.trim());
    let status: CapabilityRow["status"] = "未开始";
    if (quizBest >= 60) status = "理解";
    if (status === "理解" && hasEvidence) status = "练习";
    if (status === "练习" && rubricRatio >= 0.8) status = "可独立交付";
    return { lessonId: l.id, capability: l.capability, quizBest, hasEvidence, rubricRatio, status };
  });
}
