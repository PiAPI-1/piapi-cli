import type { CommandSpec } from './types/commands';
import { CLIError } from './errors/base';
import { ExitCode } from './errors/codes';

interface CommandNode {
  command?: CommandSpec;
  children: Map<string, CommandNode>;
}

class Registry {
  private root: CommandNode = { children: new Map() };

  register(path: string, cmd: CommandSpec): void {
    const parts = path.split(' ');
    let node = this.root;
    for (const part of parts) {
      if (!node.children.has(part)) node.children.set(part, { children: new Map() });
      node = node.children.get(part)!;
    }
    node.command = cmd;
  }

  resolve(path: string[]): { command: CommandSpec; extra: string[] } {
    let node = this.root;
    const matched: string[] = [];

    for (const part of path) {
      const child = node.children.get(part);
      if (!child) break;
      node = child;
      matched.push(part);
    }

    if (node.command) return { command: node.command, extra: path.slice(matched.length) };

    if (matched.length > 0 && node.children.size === 1) {
      const [, child] = [...node.children.entries()][0]!;
      if (child.command) return { command: child.command, extra: path.slice(matched.length) };
    }

    if (matched.length > 0 && node.children.size > 0) {
      const subs = [...node.children.entries()]
        .map(([name, n]) => {
          if (n.command) return `  ${matched.join(' ')} ${name}    ${n.command.description}`;
          return `  ${matched.join(' ')} ${name} [${[...n.children.keys()].join(', ')}]`;
        })
        .join('\n');
      throw new CLIError(`Unknown command: piapi ${path.join(' ')}\n\nAvailable commands:\n${subs}`, ExitCode.USAGE);
    }

    throw new CLIError(`Unknown command: piapi ${path.join(' ')}`, ExitCode.USAGE);
  }

  printHelp(path: string[] = [], out: NodeJS.WriteStream = process.stderr): void {
    if (path.length === 0) { this.printRoot(out); return; }

    let node = this.root;
    for (const part of path) {
      const child = node.children.get(part);
      if (!child) { this.printRoot(out); return; }
      node = child;
    }

    if (node.command) { this.printCommand(node.command, out); return; }

    const prefix = path.join(' ');
    out.write(`\nUsage: piapi ${prefix} <command> [flags]\n\nCommands:\n`);
    this.printChildren(node, prefix, out);
    out.write('\n');
  }

  private bold   = (s: string, out: NodeJS.WriteStream) => out.isTTY ? `\x1b[1m${s}\x1b[0m` : s;
  private dim    = (s: string, out: NodeJS.WriteStream) => out.isTTY ? `\x1b[2m${s}\x1b[0m` : s;
  private accent = (s: string, out: NodeJS.WriteStream) => out.isTTY ? `\x1b[1;38;2;30;110;220m${s}\x1b[0m` : s;

  // 6-row pure-blue gradient: deep navy → bright blue (no purple, no cyan).
  private static readonly LOGO = [
    '██████╗ ██╗ █████╗ ██████╗ ██╗',
    '██╔══██╗██║██╔══██╗██╔══██╗██║',
    '██████╔╝██║███████║██████╔╝██║',
    '██╔═══╝ ██║██╔══██║██╔═══╝ ██║',
    '██║     ██║██║  ██║██║     ██║',
    '╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝',
  ];
  private static readonly GRADIENT: [number, number, number][] = [
    [  8,  30, 100],
    [ 16,  54, 130],
    [ 24,  78, 160],
    [ 32, 102, 190],
    [ 42, 126, 220],
    [ 50, 150, 250],
  ];

  private printRoot(out: NodeJS.WriteStream): void {
    out.write('\n');
    for (let i = 0; i < Registry.LOGO.length; i++) {
      const line = Registry.LOGO[i]!;
      if (out.isTTY) {
        const [r, g, b] = Registry.GRADIENT[i]!;
        out.write(`\x1b[1;38;2;${r};${g};${b}m${line}\x1b[0m\n`);
      } else {
        out.write(line + '\n');
      }
    }

    const b = (s: string) => this.bold(s, out);
    const a = (s: string) => this.accent(s, out);
    const d = (s: string) => this.dim(s, out);

    out.write(`
${b('Usage:')} piapi <resource> <command> [flags]

${b('Resources:')}
  ${a('auth')}       ${d('Authentication (login, status, logout)')}
  ${a('config')}     ${d('CLI configuration (show, set)')}
  ${a('quota')}      ${d('Account quota and credits')}
  ${a('run')}        ${d('Run a model task')}
  ${a('task')}       ${d('Task management (list, get, cancel)')}
  ${a('model')}      ${d('Model discovery (list, schema)')}

${b('Global Flags:')}
  ${a('--api-key <key>')}        ${d('API key (overrides env/config)')}
  ${a('--base-url <url>')}       ${d('API base URL')}
  ${a('--output <format>')}      ${d('Output format: json, text')}
  ${a('--quiet')}                ${d('Suppress progress indicators')}
  ${a('--non-interactive')}      ${d('Fail when input is needed')}
  ${a('--async')}                ${d('Return task ID without polling')}
  ${a('--dry-run')}              ${d('Show request without executing')}
  ${a('--webhook <url>')}        ${d('Webhook URL for callbacks')}
  ${a('--out-dir <path>')}       ${d('Output directory for downloads')}
  ${a('--download')}             ${d('Auto-download outputs')}
  ${a('--version')}              ${d('Print version')}
  ${a('--help')}                 ${d('Show help')}

${d(`Run "piapi help <command>" for command-specific help.`)}
`);
  }

  private printCommand(cmd: CommandSpec, out: NodeJS.WriteStream): void {
    const b = (s: string) => this.bold(s, out);
    const d = (s: string) => this.dim(s, out);

    out.write(`\n${cmd.description}\n`);
    if (cmd.usage) out.write(`${b('Usage:')} ${cmd.usage}\n`);
    if (cmd.options && cmd.options.length > 0) {
      const max = Math.max(...cmd.options.map(o => o.flag.length));
      out.write(`\n${b('Options:')}\n`);
      for (const opt of cmd.options) {
        out.write(`  ${opt.flag.padEnd(max + 2)} ${d(opt.description)}\n`);
      }
    }
    if (cmd.examples && cmd.examples.length > 0) {
      out.write(`\n${b('Examples:')}\n`);
      for (const ex of cmd.examples) out.write(`  ${d(ex)}\n`);
    }
    out.write(`\n`);
  }

  private printChildren(node: CommandNode, prefix: string, out: NodeJS.WriteStream): void {
    for (const [name, child] of node.children) {
      if (child.command) out.write(`  ${prefix} ${name}    ${child.command.description}\n`);
      if (child.children.size > 0) this.printChildren(child, `${prefix} ${name}`, out);
    }
  }
}

export const registry = new Registry();
