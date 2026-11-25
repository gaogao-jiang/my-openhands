# Jora — 基于 OpenHands Agent Canvas 的个人 AI 编程助手

本仓库由 [gaogao-jiang](https://github.com/gaogao-jiang) 基于
[OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) 进行个人二次开发，
不代表 OpenHands 官方项目或其维护者，也不表示获得其认可或背书。

Jora 是基于 OpenHands Agent Canvas 二次开发的个人 AI 编程助手，用于在本地运行和管理编码智能体。

## 来源、版权与许可

- 原项目：[OpenHands Agent Canvas](https://github.com/OpenHands/OpenHands)。
- 原版权声明：`Copyright © 2025 OpenHands contributors`，完整许可文本保留于 [LICENSE](LICENSE)。
- 本仓库保留原项目的 MIT 许可证；本人的代码修改也按 MIT 许可发布，第三方内容适用其各自许可。
- 第三方依赖、字体、图片和其他素材须遵守各自许可。已随源码保留的 Newsreader 字体许可见
  [SIL Open Font License](src/themes/color-theme/definitions/paper/newsreader-OFL.txt)。
- 上游及第三方名称、商标和标识的权利属于各自权利人；MIT 代码许可不等于商标授权。

下方保留上游项目文档作为参考；其中的官方徽章、npm 包、发布链接和品牌标识指向上游，
不表示本仓库是官方发行版。

---

<a name="readme-top"></a>

<div align="center">
  <img src="./src/assets/branding/jora-mark.svg" alt="Jora logo" width="160">
  <h1 align="center" style="border-bottom: none">Jora</h1>
  <p align="center">
    <strong>Your personal AI coding assistant for building, debugging, and automating software.</strong>
  </p>
  <p align="center">
    Run Jora with OpenHands Agent Server, Claude Code, Codex, Gemini, Pi, OpenCode, or any ACP-compatible agent.
  </p>
</div>
<div align="center">
  <a href="https://github.com/OpenHands/OpenHands/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/OpenHands/OpenHands/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@openhands/agent-canvas"><img src="https://img.shields.io/npm/v/%40openhands%2Fagent-canvas?style=for-the-badge&logo=npm" alt="npm version"></a>
  <a href="https://docs.openhands.dev/openhands/usage/agent-canvas/backends"><img src="https://img.shields.io/badge/Documentation-000?logo=googledocs&logoColor=FFE165&style=for-the-badge" alt="Documentation"></a>
  <a href="https://go.openhands.dev/slack"><img src="https://img.shields.io/badge/Slack-Join%20the%20community-611f69?logo=slack&logoColor=white&style=for-the-badge" alt="Join us on Slack"></a>
</div>
<div align="center">
  <a href="#quickstart">Quickstart</a> |
  <a href="./docs/README.md">Docs</a> |
  <a href="./docs/SELF_HOSTING.md">Self-Hosting</a> |
  <a href="https://docs.openhands.dev/openhands/usage/agent-canvas/acp-agents">ACP Agents</a> |
  <a href="https://docs.openhands.dev/openhands/usage/agent-canvas/prebuilt-automations">Automations</a> |
  <a href="https://go.openhands.dev/slack">Slack</a>
</div>
<p align="center">
  <img src="https://assets.openhands.dev/screenshot/automation-preview.png" alt="Agent Canvas automation preview" width="100%">
</p>
<hr>

Jora turns coding agents into a self-hosted developer assistant for starting conversations, editing code, and automating everyday tasks.

It runs locally on your machine by default, but can connect to multiple “agent backends”, e.g. running agents in Docker containers, on VMs, or within your company infrastructure. You can optionally choose to run agents on OpenHands Cloud or OpenHands Enterprise infrastructure.

Jora uses the OpenHands Agent Server as its local execution backend and can also connect to third-party agents such as Claude Code, Codex, Gemini CLI, Pi, and OpenCode.

|                                                                                                                      |                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [**Self-host your way**](https://docs.openhands.dev/openhands/usage/agent-canvas/backend-setup/vm)                   | Run agents locally, in Docker, on VMs, or anywhere you can run an agent server backend                                                   |
| [**Switch between different backends**](https://docs.openhands.dev/openhands/usage/agent-canvas/backends)            | Switch between local, remote, and cloud agents without losing focus                                                                      |
| [**Create automations**](https://docs.openhands.dev/openhands/usage/agent-canvas/prebuilt-automations)               | Create automations and workflows that integrate with Slack, GitHub, Linear, and more. Run on a schedule or in response to webhook events |
| [**Integrate with the tools you use**](https://docs.openhands.dev/openhands/usage/agent-canvas/prebuilt-automations) | Connect your automations with third-party services like Slack, GitHub, Notion, and more to automate workflows                            |
| [**Bring your own model**](https://docs.openhands.dev/openhands/usage/settings/llm-settings#llm-profiles)            | Use with any LLM                                                                                                                         |
| [**Use with any agent**](https://docs.openhands.dev/openhands/usage/agent-canvas/acp-agents)                         | Use with OpenHands, Claude Code, Codex, Gemini, Pi, OpenCode, or any agent with Agent-Client Protocol (ACP).                             |

For technical questions about the underlying platform, consult the OpenHands documentation and source repositories linked below.

## Quickstart

You can install Jora to run agents on any machine: on your laptop, on a dedicated computer like a Mac Mini,
or on a server in the cloud.

The most powerful way to run Jora is on a server in the cloud. This allows your agents to continue running
even when your laptop is shut, and makes it easier to trigger your agents through third-party services
like Slack, GitHub, and Datadog. See [SELF_HOSTING.md](docs/SELF_HOSTING.md) for details, especially with respect to security hardening.

Notably, you can run the backend in _multiple different environments_, and switch between
them from the same Agent Canvas frontend. E.g. you can share an Agent Server with your team for agents doing
code review and dependency updates, then have your personal agents running on your laptop.

### Option 1: Without a Sandbox

> [!WARNING]
> This runs the agent-server directly on the machine you're installing on — the agent will have full access to your filesystem!

**Prerequisites**: [Node.js](https://nodejs.org/) 24 or later, `uv`

```sh
npm install -g @openhands/agent-canvas
jora
```

The `jora` command starts the full local stack by default. The legacy
`agent-canvas` command remains available for compatibility. You can also split
the stack when you want to run pieces separately:

```sh
jora --frontend-only  # static frontend + ingress only
jora --backend-only   # agent server + automation backend + ingress only
```

### Option 2: With a Docker Sandbox

Install Docker Desktop on macOS/Windows, or Docker Engine/Docker Desktop on Linux.
Windows users can follow the [PowerShell quickstart](./README.windows.md).

The steps below are for macOS and Linux. A named Docker volume stores settings,
secrets, and conversations; projects are mounted at `/projects`.

**1. Prepare a workspace**

```sh
export PROJECTS_PATH="$HOME/projects"  # directory containing your project folders
mkdir -p "$PROJECTS_PATH"
```

On **Linux Docker Engine**, uid 10001 inside the container must be able to read
and write the workspace and its existing files. Grant that user access using
appropriate ownership or ACLs for your system. For a dedicated workspace you are
comfortable sharing with all local users, the following is another option:

```sh
find "$PROJECTS_PATH" -type d -exec chmod a+rwX {} +
find "$PROJECTS_PATH" -type f -exec chmod a+rw {} +
```

These commands grant all host users access to the workspace. Keep it separate
from `~/.openhands` and other sensitive data. Docker Desktop on macOS/Windows
handles bind-mount permissions, so those commands are normally unnecessary.

**2. Start Jora**

```sh
docker run -it --rm \
  -p 127.0.0.1:8000:8000 \
  -e AGENT_CANVAS_ALLOW_LAN_SESSION_KEY=true \
  -v openhands-state:/home/openhands/.openhands \
  -v "${PROJECTS_PATH}:/projects" \
  ghcr.io/openhands/agent-canvas:1.42.0 # x-release-please-version
```

Open [http://localhost:8000/canvas](http://localhost:8000/canvas). Reuse
`openhands-state` to retain state across container removals. A fresh volume does
not contain existing `~/.openhands` data; inspect or back it up with
`docker volume inspect openhands-state`.

<details>
<summary>Linux permission troubleshooting and existing state</summary>

If startup reports `Permission denied`, check access to the path named in the
error. On SELinux hosts, check whether the bind mount needs a `:z` or `:Z` label.
If you bind-mount existing `~/.openhands` state instead of the named volume,
uid 10001 needs access to its directories, existing key files and automation
database. Grant access using ownership or ACLs while keeping keys private.
Making state directories writable by all users can let another local user
replace the session key; do not use recursive world-writable permissions there.

Keep the default container user. An override can make the browser configuration
directory inaccessible. If you override the user, configure a writable
`XDG_CONFIG_HOME` and ensure state and workspace mounts are accessible.

</details>

> [!NOTE]
> The entrypoint stops the container with exit code 1 when the Agent Server stops answering
> its `/alive` check for about 30 seconds, so a crash or hang fails visibly instead of leaving
> a container that returns 502 for every request.
> Automatic recovery needs a restart policy: use `--restart unless-stopped` instead of
> `--rm`, or `restart: unless-stopped` in Docker Compose.

The agent will be able to access any project under `PROJECTS_PATH`.

### Option 3: With Multiple Docker Sandboxes

Run each new conversation in its own Docker container, with its own Agent Server and tools. This is useful for running several agents concurrently. Canvas and the outer Agent Server run on your host and route conversation requests to the containers.

**Prerequisites**: Node.js 24 or later, `uv`, and a running Docker Desktop (macOS) or Docker Engine/Desktop (Linux). The user starting Canvas must be able to run `docker` commands.

**macOS / Linux:**

```sh
npm install -g @openhands/agent-canvas
OH_CONVERSATION_RUNTIME=docker agent-canvas
```

Open [http://localhost:8000](http://localhost:8000) and start a new conversation. Existing local conversations are not converted. Each container mounts its conversation's workspace and persisted state, so workspace files and conversation history survive container replacement. Conversations using the same host workspace still share those files; choose separate directories or worktrees to avoid conflicting edits.

This setting isolates conversation execution; it does not move the entire Canvas or automation service into a sandbox. For Windows, see [README.windows.md](./README.windows.md#option-3-with-multiple-docker-sandboxes-wsl-2).

### Option 4: From Source

> [!WARNING]
> This runs the agent-server directly on the machine you're installing on — the agent will have full access to your filesystem!

**Prerequisites**: [Node.js](https://nodejs.org/) 24 or later, npm 11.12.1 (the repository pin), `uv` (for running the agent server via `uvx`)

Check `npm --version` before resolving dependencies. The seven-day release-age
filter (`npm install --min-release-age=7`) requires npm >=11.10; older versions
do not enforce it. Use `npm ci` to replay the committed lockfile. This npm
requirement is for contributor dependency resolution, not for installing the
published Canvas package.

```sh
git clone https://github.com/gaogao-jiang/my-openhands.git Jora
cd Jora
npm ci
npm run dev
```

---

Access the UI at [http://localhost:8000](http://localhost:8000) for the npm/source launchers, or [http://localhost:8000/canvas](http://localhost:8000/canvas) for the Docker image. You can add additional backends directly from the UI.

Local (`npx` / `npm run dev`) listeners bind **loopback only** (`127.0.0.1`) so the auto-injected session key is not reachable from other machines on the network. To listen on all interfaces, pass `--host 0.0.0.0` (or set `OH_BIND_HOST`); the session key is then **not** injected and the UI uses the same API-key entry screen as `--public`.

Docker listens on all container interfaces so port publishing works, but does not inject its session key into HTML by default. The quickstart above explicitly enables injection while publishing the host port on `127.0.0.1` only. If you publish Docker on a LAN or public interface, omit `AGENT_CANVAS_ALLOW_LAN_SESSION_KEY` and enter the API key in the UI. Set `LOCAL_BACKEND_API_KEY` to a strong value, or retrieve the generated value with `docker exec <container> sh -c 'cat "$STATE_DIR/api-key.txt"'`. For internet-facing installs, follow [self-hosting](./docs/SELF_HOSTING.md).

# Architecture

Agent Canvas is powered by the [OpenHands Agent Server](https://github.com/OpenHands/software-agent-sdk/tree/main/openhands-agent-server/openhands/agent_server), a REST API for running multiple agents on a single machine. Each Agent Server runs on a single host/port; the Agent Canvas can connect to multiple Agent Servers and easily flip between them.

You can run an Agent Server anywhere:

- Directly on your laptop (be careful!)
- On a dedicated machine like a Mac Mini
- On a virtual machine in the cloud
- Inside OpenHands Cloud (our commercial offering)

The Agent Server is often paired with an [Automation Server](https://github.com/OpenHands/automation), which lets you set up agents that run on a schedule or in response to events.

<img width="1456" height="1258" alt="image" src="https://github.com/user-attachments/assets/cb6de6f5-ac30-4d04-a76a-b5c259f0c163" />

### Repository boundaries

Agent Canvas is part of a multi-repository OpenHands system. Changes should go to the repository that owns the behavior:

| Repository                                                                        | Responsibility                                                                                            |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`OpenHands/OpenHands`](https://github.com/OpenHands/OpenHands)                   | Agent Canvas frontend, user-facing control center, backend selection, and local-stack orchestration.      |
| [`OpenHands/software-agent-sdk`](https://github.com/OpenHands/software-agent-sdk) | Python SDK, Agent Server, agents, tools, conversations, workspaces, events, and the canonical server API. |
| [`OpenHands/typescript-client`](https://github.com/OpenHands/typescript-client)   | Browser-compatible TypeScript client for the Agent Server API.                                            |
| [`OpenHands/automation`](https://github.com/OpenHands/automation)                 | Automation definitions, scheduling, webhooks, run history, and dispatching.                               |

The Agent Server API is implemented by the SDK and consumed through the TypeScript client by Agent Canvas. The automation service decides when work runs and dispatches conversations to the Agent Server/SDK, which decides what runs. See [`AGENTS.md`](./AGENTS.md) for contributor-specific boundaries and the required custom code-review guide.

## More documentation

- [Documentation index](./docs/README.md)
- [Architecture overview](./docs/architecture.md)
- [Development guide](./docs/DEVELOPMENT.md), including [embedding Canvas components in a host app](./docs/DEVELOPMENT.md#css-isolation-and-host-app-customization) (load `@openhands/agent-canvas/styles.css` once next to the component imports)
- [Self-hosting guide](./docs/SELF_HOSTING.md)
