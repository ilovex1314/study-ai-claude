---
id: day10
phase: Day10
stage: "评估与整合"
capability: "建立 golden dataset、离线评估、在线反馈与回归门禁"
title: "Eval、反馈、红队与回归测试"
summary: "把 golden dataset、评分 rubric、线上反馈、红队样本和回归门禁串成可执行的质量闭环。"
capabilityGoal: "能判断一次 prompt、模型、检索或工具改动是否真的变好，并用回归门禁挡住退化。"
verifiableOutput: "一份 Eval 回归计划：golden set 结构、rubric 分层、发布阈值与失败样本回流路径。"
mentalModel: "AI 质量不是一次测试，而是一个把线上失败变成未来评估资产的闭环。"
walkthrough: "客服助手要把模型从旧版升级到新版：先用固定 golden set 跑离线评估，按事实正确性、证据覆盖、安全边界分层打分；人工抽检差异样本，红队样本验证注入与越权未退化；质量、成本、延迟三项阈值同时满足才放灰度；灰度期间收集采纳、编辑、差评和转人工，把新出现的失败样本归因后回流进 golden set 与回归集，下次升级自动覆盖。"
modules:
  - id: d10-m1
    title: "Eval dataset 是 AI 功能的测试资产"
    concept: "golden-set"
    idea: "golden set 不是几条示例，而是一组输入、期望行为、证据、失败类型与风险标签。"
    whyItMatters: "没有固定评估集，每次优化都只是主观感觉，边界场景会悄悄退化。"
    engineerLens: "把每条样本当成一条带 owner 和复查时间的测试用例来维护。"
    productionExample:
      context: "某 B2B 客服 SaaS 把退款问答模型从 4 道人工示例升级为 240 条 golden set。"
      whatTheyDid: "每条样本记录 input、期望证据、rubric、风险标签与最后复查时间，纳入发布流程。"
      outcome: "一次看似更好的 prompt 改动被评估集挡下，边界退款场景准确率回退被提前发现。"
    counterExample:
      context: "某团队只保存最终答案文本作为评估集。"
      antiPattern: "评估只比对答案字符串，不保存期望证据与失败原因。"
      consequence: "模型换版后答案措辞变化即误报失败，真正的证据缺失却测不出来。"
    pitfalls:
      - symptom: "评估集长期不更新，只有上线初期的样本。"
        fix: "把线上失败样本与事故定期回流进 golden set 与风险集。"
  - id: d10-m2
    title: "Rubric 把主观质量变成可复核判断"
    concept: "rubric"
    idea: "rubric 定义正确、部分正确、危险、不可接受四档，并给出每档的判定依据。"
    whyItMatters: "没有分层 rubric，不同评审者打分不一致，回归结论无法复用。"
    engineerLens: "把质量拆成事实正确性、证据覆盖、指令遵循、安全边界、格式有效性多个维度分别评分。"
    productionExample:
      context: "某知识库问答产品为答案建立 5 维 rubric 并定期校准。"
      whatTheyDid: "用人工标注校准模型评分，差异超阈值时以人工为准并回填校准集。"
      outcome: "评审一致性从约 6 成提升到 9 成以上，回归报告可直接用于发布决策。"
    counterExample:
      context: "某团队让模型给自己生成的答案打分。"
      antiPattern: "用同一个模型自评自答，且把自评分当最终事实。"
      consequence: "模型系统性高估自身输出，危险样本被打成通过。"
    pitfalls:
      - symptom: "rubric 只有「对错」两档，缺少危险级别。"
        fix: "增加「危险」与「不可接受」两档，让高风险错误单独可见。"
  - id: d10-m3
    title: "线上反馈与红队保护高风险边界"
    concept: "regression"
    idea: "采纳、编辑、差评、转人工等结构化反馈，加上红队样本，共同构成回归与门禁。"
    whyItMatters: "离线样本永远不完整，攻击与异常输入只有靠红队和真实反馈才能覆盖。"
    engineerLens: "把红队样本和 guardrails、权限检查一起跑，而不是只看模型文本。"
    productionExample:
      context: "某带工具调用的助手把 prompt injection 与越权样本纳入发布回归。"
      whatTheyDid: "每次发布前对注入、越权检索、错误工具参数样本回归，未通过即阻断。"
      outcome: "一次新增浏览器工具的版本因注入回归失败被拦截，避免线上数据泄露。"
    counterExample:
      context: "某团队只用点赞率衡量质量。"
      antiPattern: "只看好评比例，不分析用户实际改了什么、为何转人工。"
      consequence: "高点赞但高编辑率的隐性退化长期无人发现。"
    pitfalls:
      - symptom: "红队只在上线前做一次。"
        fix: "把红队样本固化进回归集，每次发布自动执行。"
decisionLayers:
  - id: d10-l1
    name: "发布门禁维度"
    question: "一次改动能否发布，看哪些指标？"
    choices:
      - name: "只看质量"
        description: "仅比较答案质量分"
        example: "quality score only"
      - name: "质量加成本与延迟"
        description: "质量、成本、p95 延迟与风险阈值同时满足才放行"
        example: "quality + cost + latency gate"
  - id: d10-l2
    name: "失败样本归因"
    question: "一条线上失败应归到哪一层？"
    choices:
      - name: "笼统记为模型问题"
        description: "所有失败都归给模型"
        example: "blame the model"
      - name: "分层归因"
        description: "归到 prompt、retrieval、model、tool 或 policy 具体层"
        example: "attribute by layer"
architecture:
  type: feedback
  summary: "质量反馈闭环：离线基准、红队、线上反馈与回归共同决定能否发布。"
  conclusion: "线上失败样本回流到评估集与门禁规则，质量随迭代单调增强。"
  nodes:
    - id: n1
      label: "Golden Set"
      tone: system
      group: g1
    - id: n2
      label: "离线评估"
      group: g1
    - id: n3
      label: "红队测试"
      tone: warning
      group: g1
    - id: n4
      label: "上线门禁"
      tone: accent
      group: g1
    - id: n5
      label: "线上反馈"
      group: g2
    - id: n6
      label: "回归集更新"
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
      to: n1
      relation: feedback
      label: "回流"
  groups:
    - id: g1
      label: "主流程"
      kind: lane
    - id: g2
      label: "评估与反馈"
      kind: lane
questions:
  - id: d10-q1
    type: single
    concept: "golden-set"
    weight: 25
    prompt: "一条合格的 eval 样本至少应包含什么？"
    explanation: "样本要能支撑「是否变好」的判断，必须带期望证据、rubric 与风险标签，而非只有答案。"
    options:
      - id: a
        label: "input、期望行为、证据、rubric 与风险标签"
        correct: true
      - id: b
        label: "只保存模型最终答案文本"
        correct: false
  - id: d10-q2
    type: single
    concept: "rubric"
    weight: 25
    prompt: "为什么不能让模型给自己的答案打分作为最终结论？"
    explanation: "自评自答会系统性高估，rubric 需要人工校准，模型评分只能当辅助。"
    options:
      - id: a
        label: "模型会系统性高估自身输出，危险样本可能被判通过"
        correct: true
      - id: b
        label: "模型评分一定比人工更准，可直接采用"
        correct: false
  - id: d10-q3
    type: single
    concept: "regression"
    weight: 25
    prompt: "发布门禁应该如何设定阈值？"
    explanation: "高分但成本翻倍或延迟恶化也可能不能发布，需多指标联合判断。"
    options:
      - id: a
        label: "质量、成本、延迟与风险阈值同时满足才放行"
        correct: true
      - id: b
        label: "只要质量分提升就发布"
        correct: false
  - id: d10-q4
    type: single
    concept: "red-team"
    weight: 25
    prompt: "红队样本在发布流程中应处于什么位置？"
    explanation: "红队不是一次性活动，应固化进回归集并与 guardrails、权限检查一起执行。"
    options:
      - id: a
        label: "固化进回归集，每次发布自动执行"
        correct: true
      - id: b
        label: "上线前手动测一次即可"
        correct: false
rubric:
  - id: d10-r1
    criterion: "golden set 样本带期望证据、rubric 与风险标签"
  - id: d10-r2
    criterion: "发布门禁同时覆盖质量、成本、延迟与风险"
  - id: d10-r3
    criterion: "失败样本有分层归因并回流到回归集"
references:
  - label: "OpenAI Evals"
    url: "https://github.com/openai/evals"
    note: "开源评估框架，演示 golden set 与评分组织方式"
  - label: "Anthropic — Building evaluations"
    url: "https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests"
    note: "讲如何为 LLM 功能设计可回归的评估"
---

# 笔记
占位
