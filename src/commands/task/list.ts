import { defineCommand } from '../../command';
import { resolveAPIKey } from '../../auth/resolver';
import { request } from '../../client/http';
import { Endpoints } from '../../client/endpoints';
import type { GlobalFlags } from '../../types/flags';
import { getFormatter } from '../../output/formatter';
import { formatJSON } from '../../output/json';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

export default defineCommand({
  name: 'task list',
  description: 'List your recent tasks',
  usage: 'piapi task list [--status running|completed|failed] [--limit N]',
  options: [
    { flag: '--status <status>', description: 'Filter by status', type: 'string' },
    { flag: '--limit <n>', description: 'Max results', type: 'number' },
  ],
  async execute(config, flags: GlobalFlags) {
    const apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey;
    if (!apiKey) throw new CLIError('No API key. Run: piapi auth login --api-key sk-...', ExitCode.AUTH);

    const baseUrl = flags.baseUrl ?? config.baseUrl ?? 'https://api.piapi.ai';

    const params = new URLSearchParams();
    if (flags.status) params.set('status', flags.status);
    if (flags.limit) params.set('limit', String(flags.limit));

    const path = `${Endpoints.TASK_LIST}${params.size ? `?${params}` : ''}`;
    const data = await request<{ tasks: unknown[] }>({
      path, apiKey, baseUrl,
    });

    const formatter = getFormatter(flags);
    if (formatter === 'json') {
      process.stdout.write(formatJSON(data.tasks) + '\n');
    } else {
      if (!data.tasks || data.tasks.length === 0) {
        process.stdout.write('No tasks found.\n');
      } else {
        for (const task of data.tasks as { task_id: string; status: string; task_type: string }[]) {
          process.stdout.write(`${task.task_id}  ${task.status}  ${task.task_type}\n`);
        }
      }
    }
  },
});
