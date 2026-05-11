export interface TaskResponse {
  code: number;
  message: string;
  data: TaskData;
}

export type TaskStatus = 'pending' | 'staged' | 'processing' | 'running' | 'completed' | 'failed' | 'cancelled';

// A task in any of these states will not change further. Centralised so the
// polling loop and any future status renderer share one source of truth.
export const TERMINAL_STATUSES: ReadonlySet<TaskStatus> = new Set(['completed', 'failed', 'cancelled']);

export function isTerminalStatus(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export interface TaskError {
  code: number;
  message: string;
  raw_message?: string;
  detail?: unknown;
}

export interface TaskOutput {
  image_url?: string;
  image_urls?: string[];
  image_base64?: string;
  video_url?: string;
  audio_url?: string;
  works?: unknown[];
  [key: string]: unknown;
}

export interface TaskData {
  task_id: string;
  task_type: string;
  model?: string;
  status: TaskStatus;
  input?: Record<string, unknown>;
  output?: TaskOutput;
  meta?: {
    created_at?: string;
    started_at?: string;
    ended_at?: string;
    usage?: { type: string; frozen: number; consume: number };
  };
  error?: TaskError;
  logs?: unknown[];
}

export interface AccountInfo {
  id: number;
  name?: string;
  plan?: string;
  type?: string;
  is_enable?: boolean;
  credit_pack_info?: {
    available_credits: number;
    used_credits: number;
    total_credits?: number;
    frozen_credits?: number;
    expired_credits?: number;
    inactive_credits?: number;
  };
  equivalent_in_usd?: number;
}

export interface CreateTaskRequest {
  model: string;
  task_type: string;
  input: Record<string, unknown>;
  config?: {
    webhook_config?: {
      endpoint: string;
      secret?: string;
    };
    service_mode?: 'public' | 'private';
  };
}
