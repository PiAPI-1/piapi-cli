---
name: piapi-cli
description: Use piapi to call 94 multimodal AI models — image (flux/midjourney/qwen/nano-banana/seedream/z-image/gpt-image), video (sora2/veo3/kling/hailuo/wan/seedance/skyreels/framepack/hunyuan/luma/omni-human/ai-hug), audio (udio/ace-step/mmaudio/diffrhythm/f5-tts), 3D (trellis), LLM (gpt/claude/gemini) — from the terminal. Auto-routes between PiAPI's unified task API and OpenAI-compatible endpoints. Supports key=value inputs, async tasks, polling, and webhook callbacks.
---

# PiAPI CLI — Agent Skill Guide

Use `piapi` to call 94 multimodal AI models via the PiAPI unified API.

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
| `--timeout <seconds>` | Max wait while polling a task (default 300) |
| `--stream` | Stream LLM output as it arrives (openai-completions only) |
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

# Local file in / file out (paid plan required for upload):
piapi run remove-bg image=@./photo.png --download --out-dir ./out
piapi run faceswap target_image=@./me.jpg swap_image=@./friend.jpg --download
```

**Input operators** (httpie-style):

- `key=value` — auto-coerced: `n=2` → number, `hd=true` → boolean, rest string
- `key==value` — literal string, never coerced (`version==3.0` → `"3.0"`)
- `key:=json` — strict JSON: `urls:='["https://a.png","https://b.png"]'`, `cfg:='{"a":1}'`

Bare arguments without `=` are rejected (catches unquoted prompts).

**Local files**: any `key=@./path/to/file` is auto-uploaded to PiAPI's
ephemeral resource endpoint and rewritten to a temporary URL before the
request goes out. Bare URLs (`key=https://…`) are passed through. The
upload requires a paid PiAPI plan; on free plans you get a clear hint
to use a public URL instead.

**Auto-download**: with `--download`, every URL the result yields is
written to disk under `--out-dir` (default cwd) — in both text and JSON
output modes. Filenames come from the URL path; collisions get a `-1`,
`-2`… suffix instead of overwriting. Stderr logs `Saved → …` per file;
stdout still shows the URL lines for grepping.

| Flag | Description |
|---|---|
| `--async` | Return task ID immediately (required for video/3D unified models) |
| `--stream` | Stream LLM output as it arrives (openai-completions only) |
| `--dry-run` | Print request body without sending |
| `--webhook <url>` | Webhook for unified-API completion callbacks |
| `--out-dir <path>` | Download outputs to directory (default: cwd) |
| `--download` | Save every result URL to disk after the task completes |

**Models** (94 entries, every one verified against PiAPI docs).
For the full live list, run `piapi model list` — the catalog is the
source of truth. Highlights below:

- **Image generation** (unified): `flux-dev`, `flux-schnell`,
  `flux-dev-advanced`, `flux-img2img`, `flux-kontext`, `flux-inpaint`,
  `flux-outpaint`, `flux-redux`, `midjourney`, `mj-{upscale,variation,reroll,describe,seed,blend,inpaint,outpaint,pan}`,
  `nano-banana-pro`, `nano-banana-2`, `gemini-2.5-flash-image`,
  `qwen-image`, `qwen-image-edit`, `z-image`, `seedream-5-lite`
- **Image tools** (unified): `remove-bg`, `upscale`, `segment`, `joycaption`, `faceswap`, `multi-faceswap`
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
- **Video tools** (async unified): `video-upscale`, `video-remove-bg`, `video-faceswap`
- **Video** (OpenAI-compat streaming): `sora2-preview`, `sora2-hd-preview` — emits markdown progress + final video URL via SSE; the CLI streams chunks to stdout and prints `url: …` lines at the end
- **Audio** (unified): `udio-music`, `udio-song-extend`, `udio-lyrics`,
  `ace-step`, `ace-step-audio2audio`, `ace-step-edit`, `ace-step-extend`,
  `mmaudio`, `diffrhythm`, `f5-tts`
- **3D** (async unified): `trellis`, `trellis2`
- **LLM** (OpenAI-compat): `gpt-5`, `gpt-5.2`, `gpt-4o`, `gpt-4o-mini`,
  `gpt-4.1`, `claude-opus-4.6`, `claude-sonnet-4.6`, `gemini-2.5-flash-nothinking`

### piapi task list

```bash
piapi task list
```

### piapi task get \<id\>

```bash
piapi task get <task-id>
```

### piapi task wait \<id\>

Poll a task until it reaches a terminal status, then render exactly like
a synchronous `piapi run`: URL lines (or full JSON in JSON mode), non-zero
exit on failure, `--download`/`--out-dir`/`--timeout` supported. This is
the standard follow-up after `--async`:

```bash
piapi run sora2-pro prompt="waves" --async --output json   # → {"task_id": "..."}
piapi task wait <task-id> --download --timeout 1200
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
