import { describe, expect, it } from "vitest";
import { lessonSchema } from "./schema";

const valid = {
  id: "day01", phase: "Day01", stage: "定义可靠 AI 行为",
  capability: "判断模型边界", title: "模型认知与能力边界",
  summary: "判断何时信任 LLM。", capabilityGoal: "能判断任务是否适合交给模型并说明边界。",
  verifiableOutput: "一页模型边界判断说明。", mentalModel: "模型给建议，系统做决定。",
  walkthrough: "面对一个退款审批场景，先界定模型只产出建议，权限与提交由系统控制。",
  modules: [{
    id: "d1-m1", title: "确定性与概率性", concept: "model-cognition",
    idea: "模型是概率系统。", whyItMatters: "决定哪些环节需要确定性兜底。",
    engineerLens: "把模型当不可信子系统对待。",
    productionExample: { context: "客服助手", whatTheyDid: "模型起草、人工确认提交", outcome: "差错率下降" },
    counterExample: { context: "自动退款", antiPattern: "模型直接调用退款 API", consequence: "误退款" },
    pitfalls: [{ symptom: "把模型输出当事实", fix: "对高风险动作加确定性校验" }]
  }, {
    id: "d1-m2", title: "能力与边界", concept: "model-cognition",
    idea: "模型擅长生成、弱于精确执行。", whyItMatters: "决定哪些任务适合交给模型。",
    engineerLens: "把高精度需求留给确定性代码。",
    productionExample: { context: "代码补全", whatTheyDid: "模型补全、编译器把关", outcome: "效率提升" },
    counterExample: { context: "金额计算", antiPattern: "让模型做精算", consequence: "金额出错" },
    pitfalls: [{ symptom: "要求模型保证精确", fix: "用工具做精确部分" }]
  }, {
    id: "d1-m3", title: "上下文与依据", concept: "model-cognition",
    idea: "模型依赖给定上下文作答。", whyItMatters: "上下文质量决定输出质量。",
    engineerLens: "把检索和约束当成模型的输入工程。",
    productionExample: { context: "知识库问答", whatTheyDid: "检索增强后再让模型回答", outcome: "可溯源" },
    counterExample: { context: "凭空回答", antiPattern: "不给依据直接问", consequence: "幻觉" },
    pitfalls: [{ symptom: "无依据时仍强答", fix: "缺依据时要求模型拒答" }]
  }],
  decisionLayers: [{ id: "l1", name: "边界", question: "谁做决定？", choices: [
    { name: "系统", description: "权限与提交由系统", example: "policy service" },
    { name: "模型", description: "只给建议", example: "draft" }] },
    { id: "l2", name: "依据", question: "答案来自哪里？", choices: [
    { name: "检索", description: "答案来自知识库", example: "rag" },
    { name: "参数", description: "答案来自训练记忆", example: "closed-book" }] }],
  architecture: { type: "boundary", summary: "责任边界", conclusion: "模型建议、系统控制",
    nodes: [{ id: "n1", label: "用户目标" }, { id: "n2", label: "模型建议" }, { id: "n3", label: "策略与权限" }],
    edges: [{ from: "n1", to: "n2", relation: "primary" }, { from: "n2", to: "n3", relation: "guard" }],
    groups: [{ id: "g1", label: "可信系统", kind: "boundary" }] },
  questions: [{ id: "d1-q1", type: "single", concept: "model-cognition", weight: 100,
    prompt: "何时必须保留确定性控制？", explanation: "高风险动作不能交给概率系统。",
    options: [{ id: "a", label: "高风险副作用", correct: true }, { id: "b", label: "所有情况都交给模型", correct: false }] }],
  rubric: [{ id: "r1", criterion: "写清了模型与系统的边界" }],
  references: [
    { label: "OpenAI production best practices", url: "https://platform.openai.com/docs/guides/production-best-practices", note: "讲生产化取舍" },
    { label: "Anthropic engineering blog", url: "https://www.anthropic.com/engineering", note: "讲可靠 AI 系统设计" }]
};

it("accepts a well-formed lesson", () => {
  expect(() => lessonSchema.parse(valid)).not.toThrow();
});

it("rejects arrow characters in node labels", () => {
  const bad = structuredClone(valid);
  bad.architecture.nodes[0].label = "用户 -> 模型";
  expect(() => lessonSchema.parse(bad)).toThrow();
});

it("rejects a pitfall missing its fix", () => {
  const bad = structuredClone(valid);
  bad.modules[0].pitfalls[0] = { symptom: "只有症状" } as never;
  expect(() => lessonSchema.parse(bad)).toThrow();
});
