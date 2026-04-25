import type { AccountInfo } from '../types/api';
import { ANSI, colorEnabled } from './color';

const BAR_WIDTH = 24;

function usageColors(usedPct: number): [string, string] {
  if (usedPct < 50)  return [ANSI.green,  ANSI.bgGreen];
  if (usedPct <= 80) return [ANSI.yellow, ANSI.bgYellow];
  return [ANSI.red, ANSI.bgRed];
}

// Strip ANSI for layout math.
function displayWidth(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function renderBar(usedPct: number, useColor: boolean): string {
  const ratio = Math.max(0, Math.min(100, usedPct)) / 100;
  const filled = Math.round(BAR_WIDTH * ratio);
  const empty = BAR_WIDTH - filled;
  const pctStr = `${usedPct}%`.padStart(4);
  if (!useColor) {
    return `[${'█'.repeat(filled)}${'.'.repeat(empty)}] ${pctStr}`;
  }
  const [fg, bg] = usageColors(usedPct);
  return `${bg}${' '.repeat(filled)}${ANSI.reset}${ANSI.bgEmpty}${' '.repeat(empty)}${ANSI.reset} ${fg}${ANSI.bold}${pctStr}${ANSI.reset}`;
}

function boxLine(width: number, l: string, fill: string, r: string, useColor: boolean): string {
  return useColor ? `${ANSI.dim}${l}${fill.repeat(width)}${r}${ANSI.reset}` : `+${'-'.repeat(width)}+`;
}

function boxRow(content: string, innerW: number, visLen: number, useColor: boolean): string {
  const pad = Math.max(0, innerW - 2 - visLen);
  return useColor
    ? `${ANSI.dim}│${ANSI.reset} ${content}${' '.repeat(pad)} ${ANSI.dim}│${ANSI.reset}`
    : `| ${content}${' '.repeat(pad)} |`;
}

export function renderQuotaPanel(info: AccountInfo): void {
  const useColor = colorEnabled(process.stdout);
  const cp = info.credit_pack_info;
  // Use stdout for the panel itself (it's primary output), not stderr.
  const out = process.stdout;

  if (!cp) {
    out.write(`\nAccount: ${info.name ?? `#${info.id}`}\n`);
    if (info.plan) out.write(`Plan: ${info.plan}\n`);
    out.write('No credit pack info available.\n\n');
    return;
  }

  const used = cp.used_credits;
  const available = cp.available_credits;
  const total = cp.total_credits ?? (used + available);
  const usedPct = total > 0 ? Math.round((used / total) * 100) : 0;

  const acctName = info.name ?? `#${info.id}`;
  const planText = info.plan ? `Plan: ${info.plan}` : '';

  // Layout: name + 2sp + usage + 2sp + bar.
  // Width is data-driven: clamp each column to a min, but expand to fit content
  // so a long account name or large credit number can't overflow the right
  // border. boxRow needs W >= visLen + 2 to keep the border aligned.
  const usageFrac = `${used.toLocaleString()} / ${total.toLocaleString()}`;
  const nameContent = `credits  ${acctName}`;
  const nameWidth  = Math.max(20, nameContent.length);
  const usageWidth = Math.max(18, usageFrac.length);
  const barVisLen  = useColor ? BAR_WIDTH + 5 : BAR_WIDTH + 7;
  const dataLineLen = nameWidth + 2 + usageWidth + 2 + barVisLen;
  const headerLen   = 'PIAPI  Account Quota'.length + 2 + planText.length;
  const W = Math.max(70, dataLineLen + 2, headerLen + 2);

  const headerGap = Math.max(2, W - 2 - 'PIAPI  Account Quota'.length - planText.length);
  const headerContent = useColor
    ? `${ANSI.bold}${ANSI.blue}PIAPI${ANSI.reset}  ${ANSI.dim}Account Quota${ANSI.reset}` +
      `${' '.repeat(headerGap)}${ANSI.dim}${planText}${ANSI.reset}`
    : `PIAPI  Account Quota${' '.repeat(headerGap)}${planText}`;
  const headerVisLen = 'PIAPI  Account Quota'.length + headerGap + planText.length;

  out.write('\n');
  out.write(boxLine(W, '╭', '─', '╮', useColor) + '\n');
  out.write(boxRow(headerContent, W, headerVisLen, useColor) + '\n');
  out.write(boxLine(W, '├', '─', '┤', useColor) + '\n');

  // Row 1: name + usage fraction + bar
  const nameStr = nameContent.padEnd(nameWidth);
  const usageStr = usageFrac.padStart(usageWidth);
  const bar = renderBar(usedPct, useColor);
  const line1 = useColor
    ? `${ANSI.bold}${nameStr}${ANSI.reset}  ${usageColors(usedPct)[0]}${usageStr}${ANSI.reset}  ${bar}`
    : `${nameStr}  ${usageStr}  ${bar}`;
  const line1Vis = displayWidth(nameStr) + 2 + displayWidth(usageStr) + 2 + displayWidth(bar);
  out.write(boxRow(line1, W, line1Vis, useColor) + '\n');

  // Row 2: subline (Available · USD)
  const subLeft = `└ Available ${available.toLocaleString()}`;
  const subRight = info.equivalent_in_usd !== undefined
    ? `≈ $${info.equivalent_in_usd.toFixed(2)} USD`
    : '';
  const subGap = Math.max(2, (W - 2) - 2 - subLeft.length - subRight.length);
  const subVis = 2 + subLeft.length + subGap + subRight.length;
  const sub = useColor
    ? `  ${ANSI.dim}${subLeft}${' '.repeat(subGap)}${subRight}${ANSI.reset}`
    : `  ${subLeft}${' '.repeat(subGap)}${subRight}`;
  out.write(boxRow(sub, W, subVis, useColor) + '\n');

  out.write(boxLine(W, '╰', '─', '╯', useColor) + '\n');
  out.write('\n');
}
