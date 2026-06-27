---
id: day04
phase: Day04
stage: AI 产品基础
capability: 把 demo 变成可观测/可评估/可部署的产品
title: AI 产品交付与运营
summary: 建立 AI 产品交付闭环：模型网关、流式 UX、eval、可观测、成本控制和部署策略，把 demo 变成真实用户可用的产品。
capabilityGoal: 能为一个 AI 功能设计完整的交付 checklist，包含前端 UX 状态、模型网关配置、日志字段规范、eval 样本策略、部署门禁和回滚方案。
verifiableOutput: 一份发布 checklist，涵盖 UX 状态机、模型网关、run log 字段、离线 eval 方案、灰度策略和回滚触发条件。
mentalModel: 用户感受到的是延迟、失败、引用和控制权，不是模型参数；上线后的质量依赖日志、trace、eval 和反馈，不是演示效果。
walkthrough: 某需求评审助手从 demo 阶段走向生产：先在 UX 层设计状态机（idle、streaming、tool-call、needs-confirmation、done、failed），让用户能看到工具调用过程和引用，能取消和重试；后端接入模型网关统一处理 provider 差异、超时、重试和 fallback；每次 AI run 生成 runId 并记录 prompt_version、model、input_tokens、output_tokens、latency_ms、tool_events 和 score；上线前跑 golden dataset 回归确认质量不退步；灰度 10% 用户后监控错误率和延迟 p95，超阈值自动回滚；用户采纳或修改输出的行为回流 eval dataset 驱动下次迭代。
modules:
  - id: d04-m1
    title: AI 产品是交付闭环，不是模型调用
    concept: gateway
    idea: 真实 AI 产品需要 UX 状态、鉴权、模型网关、检索、工具、评估、监控、成本控制、权限和失败处理；用户感受到的是延迟、失败态、引用质量和可编辑性，不是模型参数或版本号。
    whyItMatters: Demo 到产品最大的差距不是模型能力，而是缺少非模型工程能力；没有这些，上线后无法排错、控费、迭代或建立用户信任。
    engineerLens: 从"用户发起请求"到"结果进入反馈"画完整链路，在每个节点标注日志字段、错误处理和人工确认触发点；checklist 完成前不上线。
    productionExample:
      context: 某企业软件公司的需求评审 AI 助手，从内部 demo 升级为面向 2000 名产品经理的生产功能。
      whatTheyDid: 在上线前完成 20 项 checklist：UX 侧有 6 种状态（idle/streaming/tool-call/needs-confirmation/done/failed）和取消/重试按钮；后端有模型网关、runId、日志和 eval；部署侧有灰度开关、告警和回滚脚本；上线后第一周错误率 0.3%，p95 延迟 4.2 秒。
      outcome: 与前一个直接调用 API 的 demo 相比，用户满意度从 62% 提升至 79%，主要改善来自明确的失败态和引用展示，而非模型质量提升。
    counterExample:
      context: 某团队把内部 demo 直接包装成前端页面发给外部用户使用。
      antiPattern: 前端直接调用模型 API，没有鉴权、没有失败态、没有日志；出现问题时完全无法排查原因。
      consequence: 上线第三天遭遇模型 API 限流，所有请求超时但前端只显示无限转圈，用户大量投诉，紧急下线修复耗时 3 天。
    pitfalls:
      - symptom: 没有失败态，API 超时时前端永远转圈
        fix: 设计明确的 failed 状态，展示错误原因（超时/内容违规/服务不可用）和重试选项
      - symptom: 前端直接调用模型 API，密钥暴露在客户端
        fix: 所有模型调用经过后端代理，后端负责鉴权、限流和密钥管理
  - id: d04-m2
    title: 模型网关统一 provider、成本和 fallback
    concept: eval
    idea: 模型网关是 AI 产品的内部平台能力，集中处理 provider adapter（隔离 OpenAI/Claude/Gemini 的 API 差异）、超时与重试、基于质量/成本/延迟的路由策略、token 统计和审计记录。
    whyItMatters: 没有网关的系统在切换模型、控制成本或排查失败时代价极高；每个功能模块散落的模型调用让运营视角完全缺失。
    engineerLens: 网关请求应包含：model_preference（首选和 fallback 序列）、max_cost_per_request、timeout_ms、idempotency_key；响应记录：model_used、input_tokens、output_tokens、latency_ms、cost_usd、provider_request_id；网关实现 circuit breaker，单 provider 连续失败后自动切换。
    productionExample:
      context: 某 AI 创业公司，产品包含摘要、分类、代码生成三个 AI 功能，月 API 费用超过 8 万美元。
      whatTheyDid: 建立内部模型网关，配置路由策略：摘要任务走成本低 40% 的小模型；代码生成走能力最强的大模型；任何 provider 响应超时 3 次自动切换 fallback；月成本统计按功能模块和 prompt 版本聚合。
      outcome: 路由策略上线后月成本降低 34%，质量指标（按 eval 评分）无统计显著下降；fallback 机制在某 provider 宕机期间自动切换，用户无感知。
    counterExample:
      context: 某团队在 10 个业务模块里各自硬编码了模型 API 调用，不同模块用不同 key。
      antiPattern: 没有统一 token 统计和 fallback；某 provider 涨价时需要逐个模块修改代码；排查一次生产 bug 需要查 10 个不同模块的日志。
      consequence: 一次模型 API 格式变更导致 3 个模块同时宕机，排查耗时 6 小时，修复耗时 2 天；此后决定引入网关，重构成本超过 4 周。
    pitfalls:
      - symptom: 没有 circuit breaker，单个 provider 宕机导致所有请求挂起
        fix: 配置每个 provider 的连续失败阈值，超阈值自动切换 fallback provider
      - symptom: Token 成本无法按功能模块分解，不知道哪个功能最烧钱
        fix: 每次调用记录 feature_name 标签，按标签聚合月度成本报告
  - id: d04-m3
    title: Streaming UX 要展示过程和控制权
    concept: observability
    idea: 流式体验不只是逐字出字，而是一套完整的状态展示：工具调用进度、引用来源、中断/取消、重试、可编辑输出和确认操作；用户在 AI 输出期间需要知道系统在做什么和能否干预。
    whyItMatters: AI 输出慢且结果不确定，没有过程可见性的产品让用户陷入焦虑，也无法建立对 AI 结果的信任。
    engineerLens: UI 状态机至少有 6 个状态：idle（等待输入）、streaming（模型生成中）、tool-call（工具调用中，显示工具名称和进度）、needs-confirmation（需要用户确认）、done（完成，展示引用和编辑选项）、failed（展示原因和重试）；Vercel AI SDK 提供前端流式接入，但复杂工具状态和确认逻辑仍需后端协调。
    productionExample:
      context: 某法律科技公司的合同分析助手，分析一份合同平均需要 25~40 秒。
      whatTheyDid: UI 设计显示分析进度条（按步骤：文档解析、条款识别、风险评估、报告生成），每步完成后显示对应引用段落；用户可在任意步骤取消；结果展示后支持逐段修改并标注"已编辑"；编辑行为自动记录并回流 eval。
      outcome: 用户在等待期间的流失率从 31% 下降至 9%；"感觉可信"的用户评分从 54% 提升至 76%，主要原因是可见的引用和步骤透明度。
    counterExample:
      context: 某助手只显示"分析中"的旋转图标，完成后直接展示最终结果，没有引用或编辑选项。
      antiPattern: 用户在等待 40 秒后看到一段无引用的分析文字，无法判断是否可信，也无法纠正错误；刷新页面后结果丢失。
      consequence: 用户对助手的信任度仅 43%，主要投诉是"不知道 AI 是怎么想的"和"结果错了没法改"；6 个月后产品因用户留存率过低被下线。
    pitfalls:
      - symptom: 工具调用时 UI 只显示 loading，用户不知道在做什么
        fix: 显示当前工具名称和简短描述（如"正在查询合同法规...第 3 步/共 5 步"）
      - symptom: 流式输出完成后用户无法修改，只能重新发起请求
        fix: 在 done 状态提供行内编辑，标注用户修改区域，修改记录回流 eval
  - id: d04-m4
    title: 可观测与评估决定能否迭代
    concept: cost
    idea: 每次 AI run 都应产生完整的 run log，包含 runId、prompt_version、model、token 使用、延迟、工具事件、质量评分和用户反馈；没有这些数据，团队无法判断 prompt 改动、模型升级或检索调整是否真正改善了质量。
    whyItMatters: 没有可观测和评估体系的 AI 产品只能靠用户投诉发现问题；有了它才能在发版前发现退步，在成本超支前预警，在用户大规模使用前验证质量。
    engineerLens: 建立三层评估体系：离线 golden set 回归（发版前强制）、在线采样评分（上线后持续监控，推荐 LLM-as-judge 自动打分）和用户反馈回流（采纳/修改/拒绝行为回流 eval dataset）；每次发版记录 prompt_version 和对应的 eval 结果，便于版本对比。
    productionExample:
      context: 某内容平台的 AI 内容审核功能，每月处理 50 万条内容，有 4 名工程师负责迭代。
      whatTheyDid: 建立 1000 条 golden dataset（覆盖合规、争议、明显违规三类），每次 prompt 或模型变更必须先跑回归，准确率下降超过 1.5% 阻断发布；在线按 2% 采样用 LLM-as-judge 打分，人工复核每周异常样本；成本按内容类型分析，发现争议内容调用成本是普通内容的 3.2 倍，优化为先用轻量模型预筛。
      outcome: 六个月内发版 22 次，拦截 5 次质量退步（其中 3 次是 prompt 改动引入的）；成本优化后月度 token 费用降低 28%。
    counterExample:
      context: 某初创公司的 AI 客服系统，没有任何 eval 和日志框架，每次改进靠"感觉"判断。
      antiPattern: 工程师改了 prompt 后随机测试 5 个问题，感觉"更好了"就上线；没有版本记录，不知道哪次改动引入了问题。
      consequence: 一次 prompt 重构后错误分类率上升 18%，三天后才通过用户投诉发现；由于没有版本记录，无法确定是哪次改动导致的，最终回滚所有近期 prompt 变更，损失了 3 周迭代成果。
    pitfalls:
      - symptom: 只存最终答案，不记录 prompt_version 和 model
        fix: 每次 run 必须记录 runId、prompt_version、model、token 使用和 latency；这是最低要求
      - symptom: 用户投诉是发现质量问题的主要渠道
        fix: 在线采样评分和失败回流应该比用户投诉更早发现问题；评分异常自动触发告警
decisionLayers:
  - id: dl04-1
    name: 产品链路
    question: 一次 AI 请求如何完成完整的交付闭环？
    choices:
      - name: 前端 UX 状态机
        description: 明确定义 6 种状态，让用户在整个交互过程中始终知道系统在做什么，能取消、重试和编辑。
        example: streaming 状态显示逐字输出，tool-call 状态显示当前工具名称和进度，failed 状态显示错误原因和重试选项。
      - name: 后端编排与网关
        description: 后端负责鉴权、模型路由、工具执行、状态管理和日志；前端只负责展示和用户交互。
        example: 长任务进入异步 worker，生成 runId 供前端轮询；工具调用结果异步推送给前端。
  - id: dl04-2
    name: 模型网关策略
    question: 如何在质量、成本和可用性之间取得平衡？
    choices:
      - name: 按任务路由
        description: 根据任务类型、所需能力和成本预算选择不同的模型；低成本任务走轻量模型，高精度任务走强模型。
        example: 内容摘要走低成本模型，合同风险分析走高能力模型，成本差异 4 倍但质量满足要求。
      - name: Fallback 与 Circuit Breaker
        description: 配置 fallback provider 序列，单 provider 连续失败后自动切换；circuit breaker 防止雪崩效应。
        example: 首选 GPT-4o，超时 3 次切换 Claude Sonnet，再失败返回降级响应而不是空白错误页。
  - id: dl04-3
    name: 质量闭环
    question: 如何让 AI 功能持续可度量、可改进？
    choices:
      - name: 离线 Eval 加版本回归
        description: 每次 prompt 或模型变更必须通过 golden set 回归才能发版；eval 结果关联 prompt_version，支持版本对比。
        example: 维护 200 条 golden set，新 prompt 回归分数低于历史最高 2% 则阻断发版。
      - name: 在线反馈回流
        description: 用户的采纳、修改和拒绝行为是最真实的质量信号，自动回流 eval dataset 驱动下次改进。
        example: 用户修改了 AI 生成的合同摘要，原始输入和用户修改版本成为下一次 eval 的训练样本。
architecture:
  type: layered
  summary: 展示 AI 产品交付的分层架构，从前端体验到模型能力再到观测治理，每层有明确的职责边界。
  conclusion: AI 产品质量由分层架构共同决定：体验层让用户信任，网关层让系统可控，观测层让团队可迭代；任何一层缺失都会导致产品无法持续运营。
  nodes:
    - id: n1
      label: 前端 UX 与状态机
      tone: accent
      group: g1
    - id: n2
      label: 应用 API 与鉴权
      tone: neutral
      group: g1
    - id: n3
      label: 模型网关与路由
      tone: system
      group: g2
    - id: n4
      label: Fallback 与 Circuit Breaker
      tone: warning
      group: g2
    - id: n5
      label: 编排器与工具调用
      tone: neutral
      group: g3
    - id: n6
      label: 业务系统与数据服务
      tone: system
      group: g4
    - id: n7
      label: Run Log 与 Trace
      tone: neutral
      group: g4
    - id: n8
      label: Eval 与用户反馈闭环
      tone: success
      group: g4
  edges:
    - from: n1
      to: n2
      relation: primary
    - from: n2
      to: n3
      relation: primary
    - from: n3
      to: n4
      relation: dependency
      label: Fallback 策略
    - from: n3
      to: n5
      relation: primary
    - from: n5
      to: n6
      relation: primary
    - from: n5
      to: n7
      relation: primary
      label: 写入 run log
    - from: n6
      to: n7
      relation: dependency
    - from: n7
      to: n8
      relation: primary
    - from: n8
      to: n1
      relation: feedback
      label: 质量反馈驱动迭代
  groups:
    - id: g1
      label: 体验层
      kind: layer
    - id: g2
      label: 网关层
      kind: layer
    - id: g3
      label: 编排与模型层
      kind: layer
    - id: g4
      label: 观测与治理层
      kind: layer
questions:
  - id: d04-q1
    type: single
    concept: gateway
    weight: 25
    prompt: AI demo 升级为产品时最常缺的是什么？
    scenario: 某团队把一个内部 demo 直接发布给外部用户，一周后收到大量投诉说"系统经常卡死，也不知道有没有在处理"。
    explanation: Demo 到产品最大的差距是缺少非模型工程能力：UX 状态管理、错误处理、日志可观测性和评估闭环；这些与模型能力无关，但决定用户体验和运营能力。
    options:
      - id: a
        label: 只缺一个更大的品牌 logo
        correct: false
      - id: b
        label: 缺少 UX 状态、错误处理、日志和评估闭环等非模型工程能力
        correct: true
      - id: c
        label: 只需要把 temperature 调高一点
        correct: false
  - id: d04-q2
    type: single
    concept: eval
    weight: 25
    prompt: 模型网关的核心工程价值是什么？
    scenario: 团队在讨论是否值得花两周时间建一个模型网关，还是继续在各模块里各自调用 API。
    explanation: 模型网关统一了 provider 适配、路由策略、token 统计、fallback 和审计；没有网关在切模型、控成本或排查失败时代价极高，因为这些能力散落在各处无法集中管理。
    options:
      - id: a
        label: 让前端页面的颜色保持一致
        correct: false
      - id: b
        label: 统一 provider 适配、路由、成本统计和 fallback，让模型能力成为可管理的平台能力
        correct: true
      - id: c
        label: 替代所有业务数据库和存储系统
        correct: false
  - id: d04-q3
    type: single
    concept: observability
    weight: 25
    prompt: 好的 Streaming UX 除了逐字输出文字，还必须提供什么？
    scenario: 产品设计师在讨论 AI 助手的 UX 方案，有人说"只要输出速度够快，用户就会满意"。
    explanation: 流式输出速度只是基础；用户还需要知道系统在做什么（工具状态可见）、结果是否可信（引用展示）、能否干预（取消/重试/编辑）；这些是建立用户信任的关键。
    options:
      - id: a
        label: 隐藏所有中间过程，只展示最终结果
        correct: false
      - id: b
        label: 工具状态可见、引用展示、取消和编辑控制权
        correct: true
      - id: c
        label: 只显示一个动态加载动画，保持界面简洁
        correct: false
  - id: d04-q4
    type: single
    concept: cost
    weight: 25
    prompt: 为什么 AI 产品必须记录 trace 和 eval 数据？
    scenario: 某团队决定不记录 trace，认为"如果有问题用户会告诉我们"。三个月后用户流失率明显上升，团队无法定位原因。
    explanation: 没有 trace 和 eval，团队无法定位问题根因（模型、检索、prompt 还是工具）、无法在发版前发现质量退步、无法量化改进效果；用户投诉是滞后信号，trace 和 eval 是前置保障。
    options:
      - id: a
        label: 为了让日志文件显得更大，便于存储统计
        correct: false
      - id: b
        label: 支持问题定位、版本回归、质量度量和成本控制
        correct: true
      - id: c
        label: 为了完全替代用户反馈，不需要再收集用户意见
        correct: false
rubric:
  - id: rb04-1
    criterion: 能写出包含至少 6 个状态的 AI 功能 UX 状态机，并说明每个状态的触发条件和退出方式
  - id: rb04-2
    criterion: 能定义模型网关的请求字段、响应字段、路由策略和 fallback 规则
  - id: rb04-3
    criterion: 能设计 run log 的必填字段，并说明哪些字段用于成本分析、哪些用于质量评估、哪些用于问题排查
references:
  - label: Vercel AI SDK 官方文档
    url: https://sdk.vercel.ai/docs
    note: 提供流式 UI、provider 抽象和工具调用的 TypeScript SDK，包含 useChat/useCompletion hooks 和 AI Stream 协议
  - label: OpenAI Evals 框架
    url: https://platform.openai.com/docs/guides/evals
    note: 官方评估框架，支持 golden dataset 构建、LLM-as-judge 自动评分和版本回归
  - label: LangSmith 可观测平台
    url: https://docs.smith.langchain.com/
    note: 提供 LLM 应用的 trace、run log、eval 和反馈管理，支持 LangChain 和自定义集成
  - label: OpenAI 生产最佳实践
    url: https://platform.openai.com/docs/guides/production-best-practices
    note: 涵盖限流、fallback、安全、成本监控和部署策略的官方生产化指南
---

# 笔记
占位
