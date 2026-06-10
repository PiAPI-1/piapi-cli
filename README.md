<p align="center">
  <img src="docs/banner.png" alt="PiAPI CLI" width="800">
</p>

<p align="center">
  <strong>piapi — one binary for 97 multimodal AI models</strong><br>
  Generate images, videos, audio, 3D, and chat with LLMs from your terminal or AI agent.
</p>

<p align="center">
  <a href="README_CN.md">中文文档</a> · <a href="https://piapi.ai">PiAPI</a> · <a href="https://piapi.ai/docs">Docs</a> · <a href="skill/SKILL.md">Agent Skill</a>
</p>

## Features

- **Image** — 35 models incl. `flux-dev`, `nano-banana-pro`, `qwen-image-edit`, `seedream-5-lite`, `midjourney`, plus tools (`remove-bg`, `upscale`, `segment`, `joycaption`, `faceswap`)
- **Video** — 42 models incl. `sora2-pro`, `kling-3`, `veo3-fast`, `wanx22`, `seedance-2`, `hailuo`, `luma`
- **Audio** — 10 models incl. `mmaudio` (video→audio), `f5-tts`, `diffrhythm`, `udio-music`, `ace-step`
- **3D** — `trellis` (text→3D), `trellis2` (image→3D)
- **LLM** — 8 chat models incl. `gpt-4o`, `claude-sonnet-4.6`, `gpt-5`, plus `gpt-image-2` for OpenAI-compatible image generation
- **Streaming** — `--stream` for token-by-token LLM output; SSE-only models (`sora2-preview`) stream by default
- **File I/O** — `key=@./local.png` auto-uploads, `--download` auto-saves every result URL or `b64_json` payload
- **Two API surfaces** — Unified task API for media generation, OpenAI-compatible endpoint for LLMs and `gpt-image-2`. Every entry verified against PiAPI docs; `piapi model list` shows the live catalog.

## Install

```bash
npm install -g piapi-cli      # npm
pnpm add -g piapi-cli         # pnpm
bun add -g piapi-cli          # bun
yarn global add piapi-cli     # yarn
```

Or run without installing:

```bash
npx piapi-cli@latest --help
```

Requires [Node.js](https://nodejs.org) 18+.

<p align="center">
  <img src="docs/help.png" alt="piapi --help" width="640">
</p>

## Quick Start

```bash
# Authenticate
piapi auth login --api-key sk-xxxxx

# Generate an image
piapi run flux-dev prompt="a corgi in space"
piapi run gpt-image-2 prompt="a corgi in space" size=1024x1024

# Chat with an LLM (token-by-token streaming)
piapi run gpt-4o prompt="explain async/await in JavaScript" --stream
piapi run claude-sonnet-4.6 prompt="rewrite this email more concisely" system="you are a writing coach"

# Generate a video (async), then wait for the result
piapi run sora2-pro prompt="ocean waves" --async
piapi task wait <task-id> --download

# Upload a local file → run → auto-download the result
piapi run remove-bg image=@./photo.png --download --out-dir ./out

# Check quota and browse the catalog
piapi quota
piapi model list --type video
```

## Commands

### piapi run \<model\> key=value...

Run any model with `key=value` inputs. Video and 3D models require `--async`.
LLM and `gpt-image-2` models use the OpenAI-compatible endpoint (sync, no
polling); everything else uses the unified task API.

```bash
piapi run flux-dev prompt="a corgi" aspect_ratio=16:9 num_outputs=4
piapi run kling-3 prompt="a sunset" duration=5
piapi run sora2-pro prompt="waves" --async
piapi run gpt-image-2 prompt="a robot" size=1024x1024
piapi run gpt-4o prompt="hello, world" --stream
piapi run flux-dev prompt="test" --dry-run
```

**Input operators** (httpie-style):

| Syntax | Meaning |
|---|---|
| `key=value` | Auto-coerced: `n=2` → number, `hd=true` → boolean, everything else string |
| `key==value` | Literal string, never coerced (`version==3.0` → `"3.0"`) |
| `key:=json` | Strict JSON: `urls:='["https://a.png","https://b.png"]'`, `cfg:='{"a":1}'` |

**Local files** — prefix any input with `@` to upload before the request runs:

```bash
piapi run remove-bg image=@./photo.png --download --out-dir ./out
piapi run faceswap source=@./face.jpg target=@./scene.png --async
```

Upload requires a paid PiAPI plan. Add `--download` to save every URL (and
inline base64 from `gpt-image-2` reference edits) into `--out-dir` (default cwd).

### piapi task

```bash
piapi task list
piapi task get <id>
piapi task wait <id> --download   # poll until finished, render like a sync run
piapi task cancel <id>   # provider-specific (Kling/Midjourney only); v1 returns a hint
```

### piapi model

```bash
piapi model list
piapi model list --type video
piapi model schema flux-dev
```

### piapi auth

```bash
piapi auth login --api-key sk-xxxxx
piapi auth status
piapi auth logout
```

> 💡 On shared machines, prefer `export PIAPI_API_KEY=sk-...` over `--api-key`.
> Command-line args are visible to other local users via `ps`.

### piapi config

```bash
piapi config show
piapi config set --key apiKey --value sk-xxxxx
```

### piapi quota

```bash
piapi quota
```

## Global Flags

| Flag | Description |
|---|---|
| `--api-key <key>` | API key (overrides env/config) |
| `--base-url <url>` | API base URL |
| `--output json` | JSON output on stdout |
| `--quiet` | Suppress progress indicators |
| `--non-interactive` | Fail on missing input |
| `--async` | Return task ID immediately |
| `--timeout <seconds>` | Max wait while polling a task (default 300) |
| `--stream` | Stream LLM output as it arrives (openai-completions only) |
| `--dry-run` | Preview request without executing |
| `--webhook <url>` | Webhook URL for callbacks |
| `--out-dir <path>` | Download directory |
| `--download` | Auto-download outputs |
| `--no-color` | Disable ANSI colors (also honours `NO_COLOR` env) |

## Configuration

Config lives at `~/.piapi/config.json`:

```json
{
  "apiKey": "sk-...",
  "baseUrl": "https://api.piapi.ai"
}
```

Precedence: CLI flags → environment variables → config file → defaults.

| Variable | Purpose |
|---|---|
| `PIAPI_API_KEY` | API key |
| `PIAPI_BASE_URL` | Override API base URL |
| `PIAPI_TIMEOUT_MS` | Override fetch timeout (default 30s API / 60s upload+download) |
| `PIAPI_NO_UPDATE_CHECK` | Disable the daily npm-version check |
| `NO_COLOR` | Disable ANSI colors (any truthy value) |

## AI Agent Integration

For Claude Code, Cursor, and other agents:

```bash
npx skills add PiAPI-1/piapi-cli
```

See [`skill/SKILL.md`](skill/SKILL.md) for the full agent skill specification.

## License

MIT
