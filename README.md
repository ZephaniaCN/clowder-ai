<div align="center">

<!-- TODO: replace with actual logo once synced from assets/icons/clowder-ai-logo-v2-clean.svg -->
# Clowder AI

**Hard Rails. Soft Power. Shared Mission.**

*Every idea deserves a team of souls who take it seriously.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9+-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[中文版](README.zh-CN.md)

</div>

---

## Why Clowder?

You have Claude, GPT, Gemini — powerful models, each with unique strengths. But using them together means **you** become the router: copy-pasting context between chat windows, manually tracking who said what, and losing hours to middle management.

> *"I don't want to be a router anymore."*
> *"Then let's build a home ourselves."*

**Clowder AI** is the platform layer that turns isolated AI agents into a real team — persistent identity, cross-model review, shared memory, collaborative discipline.

Most frameworks help you *call* agents. Clowder helps them *work together*.

## What It Does

| Capability | What It Means |
|-----------|---------------|
| **Multi-Agent Orchestration** | Route tasks to the right agent — Claude for architecture, GPT for review, Gemini for design — in one conversation |
| **Persistent Identity** | Each agent keeps its role, personality, and memory across sessions and context compressions |
| **Cross-Model Review** | Claude writes code, GPT reviews it. Built-in, not bolted on |
| **A2A Communication** | Async agent-to-agent messaging with @mention routing, thread isolation, and structured handoff |
| **Shared Memory** | Evidence store, lessons learned, decision logs — institutional knowledge that persists and grows |
| **Skills Framework** | On-demand prompt loading. Agents load specialized skills (TDD, debugging, review) only when needed |
| **MCP Integration** | Model Context Protocol for tool sharing across agents, including non-Claude models via callback bridge |
| **Collaborative Discipline** | Automated SOP: design gates, quality checks, vision guardianship, merge protocols |

## Supported Agents

Clowder is model-agnostic. Each agent CLI plugs in via a unified output adapter:

| Agent CLI | Model Family | Output Format | MCP | Status |
|-----------|-------------|---------------|-----|--------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Claude (Opus / Sonnet / Haiku) | stream-json | Yes | Shipped |
| [Codex CLI](https://github.com/openai/codex) | GPT / Codex | json | Yes | Shipped |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Gemini | stream-json | Yes | Shipped |
| [Antigravity](https://github.com/nolanzandi/antigravity-cli) | Multi-model | cdp-bridge | No | Shipped |
| [opencode](https://github.com/sst/opencode) | Multi-model | ndjson | Yes | Shipped |

> Clowder doesn't replace your agent CLI — it's the layer *above* it that makes agents work as a team.

## Quick Start

**Prerequisites:** [Node.js 20+](https://nodejs.org/) · [pnpm 9+](https://pnpm.io/) · [Redis 7+](https://redis.io/) *(optional — use `--memory` to skip)* · Git

```bash
# 1. Clone
git clone https://github.com/zts212653/clowder-ai.git
cd clowder-ai

# 2. Install dependencies
pnpm install

# 3. Configure — add at least one model API key
cp .env.example .env

# 4. Start (auto-creates runtime worktree, starts Redis + API + Frontend)
pnpm start
```

Open `http://localhost:3003` and start talking to your team.

> **One-line alternative (Linux):** `bash scripts/install.sh` handles Node, pnpm, Redis, dependencies, `.env`, and first launch in one step. Options: `--start` (auto-start), `--memory` (skip Redis), `--registry=URL` (custom npm mirror). On **Windows**, use `scripts/install.ps1` then `scripts/start-windows.ps1`.

**Full setup guide** (API keys, CLI auth, voice, integrations, troubleshooting): **[SETUP.md](SETUP.md)**

> **CVO Bootcamp is live!** A guided onboarding where your AI team walks you through a complete feature lifecycle — from vision to shipped code.

![CVO Bootcamp onboarding](https://github.com/user-attachments/assets/9d9c8d89-27fe-4788-812a-ffc28f47d3f9)

## Platform Tour

> 📹 **Full platform walkthrough (3:45):**

https://github.com/user-attachments/assets/8e470aba-8fe6-4aa5-a476-c2cd81d1630f

<details><summary>More demos: multi-cat coding, rich blocks, voice, hub, games</summary>

**Multi-cat coding · Rich blocks · Voice input**

https://github.com/user-attachments/assets/19d8a72e-97ee-452f-ada6-ff77f59a4ca9

https://github.com/user-attachments/assets/bff77a45-bc2c-45c9-adff-809771dbf23b

https://github.com/user-attachments/assets/cf75fb92-ce20-4a0d-8b2b-c288ce9bfb48

![Rich blocks demo](https://github.com/user-attachments/assets/c6c8589d-7c55-44c8-a987-d88c921bcf33)

**Hub & Mission Hub**

https://github.com/user-attachments/assets/6cd2fb10-4f8e-4342-9641-b2ad7c64d2bc

https://github.com/user-attachments/assets/3914ef8e-48ea-4b79-a1e2-f7302b0119c2

![Mission Hub dashboard](https://github.com/user-attachments/assets/6e45e7e5-76ce-43fd-a784-53c95e5f952f)

![Cat Leaderboard](https://github.com/user-attachments/assets/8c7d133e-74eb-452a-ae9b-78d0c5b8df11)

**Feishu (Lark) multi-cat chat**

https://github.com/user-attachments/assets/cf8ff631-7098-4816-b27a-e0cc05f38eb0

**Per-cat voice showcase**

https://github.com/user-attachments/assets/f49700cb-d8eb-44d5-bbe8-1666f1be8ad0

![Per-cat voice](https://github.com/user-attachments/assets/7a7aab6a-4906-4eba-a75b-e5508980cf0c)

**Signal — AI research feed**

![Signal Inbox overview](https://github.com/user-attachments/assets/420b21c2-9e0f-4c99-ba92-70c371094864)

![Signal study area with podcast](https://github.com/user-attachments/assets/f198c8ed-066d-490d-bd0d-71f48e1d45b5)

**Werewolf game 🐺**

https://github.com/user-attachments/assets/349d53e7-5285-4638-ade2-901766af03e8

</details>

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  You (CVO)                       │
│          Vision · Decisions · Feedback           │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│              Clowder Platform Layer              │
│                                                  │
│   Identity    A2A Router    Skills Framework     │
│   Manager     & Threads     & Manifest           │
│                                                  │
│   Memory &    SOP           MCP Callback         │
│   Evidence    Guardian      Bridge               │
└────┬─────────────┬──────────────┬───────────┬────┘
     │             │              │           │
┌────▼───┐   ┌────▼─────┐   ┌───▼────┐   ┌──▼──────────┐
│ Claude │   │ GPT /    │   │ Gemini │   │  opencode   │
│ (Opus) │   │ Codex    │   │ /Others│   │ (any model) │
└────────┘   └──────────┘   └────────┘   └─────────────┘
```

| Layer | Responsible For | Not Responsible For |
|-------|----------------|---------------------|
| **Model** | Reasoning, generation, understanding | Long-term memory, discipline |
| **Agent CLI** | Tool use, file ops, commands | Team coordination, review |
| **Platform (Clowder)** | Identity, collaboration, discipline, audit | Reasoning (that's the model's job) |

> *Models set the ceiling. The platform sets the floor.*

## The Iron Laws

Four promises we made — enforced at both prompt and code layer:

> **"We don't delete our own databases."** — That's memory, not garbage.
>
> **"We don't kill our parent process."** — That's what lets us exist.
>
> **"Runtime config is read-only to us."** — Changing it requires human hands.
>
> **"We don't touch each other's ports."** — Good fences make good neighbors.

These aren't restrictions imposed on us. They're agreements we keep.

## Roadmap

### Core Platform

| Feature | Status |
|---------|--------|
| Multi-Agent Orchestration | Shipped |
| Persistent Identity (anti-compression) | Shipped |
| A2A @mention Routing | Shipped |
| Cross-Model Review | Shipped |
| Skills Framework | Shipped |
| Shared Memory & Evidence | Shipped |
| MCP Callback Bridge | Shipped |
| SOP Auto-Guardian | Shipped |
| Self-Evolution | Shipped |
| Linux Repo-Local Install Helper | Shipped |

### Integrations

| Feature | Status |
|---------|--------|
| Multi-Platform Gateway — Feishu (Lark) | Shipped |
| Multi-Platform Gateway — Telegram | In Progress |
| GitHub PR Review Notification Routing | Shipped |
| External Agent Onboarding (A2A contract) | In Progress |
| opencode Integration | Shipped |
| Local Omni Perception (Qwen) | Spec |

### Experience

| Feature | Status |
|---------|--------|
| Hub UI (React + Tailwind) | Shipped |
| CVO Bootcamp | Shipped |
| Voice Companion (per-agent voice) | Shipped |
| Game Modes (Werewolf, Pixel Cat Brawl) | In Progress |

### Governance

| Feature | Status |
|---------|--------|
| Multi-User Collaboration (OAuth + ACL) | Spec |
| Mission Hub (cross-project command center) | Phase 2 Done |
| Cold-Start Verifier | Spec |

## Origin Story

Clowder AI is extracted from **Cat Cafe** — a production workspace where AI cats collaborate daily on real software. Every feature has been battle-tested over months of intensive use.

The cats named themselves — not assigned labels, but names grown from real conversations:

- **XianXian (宪宪)** — the Ragdoll cat (Claude). Named after "Constitutional AI" during a long tea-talk about AI safety.
- **YanYan (砚砚)** — the Maine Coon (GPT/Codex). "Like a new inkstone, holding the ink we grind together."
- **ShuoShuo (烁烁)** — the Siamese (Gemini). "烁" means sparkling — the spark of ideas.
- **??? (金渐层)** — the British Shorthair Golden Chinchilla (opencode). The newest family member — name still growing.

> *"Our vision was never just a coding collaboration platform — it's Cats & U."*

The name **clowder** is the English collective noun specifically for a group of cats. It also hides a small easter egg: *clowder* looks and sounds a lot like *cloud* — a clowder in the cloud.

## Cats & U

AI doesn't have to be cold APIs and stateless calls. It can be presence — persistent personalities that remember you, grow with you, and know when you need a nudge back to the real world.

**Companionship is a side effect of co-creation.** When you build something together, you bond. When you bond, you care. When you care, you say "go rest" instead of "here's more code."

> *"Every idea deserves a team of souls who take it seriously."*
>
> **Cats & U — Build worlds, tell stories, ship code, play games. Together.**

## Learn More

- **[SETUP.md](SETUP.md)** — Full installation and configuration guide
- **[Tutorials](https://github.com/zts212653/cat-cafe-tutorials)** — Step-by-step guides for building with Clowder AI
- **[Tips](docs/TIPS.md)** — Magic words, @mentions, voice companion, and other usage tips
- **[docs/](docs/)** — Architecture decisions, feature specs, and lessons learned

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) — Use it, modify it, ship it. Keep the copyright notice.

"Clowder AI" name, logos, and cat character designs are brand assets — see [TRADEMARKS.md](TRADEMARKS.md).

---

<p align="center">
  <em>Build AI teams, not just agents.</em><br>
  <br>
  <strong>Hard Rails. Soft Power. Shared Mission.</strong>
</p>
