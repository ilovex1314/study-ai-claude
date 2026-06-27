---
id: day03
phase: Day03
stage: AI 产品基础
capability: 设计带工具/状态/trace/人工确认的执行循环
title: Agent loop 与 workflow control
summary: 区分 Agent 与 Workflow，设计工具调用、状态持久化、guardrails、human-in-the-loop 和可恢复执行链路。
capabilityGoal: 能为业务场景画出 Agent 状态图，标注每个节点的工具权限、guardrail 检查点、checkpoint 策略和人工确认触发条件。
verifiableOutput: 一份 Agent 状态图，包含目标、步骤节点、工具调用节点、checkpoint、人工确认节点和失败补偿路径。
mentalModel: Agent 是目标驱动的执行循环，不是聊天框加工具；自主性越高，系统边界和 guardrails 越重要。
walkthrough: PRD 评审 Agent 接收一份产品需求文档，先解析文档结构并制定评审计划（plan 节点，模型决策）；逐步调用工具——搜索历史 issue（read-only 工具）、检索相关技术文档（read-only 工具）、生成风险清单（模型生成）；在写入项目管理系统之前，系统检查工具权限（policy check），发现"创建 Jira 任务"属于写入操作，触发 guardrail 暂停并向产品经理发送确认请求；确认后 Agent 从 checkpoint 恢复，调用 Jira API 创建任务，每步结果写入 step log 并关联 runId；若中途 API 超时，从最后一个 checkpoint 重启，不重复已完成步骤。
modules:
  - id: d03-m1
    title: Agent 是围绕目标选择步骤的执行体
    concept: loop
    idea: Agent 根据目标、上下文和工具反馈动态决定下一步行动，能处理步骤不完全确定的任务；但它不是"更聪明的聊天"，而是一个有停止条件、有状态、有工具的执行循环。
    whyItMatters: 把 Agent 当聊天框理解会导致没有停止条件、没有状态恢复和没有审计；把它当后端函数理解会低估自主性带来的系统风险。
    engineerLens: 每个 Agent 实例都要有 runId、目标定义、工具列表、停止条件（成功/失败/超时/人工接管）和 state schema；不要让 Agent 在无限循环里消耗资源和预算。
    productionExample:
      context: 某电商公司的商品上架审核 Agent，每天处理 2000 件商品图文审核。
      whatTheyDid: Agent 流程定义为：读取商品图文（read-only）、调用合规检查工具（确定性规则）、生成问题清单（模型生成）、若问题超过阈值则暂停给运营确认；每个步骤有超时上限，连续 3 次工具失败自动转人工队列，每次 run 保存完整 step log。
      outcome: 日均处理量从人工的 600 件提升至 1800 件，误判率与纯人工持平，所有 AI 决策都有 step log 可追溯，首月零客诉升级。
    counterExample:
      context: 某团队给模型一个 GitHub token 让它"自主修复线上 bug"。
      antiPattern: 没有定义停止条件、没有 diff 审核、没有测试验证、没有权限限制，让模型自由提交代码。
      consequence: 模型"修复"了一个 bug 的同时意外删除了 3 个文件，且没有人工确认节点；回滚后才发现问题，排查耗时半天。
    pitfalls:
      - symptom: Agent 没有停止条件，在目标不明确时无限循环
        fix: 定义 max_steps、max_tokens_budget 和明确的成功/失败判断条件，超限自动终止并转人工
      - symptom: 失败后不知道从哪里重启
        fix: 每步完成后写入 checkpoint，重启时从最后一个成功 checkpoint 恢复，而不是从头开始
  - id: d03-m2
    title: Workflow 用确定性流程包住模型节点
    concept: tool
    idea: 当流程可以预先定义、风险高、审计要求严格时，应优先用 workflow 明确每个节点的输入、输出和跳转条件，模型只处理其中不确定的部分；确定性流程比自主 Agent 更便宜、更稳定、更可审计。
    whyItMatters: 不是所有自动化都需要 Agent；让 Agent 决定所有流程跳转会把本应确定性的控制逻辑交给概率系统，增加不可预期的执行路径。
    engineerLens: 先画业务状态机，再判断哪些节点的跳转条件是确定性的（用规则）、哪些需要语义判断（用模型）；模型节点的输入输出要有 schema，跳转条件由系统代码执行。
    productionExample:
      context: 某企业的报销审批工作流，日均处理 500 笔报销申请。
      whatTheyDid: 整体流程是确定性状态机（提交、OCR 识别、规则校验、金额审批、财务处理）；只有 OCR 识别结果不确定的字段用模型补全，补全结果须通过规则校验；所有跳转条件（金额阈值、审批层级）完全由业务规则引擎控制，模型不参与流程决策。
      outcome: 审批周期从平均 3.2 天缩短至 0.8 天，OCR 补全准确率 97.3%，所有审批路径可完整追溯，符合财务合规要求。
    counterExample:
      context: 某公司把整个报销审批流程交给 Agent，让模型"根据情况决定下一步"。
      antiPattern: Agent 在某次高额报销中自行判断"金额合理"跳过了二级审批，没有触发人工复核阈值。
      consequence: 一笔虚假报销通过了 AI 审批，内审发现后追责困难，无法确认哪步审批逻辑被绕过，最终被迫下线 AI 功能进行安全审计。
    pitfalls:
      - symptom: 让模型决定所有分支跳转，包括"是否需要人工审核"
        fix: 人工审核触发条件必须是确定性规则（金额阈值、风险等级、异常标志），不依赖模型输出
      - symptom: Workflow 的状态只存在 prompt 里，重启后丢失
        fix: Workflow 状态持久化到数据库，每个节点的输入输出和状态转换都有独立记录
  - id: d03-m3
    title: 状态、上下文和长期记忆分层管理
    concept: state
    idea: Agent run state（本次执行的步骤和 checkpoint）、短期上下文（本轮请求可见信息）、长期偏好（用户设置和历史决策）和知识库是四个完全不同的存储层，混淆会导致不可恢复、不可解释和隐私风险。
    whyItMatters: 没有分层设计的 Agent 在重启后无法恢复到正确状态，在隐私审计时无法证明数据边界，在 debug 时无法确定问题来自哪一层。
    engineerLens: 设计 AgentRun 表：runId（UUID）、goal、status（running/paused/completed/failed）、steps（数组，每步有 tool_name、input、output、timestamp）、checkpoint（最后一个成功步骤的状态快照）、error_log；分层存储，不要把所有内容塞进 messages 数组。
    productionExample:
      context: 某招聘平台的 AI 面试助手，需要在多轮对话中维护候选人评估进度。
      whatTheyDid: run state 存在 PostgreSQL（runId、步骤、当前阶段、工具结果），短期上下文由后端按需组装（只取当前步骤相关的 3~5 条消息），候选人长期偏好存在独立的 user_profile 表，知识库（面试题库）按独立检索服务提供；每层有独立的清理和权限策略。
      outcome: 助手可在网络中断后从任意步骤恢复，候选人数据生命周期管理符合 GDPR 要求，debug 时可精确定位是哪层数据出了问题。
    counterExample:
      context: 某 Agent 把所有历史对话、工具结果、用户偏好和 checkpoint 都塞进 messages 数组。
      antiPattern: 随着对话增长，上下文超出窗口限制，系统开始截断历史，导致 Agent 忘记早期步骤的工具结果。
      consequence: Agent 重复调用了同一个工具三次（因为截断导致忘记已有结果），产生三份重复订单；无法从审计日志确认哪步出错，系统重新设计耗时 5 周。
    pitfalls:
      - symptom: Agent 重启后从头开始，已完成的工具调用重复执行
        fix: 每个工具调用完成后立即写入 checkpoint，重启时解析 checkpoint 跳过已完成步骤
      - symptom: 用户敏感数据（对话内容）混入 run state，难以实现按需删除
        fix: 用户 PII 单独存储并关联 userId，run state 只存工具输入输出的结构化字段
  - id: d03-m4
    title: Guardrails 是输入、工具和输出的分层防护
    concept: approval
    idea: Guardrails 不只是过滤违规文字，而是包含三层防护：输入 guardrail（拦截非法目标和注入攻击）、工具 guardrail（鉴权、副作用评估、人工确认触发）和输出 guardrail（格式校验、敏感信息检测、风险结论拦截）。
    whyItMatters: Agent 能调用工具后，安全问题从文本质量变成系统风险；一次权限越界的工具调用可能造成数据泄露、资产损失或不可逆的业务状态变更。
    engineerLens: 为每个工具定义 guardrail 配置：permission_required（需要的权限级别）、requires_confirmation（是否需要人工确认）、side_effect（写入/删除/外发）、idempotent（是否幂等）；高风险工具（有写入副作用、操作不可逆）必须在系统代码中强制 policy check，不依赖模型自觉。
    productionExample:
      context: 某 SaaS 公司的运维 Agent，帮助工程师排查和修复线上问题，工具集包含数据库查询、日志搜索、服务重启和配置修改。
      whatTheyDid: 工具分级：read-only 工具（日志搜索、数据库只读查询）无需确认自动执行；write 工具（服务重启、配置修改）必须生成操作摘要并等待工程师确认；delete 工具（数据清理）需要双人审批；所有工具调用记录在审计 log，结构化存储便于事后分析。
      outcome: 六个月运行期间，write 工具触发了 847 次人工确认请求，其中 63 次（7.4%）被工程师否决，避免了潜在的错误操作；零安全事故。
    counterExample:
      context: 某内部数据分析 Agent，工具列表包含数据库写入和外部 API 调用，没有 guardrail。
      antiPattern: 在 prompt 里写"不要删除数据"，相信模型会遵守；没有在系统代码中区分 read 和 write 工具的执行路径。
      consequence: 模型在一次数据清理任务中误解指令，调用了"archive"工具（实现为软删除），将 3000 条生产数据标记为已归档；发现时已过了备份窗口，部分数据永久丢失。
    pitfalls:
      - symptom: Guardrail 只在 prompt 层实现，没有系统代码强制
        fix: 工具执行前由系统代码检查 permission、side_effect 和 requires_confirmation，模型生成的意图只是输入
      - symptom: 人工确认触发条件不清晰，导致要么确认过多让用户疲劳，要么漏掉高风险操作
        fix: 定义清晰的确认触发规则：有写入副作用、操作不可逆、涉及外部系统或金额超阈值时强制确认
decisionLayers:
  - id: dl03-1
    name: 执行形态选择
    question: 这个任务适合 Agent 还是 Workflow？
    choices:
      - name: Agent 执行循环
        description: 步骤不完全确定、需要模型根据工具反馈动态调整计划，适合探索性和多步骤决策任务。
        example: 调查异常订单：Agent 根据日志结果决定下一步查哪个服务，步骤不可预先完全定义。
      - name: Workflow 确定性流程
        description: 流程可预先定义、风险高、需要强审计，模型只处理其中语义不确定的节点，其他跳转由规则控制。
        example: 报销审批：规则控制金额阈值和审批层级，模型只做 OCR 补全，跳转逻辑完全确定性。
  - id: dl03-2
    name: 工具执行安全
    question: 工具调用前必须检查什么？
    choices:
      - name: 权限加副作用检查
        description: 系统代码验证调用方是否有权限、工具是否有写入或删除副作用、是否需要人工确认；不依赖模型判断。
        example: 调用"发送邮件"工具前，检查发件人权限、收件人白名单和是否触发确认阈值。
      - name: Schema 加幂等键
        description: 工具参数严格 schema 校验，高风险工具携带幂等键防止重试重复执行副作用。
        example: 退款工具携带 idempotency_key=order_id+attempt_id，确保重试不重复退款。
  - id: dl03-3
    name: 状态与恢复
    question: 如何保证 Agent 可恢复、可审计？
    choices:
      - name: Checkpoint 持久化
        description: 每步完成后立即写入结构化 checkpoint，包含已完成的工具结果和当前状态；重启时从 checkpoint 恢复而不是从头执行。
        example: 邮件发送成功后写入 checkpoint，网络中断后重启跳过发送步骤，直接进入下一步。
      - name: Trace 与 Step Log
        description: 记录每个 LLM generation、tool call、guardrail event 和 handoff，关联 runId，支持按执行链路全量排查。
        example: 按 runId 查询某次失败 run 的完整 trace，确认是工具超时还是模型输出格式错误。
architecture:
  type: state
  summary: 展示 Agent 执行循环的状态转换，包含正常执行、工具调用、checkpoint 保存、人工确认暂停和失败恢复路径。
  conclusion: Agent 状态机的核心是让每个状态都可持久化、可恢复、可审计；人工确认和 guardrails 是系统边界，不是可选项。
  nodes:
    - id: n1
      label: 任务进入与目标解析
      tone: accent
      group: g1
    - id: n2
      label: 制定执行计划
      tone: neutral
      group: g1
    - id: n3
      label: 选择并调用工具
      tone: neutral
      group: g1
    - id: n4
      label: Guardrail 权限与副作用检查
      tone: warning
      group: g2
    - id: n5
      label: 保存 Checkpoint
      tone: system
      group: g2
    - id: n6
      label: 人工确认等待
      tone: warning
      group: g2
    - id: n7
      label: 观察结果并更新状态
      tone: neutral
      group: g1
    - id: n8
      label: 恢复或补偿执行
      tone: system
      group: g3
    - id: n9
      label: 任务完成与审计记录
      tone: success
      group: g3
  edges:
    - from: n1
      to: n2
      relation: primary
    - from: n2
      to: n3
      relation: primary
    - from: n3
      to: n4
      relation: primary
    - from: n4
      to: n5
      relation: branch
      label: 低风险通过
    - from: n4
      to: n6
      relation: guard
      label: 高风险暂停
    - from: n6
      to: n5
      relation: primary
      label: 确认后继续
    - from: n5
      to: n7
      relation: primary
    - from: n7
      to: n2
      relation: primary
      label: 继续下一步
    - from: n7
      to: n9
      relation: primary
      label: 目标完成
    - from: n5
      to: n8
      relation: branch
      label: 工具失败恢复
    - from: n8
      to: n3
      relation: primary
      label: 从 checkpoint 重试
  groups:
    - id: g1
      label: 正常执行状态
      kind: lane
    - id: g2
      label: 暂停与确认状态
      kind: lane
    - id: g3
      label: 终止与补偿状态
      kind: lane
questions:
  - id: d03-q1
    type: single
    concept: loop
    weight: 25
    prompt: Agent 相比普通 Chat 的关键架构差异是什么？
    scenario: 产品经理问工程师："我们的客服 Bot 里加了工具调用，算不算 Agent？"
    explanation: Agent 的核心特征是围绕目标维护状态并基于工具反馈动态决定下一步，有停止条件和 run state；仅仅有工具调用但没有目标驱动的状态机，更接近带工具的 Chat。
    options:
      - id: a
        label: Agent 只是输出更长的文本，没有本质区别
        correct: false
      - id: b
        label: Agent 围绕目标维护执行状态，基于工具反馈动态选择下一步
        correct: true
      - id: c
        label: Agent 完全不需要系统边界控制，模型自己管理权限
        correct: false
  - id: d03-q2
    type: single
    concept: tool
    weight: 25
    prompt: 什么情况下应该优先用 Workflow 而不是 Agent？
    scenario: 团队需要实现一个合同审批流程：法务部门签字、金额超 10 万需要 CFO 确认、存档到合规系统。
    explanation: 合同审批流程的节点和跳转条件（金额阈值、审批层级）可以预先完全定义，风险高且审计要求严格，应该用 workflow；让 Agent 自主决定是否需要 CFO 确认会引入不可预期的执行路径。
    options:
      - id: a
        label: 任务步骤不确定，适合 Agent 自主决定每步操作
        correct: false
      - id: b
        label: 流程可预先定义、风险高、审计要求严格
        correct: true
      - id: c
        label: 只想更换界面颜色，不需要任何 AI
        correct: false
  - id: d03-q3
    type: single
    concept: state
    weight: 25
    prompt: 为什么 Agent run state 必须持久化到数据库，而不是只存在 prompt messages 里？
    scenario: 某 Agent 在执行第 5 步工具调用时网络中断，重启后需要从第 5 步继续而不是从头开始。
    explanation: run state 持久化到数据库才能实现跨进程恢复、精确 checkpoint 和审计追溯；存在 messages 里会随上下文截断而丢失，也无法支持并发访问和权限隔离。
    options:
      - id: a
        label: 数据库存储让 UI 界面更圆润，纯审美需要
        correct: false
      - id: b
        label: 支持跨进程恢复、精确 checkpoint 和完整审计追溯
        correct: true
      - id: c
        label: 减少所有数据库表，让系统更简单
        correct: false
  - id: d03-q4
    type: single
    concept: approval
    weight: 25
    prompt: 工具调用前最关键的系统级职责是什么？
    scenario: Agent 生成了"删除用户账户"的工具调用意图，系统需要决定如何处理。
    explanation: 高风险工具调用前，系统必须在代码层面检查调用方权限、校验参数 schema、评估副作用级别、触发人工确认（如需要）；仅靠 prompt 里的"不要乱删"无法提供系统级保证。
    options:
      - id: a
        label: 相信模型已经判断过安全性，直接执行
        correct: false
      - id: b
        label: 系统代码检查权限、校验参数、评估副作用、按需触发人工确认
        correct: true
      - id: c
        label: 把工具名称改得更长更明确，提示模型谨慎
        correct: false
rubric:
  - id: rb03-1
    criterion: 能画出包含 plan、tool call、checkpoint、human approval 和 failure recovery 节点的 Agent 状态图
  - id: rb03-2
    criterion: 能说明 Workflow 和 Agent 的适用边界，并为给定业务场景选择合适的执行形态
  - id: rb03-3
    criterion: 能为至少一个工具定义 guardrail 配置，包含 permission、side_effect、requires_confirmation 和 idempotent 字段
references:
  - label: OpenAI Agents SDK 官方文档
    url: https://platform.openai.com/docs/guides/agents-sdk
    note: 介绍 Agent 原语、工具定义、handoff 和 guardrails 的生产级实现
  - label: OpenAI Agents SDK Guardrails
    url: https://openai.github.io/openai-agents-python/guardrails/
    note: 详细说明输入、工具和输出 guardrail 的配置和触发机制
  - label: LangGraph human-in-the-loop 文档
    url: https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/
    note: 介绍 checkpoint、interrupt/resume 和持久化状态的实现模式
  - label: Anthropic Agent 设计最佳实践
    url: https://docs.anthropic.com/en/docs/build-with-claude/tool-use/implement-tool-use
    note: 覆盖工具 schema 设计、副作用控制和安全工具调用的官方指南
---

# 笔记
占位
