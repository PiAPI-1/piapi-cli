export interface TaskResponse {
  code: number;
  message: string;
  data: TaskData;
}

export interface TaskData {
  task_id: string;
  task_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  result?: unknown;
  error?: string;
}

export interface AccountInfo {
  account_name: string;
  account_id: string;
  remaining_credits: number;
  quota_used?: number;
}

export interface CreateTaskRequest {
  task_type: string;
  webhook?: string;
  input: Record<string, unknown>;
}
