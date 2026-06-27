# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循语义化版本。

## [Unreleased]

## [0.1.0] — 2026-06-27

首个迭代：P0.5（可验证产出闭环）+ F5（深内容/图引擎/展示层）合并交付。

### Added

- **内容管道**：`content/dayXX.md` frontmatter 单一事实源 → `scripts/generate-content.mjs` 生成类型化 `lessons.generated.ts`（gitignore，prebuild/CI 生成）。
- **内容 schema（zod）**：强制深度契约——每天 ≥3 概念模块、正反例成对、误区含症状/修复、心智模型、走查场景、≥2 带注解参考资料；节点标签禁止箭头字符。
- **内容校验器（CI 门禁）**：题目权重和必须为 100；每条参考资料须有注解；架构图关系须与类型匹配（feedback/flywheel 须有 feedback 边，gate/state 须有 branch/guard 边，layered 须有 layer/lane 分组）；恰好 20 天。
- **curriculum 域**：从 lessons 派生有序路由元数据，无 day01 硬编码。
- **assessment**：可扩展评分器注册表 + `single` 评分器；加权评分 `scoreAttempt` 与复盘派生 `buildReview`（薄弱概念 + 建议）。
- **learner-state 适配器**：本地优先，统一 key `study-ai-claude.{lessonId}.{kind}`；当前尝试、历史、练习证据持久化；能力档案导出。
- **practice**：Rubric 完成度评分；能力档案聚合（测验 + 证据 + Rubric → 状态：未开始/理解/练习/可独立交付）。
- **图引擎（F5-2）**：关系正确的架构图，按类型分版式（grouped/loop），箭头为 SVG 连线不进节点文字，`data-node-id` + ResizeObserver 测量；章节图与概念小图共用。
- **题型渲染注册表**：`QuestionView` 按类型派发，`single` 渲染器；与评分器注册表共同构成新增题型的接缝。
- **课程页 UI（F5-3）**：Hero、课程导航、章节导航、概念卡（渐进式信息层级 + 案例/反例并排对比）、决策分层、加权测验、复盘。
- **可验证产出 UI（P0.5）**：练习证据文本框（落盘到适配器）、自评 Rubric 清单、能力档案表 + JSON 导出。
- **20 天课程内容**：Day01 模型边界 … Day20 产品飞轮，按深契约重写，含真实生产案例/反例与官方参考资料。
- **质量门禁**：CI（`pnpm validate:content && pnpm test && pnpm build`）；27 个测试。
- **文档**：PRD、需求索引、F1–F4 特性主题、迭代工作流、本 CHANGELOG、README、迭代文档。

### Notes

- 仅实现 `single` 题型；`multi`/`fill-blank`/`short-answer`/灵活权重为后续 F1–F4。
- Node 22 原生剥离 TS 类型，`.mjs` 脚本可直接 import `schema.ts`，未使用计划预案中的 `vite-node` 回退。
