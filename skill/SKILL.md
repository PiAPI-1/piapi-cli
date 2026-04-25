---
name: piapi-cli
description: Use piapi to call 80+ multimodal AI models (flux, sora2, kling, midjourney, veo3, hailuo, suno, trellis, etc.) via the PiAPI unified API. Use when the user wants to generate images, videos, audio, 3D models, or text completions from the terminal. Supports key=value inputs, async tasks, polling, and webhook callbacks.
---

# PiAPI CLI — Agent Skill Guide

Use `piapi` to call 80+ multimodal AI models via the PiAPI unified API.

## Prerequisites

```bash
# Install
npm install -g piapi-cli

# Auth
piapi auth login --api-key sk-xxxxx

# Verify
piapi auth status
```

## Agent Flags

| Flag | Purpose |
|---|---|
| `--non-interactive` | Fail on missing args instead of prompting |
| `--quiet` | Suppress spinners/progress; stdout is pure data |
| `--output json` | Machine-readable JSON output |
| `--async` | Return task ID immediately without polling |
| `--dry-run` | Preview the API request without executing |
| `--api-key <key>` | Override API key per-call |
| `--webhook <url>` | Set webhook URL for async callbacks |

---

## Commands

### piapi run \<model\> key=value...

Run a model with `key=value` inputs. All models use the unified API.

```bash
piapi run flux-dev prompt="a corgi" aspect_ratio=16:9 num_outputs=4
piapi run kling-3 prompt="a sunset" duration=5
piapi run sora2-pro prompt="waves" --async
piapi run flux-dev prompt="test" --dry-run
```

| Flag | Description |
|---|---|
| `--async` | Return task ID immediately (required for video/3D models) |
| `--dry-run` | Print request body without sending |
| `--webhook <url>` | Webhook for completion callbacks |
| `--out-dir <path>` | Download outputs to directory |
| `--download` | Auto-download when task completes |

**Models:**

- **Image**: `flux-dev`, `flux-schnell`, `flux-pro`, `midjourney`, `nano-banana-pro`, `nano-banana-2`, `gemini-2.5-flash-image`, `qwen-image`, `seedream-5-lite`, `gpt-image`
- **Video** (all async): `sora2`, `sora2-pro`, `veo3`, `veo3.1`, `kling-3`, `kling-3-omni`, `kling-o1`, `hailuo`, `wan2.6`, `seedance-2`
- **Audio**: `udio-music`, `ace-step`, `mmaudio`, `diffrhythm`, `f5-tts`
- **3D** (async): `trellis`, `trellis2`
- **LLM**: `completions`

### piapi task list

```bash
piapi task list
piapi task list --status running --limit 10
```

### piapi task get \<id\>

```bash
piapi task get <task-id>
```

### piapi task cancel \<id\>

```bash
piapi task cancel <task-id>
```

### piapi model list

```bash
piapi model list
piapi model list --type video
piapi model list --type image
```

### piapi model schema \<model\>

```bash
piapi model schema flux-dev
```

### piapi quota

```bash
piapi quota
piapi quota --dry-run
```

### piapi auth login

```bash
piapi auth login --api-key sk-xxxxx
```

### piapi auth status

```bash
piapi auth status
piapi auth status --output json
```

### piapi auth logout

```bash
piapi auth logout
```

### piapi config show

```bash
piapi config show
piapi config show --output json
```

### piapi config set

```bash
piapi config set --key apiKey --value sk-xxxxx
```

---

## Output

- `--output json`: stdout is pure JSON (one line)
- `--quiet`: suppress all spinners/progress
- All logs/progress go to stderr; stdout is clean data

## Configuration Precedence

CLI flags → env `PIAPI_API_KEY` → `~/.piapi/config.json` → defaults.

```bash
PIAPI_API_KEY=sk-xxxxx piapi run flux-dev prompt="hello"
```
