import { request } from './http';
import type { CreateTaskRequest, TaskData } from '../types/api';
import { Endpoints } from './endpoints';

export interface UnifiedClient {
  apiKey: string;
  baseUrl: string;
}

export async function createTask(client: UnifiedClient, req: CreateTaskRequest): Promise<TaskData> {
  return request<TaskData>({
    method: 'POST',
    path: Endpoints.CREATE_TASK,
    body: req,
    apiKey: client.apiKey,
    baseUrl: client.baseUrl,
  });
}

export async function getTask(client: UnifiedClient, taskId: string): Promise<TaskData> {
  return request<TaskData>({
    method: 'GET',
    path: Endpoints.GET_TASK(taskId),
    apiKey: client.apiKey,
    baseUrl: client.baseUrl,
  });
}

export async function getAccountInfo(client: UnifiedClient): Promise<unknown> {
  return request({
    method: 'GET',
    path: Endpoints.ACCOUNT_INFO,
    apiKey: client.apiKey,
    baseUrl: client.baseUrl,
  });
}
