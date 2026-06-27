# 需求索引

| ID | 名称 | 状态 | 说明 |
| --- | --- | --- | --- |
| P0.5 | 可验证产出闭环 | ✅ 已交付 | 练习证据 + 自评 Rubric + 能力档案导出 |
| F5-1 | 深内容契约 | ✅ 已交付 | 正反例成对、误区含修复、心智模型、走查、带注解参考；校验器强制最小深度 |
| F5-2 | 关系正确可测的图引擎 | ✅ 已交付 | 8+ 关系类型专用版式，SVG 连线，自动化测试 |
| F5-3 | 直观展示层 | ✅ 已交付 | 渐进式信息层级、案例/反例并排 |
| 加权测验 | single 题型 + 注册表 | ✅ 已交付 | 满分 100；评分器/渲染器注册表接缝 |
| F1 | 多选题（multi） | 🔜 未实现 | [topics/feature/F1-multi.md](topics/feature/F1-multi.md) |
| F2 | 填空题（fill-blank） | 🔜 未实现 | [topics/feature/F2-fill-blank.md](topics/feature/F2-fill-blank.md) |
| F3 | 问答题（short-answer，自评） | 🔜 未实现 | [topics/feature/F3-short-answer.md](topics/feature/F3-short-answer.md) |
| F4 | 灵活权重 | 🔜 未实现 | [topics/feature/F4-flexible-weights.md](topics/feature/F4-flexible-weights.md) |

## 注册表接缝（F1–F3 如何加）

题型用判别联合 + 双注册表（评分器 `src/assessment/graders.ts`、渲染器 `src/ui/questions/registry.tsx`）。新增一个题型 = 三步**叠加**，不改核心：

1. 在 `src/content/schema.ts` 的 `questionSchema` 判别联合里加一个成员。
2. 在评分器注册表里加一个 grader，在渲染器注册表里加一个 renderer。
3. 在 `content/dayXX.md` 里写该题型的题目。

`scoreAttempt` / `buildReview` / `gradeQuestion` 无需改动。
