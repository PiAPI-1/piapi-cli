// docs: https://piapi.ai/docs/unified-api-schema.md
export const Endpoints = {
  BASE: 'https://api.piapi.ai',
  // docs: https://piapi.ai/docs/gpt-image/gpt-image-api.md
  IMAGE_GENERATIONS: '/v1/images/generations',
  IMAGE_EDITS: '/v1/images/edits',
  IMAGE_GENERATIONS_ASYNC: '/api/v1/images/generations/async',
  IMAGE_EDITS_ASYNC: '/api/v1/images/edits/async',
  // docs: https://piapi.ai/docs/unified-api-schema.md
  CREATE_TASK: '/api/v1/task',
  GET_TASK: (id: string) => `/api/v1/task/${id}`,
  // docs: https://piapi.ai/docs/task-list-api.md
  TASK_LIST: '/account/active_tasks',
  // docs: https://piapi.ai/docs/account-info-api.md
  ACCOUNT_INFO: '/account/info',
  // docs: https://piapi.ai/docs/tools/file-upload.md
  UPLOAD_BASE: 'https://upload.theapi.app',
  FILE_UPLOAD: '/api/ephemeral_resource',
} as const;
