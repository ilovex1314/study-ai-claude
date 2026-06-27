---
id: day05
phase: Day05
stage: 平台与知识系统
capability: 按团队能力与阶段选平台
title: 平台、框架与供应商选型
summary: 建立代码框架、可视化平台和云厂商的选型判断框架，避免追热度选型，确保控制深度、迁移能力和团队适配。
capabilityGoal: 能为给定业务场景和团队现状填写选型矩阵，说明不同平台的适用阶段、锁定风险、集成边界和退出策略。
verifiableOutput: 一份技术选型矩阵，涵盖至少 3 个平台/框架的适用场景、控制深度、锁定风险、集成方式和迁移成本对比。
mentalModel: 先列约束（阶段、控制深度、团队技术栈、合规、成本），再选平台；不要先选喜欢的框架再找理由。
walkthrough: 某团队需要为客服知识库问答系统选型：首先列约束——需要在 4 周内验证业务价值、团队有 2 名前端工程师和 1 名后端工程师、数据不能离开私有云；然后填选型矩阵——Dify 满足快速验证和私有部署，但定制工具调用受限；LangGraph 满足复杂状态需求，但学习曲线陡；自研（Vercel AI SDK + 自建后端）控制最完整，但 4 周内难以交付；最终选 Dify 跑第一个月验证，第二个月根据定制化需求决定是否迁移到自研；同时设计 adapter 层隔离业务代码和平台 API，确保迁移时业务逻辑零修改。
modules:
  - id: d05-m1
    title: 平台选型要匹配阶段和控制深度
    concept: build-vs-buy
    idea: 快速验证（4 周内上线、核心是业务假设）、产品级 Web（用户体验、streaming、工具调用）、复杂状态编排（持久化、恢复、多 Agent 协作）和企业合规（私有化、审计、权限）对应不同工具层；在错误阶段用错误工具会导致返工。
    whyItMatters: 选型决定了未来 6~12 个月的开发速度、定制边界、运维成本和迁移难度；过早自研浪费时间，过晚迁移积累债务。
    engineerLens: 先填约束表（交付时间、定制深度、团队规模、合规要求、预算），再对照选型矩阵：可视化平台（Dify/Coze/n8n）适合快速验证；SDK 类（Vercel AI SDK/Agents SDK）适合产品级 Web；图式引擎（LangGraph/Mastra）适合复杂状态；企业私有化（Dify Self-hosted/LangGraph Platform）适合高合规场景。
    productionExample:
      context: 某 B2B SaaS 公司的客户成功团队，需要为销售 copilot 快速验证业务价值，团队规模 3 人，交付时间 3 周。
      whatTheyDid: 第一阶段选 Dify（可视化编排，内置 RAG 和工具节点），3 周内完成业务验证；第二阶段发现需要定制化评分逻辑和 CRM 深度集成，用 8 周迁移到 TypeScript 自研（Vercel AI SDK + LangGraph），Dify 验证阶段的 prompt 和 golden dataset 直接复用；整个迁移过程因为有 adapter 层，业务逻辑代码改动量不超过 15%。
      outcome: 总交付时间比直接自研缩短 5 周，业务验证假设失败率降低（因为先验证再深度投入），最终产品控制深度满足企业客户的定制要求。
    counterExample:
      context: 某团队在完全没有业务验证的情况下，直接用 LangGraph 自研了一个复杂的多 Agent 知识库系统，耗时 14 周。
      antiPattern: 跳过快速验证阶段，直接选控制最深的框架，认为"以后肯定需要这些能力"。
      consequence: 14 周后产品上线，发现核心业务假设（用户愿意使用对话式知识检索）不成立，需求变更为批量导出报告；之前的 Agent 编排逻辑大部分废弃，重写耗时另外 6 周。
    pitfalls:
      - symptom: 只按框架热度或演示效果做决定，没有约束表
        fix: 每次选型前强制填写 5 个约束：交付时间、定制深度、团队规模、合规要求、预算上限
      - symptom: 把快速验证平台当长期产品平台，积累迁移债务
        fix: 在选型时明确"迁移触发条件"（如定制需求超出平台能力时），提前设计 adapter 层
  - id: d05-m2
    title: 供应商锁定要提前设计出口
    concept: abstraction
    idea: 供应商锁定来自多个层面：模型 API 格式差异、平台特有的工作流配置格式、向量库接口差异、eval 数据格式和运维体系；每一层都可能成为迁移障碍，需要在设计阶段就用 adapter 和契约隔离。
    whyItMatters: AI 能力演进极快，今天最好的模型 6 个月后可能不再最优；被锁定的系统无法低成本切换模型或平台，错失竞争优势或付出过高成本。
    engineerLens: adapter 设计原则：业务代码只调用内部接口（如 `llm_complete(prompt, config)`），adapter 层负责转换到具体 provider API；日志、eval 数据、prompt 版本存在自己的系统，不存在平台黑盒里；关键工作流配置导出为代码或标准格式，不只存在平台 GUI 里。
    productionExample:
      context: 某 AI 初创公司，产品上线时选用了 GPT-4，12 个月后需要同时支持 Claude 3.5 和 Gemini 1.5 以满足不同客户需求。
      whatTheyDid: 创立初期就设计了 ModelProvider 接口（统一的请求格式、响应格式和错误类型），每个模型各自实现 adapter；切换时只需新增 adapter 文件，业务代码零修改；eval 数据、prompt 版本和 run log 存在自研数据库，独立于任何 provider。
      outcome: 新增 Claude 和 Gemini 支持各耗时 2 天（实现 adapter + 测试），而不是预期的 2 周；多 provider 后成本降低 22%，因为可以按任务选最优价格模型。
    counterExample:
      context: 某团队直接在业务代码中调用 OpenAI Python SDK，参数格式和错误处理都绑定了 OpenAI 特有的 API 结构。
      antiPattern: 没有 adapter 层，业务逻辑直接依赖 openai.ChatCompletion.create() 的参数名和响应格式。
      consequence: 当需要接入 Claude 时，发现参数格式差异导致需要修改 40 个文件；由于测试覆盖不足，上线后出现 3 次由 API 格式差异引起的生产 bug。
    pitfalls:
      - symptom: Eval 数据只存在 LLM 平台的数据库，无法导出
        fix: 每次 eval run 的输入、输出和评分都写入自己控制的存储；平台数据只作为操作界面
      - symptom: 核心工作流只存在可视化平台的 GUI 配置，无版本控制
        fix: 工作流配置导出为 YAML 或 JSON 并纳入 git 版本控制；平台 GUI 是编辑工具，代码是唯一可信来源
  - id: d05-m3
    title: 框架适配看团队和任务形态
    concept: migration
    idea: Vercel AI SDK 解决前端流式 UI 和 provider 抽象；Agents SDK 解决 Agent 原语（工具、handoff、guardrails）；LangGraph 解决持久化状态机和恢复；Dify/Coze 解决可视化快速构建；它们解决的问题层级不同，不能当同类比较。
    whyItMatters: 把 Chat SDK 当复杂工作流引擎会导致在不合适的基础上搭建功能，后期不得不重写；把图式引擎用于简单问答会增加不必要的复杂度和运维成本。
    engineerLens: 按五个维度对比框架：UI 集成（流式输出、状态管理）、编排能力（线性 vs 图式 vs 可视化）、工具调用（schema 定义、权限控制）、状态恢复（checkpoint、interrupt/resume）和运维成本（自托管、监控、扩容）；团队已有技术栈权重最高。
    productionExample:
      context: 某企业的 AI 内容团队，3 名前端工程师、1 名后端工程师，需要构建一个文章辅助写作工具（流式生成、多步骤修改、历史记录）。
      whatTheyDid: 选 Vercel AI SDK 处理前端流式 UI（团队已熟悉 Next.js），用 Supabase 存历史记录，工具调用（SEO 检查、图片建议）用 Agents SDK 实现，没有引入 LangGraph（不需要复杂状态恢复，历史记录需求用数据库满足即可）。
      outcome: 4 周内上线，团队学习成本极低（沿用已有技术栈），后期只为新增"协作编辑"功能才引入状态管理层。
    counterExample:
      context: 同样的文章写作工具，但团队选了 LangGraph 作为核心框架，认为"复杂功能以后肯定会加"。
      antiPattern: 为了满足"可能的"未来需求，在当前阶段引入过重的框架，团队花 3 周学习 LangGraph 概念和配置。
      consequence: 3 周学习成本浪费了预算，实际用到的 LangGraph 功能只有线性流程（用 Vercel AI SDK 完全可以实现），后期实际需要的"协作编辑"功能反而因为 LangGraph 的状态模型不匹配而难以实现。
    pitfalls:
      - symptom: 选型时只比较框架功能列表，不考虑团队已有技术栈
        fix: 优先选团队已熟悉的语言和生态；学习成本是真实成本，在时间预算里要显式计算
      - symptom: 把可视化平台当复杂后端服务的核心组件
        fix: 可视化平台适合快速验证和运营配置；核心鉴权、数据处理和审计逻辑留在自研后端
  - id: d05-m4
    title: 串联方式决定系统边界
    concept: team-fit
    idea: 平台和自研系统之间有多种串联方式：REST API（同步、稳定服务）、Webhook（事件驱动、平台回调）、Queue（异步解耦、削峰）、MCP（统一工具接口标准）；选择串联方式决定了谁拥有核心控制权和数据。
    whyItMatters: 串联方式错误会导致核心业务逻辑被锁在平台黑盒里，或者平台崩溃时整个业务不可用；正确边界让平台做它擅长的，业务关键逻辑留在可控的自研服务。
    engineerLens: 原则是"让平台调用你的受控 API，而不是把核心逻辑写死在平台里"；自研服务暴露 REST API，平台通过 Tool/Webhook 调用；权限校验、数据写入、审计和支付等高风险操作必须在自研服务里实现，不依赖平台。
    productionExample:
      context: 某企业用 Dify 搭建了一个销售助手，工具包含查询 CRM、生成合同草稿和更新商机状态。
      whatTheyDid: 在自研后端实现三个 REST API（GET /crm/opportunity、POST /contract/draft、PATCH /crm/opportunity/status），每个 API 有独立鉴权（Dify 调用时传递 API Key 和用户 token）、入参校验和审计日志；Dify 只负责工作流编排和模型调用，业务逻辑和数据完全在自研服务里。
      outcome: 当团队决定从 Dify 迁移到 LangGraph 时，核心 API 无需修改，只需重新配置工具调用方式，迁移耗时 1 周（而非预估的 3 个月）。
    counterExample:
      context: 某团队把商机更新逻辑直接写在 Dify 的 Python 代码节点里，包括 CRM API 密钥和数据库连接字符串。
      antiPattern: 核心业务逻辑分散在 Dify 平台的代码节点里，密钥直接存在平台配置中，无审计日志。
      consequence: CRM 系统升级 API 版本后，需要在 Dify 内部节点逐个修改；密钥管理混乱，一次人员变动导致 Dify 的密钥被带走，发生安全事故。
    pitfalls:
      - symptom: 平台 Tool 直接使用管理员密钥调用核心数据库
        fix: 为平台创建最小权限的专用 API Key，通过自研 API 层访问数据，API 层负责权限校验和日志
      - symptom: 平台和自研系统之间没有幂等机制，网络重试导致重复写入
        fix: 自研 API 支持幂等键，平台调用时携带唯一 request_id，确保重试不产生重复副作用
decisionLayers:
  - id: dl05-1
    name: 阶段与控制深度
    question: 当前阶段最需要什么能力？
    choices:
      - name: 快速验证优先
        description: 用最短路径（通常 1~4 周）证明核心业务假设，选可视化平台或轻量 SDK；验证失败成本低于自研失败成本。
        example: 用 Dify 在 2 周内搭建知识库问答原型，验证销售团队是否愿意使用 AI 辅助检索。
      - name: 产品控制优先
        description: 验证完成后转向定制化自研，保证权限、审计、数据隔离和差异化体验；此时自研成本已有业务收益支撑。
        example: 用 Vercel AI SDK + 自建后端替换原型，加入用户权限过滤、run log 和自定义 UI。
  - id: dl05-2
    name: 供应商边界
    question: 哪些能力必须留在自研服务？
    choices:
      - name: 平台与 SDK 能力
        description: 复用平台成熟的工作流编排、流式 UI、向量检索和模型调用；这些通用能力不是差异化竞争力，自研收益低。
        example: 用平台的内置 RAG 节点处理文档检索，而不是从头实现向量化和检索逻辑。
      - name: 自研控制面
        description: 鉴权、用户数据、审计日志、业务规则、成本统计和 eval 数据必须留在自研服务；这些是业务资产，不能锁在第三方平台。
        example: 用户权限矩阵、每次 AI 调用的 run log 和 golden dataset 存在自己的数据库。
  - id: dl05-3
    name: 迁移策略
    question: 如何确保技术选型不造成长期锁定？
    choices:
      - name: Adapter 层隔离
        description: 业务代码调用内部 adapter 接口，adapter 负责转换到具体平台或 provider；更换平台时只需重写 adapter，业务代码不变。
        example: 内部 `llm.complete()` 接口，adapter 实现有 OpenAI、Claude、Gemini 三个版本；业务代码无需感知底层差异。
      - name: 验收与复盘指标
        description: 用 golden cases、成本分析和失败率数据判断是否需要迁移；数据驱动迁移决策，而不是跟随技术热度。
        example: 季度选型复盘：当前平台定制需求拦截率 vs 迁移成本，超阈值时触发迁移计划。
architecture:
  type: boundary
  summary: 展示业务目标与平台能力之间的选型边界，以及自研服务和第三方平台之间的集成与治理责任划分。
  conclusion: 平台快，自研强；adapter 隔离锁定风险，自研服务保留核心资产；数据驱动选型，约束优先框架。
  nodes:
    - id: n1
      label: 业务目标与约束
      tone: accent
      group: g1
    - id: n2
      label: 选型矩阵与决策
      tone: neutral
      group: g1
    - id: n3
      label: 可视化平台与低代码
      tone: neutral
      group: g2
    - id: n4
      label: SDK 与框架层
      tone: neutral
      group: g2
    - id: n5
      label: Adapter 层与内部接口
      tone: system
      group: g3
    - id: n6
      label: 自研核心服务
      tone: system
      group: g3
    - id: n7
      label: 数据与合规资产
      tone: system
      group: g4
    - id: n8
      label: 供应商迁移与退出路径
      tone: warning
      group: g4
  edges:
    - from: n1
      to: n2
      relation: primary
    - from: n2
      to: n3
      relation: branch
      label: 快速验证路径
    - from: n2
      to: n4
      relation: branch
      label: 产品化路径
    - from: n3
      to: n5
      relation: primary
    - from: n4
      to: n5
      relation: primary
    - from: n5
      to: n6
      relation: primary
    - from: n1
      to: n5
      relation: guard
      label: 边界约束
    - from: n6
      to: n7
      relation: primary
    - from: n8
      to: n3
      relation: dependency
      label: 退出能力
    - from: n8
      to: n4
      relation: dependency
      label: 迁移路径
  groups:
    - id: g1
      label: 输入与决策
      kind: boundary
    - id: g2
      label: 平台与框架能力
      kind: boundary
    - id: g3
      label: 自研系统边界
      kind: boundary
    - id: g4
      label: 治理与退出
      kind: boundary
questions:
  - id: d05-q1
    type: single
    concept: build-vs-buy
    weight: 30
    prompt: 平台选型最优先考虑的因素是什么？
    scenario: 团队需要在 3 周内为销售团队交付一个知识库问答原型，有 1 名后端工程师和 1 名前端工程师，数据必须存在私有服务器。
    explanation: 平台选型要先列约束（交付时间、团队规模、合规要求）再选工具，而不是按热度或演示效果；约束优先才能避免选了控制很深但交付很慢的框架，或选了无法满足合规要求的云服务。
    options:
      - id: a
        label: 选最热门的框架，因为社区资源多
        correct: false
      - id: b
        label: 先列交付时间、团队规模、合规要求等约束，再按约束选工具
        correct: true
      - id: c
        label: 直接选控制最深的框架，未来扩展方便
        correct: false
  - id: d05-q2
    type: single
    concept: abstraction
    weight: 25
    prompt: 设计 provider adapter 层的核心目的是什么？
    scenario: 团队正在搭建模型调用层，负责人提议业务代码直接调用 OpenAI SDK，"以后再重构"。
    explanation: adapter 层让业务代码与具体 provider API 解耦；没有 adapter，切换模型或供应商时需要修改大量业务代码，且容易引入 bug；"以后再重构"在 AI 能力快速演进的环境下代价极高。
    options:
      - id: a
        label: 让代码看起来更优雅，纯美学考虑
        correct: false
      - id: b
        label: 隔离业务代码与 provider 差异，降低切换成本
        correct: true
      - id: c
        label: 减少所有系统的数据库依赖
        correct: false
  - id: d05-q3
    type: single
    concept: migration
    weight: 25
    prompt: 下列哪种框架选择最适合"3 名前端工程师、1 名后端工程师、需要在 4 周内交付流式 AI 写作工具"的场景？
    scenario: 团队在比较 LangGraph（图式状态机引擎）和 Vercel AI SDK（流式 UI 框架），需要选择更适合当前阶段的工具。
    explanation: 当团队主要是前端工程师、交付时间紧、需要流式 UI 时，Vercel AI SDK 是更适合的选择——它解决团队最核心的问题（流式输出和 provider 抽象）且学习成本低；LangGraph 解决的是持久化状态机问题，当前需求不需要。
    options:
      - id: a
        label: LangGraph，因为它功能更全，未来更容易扩展
        correct: false
      - id: b
        label: Vercel AI SDK，匹配团队前端技术栈和流式 UI 需求
        correct: true
      - id: c
        label: 完全自研，避免任何框架依赖
        correct: false
  - id: d05-q4
    type: single
    concept: team-fit
    weight: 20
    prompt: 使用可视化平台（如 Dify）时，哪些逻辑应该放在自研后端而不是平台的代码节点里？
    scenario: 团队用 Dify 搭建了销售助手，工具需要查询 CRM 和写入合同数据库；有人建议把 CRM 查询逻辑直接写在 Dify 的 Python 节点里。
    explanation: 核心权限校验、数据写入、审计日志和业务规则必须留在自研后端；可视化平台适合编排逻辑，不适合托管核心业务代码和敏感密钥；一旦平台出问题或迁移时，业务代码也一起受影响。
    options:
      - id: a
        label: 把所有业务逻辑写在平台的代码节点里，方便统一管理
        correct: false
      - id: b
        label: 权限校验、数据写入和审计日志留在自研后端 API，平台只做编排
        correct: true
      - id: c
        label: 平台做的事情越多越好，减少自研工作量
        correct: false
rubric:
  - id: rb05-1
    criterion: 能为给定团队现状和业务约束填写选型矩阵，说明选型理由而不只是功能列表对比
  - id: rb05-2
    criterion: 能设计 provider adapter 接口，说明业务代码如何与 provider API 解耦
  - id: rb05-3
    criterion: 能说明哪些逻辑必须留在自研服务（权限、审计、数据写入），哪些可以放在平台（编排、流式 UI）
references:
  - label: Dify 官方文档
    url: https://docs.dify.ai/
    note: 开源可视化 AI 工作流平台文档，覆盖知识库配置、工具节点、私有化部署和 API 集成
  - label: Vercel AI SDK 官方文档
    url: https://sdk.vercel.ai/docs
    note: TypeScript AI 应用开发 SDK，提供流式 UI、多 provider 抽象和工具调用支持
  - label: LangGraph 概念文档
    url: https://langchain-ai.github.io/langgraph/concepts/
    note: 图式状态机工作流引擎，适合持久化、可恢复的多步骤 Agent；包含 checkpoint 和 human-in-the-loop 的核心概念
  - label: OpenAI Agents SDK 文档
    url: https://platform.openai.com/docs/guides/agents-sdk
    note: 提供 Agent 原语、工具定义、handoff 和 guardrails，适合构建生产级 Agent 系统
---

# 笔记
占位
