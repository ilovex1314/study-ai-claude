# study-ai-claude (P0.5 + F5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clean, local-first AI-engineering learning workbench: a 20-day Markdown-sourced course with deep content, relationship-accurate diagrams, an extensible question-type engine, and a verifiable-output loop (practice evidence + self-rubric + capability archive).

**Architecture:** Markdown (`content/dayXX.md` frontmatter) is the single source of truth. A build-time generator emits typed `src/content/lessons.generated.ts`; a validator gates content invariants (depth, weights, diagram semantics). The app consumes only generated data. Clean domains: `content`, `curriculum`, `assessment` (grader/renderer registries), `practice`, `learner-state` (adapter), `ui`.

**Tech Stack:** React 19, TypeScript, Vite 7, react-router-dom 7, Vitest 4, Testing Library, jsdom, gray-matter (frontmatter parsing), zod (schema validation).

## Global Constraints

- Node 22; package manager pnpm. App lives at repo root (`package.json` at `/Volumes/2TB-NVMe/work/study-ai-claude`).
- Pure frontend, local-first. No backend, no login, no cloud, no AI grading.
- `src/content/lessons.generated.ts` is generated; never hand-edit; gitignored.
- Question weights per day MUST sum to exactly 100.
- Diagram node labels MUST NOT contain arrow chars: `→ ← ↔ -> <-`.
- P0.5 implements only the `single` question type; the grader/renderer registries MUST make adding `multi`/`fill-blank`/`short-answer` additive (no core edits).
- Storage keys: `study-ai-claude.{lessonId}.{kind}` — no per-day special cases.
- Every iteration updates `CHANGELOG.md` and adds `docs/iterations/YYYY-MM-DD-<topic>.md`.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

```
package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, index.html
.github/workflows/ci.yml
content/dayXX.md                          # source of truth (20 files)
scripts/generate-content.mjs              # md frontmatter -> generated TS
scripts/validate-content.mjs              # invariants gate
src/
  main.tsx, App.tsx, styles.css
  content/
    schema.ts                             # zod schema + TS types (single source of types)
    lessons.generated.ts                  # GENERATED (gitignored)
    lessons.ts                            # re-export + runtime guards
  curriculum/curriculum.ts                # ordered route metadata derived from lessons
  assessment/
    types.ts                              # Question discriminated union, AnswerValue
    graders.ts                            # Grader interface + registry + single grader
    score.ts                              # scoreAttempt, buildReview
  practice/
    rubric.ts                             # rubric evaluation
    archive.ts                            # capability archive aggregation + export
  learner-state/
    adapter.ts                            # LearnerStateAdapter interface + types
    localStorageAdapter.ts                # LocalStorageAdapter impl
  ui/
    Hero.tsx, CurriculumNav.tsx, SectionRail.tsx
    ConceptsPanel.tsx, ConceptCard.tsx
    ArchitectureDiagram.tsx               # diagram engine (day + concept)
    questions/ (registry.tsx, SingleQuestion.tsx)
    QuizPanel.tsx, ReviewPanel.tsx
    PracticePanel.tsx, RubricPanel.tsx, CapabilityArchive.tsx
```

---

## Task 1: Project scaffold + CI

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/smoke.test.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a booting Vite React app and a passing Vitest run (`pnpm test`).

- [ ] **Step 1: Write the failing test**

```ts
// src/smoke.test.ts
import { describe, expect, it } from "vitest";
it("runs the test toolchain", () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 2: Run to verify it fails (no toolchain yet)**

Run: `pnpm test`
Expected: FAIL — vitest not installed / no package.json.

- [ ] **Step 3: Create package.json**

```json
{
  "name": "study-ai-claude",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "generate:content": "node scripts/generate-content.mjs",
    "validate:content": "node scripts/validate-content.mjs",
    "prebuild": "node scripts/generate-content.mjs",
    "pretest": "node scripts/generate-content.mjs",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "gray-matter": "^4.0.3",
    "jsdom": "^25.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^4.1.0",
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 4: Create config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "useDefineForClassFields": true, "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext", "skipLibCheck": true, "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "noEmit": true, "jsx": "react-jsx",
    "strict": true, "noUnusedLocals": true, "noUnusedParameters": true, "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```
`tsconfig.node.json`:
```json
{ "compilerOptions": { "composite": true, "skipLibCheck": true, "module": "ESNext", "moduleResolution": "bundler", "allowSyntheticDefaultImports": true }, "include": ["vite.config.ts"] }
```
`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: [] }
});
```
`index.html`:
```html
<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>study-ai-claude</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
```

- [ ] **Step 5: Create app shell**

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>
);
```
`src/App.tsx`:
```tsx
export default function App() {
  return <main><h1>study-ai-claude</h1></main>;
}
```
`src/styles.css`: `:root { color-scheme: light; } body { margin: 0; font-family: system-ui, sans-serif; }`

- [ ] **Step 6: Add an empty generator stub so pretest passes**

`scripts/generate-content.mjs`:
```js
// stub — replaced in Task 3
console.log("generate-content: stub (no content yet)");
```

- [ ] **Step 7: CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI
on: { push: { branches: [main] }, pull_request: {} }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm validate:content
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 8: Install and run**

Run: `pnpm install && pnpm test`
Expected: PASS (1 test). `validate:content` will be added in Task 4 — CI step will be wired then.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest app and CI"
```

---

## Task 2: Content schema (types) with zod

**Files:**
- Create: `src/content/schema.ts`, `src/content/schema.test.ts`

**Interfaces:**
- Produces: `lessonSchema` (zod), and inferred TS types `Lesson`, `ConceptModule`, `Architecture`, `Question`, `RubricCriterion`, `AnnotatedReference`, `ConceptId`. Consumed by generator, validator, app.

- [ ] **Step 1: Write the failing test**

```ts
// src/content/schema.test.ts
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
  }],
  decisionLayers: [{ id: "l1", name: "边界", question: "谁做决定？", choices: [
    { name: "系统", description: "权限与提交由系统", example: "policy service" },
    { name: "模型", description: "只给建议", example: "draft" }] }],
  architecture: { type: "boundary", summary: "责任边界", conclusion: "模型建议、系统控制",
    nodes: [{ id: "n1", label: "用户目标" }, { id: "n2", label: "模型建议" }, { id: "n3", label: "策略与权限" }],
    edges: [{ from: "n1", to: "n2", relation: "primary" }, { from: "n2", to: "n3", relation: "guard" }],
    groups: [{ id: "g1", label: "可信系统", kind: "boundary" }] },
  questions: [{ id: "d1-q1", type: "single", concept: "model-cognition", weight: 100,
    prompt: "何时必须保留确定性控制？", explanation: "高风险动作不能交给概率系统。",
    options: [{ id: "a", label: "高风险副作用", correct: true }, { id: "b", label: "所有情况都交给模型", correct: false }] }],
  rubric: [{ id: "r1", criterion: "写清了模型与系统的边界" }],
  references: [{ label: "OpenAI production best practices", url: "https://platform.openai.com/docs/guides/production-best-practices", note: "讲生产化取舍" }]
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
  bad.modules[0].pitfalls[0] = { symptom: "只有症状" };
  expect(() => lessonSchema.parse(bad)).toThrow();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/content/schema.test.ts`
Expected: FAIL — `./schema` not found.

- [ ] **Step 3: Implement schema**

```ts
// src/content/schema.ts
import { z } from "zod";

const noArrows = (s: string) => !/[→←↔]|->|<-/.test(s);
const label = z.string().min(1).refine(noArrows, "label must not contain arrow characters");

export const architectureType = z.enum(["boundary","lifecycle","layered","state","feedback","gate","flywheel","pipeline","tree"]);

const node = z.object({ id: z.string().min(1), label, tone: z.enum(["neutral","accent","system","warning","success"]).optional(), group: z.string().optional() });
const edge = z.object({ from: z.string(), to: z.string(), label: z.string().refine(noArrows).optional(), relation: z.enum(["primary","feedback","branch","guard","dependency"]).optional() });
const group = z.object({ id: z.string(), label: z.string(), kind: z.enum(["boundary","layer","lane"]).optional() });

export const architectureSchema = z.object({
  type: architectureType, summary: z.string().min(1), conclusion: z.string().min(1),
  nodes: z.array(node).min(3), edges: z.array(edge).default([]), groups: z.array(group).default([]),
  renderMode: z.enum(["diagram","structured-list","none"]).default("diagram")
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/content/schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/schema.ts src/content/schema.test.ts
git commit -m "feat: content schema with depth and diagram invariants"
```

---

## Task 3: Content generator (Markdown frontmatter → typed)

**Files:**
- Create: `scripts/generate-content.mjs` (replace stub), `content/_fixture.day99.md` (temporary fixture), `scripts/generate-content.test.mjs`
- Create: `src/content/lessons.ts`

**Interfaces:**
- Consumes: `lessonSchema` from Task 2.
- Produces: `src/content/lessons.generated.ts` exporting `export const lessons: Lesson[]`; `src/content/lessons.ts` re-exporting `lessons` + types.

- [ ] **Step 1: Write the failing test**

```js
// scripts/generate-content.test.mjs
import { describe, expect, it } from "vitest";
import { buildLessons } from "./generate-content.mjs";

it("parses frontmatter day files into validated lessons sorted by id", async () => {
  const lessons = await buildLessons();
  expect(Array.isArray(lessons)).toBe(true);
  // fixture day99 present during this task
  expect(lessons.some((l) => l.id === "day99")).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scripts/generate-content.test.mjs`
Expected: FAIL — `buildLessons` not exported.

- [ ] **Step 3: Create a fixture day**

`content/_fixture.day99.md` — frontmatter equal to the `valid` object from Task 2 (id `day99`, phase `Day99`), body `# 笔记\n占位`. (Author it as YAML frontmatter mirroring the Task 2 `valid` shape.)

- [ ] **Step 4: Implement generator**

```js
// scripts/generate-content.mjs
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, "../content");
const outFile = resolve(here, "../src/content/lessons.generated.ts");

export async function buildLessons() {
  const { lessonSchema } = await import("../src/content/schema.ts").catch(async () => {
    // schema.ts is TS; under node we read via tsx-less path: validation also runs in vitest where TS is available
    return await import("../src/content/schema.js");
  });
  const files = (await readdir(contentDir)).filter((f) => /day\d{2}\.md$/.test(f)).sort();
  const lessons = [];
  for (const file of files) {
    const raw = await readFile(resolve(contentDir, file), "utf8");
    const { data } = matter(raw);
    lessons.push(lessonSchema.parse(data));
  }
  return lessons;
}

async function main() {
  const lessons = await buildLessons();
  const banner = "// GENERATED by scripts/generate-content.mjs — do not edit.\n";
  const body = `import type { Lesson } from "./schema";\nexport const lessons: Lesson[] = ${JSON.stringify(lessons, null, 2)} as const;\n`;
  await writeFile(outFile, banner + body, "utf8");
  console.log(`generate-content: wrote ${lessons.length} lessons`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

> Note: `gray-matter` parses YAML frontmatter. Importing `schema.ts` from a `.mjs` requires running under Vitest (which transpiles TS) for the test, and under `node` the CLI path imports the schema through Vite during build. If node cannot import `.ts` directly, the implementer adds `vite-node` as the runner (`vite-node scripts/generate-content.mjs`) and updates the `generate:content`/`prebuild`/`pretest` scripts accordingly — record this decision in the iteration doc.

`src/content/lessons.ts`:
```ts
export type { Lesson, ConceptModule, Architecture, Question, RubricCriterion, AnnotatedReference, ConceptId } from "./schema";
export { lessons } from "./lessons.generated";
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run scripts/generate-content.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-content.mjs scripts/generate-content.test.mjs content/_fixture.day99.md src/content/lessons.ts
git commit -m "feat: generate typed lessons from markdown frontmatter"
```

---

## Task 4: Content validator (CI gate)

**Files:**
- Create: `scripts/validate-content.mjs`, `scripts/validate-content.test.mjs`

**Interfaces:**
- Consumes: `buildLessons` (Task 3), `lessonSchema` (Task 2).
- Produces: `validateLessons(lessons)` returning `{ ok: boolean, errors: string[] }`; CLI exits non-zero on failure.

- [ ] **Step 1: Write the failing test**

```js
// scripts/validate-content.test.mjs
import { describe, expect, it } from "vitest";
import { validateLessons } from "./validate-content.mjs";

const base = (over = {}) => ({ id: "day01", questions: [{ weight: 100 }], references: [{ note: "x" }, { note: "y" }], architecture: { type: "feedback", edges: [{ relation: "feedback" }], groups: [] }, ...over });

it("flags weights not summing to 100", () => {
  const r = validateLessons([base({ questions: [{ weight: 50 }] })]);
  expect(r.ok).toBe(false);
  expect(r.errors.join()).toMatch(/100/);
});

it("flags feedback architecture without a feedback edge", () => {
  const r = validateLessons([base({ architecture: { type: "feedback", edges: [{ relation: "primary" }], groups: [] } })]);
  expect(r.ok).toBe(false);
});

it("passes a well-formed lesson set", () => {
  expect(validateLessons([base()]).ok).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scripts/validate-content.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement validator**

```js
// scripts/validate-content.mjs
import { buildLessons } from "./generate-content.mjs";

export function validateLessons(lessons) {
  const errors = [];
  for (const l of lessons) {
    const sum = (l.questions ?? []).reduce((s, q) => s + (q.weight ?? 0), 0);
    if (sum !== 100) errors.push(`${l.id}: question weights sum to ${sum}, expected 100`);
    if ((l.references ?? []).some((r) => !r.note)) errors.push(`${l.id}: every reference needs a note`);
    const a = l.architecture;
    if (a && a.renderMode !== "none") {
      const rel = new Set((a.edges ?? []).map((e) => e.relation));
      const kinds = new Set((a.groups ?? []).map((g) => g.kind));
      if (["feedback","flywheel"].includes(a.type) && !rel.has("feedback")) errors.push(`${l.id}: ${a.type} needs a feedback edge`);
      if (["gate","state"].includes(a.type) && ![...rel].some((r) => r === "branch" || r === "guard")) errors.push(`${l.id}: ${a.type} needs a branch/guard edge`);
      if (a.type === "layered" && !(kinds.has("layer") || kinds.has("lane"))) errors.push(`${l.id}: layered needs a layer/lane group`);
    }
  }
  return { ok: errors.length === 0, errors };
}

async function main() {
  const lessons = await buildLessons();
  const ids = lessons.filter((l) => /^day\d{2}$/.test(l.id) && l.id !== "day99");
  const result = validateLessons(lessons);
  // Day count check only enforced once fixtures removed (Task 19)
  if (!result.ok) { console.error("validate-content FAILED:\n" + result.errors.join("\n")); process.exit(1); }
  console.log(`validate-content: ${ids.length} lessons OK`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run scripts/validate-content.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-content.mjs scripts/validate-content.test.mjs
git commit -m "feat: content validator gate for weights, references, diagram semantics"
```

---

## Task 5: Curriculum domain

**Files:**
- Create: `src/curriculum/curriculum.ts`, `src/curriculum/curriculum.test.ts`

**Interfaces:**
- Consumes: `lessons` (Task 3).
- Produces: `curriculum: CurriculumDay[]` (`{ id, path, phase, stage, capability, title }`) derived from lessons, ordered by id.

- [ ] **Step 1: Write the failing test**

```ts
// src/curriculum/curriculum.test.ts
import { describe, expect, it } from "vitest";
import { curriculum } from "./curriculum";
import { lessons } from "../content/lessons";

it("derives one route entry per lesson, ordered and path-aligned", () => {
  expect(curriculum.length).toBe(lessons.length);
  expect(curriculum.map((d) => d.id)).toEqual([...lessons].map((l) => l.id).sort());
  expect(curriculum.every((d) => d.path === `/${d.id}`)).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/curriculum/curriculum.test.ts`
Expected: FAIL — `./curriculum` not found.

- [ ] **Step 3: Implement**

```ts
// src/curriculum/curriculum.ts
import { lessons } from "../content/lessons";
export type CurriculumDay = { id: string; path: string; phase: string; stage: string; capability: string; title: string };
export const curriculum: CurriculumDay[] = [...lessons]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((l) => ({ id: l.id, path: `/${l.id}`, phase: l.phase, stage: l.stage, capability: l.capability, title: l.title }));
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/curriculum/curriculum.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/curriculum
git commit -m "feat: derive curriculum route from lessons"
```

---

## Task 6: Assessment — grader registry + single grader

**Files:**
- Create: `src/assessment/types.ts`, `src/assessment/graders.ts`, `src/assessment/graders.test.ts`

**Interfaces:**
- Produces: `AnswerValue` union; `Grader` interface; `graders: Record<QuestionType, Grader>`; `gradeQuestion(question, answer): GradeResult`.

- [ ] **Step 1: Write the failing test**

```ts
// src/assessment/graders.test.ts
import { describe, expect, it } from "vitest";
import { gradeQuestion } from "./graders";

const q = { id: "q1", type: "single", concept: "c", weight: 30, prompt: "p", explanation: "e",
  options: [{ id: "a", label: "A", correct: true }, { id: "b", label: "B", correct: false }] } as const;

it("awards full weight for the correct single answer", () => {
  expect(gradeQuestion(q, "a")).toMatchObject({ earned: 30, max: 30, correct: true });
});
it("awards zero for a wrong single answer", () => {
  expect(gradeQuestion(q, "b")).toMatchObject({ earned: 0, max: 30, correct: false });
});
it("treats no answer as incomplete and zero", () => {
  expect(gradeQuestion(q, undefined)).toMatchObject({ earned: 0, complete: false });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/assessment/graders.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/assessment/types.ts
import type { Question } from "../content/schema";
export type { Question };
export type QuestionType = Question["type"];
export type AnswerValue =
  | string                                   // single: optionId
  | string[]                                 // multi: optionIds (F1)
  | Record<string, string>                   // fill-blank (F2)
  | { text: string; rubricChecks: string[] }; // short-answer (F3)
export type GradeResult = { earned: number; max: number; correct: boolean; complete: boolean; selfGraded: boolean };
export interface Grader<Q = Question, A = AnswerValue> {
  type: QuestionType;
  isComplete(q: Q, answer: A | undefined): boolean;
  grade(q: Q, answer: A | undefined): GradeResult;
}
```

```ts
// src/assessment/graders.ts
import type { AnswerValue, GradeResult, Grader, Question, QuestionType } from "./types";

const single: Grader = {
  type: "single",
  isComplete: (_q, a) => typeof a === "string" && a.length > 0,
  grade: (q, a) => {
    const max = q.weight;
    if (q.type !== "single") return { earned: 0, max, correct: false, complete: false, selfGraded: false };
    const complete = typeof a === "string" && a.length > 0;
    const correct = complete && q.options.some((o) => o.id === a && o.correct);
    return { earned: correct ? max : 0, max, correct, complete, selfGraded: false };
  }
};

export const graders: Partial<Record<QuestionType, Grader>> = { single };

export function gradeQuestion(q: Question, answer: AnswerValue | undefined): GradeResult {
  const grader = graders[q.type];
  if (!grader) throw new Error(`no grader registered for question type: ${q.type}`);
  return grader.grade(q, answer);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/assessment/graders.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/assessment/types.ts src/assessment/graders.ts src/assessment/graders.test.ts
git commit -m "feat: extensible grader registry with single-choice grader"
```

---

## Task 7: Assessment — weighted scoring + review

**Files:**
- Create: `src/assessment/score.ts`, `src/assessment/score.test.ts`

**Interfaces:**
- Consumes: `gradeQuestion` (Task 6), `Question` (schema).
- Produces: `scoreAttempt(questions, answers): { score, total, autoScore, selfScore, missed: string[] }`; `buildReview(questions, answers): Review` with `weakConcepts` and `recommendations`.

- [ ] **Step 1: Write the failing test**

```ts
// src/assessment/score.test.ts
import { describe, expect, it } from "vitest";
import { scoreAttempt, buildReview } from "./score";

const qs = [
  { id: "q1", type: "single", concept: "rag", weight: 60, prompt: "p", explanation: "e", options: [{ id: "a", label: "A", correct: true }, { id: "b", label: "B", correct: false }] },
  { id: "q2", type: "single", concept: "agent", weight: 40, prompt: "p", explanation: "e", options: [{ id: "a", label: "A", correct: true }, { id: "b", label: "B", correct: false }] }
] as const;

it("sums weighted earned points and total", () => {
  const r = scoreAttempt(qs, { q1: "a", q2: "b" });
  expect(r).toMatchObject({ score: 60, total: 100 });
  expect(r.missed).toEqual(["q2"]);
});

it("derives weak concepts from missed questions", () => {
  const review = buildReview(qs, { q1: "b", q2: "a" });
  expect(review.weakConcepts).toEqual(["rag"]);
  expect(review.recommendations.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/assessment/score.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/assessment/score.ts
import type { Question } from "../content/schema";
import type { AnswerValue } from "./types";
import { gradeQuestion } from "./graders";

export type ScoreResult = { score: number; total: number; autoScore: number; selfScore: number; missed: string[] };

export function scoreAttempt(questions: readonly Question[], answers: Record<string, AnswerValue>): ScoreResult {
  let score = 0, total = 0, autoScore = 0, selfScore = 0; const missed: string[] = [];
  for (const q of questions) {
    const r = gradeQuestion(q as Question, answers[q.id]);
    total += r.max; score += r.earned;
    if (r.selfGraded) selfScore += r.earned; else autoScore += r.earned;
    if (!r.correct) missed.push(q.id);
  }
  return { score, total, autoScore, selfScore, missed };
}

export type Review = ScoreResult & { weakConcepts: string[]; recommendations: string[] };

export function buildReview(questions: readonly Question[], answers: Record<string, AnswerValue>): Review {
  const result = scoreAttempt(questions, answers);
  const weakConcepts = [...new Set(result.missed.map((id) => questions.find((q) => q.id === id)?.concept).filter((c): c is string => Boolean(c)))];
  const recommendations = weakConcepts.length
    ? weakConcepts.map((c) => `复习「${c}」：回到概念卡，重写它解决的问题、系统边界、常见误区与一个生产验收方法。`)
    : ["本轮掌握很好。把 verifiableOutput 真正写出来，并用自评 rubric 逐条检查。"];
  return { ...result, weakConcepts, recommendations };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/assessment/score.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/assessment/score.ts src/assessment/score.test.ts
git commit -m "feat: weighted scoring and review derivation"
```

---

## Task 8: learner-state adapter

**Files:**
- Create: `src/learner-state/adapter.ts`, `src/learner-state/localStorageAdapter.ts`, `src/learner-state/localStorageAdapter.test.ts`

**Interfaces:**
- Consumes: `AnswerValue` (Task 6), `Review` (Task 7).
- Produces: `LearnerStateAdapter` interface; `CurrentAttempt`, `Attempt`, `PracticeEvidence` types; `LocalStorageAdapter` class; `createCurrentAttempt()`.

- [ ] **Step 1: Write the failing test**

```ts
// src/learner-state/localStorageAdapter.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { LocalStorageAdapter, createCurrentAttempt } from "./localStorageAdapter";

beforeEach(() => localStorage.clear());

it("uses a uniform key scheme with no per-day special case", () => {
  const a = new LocalStorageAdapter();
  a.saveCurrentAttempt("day01", createCurrentAttempt());
  expect(localStorage.getItem("study-ai-claude.day01.currentAttempt")).toBeTruthy();
});

it("persists and reads practice evidence", () => {
  const a = new LocalStorageAdapter();
  a.savePracticeEvidence("day07", { text: "我的产出", rubricChecks: ["r1"], updatedAt: "t" });
  expect(a.loadPracticeEvidence("day07")?.text).toBe("我的产出");
});

it("tolerates legacy attempts missing practiceEvidence field", () => {
  localStorage.setItem("study-ai-claude.day01.attemptHistory", JSON.stringify([{ id: "x", startedAt: "t", completedAt: "t", answers: {}, score: 10, total: 100, weakConcepts: [], recommendations: [] }]));
  const a = new LocalStorageAdapter();
  expect(a.loadHistory("day01")[0].score).toBe(10);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/learner-state/localStorageAdapter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/learner-state/adapter.ts
import type { AnswerValue } from "../assessment/types";
export type CurrentAttempt = { id: string; startedAt: string; answers: Record<string, AnswerValue> };
export type Attempt = CurrentAttempt & { completedAt: string; score: number; total: number; weakConcepts: string[]; recommendations: string[] };
export type PracticeEvidence = { text: string; rubricChecks: string[]; updatedAt: string };
export interface LearnerStateAdapter {
  loadCurrentAttempt(lessonId: string): CurrentAttempt | null;
  saveCurrentAttempt(lessonId: string, attempt: CurrentAttempt): void;
  resetCurrentAttempt(lessonId: string): void;
  loadHistory(lessonId: string): Attempt[];
  appendHistory(lessonId: string, attempt: Attempt): void;
  clearHistory(lessonId: string): void;
  loadPracticeEvidence(lessonId: string): PracticeEvidence | null;
  savePracticeEvidence(lessonId: string, evidence: PracticeEvidence): void;
  exportArchive(lessonIds: string[]): string;
}
```

```ts
// src/learner-state/localStorageAdapter.ts
import type { Attempt, CurrentAttempt, LearnerStateAdapter, PracticeEvidence } from "./adapter";

const key = (lessonId: string, kind: string) => `study-ai-claude.${lessonId}.${kind}`;
function read<T>(k: string, fallback: T): T { const raw = localStorage.getItem(k); if (!raw) return fallback; try { return JSON.parse(raw) as T; } catch { return fallback; } }
function write<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); }

export function createCurrentAttempt(now = new Date().toISOString()): CurrentAttempt {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `attempt-${now}`;
  return { id, startedAt: now, answers: {} };
}

export class LocalStorageAdapter implements LearnerStateAdapter {
  loadCurrentAttempt(lessonId: string) { return read<CurrentAttempt | null>(key(lessonId, "currentAttempt"), null); }
  saveCurrentAttempt(lessonId: string, attempt: CurrentAttempt) { write(key(lessonId, "currentAttempt"), attempt); }
  resetCurrentAttempt(lessonId: string) { localStorage.removeItem(key(lessonId, "currentAttempt")); }
  loadHistory(lessonId: string) { return read<Attempt[]>(key(lessonId, "attemptHistory"), []); }
  appendHistory(lessonId: string, attempt: Attempt) { write(key(lessonId, "attemptHistory"), [attempt, ...this.loadHistory(lessonId)]); this.resetCurrentAttempt(lessonId); }
  clearHistory(lessonId: string) { localStorage.removeItem(key(lessonId, "attemptHistory")); }
  loadPracticeEvidence(lessonId: string) { return read<PracticeEvidence | null>(key(lessonId, "practiceEvidence"), null); }
  savePracticeEvidence(lessonId: string, evidence: PracticeEvidence) { write(key(lessonId, "practiceEvidence"), evidence); }
  exportArchive(lessonIds: string[]) {
    const archive = lessonIds.map((id) => ({ id, history: this.loadHistory(id), practiceEvidence: this.loadPracticeEvidence(id) }));
    return JSON.stringify({ exportedAt: new Date().toISOString(), archive }, null, 2);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/learner-state/localStorageAdapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/learner-state
git commit -m "feat: learner-state adapter with uniform keys and practice evidence"
```

---

## Task 9: practice — rubric + capability archive

**Files:**
- Create: `src/practice/rubric.ts`, `src/practice/archive.ts`, `src/practice/practice.test.ts`

**Interfaces:**
- Consumes: `RubricCriterion` (schema), `Attempt`/`PracticeEvidence` (Task 8), `Review` (Task 7).
- Produces: `scoreRubric(criteria, checks): { checked, total, ratio }`; `buildCapabilityArchive(lessons, adapter): CapabilityRow[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/practice/practice.test.ts
import { describe, expect, it } from "vitest";
import { scoreRubric } from "./rubric";
import { buildCapabilityArchive } from "./archive";

it("scores rubric completion ratio", () => {
  const criteria = [{ id: "r1", criterion: "a" }, { id: "r2", criterion: "b" }];
  expect(scoreRubric(criteria, ["r1"])).toMatchObject({ checked: 1, total: 2, ratio: 0.5 });
});

it("marks a capability complete only with quiz + evidence + rubric", () => {
  const lessons = [{ id: "day01", capability: "判断模型边界", rubric: [{ id: "r1", criterion: "a" }], questions: [] }];
  const adapter = {
    loadHistory: () => [{ score: 80, total: 100 }],
    loadPracticeEvidence: () => ({ text: "x", rubricChecks: ["r1"], updatedAt: "t" })
  } as any;
  const rows = buildCapabilityArchive(lessons as any, adapter);
  expect(rows[0]).toMatchObject({ capability: "判断模型边界", status: "可独立交付" });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/practice/practice.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/practice/rubric.ts
import type { RubricCriterion } from "../content/schema";
export function scoreRubric(criteria: RubricCriterion[], checks: string[]) {
  const checked = criteria.filter((c) => checks.includes(c.id)).length;
  const total = criteria.length;
  return { checked, total, ratio: total === 0 ? 0 : checked / total };
}
```

```ts
// src/practice/archive.ts
import type { Lesson } from "../content/schema";
import type { LearnerStateAdapter } from "../learner-state/adapter";
import { scoreRubric } from "./rubric";

export type CapabilityRow = { lessonId: string; capability: string; quizBest: number; hasEvidence: boolean; rubricRatio: number; status: "未开始" | "理解" | "练习" | "可独立交付" };

export function buildCapabilityArchive(lessons: Lesson[], adapter: Pick<LearnerStateAdapter, "loadHistory" | "loadPracticeEvidence">): CapabilityRow[] {
  return lessons.map((l) => {
    const history = adapter.loadHistory(l.id);
    const quizBest = history.reduce((m, a) => Math.max(m, a.total ? Math.round((a.score / a.total) * 100) : 0), 0);
    const evidence = adapter.loadPracticeEvidence(l.id);
    const rubricRatio = evidence ? scoreRubric(l.rubric, evidence.rubricChecks).ratio : 0;
    const hasEvidence = Boolean(evidence && evidence.text.trim());
    let status: CapabilityRow["status"] = "未开始";
    if (quizBest >= 60) status = "理解";
    if (status === "理解" && hasEvidence) status = "练习";
    if (status === "练习" && rubricRatio >= 0.8) status = "可独立交付";
    return { lessonId: l.id, capability: l.capability, quizBest, hasEvidence, rubricRatio, status };
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/practice/practice.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/practice
git commit -m "feat: rubric scoring and capability archive aggregation"
```

---

## Task 10: Diagram engine (day + concept)

**Files:**
- Create: `src/ui/ArchitectureDiagram.tsx`, `src/ui/ArchitectureDiagram.test.tsx`, append diagram CSS to `src/styles.css`

**Interfaces:**
- Consumes: `Architecture` (schema).
- Produces: `<ArchitectureDiagram architecture={...} />` rendering per-type layout with SVG connectors; nodes carry `data-node-id`; no arrow chars in DOM text.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/ArchitectureDiagram.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

const arch = { type: "feedback", summary: "s", conclusion: "c", renderMode: "diagram",
  nodes: [{ id: "n1", label: "线上反馈" }, { id: "n2", label: "评估" }, { id: "n3", label: "回归" }],
  edges: [{ from: "n3", to: "n1", relation: "feedback" }], groups: [] } as const;

it("renders a node per architecture node", () => {
  const { container } = render(<ArchitectureDiagram architecture={arch as any} />);
  expect(container.querySelectorAll("[data-node-id]").length).toBe(3);
});

it("never renders arrow characters inside node text", () => {
  const { container } = render(<ArchitectureDiagram architecture={arch as any} />);
  for (const el of container.querySelectorAll(".architecture-node")) {
    expect(el.textContent).not.toMatch(/[→←↔]|->|<-/);
  }
});

it("renders nothing when renderMode is none", () => {
  const { container } = render(<ArchitectureDiagram architecture={{ ...arch, renderMode: "none" } as any} />);
  expect(container.firstChild).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/ui/ArchitectureDiagram.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Implement `ArchitectureDiagram` adapting the proven approach from `../study-ai/apps/interactive-lessons/src/components/ArchitectureDiagram.tsx` (grouped layout for boundary/layered/lifecycle/pipeline/tree, loop layout for feedback/flywheel, gate/state via branch connectors), with: a `LoopDiagram` for `feedback`/`flywheel`; a `GroupedDiagram` honoring `groups`; an SVG `ConnectorLayer` measuring node rects (`getBoundingClientRect` + `ResizeObserver`) and drawing relation-aware paths with an arrow marker. Nodes render `<span className="architecture-node" data-node-id={id}>{label}</span>`. Return `null` when `renderMode === "none"`. Add `.architecture-*` CSS to `styles.css` (full-row figure, lanes via flex, loop via radial slots).

> Reference file to adapt (do not import — copy/clean): `../study-ai/apps/interactive-lessons/src/components/ArchitectureDiagram.tsx`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/ui/ArchitectureDiagram.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ArchitectureDiagram.tsx src/ui/ArchitectureDiagram.test.tsx src/styles.css
git commit -m "feat: relationship-accurate architecture diagram engine"
```

---

## Task 11: Question renderer registry + SingleQuestion

**Files:**
- Create: `src/ui/questions/registry.tsx`, `src/ui/questions/SingleQuestion.tsx`, `src/ui/questions/registry.test.tsx`

**Interfaces:**
- Consumes: `Question` (schema), `AnswerValue` (Task 6).
- Produces: `renderers: Partial<Record<QuestionType, QuestionRenderer>>`; `QuestionView({ question, answer, onAnswer })` dispatching by type.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/questions/registry.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionView } from "./registry";

const q = { id: "q1", type: "single", concept: "c", weight: 100, prompt: "选择正确项", explanation: "e",
  options: [{ id: "a", label: "对", correct: true }, { id: "b", label: "错", correct: false }] };

it("renders single-choice options and reports the chosen id", () => {
  const onAnswer = vi.fn();
  render(<QuestionView question={q as any} answer={undefined} onAnswer={onAnswer} />);
  fireEvent.click(screen.getByRole("button", { name: "对" }));
  expect(onAnswer).toHaveBeenCalledWith("a");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/ui/questions/registry.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/ui/questions/SingleQuestion.tsx
import type { Question } from "../../content/schema";
export function SingleQuestion({ question, answer, onAnswer }: { question: Extract<Question, { type: "single" }>; answer: string | undefined; onAnswer: (v: string) => void }) {
  return (
    <div className="option-list">
      {question.options.map((o) => {
        const revealed = Boolean(answer);
        const selected = answer === o.id;
        const cls = ["option-button", selected ? "selected" : "", revealed && o.correct ? "correct" : "", revealed && selected && !o.correct ? "wrong" : ""].join(" ");
        return <button key={o.id} type="button" className={cls} onClick={() => onAnswer(o.id)}>{o.label}</button>;
      })}
    </div>
  );
}
```

```tsx
// src/ui/questions/registry.tsx
import type { Question } from "../../content/schema";
import type { AnswerValue, QuestionType } from "../../assessment/types";
import { SingleQuestion } from "./SingleQuestion";
import type { JSX } from "react";

export type QuestionRenderer = (props: { question: Question; answer: AnswerValue | undefined; onAnswer: (v: AnswerValue) => void }) => JSX.Element;

export const renderers: Partial<Record<QuestionType, QuestionRenderer>> = {
  single: ({ question, answer, onAnswer }) =>
    <SingleQuestion question={question as Extract<Question, { type: "single" }>} answer={answer as string | undefined} onAnswer={onAnswer} />
};

export function QuestionView({ question, answer, onAnswer }: { question: Question; answer: AnswerValue | undefined; onAnswer: (v: AnswerValue) => void }) {
  const renderer = renderers[question.type];
  if (!renderer) return <p className="missing-renderer">尚未支持的题型：{question.type}</p>;
  return renderer({ question, answer, onAnswer });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/ui/questions/registry.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/questions
git commit -m "feat: extensible question renderer registry with single-choice view"
```

---

## Task 12: Lesson page UI assembly (Hero, nav, concepts, quiz, review)

**Files:**
- Create: `src/ui/Hero.tsx`, `src/ui/CurriculumNav.tsx`, `src/ui/ConceptCard.tsx`, `src/ui/ConceptsPanel.tsx`, `src/ui/QuizPanel.tsx`, `src/ui/ReviewPanel.tsx`; rewrite `src/App.tsx`; create `src/App.test.tsx`; extend `src/styles.css`

**Interfaces:**
- Consumes: `lessons`, `curriculum`, `QuestionView`, `ArchitectureDiagram`, `scoreAttempt`/`buildReview`, `LocalStorageAdapter`.
- Produces: routes `/:dayId/:section?`, a lesson page rendering all sections with progressive disclosure and case/counter-case contrast.

- [ ] **Step 1: Write the failing test**

```tsx
// src/App.test.tsx
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { lessons } from "./content/lessons";

beforeEach(() => localStorage.clear());
const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

it("renders the first lesson title and its production/counter example contrast", () => {
  renderAt(`/${lessons[0].id}/concepts`);
  expect(screen.getByText(lessons[0].title, { exact: false })).toBeInTheDocument();
  expect(screen.getAllByText("生产案例").length).toBeGreaterThan(0);
  expect(screen.getAllByText("反例").length).toBeGreaterThan(0);
});

it("shows each question's weight beside it", () => {
  renderAt(`/${lessons[0].id}/practice`);
  expect(screen.getByText(/本题 \d+ 分/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/App.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement components and App**

Build: `Hero` (phase eyebrow, capability statement, mentalModel); `CurriculumNav` (20-day list, active state, route on click); `ConceptCard` (progressive disclosure: idea → whyItMatters → 生产案例/反例 two-column contrast with `.example.good`/`.example.bad` → 误区 symptom/fix → optional concept `ArchitectureDiagram`); `ConceptsPanel`; `QuizPanel` (numbered question matrix, `QuestionView`, shows `本题 {weight} 分`, prev/next + select); `ReviewPanel` (score/100, weak concepts, recommendations, history, export). Rewrite `App.tsx` with routes `/:dayId/:section?`, section anchors `series|concepts|decision|practice|review`, scroll sync, adapter wiring. Extend CSS for the two-column case/counter-case contrast and reading rhythm.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: lesson page with progressive disclosure and case contrast"
```

---

## Task 13: Practice, rubric, capability archive UI

**Files:**
- Create: `src/ui/PracticePanel.tsx`, `src/ui/RubricPanel.tsx`, `src/ui/CapabilityArchive.tsx`; wire into `App.tsx`; extend `src/App.test.tsx`

**Interfaces:**
- Consumes: `LocalStorageAdapter`, `buildCapabilityArchive`, `scoreRubric`, lesson `verifiableOutput`/`rubric`.
- Produces: practice section (textarea saved to adapter), rubric checklist, capability archive view + JSON export.

- [ ] **Step 1: Write the failing test**

```tsx
// add to src/App.test.tsx
it("saves practice evidence text to the learner-state adapter", () => {
  renderAt(`/${lessons[0].id}/practice`);
  const box = screen.getByLabelText("练习产出");
  fireEvent.change(box, { target: { value: "我的边界判断" } });
  fireEvent.blur(box);
  expect(localStorage.getItem(`study-ai-claude.${lessons[0].id}.practiceEvidence`)).toMatch(/我的边界判断/);
});
```
(import `fireEvent` at the top of the test file.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/App.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`PracticePanel`: shows `verifiableOutput` prompt + `<textarea aria-label="练习产出">`; on blur calls `adapter.savePracticeEvidence`. `RubricPanel`: checklist of `lesson.rubric`, toggling updates evidence `rubricChecks`. `CapabilityArchive`: table from `buildCapabilityArchive(lessons, adapter)` + an "导出能力档案" button calling `adapter.exportArchive(ids)` → download JSON blob. Wire `PracticePanel`/`RubricPanel` into the practice section and add a `/archive` route or a review-section archive block.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/PracticePanel.tsx src/ui/RubricPanel.tsx src/ui/CapabilityArchive.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: practice evidence, self-rubric, capability archive UI"
```

---

## Task 14: Author Day01–Day20 content

**Files:**
- Create: `content/day01.md` … `content/day20.md`
- Delete: `content/_fixture.day99.md`
- Modify: `scripts/validate-content.mjs` (enforce exactly 20 days)

**Interfaces:**
- Consumes: schema (Task 2), validator (Task 4).
- Produces: 20 frontmatter day files passing schema + validator, deepened from `../study-ai/docs/interactive-learning/dayXX.md` and `../study-ai/apps/interactive-lessons/src/data/dayXX.ts`.

- [ ] **Step 1: Add the day-count assertion (failing)**

In `scripts/validate-content.mjs main()`: `if (lessons.length !== 20) { console.error(...); process.exit(1); }`. Add a test in `scripts/validate-content.test.mjs` asserting a 19-length set fails. Run: `pnpm vitest run scripts/validate-content.test.mjs` → the new unit passes, but `pnpm validate:content` fails (only fixture exists).

- [ ] **Step 2: Author content to the deep contract**

For each day, port the capability/concepts/architecture from study-ai and **deepen**: real `productionExample`/`counterExample` with specifics, `pitfalls` with symptom/fix, a `mentalModel`, a `walkthrough`, an authored `architecture` of the correct relationship `type`, a `rubric`, annotated `references`, and weighted `questions` summing to 100 (vary count/weights by topic — not forced to 4). Curriculum order = the study-ai 20-day capability route (Day01 model boundary … Day20 product flywheel).

- [ ] **Step 3: Remove fixture and verify the full gate**

Delete `content/_fixture.day99.md`. Run: `pnpm validate:content && pnpm test`
Expected: PASS — 20 lessons validated, all suites green.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: PASS — generated lessons compiled into the bundle.

- [ ] **Step 5: Commit**

```bash
git add content scripts/validate-content.mjs scripts/validate-content.test.mjs
git commit -m "content: author 20-day deepened curriculum"
```

---

## Task 15: Product docs, process workflow, changelog, README, iteration doc

**Files:**
- Create: `docs/product/prd.md`, `docs/product/requirements-index.md`, `docs/product/topics/feature/{F1-multi,F2-fill-blank,F3-short-answer,F4-flexible-weights}.md`, `docs/process/iteration-workflow.md`, `CHANGELOG.md`, `README.md`, `docs/iterations/2026-06-27-p0.5-f5.md`

**Interfaces:**
- Produces: the documentation set and workflow described in the spec §11.

- [ ] **Step 1: Write product + process docs**

`prd.md`: adapt study-ai's PRD, mark P0.5 done and P1–P3 staged. `requirements-index.md`: index with F1–F4 feature topics + this build. Each `topics/feature/*.md`: one-paragraph problem/scope/acceptance for the deferred feature, noting it only adds a grader + renderer + content per the registry seam. `iteration-workflow.md`: the loop `topic → spec → plan → TDD → CHANGELOG + iteration doc → commit/push` and the required artifacts.

- [ ] **Step 2: Write README + CHANGELOG + iteration doc**

`README.md`: what it is, Day01–20 local-first scope, commands (`pnpm dev|test|validate:content|build`), source-of-truth pipeline, links to PRD/spec/plan. `CHANGELOG.md` (Keep a Changelog): first entry summarizing P0.5 + F5. `docs/iterations/2026-06-27-p0.5-f5.md`: what was built, decisions (frontmatter-as-source, single-only grader, vite-node if used), verification results, leftovers (F1–F4).

- [ ] **Step 3: Verify full pipeline**

Run: `pnpm validate:content && pnpm test && pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs README.md CHANGELOG.md
git commit -m "docs: product, process, changelog, README, iteration log"
```

---

## Task 16: Finalize and push

**Files:** none (integration + push)

- [ ] **Step 1: Generate lockfile and full green run**

Run: `pnpm install && pnpm validate:content && pnpm test && pnpm build`
Expected: all PASS; `pnpm-lock.yaml` present.

- [ ] **Step 2: Confirm generated/dist not tracked**

Run: `git status --porcelain` then `git check-ignore src/content/lessons.generated.ts dist`
Expected: generated + dist ignored; no stray tracked artifacts.

- [ ] **Step 3: Commit lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: add lockfile"
```

- [ ] **Step 4: Push to remote**

Run: `git push -u origin main`
Expected: branch published to `git@github.com:ilovex1314/study-ai-claude.git`.

---

## Self-Review (completed)

- **Spec coverage:** content pipeline (T2–T4), curriculum (T5), assessment+registry seam (T6–T7,T11), learner-state adapter (T8), practice/rubric/archive (T9,T13), diagram engine F5-2 (T10), deep content F5-1 (T2 schema + T14 authoring), presentation F5-3 (T12), quality gates (T1 CI + T4 validator + tests throughout), workflow sedimentation (T15), push (T16). All spec sections map to tasks.
- **Placeholder scan:** code provided for all logic steps; T10/T12/T14 reference the study-ai files to adapt rather than re-pasting large UI/content — acceptable because those are adaptation/authoring tasks, not novel logic.
- **Type consistency:** `AnswerValue`, `Grader`, `GradeResult`, `LearnerStateAdapter`, `CapabilityRow`, `Architecture` names are consistent across tasks; `gradeQuestion`/`scoreAttempt`/`buildReview`/`scoreRubric`/`buildCapabilityArchive` signatures align with their consumers.
- **Known risk:** importing `schema.ts` (TS) from `.mjs` scripts under plain `node`. Mitigation noted in T3: switch the `generate:content`/`prebuild`/`pretest` runner to `vite-node` if `node` can't import TS; record in the iteration doc.
