import { existsSync } from 'node:fs';
import { CONFIG_FILE } from '../config/paths';
import { DEFAULT_BASE_URL } from '../config/schema';
import { ANSI, colorEnabled } from './color';
import { maskToken, tildePath } from './format-helpers';

let printed = false;

export function resetStatusBar(): void {
  printed = false;
}

export interface StatusBarInfo {
  apiKey?: string;
  keySource: 'flag' | 'env' | 'file' | 'none';
  baseUrl: string;
  quiet?: boolean;
  model?: string;
}

export function maybeShowStatusBar(info: StatusBarInfo): void {
  if (info.quiet || printed || !process.stderr.isTTY) return;
  if (!info.apiKey) return;
  printed = true;

  const useColor = colorEnabled(process.stderr);
  const filePath = existsSync(CONFIG_FILE) ? tildePath(CONFIG_FILE) : '(no config file)';
  const masked   = maskToken(info.apiKey);
  // Default values are noise — only show Base/(file) when meaningfully overridden.
  const showBase   = info.baseUrl !== DEFAULT_BASE_URL;
  const showSource = info.keySource !== 'file';

  if (!useColor) {
    const parts = [`PIAPI ${filePath}`];
    if (showBase)   parts.push(`Base: ${info.baseUrl}`);
    parts.push(showSource ? `Key: ${masked} (${info.keySource})` : `Key: ${masked}`);
    if (info.model) parts.push(`Model: ${info.model}`);
    process.stderr.write(parts.join(' | ') + '\n');
    return;
  }

  const { reset, bold, dim, blue } = ANSI;
  const sep      = `${dim}|${reset}`;
  const baseStr  = showBase   ? ` ${sep} ${dim}Base:${reset} ${blue}${info.baseUrl}${reset}` : '';
  const sourceStr = showSource ? ` ${dim}(${info.keySource})${reset}` : '';
  const modelStr  = info.model ? ` ${sep} ${dim}Model:${reset} ${blue}${info.model}${reset}` : '';

  process.stderr.write(
    `${bold}${blue}PIAPI${reset} ` +
    `${dim}${filePath}${reset}` +
    `${baseStr}` +
    ` ${sep} ` +
    `${dim}Key:${reset} ${bold}${masked}${reset}${sourceStr}` +
    `${modelStr}\n`,
  );
}
