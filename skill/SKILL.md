---
name: piapi-cli
description: Use piapi to call 111 multimodal AI catalog entries from the terminal, including image (flux/qwen/nano-banana/seedream/z-image/gpt-image), video (sora2/veo3/kling/hailuo/minimax-h3/wan/seedance/skyreels/framepack/hunyuan/luma/omni-human/ai-hug), audio (udio/ace-step/mmaudio/seed-audio/diffrhythm/f5-tts), 3D (trellis/pixal3d/meshy/skin-tokens), and LLM (gpt/claude/gemini). Auto-routes between PiAPI's unified task API and OpenAI-compatible endpoints. Supports key=value inputs, async tasks, polling, and webhook callbacks.
---

# PiAPI CLI — Agent Skill Guide

Use `piapi` to call 111 multimodal AI catalog entries via PiAPI's unified task and OpenAI-compatible APIs.

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

- **Unified task API**: most image, video, audio and 3D entries use async tasks.
- **OpenAI-compatible image generation**: GPT image entries use synchronous JSON generations, not multipart editing.
- **OpenAI-compatible chat**: for LLMs, `prompt="…"` becomes a user message. `system="…"` prepends a system message; use `messages:='[{"role":"user","content":"hello"}]'` for explicit messages. `@file` uploads media rather than reading JSON messages.

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
| `--async` | Return task ID immediately (default for unified video/3D models) |
| `--stream` | Stream LLM output as it arrives (openai-completions only) |
| `--dry-run` | Print request body without sending |
| `--webhook <url>` | Webhook for unified-API completion callbacks |
| `--out-dir <path>` | Download outputs to directory (default: cwd) |
| `--download` | Save every result URL to disk after the task completes |

**Catalog**: 111 entries, including aliases and task variants, verified against official documentation rather than paid live generation.
Run `piapi model list` for the full bundled list. See [the upstream update guide](../docs/upstream-models.md) for the October 11, 2026 contracts and limitations. Highlights below:

- **Image generation** (unified): `flux-dev`, `flux-schnell`,
  `flux-dev-advanced`, `flux-img2img`, `flux-kontext`, `flux-inpaint`,
  `flux-outpaint`, `flux-redux`,
  `nano-banana-pro`, `nano-banana-2`, `gemini-2.5-flash-image`,
  `qwen-image`, `qwen-image-edit`, `z-image`, `seedream-5-lite`,
  `seedream-5-lite-less-restriction`, `seedream-5-pro`, `seedream-5-pro-less-restriction`
- **Image tools** (unified): `remove-bg`, `upscale`, `segment`, `joycaption`, `faceswap`, `multi-faceswap`
- **Image generation** (OpenAI-compat): `gpt-image-2` (legacy preview), `gpt-image-2-preview`, `gpt-image-2-ga`, `gpt-image-2.5`, `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst`, `gpt-image-1.5`, `gpt-image-1`
- **Video** (all async unified): `sora2`, `sora2-pro`, `sora2-watermark`,
  `veo3`, `veo3-fast`, `veo3.1`, `veo3.1-fast`,
  `kling-3`, `kling-3-omni`, `kling-o1`, `kling-tryon`, `kling-effects`,
  `kling-sound`, `kling-avatar`, `kling-motion`, `kling-turbo`, `kling-elements`,
  `hailuo`, `skyreels`, `framepack`, `hunyuan-video`, `luma`,
  `omni-human`, `ai-hug-video`,
  `wan2.6`, `wan2.6-img2vid`, `wanx-lora`, `wanx-lora-img2vid`,
  `wanx-keyframe`, `wanx-camera`, `wanx22`, `wanx22-img2vid`,
  `seedance-2`, `seedance-2-fast`, `seedance-2-less-restriction`,
  `seedance-2-fast-less-restriction`, `seedance-watermark`,
  `seedance-2.5`, `seedance-2.5-less-restriction`, `seedance-2-mini`,
  `seedance-2-mini-less-restriction`, `minimax-h3`, `minimax-h3-img2vid`,
  `minimax-h3-nsfw`, `minimax-h3-nsfw-img2vid`
- **Video tools** (async unified): `video-upscale`, `video-remove-bg`, `video-faceswap`
- **Video** (OpenAI-compat streaming): `sora2-preview`, `sora2-hd-preview` — emits markdown progress + final video URL via SSE; the CLI streams chunks to stdout and prints `url: …` lines at the end
- **Audio** (unified): `udio-music`, `udio-song-extend`, `udio-lyrics`,
  `ace-step`, `ace-step-audio2audio`, `ace-step-edit`, `ace-step-extend`,
  `mmaudio`, `seed-audio`, `diffrhythm`, `f5-tts`
- **3D** (async unified): `trellis`, `trellis2`, `pixal3d`, `meshy`, `meshy-txt`, `skin-tokens`
- **LLM** (OpenAI-compat): `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5`, `gpt-5.2`, `gpt-4o`, `gpt-4o-mini`,
  `gpt-4.1`, `claude-opus-4.6`, `claude-sonnet-4.6`, `gemini-2.5-flash-nothinking`

**Less-restriction variants** have model-specific pricing and content policies.
Consult the relevant official endpoint documentation linked in the catalog;
do not assume one surcharge or reference-image policy applies across models.

Synchronous GPT image calls default to a 120s request timeout, other API calls to 30s,
and uploads/downloads to 60s. `PIAPI_TIMEOUT_MS` overrides these fetch timeouts.
`--timeout` instead limits task polling. Generation is not retried automatically.

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

PiAPI has no unified cancel endpoint. Kling exposes
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
