import { homedir } from 'node:os';

export function tildePath(p: string): string {
  return p.startsWith(homedir()) ? p.replace(homedir(), '~') : p;
}

export function maskToken(token: string): string {
  if (token.length <= 8) return '•'.repeat(Math.max(0, token.length - 2)) + token.slice(-2);
  return token.slice(0, 4) + '…' + token.slice(-4);
}
