# F2 — 填空题（fill-blank）

**问题**：单选给了选项就给了提示，无法考察"无提示回忆"关键术语、参数名或步骤顺序的能力。

**范围**：新增 `fill-blank` 题型——题干含一个或多个空，每空有可接受答案集合（大小写/同义词归一化），按空计分。

**实现（注册表叠加，不动核心）**：
1. `questionSchema` 判别联合加 `fillBlankQuestion`（`type: "fill-blank"`，`blanks: { id, accept: string[], normalize? }[]`）。
2. `graders.ts` 加 `fill-blank` grader：答案为 `Record<blankId, string>`，逐空归一化后匹配 `accept`。
3. `registry.tsx` 加 `FillBlankQuestion` 渲染器（内联输入框）。
4. 在内容里出题。

**验收**：归一化后匹配正确判对；多空按比例或全对计分；权重计入每天总和 100；现有题型不受影响。
