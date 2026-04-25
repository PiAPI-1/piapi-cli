# AGENTS.md - Agent Coding Guidelines

This document provides guidelines for agents operating in this repository.

## Project Overview

- **Name**: piapi-cli
- **Type**: Node.js CLI tool (ESM, Bun-native)
- **Engine**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Runtime deps**: `@clack/prompts`, `zod`

## Commands

### Build, Lint, Test

```bash
bun run build        # Build → dist/piapi.mjs
bun run dev         # Run from source
bun run lint        # ESLint
bun run typecheck   # TypeScript
bun test            # Run tests
```

## Code Style

### TypeScript

- **Strict mode**: Always enabled
- **No explicit `any`**: Use `unknown` if type is truly unknown
- **Unused variables**: Prefix with `_`

### Imports

- ES modules (`import ... from '...'`)
- Order: external → internal → relative

### Error Handling

- Use custom error hierarchy: `src/errors/` (base.ts, api.ts, codes.ts, handler.ts)
- Always catch and handle errors appropriately
- Use `handleError` for CLI exit scenarios

### Output

- `--output json`: stdout is pure JSON
- `--quiet`: suppress spinners/progress
- All logs go to stderr; stdout is clean data

## Project Structure

```
src/
├── auth/           # Authentication (credentials, resolver, status)
├── client/        # HTTP client, endpoints, unified API
├── command.ts      # Command interface and GLOBAL_OPTIONS
├── commands/       # Command implementations (auth/, config/, quota/, model/, task/, run.ts)
├── config/        # Config loading, schema, paths
├── errors/        # Error handling (base, api, codes, handler)
├── files/         # File upload, download, resolve
├── models/        # Model catalog, schema, alias, input-parser
├── output/        # Output formatters (text, json, progress)
├── polling/       # Long-polling utilities
├── types/         # Type definitions (api, commands, flags)
├── args.ts        # Argument parsing
├── main.ts        # CLI entry point
└── registry.ts    # Command registry
```

## Key Patterns

### Defining a Command

```typescript
import { defineCommand } from '../command';
import type { GlobalFlags } from '../types/flags';

export default defineCommand({
  name: 'resource sub',
  description: 'Does something',
  options: [
    { flag: '--option <value>', description: 'An option', type: 'string' },
  ],
  async execute(config, flags: GlobalFlags) {
    // Implementation
  },
});
```

### API Calls

```typescript
import { request } from '../client/http';
import { Endpoints } from '../client/endpoints';

const data = await request({
  method: 'POST',
  path: Endpoints.CREATE_TASK,
  body: payload,
  apiKey,
  baseUrl,
});
```

### Auth Resolution

```typescript
import { resolveAPIKey } from '../auth/resolver';

const apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey;
if (!apiKey) { process.stderr.write('No API key.\n'); process.exit(1); }
```

## Common Tasks

- **Add a command**: Create `src/commands/<category>/<cmd>.ts`, register in `src/main.ts`
- **Add model**: Update `src/models/catalog.ts`
- **Add API endpoint**: Update `src/client/endpoints.ts`
