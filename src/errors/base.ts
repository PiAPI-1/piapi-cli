export class CLIError extends Error {
  constructor(
    message: string,
    public code: number = 1,
    public hint?: string,
  ) {
    super(message);
    this.name = 'CLIError';
  }
}
