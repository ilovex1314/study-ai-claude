---
id: day07
phase: Day07
stage: 平台与知识系统
capability: 设计 checkpoint、interrupt/resume 与恢复链路
title: 复杂编排与可恢复执行
summary: 用 LangGraph 构建带 checkpoint、human-in-the-loop interrupt 和 durable execution 的多步骤 Agent，让长任务可暂停、可恢复、可解释。
capabilityGoal: 能设计一套 durable workflow 状态图，包含 checkpoint 字段定义、interrupt 触发条件、resume 恢复路径和补偿逻辑，并说明如何在 CI 中验证它。
verifiableOutput: durable workflow 状态图文档，包含节点定义、边条件、checkpoint schema、interrupt 触发规则和失败补偿路径。
mentalModel: 把长任务当 workflow run 管理，checkpoint 是 resume 和审计的基础，human interrupt 是系统设计中的审批状态转换。
walkthrough: >
  某团队需要为 B2B 合同审查 Agent 设计可恢复执行链路：Agent 需要执行"解析合同 -> 风险扫描 -> 法务确认 -> 生成摘要"四步，
  每步平均 2-5 分钟，总时长可能超过 10 分钟。传统做法把全部步骤放在一次 API 调用里，任何一步失败就从头重来，
  法务确认也只能靠 prompt 要求"先问用户"。
  工程师改用 LangGraph：每个节点执行后写 checkpoint（runId、nodeId、输入输出摘要、下一步、timestamp）；
  风险扫描节点发现高风险条款时触发 interrupt，工作流暂停、推送通知给法务人员，等待人工 APPROVE/REJECT/EDIT；
  法务确认后恢复执行，恢复输入经 schema 校验后继续；
  网络故障导致"生成摘要"节点失败时，从上一个成功 checkpoint 恢复，不重复执行已完成的法务确认步骤。
  验收：模拟节点失败 5 次，均能从正确 checkpoint 恢复；interrupt 产生的审批记录写入 audit_log；状态图在 UI 可视化展示。
modules:
  - id: d7-m1
    title: Durable execution 让长任务可恢复
    concept: checkpoint
    idea: >
      durable execution 要求每个执行步骤在完成后将状态持久化，使任务在失败、重启、网络中断或人工暂停后
      能从最近的成功状态继续，而不是从头重来。这是复杂 Agent 的生存基础。
    whyItMatters: >
      Agent 任务越复杂，执行时间越长，中途失败的概率越高。一个需要 15 分钟的合同审查 Agent，
      在第 14 分钟因 provider 超时失败，如果从头重来不但浪费成本，还破坏幂等性（已发出的邮件通知会重发）。
      durable execution 把失败的代价从"重来"降为"从上一步继续"。
    engineerLens: >
      LangGraph 的 MemorySaver / PostgresSaver 在节点边界自动持久化 state。
      自研 workflow 最小实现：节点执行后 upsert run_checkpoints 表（runId、nodeId、state JSON、created_at），
      恢复时 SELECT WHERE runId=? ORDER BY created_at DESC LIMIT 1，从 nextNode 继续。
      副作用工具（发邮件、写数据库）必须幂等：先查 outbox 是否已执行。
    productionExample:
      context: 某法律科技公司的合同风险 Agent，平均执行 12 分钟，每月处理 5,000 份合同。
      whatTheyDid: >
        用 LangGraph PostgresSaver 在每个节点边界写 checkpoint；
        部署到 Kubernetes 后 pod 因 OOM 重启时，新 pod 从数据库读取最新 checkpoint 继续执行；
        副作用节点（发 Slack 通知）用 outbox pattern 保证幂等：先插 outbox 记录，worker 消费后标记 sent。
      outcome: >
        月均 pod 重启 23 次，用户无感知；从头重试率从 18% 降至 0.3%；
        每月节省约 $2,400 重复 token 成本。
    counterExample:
      context: 某团队的文档处理 Agent 把 10 个步骤写在一个 500 行函数里，没有 checkpoint。
      antiPattern: 所有步骤在内存里串行执行，没有状态持久化，失败时 print("重试中")然后从头调用整个函数。
      consequence: >
        文档处理步骤 7 失败（PDF 解析超时）后从头重来，步骤 3 的"发送用户欢迎邮件"重复执行；
        用户收到 3 封相同邮件并投诉；因为没有 trace，工程师花 4 小时才定位到重复发邮件的根因。
    pitfalls:
      - symptom: 工具调用在 resume 后重复执行，副作用发生两次
        fix: 副作用工具实现幂等键（idempotency_key = runId + nodeId），执行前检查 outbox/run_events 表
      - symptom: checkpoint 数据量过大（包含完整对话历史），导致存储和读取变慢
        fix: checkpoint 只存最小必要状态（当前 nodeId、待处理输入、工具结果摘要），完整日志写 append-only run_events
  - id: d7-m2
    title: Checkpoint 是恢复和审计的基础
    concept: interrupt
    idea: >
      checkpoint 不只是"保存进度"，它同时承担审计职责：记录节点状态、输入输出摘要、工具结果、
      下一步位置和执行时间，让人和系统都能理解"这个 run 到底做了什么、哪一步出了问题"。
    whyItMatters: >
      没有 checkpoint，human-in-the-loop 只能靠前端弹窗和模型 prompt 联合维持，
      一旦页面刷新或网络断开就丢失确认状态；失败恢复时无法知道上次停在哪里；
      审计时无法证明"法务确认"真的发生过，还是 Agent 跳过了。
    engineerLens: >
      checkpoint schema 最小字段：
      { runId, nodeId, status: running|paused|completed|failed, inputHash, outputHash, nextNode, pauseReason?, approvalPayload?, createdAt }。
      敏感数据（合同原文）不进 checkpoint，只存 documentId 引用。
      checkpoint 版本要向前兼容：新增字段用可选字段，不能删除已有字段（旧 run 恢复需要）。
    productionExample:
      context: 某招聘平台的 AI 简历筛选 workflow，需要证明每份候选人档案都经过相同评估标准。
      whatTheyDid: >
        每个评估节点（技能匹配、经历分析、综合打分）执行后写 checkpoint，
        包含 evaluatorVersion（prompt hash）、modelId、inputHash、scoreVector。
        HR 审计时可以查任意 runId 的完整评估路径，证明没有人为干预打分过程。
      outcome: 通过 ISO 27001 内部审计；3 次候选人投诉均能在 30 分钟内提供完整评估链路证明。
    counterExample:
      context: 某 Agent 的 checkpoint 包含完整的 messages 数组（含 system prompt 和所有历史），每条 500KB。
      antiPattern: checkpoint 数据膨胀，包含明文 API Key（工具鉴权 token 直接写入 state）。
      consequence: 存储成本月增 $800，读取 checkpoint 耗时从 20ms 升至 1.2s；密钥泄露后安全团队要求立即清除所有历史 checkpoint 数据，影响 200 个进行中的 run。
    pitfalls:
      - symptom: 新部署后旧 run 无法恢复（字段变更不兼容）
        fix: checkpoint schema 版本化（加 schemaVersion 字段），恢复时 migrate 旧格式
      - symptom: checkpoint 包含敏感数据（密钥、PII）
        fix: 敏感数据用引用（userId、documentId）替代，实际数据存授权系统
  - id: d7-m3
    title: Human interrupt 把人接入关键节点
    concept: resume
    idea: >
      human interrupt 是 workflow 中的一类正常状态转换：当风险、权限或质量超过自动化阈值时，
      流程主动暂停，将决策权交给人，等待人的 APPROVE/REJECT/EDIT 输入后恢复继续。
      人不是失败兜底，而是系统设计中的审批节点。
    whyItMatters: >
      没有 interrupt 机制时，有两种糟糕结果：1）Agent 对高风险动作直接执行（越权）；
      2）用 prompt 要求"先问用户"，但 LLM 不能保证一定执行这条指令，且无法追踪是否真的询问过。
      显式 interrupt 状态转换让审批变成系统事件，有记录、有超时、有可追溯的确认结果。
    engineerLens: >
      LangGraph interrupt 实现：在节点内调用 interrupt(payload)，工作流暂停，
      状态写为 { status: 'awaiting_human', payload, notifiedAt }；
      通知系统推送 webhook/email/Slack；人工操作后调 Command.RESUME(approvalResult)；
      恢复时 schema 校验 approvalResult（不接受任意 JSON），校验通过后继续下一节点；
      审批记录写 audit_log（approver、decision、timestamp、runId、nodeId）。
    productionExample:
      context: 某采购 AI Agent 能生成采购申请并提交到 ERP，金额超过 10 万元时需财务审批。
      whatTheyDid: >
        "金额校验"节点计算总价，超过阈值时 interrupt({ type: 'budget_approval', amount, items, requesterId })；
        财务人员收到飞书消息，点击"审批"或"拒绝"，附上审批意见；
        resume 恢复后将审批结果（approver、decision、comment）写 audit_log，然后继续"提交 ERP"节点。
        审批超时（48h 无响应）自动 escalate 到部门主管。
      outcome: >
        月均处理 1,200 份采购申请，人工审批覆盖 340 份高金额单据；
        所有审批可追溯，配合 ERP 对账精准度从 94% 提升到 99.7%。
    counterExample:
      context: 某 Agent 用 prompt 写"在金额超过 5 万时，先问用户是否确认再继续"。
      antiPattern: 依赖 LLM 遵守 prompt 里的审批指令，没有 interrupt 状态，没有等待机制，没有审批记录。
      consequence: >
        模型在某次调用中跳过了"先问"步骤，直接提交了 $87,000 的采购单；
        审计时无法证明是否询问过用户，因为 prompt 遵守与否没有任何记录。
    pitfalls:
      - symptom: 人工超时后 run 永久卡在 awaiting_human 状态
        fix: 设置 interrupt 超时（如 72h），超时触发 escalate 或 auto_reject，并写 timeout_event 记录
      - symptom: 恢复时接受任意 JSON，被注入恶意审批内容
        fix: resume 入参做严格 schema 校验（Zod/JSON Schema），拒绝不符合格式的恢复请求
  - id: d7-m4
    title: 状态图让复杂编排可解释
    concept: compensation
    idea: >
      用显式的节点（node）、边（edge）、条件边（branch）和错误边（compensation）描述多步骤任务，
      把系统责任从"模型按 prompt 执行"迁回到"工程结构定义流程"，让任何工程师都能读懂 Agent 做什么。
    whyItMatters: >
      把复杂编排写进一段 prompt 有三个问题：1）模型不能保证遵循每一步；
      2）流程无法测试（不知道在步骤 3 卡住该怎么排查）；3）新工程师无法理解和维护。
      状态图把流程变成工程制品，可以画图、可以测试、可以 code review。
    engineerLens: >
      先画图再写代码：用 Mermaid 或 LangGraph 图形接口定义节点和边，
      每个节点职责单一（单一职责原则），错误边和补偿边显式存在（不靠 try-catch 掩盖）。
      分支边（branch/guard）明确分叉条件：如 risk_level >= HIGH 走 human_review，否则走 auto_approve。
      补偿节点处理回滚：如"提交 ERP 失败"触发补偿节点"撤销采购申请"。
    productionExample:
      context: 某内容平台的 AI 文章发布 workflow，包含生成、审核、SEO 优化、发布四步。
      whatTheyDid: >
        用 LangGraph 定义 4 个节点 + 2 条分支边（内容审核不通过走 reject 节点）+ 1 条补偿边（发布失败回退草稿状态）。
        状态图导出为 Mermaid 图形，写进 README，新工程师 5 分钟能理解整个流程。
        每个节点有独立单测，模拟"审核失败"时正确触发 reject 节点。
      outcome: >
        上线 6 个月零重大事故；onboarding 新工程师平均 1 天能独立改动 workflow 节点；
        曾经的 bug（发布失败后文章仍显示"已发布"）在加入补偿节点后完全消除。
    counterExample:
      context: 某团队把完整的 6 步流程写在一个 system prompt 里，用 LLM 的 reasoning 来决定执行哪一步。
      antiPattern: 流程逻辑全在 prompt，工程结构里没有节点定义，所有步骤在一次长对话里混杂执行。
      consequence: >
        模型在高负载时跳过了"数据脱敏"步骤，导致用户隐私数据写入了公开报告；
        排查花了 2 天，因为没有步骤粒度的 trace，只能逐行分析 LLM 输出。
    pitfalls:
      - symptom: 节点混合了检索、模型调用、工具执行三种职责，出问题无法定位
        fix: 单一职责：一个节点只做一件事（retrieve_docs、call_model、execute_tool 分三个节点）
      - symptom: 没有错误边，工具失败后 workflow 静默挂起
        fix: 显式定义 error 边，工具失败时转入 handle_error 节点，记录失败原因并决定重试或终止
decisionLayers:
  - id: dl1
    name: 持久化策略
    question: 如何决定 checkpoint 的粒度和存储位置？
    choices:
      - name: 节点边界 checkpoint（推荐）
        description: 每个 LangGraph 节点执行完后自动写 checkpoint，使用 PostgresSaver 或 RedisSaver。
        example: LangGraph 内置 PostgresSaver，配置后无需手动写存储逻辑，节点天然成为恢复单元。
      - name: 自定义 checkpoint 点
        description: 在节点内部的关键子步骤也写 checkpoint，适合单节点内部耗时较长的场景。
        example: PDF 解析节点在解析每 100 页后写一次 sub-checkpoint，避免大文件解析中途失败重来。
  - id: dl2
    name: Human interrupt 触发策略
    question: 什么条件下应该触发 human interrupt？
    choices:
      - name: 基于规则触发（确定性）
        description: 金额超过阈值、敏感数据访问、不可逆副作用等条件触发 interrupt，规则写在代码里。
        example: amount > 100000 OR action_type IN ('delete', 'publish', 'payment') 触发 interrupt。
      - name: 基于模型判断触发
        description: 让模型评估风险级别，超过 HIGH 时触发 interrupt，适合语义风险（如内容合规）。
        example: 模型给内容安全打分，score < 0.7 触发人工审核 interrupt，并附上具体风险说明。
  - id: dl3
    name: 补偿策略
    question: 节点失败时如何设计补偿和回滚？
    choices:
      - name: 重试 + 幂等补偿
        description: 失败节点重试（指数退避），副作用用幂等键防止重复执行。
        example: maxRetries=3，retry_delay=2^attempt 秒；write_to_erp 用 requestId 作幂等键。
      - name: 补偿节点回滚
        description: 不可重试的失败触发补偿节点，执行逆向操作恢复一致性状态。
        example: submit_order 失败 -> 触发 cancel_reservation 补偿节点，撤销已创建的库存预留。
architecture:
  type: state
  summary: 持久化 workflow 状态机，任务在节点间保存 checkpoint，可从任意节点中断、人工介入并从可靠检查点恢复继续。
  conclusion: checkpoint 是可恢复执行和可追溯审计的共同基础；interrupt 是系统设计中的显式审批状态，不是 prompt 里的一句话。
  nodes:
    - id: n1
      label: 启动任务（runId 分配）
      tone: neutral
      group: g1
    - id: n2
      label: 节点 A：解析文档
      tone: accent
      group: g1
    - id: n3
      label: 写 checkpoint A
      tone: system
      group: g1
    - id: n4
      label: 节点 B：风险扫描
      tone: accent
      group: g1
    - id: n5
      label: 写 checkpoint B
      tone: system
      group: g1
    - id: n6
      label: 高风险：触发 interrupt
      tone: warning
      group: g2
    - id: n7
      label: 等待人工审批
      tone: warning
      group: g2
    - id: n8
      label: 审批结果校验
      tone: system
      group: g2
    - id: n9
      label: 节点 C：生成摘要
      tone: accent
      group: g1
    - id: n10
      label: 失败补偿节点
      tone: warning
      group: g3
    - id: n11
      label: 完成并写结束 checkpoint
      tone: success
      group: g1
  edges:
    - from: n1
      to: n2
      relation: primary
    - from: n2
      to: n3
      relation: primary
      label: 节点完成持久化
    - from: n3
      to: n4
      relation: primary
    - from: n4
      to: n5
      relation: primary
    - from: n5
      to: n6
      relation: branch
      label: risk_level HIGH
    - from: n5
      to: n9
      relation: branch
      label: risk_level LOW
    - from: n6
      to: n7
      relation: guard
      label: 暂停等待
    - from: n7
      to: n8
      relation: primary
      label: 人工提交审批
    - from: n8
      to: n9
      relation: primary
      label: 审批通过
    - from: n8
      to: n10
      relation: branch
      label: 审批拒绝
    - from: n9
      to: n11
      relation: primary
    - from: n9
      to: n10
      relation: branch
      label: 生成失败
    - from: n10
      to: n1
      relation: feedback
      label: 补偿后可重试
  groups:
    - id: g1
      label: 正常执行路径
      kind: lane
    - id: g2
      label: 人工审批路径
      kind: lane
    - id: g3
      label: 失败补偿路径
      kind: lane
questions:
  - id: d7-q1
    type: single
    concept: checkpoint
    weight: 30
    prompt: 为什么 durable execution 要在每个节点边界写 checkpoint，而不是任务完成后写一次？
    scenario: 你的合同审查 Agent 在第 4 个节点（共 6 个）超时失败，用户要求尽快继续处理。
    explanation: 节点边界 checkpoint 使失败后从最近完成节点恢复，不重复执行已完成步骤；任务完成后写一次只能做全量重试，成本高且副作用工具会重复执行。
    options:
      - id: a
        label: 节点边界 checkpoint 会增加存储成本，建议只在任务完成后写
        correct: false
      - id: b
        label: 节点边界 checkpoint 让失败后从最近成功节点恢复，避免重试已完成步骤和重复执行副作用
        correct: true
      - id: c
        label: checkpoint 只用于审计，对恢复执行没有实质帮助
        correct: false
  - id: d7-q2
    type: single
    concept: interrupt
    weight: 25
    prompt: 把"高风险时先问用户"写在 system prompt 里，和用 interrupt 状态机实现，主要区别是什么？
    scenario: 你需要向合规团队证明"所有超过 10 万的采购单都经过人工审批"。
    explanation: prompt 里的指令 LLM 不能保证每次遵守，且无法产生可追溯的审批记录；interrupt 是系统状态转换，有持久化记录、超时机制和强制等待，审批结果写 audit_log 可供合规举证。
    options:
      - id: a
        label: prompt 方式更灵活，模型会自动判断什么时候需要问人
        correct: false
      - id: b
        label: interrupt 状态机强制等待人工确认并写审批记录，prompt 指令无法保证执行且无可追溯记录
        correct: true
      - id: c
        label: 两者效果相同，interrupt 只是额外的工程复杂度
        correct: false
  - id: d7-q3
    type: single
    concept: resume
    weight: 25
    prompt: resume 恢复执行时，为什么必须对人工输入做 schema 校验？
    scenario: 你的 interrupt 等待人工填写审批表单，表单通过 API 提交后触发 resume。
    explanation: 恢复输入不校验意味着攻击者或错误配置可以注入任意 JSON 影响后续节点行为（如修改金额、注入恶意工具参数）；schema 校验确保恢复输入符合预期格式，防止注入攻击。
    options:
      - id: a
        label: 人工输入来自可信用户，不需要额外校验
        correct: false
      - id: b
        label: schema 校验防止注入任意 JSON 影响后续节点，确保恢复输入格式正确可信
        correct: true
      - id: c
        label: 校验会延迟 resume 速度，不建议在时间敏感场景使用
        correct: false
  - id: d7-q4
    type: single
    concept: compensation
    weight: 20
    prompt: 状态图中"补偿节点"（compensation node）的作用是什么？
    scenario: 你的 workflow 在"提交 ERP"节点失败，此时已经在采购系统创建了采购申请记录。
    explanation: 补偿节点执行逆向操作恢复一致性状态（如撤销已创建记录）；没有补偿节点时，系统留下不一致的中间状态（有采购申请但没有 ERP 记录），需要人工清理。
    options:
      - id: a
        label: 补偿节点是重试失败操作的另一种方式
        correct: false
      - id: b
        label: 补偿节点执行逆向操作恢复系统到一致状态，处理无法重试的失败场景
        correct: true
      - id: c
        label: 补偿节点只记录错误日志，不做实际操作
        correct: false
rubric:
  - id: r1
    criterion: 能描述 durable execution 的核心机制（节点边界 checkpoint、副作用幂等、从最近 checkpoint 恢复）并举出具体场景
  - id: r2
    criterion: 能定义 checkpoint schema 的必要字段，说明哪些数据不应放入 checkpoint（密钥、PII 原文）
  - id: r3
    criterion: 能区分"prompt 里要求问用户"和"interrupt 状态机"的本质差别，说明 interrupt 如何产生可追溯审批记录
  - id: r4
    criterion: 能用节点、分支边和补偿边描述一个含 human-in-the-loop 的 workflow，并说明 resume 时的校验要求
references:
  - label: LangGraph Human-in-the-Loop 官方文档
    url: https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/
    note: LangGraph interrupt/resume 机制的权威参考，包含 checkpoint、Command.RESUME 和 Saver 接口的完整说明
  - label: LangGraph Persistence 与 Checkpointing
    url: https://langchain-ai.github.io/langgraph/concepts/persistence/
    note: 讲解 MemorySaver、PostgresSaver、RedisSaver 的差异和 checkpoint schema 结构，是实现 durable execution 的基础
  - label: Temporal Workflow 官方文档
    url: https://docs.temporal.io/develop/python
    note: Temporal 是另一套 durable execution 方案，对比阅读可深化对 checkpoint、saga 补偿和 activity 幂等设计的理解
  - label: LangGraph 状态图可视化
    url: https://langchain-ai.github.io/langgraph/how-tos/visualization/
    note: 如何将 LangGraph 状态图导出为 Mermaid 或 PNG 供团队 review，是"先画图再写代码"工作流的工具支撑
---

# 笔记
占位
