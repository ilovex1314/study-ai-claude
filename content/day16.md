---
id: day16
phase: Day16
stage: 生产化加固
capability: 为图片/语音/文本定义统一输入/异步处理/降级
title: 多模态与实时体验
summary: 为图片、语音与文本任务设计统一输入契约、异步任务队列、可复核引用锚点和体验降级方案。
capabilityGoal: 能为多模态任务定义统一 task/asset contract，设计异步处理流水线，提供证据锚点和实时失败降级路径。
verifiableOutput: 多模态任务编排图，包含输入契约、处理队列、证据锚点字段和降级状态机。
mentalModel: 多模态能力不是黑盒魔法，而是可观测、可复核、可降级的任务流水线。
walkthrough: 某企业知识工作台允许用户上传产品截图、录制问题描述音频和粘贴需求文本，要求系统为每种模态生成可追溯的 UI 问题列表。工程师先为三种输入统一设计 TaskContract（asset_id、modality、privacy_level、expected_output_schema），再将长时间的 OCR 和 ASR 处理推入 BullMQ 异步队列，通过 Server-Sent Events 向前端推进度事件；处理完毕后生成带坐标引用的截图批注和带时间戳跳转的音频转写；当实时语音链路延迟超过 3 秒时自动降级为上传后批处理并通过邮件通知用户，保证任务不丢失。
modules:
  - id: d16-m1
    title: 多模态输入统一为任务契约
    concept: multimodal-input
    idea: 不同模态的输入必须抽象为统一的 task/asset/metadata 结构，才能实现可维护的编排逻辑和隐私控制。
    whyItMatters: 若图片、音频、文本各自走独立流程，隐私分类、计费、审计和复核都会形成难以维护的分支逻辑，产品扩展速度将大幅下降。
    engineerLens: 先设计 TaskContract（asset_id、modality、content_url、privacy_level、tenant_id、expected_output_schema、ttl），再适配各模态的处理器；模态种类是实现细节，契约是工程约束。
    productionExample:
      context: 某 SaaS 质检平台处理来自工厂摄像头（图片）、检测报告（PDF 文本）和操作员录音（音频）三种输入。
      whatTheyDid: 统一为 AssetIngestionService，三种输入都经过 privacy_level 分类（public/internal/restricted）、asset_hash 去重和 tenant 隔离；每个 asset 生成唯一 asset_id，下游处理器按 modality 字段分叉路由。
      outcome: 新增视频模态时只需注册新处理器，契约层不改动；隐私审计通过 asset_id 一键追溯，合规成本下降 40%。
    counterExample:
      context: 某客服系统上线图片附件能力时，直接在对话 API 里塞 base64 图片并透传给模型。
      antiPattern: 没有 asset 存储、无 privacy_level 声明、无输入大小限制、没有独立 asset_id，图片和对话生命周期耦合。
      consequence: 单张大图导致整个对话接口超时；GDPR 数据删除请求时无法单独删除图片；同一图片被多次传输，token 成本翻倍。
    pitfalls:
      - symptom: 直接把文件 base64 塞入 prompt，无 asset 存储
        fix: 先存为独立资产（S3/OSS），传 asset URL 和 metadata；模型只接受指向资产的引用
      - symptom: 未设置图片大小、页数、音频时长的上传限制
        fix: 在契约层设置 max_file_size、max_pages、max_duration；超限前返回 400 并告知用户
      - symptom: 所有模态输出格式不一致，下游无法统一处理
        fix: 在 expected_output_schema 中定义统一 JSON 结构（含 evidence_anchors 字段），每种处理器必须满足该 schema
  - id: d16-m2
    title: 异步队列让长任务可感知可恢复
    concept: async-queue
    idea: OCR、ASR、视觉理解等步骤延迟各异且可能超时，长任务必须进入异步队列并向前端推送细粒度状态。
    whyItMatters: 同步等待会因超时而丢任务；用户在白屏中等待 30 秒后关闭页面，系统无法区分是用户取消还是网络断开，任务状态无法恢复。
    engineerLens: 使用 BullMQ（Redis 后端）管理任务状态机：queued → processing → partial_result → done / failed；通过 SSE 或 WebSocket 向前端推 job_status 事件；任务设置最大重试次数和 TTL，失败后保留 dead-letter 队列供人工审查。
    productionExample:
      context: 某法律科技公司处理合同 PDF（最多 200 页），需要 OCR 全文 + 条款抽取 + 风险打标。
      whatTheyDid: 使用三级队列：OCR 队列（高并发低优先级）→ 抽取队列（中并发）→ 生成队列（低并发高内存），每级完成后推 SSE 事件；前端显示"第 37/200 页处理中"进度条；用户可在任意阶段取消并保留已完成页面结果。
      outcome: 200 页合同平均 2.4 分钟完成，用户取消率从同步方案的 38% 降至 6%；死信队列使人工介入定位成功率达 95%。
    counterExample:
      context: 某招聘平台为简历解析引入视觉模型，直接用同步 HTTP 调用等待模型返回。
      antiPattern: 前端 fetch 超时设为 120 秒，无状态展示，无取消机制，无队列积压保护。
      consequence: 高峰期并发 50 个请求时，所有请求都进入超时等待，服务宕机；用户刷新后重复上传同一简历，积压三倍。
    pitfalls:
      - symptom: 任务失败后前端只显示"出错了"，用户不知道进度是否保存
        fix: 设计 partial_result 状态：任务失败时保留已处理片段，前端展示"已完成 X 页，其余稍后重试"
      - symptom: 队列无优先级，紧急单次任务被批量任务堵死
        fix: 分高低优先级队列，实时请求走高优先级，批量处理走低优先级
      - symptom: dead-letter 队列无监控，失败任务静默积压
        fix: 设置 dead-letter 告警阈值（例如 >10 条触发 PagerDuty），并配置 runbook
  - id: d16-m3
    title: 证据锚点让多模态输出可复核
    concept: citation
    idea: 多模态回答必须能引用图片中的坐标区域、音频中的时间戳、PDF 中的页码和文本片段，用户才能回到原始证据验证结论。
    whyItMatters: 模型总结容易产生幻觉或遗漏；如果输出没有可定位的证据锚点，用户指出错误时系统无法精确定位问题根源，复核成本极高。
    engineerLens: 在输出 schema 中定义 evidence_anchors 数组，每条包含 anchor_type（bbox/timestamp/page_range/span）、source_asset_id、coordinates/time_range/page 和 excerpt；前端渲染时点击引用跳转到原始资产对应位置。
    productionExample:
      context: 某会议 SaaS 产品将录音转写为行动项，每个行动项需要对应录音时间段。
      whatTheyDid: ASR 输出 word-level timestamp，行动项生成器提取 start_time/end_time，前端音频播放器支持跳转到指定秒；每个行动项卡片右上角显示"来自 02:14–02:38"；用户点击可直接回听原始语音片段。
      outcome: 错误行动项的用户投诉率下降 70%，因为用户可以自己复核；同时捕获了 ASR 漏字的用户纠错反馈，提升数据飞轮。
    counterExample:
      context: 某财务审计工具扫描报销发票图片并生成"金额异常"提示。
      antiPattern: 只输出"第 3 张发票金额异常"字符串，不提供图片坐标或裁剪区域；用户需要自己找到对应发票的对应位置。
      consequence: 审计人员平均花费 15 分钟手动定位每条异常，工具价值大幅折扣；部分用户放弃使用并退回人工流程。
    pitfalls:
      - symptom: 输出只有总结文本，无任何 anchor 字段
        fix: 在 output schema 中强制要求每条结论带至少一个 evidence_anchor；无锚点的输出不允许返回给用户
      - symptom: 图片坐标使用像素绝对值，分辨率变化后锚点偏移
        fix: 使用相对坐标（0–1 归一化），配合 asset 存储的原始分辨率元数据在渲染时还原
      - symptom: 音频时间戳精度不足（只到秒级），用户定位困难
        fix: 使用毫秒级时间戳，允许前端播放器精准跳转
  - id: d16-m4
    title: 体验降级保护实时失败场景
    concept: graceful-degradation
    idea: 实时能力（流式转写、视觉实时标注）成本和失败率远高于批处理；必须设计明确的降级路径，保证任务在实时失败时仍能完成。
    whyItMatters: 实时链路的稳定性受网络、模型可用性、并发和成本共同约束，依赖实时能力而没有降级的产品在高峰期会系统性失效。
    engineerLens: 为每个实时路径定义 FallbackContract：降级触发条件（timeout_ms、error_rate、cost_threshold）、降级行为（异步队列/摘要/草稿/稍后通知）和用户提示模板；降级必须解释原因并保留任务 ID 供后续跟踪。
    productionExample:
      context: 某在线教育平台提供实时语音口语评分，学生说完立即显示发音分数和纠正建议。
      whatTheyDid: 实时链路：WebRTC 音频流 → ASR → 评分模型 → 流式 SSE，超时阈值 2 秒；降级链路：上传完整音频 → BullMQ 队列 → 5 分钟内异步返回结果并 App 推送通知；降级时前端显示"评分需要几分钟，完成后通知你"。
      outcome: 实时链路可用率 97%，剩余 3% 无缝降级至异步路径，任务完成率维持在 99.5%；相比竞品直接返回错误的体验，用户留存率高 12 个百分点。
    counterExample:
      context: 某医疗问诊平台使用实时语音识别记录医患对话，没有降级路径。
      antiPattern: 实时 ASR 失败时直接报错并清空对话缓冲；医生必须重新开始录音；没有异步备用路径。
      consequence: 某次 ASR 服务商故障导致 40 分钟全平台问诊记录失效，严重影响医生工作效率和患者安全。
    pitfalls:
      - symptom: 实时失败时直接返回空白，用户以为任务消失
        fix: 降级时立即保存任务状态并显示任务 ID 和预计完成时间；推送通知而非让用户主动查询
      - symptom: 降级到异步后没有进度反馈，用户不确定是否需要重试
        fix: 异步路径同样使用 job_status 状态机，完成后通过 App 推送 / 邮件 / 页面 badge 通知
      - symptom: 隐私策略在上传后才告知用户，用户已经录入了不愿共享的内容
        fix: 在录音/上传 UI 的 permission dialog 中提前说明存储期限、使用范围和删除方式
decisionLayers:
  - id: l1
    name: 输入契约
    question: 多模态输入如何统一管理？
    choices:
      - name: 统一 TaskContract
        description: 所有模态经过统一的 asset/metadata/privacy 结构管理，下游处理器按 modality 字段路由。
        example: asset_id + privacy_level + expected_output_schema
      - name: 各模态独立接口
        description: 图片、音频、文本走各自 API，难以统一审计、计费和复核。
        example: 三个分散 endpoint
  - id: l2
    name: 处理方式
    question: 长时任务如何保证可感知和可恢复？
    choices:
      - name: 异步队列加状态推送
        description: 任务进入队列，前端通过 SSE/WebSocket 接收 queued/processing/partial/done 状态更新。
        example: BullMQ + SSE job_status
      - name: 同步阻塞等待
        description: 前端 fetch 等待，超时即失败，无法恢复，用户体验极差。
        example: 120s timeout fetch
  - id: l3
    name: 实时失败处理
    question: 实时链路不可用时如何保护任务完成率？
    choices:
      - name: 降级为异步加通知
        description: 超过延迟阈值时自动切换为上传后处理，任务不丢失，完成后推送通知。
        example: 2s timeout 降级 + App 推送
      - name: 直接返回错误
        description: 用户收到错误后需重新操作，任务状态丢失，完成率骤降。
        example: HTTP 504 无补救
architecture:
  type: pipeline
  summary: 多模态输入经统一契约层进入异步处理队列，各处理器抽取证据锚点后送入模型推理，结果带锚点展示给用户，实时失败时自动降级。
  conclusion: pipeline 模型清晰划分了输入规范、任务编排、证据生成和体验交付四层，每层独立扩展且失败可定位。
  nodes:
    - id: n1
      label: 多模态输入
      tone: accent
    - id: n2
      label: TaskContract 统一层
      tone: system
    - id: n3
      label: 异步任务队列
      tone: system
    - id: n4
      label: OCR / ASR / Vision 处理
    - id: n5
      label: 证据锚点抽取
      tone: success
    - id: n6
      label: 模型推理与生成
    - id: n7
      label: 进度展示与降级处理
      tone: warning
  edges:
    - from: n1
      to: n2
      relation: primary
      label: 统一契约
    - from: n2
      to: n3
      relation: primary
      label: 入队
    - from: n3
      to: n4
      relation: primary
      label: 分模态处理
    - from: n4
      to: n5
      relation: primary
      label: 抽取锚点
    - from: n5
      to: n6
      relation: primary
      label: 带证据推理
    - from: n6
      to: n7
      relation: primary
      label: 输出与状态
  groups: []
questions:
  - id: d16-q1
    type: single
    concept: multimodal-input
    weight: 25
    prompt: 为什么多模态任务需要统一 TaskContract，而不是为每种模态设计独立接口？
    explanation: 统一契约是编排、隐私控制、审计和可复核的基础；没有统一结构，三种模态会形成三套难以维护的独立逻辑，扩展新模态时成本翻倍。
    options:
      - id: a
        label: 统一契约规范 asset/metadata/privacy/expected_output，让编排和隐私控制保持一致
        correct: true
      - id: b
        label: 统一接口是为了隐藏所有输入细节，让前端感知不到模态差异
        correct: false
      - id: c
        label: 每种模态走独立接口更灵活，不需要统一
        correct: false
  - id: d16-q2
    type: single
    concept: async-queue
    weight: 25
    prompt: 多模态长任务为何需要异步队列而非同步 HTTP 阻塞？
    explanation: OCR、ASR 和视觉理解延迟差异大，同步等待导致超时后任务状态丢失；队列让任务有可恢复状态、进度事件和取消机制。
    options:
      - id: a
        label: 队列能自动保证模型输出质量更高
        correct: false
      - id: b
        label: 不同处理步骤延迟差异大，队列赋予任务可恢复状态和进度反馈
        correct: true
      - id: c
        label: 队列只是为了节省服务器内存
        correct: false
  - id: d16-q3
    type: single
    concept: citation
    weight: 25
    prompt: 多模态输出中的"证据锚点"指的是什么？
    explanation: 证据锚点是将输出结论定位到原始资产具体位置的引用（坐标/时间戳/页码），让用户可以回到原始依据验证，是可复核性的核心。
    options:
      - id: a
        label: 输出的置信度分数，告诉用户模型有多确定
        correct: false
      - id: b
        label: 能定位到图片区域坐标、音频时间戳或文本页码的引用字段
        correct: true
      - id: c
        label: 一个总结标题，方便用户快速浏览结果
        correct: false
  - id: d16-q4
    type: single
    concept: graceful-degradation
    weight: 25
    prompt: 实时语音识别链路超时时，正确的降级处理是什么？
    explanation: 降级目标是保护任务完成率，不是让用户重新操作；超时后自动切换异步路径、保留任务 ID 并通知用户，是可控的体验降级。
    options:
      - id: a
        label: 直接返回 HTTP 504，让用户重新上传
        correct: false
      - id: b
        label: 自动切换为上传后批处理并在完成时推送通知，任务不丢失
        correct: true
      - id: c
        label: 让用户无限等待直到实时链路恢复
        correct: false
rubric:
  - id: r1
    criterion: 为至少一种模态写出完整 TaskContract（asset_id、modality、privacy_level、expected_output_schema）
  - id: r2
    criterion: 设计了包含 queued/processing/partial/done/failed 状态的任务状态机
  - id: r3
    criterion: 输出 schema 中包含 evidence_anchors 字段，并说明每种模态的锚点类型
  - id: r4
    criterion: 为实时失败定义了降级触发条件、降级行为和用户通知方式
references:
  - label: OpenAI Images guide
    url: https://platform.openai.com/docs/guides/images
    note: 官方图片输入规范，涵盖尺寸限制、token 计费和支持格式，是设计 image asset contract 的基础参考
  - label: OpenAI Speech to text guide
    url: https://platform.openai.com/docs/guides/speech-to-text
    note: 官方 Whisper API 文档，涵盖支持格式、时长限制和时间戳输出，用于设计 ASR 证据锚点
  - label: Vercel Queues documentation
    url: https://vercel.com/docs/workflow-collaboration/vercel-queues
    note: Vercel 官方队列文档，介绍异步任务管理、状态追踪和 webhook 通知，适用于多模态长任务编排
  - label: BullMQ documentation
    url: https://docs.bullmq.io/
    note: Redis 后端任务队列库，提供优先级队列、重试策略、dead-letter 队列和进度事件，是生产级多模态任务队列的常用选择
---

# 笔记
占位
