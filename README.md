# PiAPI CLI

Official CLI for the PiAPI platform — call 89 multimodal AI models (image, video, audio, 3D, LLM) from your terminal or AI agent. Every model is verified against PiAPI docs; `piapi model list` shows the live catalog.

## Install

```bash
npm install -g piapi-cli
```

Requires [Node.js](https://nodejs.org) 18+.

## Quick Start

```bash
# Authenticate
piapi auth login --api-key sk-xxxxx

# Generate an image
piapi run flux-dev prompt="a corgi in space"
piapi run gpt-image-2 prompt="a corgi in space" size=1024x1024

# Chat with an LLM
piapi run gpt-4o prompt="explain async/await in JavaScript"
piapi run claude-sonnet-4.6 prompt="rewrite this email more concisely" system="you are a writing coach"

# Generate a video (async)
piapi run sora2-pro prompt="ocean waves" --async

# Check quota
piapi quota

# List models
piapi model list
piapi model list --type video
piapi model list --type llm
```

## Commands

### piapi run \<model\> key=value...

Run any model with `key=value` inputs. Video and 3D models require `--async`.
LLM and GPT-image models use the OpenAI-compatible endpoint (sync, no
polling); everything else uses the unified task API.

```bash
piapi run flux-dev prompt="a corgi" aspect_ratio=16:9 num_outputs=4
piapi run kling-3 prompt="a sunset" duration=5
piapi run sora2-pro prompt="waves" --async
piapi run gpt-image-2 prompt="a robot" size=1024x1024
piapi run gpt-4o prompt="hello, world"
piapi run flux-dev prompt="test" --dry-run
```

### piapi task

```bash
piapi task list
piapi task list --status running
piapi task get <id>
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
| `--dry-run` | Preview request without executing |
| `--webhook <url>` | Webhook URL for callbacks |
| `--out-dir <path>` | Download directory |
| `--download` | Auto-download outputs |
| `--no-color` | Disable ANSI colors (also honours `NO_COLOR` env) |

## Configuration

Config stored at `~/.piapi/config.json`.

Precedence: CLI flags → `PIAPI_API_KEY` env → config file → defaults.

## AI Agent Integration

For Claude Code, Cursor, and other agents:

```bash
npx skills add piapi-ai/cli
```

See `skill/SKILL.md` for the full agent skill specification.

## License

MIT
