---
name: napm-lifecycle
description: >
  NAPM (Node Agent Project Management) 项目的生命周期管理 skill。
  用于 Mission Hub 接入 NAPM 项目后的执行层治理：Plan → Execute → Verify → Document。
  与 feat-lifecycle 的关系：feat-lifecycle 负责 Feature 立项到完成的治理层流程，
  napm-lifecycle 负责 NAPM 项目内部的执行层闭环。
triggers:
  - "napm 项目"
  - "NAPM lifecycle"
  - "pm/next"
  - "pm/backlog"
  - "EVIDENCE.md"
  - "Plan Execute Verify Document"
  - "NAPM 适配"
  - "methodology: napm"
updated: 2026-04-06
---

# NAPM Lifecycle

管理 NAPM 项目的执行层生命周期：Plan → Execute(one slice) → Verify → Document。

## 与 feat-lifecycle 的分工

| 层次 | Skill | 职责 | 真相源 |
|------|-------|------|--------|
| **治理层** | `feat-lifecycle` | Feature 立项、Design Gate、Vision Guardian | `docs/features/Fxxx.md` |
| **执行层** | `napm-lifecycle` (本 skill) | Slice 执行、健康检查、证据落盘 | `pm/next.md` + `EVIDENCE.md` |

**协作关系：**
- Feature 立项 (feat-lifecycle) → NAPM 项目初始化 (napm-lifecycle)
- NAPM 执行推进 (napm-lifecycle) → Mission Hub 状态同步 → Feature Phase 更新 (feat-lifecycle)
- Feature Vision Guardian (feat-lifecycle) ← 证据汇总 (napm-lifecycle)

## Use When

- 需要为 NAPM 项目初始化执行环境
- 需要读取/解析 NAPM 的 `pm/next.md`、`pm/backlog.md`、`EVIDENCE.md`
- 需要推进 NAPM 项目的 Plan → Execute → Verify → Document 闭环
- 需要将 NAPM 项目状态同步到 Mission Hub
- 需要执行 NAPM 健康检查 (`napm check`)

## Not For

- Feature 立项或 Design Gate（用 `feat-lifecycle`）
- 代码 Review 或 Merge（用 `merge-gate`）
- 纯 Feature-doc 方法论的项目（用 `feat-lifecycle` + `mission-hub`）

## 核心概念

### NAPM 数据模型

```
pm/
├── next.md          # 当前执行队列 (SSOT)
├── backlog.md       # 长期队列
├── state.yaml       # 运行时状态
├── EVIDENCE.md      # 证据汇总
└── progress/        # 切片级进度
```

### 执行闭环

```
Plan (计划)
  └─> 从 backlog.md 选择 1-3 条任务
  └─> 完善 intent / dod / verify
  └─> 写入 next.md

Execute (执行)
  └─> 选择一个 doing 项
  └─> 生成 progress/{date}-{task}.md
  └─> 执行实际工作

Verify (验证)
  └─> 执行 verify 命令
  └─> 通过 → 标记 done
  └─> 失败 → 进入 fix 流程

Document (记录)
  └─> 更新 EVIDENCE.md
  └─> 回流 Mission Hub
```

## Quick Start

### 1. 读取 NAPM 项目状态

```typescript
// 使用 NapmAdapter 读取
const adapter = new NapmAdapter(projectPath);
const nextItems = await adapter.readNextMd();
const backlogItems = await adapter.readBacklogMd();
const evidence = await adapter.readEvidenceMd();

// 映射到统一工作项模型
const workItems = await adapter.toWorkItems();
```

### 2. 执行一个 Slice

```bash
# 进入 NAPM 项目目录
cd /path/to/napm-project

# 查看当前队列
python3 scripts/napm.py status

# 执行一个切片
python3 scripts/napm.py do --mode manual --cycles 1

# 验证
python3 scripts/napm.py check --target health --profile strict
```

### 3. 同步到 Mission Hub

```typescript
// Mission Hub 自动同步 NAPM 项目状态
// 通过 external-projects API

// 1. 导入 NAPM 项目
POST /api/external-projects
{
  "name": "my-napm-project",
  "sourcePath": "/path/to/project",
  "methodology": "napm"  // 关键字段
}

// 2. Mission Hub 自动识别并展示 NAPM 队列
GET /api/external-projects/{id}/napm-status
```

## 数据解析规范

### pm/next.md 格式

```markdown
- [x] [owner:alice] [priority:P0] [scope:core] [status:done] [intent:目标] [dod:完成标准] [verify:验证命令] task-id
- [ ] [owner:bob] [priority:P1] [scope:ui] [status:doing] [intent:...] [dod:...] [risk:high] another-task
  - 当前状态: 进行中
  - 下一步: 实现 X
  - 阻塞项: 等待 Y
```

### 字段映射 (F152 双轴模型)

| NAPM 字段 | 统一模型字段 | 类型 | 说明 |
|-----------|-------------|------|------|
| `task-id` | `ref.id` | string | WorkItemRef 四段之一 |
| - | `ref.methodology` | "napm" | 固定值 |
| - | `ref.projectId` | string | 从项目配置读取 |
| - | `ref.kind` | "task" | NAPM 任务映射为 task |
| `owner` | `owner` | string | 任务负责人 |
| `priority` | `priority` | "P0" \| "P1" \| "P2" \| "P3" | 优先级 |
| `scope` | `scope` | string | 作用域标签 |
| `status` (todo/doing/done) | `lifecycleStatus` | "todo" \| "doing" \| "done" \| "obsolete" | 治理状态 |
| `status` (doing) + context | `executionStage` | "plan" \| "execute" \| "verify" \| "document" \| "idle" | 执行阶段 |
| `intent` | `intent` | string | 目标意图 |
| `dod` | `dod` | string | Definition of Done |
| `verify` | `verifyCmd` | string | 验证命令 |
| `risk` | `risk` | "high" \| "medium" \| "low" | 风险级别 |
| `context_ref` | `evidenceRefs` | array | 证据引用列表 |

## 与 Mission Hub 的集成

### Phase A: 只读适配 (当前)

**Mission Hub 能力：**
- 识别 `methodology: "napm"` 的外部项目
- 读取并展示 `pm/next.md` 队列
- 展示 `Plan / Execute / Verify / Document` 阶段

**代码位置：**
- Adapter: `packages/api/src/domains/projects/napm-adapter.ts`
- Routes: `packages/api/src/routes/external-projects.ts`
- UI: `packages/web/src/components/mission-control/NapmProjectTab.tsx`

### Phase B: 状态同步 (未来)

**双向同步边界：**
- ✅ Mission Hub 读取 NAPM 状态
- ❌ Mission Hub 不直接修改 `pm/next.md`
- ✅ NAPM 执行完成后回流状态到 Mission Hub

## CLI 命令速查

```bash
# 状态查询
napm status
napm status --scope current    # 当前队列
napm status --scope hub        # Hub 级状态

# 任务管理
napm task list
napm task add "标题" --priority P0 --scope core --owner alice
napm task split --id task:abc --parts "A,B"
napm task promote --count 3    # backlog → next
napm task transition --id task:abc --to done --reason "verified"

# 执行推进
napm do --mode manual --cycles 1
napm do --mode agent --cycles 1

# 门禁与诊断
napm check --target gate --profile strict      # 技术门禁
napm check --target health --profile strict    # 健康检查
napm check --target event --profile strict     # 事件检查
napm check --target agentmd --profile strict   # Agent MD 检查

# 自动修复
napm fix --target health --dry-run
napm fix --target health --auto
```

## 健康检查 (Health Check)

NAPM 健康检查用于验证项目状态是否健康，可集成到 Quality Gate。

### 检查目标

| 目标 | 说明 | 严格模式 |
|------|------|----------|
| `gate` | 技术门禁（测试、lint） | 失败即阻断 |
| `health` | 项目健康度 | 警告但可继续 |
| `event` | 事件处理状态 | 失败即阻断 |
| `agentmd` | Agent 文档合规性 | 警告但可继续 |

### 集成到 Quality Gate

```typescript
// quality-gate skill 中调用
const healthResult = await runNapmCheck(projectPath, 'health', 'strict');
if (!healthResult.passed) {
  reportIssue('NAPM health check failed', healthResult.details);
}
```

## 证据模型

### EVIDENCE.md 结构

```markdown
# EVIDENCE: {Project Name}

## YYYY-MM-DD: 里程碑标题

### 完成内容
- ✅ 完成项 1
- ✅ 完成项 2

### 验证证据
```bash
验证命令及输出
```

### 证据路径
- `pm/progress/xxx.md`
- `pm/artifacts/xxx.json`
```

### 与 Feature Doc 的关系

- **EVIDENCE.md**: 执行过程证据（NAPM 维护）
- **Fxxx.md Timeline**: Feature 阶段记录（feat-lifecycle 维护）
- **链接方式**: EVIDENCE.md 条目引用对应的 Feature ID

## Common Mistakes

| 错误 | 正确 |
|------|------|
| 直接修改 `pm/next.md` 而不更新 `state.yaml` | 使用 `napm task transition` 命令 |
| 跳过 `verify` 直接标记 done | 必须执行 verify 命令并验证通过 |
| 把 EVIDENCE.md 当 TODO 用 | EVIDENCE 只记录已完成的事项 |
| 混淆 NAPM 和 feat-lifecycle 的职责 | NAPM = 执行层, feat-lifecycle = 治理层 |

## Exit Contract

使用本 skill 完成 NAPM 项目推进后，应产出：

- [ ] `pm/next.md` 状态更新
- [ ] `pm/progress/*.md` 切片记录
- [ ] `EVIDENCE.md` 证据条目
- [ ] Mission Hub 状态同步完成
- [ ] 健康检查通过 (`napm check --target health`)

## Next Steps

- 初始化 NAPM 项目 → `napm project init`
- Feature 立项 → `feat-lifecycle` (Kickoff)
- 执行推进 → 本 skill (Execute/Verify/Document)
- 代码合并 → `merge-gate`
- Feature 完成 → `feat-lifecycle` (Completion)

## References

- [NAPM 数据模型规范](/docs/napm-data-model.md)
- [NAPM × Cat Cafe 对照表](/docs/napm-catcabe-mapping.md)
- [F152: Unified Project Management](/docs/features/F152-unified-project-management.md)
- [feat-lifecycle Skill](/cat-cafe-skills/feat-lifecycle/SKILL.md)
