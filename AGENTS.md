# piapi-cli — Repo Guide

PiAPI 官方 CLI。101 个多模态模型聚合（image/video/audio/3D/LLM）。Bootstrap SaaS 项目，发布到 npm `piapi-cli`。

> 本文件是**唯一事实源**。`CLAUDE.md` 是指向它的 symlink（Claude Code 只读 `CLAUDE.md`，Codex 只读 `AGENTS.md`）。别把两者拆成两份内容——那会让异构互审失效。

## 命令
```bash
bun run dev       # source 模式（VERSION = 0.0.0-dev）
bun run build     # → dist/piapi.mjs，注入 CLI_VERSION
bun run lint      # eslint src/ test/
bun run typecheck # tsc --noEmit
bun test          # 0 fail，CI gate（数量会涨，别在这硬编码）
```

## 不动的硬约束

- **Brand 颜色只允许 pure blue**。禁紫/粉/青/teal — 这些是通用 AI 工具默认色，要避开。看到这些立刻替换成 `ANSI.blue` 或 `bold + dim`。
- **101 个 catalog 条目都已对照 PiAPI 文档校验**。每条带 `// docs:` 链接 + `verified: true`。新增模型必须先验证文档才能加。
- **Skip PiAPI 文档标"deprecated"或"service stopped"的接口**（如 Suno）。
- **对话中文，代码/commit/PR/注释英文**。

## 架构关键

- **两套 API surface 由 `apiType` 字段区分**（`src/models/catalog.ts`）：
  - `unified`（默认）→ POST `/api/v1/task`，X-API-Key，`{code,message,data}` envelope，异步任务生命周期
  - `openai-completions` → POST `/v1/chat/completions`，Bearer 认证，无 envelope，同步
  - `openai-images` → POST `/v1/images/generations`，同上
- **Dispatch 在 `src/commands/run.ts`**：`runUnified` / `runOpenAIChat` / `runOpenAIImage`，按 `apiType` + `streamingOnly` 分流。`--stream` 也走 chat stream 分支。
- **Trie 命令注册**（`src/registry.ts`），子命令自动 fall-through。新增命令在 `src/main.ts` 用 `registry.register('group sub', cmd)`。
- **Catalog 是数据，不是 switch case**。每条目通过 `asyncOnly` / `streamingOnly` / `apiType` 标记声明行为。新增模型只动 `MODELS[]`，不动 dispatch。
- **输入操作符（httpie 风格）**：`key=value` 启发式转型 / `key==value` 强制字符串 / `key:=json` 严格 JSON。裸参数（无 `=`）直接报错。`src/models/input-parser.ts`
- **Flag 解析是严格的**：未知 flag 报错 + did-you-mean（`src/suggest.ts`）。main.ts 的 preflight pass 用 `{strict: false}`，因为 command-specific flags 在 resolve 前未知——别把它改成 strict。
- **终态任务渲染统一走 `src/output/task-result.ts`**（`run` 同步路径和 `task wait` 共用）：JSON 模式先打 task body 再对 failed/cancelled 抛错（exit 3），`--download` 两种输出模式都生效。

## 目录结构

```
src/
├── auth/        # credentials, resolver, status
├── client/      # http.ts, endpoints.ts, unified.ts, openai-compat.ts, timeout.ts
├── command.ts   # defineCommand + GLOBAL_OPTIONS
├── commands/    # auth/ config/ quota/ model/ task/ run.ts
├── config/      # loader, schema, paths
├── errors/      # base.ts, api.ts, codes.ts, handler.ts
├── files/       # upload, download, resolve
├── models/      # catalog, schema, alias, input-parser
├── output/      # text/json formatters, progress, task-result, status-bar
├── polling/     # long-poll helpers
├── types/       # api, commands, flags
├── utils/
├── args.ts      # argument parsing
├── main.ts      # entry point
└── registry.ts  # trie command registry
```

## 代码约定

- TypeScript strict；**禁止显式 `any`**，真未知用 `unknown`；未用变量前缀 `_`
- ESM import，顺序 external → internal → relative
- 错误走 `src/errors/` 层级；CLI 退出场景用 `handleError`
- 退出码（`src/errors/codes.ts`）：`0` success · `1` usage · `2` auth · `3` API error · `4` not found · `5` timeout · `6` network · `7` internal

### 加一个命令

```typescript
import { defineCommand } from '../command';
import type { GlobalFlags } from '../types/flags';

export default defineCommand({
  name: 'resource sub',
  description: 'Does something',
  options: [{ flag: '--option <value>', description: 'An option', type: 'string' }],
  async execute(config, flags: GlobalFlags) { /* ... */ },
});
```

然后在 `src/main.ts` 里 `registry.register('resource sub', cmd)`。

### 调 API

```typescript
import { request } from '../client/http';
import { Endpoints } from '../client/endpoints';

const data = await request({ method: 'POST', path: Endpoints.CREATE_TASK, body: payload, apiKey, baseUrl });
```

### 解析 key

```typescript
import { resolveAPIKey } from '../auth/resolver';
const apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey;
```

### 常见任务

- 加命令 → `src/commands/<category>/<cmd>.ts` + 在 `src/main.ts` 注册
- 加模型 → 只动 `src/models/catalog.ts` 的 `MODELS[]`
- 加 endpoint → `src/client/endpoints.ts`

## 输出规则（TTY-aware）

- **stdout = 干净数据**（命令结果、JSON、URL）；**stderr = 日志/spinner/进度/错误/状态栏**
- 默认格式：`process.stdout.isTTY` → text；非 TTY（pipe/file）→ json。`--output text|json` 永远覆盖
- `--quiet` 抑制 spinner/进度；`--no-color` 关 ANSI（也尊重 `NO_COLOR` env）
- 状态栏 banner 只在 stderr 是 TTY 且非 JSON/auth/config 命令时显示

## 文件 I/O 约定

- `key=@./path.png` → 输入解析层自动上传到 PiAPI ephemeral storage，替换为 URL（需付费套餐）。`src/files/resolve.ts`
- `--download` → 走完结果，递归找 http(s) URL + `b64_json`，dedupe 后写到 `--out-dir`（默认 cwd）。`src/files/download.ts`
- `--dry-run` 时跳过上传，保留 `@path` 字面值

## 配置 + 错误

- 配置：CLI flag → `PIAPI_API_KEY` env → `~/.piapi/config.json` → 默认。优先级在 `src/auth/resolver.ts`
- `auth status` 等命令必须用已解析的 `config.apiKey`，**不要**重读文件（否则 `--api-key` 不生效）
- 配置解析失败时打 stderr 一次警告 + 降级 `{}`（不静默吞）：`src/config/loader.ts`
- 所有 fetch 走 `AbortSignal.timeout()`：API 30s / 上传下载 60s / 流式不超时。`PIAPI_TIMEOUT_MS` 覆盖。`src/client/timeout.ts`

## 发布前检查

1. `bun run typecheck && bun run lint && bun test && bun run build` 全绿
2. `./dist/piapi.mjs --version` 输出当前 `package.json` 版本（不是 `0.0.0-dev`）
3. `npm pack --dry-run` 只 4 文件：LICENSE / README.md / dist/piapi.mjs / package.json
4. tag `v*` 触发 `.github/workflows/release.yml` → npm publish 先跑，成功后才建 GH Release（需要 repo `NPM_TOKEN` secret）
5. 推 tag 后**必须**核 `npm view piapi-cli version`。workflow 绿 ≠ 发布成功，见「已知坑」

## 已知坑（修过的别再踩）

- **VERSION 不要硬编码**，必须 `process.env.CLI_VERSION ?? '0.0.0-dev'`，由 `build.ts` define 注入
- **`registry.printRoot` 不要硬编码 flag 列表**，从 `GLOBAL_OPTIONS` 迭代渲染
- **`models/schema.ts` 只覆盖 7/101 条目**，`model schema <X>` 错误消息要区分"unknown model"和"no schema defined"
- **流式 chat 的 `usage` 可能是 `{}`**，必须 `typeof usage?.total_tokens === 'number'` 才打印
- **`status-bar.ts` 模块级 `printed` 是设计意图**（一次启动只打一次 banner），别"修复"
- **npm publish 失败时，`E404` 和 `E403` 是两回事**（v0.3.0 踩过）。对已存在的包 PUT：
  - `E404 Not Found` = 认证**没通过**（token 失效/过期）。npm 故意不回 401，避免暴露包是否存在
  - `E403 Forbidden` = 认证通过但**无写权限**（token 是 read-only 或 scope 没覆盖本包）
  - 一锤定音的判定：`npm whoami` 通 → 排除过期；`npm access get status piapi-cli` 通 → 排除权限。两条都通还发不了才去查别的
- **npm granular token 默认 30 天过期**。`NPM_TOKEN` secret 建于 2026-06-10，2026-07-10 发 v0.3.0 时正好失效。签发时把有效期拉长，并在 `gh secret list` 里核对创建日期
- **发布成功以 registry 为准，不看 workflow 是否绿**。`npm publish` 打印 `+ pkg@x.y.z` 也不算数——从 registry 全新装一遍、跑 `--version`、比对 `npm view <pkg>@<v> dist.shasum` 与本地 `npm pack` 的 shasum 才算验完
