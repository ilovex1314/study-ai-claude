# 迭代工作流

每次迭代都走同一条闭环，并沉淀两份固定产物。

## 闭环

```
需求落 topic → 规格(spec) → 计划(plan) → TDD 实现 → 更新 CHANGELOG + 写 docs/iterations/YYYY-MM-DD-<topic>.md → 提交/推送
```

1. **需求落 topic**：把需求写进 `docs/product/topics/feature/<id>-<name>.md`（问题/范围/实现/验收），并在 `docs/product/requirements-index.md` 登记。
2. **规格**：`docs/superpowers/specs/YYYY-MM-DD-<topic>.md`，明确目标、约束、决策、风险。
3. **计划**：`docs/superpowers/plans/YYYY-MM-DD-<topic>.md`，拆成可独立验证的 TDD 任务，每任务给接口与验收。
4. **TDD 实现**：每任务先写失败测试 → 实现 → 通过 → 提交。内容改动须过 `pnpm validate:content`。
5. **沉淀**：更新 `CHANGELOG.md`（Keep a Changelog）；写 `docs/iterations/YYYY-MM-DD-<topic>.md` 记录建了什么、关键决策、验证结果、遗留项。
6. **提交/推送**：提交信息以 `Co-Authored-By` 结尾；CI 必须全绿。

## 必备产物

- **CHANGELOG 条目**：用户可见变化的摘要。
- **迭代文档**：`docs/iterations/` 下一份，含决策与遗留。

## 质量门禁

CI 跑 `pnpm validate:content && pnpm test && pnpm build`。三者之一不过即阻断。`lessons.generated.ts` 不入库，由 prebuild/CI 生成。

## 不变量（不要回退）

- 单一事实源：内容只在 `content/dayXX.md` 改，不手改生成物。
- 题型靠注册表叠加，不动核心评分/渲染。
- 缺数据不兜底——让校验暴露。
- 存储统一 key `study-ai-claude.{lessonId}.{kind}`，无 per-day 特例。
