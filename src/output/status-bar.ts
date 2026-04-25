import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { CONFIG_FILE } from '../config/paths';
import { ANSI, colorEnabled } from './color';

let printed = false;

export function resetStatusBar(): void {
  printed = false;
}

function tildePath(p: string): string {
  return p.startsWith(homedir()) ? p.replace(homedir(), '~') : p;
}

function maskToken(token: string): string {
  if (token.length <= 8) return '•'.repeat(Math.max(0, token.length - 2)) + token.slice(-2);
  return token.slice(0, 4) + '…' + token.slice(-4);
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

  if (!useColor) {
    const parts = [
      `PIAPI ${filePath}`,
      `Base: ${info.baseUrl}`,
      `Key: ${masked} (${info.keySource})`,
    ];
    if (info.model) parts.push(`Model: ${info.model}`);
    process.stderr.write(parts.join(' | ') + '\n');
    return;
  }

  // Single brand accent (blue) for values; bold for the masked key so it draws
  // the eye without using off-brand pink/cyan.
  const { reset, bold, dim, blue } = ANSI;
  const modelStr = info.model ? ` ${dim}|${reset} ${dim}Model:${reset} ${blue}${info.model}${reset}` : '';

  process.stderr.write(
    `${bold}${blue}PIAPI${reset} ` +
    `${dim}${filePath}${reset} ` +
    `${dim}|${reset} ` +
    `${dim}Base:${reset} ${blue}${info.baseUrl}${reset} ` +
    `${dim}|${reset} ` +
    `${dim}Key:${reset} ${bold}${masked}${reset} ${dim}(${info.keySource})${reset}` +
    `${modelStr}\n`,
  );
}
