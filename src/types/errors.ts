export class RedirectForgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedirectForgeError';
  }
}

export class NotFoundError extends RedirectForgeError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class PreconditionError extends RedirectForgeError {
  constructor(message: string) {
    super(message);
    this.name = 'PreconditionError';
  }
}

export class ValidationError extends RedirectForgeError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}
