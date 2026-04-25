import { CLIError } from './base';
import { ExitCode } from './codes';

export class APIError extends CLIError {
  constructor(
    message: string,
    public statusCode: number,
    public apiCode?: string,
    hint?: string,
  ) {
    super(message, ExitCode.API_ERROR, hint);
    this.name = 'APIError';
  }
}

export function isAPIError(e: unknown): e is APIError {
  return e instanceof APIError;
}
