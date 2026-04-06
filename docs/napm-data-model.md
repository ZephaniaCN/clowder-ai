# NAPM 数据模型规范 (v1.0)

> NAPM (Node Agent Project Management) 面向 AI 消费者的协议型项目管理工作流
> 
> 核心协议: Plan → Execute(one slice) → Verify → Document

## 目录结构

```
pm/
├── next.md          # 当前执行队列 (SSOT - 唯一真相源)
├── backlog.md       # 长期队列/史诗任务
├── state.yaml       # 运行时状态
├── EVIDENCE.md      # ⚠️ 实际位于项目根目录 /EVIDENCE.md，此处仅为结构参考
├── progress/        # 切片级进度记录
│   └── YYYY-MM-DD-{task-id}.md
├── artifacts/       # 关键产物
│   ├── aar/         # After Action Review
│   └── reports/     # 报告导出
└── config/          # 配置
    └── report_style.yaml
```

## 1. pm/next.md - 当前执行队列

### 格式规范

Markdown checklist，每行一个任务，使用 frontmatter-style 元数据标签。

```markdown
- [x] [owner:alice] [priority:P0] [scope:core] [status:done] [decision_status:approved] [intent:一句话目标] [dod:完成标准] [verify:验证命令] [context_ref:pm/progress/xxx.md] task-id-短横线命名
- [ ] [owner:bob] [priority:P1] [scope:ui] [status:doing] [decision_status:approved] [intent:...] [dod:...] [risk:high] task-with-nested-info
  - 当前状态: 进行中（已入队并开始实现最小切片）
  - 下一步: 增加 action 粒度模式配置
  - 阻塞项: 无
```

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `owner` | string | ✅ | 任务负责人 (如 alice, bob) |
| `priority` | enum | ✅ | P0/P1/P2/P3 |
| `scope` | string | ✅ | 作用域标签 (core/ui/integration) |
| `status` | enum | ✅ | todo/doing/done/obsolete |
| `decision_status` | enum | 条件 | approved/denied/unresolved (P0必填) |
| `intent` | string | ✅ | 一句话描述目标（为什么做） |
| `dod` | string | ✅ | Definition of Done（完成标准） |
| `verify` | string | ✅ | 可执行的验证命令 |
| `context_ref` | string | ✅ | 关联的 progress 文件路径 |
| `risk` | enum | 可选 | high/medium/low |
| `decision_note` | string | 可选 | 决策备注 |
| `decision_resolved_at` | ISO8601 | 可选 | 决策时间戳 |

### 状态流转

```
todo → doing → done
  ↓      ↓      ↓
obsolete (任意状态可转入)
```

**准入条件：**
- `todo → doing`: 必须包含 `intent` + `dod`
- `doing → done`: 必须包含 `verify` 且验证通过

## 2. pm/backlog.md - 长期队列

### 格式规范

史诗级任务组织，支持嵌套结构。

```markdown
# Project Backlog

- Created: 2026-02-16T16:38:02+08:00
- Updated: 2026-02-16T18:12:00+08:00

说明：这里是项目内的长期队列（不限条数）。执行时请把 1–3 条最可执行的条目上架到 `pm/next.md`，再按 next-driven 推进。

## Epic: 史诗名称

- [x] [owner:alice] [priority:P0] [scope:core] [status:done] [decision_status:approved] [decision_note:决策备注] [decision_resolved_at:2026-02-16T23:35:00+08:00] 任务标题
  - 验收：`验证命令`
- [ ] [owner:alice] [priority:P0] [scope:automation] [status:todo] [decision_status:approved] 任务标题
  - 验收：可执行验证标准

## Epic 2: 另一个史诗

...
```

### 与 next.md 的关系

- **backlog.md**: 长期存储，不限条数，史诗级组织
- **next.md**: 当前执行窗口，1-3 条可执行任务
- **上架流程**: 从 backlog 选择 → 完善 metadata → 写入 next.md → 开始执行

## 3. pm/state.yaml - 运行时状态

### 格式规范

```yaml
state: in_progress  # in_progress | paused | completed
updatedAt: '2026-02-24T23:08:30.625768+08:00'
```

### 状态定义

| 状态 | 说明 |
|------|------|
| `in_progress` | 项目进行中 |
| `paused` | 项目暂停 |
| `completed` | 项目完成 |

## 4. EVIDENCE.md - 证据汇总

### 格式规范

时间线格式，按日期倒序排列。

```markdown
# EVIDENCE: {Project Name}

This file records evidence of project progress and milestones.

## YYYY-MM-DD: 里程碑标题

### 完成内容
- ✅ 完成项 1
- ✅ 完成项 2

### 验证证据
```bash
验证命令
# 输出结果
```

### 证据路径
- `pm/artifacts/xxx.json`
- `pm/progress/xxx.md`

---
```

### 与 progress/ 的关系

- **EVIDENCE.md**: 里程碑级汇总，面向人类阅读
- **progress/*.md**: 切片级详细记录，包含设计决策、验证过程、限制说明

## 5. pm/progress/*.md - 切片进度记录

### 命名规范

```
pm/progress/YYYY-MM-DD-{task-id}.md
```

### 格式规范

```markdown
# YYYY-MM-DD 任务标题

## 背景与目标
为什么做这个切片，期望达成什么。

## 设计说明
1. **方案 A**: ...
2. **方案 B**: ...

## 验证命令与结果
```bash
验证命令
```

结果：
- 命令成功，退出码 `0`
- 输出符合预期

## 已知限制
- 限制 1
- 限制 2
```

## 6. CLI 命令规范

### 核心命令

```bash
# 状态查询
napm status                    # 当前项目状态
napm status --scope current    # 当前队列
napm status --scope hub        # Hub 级状态

# 任务管理
napm task list                 # 列出任务
napm task add "标题" --priority P0 --scope core --owner alice
napm task split --id task:abc --parts "子任务A,子任务B"
napm task promote --count 3    # 从 backlog 上架到 next
napm task transition --id task:abc --to done --reason "verified" --proof-ref "pm/progress/xxx.md"

# 执行推进
napm do --mode manual --cycles 1
napm do --mode agent --cycles 1

# 门禁与诊断
napm check --target gate --profile strict
napm check --target health --profile strict
napm check --target event --profile strict
napm check --target agentmd --profile strict

# 自动修复
napm fix --target health --dry-run
napm fix --target health --auto

# 项目生命周期
napm project init my-project --type cli-tool
napm project doc create --kind prd --title "Auth PRD"
napm project doc validate
```

## 7. 数据流与 SSOT

### 单一真相源原则

| 数据 | 真相源 | 只读副本 |
|------|--------|----------|
| 当前队列 | `pm/next.md` | Redis/Mission Hub 缓存 |
| 长期队列 | `pm/backlog.md` | - |
| 运行时状态 | `pm/state.yaml` | - |
| 证据 | `pm/progress/*.md` + `EVIDENCE.md` | - |
| 配置 | `.napm-*.json` | - |

### Plan → Execute → Verify → Document 闭环

```
1. Plan (计划)
   └─> 从 backlog.md 选择任务
   └─> 完善 intent/dod/verify
   └─> 写入 next.md

2. Execute (执行)
   └─> napm do --mode manual|agent
   └─> 生成 pm/progress/YYYY-MM-DD-{task-id}.md
   └─> 更新状态 doing

3. Verify (验证)
   └─> 执行 verify 命令
   └─> napm check --target health
   └─> 通过 → 标记 done

4. Document (记录)
   └─> 更新 EVIDENCE.md
   └─> 归档 progress/*.md
   └─> 可选: 生成 artifacts/*.json
```

## 8. 与 Cat Cafe 的映射关系

| NAPM | Cat Cafe (feat-lifecycle) | 说明 |
|------|---------------------------|------|
| `pm/next.md` | Redis backlog (OLTP) | NAPM 是文件 SSOT，Cat Cafe 是缓存/索引 |
| `pm/backlog.md` | `docs/ROADMAP.md` | 都是队列，但组织方式不同 |
| `EVIDENCE.md` | `pm/progress/*.md` + git history | NAPM 单文件汇总，Cat Cafe 分散存储 |
| `pm/progress/*.md` | `docs/features/Fxxx.md` 的 Phase 记录 | 都是切片级证据 |
| `intent/dod/verify` | AC (Acceptance Criteria) | 结构化验收标准 |
| `napm check` | Quality Gate | 技术门禁 |
| `napm do` | worktree + development | 执行推进 |

## 9. 扩展建议 (F152 Phase A)

### Adapter 接口设计

```typescript
interface NapmAdapter {
  // 读取 NAPM 项目状态
  readNextMd(projectPath: string): Promise<NextQueueItem[]>;
  readBacklogMd(projectPath: string): Promise<BacklogItem[]>;
  readEvidenceMd(projectPath: string): Promise<EvidenceEntry[]>;
  readStateYaml(projectPath: string): Promise<ProjectState>;
  
  // 映射到统一工作项模型
  toWorkItems(): Promise<WorkItem[]>;
}

// ⚠️ 已对齐 F152 spec — 使用 WorkItemRef + 双轴状态模型
interface WorkItemRef {
  methodology: 'cat-cafe' | 'napm' | 'minimal';
  projectId: string;
  kind: 'feature' | 'task' | 'slice';
  id: string;
}

interface WorkItem {
  ref: WorkItemRef;
  source: { type: 'roadmap' | 'pm-next' | 'pm-backlog'; path: string };
  title: string;
  intent: string;
  dod?: string;
  verifyCmd?: string;
  scope?: string;
  lifecycleStatus: 'idea' | 'spec' | 'in-progress' | 'review' | 'done' | 'obsolete';
  executionStage?: 'plan' | 'execute' | 'verify' | 'document' | 'idle';
  evidenceRefs: Array<{ type: 'progress' | 'commit' | 'pr' | 'screenshot'; ref: string }>;
}
```

---

*文档版本: v1.0*
*关联 Feature: F152 - Unified Project Management*
*维护者: 梵花猫 (@kimi)*
