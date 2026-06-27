import { lessons } from "../content/lessons";
import type { LearnerStateAdapter } from "../learner-state/adapter";
import { buildCapabilityArchive } from "../practice/archive";

export function CapabilityArchive({ adapter }: { adapter: LearnerStateAdapter }) {
  const rows = buildCapabilityArchive([...lessons], adapter);

  const exportArchive = () => {
    const json = adapter.exportArchive(lessons.map((l) => l.id));
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-ai-claude-archive-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="capability-archive" aria-label="能力档案">
      <div className="archive-head">
        <h2>能力档案</h2>
        <button type="button" className="export-archive" onClick={exportArchive}>导出能力档案</button>
      </div>
      <table>
        <thead>
          <tr><th>能力</th><th>测验最佳</th><th>有产出</th><th>Rubric</th><th>状态</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lessonId}>
              <td>{r.capability}</td>
              <td>{r.quizBest}</td>
              <td>{r.hasEvidence ? "✓" : "—"}</td>
              <td>{Math.round(r.rubricRatio * 100)}%</td>
              <td><span className="archive-status" data-status={r.status}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
