import type { AnswerValue } from "../assessment/types";
export type CurrentAttempt = { id: string; startedAt: string; answers: Record<string, AnswerValue> };
export type Attempt = CurrentAttempt & { completedAt: string; score: number; total: number; weakConcepts: string[]; recommendations: string[] };
export type PracticeEvidence = { text: string; rubricChecks: string[]; updatedAt: string };
export interface LearnerStateAdapter {
  loadCurrentAttempt(lessonId: string): CurrentAttempt | null;
  saveCurrentAttempt(lessonId: string, attempt: CurrentAttempt): void;
  resetCurrentAttempt(lessonId: string): void;
  loadHistory(lessonId: string): Attempt[];
  appendHistory(lessonId: string, attempt: Attempt): void;
  clearHistory(lessonId: string): void;
  loadPracticeEvidence(lessonId: string): PracticeEvidence | null;
  savePracticeEvidence(lessonId: string, evidence: PracticeEvidence): void;
  exportArchive(lessonIds: string[]): string;
}
