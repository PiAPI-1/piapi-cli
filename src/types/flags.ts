export interface GlobalFlags {
  apiKey?: string;
  baseUrl?: string;
  output?: 'json' | 'text';
  quiet?: boolean;
  noColor?: boolean;
  nonInteractive?: boolean;
  async?: boolean;
  dryRun?: boolean;
  webhook?: string;
  outDir?: string;
  download?: boolean;
  help?: boolean;
  version?: boolean;
  // command-specific
  status?: string;
  limit?: number;
  type?: string;
  key?: string;
  value?: string;
  _positional?: string[];
}

export interface FlagOption {
  flag: string;
  description: string;
  type?: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
}
