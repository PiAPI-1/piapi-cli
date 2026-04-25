---
name: piapi-cli
description: Use piapi to call 89 multimodal AI models — image (flux/midjourney/qwen/nano-banana/seedream/z-image/gpt-image), video (sora2/veo3/kling/hailuo/wan/seedance/skyreels/framepack/hunyuan/luma/omni-human/ai-hug), audio (udio/ace-step/mmaudio/diffrhythm/f5-tts), 3D (trellis), LLM (gpt/claude/gemini) — from the terminal. Auto-routes between PiAPI's unified task API and OpenAI-compatible endpoints. Supports key=value inputs, async tasks, polling, and webhook callbacks.
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

Run a model with `key=value` inputs. The CLI auto-routes to the right
PiAPI surface:

- **Unified task API** (async lifecycle, polled): all image/video/audio/3D
  models below.
- **OpenAI-compatible** (sync, returns immediately): GPT-image and LLM
  models. `prompt="…"` becomes `messages: [{role:'user', content}]`.
  Optional `system="…"` prepends a system message; `messages=@file.json`
  overrides for fine control.

```bash
piapi run flux-dev prompt="a corgi" aspect_ratio=16:9 num_outputs=4
piapi run kling-3 prompt="a sunset" duration=5
piapi run sora2-pro prompt="waves" --async
piapi run gpt-image-2 prompt="a robot" size=1024x1024
piapi run gpt-4o prompt="explain async/await in JS"
piapi run flux-dev prompt="test" --dry-run
```

| Flag | Description |
|---|---|
| `--async` | Return task ID immediately (required for video/3D unified models) |
| `--dry-run` | Print request body without sending |
| `--webhook <url>` | Webhook for unified-API completion callbacks |
| `--out-dir <path>` | Download outputs to directory |
| `--download` | Auto-download when task completes |

**Models** (89 entries, every one verified against PiAPI docs).
For the full live list, run `piapi model list` — the catalog is the
source of truth. Highlights below:

- **Image generation** (unified): `flux-dev`, `flux-schnell`,
  `flux-dev-advanced`, `flux-img2img`, `flux-kontext`, `flux-inpaint`,
  `flux-outpaint`, `flux-redux`, `midjourney`, `mj-{upscale,variation,reroll,describe,seed,blend,inpaint,outpaint,pan}`,
  `nano-banana-pro`, `nano-banana-2`, `gemini-2.5-flash-image`,
  `qwen-image`, `qwen-image-edit`, `z-image`, `seedream-5-lite`
- **Image tools** (unified): `remove-bg`, `upscale`, `segment`, `joycaption`
- **Image generation** (OpenAI-compat): `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`
- **Video** (all async unified): `sora2`, `sora2-pro`, `sora2-watermark`,
  `veo3`, `veo3-fast`, `veo3.1`, `veo3.1-fast`,
  `kling-3`, `kling-3-omni`, `kling-o1`, `kling-tryon`, `kling-effects`,
  `kling-sound`, `kling-avatar`, `kling-motion`, `kling-turbo`, `kling-elements`,
  `hailuo`, `skyreels`, `framepack`, `hunyuan-video`, `luma`,
  `omni-human`, `ai-hug-video`,
  `wan2.6`, `wan2.6-img2vid`, `wanx-lora`, `wanx-lora-img2vid`,
  `wanx-keyframe`, `wanx-camera`, `wanx22`, `wanx22-img2vid`,
  `seedance-2`, `seedance-2-preview`, `seedance-watermark`
- **Video tools** (async unified): `video-upscale`, `video-remove-bg`
- **Audio** (unified): `udio-music`, `udio-song-extend`, `udio-lyrics`,
  `ace-step`, `ace-step-audio2audio`, `ace-step-edit`, `ace-step-extend`,
  `mmaudio`, `diffrhythm`, `f5-tts`
- **3D** (async unified): `trellis`, `trellis2`
- **LLM** (OpenAI-compat): `gpt-5`, `gpt-5.2`, `gpt-4o`, `gpt-4o-mini`,
  `gpt-4.1`, `claude-opus-4.6`, `claude-sonnet-4.6`, `gemini-2.5-flash`

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

PiAPI has no unified cancel endpoint — only Kling and Midjourney expose
per-provider cancel APIs. This command currently surfaces a clear
"not implemented in v1" hint; cancel via the PiAPI dashboard for now.

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
- When stdout is not a TTY (piped), the formatter defaults to JSON
- `--no-color` (or `NO_COLOR=1`) disables ANSI color even in TTY

## Configuration Precedence

CLI flags → env `PIAPI_API_KEY` → `~/.piapi/config.json` → defaults.

```bash
PIAPI_API_KEY=sk-xxxxx piapi run flux-dev prompt="hello"
```
