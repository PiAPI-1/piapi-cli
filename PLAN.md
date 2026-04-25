# piapi-cli — Plan

PiAPI 官方 CLI。让用户填一个 API key 就能在终端调用 piapi 聚合的 80+ 顶级多模态模型（image / video / audio / 3D / LLM）。

> 本文档沉淀 v1 设计的核心决策与依据。下次 session 接手或团队成员加入时先读这一份。

## 1. 定位

**核心受众**：填 PiAPI API key 就想立刻用上 Sora2 / Veo3 / Kling / Flux / Midjourney / Nano Banana / Seedream / Suno / Trellis 等顶级模型的用户。

**双重用户**：
1. **人**：在 terminal 里调模型、跑批量、管任务
2. **AI agent**：通过 skill 协议被 Claude Code / Cursor / OpenClaw 调用（`npx skills add piapi-ai/cli`）

**非目标**：
- ❌ Agentic / chat 模式（不做 LLM 路由选模型）
- ❌ 取代已有的 PiAPI MCP server（CLI 是 one-shot 工具，MCP 是 always-on）
- ❌ 取代 SDK（dev 集成走 SDK，CLI 是 prototype / 横评 / 运维场景）

## 2. 技术栈与分发

| | 选择 | 理由 |
|---|---|---|
| 语言 | TypeScript (strict) | API SDK 类项目生态成熟；agent skill 生态在 npm 圈 |
| Runtime | Node.js >= 18 | npm 用户最熟 |
| Build | Bun (`bun build` → 单 `dist/piapi.mjs`) | 启动快、bundle 小，对标 mmx-cli |
| 分发 | `npm install -g piapi-cli` + `npx skills add piapi-ai/cli` | 主流 + agent 友好双通道 |
| 运行时依赖 | **只有 `@clack/prompts`** | 极简，零负担 |
| Dev 依赖 | `zod` / `typescript` / `eslint` / `@types/bun` | |
| Binary 名 | `piapi` | 对标 `mmx` |
| Package 名 | `piapi-cli` (npm) | 对标 `mmx-cli` |
| 配置目录 | `~/.piapi/` (`config.json` + 后续 `credentials.json` for OAuth) | 对标 `~/.mmx/` |
| Env 变量 | `PIAPI_API_KEY` / `PIAPI_BASE_URL` | |

**关键非选择**：
- ❌ Go — 团队 TS 更熟 + skill 生态在 npm
- ❌ Cobra/Bubble Tea/Ink — 命令式 CLI 不需要 TUI 框架
- ❌ commander/yargs — 自写 args parser 144 行够用（mmx 验证）

## 3. 命令设计（核心决策）

### 3.1 命令哲学：按"资源"组织，不按"媒介"

```
✅ piapi run / task / model / file / quota / auth / config / webhook
❌ piapi image / video / audio / 3d / llm
```

**理由**：piapi 80+ 模型，按媒介每个 domain 都几十个模型，命令树会爆炸。按资源组织（task 是一等公民），命令数永远收敛。来自 Replicate CLI 的核心启发。

### 3.2 input 风格：`key=value` + `@file`

```bash
piapi run flux-dev prompt="a corgi" aspect_ratio=16:9 num_outputs=4
piapi run kling-3 prompt="..." image=@./input.png
piapi run sora2-pro prompt="..." --async
```

**理由**：
- 不同模型 input schema 不同，`--flag` 不可能覆盖所有模型
- `key=value` 直接把 piapi unified-api-schema 透传给用户
- `@local-path` CLI 自动调 File Upload API 上传后替换为 URL（用户体验质变）
- URL 也兼容（`image=https://...`）

### 3.3 `piapi run <model>` 是 sugar，不是 alias 群

✅ `piapi run sora2 prompt="..."`
❌ `piapi sora2 prompt="..."`（不做明星模型 alias）

**理由**：
- `--model name` 和顶层 subcommand 命名空间会冲突
- 新模型上线要写代码加 alias，违反"统一抽象"原则
- 用户多打 4 个字符（`run `）换永远不会过时的命令树

### 3.4 v1 不做的特性

- ❌ **scaffold**（把 task 转成项目代码）— 工作量大，v1 优先级低
- ❌ **agentic 模式**（LLM 路由选模型）— 错位竞争，piapi 的 USP 是 unified gateway 不是 agent
- ❌ **明星模型 alias** — 见 3.3
- ❌ **TUI 模式** — 命令式 CLI 不需要

### 3.5 完整命令清单

**P0 — MVP**

```bash
# Auth & config
piapi auth login --api-key sk-xxx     # OAuth 留 P2
piapi auth status / logout
piapi config show / set --key X --value Y
piapi quota                            # account_name + remaining credits

# 核心调用
piapi run <model> key=value... [--async] [--out-dir ./] [--download] [--webhook <url>]

# Task 资源管理
piapi task list [--status running|completed|failed] [--limit N]
piapi task get <id>
piapi task cancel <id>

# Model 发现
piapi model list [--type image|video|audio|3d|llm]
piapi model schema <model>
```

**全局 flag（agent 一等公民）**

```
--non-interactive   缺参不交互，直接 fail
--quiet             抑制 spinner / progress，stdout 纯数据
--output json|text  输出格式
--async             返回 task id 即退出（不等结果）
--dry-run           只 preview API request 不执行
--api-key sk-xxx    覆盖 config / env
--base-url <url>    覆盖默认 base url
--webhook <url>     PiAPI unified webhook 回调地址
```

**P1 — 体验与差异化**

```bash
piapi file upload <path>                          # 显式上传
piapi task watch [<id>]                           # 多任务实时进度面板
piapi compare <m1> <m2> ... key=value             # 同 prompt 多模型横评（差异化杀招）
piapi model search <query>
piapi update                                       # self-update check
# Pipe chain：piapi run X ... | piapi run Y image={{.output.images[0].url}}
```

**P2 — 后续**

- `piapi webhook serve --port 3000 --forward-to localhost:3000/hook`（简化 Stripe listen 模式，不需要后端 WS 通道）
- `piapi bulk run pipeline.yaml`（包装 piapi bulk service）
- shell completion (bash / zsh / fish)
- OAuth 登录流（参考 mmx）

## 4. 模块切分

```
piapi-cli/
├── src/
│   ├── main.ts                   # entry
│   ├── args.ts                   # 自写 arg parser
│   ├── command.ts                # CommandSpec 接口
│   ├── registry.ts               # 集中注册
│   ├── auth/
│   │   ├── credentials.ts        # ~/.piapi/config.json
│   │   ├── resolver.ts           # 优先级：--api-key > env > config
│   │   └── status.ts
│   ├── client/
│   │   ├── http.ts               # 统一 HTTP，X-API-Key
│   │   ├── endpoints.ts          # endpoint 常量
│   │   ├── unified.ts            # ★ unified-api-schema 调用器
│   │   └── stream.ts             # LLM 流式（P1）
│   ├── polling/
│   │   └── poll.ts               # exponential backoff
│   ├── models/
│   │   ├── catalog.ts            # type → [models] 索引
│   │   ├── schema.ts             # 基于 unified schema fetch
│   │   ├── input-parser.ts       # ★ key=value + @file
│   │   └── alias.ts              # model name → task_type 映射
│   ├── files/
│   │   ├── upload.ts             # File Upload API
│   │   ├── download.ts           # 任务完成自动下载
│   │   └── resolve.ts            # @local-path → upload → URL
│   ├── output/
│   │   ├── formatter.ts          # text/json router
│   │   ├── text.ts / json.ts
│   │   ├── progress.ts           # spinner（@clack/prompts）
│   │   └── compare-grid.ts       # 横评网格（P1）
│   ├── commands/
│   │   ├── auth/{login,logout,status}.ts
│   │   ├── config/{show,set}.ts
│   │   ├── quota/show.ts
│   │   ├── run.ts                # ★ 核心
│   │   ├── compare.ts            # P1
│   │   ├── task/{list,get,cancel,watch}.ts
│   │   ├── model/{list,schema,search}.ts
│   │   ├── file/upload.ts
│   │   ├── update.ts
│   │   └── help.ts
│   ├── config/
│   │   ├── schema.ts             # zod
│   │   ├── loader.ts             # ~/.piapi/config.json
│   │   └── paths.ts
│   ├── errors/{base,api,codes,handler}.ts
│   ├── pipe/
│   │   ├── template.ts           # {{.output.x}} 解析（P1）
│   │   └── chain.ts              # stdin JSON 注入（P1）
│   ├── types/{api,flags,commands}.ts
│   └── utils/{fs,env,prompt,token,schema}.ts
├── skill/SKILL.md                # Claude Code/Cursor 用
├── AGENTS.md                     # 给写代码的 agent
├── README.md / README_CN.md
├── package.json / build.ts / tsconfig.json
└── test/
```

## 5. 对标参考

调研过的 4 个 CLI（评估时各自的命名、源码可在以下 GitHub repo 查阅）：

| Repo | 价值 | 主要参考点 |
|---|---|---|
| [`MiniMax-AI/cli`](https://github.com/MiniMax-AI/cli) | ⭐⭐⭐⭐ | 架构分层 / agent flags / skill 协议 / @clack/prompts UX / build & 分发链路 |
| [`replicate/cli`](https://github.com/replicate/cli) | ⭐⭐⭐⭐⭐ | 命令树（资源式）/ key=value input / model schema / pipe chain |
| [`fal-ai/fal`](https://github.com/fal-ai/fal) | ⭐ | 不参考（是 deployment tool，不是 API CLI） |
| [`stripe/stripe-cli`](https://github.com/stripe/stripe-cli) | ⭐⭐⭐ | webhook listen / forward-to 模式（v1 简化版） |

**piapi 相对所有对标的差异化**：
- 80+ 模型聚合 → 必须靠 unified API + key=value 透传 schema（自家模型厂的 CLI 无此压力）
- 跨模型 pipeline（image→video→audio）是天然场景
- 计费/cost 透明度（各 provider 价格不同）
- HYA / Bulk Generation / Webhook 是 piapi 独有

## 6. PiAPI 服务端契约（CLI 依赖的核心 API）

| 用途 | Endpoint | 备注 |
|---|---|---|
| 创建任务 | unified create-task | 所有模型走同一个 endpoint，body 按 task_type 变 |
| 查询任务 | unified get-task | |
| 任务列表 | task-list-api | piapi 独有 |
| 取消任务 | 各 endpoint cancel-task | |
| 账户信息 | account-info-api | quota 命令依赖 |
| 历史 | user-history-query | 长期 task list |
| 文件上传 | file-upload | 用于 @local-path 自动 upload |

**docs 入口**：`docs/llms.txt`（200 行，全部 endpoint 索引）。CLI 实现时按需查 piapi.ai/docs。

## 7. 实施工单（按顺序，不要跳序）

骨架已就位（package.json / tsconfig / build.ts / eslint / .gitignore / .npmignore）。从工单 #1 开始填 `src/`。每完成一个工单跑一次 `bun run typecheck` 防止断链。

| # | 模块 | 主要文件 | 完成标准 |
|---|---|---|---|
| 1 | 核心架构 | `src/main.ts`、`src/args.ts`、`src/command.ts`、`src/registry.ts`、`src/types/{commands,flags,api}.ts` | typecheck pass；`bun run dev --version` 打印版本号 |
| 2 | errors 体系 | `src/errors/{base,api,codes,handler}.ts` | 自定义错误类层级 + PiAPI 错误码映射 |
| 3 | config | `src/config/{schema,loader,paths}.ts` | zod schema；`~/.piapi/config.json` 原子读写 |
| 4 | auth | `src/auth/{credentials,resolver,status}.ts` + `src/commands/auth/{login,logout,status}.ts` | `piapi auth login/status/logout` 跑通 |
| 5 | HTTP client | `src/client/{http,endpoints,unified}.ts` | fetch wrapper；`X-API-Key` header；统一错误抛出 |
| 6 | output | `src/output/{formatter,text,json,progress}.ts` | `--output json` 走 stdout；`--quiet` 抑制 spinner |
| 7 | quota / config 命令（**Milestone 1：first end-to-end**） | `src/commands/quota/show.ts`、`src/commands/config/{show,set}.ts` | `piapi quota` 真实拉到 account info |
| 8 | models 模块 | `src/models/{catalog,alias,schema}.ts` | 静态 catalog 覆盖 v1 模型清单（见下） |
| 9 | model 命令 | `src/commands/model/{list,schema}.ts` | `piapi model list [--type X]` / `piapi model schema flux-dev` |
| 10 | input-parser | `src/models/input-parser.ts` | `key=value` + `@local-path` 解析；类型推导（数字/布尔/字符串） |
| 11 | files | `src/files/{upload,download,resolve}.ts` | File Upload API；任务完成自动 download；`@path` → URL |
| 12 | polling | `src/polling/poll.ts` | exponential backoff（1s → 30s 上限）；超时控制；`--quiet` 兼容 |
| 13 | run 命令（**Milestone 2：核心闭环**） | `src/commands/run.ts` | `piapi run flux-dev prompt="..."` 同步出图；`--async` 返回 task id；`--dry-run` 只打 request body |
| 14 | task 命令 | `src/commands/task/{list,get,cancel}.ts` | 三个命令全通 |
| 15 | help | `src/commands/help.ts` | `piapi help` / `piapi <cmd> --help` 自动从 registry 生成 |
| 16 | 文档 | `skill/SKILL.md`、`AGENTS.md`、`README.md`、`README_CN.md` | SKILL.md 对齐 mmx 的 frontmatter 格式 |
| 17 | build & 冒烟 | `dist/piapi.mjs` | typecheck/lint/build 全 pass；下方验收命令全通过 |

### v1 模型 catalog（实际已发布，89 entries，分两条 API 通路）

`piapi model list` 是单一可信源。下面只列出分类规模和典型代表名。每条目都
带 `// docs:` 注释 + `verified: true`。

**Unified task API**（`POST /api/v1/task`，X-API-Key，async lifecycle）：

- **image**（28）: flux 全家（dev / schnell / dev-advanced / img2img / kontext /
  inpaint / outpaint / redux）, midjourney + 9 个子动作（mj-upscale /
  mj-variation / mj-reroll / mj-describe / mj-seed / mj-blend / mj-inpaint /
  mj-outpaint / mj-pan）, gemini 系（nano-banana-pro / nano-banana-2 /
  gemini-2.5-flash-image）, qwen-image / qwen-image-edit, z-image,
  seedream-5-lite, image tools（remove-bg / upscale / segment / joycaption）
- **video**（35，all async）: sora2 系（sora2 / sora2-pro / sora2-watermark）,
  veo3 系（veo3 / veo3-fast / veo3.1 / veo3.1-fast）, kling 系（kling-3 /
  kling-3-omni / kling-o1 / kling-tryon / kling-effects / kling-sound /
  kling-avatar / kling-motion / kling-turbo / kling-elements）, hailuo,
  skyreels, framepack, hunyuan-video, luma, omni-human, ai-hug-video,
  wan 系（wan2.6 / wan2.6-img2vid / wanx-lora / wanx-lora-img2vid /
  wanx-keyframe / wanx-camera / wanx22 / wanx22-img2vid）, seedance 系
  （seedance-2 / seedance-2-preview / seedance-watermark）, video tools
  （video-upscale / video-remove-bg）
- **audio**（10）: udio 系（udio-music / udio-song-extend / udio-lyrics）,
  ace-step 系（ace-step / ace-step-audio2audio / ace-step-edit /
  ace-step-extend）, mmaudio, diffrhythm, f5-tts
- **3d**（2，async）: trellis / trellis2

**OpenAI-compatible API**（Bearer auth，sync，no envelope）：

- **image**（3）: `gpt-image-2` / `gpt-image-1.5` / `gpt-image-1` → `/v1/images/generations`
- **llm**（8）: `gpt-5` / `gpt-5.2` / `gpt-4o` / `gpt-4o-mini` / `gpt-4.1` /
  `claude-opus-4.6` / `claude-sonnet-4.6` / `gemini-2.5-flash` → `/v1/chat/completions`

每条目 `{ name, type, model, taskType?, provider, apiType?, asyncOnly?, defaultInput?, verified? }`。`apiType` 缺省 `'unified'`；`taskType` 仅 unified 路径需要。

**Round B（待办）**：
- `sora2-preview` / `sora2-hd-preview` 用 `/v1/chat/completions` + 强制 SSE
  streaming 模式；当前 `chatCompletion` 不支持 streaming 解析，加进来需要
  扩 OpenAI-compat client。
- Faceswap / 多媒体编辑系列若需 multipart 上传则属 Round B。

## 8. 验收标准（DoD）

工单 #17 完成时，下列命令全部必须 pass：

```bash
cd /home/tobias/projects/API/piapi-cli
bun install
bun run typecheck                                          # 0 errors
bun run lint                                               # 0 errors
bun run build                                              # 产出 dist/piapi.mjs

node dist/piapi.mjs --version                              # 打印 0.1.0
node dist/piapi.mjs help                                   # 命令树
node dist/piapi.mjs auth login --api-key sk-fake-test      # 写 ~/.piapi/config.json
node dist/piapi.mjs auth status                            # 显示 logged in
node dist/piapi.mjs config show                            # 显示 config
node dist/piapi.mjs model list                             # 静态 catalog
node dist/piapi.mjs model list --type video                # 过滤
node dist/piapi.mjs model schema flux-dev                  # 静态 schema
node dist/piapi.mjs run flux-dev prompt="test" --dry-run   # 打 request body 不发请求
node dist/piapi.mjs --output json help                     # JSON 输出
node dist/piapi.mjs auth logout                            # 清 config
```

实带真实 API key 的 live test 不在 MiniMax 范围（验收人手动跑）。
