# Upstream model update: October 11, 2026

This update adds twenty CLI aliases, removes ten discontinued Midjourney aliases,
and leaves 111 catalog entries. Entries include task variants and compatibility aliases,
not 111 distinct underlying engines. The catalog is bundled, not queried live.
Documentation verification does not imply successful paid generation.

## Evidence

src: Official PiAPI documentation retrieved on October 11, 2026.
The endpoint index snapshot is `docs/llms.txt`, sourced from
https://piapi.ai/docs/llms.txt. The broader https://piapi.ai/llms.txt also indexes
model guides. Marketing announcements alone do not establish a runtime contract.

Primary endpoint contracts:

- Seedance 2.5: https://piapi.ai/docs/seedance-api/seedance-25.md
- Seedance 2 and Mini: https://piapi.ai/docs/seedance-api/seedance-2.md
- MiniMax H3: https://piapi.ai/docs/minimax-api/generate-video.md
- Meshy: https://piapi.ai/docs/meshy-api/create-task.md
- Skin Tokens: https://piapi.ai/docs/tools/skin-tokens-api.md
- GPT image generation: https://piapi.ai/docs/gpt-image/gpt-image-api.md
- GPT Image 2 GA quality: https://piapi.ai/gpt-images-2-0/llms.txt
- LLM runtime IDs: https://piapi.ai/docs/llm-api/completions.md
- Upload envelope: https://piapi.ai/docs/tools/file-upload.md
- Midjourney retirement: https://piapi.ai/docs/sunsetting-midjourney.md

## Added aliases

| CLI alias | Runtime model | Task type or endpoint |
|---|---|---|
| `seedance-2.5` | `seedance` | `seedance-2.5` |
| `seedance-2.5-less-restriction` | `seedance` | `seedance-2.5-less-restriction` |
| `seedance-2-mini` | `seedance` | `seedance-2-mini` |
| `seedance-2-mini-less-restriction` | `seedance` | `seedance-2-mini-less-restriction` |
| `minimax-h3` | `Qubico/minimax-h3` | `txt2video` |
| `minimax-h3-img2vid` | `Qubico/minimax-h3` | `img2video` |
| `minimax-h3-nsfw` | `Qubico/minimax-h3-nsfw` | `txt2video` |
| `minimax-h3-nsfw-img2vid` | `Qubico/minimax-h3-nsfw` | `img2video` |
| `meshy` | `meshy` | `image-to-3d` |
| `meshy-txt` | `meshy` | `text-to-3d` |
| `skin-tokens` | `Qubico/skin-tokens` | `rig` |
| `gpt-image-2-ga` | `gpt-image-2` | `/v1/images/generations` |
| `gpt-image-2-preview` | `gpt-image-2-preview` | `/v1/images/generations` |
| `gpt-image-2.5` | `gpt-image-2.5` | `/v1/images/generations` |
| `gpt-image-2.5-flare` | `gpt-image-2.5-flare` | `/v1/images/generations` |
| `gpt-image-2.5-sunburst` | `gpt-image-2.5-sunburst` | `/v1/images/generations` |
| `gpt-5.6-sol` | `gpt-5.6-sol` | `/v1/chat/completions` |
| `gpt-5.6-terra` | `gpt-5.6-terra` | `/v1/chat/completions` |
| `gpt-5.6-luna` | `gpt-5.6-luna` | `/v1/chat/completions` |
| `gpt-6-astra` | `gpt-6-astra` | `/v1/chat/completions` |

The first eleven entries use `/api/v1/task`, X-API-Key authentication and the
unified task envelope. The image and chat endpoints use Bearer authentication,
JSON bodies and no unified envelope. MiniMax H3 and Meshy default
`config.service_mode` to `public`; webhook options merge into this configuration.
No new default configuration is imposed on existing entries.

## Safe request previews

All generation previews below include `--dry-run`. They need no API key, upload no files,
submit no task and incur no generation charges. Remove that flag only when
intentionally authorizing a real request. Reference URLs are placeholders.
Schemas are descriptive help, not local request validators.

```bash
piapi model schema seedance-2.5
piapi run seedance-2-mini prompt="waves" resolution=720p duration=5 --dry-run
piapi run minimax-h3 prompt="a landscape" duration=5 --dry-run
piapi run meshy image_url=https://example.com/reference.png --dry-run
piapi run skin-tokens model=https://example.com/mesh.glb --dry-run
piapi run gpt-image-2-ga prompt="a ceramic vase" --dry-run
piapi run gpt-image-2.5-flare prompt="a ceramic vase" quality=low --dry-run
piapi run gpt-6-astra messages:='[{"role":"user","content":"Hello"}]' --dry-run
```

### Seedance 2.5 draft, edit and extend

Draft generation requires `draft=true` and `resolution=480p`. Finalization uses
the returned draft task ID and `resolution=1080p`, without resending the prompt,
references or generation controls. Drafts expire after seven days and are
specific to the 2.5 task types. Ordinary generation supports duration 4-30 seconds.
Mini uses 4-15 seconds and 480p/720p only, not 1080p.

```bash
piapi run seedance-2.5 prompt="waves" draft=true resolution=480p --dry-run
piapi run seedance-2.5 draft_task_id=DRAFT_TASK_ID resolution=1080p --dry-run
piapi run seedance-2.5-less-restriction omni_reference_task_type=edit \
  prompt="change the lighting" video_urls:='["https://example.com/source.mp4"]' \
  aspect_ratio=adaptive duration=-1 auto_upload_assets=false --dry-run
piapi run seedance-2.5 omni_reference_task_type=extend prompt="continue the shot" \
  video_urls:='["https://example.com/source.mp4"]' aspect_ratio=adaptive duration=5 --dry-run
```

Edit requires a 4-30 second source video, adaptive aspect ratio and duration -1.
Extend also requires a source video and adaptive aspect ratio. The CLI does not
inject ordinary duration or aspect defaults that would conflict with these modes.
Consult the endpoint contract for variant-specific asset handling.

### Meshy preview and refine

Text-to-3D is two-stage. Preview creates geometry; refine uses its returned task ID.
The `model_file` output is a GLB URL with limited storage lifetime, documented as
three days. `skin-tokens` takes the input mesh in `input.model`; the outer runtime
model remains `Qubico/skin-tokens`. Its input mesh limit is 80,000 triangles.

```bash
piapi run meshy-txt mode=preview prompt="a wooden chair" --dry-run
piapi run meshy-txt mode=refine preview_task_id=PREVIEW_TASK_ID --dry-run
```

## Compatibility and known limits

- Existing `gpt-image-2` still targets `gpt-image-2-preview`. Explicit
  `gpt-image-2-ga` selects the distinct GA route and defaults `quality=medium`,
  the only documented GA quality. This avoids a silent billing-route change.
- Flare and Sunburst accept `auto`, `low`, `medium` and `high` quality. Suffix-free
  `gpt-image-2.5` only supports `n=1` and does not honor size/quality controls.
- GPT image generation remains synchronous JSON generation. Multipart edits and
  the separate async image submission endpoints are not implemented here.
  Unified async base64 download support is also outside this update.
- Synchronous image requests default to 120s because documented Sunburst
  generation commonly takes 50-70s. Other API requests remain 30s and transfers
  60s. `PIAPI_TIMEOUT_MS` overrides fetch limits, not task polling. No automatic
  generation retry was added.
- MiniMax H3's official prose lists 480P/768P/1080P, while its schema lists
  512p/768p. No resolution default is injected until this contradiction is
  resolved. Supply an upstream-supported value deliberately.
- Private Seedance asset management endpoints are not new CLI commands.
  Documented asset identifiers can still be passed as literal inputs.
- Claude Fable 5 is excluded because its marketing guide does not publish a
  runtime contract. Midjourney aliases are removed despite retained historical
  documentation pages. Existing non-Midjourney aliases are preserved.

## Regression evidence and recurrence prevention

`test/fixtures/upstream-models.ts` contains independently written endpoint
expectations. `test/commands/upstream-dry-run.test.ts` checks all new aliases and
actual CLI bodies, including draft finalization, edit/extend, Meshy refine,
webhook merging and file literals without credentials or network access.

The official upload response nests its URL in `data.url`; reading only a top-level
URL previously returned undefined. `test/files/upload.test.ts` verifies nested
success, legacy success and malformed/error envelopes. Decode these external
responses at the upload boundary before resolving request inputs.

`test/client/openai-compat.test.ts` checks image/chat timeout separation, environment
overrides and timeout errors without sleeping or retrying. When adding another
synchronous image route, keep timeout selection at the client call boundary.
`test/commands/run.test.ts` checks configuration defaults plus webhook preservation.
All checks are local. No paid provider call was made for this update.
