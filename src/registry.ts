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

  private bold = (s: string, out: NodeJS.WriteStream) => out.isTTY ? `\x1b[1m${s}\x1b[0m` : s;
  private dim  = (s: string, out: NodeJS.WriteStream) => out.isTTY ? `\x1b[2m${s}\x1b[0m` : s;

  private printRoot(out: NodeJS.WriteStream): void {
    out.write(`\nUsage: piapi <resource> <command> [flags]

Resources:
  auth       Authentication (login, status, logout)
  config     CLI configuration (show, set)
  quota      Account quota and credits
  run        Run a model task
  task       Task management (list, get, cancel)
  model      Model discovery (list, schema)

Global Flags:
  --api-key <key>        API key (overrides env/config)
  --base-url <url>       API base URL
  --output <format>      Output format: json, text
  --quiet                Suppress progress indicators
  --non-interactive      Fail when input is needed
  --async                Return task ID without polling
  --dry-run              Show request without executing
  --webhook <url>        Webhook URL for callbacks
  --out-dir <path>       Output directory for downloads
  --download             Auto-download outputs
  --version              Print version
  --help                 Show help

Run "piapi help <command>" for command-specific help.
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
