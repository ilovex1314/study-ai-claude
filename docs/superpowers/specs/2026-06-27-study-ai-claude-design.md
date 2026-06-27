# study-ai-claude 设计规格（P0.5 + F5 合并）

- 状态：已确认
- 日期：2026-06-27
- 参考实现：`../study-ai`（同级目录）
- 范围：P0.5（干净 20 天引擎 + 可验证产出闭环）合并 F5（内容深度与可视化）

## 1. 背景与目标

study-ai 是一个从 13 天迭代扩展到 20 天的 AI 工程学习工作台。迭代过程中积累了结构债：死代码（孤儿 `supplemental.ts`）、多事实源漂移、评估只有固定 4 道单选题、内容偏浅、架构图运行时脆弱且缺自动化验收，并且产品反复承诺的「可验证产出 / 实践证据」从未在代码中兑现。

study-ai-claude 是一次**干净重做**：从第一天就建立单一事实源、清晰领域边界、可扩展题型接缝、深内容契约与正确可测的图引擎，并落地 P0.5 的「可验证产出」闭环。

**核心目标**：让有前后端经验的工程师，从「认识模型术语」走到「能定义、构建、评估、运营并迭代一个面向生产的 AI 产品」，并把过程沉淀为可复核的能力证据。

## 2. 范围

### In Scope（P0.5 + F5）

- 干净的 Day01–Day20 课程引擎：Markdown 单一事实源 → 生成 → 校验。
- 深内容契约（F5-1）+ 校验门禁：浅内容直接构建失败。
- 关系正确、好看、可测的图引擎（F5-2）：章节架构图 + 概念小图共用。
- 直观展示层（F5-3）：渐进式信息层级、案例/反例并排对比。
- 加权测验（满分 100），先实现 `single` 题型，但题型接缝（判别联合 + 评分器/渲染器注册表）就位。
- 可验证产出闭环：练习证据捕获 + 自评 Rubric + 能力档案导出。
- learner-state 适配器（本地优先，无 day01 硬编码）。
- CI 质量门禁（校验内容 + 测试 + 构建）。
- 工作流沉淀：CHANGELOG + 迭代文档 + 流程说明。
- 20 天内容按更深契约重写（不是照搬 study-ai）。

### Out of Scope

- 登录、云同步、后端、AI 教练、AI 自动评分、团队视图。
- 新增 `single` 以外的题型内容（multi/fill-blank/short-answer 留给 F1–F3）。
- 引入外部图形库（自建 SVG+CSS 引擎）。

## 3. 技术栈

React 19 + TypeScript + Vite 7 + react-router-dom 7 + Vitest 4 + Testing Library + jsdom。纯前端、本地优先、可静态部署。

## 4. 架构总览

### 4.1 内容产线（单一事实源）

每天一个文件 `content/dayXX.md`：YAML frontmatter 承载机器可读的课程数据（结构化字段），Markdown 正文承载可选长文笔记。

```
content/dayXX.md ──parse──▶ generator ──▶ src/content/lessons.generated.ts ──▶ app
        │                       │
        └── validator (CI 门禁)：20 天 · 顺序 · 权重和=100 · 概念覆盖 ·
            架构语义 · 参考资料带注解 · 深度契约 · rubric 齐全
```

- 生成物 `lessons.generated.ts` **入 .gitignore**，在 `prebuild`/`pretest`/CI 生成。
- 应用**只**消费生成的类型化数据，绝不直接读 Markdown。
- 选择 frontmatter 装结构化数据而非解析正文：题目选项、正确标记、权重、边必须无歧义且可测试。

### 4.2 领域边界

| 领域 | 职责 | 关键约束 |
| --- | --- | --- |
| `content` | Markdown 源 + 生成的类型化课程（只读数据） | 不持有 React 状态 |
| `curriculum` | 有序 20 天路线元数据（id/stage/capability/title/path） | 路由/导航唯一事实源 |
| `assessment` | 题型判别联合 + 评分器/渲染器注册表 + 加权评分 + 复盘推导 | 纯逻辑，按 type 分发 |
| `practice` | 练习证据模型 + 自评 Rubric 评估 | 纯逻辑 |
| `learner-state` | 适配器接口持久化答题/历史/练习证据/rubric/导出 | 无 day01 硬编码，可替换 |
| `ui` | React 组件 | 渲染器按 type 注册 |

## 5. 深内容契约（F5-1）

### 5.1 Day 级字段（frontmatter）

```
id, phase, stage, capability, title, summary
capabilityGoal            # 可验证的能力目标
verifiableOutput          # 本日应产出的可验证产物
mentalModel               # 一句话核心洞察
walkthrough               # 一个走查场景：带具体取舍的真实决策推演
modules: ConceptModule[]  # 概念模块（见 5.2）
decisionLayers: DecisionLayer[]
architecture: Architecture  # 章节关系图（见 6）
questions: Question[]       # 任意题数，权重和=100
rubric: RubricCriterion[]   # 自评清单
references: AnnotatedReference[]  # 每条带「为什么读它」
```

### 5.2 概念模块字段

```
ConceptModule:
  id, title, concept(ConceptId), idea, whyItMatters, engineerLens
  productionExample: { context, whatTheyDid, outcome }
  counterExample:    { context, antiPattern, consequence }
  pitfalls: [{ symptom, fix }]
  diagram?: ConceptDiagram   # 关系型小图，可声明省略
  links?: ConceptId[]        # 相邻能力依赖
```

### 5.3 深度校验规则（CI 门禁）

- 正例与反例必须成对出现且各字段非空。
- 每个 pitfall 必须含 `symptom` 与 `fix`。
- 关键文本字段（idea/whyItMatters/walkthrough/mentalModel）满足最小长度。
- 每条参考资料必须有 `note` 注解。
- 每天至少 3 个概念模块（建议 4–6，按内容深度灵活）、至少 1 道题，题目权重和=100。
- 任一天不达标 → 校验失败 → CI 失败。

## 6. 图引擎（F5-2）

### 6.1 数据模型

```
Architecture / ConceptDiagram:
  type: boundary | lifecycle | layered | state | feedback | gate | flywheel | pipeline | tree
  conclusion / summary
  nodes: [{ id, label, tone?, group? }]   # label 禁止含箭头字符
  edges: [{ from, to, label?, relation? }] # relation: primary|feedback|branch|guard|dependency
  groups?: [{ id, label, kind? }]          # kind: boundary|layer|lane
  renderMode?: diagram | structured-list | none
```

### 6.2 渲染

- 每种 `type` 一套专用、易读版式；箭头是 SVG 连线/marker，绝不进节点文字。
- 同一引擎同时渲染章节架构图与概念小图。
- 章节图独占整行；窄屏缩小元素转紧凑布局，不重叠、不溢出。

### 6.3 图校验与测试

- 节点 label 不含 `→ ← ↔ -> <-` 等箭头字符（数据校验 + DOM 断言）。
- `feedback`/`flywheel` 必有 feedback 边；`gate`/`state` 必有 branch/guard 边；`layered` 必有 layer/lane group；`boundary` 必有 boundary group 或 guard/dependency 边。
- 每种 type 渲染结构快照 / 行为测试。
- 375/768/1024/1440 响应式结构冒烟测试。

## 7. 评估域（题型可扩展接缝）

### 7.1 题型与数据模型（判别联合）

```
QuestionType = single | multi | fill-blank | short-answer   # 后续可加

Question 公共: { id, concept, prompt, scenario?, weight, explanation }
  single      : options[{id,label,correct}]    # 恰好一个 correct
  multi       : options[{id,label,correct}]    # ≥1 correct，集合匹配
  fill-blank  : blanks[{id, accepted[], normalize?}]
  short-answer: { sampleAnswer, rubric[{id,criterion}] }   # 自评判分
```

### 7.2 评分器注册表

```
interface Grader<Q, A> {
  type: QuestionType
  isComplete(q, answer): boolean
  grade(q, answer): { earned, max, correct, selfGraded? }
}
const graders: Record<QuestionType, Grader>
```

- 评分遍历题目，按 `type` 分发到对应 grader，累加 `earned`，`total = Σ weight`。
- 无后端/无 AI → `short-answer` 为**自评题**：给参考答案 + rubric，学习者对照自评，按自评 rubric 完成比例折算 weight；`selfGraded=true`。
- 复盘区分开展示**自动判分**与**自评分**，再合成能力证据。
- **P0.5 只实现 `single` grader 与 renderer**；接缝就位，F1–F3 加 grader+renderer+内容即可。

### 7.3 答案存储模型

`answers: Record<questionId, AnswerValue>`，AnswerValue 按题型：
- single: `optionId: string`
- multi: `optionIds: string[]`
- fill-blank: `Record<blankId, string>`
- short-answer: `{ text: string, rubricChecks: string[] }`

### 7.4 渲染器注册表

`QuestionRenderer` 按 `type` 注册，QuizPanel 按 type 分发，与 grader 一一对应。

## 8. P0.5 可验证产出闭环

学习闭环：`能力路线 → 概念 → 架构判断 → 开放练习(可填写并保存) → 加权测验 → 自评 Rubric → 能力档案(导出)`

1. **练习证据**：每天的 `verifiableOutput` 渲染为可填写产出（文本/结构化字段），按天保存到 learner-state。
2. **自评 Rubric**：每天一份清单（如「写清了边界/失败处理/验收方法吗」），学习者自我勾选。
3. **能力档案**：按能力维度聚合「测验得分 + 是否有练习证据 + rubric 自评分」→ 能力状态；可导出为一份 JSON 证据档案。
4. **复用**：short-answer 自评与练习 rubric 共用同一套自评机制。

## 9. learner-state 适配器

```
interface LearnerStateAdapter {
  loadCurrentAttempt(lessonId): CurrentAttempt | null
  saveCurrentAttempt(lessonId, attempt): void
  loadHistory(lessonId): Attempt[]
  appendHistory(lessonId, attempt): void
  loadPracticeEvidence(lessonId): PracticeEvidence | null
  savePracticeEvidence(lessonId, evidence): void
  exportArchive(): string
  ...delete/clear
}
class LocalStorageAdapter implements LearnerStateAdapter
```

- 统一 key 方案 `study-ai-claude.{lessonId}.{kind}`，**无 day01 特例**。
- Attempt 增加 `practiceEvidence` 与 rubric 自评字段；旧数据缺字段按空值兼容。
- 适配器是 P1 云同步的唯一替换点。

## 10. 质量门禁（实践它所教的）

CI 顺序：`validate:content → vitest → build`。测试覆盖：

- curriculum 契约（20 天、顺序、路由对齐）。
- 深内容契约（正反例成对、pitfalls 检测/修复、最小长度、参考注解）。
- 加权评分（权重和=100、按 type 分发、自评折算）。
- practice / rubric 逻辑、learner-state 适配器读写与迁移。
- 图引擎（各 type 结构、DOM 无箭头字符、必备关系、响应式冒烟）。
- 参考资料齐全：缺失即**报错**，不静默兜底。

`.gitignore` 不提交生成物、dist、node_modules、运行期产物。

## 11. 工作流沉淀

固化可复用迭代环，后续（人或 agent）照此推进：

`需求落 topic → 规格(spec) → 计划(plan) → TDD 实现 → 更新 CHANGELOG + 写迭代文档 → 提交/推送`

每次迭代必留：

- `CHANGELOG.md`（Keep a Changelog 格式）。
- `docs/iterations/YYYY-MM-DD-<topic>.md`（做了什么、为什么、验证结果、遗留项）。
- 需求够大时补该 feature 的 spec / 设计 md。

流程说明落 `docs/process/iteration-workflow.md`。

## 12. 仓库结构

```
study-ai-claude/
  README.md
  CHANGELOG.md
  .gitignore
  .github/workflows/ci.yml
  content/dayXX.md                       # 课程单一事实源
  docs/
    product/{prd.md, requirements-index.md, topics/feature/...}
    process/iteration-workflow.md
    superpowers/{specs,plans}/...
    iterations/YYYY-MM-DD-*.md
  app/ (或根)                             # Vite 应用
    scripts/{generate-content.mjs, validate-content.mjs}
    src/
      content/lessons.generated.ts        # 生成物(.gitignore)
      curriculum/ assessment/ practice/ learner-state/ ui/
```

## 13. 后续 feature 迭代（F1–F4，本次不做）

落 `docs/product/topics/feature/`：

- F1 多选题（multi grader + renderer + 内容）
- F2 填空题（fill-blank grader + renderer）
- F3 问答题（short-answer 自评 grader + renderer）
- F4 灵活题量落地（按教学内容差异化各天题量/权重）

均依赖第 7 节的题型接缝，加 grader+renderer+内容即可，不动核心评分。

## 14. 验收标准

- `pnpm validate:content` 通过：20 天、顺序、权重和=100、深度契约、图语义、参考注解。
- `pnpm test` 全绿：评估、practice/rubric、适配器、图引擎、curriculum 契约。
- `pnpm build` 成功，生成物不入库。
- 应用可跑通：路由 20 天、做题加权计分、填写并保存练习证据、自评 rubric、导出能力档案 JSON。
- 架构图与概念图按关系类型正确渲染，箭头不在节点文字内，响应式不重叠。
- CHANGELOG、迭代文档、流程说明、产品文档齐备。
- 代码推送到 `git@github.com:ilovex1314/study-ai-claude.git`。
