import { describe, expect, test } from 'bun:test';
import { pollTask } from '../../src/polling/poll';
import { isTerminalStatus, type TaskStatus } from '../../src/types/api';

describe('pollTask', () => {
  test('resolves immediately when isDone fires on first call', async () => {
    let calls = 0;
    const value = await pollTask(
      async () => { calls++; return { status: 'completed' as TaskStatus }; },
      (v) => v.status === 'completed',
      { quiet: true },
    );
    expect(value.status).toBe('completed');
    expect(calls).toBe(1);
  });

  test('resolves after N calls when isDone eventually fires', async () => {
    const states: TaskStatus[] = ['pending', 'running', 'running', 'completed'];
    let i = 0;
    const value = await pollTask(
      async () => ({ status: states[i++]! }),
      (v) => v.status === 'completed',
      { quiet: true },
    );
    expect(value.status).toBe('completed');
    expect(i).toBe(states.length);
  });

  test('throws CLIError when timeout exceeds', async () => {
    await expect(
      pollTask(
        async () => ({ status: 'running' as TaskStatus }),
        (v) => v.status === 'completed',
        { quiet: true, timeout: 50 },
      ),
    ).rejects.toThrow(/timed out/i);
  });

  test('treats cancelled as terminal via isTerminalStatus', async () => {
    let calls = 0;
    const value = await pollTask(
      async () => { calls++; return { status: 'cancelled' as TaskStatus }; },
      (v) => isTerminalStatus(v.status),
      { quiet: true },
    );
    expect(value.status).toBe('cancelled');
    expect(calls).toBe(1);
  });

  test('treats failed as terminal via isTerminalStatus', async () => {
    const value = await pollTask(
      async () => ({ status: 'failed' as TaskStatus }),
      (v) => isTerminalStatus(v.status),
      { quiet: true },
    );
    expect(value.status).toBe('failed');
  });

  test('non-terminal statuses keep polling', () => {
    const nonTerminal: TaskStatus[] = ['pending', 'staged', 'processing', 'running'];
    for (const s of nonTerminal) {
      expect(isTerminalStatus(s)).toBe(false);
    }
  });

  test('all terminal statuses are recognised', () => {
    const terminal: TaskStatus[] = ['completed', 'failed', 'cancelled'];
    for (const s of terminal) {
      expect(isTerminalStatus(s)).toBe(true);
    }
  });
});
