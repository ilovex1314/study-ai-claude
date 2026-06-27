---
id: day17
phase: Day17
stage: 生产化加固
capability: 把 token/检索/工具/队列转成预算与 SLO
title: 成本、延迟与容量工程
summary: 把 token 消耗、检索次数、工具调用和队列积压转化为可管理的单位成本预算、模型路由规则和服务目标。
capabilityGoal: 能为 AI 系统建立单位经济性视图，设计基于任务风险和质量目标的模型路由，定义缓存边界、重试预算和容量保护降级策略。
verifiableOutput: 三类任务的成本/延迟预算表，以及模型路由规则和三档容量保护降级策略。
mentalModel: AI 成本不是月末账单，是每个任务类型的可预测单位经济性，失控的根源在于没有路由和预算约束。
walkthrough: 某 AI 教练产品上线后发现月度 API 账单超出预算两倍。工程师拆解发现：80% 成本来自 20% 的"项目架构评审"任务，这类任务平均上下文长度是"概念解释"任务的 12 倍，但两者使用同一个最贵模型且无差异化路由。团队建立任务维度的成本 breakdown，将"概念解释"路由到 GPT-4o mini，"代码审查"路由到 Claude Sonnet，"架构评审"保留在最强模型并加结果缓存；同时设置 p95 延迟 SLO 和预算超限三档降级（减少 retrieval topK → 切轻量模型 → 转异步队列），月度成本下降 54% 且用户质量评分未下降。
modules:
  - id: d17-m1
    title: 单位经济性为每类任务设定成本边界
    concept: routing
    idea: AI 系统成本必须拆解到任务类型维度，包括输入 token、输出 token、检索次数、工具调用、存储和人工审核，才能指导模型选择和产品定价。
    whyItMatters: 只看月度总账单无法发现哪类任务拖高成本，也无法判断某功能是否值得维护；没有单位成本，产品定价和功能取舍都缺乏依据。
    engineerLens: 为每次任务记录 task_type、input_tokens、output_tokens、retrieval_count、tool_calls、model_id、latency_ms、total_cost_usd；按 task_type 聚合后计算 p50/p95 成本和延迟，连接用户采纳率和质量评分。
    productionExample:
      context: 某法律 AI 平台提供条款解释、合同审查、风险评级三类任务，上线后发现成本快速增长但无法定位原因。
      whatTheyDid: 引入 task_cost_breakdown 日志维度，发现"合同审查"任务平均 8000 输入 token（含完整合同），是"条款解释"的 20 倍；为合同审查引入分段摘要策略减少上下文，并将条款解释路由到轻量模型；建立每类任务的单位成本上限，超限时触发路由降级。
      outcome: 三个月后合同审查成本下降 48%，条款解释成本下降 72%，总账单减少 58%，用户质量评分无变化。
    counterExample:
      context: 某企业内部知识问答工具为所有问题使用同一最贵模型，无差异化 topK 检索，无成本追踪。
      antiPattern: 所有请求走相同路径，无任务类型区分，每月看账单超预算后才临时砍功能。
      consequence: 无法判断哪类任务值得优化，功能取舍变为感性决定；某次检索 topK 调高到 20 导致当月成本超预算 3 倍，问题发现太晚。
    pitfalls:
      - symptom: 只记录总请求数和总 token 数，无法定位高成本任务类型
        fix: 在每次请求中记录 task_type 标签，日志和监控系统按 task_type 分组聚合
      - symptom: 只看平均成本，忽略长尾任务对整体账单的贡献
        fix: 监控 p95 和 p99 成本分布，识别哪些任务是成本异常值
      - symptom: 人工审核成本未计入单位成本
        fix: 把人工 review 时间（人工成本 × 审核时长）加入任务总成本，才能准确评估自动化收益
  - id: d17-m2
    title: 模型路由按风险和质量目标分配能力
    concept: routing
    idea: 最贵模型不应成为默认路径；按任务风险等级、质量要求、上下文长度和预算动态选择模型、缓存路径或降级行为，才能在成本和质量之间取得工程平衡。
    whyItMatters: 轻量任务用强模型是资源浪费；高风险任务用弱模型可能产生错误建议；路由决策是 AI 系统中成本控制最高杠杆的环节。
    engineerLens: 设计路由表（route_table），定义任务类型到模型/工具/缓存/重试策略的映射；路由信号包括 task_type、risk_level、context_length、user_tier 和历史质量评分；路由决策应记录在 trace 中，方便事后分析调整。
    productionExample:
      context: 某 AI 编程助手提供代码补全、代码审查、架构设计三类能力。
      whatTheyDid: 路由规则：代码补全走 Claude Haiku（低延迟、低成本、用户容忍一定错误）；代码审查走 Claude Sonnet（质量适中、成本可控）；架构设计走 Claude Opus + human-in-the-loop 审批（高风险、高成本、输出影响大）；同时为代码补全结果设置 60 秒语义缓存（同一文件上下文的近似请求复用结果）。
      outcome: 补全任务成本下降 80%，缓存命中率 34%；架构设计人工审批使错误建议率从 12% 降至 3%；总体成本下降 62%，用户满意度提升。
    counterExample:
      context: 某客服 AI 工具所有对话都路由到最强模型，包括"查快递"这类确定性查询。
      antiPattern: 路由规则为空，无差异化；查快递任务消耗和复杂推理任务相同的计算资源。
      consequence: 查快递类任务占总量 60%，拖高整体成本；且这类确定性任务强模型没有质量优势，成本浪费无收益。
    pitfalls:
      - symptom: 路由规则写死在代码里，调整需要重新部署
        fix: 路由表存入配置服务（Feature Flag / 数据库），支持运行时热更新和灰度测试
      - symptom: 路由只看 task_type，不看 context_length，长上下文走轻量模型导致质量骤降
        fix: 路由规则增加 context_length 阈值；超长上下文强制走高质量模型或先做摘要压缩
      - symptom: 降级路径没有质量验证，降级后用户不知道质量变化
        fix: 降级路径的路由标签在 trace 中记录，监控降级请求的用户评分分布
  - id: d17-m3
    title: 缓存边界控制重复消耗
    concept: cache
    idea: 缓存适合稳定、低风险、可复用的中间结果（如检索片段、公共知识问答、模板渲染）；权限敏感、高变化或用户私有内容不应跨请求复用。
    whyItMatters: 无缓存边界的重复请求会线性放大成本；但错误缓存（如跨租户复用结果）会造成数据泄露，后果远比成本浪费严重。
    engineerLens: 定义缓存 key 结构（tenant_id + normalized_query_hash + retrieval_config_version），设置 TTL（知识类 24h、实时数据 0）；明确不可缓存范围：用户私有数据查询、权限敏感上下文、高变化业务数据；实现缓存失效接口（资产更新后主动 invalidate 相关 key）。
    productionExample:
      context: 某 HR 知识库工具每天收到大量重复的政策类问题（如"年假怎么算"），每次都重新检索和生成回答。
      whatTheyDid: 对政策类问答引入语义缓存（sentence embedding 近似匹配），TTL 设为 48 小时；缓存 key 包含 tenant_id 防止跨公司泄露；政策文件更新时触发 invalidation webhook 清除相关缓存；用户私有数据查询（如"我的剩余年假"）完全绕过缓存。
      outcome: 政策问答类请求缓存命中率 61%，模型调用量减少 58%，p95 延迟从 3.2s 降至 0.4s。
    counterExample:
      context: 某多租户 SaaS 系统引入全局语义缓存以降低成本，未区分 tenant_id。
      antiPattern: 缓存 key 只用 query hash，不含 tenant_id；A 公司用户查询的结果可能被 B 公司用户命中。
      consequence: 安全审计发现跨租户数据泄露，平台紧急下线缓存功能；事故后重建信任花费半年时间和大量法律成本。
    pitfalls:
      - symptom: 对策略拒绝（safety refusal）的结果也进行缓存，导致同一问题被永久拒绝
        fix: 不缓存 safety refusal 响应；对安全拒绝的请求记录但不写入缓存
      - symptom: 缓存 TTL 过长，知识库更新后用户还在看旧回答
        fix: 知识库索引更新时触发 cache invalidation，而不是等 TTL 自然过期
      - symptom: 检索 topK 没有上限，个别请求检索 50 条导致成本尖刺
        fix: 在路由层设置 max_retrieval_k，超过阈值时截断并记录 warning
  - id: d17-m4
    title: 容量保护在预算超限时维持服务
    concept: retry-budget
    idea: 重试必须有明确上限并区分错误类型（瞬时错误/策略拒绝/质量失败）；预算超限时应触发阶梯降级而非继续放量，避免雪崩。
    whyItMatters: 无限重试会把偶发的模型超时放大成重试风暴；成本失控最终表现为服务超时和用户体验劣化，预防比事后救火便宜。
    engineerLens: 定义 retry_budget（per-request 最大重试 3 次，per-minute 全局重试请求比例上限 20%）；错误类型路由：429/503 等瞬时错误可重试；safety refusal、质量失败不重试直接返回降级结果；预算超限触发三档降级：① 减少 retrieval topK（topK 8→4）；② 切换轻量模型；③ 转入异步队列。
    productionExample:
      context: 某 AI 写作助手在营销旺季遭遇模型 API 限流（429），客户端无限重试导致队列积压膨胀。
      whatTheyDid: 引入 token bucket 限流器（全局 RPS 上限 + per-user 配额），429 后等待 exponential backoff（1s/2s/4s），超过 3 次重试转为异步写作任务并推送通知；设置预算超限 webhook：成本超日限 80% 时自动将轻量任务降级至 Haiku；设置 backpressure：队列积压超 500 时拒绝新请求并返回"稍后重试"。
      outcome: 旺季重试风暴消除，队列积压峰值从 2000 降至 150；按时完成率 96%；月度成本比上年同期低 31%。
    counterExample:
      context: 某 AI 数据分析平台对所有错误统一重试 10 次，无指数退避，无类型区分。
      antiPattern: safety refusal（模型拒绝不合规查询）也触发 10 次重试；每次重试都消耗 token，加速成本消耗。
      consequence: 单个被拒绝的查询消耗 10 倍正常成本；高峰期重试风暴导致整个 API 配额耗尽，服务中断 40 分钟。
    pitfalls:
      - symptom: p95 延迟超标时只看平均值，无法定位尾延迟来源
        fix: 按 task_type 和 model_id 分组监控 p95/p99；尾延迟高时检查是否有大上下文或工具超时拖慢
      - symptom: 月末才看成本账单，无法实时干预
        fix: 设置日成本告警（80% 阈值 warning，100% 阈值 critical），触发自动降级或人工审批
      - symptom: 降级无优先级，高价值用户与普通用户同时受影响
        fix: 路由层区分 user_tier（premium/standard/free），预算超限时优先保护 premium 用户的服务质量
decisionLayers:
  - id: l1
    name: 预算视图
    question: 如何知道每类任务花了多少钱？
    choices:
      - name: 任务维度成本拆解
        description: 按 task_type 记录 token、检索、工具、存储和人工审核成本，建立单位经济性视图。
        example: task_cost_breakdown 日志 + 按 task_type 聚合报表
      - name: 月度总账单
        description: 只看总数，无法定位高成本任务，无法指导路由优化。
        example: monthly invoice
  - id: l2
    name: 路由决策
    question: 哪类任务用哪个模型和路径？
    choices:
      - name: 风险和质量驱动的路由表
        description: 按 task_type、risk_level 和 context_length 动态选择模型、缓存和重试策略。
        example: 概念解释用 Haiku，架构评审用 Opus 加人工审批
      - name: 统一最强模型
        description: 成本不可控，轻量任务资源浪费，无路由优化空间。
        example: 所有请求走 GPT-4
  - id: l3
    name: 容量保护
    question: 预算或容量超限时如何保持服务？
    choices:
      - name: 阶梯降级加告警
        description: 按顺序触发减少检索、切轻量模型、转异步队列三档降级，保证核心服务不中断。
        example: topK 减半 → Haiku → 异步队列
      - name: 无限重试或静默失败
        description: 会制造重试风暴或让用户以为成功，实际任务已丢失。
        example: retry loop / silent fail
architecture:
  type: feedback
  summary: 任务请求经预算检查和路由决策选择检索和模型路径，运行指标采集成本和延迟，通过反馈回路调整下一轮路由策略和预算阈值。
  conclusion: feedback 类型强调指标驱动的路由优化闭环；成本和延迟指标不只是监控，也是路由策略的输入，形成持续收敛的控制系统。
  nodes:
    - id: n1
      label: 任务请求
      tone: accent
    - id: n2
      label: 预算与风险检查
      tone: system
    - id: n3
      label: 模型和工具路由
      tone: system
    - id: n4
      label: 检索与缓存
    - id: n5
      label: 模型调用
    - id: n6
      label: 成本延迟质量指标
      tone: warning
    - id: n7
      label: 预算与 SLO 策略
      tone: system
  edges:
    - from: n1
      to: n2
      relation: primary
      label: 请求进入
    - from: n2
      to: n3
      relation: primary
      label: 路由决策
    - from: n3
      to: n4
      relation: primary
      label: 检索/缓存路径
    - from: n3
      to: n5
      relation: primary
      label: 模型调用路径
    - from: n4
      to: n6
      relation: primary
      label: 记录成本延迟
    - from: n5
      to: n6
      relation: primary
      label: 记录成本延迟
    - from: n6
      to: n7
      relation: primary
      label: 指标上报
    - from: n7
      to: n1
      relation: feedback
      label: 路由策略回写
  groups: []
questions:
  - id: d17-q1
    type: single
    concept: routing
    weight: 25
    prompt: AI 单位经济性分析最应该按什么维度拆解成本？
    explanation: 按任务类型拆解是发现高成本环节、指导路由优化和制定定价策略的基础；只看总账单无法定位具体原因。
    options:
      - id: a
        label: 只看月度总账单，了解整体支出趋势
        correct: false
      - id: b
        label: 按任务类型记录 token、检索、工具和存储等各项成本
        correct: true
      - id: c
        label: 只看模型 API 费用，忽略检索和工具
        correct: false
  - id: d17-q2
    type: single
    concept: cache
    weight: 25
    prompt: 多租户 AI 系统中缓存边界最关键的约束是什么？
    explanation: 缓存 key 必须包含 tenant_id，否则不同租户的数据可能相互可见，造成数据泄露；安全边界优先于成本优化。
    options:
      - id: a
        label: 缓存 TTL 要尽量长以提升命中率
        correct: false
      - id: b
        label: 缓存 key 必须包含 tenant_id，防止跨租户数据泄露
        correct: true
      - id: c
        label: 对所有请求统一缓存以最大化节省成本
        correct: false
  - id: d17-q3
    type: single
    concept: retry-budget
    weight: 25
    prompt: 模型 safety refusal（安全拒绝）响应应该如何处理重试逻辑？
    explanation: 安全拒绝不是瞬时错误，重试不会改变结果；继续重试只会浪费 token 预算，正确做法是直接返回降级结果并记录。
    options:
      - id: a
        label: 和瞬时错误一样，重试 3 次
        correct: false
      - id: b
        label: 不重试，直接返回降级结果并记录
        correct: true
      - id: c
        label: 换一个更强的模型重试
        correct: false
  - id: d17-q4
    type: single
    concept: p95
    weight: 25
    prompt: 为什么用 p95 延迟比平均延迟更重要？
    explanation: p95 反映了 95% 用户实际体验到的延迟上界；平均值容易被少数极快请求拉低，掩盖大多数用户的真实等待体验。
    options:
      - id: a
        label: p95 是系统总延迟，平均值只代表一个请求
        correct: false
      - id: b
        label: p95 代表 95% 用户实际体验的延迟上界，平均值会掩盖尾延迟
        correct: true
      - id: c
        label: p95 比平均值更容易计算
        correct: false
rubric:
  - id: r1
    criterion: 建立了至少三类任务的单位成本分解表（含 token、检索、工具成本）
  - id: r2
    criterion: 设计了基于任务风险和质量要求的模型路由表，并说明路由信号
  - id: r3
    criterion: 说明了缓存边界（哪些可缓存、哪些不可缓存）及缓存 key 设计
  - id: r4
    criterion: 定义了预算超限时的三档降级策略，并区分了不同错误类型的重试规则
references:
  - label: OpenAI latency optimization guide
    url: https://platform.openai.com/docs/guides/latency-optimization
    note: 官方延迟优化指南，覆盖模型选择、streaming、上下文压缩和缓存策略，是延迟预算设计的权威参考
  - label: OpenAI production best practices
    url: https://platform.openai.com/docs/guides/production-best-practices
    note: 官方生产最佳实践，涵盖速率限制、重试策略、成本管理和可观测性，适用于容量保护设计
  - label: Sentry performance metrics
    url: https://docs.sentry.io/product/performance/metrics/
    note: Sentry 性能指标文档，讲解 p50/p75/p95/p99 分位延迟的监控实践，适用于建立 AI 系统延迟 SLO
  - label: Anthropic model pricing
    url: https://www.anthropic.com/pricing
    note: Claude 各模型最新定价，是设计模型路由成本预算和路由决策的直接依据
---

# 笔记
占位
