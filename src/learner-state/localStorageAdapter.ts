import type { Attempt, CurrentAttempt, LearnerStateAdapter, PracticeEvidence } from "./adapter";

const key = (lessonId: string, kind: string) => `study-ai-claude.${lessonId}.${kind}`;
function read<T>(k: string, fallback: T): T { const raw = localStorage.getItem(k); if (!raw) return fallback; try { return JSON.parse(raw) as T; } catch { return fallback; } }
function write<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); }

export function createCurrentAttempt(now = new Date().toISOString()): CurrentAttempt {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `attempt-${now}`;
  return { id, startedAt: now, answers: {} };
}

export class LocalStorageAdapter implements LearnerStateAdapter {
  loadCurrentAttempt(lessonId: string) { return read<CurrentAttempt | null>(key(lessonId, "currentAttempt"), null); }
  saveCurrentAttempt(lessonId: string, attempt: CurrentAttempt) { write(key(lessonId, "currentAttempt"), attempt); }
  resetCurrentAttempt(lessonId: string) { localStorage.removeItem(key(lessonId, "currentAttempt")); }
  loadHistory(lessonId: string) { return read<Attempt[]>(key(lessonId, "attemptHistory"), []); }
  appendHistory(lessonId: string, attempt: Attempt) { write(key(lessonId, "attemptHistory"), [attempt, ...this.loadHistory(lessonId)]); this.resetCurrentAttempt(lessonId); }
  clearHistory(lessonId: string) { localStorage.removeItem(key(lessonId, "attemptHistory")); }
  loadPracticeEvidence(lessonId: string) { return read<PracticeEvidence | null>(key(lessonId, "practiceEvidence"), null); }
  savePracticeEvidence(lessonId: string, evidence: PracticeEvidence) { write(key(lessonId, "practiceEvidence"), evidence); }
  exportArchive(lessonIds: string[]) {
    const archive = lessonIds.map((id) => ({ id, history: this.loadHistory(id), practiceEvidence: this.loadPracticeEvidence(id) }));
    return JSON.stringify({ exportedAt: new Date().toISOString(), archive }, null, 2);
  }
}
