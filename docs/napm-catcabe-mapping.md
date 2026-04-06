# NAPM × Cat Cafe 文档体系对照表

> F152: Unified Project Management — 方法论融合映射文档

## 一、高层次对照

| 维度 | NAPM | Cat Cafe (feat-lifecycle) | 融合策略 |
|------|------|---------------------------|----------|
| **核心协议** | Plan→Execute→Verify→Document | Discussion→Design Gate→Worktree→Quality Gate→Review→Merge→Vision Guardian | 分层：NAPM 执行层 + Cat Cafe 治理层 |
| **真相源类型** | 文件优先 (File SSOT) | 混合：ROADMAP.md (文件) + Redis (运行时) | NAPM 项目以文件为主，Cat Cafe 做索引缓存 |
| **粒度** | 切片 (Slice) - 最小可验证单元 | Feature → Phase → Work Item | 1 Feature = N 个 NAPM Slices |
| **证据模型** | EVIDENCE.md 单文件聚合 | 分散：Feature Doc + git history + PR status | 双向链接，不合并 |
| **自动化** | Python CLI (cron/auto-fix) | MCP tools + Skills + 猫猫协作 | 桥接：NAPM CLI → Mission Hub API |

## 二、文件结构对照

### NAPM 项目结构

```
{project-root}/
├── pm/
│   ├── next.md              # 当前队列 (SSOT)
│   ├── backlog.md           # 长期队列
│   ├── state.yaml           # 运行时状态
│   ├── progress/            # 切片级进度
│   ├── artifacts/           # 关键产物
│   └── config/
├── EVIDENCE.md              # 证据汇总（项目根目录）
├── scripts/napm.py          # CLI 入口
├── .napm-*.json             # 配置
└── AGENT.md                 # 项目级 Agent 指令
```

### Cat Cafe Feature 项目结构

```
{project-root}/
├── docs/
│   ├── ROADMAP.md           # Feature 热层
│   └── features/
│       └── Fxxx-{name}.md   # Feature 聚合文件
├── pm/
│   └── progress/            # Phase 进度记录
├── scripts/
│   └── (项目特定脚本)
├── AGENTS.md                # 治理骨架
└── .claude/skills/          # Skill symlinks
```

### 映射关系

| NAPM 路径 | Cat Cafe 路径 | 映射类型 | 说明 |
|-----------|---------------|----------|------|
| `pm/next.md` | Redis `backlog:items` | 单向同步 | NAPM → Mission Hub 只读导入 |
| `pm/backlog.md` | `docs/ROADMAP.md` | 概念对应 | 都是队列，组织方式不同 |
| `EVIDENCE.md` (根目录) | `docs/features/Fxxx.md` 的 AC/Timeline | 链接关联 | 不做内容合并 |
| `pm/progress/*.md` | `pm/progress/*.md` | 直接复用 | 目录结构一致 |
| `pm/artifacts/*.json` | `docs/artifacts/` | 可选同步 | 关键产物可回流 |
| `.napm-*.json` | `.claude/` | 方法论配置 | 不同的治理配置 |
| `AGENT.md` | `AGENTS.md` | 类似 | 项目级 Agent 指令 |

## 三、数据字段对照

### 任务/工作项字段 (F152 WorkItem 双轴模型)

| NAPM 字段 | WorkItem 字段 | 类型 | 转换规则 |
|-----------|---------------|------|----------|
| `task-id` | `ref.id` | string | WorkItemRef 四段之一 |
| - | `ref.methodology` | "napm" | 固定值 |
| - | `ref.projectId` | string | 外部项目 ID |
| - | `ref.kind` | "task" | NAPM 任务映射为 task |
| `owner` | `owner` | string | 直接映射 |
| `priority` | `priority` | "P0" \| "P1" \| "P2" \| "P3" | 标准化为大写 |
| `scope` | `scope` | string | 直接映射 |
| `status` + context | `lifecycleStatus` | "idea" \| "in-progress" \| "done" \| "obsolete" | 治理状态轴（todo→idea, doing→in-progress）|
| `status` (doing) + sub-info | `executionStage` | "plan" \| "execute" \| "verify" \| "document" \| "idle" | 执行阶段轴 |
| `intent` | `intent` | string | 直接映射 |
| `dod` | `dod` | string | Definition of Done |
| `verify` | `verifyCmd` | string | 验证命令 |
| `context_ref` | `evidenceRefs` | array | 证据引用列表 |
| `risk` | `risk` | "high" \| "medium" \| "low" | 风险级别 |
| `decision_status` | `gates` | object | 映射到对应 gate 状态 |

### 状态映射表 (双轴模型)

| NAPM status | lifecycleStatus | executionStage | 说明 |
|-------------|-----------------|----------------|------|
| `todo` | `idea` | `idle` | 未开始 → 治理层 idea |
| `doing` (无子信息) | `in-progress` | `execute` | 执行中 |
| `doing` (plan阶段) | `in-progress` | `plan` | 计划阶段 |
| `doing` (verify阶段) | `in-progress` | `verify` | 验证阶段 |
| `done` | `done` | `idle` | 已完成（document 是过程态，不是终态）|
| `blocked` | `in-progress` | `idle` | 阻塞但仍在进行中 |
| `obsolete` | `obsolete` | `idle` | 废弃 |
| `obsolete` | `obsolete` | `idle` | 已废弃 |

## 四、流程步骤对照

### NAPM: Plan → Execute → Verify → Document

```
Plan
  └─> 从 backlog.md 选择 1-3 条
  └─> 完善 intent/dod/verify
  └─> 写入 next.md

Execute (one slice)
  └─> napm do --mode manual|agent
  └─> 生成 pm/progress/{date}-{task}.md
  └─> 更新 status: doing

Verify
  └─> 执行 verify 命令
  └─> napm check --target health
  └─> 通过 → status: done

Document
  └─> 更新 EVIDENCE.md
  └─> 归档 progress/
```

### Cat Cafe: Discussion → Design Gate → Development → Review → Merge → Vision Guardian

```
Discussion
  └─> 采访/开放讨论
  └─> 落盘到 discussion-notes/

Design Gate
  └─> UX 确认 (铲屎官拍板)
  └─> 或后端讨论 (猫猫共识)

Development
  └─> writing-plans 拆分
  └─> worktree 隔离开发
  └─> quality-gate 自检

Review
  └─> request-review
  └─> 跨猫 review

Merge
  └─> merge-gate
  └─> Phase 进度同步

Vision Guardian
  └─> 愿景对照
  └─> 跨猫验证
```

### 融合流程 (F152 目标)

```
Cat Cafe 治理层 (立项/设计/验收)
  ├─> Kickoff: ROADMAP → Feature Doc
  ├─> Design Gate: 铲屎官确认
  │
  ├─> 进入 NAPM 执行层
  │   └─> NAPM Bridge: Feature → NAPM Project
  │   └─> napm init
  │   └─> Plan: intent/dod/verify 导入
  │
  ├─> NAPM 执行层 (自主推进)
  │   └─> Execute: napm do
  │   └─> Verify: napm check
  │   └─> Document: EVIDENCE.md
  │
  ├─> 回流 Cat Cafe
  │   └─> Mission Hub 状态同步
  │   └─> Phase 进度更新
  │
  └─> Cat Cafe 治理层 (收尾)
      └─> Vision Guardian
      └─> Feature Done
```

## 五、证据模型对照

### NAPM 证据

| 层级 | 文件 | 内容 | 更新时机 |
|------|------|------|----------|
| 切片级 | `pm/progress/*.md` | 设计、验证、限制 | 每个 slice 完成 |
| 汇总级 | `EVIDENCE.md` | 里程碑、验证命令、结果 | 里程碑达成 |
| 产物级 | `pm/artifacts/*.json` | AAR、报告、验收结果 | 关键节点 |

### Cat Cafe 证据

| 层级 | 文件 | 内容 | 更新时机 |
|------|------|------|----------|
| Feature 级 | `docs/features/Fxxx.md` | AC、Timeline、Key Decisions | 每次 Phase merge |
| Phase 级 | `pm/progress/*.md` | 阶段详细记录 | Phase 完成 |
| 代码级 | git history + PR | commit、review 评论 | 每次 commit/PR |

### 融合策略

1. **不合并内容**: `EVIDENCE.md` ≠ `docs/features/Fxxx.md`
2. **双向链接**: 
   - Feature Doc 链接到 EVIDENCE.md
   - EVIDENCE.md 链接到 Feature Doc
3. **职责分离**:
   - NAPM 负责"执行过程"的证据
   - Cat Cafe 负责"产品决策"的证据

## 六、CLI 命令对照

| NAPM 命令 | Cat Cafe 等价操作 | 融合后策略 |
|-----------|-------------------|------------|
| `napm status` | Mission Hub UI / API | 统一使用 Mission Hub |
| `napm task list` | `/api/backlog/items` | Mission Hub 支持多方法论 |
| `napm task add` | Backlog Center 创建 | Mission Hub 支持 NAPM 模板 |
| `napm do` | 猫猫自主执行 | 保持 NAPM CLI 在本地使用 |
| `napm check` | quality-gate skill | 桥接：check → quality-gate |
| `napm fix` | auto-fix (未来) | 先保留 NAPM 实现 |
| `napm project init` | `pm/project init` | 统一入口 |

## 七、配置对照

### NAPM 配置 (.napm-*.json)

| 文件 | 用途 |
|------|------|
| `.napm-policy.json` | 策略配置 (gate thresholds) |
| `.napm-runtime.json` | 运行时配置 (auto_enqueue) |
| `.napm-model-config.json` | AI 模型路由 |
| `.napm-intelligence.json` | 智能化层配置 |
| `.napm-gate-policy.json` | 门禁策略 |

### Cat Cafe 配置

| 文件/位置 | 用途 |
|-----------|------|
| `cat-config.json` | 猫猫注册表 |
| `AGENTS.md` managed blocks | 治理骨架 |
| `.claude/skills/` | Skill symlinks |
| `pm/state.yaml` | 运行时状态 (未来扩展) |

### 融合策略

1. **项目级配置**: NAPM 的 `.napm-*.json` 作为项目本地配置
2. **治理级配置**: Cat Cafe 的 `AGENTS.md` + `cat-config.json` 作为跨项目治理
3. **方法论路由**: Mission Hub 根据项目类型选择读取哪种配置

## 八、术语对照表

| NAPM 术语 | Cat Cafe 术语 | 说明 |
|-----------|---------------|------|
| Slice | Phase / Work Item | NAPM 切片 ≈ Cat Cafe Phase |
| Epic | Feature | NAPM Epic ≈ Cat Cafe Feature |
| Queue | Backlog | 都是队列 |
| Gate (health/gate/event) | Quality Gate | 都是门禁 |
| Intent | Why / Vision | 意图/目标 |
| DoD (Definition of Done) | AC | 完成标准 |
| Evidence | Proof / Verification | 证据 |
| Advisor | Cat / Agent | 智能体 |
| Disposition | Task Assignment | 任务分配 |

## 九、实现路线图对照

| F152 Phase | NAPM 侧工作 | Cat Cafe 侧工作 |
|------------|-------------|-----------------|
| **A: 统一模型 + 只读适配** | 定义数据模型规范 | NapmAdapter 实现 |
| | 提供解析库 | Mission Hub 多方法论展示 |
| **B: WorkItemRef 抽象** | 支持外部引用格式 | 解除 featureId 硬编码 |
| | 提供 task/slice ID 生成 | 抽象 WorkItemRef 类型 |
| **C: NAPM 特性吸收** | 保持现有实现 | AC 结构化增强 |
| | | health check 集成 |
| **D: Cat Cafe 特性输出** | 支持愿景字段 | 愿景字段注入 |
| | 支持多 Agent | 多 Agent 协作协议 |

## 十、文件命名约定对照

| 类型 | NAPM 命名 | Cat Cafe 命名 |
|------|-----------|---------------|
| 任务 ID | `kebab-case-description` | `F{NNN}-{name}` |
| 进度文件 | `YYYY-MM-DD-{task-id}.md` | `YYYY-MM-DD-{feature}-m{N}.md` |
| 证据文件 | `pm/artifacts/{type}-{timestamp}.json` | `docs/artifacts/` |
| 配置 | `.napm-{component}.json` | `{component}.json` |

---

*文档版本: v1.0*
*关联 Feature: F152 - Unified Project Management*
*维护者: 梵花猫 (@kimi)*
