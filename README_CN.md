# PiAPI CLI

PiAPI 官方 CLI — 在终端或 AI Agent 中调用 80+ 多模态 AI 模型（图像、视频、音频、3D、LLM）。

## 安装

```bash
npm install -g piapi-cli
```

需要 [Node.js](https://nodejs.org) 18+。

## 快速开始

```bash
# 登录
piapi auth login --api-key sk-xxxxx

# 生成图片
piapi run flux-dev prompt="一只柯基在太空"

# 生成视频（异步）
piapi run sora2-pro prompt="海浪" --async

# 查看配额
piapi quota

# 查看模型列表
piapi model list
piapi model list --type video
```

## 命令

### piapi run \<model\> key=value...

使用 `key=value` 输入运行任意模型。视频和 3D 模型需要 `--async`。

```bash
piapi run flux-dev prompt="一只柯基" aspect_ratio=16:9 num_outputs=4
piapi run kling-3 prompt="日落" duration=5
piapi run sora2-pro prompt="海浪" --async
piapi run flux-dev prompt="测试" --dry-run
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

## 全局参数

| 参数 | 说明 |
|---|---|
| `--api-key <key>` | API 密钥（覆盖环境变量/配置文件） |
| `--base-url <url>` | API 基础 URL |
| `--output json` | JSON 格式输出到 stdout |
| `--quiet` | 抑制进度指示器 |
| `--non-interactive` | 缺少输入时直接失败 |
| `--async` | 立即返回任务 ID |
| `--dry-run` | 预览请求不执行 |
| `--webhook <url>` | 回调 Webhook URL |
| `--out-dir <path>` | 下载目录 |
| `--download` | 任务完成时自动下载 |

## 配置

配置文件位于 `~/.piapi/config.json`。

优先级：CLI 参数 > `PIAPI_API_KEY` 环境变量 > 配置文件 > 默认值。

## AI Agent 集成

适用于 Claude Code、Cursor 等 Agent：

```bash
npx skills add piapi-ai/cli
```

完整 Agent Skill 规范见 `skill/SKILL.md`。

## License

MIT
