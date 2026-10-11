# GPT image generation, editing and async tasks

src: https://piapi.ai/docs/gpt-image/gpt-image-api.md, retrieved October 11, 2026.

GPT image aliases use the same runtime model for generation and editing.
`gpt-image-2` remains the preview compatibility alias; choose `gpt-image-2-ga`
for GA with its default `quality=medium`. Default calls remain synchronous.

## Request selection

| Run flags | Endpoint | Body | Authentication |
|---|---|---|---|
| None | `/v1/images/generations` | JSON | Bearer |
| `--edit` | `/v1/images/edits` | Multipart files | Bearer |
| `--async` | `/api/v1/images/generations/async` | JSON | X-API-Key |
| `--edit --async` | `/api/v1/images/edits/async` | Multipart files | X-API-Key |

`--base-url` selects the gateway origin, without a `/v1` suffix. Confirm the async
gateway available to your account if PiAPI provisions it on a different host.
A submission is never automatically retried. `task get` and `task wait` query
`/api/v1/task/<id>` and do not create another billed generation.

## Safe previews

These run previews require no credentials, read no files and make no API request:

```bash
piapi run gpt-image-2-ga prompt="a ceramic vase" --async --dry-run
piapi run gpt-image-2-ga prompt="add warm lighting" image=@./subject.png --edit --dry-run
piapi run gpt-image-2.5-flare prompt="use the subject from image one and the style from image two" \
  image:='["@./subject.png","@./style.webp"]' --edit --async --dry-run
```

Editing is explicit: `--edit` accepts `image=@file` for one local image or a JSON
array of 1-16 `@file` references. Multipart image order is preserved. The first
image is the primary subject and later images are references. An optional
`mask=@file` applies to the first image. Nested arbitrary fields are rejected
because multipart scalar fields must have an unambiguous representation.

The CLI checks regular non-symlink PNG/JPG/JPEG/WEBP files and a 25 MB per-file
limit before submitting. It does not infer images from URL strings, fetch remote
references or upload editing references to ephemeral storage. Download remote
images yourself before editing. Local multipart transfer therefore does not
require the separate ephemeral-upload plan entitlement. Provider generation
billing and account permissions still apply.

## Execution and result retrieval

The following commands submit or query real requests. Run them only when
intentionally authorizing provider use and after configuring an API key:

```bash
piapi run gpt-image-2-ga prompt="add warm lighting" image=@./subject.png --edit --download --out-dir ./renders
piapi run gpt-image-2.5-sunburst prompt="a landscape" --async --output json
piapi run gpt-image-2.5-flare prompt="transfer the style" \
  image:='["@./subject.png","@./style.webp"]' --edit --async --output json
piapi task get TASK_ID
piapi task wait TASK_ID --download --out-dir ./renders --timeout 600
```

Async submission prints a task ID and status. `--download` on submission does
not wait or download an unfinished result: use `task wait --download` afterward.
Provider results expire after 60 minutes from submission, so retrieve them promptly.
The documented in-flight limit is 100 tasks; concurrency errors are surfaced
rather than automatically resubmitted. Webhook callbacks are not documented for
these image endpoints, so `--webhook` is rejected for all GPT image calls,
including synchronous generation.

Completed tasks may contain URLs or `output.data[].b64_json`. Both download paths
work in text and JSON output modes. JSON preserves the raw task, while text
summarizes inline image payloads rather than dumping base64. Existing output files
are never overwritten. Base64 payloads use `.png` filenames, so prefer
`output_format=png` if you require filenames to match the encoded format.
A failed image task reports the upstream `output.error_body` message and exits
with the existing API-error code. Polling failures never resubmit a task.

Sync image generation/edit and async multipart edit submissions default to 120s.
Async JSON generation submissions and task queries default to 30s. The async
edit deadline starts after local file validation and form assembly so those
operations do not consume the upload budget. `PIAPI_TIMEOUT_MS` overrides request timeouts;
`--timeout` controls how long task polling waits. On polling timeout, resume
using the same task ID rather than submitting the intent again.

## Local verification

`test/client/images.test.ts` checks endpoint/auth/body contracts and errors.
`test/files/image-parts.test.ts` checks ordered multipart inputs and file boundaries.
`test/commands/image-run.test.ts` checks real CLI previews without file access.
`test/commands/image-lifecycle.test.ts` exercises submissions, task queries and
base64 downloads using a loopback-only server. Its subprocess fetch guard blocks
all external origins. `test/output/task-result.test.ts` covers base64 persistence
and preserved provider errors. Async submission decoding must reject null/non-object
bodies and unknown statuses before exposing a resumable task ID. The status allowlist
and TypeScript type share `TASK_STATUSES` in `src/types/api.ts`; null and unknown-status
regressions are in the client tests. CLI argument-array test cases use object rows
with `test.each`: Bun spreads array rows into callback arguments, which can otherwise
cause a rejection test to run only the first CLI token and falsely pass. Typecheck
and exact request-body assertions catch this fixture error.
These tests do not prove paid upstream generation.

The review-fix regressions in `test/client/images.test.ts` pin the multipart
deadline separately from JSON submission, require file failures before timeout
creation, and preserve overrides and single-attempt behavior. They also require
malformed HTTP 200 edit responses to become descriptive API errors rather than
raw parsing exceptions. `test/commands/image-run.test.ts` rejects unsupported
webhooks on synchronous generation as well as edit/async paths, before any POST.

Private Seedance asset-management commands remain outside this package.
