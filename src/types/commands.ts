import type { GlobalFlags } from './flags';

export interface CLIConfig {
  apiKey?: string;
  baseUrl: string;
  quiet?: boolean;
  output?: 'json' | 'text';
  nonInteractive?: boolean;
  dryRun?: boolean;
}

export interface CommandSpec {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  options?: import('./flags').FlagOption[];
  execute(config: CLIConfig, flags: GlobalFlags): Promise<void>;
}
