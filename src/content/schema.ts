import { z } from "zod";

const noArrows = (s: string) => !/[→←↔]|->|<-/.test(s);
const label = z.string().min(1).refine(noArrows, "label must not contain arrow characters");

export const architectureType = z.enum(["boundary", "lifecycle", "layered", "state", "feedback", "gate", "flywheel", "pipeline", "tree"]);

const node = z.object({ id: z.string().min(1), label, tone: z.enum(["neutral", "accent", "system", "warning", "success"]).optional(), group: z.string().optional() });
const edge = z.object({ from: z.string(), to: z.string(), label: z.string().refine(noArrows).optional(), relation: z.enum(["primary", "feedback", "branch", "guard", "dependency"]).optional() });
const group = z.object({ id: z.string(), label: z.string(), kind: z.enum(["boundary", "layer", "lane"]).optional() });

export const architectureSchema = z.object({
  type: architectureType, summary: z.string().min(1), conclusion: z.string().min(1),
  nodes: z.array(node).min(3), edges: z.array(edge).default([]), groups: z.array(group).default([]),
  renderMode: z.enum(["diagram", "structured-list", "none"]).default("diagram")
});

const example = z.object({ context: z.string().min(4), whatTheyDid: z.string().min(4), outcome: z.string().min(2) });
const counter = z.object({ context: z.string().min(4), antiPattern: z.string().min(4), consequence: z.string().min(2) });
const pitfall = z.object({ symptom: z.string().min(2), fix: z.string().min(2) });

export const conceptModuleSchema = z.object({
  id: z.string(), title: z.string().min(2), concept: z.string().min(2),
  idea: z.string().min(6), whyItMatters: z.string().min(6), engineerLens: z.string().min(6),
  productionExample: example, counterExample: counter, pitfalls: z.array(pitfall).min(1),
  diagram: architectureSchema.partial({ summary: true }).optional(), links: z.array(z.string()).optional()
});

const choice = z.object({ name: z.string(), description: z.string(), example: z.string() });
const decisionLayer = z.object({ id: z.string(), name: z.string(), question: z.string(), choices: z.array(choice).min(2) });

const option = z.object({ id: z.string(), label: z.string().min(1), correct: z.boolean() });
const singleQuestion = z.object({ id: z.string(), type: z.literal("single"), concept: z.string(), weight: z.number().int().min(0).max(100), prompt: z.string().min(6), scenario: z.string().optional(), explanation: z.string().min(6), options: z.array(option).min(2) });
// future: multi/fill-blank/short-answer added here as union members (F1-F3)
export const questionSchema = z.discriminatedUnion("type", [singleQuestion]);

const rubricCriterion = z.object({ id: z.string(), criterion: z.string().min(4) });
const reference = z.object({ label: z.string().min(2), url: z.string().url(), note: z.string().min(4) });

export const lessonSchema = z.object({
  id: z.string().regex(/^day\d{2}$/), phase: z.string(), stage: z.string().min(2),
  capability: z.string().min(4), title: z.string().min(2), summary: z.string().min(6),
  capabilityGoal: z.string().min(8), verifiableOutput: z.string().min(6), mentalModel: z.string().min(6),
  walkthrough: z.string().min(20),
  modules: z.array(conceptModuleSchema).min(3), decisionLayers: z.array(decisionLayer).min(2),
  architecture: architectureSchema, questions: z.array(questionSchema).min(1),
  rubric: z.array(rubricCriterion).min(1), references: z.array(reference).min(2)
}).refine((l) => l.questions.reduce((s, q) => s + q.weight, 0) === 100, "question weights must sum to 100");

export type Lesson = z.infer<typeof lessonSchema>;
export type ConceptModule = z.infer<typeof conceptModuleSchema>;
export type Architecture = z.infer<typeof architectureSchema>;
export type Question = z.infer<typeof questionSchema>;
export type RubricCriterion = z.infer<typeof rubricCriterion>;
export type AnnotatedReference = z.infer<typeof reference>;
export type ConceptId = string;
