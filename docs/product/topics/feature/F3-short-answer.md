# F3 — 问答题（short-answer，自评）

**问题**：最高阶能力（设计取舍、边界说明）只能用开放问答考察，但本项目无后端、不做 AI 自动评分。

**范围**：新增 `short-answer` 题型，设计为**自评题**——用户写答案，对照参考答案与一组 rubric 检查点逐条自评，得分由自评勾选数 × 权重折算。复用练习 Rubric 的同一机制。

**实现（注册表叠加，不动核心）**：
1. `questionSchema` 判别联合加 `shortAnswerQuestion`（`type: "short-answer"`，`referenceAnswer`、`rubricChecks: { id, criterion }[]`）。
2. `graders.ts` 加 `short-answer` grader：答案为 `{ text, rubricChecks: string[] }`，得分 = 勾选比例 × 权重，`selfGraded: true`（计入 `selfScore`）。
3. `registry.tsx` 加 `ShortAnswerQuestion` 渲染器（文本框 + 参考答案折叠 + rubric 勾选）。
4. 在内容里出题。

**验收**：自评得分进入 `selfScore` 而非 `autoScore`；`scoreAttempt` 的 `selfScore`/`autoScore` 拆分已就位（无需改核心）；权重计入每天总和 100。
