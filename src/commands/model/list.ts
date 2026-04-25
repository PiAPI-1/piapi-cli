import { defineCommand } from '../../command';
import { MODELS, getModelsByType } from '../../models/catalog';
import type { ModelType } from '../../models/catalog';
import type { GlobalFlags } from '../../types/flags';
import { getFormatter } from '../../output/formatter';
import { formatJSON } from '../../output/json';

export default defineCommand({
  name: 'model list',
  description: 'List available models',
  usage: 'piapi model list [--type image|video|audio|3d|llm]',
  options: [
    { flag: '--type <type>', description: 'Filter by type: image, video, audio, 3d, llm', type: 'string' },
  ],
  async execute(_config, flags: GlobalFlags) {
    const typeFilter = flags.type as ModelType | undefined;
    const models = typeFilter ? getModelsByType(typeFilter) : MODELS;
    const formatter = getFormatter(flags);

    if (formatter === 'json') {
      process.stdout.write(formatJSON(models) + '\n');
      return;
    }

    if (models.length === 0) {
      process.stderr.write(
        `No models match --type ${typeFilter}. Valid types: image, video, audio, 3d, llm.\n`,
      );
      return;
    }

    const byType: Record<string, typeof models> = {};
    for (const m of models) {
      if (!byType[m.type]) byType[m.type] = [];
      byType[m.type].push(m);
    }
    for (const [type, list] of Object.entries(byType)) {
      process.stdout.write(`\n${type.toUpperCase()}:\n`);
      for (const m of list) {
        process.stdout.write(`  ${m.name.padEnd(25)} ${m.provider}${m.asyncOnly ? ' (async)' : ''}\n`);
      }
    }
  },
});
