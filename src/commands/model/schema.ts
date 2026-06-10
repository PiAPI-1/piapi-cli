import { defineCommand } from '../../command';
import { getModelSchema } from '../../models/schema';
import { getModel, unknownModelError } from '../../models/catalog';
import type { GlobalFlags } from '../../types/flags';
import { formatJSON } from '../../output/json';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

export default defineCommand({
  name: 'model schema',
  description: 'Show the input schema for a model',
  usage: 'piapi model schema <model>',
  async execute(_config, flags: GlobalFlags) {
    const modelName = flags._positional?.[0];
    if (!modelName) throw new CLIError('Usage: piapi model schema <model>', ExitCode.USAGE);

    if (!getModel(modelName)) {
      const { message, hint } = unknownModelError(modelName);
      throw new CLIError(message, ExitCode.USAGE, hint);
    }

    const schema = getModelSchema(modelName);
    if (!schema) {
      throw new CLIError(
        `No schema defined for "${modelName}". See PiAPI docs for supported inputs, or run with --dry-run to inspect the request body.`,
        ExitCode.USAGE,
      );
    }

    process.stdout.write(formatJSON(schema) + '\n');
  },
});
