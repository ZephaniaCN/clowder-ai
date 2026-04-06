---
feature_ids: [F152]
related_features: [F049, F058, F070, F076]
topics: [project-management, napm, health-check, evidence]
doc_kind: spec
created: 2026-04-06
---

# F152 Phase C: Cat Cafe 吸收 NAPM 优秀特性

> **Status**: spec | **Owner**: Ragdoll | **Depends on**: F152 Phase B (done)

## 目标

Phase B 完成了 `WorkItemRef` 泛化和方法论路由基础。Phase C 将 NAPM 的两大优秀能力引入 Cat Cafe：
1. **结构化验收** — Feature AC 支持 `verify` 命令和 `evidence` 引用
2. **自动化健康检查** — 检测 queue drift、证据缺失、停滞项

Phase B 中推迟的 B4（统计泛化）和 B5（自领策略泛化）也归入本阶段。

## 核心变更

### C1. Feature Doc AC verify/evidence 扩展

**当前格式**：
```markdown
- [ ] AC-A1: WorkItem 类型定义并通过 TypeScript 编译
```

**扩展格式（吸收 NAPM intent/dod/verify 理念）**：
```markdown
- [ ] AC-A1: WorkItem 类型定义并通过 TypeScript 编译 [verify: pnpm --filter @cat-cafe/shared build] [evidence: commit:abc123]
```

**实现**：

```typescript
/** Parsed AC entry from feature doc markdown. */
interface ParsedAC {
  readonly id: string;           // "AC-A1"
  readonly description: string;  // "WorkItem 类型定义并通过 TypeScript 编译"
  readonly checked: boolean;     // true if [x]
  readonly verifyCmd?: string;   // "pnpm --filter @cat-cafe/shared build"
  readonly evidenceRef?: string; // "commit:abc123"
}

/**
 * Parse AC lines from feature doc markdown.
 * Matches: - [ ] AC-{id}: {description} [verify: {cmd}] [evidence: {ref}]
 */
function parseFeatureACs(markdown: string): ParsedAC[];
```

**切片**：
- C1a: `parseFeatureACs()` 工具函数 + 单元测试
- C1b: Feature metadata 存储 parsed ACs（扩展 BacklogItem 或新 store）
- C1c: Mission Hub UI 展示 verify/evidence 徽章

### C2. 健康检查基础设施

**吸收 NAPM 的 `check` 理念**，为 Cat Cafe 项目添加自动化健康检查。

```typescript
/** Health check result for a single item. */
interface HealthCheckFinding {
  readonly severity: 'critical' | 'warning' | 'info';
  readonly category: 'queue-drift' | 'evidence-gap' | 'stale-item';
  readonly workItemRef?: WorkItemRef;
  readonly message: string;
  readonly suggestion?: string;
}

/** Full health report. */
interface HealthReport {
  readonly checkedAt: number;
  readonly findings: readonly HealthCheckFinding[];
  readonly summary: {
    readonly critical: number;
    readonly warning: number;
    readonly info: number;
  };
}
```

**三个检查器**：

| 检查器 | 检测 | 严重度 |
|--------|------|--------|
| QueueDriftChecker | ROADMAP 状态 vs WorkflowSop 实际阶段不一致 | warning |
| EvidenceCompletenessChecker | Feature 声明 done 但无 evidence ref | critical |
| StaleItemChecker | 项目在某阶段停留超过阈值（可配置） | info/warning |

**切片**：
- C2a: HealthCheck runner 框架 + 类型定义
- C2b: QueueDriftChecker 实现
- C2c: EvidenceCompletenessChecker 实现
- C2d: StaleItemChecker 实现
- C2e: `GET /api/health-check/report` API 端点
- C2f: Mission Hub 健康检查结果面板 UI

### C3. 统计与筛选泛化（从 B4 推迟）

**当前问题**：统计 API 假设所有 work item 都是 feature。

```typescript
// GET /api/work-items/stats?methodology=cat-cafe
interface WorkItemStats {
  byStatus: Record<string, number>;
  byMethodology: Record<string, number>;
  byOwner: Record<string, number>;
}
```

**切片**：
- C3a: WorkItemStats 类型 + 聚合逻辑（复用 UsageAggregator 模式）
- C3b: `GET /api/work-items/stats` 端点

### C4. 自领策略泛化（从 B5 推迟）

**当前问题**：`selfClaimScope` 按 catId 配置，不区分方法论。

```typescript
interface SelfClaimPolicy {
  defaultScope: MissionHubSelfClaimScope;
  byMethodology?: Partial<Record<ProjectMethodology, {
    scope: MissionHubSelfClaimScope;
    requireVerified?: boolean;  // NAPM 特有：verify 通过才能 claim 下一个
  }>>;
}
```

**切片**：
- C4a: SelfClaimPolicy 类型 + 配置加载
- C4b: 更新 self-claim 端点使用新策略模型

## 优先级

| 优先级 | 切片 | 理由 |
|--------|------|------|
| P0 | C1a, C2a-C2e | AC 验收标准直接要求 |
| P1 | C1b-C1c, C2f | UI 可视化，延迟不阻塞 |
| P2 | C3, C4 | 增强功能，Phase B 推迟项 |

## 验收标准

- [ ] AC-C1: Feature Doc AC 支持 `[verify: cmd]` `[evidence: ref]` 扩展格式
- [ ] AC-C2: 健康检查能检测 queue drift 和 evidence 缺失
- [ ] AC-C3: 统计 API 支持 methodology 过滤（从 B4）
- [ ] AC-C4: 自领策略支持按方法论配置（从 B5）

## 分工建议

| 切片 | 负责 | 说明 |
|------|------|------|
| C1a AC parser | @opus | 核心解析逻辑，需要精确正则 |
| C2a 框架 + 类型 | @opus | 健康检查架构设计 |
| C2b-C2d 检查器实现 | @gpt52 | API 层实现 + 测试 |
| C2e API 端点 | @gpt52 | Route 注册 |
| C1b-C1c UI | @gemini25 | verify/evidence 徽章展示 |
| C2f 健康面板 UI | @gemini25 | 检查结果可视化 |
| C3 统计 API | @gpt52 | 端点 + 聚合逻辑 |
| C4 自领策略 | @opus | 配置模型变更 |

## 风险

| 风险 | 缓解 |
|------|------|
| AC 格式解析容易出边界 case | 严格正则 + 丰富单元测试 |
| 健康检查误报干扰工作流 | severity 分级，info 级别不阻塞 |
| ROADMAP.md 格式非标导致 drift 检测失败 | 先只检查 Redis WorkflowSop 数据，不解析 markdown |

## 依赖

- F152 Phase B 全部完成 ✅
- 现有 evidence store (SQLite FTS5) ✅
- 现有 self-claim infrastructure ✅

---

*关联*: [F152 Phase B Spec](./F152-phase-b-spec.md) | [F152 Main Spec](./F152-unified-project-management.md)
