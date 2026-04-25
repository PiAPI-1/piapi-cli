import { defineCommand } from '../../command';
import { resolveAPIKey } from '../../auth/resolver';
import { request } from '../../client/http';
import { Endpoints } from '../../client/endpoints';
import type { GlobalFlags } from '../../types/flags';
import { getFormatter } from '../../output/formatter';
import { formatJSON } from '../../output/json';
import { formatTable } from '../../output/text';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

// PiAPI's /account/active_tasks returns counts per provider, not a task array.
// Shape: { [provider]: { staged_count, pending_count, processing_count, active_tasks } }
type ProviderCounts = {
  staged_count: number;
  pending_count: number;
  processing_count: number;
  active_tasks: unknown;
};
type ActiveTasks = Record<string, ProviderCounts>;

export default defineCommand({
  name: 'task list',
  description: 'Show active task counts per provider',
  usage: 'piapi task list',
  async execute(config, flags: GlobalFlags) {
    const apiKey = resolveAPIKey(flags.apiKey) ?? config.apiKey;
    if (!apiKey) throw new CLIError('No API key. Run: piapi auth login --api-key sk-...', ExitCode.AUTH);

    const baseUrl = flags.baseUrl ?? config.baseUrl ?? 'https://api.piapi.ai';
    const data = await request<ActiveTasks>({ path: Endpoints.TASK_LIST, apiKey, baseUrl });

    const formatter = getFormatter(flags);
    if (formatter === 'json') {
      process.stdout.write(formatJSON(data) + '\n');
      return;
    }

    const active = Object.entries(data ?? {}).filter(([, c]) =>
      c && (c.staged_count + c.pending_count + c.processing_count) > 0,
    );

    if (active.length === 0) {
      process.stdout.write('No active tasks.\n');
      return;
    }

    const rows = active.map(([provider, c]) => ({
      provider,
      staged: c.staged_count,
      pending: c.pending_count,
      processing: c.processing_count,
    }));
    process.stdout.write(formatTable(rows) + '\n');
  },
});
