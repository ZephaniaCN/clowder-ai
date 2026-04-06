# F152 Phase B: WorkItemRef 泛化 + 方法论路由

> **Status**: spec-v2 | **Owner**: Ragdoll | **Depends on**: F152 Phase A (done)
> **Reviewed by**: @opus (2026-04-06) — corrected field names, Redis key pattern, migration strategy

## 目标

Phase A 建立了 NAPM 只读适配层。Phase B 将 `WorkItemRef` 泛化为 Cat Cafe 的核心引用模型，解除 `featureId + backlogItemId` 硬编码，实现真正的多方法论路由。

## 核心变更

### B1. WorkItemRef 成为系统级引用标准

当前问题：`WorkflowSop`、`thread metadata`、`execution digest` 等硬编码 `featureId + backlogItemId`。

**迁移策略（加法迁移）**：

```typescript
// 1. 现有类型（packages/shared/src/types/workflow-sop.ts）：
//    保留旧字段做回读兼容
interface WorkflowSop {
  // 旧字段（保留，用于回读兼容）
  readonly featureId: string;         // deprecated → workItemRef.id
  readonly backlogItemId: string;     // deprecated → workItemRef.id

  // 新字段（Phase B 起使用）
  readonly workItemRef?: WorkItemRef; // methodology + projectId + kind + id

  // 以下字段保持不变
  readonly stage: SopStage;           // 'kickoff' | 'impl' | 'quality_gate' | 'review' | 'merge' | 'completion'
  readonly batonHolder: string;
  readonly nextSkill: string | null;
  readonly resumeCapsule: ResumeCapsule;
  readonly checks: SopChecks;
  readonly version: number;
  readonly updatedAt: number;
  readonly updatedBy: string;
}

// 2. 双写期（Phase B）
// - 写：同时写旧字段（featureId/backlogItemId）和新字段（workItemRef）
// - 读：优先读 workItemRef，不存在时从旧字段推导

// 3. 清理期（Phase C/D）
// - 确认所有存量数据已含 workItemRef 后，移除旧字段
```

### B2. 数据无损升级

**迁移脚本** (`scripts/migrate-workitem-ref.ts`)：

```typescript
// 遍历所有 WorkflowSop 记录
for (const sop of allWorkflowSops) {
  if (!sop.workItemRef && sop.featureId) {
    // 从旧字段推导新字段
    sop.workItemRef = {
      methodology: 'cat-cafe',    // 旧数据默认 cat-cafe
      projectId: inferProjectId(sop.featureId),
      kind: 'feature',
      id: sop.featureId,
    };
    await save(sop);
  }
}
```

### B3. Thread 关联泛化

**Thread metadata 扩展**：

```typescript
interface ThreadMetadata {
  // 旧字段（保留兼容）
  backlogItemId?: string;
  featureId?: string;
  
  // 新字段
  workItemRef?: WorkItemRef;
  
  // 新增：多方法论支持
  methodology: 'cat-cafe' | 'napm' | 'minimal';
  
  // 派发信息（所有方法论通用）
  dispatch: {
    workItemTitle: string;
    intent: string;
    dod?: string;
    verifyCmd?: string;
  };
}
```

### B4. 统计与筛选泛化

**当前问题**：统计 API 假设所有 work item 都是 feature。

**新 API 设计**：

```typescript
// GET /api/work-items/stats?projectId=xxx&methodology=napm
interface WorkItemStats {
  byStatus: Record<LifecycleStatus, number>;
  byExecutionStage?: Record<ExecutionStage, number>;  // NAPM 特有
  byOwner: Record<string, number>;
  byPriority: Record<string, number>;
}

// GET /api/work-items?methodology=napm&status=doing
interface ListWorkItemsRequest {
  methodology?: 'cat-cafe' | 'napm' | 'minimal';
  projectId?: string;
  lifecycleStatus?: LifecycleStatus;
  executionStage?: ExecutionStage;  // NAPM 特有
  owner?: string;
  priority?: string;
}
```

### B5. 自领策略泛化

**当前问题**：`selfClaimScope` 配置假设 backlog item 是统一类型。

**新配置模型**：

```typescript
interface SelfClaimPolicy {
  // 全局默认
  defaultScope: 'once' | 'thread' | 'global';
  
  // 按方法论覆盖
  byMethodology: Record<Methodology, {
    scope: 'once' | 'thread' | 'global';
    // NAPM 特有：是否允许自领 slice
    allowSliceClaim?: boolean;
    // 是否要求 verify 通过才能 claim 下一个
    requireVerified?: boolean;
  }>;
}
```

## API 变更清单

### 新增端点

| 端点 | 说明 |
|------|------|
| `POST /api/work-items/migrate` | 触发 WorkItemRef 迁移（管理员）|
| `GET /api/work-items/stats` | 泛化统计（支持 methodology 过滤）|

### 修改端点（加法变更）

| 端点 | 变更 |
|------|------|
| `GET /api/workflow-sop` | 响应增加 `workItemRef` 字段 |
| `POST /api/workflow-sop` | 请求体支持 `workItemRef` |
| `GET /api/threads/:id` | 响应增加 `workItemRef` + `methodology` |
| `GET /api/backlog/items` | 响应增加 `workItemRef` |

## 数据库变更

### Redis Schema 变更

```
# 现有 key 模式（WorkflowSopKeys.detail）：
workflow:sop:{backlogItemId} → JSON { featureId, backlogItemId, stage, ... }

# Phase B 策略：保持同一 key，演进 value 的 JSON shape
# 不引入 v2 key — 避免改变寻址语义和破坏 Lua CAS 逻辑
workflow:sop:{backlogItemId} → JSON { featureId, backlogItemId, workItemRef, stage, ... }
```

### 迁移策略

1. **双写期**：每次 upsert 同时写旧字段 + workItemRef，同一个 key
2. **读兼容**：读取时优先用 workItemRef，不存在则从 featureId/backlogItemId 推导
3. **批量迁移**：脚本遍历所有 `workflow:sop:*` key，补写 workItemRef
4. **清理期**：Phase C/D 确认全部迁移后移除旧字段

## 测试策略

### 回归测试

- [ ] 现有 WorkflowSop 测试全部通过（旧字段兼容）
- [ ] 现有 Thread 关联测试全部通过
- [ ] 现有统计 API 测试全部通过

### 新增测试

- [ ] WorkItemRef 迁移脚本测试
- [ ] 双读兼容逻辑测试（新字段不存在时回读旧字段）
- [ ] NAPM 项目 WorkflowSop 全流程测试
- [ ] 跨方法论统计 API 测试

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 迁移脚本出错导致数据丢失 | 迁移前全量备份 + 可回滚 + dry-run 验证 |
| 双写性能下降 | 异步写新 key + 批量迁移 |
| 旧客户端不兼容 | 保留旧字段读取 + 逐步弃用 |
| NAPM 与 Cat Cafe 状态语义混淆 | 严格区分 `lifecycleStatus` vs `executionStage` |

## 验收标准 (AC-B)

- [ ] AC-B1: `WorkflowSop` 使用 `WorkItemRef` 替代 `featureId`
- [ ] AC-B2: Thread 关联支持 `feature/task/slice` 三种类型
- [ ] AC-B3: 方法论路由根据项目类型提示正确的 skill
- [ ] AC-B4: 数据迁移脚本通过 dry-run 验证
- [ ] AC-B5: 所有现有测试通过（零破坏）
- [ ] AC-B6: NAPM 项目 WorkflowSop 全流程可运行

## 依赖

- F152 Phase A 全部 AC 达成
- 数据迁移脚本开发完成

## 时间估算

| 任务 | 工期 |
|------|------|
| WorkItemRef 类型扩展 | 1d |
| WorkflowSop 双写改造 | 2d |
| Thread metadata 扩展 | 1d |
| 统计 API 泛化 | 2d |
| 数据迁移脚本 | 2d |
| 测试覆盖 | 2d |
| **总计** | **~10 工作日** |

## 下一步

等待 F152 Phase A 全部 AC 验证完成后，进入 Phase B 详细设计和实现。

---

*关联*: [F152 Phase A Spec](./F152-unified-project-management.md)
