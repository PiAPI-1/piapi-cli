import { defineCommand } from '../../command';
import type { GlobalFlags } from '../../types/flags';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';

// PiAPI has no unified cancel endpoint. Only Kling and Midjourney expose
// per-provider cancel APIs (see docs/llms.txt). v1 surfaces a clear error
// rather than dispatching, since correct routing requires fetching the task
// to learn its model first. Per-provider cancel is on the v1.x roadmap.
export default defineCommand({
  name: 'task cancel',
  description: 'Cancel a task (v1: not implemented — see hint)',
  usage: 'piapi task cancel <id>',
  async execute(_config, flags: GlobalFlags) {
    const taskId = flags._positional?.[0];
    if (!taskId) throw new CLIError('Usage: piapi task cancel <id>', ExitCode.USAGE);

    throw new CLIError(
      `Task cancellation is not implemented in v1.`,
      ExitCode.USAGE,
      `PiAPI cancel is provider-specific (Kling/Midjourney only). Cancel via the PiAPI dashboard for now.`,
    );
  },
});
