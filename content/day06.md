---
id: "day06"
phase: "Day06"
stage: "平台与知识系统"
capability: "搭流式 AI UI、provider 抽象与工具边界"
title: "TypeScript AI 应用栈"
summary: "用 Vercel AI SDK 与 Next.js 设计流式 UI、provider 抽象和服务端工具边界，把前端体验与后端控制面清晰分层。"
capabilityGoal: "能设计一套 Next.js AI Route 方案，包含流式状态机、provider adapter 接口、服务端工具鉴权和 run log，并说明每层的验收方式。"
verifiableOutput: "TypeScript AI UI 方案文档，含架构分层图、关键接口定义、失败模式列表和端到端验收命令。"
mentalModel: "前端负责体验，后端负责控制；provider 是可替换的底层，业务接口不能与之耦合。"
walkthrough: >
  某团队要为内部工单系统新增 AI 起草助手。PM 期望在对话框输入后实时看到建议内容流式生成，
  点击"提交"后由系统（而非模型）写入工单表。工程师先在服务端定义 /api/ai-compose Route，
  接收 conversationId、userPrompt、toolCalls，密钥从环境变量注入，不经浏览器；
  前端通过 Vercel AI SDK 的 useChat Hook 连接，UI 状态机显式维护 idle、streaming、tool-call、needs-confirmation 共 7 种状态；
  provider adapter 封装 OpenAI 和 Anthropic 两个 provider，接口统一为 { model, messages, tools, stream, usage, error }；
  工具执行（搜索工单、读取模板）走后端鉴权，结果写入 run log 便于审计。
  验收方式：10 条 golden conversation 在 CI 跑通，断网时前端显示 failed 态而非空白，切换 provider 无需改业务代码。
modules:
  - id: "d6-m1"
    title: "TypeScript AI 栈适合快速产品化"
    concept: "streaming"
    idea: "Next.js App Router + Vercel AI SDK 把流式 AI 能力压缩到几十行代码，让前后端工程师用熟悉的工具快速落地 AI 产品。"
    whyItMatters: >
      前后端团队已有 TypeScript 技能栈，选择 Vercel AI SDK 意味着可以复用现有测试、CI、部署流程，
      而不是引入全新框架和学习曲线。真正的生产风险在边界设计，而不在框架本身。
    engineerLens: >
      把 AI SDK 当作"流式网络层"，它解决 Server-Sent Events 和 JSON delta 解析；
      业务逻辑（权限、审计、成本）仍然是自研服务端代码。
      不要因为 SDK 方便就把所有东西都塞进 /api/chat。
    productionExample:
      context: "某 SaaS 公司内部 AI 工单起草助手，月活 300 名客服代理。"
      whatTheyDid: >
        用 Next.js Route Handler 作为模型调用入口，Vercel AI SDK streamText 处理流式响应，
        前端 useChat 绑定 7 态状态机。密钥从 Vercel 环境变量注入，浏览器只见 /api/ai-compose，不见 provider。
        关键工具（拉工单详情、读 SLA 模板）只在服务端执行，结果写入 run_events 表。
      outcome: "上线 2 周后，客服平均起草时间从 4 分钟降至 1.2 分钟；provider 从 OpenAI 切换到 Anthropic 仅改了 adapter 层一行代码，零业务回归。"
    counterExample:
      context: "另一个团队在演示期间图快，让前端直接 fetch OpenAI API，把 OPENAI_API_KEY 写进了 .env.local 并随代码提交。"
      antiPattern: "API Key 暴露在客户端，无服务端审计日志，工具调用参数由浏览器任意构造。"
      consequence: "密钥泄露后，攻击者在 48 小时内产生 $3,200 异常费用；因为没有 run log，无法确定哪些请求是攻击者发的。"
    pitfalls:
      - symptom: "浏览器控制台能看到 Authorization 头或 API Key"
        fix: "把模型调用移入 Next.js Route Handler，密钥只从服务端环境变量读取"
      - symptom: "UI 只有一个 loading spinner，工具调用、失败、取消状态无法区分"
        fix: "用显式状态枚举（idle / submitting / streaming / tool-call / needs-confirmation / failed / done）驱动 UI 渲染"
      - symptom: "切换 provider 需要改 10 处业务代码"
        fix: "定义 ModelClient 接口，adapter 实现它，业务代码只依赖接口"
  - id: "d6-m2"
    title: "Provider adapter 隔离模型差异"
    concept: "provider"
    idea: >
      不同 provider（OpenAI、Anthropic、Azure、Gemini）的模型名、参数名、工具 schema 格式、流式协议、
      速率限制错误码和计费单位各不相同。adapter 层把这些差异统一，业务代码面向稳定接口编程。
    whyItMatters: >
      模型市场演进极快，一年内主力模型可能换代两次。如果业务代码直接依赖 provider SDK，
      每次切换都是全局改动。adapter 投入一次，换 provider 只改一个文件。
    engineerLens: >
      Adapter 接口最小化：{ model: string, messages: Message[], tools?: Tool[], stream: boolean } 进，
      { text: string, usage: TokenUsage, toolCalls?: ToolCall[], error?: AdapterError } 出。
      保留原始 provider 错误在 error.raw，便于调试；记录 provider、model、latency_ms、input_tokens、output_tokens 到 run_events。
    productionExample:
      context: "某文档智能平台需要同时支持 GPT-4o（高质量摘要）和 Claude 3.5 Sonnet（长文档分析），按任务类型路由。"
      whatTheyDid: >
        定义 ModelAdapter 接口，OpenAIAdapter 和 AnthropicAdapter 分别实现。
        路由层根据 task_type 选 adapter，业务层只调 adapter.complete()。
        adapter 把各 provider 的速率限制错误统一映射为 { code: 'rate_limit', retryAfterMs }。
      outcome: >
        当 OpenAI 出现区域故障时，路由层 fallback 到 Anthropic，用户无感知；
        成本报表按 provider 聚合，发现 Claude 在长文档场景成本低 30%，支撑了选型决策。
    counterExample:
      context: "某团队的知识库问答直接用 openai.chat.completions.create()，错误处理写死了 OpenAI 错误结构。"
      antiPattern: "provider SDK 调用散落在 20 个文件，速率限制错误格式硬编码，没有 usage 记录。"
      consequence: "当公司合规要求切换到私有化部署的模型时，需要改动 20 个文件，测试覆盖率不足导致上线后出现 3 个静默错误。"
    pitfalls:
      - symptom: "adapter.complete() 吞掉了原始错误，只返回 \"Unknown error\""
        fix: "在 error.raw 保留原始 provider 错误，在 error.code 提供统一分类"
      - symptom: "无法按 provider 分析成本"
        fix: "每次调用记录 { provider, model, input_tokens, output_tokens, latency_ms } 到 run_events 表"
  - id: "d6-m3"
    title: "Chat UI 是状态机"
    concept: "server-boundary"
    idea: >
      AI 对话 UI 不是简单的"发送 -> 等待 -> 显示"，而是包含至少 7 个明确状态：
      idle、submitting、streaming、tool-call、needs-confirmation、failed、done。
      每个状态决定显示什么、允许什么操作、如何恢复。
    whyItMatters: >
      用户在 streaming 状态下需要知道进度，在 tool-call 时需要看到工具在做什么，
      在 needs-confirmation 时需要审批危险动作，在 failed 时需要清晰的错误说明和重试入口。
      只有单一 loading 状态的 UI 会导致用户重复提交、无法取消、失败无提示。
    engineerLens: >
      用 XState 或简单的 useReducer 显式建模状态转换，不靠多个 boolean（isLoading && !isError && !isConfirming）堆叠。
      每个工具调用结果渲染为独立气泡，引用来源跟随答案，用户可以点击展开证据。
      取消按钮在 streaming 和 tool-call 状态都可见，触发 AbortController.abort()。
    productionExample:
      context: "某 BI 助手让用户用自然语言查数据，工具调用会执行 SQL 并返回表格。"
      whatTheyDid: >
        状态机管理 idle→submitting→streaming→tool-call（执行 SQL）→streaming→done 的转换。
        tool-call 状态显示"正在查询数据库…"进度提示，SQL 执行超过 5 秒触发 needs-confirmation 让用户决定是否继续。
        failed 状态区分 network_error、tool_error、content_policy 三类，分别给出不同恢复建议。
      outcome: "用户满意度从 3.2/5 升至 4.4/5，主因是\"知道系统在做什么\"；工具失败后重试成功率达 78%。"
    counterExample:
      context: "某 chatbot 只有 isLoading 布尔值，工具调用期间和模型推理期间显示同一个转圈图标。"
      antiPattern: "用 5 个 boolean 变量（isLoading、isStreaming、isTool、isError、isConfirm）组合判断，逻辑散落在多处。"
      consequence: "工具调用失败时没有任何提示，用户以为系统挂了，重复提交 4 次，产生 4 倍 token 消耗。"
    pitfalls:
      - symptom: "工具调用失败后 UI 卡在 loading 状态"
        fix: "工具错误路径显式触发 failed 状态转换，展示错误分类和重试按钮"
      - symptom: "引用出现在答案之后几秒才显示，用户看不到依据"
        fix: "流式传输引用 delta，边接收边渲染引用列表"
  - id: "d6-m4"
    title: "服务端边界保护密钥、权限和状态"
    concept: "tool-call"
    idea: >
      模型调用、工具执行、审计日志、速率限制、队列和成本统计必须在服务端。
      前端的职责是体验（渲染流式文本、显示状态、触发用户动作），
      后端的职责是控制（鉴权、权限检查、工具执行、计费）。
    whyItMatters: >
      把工具执行放在前端意味着任何能打开开发者工具的人都可以构造任意工具参数，
      绕过权限检查，读取他人数据或触发高权限动作。服务端边界是安全的最后防线。
    engineerLens: >
      Route Handler 内：从 session/JWT 获取 userId 和 tenantId，工具调用前检查权限，
      执行结果写入 run_events（runId、toolName、input、output、durationMs、userId）。
      前端只传 conversationId 和 userMessage，不传工具参数。
      长任务用 Redis queue + background worker，前端轮询 /api/runs/{runId}/status。
    productionExample:
      context: "某 HR AI 助手能读取员工档案和薪资信息，仅限 HR 角色使用。"
      whatTheyDid: >
        Route Handler 验证 JWT，检查 user.role === 'hr'；工具 readEmployeeProfile 在服务端执行，
        结果不包含薪资字段（仅 HR 管理员可见）；每次工具调用写 audit_log（userId、action、resourceId、timestamp）；
        前端 useChat 只传 prompt，工具参数由服务端根据对话历史和权限生成。
      outcome: "安全审计通过，零越权访问事件；audit_log 帮助定位了一次员工数据误导查询，及时纠正。"
    counterExample:
      context: "某助手允许前端直接传 toolName 和 toolArgs，服务端不做权限校验就执行。"
      antiPattern: "浏览器构造 { toolName: \"deleteRecord\", toolArgs: { id: \"...\" } } 直接发服务端执行。"
      consequence: "渗透测试发现越权删除漏洞，紧急下线修复，影响当天 2,000 名用户。"
    pitfalls:
      - symptom: "工具执行日志缺失，无法追查异常调用"
        fix: "每次工具执行写 run_events，字段包含 runId、toolName、userId、input_hash、output_hash、durationMs"
      - symptom: "长时间工具调用（如大文件分析）导致前端超时"
        fix: "任务入 Redis queue，返回 runId，前端 SSE 订阅 /api/runs/{runId}/events 获取进度"
decisionLayers:
  - id: "dl1"
    name: "前端状态边界"
    question: "哪些状态应该留在前端，哪些必须在服务端？"
    choices:
      - name: "UI 状态留前端"
        description: "idle/streaming/failed 等 UI 状态在 React 状态机管理，驱动渲染逻辑。"
        example: "useReducer 管理 7 态状态机，每个状态对应确定的 UI 展示和用户操作。"
      - name: "业务状态在服务端"
        description: "conversationHistory、runId、toolResults、用户权限全部在服务端维护。"
        example: "/api/ai-runs 表存储完整对话历史和工具执行记录，前端只持有 conversationId。"
  - id: "dl2"
    name: "Provider 选型与切换策略"
    question: "如何在不同 provider 间选择和切换？"
    choices:
      - name: "单 provider + adapter 隔离"
        description: "当前只用一个 provider，但通过 adapter 接口隔离，切换时只改 adapter 实现。"
        example: "ModelAdapter 接口统一入参出参，OpenAIAdapter 是当前实现，测试 mock 相同接口。"
      - name: "多 provider 路由"
        description: "按任务类型、成本或可用性把请求路由到不同 provider。"
        example: "task_type=summary 用 GPT-4o-mini（低成本），task_type=long-doc 用 Claude（长上下文），故障时 fallback。"
  - id: "dl3"
    name: "工具执行位置"
    question: "工具在哪里执行，如何鉴权？"
    choices:
      - name: "全部服务端执行"
        description: "所有工具调用在 Route Handler 内执行，结果经鉴权后返回前端展示。"
        example: "searchDocs、createTicket 工具在服务端验证 tenantId 后执行，前端仅展示结果。"
      - name: "轻量工具前端执行"
        description: "无副作用的纯计算或公开数据工具可在前端执行，降低延迟。"
        example: "formatDate、calculateReadingTime 这类无 IO 的工具可在前端 Tool 注册执行。"
architecture:
  type: "layered"
  summary: "TypeScript AI 应用分为体验层、应用服务层、模型平台层和业务治理层四个明确分层，各层责任边界清晰，变化隔离。"
  conclusion: "前端只持有 conversationId 和 UI 状态，密钥、工具执行、审计和成本统计全在服务端；provider adapter 让业务代码与 provider 解耦。"
  nodes:
    - id: "n1"
      label: "React Chat UI"
      tone: "accent"
      group: "g1"
    - id: "n2"
      label: "流式状态机（7 态）"
      tone: "neutral"
      group: "g1"
    - id: "n3"
      label: "Next.js Route Handler"
      tone: "system"
      group: "g2"
    - id: "n4"
      label: "鉴权与限流中间件"
      tone: "warning"
      group: "g2"
    - id: "n5"
      label: "Vercel AI SDK streamText"
      tone: "neutral"
      group: "g3"
    - id: "n6"
      label: "Provider Adapter 接口"
      tone: "system"
      group: "g3"
    - id: "n7"
      label: "工具执行与 run_events"
      tone: "success"
      group: "g4"
    - id: "n8"
      label: "业务数据库与审计日志"
      tone: "neutral"
      group: "g4"
  edges:
    - from: "n1"
      to: "n2"
      relation: "primary"
      label: "用户输入"
    - from: "n2"
      to: "n3"
      relation: "primary"
      label: "POST conversationId+message"
    - from: "n3"
      to: "n4"
      relation: "guard"
      label: "验证 JWT+权限"
    - from: "n4"
      to: "n5"
      relation: "primary"
      label: "调用流式 API"
    - from: "n5"
      to: "n6"
      relation: "primary"
      label: "provider 路由"
    - from: "n6"
      to: "n7"
      relation: "primary"
      label: "工具调用执行"
    - from: "n7"
      to: "n8"
      relation: "primary"
      label: "写 audit log"
    - from: "n8"
      to: "n1"
      relation: "feedback"
      label: "成本和质量反馈"
  groups:
    - id: "g1"
      label: "体验层"
      kind: "layer"
    - id: "g2"
      label: "应用服务层"
      kind: "layer"
    - id: "g3"
      label: "模型与平台层"
      kind: "layer"
    - id: "g4"
      label: "业务与治理层"
      kind: "layer"
questions:
  - id: "d6-q1"
    type: "single"
    concept: "streaming"
    weight: 25
    prompt: "为什么 Next.js AI Route Handler 应该持有 API Key，而不是前端直接调 provider？"
    scenario: "你的团队刚上线了一个 AI 写作助手，用户反映有时响应很慢，你怀疑有人在滥用。"
    explanation: "密钥在服务端才能做鉴权、限流和审计日志；前端持有密钥任何用户都可以提取并绕过所有控制。"
    options:
      - id: "a"
        label: "这样能让前端代码更简洁"
        correct: false
      - id: "b"
        label: "服务端持有密钥才能做鉴权、限流和审计，防止密钥泄露和滥用"
        correct: true
      - id: "c"
        label: "只是历史习惯，没有实质区别"
        correct: false
  - id: "d6-q2"
    type: "single"
    concept: "provider"
    weight: 25
    prompt: "Provider adapter 接口最核心的设计原则是什么？"
    scenario: "你的公司正在评估从 OpenAI 切换到内部私有化部署的模型，需要评估迁移成本。"
    explanation: "Adapter 让业务代码面向稳定接口编程，provider 实现细节（API 格式、错误码、流式协议）被封装在 adapter 内部，切换 provider 只改 adapter 实现。"
    options:
      - id: "a"
        label: "尽量多暴露 provider 原生参数，保持灵活性"
        correct: false
      - id: "b"
        label: "业务代码面向统一接口，provider 差异封装在 adapter 内，切换只改 adapter"
        correct: true
      - id: "c"
        label: "每个 provider 写一套业务代码，保持 provider 专属优化"
        correct: false
  - id: "d6-q3"
    type: "single"
    concept: "server-boundary"
    weight: 25
    prompt: "Chat UI 状态机中，为什么需要 needs-confirmation 这个专门的状态？"
    scenario: "你的 AI 助手有一个\"删除全部草稿\"工具，用户偶尔抱怨数据意外被删除。"
    explanation: "危险副作用动作（删除、支付、发送）应在执行前暂停工作流进入 needs-confirmation 状态，让用户明确审批。这是系统设计的安全节点，不是 UX 装饰。"
    options:
      - id: "a"
        label: "这只是 UX 改善，不影响系统安全"
        correct: false
      - id: "b"
        label: "危险动作执行前暂停进入审批状态，防止模型误判或用户误触触发不可逆副作用"
        correct: true
      - id: "c"
        label: "可以用弹窗替代，状态机不需要这个状态"
        correct: false
  - id: "d6-q4"
    type: "single"
    concept: "tool-call"
    weight: 25
    prompt: "工具执行的参数应该由谁生成？"
    scenario: "你的 AI 助手有读取客户订单的工具，权限应该限制在当前登录用户自己的订单。"
    explanation: "工具参数由服务端根据对话历史和当前用户的 session 生成，前端只传 conversationId，不传 toolArgs。这样权限检查在服务端执行，无法被前端绕过。"
    options:
      - id: "a"
        label: "前端根据用户输入生成工具参数，发送给服务端执行"
        correct: false
      - id: "b"
        label: "服务端根据对话历史和用户 session 生成工具参数，前端不参与参数构造"
        correct: true
      - id: "c"
        label: "模型直接输出工具参数发给第三方 API，不经过服务端"
        correct: false
rubric:
  - id: "r1"
    criterion: "能描述 TypeScript AI 栈的四层架构（体验层、应用服务层、模型平台层、业务治理层）及每层的核心职责"
  - id: "r2"
    criterion: "能定义 provider adapter 接口（入参 model/messages/tools/stream，出参 text/usage/toolCalls/error），说明为何业务代码不应直接依赖 provider SDK"
  - id: "r3"
    criterion: "能列举 Chat UI 的 7 种状态并描述每种状态下的用户可见内容和允许操作"
  - id: "r4"
    criterion: "能说明工具执行必须在服务端的原因，并设计 run_events 表字段用于审计"
references:
  - label: "Vercel AI SDK 官方文档"
    url: "https://sdk.vercel.ai/docs"
    note: "涵盖 streamText、useChat、工具调用、provider 切换的完整 API 参考，是 TypeScript AI 栈的权威文档"
  - label: "Next.js App Router Route Handlers"
    url: "https://nextjs.org/docs/app/building-your-application/routing/route-handlers"
    note: "Next.js 服务端 API 路由官方指南，讲解如何在 Route Handler 中安全处理请求和环境变量"
  - label: "Anthropic API 文档 - 工具使用"
    url: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use"
    note: "Anthropic 工具调用 schema 格式与 OpenAI 不同，是实现 provider adapter 时必须参考的官方规范"
  - label: "OpenAI Streaming 指南"
    url: "https://platform.openai.com/docs/api-reference/streaming"
    note: "讲解 Server-Sent Events 流式协议细节，对比 Anthropic streaming 格式，理解 adapter 需要统一的差异点"
---

# 笔记
占位
