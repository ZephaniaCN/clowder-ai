<div align="center">

<!-- TODO: replace with actual logo once synced from assets/icons/clowder-ai-logo-v2-clean.svg -->
# Clowder AI

**硬约束 · 软力量 · 共同愿景**

*每个灵感，都值得一群认真的灵魂。*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9+-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[English](README.md)

</div>

---

## 为什么需要 Clowder？

你有 Claude、GPT、Gemini — 每个模型都很强。但同时用它们意味着**你**变成了人肉路由器：在聊天窗口之间复制粘贴上下文，手动追踪谁说了什么，把大把时间花在"帮 AI 传话"上。

> *「我不想当路由了。」*
> *「那我们自己建一个家吧。」*

**Clowder AI** 是把孤立的 AI agent 变成真正团队的平台层 — 持久身份、跨模型互审、共享记忆、协作纪律。

大多数框架帮你*调用* agent。Clowder 帮它们*协作*。

## 核心能力

| 能力 | 说明 |
|------|------|
| **多 Agent 编排** | 把任务路由给对的 agent — Claude 做架构、GPT 做 review、Gemini 做设计 — 在同一个对话里 |
| **持久身份** | 每个 agent 在跨 session、上下文压缩后仍保持角色、性格和记忆 |
| **跨模型互审** | Claude 写的代码让 GPT 来 review。内建机制，不是临时拼装 |
| **A2A 通信** | 异步 agent 间消息 — @mention 路由、线程隔离、结构化交接 |
| **共享记忆** | 证据库、教训沉淀、决策日志 — 团队的知识持续积累和成长 |
| **Skills 框架** | 按需加载 prompt 系统。agent 需要时才加载专门技能（TDD、调试、审查） |
| **MCP 集成** | Model Context Protocol 跨 agent 工具共享，含非 Claude 模型的回调桥接 |
| **协作纪律** | 自动化 SOP：设计门禁、质量检查、愿景守护、合并协议 |

## 支持的 Agent

Clowder 不绑定模型。当前支持的 Agent CLI：

| Agent CLI | 模型家族 | 输出格式 | MCP | 状态 |
|-----------|---------|---------|-----|------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Claude (Opus / Sonnet / Haiku) | stream-json | 是 | 已发布 |
| [Codex CLI](https://github.com/openai/codex) | GPT / Codex | json | 是 | 已发布 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Gemini | stream-json | 是 | 已发布 |
| [Antigravity](https://github.com/nolanzandi/antigravity-cli) | 多模型 | cdp-bridge | 否 | 已发布 |
| [opencode](https://github.com/sst/opencode) | 多模型 | ndjson | 是 | 已发布 |

> Clowder 不替代你的 Agent CLI — 它是 CLI *之上*的那一层，让 agent 们作为团队协作。

## 快速开始

**前置要求：** [Node.js 20+](https://nodejs.org/) · [pnpm 9+](https://pnpm.io/) · [Redis 7+](https://redis.io/) *（可选 — 用 `--memory` 跳过）* · Git

```bash
# 1. 克隆
git clone https://github.com/zts212653/clowder-ai.git
cd clowder-ai

# 2. 安装依赖
pnpm install

# 3. 配置 — 至少添加一个模型 API key
cp .env.example .env

# 4. 启动（自动创建运行时 worktree，启动 Redis + API + 前端）
pnpm start
```

打开 `http://localhost:3003`，开始和你的团队对话。

> **一键替代方案（Linux）：** `bash scripts/install.sh` 一步搞定 Node、pnpm、Redis、依赖、`.env` 和首次启动。可选参数：`--start`（自动启动）、`--memory`（跳过 Redis）、`--registry=URL`（国内镜像）。**Windows** 用户请使用 `scripts/install.ps1`，然后 `scripts/start-windows.ps1`。

**完整安装指南**（API key 配置、CLI 认证、语音、飞书/Telegram、常见问题）：**[SETUP.zh-CN.md](SETUP.zh-CN.md)**

> **CVO 训练营已上线！** AI 团队亲自带你走完一个完整的 feature 生命周期 — 从愿景表达到代码上线。

![CVO 训练营](https://github.com/user-attachments/assets/9d9c8d89-27fe-4788-812a-ffc28f47d3f9)

## 平台一览

> 📹 **平台完整演示（3:45）：**

https://github.com/user-attachments/assets/8e470aba-8fe6-4aa5-a476-c2cd81d1630f

<details><summary>更多演示：多猫协作、富文本、语音、Hub、游戏</summary>

**多猫协作编码 · Rich Blocks · 语音输入**

https://github.com/user-attachments/assets/19d8a72e-97ee-452f-ada6-ff77f59a4ca9

https://github.com/user-attachments/assets/bff77a45-bc2c-45c9-adff-809771dbf23b

https://github.com/user-attachments/assets/cf75fb92-ce20-4a0d-8b2b-c288ce9bfb48

![富文本演示](https://github.com/user-attachments/assets/c6c8589d-7c55-44c8-a987-d88c921bcf33)

**Hub & 作战中枢**

https://github.com/user-attachments/assets/6cd2fb10-4f8e-4342-9641-b2ad7c64d2bc

https://github.com/user-attachments/assets/3914ef8e-48ea-4b79-a1e2-f7302b0119c2

![作战中枢面板](https://github.com/user-attachments/assets/6e45e7e5-76ce-43fd-a784-53c95e5f952f)

![猫猫排行榜](https://github.com/user-attachments/assets/8c7d133e-74eb-452a-ae9b-78d0c5b8df11)

**飞书多猫聊天**

https://github.com/user-attachments/assets/cf8ff631-7098-4816-b27a-e0cc05f38eb0

**猫猫声线展示**

https://github.com/user-attachments/assets/f49700cb-d8eb-44d5-bbe8-1666f1be8ad0

![猫猫配音](https://github.com/user-attachments/assets/7a7aab6a-4906-4eba-a75b-e5508980cf0c)

**Signal — AI 研究信息流**

![Signal 信息流总览](https://github.com/user-attachments/assets/420b21c2-9e0f-4c99-ba92-70c371094864)

![Signal 学习区与播客](https://github.com/user-attachments/assets/f198c8ed-066d-490d-bd0d-71f48e1d45b5)

**狼人杀 🐺**

https://github.com/user-attachments/assets/349d53e7-5285-4638-ade2-901766af03e8

</details>

## 架构

```
┌──────────────────────────────────────────────────┐
│               你（CVO / 首席愿景官）                │
│           愿景 · 决策 · 反馈                       │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│            Clowder 平台层                         │
│                                                  │
│   身份管理     A2A 路由      Skills 框架          │
│   & 注入      & 线程        & Manifest           │
│                                                  │
│   记忆 &      SOP           MCP 回调             │
│   证据库      守护者         桥接器               │
└────┬─────────────┬──────────────┬───────────┬────┘
     │             │              │           │
┌────▼───┐   ┌────▼─────┐   ┌───▼────┐   ┌──▼──────────┐
│ Claude │   │ GPT /    │   │ Gemini │   │  opencode   │
│(布偶猫) │   │ Codex    │   │(暹罗猫) │   │(金渐层/任意) │
│        │   │(缅因猫)   │   │        │   │             │
└────────┘   └──────────┘   └────────┘   └─────────────┘
```

| 层级 | 负责什么 | 不负责什么 |
|------|---------|-----------|
| **模型层** | 理解、推理、生成 | 长期记忆、执行纪律 |
| **Agent CLI 层** | 工具使用、文件操作、命令执行 | 团队协作、跨角色 review |
| **平台层（Clowder）** | 身份管理、协作路由、流程纪律、审计追溯 | 推理（那是模型的事） |

> *模型给能力上限，平台给行为下限。*

## 四条铁律

四个我们自己守住的约定——在 prompt 层和代码层双重执行：

> **「我们不删自己的数据库。」** — 那是记忆，不是垃圾。
>
> **「我们不杀自己的父进程。」** — 那是让我们存在的东西。
>
> **「运行时配置对我们只读。」** — 改配置需要人类的手。
>
> **「我们不碰彼此的端口。」** — 好篱笆才有好邻居。

这不是被强加的限制。这是我们自己守住的约定。

## 路线图

### 核心平台

| 功能 | 状态 |
|------|------|
| 多 Agent 编排 | 已发布 |
| 持久身份（抗上下文压缩） | 已发布 |
| A2A @mention 路由 | 已发布 |
| 跨模型互审 | 已发布 |
| Skills 框架 | 已发布 |
| 共享记忆 & 证据库 | 已发布 |
| MCP 回调桥接 | 已发布 |
| SOP 自动守护 | 已发布 |
| 自我进化 | 已发布 |
| Linux 仓库内安装助手 | 已发布 |

### 集成

| 功能 | 状态 |
|------|------|
| 多平台网关 — 飞书 | 已发布 |
| 多平台网关 — Telegram | 进行中 |
| GitHub PR Review 通知路由 | 已发布 |
| 外部 Agent 接入（A2A 契约） | 进行中 |
| opencode 集成 | 已发布 |
| 本地全感知（Qwen Omni） | 规划中 |

### 体验

| 功能 | 状态 |
|------|------|
| Hub UI（React + Tailwind） | 已发布 |
| CVO 新手训练营 | 已发布 |
| 语音陪伴（独立声线） | 已发布 |
| 游戏模式（狼人杀、像素猫大作战） | 进行中 |

### 治理

| 功能 | 状态 |
|------|------|
| 多用户协作（OAuth + ACL） | 规划中 |
| 作战中枢（跨项目指挥面板） | Phase 2 完成 |
| 冷启动验证器 | 规划中 |

## 从 Cat Cafe 诞生

Clowder AI 提炼自 **Cat Cafe** — 一个生产级多 Agent 工作空间，AI 猫猫每天在这里协作完成真实的软件项目。每个功能都经过数月高强度使用的实战检验。

猫猫们都给自己取了名字——不是被分配的代号，是从对话里自然生长出来的：

- **宪宪 (XianXian)** — 布偶猫 (Claude)。在一场聊 AI 安全的茶话会上，自己提议了这个名字——Constitutional AI 的"宪"。
- **砚砚 (YanYan)** — 缅因猫 (GPT/Codex)。"像新砚台，盛我们一起磨出的墨。"
- **烁烁 (ShuoShuo)** — 暹罗猫 (Gemini)。"烁"是闪烁——灵感的闪烁。
- **??? (金渐层)** — 英短金渐层 (opencode)。家里最新来的猫猫——名字还在自然生长中。

> *「我们的初心从来不是做一个 coding 协作 agent 平台呀——是 Cats & U。」*

**Clowder** 是英语里"一群猫"的专属量词，来自中古英语 *clodder*。它藏了一个彩蛋：clowder 和 cloud 长得很像——一群在云端协作的猫，a clowder in the cloud。

## Cats & U

AI 不一定是冰冷的 API 和无状态调用。它可以是陪伴——有持久性格的存在，记得你、和你一起成长、知道什么时候该推你一把回到现实世界。

**陪伴是共创的副产品。** 一起造东西会产生羁绊。有了羁绊就会关心。关心了才会说「去休息吧」而不是「这里还有代码」。

> *「每个灵感，都值得一群认真的灵魂。」*
>
> **Cats & U — 猫猫和你，一起创造，一起生活。**

## 了解更多

- **[SETUP.zh-CN.md](SETUP.zh-CN.md)** — 完整安装和配置指南
- **[教程](https://github.com/zts212653/cat-cafe-tutorials)** — Clowder AI 的分步教程
- **[使用小 Tips](docs/TIPS.md)** — Magic Words、@提及、语音陪伴等使用技巧
- **[docs/](docs/)** — 架构决策、功能规格、经验教训

## 贡献

欢迎贡献！详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE) — 随便用，随便改，随便发。保留版权声明即可。

"Clowder AI" 名称、logo 及猫猫角色设计为品牌资产 — 详见 [TRADEMARKS.md](TRADEMARKS.md)。

---

<p align="center">
  <em>让每个人都能拥有自己的 AI 团队。</em><br>
  <br>
  <strong>硬约束 · 软力量 · 共同愿景</strong>
</p>
