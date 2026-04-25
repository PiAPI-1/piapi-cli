# PiAPI CLI

Official CLI for the PiAPI platform — call 80+ multimodal AI models (image, video, audio, 3D, LLM) from your terminal or AI agent.

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

# Generate a video (async)
piapi run sora2-pro prompt="ocean waves" --async

# Check quota
piapi quota

# List models
piapi model list
piapi model list --type video
```

## Commands

### piapi run \<model\> key=value...

Run any model with `key=value` inputs. Video and 3D models require `--async`.

```bash
piapi run flux-dev prompt="a corgi" aspect_ratio=16:9 num_outputs=4
piapi run kling-3 prompt="a sunset" duration=5
piapi run sora2-pro prompt="waves" --async
piapi run flux-dev prompt="test" --dry-run
```

### piapi task

```bash
piapi task list
piapi task list --status running
piapi task get <id>
piapi task cancel <id>
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
