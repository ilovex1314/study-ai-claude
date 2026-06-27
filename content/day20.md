---
id: day20
phase: Day20
stage: "生产化加固"
capability: "把课程能力转成持续增强的产品与团队学习机制"
title: "产品战略与能力飞轮"
summary: "学习行为形成能力证据，能力画像驱动下一步任务与实验，实验结果再改进课程与产品路线。"
capabilityGoal: "能定义北极星指标、护栏指标、实验设计与 90 天路线图，把能力做成会增长的飞轮。"
verifiableOutput: "一份北极星指标、护栏指标、实验计划与 90 天路线图，能力画像可追溯到证据。"
mentalModel: "课程完成不等于能力形成；真正的产品是把学习证据持续变成更强能力的飞轮。"
walkthrough: "团队把学习平台从一次性课程目录改造成飞轮：先用任务提交、架构判断、测验与项目结果作为能力证据，汇总成可追溯的能力画像；画像识别薄弱能力并推荐下一步任务；针对内容或反馈策略设计 A/B 实验，定义假设、样本、指标与停止条件；实验结论回流到课程、题目与产品优先级，进入 90 天路线图，下一轮学习行为又产生新的证据，使能力随迭代增强。"
modules:
  - id: d20-m1
    title: "能力证据而非活跃度"
    concept: "capability-evidence"
    idea: "能证明能力的不是阅读时长，而是任务提交、架构判断、测验与项目结果。"
    whyItMatters: "用日活替代学习成果会让产品优化错方向，活跃度只是辅助指标。"
    engineerLens: "每条能力画像标签都必须能追溯到具体证据，否则不可解释。"
    productionExample:
      context: "某 AI 学习平台把能力档案从「完成进度」改为「可复核证据」。"
      whatTheyDid: "用测验最佳分、练习产出与 rubric 自评三者共同判定能力状态。"
      outcome: "运营据此识别真正薄弱的能力，复购与项目完成率显著提升。"
    counterExample:
      context: "某平台用学习时长作为核心成长指标。"
      antiPattern: "把停留时长和视频播放数当成能力增长。"
      consequence: "刷时长用户被判定为高能力，推荐与认证全部失真。"
    pitfalls:
      - symptom: "能力标签无法追溯到证据。"
        fix: "为每个能力状态绑定可点击的证据来源。"
  - id: d20-m2
    title: "北极星与护栏指标配对"
    concept: "guardrail-metric"
    idea: "北极星连接用户价值与增长，护栏指标防止单一目标伤害质量。"
    whyItMatters: "只追北极星会诱发刷量与质量下降，护栏让增长不以伤害为代价。"
    engineerLens: "北极星如「每周完成可复核项目证据的学习者」，护栏如错误建议率、成本与放弃率。"
    productionExample:
      context: "某产品把北极星定为「每周产出可复核证据的学习者数」。"
      whatTheyDid: "同时监控错误建议率、获取成本与放弃率作为护栏。"
      outcome: "一次提高完成率的改动因放弃率护栏触发被回滚，避免虚假增长。"
    counterExample:
      context: "某团队只考核注册转化率。"
      antiPattern: "为单一转化指标优化，无质量护栏。"
      consequence: "转化提升但留存与口碑下滑，长期增长受损。"
    pitfalls:
      - symptom: "只有增长指标，没有护栏。"
        fix: "为每个北极星配至少一个质量或风险护栏指标。"
  - id: d20-m3
    title: "实验闭环与路线图"
    concept: "experiment"
    idea: "每次改课程、题目或反馈都要定义假设、样本、指标与停止条件。"
    whyItMatters: "不做受控实验就无法区分内容质量、难度与用户基础的影响。"
    engineerLens: "90 天路线图应包含假设、实验、交付与停止条件，而非功能清单。"
    productionExample:
      context: "某平台对两种反馈策略做 A/B 实验。"
      whatTheyDid: "固定样本与指标，预设停止条件，避免难度与基础混淆。"
      outcome: "确认结构化复盘反馈优于纯分数反馈，结论进入路线图。"
    counterExample:
      context: "某团队同时上线多项改动。"
      antiPattern: "一次发布混合内容、难度与 UI 变更后看总指标。"
      consequence: "指标变化无法归因，无法判断哪项改动有效。"
    pitfalls:
      - symptom: "实验没有停止条件。"
        fix: "预先定义样本量与停止规则，防止反复偷看数据。"
decisionLayers:
  - id: d20-l1
    name: "成长指标选择"
    question: "用什么衡量能力增长？"
    choices:
      - name: "活跃度"
        description: "用日活与时长衡量"
        example: "DAU and time"
      - name: "能力证据"
        description: "用可复核的任务与项目证据衡量"
        example: "verifiable evidence"
  - id: d20-l2
    name: "改动验证方式"
    question: "如何确认一次内容改动有效？"
    choices:
      - name: "直接全量上线"
        description: "改完直接全量发布看总指标"
        example: "ship to all"
      - name: "受控实验"
        description: "定义假设、样本、指标与停止条件做 A/B"
        example: "controlled A/B"
architecture:
  type: flywheel
  summary: "产品能力增长飞轮：学习行为形成证据，画像驱动任务与实验，结论回流路线。"
  conclusion: "实验结论回流到课程、题目与产品优先级，能力随每一轮迭代增强。"
  nodes:
    - id: n1
      label: "学习行为"
      group: g1
    - id: n2
      label: "能力证据"
      tone: system
      group: g1
    - id: n3
      label: "能力画像"
      group: g1
    - id: n4
      label: "下一步任务"
      tone: accent
      group: g1
    - id: n5
      label: "项目产出"
      group: g1
    - id: n6
      label: "实验优化"
      tone: warning
      group: g1
    - id: n7
      label: "路线图决策"
      tone: system
      group: g2
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
      relation: primary
    - from: n5
      to: n6
      relation: primary
    - from: n6
      to: n7
      relation: primary
    - from: n7
      to: n1
      relation: feedback
      label: "回流"
  groups:
    - id: g1
      label: "飞轮循环"
      kind: lane
    - id: g2
      label: "策略决策"
      kind: lane
questions:
  - id: d20-q1
    type: single
    concept: "capability-evidence"
    weight: 30
    prompt: "能力画像应当基于什么？"
    explanation: "能力要由可追溯的证据支撑，活跃度只是辅助，不能替代成果。"
    options:
      - id: a
        label: "可追溯的任务、测验与项目证据"
        correct: true
      - id: b
        label: "日活、时长与视频播放数"
        correct: false
  - id: d20-q2
    type: single
    concept: "guardrail-metric"
    weight: 25
    prompt: "为什么北极星指标需要配护栏指标？"
    explanation: "只追单一增长目标会诱发刷量与质量下降，护栏防止增长以伤害为代价。"
    options:
      - id: a
        label: "防止为单一目标优化而伤害质量与留存"
        correct: true
      - id: b
        label: "护栏只是装饰，无实际作用"
        correct: false
  - id: d20-q3
    type: single
    concept: "experiment"
    weight: 25
    prompt: "如何确认一次内容改动真的有效？"
    explanation: "需要受控实验并预设停止条件，避免难度与用户基础混淆归因。"
    options:
      - id: a
        label: "做受控 A/B，定义假设、样本、指标与停止条件"
        correct: true
      - id: b
        label: "一次上线多项改动后看总指标"
        correct: false
  - id: d20-q4
    type: single
    concept: "retention"
    weight: 20
    prompt: "90 天路线图应以什么为核心？"
    explanation: "路线图应包含假设、实验、交付与停止条件，而非单纯功能清单。"
    options:
      - id: a
        label: "假设、实验、交付与停止条件"
        correct: true
      - id: b
        label: "尽可能多的功能清单"
        correct: false
rubric:
  - id: d20-r1
    criterion: "北极星指标连接用户价值与增长"
  - id: d20-r2
    criterion: "每个北极星配有质量或风险护栏指标"
  - id: d20-r3
    criterion: "实验定义了假设、样本、指标与停止条件"
  - id: d20-r4
    criterion: "能力画像可追溯到具体证据"
references:
  - label: "Amplitude — North Star Playbook"
    url: "https://amplitude.com/north-star"
    note: "北极星与护栏指标的体系化方法"
  - label: "Reforge — Growth loops"
    url: "https://www.reforge.com/blog/growth-loops"
    note: "用增长飞轮替代线性漏斗的产品思路"
---

# 笔记
占位
