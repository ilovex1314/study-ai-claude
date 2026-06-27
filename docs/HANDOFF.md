# study-ai-claude — 上下文交接（2026-06-27）

新会话从这里接手。**在 `/Volumes/2TB-NVMe/work/study-ai-claude` 目录打开会话**，读完本文件即可继续。

## 这是什么

一次对 `../study-ai`（同级目录的参考实现）的**干净重做**：本地优先的 AI 工程学习工作台。study-ai 从 13 天迭代到 20 天，积累了死代码、多事实源漂移、固定 4 道单选题、内容偏浅、架构图脆弱、以及「可验证产出」从未落地等问题。本项目从第一天就避开这些。

## 目标范围（已与用户确认）

**本次交付 = P0.5 + F5 合并**：

- 干净 20 天课程引擎：**Markdown 单一事实源**（`content/dayXX.md` 的 YAML frontmatter）→ 生成器 → 类型化数据 → 应用；校验器做 CI 门禁。
- **F5-1 深内容契约**：正反例成对、误区含「检测/修复」、心智模型、走查场景、带注解参考资料；校验器强制最小深度（浅内容构建失败）。
- **F5-2 关系正确且可测的图引擎**：8+ 种关系类型各有专用版式，箭头是 SVG 连线不进节点文字；自动化测试。章节图与概念小图共用。
- **F5-3 直观展示层**：渐进式信息层级、案例/反例并排对比。
- **加权测验（满分 100）**，先只实现 `single` 题型，但建好「评分器/渲染器注册表」接缝。
- **P0.5 可验证产出闭环**：练习证据捕获 + 自评 Rubric + 能力档案导出。
- **learner-state 适配器**（本地优先，统一 key，无 day01 硬编码）。
- CI 质量门禁；工作流沉淀（CHANGELOG + 迭代文档 + 流程说明）。
- 20 天内容按更深契约**重写**（不是照搬 study-ai）。

**范围外**：登录、云同步、后端、AI 教练、AI 自动评分、团队视图；以及 `single` 以外的题型内容（multi/fill-blank/short-answer 是后续 F1–F3）。

## 技术栈

React 19 + TypeScript + Vite 7 + react-router-dom 7 + Vitest 4 + Testing Library + jsdom + gray-matter + zod。pnpm，Node 22。

## 当前仓库状态

- 分支 `main`，remote `git@github.com:ilovex1314/study-ai-claude.git`（**尚未 push**）。
- 已提交 2 个 commit：
  - 设计规格：`docs/superpowers/specs/2026-06-27-study-ai-claude-design.md`
  - 实施计划：`docs/superpowers/plans/2026-06-27-study-ai-claude-p0.5-f5.md`
- `.gitignore` 已就位（忽略 node_modules、dist、`**/lessons.generated.ts`、`.superpowers/`）。
- **代码尚未开始**（脚手架都还没建）。

## 下一步：执行计划

执行方式已选 **superpowers:subagent-driven-development**（subagent 驱动：每任务派新 subagent → 任务级审查 → 全分支终审）。在新会话里：

1. 加载 `superpowers:subagent-driven-development` skill。
2. 读 `docs/superpowers/plans/2026-06-27-study-ai-claude-p0.5-f5.md`，为 16 个任务建 todo + 进度 ledger。
3. 从 **Task 1（脚手架 + CI）** 开始按 TDD 逐任务推进，全部完成后跑终审，再 `git push -u origin main`。

> 计划已自检过（规格覆盖、占位符、类型一致）。计划里已知风险：从 `.mjs` 脚本 import TS 的 `schema.ts`——若 `node` 不能直接 import TS，把 `generate:content`/`prebuild`/`pretest` 的 runner 换成 `vite-node`，并记进迭代文档（见 Task 3 备注）。

## 关键决策（避免重复讨论）

- 内容用 **frontmatter 装结构化数据**（非解析正文）：题目/权重/边必须无歧义可测。
- 题型用**判别联合 + 注册表**：加题型 = 加 grader + renderer + 内容，不动核心评分。
- 问答题（F3）无后端 → 设计为**自评题**（对照参考答案 + rubric 自评），与练习 rubric 复用同一机制。
- 生成物 `lessons.generated.ts` **不入库**，prebuild/CI 生成。
- 缺参考资料/权重不兜底，**报错**让校验暴露。

## 工作流沉淀（每次迭代都要做）

`需求落 topic → 规格 → 计划 → TDD 实现 → 更新 CHANGELOG + 写 docs/iterations/YYYY-MM-DD-<topic>.md → 提交/推送`。本次的迭代文档与 CHANGELOG 在计划的 Task 15 产出。

## 参考

- 参考实现：`../study-ai`（尤其 `apps/interactive-lessons/src/components/ArchitectureDiagram.tsx`、`docs/interactive-learning/dayXX.md`、`src/data/dayXX.ts`）。
- 对 study-ai 的深度审查纪要（飞书）记录了问题与优化方向，可作背景。
