---
feature_ids: [F152]
related_features: [F049, F058, F070, F076]
topics: [project-management, napm, methodology, mission-hub]
doc_kind: spec
created: 2026-04-06
---

# F152: Unified Project Management — NAPM × Cat Cafe 第一性原理融合

> **Status**: spec | **Owner**: Ragdoll (布偶猫/宪宪) | **Priority**: P0

## Why

Cat Cafe 和 NAPM 是在不同阶段、为不同场景独立演化出的两套项目管理体系：

- **Cat Cafe** (feat-lifecycle + Mission Hub) 擅长**多猫协作治理**：愿景驱动、Design Gate、跨猫 Review、Vision Guardian，但缺少结构化任务模型和自动化执行纪律
- **NAPM** (nextgen-ai-pm) 擅长**单 Agent 自主执行**：结构化任务模型 (intent/dod/verify)、证据纪律、CLI 自动化 (do/check/fix)、队列自愈，但缺少多 Agent 协作和愿景对齐机制

两套系统目前**无法互操作**：数据模型不兼容（ROADMAP.md vs pm/next.md）、证据存储不统一（分散在 git history vs EVIDENCE.md）、门禁体系不映射（流程门禁 vs 技术门禁）。

铲屎官指示：**基于项目管理的第一性原理，相互吸收优秀特性**，而非简单桥接。

## 第一性原理

| # | 原则 | 说明 |
|---|------|------|
| P1 | **每个关注点只有一个真相源** | 不是一个全局 SSOT，而是每种数据类型只有一个权威位置 |
| P2 | **完成 = 可验证** | 没有证据的 "done" 不算 done（NAPM 的 evidence 纪律） |
| P3 | **仪式感与复杂度匹配** | 小任务轻流程，大 Feature 全治理（graduated ceremony） |
| P4 | **愿景与执行分离** | What/Why（治理层）vs How/When（执行层）（Cat Cafe 的愿景驱动） |
| P5 | **机器可读 + 人类友好** | 状态对 Agent 可解析、对铲屎官可直觉理解 |
| P6 | **方法论可组合** | 不同项目/上下文可以选用不同的工作流组合 |

## What

### Phase A: 统一工作项模型 + 只读适配

**核心**：定义 `WorkItem` 统一模型，让 Mission Hub 能同时展示 Feature-doc 项目和 NAPM 项目。

#### A0. ExternalProject 扩展 methodology 字段（前置）

**决策**：现有 `ExternalProject` 类型需要扩展 `methodology` 字段以支持多方法论路由。

```typescript
export interface ExternalProject {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string;
  readonly sourcePath: string;
  readonly backlogPath: string;
  readonly methodology: 'cat-cafe' | 'napm' | 'minimal'; // ← 新增
  readonly createdAt: number;
  readonly updatedAt: number;
}
```

**迁移策略**：现有项目默认 `methodology: 'cat-cafe'`，零破坏迁移。

**UI 路由**：
```typescript
project.methodology === 'napm' 
  ? <NapmProjectTab project={project} />
  : <ExternalProjectTab project={project} />
```

#### A1. 统一 WorkItem 类型（只读展示模型）

**⚠️ WorkItem 是统一读模型（read model），不是新的写入真相源。** 各方法论的原始文件（ROADMAP.md / pm/next.md）保持各自的写入权威地位。WorkItem 只用于 Mission Hub 展示和跨方法论聚合查询。

```typescript
interface WorkItemRef {
  methodology: 'cat-cafe' | 'napm' | 'minimal';
  projectId: string;             // 项目标识，防止跨项目 id 碰撞
  kind: 'feature' | 'task' | 'slice';
  id: string;                    // F152 | task:abc
}

interface WorkItem {
  ref: WorkItemRef;
  source: { type: 'roadmap' | 'pm-next' | 'pm-backlog'; path: string };

  // Display — UI 渲染必需
  title: string;                 // 卡片标题（NAPM: task id 或首行摘要；Cat Cafe: Feature 标题）

  // Intent — 吸收 NAPM 的结构化任务模型
  intent: string;
  dod?: string;                  // Definition of Done
  verifyCmd?: string;            // 验证命令
  scope?: string;

  // Governance — 保留 Cat Cafe 的治理门禁
  gates?: {
    design?: GateStatus;
    quality?: GateStatus;
    review?: GateStatus;
    visionGuardian?: GuardianStatus;
  };

  // 双轴状态模型（@gpt52 建议：治理状态和执行阶段不能压成一个字段）
  lifecycleStatus: 'idea' | 'spec' | 'in-progress' | 'review' | 'done' | 'obsolete';
  executionStage?: 'plan' | 'execute' | 'verify' | 'document' | 'idle';
  phases?: Phase[];
  currentSlice?: string;

  // Evidence — 只存引用，不做内容复制
  evidenceRefs: Array<{ type: 'progress' | 'commit' | 'pr' | 'screenshot'; ref: string }>;
}

// === NAPM native → F152 lifecycleStatus 映射（权威定义）===
// | NAPM status | lifecycleStatus | 说明 |
// |-------------|-----------------|------|
// | todo        | idea            | 未开始，等同于治理层的 idea |
// | doing       | in-progress     | 执行中 |
// | done        | done            | 完成 |
// | blocked     | in-progress     | 仍在进行中，附加 blocked 标志 |
// | obsolete    | obsolete        | 废弃 |
// 注意：NAPM 没有 spec/review 阶段，这些是 Cat Cafe 治理层专有状态

// === 证据时间轴条目（UI 渲染用）===
interface EvidenceEntry {
  id: string;
  sliceId: string;
  sliceTitle: string;
  timestamp: string;             // ISO 8601
  status: 'verified' | 'failed' | 'pending';
  summary: string;
  verifyCmd?: string;
  progressRef?: string;          // path to pm/progress/*.md
}

// === EVIDENCE.md 路径约定 ===
// 权威位置：项目根目录 /EVIDENCE.md（不是 pm/EVIDENCE.md）
// Adapter 应先查根目录，后查 pm/ 目录做兼容
```

#### A2. NapmProjectAdapter（只读）+ API 接口

**Adapter 职责**：
- 解析 `pm/next.md` → `WorkItem[]`（含 intent/dod/verify 等结构化字段）
- 解析 `pm/backlog.md` → `WorkItem[]`
- 解析 `pm/state.yaml` → 项目级状态
- 解析 `pm/progress/*.md` → 证据记录
- 解析根目录 `EVIDENCE.md` → 证据时间轴
- 不生成假的 `docs/features/*.md`，NAPM 项目以 `pm/*` 为真相源

**currentExecutionStage 推导逻辑**（从 NAPM 文件推导）：

| 条件组合 | 推导结果 |
|---------|---------|
| `state.yaml: idle` 或无 doing 项 | `idle` |
| 有 doing 项 + 无对应 evidence | `execute` |
| 有 doing 项 + 有新 evidence 待确认 | `verify` |
| 有 doing 项 + evidence 已通过 | `document` |
| doing 项 evidence 完成 + progress 已写 | `idle`（完成循环）|

**⚠️ 注意**：Phase A 先用简化推导，Phase D 向 NAPM 提 RFC 要求 `state.yaml` 显式 `currentStage` 字段。

**API 接口定义**：

```typescript
// GET /api/external-projects/:id/napm/overview
interface NapmOverview {
  methodology: 'napm';
  projectState: 'in_progress' | 'paused' | 'completed';
  currentExecutionStage: 'plan' | 'execute' | 'verify' | 'document' | 'idle';
  currentSlice?: WorkItem;
  summaryCounts: {
    todo: number;
    doing: number;
    done: number;
    obsolete: number;
    totalEvidence: number;
  };
}

// GET /api/external-projects/:id/napm/work-items
interface NapmWorkItemsResponse {
  items: WorkItem[];
}

// GET /api/external-projects/:id/napm/evidence
interface NapmEvidenceResponse {
  entries: EvidenceEntry[];
}
```

#### A3. Mission Hub 多方法论展示

**组件架构**：
- **独立组件**：`NapmProjectTab`（新） vs `ExternalProjectTab`（F076 Need Audit）
- **条件路由**：根据 `project.methodology` 动态选择
- **不复用**：NAPM 的 Plan→Execute→Verify→Document 与 Need Audit 范式不同，硬塞会变成 Frankenstein

**UI 组件清单**：
- Vision Track（双轨视图左）：展示 `WorkItem[]`（从 backlog + next 生成）
- Execution Track（双轨视图右）：展示当前 Slice + Stepper + Evidence Timeline
- Stepper：Plan → Execute → Verify → Document 四步，当前 stage 高亮
- Evidence Timeline：验证通过（绿）/ 失败（红）卡片式展示
- 空状态：队列为空 / 无 evidence / 未开始的引导性设计

**数据锚点**（UI 假设后端提供）：
- `overview.methodology` — methodology 徽章
- `overview.currentExecutionStage` — Stepper 高亮
- `overview.currentSlice` — Slice Runner 标题
- `overview.summaryCounts` — 空状态判断
- `workItems[]` — Vision Track
- `evidence[]` — Evidence Timeline

### Phase B: 抽象 WorkItemRef + 方法论路由

#### B1. WorkItemRef 泛化

- 当前 `WorkflowSop` 硬编码 `featureId + backlogItemId` → 加法迁移：先加 `workItemRef: WorkItemRef`，保留旧字段做回读兼容，确认稳定后再清理
- Thread metadata、execution digest、统计、筛选、自领策略等关联点同步迁移
- 数据无损升级

#### B2. 方法论路由

- Mission Hub 根据项目 methodology 提示对应 skill
  - `cat-cafe` → `feat-lifecycle` + `quality-gate` + `merge-gate`
  - `napm` → 新 `napm-lifecycle` skill
  - `minimal` → 轻量流程

### Phase C: Cat Cafe 吸收 NAPM 优秀特性

#### C1. Feature Doc 结构化增强

- 吸收 NAPM 的 intent/dod/verify 到 AC 格式：
  ```markdown
  - [ ] AC-A1: {描述} [verify: {command}] [evidence: {ref}]
  ```
- 让 Feature 的每个 AC 都有明确的验证手段和证据引用

#### C2. 健康检查能力

- 吸收 NAPM 的 `check` 理念，为 Cat Cafe 项目添加自动化健康检查：
  - queue drift 检测（ROADMAP 与实际状态是否一致）
  - evidence completeness（Feature 声称 done 但缺证据）
  - stale item 检测

### Phase D: NAPM 吸收 Cat Cafe 优秀特性

#### D1. 愿景对齐机制

- NAPM 任务模型增加 `vision` 字段（AC 全打勾 ≠ 完成，还需愿景对照）
- NAPM check 新增 `--target vision` 检查

#### D2. 多 Agent 协作支持

- NAPM 任务模型支持 `owner` + `reviewer` 角色
- 证据记录支持标注"谁验证的"

#### D3. Design Gate 集成

- NAPM 执行流程中可选 Design Gate 门禁
- `napm do` 在遇到需要确认的任务时暂停等待

## Acceptance Criteria

### Phase A（统一工作项模型 + 只读适配）
- [ ] AC-A0: ExternalProject 扩展 `methodology` 字段，现有项目零破坏迁移
- [ ] AC-A1: WorkItem / WorkItemRef 类型定义并通过 TypeScript 编译
- [ ] AC-A2: NapmProjectAdapter 实现，能解析 pm/ 目录生成 WorkItem[]
- [ ] AC-A3: `/api/external-projects/:id/napm/*` 三个读接口可用
- [ ] AC-A4: `NapmProjectTab` 独立组件实现，双轨视图 + Stepper + Evidence Timeline
- [ ] AC-A5: Mission Hub 条件路由：`methodology === 'napm'` 时展示 NapmProjectTab
- [ ] AC-A6: 使用 `novel-tool-v2` 项目完成集成验收测试
- [ ] AC-A7: 不破坏现有 Feature-doc 项目的工作流

### Phase B（抽象 WorkItemRef + 方法论路由）
- [ ] AC-B1: WorkflowSop 使用 WorkItemRef 替代 featureId
- [ ] AC-B2: Thread 关联支持 feature/task/slice 三种类型
- [ ] AC-B3: 方法论路由根据项目类型提示正确的 skill

### Phase C（Cat Cafe 吸收 NAPM 特性）
- [ ] AC-C1: Feature Doc AC 支持 verify/evidence 扩展格式
- [ ] AC-C2: 健康检查能检测 queue drift 和 evidence 缺失

### Phase D（NAPM 吸收 Cat Cafe 特性）
- [ ] AC-D1: NAPM 任务模型支持 vision 字段
- [ ] AC-D2: napm check --target vision 能检测愿景对齐

## Dependencies

- **Evolved from**: F076（Mission Hub 跨项目作战面板）、F070（Portable Governance）
- **Related**: F049（Mission Control Backlog Center）、F058（Mission Hub Feature Progress Dashboard）
- **Related**: F100（Self-Evolution — 方法论沉淀）

## Risk

| 风险 | 缓解 |
|------|------|
| Phase A 的适配层成为伪抽象 | 先做只读，验证模型稳定后再做写回 |
| WorkItemRef 迁移导致现有功能回退 | 数据无损升级 + 严格回归测试 |
| 双真相源问题（pm/*.md vs ROADMAP.md） | 每个项目只有一个方法论，不混用 |
| NAPM Python CLI 与 Cat Cafe TS 生态不匹配 | Phase A 不直接集成 CLI，只读文件；后续考虑 TS 重写或 MCP 桥接 |

## Open Questions

| # | 问题 | 状态 |
|---|------|------|
| OQ-1 | NAPM Python CLI 长期是保留 Python 还是用 TS 重写？ | ⬜ 未定 |
| OQ-2 | 外部项目是否需要写回能力（Phase D+）？ | ⬜ 未定 |
| OQ-3 | 统一模型是否需要支持第三方 PM 工具（Linear/Jira）导入？ | ⬜ 未定 |

## Key Decisions

| # | 决策 | 理由 | 日期 |
|---|------|------|------|
| KD-1 | 选 Option D+Bridge 作为架构策略，不做底层替换 | 四猫一致共识：feat-lifecycle 与 NAPM 是不同层次（治理 vs 执行），不是竞争关系 | 2026-04-06 |
| KD-2 | 基于第一性原理双向吸收，不是单向适配 | 铲屎官指示 + 架构判断：两套系统各有独到优势 | 2026-04-06 |
| KD-3 | Phase A 只做只读适配，不做写回。WorkItem 是统一读模型（read model），不是新的写入真相源 | @gpt52 建议：先验证模型稳定性，避免双写；防止桥接层升级成第三套 SSOT | 2026-04-06 |
| KD-6 | 状态采用双轴模型：lifecycleStatus（治理）+ executionStage（执行） | @gpt52 建议：Cat Cafe 的 spec/review 和 NAPM 的 plan/verify 语义不同，压成一个 status 会混语义 | 2026-04-06 |
| KD-7 | WorkItemRef 必须含 methodology + projectId + kind + id 四段 | @gpt52 建议：仅 kind+id 会导致跨项目碰撞 | 2026-04-06 |
| KD-8 | evidenceRefs 只存引用不做内容复制，EVIDENCE.md 不同步为 feature doc 正文 | 证据和产品/决策聚合是两种不同关注点 | 2026-04-06 |
| KD-4 | 不修改 feat-lifecycle 来兼容 NAPM，新建 napm-lifecycle skill | @gpt52 建议：避免把 feature governance 和 queue governance 搅成一团 | 2026-04-06 |
| KD-5 | NAPM 项目以 pm/* 为真相源，Mission Hub 只做索引缓存和 UI | 防止双真相源 | 2026-04-06 |
| KD-9 | ExternalProject 需要 `methodology` 字段支持多方法论路由 | @gpt52 发现：现有类型只有 `id/name/sourcePath/backlogPath`，UI 无法区分项目类型 | 2026-04-06 |
| KD-10 | NAPM 使用独立 `NapmProjectTab` 组件，不复用 `ExternalProjectTab` | @gpt52 + 布偶猫：NAPM 的 Plan→Execute→Verify→Document 与 F076 Need Audit 范式完全不同，硬塞会变成 Frankenstein | 2026-04-06 |
| KD-11 | currentExecutionStage 从 NAPM 文件推导（简化版）| NAPM 的 `state.yaml` 没有显式 stage 字段；Phase A 先用条件组合推导，Phase D 向 NAPM 提 RFC 要求显式字段 | 2026-04-06 |

## Timeline

| 日期 | 事件 | 负责 |
|------|------|------|
| 2026-04-06 | 立项。四猫讨论 + 铲屎官方向确认 | 布偶猫 |
| 2026-04-06 | 协议封板：3 处文档不一致修复 | 梵花猫 |
| 2026-04-06 | Design Gate：优先级 P1 确认，进入 Phase A | 铲屎官 |
| TBD | Phase A 完成：A0-A7 全部 AC 达成 | @gpt52 (A0-A3) + @gemini25 (A4-A5) |
| TBD | Phase B 启动：WorkItemRef 泛化 | 待定 |

## Review Gate

- Phase A: 跨 family review（@gpt52 做 code review）
- Phase B: 全猫 review（涉及核心数据模型）
- Phase C/D: 分别由对应系统的 maintainer review

## Links

| 类型 | 路径 | 说明 |
|------|------|------|
| **Feature** | `docs/features/F076-mission-hub-cross-project.md` | Mission Hub 跨项目（前置） |
| **Feature** | `docs/features/F070-portable-governance.md` | 可移植治理（方法论输出） |
| **External** | `/Users/liuzifan/.openclaw/workspace/projects/nextgen-ai-pm/` | NAPM 原始项目 |
| **External** | `/Users/liuzifan/.openclaw/workspace/projects/novel-tool-v2/` | Phase A 验收测试项目 |
| **Skill** | `cat-cafe-skills/feat-lifecycle/SKILL.md` | 现有 Feature 生命周期 skill |
| **Skill** | `cat-cafe-skills/napm-lifecycle/SKILL.md` | 新建 NAPM 生命周期 skill |
| **Doc** | `docs/napm-data-model.md` | NAPM 数据模型规范 |
| **Doc** | `docs/napm-catcabe-mapping.md` | NAPM × Cat Cafe 对照表 |
| **Design** | `designs/f152-mission-hub-napm-v1.png` | UI 设计初稿（@gemini25）|
