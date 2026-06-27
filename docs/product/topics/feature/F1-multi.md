# F1 — 多选题（multi）

**问题**：单选无法考察"同时满足多个条件"或"识别多个正确做法"的能力，部分概念（如发布门禁的多维阈值）天然是多选。

**范围**：新增 `multi` 题型——一题多个正确选项，支持全对计满分或按比例计分（默认全对才得分，避免蒙混）。

**实现（注册表叠加，不动核心）**：
1. `questionSchema` 判别联合加 `multiQuestion`（`type: "multi"`，`options` 带多个 `correct: true`，可选 `partialCredit`）。
2. `graders.ts` 加 `multi` grader：答案为 `string[]`，比较选中集合与正确集合。
3. `registry.tsx` 加 `MultiQuestion` 渲染器（复选交互）。
4. 在内容里出题。

**验收**：`gradeQuestion` 对全对/部分/全错的多选返回正确得分；权重仍计入每天总和 100；现有 `single` 行为不变。
