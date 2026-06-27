# study-ai-claude

本地优先的 AI 工程学习工作台：一套 20 天、以 Markdown 为单一事实源的课程引擎，带深内容契约、关系正确的架构图、可扩展的题型引擎，以及"可验证产出"闭环（练习证据 + 自评 Rubric + 能力档案）。

这是对 `../study-ai` 的一次干净重做——避开其死代码、多事实源漂移、固定题量、内容偏浅与脆弱架构图等问题。

## 是什么

- **20 天能力路线**：Day01 模型边界 → Day20 产品飞轮，每天一个能力目标与一个可验证产出。
- **单一事实源**：`content/dayXX.md` 的 YAML frontmatter 承载全部结构化数据 → 生成器产出类型化 `src/content/lessons.generated.ts` → 应用只消费生成物。
- **质量门禁**：zod schema 强制深度（每天 ≥3 概念模块、正反例成对、误区含修复、≥2 带注解参考资料）；语义校验器强制题目权重和为 100、架构图关系与类型匹配、恰好 20 天。
- **可扩展题型**：当前实现 `single`（单选）；评分器/渲染器注册表让 `multi`/`fill-blank`/`short-answer`（F1–F3）只需加 grader + renderer + 内容，不动核心。
- **可验证产出闭环**：测验加权评分（满分 100）→ 练习证据捕获 → 自评 Rubric → 能力档案聚合与 JSON 导出。
- **learner-state 适配器**：本地优先，统一 key（`study-ai-claude.{lessonId}.{kind}`），无 per-day 硬编码。

范围外：登录、云同步、后端、AI 教练、AI 自动评分、团队视图。

## 技术栈

React 19 · TypeScript · Vite 7 · react-router-dom 7 · Vitest 4 · Testing Library · jsdom · gray-matter · zod。pnpm，Node 22。

## 命令

```bash
pnpm install            # 安装依赖
pnpm dev                # 本地开发（生成内容 + Vite dev server）
pnpm generate:content   # 从 content/*.md 生成 lessons.generated.ts
pnpm validate:content   # 内容门禁：权重/参考/图语义/20 天数量
pnpm test               # Vitest（pretest 会先生成内容）
pnpm build              # 生成 + tsc 类型检查 + Vite 生产构建
```

## 事实源管道

```
content/dayXX.md (frontmatter)
        │  gray-matter 解析
        ▼
scripts/generate-content.mjs  ──zod 校验──▶  src/content/lessons.generated.ts（生成物，不入库）
        │
        ▼
src/content/lessons.ts（再导出 + 类型）──▶  curriculum / assessment / practice / ui
```

`lessons.generated.ts` 由 prebuild/pretest/CI 生成，已 gitignore，从不手改。

## 文档

- 产品需求：[docs/product/prd.md](docs/product/prd.md)
- 需求索引与后续特性（F1–F4）：[docs/product/requirements-index.md](docs/product/requirements-index.md)
- 迭代工作流：[docs/process/iteration-workflow.md](docs/process/iteration-workflow.md)
- 设计规格：[docs/superpowers/specs/2026-06-27-study-ai-claude-design.md](docs/superpowers/specs/2026-06-27-study-ai-claude-design.md)
- 实施计划：[docs/superpowers/plans/2026-06-27-study-ai-claude-p0.5-f5.md](docs/superpowers/plans/2026-06-27-study-ai-claude-p0.5-f5.md)
- 变更记录：[CHANGELOG.md](CHANGELOG.md)
